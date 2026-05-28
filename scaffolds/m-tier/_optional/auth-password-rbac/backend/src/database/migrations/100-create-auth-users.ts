/**
 * Migration: create the `users` and `sessions` tables required by
 * `auth-password-rbac`.
 *
 * Migration index is 100 to give the base scaffold's domain migrations
 * (001..099) room. If the project's migration runner doesn't honor file-
 * name ordering, rename this to `001-...` and renumber the rest.
 *
 * Idempotency — every DDL statement here uses `IF NOT EXISTS`
 * (table / column / index). The migration runner records umzug state
 * but partial-run failures (e.g. an OOM mid-migration, or a stale dev
 * DB with some tables already present) used to leave the rebuild
 * permanently broken. Idempotent raw SQL fixes that.
 *
 * Security — the `sessions` table does NOT carry a `token` column. The
 * JWT is verified cryptographically per-request; storing it in the row
 * adds a "DB backup leak = every session leak" liability with no
 * revocation benefit. See `models/Session.ts` for the security note.
 */

import type { QueryInterface, Sequelize } from "sequelize";

export async function up(
  queryInterface: QueryInterface,
  _sequelize: Sequelize,
): Promise<void> {
  const q = queryInterface.sequelize;

  await q.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email         VARCHAR(255) NOT NULL,
      password_hash VARCHAR(255),
      role          VARCHAR(32)  NOT NULL DEFAULT 'viewer',
      display_name  VARCHAR(255),
      domain_role   VARCHAR(64),
      created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `);

  // Backfill path for databases created BEFORE `domain_role` was part of
  // the CREATE TABLE. Idempotent guard so re-runs on fresh databases
  // (column already present) are a no-op.
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
  // drop it if present. New deployments simply never create it. Doing this
  // in a guard rather than always-DROP keeps the migration safe when the
  // column was never created in the first place.
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
}

export async function down(
  queryInterface: QueryInterface,
  _sequelize: Sequelize,
): Promise<void> {
  const q = queryInterface.sequelize;
  await q.query(`DROP TABLE IF EXISTS sessions`);
  await q.query(`DROP TABLE IF EXISTS users`);
}
