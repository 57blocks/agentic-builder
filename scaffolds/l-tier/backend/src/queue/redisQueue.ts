import { Queue, Worker, QueueEvents, type Job as BullJob } from "bullmq";
import IORedis, { type RedisOptions } from "ioredis";
import { logger } from "../config/logger";
import type {
  Job,
  JobHandler,
  JobStatus,
} from "./inProcessQueue";

/**
 * BullMQ-backed implementation of the queue API exported by
 * `./inProcessQueue.ts`. Selected by `./index.ts` when
 * `USE_REDIS_QUEUE=1`.
 *
 * Public API parity with the in-process queue:
 *   - enqueueJob(queueName, data) → run id
 *   - registerWorker(queueName, handler)
 *   - getJob(jobId)
 *   - subscribeJob(jobId, listener) → unsubscribe
 *   - isInProcessRunId(runId)  // always false here
 *   - inFlightCount()
 *   - drainInFlight(timeoutMs)
 *
 * Implementation notes:
 *   - Connection is lazy. Importing this module costs ~nothing if the rest
 *     of the process never enqueues — the in-process selector path takes
 *     advantage of this so dev `pnpm dev` without Redis stays cheap even
 *     if both modules are imported by `./queue/index.ts`.
 *   - `subscribeJob` uses a QueueEvents instance per queueName, but only
 *     one is created on demand and cached.
 *   - `getJob` returns the local snapshot from the most recent event the
 *     subscriber observed; for cross-replica reads, query BullMQ directly
 *     via `queueFor(name).getJob(jobId)`.
 */

let connection: IORedis | null = null;
function getConnection(): IORedis {
  if (connection) return connection;
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error(
      "[queue:redis] REDIS_URL must be set when USE_REDIS_QUEUE=1",
    );
  }
  const opts: RedisOptions = {
    // BullMQ requires this — see https://docs.bullmq.io/guide/connections
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
  connection = new IORedis(url, opts);
  connection.on("error", (err) => {
    logger.error({ err }, "[queue:redis] connection error");
  });
  return connection;
}

const queues = new Map<string, Queue>();
const workers = new Map<string, Worker>();
const events = new Map<string, QueueEvents>();
const handlers = new Map<string, JobHandler<unknown, unknown>>();
const inFlightIds = new Set<string>();

// Cached snapshots of jobs we've seen on the worker side — used by `getJob`
// for SSE / status lookups in the same process. Cross-replica lookups must
// go through BullMQ directly.
const localSnapshots = new Map<string, Job>();
const JOB_RETENTION_MS = Number(
  process.env.QUEUE_JOB_RETENTION_MS ?? 60 * 60 * 1000,
);

function queueFor(name: string): Queue {
  let q = queues.get(name);
  if (!q) {
    q = new Queue(name, { connection: getConnection() });
    queues.set(name, q);
  }
  return q;
}

function eventsFor(name: string): QueueEvents {
  let qe = events.get(name);
  if (!qe) {
    qe = new QueueEvents(name, { connection: getConnection() });
    events.set(name, qe);
  }
  return qe;
}

function evictLater(jobId: string): void {
  const t = setTimeout(() => {
    localSnapshots.delete(jobId);
  }, JOB_RETENTION_MS);
  t.unref?.();
}

export async function enqueueJob<TData>(
  queueName: string,
  data: TData,
): Promise<string> {
  if (!handlers.has(queueName)) {
    throw new Error(
      `[queue:redis] No worker registered for queue "${queueName}". Call \`registerWorker("${queueName}", …)\` from your worker bootstrap.`,
    );
  }
  const queue = queueFor(queueName);
  const bullJob = await queue.add(queueName, data, {
    removeOnComplete: { age: JOB_RETENTION_MS / 1000 },
    removeOnFail: { age: JOB_RETENTION_MS / 1000 },
  });

  const id = String(bullJob.id);
  inFlightIds.add(id);
  localSnapshots.set(id, {
    id,
    queueName,
    data,
    status: "pending",
  });
  logger.info({ jobId: id, queueName }, "job enqueued (redis)");
  return id;
}

