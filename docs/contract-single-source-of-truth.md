# Contract integrity — single source of truth (design)

## The problem (root cause, evidenced)

The frontend and backend of generated apps disagree on API shapes even though a
"shared schema" exists. Three independent observations:

1. **Shapes are authored TWICE, by two different LLM passes.**
   - TRD agent → `.blueprint/shared-schema.ts` (typed entities + Request/Response).
   - `generateApiContracts` (supervisor) → `API_CONTRACTS.json`, which **re-authors**
     `requestSchema` / `responseSchema` as free strings (e.g.
     `"{ ok:true; data:{ user:{…}; token } }"`) from PRD+scaffold, independently.
   Two LLM passes inferring the same shape → they drift (`token` vs `accessToken`,
   `name` vs `displayName`, …).
2. **The "shared" schema is two physical copies that drift.** `shared-schema-distributor`
   copies the blueprint schema into `frontend/src/shared/schema.ts` and
   `backend/src/shared/schema.ts`. Copies are identical at write time, but any
   later edit/regeneration on one side desyncs them (observed in `music-school`:
   FE had `buyerName?` the BE copy lacked).
3. **The backend doesn't construct responses FROM the schema.** Of 46 controllers,
   ~0 import the shared schema; handlers do `ctx.body = <Sequelize row>` — the wire
   JSON is whatever the ORM serializes (snake_case columns, missing computed fields),
   not the schema Response type. TS types are compile-time + erased; the HTTP boundary
   is unchecked, so "types are shared" never forces "runtime JSON conforms".

Net: there are **three competing truths** for each shape — schema.ts, API_CONTRACTS.json,
and the backend's actual JSON — and nothing reconciles them.

## The principle

**One AUTHORED source of truth for API shapes (`schema.ts`). Everything else is
DERIVED from it or VALIDATED against it — never re-authored.** Enforce this at every
lifecycle stage: author → derive → decompose → implement → amend → verify.

`schema.ts` and `API_CONTRACTS.json` are NOT competing — they have distinct, non-overlapping jobs:
- `schema.ts` = **shapes** (entity types + per-endpoint Request/Response types) + a typed **endpoint↔type registry**. The single authored source.
- `API_CONTRACTS.json` = **routing/coverage metadata** (method, path, auth, prdJustification, prd-id) **+ references to schema type names** (`requestType`, `responseType`) — NOT inline shape strings. Ideally **generated from** `schema.ts`, for the JSON-driven gates.

## Lifecycle — what changes at each stage

### 1. Author (TRD) — schema.ts becomes the endpoint registry, not just types
TRD emits `shared-schema.ts` with, in addition to entity + Request/Response interfaces,
an explicit **endpoint registry** mapping each endpoint to its types, e.g.:
```ts
export const ENDPOINTS = {
  "POST /api/v1/auth/login": { request: "LoginRequest", response: "LoginResponse", auth: "public" },
  "GET  /api/v1/courses":    { request: null,           response: "CourseListResponse", auth: "required" },
  // …every endpoint in TRD §3.3
} as const;
```
This makes path↔type a first-class, single-authored fact. (TRD reviewer already checks
§6 covers every §3.3 endpoint with Request/Response interfaces — extend it to require the registry.)

