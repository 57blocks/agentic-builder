/**
 * M5 — real `runCoding` adapter for the subsystem orchestrator.
 *
 * Bridges a `SubsystemBuildStep` (from planSubsystemBuilds) to the existing
 * coding pipeline (`POST /api/agents/coding`). The key insight: the coding
 * route's `retryFailedTaskIds` parameter is exactly the subset mechanism — it
 * runs ONLY the given task ids (plus their transitive deps) and SKIPS scaffold
 * cleanup, preserving work from previously-built subsystems. So each subsystem
 * build is a coding call with `retryFailedTaskIds = step.taskIds`.
 *
 * Verdict (ok/fail) is read from the durable session checkpoint
 * (`.blueprint/last-coding-session.json`) rather than parsed from the SSE
 * stream — the checkpoint carries each task's terminal status.
 *
 * `buildSubsystemCodingRequest` and `verdictFromCheckpoint` are pure and
 * unit-tested; `makeHttpCodingRunner` is the live wire (validated against a
 * running server).
 */

import type { KickoffWorkItem } from "../types";
import {
  readSessionCheckpoint,
  type SessionCheckpoint,
} from "../session-checkpoint";
import type {
  SubsystemBuildStep,
  SubsystemCodingRunner,
} from "./orchestrate";

export interface SubsystemCodingContext {
  /** Base URL of the running app, e.g. "http://127.0.0.1:3000". */
  baseUrl: string;
  /** Coding run id (shared across all subsystem builds of one run). */
  runId: string;
  /** The WHOLE-system task list (the coding route filters to the subset). */
  allTasks: KickoffWorkItem[];
  /** Project root used to read the checkpoint (defaults to process.cwd()). */
  projectRoot?: string;
  /** Passed through to the coding route. */
  codeOutputDir?: string;
  projectTier?: "S" | "M" | "L";
  /** Per-chunk progress callback while draining the SSE stream (optional). */
  onProgress?: (subsystemId: string, chunk: string) => void;
  /** Override the request timeout per subsystem build (ms). */
  timeoutMs?: number;
}

export interface SubsystemCodingRequest {
  runId: string;
  tasks: KickoffWorkItem[];
  codeOutputDir?: string;
  projectTier?: "S" | "M" | "L";
  /** The subset to actually run (subsystem tasks + transitive deps). */
  retryFailedTaskIds: string[];
}

/** Pure: the POST body for one subsystem build. */
export function buildSubsystemCodingRequest(
  step: SubsystemBuildStep,
  ctx: SubsystemCodingContext,
): SubsystemCodingRequest {
  return {
    runId: ctx.runId,
    tasks: ctx.allTasks,
    codeOutputDir: ctx.codeOutputDir,
    projectTier: ctx.projectTier,
    retryFailedTaskIds: step.taskIds,
  };
}

/**
 * Pure: derive ok/fail for a subsystem from the session checkpoint. ok ⇔ every
 * task in `step.taskIds` reached `completed` or `completed_with_warnings`. A
 * `failed`/`unknown` status — or a task missing from the checkpoint (never ran)
 * — fails the subsystem.
 */
export function verdictFromCheckpoint(
  checkpoint: SessionCheckpoint | null,
  step: SubsystemBuildStep,
): { ok: boolean; summary: string } {
  if (step.taskIds.length === 0) {
    return { ok: true, summary: `${step.subsystemId}: no tasks to build.` };
  }
  if (!checkpoint) {
    return { ok: false, summary: `${step.subsystemId}: no checkpoint found after coding run.` };
  }
  const results = checkpoint.taskResults ?? {};
  const failed: string[] = [];
  const missing: string[] = [];
  let completed = 0;
  for (const id of step.taskIds) {
    const entry = results[id];
    if (!entry) {
      missing.push(id);
    } else if (entry.status === "completed" || entry.status === "completed_with_warnings") {
      completed += 1;
    } else {
      failed.push(id);
    }
  }
  const ok = failed.length === 0 && missing.length === 0;
  const parts = [`${completed}/${step.taskIds.length} completed`];
  if (failed.length) parts.push(`failed: ${failed.slice(0, 10).join(", ")}`);
  if (missing.length) parts.push(`missing: ${missing.slice(0, 10).join(", ")}`);
  return { ok, summary: `${step.subsystemId}: ${parts.join(" · ")}` };
}

/** Drain an SSE/NDJSON response body to completion (we rely on the checkpoint
 *  for the verdict; this just waits for the run to finish). */
export async function drainStream(
  body: ReadableStream<Uint8Array> | null,
  onChunk?: (chunk: string) => void,
): Promise<void> {
  if (!body) return;
  const reader = body.getReader();
  const decoder = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (onChunk && value) onChunk(decoder.decode(value, { stream: true }));
  }
}

/**
 * Build the live `runCoding` callback for `runSubsystemBuilds`. Each call POSTs
 * the subsystem's subset to the coding endpoint, waits for the stream to finish,
 * then reads the checkpoint to decide ok/fail.
 */
export function makeHttpCodingRunner(
  ctx: SubsystemCodingContext,
): SubsystemCodingRunner {
  const projectRoot = ctx.projectRoot ?? process.cwd();
  return async (step: SubsystemBuildStep) => {
    if (step.taskIds.length === 0) {
      return { ok: true, summary: `${step.subsystemId}: nothing to build.` };
    }
    const body = buildSubsystemCodingRequest(step, ctx);
    const controller = new AbortController();
    const timer = ctx.timeoutMs
      ? setTimeout(() => controller.abort(), ctx.timeoutMs)
      : null;
    try {
      const resp = await fetch(`${ctx.baseUrl}/api/agents/coding`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        return { ok: false, summary: `${step.subsystemId}: coding endpoint ${resp.status} ${text.slice(0, 200)}` };
      }
      await drainStream(resp.body, ctx.onProgress ? (c) => ctx.onProgress!(step.subsystemId, c) : undefined);
    } catch (err) {
      return { ok: false, summary: `${step.subsystemId}: coding request failed — ${err instanceof Error ? err.message : String(err)}` };
    } finally {
      if (timer) clearTimeout(timer);
    }
    // Verdict from the durable checkpoint.
    const checkpoint = await readSessionCheckpoint(projectRoot);
    return verdictFromCheckpoint(checkpoint, step);
  };
}
