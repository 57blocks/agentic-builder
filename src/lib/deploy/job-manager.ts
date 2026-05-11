import { randomUUID } from "crypto";
import type { DeployJob, StepResult } from "./types";

const jobs = new Map<string, DeployJob>();

export function createJob(): DeployJob {
  const job: DeployJob = {
    id: randomUUID(),
    status: "running",
    steps: [],
    subscribers: new Set(),
  };
  jobs.set(job.id, job);
  return job;
}

export function getJob(id: string): DeployJob | undefined {
  return jobs.get(id);
}

export function emitStep(jobId: string, step: StepResult): void {
  const job = jobs.get(jobId);
  if (!job) return;

  const existing = job.steps.findIndex((s) => s.step === step.step);
  if (existing >= 0) {
    job.steps[existing] = step;
  } else {
    job.steps.push(step);
  }

  const data = `data: ${JSON.stringify(step)}\n\n`;
  const encoded = new TextEncoder().encode(data);
  for (const controller of job.subscribers) {
    try {
      controller.enqueue(encoded);
    } catch {
      job.subscribers.delete(controller);
    }
  }
}

export function completeJob(jobId: string, url: string, repoUrl: string): void {
  const job = jobs.get(jobId);
  if (!job) return;
  job.status = "done";
  job.url = url;
  job.repoUrl = repoUrl;
  closeSubscribers(job);
}

export function failJob(jobId: string): void {
  const job = jobs.get(jobId);
  if (!job) return;
  job.status = "error";
  closeSubscribers(job);
}

function closeSubscribers(job: DeployJob): void {
  for (const controller of job.subscribers) {
    try {
      controller.close();
    } catch {
      // already closed
    }
  }
  job.subscribers.clear();
}
