/**
 * User model — owned by `auth-password-rbac` scaffold.
 *
 * Workers MAY add columns (avatar_url, last_login_at, etc.) but MUST NOT
 * remove the four core columns (id, email, passwordHash, role) — the
 * controller + middleware contract depends on them.
 *
 * Two role columns coexist on purpose:
 *   - `role` (`admin` | `operator` | `viewer`) is the RBAC authorisation
 *     primitive enforced by `requireRole()` middleware.
 *   - `domainRole` (`string | null`) is a free-form business persona
 *     (e.g. "family" / "teacher" / "student" / "coach") consumed by
 *     frontend route shells (Family/Teacher/AdminShell). Splitting it
 *     out keeps `role` a tight enum and lets the PRD-derived persona
 *     evolve without forcing a migration each time the product invents
 *     a new business actor.
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
  declare passwordHash: string | null;
  declare role: "admin" | "operator" | "viewer";
  declare displayName: string | null;
  declare domainRole: CreationOptional<string | null>;
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
  },
);
