/**
 * Best-effort, OFF-by-default dump of the full per-round coding context.
 *
 * Every coding round funnels its `messages` array through
 * `invokeCodegenOrOpenRouter` (providers/codegen.ts) — that array IS the
 * complete context the model sees for that round. This module persists it so a
 * run can be audited after the fact ("what exactly did round N of task T see?").
 *
 * The context is large, so this writes ONE JSON file per round to disk (never
 * stdout) and only when `CODEGEN_CONTEXT_DUMP` is set. It must never throw into
 * the codegen path — all failures are swallowed with a single warning.
 *
 * `CODEGEN_CONTEXT_DUMP` semantics:
 *   unset / ""              → disabled (default)
 *   "1" | "true" | "all"    → dump every coding round
 *   "<taskId-substring>"    → only dump rounds whose taskId contains this value
 *
 * Output layout (under the generated workspace):
 *   <outputDir>/.ralph/context-dumps/
 *     index.jsonl                              one summary line per round
 *     0001__T-007__iter03.json                 full messages + metadata
 */

import fs from "fs/promises";
import path from "path";
import type { ChatMessage } from "@/lib/llm-types";

export interface CodingContextDumpMeta {
  taskId?: string;
  /** 0-based loop index of the round, if known. */
  iteration?: number;
  sessionId?: string;
  /** Worker label (e.g. "frontend:T-007"). */
  label?: string;
  /** Generated workspace root; falls back to env / cwd/generated-code. */
  outputDir?: string;
}

const DUMP_SUBDIR = path.join(".ralph", "context-dumps");

/** Process-wide call counter so files sort in execution order across tasks. */
let dumpSeq = 0;

function dumpMode(): string {
  return (process.env.CODEGEN_CONTEXT_DUMP ?? "").trim();
}

/** True when dumping is enabled for this round (global or taskId-filtered). */
function shouldDump(meta: CodingContextDumpMeta | undefined): boolean {
  const mode = dumpMode().toLowerCase();
  if (!mode) return false;
  if (mode === "1" || mode === "true" || mode === "all") return true;
  // Otherwise treat the value as a taskId substring filter.
  const taskId = (meta?.taskId ?? "").toLowerCase();
  return taskId.length > 0 && taskId.includes(mode);
}

function resolveOutputDir(meta: CodingContextDumpMeta | undefined): string {
  return (
    meta?.outputDir ||
    process.env.BLUEPRINT_OUTPUT_DIR ||
    process.env.GENERATED_CODE_DIR ||
    path.join(process.cwd(), "generated-code")
  );
}

function approxTokens(messages: ChatMessage[]): number {
  let chars = 0;
  for (const m of messages) {
    chars += (m.content ?? "").length;
    if (m.tool_calls?.length) chars += JSON.stringify(m.tool_calls).length;
    if (m.reasoning_content) chars += m.reasoning_content.length;
  }
  // ~4 chars per token is the usual rough heuristic.
  return Math.round(chars / 4);
}

function roleCounts(messages: ChatMessage[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const m of messages) counts[m.role] = (counts[m.role] ?? 0) + 1;
  return counts;
}

const SECRET_KEY_RE =
  /\b([A-Z0-9_]*(?:API_KEY|SECRET|PASSWORD|TOKEN|PRIVATE_KEY|DATABASE_URL|CONNECTION_STRING)[A-Z0-9_]*)\s*([=:])\s*(\S+)/g;

/** Light redaction so a dumped .env / connection string never leaks verbatim. */
function redact(text: string): string {
  if (!text) return text;
  return text.replace(SECRET_KEY_RE, (_m, key, sep) => `${key}${sep}***redacted***`);
}

function safeSegment(s: string): string {
  return (s || "unknown").replace(/[^A-Za-z0-9._-]+/g, "-").slice(0, 60);
}

/**
 * Persist the round's full context if dumping is enabled. Best-effort — any
 * error is logged once and never propagated.
 */
export async function maybeDumpCodingContext(
  messages: ChatMessage[],
  meta?: CodingContextDumpMeta,
): Promise<void> {
  if (!shouldDump(meta)) return;

  const seq = ++dumpSeq;
  try {
    const dumpDir = path.join(resolveOutputDir(meta), DUMP_SUBDIR);
    await fs.mkdir(dumpDir, { recursive: true });

    const iterStr =
      meta?.iteration != null ? String(meta.iteration).padStart(2, "0") : "NA";
    const fileName = `${String(seq).padStart(4, "0")}__${safeSegment(
      meta?.taskId ?? "no-task",
    )}__iter${iterStr}.json`;
    const filePath = path.join(dumpDir, fileName);

    const timestamp = new Date().toISOString();
    const payload = {
      seq,
      timestamp,
      sessionId: meta?.sessionId,
      taskId: meta?.taskId,
      iteration: meta?.iteration,
      label: meta?.label,
      messageCount: messages.length,
      roleCounts: roleCounts(messages),
      approxTokens: approxTokens(messages),
      messages: messages.map((m) => ({
        role: m.role,
        name: m.name,
        tool_call_id: m.tool_call_id,
        tool_calls: m.tool_calls,
        content: redact(m.content ?? ""),
      })),
    };

    await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");

    const indexLine =
      JSON.stringify({
        seq,
        timestamp,
        sessionId: meta?.sessionId,
        taskId: meta?.taskId,
        iteration: meta?.iteration,
        label: meta?.label,
        messageCount: payload.messageCount,
        approxTokens: payload.approxTokens,
        file: fileName,
      }) + "\n";
    await fs.appendFile(path.join(dumpDir, "index.jsonl"), indexLine, "utf8");
  } catch (err) {
    console.warn(
      `[context-dump] failed to write round ${seq} (ignored):`,
      err instanceof Error ? err.message : err,
    );
  }
}
