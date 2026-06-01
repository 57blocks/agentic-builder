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
  const syncAlter = process.env.DB_SYNC_ALTER === "true";
  await sequelize.sync({ alter: syncAlter });
}
