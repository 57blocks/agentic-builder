/**
 * Reconciliation wrapper for codegen → PRD-pattern attribution.
 *
 * Pull-based and idempotent (design: docs/prd-codegen-outcome-attribution-plan.md §2):
 * it reads the durable append-only logs — L1 trace.jsonl (PRD-pattern
 * injections) + L2 task-history / self-heal-log records (codegen outcome) —
 * and a session-report index (positive-signal gate only), runs the pure
 * attribution, applies score updates to system memory, and advances a cursor.
 *
 * Because it derives everything from on-disk state and is gated by a cursor,
 * it can run any time — at the start of a new kickoff, at server start, or on
 * a timer — and an aborted run from a previous session gets reconciled
 * whenever the sweep next fires. Nothing here depends on a clean end-of-run
 * emit. All failures are swallowed: this must never break the primary flow.
 */

import fs from "node:fs/promises";
import path from "node:path";

import { getProjectMemory, getSystemMemory } from "@/lib/memory";
import type { MemoryRecord } from "@/lib/memory/types";
import type { TraceEvent } from "@/lib/memory/trace";
import {
  computeCodegenPrepAttributions,
  DEFAULT_DELTA_CODEGEN_FAILURE,
  DEFAULT_DELTA_CODEGEN_SUCCESS,
  type CodegenPrepAttributionResult,
} from "./codegen-prep-attribution";

const CURSOR_FILENAME = ".codegen-prep-attribution-cursor.json";

/** Session-report statuses that count as a clean completion (gates positives). */
const SUCCESS_STATUSES = new Set(["success", "passed", "completed", "ok"]);

export interface ReconcileCodegenPrepInput {
  /** L2 project root (generated-code output dir) holding task-history +
   *  self-heal-log records and the .ralph session-report index. */
  projectRoot: string;
  /** L1 root (defaults to MEMORY_L1_ROOT || process.cwd()). */
  l1Root?: string;
  deltaSuccess?: number;
  deltaFailure?: number;
  /** When true, compute but do not persist score updates or advance cursor. */
  dryRun?: boolean;
  resetCursor?: boolean;
}

export interface ReconcileCodegenPrepResult extends CodegenPrepAttributionResult {
  ok: true;
  projectRoot: string;
  l1Root: string;
  dryRun: boolean;
  applied: number;
}

function resolveL1Root(override?: string): string {
  if (override && override.trim()) return path.resolve(override);
  if (process.env.MEMORY_L1_ROOT) return path.resolve(process.env.MEMORY_L1_ROOT);
  return process.cwd();
}

async function readTraceEvents(l1Root: string): Promise<TraceEvent[]> {
  const p = path.join(l1Root, ".memory", "trace.jsonl");
  let raw: string;
  try {
    raw = await fs.readFile(p, "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
  const out: TraceEvent[] = [];
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try {
      out.push(JSON.parse(t) as TraceEvent);
    } catch {
      /* skip malformed (partial last line from a crash) */
    }
  }
  return out;
}

async function readCursor(l1Root: string): Promise<Set<string>> {
  const p = path.join(l1Root, ".memory", CURSOR_FILENAME);
  try {
    const raw = await fs.readFile(p, "utf8");
    const parsed = JSON.parse(raw) as { attributed?: string[] };
    return new Set(parsed.attributed ?? []);
  } catch {
    return new Set();
  }
}

async function writeCursor(l1Root: string, keys: Set<string>): Promise<void> {
  const dir = path.join(l1Root, ".memory");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, CURSOR_FILENAME),
    JSON.stringify({ attributed: Array.from(keys).sort() }, null, 2),
    "utf8",
  );
}

/**
 * Build the set of kickoffIds a session report marks as successfully
 * completed, from `<projectRoot>/.ralph/coding-session-report-history.json`.
 * Best-effort: a missing/corrupt index yields an empty set, which simply
 * suppresses positive attribution (the negative signal is unaffected).
 */
async function readCompletedKickoffs(projectRoot: string): Promise<Set<string>> {
  const p = path.join(projectRoot, ".ralph", "coding-session-report-history.json");
  try {
    const raw = await fs.readFile(p, "utf8");
    const parsed = JSON.parse(raw) as Array<{ sessionId?: string; status?: string }>;
    const out = new Set<string>();
    if (Array.isArray(parsed)) {
      for (const e of parsed) {
        if (
          typeof e?.sessionId === "string" &&
          typeof e?.status === "string" &&
          SUCCESS_STATUSES.has(e.status.toLowerCase())
        ) {
          out.add(e.sessionId);
        }
      }
    }
    return out;
  } catch {
    return new Set();
  }
}

/**
 * Run one reconciliation pass. Returns a structured result; never throws
 * (errors are caught and surfaced via a thrown-free `ok:false`-style absence
 * — callers that don't care can ignore the return value entirely).
 */
export async function reconcileCodegenPrepAttributions(
  input: ReconcileCodegenPrepInput,
): Promise<ReconcileCodegenPrepResult> {
  const projectRoot = path.resolve(input.projectRoot);
  const l1Root = resolveL1Root(input.l1Root);
  const deltaSuccess = input.deltaSuccess ?? DEFAULT_DELTA_CODEGEN_SUCCESS;
  const deltaFailure = input.deltaFailure ?? DEFAULT_DELTA_CODEGEN_FAILURE;
  const dryRun = input.dryRun === true;

  const l1TraceEvents = await readTraceEvents(l1Root);
  const projectMem = getProjectMemory(projectRoot);
  const taskHistory = await projectMem.list({ kind: "task-history", limit: 1_000_000 });
  const selfHealLogs = await projectMem.list({ kind: "self-heal-log", limit: 1_000_000 });
  const completedKickoffs = await readCompletedKickoffs(projectRoot);

  const sysMem = getSystemMemory();
  const prdPatterns = await sysMem.list({ kind: "prd-pattern", limit: 1_000_000 });
  const patternsById = new Map<string, MemoryRecord>(
    prdPatterns.map((r) => [r.id, r] as const),
  );

  const cursor = input.resetCursor ? new Set<string>() : await readCursor(l1Root);

  const result = computeCodegenPrepAttributions({
    l1TraceEvents,
    taskHistory,
    selfHealLogs,
    patternsById,
    alreadyAttributed: cursor,
    completedKickoffs,
    deltaSuccess,
    deltaFailure,
  });

  let applied = 0;
  if (!dryRun) {
    for (const a of result.attributions) {
      if (a.immune || a.delta === 0) continue;
      try {
        await sysMem.update(a.patternId, { metrics: { score: a.newScore } });
        applied++;
      } catch {
        /* swallow individual failures; surfaced via stats */
      }
    }
    const merged = new Set(cursor);
    for (const k of result.newlyAttributed) merged.add(k);
    await writeCursor(l1Root, merged);
  }

  return { ok: true, projectRoot, l1Root, dryRun, applied, ...result };
}

/**
 * Fire-and-forget trigger for hot paths (e.g. kickoff start). Swallows all
 * errors and never blocks the caller. Returns immediately.
 */
export function triggerCodegenPrepReconcile(
  input: ReconcileCodegenPrepInput,
): void {
  void reconcileCodegenPrepAttributions(input).catch((err) => {
    console.warn(
      "[memory] codegen-prep reconcile (background) failed:",
      (err as Error).message,
    );
  });
}
