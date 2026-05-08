# Coding Session Report

- Session ID: `77db6cd6-d801-4b91-9526-4092d5c61532`
- Status: **FAIL**
- Score: **40/100 (F)**
- Runtime readiness: 1 finding(s) — 0 error, 1 warn
- Started at: 2026-05-07T06:25:21.854Z
- Ended at: 2026-05-07T08:18:05.938Z
- Generator git: `6bdc20b`
- Scaffold fix attempts: 50
- Integration fix attempts: 34
- Total LLM calls: 274
- Total LLM tokens: 6484800
- Total LLM cost: $3.4047
- Generated/known files in registry: 212

## Summary
Timeout/terminated: Integration verify gate failed.
IntegrationVerifyFix stalled without making code changes.
No mutation for 10 consecutive iteration(s).
Dynamic stagnation threshold reached: abortAt=10, progressScore=0/6.
Last meaningful progress: iteration 24 (validation progress (scoped_validation:backend_smoke)).
Pre-abort batch-classify fallback was injected and exhausted; no recovery.

Final scoped validation gates failed:

frontend_tsc: pass

frontend_build: pass

backend_smoke: pass

backend_tsc failed:
src/api/modules/spri/spri.controller.ts(78,46): error TS2345: Argument of type 'number' is not assignable to parameter of type '"1H" | "6H" | "24H" | "7D"'.
src/api/modules/spri/spri.controller.ts(115,36): error TS2554: Expected 0-1 arguments, but got 2.
src/api/modules/spri/spri.service.ts(149,3): error TS2322: Type '{ stablecoinId: number & { [CreationAttributeBrand]?: true; }; symbol: string; name: string; compositeScore: number; riskLevel: RiskLevel; dimensionScores: DimensionScores; timestamp: string; }[]' is not assignable to type 'CurrentScoreData[]'.
  Property 'dimensions' is missing in type '{ stablecoinId: number & { [CreationAttributeBrand]?: true; }; symbol: string; name: string; compositeScore: number; riskLevel: RiskLevel; dimensionScores: DimensionScores; timestamp: string; }' but required in type 'CurrentScoreData'.
src/api/modules/spri/spri.service.ts(163,9): error TS2353: Object literal may only specify known properties, and 'name' does not exist in type 'CurrentScoreData'.
src/api/modules/spri/spri.service.ts(170,23): error TS2677: A type predicate's type must be assignable to its parameter's type.
  Type 'CurrentScoreData' is missing the following properties from type '{ stablecoinId: number & { [CreationAttributeBrand]?: true; }; symbol: string; name: string; compositeScore: number; riskLevel: RiskLevel; dimensionScores: DimensionScores; timestamp: string; }': name, dimensionScores
src/api/modules/spri/spri.service.ts(201,5): error TS2353: Object literal may only specify known properties, and 'name' does not exist in type 'CurrentScoreData'.
src/api/modules/spri/spri.service.ts(271,3): error TS2322: Type '{ timestamp: string; compositeScore: number; riskLevel: RiskLevel; }[]' is not assignable to type 'HistoricalScoreDataPoint[]'.
  Property 'dimensions' is missing in type '{ timestamp: string; compositeScore: number; riskLevel: RiskLevel; }' but required in type 'HistoricalScoreDataPoint'.
src/api/modules/spri/spri.service.ts(306,37): error TS

Runtime smoke gate failed:

Backend did not start — see .ralph/runtime-smoke.json `evidence` field.

E2E verify gate failed.
E2E has failures but none are deterministic — auto-repair skipped.

triage: 0 deterministic, 0 flaky, 0 infra (0 self-healed on retry)

See .ralph/e2e-triage.md for the full report.



