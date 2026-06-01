/**
 * Migration: create the `users`, `sessions`, and `magic_link_tokens`
 * tables required by `auth-magic-link`.
 *
 * Idempotency — every DDL statement here uses `IF NOT EXISTS` (table /
 * column / index). The migration runner records umzug state, but partial
 * failures (OOM mid-migration, stale dev DB with some tables already
 * present, re-running the seed step) used to leave the rebuild
 * permanently broken. Idempotent raw SQL fixes that.
 *
 * Security — the `sessions` table does NOT carry a `token` column. The
 * JWT is verified cryptographically per-request; storing it in the row
 * adds a "DB backup leak = every session leak" liability with no
 * revocation benefit. The DO-block below DROPs the column if it exists
 * (graceful upgrade from older deployments that did persist it).
 *
 * Schema parity — the `users` table mirrors `auth-password-rbac` so a
 * project that switches auth mode later doesn't need a destructive
 * migration. `domain_role` lives alongside `role` to carry business
 * persona (family/teacher/student/coach) independently of the 3-value
 * RBAC enum.
 */

import type { QueryInterface, Sequelize } from "sequelize";

export async function up(
  queryInterface: QueryInterface,
  _sequelize: Sequelize,
): Promise<void> {
  const q = queryInterface.sequelize;

  await q.query(`
    CREATE TABLE IF NOT EXISTS users (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email          VARCHAR(255) NOT NULL,
      password_hash  VARCHAR(255),
      role           VARCHAR(32)  NOT NULL DEFAULT 'viewer',
      display_name   VARCHAR(255),
      domain_role    VARCHAR(64),
      last_login_at  TIMESTAMPTZ,
      created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `);

  await q.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'domain_role'
      ) THEN
        ALTER TABLE users ADD COLUMN domain_role VARCHAR(64);
      END IF;
    END $$
  `);

  await q.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx
      ON users (email)
  `);
  await q.query(`
    CREATE INDEX IF NOT EXISTS users_role_idx
      ON users (role)
  `);
  await q.query(`
    CREATE INDEX IF NOT EXISTS users_domain_role_idx
      ON users (domain_role)
  `);

  await q.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id                UUID PRIMARY KEY,
      user_id           UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      expires_at        TIMESTAMPTZ  NOT NULL,
      last_activity_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `);

  // Tolerate older schemas that still have a `token` column on `sessions`:
  // drop it if present. New deployments simply never create it.
  await q.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sessions' AND column_name = 'token'
      ) THEN
        ALTER TABLE sessions DROP COLUMN token;
      END IF;
    END $$
  `);

  await q.query(`
    CREATE INDEX IF NOT EXISTS sessions_user_id_idx
      ON sessions (user_id)
  `);
  await q.query(`
    CREATE INDEX IF NOT EXISTS sessions_expires_at_idx
      ON sessions (expires_at)
  `);

  await q.query(`
    CREATE TABLE IF NOT EXISTS magic_link_tokens (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email       VARCHAR(255) NOT NULL,
      token       VARCHAR(255) NOT NULL,
      expires_at  TIMESTAMPTZ  NOT NULL,
      used_at     TIMESTAMPTZ,
      created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `);

  await q.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS magic_link_tokens_token_unique_idx
      ON magic_link_tokens (token)
  `);
  await q.query(`
    CREATE INDEX IF NOT EXISTS magic_link_tokens_expires_at_idx
      ON magic_link_tokens (expires_at)
  `);
}

export async function down(
  queryInterface: QueryInterface,
  _sequelize: Sequelize,
): Promise<void> {
  const q = queryInterface.sequelize;
  await q.query(`DROP TABLE IF EXISTS magic_link_tokens`);
  await q.query(`DROP TABLE IF EXISTS sessions`);
  await q.query(`DROP TABLE IF EXISTS users`);
}
