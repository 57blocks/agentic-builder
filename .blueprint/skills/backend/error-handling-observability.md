---
id: error-handling-observability
agent: backend
version: v1
description: "Error handling and observability: structured logging, error classification, tracing, metrics, health checks, alerting"
priority: 50
excludes: []
trigger:
  type: composite
  prefilter:
    type: regex
    match: both
    any_of:
      - error handling observability
      - error
      - handling
      - observability
  confirm:
    type: llm
    match: both
    prompt: "Decide whether this project needs the \"error-handling-observability\" engineering skill. That skill applies when: Error handling and observability: structured logging, error classification, tracing, metrics, health checks, alerting Answer YES only if the PRD/TRD clearly exhibits this need; quote the supporting line."
---

Language-agnostic reference for making backend systems debuggable, alertable, and operationally transparent.

---

## Decision Rules

### Error Handling

**Classify errors before handling them:**

| Class              | Cause                             | Right response                          |
|--------------------|-----------------------------------|-----------------------------------------|
| Validation error   | Bad client input                  | 4xx, return details, do not log as error|
| Business rule error| Valid input, rejected by logic    | 4xx, return reason, do not log as error |
| Not found          | Resource does not exist           | 404, do not log as error                |
| Auth failure       | Missing/invalid credentials       | 401/403, log at info level              |
| Dependency failure | Upstream DB/service unavailable   | 503/502, log as error with context      |
| Programming error  | Bug, unexpected state             | 500, log as error with full context     |

Rules:
- Do not log 4xx errors as errors — they are client mistakes, not service failures. Logging them as errors pollutes on-call alerts.
- Do log 5xx errors as errors with full context — they are your service's fault.
- Never swallow errors silently (`catch (e) {}`). Either handle, log, or propagate — never discard.
- Propagate errors up to a single top-level handler that formats the response. Avoid scattered `try/catch` that each format their own error responses.
- Include the original error as cause/context when wrapping: `throw new ServiceError("payment failed", { cause: originalError })`

**Fail fast on unrecoverable errors:**
- If a required config value is missing at startup, crash immediately with a clear message
- Do not let the service start in a broken state and fail silently on every request

**Distinguish retryable from non-retryable errors:**
- Retryable: network timeouts, 503, 429, DB connection failures
- Non-retryable: 400, 404, 422, auth failures, constraint violations
- Always communicate retryability to callers (via status code, error code, or `Retry-After` header)

### Structured Logging

Log as machine-parseable structured data (JSON), not free-form strings.

Every log entry must include:

| Field        | Purpose                                              |
|--------------|------------------------------------------------------|
| `timestamp`  | ISO 8601 UTC                                         |
| `level`      | `debug`, `info`, `warn`, `error`                     |
| `message`    | Static string describing the event (not interpolated)|
| `service`    | Service/application name                             |
| `trace_id`   | Correlation ID for the current request/operation     |

Add to every log entry when available:
- `request_id` — unique ID for the HTTP request
- `user_id` — ID of the authenticated user
- `duration_ms` — for request/operation completion logs
- `error` — structured error object (message + stack) for error-level logs

**Log message rules:**
- Message is a static string: `"payment processing failed"` not `"payment ${id} failed for user ${userId}"`
- Variable data goes in structured fields, not the message — this allows log aggregators to group by message
- Do not log sensitive data: passwords, tokens, full credit card numbers, PII beyond an ID

**Log levels:**
- `debug` — detailed diagnostic info, off in production by default
- `info` — normal operation events worth recording (request received, job completed)
- `warn` — unexpected but recoverable situations (retry succeeded, fallback used, config missing with default applied)
- `error` — failures requiring attention (unhandled exception, dependency down, data corruption)

Do not use `error` for expected failure paths. Do not use `warn` as a softer `error`.

### Request Tracing

Assign every inbound request a unique `trace_id` (UUID or W3C TraceContext format):
- Generate at the edge/gateway if not present in the incoming request
- Propagate via request headers to all downstream calls: `X-Trace-Id` or `traceparent` (W3C standard)
- Include `trace_id` in every log entry and every error response

This allows reconstructing the full call chain across services for any single request.

### Metrics

Instrument these at minimum for every service:

| Metric                       | Type      | Purpose                                  |
|------------------------------|-----------|------------------------------------------|
| Request rate                 | Counter   | Traffic volume                           |
| Error rate (4xx, 5xx)        | Counter   | Error budget / SLO tracking              |
| Request latency (p50/p95/p99)| Histogram | Tail latency detection                   |
| In-flight requests           | Gauge     | Saturation / backpressure detection      |
| Dependency call latency      | Histogram | Identify slow upstream dependencies      |
| Dependency error rate        | Counter   | Upstream health                          |

Additional metrics by resource type:
- DB: connection pool utilization, query latency, slow query count
- Queue: queue depth, consumer lag, processing latency
- Cache: hit rate, miss rate, eviction rate

**Metric naming conventions:**
- Use dots or underscores consistently: `http.request.duration` or `http_request_duration_seconds`
- Include units in the name: `_seconds`, `_bytes`, `_total`
- Use labels/tags for dimensions: `method`, `path`, `status_code`, `service`
- Do not use high-cardinality values (user IDs, request IDs) as metric labels — it creates unbounded series

### Health Checks

Expose at minimum two endpoints:

**Liveness** (`GET /healthz` or `/health/live`):
- Returns 200 if the process is alive and should not be killed
- Should never check dependencies — only that the process itself is running
- If this fails, the orchestrator restarts the container

_…(truncated for prompt budget — full reference lives in the Engineering source)_
