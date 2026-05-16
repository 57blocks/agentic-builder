import { logger } from "../config/logger";
import { registerExampleWorker } from "./exampleWorker";

/**
 * Worker bootstrap.
 *
 * Called from `server.ts` after the DB is ready and BEFORE `app.listen(...)`.
 * Add new workers below — each `register*Worker()` should be idempotent.
 *
 * IMPORTANT: every worker MUST be registered here. A queue with no handler
 * causes `enqueueJob` to throw and the user sees an indefinite spinner.
 */
export function startAllWorkers(): void {
  registerExampleWorker();
  logger.info("all workers registered");
}
