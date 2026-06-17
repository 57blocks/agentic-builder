import fs from "fs/promises";
import path from "path";

/**
 * Unresolved-problems ledger (CODEGEN_HARDENING — analysis).
 *
 * An append-only JSONL record of every point where the pipeline GAVE UP on a
 * problem the LLM repair loop could not resolve: tsc errors that never cleared,
 * routes that stayed 404, a verify-fix loop hitting its circuit-breaker,
 * stagnation, etc. The goal is offline pattern analysis — "which failure
 * categories recur, and how should we fix them structurally" — without having
 * to reconstruct it from the scattered `.ralph/*` artifacts.
 *
 * Design:
 *  - One line per give-up event at `<outputDir>/.ralph/unresolved-problems.jsonl`.
 *  - The recorder NEVER throws (logging must not break the pipeline).
 *  - Entries are compact: a category + summary + a few evidence lines, plus
 *    `artifacts` pointers into the detailed `.ralph/*` files rather than copying them.
 */
export const UNRESOLVED_PROBLEMS_REL = path.join(
  ".ralph",
  "unresolved-problems.jsonl",
);

export type UnresolvedCategory =
  | "backend-tsc" // backend type errors never cleared
  | "frontend-tsc" // frontend type errors never cleared
  | "runtime-smoke-404" // contract route stayed unreachable (404)
  | "contract-coverage" // a contract endpoint had no implementing task/handler
  | "feature-coverage" // PRD requirement ids left unresolved
  | "circuit-breaker" // a verify-fix loop exhausted its iteration budget
  | "stagnation" // repeated iterations with no progress
  | "backend-not-green" // backend phase ended not-green before frontend
  | "e2e" // E2E suite had non-deterministic (flaky/infra) failures — isolated, not blocking
  | "other";

export interface UnresolvedProblem {
  /** ISO-8601 timestamp. */
  ts: string;
  sessionId: string;
  category: UnresolvedCategory;
  /** Which gate/loop gave up (e.g. "integration-verify-fix", "backend-readiness"). */
  gate: string;
  /** backend | frontend | integration | scaffold, when meaningful. */
  phase?: string;
  /** How many fix iterations were spent before giving up, when known. */
  attempts?: number;
  /** One-line human description. */
  summary: string;
  /** Compact evidence — first few error/diagnostic lines (capped). */
  evidence?: string[];
  /** Pointers to `.ralph/*` files holding the full detail. */
  artifacts?: string[];
}

const MAX_EVIDENCE_LINES = 12;

/**
 * Append one unresolved-problem entry. The caller supplies everything except the
 * timestamp, which is stamped here. Never throws — failures are logged to stderr
 * and swallowed so the pipeline is never broken by its own bookkeeping.
 */
export async function recordUnresolvedProblem(
  outputDir: string,
  entry: Omit<UnresolvedProblem, "ts">,
): Promise<void> {
  try {
    const full = path.join(outputDir, UNRESOLVED_PROBLEMS_REL);
    await fs.mkdir(path.dirname(full), { recursive: true });
    const record: UnresolvedProblem = {
      ts: new Date().toISOString(),
      ...entry,
      evidence: entry.evidence?.slice(0, MAX_EVIDENCE_LINES),
    };
    await fs.appendFile(full, JSON.stringify(record) + "\n", "utf-8");
  } catch (err) {
    console.warn(
      `[unresolved-problems] could not record entry (${entry.category}/${entry.gate}): ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/** Read all recorded entries (skips malformed lines). For analysis / tests. */
export async function readUnresolvedProblems(
  outputDir: string,
): Promise<UnresolvedProblem[]> {
  try {
    const raw = await fs.readFile(
      path.join(outputDir, UNRESOLVED_PROBLEMS_REL),
      "utf-8",
    );
    return raw
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        try {
          return JSON.parse(l) as UnresolvedProblem;
        } catch {
          return null;
        }
      })
      .filter((e): e is UnresolvedProblem => e !== null);
  } catch {
    return [];
  }
}

/** Group recorded problems by category — convenience for offline analysis. */
export function summarizeByCategory(
  problems: UnresolvedProblem[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of problems) out[p.category] = (out[p.category] ?? 0) + 1;
  return out;
}
