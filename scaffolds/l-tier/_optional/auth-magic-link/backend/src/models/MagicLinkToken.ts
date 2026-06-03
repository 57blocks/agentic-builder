/**
 * MagicLinkToken — one-shot, time-limited token issued by
 * `POST /v1/auth/magic` and consumed by `GET /v1/auth/magic/verify`.
 *
 * Rows are deleted on successful verify so a replay returns 401. A
 * background sweep should drop expired rows (out of scope for this
 * scaffold — workers can add a cron job if they care).
 */

import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from "sequelize";
import { sequelize } from "../db";

export class MagicLinkToken extends Model<
  InferAttributes<MagicLinkToken>,
  InferCreationAttributes<MagicLinkToken>
> {
  declare id: CreationOptional<string>;
  declare email: string;
  declare token: string;
  declare expiresAt: Date;
  declare usedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

MagicLinkToken.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "email",
    },
    token: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      field: "token",
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "expires_at",
    },
    usedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "used_at",
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
    modelName: "MagicLinkToken",
    tableName: "magic_link_tokens",
    timestamps: true,
    underscored: true,
    // `token` uniqueness comes from the column's `unique: true`; this mirrors
    // the migration's secondary index on expiry. No migrations.
    indexes: [{ fields: ["expires_at"] }],
  },
);
