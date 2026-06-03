/**
 * User model — owned by `auth-magic-link` scaffold.
 *
 * Same shape as the password-rbac variant but `passwordHash` is always
 * null (this scaffold never sets it). Kept on the row so that switching
 * to password-rbac later is a backward-compatible migration (no DROP
 * COLUMN required).
 */

import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from "sequelize";
import { sequelize } from "../db";

export class User extends Model<
  InferAttributes<User>,
  InferCreationAttributes<User>
> {
  declare id: CreationOptional<string>;
  declare email: string;
  declare passwordHash: CreationOptional<string | null>;
  declare role: "admin" | "operator" | "viewer";
  declare displayName: string | null;
  /**
   * Free-form business persona ("family" / "teacher" / "student" /
   * "coach" — whatever the PRD specifies). Separate from the 3-value
   * RBAC `role` enum. See password-rbac User.ts for full rationale.
   */
  declare domainRole: CreationOptional<string | null>;
  declare lastLoginAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      field: "email",
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "password_hash",
    },
    role: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: "viewer",
      field: "role",
    },
    displayName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "display_name",
    },
    domainRole: {
      type: DataTypes.STRING(64),
      allowNull: true,
      field: "domain_role",
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "last_login_at",
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
    modelName: "User",
    tableName: "users",
    timestamps: true,
    underscored: true,
    // Mirrors the secondary indexes the old migration created (email
    // uniqueness comes from the column's `unique: true`). No migrations.
    indexes: [{ fields: ["role"] }, { fields: ["domain_role"] }],
  },
);
