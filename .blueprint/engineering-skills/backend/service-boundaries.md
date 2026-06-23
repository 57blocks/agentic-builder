---
id: service-boundaries
agent: backend
version: v1
description: "Service boundaries: when to split, data ownership, sync vs async communication, sagas, resilience patterns"
priority: 50
excludes: []
trigger:
  type: composite
  prefilter:
    type: regex
    match: both
    any_of:
      - service boundaries
      - service
      - boundaries
  confirm:
    type: llm
    match: both
    prompt: "Decide whether this project needs the \"service-boundaries\" engineering skill. That skill applies when: Service boundaries: when to split, data ownership, sync vs async communication, sagas, resilience patterns Answer YES only if the PRD/TRD clearly exhibits this need; quote the supporting line."
---

Language-agnostic reference for deciding when to split services, where to draw boundaries, and how services should communicate.

---

## Decision Rules

### When to Split a Service

Start with a monolith. Split only when you have a concrete, observable problem that splitting solves.

**Valid reasons to split:**
- Independent deployment is required (different release cadences, different teams owning different parts)
- Independent scaling is required (one component is the bottleneck and cannot scale as part of the whole)
- A component has meaningfully different operational characteristics (CPU-bound ML inference vs. I/O-bound API)
- Regulatory or security isolation is required (PCI scope reduction, data residency)
- The monolith's build/test/deploy cycle has become the bottleneck for team productivity

**Invalid reasons to split:**
- "Microservices are best practice" — they are a tradeoff, not a default
- The monolith is slow — slow monoliths are usually a code or DB problem, not an architecture problem
- Team preference for the technology — this is a reason to isolate a library, not a service
- Perceived cleanliness — distributed systems are harder to operate, debug, and keep consistent than a well-structured monolith

Rule of thumb: **if you are not sure whether to split, don't.** The cost of a premature split is high (distributed transactions, network failures, operational overhead). The cost of splitting later, once boundaries are clear, is lower.

---

### Where to Draw the Boundary

A good service boundary:
- Maps to a **bounded context** — a coherent domain with its own language, models, and rules
- Has **high cohesion** — things that change together live together
- Has **low coupling** — the service can be deployed, tested, and changed without coordinating with other services
- Owns its **data** — the service is the single writer to its own DB; no other service writes to it directly
- Can be **described in one sentence** without using "and"

Warning signs of a bad boundary:
- Two services that must be deployed together — they are logically one service
- Chatty services that make many synchronous calls to each other on every request — boundary is wrong
- Shared DB tables between services — not a real boundary
- A service that is just a thin CRUD wrapper with no logic — premature split

**Domain-driven design (DDD) bounded contexts** are the most reliable heuristic for finding boundaries. Common examples:

| Bounded Context    | Owns                                              |
|--------------------|---------------------------------------------------|
| Identity           | Users, credentials, authentication                |
| Catalog            | Products, pricing, availability                   |
| Orders             | Order lifecycle, line items, status transitions   |
| Payments           | Charges, refunds, payment methods                 |
| Notifications      | Email, SMS, push delivery                         |
| Inventory          | Stock levels, reservations, fulfillment           |

---

### Communication: Sync vs. Async

**Use synchronous (request/response) when:**
- The caller needs the result to continue
- The operation is low-latency and the dependency is highly available
- The interaction is a query (read), not a command with side effects

**Use asynchronous (events/messages) when:**
- The caller does not need the result immediately
- The operation has side effects that should not block the caller (sending email, updating search index)
- You need to decouple the producer's availability from the consumer's
- The consumer needs to scale independently

**Avoid synchronous chains across many services:**
- `A → B → C → D` synchronously: latency compounds, availability compounds (`0.99^4 = 0.96`), a failure anywhere fails the whole chain
- Break long chains with async handoffs or redesign the boundary

Availability of a synchronous chain: `∏ availability_i`. Three 99.9% services chained = 99.7% combined.

---

### Data Ownership

**Each service owns its data exclusively:**
- No service reads directly from another service's DB
- No service writes to another service's DB
- Data needed from another service is obtained via API call or event

**Handling cross-service data needs:**

| Need                                     | Pattern                                      |
|------------------------------------------|----------------------------------------------|
| Read data owned by another service       | Synchronous API call or local read replica   |
| React to changes in another service      | Subscribe to events published by that service|
| Join data across services                | API composition at query time, or maintain a local denormalized copy updated via events |
| Transactions spanning services           | Saga pattern (see below)                     |

**Never share a DB between services.** Shared DBs create hidden coupling — schema changes in one service break another, and there is no clear ownership of the data.

---

### Distributed Transactions (Sagas)

ACID transactions do not span service boundaries. For operations that touch multiple services, use the **saga pattern**:

Two saga implementations:

**Choreography-based saga:**
- Each service publishes an event when its step completes
- Downstream services listen and execute their step
- Compensation events are published on failure to undo completed steps
- Decoupled; harder to follow the overall flow

**Orchestration-based saga:**
- A central orchestrator (coordinator service) calls each participant in sequence
- Orchestrator issues compensating calls on failure
- Easier to reason about the flow; orchestrator is a single point of failure

_…(truncated for prompt budget — full reference lives in the Engineering source)_
