/**
 * Vitest backend setup — create the schema in the TEST database before any test
 * runs. Mirrors the server boot (`initDb()` + `syncModels()` in src/server.ts):
 * this project has NO migrations, so `sequelize.sync()` (via syncModels) is the
 * ONLY thing that issues CREATE TABLE. Without this, every model query in a test
 * fails with `SQLITE_ERROR: no such table: <x>` / Postgres `relation does not
 * exist`, which fails the whole suite — and the TDD-green gate — on a pure
 * test-harness gap rather than a real code defect.
 *
 * Scaffold-owned: do NOT delete. Generated tests rely on the schema existing.
 */
import { beforeAll } from "vitest";

beforeAll(async () => {
  // Imported lazily so a project that genuinely has no DB layer (these modules
  // absent) doesn't crash the whole suite at import time.
  try {
    const db = await import("../db");
    if (typeof (db as { initDb?: () => Promise<unknown> }).initDb === "function") {
      try {
        await (db as { initDb: () => Promise<unknown> }).initDb();
      } catch {
        // Connection may already be established by a prior test file — ignore.
      }
    }
  } catch {
    // No ../db module — nothing to initialise.
  }

  try {
    const models = await import("../models");
    const syncModels = (models as { syncModels?: () => Promise<unknown> })
      .syncModels;
    if (typeof syncModels === "function") {
      await syncModels();
    }
  } catch (err) {
    // Surface loudly: if the schema can't be created, EVERY DB test will fail
    // with a misleading "no such table" — make the real cause obvious.
    console.error(
      "[test-setup] syncModels() failed — DB-backed tests will fail with 'no such table':",
      err instanceof Error ? err.message : err,
    );
    throw err;
  }
});
