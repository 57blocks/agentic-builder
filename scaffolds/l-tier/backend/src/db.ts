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

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

export const sequelize = new Sequelize(DATABASE_URL, {
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
});

export async function initDb(): Promise<void> {
  try {
    await sequelize.authenticate();
    console.log("Database connection has been established successfully.");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
    throw error;
  }

  // TimescaleDB — handled by the helper (src/utils/timescale.ts) so the
  // server starts on plain Postgres too. NEVER call `CREATE EXTENSION` or
  // `create_hypertable` directly anywhere in this project: route every
  // such call through one of:
  //   - enableTimescaleExtension(sequelize)
  //   - createHypertableIfPossible(queryInterface, table, timeColumn)
  //   - runTimescaleQuery(sequelize, sql, description)
  // Each helper respects TIMESCALE_DISABLED=1 and catches the missing-
  // extension error, so a fresh Postgres install never crashes startup.
  await enableTimescaleExtension(sequelize);

  // Apply pending Sequelize migrations from `src/database/migrations/`.
  // Default ON so a fresh checkout boots into a usable schema; set
  // `AUTO_MIGRATE=0` to run them manually via `pnpm migrate` (recommended
  // for production deploys with a separate release step).
  if (process.env.AUTO_MIGRATE !== "0") {
    const { runMigrations } = await import("./database/runMigrations");
    await runMigrations();
  }
}
