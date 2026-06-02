import { describe, expect, it } from "vitest";

import { buildSubsystemCodingRequest, verdictFromCheckpoint } from "../coding-runner";
import type { SubsystemCodingContext } from "../coding-runner";
import type { SubsystemBuildStep } from "../orchestrate";
import type { SessionCheckpoint } from "../../session-checkpoint";
import type { KickoffWorkItem } from "../../types";

const ALL_TASKS: KickoffWorkItem[] = [
  { id: "auth-1", phase: "Backend Services", title: "a", description: "", estimatedHours: 1, executionKind: "ai_autonomous" },
  { id: "enr-1", phase: "Backend Services", title: "b", description: "", estimatedHours: 1, executionKind: "ai_autonomous" },
];

const ctx: SubsystemCodingContext = {
  baseUrl: "http://127.0.0.1:3000",
  runId: "run-1",
  allTasks: ALL_TASKS,
  codeOutputDir: "out",
  projectTier: "L",
};

const step: SubsystemBuildStep = {
  layer: 1,
  subsystemId: "enrollment",
  taskIds: ["auth-1", "enr-1"],
  dependsOn: ["auth"],
};

describe("buildSubsystemCodingRequest", () => {
  it("sends the full task list + the subset as retryFailedTaskIds", () => {
    const body = buildSubsystemCodingRequest(step, ctx);
    expect(body.runId).toBe("run-1");
    expect(body.tasks).toBe(ALL_TASKS); // whole list; route filters
    expect(body.retryFailedTaskIds).toEqual(["auth-1", "enr-1"]);
    expect(body.codeOutputDir).toBe("out");
    expect(body.projectTier).toBe("L");
  });
});

function checkpoint(taskResults: SessionCheckpoint["taskResults"]): SessionCheckpoint {
  return { sessionId: "s", savedAt: "t", completedTaskIds: [], failedTaskIds: [], taskResults };
}

describe("verdictFromCheckpoint", () => {
  it("ok when every subset task completed (warnings count as ok)", () => {
    const v = verdictFromCheckpoint(
      checkpoint({
        "auth-1": { status: "completed", generatedFiles: [] },
        "enr-1": { status: "completed_with_warnings", generatedFiles: [] },
      }),
      step,
    );
    expect(v.ok).toBe(true);
    expect(v.summary).toMatch(/2\/2 completed/);
  });

  it("fails when a subset task failed", () => {
    const v = verdictFromCheckpoint(
      checkpoint({
        "auth-1": { status: "completed", generatedFiles: [] },
        "enr-1": { status: "failed", generatedFiles: [] },
      }),
      step,
    );
    expect(v.ok).toBe(false);
    expect(v.summary).toMatch(/failed: enr-1/);
  });

  it("fails when a subset task is missing from the checkpoint (never ran)", () => {
    const v = verdictFromCheckpoint(
      checkpoint({ "auth-1": { status: "completed", generatedFiles: [] } }),
      step,
    );
    expect(v.ok).toBe(false);
    expect(v.summary).toMatch(/missing: enr-1/);
  });

  it("fails when no checkpoint exists", () => {
    expect(verdictFromCheckpoint(null, step).ok).toBe(false);
  });

  it("ok (no-op) when the subsystem has no tasks", () => {
    const v = verdictFromCheckpoint(null, { ...step, taskIds: [] });
    expect(v.ok).toBe(true);
  });
});
