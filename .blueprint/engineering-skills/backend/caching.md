---
id: caching
agent: backend
version: v1
description: "Caching: cache-aside, write-through, TTL strategy, invalidation, stampede prevention, HTTP caching"
priority: 50
excludes: []
trigger:
  type: composite
  prefilter:
    type: regex
    match: both
    any_of:
      - caching
  confirm:
    type: llm
    match: both
    prompt: "Decide whether this project needs the \"caching\" engineering skill. That skill applies when: Caching: cache-aside, write-through, TTL strategy, invalidation, stampede prevention, HTTP caching Answer YES only if the PRD/TRD clearly exhibits this need; quote the supporting line."
---

Language-agnostic reference for deciding when to cache, which strategy to use, and how to avoid correctness traps.

---

## Decision Rules

### Should You Cache This?

Cache when **all** of the following are true:
- The data is read more often than it changes
- The computation or query to produce it is measurably expensive
- Serving slightly stale data is acceptable, OR you have a reliable invalidation strategy

Do not cache when:
- The data must always be fresh (account balance at point of transaction, auth token validity)
- The dataset is so large that cache hit rate will be too low to justify the overhead
- The system is not yet slow — do not cache speculatively

Ask before caching: "What is the worst case if this data is stale?" If the answer is "incorrect financial data" or "security bypass," do not cache without an invalidation strategy.

---

### Caching Layers

Apply caches closest to the consumer first:

| Layer               | Examples                            | Latency    | Scope          |
|---------------------|-------------------------------------|------------|----------------|
| In-process (local)  | In-memory map, LRU cache in app     | ~nanoseconds | Single instance |
| Shared / distributed| Redis, Memcached                    | ~1ms       | All instances  |
| HTTP / CDN cache    | Varnish, Cloudflare, browser cache  | ~10ms      | Edge / client  |
| DB query cache      | Materialized views, query result cache | ~1ms    | DB layer       |

Rules:
- Use in-process cache for static or rarely-changing config/reference data (feature flags, country codes)
- Use a shared cache (Redis) for user-specific or session data shared across instances
- Use HTTP caching for public, anonymous content that does not vary per user
- Do not use in-process cache for data that must be consistent across instances (inventory counts, rate limit counters)

---

### Caching Strategies

**Cache-Aside (Lazy Loading)** — most common default:
```
value = cache.get(key)
if value is None:
    value = db.query(...)
    cache.set(key, value, ttl=300)
return value
```
- Application manages the cache explicitly
- Cache is populated on first miss (lazy)
- Stale data possible between write and TTL expiry unless you invalidate on write
- Best for: read-heavy data with acceptable staleness window

**Write-Through:**
```
db.write(data)
cache.set(key, data, ttl=...)
```
- Cache is updated synchronously on every write
- No stale reads after a write
- Every write touches the cache — wasted if many written keys are never read
- Best for: data that is written and then immediately read

**Write-Behind (Write-Back):**
- Write to cache first; persist to DB asynchronously
- Lower write latency, but risk of data loss if cache crashes before flush
- Complex to implement correctly
- Avoid unless write latency is a hard requirement and some data loss is tolerable

**Read-Through:**
- Cache sits in front of DB; the cache layer handles misses automatically
- Application always reads from cache; cache fetches from DB on miss
- Simpler application code; requires a cache layer that supports this (e.g., a caching proxy)

**Refresh-Ahead (Proactive):**
- Cache refreshes a key before it expires, based on predicted access patterns
- Eliminates miss latency for hot keys
- Complex; only worth it for known-hot, expensive-to-compute keys

Default strategy: **cache-aside**. Use write-through when read-after-write consistency matters.

---

### TTL Strategy

- Every cached value must have a TTL — never cache without expiry
- TTL = acceptable staleness window, not "how long before we run out of memory"
- Set TTL based on how quickly the underlying data changes and how much staleness is tolerable:

| Data type                    | Typical TTL          |
|------------------------------|----------------------|
| User profile                 | 5–15 minutes         |
| Product catalog              | 1–60 minutes         |
| Session data                 | Idle timeout (e.g. 30 min) |
| Reference / config data      | Hours to days        |
| Search results               | 1–5 minutes          |
| Rate limit counters          | Window duration      |
| Auth tokens / denylist       | Token expiry         |

Add jitter to TTLs to prevent cache stampede:
```
ttl = base_ttl + random(-base_ttl * 0.1, base_ttl * 0.1)
```

---

### Cache Invalidation

**TTL expiry** — simplest; stale window is bounded by TTL. Acceptable for most cases.

**Explicit invalidation on write** — delete or update the cache entry when the source data changes:
```
db.update(user)
cache.delete("user:" + user.id)
```
- Eliminates stale window; cache is populated fresh on next read
- Requires every write path to also invalidate the cache — easy to miss

**Event-driven invalidation** — publish a change event; cache consumers listen and invalidate:
- Decoupled; works across services
- Adds complexity; requires reliable event delivery

**Version-based / surrogate keys** — embed a version in the cache key:
```
key = "user:" + user.id + ":v" + user.version
```
- Old versions are never read again; they expire via TTL
- No active invalidation needed; slightly higher memory usage

Rules:
- Prefer explicit invalidation + TTL as a safety net
- Never rely on TTL alone for data that changes on user action (profile updates, permission changes)
- When in doubt, make the TTL shorter rather than building complex invalidation

---

### Cache Key Design

- Keys must be deterministic and unique for the data they represent
- Include all dimensions that affect the value:
  ```
  "user:{user_id}:profile"
  "product:{product_id}:price:currency:{currency}"
  "search:q:{query}:page:{page}:sort:{sort}"
  ```
- Namespace keys by service or domain to avoid collisions in shared caches: `payments:invoice:{id}`
- Do not use mutable values in cache keys (e.g., a username that can change)
- Keep keys short but readable — long keys waste memory and bandwidth

---

### Cache Stampede (Thundering Herd)

_…(truncated for prompt budget — full reference lives in the Engineering source)_
