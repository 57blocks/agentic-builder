---
id: rate-limiting-idempotency
agent: backend
version: v1
description: "Rate limiting and idempotency: algorithms, scoping, headers, idempotency key pattern, safe retries"
priority: 50
excludes: []
trigger:
  type: composite
  prefilter:
    type: regex
    match: both
    any_of:
      - rate limiting idempotency
      - rate
      - limiting
      - idempotency
  confirm:
    type: llm
    match: both
    prompt: "Decide whether this project needs the \"rate-limiting-idempotency\" engineering skill. That skill applies when: Rate limiting and idempotency: algorithms, scoping, headers, idempotency key pattern, safe retries Answer YES only if the PRD/TRD clearly exhibits this need; quote the supporting line."
---

Language-agnostic reference for protecting services from overload and making mutations safe to retry.

---

## Decision Rules

### Rate Limiting

**Apply rate limits at every public-facing entry point.** Internal service-to-service calls may be exempt if the caller is trusted and controlled.

**Choose the limit scope:**

| Scope               | When to use                                              |
|---------------------|----------------------------------------------------------|
| Per IP              | Unauthenticated endpoints, login, signup                 |
| Per API key / token | Authenticated API consumers with known quotas            |
| Per user            | User-facing actions (posts, uploads, searches)           |
| Per tenant          | Multi-tenant systems with per-tenant SLAs                |
| Global              | Last-resort protection; use alongside scoped limits      |

Use the most specific scope that fits. Per-IP limits alone are weak (shared NAT, proxies). Per-user or per-key limits are more accurate.

**Choose the right algorithm:**

| Algorithm          | How it works                                         | Best for                              |
|--------------------|------------------------------------------------------|---------------------------------------|
| Fixed window       | Count resets at fixed intervals (every minute)       | Simple, cheap; boundary burst problem |
| Sliding window log | Track exact timestamps of each request               | Accurate; memory-expensive at scale   |
| Sliding window counter | Weighted blend of current + previous window      | Good accuracy, low memory             |
| Token bucket       | Tokens refill at a rate; burst up to bucket capacity | APIs that allow controlled bursts     |
| Leaky bucket       | Requests queue and drain at a fixed rate             | Smoothing output rate                 |

Default: **token bucket** or **sliding window counter**. Fixed window is acceptable for simple cases if boundary bursts are tolerable.

**Always return standard rate limit headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 23
X-RateLimit-Reset: 1714492800   # Unix timestamp when the window resets
Retry-After: 37                  # Seconds until the client may retry (on 429)
```

Rules:
- Return `429 Too Many Requests` when the limit is exceeded
- Always include `Retry-After` on a 429 — clients need to know when to retry
- Do not return `503` for rate limiting — that signals your service is down, not that the client is throttled
- Apply rate limiting before authentication where possible (protect the auth endpoint itself)
- Exempt health check endpoints from rate limiting

**Where to enforce:**
- At the API gateway or load balancer for global and per-IP limits (keeps logic out of application code)
- In application middleware for per-user or per-tenant limits that require auth context
- Use a shared store (Redis) for distributed enforcement across multiple instances — in-memory limits only work for single-instance deployments

**Avoid thundering herd on limit reset:**
- When many clients hit a limit simultaneously and all retry at the same moment (window reset), you get a spike
- Add jitter to `Retry-After`: `base_wait + random(0, base_wait * 0.1)`

---

### Idempotency

An operation is idempotent if performing it multiple times produces the same result as performing it once.

**Which operations are inherently idempotent:**
- GET, HEAD, OPTIONS — always safe to retry
- PUT (full replace), DELETE — idempotent by definition
- PATCH, POST — not inherently idempotent; must be made so explicitly

**When to require idempotency on POST/PATCH:**
- Any mutation with real-world side effects: payments, emails, SMS, job submissions, inventory changes
- Any operation a client will retry on network failure or timeout
- Rule of thumb: if duplicating the operation would cause harm, make it idempotent

**Idempotency key pattern:**

1. Client generates a unique key (UUID) per logical operation and sends it in the request:
   ```
   POST /payments
   Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
   ```

2. Server checks a store (DB or cache) for the key before processing:
   - Key not seen → process the request, store `(key, response, expires_at)`, return response
   - Key seen, request still in flight → return `409 Conflict` or queue and wait
   - Key seen, request completed → return the stored response verbatim

3. Keys expire after a defined TTL (24 hours is common for payments; choose based on retry window)

**Storage for idempotency keys:**
- Must be durable for financial or irreversible operations — use the primary DB, not only a cache
- Can use a cache (Redis) for lower-stakes operations where losing the key is tolerable
- Store the full response, not just a flag — you must return the exact same response on duplicate requests
- Use atomic check-and-insert (DB unique constraint or Redis `SET NX`) to prevent race conditions between concurrent duplicate requests

**What to include in the idempotency key lookup:**
- Key alone is sufficient if keys are globally unique (UUID generated by client)
- Some APIs also scope the key to `(user_id, key)` to prevent one user from accidentally or maliciously using another's key

**Handling concurrent duplicate requests:**
- Two requests with the same key arriving simultaneously: use a DB unique constraint or distributed lock
- First writer wins; second gets a conflict error or waits for the first to complete
- Do not process both — that defeats the purpose

**Natural idempotency (no key needed):**
- Some operations are idempotent by design without a key:
  - `PUT /users/{id}/status` with `{"status": "active"}` — setting to a value is idempotent
  - Upsert patterns: `INSERT ... ON CONFLICT DO UPDATE`
- Prefer natural idempotency when possible — fewer moving parts than key tracking

_…(truncated for prompt budget — full reference lives in the Engineering source)_
