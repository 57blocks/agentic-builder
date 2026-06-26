import { config as loadDotenv } from "dotenv";
import { Sequelize } from "sequelize";
import { enableTimescaleExtension } from "./utils/timescale";

// In dev / test the project-local `.env` MUST win over whatever the parent
// shell (or IDE startup hooks like `.zshrc`) already exported. Otherwise a
// leaked `DATABASE_URL` from another project silently redirects every
// query to the wrong database — the failure mode looks like a perfectly
// valid 401 / "column does not exist", which wastes hours of debugging.
//
// In production we deliberately do NOT override: container orchestrators
// (Docker/K8s) inject the canonical secret and the file shouldn't shadow
// it.
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
  return process.env.NODE_ENV === "test" || (process.env.VITEST ?? "") !== "";
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
 * SQLite requires the `sqlite3` driver (a devDependency); Sequelize loads it
 * lazily only when the sqlite dialect is selected, so production Postgres
 * builds never need it at runtime.
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
    : // In-memory SQLite test fallback. Object form (not a `sqlite::memory:`
      // URL) avoids the Node `DEP0170` invalid-URL deprecation warning.
      new Sequelize({
        dialect: "sqlite",
        storage: ":memory:",
        logging: false,
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

  // TimescaleDB — Postgres-only. Skip entirely on the SQLite test fallback.
  // On Postgres it's handled by the helper (src/utils/timescale.ts) so the
  // server starts on plain Postgres too. NEVER call `CREATE EXTENSION` or
  // `create_hypertable` directly anywhere in this project: route every
  // such call through one of:
  //   - enableTimescaleExtension(sequelize)
  //   - createHypertableIfPossible(queryInterface, table, timeColumn)
  //   - runTimescaleQuery(sequelize, sql, description)
  // Each helper respects TIMESCALE_DISABLED=1 and catches the missing-
  // extension error, so a fresh Postgres install never crashes startup.
  if (!isInMemorySqlite) {
    await enableTimescaleExtension(sequelize);
  }

  // No migrations: the Sequelize models are the single source of truth for
  // the schema. `syncModels()` (called from server.ts / seed-runner) issues
  // the CREATE TABLE / index DDL straight from the model definitions.
}
