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

/**
 * Foundation / architect-phase parallelism flag (default OFF).
 *
 * The architect phase builds the shared foundation (scaffold, data layer, infra,
 * API contracts) and runs SERIALLY by default — many foundation tasks mutate the
 * same cross-cutting files (module registry, API_CONTRACTS.json, shared schema),
 * and downstream parallel workers read them, so a coherent serial substrate is
 * the safe default. But concern-isolated foundation tasks (docker / models /
 * api-contracts / e2e harness) touch DISJOINT files and are needlessly
 * serialized. When this flag is on, the architect phase fans out via
 * `chunkTasksByFileConflict` — file-coupled or dependency-ordered tasks still
 * share one chunk (stay serial); only genuinely independent ones run in
 * parallel. The phase still joins (barrier) before the contract-freeze + domain
 * phases, so contract completeness is unchanged.
 */
export const ENABLE_PARALLEL_FOUNDATION = (() => {
  const raw = (process.env.CODEGEN_PARALLEL_FOUNDATION ?? "0").trim().toLowerCase();
  return raw !== "" && raw !== "0" && raw !== "false" && raw !== "off";
})();

/**
 * Frontend route-consolidation + parallel-pages flag (default ON).
 *
 * When enabled the frontend phase runs in two stages:
 *   1. `fe_foundation` — the design-system/shell task(s) run first, alone, so
 *      tokens + shared UI + layout + a MINIMAL router shell exist before pages.
 *   2. `fe_worker` — page/view tasks fan out in parallel (they're conflict-free
 *      once routing is no longer their responsibility), independent of
 *      BLUEPRINT_PARALLEL_CODING_WORKERS.
 * Then `fe_route_consolidation` writes the real `router.tsx` ONCE, registering
 * every view that actually exists (LLM + deterministic guardrails).
 *
 * Set BLUEPRINT_FE_ROUTE_CONSOLIDATION=0 to fall back to the legacy single-stage
 * frontend dispatch (foundation pre-registers all routes; pages serialized).
 */
export const ENABLE_FE_ROUTE_CONSOLIDATION =
  (process.env.BLUEPRINT_FE_ROUTE_CONSOLIDATION ?? "1").trim() !== "0";

/** Upper bound on parallel frontend page workers in the consolidation flow. */
export function frontendPageWorkerCount(pageTaskCount: number): number {
  if (pageTaskCount <= 1) return 1;
  if (pageTaskCount <= 3) return 2;
  if (pageTaskCount <= 6) return 3;
  if (pageTaskCount <= 10) return 4;
  return 5;
}

export function parsedWorkerLimit(): number | "auto" {
  if (PARALLEL_CODING_WORKERS_RAW === "auto") return "auto";
  const n = Number.parseInt(PARALLEL_CODING_WORKERS_RAW, 10);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return n;
}

export function workersForRole(role: CodingAgentRole, count: number): number {
  if (role === "test") return 1;
  if (role === "architect") {
    // Serial by default (shared-substrate safety). Opt-in fan-out: the caller
    // still routes through chunkTasksByFileConflict, so file-coupled /
    // dependency-ordered architect tasks collapse into one chunk and only
    // file-disjoint ones parallelize.
    if (!ENABLE_PARALLEL_FOUNDATION) return 1;
    const auto = count <= 3 ? 1 : count <= 8 ? 2 : 3;
    return Math.min(auto, count);
  }
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
 * Per coding-task increment added to the integration-verify-fix budget.
 * Larger projects produce proportionally more integration findings (route
 * registrations, contract holes, per-file tsc errors, TDD failures), so a
 * FLAT budget starved them: they burned the cap mid-repair and never advanced
 * to e2e/summary. Tunable via INTEGRATION_VERIFY_FIX_BUDGET_PER_TASK.
 */
export function readIntegrationVerifyFixBudgetPerTask(): number {
  const raw = Number(
    process.env.INTEGRATION_VERIFY_FIX_BUDGET_PER_TASK ?? "15",
  );
  if (!Number.isFinite(raw)) return 15;
  return Math.max(0, Math.min(100, Math.floor(raw)));
}

/** True when the operator pinned an ABSOLUTE budget via env (disables scaling). */
export function hasExplicitIntegrationVerifyFixTotalBudget(): boolean {
  return (process.env.INTEGRATION_VERIFY_FIX_TOTAL_BUDGET ?? "").trim() !== "";
}

/**
 * Size-scaled cumulative IntegrationVerifyFix budget:
 *   base + perTask × taskCount, clamped to [20, 2000].
 *
 * `base` is the existing flat default (300) — so a small project keeps at
 * least the historical budget and only larger projects get more. When the
 * operator sets INTEGRATION_VERIFY_FIX_TOTAL_BUDGET explicitly it is honoured
 * as an ABSOLUTE ceiling (scaling disabled) for backward compatibility.
 */
export function scaledIntegrationVerifyFixTotalBudget(
  taskCount: number,
): number {
  const base = readIntegrationVerifyFixTotalBudget();
  if (hasExplicitIntegrationVerifyFixTotalBudget()) return base;
  const n = Number.isFinite(taskCount) ? Math.max(0, Math.floor(taskCount)) : 0;
  const scaled = base + readIntegrationVerifyFixBudgetPerTask() * n;
  return Math.max(20, Math.min(2000, scaled));
}

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
