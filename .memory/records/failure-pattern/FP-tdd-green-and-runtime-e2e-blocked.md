---
{"id":"FP-tdd-green-and-runtime-e2e-blocked","layer":"L1","kind":"failure-pattern","title":"TDD never goes all-green and runtime/E2E never execute — two distinct layer bugs","tags":["manual:approved","stage:coding","stage:tdd","stage:runtime-verify","stage:e2e","category:test-execution","topic:tdd","topic:runtime","ext:ts"],"source":"manual","refs":{"evidence":"generated-code/.ralph/tdd-evidence.jsonl","smoke":"generated-code/.ralph/runtime-smoke.json"},"createdAt":1780305506555,"updatedAt":1780305506555,"schemaVersion":1}
---

# coding — TDD can't go all-green AND runtime/E2E never really run

Two SEPARATE problems at two layers (do not conflate them).

## Layer 1 — TDD green blocked by runtime-class tests in the mock phase
TDD is meant to be **mock-based** at the red/green phase; real interface tests
belong to the runtime stage. But the test manifest mixes test types and the
green-phase executor runs the runtime-class ones without a live backend:
- test-manifest types observed: route-smoke ×17, runtime-smoke ×7,
  api-contract ×9, frontend-service ×1.
- `runtime-smoke` (e.g. `backend/tests/models/user.test.ts`) connects to a real
  Postgres; `api-contract` (e.g. `auth.routes.test.ts` doing
  `fetch("http://localhost:4000/...")`, NO mock) hits a live server.
- Run in the mock red/green phase with no backend up → ECONNREFUSED ::1:4000 /
  pg connect errors → these tests can NEVER go green no matter the
  implementation. Evidence: 46 tests, only 26 ever green, 20 never; green-phase
  pass 4074 / fail 9252 (futile retry churn).
- Separate test-writer defect: 67/100 RED attempts "passed before
  implementation" → invalid RED (vacuous tests). Some frontend tests assert
  hardcoded hex classes (brittle; ties to [[FP-frontend-task-fanout-breaks-styling]]).

**Fix direction (another agent is already changing this):** keep route-smoke /
runtime-smoke / api-contract tests OUT of the mock TDD red/green loop — run only
mock-able unit tests there, and defer real-interface tests to the runtime gate
(which boots backend + DB). Also fix RED validity so tests fail without impl.

## Layer 2 — runtime/E2E never execute
The runtime/integration/E2E gates run AFTER coding completes; they are skipped
when a run doesn't finish.
- 7/7 sessions were aborted or failed (grades 32–60). e.g. 2026-05-18 aborted
  with 10 tasks never reaching a final status → integrationVerify / runtimeVerify
  / e2eVerify / featureAudit all `skipped`.
- The one time runtime-smoke DID run (2026-05-28) it died instantly:
  `bootFailed: backend_did_not_start`, Postgres `28P01 auth_failed`.
- E2E: only triage attempts (2026-05-06..05-12), never a passing run — no live
  app to drive.

**Root cause of the boot failure:** the DB credentials the pipeline hands the
generated app don't exist in the target Postgres. Tested live:
- backend/.env → `app:app@postgres:5432/app` → 28P01 ❌
- BLUEPRINT_GENERATED_DATABASE_URL → `blueprint:p@ssword@127.0.0.1/tasks_dev` → 28P01 ❌
- only `tasks_user:tasks_password` exists ✅ (and only the root generated-code/.env had it).
runtime-smoke-gate boots with NODE_ENV=production so the injected DATABASE_URL
wins over backend/.env — but the injected URL itself is the bad `blueprint` one.

**Fix direction:** make the injected DATABASE_URL point to a role that exists in
the target Postgres (create `blueprint`/`app`, or set
BLUEPRINT_GENERATED_DATABASE_URL + backend/.env to the working `tasks_user`
creds). Until the backend boots, runtime tests and E2E can never produce real
results.

## Why: user asked why TDD isn't all-green and runtime/E2E seem to never run.
## How to apply: when triaging "tests not green" / "no runtime/E2E", separate the
two layers — a mock-phase failure on a route/runtime/api test is a test-LAYERING
bug; a runtime/E2E no-show is either an aborted run or a backend-boot/DB-cred
failure. Check runtime-smoke.json bootFailed + the injected DATABASE_URL role first.
