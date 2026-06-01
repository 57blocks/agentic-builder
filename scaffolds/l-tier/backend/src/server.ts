import "dotenv/config";
import { createApp } from "./app";
import { PORT, assertRequiredEnv } from "./config/env";
import { initDb, sequelize } from "./db";
import { syncModels } from "./models";
import { startAllWorkers } from "./workers";
import { drainInFlight } from "./queue/inProcessQueue";
import { logger } from "./config/logger";

assertRequiredEnv();

const app = createApp();

async function start(): Promise<void> {
  await initDb();
  await syncModels();

  // Seed on first startup (idempotent upsert — safe to re-run).
  // Each seed script exists only when the corresponding overlay / task created it;
  // the dynamic import + catch handles the "file not present" case gracefully.
  // Set AUTO_SEED=0 to skip all seeding.
  if (process.env.AUTO_SEED !== "0") {
    for (const script of ["./scripts/seed-auth-users", "./scripts/seed-demo-data"]) {
      try {
        const { run: seedRun } = await import(/* @vite-ignore */ script);
        await seedRun();
      } catch {
        // Script not present — skip silently.
      }
    }
  }

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

/**
 * Graceful shutdown.
 *
 * On SIGTERM / SIGINT:
 *   1. Stop accepting new connections (httpServer.close).
 *   2. Wait for in-flight queue jobs to settle (up to JOB_DRAIN_TIMEOUT_MS).
 *   3. Close the Sequelize pool so the next deploy starts clean.
 *   4. exit(0). A hard SHUTDOWN_HARD_TIMEOUT_MS watchdog forces exit(1) if
 *      anything hangs — K8s expects pods to die within terminationGracePeriod.
 *
 * Without this, rolling deploys (K8s, ECS, fly.io) send SIGTERM and then
 * SIGKILL after the grace period; in-flight jobs and DB transactions get
 * cut mid-write.
 */
function registerGracefulShutdown(httpServer: ReturnType<typeof app.listen>): void {
  let shuttingDown = false;
  const JOB_DRAIN_TIMEOUT_MS = Number(process.env.JOB_DRAIN_TIMEOUT_MS ?? 10_000);
  const SHUTDOWN_HARD_TIMEOUT_MS = Number(
    process.env.SHUTDOWN_HARD_TIMEOUT_MS ?? 30_000,
  );

  async function shutdown(signal: NodeJS.Signals): Promise<void> {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "shutdown initiated");

    // Watchdog — if any step hangs, exit non-zero so the orchestrator
    // knows the shutdown failed instead of hanging until SIGKILL.
    const watchdog = setTimeout(() => {
      logger.fatal(
        { timeoutMs: SHUTDOWN_HARD_TIMEOUT_MS },
        "shutdown watchdog tripped; forcing exit",
      );
      process.exit(1);
    }, SHUTDOWN_HARD_TIMEOUT_MS);
    watchdog.unref();

    try {
      await new Promise<void>((resolve, reject) => {
        httpServer.close((err) => (err ? reject(err) : resolve()));
      });
      logger.info("HTTP server closed");

      await drainInFlight(JOB_DRAIN_TIMEOUT_MS);

      await sequelize.close();
      logger.info("DB connection closed");

      process.exit(0);
    } catch (err) {
      logger.error({ err }, "error during shutdown");
      process.exit(1);
    }
  }

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

void start().catch((err) => {
  logger.fatal({ err }, "fatal startup error");
  process.exit(1);
});
