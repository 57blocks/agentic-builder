/**
 * Migration: create the `users` and `sessions` tables required by
 * `auth-password-rbac`.
 *
 * Migration index is 100 to give the base scaffold's domain migrations
 * (001..099) room. If the project's migration runner doesn't honor file-
 * name ordering, rename this to `001-...` and renumber the rest.
 */

import type { QueryInterface, Sequelize } from "sequelize";
import { DataTypes } from "sequelize";

export async function up(
  queryInterface: QueryInterface,
  _sequelize: Sequelize,
): Promise<void> {
  await queryInterface.createTable("users", {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    role: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: "viewer",
    },
    display_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  await queryInterface.addIndex("users", ["email"], {
    unique: true,
    name: "users_email_unique_idx",
  });
  await queryInterface.addIndex("users", ["role"], {
    name: "users_role_idx",
  });

  await queryInterface.createTable("sessions", {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    token: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    last_activity_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  await queryInterface.addIndex("sessions", ["user_id"], {
    name: "sessions_user_id_idx",
  });
  await queryInterface.addIndex("sessions", ["expires_at"], {
    name: "sessions_expires_at_idx",
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable("sessions");
  await queryInterface.dropTable("users");
}
