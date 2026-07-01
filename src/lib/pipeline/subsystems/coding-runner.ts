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

import { Agent } from "undici";
import type { KickoffWorkItem } from "../types";
import {
  readSessionCheckpoint,
  type SessionCheckpoint,
} from "../session-checkpoint";
import { writeActiveScope } from "./active-scope";
import { resolveCodeOutputRoot } from "../code-output";
import type {
  SubsystemBuildStep,
  SubsystemCodingRunner,
} from "./orchestrate";

/**
 * Dispatcher for the orchestrator → sub-build self-fetch (foundation + domains).
 *
 * The sub-build's route runs minutes of SYNCHRONOUS setup — scaffold, pnpm
 * install, shared-schema distribution, typed-client generation, and TDD-manifest
 * generation (an LLM call) — BEFORE it returns the streaming Response. undici's
 * DEFAULT headersTimeout is 300s, so the drain fetch was dying with
 * `UND_ERR_HEADERS_TIMEOUT` at exactly 301s, before the build ever streamed a
 * byte. These are internal, legitimately-long self-calls, so give headers/body a
 * generous window; a genuinely hung build still eventually trips this and
 * recovers via the durable checkpoint. Override with SUBSYSTEM_FETCH_TIMEOUT_MS.
 */
const SUBSYSTEM_FETCH_TIMEOUT_MS = Number(
  process.env.SUBSYSTEM_FETCH_TIMEOUT_MS ?? 30 * 60_000,
);
export const subsystemFetchDispatcher = new Agent({
  headersTimeout: SUBSYSTEM_FETCH_TIMEOUT_MS,
  bodyTimeout: SUBSYSTEM_FETCH_TIMEOUT_MS,
});

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
  /** Marks this as a scoped sub-call from the orchestrator so the coding route
   *  does NOT re-enter subsystem-orchestration mode (prevents infinite recursion). */
  scopedSubsystemBuild: true;
  /** The subsystem this build targets. The route uses it to load that domain's
   *  `domain-{id}.md` PRD slice DIRECTLY — tasks are not reliably tagged with a
   *  `subsystem` field, so this explicit id (not a task-tag heuristic) is the
   *  authoritative signal of which domain is being coded. */
  activeSubsystemId: string;
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
    scopedSubsystemBuild: true,
    activeSubsystemId: step.subsystemId,
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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Recover a sub-build's outcome after its drain fetch dropped.
 *
 * The orchestrator → sub-build fetch can be "terminated" (undici's default
 * bodyTimeout fires when a slow LLM call leaves the SSE silent for minutes; or
 * the socket resets) even though the sub-build keeps running server-side
 * (keep-running policy). Failing immediately on that would both fail the whole
 * orchestration AND orphan the still-running build. Instead, poll the durable
 * session checkpoint until THIS run writes a fresh one (savedAt >= notBefore)
 * and recover the verdict from it. Returns the fresh checkpoint, or null if none
 * appears within the wait window (e.g. the sub-build itself died).
 */
