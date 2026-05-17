---
id: background-job-lifecycle
agent: task-breakdown
version: v1
description: Tasks implementing background jobs must include the full lifecycle (run_id, in-process fallback, clear-stale, logging, SSE-both-shapes, empty-as-success).
priority: 70
excludes: []
trigger:
  type: regex
  match: both
  any_of:
    - "background job"
    - "scheduled job"
    - "BullMQ"
    - "worker"
    - "ingestion pipeline"
    - "scoring cycle"
    - "feed aggregation"
    - "data ingestion"
    - "scheduled fetch"
---

# Background-job lifecycle deliverables (single-task bundle)

When a feature is implemented as a background job (queue, scheduler, worker,
ingestion pipeline — anything that runs outside a user request), the SAME
task description MUST include ALL of the following deliverables. Do NOT split
them across tasks — they are tightly coupled and break in surprising ways
when shipped piecemeal.

## Required deliverables (all 6 in one task)

1. **Explicit `run_id`** produced by the enqueue function and threaded through
   `worker → DB row → SSE / polling endpoint`. The worker MUST NOT call
   `randomUUID()` to overwrite it — that breaks UI correlation.

2. **In-process fallback** that runs the job synchronously when the queue
   backend (Redis/BullMQ) is unavailable. Gated by an env flag like
   `USE_REDIS_QUEUE`. Default = in-process so the demo works without Redis.

3. **`clearActiveRunsForUser(userId)`** helper invoked by the public refresh
   endpoint BEFORE starting a new run, so a crashed previous run never blocks
   the user with `ALREADY_RUNNING`.

4. **Structured file logging** at every step (start, external-call, success,
   fail, complete) at `<backend>/logs/<feature>.log`.

5. **SSE / status endpoint accepts BOTH run-id shapes**: UUID (DB-backed) AND
   `inproc:<scope>:<ts>` (memory-backed), without 5xx — typically via an
   `isUuid(runId)` branch. NEVER call `findByPk` on an `inproc:` id.

6. **Empty-as-success semantic**: when all upstream sources return 0 rows,
   the run completes with `status="completed"` + `item_count=0` (NOT
   `status="failed"`). Frontend treats empty as a valid empty state.

## Why this is one task, not six

Splitting these creates tight coupling across tasks → integration bugs at
merge time. Examples we've seen break in production:

- A task adds the SSE endpoint without the `inproc:` branch → Postgres throws
  `invalid input syntax for type uuid` on every fallback run.
- A task adds queueing without `clearActiveRunsForUser` → users get
  permanently stuck on `ALREADY_RUNNING`.
- A task implements the pipeline without empty-as-success → empty source
  results are surfaced to the UI as red errors.

The lifecycle contract is the boundary; the task is its owner.

## Pairs with: external-api-pipeline-split

If the background job also integrates 3+ external APIs, that orchestration
goes here. The external API CLIENTS go in a sibling task (see
`external-api-pipeline-split` skill).
