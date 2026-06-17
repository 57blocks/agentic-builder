---
id: db-access-patterns
agent: backend
version: v1
description: "Database access patterns: connection pooling, transactions, N+1 queries, locking, bulk operations, read replicas"
priority: 50
excludes: []
trigger:
  type: composite
  prefilter:
    type: regex
    match: both
    any_of:
      - db access patterns
      - access
      - patterns
  confirm:
    type: llm
    match: both
    prompt: "Decide whether this project needs the \"db-access-patterns\" engineering skill. That skill applies when: Database access patterns: connection pooling, transactions, N+1 queries, locking, bulk operations, read replicas Answer YES only if the PRD/TRD clearly exhibits this need; quote the supporting line."
---

Language-agnostic reference for writing database interactions that are correct, efficient, and safe under load.

---

## Decision Rules

### Connection Management

- Never open a new connection per request — use a connection pool
- Size the pool to match the DB server's capacity, not the application's concurrency:
  - A good starting formula: `pool_size = num_cores * 2 + effective_spindle_count` (Hikari/PgBouncer rule of thumb)
  - A pool that is too large causes DB-side contention; too small causes queuing in the app
- Set a connection acquisition timeout — fail fast rather than queue indefinitely
- Set a max connection lifetime to recycle connections and avoid stale state
- In serverless / short-lived environments, use an external pooler (PgBouncer, RDS Proxy) — do not rely on in-process pools

Connection pool settings to always configure explicitly:

| Setting                  | Purpose                                              |
|--------------------------|------------------------------------------------------|
| `min_pool_size`          | Warm connections kept alive                          |
| `max_pool_size`          | Hard ceiling on DB connections                       |
| `acquire_timeout`        | How long to wait for a connection before erroring    |
| `max_lifetime`           | Force-recycle connections after this duration        |
| `idle_timeout`           | Close connections idle longer than this              |
| `health_check_query`     | Validate connection before handing to caller         |

### Transactions

Use a transaction when:
- Two or more writes must succeed or fail together
- You read a value and then write based on it (read-modify-write)
- You need to guarantee a consistent snapshot across multiple reads

Do not use a transaction when:
- A single-statement write (most DBs auto-commit single statements)
- You are only reading and do not need a consistent snapshot

Rules:
- Keep transactions as short as possible — long transactions hold locks and block other writers
- Never do network I/O (HTTP calls, cache writes, email sends) inside a transaction
- Never do user-facing latency work (waiting for input, slow computation) inside a transaction
- Acquire locks in a consistent order across all code paths to avoid deadlocks
- Use `SELECT ... FOR UPDATE` to lock rows you intend to modify within a transaction
- Use `REPEATABLE READ` or `SERIALIZABLE` isolation only when you need stronger guarantees — the default (`READ COMMITTED`) is correct for most cases

Isolation levels and what they prevent:

| Level             | Dirty Read | Non-repeatable Read | Phantom Read |
|-------------------|------------|---------------------|--------------|
| READ UNCOMMITTED  | Possible   | Possible            | Possible     |
| READ COMMITTED    | Prevented  | Possible            | Possible     |
| REPEATABLE READ   | Prevented  | Prevented           | Possible     |
| SERIALIZABLE      | Prevented  | Prevented           | Prevented    |

Default: `READ COMMITTED`. Step up only when you can articulate the anomaly you are preventing.

### The N+1 Query Problem

N+1 occurs when fetching a list of N records triggers N additional queries to fetch related data.

```
# N+1: fetches 1 list, then 1 query per row
orders = query("SELECT * FROM orders LIMIT 100")
for order in orders:
    user = query("SELECT * FROM users WHERE id = ?", order.user_id)
```

Fix with eager loading (JOIN or batch fetch):

```
# Single JOIN
query("""
  SELECT orders.*, users.name
  FROM orders
  JOIN users ON users.id = orders.user_id
  LIMIT 100
""")

# Or batch fetch (IN clause)
orders = query("SELECT * FROM orders LIMIT 100")
user_ids = [o.user_id for o in orders]
users = query("SELECT * FROM users WHERE id = ANY(?)", user_ids)
users_by_id = {u.id: u for u in users}
```

Rules:
- Treat any query inside a loop as a code smell — investigate it
- Use query logging / slow query logs in development to catch N+1 before production
- ORMs silently generate N+1 — always inspect the SQL your ORM emits for list endpoints

### Query Patterns

**Prefer explicit column selection over `SELECT *`:**
- `SELECT *` fetches unused data, breaks if column order matters, hides schema dependencies

**Use query parameters, never string interpolation:**
- String interpolation causes SQL injection
- Parameterized queries also allow the DB to cache query plans

**Paginate all list queries:**
- Unbounded `SELECT` on a large table will eventually cause timeouts or OOM
- See the [api-design](../api-design/README.md) pagination section for cursor vs. offset tradeoffs

**Use LIMIT with ORDER BY:**
- `LIMIT` without `ORDER BY` returns non-deterministic results — different rows on each call

**Avoid `SELECT COUNT(*)` on large tables for real-time display:**
- Full table count is expensive on large tables
- Use approximate counts (`pg_stat_user_tables`), cached counts, or skip exact totals

### Optimistic vs. Pessimistic Locking

**Pessimistic locking** (`SELECT ... FOR UPDATE`):
- Lock the row when you read it; no other transaction can modify it until you commit
- Use when conflicts are frequent and the cost of retrying is high
- Downside: holds locks for the duration of the transaction, reduces throughput

**Optimistic locking** (version column):
- Read a row with a `version` (or `updated_at`) column
- On update, assert the version has not changed:
  ```
  UPDATE items
  SET stock = stock - 1, version = version + 1
  WHERE id = ? AND version = ?
  ```
- If 0 rows updated, another writer won the race — retry or surface a conflict error
- Use when conflicts are rare and throughput matters
- Downside: requires retry logic in the application

Default: optimistic locking. Use pessimistic when contention is demonstrably high.

### Bulk Operations

_…(truncated for prompt budget — full reference lives in the Engineering source)_