export async function waitForFreshCheckpoint(
  projectRoot: string,
  notBefore: number,
  opts?: { pollMs?: number; maxWaitMs?: number; stalenessMs?: number },
): Promise<SessionCheckpoint | null> {
  const pollMs = opts?.pollMs ?? 15_000;
  const stalenessMs = opts?.stalenessMs ?? 15 * 60_000;
  const deadline = Date.now() + (opts?.maxWaitMs ?? 120 * 60_000);
  let latest: SessionCheckpoint | null = null;
  let lastSavedAt = 0;
  let lastAdvanceAt = Date.now();
  while (Date.now() < deadline) {
    await sleep(pollMs);
    const cp = await readSessionCheckpoint(projectRoot);
    const saved = cp ? Date.parse(cp.savedAt) : NaN;
    if (!cp || !Number.isFinite(saved) || saved < notBefore) continue;
    latest = cp;
    // The build wrote its FINAL checkpoint (graph finished) — authoritative
    // verdict, even if the sub-build's drain fetch had dropped mid-run. Return it.
    if (cp.completedRun) return cp;
    // Otherwise this is a mid-run INCREMENTAL checkpoint. Do NOT judge off it (the
    // old bug: a half-finished 0/N incremental was read as the verdict → false
    // foundation failure). Keep waiting: a still-advancing savedAt means the
    // sub-build is alive (incrementals land every ~8s). Only when writes STOP for
    // stalenessMs has it genuinely hung/died — then return the best-effort latest.
    if (saved > lastSavedAt) {
      lastSavedAt = saved;
      lastAdvanceAt = Date.now();
    } else if (Date.now() - lastAdvanceAt >= stalenessMs) {
      return latest;
    }
  }
  return latest;
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
  // The active-scope sidecar must land where the route's gates READ it — the
  // code-output root — not at projectRoot. (The session checkpoint, by contrast,
  // is written by the route at process.cwd(), so it stays keyed to projectRoot.)
  const outputRoot = resolveCodeOutputRoot(projectRoot, ctx.codeOutputDir);
  return async (step: SubsystemBuildStep) => {
    if (step.taskIds.length === 0) {
      return { ok: true, summary: `${step.subsystemId}: nothing to build.` };
    }
    // Scope the gates to this subsystem + its deps so not-yet-built domains'
    // endpoints don't fail route-registration / smoke as "missing".
    await writeActiveScope(outputRoot, {
      subsystemId: step.subsystemId,
      endpoints: step.scopeEndpoints,
    });
    const body = buildSubsystemCodingRequest(step, ctx);
    const controller = new AbortController();
    const timer = ctx.timeoutMs
      ? setTimeout(() => controller.abort(), ctx.timeoutMs)
      : null;
    const startedAt = Date.now();
    let dropped = false;
    // DIAGNOSTIC (drain-drop root-cause): localise WHERE the fetch/drain fails —
    // before response headers (route setup blocked the response), after headers
    // but before any stream data (silent setup INSIDE the stream / no keepalive),
    // or mid-stream. `since` in seconds from the POST.
    const since = (t: number) => (t ? ((t - startedAt) / 1000).toFixed(1) + "s" : "—");
    let headersAt = 0;
    let firstChunkAt = 0;
    let chunkCount = 0;
    let byteCount = 0;
    try {
      const resp = await fetch(`${ctx.baseUrl}/api/agents/coding`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
        // Node/undici fetch supports `dispatcher`; not in the DOM RequestInit types.
        // @ts-expect-error dispatcher is a Node-fetch extension
        dispatcher: subsystemFetchDispatcher,
      });
      headersAt = Date.now();
      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        return { ok: false, summary: `${step.subsystemId}: coding endpoint ${resp.status} ${text.slice(0, 200)}` };
      }
      console.log(
        `[Subsystems] ${step.subsystemId}: sub-build response headers received at ${since(headersAt)}; draining…`,
      );
      await drainStream(resp.body, (c) => {
        chunkCount += 1;
        byteCount += c.length;
        if (!firstChunkAt) {
          firstChunkAt = Date.now();
          console.log(
            `[Subsystems] ${step.subsystemId}: first stream bytes at ${since(firstChunkAt)} (headers→firstByte ${((firstChunkAt - headersAt) / 1000).toFixed(1)}s).`,
          );
        }
        ctx.onProgress?.(step.subsystemId, c);
      });
    } catch (err) {
      // The drain fetch dropped, but the sub-build keeps running server-side.
      // Recover the verdict from its durable checkpoint rather than failing.
      dropped = true;
      const e = err as { name?: string; message?: string; cause?: unknown };
      const cause = (e?.cause ?? null) as { code?: string; message?: string } | null;
      const causeStr = cause ? ` cause=${cause.code ?? cause.message ?? String(cause)}` : "";
      const phase =
        headersAt === 0
          ? "BEFORE response headers (route setup blocked the response, or connection refused/reset pre-headers)"
          : firstChunkAt === 0
            ? "AFTER headers but BEFORE any stream bytes (silent setup inside the stream / keepalive not reaching client)"
            : "MID-STREAM (was actively streaming, then the connection dropped)";
      console.warn(
        `[Subsystems] ${step.subsystemId}: drain fetch DROPPED — phase=${phase}; ` +
          `elapsed=${since(Date.now())}, headersAt=${since(headersAt)}, firstByteAt=${since(firstChunkAt)}, ` +
          `chunks=${chunkCount}, bytes=${byteCount}, err=${e?.name ?? ""}:${e?.message ?? String(err)}${causeStr}; ` +
          `recovering verdict from checkpoint…`,
      );
    } finally {
      if (timer) clearTimeout(timer);
    }
    if (dropped) {
      const fresh = await waitForFreshCheckpoint(projectRoot, startedAt);
      if (!fresh) {
        return { ok: false, summary: `${step.subsystemId}: drain dropped and no fresh checkpoint within the wait window.` };
      }
      return verdictFromCheckpoint(fresh, step);
    }
    // Verdict from the durable checkpoint.
    const checkpoint = await readSessionCheckpoint(projectRoot);
    return verdictFromCheckpoint(checkpoint, step);
  };
}
