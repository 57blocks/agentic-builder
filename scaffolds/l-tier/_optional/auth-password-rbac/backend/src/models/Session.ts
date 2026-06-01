/**
 * Session model — owned by `auth-password-rbac` scaffold.
 *
 * One row per active login. `id` is the JWT's `sessionId` claim so we can
 * revoke tokens by deleting the row.
 *
 * Security note — we deliberately do NOT persist the raw JWT in this row.
 * The JWT is verified cryptographically on each request via the same
 * `AUTH_JWT_SECRET`; storing it again here only adds an "if the DB
 * backup leaks, every active session leaks" liability without any
 * revocation benefit (revocation works by deleting the row, not by
 * comparing the token string). Historical schemas with a `token` column
 * are tolerated for backward compatibility but the column is no longer
 * declared or populated.
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
      // FK + cascade declared on the model so `sync()` reproduces what the
      // old 100-create-auth-users migration used to create (deleting a user
      // removes their sessions). Models are the single source of truth.
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
