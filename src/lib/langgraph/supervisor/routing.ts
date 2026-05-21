import type { SupervisorState } from "../state";
import {
  INTEGRATION_VERIFY_FIX_TOTAL_BUDGET,
  MAX_E2E_VERIFY_FIX_ATTEMPTS,
  integrationVerifyBudgetExhausted,
} from "./config";

/**
 * LangGraph conditional-edge predicates that decide which downstream node
 * should run after a verify node completes.
 *
 * Keeping these pure & co-located makes the graph topology in
 * `graph-builder.ts` easy to reason about: every routing decision is
 * one import-and-look-up away.
 */

export function routeAfterIntegrationVerify(state: SupervisorState): string {
  // CODEGEN_HARDENING_PLAN.md §7.3 — "FAILED_BUT_CONTINUED" policy:
  // Always proceed to e2e_verify even when integration failed. Skipping e2e
  // because integration FAIL'd hides the highest-signal readiness data
  // (whether the app actually starts and serves traffic). Session 52851b86
  // SKIPPED runtime+e2e because of an over-generated contract that could
  // never have implemented endpoints — but the produced code DID build and
  // start. The report should reflect that, not collapse to a single
  // "graph_error" header.
  //
  // The session's overall status will still be marked "fail" downstream
  // (route.ts wraps the post-graph throw on any non-empty gate errors),
  // but every gate gets to run and contribute its evidence first.
  if (state.integrationErrors) {
    console.log(
      "[Supervisor] routeAfterIntegrationVerify: integration FAILED — proceeding to e2e_verify anyway (FAIL_CONTINUED policy).",
    );
  }
  return "e2e_verify";
}

export function routeAfterTddGreenVerify(state: SupervisorState): string {
  if (state.integrationErrors?.includes("TDD hard gate failed")) {
    // Circuit-breaker: stop sending control back to integration_verify once
    // the cumulative IntegrationVerifyFix budget is spent, even if the TDD
    // hard gate is still red. Otherwise the gate-fail → re-enter edge loops
    // forever (the node would just short-circuit and re-emit "TDD hard gate
    // failed" with zero progress). See INTEGRATION_VERIFY_FIX_TOTAL_BUDGET.
    if (integrationVerifyBudgetExhausted(state.integrationFixAttempts)) {
      console.warn(
        `[Supervisor] routeAfterTddGreenVerify: TDD hard gate still red but IntegrationVerifyFix budget exhausted (${state.integrationFixAttempts}/${INTEGRATION_VERIFY_FIX_TOTAL_BUDGET}) — breaking the loop and proceeding to e2e/summary with errors recorded.`,
      );
      return routeAfterIntegrationVerify(state);
    }
    console.log(
      `[Supervisor] routeAfterTddGreenVerify: P0 TDD hard gate failed — returning to integration_verify for another repair pass (${state.integrationFixAttempts}/${INTEGRATION_VERIFY_FIX_TOTAL_BUDGET} cumulative iterations used).`,
    );
    return "integration_verify";
  }
  return routeAfterIntegrationVerify(state);
}

export function routeAfterTddGreenVerifyRetry(state: SupervisorState): string {
  if (!state.integrationErrors?.includes("TDD hard gate failed")) {
    return "summary";
  }
  if (integrationVerifyBudgetExhausted(state.integrationFixAttempts)) {
    console.warn(
      `[Supervisor] routeAfterTddGreenVerifyRetry: TDD hard gate still red but IntegrationVerifyFix budget exhausted (${state.integrationFixAttempts}/${INTEGRATION_VERIFY_FIX_TOTAL_BUDGET}) — proceeding to summary.`,
    );
    return "summary";
  }
  return "integration_verify";
}

export function routeAfterE2eVerify(state: SupervisorState): string {
  if (!state.e2eVerifyErrors) {
    return "summary";
  }
  if (state.e2eVerifyAttempts <= MAX_E2E_VERIFY_FIX_ATTEMPTS) {
    return "e2e_verify";
  }
  // All attempts exhausted but still failing — proceed to summary with errors recorded.
  console.warn(
    `[Supervisor] e2eVerify: all ${MAX_E2E_VERIFY_FIX_ATTEMPTS} fix attempts exhausted, proceeding to summary with remaining failures.`,
  );
  return "summary";
}
