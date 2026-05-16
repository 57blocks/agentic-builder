import { registerWorker } from "../queue/inProcessQueue";
import { childLogger } from "../config/logger";

/**
 * Reference worker — DELETE or rewrite per feature.
 *
 * Demonstrates the canonical worker shape:
 *   1. Bound log child carrying the queue + job id so every line is greppable.
 *   2. Periodic progress events via `emit("progress", { step, total })` so the
 *      SSE / status endpoint can stream UI updates without polling DB.
 *   3. Always return a structured result (NOT void) so the run row in DB can
 *      persist the payload.
 *   4. Throw on real failure; do NOT throw on empty results — empty is a
 *      valid completed state for any aggregation pipeline.
 */

export interface ExampleJobData {
  userId: string;
  topic: string;
}

export interface ExampleJobResult {
  story_count: number;
  durationMs: number;
}

const QUEUE_NAME = "example";

export function registerExampleWorker(): void {
  registerWorker<ExampleJobData, ExampleJobResult>(QUEUE_NAME, async (job, emit) => {
    const log = childLogger({ queueName: QUEUE_NAME, jobId: job.id, userId: job.data.userId });
    log.info({ topic: job.data.topic }, "example worker started");

    const totalSteps = 3;
    for (let step = 1; step <= totalSteps; step += 1) {
      await new Promise((r) => setTimeout(r, 250));
      emit("progress", { step, total: totalSteps });
      log.debug({ step, total: totalSteps }, "step completed");
    }

    // Empty result is a normal completed state — return zero rows, do NOT throw.
    return { story_count: 0, durationMs: 750 };
  });
}

export { QUEUE_NAME as EXAMPLE_QUEUE };
