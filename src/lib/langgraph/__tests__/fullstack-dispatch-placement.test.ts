/**
 * P1 vertical-slice (placement fix): fullstack "Feature" tasks must dispatch
 * in the BACKEND phase (be_worker) — NOT the frontend phase — so the endpoints
 * they own run BEFORE extract_real_contracts and are covered by be_phase_verify
 * + integration_verify that same cycle.
 *
 * Flag-off invariant: with no fullstack tasks, both dispatchers produce exactly
 * the Sends they did before the vertical-slice work (byte-identical behavior).
 */

import { describe, expect, it } from "vitest";

import type { CodingTask } from "@/lib/pipeline/types";
import type { SupervisorState } from "../state";
import {
  dispatchBackendAndTestWorkers,
  dispatchFrontendWorkers,
} from "../supervisor";

function makeTask(id: string, phase: string): CodingTask {
  return {
    id,
    phase,
    title: `task ${id}`,
    description: `desc ${id}`,
    estimatedHours: 1,
    executionKind: "ai_autonomous",
    assignedAgentId: null,
    codingStatus: "pending",
  } as CodingTask;
}

function baseState(
  overrides: Partial<SupervisorState> = {},
): SupervisorState {
  return {
    backendTasks: [],
    frontendTasks: [],
    fullstackTasks: [],
    testTasks: [],
    apiContracts: [],
    fileRegistry: [],
    outputDir: "/tmp/out",
    projectContext: "ctx",
    codingMode: "balanced",
    scaffoldProtectedPaths: [],
    ralphConfig: {},
    sessionId: "sess-1",
    prdSpec: null,
    frontendDesignContext: undefined,
    ...overrides,
  } as unknown as SupervisorState;
}

describe("fullstack dispatch placement", () => {
  it("dispatches fullstack Feature tasks in the BACKEND phase, on be_worker, role fullstack", () => {
    const state = baseState({
      backendTasks: [makeTask("B1", "Backend Services")],
      fullstackTasks: [makeTask("F1", "Feature")],
    });

    const beSends = dispatchBackendAndTestWorkers(state);

    // every Send goes to be_worker
    expect(beSends.every((s) => s.node === "be_worker")).toBe(true);

    const fsSends = beSends.filter(
      (s) => (s.args as { role?: string }).role === "fullstack",
    );
    expect(fsSends.length).toBe(1);
    const fsArgs = fsSends[0].args as { tasks: CodingTask[] };
    expect(fsArgs.tasks.map((t) => t.id)).toEqual(["F1"]);

    // backend-role Send still present and carries the backend task
    const beRoleSends = beSends.filter(
      (s) => (s.args as { role?: string }).role === "backend",
    );
    expect(beRoleSends.length).toBe(1);
  });

  it("does NOT dispatch fullstack tasks in the frontend phase", () => {
    const state = baseState({
      frontendTasks: [makeTask("FE1", "Frontend")],
      fullstackTasks: [makeTask("F1", "Feature")],
    });

    const feSends = dispatchFrontendWorkers(state);
    const fsSends = feSends.filter(
      (s) => (s.args as { role?: string }).role === "fullstack",
    );
    expect(fsSends.length).toBe(0);
    // frontend task still dispatched
    expect(
      feSends.some((s) => (s.args as { role?: string }).role === "frontend"),
    ).toBe(true);
  });

  it("flag-off invariant: no fullstack tasks ⇒ BE dispatch has no fullstack Send", () => {
    const state = baseState({
      backendTasks: [makeTask("B1", "Backend Services")],
      testTasks: [makeTask("T1", "Testing")],
      // fullstackTasks defaults to []
    });

    const beSends = dispatchBackendAndTestWorkers(state);
    const roles = beSends.map((s) => (s.args as { role?: string }).role).sort();
    expect(roles).toEqual(["backend", "test"]);
    expect(roles).not.toContain("fullstack");
  });

  it("flag-off invariant: no frontend AND no fullstack ⇒ single No-op fe_worker Send", () => {
    const state = baseState({});
    const feSends = dispatchFrontendWorkers(state);
    expect(feSends.length).toBe(1);
    expect(feSends[0].node).toBe("fe_worker");
    expect((feSends[0].args as { workerLabel: string }).workerLabel).toBe(
      "No-op",
    );
  });
});
