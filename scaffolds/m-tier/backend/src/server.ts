import "dotenv/config";
import { createApp } from './app';
import { PORT } from './config/env';
import { initDb } from './db';
import { syncModels } from './models';

const app = createApp();

async function start(): Promise<void> {
  await initDb();
  await syncModels();

  // Seed default accounts on first startup (idempotent upsert — safe to re-run).
  // The seed script only exists when an auth overlay (auth-password-rbac /
  // auth-magic-link / auth-privy) was applied. The dynamic import + catch
  // handles the "no auth" case gracefully. Set AUTO_SEED=0 to skip.
  if (process.env.AUTO_SEED !== "0") {
    try {
      const { run: seedRun } = await import("./scripts/seed-auth-users");
      await seedRun();
    } catch {
      // Script not present (no auth overlay) — skip silently.
    }
  }

  app.listen(PORT, () => {
    console.log(`API server listening on http://localhost:${PORT}`);
  });
}

void start();
