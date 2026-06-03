/**
 * Overwritten by `_optional/auth-magic-link` scaffold.
 *
 * Registers User + Session + MagicLinkToken models.
 */

import { User } from "./User";
import { Session } from "./Session";
import { MagicLinkToken } from "./MagicLinkToken";
import { sequelize } from "../db";

export { User, Session, MagicLinkToken };

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
