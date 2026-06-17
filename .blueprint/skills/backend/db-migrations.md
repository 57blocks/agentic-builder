---
id: db-migrations
agent: backend
version: v1
description: "Database migrations: expand/contract, safe vs unsafe operations, zero-downtime, large table patterns"
priority: 50
excludes: []
trigger:
  type: composite
  prefilter:
    type: regex
    match: both
    any_of:
      - db migrations
      - migrations
  confirm:
    type: llm
    match: both
    prompt: "Decide whether this project needs the \"db-migrations\" engineering skill. That skill applies when: Database migrations: expand/contract, safe vs unsafe operations, zero-downtime, large table patterns Answer YES only if the PRD/TRD clearly exhibits this need; quote the supporting line."
---

Language-agnostic reference for evolving schemas safely, without downtime or data loss.

---

## Decision Rules

### Core Principles

- **Migrations are code.** Store them in version control alongside the application code that depends on them.
- **Migrations are append-only.** Never edit a migration that has already run in any environment. Add a new migration to fix it.
- **Migrations run forward only in production.** Design rollback at the application level (expand/contract), not by running `DOWN` migrations on a live system.
- **Decouple schema changes from code deploys.** The schema must be compatible with both the old and new version of the application during a rolling deploy.

---

### The Expand / Contract Pattern

The only safe way to make breaking schema changes without downtime. Every breaking change is a three-phase process:

**Phase 1 — Expand:**
- Add the new column/table/index alongside the old one
- New code writes to both old and new; reads from old
- Old code still works (new column is nullable or has a default)
- Deploy this phase; both old and new app versions are compatible

**Phase 2 — Migrate (Backfill):**
- Populate the new column/table with data from the old one
- Run as a background job or a migration with batched updates
- Verify data is complete and correct before proceeding

**Phase 3 — Contract:**
- New code reads from new column; stops writing to old
- Deploy this phase; verify no reads/writes hit the old column
- Drop the old column in a subsequent migration after confidence is established

This pattern applies to: renaming columns, changing column types, splitting tables, merging tables.

---

### Safe vs. Unsafe Operations

**Safe (non-locking, non-breaking):**
- Adding a nullable column
- Adding a column with a default value (check your DB — in PostgreSQL 11+, `ADD COLUMN ... DEFAULT` is instant for non-volatile defaults)
- Adding a new table
- Adding an index `CONCURRENTLY` (PostgreSQL) / online DDL (MySQL)
- Dropping an index
- Adding a foreign key with `NOT VALID`, then validating separately

**Unsafe (causes locks or breaks running code):**
- Adding a `NOT NULL` column without a default on a large table — full table rewrite
- Renaming a column — breaks existing queries immediately
- Dropping a column still referenced by running code
- Changing a column type — often a full table rewrite
- Adding a non-concurrent index on a large table — locks writes
- Adding a `CHECK` or `NOT NULL` constraint that requires a full table scan

**For unsafe operations, use the expand/contract pattern or the online alternatives.**

---

### NOT NULL Columns

Never add a `NOT NULL` column to a large table in a single migration:

**Wrong (locks table, fails if any existing rows):**
```sql
ALTER TABLE orders ADD COLUMN shipped_at TIMESTAMPTZ NOT NULL;
```

**Right (three steps):**
```sql
-- Step 1: add nullable
ALTER TABLE orders ADD COLUMN shipped_at TIMESTAMPTZ;

-- Step 2: backfill (batched, outside migration)
UPDATE orders SET shipped_at = created_at WHERE shipped_at IS NULL;

-- Step 3: add constraint (after backfill is verified)
ALTER TABLE orders ALTER COLUMN shipped_at SET NOT NULL;
-- In PostgreSQL, use NOT VALID + VALIDATE CONSTRAINT to avoid full lock
```

---

### Index Creation

- Never create an index without `CONCURRENTLY` (PostgreSQL) or equivalent online DDL on a table with production traffic
- `CREATE INDEX CONCURRENTLY` takes longer but does not block reads or writes
- Concurrent index creation can fail — check that the index was created successfully; a failed concurrent index is left in an invalid state and must be dropped and recreated
- Do not run `CREATE INDEX CONCURRENTLY` inside a transaction — it must run outside

```sql
-- PostgreSQL: safe for production
CREATE INDEX CONCURRENTLY idx_orders_user_id ON orders (user_id);

-- Check for invalid indexes after creation
SELECT indexname FROM pg_indexes
JOIN pg_class ON pg_class.relname = pg_indexes.indexname
WHERE pg_class.relam IS NOT NULL AND NOT pg_index.indisvalid;
```

---

### Foreign Key Constraints

Adding a foreign key on a large table validates all existing rows, which takes a full table scan and holds a lock.

**PostgreSQL safe pattern:**
```sql
-- Add without validation (no lock)
ALTER TABLE orders ADD CONSTRAINT fk_orders_user
  FOREIGN KEY (user_id) REFERENCES users(id) NOT VALID;

-- Validate separately (lock-free, but slower)
ALTER TABLE orders VALIDATE CONSTRAINT fk_orders_user;
```

---

### Renaming Columns and Tables

Never rename a column or table that running code references in a single step.

**Safe rename process:**
1. Add the new column; write to both old and new
2. Backfill new column from old
3. Migrate all code to read from new column
4. Deploy; verify no references to old column
5. Drop old column

For ORMs that map column names: update the mapping in a deploy between steps 3 and 4.

---

### Migration Execution

- Run migrations before deploying new code (pre-deploy migrations must be backward compatible with old code)
- Run post-deploy cleanups (dropping old columns, removing old indexes) after confirming the new code is stable
- Never run migrations manually in production — automate via CI/CD pipeline
- Migrations must be transactional where the DB supports it (DDL in a transaction): if the migration fails partway, it rolls back cleanly
- Some operations (concurrent index creation, certain ALTER TABLE) cannot run in a transaction — document these explicitly

**Migration table:**
- Most frameworks maintain a migrations table tracking which migrations have run
- Never manually modify this table to "fix" a migration — fix the migration itself

---

### Large Table Migrations

_…(truncated for prompt budget — full reference lives in the Engineering source)_
