---
id: api-design
agent: backend
version: v1
description: "REST API design: resource naming, HTTP methods, status codes, error shapes, versioning, pagination, idempotency"
priority: 50
excludes: []
trigger:
  type: composite
  prefilter:
    type: regex
    match: both
    any_of:
      - api design
      - api
      - design
  confirm:
    type: llm
    match: both
    prompt: "Decide whether this project needs the \"api-design\" engineering skill. That skill applies when: REST API design: resource naming, HTTP methods, status codes, error shapes, versioning, pagination, idempotency Answer YES only if the PRD/TRD clearly exhibits this need; quote the supporting line."
---

Language-agnostic reference for designing HTTP APIs that are consistent, predictable, and easy to evolve.

---

## Decision Rules

Apply these by default. Deviate only when you have a concrete reason.

### Resource Naming

- Use plural nouns for collections: `/users`, `/orders`, `/invoices`
- Nest only one level deep for owned resources: `/users/{id}/addresses`
- Never nest for relationships that exist independently: use `/orders?user_id=` instead of `/users/{id}/orders/{id}/items/{id}`
- Use kebab-case for multi-word segments: `/audit-logs`, not `/auditLogs` or `/audit_logs`
- Never leak implementation details in paths: no `/getUserByEmail`, no `/db/tables/users`

### HTTP Methods

| Intent                        | Method  | Idempotent | Safe |
|-------------------------------|---------|------------|------|
| Fetch resource(s)             | GET     | Yes        | Yes  |
| Create (server assigns ID)    | POST    | No         | No   |
| Full replace                  | PUT     | Yes        | No   |
| Partial update                | PATCH   | No*        | No   |
| Delete                        | DELETE  | Yes        | No   |

*PATCH can be made idempotent with conditional requests; do so when clients will retry.

Rules:
- GET and HEAD must never mutate state
- Use POST for actions that don't map cleanly to CRUD: `/payments/{id}/refund`
- Prefer PATCH over PUT unless the client always sends the full resource

### Status Codes

Use the smallest set that clients can actually act on:

| Situation                                   | Code |
|---------------------------------------------|------|
| Success, body returned                      | 200  |
| Created, return new resource                | 201  |
| Success, no body (delete, async accept)     | 204  |
| Permanent redirect                          | 301  |
| Temporary redirect                          | 307  |
| Bad input (client error, fixable by caller) | 400  |
| Missing or invalid auth token               | 401  |
| Valid token, insufficient permissions       | 403  |
| Resource not found                          | 404  |
| Method not allowed on this resource         | 405  |
| Conflict (duplicate, stale version)         | 409  |
| Unprocessable entity (validation failed)    | 422  |
| Rate limit exceeded                         | 429  |
| Server error                                | 500  |
| Upstream/dependency failure                 | 502  |
| Service temporarily unavailable            | 503  |

**Do not use 200 with an error body.** Clients check status codes first.

### Request & Response Shape

- Always return JSON with `Content-Type: application/json`
- Pick one casing convention for JSON field names and apply it consistently: `snake_case` (GitHub, Stripe) and `camelCase` (Google, Twitter) are both common — neither is wrong, mixing is
- Wrap list responses in an object, never a bare array:
  ```json
  { "data": [...], "pagination": { ... } }
  ```
  Bare arrays cannot be extended without breaking clients.
- Use ISO 8601 for all timestamps: `"2026-04-30T14:00:00Z"`
- Use strings for IDs exposed to clients (avoids integer overflow, allows migrating to UUIDs)
- Never return `null` for missing optional fields — omit the field or use a typed absent value

### Error Response Shape

Pick one shape and use it everywhere:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Human-readable summary",
    "details": [
      { "field": "email", "issue": "must be a valid email address" }
    ]
  }
}
```

Rules:
- `code` is a machine-readable string constant (screaming snake case)
- `message` is for developers, not end users
- `details` is optional; include it for validation errors with per-field breakdown
- Never expose stack traces, SQL errors, or internal IDs in error responses

### Versioning

- Version in the URL path: `/v1/users` — most operationally simple
- Increment the major version only on breaking changes
- What counts as breaking: removing a field, changing a field type, changing status code semantics, removing an endpoint
- What is NOT breaking: adding a new optional field, adding a new endpoint, adding a new optional query param
- Maintain at least one previous major version during a deprecation window (minimum 3 months)

### Pagination

Use cursor-based pagination by default for large or frequently-updated collections:

```
GET /events?limit=50&cursor=eyJpZCI6MTIzfQ
```

Response:
```json
{
  "data": [...],
  "pagination": {
    "next_cursor": "eyJpZCI6MTczfQ",
    "has_more": true
  }
}
```

Use offset pagination only for UIs that require page numbers and the dataset is small/static:

```
GET /reports?page=3&per_page=25
```

Response:
```json
{
  "data": [...],
  "pagination": {
    "page": 3,
    "per_page": 25,
    "total": 142
  }
}
```

Rules:
- Always cap `limit`/`per_page` (e.g., max 100) — never allow unbounded fetches
- Never rely on offset pagination for real-time data; rows shift as data is inserted/deleted

### Filtering, Sorting, Searching

- Filters as query params: `GET /orders?status=pending&user_id=42`
- Sort: `GET /products?sort=price&order=asc` (default sort should be documented)
- Full-text search: `GET /articles?q=keyword` — separate from filter params
- Do not invent custom filter DSLs unless the use case demands it

### Idempotency

- GET, PUT, DELETE are idempotent by definition
- For non-idempotent POST operations (payments, emails, job submissions), support an `Idempotency-Key` header:
  ```
  Idempotency-Key: client-generated-uuid
  ```
  Store the key and return the cached response for duplicate requests within a TTL (e.g., 24h)

---

## Common Mistakes

**Using verbs in resource paths**
- Wrong: `POST /createUser`, `GET /getOrder/42`
- Right: `POST /users`, `GET /orders/42`

**200 OK with error in body**
- Breaks all HTTP-aware tooling (proxies, monitoring, clients)

**Returning bare arrays**
- `[{...}, {...}]` cannot gain pagination or metadata without a breaking change

_…(truncated for prompt budget — full reference lives in the Engineering source)_
