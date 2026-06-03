import { describe, expect, it } from "vitest";

import { selectFoundationTaskIds, buildFoundationCodingRequest } from "../foundation";
import type { SubsystemBuildPlan } from "../orchestrate";
import type { SubsystemCodingContext } from "../coding-runner";
import type { KickoffWorkItem } from "../../types";

function task(id: string, deps?: string[]): KickoffWorkItem {
  return {
    id,
    phase: "Data Layer",
    title: id,
    description: "",
    estimatedHours: 1,
    executionKind: "ai_autonomous",
    dependencies: deps,
  };
}

const ALL: KickoffWorkItem[] = [
  task("scaffold"),
  task("models", ["scaffold"]),
  task("contracts", ["models"]),
  task("auth-1", ["models"]), // a subsystem task (assigned)
];

// plan where scaffold/models/contracts are unassigned (foundation), auth-1 is owned.
const PLAN: SubsystemBuildPlan = {
  layers: [[{ layer: 0, subsystemId: "auth", taskIds: ["models", "scaffold", "auth-1"], dependsOn: [], scopeEndpoints: [] }]],
  unassignedTaskIds: ["contracts", "scaffold", "models"],
  errors: [],
};

const ctx: SubsystemCodingContext = {
  baseUrl: "http://127.0.0.1:3000",
  runId: "run-1",
  allTasks: ALL,
  projectTier: "L",
};

describe("selectFoundationTaskIds", () => {
  it("returns the unassigned tasks + their deps, in original task order", () => {
    const ids = selectFoundationTaskIds(PLAN, ALL);
    // contracts→models→scaffold all foundation; ordered by position in ALL
    expect(ids).toEqual(["scaffold", "models", "contracts"]);
    expect(ids).not.toContain("auth-1"); // a subsystem task, not foundation
  });
});

describe("buildFoundationCodingRequest", () => {
  it("sends ONLY the foundation tasks and OMITS retryFailedTaskIds (full mode)", () => {
    const ids = selectFoundationTaskIds(PLAN, ALL);
    const body = buildFoundationCodingRequest(ALL, ids, ctx);
    expect(body.tasks.map((t) => t.id)).toEqual(["scaffold", "models", "contracts"]);
    expect("retryFailedTaskIds" in body).toBe(false);
    expect(body.runId).toBe("run-1");
    expect(body.projectTier).toBe("L");
  });
});
