# Fix plan — "admin endpoints 404 / route not mounted" class of bug

Target: the langgraph supervisor codegen pipeline. Symptom that triggered this:
`Route GET /api/v1/admin/approvals not found` in a generated app (test-x), and many
admin endpoints missing.

**Implementation status (2026-06-12):**
- ✅ **G1 — quarantine marker** — implemented. New helper `src/lib/pipeline/build-quarantine.ts`
  (`BUILD_FAILED_MARKER_REL`, `readBuildFailedMarker`); the integration node writes
  `.blueprint/BUILD_FAILED.json` on fail / clears it on pass (`supervisor.ts`); the coding
  route's blocking-gate check refuses to report a passing session when the marker is present
  (`coding/route.ts`). Unit tests: `__tests__/build-quarantine.test.ts` (4 passing).
- ✅ **G4 — fail-closed on smoke-gate throw** — implemented (`supervisor.ts` catch block now
  sets `finalStatus="fail"` unless `BLUEPRINT_TOLERATE_SMOKE_INFRA_THROW=1`).
- ✅ **G3 — deterministic backend tsc hard-stop** — implemented, flag-gated. New module
  `src/lib/pipeline/backend-readiness-gate.ts` (`runBackendTscGate` / `runBackendReadinessGate`,
  pure + injectable runner). The integration node, when `BLUEPRINT_BACKEND_GATE_BEFORE_FRONTEND=1`,
  runs `tsc --noEmit` on the generated backend BEFORE the smoke gate and hard-fails on a non-zero
  error count (deterministic; cannot be talked past by the LLM loop). `skipped` (no backend dir /
  tsc unavailable) is infra, not a failure. Unit tests: `__tests__/backend-readiness-gate.test.ts`
  (9 passing).
- ✅ **G2 — backend-green BEFORE the frontend phase** — implemented, flag-gated, at the correct
  graph boundary. Discovery: the supervisor graph ALREADY has `be_worker → be_phase_verify
  (backend verify+fix) → … → fe_worker`, i.e. it *does* try to fix backend tsc before the frontend
  phase. The hole was that `be_phase_verify → extract_real_contracts` was an **unconditional edge** —
  a backend verify+fix loop that *gave up* (stagnation/circuit-breaker) advanced into the frontend
  phase anyway (the test-x "194 backend errors carried into frontend" failure). Fix: a new node
  `be_readiness_gate` + a conditional edge `routeAfterBackendReadiness`. When
  `BLUEPRINT_BACKEND_GATE_BEFORE_FRONTEND=1`, it confirms backend-green (trusts `scaffoldErrors`
  AND re-runs a deterministic `runBackendTscGate`); if not green it **always writes the BUILD_FAILED
  quarantine marker (G1)**, then picks one of two modes:
  - **`proceed-quarantined` (DEFAULT)** — build the frontend anyway. An unfixable/stuck backend
    would otherwise never yield a frontend, and the verify loop sometimes gives up on a *recoverable*
    backend; the output stays quarantined (G1 blocks "ready") so nothing falsely ships and the
    frontend work isn't discarded.
  - **`hard-stop` (opt-in `BLUEPRINT_BACKEND_GATE_MODE=hard-stop`)** — divert to the `summary`
    terminal and skip the frontend, to save tokens on a hopeless backend.

  Routing is the pure, unit-tested `decideBackendReadinessRoute` (in `backend-readiness-gate.ts`).
  Flag OFF (default) the router always returns `extract_real_contracts` — byte-identical to the
  previous unconditional edge (no behavioural change). NOT an infinite loop: `be_readiness_gate` is
  a one-shot node with no edge back to `be_phase_verify`; a backend that can never go green ends the
  session cleanly (fail + quarantine), it does not hang.

  Caveat: the graph wiring is `tsc`-clean and the gate logic is unit-tested, but the full graph was
  NOT run end-to-end here (needs a real codegen session). Validate on one real run with the flag on
  before relying on it; the flag-off path is a no-op so it is safe to merge dark.

Flag: `BLUEPRINT_BACKEND_GATE_BEFORE_FRONTEND=1` (default off). Mode: `BLUEPRINT_BACKEND_GATE_MODE`
(`proceed-quarantined` default, `hard-stop` opt-in).

