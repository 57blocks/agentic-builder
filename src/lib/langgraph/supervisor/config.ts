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
//   "auto"       → DEFAULT. Fan out one worker per file/dependency-disjoint task
//                  group (capped by CODING_WORKER_CAP). `chunkTasksByFileConflict`
//                  is the real limiter: tasks sharing a dependency edge or a
//                  file (creates↔reads/modifies, modifies↔modifies) collapse into
//                  ONE chunk and run serially in a single worker; disjoint groups
//                  run in parallel. I.e. "same path → serial, different path →
//                  parallel".
//   "0"          → legacy single-worker behaviour (each role strictly serial).
//   <integer>    → explicit upper bound on workers per coding role.
export const PARALLEL_CODING_WORKERS_RAW = (
  process.env.BLUEPRINT_PARALLEL_CODING_WORKERS ?? "auto"
).trim();

export const ENABLE_PARALLEL_CODING_WORKERS =
  PARALLEL_CODING_WORKERS_RAW !== "" && PARALLEL_CODING_WORKERS_RAW !== "0";

/**
 * Upper bound on concurrent backend/frontend/fullstack coding workers when
 * BLUEPRINT_PARALLEL_CODING_WORKERS="auto". The REAL limiter is
 * `chunkTasksByFileConflict` (disjoint task groups → separate workers; coupled
 * ones collapse) — this cap just stops a huge phase from spawning dozens of
 * concurrent LLM workers. Override via BLUEPRINT_CODING_MAX_WORKERS.
 */
export const CODING_WORKER_CAP = (() => {
  const raw = Number.parseInt(
    (process.env.BLUEPRINT_CODING_MAX_WORKERS ?? "8").trim(),
    10,
  );
  return Number.isFinite(raw) && raw > 0 ? raw : 8;
})();

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
 * Upper bound on concurrent architect/foundation workers when
 * CODEGEN_PARALLEL_FOUNDATION is on. The REAL limiter is
 * `chunkTasksByFileConflict` (file-disjoint tasks → separate chunks, coupled
 * ones collapse) — this cap just bounds fan-out so a huge foundation can't spawn
 * dozens of concurrent LLM workers. Override via CODEGEN_FOUNDATION_MAX_WORKERS.
 */
export const FOUNDATION_WORKER_CAP = (() => {
  const raw = Number.parseInt(
    (process.env.CODEGEN_FOUNDATION_MAX_WORKERS ?? "6").trim(),
    10,
  );
  return Number.isFinite(raw) && raw > 0 ? raw : 6;
})();

/**
 * Parallel BACKEND+FRONTEND codegen flag (default OFF).
 *
 * When on, the BE phase and FE phase (foundation→pages→route-consolidation) run
 * CONCURRENTLY inside one `parallel_codegen` node (Promise.all over two phase
 * subgraphs), then verify + contract-extraction run post-join. This requires FE
 * to trust the AUTHORITATIVE upfront ENDPOINTS contract (option-A) rather than
 * waiting to see what the backend actually wrote — `dispatchFrontendWorkers`
 * uses the upfront contract when this is on. Drift between BE's implementation
 * and the contract is caught post-join by `extract_real_contracts` (now a
 * verify) + integration tests, not by FE-waits-for-BE.
 *
 * Default OFF → the graph is wired exactly as before (BE→extract→FE sequential).
 */
export const ENABLE_PARALLEL_FE_BE = (() => {
  const raw = (process.env.CODEGEN_PARALLEL_FE_BE ?? "0").trim().toLowerCase();
  return raw !== "" && raw !== "0" && raw !== "false" && raw !== "off";
})();

/**
 * Schema reconciliation flag (default OFF).
 *
 * When on, a `schema_reconcile` node runs AFTER the frontend phase: it applies
 * any FRONTEND-discovered schema-change-requests (filed during the FE phase) to
 * the shared schema, re-derives API_CONTRACTS, and runs a backend repair pass to
 * IMPLEMENT any endpoint the amendment added but no task produces — closing the
 * "FE needs an endpoint the backend never built" gap that today only gets filed
 * to .ralph/schema-change-requests.jsonl and then ignored.
 *
 * Default OFF → `schema_reconcile` is a passthrough no-op (zero behaviour change).
 * Runs LLM workers, so it must be validated on a real run before defaulting on.
 */
export const ENABLE_SCHEMA_RECONCILE = (() => {
  const raw = (process.env.CODEGEN_SCHEMA_RECONCILE ?? "0").trim().toLowerCase();
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
    // Serial by default (shared-substrate safety). Opt-in fan-out: hand the raw
    // task count (capped) to the caller, which routes through
    // chunkTasksByFileConflict — THAT decides real parallelism (file-disjoint →
    // separate chunks; file-coupled / dependency-ordered → one chunk, serial).
    // We deliberately do NOT throttle by task count here: the old `≤3 → 1`
    // heuristic kept small foundations (e.g. 3 disjoint tasks: docker / models /
    // api-contracts) serial, defeating the purpose.
    if (!ENABLE_PARALLEL_FOUNDATION) return 1;
    return Math.min(count, FOUNDATION_WORKER_CAP);
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
    // "auto": allow up to one worker per task (capped), and let
    // chunkTasksByFileConflict collapse same-path tasks into shared chunks.
    // We deliberately do NOT throttle by task count (the old `≤3 → 1` heuristic
    // re-serialized small sets of genuinely independent tasks, defeating the
    // "different path → parallel" guarantee).
    if (limit === "auto") return Math.min(count, CODING_WORKER_CAP);
    return Math.min(limit, count);
  }
  if (count <= 3) return 1;
  if (count <= 8) return 2;
  return 3;
}

// ─── Phase-level retry budgets ──────────────────────────────────────────

/**
 * Max number of automated fix attempts inside the e2e_verify node for
 * DETERMINISTIC failures (real code bugs). The loop keeps fixing + re-running
 * until the suite is green or this cap is hit; hitting the cap with failures
 * still present HARD-FAILS the session (see e2eVerifyAndFix → e2eDeterministicUnresolved).
 * Flaky/infra failures exit the loop immediately and do NOT count against this.
 * Raise via E2E_VERIFY_FIX_ATTEMPTS to push harder toward all-green.
 */
export const MAX_E2E_VERIFY_FIX_ATTEMPTS = (() => {
  const raw = Number.parseInt(
    (process.env.E2E_VERIFY_FIX_ATTEMPTS ?? "10").trim(),
    10,
  );
  return Number.isFinite(raw) && raw > 0 ? raw : 10;
})();

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
