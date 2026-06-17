---
id: pagination-filtering
agent: backend
version: v1
description: "Pagination and filtering at scale: keyset pagination, offset tradeoffs, filtering, sort allowlists"
priority: 50
excludes: []
trigger:
  type: composite
  prefilter:
    type: regex
    match: both
    any_of:
      - pagination filtering
      - pagination
      - filtering
  confirm:
    type: llm
    match: both
    prompt: "Decide whether this project needs the \"pagination-filtering\" engineering skill. That skill applies when: Pagination and filtering at scale: keyset pagination, offset tradeoffs, filtering, sort allowlists Answer YES only if the PRD/TRD clearly exhibits this need; quote the supporting line."
---

Language-agnostic reference for building list endpoints that stay fast, stable, and correct as data grows.

---

## Decision Rules

### Choose the Right Pagination Method

| Method          | How it works                                      | Best for                                      |
|-----------------|---------------------------------------------------|-----------------------------------------------|
| Offset          | `LIMIT n OFFSET m`                                | Small datasets, UIs needing page numbers      |
| Keyset (cursor) | `WHERE (created_at, id) < (?, ?)  ORDER BY ... LIMIT n` | Large datasets, feeds, real-time data    |
| Cursor (opaque) | Encode keyset values in a base64 token            | Public APIs hiding implementation details     |
| Seek (composite)| Keyset on multiple columns for stable sort        | Multi-column sort with high correctness needs |

**Default to keyset pagination for any table that will grow large.** Offset pagination degrades linearly — `OFFSET 100000` causes the DB to scan and discard 100,000 rows on every request.

Use offset only when:
- The dataset is small and bounded (reference data, config)
- The UI genuinely requires random page access by number
- Total count is required and performance is acceptable

---

### Offset Pagination Problems

**Performance degrades at depth:**
```sql
SELECT * FROM events ORDER BY created_at DESC LIMIT 20 OFFSET 100000;
-- DB scans 100,020 rows, discards 100,000, returns 20
```
- Cost is O(offset) — page 5000 is 5000x slower than page 1
- No index can eliminate this scan

**Results shift under concurrent writes:**
- A new row inserted between page 1 and page 2 requests causes a row to appear on both pages
- A deleted row causes a row to be skipped entirely
- Non-deterministic without a stable sort on an immutable column

---

### Keyset Pagination

Keyset pagination uses the last seen values as the starting point for the next page:

```sql
-- First page
SELECT * FROM orders
WHERE user_id = ?
ORDER BY created_at DESC, id DESC
LIMIT 20;

-- Next page (using last row's created_at and id)
SELECT * FROM orders
WHERE user_id = ?
  AND (created_at, id) < (:last_created_at, :last_id)
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

Rules:
- The sort key must be **unique** — use a tiebreaker (usually `id`) to guarantee uniqueness when the primary sort column has duplicates
- The sort key must be **indexed** — composite index on `(user_id, created_at DESC, id DESC)` for the query above
- Always include `id` as the final tiebreaker
- Sort direction must be consistent — you cannot mix ASC and DESC across the keyset columns without careful handling
- Keyset pages are not random-accessible — you cannot jump to page 50; you must walk forward

**Encoding the cursor:**
- Encode the keyset values as an opaque token (base64 JSON) returned in the response
- Clients treat it as a black box: pass `next_cursor` back to get the next page
- Never expose raw column values as the cursor if they reveal internal schema details
- Sign or encrypt the cursor if tampering would be a security concern

```json
{
  "data": [...],
  "pagination": {
    "next_cursor": "eyJjcmVhdGVkX2F0IjoiMjAyNi0wNC0zMFQxMjowMDowMFoiLCJpZCI6IjEyMyJ9",
    "has_more": true
  }
}
```

---

### Stable Sort Requirement

A sort that is not deterministic produces inconsistent pagination:

```sql
-- Unstable: two rows with the same created_at have undefined relative order
ORDER BY created_at DESC

-- Stable: tiebreaker guarantees a unique, consistent order
ORDER BY created_at DESC, id DESC
```

Without a tiebreaker, the same cursor can return different rows on each request under concurrent writes or after a DB failover.

---

### Backward Pagination

For UIs that need both "next" and "previous" (e.g., timeline navigation):

- Store both `next_cursor` and `prev_cursor` in the response
- `prev_cursor` reverses the sort direction: `WHERE (created_at, id) > (:first_created_at, :first_id) ORDER BY created_at ASC, id ASC LIMIT n`, then reverse the results
- Or maintain a cursor stack client-side (push on next, pop on previous)

---

### Total Count

Exact total counts on large tables are expensive:

```sql
SELECT COUNT(*) FROM events WHERE user_id = ?;
-- Full index scan — acceptable on small tables, painful on millions of rows
```

Alternatives:
- **Skip the total:** return only `has_more: true/false` — sufficient for infinite scroll UIs
- **Approximate count:** use DB statistics (`pg_stat_user_tables`, `EXPLAIN`) — fast but imprecise
- **Cached count:** maintain a counter in a separate table, updated on insert/delete — precise but requires careful consistency
- **Cap the count:** `SELECT COUNT(*) FROM (SELECT 1 FROM events WHERE user_id = ? LIMIT 10001)` — tells you "at least 10,000" cheaply

Only compute an exact total if the UI genuinely needs it and the table is small enough.

---

### Filtering

**Basic filter design:**
- Accept filters as query parameters: `GET /orders?status=pending&user_id=42`
- Validate all filter values before using them in queries — type, enum membership, length
- Apply filters in the `WHERE` clause using parameterized queries — never interpolate filter values into SQL
- Index columns that will be filtered on large tables

**Compound filters:**
- Support multiple filters simultaneously: `?status=pending&created_after=2026-01-01`
- AND semantics by default (all conditions must match)
- OR semantics require explicit design — a `filter_mode=any` param or a structured filter DSL

**Range filters:**
- Use `_after`/`_before` or `_gte`/`_lte` suffixes: `created_after`, `amount_gte`
- Always validate that range start ≤ range end
- Index the range column; composite index helps if combined with an equality filter: `(user_id, created_at)`

**Enum filters:**
- Validate against the allowed set before querying — do not pass raw client strings to `WHERE status = ?` without checking the value is a known status

---

### Filtering at Scale

_…(truncated for prompt budget — full reference lives in the Engineering source)_
