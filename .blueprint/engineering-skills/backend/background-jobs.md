---
id: background-jobs
agent: backend
version: v1
description: "Background jobs and scheduling: idempotency, retries, cron locking, zombie detection, observability"
priority: 50
excludes: []
trigger:
  type: composite
  prefilter:
    type: regex
    match: both
    any_of:
      - background jobs
      - background
      - jobs
  confirm:
    type: llm
    match: both
    prompt: "Decide whether this project needs the \"background-jobs\" engineering skill. That skill applies when: Background jobs and scheduling: idempotency, retries, cron locking, zombie detection, observability Answer YES only if the PRD/TRD clearly exhibits this need; quote the supporting line."
---

Language-agnostic reference for running deferred work, periodic tasks, and long-running jobs reliably.

---

## Decision Rules

### When to Use a Background Job

Use a background job when:
- The work does not need to complete before the HTTP response is returned
- The work is slow enough to hurt request latency (> ~200ms as a rule of thumb)
- The work must be retried independently of the original request
- The work is triggered on a schedule rather than a user action

Do not use a background job when:
- The result is needed immediately by the caller (use sync processing)
- The work is trivial and adding a job queue introduces unnecessary complexity

---

### Job Queue vs. Cron Scheduler

| Trigger         | Use                              | Examples                          |
|-----------------|----------------------------------|-----------------------------------|
| Event-driven    | Job queue (enqueued on demand)   | Send email, process upload, charge card |
| Time-driven     | Cron / scheduler                 | Daily report, hourly sync, cleanup old records |

Many systems need both. A common pattern: the scheduler enqueues a job at the scheduled time; the job queue processes it. This separates scheduling concerns from execution concerns and gives you retries, observability, and concurrency control for free.

---

### Job Design

**Jobs must be idempotent:**
- Jobs are retried on failure — a job that runs twice must produce the same outcome as running once
- Use a job ID or a stable business key to detect and skip duplicate execution
- Design operations as upserts, set-to-value, or check-before-act rather than append-always

**Jobs must be atomic or resumable:**
- If a job does multiple things and crashes halfway, it will be retried from the beginning
- Either wrap all operations in a transaction (if all in one DB), or make each step idempotent so re-running completed steps is safe
- For long multi-step jobs, checkpoint progress so a retry can resume rather than restart

**Keep jobs small and focused:**
- A job that does one thing is easier to retry, monitor, and debug
- Fan out: one "trigger" job enqueues many smaller jobs rather than doing all the work itself
- Large bulk jobs should chunk their work: process N records, enqueue the next chunk

**Do not do network I/O inside a DB transaction in a job** — same rule as in request handlers. See [db-access-patterns](../db-access-patterns/README.md).

---

### Preventing Duplicate Job Execution

For event-driven jobs, at-least-once delivery means a job may be enqueued or executed more than once.

For scheduled jobs, multiple instances of a scheduler can fire the same cron simultaneously.

**Strategies:**

**Unique job constraint:**
- Enforce uniqueness in the job queue: if a job with the same key is already enqueued or running, reject the duplicate
- Most job frameworks support unique jobs by key (Sidekiq unique jobs, BullMQ deduplication, etc.)

**DB-level locking (for cron jobs):**
- Use an advisory lock or a `cron_locks` table: only the instance that acquires the lock runs the job
  ```sql
  INSERT INTO cron_locks (job_name, locked_at)
  VALUES ('daily_report', now())
  ON CONFLICT (job_name) DO NOTHING
  RETURNING *
  -- If no row returned, another instance already has the lock; skip
  ```
- Release the lock after the job completes or after a TTL (in case the worker crashes)

**Idempotency as the safety net:**
- Even with deduplication, idempotent job logic is the final guarantee — deduplication is best-effort

---

### Retries and Failure Handling

- Retry transient failures (network errors, temporary DB unavailability) with exponential backoff and jitter
- Do not retry permanent failures (invalid data, business rule violation) — move to a dead-letter queue or failed jobs table immediately
- Set a max retry count; jobs that exhaust retries should be visible and alertable, not silently discarded
- Store failed jobs with the error, stack trace, and all arguments — you must be able to inspect and manually retry them

Retry configuration to set explicitly:

| Setting         | Purpose                                              |
|-----------------|------------------------------------------------------|
| `max_attempts`  | How many times to try before marking as failed       |
| `initial_delay` | Wait before first retry                              |
| `backoff`       | Exponential or linear; always add jitter             |
| `max_delay`     | Cap on retry wait time                               |
| `timeout`       | Max execution time per attempt before it is killed   |

**Job timeout:**
- Every job must have a maximum execution time
- A job stuck forever holds a worker thread and does not get retried
- If a job exceeds its timeout, kill it and retry as a transient failure

---

### Stuck and Zombie Jobs

A job that is "in progress" but the worker died is a zombie — it will never complete or fail.

Prevention:
- Set a job visibility timeout / heartbeat TTL: if the worker does not heartbeat within the TTL, the job is requeued
- Worker sends a heartbeat (extends the lock) at regular intervals during long jobs
- Set the heartbeat interval to well under the TTL (e.g., heartbeat every 30s with a 90s TTL)

Detection:
- Alert on jobs stuck in "running" state for longer than their expected max duration
- Run a periodic cleanup that requeues jobs whose heartbeat has expired

---

### Concurrency and Throughput

- Run multiple worker processes/threads to parallelize job execution
- Use separate queues for different job classes to prevent one class from starving others:
  - Critical queue: payment processing, user-facing operations (small pool, fast workers)
  - Default queue: general background work
  - Bulk queue: large batch jobs (limited concurrency to avoid starving other queues)
- Set per-queue concurrency limits that reflect the DB and downstream capacity — more workers is not always better

_…(truncated for prompt budget — full reference lives in the Engineering source)_
