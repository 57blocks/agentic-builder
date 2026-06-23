/**
 * Semantic conversation compactor for long verify/fix loops.
 */
import { chatCompletionWithFallback, type ChatMessage } from "@/lib/openrouter";

interface CompactInput {
  messages: ChatMessage[];
  modelChain: string[];
  label: string;
  stateSummary?: string;
  thresholdChars?: number;
  keepTail?: number;
  force?: boolean;
  /**
   * Real prompt-token watermark from the previous LLM response
   * (`resp.usage.prompt_tokens`). When provided alongside `triggerTokens`, the
   * compaction decision uses this instead of the (less accurate) char estimate.
   * Backward compatible: omit both to keep the legacy char-threshold behaviour.
   */
  currentPromptTokens?: number;
  /** Token watermark at/above which compaction triggers (used with currentPromptTokens). */
  triggerTokens?: number;
  /**
   * When true, the char-size fallback estimate also counts
   * `tool_calls[].function.arguments` (where write_file file bodies live).
   * Defaults to false to keep the legacy content-only estimate byte-identical
   * for existing callers.
   */
  countToolCallChars?: boolean;
  /**
   * Provider-routing pass-through for the internal summarizer LLM call. Lets a
   * caller keep the compaction step on the SAME provider as its main loop (e.g.
   * the open integration fixer's DeepSeek-direct debug mode). Backward
   * compatible: omit to keep the default env-driven routing.
   */
  forceOpenRouter?: boolean;
  preferDirectProvider?: boolean;
}

export interface CompactResult {
  compacted: boolean;
  removedMessages: number;
  estimatedTokensBefore: number;
  orphanToolsRemoved: number;
}

function messageText(message: ChatMessage): string {
  const content = typeof message.content === "string" ? message.content : "";
  const toolCalls = (message.tool_calls ?? [])
    .map(
      (call) => `[tool_call:${call.function.name}] ${call.function.arguments}`,
    )
    .join("\n");
  const toolName = message.name ? `[tool:${message.name}]` : "";
  return [`role=${message.role}`, toolName, content, toolCalls]
    .filter(Boolean)
    .join("\n")
    .slice(0, 3000);
}

function buildDeterministicSummary(
  middle: ChatMessage[],
  stateSummary?: string,
): string {
  const actionLines: string[] = [];
  for (const message of middle) {
    if (message.role === "tool") {
      actionLines.push(
        `[tool result] ${String(message.content ?? "").slice(0, 240)}`,
      );
    } else if (message.role === "assistant") {
      const calls = (message.tool_calls ?? [])
        .map((call) => call.function.name)
        .join(", ");
      if (calls) actionLines.push(`[assistant called] ${calls}`);
    }
  }
  return [
    `[Context compacted — ${middle.length} messages omitted]`,
    stateSummary ? `Validation state:\n${stateSummary}` : "",
    `Previous actions summary:\n${actionLines.slice(-40).join("\n")}`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function summarizeMiddle(
  middle: ChatMessage[],
  modelChain: string[],
  stateSummary?: string,
  routing?: { forceOpenRouter?: boolean; preferDirectProvider?: boolean },
): Promise<string> {
  const transcript = middle.map(messageText).join("\n\n---\n\n").slice(-32_000);
  const response = await chatCompletionWithFallback(
    [
      {
        role: "system",
        content: [
          "Summarize a long verify/fix agent conversation for continuation.",
          "Keep only actionable state. Do not invent facts.",
          "Output concise markdown with these sections: Unresolved issues, Files changed or inspected, Failed validations/tests, Decisions already made, Next repair actions.",
        ].join("\n"),
      },
      {
        role: "user",
        content: [
          stateSummary ? `Current validation state:\n${stateSummary}` : "",
          "Conversation segment to compact:",
          transcript,
        ]
          .filter(Boolean)
          .join("\n\n"),
      },
    ],
    modelChain,
    {
      temperature: 0.1,
      max_tokens: 3000,
      ...(routing?.forceOpenRouter !== undefined
        ? { forceOpenRouter: routing.forceOpenRouter }
        : {}),
      ...(routing?.preferDirectProvider !== undefined
        ? { preferDirectProvider: routing.preferDirectProvider }
        : {}),
    },
  );
  const content = response.choices[0]?.message.content?.trim();
  return content || buildDeterministicSummary(middle, stateSummary);
}

function calculateSafeTailStart(
  messages: ChatMessage[],
  desiredStart: number,
): number {
  let safeStart = desiredStart;
  const findAssistantIndexForTool = (
    toolIdx: number,
    toolCallId: string,
  ): number => {
    if (!toolCallId) return -1;
    for (let i = toolIdx - 1; i >= 0; i--) {
      const msg = messages[i];
      if (!msg || msg.role !== "assistant") continue;
      const hasMatch = (msg.tool_calls ?? []).some(
        (toolCall) => toolCall.id === toolCallId,
      );
      if (hasMatch) return i;
    }
    return -1;
  };

  for (let i = desiredStart; i < messages.length; i++) {
    const msg = messages[i];
    if (!msg || msg.role !== "tool") continue;
    const assistantIdx = findAssistantIndexForTool(i, msg.tool_call_id ?? "");
    if (assistantIdx >= 0) safeStart = Math.min(safeStart, assistantIdx);
  }

  return Math.max(1, Math.min(safeStart, messages.length - 1));
}

function countRemovedOrphanToolMessages(messages: ChatMessage[]): number {
  const assistantToolIds = new Set<string>();
  for (const message of messages) {
    if (message.role !== "assistant") continue;
    for (const call of message.tool_calls ?? []) assistantToolIds.add(call.id);
  }
  let removed = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message?.role !== "tool") continue;
    if (message.tool_call_id && assistantToolIds.has(message.tool_call_id))
      continue;
    messages.splice(i, 1);
    removed += 1;
  }
  return removed;
}

