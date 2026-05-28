import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import { logger } from "../config/logger";

/**
 * In-process, single-replica queue with the SAME public API as BullMQ.
 *
 * Why this exists:
 *   L-tier projects are expected to run background work (aggregators, scanners,
 *   digest builders). For local dev / smoke tests we should not require Redis
 *   to be up — that turns "clone + pnpm dev" into a 4-step infra setup. So the
 *   default implementation is in-process: `enqueueJob` resolves with a run id
 *   prefixed `inproc:`, and the worker runs in the same process via an
 *   EventEmitter.
 *
 *   For real production with multiple replicas, swap this module for the
 *   BullMQ-backed implementation in `./redisQueue.ts` (gated by
 *   `USE_REDIS_QUEUE=1`). Use `./queue` (the index selector) instead of
 *   importing this file directly so the switch is environment-driven.
 *
 * Memory / lifecycle guarantees:
 *   - `jobs` Map is bounded by `JOB_RETENTION_MS`: completed jobs are removed
 *     by a `setTimeout(unref)` so a long-lived process doesn't OOM. The TTL
 *     defaults to 1h, long enough for the SSE client to fetch terminal status
 *     after disconnects.
 *   - `inFlight` Set tracks promises so the graceful-shutdown path can
 *     `await drainInFlight(timeoutMs)` instead of dropping work.
 *
 * Conventions:
 *   - `run_id` returned to the HTTP caller MUST be used end-to-end. The worker
 *     MUST NOT call `randomUUID()` again to overwrite it; status/SSE endpoints
 *     look it up by this exact id.
 *   - SSE / status endpoints distinguish formats:
 *       `inproc:*` → in-memory subscription (this module)
 *       UUID       → DB-backed BullMQ run (see redisQueue.ts)
 */

export type JobStatus = "pending" | "running" | "succeeded" | "failed";

export interface Job<TData = unknown, TResult = unknown> {
  id: string;
  queueName: string;
  data: TData;
  status: JobStatus;
  result?: TResult;
  error?: string;
  startedAt?: number;
  completedAt?: number;
}

export type JobHandler<TData, TResult> = (
  job: Job<TData, TResult>,
  emit: (event: string, payload: unknown) => void,
) => Promise<TResult>;

const JOB_RETENTION_MS = Number(
  process.env.QUEUE_JOB_RETENTION_MS ?? 60 * 60 * 1000,
);

const events = new EventEmitter();
events.setMaxListeners(0);

const jobs = new Map<string, Job>();
const handlers = new Map<string, JobHandler<unknown, unknown>>();
const inFlight = new Set<Promise<void>>();

/**
 * Enqueue a job. Returns the run id immediately; the work runs asynchronously.
 *
 * The 1.5s safety timeout in the comment below is enforced by the HTTP layer
 * (controllers calling `Promise.race([enqueueJob(...), timeout(1500)])`) so
 * a stuck Redis / handler doesn't hold the request hostage.
 */
export async function enqueueJob<TData>(
  queueName: string,
  data: TData,
): Promise<string> {
  const handler = handlers.get(queueName) as
    | JobHandler<TData, unknown>
    | undefined;
  if (!handler) {
    throw new Error(
      `[queue] No worker registered for queue "${queueName}". Call \`registerWorker("${queueName}", …)\` from your worker bootstrap.`,
    );
  }

  const id = `inproc:${randomUUID()}`;
  const job: Job<TData, unknown> = {
    id,
    queueName,
    data,
    status: "pending",
  };
  jobs.set(id, job);
  logger.info({ jobId: id, queueName }, "job enqueued (in-process)");

  const promise = runJob(job, handler);
  inFlight.add(promise);
  // `void` — the request handler must return immediately, but the graceful-
  // shutdown path can still wait via `drainInFlight()`.
  void promise.finally(() => inFlight.delete(promise));

  return id;
}

async function runJob<TData>(
  job: Job<TData, unknown>,
  handler: JobHandler<TData, unknown>,
): Promise<void> {
  job.status = "running";
  job.startedAt = Date.now();
  events.emit(`job:${job.id}`, { event: "started", job });
  events.emit(`queue:${job.queueName}`, { event: "started", job });

  const emit = (event: string, payload: unknown) => {
    events.emit(`job:${job.id}`, { event, payload });
  };

  try {
    job.result = await handler(job, emit);
    job.status = "succeeded";
    job.completedAt = Date.now();
    events.emit(`job:${job.id}`, { event: "succeeded", job });
    logger.info(
      {
        jobId: job.id,
        queueName: job.queueName,
        durationMs: job.completedAt - (job.startedAt ?? 0),
      },
      "job succeeded",
    );
  } catch (err) {
    job.status = "failed";
    job.completedAt = Date.now();
    job.error = err instanceof Error ? err.message : String(err);
    events.emit(`job:${job.id}`, { event: "failed", job });
    logger.error(
      { jobId: job.id, queueName: job.queueName, err: job.error },
      "job failed",
    );
  } finally {
    // Schedule eviction. `unref()` so the timer doesn't keep node alive
    // during tests / short-lived scripts.
    const t = setTimeout(() => {
      jobs.delete(job.id);
    }, JOB_RETENTION_MS);
    t.unref?.();
  }
}

export function registerWorker<TData, TResult>(
  queueName: string,
  handler: JobHandler<TData, TResult>,
): void {
  if (handlers.has(queueName)) {
    logger.warn(
      { queueName },
      "worker re-registered (existing handler replaced)",
    );
  }
  handlers.set(queueName, handler as JobHandler<unknown, unknown>);
  logger.info({ queueName }, "worker registered");
}

export function getJob(jobId: string): Job | undefined {
  return jobs.get(jobId);
}

/**
 * Subscribe to job events. Returns an unsubscribe function — call it when the
 * SSE / WebSocket connection closes to avoid leaks.
 */
export function subscribeJob(
  jobId: string,
  listener: (event: { event: string; payload?: unknown; job?: Job }) => void,
): () => void {
  const channel = `job:${jobId}`;
  events.on(channel, listener);
  return () => events.off(channel, listener);
}

export function isInProcessRunId(runId: string): boolean {
  return typeof runId === "string" && runId.startsWith("inproc:");
}

/**
 * Number of jobs currently running. Useful for `/health` payloads and tests.
 */
export function inFlightCount(): number {
  return inFlight.size;
}

/**
 * Wait for every in-flight job to settle (succeed or fail). Returns true if
 * the queue drained within `timeoutMs`, false if the timeout fired first.
 *
 * Called from `server.ts#registerGracefulShutdown` so SIGTERM doesn't kill
 * mid-flight work. Safe to call multiple times; idempotent.
 */
export async function drainInFlight(timeoutMs = 30_000): Promise<boolean> {
  if (inFlight.size === 0) return true;

  const drained = Promise.allSettled(Array.from(inFlight)).then(() => true);
  const timedOut = new Promise<false>((resolve) => {
    const t = setTimeout(() => resolve(false), timeoutMs);
    t.unref?.();
  });

  return Promise.race([drained, timedOut]);
}
