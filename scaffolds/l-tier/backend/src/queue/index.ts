/**
 * Queue selector: chooses the in-process or Redis-backed implementation at
 * import time based on `USE_REDIS_QUEUE`. Both implementations expose the
 * same public surface so call sites (workers, controllers, server bootstrap)
 * import from `./queue` and stay implementation-agnostic.
 *
 * Why a selector vs. conditional `require`:
 *   - Both modules are statically imported so the bundler / ts-check can
 *     verify both API surfaces. The unused one's connection / EventEmitter
 *     setup is lazy (see `redisQueue.ts#getConnection`), so importing it
 *     when `USE_REDIS_QUEUE=0` does NOT open a Redis socket.
 *
 * Selection rule:
 *   - `USE_REDIS_QUEUE=1` → BullMQ + Redis (multi-replica safe).
 *   - anything else      → in-process (single-replica, no infra).
 *
 * Decision is made ONCE at module load. Toggling the env var at runtime
 * has no effect (intentional — we don't want a hot-reload to silently
 * move jobs from Redis to in-memory and orphan them).
 */

import * as inProcess from "./inProcessQueue";
import * as redis from "./redisQueue";
import { logger } from "../config/logger";

const useRedis = process.env.USE_REDIS_QUEUE === "1";
const impl = useRedis ? redis : inProcess;

logger.info(
  { backend: useRedis ? "redis" : "in-process" },
  "[queue] backend selected",
);

export type { Job, JobStatus, JobHandler } from "./inProcessQueue";

export const enqueueJob = impl.enqueueJob;
export const registerWorker = impl.registerWorker;
export const getJob = impl.getJob;
export const subscribeJob = impl.subscribeJob;
export const isInProcessRunId = impl.isInProcessRunId;
export const inFlightCount = impl.inFlightCount;
export const drainInFlight = impl.drainInFlight;