function toLocalStatus(
  bullState:
    | "completed"
    | "failed"
    | "active"
    | "waiting"
    | "waiting-children"
    | "delayed"
    | "prioritized"
    | "unknown",
): JobStatus {
  switch (bullState) {
    case "completed":
      return "succeeded";
    case "failed":
      return "failed";
    case "active":
      return "running";
    default:
      return "pending";
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
    void workers.get(queueName)?.close();
  }
  handlers.set(queueName, handler as JobHandler<unknown, unknown>);

  const worker = new Worker(
    queueName,
    async (bullJob: BullJob) => {
      const id = String(bullJob.id);
      const job: Job<TData, TResult> = {
        id,
        queueName,
        data: bullJob.data as TData,
        status: "running",
        startedAt: Date.now(),
      };
      localSnapshots.set(id, job as Job);

      const emit = (event: string, payload: unknown) => {
        // BullMQ uses job.updateProgress for client visibility; we mirror
        // arbitrary events to the job log so external dashboards can read.
        void bullJob.log(JSON.stringify({ event, payload }));
      };

      try {
        const result = await handler(job, emit);
        job.status = "succeeded";
        job.result = result;
        job.completedAt = Date.now();
        return result;
      } catch (err) {
        job.status = "failed";
        job.error = err instanceof Error ? err.message : String(err);
        job.completedAt = Date.now();
        throw err;
      } finally {
        evictLater(id);
        inFlightIds.delete(id);
      }
    },
    { connection: getConnection() },
  );
  workers.set(queueName, worker);
  logger.info({ queueName }, "worker registered (redis)");

  worker.on("failed", (job, err) => {
    if (!job) return;
    const id = String(job.id);
    inFlightIds.delete(id);
    logger.error({ jobId: id, queueName, err }, "job failed");
  });
}

export function getJob(jobId: string): Job | undefined {
  return localSnapshots.get(jobId);
}

export function subscribeJob(
  jobId: string,
  listener: (event: {
    event: string;
    payload?: unknown;
    job?: Job;
  }) => void,
): () => void {
  // We don't know the queue without an extra lookup; check snapshot first.
  const snap = localSnapshots.get(jobId);
  if (!snap) {
    logger.warn(
      { jobId },
      "subscribeJob: no local snapshot — events for this id will not be delivered",
    );
    return () => undefined;
  }
  const qe = eventsFor(snap.queueName);

  const onProgress = (args: { jobId: string; data: unknown }): void => {
    if (args.jobId !== jobId) return;
    listener({ event: "progress", payload: args.data });
  };
  const onCompleted = (args: { jobId: string }): void => {
    if (args.jobId !== jobId) return;
    const cur = localSnapshots.get(jobId);
    if (cur) {
      cur.status = "succeeded";
      cur.completedAt = Date.now();
    }
    listener({ event: "succeeded", job: cur });
  };
  const onFailed = (args: {
    jobId: string;
    failedReason: string;
  }): void => {
    if (args.jobId !== jobId) return;
    const cur = localSnapshots.get(jobId);
    if (cur) {
      cur.status = "failed";
      cur.error = args.failedReason;
      cur.completedAt = Date.now();
    }
    listener({ event: "failed", payload: args.failedReason, job: cur });
  };

  qe.on("progress", onProgress);
  qe.on("completed", onCompleted);
  qe.on("failed", onFailed);

  return () => {
    qe.off("progress", onProgress);
    qe.off("completed", onCompleted);
    qe.off("failed", onFailed);
  };
}

export function isInProcessRunId(_runId: string): boolean {
  // BullMQ ids are numeric strings, never prefixed with `inproc:`.
  return false;
}

export function inFlightCount(): number {
  return inFlightIds.size;
}

export async function drainInFlight(timeoutMs = 30_000): Promise<boolean> {
  if (inFlightIds.size === 0) return true;

  const polling = new Promise<true>((resolve) => {
    const interval = setInterval(() => {
      if (inFlightIds.size === 0) {
        clearInterval(interval);
        resolve(true);
      }
    }, 200);
    interval.unref?.();
  });

  const timedOut = new Promise<false>((resolve) => {
    const t = setTimeout(() => resolve(false), timeoutMs);
    t.unref?.();
  });

  const result = await Promise.race([polling, timedOut]);

  // Best-effort: close workers + queues so the BullMQ connection drains.
  if (result) {
    await Promise.allSettled(
      Array.from(workers.values()).map((w) => w.close()),
    );
    await Promise.allSettled(
      Array.from(queues.values()).map((q) => q.close()),
    );
    await Promise.allSettled(
      Array.from(events.values()).map((e) => e.close()),
    );
  }

  return result;
}