2m  [90m    at Socket.emit (node:events:518:28)[39m
[2m[WebServer] [22m  [90m    at addChunk (node:internal/streams/readable:561:12)[39m
[2m[WebServer] [22m  [90m    at readableAddChunkPushByteMode (node:internal/streams/readable:512:3)[39m
[2m[WebServer] [22m  [90m    at Readable.push (node:internal/streams/readable:392:5)[39m
[2m[WebServer] [22m  [90m    at TCP.onStreamRead (node:internal/stream_base_commons:189:23)[39m {
[2m[WebServer] [22m    length: [33m198[39m,
[2m[WebServer] [22m    severity: [32m'ERROR'[39m,
[2m[WebServer] [22m    code: [32m'0A000'[39m,
[2m[WebServer] [22m    detail: [90mundefined[39m,
[2m[WebServer] [22m    hint: [32m'The extension must first be installed on the system where PostgreSQL is running.'[39m,
[2m[WebServer] [22m    position: [90mundefined[39m,
[2m[WebServer] [22m    internalPosition: [90mundefined[39m,
[2m[WebServer] [22m    internalQuery: [90mundefined[39m,
[2m[WebServer] [22m    where: [90mundefined[39m,
[2m[WebServer] [22m    schema: [90mundefined[39m,
[2m[WebServer] [22m    table: [90mundefined[39m,
[2m[WebServer] [22m    column: [90mundefined[39m,
[2m[WebServer] [22m    dataType: [90mundefined[39m,
[2m[WebServer] [22m    constraint: [90mundefined[39m,
[2m[WebServer] [22m    file: [32m'extension.c'[39m,
[2m[WebServer] [22m    line: [32m'673'[39m,
[2m[WebServer] [22m    routine: [32m'parse_extension_control_file'[39m,
[2m[WebServer] [22m    sql: [32m'CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;'[39m,
[2m[WebServer] [22m    parameters: [90mundefined[39m
[2m[WebServer] [22m  },
[2m[WebServer] [22m  sql: [32m'CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;'[39m,
[2m[WebServer] [22m  parameters: {}
[2m[WebServer] [22m}
[2m[WebServer] [22m
[2m[WebServer] [22mNode.js v22.16.0

Error: Timed out waiting 120000ms from config.webServer.

[1A[2K[41m[30m ELIFECYCLE [39m[49m [31mCommand failed with exit code 1.[39m

## Runtime Readiness
Static §4.2/§4.3/§4.4/§4.5/§4.7 audit of generated source. Findings here mean known runtime pitfalls slipped past the verify-fix worker. Full report: `.ralph/runtime-integration-audit.json`.

**1 finding(s)** — 0 error, 1 warn.

| Rule | Severity | Locations |
| --- | --- | --- |
| `bg-job-clear-stale-runs` | WARN | backend/src/api/modules/spri/spri.routes.ts:42 |

**Disabled rules:**
- `external-id-vs-db-pk` — no auth-* optional scaffold applied — no external user id to resolve.
- `llm-client-abstraction` — no LLM_* bundle declared on resource requirements — abstraction rule N/A.

## Task Outcome
- Completed: 11
- Completed with warnings: 0
- Failed: 0
- Unknown: 0

## Scoring Breakdown

**Formula:** `100 − 20(fail) − 10(integration) − 20(e2e:blocking errors) − 4(trunc:2) − 6(plan-unfulfilled:3) = 40`

| Rule | Max deduction | Applied | Reason |
| --- | --- | --- | --- |
| Run status fail | −20 | **-20** ❌ | status=fail |
| Run status aborted | −30 | 0 (not triggered) | status=aborted |
| Integration gate | −10 | **-10** ❌ | integration errors present |
| Runtime gate | −8 | 0 (not triggered) | runtime errors present |
| E2E gate | −20 | **-20** ❌ | e2e errors present (scales with fail ratio) |
| Uncovered requirements | −25 | 0 (not triggered) | PRD requirement ids unresolved |
| Failed tasks | −15 | 0 (not triggered) | coding tasks status=failed |
| Unknown tasks | −10 | 0 (not triggered) | coding tasks status=unknown |
| Context truncation | −8 | **-4** ❌ | doc_truncated events |
| Plan mismatches | −8 | **-6** ❌ | task_plan_unfulfilled events |
| All tasks done bonus | +5 | 0 (not triggered) | all tasks complete + no blocking gates |

## Model Usage
- `openai/gpt-5.3-codex-20260224`: calls=138, cost=$3.4047, tokens=1735846, stages=worker_codefix:Architect, worker_codefix:Test Engineer, worker_codefix:Backend Dev, phase_verify_fix, extract_real_contracts, integration_verify_fix
- `deepseek-v4-pro`: calls=135, cost=$0.0000, tokens=4740034, stages=worker_codegen:Architect, worker_codegen:Backend Dev, worker_codegen:Test Engineer, worker_codegen:Frontend Dev
- `anthropic/claude-4-sonnet-20250522`: calls=1, cost=$0.0000, tokens=8920, stages=generate_api_contracts

## Stage Diagnostics
- `architect-triage`: duration=0s, calls=0, tokens=0 (prompt=0, completion=0), cost=$0.0000, score=100/100 (A), models=(none)
  notes=No strong negative signal captured.
- `worker_codegen`: duration=100m 2s, calls=135, tokens=4740034 (prompt=4574921, completion=165113), cost=$0.0000, score=100/100 (A), models=deepseek-v4-pro
  labels=Architect, Backend Dev, Test Engineer, Frontend Dev
  notes=No strong negative signal captured.
- `worker-verify`: duration=57m 0s, calls=0, tokens=0 (prompt=0, completion=0), cost=$0.0000, score=76/100 (C), models=(none)
  notes=Task/file plan mismatches happened 3 time(s).
- `worker_codefix`: duration=57m 22s, calls=3, tokens=15387 (prompt=12559, completion=2828), cost=$0.0616, score=100/100 (A), models=openai/gpt-5.3-codex-20260224
  labels=Architect, Test Engineer, Backend Dev
  notes=No strong negative signal captured.
- `task`: duration=95m 28s, calls=0, tokens=0 (prompt=0, completion=0), cost=$0.0000, score=100/100 (A), models=(none)
  notes=No strong negative signal captured.
- `worker-context`: duration=99m 5s, calls=0, tokens=0 (prompt=0, completion=0), cost=$0.0000, score=88/100 (B), models=(none)
  notes=Context was truncated 2 time(s).
- `generate_api_contracts`: duration=0s, calls=1, tokens=8920 (prompt=7277, completion=1643), cost=$0.0000, score=100/100 (A), models=anthropic/claude-4-sonnet-20250522
  notes=No strong negative signal captured.
- `preflight-contract-completeness`: duration=98m 42s, calls=0, tokens=0 (prompt=0, completion=0), cost=$0.0000, score=100/100 (A), models=(none)
  notes=No strong negative signal captured.
- `preflight-convention-fix`: duration=38m 6s, calls=0, tokens=0 (prompt=0, completion=0), cost=$0.0000, score=100/100 (A), models=(none)
  notes=No strong negative signal captured.
- `phase_verify_fix`: duration=41m 33s, calls=100, tokens=1225991 (prompt=1210194, completion=15797), cost=$2.3390, score=90/100 (A), models=openai/gpt-5.3-codex-20260224
  notes=Earlier phase verify/fix did not fully prevent later integration failures.
- `extract_real_contracts`: duration=0s, calls=1, tokens=9441 (prompt=7292, completion=2149), cost=$0.0428, score=100/100 (A), models=openai/gpt-5.3-codex-20260224
  notes=No strong negative signal captured.
- `preflight-route-audit`: duration=2s, calls=0, tokens=0 (prompt=0, completion=0), cost=$0.0000, score=100/100 (A), models=(none)
  notes=No strong negative signal captured.
- `integration_verify_fix`: duration=4m 12s, calls=34, tokens=485027 (prompt=475841, completion=9186), cost=$0.9613, score=72/100 (C), models=openai/gpt-5.3-codex-20260224
  notes=Stage ended with blocking integration errors.
- `integration-gate`: duration=4m 41s, calls=0, tokens=0 (prompt=0, completion=0), cost=$0.0000, score=64/100 (D), models=(none)
  notes=Stagnation warnings triggered 10 time(s).

## Model Effectiveness
- `deepseek-v4-pro`: score=100/100 (A), calls=135, tokens=4740034, cost=$0.0000, stages=worker_codegen
  notes=No strong negative signal captured.
- `openai/gpt-5.3-codex-20260224`: score=85.1/100 (B), calls=138, tokens=1735846, cost=$3.4047, stages=worker_codefix, phase_verify_fix, extract_real_contracts, integration_verify_fix
  notes=Earlier phase verify/fix did not fully prevent later integration failures. | Stage ended with blocking integration errors.
- `anthropic/claude-4-sonnet-20250522`: score=100/100 (A), calls=1, tokens=8920, cost=$0.0000, stages=generate_api_contracts
  notes=No strong negative signal captured.

## Quality Gates
- Integration verify: FAIL (continued)
- Runtime verify: SKIPPED
- E2E verify: FAIL
- Feature audit: PASS

### Integration Errors
```
IntegrationVerifyFix stalled without making code changes.
No mutation for 10 consecutive iteration(s).
Dynamic stagnation threshold reached: abortAt=10, progressScore=0/6.
Last meaningful progress: iteration 24 (validation progress (scoped_validation:backend_smoke)).
Pre-abort batch-classify fallback was injected and exhausted; no recovery.

Final scoped validation gates failed:

frontend_tsc: pass

frontend_build: pass

backend_smoke: pass

backend_tsc failed:
src/api/modules/spri/spri.controller.ts(78,46): error TS2345: Argument of type 'number' is not assignable to parameter of type '"1H" | "6H" | "24H" | "7D"'.
src/api/modules/spri/spri.controller.ts(115,36): error TS2554: Expected 0-1 arguments, but got 2.
src/api/modules/spri/spri.service.ts(149,3): error TS2322: Type '{ stablecoinId: number & { [CreationAttributeBrand]?: true; }; symbol: string; name: string; compositeScore: number; riskLevel: RiskLevel; dimensionScores: DimensionScores; timestamp: string; }[]' is not assignable to type 'CurrentScoreData[]'.
  Property 'dimensions' is missing in type '{ stablecoinId: number & { [CreationAttributeBrand]?: true; }; symbol: string; name: string; compositeScore: number; riskLevel: RiskLevel; dimensionScores: DimensionScores; timestamp: string; }' but required in type 'CurrentScoreData'.
src/api/modules/spri/spri.service.ts(163,9): error TS2353: Object literal may only specify known properties, and 'name' does not exist in type 'CurrentScoreData'.
src/api/modules/spri/spri.service.ts(170,23): error TS2677: A type predicate's type must be assignable to its parameter's type.
  Type 'CurrentScoreData' is missing the following properties from type '{ stablecoinId: number & { [CreationAttributeBrand]?: true; }; symbol: string; name: string; compositeScore: number; riskLevel: RiskLevel; dimensionScores: DimensionScores; timestamp: string; }': name, dimensionScores
src/api/modules/spri/spri.service.ts(201,5): error TS2353: Object literal may only specify known properties, and 'name' does not exist in type 'CurrentScoreData'.
src/api/modules/spri/spri.service.ts(271,3): error TS2322: Type '{ timestamp: string; compositeScore: number; riskLevel: RiskLevel; }[]' is not assignable to type 'HistoricalScoreDataPoint[]'.
  Property 'dimensions' is missing in type '{ timestamp: string; compositeScore: number; riskLevel: RiskLevel; }' but required in type 'HistoricalScoreDataPoint'.
src/api/modules/spri/spri.service.ts(306,37): error TS

Runtime smoke gate failed:

Backend did not start — see .ralph/runtime-smoke.json `evidence` field.
```

### E2E Verify Errors
```
E2E has failures but none are deterministic — auto-repair skipped.

triage: 0 deterministic, 0 flaky, 0 infra (0 self-healed on retry)

See .ralph/e2e-triage.md for the full report.



2m  [90m    at Socket.emit (node:events:518:28)[39m
[2m[WebServer] [22m  [90m    at addChunk (node:internal/streams/readable:561:12)[39m
[2m[WebServer] [22m  [90m    at readableAddChunkPushByteMode (node:internal/streams/readable:512:3)[39m
[2m[WebServer] [22m  [90m    at Readable.push (node:internal/streams/readable:392:5)[39m
[2m[WebServer] [22m  [90m    at TCP.onStreamRead (node:internal/stream_base_commons:189:23)[39m {
[2m[WebServer] [22m    length: [33m198[39m,
[2m[WebServer] [22m    severity: [32m'ERROR'[39m,
[2m[WebServer] [22m    code: [32m'0A000'[39m,
[2m[WebServer] [22m    detail: [90mundefined[39m,
[2m[WebServer] [22m    hint: [32m'The extension must first be installed on the system where PostgreSQL is running.'[39m,
[2m[WebServer] [22m    position: [90mundefined[39m,
[2m[WebServer] [22m    internalPosition: [90mundefined[39m,
[2m[WebServer] [22m    internalQuery: [90mundefined[39m,
[2m[WebServer] [22m    where: [90mundefined[39m,
[2m[WebServer] [22m    schema: [90mundefined[39m,
[2m[WebServer] [22m    table: [90mundefined[39m,
[2m[WebServer] [22m    column: [90mundefined[39m,
[2m[WebServer] [22m    dataType: [90mundefined[39m,
[2m[WebServer] [22m    constraint: [90mundefined[39m,
[2m[WebServer] [22m    file: [32m'extension.c'[39m,
[2m[WebServer] [22m    line: [32m'673'[39m,
[2m[WebServer] [22m    routine: [32m'parse_extension_control_file'[39m,
[2m[WebServer] [22m    sql: [32m'CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;'[39m,
[2m[WebServer] [22m    parameters: [90mundefined[39m
[2m[WebServer] [22m  },
[2m[WebServer] [22m  sql: [32m'CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;'[39m,
[2m[WebServer] [22m  parameters: {}
[2m[WebServer] [22m}
[2m[WebServer] [22m
[2m[WebServer] [22mNode.js v22.16.0

Error: Timed out waiting 120000ms from config.webServer.

[1A[2K[41m[30m ELIFECYCLE [39m[49m [31mCommand failed with exit code 1.[39m
```

## Feature Audit
- All hard requirement ids are covered.

## Preflight Automation Ledger
### Convention auto-fix
- Invocations: 2 | files rewritten: 7 | unfixable conflicts: 0
  - Renamed residual file "frontend/src/context/AuthContext.tsx" → canonical "frontend/src/contexts/AuthContext.tsx".
  -   ↳ rewrote import paths in 3 file(s) to track the rename.
  - Renamed residual directory "backend/src/middlewares/" → canonical "backend/src/middleware/".
  -   ↳ rewrote import paths in 3 file(s) to track the rename.
  - Renamed residual file "frontend/src/views/NotFound.tsx" → canonical "frontend/src/views/NotFoundPage.tsx".
  -   ↳ rewrote import paths in 1 file(s) to track the rename.
### Missing-import installs
- No missing packages needed to be installed during preflight.
### Route registration audit
- Preflight: HARD FAIL (unregistered=1, dangling=0, missingContracts=0, undeclaredImplemented=1)
    - unregistered: backend/src/api/modules/spri/spri.routes.ts: exports "registerSpriRoutes" but index.ts never calls it.
- Final: clean (unregistered=0, dangling=0, missingContracts=0, undeclaredImplemented=1)
### Contract completeness audit (ORM-derived)
- Post-generate: clean (relationships=5, missingScoped=0)
- Preflight: clean (relationships=5, missingScoped=0)
- Final: clean (relationships=5, missingScoped=0)

## Defect Category Summary
Each category aggregates audit results relevant to the 5 ways generated code typically fails to 'just run'.

| Category | State | Evidence |
| --- | --- | --- |
| Dependency sync | ✅ PASS | No missing-import installs were needed. |
| Directory / implementation dedup | ✅ PASS | Convention auto-fix rewrote 7 file(s) across 2 invocation(s). |
| Env variable alignment | ✅ PASS | No env alignment signal — generator injected DATABASE_URL defaults and no gate flagged env drift. |
| API contract consistency | ⚠️ WARN | Preflight: 1 unregistered module(s), 0 missing contract endpoint(s), 0 dangling registration import(s).<br/>Final gate: 0 unregistered, 0 missing contract, 0 dangling. |
| API contract completeness (ORM-derived) | ✅ PASS | Post-generate: 5 ORM relationship(s), 0 scoped endpoint(s) missing.<br/>Preflight: 5 relationship(s), 0 missing.<br/>Final gate: 0 missing. |
| Build & runtime verification | ❌ FAIL | 7 TS error line(s) in integration output. |

## Pipeline Anomalies
Pipeline-level events that affect interpretation of model scores. These reflect the orchestrator behaviour, not the LLM's code quality.

| Event | Count | What it means |
| --- | --- | --- |
| stagnation_warning | 10 | Worker re-read the same files without writing. Threshold-driven nudge. |
| stagnation_fallback_injected | 1 | Pre-abort batch-classify retry was injected (CODEGEN_HARDENING_PLAN.md §7.4). recovered: 1. |
| contract_usage_coverage_audit | 2 | 4-quadrant audit ran (post-contract / pre-integration). Decisions in `.ralph/contract-usage-coverage.json`. |
| doc_truncated | 2 | Context budget exhausted; relevance picker dropped sections. Symptoms include "lost" PRD detail. |
| runtime_integration_audit | 1 | Static §4.2/§4.3/§4.4/§4.5/§4.7 grep audit ran. Findings persisted to `.ralph/runtime-integration-audit.json`. |
| runtime_integration_audit_warning | 1 | Audit found WARN-severity issues (missing `clearActiveRunsForUser`, worker not started in server.ts, aggregation throws on empty result). Worker repair directives surfaced. |

## Repair / Self-Heal Telemetry
- Total repair events: 44
- Stage `integration-gate`: 17
- Stage `task`: 11
- Stage `preflight-route-audit`: 4
- Stage `worker-verify`: 3
- Stage `preflight-contract-completeness`: 3
- Stage `worker-context`: 2
- Stage `preflight-convention-fix`: 2
- Stage `architect-triage`: 1
- Stage `generate_api_contracts`: 1

## Recommended Improvements
- Reduce context loss: improve section selection / budget allocation so critical PRD and implementation context is not truncated.
- Tighten task-to-file planning: the worker should either write the planned files or immediately repair the missing file-plan deltas.
- Improve final integration convergence: prioritize the highest-signal failing gate first and keep stagnation detection enabled to avoid read-only loops.
- Improve end-to-end reliability: keep smoke/e2e scenarios aligned with PRD flows and feed deterministic failure context back into source repair.
- Optimize model spend: reduce repeated high-cost iterations by improving preflight checks, duplicate-file cleanup, and stricter early gates.

## Codegen Retrofit Suggestions (inferred from this run)
Concrete codegen-pipeline changes derived from the signals above. Cross-references point at `CODEGEN_HARDENING_PLAN.md` sections so each item is actionable.

| # | Severity | Issue | Plan ref |
| --- | --- | --- | --- |
| 1 | 🔴 HIGH | `integration_verify_fix` looped without producing mutations and ran out of budget | §7.2 + §7.4 (stagnation fallback) |
| 2 | 🔴 HIGH | Integration gate failure short-circuited runtime/E2E verification | §7.3 (one gate FAIL ≠ pipeline halt) |
| 3 | 🟡 MED | Workers' file plans repeatedly diverged from the files they wrote | _(no rule yet — open ticket)_ |
| 4 | 🟡 MED | Backend route registrars existed but weren't wired into the app router | §4.4 (Background jobs / route registration) |
| 5 | 🟡 MED | E2E verify still has failing scenarios | _(no rule yet — open ticket)_ |
| 6 | 🟢 LOW | PRD / implementation context was truncated for workers | _(no rule yet — open ticket)_ |
| 7 | 🟢 LOW | Workers wrote files using non-canonical paths; convention auto-fix had to rewrite them | §4 (Worker prompt 'Project-specific conventions') |
| 8 | 🟢 LOW | Repair / verify stages cost as much (or more) than first-pass codegen | §3 (L4 Static Audit) + §7.1 + §7.2 |

### 1. 🔴 HIGH — `integration_verify_fix` looped without producing mutations and ran out of budget

- **id**: `verify-fix-stagnation`
- **plan ref**: §7.2 + §7.4 (stagnation fallback)
- **evidence**:
    - stagnation_warning events: 10.
    - integration_verify_fix: calls=34, cost=$0.9613, duration=4m 12s.
    - Stage exited with blocking integration errors still present.
- **recommendation**: Inject the four-quadrant decision tree into `integration_verify_fix`'s system prompt: explicitly authorise (a) implement, (b) prune contract, (c) add to contract, (d) delete frontend rogue call, (e) implement backend route. Also wire the stagnation fallback: when the in-loop watcher trips, issue ONE batch-classify prompt (read-once / classify-once / write-once) and cap at 2 more iterations.

### 2. 🔴 HIGH — Integration gate failure short-circuited runtime/E2E verification

- **id**: `gate-cascade-skip`
- **plan ref**: §7.3 (one gate FAIL ≠ pipeline halt)
- **evidence**:
    - Integration verify: FAIL.
    - Runtime verify: SKIPPED.
    - E2E verify: PASS/FAIL (executed).
    - Skipped gates leave the report blind to whether the project actually starts and serves traffic.
- **recommendation**: Switch the orchestrator's gate policy from `graph_error` to `FAILED_BUT_CONTINUED`: integration FAIL records the failure but lets runtime + E2E + e2e-triage still run. Only runtime FAIL should block E2E (since the app can't serve traffic). Surface gates as PASS / FAIL / FAIL_CONTINUED / SKIPPED in the report.

### 3. 🟡 MED — Workers' file plans repeatedly diverged from the files they wrote

- **id**: `task-plan-unfulfilled`
- **plan ref**: _(no rule yet — open ticket)_
- **evidence**:
    - task_plan_unfulfilled events: 3.
- **recommendation**: Tighten `task-file-plan-verifier`: after the worker emits its plan, gate the worker so it cannot complete until either every planned path was written OR an explicit `<plan-amendment>` block justifies the delta. This converts silent mismatches into a fast-fail loop instead of accumulating noise.

### 4. 🟡 MED — Backend route registrars existed but weren't wired into the app router

- **id**: `backend-route-registration-gap`
- **plan ref**: §4.4 (Background jobs / route registration)
- **evidence**:
    - Unregistered modules: 1 (backend/src/api/modules/spri/spri.routes.ts: exports "registerSpriRoutes" but index.ts never calls it.).
    - Dangling registration imports: 0 (—).
- **recommendation**: Add to `ROLE_PROMPTS.backend` 'Project-specific conventions': **after** creating any `register<Domain>Routes()`, you MUST import + call it inside `apiRouter` (or the canonical aggregator) in the SAME response. Provide the exact aggregator file path in the Project Convention Card.

### 5. 🟡 MED — E2E verify still has failing scenarios

- **id**: `e2e-verify-failure`
- **plan ref**: _(no rule yet — open ticket)_
- **evidence**:
    - E2E error blob (truncated): E2E has failures but none are deterministic — auto-repair skipped. |  | triage: 0 deterministic, 0 flaky, 0 infra (0 self-healed on retry).
- **recommendation**: Pair e2e-triage output with the integration_verify_fix decision tree: deterministic failures should auto-dispatch a `worker_codefix` task scoped to the failing spec's surface area; flaky failures should be retried in isolation; infra-only failures should NOT count against the gate (already halved in scoring — keep that).

### 6. 🟢 LOW — PRD / implementation context was truncated for workers

- **id**: `worker-context-truncation`
- **plan ref**: _(no rule yet — open ticket)_
- **evidence**:
    - doc_truncated=2, truncation_detected=0, worker_context_trimmed=0.
- **recommendation**: Increase `WORKER_CONTEXT_BUDGET_CHARS` for large-window providers (DeepSeek V4 Pro 1M, Gemini 1M). Improve `doc-section-picker.ts` priority so contract-relevant sections + PRD user flows are never the ones dropped first. Consider per-role budgets (frontend gets API client + design spec; backend gets contract + ORM models).

### 7. 🟢 LOW — Workers wrote files using non-canonical paths; convention auto-fix had to rewrite them

- **id**: `convention-baked-into-scaffold`
- **plan ref**: §4 (Worker prompt 'Project-specific conventions')
- **evidence**:
    - conventionAutofix: invocations=2, files rewritten=7, unfixable=0.
    - Sample notes: Renamed residual file "frontend/src/context/AuthContext.tsx" → canonical "frontend/src/contexts/AuthContext.tsx". |   ↳ rewrote import paths in 3 file(s) to track the rename. | Renamed residual directory "backend/src/middlewares/" → canonical "backend/src/middleware/".
- **recommendation**: Promote the canonical paths the auto-fixer keeps writing back (e.g. `frontend/src/contexts/`, `backend/src/middleware/`) into `ROLE_PROMPTS` 'Project-specific conventions' as HARD RULES with explicit anti-patterns. Each canonical path that triggered ≥2 rewrites this session should become an example in the prompt.

### 8. 🟢 LOW — Repair / verify stages cost as much (or more) than first-pass codegen

- **id**: `repair-spend-imbalance`
- **plan ref**: §3 (L4 Static Audit) + §7.1 + §7.2
- **evidence**:
    - worker_codegen cost=$0.0000.
    - integration_verify_fix=$0.9613, phase_verify_fix=$2.3390, worker_codefix=$0.0616.
    - Repair total / codegen ratio = Infinity.
- **recommendation**: Push fixes upstream: the cheapest dollar is the one not spent on repair. Strengthen preflight (route audit, contract completeness, dep audit) so issues fail fast at low cost; route the most common repair patterns (4-quadrant contract, missing routers) into deterministic codemods rather than LLM iteration.
