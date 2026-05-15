import { describe, it, expect, beforeEach } from "vitest";
import { createJob, getJob, emitStep, completeJob, failJob } from "../job-manager";
import type { StepResult } from "../types";

beforeEach(() => {
  // job-manager uses a module-level Map; tests share state but use unique IDs
});

describe("createJob", () => {
  it("creates a job with running status and empty steps", () => {
    const job = createJob();
    expect(job.id).toMatch(/^[a-f0-9-]{36}$/);
    expect(job.status).toBe("running");
    expect(job.steps).toEqual([]);
    expect(job.subscribers.size).toBe(0);
  });
});

describe("getJob", () => {
  it("returns the job by id", () => {
    const job = createJob();
    expect(getJob(job.id)).toBe(job);
  });

  it("returns undefined for unknown id", () => {
    expect(getJob("nonexistent")).toBeUndefined();
  });
});

describe("emitStep", () => {
  it("appends step to job.steps", () => {
    const job = createJob();
    const step: StepResult = { step: "git-push", status: "done", message: "Pushed" };
    emitStep(job.id, step);
    expect(getJob(job.id)!.steps).toHaveLength(1);
    expect(getJob(job.id)!.steps[0]).toEqual(step);
  });

  it("updates existing step if same stepId is emitted again", () => {
    const job = createJob();
    emitStep(job.id, { step: "git-push", status: "running", message: "Pushing..." });
    emitStep(job.id, { step: "git-push", status: "done", message: "Done" });
    const steps = getJob(job.id)!.steps;
    expect(steps).toHaveLength(1);
    expect(steps[0].status).toBe("done");
  });
});

describe("completeJob / failJob", () => {
  it("sets status to done and records url", () => {
    const job = createJob();
    completeJob(job.id, "https://app.example.com", "https://github.com/owner/app");
    expect(getJob(job.id)!.status).toBe("done");
    expect(getJob(job.id)!.url).toBe("https://app.example.com");
    expect(getJob(job.id)!.repoUrl).toBe("https://github.com/owner/app");
  });

  it("sets status to error", () => {
    const job = createJob();
    failJob(job.id);
    expect(getJob(job.id)!.status).toBe("error");
  });
});
