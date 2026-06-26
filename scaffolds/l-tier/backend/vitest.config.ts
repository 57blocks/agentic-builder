import { defineConfig } from "vitest/config";

// Backend test runner. `setupFiles` runs `src/test/setup.ts` before every test
// file so the TEST database has its schema created (sequelize.sync()) — without
// it, model queries fail with `SQLITE_ERROR: no such table` / Postgres
// `relation does not exist` and the whole suite (and the TDD-green gate) fails
// on what is purely a test-harness gap, not a code bug.
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    // DB-touching tests share one connection — run them in a single worker to
    // avoid sqlite write contention / "database is locked".
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    hookTimeout: 30_000,
  },
});
