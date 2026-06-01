/**
 * CLI seed runner — `pnpm run seed`
 *
 * Runs every seed script that exists in this directory, in order:
 *   1. seed-auth-users  (present when an auth overlay was applied)
 *   2. seed-demo-data   (present when coding tasks created entity demo records)
 *
 * Each script exports a `run()` function that does NOT close the DB.
 * This runner owns the DB lifecycle (open → seeds → close).
 */

import "dotenv/config";
import { sequelize } from "../db";
import { syncModels } from "../models";

async function main(): Promise<void> {
  await sequelize.authenticate();
  await syncModels();

  for (const script of ["./seed-auth-users", "./seed-demo-data"]) {
    try {
      const mod = await import(script) as { run?: () => Promise<void> };
      if (typeof mod.run === "function") {
        await mod.run();
        console.log(`[seed] ${script.replace("./", "")} ✓`);
      }
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ERR_MODULE_NOT_FOUND" || code === "MODULE_NOT_FOUND") {
        // Script not present — skip silently.
      } else {
        throw err;
      }
    }
  }
}

main()
  .catch((err) => {
    console.error("[seed] failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close().catch(() => undefined);
  });
