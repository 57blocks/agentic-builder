import { describe, it, expect } from "vitest";
import { decideAgentStop } from "../agent-subgraph";

const base = {
  taskComplete: false,
  roundStatusDone: false,
  producedFilesThisRound: false,
  remainingPlannedCreates: 0,
  hasWrites: false,
  staleRounds: 0,
  noProgressLimit: 6,
};

describe("decideAgentStop", () => {
  it("keeps looping when nothing signals completion and progress is fresh", () => {
    expect(decideAgentStop({ ...base, producedFilesThisRound: true, hasWrites: true, remainingPlannedCreates: 2 })).toBeNull();
    expect(decideAgentStop({ ...base, staleRounds: 3 })).toBeNull();
  });

  it("completes on explicit task_complete signal once the plan is satisfied", () => {
    expect(
      decideAgentStop({ ...base, taskComplete: true, hasWrites: true, remainingPlannedCreates: 0 }),
    ).toEqual({ completed: true, reason: "task_complete" });
  });

  it("does NOT complete on a done signal while planned files remain", () => {
    expect(
      decideAgentStop({ ...base, taskComplete: true, hasWrites: true, remainingPlannedCreates: 1 }),
    ).toBeNull();
  });

  it("completes via status_done", () => {
    expect(
      decideAgentStop({ ...base, roundStatusDone: true, hasWrites: true, remainingPlannedCreates: 0 }),
    ).toEqual({ completed: true, reason: "status_done" });
  });

  it("completes when all planned files were written this round (tool or file-block)", () => {
    expect(
      decideAgentStop({ ...base, producedFilesThisRound: true, hasWrites: true, remainingPlannedCreates: 0 }),
    ).toEqual({ completed: true, reason: "legacy_file_blocks" });
  });

  it("trips the no-progress backstop and reports completed when something was written", () => {
    expect(
      decideAgentStop({ ...base, staleRounds: 6, hasWrites: true }),
    ).toEqual({ completed: true, reason: "no_progress" });
  });

  it("trips the no-progress backstop as NOT completed when nothing was ever written", () => {
    expect(
      decideAgentStop({ ...base, staleRounds: 6, hasWrites: false }),
    ).toEqual({ completed: false, reason: "no_progress" });
  });

  it("explicit completion takes precedence over the stale backstop", () => {
    expect(
      decideAgentStop({ ...base, taskComplete: true, hasWrites: true, remainingPlannedCreates: 0, staleRounds: 99 }),
    ).toEqual({ completed: true, reason: "task_complete" });
  });
});
