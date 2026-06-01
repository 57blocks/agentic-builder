import "dotenv/config";
import { createApp } from './app';
import { PORT } from './config/env';
import { initDb } from './db';
import { syncModels } from './models';

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

  app.listen(PORT, () => {
    console.log(`API server listening on http://localhost:${PORT}`);
  });
}

void start();