- ✅ **Unresolved-problems ledger** (analysis) — new `src/lib/pipeline/unresolved-problems.ts`
  (`recordUnresolvedProblem` / `readUnresolvedProblems` / `summarizeByCategory`). Append-only
  `.ralph/unresolved-problems.jsonl`, one line per give-up event, categorized
  (`backend-tsc` · `frontend-tsc` · `runtime-smoke-404` · `contract-coverage` · `feature-coverage` ·
  `circuit-breaker` · `stagnation` · `backend-not-green` · `other`) with a summary, capped evidence,
  and `artifacts` pointers into the detailed `.ralph/*` files. The recorder never throws. Wired so
  at all 5 give-up sites: (1) backend-readiness gate `backend-not-green`; (2) IntegrationVerifyFix
  `circuit-breaker` (budget exhausted); (3) integration runtime smoke `runtime-smoke-404` (routes
  unreachable / backend didn't boot); (4) stagnation fallback exhausted `stagnation` (LLM couldn't
  decide, escalated to human/abort); (5) feature-audit gate `feature-coverage` (PRD ids unresolved,
  in coding/route.ts). Add `recordUnresolvedProblem(...)` at any future give-up site the same way.
  Unit tests: `__tests__/unresolved-problems.test.ts` (6 passing). Purpose: offline pattern analysis of
  "what the LLM repair loop couldn't solve" → decide structural fixes.

Tests: 25 passing across the three new suites; pipeline `src/` `tsc --noEmit` clean.

Verification of the implemented slice: pipeline `src/` is `tsc --noEmit` clean (the repo's
589 pre-existing errors are all under `scaffolds/` + `example/`, i.e. generated-app templates,
not the pipeline); build-quarantine unit tests pass 4/4.

---

## 0. TL;DR — what's actually wrong

The check you'd reach for **already exists and already fires.** The reason broken code
still reached a human is **not** "we didn't detect it" — test-x's sessions were all
correctly graded FAIL/ABORTED. The real holes are about **blocking, timing, and
determinism**:

1. **`finalStatus="fail"` is a *report*, not a *quarantine*.** A failed session leaves
   fully-runnable code on disk with nothing marking it "do not ship", so the output gets
   run anyway → 404s. ← **the #1 reason you saw the bug.**
2. **The smoke/route gate runs at the very end (integration phase), after both backend AND
   frontend are built**, and only after the verify-fix loop burns its iteration budget
   (circuit-breaker, `supervisor.ts:~5595`). So failure surfaces late, the frontend was
   built against an unverified backend, and the loop "gives up" with the gate still red.
3. **No deterministic `tsc --noEmit` gate before the LLM repair loop.** Type-checking is
   handed to the verify-fix *worker* as prompt instructions
   (`structured-verify-tools.ts:270`, `supervisor.ts:4536/6297/6299`), i.e. LLM-driven and
   best-effort, not a hard pass/fail precondition. The smoke gate boots via `pnpm dev`
   (tsx) which **ignores types**, so 194 type errors don't stop the boot — they just make
   it crash at runtime.
4. **Unexpected gate throws are swallowed to a warning** (`supervisor.ts:~8043` catch:
   "Smoke gate must NEVER hard-fail the pipeline"). Narrow (the gate already returns
   `pass:false` + `bootFailed:true` for normal boot failure), but a real escape hatch.

**Good news to NOT touch:** the route-presence check itself is correct. `runtime-smoke-gate.ts`
boots the backend and probes every `API_CONTRACTS.json` endpoint, treating **404 as failure**
and 401/403/2xx/4xx as pass (`RuntimeSmokeGateResult.pass/bootFailed/failures`,
`runtime-smoke-gate.ts:97-101,448`). And the contract it checks against is **PRD/TRD-derived**
(spec → contract → probe), which is the correct direction — do **not** invert it to
generate the contract from runtime (that would make missing endpoints undetectable).

---

## 1. What already exists (don't rebuild)

| Piece | File | Role |
|---|---|---|
| Route-presence smoke | `src/lib/pipeline/self-heal/runtime-smoke-gate.ts` (`runRuntimeSmokeGate`, L405) | boots backend, probes every contract endpoint, 404 ⇒ fail |
| Smoke→repair feedback | `src/lib/pipeline/runtime-smoke-block.ts` | formats `.ralph/runtime-smoke.json` into the verify-fix worker prompt |
| Static route audit | `src/lib/langgraph/supervisor/audits/route-registration.ts` | detects unregistered routes (some cases WARN-only, L612) |
| Gate wiring | `src/lib/langgraph/supervisor.ts:7944-8055` | runs audit + smoke at integration; sets `finalStatus="fail"` on failure |
| Contract coverage | `src/lib/pipeline/gates/contract-coverage-gate.ts` | every contract endpoint has a task |
| tsc (worker-driven) | `structured-verify-tools.ts:270-300`, `supervisor.ts:4536,6297` | type-check *instructions* inside the repair loop |

---

## 2. Fixes (prioritized)

### G1 — make a FAILED build block its own artifact  *(highest value, lowest risk)*

A failed session must leave an unmistakable, machine-checkable "broken" marker, and any
consumer that runs/serves/marks-ready the output must refuse on that marker.

- On every path that sets `finalStatus = "fail"` (there are ~12; they funnel through the
  end of the integration node, `supervisor.ts:8021/8056/7950/7894/7858…`), also write a
  quarantine artifact, e.g. `<outputDir>/.blueprint/BUILD_FAILED.json`
  `{ sessionId, failedAt, gate, summary }`, and **delete it on `finalStatus="pass"`.**
