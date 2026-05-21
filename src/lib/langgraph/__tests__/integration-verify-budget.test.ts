/**
 * Guards the cumulative IntegrationVerifyFix circuit-breaker:
 *  - the remaining-budget arithmetic (config helpers), and
 *  - the routing predicates that must stop re-entering integration_verify
 *    once the session-wide budget is spent, even while the TDD gate is red.
 *
 * Without this breaker the tdd_green_verify ⇄ integration_verify edge loops
 * forever when the TDD hard gate cannot be cleared (runtime.log 2026-05-20).
 */
import { describe, it, expect } from "vitest";
import {
  INTEGRATION_VERIFY_FIX_TOTAL_BUDGET,
  remainingIntegrationVerifyBudget,
  integrationVerifyBudgetExhausted,
} from "../supervisor/config";
import {
  routeAfterTddGreenVerify,
  routeAfterTddGreenVerifyRetry,
} from "../supervisor/routing";
import type { SupervisorState } from "../state";

function stateWith(
  integrationErrors: string,
  integrationFixAttempts: number,
): SupervisorState {
  return { integrationErrors, integrationFixAttempts } as SupervisorState;
}

describe("remainingIntegrationVerifyBudget", () => {
  it("returns the full budget when nothing has been spent", () => {
    expect(remainingIntegrationVerifyBudget(0, 300)).toBe(300);
  });

  it("subtracts prior attempts", () => {
    expect(remainingIntegrationVerifyBudget(120, 300)).toBe(180);
  });

  it("never goes negative", () => {
    expect(remainingIntegrationVerifyBudget(400, 300)).toBe(0);
  });

  it("treats non-finite / negative prior attempts as zero", () => {
    expect(remainingIntegrationVerifyBudget(Number.NaN, 300)).toBe(300);
    expect(remainingIntegrationVerifyBudget(-50, 300)).toBe(300);
  });

  it("defaults to the configured total budget", () => {
    expect(remainingIntegrationVerifyBudget(0)).toBe(
      INTEGRATION_VERIFY_FIX_TOTAL_BUDGET,
    );
  });
});

describe("integrationVerifyBudgetExhausted", () => {
  it("is false while budget remains", () => {
    expect(integrationVerifyBudgetExhausted(299, 300)).toBe(false);
  });
  it("is true exactly at the budget", () => {
    expect(integrationVerifyBudgetExhausted(300, 300)).toBe(true);
  });
  it("is true past the budget", () => {
    expect(integrationVerifyBudgetExhausted(305, 300)).toBe(true);
  });
});

describe("routeAfterTddGreenVerify circuit-breaker", () => {
  it("re-enters integration_verify while the gate is red and budget remains", () => {
    const s = stateWith("TDD hard gate failed: P0 ...", 40);
    expect(routeAfterTddGreenVerify(s)).toBe("integration_verify");
  });

  it("breaks out to e2e_verify once the budget is exhausted, even if gate red", () => {
    const s = stateWith(
      "TDD hard gate failed: P0 ...",
      INTEGRATION_VERIFY_FIX_TOTAL_BUDGET,
    );
    expect(routeAfterTddGreenVerify(s)).toBe("e2e_verify");
  });

  it("proceeds normally when the gate is green", () => {
    const s = stateWith("", 10);
    expect(routeAfterTddGreenVerify(s)).toBe("e2e_verify");
  });
});

describe("routeAfterTddGreenVerifyRetry circuit-breaker", () => {
  it("re-enters integration_verify while the gate is red and budget remains", () => {
    const s = stateWith("TDD hard gate failed", 5);
    expect(routeAfterTddGreenVerifyRetry(s)).toBe("integration_verify");
  });

  it("goes to summary once the budget is exhausted", () => {
    const s = stateWith(
      "TDD hard gate failed",
      INTEGRATION_VERIFY_FIX_TOTAL_BUDGET + 1,
    );
    expect(routeAfterTddGreenVerifyRetry(s)).toBe("summary");
  });

  it("goes to summary when the gate is green", () => {
    const s = stateWith("", 0);
    expect(routeAfterTddGreenVerifyRetry(s)).toBe("summary");
  });
});