/**
 * Char weight of a message. When `includeToolCalls` is set it also counts
 * `tool_calls[].function.arguments` (where write_file file bodies live);
 * otherwise it counts only `content` (legacy behaviour, byte-identical).
 */
function messageCharWeight(
  message: ChatMessage,
  includeToolCalls: boolean,
): number {
  let total = typeof message.content === "string" ? message.content.length : 0;
  if (includeToolCalls) {
    for (const call of message.tool_calls ?? []) {
      total += (call.function?.arguments ?? "").length;
      total += (call.function?.name ?? "").length;
    }
  }
  return total;
}

export async function compactChatMessagesSemantically(
  input: CompactInput,
): Promise<CompactResult> {
  const thresholdChars = input.thresholdChars ?? 20_000 * 4;
  const keepTail = input.keepTail ?? 6;
  const totalChars = input.messages.reduce(
    (sum, message) =>
      sum + messageCharWeight(message, input.countToolCallChars === true),
    0,
  );
  // Prefer the real token watermark when the caller supplies it; otherwise fall
  // back to the char estimate (now inclusive of tool_calls.arguments).
  const tokenTriggered =
    typeof input.currentPromptTokens === "number" &&
    typeof input.triggerTokens === "number" &&
    input.currentPromptTokens >= input.triggerTokens;
  const charTriggered = totalChars >= thresholdChars;
  if (!input.force && !tokenTriggered && !charTriggered) {
    return {
      compacted: false,
      removedMessages: 0,
      estimatedTokensBefore: Math.round(totalChars / 4),
      orphanToolsRemoved: 0,
    };
  }

  const systemMsg = input.messages[0];
  const desiredStart = Math.max(1, input.messages.length - keepTail);
  const tailStart = calculateSafeTailStart(input.messages, desiredStart);
  const tail = input.messages.slice(tailStart);
  const middle = input.messages.slice(1, tailStart);
  if (!systemMsg || middle.length === 0) {
    return {
      compacted: false,
      removedMessages: 0,
      estimatedTokensBefore: Math.round(totalChars / 4),
      orphanToolsRemoved: 0,
    };
  }

  let summary: string;
  try {
    summary = await summarizeMiddle(
      middle,
      input.modelChain,
      input.stateSummary,
      {
        forceOpenRouter: input.forceOpenRouter,
        preferDirectProvider: input.preferDirectProvider,
      },
    );
  } catch (error) {
    console.warn(
      `${input.label}: semantic compaction failed, using deterministic summary: ${error instanceof Error ? error.message : String(error)}`,
    );
    summary = buildDeterministicSummary(middle, input.stateSummary);
  }

  input.messages.splice(
    0,
    input.messages.length,
    systemMsg,
    { role: "assistant", content: `[Semantic context compacted]\n${summary}` },
    ...tail,
  );
  const orphanToolsRemoved = countRemovedOrphanToolMessages(input.messages);
  return {
    compacted: true,
    removedMessages: middle.length,
    estimatedTokensBefore: Math.round(totalChars / 4),
    orphanToolsRemoved,
  };
}

export interface TruncateOldToolResultsResult {
  /** Number of tool-result messages whose content was truncated. */
  truncated: number;
}

const TRUNCATED_TOOL_RESULT_SUFFIX = "\n[…truncated — older tool result]";

/**
 * Layer-1 lossless-ish trimming: cap the size of LARGE `tool` result messages
 * that are NOT in the most recent rounds. Keeps the head + tail of each big
 * old result and drops the middle, preserving assistant↔tool pairing (the
 * message stays in place, only its content shrinks).
 *
 * Recent results (the last `recentFullRounds` tool messages) are left fully
 * intact so the model keeps complete detail on its current working set. This
 * is cheap and runs every round to defer the expensive semantic compaction.
 */
export function truncateOldLargeToolResults(
  messages: ChatMessage[],
  options?: { recentFullRounds?: number; maxCharsPerOldResult?: number },
): TruncateOldToolResultsResult {
  const recentFullRounds = Math.max(0, options?.recentFullRounds ?? 3);
  const maxChars = Math.max(400, options?.maxCharsPerOldResult ?? 1500);

  // Indices of tool-result messages, in order.
  const toolIdxs: number[] = [];
  messages.forEach((m, idx) => {
    if (m.role === "tool") toolIdxs.push(idx);
  });
  if (toolIdxs.length <= recentFullRounds) return { truncated: 0 };

  // Protect the most recent N tool results.
  const protectedFrom = toolIdxs.length - recentFullRounds;
  let truncated = 0;
  for (let i = 0; i < protectedFrom; i++) {
    const msg = messages[toolIdxs[i]];
    const content = typeof msg.content === "string" ? msg.content : "";
    if (content.length <= maxChars) continue;
    if (content.endsWith(TRUNCATED_TOOL_RESULT_SUFFIX)) continue;
    const headLen = Math.floor(maxChars * 0.6);
    const tailLen = maxChars - headLen;
    msg.content =
      content.slice(0, headLen) +
      `\n[… ${content.length - maxChars} chars omitted …]\n` +
      content.slice(content.length - tailLen) +
      TRUNCATED_TOOL_RESULT_SUFFIX;
    truncated += 1;
  }
  return { truncated };
}
