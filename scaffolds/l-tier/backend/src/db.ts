import { config as loadDotenv } from "dotenv";
import { Sequelize } from "sequelize";
import { sqlite3Wasm } from "./test-support/sqlite3-wasm";

// In dev / test the project-local `.env` MUST win over whatever the parent
// shell (or IDE startup hooks like `.zshrc`) already exported. Otherwise a
// leaked `DATABASE_URL` from another project silently redirects every
// query to the wrong database — the failure mode looks like a perfectly
// valid 401 / "column does not exist", which wastes hours of debugging.
//
// In production we deliberately do NOT override: container orchestrators
// (Docker/K8s) inject the canonical secret and the file shouldn't shadow it.
loadDotenv({
  override: process.env.NODE_ENV !== "production",
});

/**
 * True when running under a test runner. Vitest sets `VITEST=true`; the TDD
 * gate also pins `NODE_ENV=test`. Either signal means "this is a test process".
 * A blank/empty value does NOT count — a deployment that exported `VITEST=`
 * (empty) must still take the production path and fail loud on a missing URL.
 */
function isTestEnv(): boolean {
  return (
    process.env.NODE_ENV === "test" || (process.env.VITEST ?? "") !== ""
  );
}

/**
 * Resolve the connection target.
 *
 *   1. A real `DATABASE_URL` is present  → use it (Postgres).
 *   2. No URL but we're in a TEST process → fall back to in-memory SQLite.
 *      The unit-test runner has no Postgres, and the TDD gate intentionally
 *      strips `DATABASE_URL` so tests can NEVER touch the real database. An
 *      in-memory SQLite honours that guarantee AND lets the suite actually
 *      run, instead of crashing every test at import with a hard throw.
 *   3. No URL in dev / prod → a genuine misconfiguration: fail loud.
 *
 * The sqlite dialect runs on the pure-WASM `node-sqlite3-wasm` engine (passed as
 * `dialectModule`), so there is no native `sqlite3` build — identical on every
 * OS/arch, offline-OK. Production selects Postgres and never touches it.
 */
function resolveConnection(): { dialect: "postgres" | "sqlite"; url?: string } {
  const explicit = process.env.DATABASE_URL?.trim();
  if (explicit) {
    return { dialect: "postgres", url: explicit };
  }
  if (isTestEnv()) {
    return { dialect: "sqlite" };
  }
  throw new Error("DATABASE_URL is required");
}

const connection = resolveConnection();

export const sequelize =
  connection.dialect === "postgres"
    ? new Sequelize(connection.url as string, {
        dialect: "postgres",
        logging: process.env.NODE_ENV === "development" ? console.log : false,
        dialectOptions: {
          ssl:
            process.env.DB_SSL === "true"
              ? {
                  require: true,
                  rejectUnauthorized: false,
                }
              : false,
        },
      })
    : // In-memory SQLite test fallback on the pure-WASM driver (`dialectModule`)
      // — no native build. Object form (not a `sqlite::memory:` URL) avoids the
      // Node `DEP0170` invalid-URL deprecation warning.
      new Sequelize({
        dialect: "sqlite",
        storage: ":memory:",
        logging: false,
        dialectModule: sqlite3Wasm,
      });

/** True when the active connection is the in-memory SQLite test fallback. */
export const isInMemorySqlite = connection.dialect === "sqlite";

export async function initDb(): Promise<void> {
  try {
    await sequelize.authenticate();
    console.log("Database connection has been established successfully.");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
    throw error;
  }

  // TimescaleDB is a Postgres-only extension. It is never available on the
  // SQLite test fallback, and a fresh Postgres install may not have it either,
  // so enabling it is strictly best-effort: a failure here must NOT crash boot.
  // Production timeseries optimisations are applied through migrations, not at
  // connection time.
  if (
    connection.dialect === "postgres" &&
    process.env.TIMESCALE_DISABLED !== "1"
  ) {
    try {
      await sequelize.query("CREATE EXTENSION IF NOT EXISTS timescaledb;");
    } catch {
      console.warn(
        "[db] TimescaleDB extension unavailable — continuing on plain Postgres.",
      );
    }
  }

  // No migrations in the scaffold baseline: the Sequelize models are the single
  // source of truth. `syncModels()` (called from server.ts / the test setup)
  // issues the CREATE TABLE / index DDL straight from the model definitions.
}