### 2. Derive API_CONTRACTS.json — stop re-authoring shapes
`generateApiContracts` no longer free-authors `requestSchema`/`responseSchema`. It is
**derived from `schema.ts`'s `ENDPOINTS` registry**: emit `{ method, endpoint, auth,
requestType, responseType, prdJustification, id }`. (An LLM may still map endpoints→PRD
ids, but shapes come from the registry.) Derived ⇒ cannot drift from schema.ts.

### 3. Distribute — single source, asserted identical
`shared-schema-distributor` stays the only writer; after fan-out it **asserts every
distributed copy is byte-identical** to the blueprint source and records a hard signal
on mismatch. (Long term: a workspace-style single import path instead of copies.)

### 4. Decompose (task-breakdown) — tasks are derived from the registry
Each backend task = "implement endpoint X; it MUST return `<responseType>` and accept
`<requestType>` from schema.ts". Each frontend task = "page Y consumes `<types>`".
**Producer and consumer reference the SAME type name** → aligned by construction. The
relevant schema SLICE (only the types a task touches) is injected into the task context.
Coverage gate: every `ENDPOINTS` entry has a producing task AND its response type has a
consuming task.

### 5. Implement — backend constructs responses AS the schema type
Worker rule (prompt + scaffold helper): handlers MUST build the response as the schema
Response type, never `ctx.body = <Sequelize row>`. Provide a typed helper
`json<T>(ctx, body: T)` and a per‑resource serializer `toXResponse(model): XResponse`.
Declaring the handler's body type lets `tsc` catch model↔contract drift at build time.

### 6. Amend (schema-change protocol) — controlled, never silent
The schema is scaffold-protected (workers already told not to rewrite it). Add the
*controlled* path for "the contract is actually wrong":
- A worker that needs a schema change emits a structured **`schema-change-request`**
  (`.ralph/schema-change-requests.jsonl`: { type, field, reason, proposedChange, taskId })
  instead of editing its local copy.
- A **contract-owner arbiter** (the architect/TRD agent) validates each request against
  the PRD, applies accepted changes to the **single** blueprint `shared-schema.ts`,
  re-derives `API_CONTRACTS.json`, re-distributes (step 3), and **bumps a schema version**.
- Tasks that produce/consume the changed type are flagged **stale** and re-queued for
  verify. Changes are logged for drift detection.
- Batch amendments at a phase boundary (end of backend/contract phase, before frontend)
  so the contract doesn't mutate mid-frontend.

### 7. Verify — validate runtime responses against the schema
Smoke gate goes beyond "≠404": for key endpoints it asserts the **response shape matches
the schema** (presence/type of the declared `responseType` fields). Catches the
"types say X, JSON is Y" class deterministically. (A runtime validator can be generated
from `schema.ts`, or a lightweight field-presence check from `ENDPOINTS`.)

## What this fixes
- No dual authoring of shapes → no schema↔contract drift (stages 1–2).
- No copy drift (stage 3).
- Tasks anchored to one contract; producer/consumer share types (stage 4).
- Backend output actually conforms, checked at build + runtime (stages 5, 7).
- Contract can evolve safely without each worker forking it (stage 6).

## Implementation sequencing (risk-ordered)
- **P0 (deterministic, verifiable now):** (3) distributor byte-identical assertion;
  (7) smoke response-shape validation; a reconciliation check that flags
  `API_CONTRACTS.json` shapes not present in `schema.ts`.
- **P1 (generation-prompt changes, validate on a real run):** (1) TRD emits `ENDPOINTS`
  registry; (2) `generateApiContracts` derives from it (drop free-authored shape strings);
  (4) task-breakdown decomposes from the registry; (5) worker serializer rule + `json<T>` helper.
- **P2:** (6) schema-change-request protocol + arbiter + stale-task re-queue.

Each generation-prompt change is `tsc`-checkable but its OUTPUT quality needs one real
generation run to validate — roll out behind a flag and compare before/after on a sample PRD.

## Status (implemented this iteration)

- ✅ **P0① distributor byte-identical integrity** — `verifyDistributedSchemaIntact()`
  (`shared-schema-distributor.ts`, + tests); wired **blocking** into the coding-route gate.
- ✅ **P0③ contract↔schema reconciliation** — `reconcileContractWithSchema()`
  (`contract-reconcile.ts`, + tests); wired as a **warning** (records to
  `.ralph/unresolved-problems.jsonl`, category `contract-coverage`) — a missing type
  may be the legit `MISSING_FROM_SCHEMA` signal, so it's surfaced, not fatal.
- ✅ **P1① TRD `ENDPOINTS` registry** — `trd-agent.ts` §6 now requires
  `export const ENDPOINTS = {...} as const` (path↔type names, authored once).
- ✅ **P1② generateApiContracts DERIVES from the schema** — when
  `.blueprint/shared-schema.ts` contains an `ENDPOINTS` registry (P1①),
  `generateApiContracts` now parses it (`endpoints-registry.ts`, + 8 tests) and emits
  one contract record per entry — `{method, endpoint, auth, requestType, responseType}`
  — with NO LLM call. The LLM-from-PRD+scaffold path is now a FALLBACK, used only when a
  legacy schema has no registry. This removes the drift AND the `doc_truncated` risk (the
  registry is parsed from the full file, not a 12k-char prompt slice). The fallback prompt
  still requires `requestType`/`responseType` = exact schema names, no invented shapes.
  NOTE: derivation only triggers when the TRD actually authored the registry — a schema
  generated before P1① has none, so that run falls back to the LLM (this is why an
  in-flight project still logged "generating from PRD + scaffold"). Regenerate the TRD to
  get the registry + derivation.
- ✅ **P1④ backend constructs responses to the schema** — typed `json<T>()` / `created<T>()`
  helper added to m-tier + l-tier scaffolds (`backend/src/utils/respond.ts`); worker
  convention card (Koa) adds the HARD RULE: send via `json<ResponseType>(ctx, data)`,
  never `ctx.body = <Sequelize row>`, serialize via mappers.

### Remaining
- ✅ **P0② smoke response-shape validation** — DONE. New `schema-type-resolve.ts`
  (`indexSchemaTypes` / `resolveTypeRefToSchema`, recursive + depth/cycle-guarded, + 13
  tests) turns a named `responseType`/`requestType` into the same `SchemaNode` the data-gate
  validates against. Wired into `integration-data-gate.ts` via `nodeForSide()`: inline
  `*Schema` strings still win when present, else the named `*Type` is resolved from the
  shared schema — so shape validation keeps working after P1② removed inline shapes. Handles
  the `{ ok, data }` envelope ambiguity by validating both raw + unwrapped and reporting only
  if BOTH fail. Request-body synthesis (register/login + writes) uses the same resolution.
- ✅ **P2 schema-change protocol** — DONE.
  - Core (`schema-change-request.ts`, + 9 tests): append/read
    `.ralph/schema-change-requests.jsonl`, `pendingRequests()`, `staleTaskIds()`
    (word-boundary so `Course`≠`CourseList`), `acceptedChangedTypes()`, decisions log.
  - Worker convention card HARD RULE: on a genuinely-wrong schema, append ONE request line
    and build against the schema AS-IS — never fork the local copy.
  - **Arbiter NODE** (`schema_arbiter` in supervisor.ts, between `extract_real_contracts`
    and `fe_dispatch_gate`): no pending requests ⇒ instant no-op; otherwise reviews each
    request vs the PRD (LLM), applies accepted edits to the ONE `.blueprint/shared-schema.ts`,
    re-distributes via `distributeSharedSchema(tier, outputDir, {sourceDir: outputDir})` so
    FE/BE stay byte-identical, logs decisions, and records `staleTaskIds()` to
    unresolved-problems for the verify loop. Degrades to a logged warning on any failure;
    never blocks the pipeline.

### Validation caveat
P0①②③ + the P2 core are deterministic + unit-tested (49 tests across 5 files). What still
needs ONE real generation run to validate is the LLM-OUTPUT-dependent behavior:
- P1①②④ generation-prompt / scaffold changes — does `API_CONTRACTS.json` only reference
  schema type names? do handlers use `json<T>()` instead of dumping Sequelize rows?
- the P2 `schema_arbiter` node — does it fire only when requests exist, make sound
  accept/reject calls, and return a clean full-file `updatedSchema`?
Roll out behind a flag and compare before/after on a sample PRD.
