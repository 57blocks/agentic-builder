---
id: async-queues
agent: backend
version: v1
description: "Async messaging: delivery guarantees, outbox pattern, idempotent consumers, DLQ, retries, backpressure"
priority: 50
excludes: []
trigger:
  type: composite
  prefilter:
    type: regex
    match: both
    any_of:
      - async queues
      - async
      - queues
  confirm:
    type: llm
    match: both
    prompt: "Decide whether this project needs the \"async-queues\" engineering skill. That skill applies when: Async messaging: delivery guarantees, outbox pattern, idempotent consumers, DLQ, retries, backpressure Answer YES only if the PRD/TRD clearly exhibits this need; quote the supporting line."
---

Language-agnostic reference for decoupling work with queues, handling delivery guarantees, and avoiding common async pitfalls.

---

## Decision Rules

### When to Use Async / a Queue

Use a queue when **any** of the following are true:
- The work does not need to be complete before the HTTP response is returned
- The work is slow and would block the request (sending email, resizing images, calling a slow third party)
- The producer and consumer need to scale independently
- You need to absorb traffic spikes without dropping work (queue acts as a buffer)
- The work must be retried on failure without the client knowing

Do not use a queue when:
- The caller needs the result immediately (use sync RPC instead)
- The system is simple and the added operational complexity is not justified
- You are trying to hide a slow synchronous operation that should actually be fixed

---

### Delivery Guarantees

Understand what your broker guarantees before designing your consumer:

| Guarantee          | Meaning                                               | Examples               |
|--------------------|-------------------------------------------------------|------------------------|
| At-most-once       | Message may be lost; never delivered twice            | UDP, fire-and-forget   |
| At-least-once      | Message will be delivered, but may be delivered twice | SQS, RabbitMQ, Kafka*  |
| Exactly-once       | Delivered exactly once                                | Rare; expensive to guarantee end-to-end |

**Default assumption: at-least-once.** Most production brokers (SQS, RabbitMQ, Kafka without transactions) provide at-least-once delivery. Design consumers to be idempotent.

Exactly-once is achievable within a single system (e.g., Kafka transactions + transactional DB write) but cannot be guaranteed across system boundaries. Do not design systems that require exactly-once from the broker alone.

---

### Producer Rules

**Publish after the DB commit, not inside the transaction:**
- If you publish inside a transaction and the transaction rolls back, the message is already out
- If you publish after the commit and the publish fails, the message is never sent (data loss)
- Solution: use the **transactional outbox pattern** for guaranteed publishing

**Transactional outbox pattern:**
1. Within the DB transaction, write the event to an `outbox` table alongside your business data
2. A separate process (poller or CDC) reads unpublished outbox rows and publishes them to the broker
3. Mark rows as published after successful delivery
```
BEGIN
  INSERT INTO orders (...) VALUES (...)
  INSERT INTO outbox (event_type, payload, published) VALUES ('order.created', {...}, false)
COMMIT
-- Outbox worker: SELECT * FROM outbox WHERE published = false
-- Publish to broker, then UPDATE outbox SET published = true WHERE id = ?
```
- Guarantees the event is published if and only if the DB transaction committed
- Outbox worker must handle duplicates (at-least-once publish); consumers must be idempotent

**Message schema:**
- Always include in the message: `event_id` (UUID), `event_type`, `occurred_at` (ISO 8601 UTC), `payload`
- `event_id` is used by consumers for deduplication
- Avoid embedding mutable data that may change between publish and consume — embed IDs and let consumers fetch current state if needed, or embed a snapshot clearly labeled as such

---

### Consumer Rules

**Acknowledge only after successful processing:**
- Acknowledge (ack) tells the broker the message was handled; the broker will not redeliver it
- Never ack before processing — if the consumer crashes mid-processing, the message is lost
- Never ack inside a try/catch that swallows errors — an error should result in a nack or no-ack

**Make consumers idempotent:**
- Assume every message may be delivered more than once
- Use the `event_id` to deduplicate: check a processed-events store before acting
- Or design the processing to be naturally idempotent (upserts, set-to-value operations)

**Deduplication store:**
```
if processed_events.contains(event_id):
    ack()
    return
process(message)
processed_events.insert(event_id, ttl=24h)
ack()
```
- Store can be Redis (`SET NX`) or a DB table with a unique constraint on `event_id`
- TTL should exceed the broker's redelivery window

**Concurrency:**
- Multiple consumer instances processing the same queue in parallel is normal and desirable
- Ensure processing is safe under concurrent execution — use DB locks or idempotency to prevent races
- Partition-based brokers (Kafka): messages with the same key go to the same partition and are processed in order within that partition; ordering is not guaranteed across partitions

**Poison messages (dead letter):**
- A message that always fails processing will be retried indefinitely and block the queue
- Configure a dead-letter queue (DLQ): after N failed attempts, move the message to the DLQ
- Monitor the DLQ — messages there require manual investigation
- Never silently discard failed messages

---

### Retry Strategy

- Retry transient failures (network errors, temporary DB unavailability, upstream 503)
- Do not retry permanent failures (invalid message schema, business rule violations) — send to DLQ immediately
- Use exponential backoff with jitter between retries:
  ```
  wait = min(base * 2^attempt, max_wait) + random(0, base)
  ```
- Set a max retry count before moving to DLQ — retrying indefinitely causes queue backup

Retry configuration to define explicitly:

_…(truncated for prompt budget — full reference lives in the Engineering source)_
