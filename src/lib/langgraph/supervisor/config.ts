import type { CodingAgentRole } from "@/lib/pipeline/types";

/**
 * Supervisor-level feature flags & tunables.
 *
 * All env reads happen exactly once at module load to keep behaviour stable
 * across a graph run. This module is intentionally side-effect free beyond
 * those env reads.
 */

export const ENABLE_PHASE_INCREMENTAL_CONTEXT_SYNC =
  process.env.BLUEPRINT_INCREMENTAL_CONTEXT_SYNC !== "0";

// P0 parallel-coding flag.
//   "0" or unset → legacy single-worker behaviour (default; preserves the
//                  strict incremental-context guarantee for in-flight runs).
//   "auto"       → derive worker count from task count via the heuristic
//                  below, but still respect file-conflict groups.
//   <integer>    → explicit upper bound on workers per coding role.
export const PARALLEL_CODING_WORKERS_RAW = (
  process.env.BLUEPRINT_PARALLEL_CODING_WORKERS ?? "0"
).trim();

export const ENABLE_PARALLEL_CODING_WORKERS =
  PARALLEL_CODING_WORKERS_RAW !== "" && PARALLEL_CODING_WORKERS_RAW !== "0";

export function parsedWorkerLimit(): number | "auto" {
  if (PARALLEL_CODING_WORKERS_RAW === "auto") return "auto";
  const n = Number.parseInt(PARALLEL_CODING_WORKERS_RAW, 10);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return n;
}

export function workersForRole(role: CodingAgentRole, count: number): number {
  if (role === "architect" || role === "test") return 1;
  // Strict context mode: keep one worker per coding role so each task sees
  // the latest outputs from previous tasks within the same role.
  // Disabled automatically when the operator opts in to parallel coding.
  if (
    ENABLE_PHASE_INCREMENTAL_CONTEXT_SYNC &&
    !ENABLE_PARALLEL_CODING_WORKERS &&
    (role === "backend" || role === "frontend" || role === "fullstack")
  ) {
    return 1;
  }
  if (ENABLE_PARALLEL_CODING_WORKERS) {
    const limit = parsedWorkerLimit();
    const auto = count <= 3 ? 1 : count <= 8 ? 2 : 3;
    if (limit === "auto") return Math.min(auto, count);
    return Math.min(limit, count);
  }
  if (count <= 3) return 1;
  if (count <= 8) return 2;
  return 3;
}

// ─── Phase-level retry budgets ──────────────────────────────────────────

/** Max number of automated fix attempts inside the e2e_verify node. */
export const MAX_E2E_VERIFY_FIX_ATTEMPTS = 10;

/**
 * Hard circuit-breaker: the TOTAL number of IntegrationVerifyFix iterations
 * allowed across the *entire* session, summed over every re-entry of the
 * `integration_verify` node. This is deliberately NOT per-loop — the
 * `tdd_green_verify → integration_verify` edge can re-enter the node many
 * times, and a per-loop counter (which resets to 0 on every entry) gave the
 * loop an unbounded global budget. When the TDD hard gate stays red the graph
 * looped forever (see runtime.log 2026-05-20: ~7 identical no-op cycles).
 *
 * Once cumulative `integrationFixAttempts` reaches this budget the node
 * short-circuits and the routing predicates stop sending control back to
 * `integration_verify`, so the session converges to summary instead of
 * spinning. Override with INTEGRATION_VERIFY_FIX_TOTAL_BUDGET (clamped).
 */
export function readIntegrationVerifyFixTotalBudget(): number {
  const raw = Number(process.env.INTEGRATION_VERIFY_FIX_TOTAL_BUDGET ?? "300");
  if (!Number.isFinite(raw)) return 300;
  return Math.max(20, Math.min(2000, Math.floor(raw)));
}

export const INTEGRATION_VERIFY_FIX_TOTAL_BUDGET =
  readIntegrationVerifyFixTotalBudget();

/**
 * TDD-review P0 deadlock escape. When GREEN execution passes (0 runtime test
 * failures) but the STATIC TDD review keeps reporting the same (or higher) P0
 * count for this many consecutive GREEN passes, the gate stops treating the
 * review-only P0s as a hard blocker: it records them as warnings and lets the
 * graph proceed to e2e/summary instead of churning to the full integration
 * budget. Runtime-failing tests (`green.p0Failures`) are NEVER subject to this
 * escape — only static review-only P0s that the repair loop cannot clear.
 *
 * 2 = allow one genuine repair pass (establish baseline), then escape on the
 * next pass that shows no improvement. Override via TDD_REVIEW_STALL_LIMIT.
 */
export const TDD_REVIEW_STALL_LIMIT = (() => {
  const raw = Number(process.env.TDD_REVIEW_STALL_LIMIT ?? "2");
  if (!Number.isFinite(raw)) return 2;
  return Math.max(1, Math.min(10, Math.floor(raw)));
})();

/**
 * Remaining IntegrationVerifyFix iteration budget for the *next* node entry,
 * given how many cumulative attempts have already been spent. Pure helper so
 * the arithmetic is unit-testable in isolation. Never negative.
 */
export function remainingIntegrationVerifyBudget(
  priorAttempts: number,
  totalBudget: number = INTEGRATION_VERIFY_FIX_TOTAL_BUDGET,
): number {
  const prior = Number.isFinite(priorAttempts) ? Math.max(0, priorAttempts) : 0;
  return Math.max(0, totalBudget - prior);
}

/**
 * Whether the cumulative IntegrationVerifyFix budget has been exhausted, used
 * by routing predicates to refuse another `integration_verify` re-entry.
 */
export function integrationVerifyBudgetExhausted(
  priorAttempts: number,
  totalBudget: number = INTEGRATION_VERIFY_FIX_TOTAL_BUDGET,
): boolean {
  return remainingIntegrationVerifyBudget(priorAttempts, totalBudget) <= 0;
}
