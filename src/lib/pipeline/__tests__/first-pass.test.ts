import { describe, it, expect } from "vitest";
import { deriveFirstPass, extractCodefixCounts } from "@/lib/pipeline/first-pass";

describe("deriveFirstPass", () => {
  it("counts tasks completed with no codefix events as first-pass", () => {
    const r = deriveFirstPass({
      taskResults: [
        { id: "T-001", status: "completed" } as any,
        { id: "T-002", status: "completed" } as any,
        { id: "T-003", status: "completed" } as any,
      ],
      codefixCountsByTask: { "T-002": 2 },
    });
    expect(r.tasksTotal).toBe(3);
    expect(r.firstPassCount).toBe(2);
    expect(r.avgFixIterations).toBeCloseTo(2 / 3);
  });

  it("ignores non-completed tasks for first-pass count", () => {
    const r = deriveFirstPass({
      taskResults: [
        { id: "T-001", status: "completed" } as any,
        { id: "T-002", status: "failed" } as any,
      ],
      codefixCountsByTask: {},
    });
    expect(r.firstPassCount).toBe(1);
  });

  it("returns zero-everything when no tasks", () => {
    const r = deriveFirstPass({ taskResults: [], codefixCountsByTask: {} });
    expect(r.tasksTotal).toBe(0);
    expect(r.firstPassCount).toBe(0);
    expect(r.avgFixIterations).toBe(0);
  });
});

describe("extractCodefixCounts", () => {
  it("counts repair-log entries by taskId where stage matches worker_codefix", () => {
    const entries = [
      { stage: "worker_codefix", taskId: "T-001", event: "x" },
      { stage: "worker_codefix:Architect", taskId: "T-001", event: "y" },
      { stage: "worker-codefix", taskId: "T-002", event: "z" },
      { stage: "worker_codegen", taskId: "T-003", event: "ignore" },
      { stage: "worker_codefix", event: "no taskId" },
    ] as any[];
    const counts = extractCodefixCounts(entries);
    expect(counts).toEqual({ "T-001": 2, "T-002": 1 });
  });
});
