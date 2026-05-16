import "dotenv/config";
import { createApp } from "./app";
import { PORT } from "./config/env";
import { initDb } from "./db";
import { syncModels } from "./models";
import { startAllWorkers } from "./workers";
import { logger } from "./config/logger";

const app = createApp();

async function start(): Promise<void> {
  await initDb();
  await syncModels();

  // Workers MUST be registered before `listen()` — otherwise any HTTP handler
  // that calls `enqueueJob(...)` during the brief window between server-ready
  // and worker-ready will throw "No worker registered for queue X" and the
  // user sees an indefinite spinner. See `src/queue/inProcessQueue.ts`.
  startAllWorkers();

  app.listen(PORT, () => {
    logger.info({ port: PORT }, "API server listening");
  });
}

void start().catch((err) => {
  logger.fatal({ err }, "fatal startup error");
  process.exit(1);
});
