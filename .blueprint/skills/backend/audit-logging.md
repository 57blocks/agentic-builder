---
id: audit-logging
agent: backend
version: v1
description: "Audit logging: what to log, event schema, immutability, retention, actor propagation, append-only storage"
priority: 50
excludes: []
trigger:
  type: composite
  prefilter:
    type: regex
    match: both
    any_of:
      - audit logging
      - audit
      - logging
  confirm:
    type: llm
    match: both
    prompt: "Decide whether this project needs the \"audit-logging\" engineering skill. That skill applies when: Audit logging: what to log, event schema, immutability, retention, actor propagation, append-only storage Answer YES only if the PRD/TRD clearly exhibits this need; quote the supporting line."
---

Language-agnostic reference for recording who did what, when, and to which data — in a way that is trustworthy, queryable, and retained appropriately.

---

## Decision Rules

### What to Audit

Audit events where the answer to "who did this and when?" will matter:

**Always audit:**
- Authentication events: login (success and failure), logout, password change, MFA enrollment/removal
- Authorization failures: access denied to a resource
- Privilege changes: role assignments, permission grants/revocations
- Sensitive data access: viewing PII, financial records, medical data, credentials
- Mutations on sensitive resources: create, update, delete on users, accounts, payments, configuration
- Administrative actions: any action performed by an admin or service account on behalf of a user
- Data exports: any bulk data download or export

**Audit selectively (based on risk/compliance requirements):**
- High-volume read operations (can be sampled rather than fully logged)
- System-to-system calls in internal services

**Do not audit:**
- Health check endpoints
- Static asset requests
- High-volume low-sensitivity reads where the storage cost outweighs the value

---

### What Each Audit Event Must Contain

Every audit event is immutable after creation. Include enough context to reconstruct what happened without referencing mutable state.

| Field           | Description                                                      |
|-----------------|------------------------------------------------------------------|
| `event_id`      | Unique identifier for this event (UUID)                          |
| `occurred_at`   | Timestamp in UTC, ISO 8601, millisecond precision                |
| `actor_id`      | ID of the user, service account, or API key that performed the action |
| `actor_type`    | `user`, `service`, `api_key`, `system`                           |
| `action`        | What was done: verb + noun, e.g. `user.login`, `invoice.deleted`|
| `resource_type` | Type of resource acted on: `user`, `order`, `payment`, etc.     |
| `resource_id`   | ID of the specific resource                                      |
| `outcome`       | `success` or `failure`                                           |
| `ip_address`    | Client IP (for user-initiated actions)                           |
| `user_agent`    | Client user agent string (for user-initiated actions)            |
| `request_id`    | Correlates with application logs and traces                      |
| `changes`       | For mutations: what changed (before/after values or a diff)      |
| `reason`        | Human-readable description (optional but valuable for admin actions) |

**Before/after for mutations:**
- Record the previous and new values of changed fields
- Omit fields that did not change
- Redact sensitive field values (passwords, secrets) — record that they changed, not what they changed to

---

### Immutability

Audit logs must not be modifiable after creation:

- Append-only writes: no UPDATE or DELETE on audit records
- Separate storage with write-only access for the application: the app can INSERT but not UPDATE/DELETE
- Use DB-level constraints or a dedicated audit store that enforces append-only
- For high-assurance requirements: hash-chain records (each record includes a hash of the previous) to detect tampering
- Never allow audit records to be deleted as part of normal application cleanup — they have their own retention policy

---

### Storage and Retention

Audit logs grow indefinitely and must be retained according to policy:

- Define a retention period per event type based on compliance requirements:
  - Financial/payment events: often 7 years
  - Authentication events: often 1–2 years
  - General activity: often 90 days to 1 year
- Archive old records to cold storage (S3, Glacier) rather than deleting, especially for compliance-driven retention
- Index for the queries you will actually run: `actor_id + occurred_at`, `resource_type + resource_id + occurred_at`
- Do not store audit logs in the same table as application data — use a dedicated audit table or a separate audit DB
- Consider a dedicated append-only audit log service or a write-once object store for high-assurance requirements

---

### Separation from Application Logs

Audit logs and application logs are different:

| Property           | Application logs              | Audit logs                     |
|--------------------|-------------------------------|--------------------------------|
| Purpose            | Debugging, observability      | Accountability, compliance     |
| Audience           | Engineers                     | Security, compliance, legal    |
| Retention          | Short (days to weeks)         | Long (months to years)         |
| Mutability         | Rotated and deleted           | Append-only, never deleted     |
| Content            | Technical detail              | Business events with actor context|
| PII handling       | Minimize PII                  | May require PII (actor ID, IP) |

Do not rely on application log aggregators (Datadog, CloudWatch) as your audit log store — they are not append-only, have short retention, and are not queryable by business key.

---

### Generating Audit Events

**Generate audit events at the service layer, not the DB layer:**
- DB triggers capture data changes but lose actor context (who made the change)
- Service layer has full context: authenticated user, request ID, reason

**Centralize audit event emission:**
- Use a dedicated `audit()` function or middleware rather than ad-hoc logging throughout the codebase
- Missed audit events are a compliance gap — make auditing the default, not an opt-in

_…(truncated for prompt budget — full reference lives in the Engineering source)_
