---
id: migration-idempotency
agent: task-breakdown
version: v1
description: Sequelize migration tasks must be idempotent (CREATE … IF NOT EXISTS, ON CONFLICT DO NOTHING, FK ordering) so re-runs and replans don't corrupt schema state.
priority: 78
excludes: []
trigger:
  type: regex
  match: both
  any_of:
    - "Sequelize"
    - "migration"
    - "migrations"
    - "database/migrations"
    - "data layer"
    - "Data Layer"
    - "Data Models"
    - "schema"
---

# Sequelize migration hard rules

When a task writes ANY file under `backend/src/database/migrations/`, every
migration in that task MUST follow the rules below. The pipeline reruns
migrations on partial state (after self-heal replans, after FK-order fixes,
after a worker re-runs from a failed checkpoint). A migration that throws on
the second run blocks the whole project — there is no recovery short of
manually dropping the DB.

## Hard rule 1 — Idempotent DDL

NEVER call `queryInterface.createTable` / `addColumn` / `addIndex` / `addConstraint`
directly. They throw on re-run with no `IF NOT EXISTS` escape. Wrap every DDL
statement in raw SQL via `queryInterface.sequelize.query(...)`:

```ts
const q = queryInterface.sequelize;

await q.query(`
  CREATE TABLE IF NOT EXISTS users (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email      VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  )
`);

await q.query(`
  CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx
  ON users (email)
`);

await q.query(`
  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'role'
    ) THEN
      ALTER TABLE users ADD COLUMN role VARCHAR(32) NOT NULL DEFAULT 'viewer';
    END IF;
  END $$
`);
```

## Hard rule 2 — Idempotent seed inserts

Every `bulkInsert` / raw `INSERT` MUST use `ON CONFLICT (<pk_or_unique>) DO
NOTHING`:

```ts
await q.query(`
  INSERT INTO roles (id, name) VALUES
    ('admin',    'Admin'),
    ('operator', 'Operator'),
    ('viewer',   'Viewer')
  ON CONFLICT (id) DO NOTHING
`);
```

## Hard rule 3 — Filename-order FK dependency

The numeric prefix on a migration filename is the apply order. A migration
that creates a table with `REFERENCES other_table(id)` MUST have a prefix
STRICTLY GREATER than the migration that creates `other_table`. When two
tables FK-reference each other (mutual), put BOTH `CREATE TABLE` statements
into a single migration so neither side is missing at apply time.

Anti-pattern (the actual outage we shipped once):

```
014-create-payments.ts     ← REFERENCES approvals(id), FAILS — approvals doesn't exist yet
015-create-approvals.ts    ← creates approvals
```

Correct:

```
014-create-approvals.ts    ← creates approvals first
015-create-payments.ts     ← REFERENCES approvals(id), works
```

When unsure, plan all mutually-referenced entities into ONE migration.

## Hard rule 4 — Never drop in the create migration

`DROP COLUMN` / `DROP TABLE` go in a NEW numbered migration, never inside
the same migration that creates the column/table. If the create migration
half-completes on the first run and then you change it to add a drop, the
re-run sees BOTH "table doesn't have column to drop" AND "table already
exists" — both throw with vanilla DDL.

## Self-check before emitting the task

For every migration file you plan to write, the task description MUST
explicitly say "idempotent migration using `IF NOT EXISTS` / `DO $$ IF NOT
EXISTS` / `ON CONFLICT DO NOTHING`" so the implementing worker has no
ambiguity. Vague phrasing like "create the table" silently falls back to
`queryInterface.createTable` and re-introduces the bug.
