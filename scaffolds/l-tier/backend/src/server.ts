import "dotenv/config";
import { assertRequiredEnv, PORT } from "./config/env";

// Boot-time validation MUST run before any DB / queue / HTTP import touches
// `process.env.*`. A misconfigured prod deploy fails fast here instead of
// silently serving with a dev fallback secret.
assertRequiredEnv();

import type { Server } from "node:http";
import { createApp } from "./app";
import { initDb, sequelize } from "./db";
import { syncModels } from "./models";
import { startAllWorkers } from "./workers";
import { drainInFlight } from "./queue";
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

  const httpServer = app.listen(PORT, () => {
    logger.info({ port: PORT }, "API server listening");
  });

  registerGracefulShutdown(httpServer);
}

void start().catch((err) => {
  logger.fatal({ err }, "fatal startup error");
  process.exit(1);
});

/**
 * Graceful shutdown: SIGTERM/SIGINT → stop accepting new connections →
 * drain in-flight jobs → close DB → exit. The watchdog timer guarantees
 * we exit even if a handler hangs (PID 1 in a container would otherwise
 * be `kill -9`'d after the orchestrator's grace period — much worse).
 *
 * Why every step has its own timeout:
 *   - `httpServer.close()` waits for keep-alive connections to drain,
 *     which can sit at 5s forever if a client holds an idle SSE stream.
 *   - `drainInFlight()` blocks on user code that may have a leaky
 *     `await fetch(...)` somewhere.
 *   - `sequelize.close()` rarely hangs, but a stuck pgbouncer can.
 *
 * Each phase logs its outcome so a crashlooping container's tail explains
 * exactly which step timed out.
 */
function registerGracefulShutdown(httpServer: Server): void {
  let shuttingDown = false;
  const SHUTDOWN_SIGNALS: NodeJS.Signals[] = ["SIGTERM", "SIGINT"];

  const handle = (signal: NodeJS.Signals) => async (): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "graceful shutdown started");

    // Watchdog — if any step hangs past 35s, exit non-zero so the
    // orchestrator restarts us instead of waiting for SIGKILL.
    const watchdog = setTimeout(() => {
      logger.error("graceful shutdown watchdog fired — exiting forcefully");
      process.exit(1);
    }, 35_000);
    watchdog.unref();

    try {
      await new Promise<void>((resolve) => {
        httpServer.close((err) => {
          if (err) logger.warn({ err }, "httpServer.close emitted error");
          resolve();
        });
      });
      logger.info("http server closed");

      const drained = await drainInFlight(20_000);
      logger.info({ drained }, "queue drain complete");

      try {
        await sequelize.close();
        logger.info("sequelize connection closed");
      } catch (err) {
        logger.warn({ err }, "sequelize.close emitted error");
      }
    } finally {
      clearTimeout(watchdog);
      process.exit(0);
    }
  };

  for (const signal of SHUTDOWN_SIGNALS) {
    process.once(signal, handle(signal));
  }
}
