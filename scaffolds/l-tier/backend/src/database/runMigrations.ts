/**
 * Umzug-based Sequelize migration runner.
 *
 * Loads every `*.ts` / `*.js` file under `src/database/migrations/`. Each
 * migration MUST export `up` / `down`. Two signatures are accepted:
 *
 *   1. sequelize-cli style (preferred — matches what the codegen agents
 *      and scaffold-bundled migrations are written for):
 *
 *        export async function up(
 *          queryInterface: QueryInterface,
 *          sequelize: Sequelize,
 *        ): Promise<void> { ... }
 *
 *   2. umzug v3 native context-bag style (fallback, kept for older
 *      hand-written migrations):
 *
 *        export async function up(
 *          { context }: { context: QueryInterface },
 *        ): Promise<void> { ... }
 *
 * The dispatcher below switches based on `fn.length`, so authors do not
 * need to pick one style globally — they can coexist.
 *
 * The runner tracks applied state in a `migrations_meta` table, and
 * provides:
 *
 *   - `runMigrations()` — apply all pending (called from `initDb()`)
 *   - `revertLastMigration()` — roll back one step (for dev)
 *   - CLI: `pnpm migrate` / `pnpm migrate:down`
 *
 * Idempotent: re-applying after no new files is a no-op. Disable the
 * auto-run from `initDb()` by setting `AUTO_MIGRATE=0` (default is on;
 * production deploys should set 0 and run `pnpm migrate` as an explicit
 * release step). Worker tasks that add columns / tables to a model under
 * `backend/src/models/` MUST also add a sibling migration file here —
 * the post-task `migration-coverage` check enforces it.
 */

import path from "node:path";
import { Umzug, SequelizeStorage } from "umzug";

import { sequelize } from "../db";

const MIGRATIONS_DIR = path.join(__dirname, "migrations");

// Dispatch a migration's `up` / `down` export with the right argument
// shape. We prefer the sequelize-cli positional signature because every
// migration in this codebase (LLM-generated and scaffold-bundled alike)
// is written that way — and several rely on `queryInterface.sequelize`
// being defined, which is only true when the queryInterface is passed
// positionally rather than wrapped in `{ context }`.
async function callMigration(
  fn: unknown,
  label: string,
  context: ReturnType<typeof sequelize.getQueryInterface>,
): Promise<void> {
  if (typeof fn !== "function") {
    throw new Error(`migration ${label} does not export the function`);
  }
  if ((fn as Function).length >= 2) {
    // (queryInterface, sequelize)
    await (fn as (qi: unknown, sq: unknown) => Promise<void>)(
      context,
      sequelize,
    );
    return;
  }
  // ({ context }) — umzug v3 native fallback.
  await (fn as (arg: { context: unknown }) => Promise<void>)({ context });
}

export const umzug = new Umzug({
  migrations: {
    glob: ["*.{ts,js}", { cwd: MIGRATIONS_DIR }],
    resolve: ({ name, path: filePath, context }) => {
      // Lazy-import so a syntax error in one migration doesn't tear down
      // the whole bootstrap — umzug will surface the failure at run time.
      return {
        name,
        up: async () => {
          if (!filePath) throw new Error(`migration ${name} has no path`);
          const mod = await import(filePath);
          await callMigration(mod.up, `${name} up()`, context);
        },
        down: async () => {
          if (!filePath) throw new Error(`migration ${name} has no path`);
          const mod = await import(filePath);
          await callMigration(mod.down, `${name} down()`, context);
        },
      };
    },
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({
    sequelize,
    tableName: "migrations_meta",
  }),
  logger: console,
});

export async function runMigrations(): Promise<void> {
  const pending = await umzug.pending();
  if (pending.length === 0) {
    console.log("[migrate] no pending migrations.");
    return;
  }
  console.log(`[migrate] applying ${pending.length} migration(s)...`);
  await umzug.up();
  console.log("[migrate] done.");
}

export async function revertLastMigration(): Promise<void> {
  await umzug.down();
}

// CLI entry — invoked by `pnpm migrate` / `pnpm migrate:down`.
if (require.main === module) {
  const cmd = process.argv[2] ?? "up";
  (async () => {
    if (cmd === "up") {
      await runMigrations();
    } else if (cmd === "down") {
      await revertLastMigration();
    } else {
      console.error(`unknown command: ${cmd} (expected up|down)`);
      process.exit(1);
    }
    await sequelize.close();
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
