---
id: data-modeling
agent: backend
version: v1
description: "Data modeling: schema design, normalization, indexing, primary keys, soft deletes, schema evolution"
priority: 50
excludes: []
trigger:
  type: composite
  prefilter:
    type: regex
    match: both
    any_of:
      - data modeling
      - modeling
  confirm:
    type: llm
    match: both
    prompt: "Decide whether this project needs the \"data-modeling\" engineering skill. That skill applies when: Data modeling: schema design, normalization, indexing, primary keys, soft deletes, schema evolution Answer YES only if the PRD/TRD clearly exhibits this need; quote the supporting line."
---

Language-agnostic reference for designing schemas that are correct, queryable, and safe to evolve.

---

## Decision Rules

### Normalization vs. Denormalization

Normalize by default (3NF). Denormalize only when you have a measured query performance problem.

**Normalize when:**
- Data is written frequently
- Consistency is critical (financial records, inventory)
- Query patterns are not yet known

**Denormalize when:**
- A query joins more than 4–5 tables and is on the critical path
- The data is read-heavy and rarely updated
- You have a measured latency problem, not a hypothetical one

Never denormalize to avoid learning SQL joins.

### Choosing a Primary Key

- Use surrogate keys (system-generated IDs) as primary keys — not natural keys
- Prefer UUIDs (v4 or v7) over auto-increment integers for keys exposed to clients:
  - No enumeration attack surface
  - Safe to generate client-side
  - Works across distributed systems
- Use UUID v7 (time-ordered) over v4 when index locality matters (most relational DBs)
- Keep auto-increment integers as internal-only PKs only if you have a strong performance reason and never expose them in APIs

### Natural Keys

- Natural keys (email, SSN, username) change in the real world — never use them as PKs
- They are fine as unique constraints alongside a surrogate PK
- Composite natural keys as PKs make foreign keys painful — use a surrogate PK + unique constraint instead

### Nullability

- Default to NOT NULL. Add NULL only when absence has distinct meaning from a default value
- `NULL` means "unknown" — not zero, not empty string, not "not applicable"
- Nullable foreign keys are valid for optional relationships (e.g., `assigned_to` on a task)
- Avoid columns that are sometimes NULL based on another column's value — that is a signal to split into separate tables or use a polymorphic pattern carefully

### Timestamps

Every table should have at minimum:
```
created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
```

Rules:
- Always store timestamps in UTC
- Use `TIMESTAMPTZ` (timestamp with time zone) in PostgreSQL, not `TIMESTAMP`
- Never store timestamps as Unix epoch integers unless interfacing with a system that requires it
- Add `deleted_at TIMESTAMPTZ` for soft deletes instead of hard deleting rows (see Soft Deletes below)

### Soft Deletes

Use soft deletes when:
- Audit trails are required
- Related records reference the row via FK
- Data recovery is a business requirement

Soft delete pattern:
```
deleted_at  TIMESTAMPTZ NULL  -- NULL = active, timestamp = deleted
```

Tradeoffs:
- Every query must filter `WHERE deleted_at IS NULL` — easy to forget
- Unique constraints must include `deleted_at` or become partial indexes
- Consider a separate archive table for large datasets to keep the hot table lean

### Indexes

Add an index when:
- The column appears in `WHERE`, `JOIN ON`, or `ORDER BY` on a large table
- It is a foreign key column (most DBs do not auto-index FKs)
- The column has high cardinality (many distinct values)

Do not index:
- Boolean columns or low-cardinality columns alone (index selectivity too low)
- Every column "just in case" — indexes slow writes and consume storage

Index types to know:
- **B-tree** (default): equality and range queries
- **Hash**: equality-only (rarely use; B-tree usually fine)
- **Composite index**: column order matters — put the most selective / equality-filtered column first
- **Partial index**: index only a subset of rows (`WHERE deleted_at IS NULL`) — smaller and faster
- **Covering index**: include extra columns in the index to avoid table lookups for hot queries

### Foreign Keys

- Always define FK constraints — they are the DB's guarantee of referential integrity
- Choose the right cascade behavior explicitly:
  - `ON DELETE RESTRICT` (default, safest): prevent deletion of referenced rows
  - `ON DELETE CASCADE`: delete children when parent is deleted (use carefully)
  - `ON DELETE SET NULL`: nullify FK when parent is deleted (for optional relationships)
- Never skip FKs for "performance reasons" without benchmarking — the cost is usually negligible

### Relationships

**One-to-many:** FK on the "many" side pointing to the "one" side.

**Many-to-many:** Use a join table with its own surrogate PK and FKs to both sides. Add a unique constraint on `(left_id, right_id)`. Add extra columns to the join table for relationship metadata (e.g., `role`, `joined_at`).

**One-to-one:** FK on the dependent table (the one that "belongs to" the other). Add a UNIQUE constraint on the FK column.

### Polymorphic Associations

Avoid the `(entity_type, entity_id)` pattern if possible — it cannot have a real FK constraint and couples unrelated tables.

Prefer:
1. **Separate FK columns** per entity type with NULL for non-applicable ones (works for 2–3 types)
2. **Separate join tables** per relationship (cleanest, most normalized)
3. **Shared base table** with a discriminator column and sub-type tables (table-per-type inheritance)

Only use `(entity_type, entity_id)` if you have many entity types and the relationship structure is truly generic (e.g., a comments or tags system).

### Schema Evolution

- Never rename or drop a column in a single migration that also deploys new code — do it in phases:
  1. Deploy: add new column, write to both old and new
  2. Backfill: migrate existing data
  3. Deploy: read from new column only
  4. Deploy: drop old column
- Make new columns NOT NULL only after backfilling — or provide a DEFAULT for the migration
- Avoid locking migrations on large tables: use `ADD COLUMN ... DEFAULT NULL`, then backfill, then set NOT NULL
- Long-running migrations should be run separately from application deploys

---

## Common Mistakes

**Using email or username as primary key**
- Users change emails. Now every FK and index must be updated.

_…(truncated for prompt budget — full reference lives in the Engineering source)_
