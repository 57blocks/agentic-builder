/**
 * Overwritten by `_optional/auth-password-rbac` scaffold.
 *
 * Registers the `User` + `Session` models on `sequelize` (the imports are
 * side-effectful — the `.init()` calls inside register them) and re-exports
 * them so controllers can `import { User } from "../../../models"`.
 *
 * Workers add their own models by:
 *   1. Creating `src/models/Foo.ts` with an `.init(...)` call.
 *   2. Adding an import + re-export line below.
 *   3. Writing a migration under `src/database/migrations/` for the table.
 */

import { User } from "./User";
import { Session } from "./Session";
import { sequelize } from "../db";

export { User, Session };

export async function syncModels(): Promise<void> {
  // Migrations under `src/database/migrations/` are the source of truth.
  // Default to `alter: false` — only opt in via DB_SYNC_ALTER=true for
  // local quick-sync without writing a migration.
  const syncAlter = process.env.DB_SYNC_ALTER === "true";
  await sequelize.sync({ alter: syncAlter });
}
