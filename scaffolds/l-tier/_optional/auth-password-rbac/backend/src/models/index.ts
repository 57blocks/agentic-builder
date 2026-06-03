/**
 * Overwritten by `_optional/auth-password-rbac` scaffold.
 *
 * Registers the `User` + `Session` models on `sequelize` (the imports are
 * side-effectful — the `.init()` calls inside register them) and re-exports
 * them so controllers can `import { User } from "../../../models"`.
 *
 * Workers add their own models by:
 *   1. Creating `src/models/Foo.ts` with an `.init(...)` call (declare any
 *      indexes / FK `references` + `onDelete` ON THE MODEL — there are no
 *      migrations, so `sync()` is the only thing that builds the schema).
 *   2. Adding an import + re-export line below.
 */

import { User } from "./User";
import { Session } from "./Session";
import { sequelize } from "../db";

export { User, Session };

export async function syncModels(): Promise<void> {
  // Models are the single source of truth — no migrations. A bare `sync()`
  // CREATEs missing tables from the model definitions. Escape hatches for
  // local iteration (leave unset in CI / preview): DB_SYNC_FORCE=true drops &
  // recreates; DB_SYNC_ALTER=true alters existing tables to match models.
  if (process.env.DB_SYNC_FORCE === "true") {
    await sequelize.sync({ force: true });
  } else if (process.env.DB_SYNC_ALTER === "true") {
    await sequelize.sync({ alter: true });
  } else {
    await sequelize.sync();
  }
}
