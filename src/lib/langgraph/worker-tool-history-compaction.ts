/**
 * Worker tool-history compaction — cheap, lossless dedupe of stale repeated
 * read-only tool results in the codegen agent loop.
 *
 * The worker agentic loop appends every tool result to a growing `messages`
 * array. When the model re-reads the same file (or re-runs the same
 * list/grep) across iterations — a common pattern when it's iterating on a
 * fix — each read result is kept verbatim, bloating context with stale copies.
 * Only the MOST RECENT read of a given target reflects the current file state;
 * earlier ones are superseded.
 *
 * This replaces the CONTENT of all-but-the-last result for each repeated
 * read-only call with a tiny placeholder, keeping the message in place. That
 * preserves assistant↔tool `tool_call_id` pairing (no orphan-message risk) and
 * never touches write tools. It is lossless w.r.t. the current state: an
 * earlier read is genuinely stale once the same target is read again.
 *
 * The supervisor's integration-verify loop already has heavier machinery
 * (semantic compaction + repeated-action stagnation tracking); the worker loop
 * had none. This is the cheap counterpart for the worker.
 */

import type { ChatMessage } from "@/lib/llm-types";

/**
 * Read-only worker tools whose repeated calls with identical arguments are
 * idempotent — only the latest result matters. Write/mutating tools
 * (apply_patch, write_file, delete_file, move_file) are NEVER touched.
 */
const DEDUP_ELIGIBLE_READ_TOOLS = new Set([
  "read_file",
  "read_many_files",
  "list_files",
  "grep",
]);

const SUPERSEDED_PLACEHOLDER =
  "[superseded — this read was repeated later in the conversation; " +
  "see the most recent result for the current contents]";

/** Stable fingerprint of a tool call: name + normalized (key-sorted) args. */
function toolFingerprint(name: string, argumentsJson: string): string {
  let normalized = argumentsJson ?? "";
  try {
    const parsed = JSON.parse(argumentsJson || "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const sorted: Record<string, unknown> = {};
      for (const key of Object.keys(parsed).sort()) {
        sorted[key] = (parsed as Record<string, unknown>)[key];
      }
      normalized = JSON.stringify(sorted);
    }
  } catch {
    /* keep raw string */
  }
  return `${name}:${normalized}`;
}

export interface ReadDedupResult {
  /** Number of stale read results whose content was replaced. */
  superseded: number;
}

/**
 * In-place: for repeated dedup-eligible read-only tool calls (same tool + same
 * args), replace the content of every occurrence EXCEPT the last with a short
 * placeholder. Idempotent — already-superseded messages are not recounted.
 */
export function supersedeStaleReadResults(
  messages: ChatMessage[],
): ReadDedupResult {
  // 1. Map every eligible tool_call_id → its fingerprint, from assistant
  //    messages' tool_calls (the result messages don't carry the args).
  const idToFingerprint = new Map<string, string>();
  for (const m of messages) {
    if (m.role !== "assistant" || !m.tool_calls) continue;
    for (const tc of m.tool_calls) {
      const name = tc.function?.name;
      if (!name || !DEDUP_ELIGIBLE_READ_TOOLS.has(name)) continue;
      idToFingerprint.set(
        tc.id,
        toolFingerprint(name, tc.function.arguments ?? ""),
      );
    }
  }
  if (idToFingerprint.size === 0) return { superseded: 0 };

  // 2. Collect the indices of tool result messages per fingerprint, in order.
  const groups = new Map<string, number[]>();
  messages.forEach((m, idx) => {
    if (m.role !== "tool" || !m.tool_call_id) return;
    const fp = idToFingerprint.get(m.tool_call_id);
    if (!fp) return;
    const arr = groups.get(fp);
    if (arr) arr.push(idx);
    else groups.set(fp, [idx]);
  });

  // 3. For each group with >1 result, supersede all but the last.
  let superseded = 0;
  for (const indices of groups.values()) {
    if (indices.length < 2) continue;
    for (let i = 0; i < indices.length - 1; i++) {
      const msg = messages[indices[i]];
      if (msg.content === SUPERSEDED_PLACEHOLDER) continue;
      msg.content = SUPERSEDED_PLACEHOLDER;
      superseded += 1;
    }
  }
  return { superseded };
}
