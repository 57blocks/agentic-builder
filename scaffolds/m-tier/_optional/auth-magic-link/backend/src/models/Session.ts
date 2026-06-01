/**
 * Session model — owned by `auth-magic-link` scaffold.
 *
 * One row per active login. `id` is the JWT's `sessionId` claim so we can
 * revoke tokens by deleting the row.
 *
 * Security note — there is NO `token` column on `sessions`. The JWT is
 * verified cryptographically per-request via `AUTH_JWT_SECRET`, so the
 * server doesn't need to store the raw token to validate it. Persisting
 * it turns every DB backup into a session leak (same liability as
 * storing plaintext passwords) with no revocation benefit beyond what
 * deleting the row already gives us. Migration 100 drops the column on
 * upgrade if it was present in an older deployment.
 */

import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from "sequelize";
import { sequelize } from "../db";

export class Session extends Model<
  InferAttributes<Session>,
  InferCreationAttributes<Session>
> {
  declare id: string;
  declare userId: string;
  declare expiresAt: Date;
  declare lastActivityAt: CreationOptional<Date>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Session.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "user_id",
      // FK + cascade on the model so `sync()` reproduces the old migration's
      // behaviour (deleting a user removes their sessions). No migrations.
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "expires_at",
    },
    lastActivityAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "last_activity_at",
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "created_at",
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "updated_at",
    },
  },
  {
    sequelize,
    modelName: "Session",
    tableName: "sessions",
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ["user_id"] }, { fields: ["expires_at"] }],
  },
);