- Add a guard at the consumption boundary (the coding route / "ready"/"open project"
  surface — see `src/app/api/agents/coding/route.ts:2468` `summarizeBlockingGateErrors`):
  if `BUILD_FAILED.json` is present, surface a blocking banner ("backend smoke failed —
  N endpoints 404") instead of presenting the app as usable.
- Net effect: a FAIL can no longer be silently run as if it shipped.

### G2 — run backend `tsc` + smoke as a hard gate at the END of the backend phase, BEFORE the frontend phase

This is the maintainer's original sequencing proposal. Today the smoke lives only in the
final integration node (`supervisor.ts:8006`). Add an earlier, backend-scoped checkpoint:

1. Locate the phase boundary where backend tasks finish and the **Frontend foundation
   task** begins (`domain-breakdown.ts:41` "shared frontend foundation task, phase
   'Frontend'") — that's the insertion point.
2. Before the frontend phase starts, run:
   - **backend `tsc --noEmit`** (deterministic; see G3),
   - **`runRuntimeSmokeGate({ scope: backend-only })`** against the backend's portion of
     the contract (reuse `filterEndpointsToScope` / `active-scope`).
3. If either fails → route into the backend repair loop; **do not enter the frontend
   phase** until green. Keep the existing end-of-run integration smoke as the final
   whole-app check (defense in depth).
- Risk: this edits supervisor phase ordering (large file). Keep it behind a flag
  (`BLUEPRINT_BACKEND_GATE_BEFORE_FRONTEND=1`) initially so it can be rolled out safely.

### G3 — add a deterministic `tsc --noEmit` gate (not just worker prompt text)

- Add a tiny helper that runs `cd backend && npx tsc --noEmit --skipLibCheck` (and the
  frontend equivalent `tsc -p tsconfig.app.json`) and returns `{ pass, errorCount,
  firstErrors[] }` — the command strings already exist verbatim at
  `structured-verify-tools.ts:270/300` and `supervisor.ts:4536-4561`; lift them into a
  callable gate.
- Call it (a) in G2's backend checkpoint and (b) once more right before the final
  smoke/`report_done`. `errorCount > 0` ⇒ `finalStatus="fail"` + repair; never proceed to
  smoke/done with a non-compiling source tree.
- Rationale: the smoke boots with tsx (no typecheck). 194 type errors must be stopped
  deterministically, not "worked on" until the circuit-breaker budget runs out.

### G4 — don't swallow gate throws into a pass

- `supervisor.ts:~8043` catch currently logs a warning and continues. Change: an
  *unexpected* throw from `runRuntimeSmokeGate` should set `finalStatus="fail"` with a
  clear "smoke gate could not complete — treating as fail" summary (fail-closed, not
  fail-open). Keep tolerance only for genuinely-infra issues (e.g. no DB provisioned) by
  detecting that specific case explicitly rather than blanket-swallowing all throws.

---

## 3. Contract direction (affirm — already correct)

Keep it as is: **PRD §26 → `API_CONTRACTS.json` (spec) → smoke probes the running backend
against that list.** A contract endpoint that 404s = a real gap = fail. Do **not** generate
the contract from runtime/smoke output — that makes "missing endpoint" structurally
undetectable (the contract would only ever contain what was built). Runtime may be used to
*cross-check response shapes* against the shared schema, but never as the *source* of the
endpoint surface.

---

## 4. Why this specific bug happened (root cause recap, for the changelog)

`models/index.ts` re-exported only `User`+`Session` while 40 model files existed → every
admin controller importing from the models barrel failed → the admin module graph couldn't
load → `registerAdminAliasesRoutes` routes never registered → requests fell through to the
canonical 404 in `errorHandler.ts:29` (`Route … not found`). The pipeline *detected* the
resulting breakage (sessions graded FAIL), but G1–G3 above are why a detected-as-broken
build still ended up being run by a human.

Forward-looking structural prevention (separate from gating): generate the `models/index.ts`
and `modules/index.ts` registries from the filesystem (glob + auto-register), or add a
structural assertion test ("every `models/*.ts` is exported from the barrel; every
`*.routes.ts` is referenced in the registry") so a generated file can never be silently
left unregistered.

---

## 5. Verification for each fix

- **G1:** force a smoke failure (rename one route file), confirm `BUILD_FAILED.json` is
  written and the consumer surface refuses to present the app as ready; confirm a clean run
  deletes it.
- **G2:** seed a backend with a missing admin route; confirm the pipeline stops before the
  frontend phase and routes to backend repair, not after building the frontend.
- **G3:** introduce a deliberate type error in backend; confirm the tsc gate fails
  deterministically before smoke, with `errorCount` reported.
- **G4:** make `runRuntimeSmokeGate` throw; confirm session ends `fail`, not warning-pass.
