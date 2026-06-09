# QA‑Driven Test Plan — Design & Phased Plan

Status: **proposal** (no code yet). Owner: vicky. Last updated: 2026‑06‑08.

This document proposes turning the preparation‑stage **QA step** from a write‑only
display artifact into a **requirement‑linked test plan / coverage contract** that
*drives and verifies* the three test layers the coding phase already runs
(TDD‑mock, runtime, E2E).

---

## 1. Problem

The preparation **QA** step today is effectively dead weight:

- **Thin input** — `parallel-generate` calls `new QAAgent().generateAudit(prd, "", …)`:
  only the PRD is passed; **design / TRD / SysDesign are `""`**. So it cannot test
  real endpoints, data models, or flows — only paraphrase the PRD.
- **Low ceiling** — `QA_DOC_MAX_TOKENS` (openrouter) defaults to **8192**, far too
  small for a large PRD → a shallow, sample‑style plan.
- **Not requirement‑linked** — test cases are not tagged with `FR-/AC-/PAGE-/API-`
  IDs, so coverage is neither traceable nor measurable.
- **Write‑only** — the kickoff route never reads it (it stubs `run.steps.qa = ""`);
  task‑breakdown, coding workers, and self‑heal never consume it. It is shown in
  the UI and discarded.

Meanwhile the **actual** tests are generated *emergently* during coding, from real
artifacts, with no plan tying them to requirements or to each other.

## 2. Current test layers (the constraint we must respect)

| Layer | Tests what | Authored where (today) | Grounded on |
|---|---|---|---|
| **TDD (mock)** | units / contract shapes | `tdd-test-writer` node in the coding supervisor (red→green→reviewer→hard‑gate) | frozen API contract + the code being written |
| **runtime** | assembled app boots; real endpoints/DB respond | `runtime-smoke` gate (+ subsystem cross‑domain integrate) | the running server, real schema |
| **E2E** | user flows | playwright + e2e triage; partly seeded by `test`‑role tasks from task‑breakdown | real routes / pages / selectors |

Key fact that shapes the whole design: **TDD/runtime/E2E need artifacts that do
not exist at preparation time** (contracts, signatures, file layout, live
endpoints, selectors). QA can therefore plan the *what*, but the *how* (executable
test code) must still be produced at coding time against real artifacts.

## 3. Goals / Non‑Goals

**Goals**
- Make QA a **structured, requirement‑linked test matrix**: per requirement → which
  layer(s) test it, the intent (given/when/then), and priority.
- Let that matrix **drive** the existing coding test phases and **seed E2E test
  tasks**, and become a **cross‑layer coverage gate**.
- Full **traceability**: every `FR-/AC-/PAGE-/API-` id → planned tests → produced
  tests → pass/fail.

**Non‑Goals**
- ❌ Generating executable TDD/runtime/E2E **test code** at preparation time.
- ❌ Replacing the supervisor's contract‑grounded `tdd-test-writer` with pre‑baked
  test tasks.
- ❌ Creating one task per (requirement × layer) up front (task/cost explosion).

## 4. Design

### 4.1 QA becomes a "test matrix / coverage contract"

QA output shape (additive to the current `AUDIT.json`): a `testMatrix` keyed by
requirement id, each entry assigning layers + intent + priority.

```jsonc
{
  "testMatrix": [
    {
      "requirementIds": ["FR-EN03", "API-030"],   // what this row covers
      "layers": ["unit", "runtime", "e2e"],         // QA decides which layers apply
      "intent": { "given": "...", "when": "...", "then": "..." },
      "priority": "P0",
      "negative": ["duplicate enrollment → 409", "unauthenticated → 401"],
      "notes": "RBAC: only coordinator may enroll"   // tier‑L concerns surfaced here
    }
  ],
  "summary": { "byLayer": { "unit": 0, "runtime": 0, "e2e": 0 }, "byPriority": {…} }
}
```

`layer` vocabulary maps 1:1 to the existing phases: `unit` → TDD‑mock,
`runtime` → runtime‑smoke, `e2e` → playwright.

### 4.2 How each layer consumes the matrix

| Layer | How the matrix is used | Who writes the code |
|---|---|---|
| **unit (TDD)** | matrix rows for a task's `coversRequirementIds` are injected into the `tdd-test-writer` context as "must‑cover" + negative cases | `tdd-test-writer` (unchanged engine, guided) |
| **runtime** | matrix `runtime` rows define the endpoints/states the runtime‑smoke gate must exercise | runtime gate (guided) |
| **e2e** | matrix `e2e` rows are turned into **`test`‑role tasks** (reuse the existing E2E task channel) | task‑breakdown emits them; coding e2e phase implements |

So: **E2E is task‑seeded from QA; TDD/runtime stay contract‑grounded but guided by
QA; all three are then verified against QA.**

### 4.3 Coverage gate upgrade

Today `task-coverage-gate` checks AC‑/FR‑/PAGE‑/CMP‑ ids are covered by *some task*.
Add a **test‑coverage gate**: for each QA matrix row, was a test of the required
layer(s) actually produced? Emits metadata (and, optionally, a bounded repair —
disabled by default to avoid the cost pattern we hit with task‑coverage repair).

## 5. Phased plan

Each phase is **independently shippable, additive, env‑gated** (default off until
proven), and leaves the current flow untouched when the flag is off.

### P1 — Make the QA plan substantive + structured (`QA_TEST_MATRIX=1`)
- Feed QA the full context: PRD **+ TRD + SysDesign + Design** (stop passing `""`).
- Raise `QA_DOC_MAX_TOKENS` (openrouter 8192 → 32k+).
- Extend the QA prompt + schema to emit `testMatrix` with `requirementIds`,
  `layers`, `intent`, `priority`, `negative`.
- Persist `QA.md` / `qa-test-matrix.json` to the output root at kickoff (stop
  stubbing `run.steps.qa = ""`).
- **Exit criteria:** for the CSMA PRD, QA emits a matrix covering ≥80% of
  FR‑/AC‑ ids with sensible layer assignment.

### P2 — Seed E2E test tasks from the matrix (`QA_SEED_E2E_TASKS=1`)
- In task‑breakdown, turn `layer:"e2e"` rows into `test`‑role tasks, tagged with
  their `coversRequirementIds` (and `subsystem` when in subsystem mode).
- Reuse the existing E2E task channel (`summarizeE2eTaskContext`).
- **Exit criteria:** E2E tasks appear in the breakdown, one per P0/P1 flow, no
  task‑count explosion (cap + log dropped low‑priority rows).

### P3 — Guide TDD + runtime with the matrix (`QA_GUIDE_TDD=1`)
- Inject the matching matrix rows into the `tdd-test-writer` context (must‑cover +
  negative cases for the task's requirement ids).
- Feed `layer:"runtime"` rows to the runtime‑smoke gate as the endpoints/states to
  exercise.
- **Exit criteria:** generated TDD/runtime tests reference the QA‑planned cases;
  no regression in the existing green/runtime gates.

### P4 — Cross‑layer test‑coverage gate (`QA_TEST_COVERAGE_GATE=1`)
- After coding, verify each matrix row's required layers produced a test.
- Emit `qaTestCoverage` metadata (planned vs produced, by layer + priority).
- Optional bounded repair (**off by default**; learn from the task‑coverage repair
  cost blow‑up — cap attempts, batch, circuit‑break).
- **Exit criteria:** report shows planned/produced/missing per layer; gate is
  advisory unless explicitly enabled.

## 6. Status matrix

| Phase | Flag | Touches | Risk | State |
|---|---|---|---|---|
| P1 substantive QA + matrix | `QA_TEST_MATRIX` | qa-agent prompt/inputs/tokens, kickoff persist | low | ☐ |
| P2 seed E2E tasks | `QA_SEED_E2E_TASKS` | task-breakdown | medium | ☐ |
| P3 guide TDD/runtime | `QA_GUIDE_TDD` | tdd-test-writer, runtime gate context | medium | ☐ |
| P4 test-coverage gate | `QA_TEST_COVERAGE_GATE` | engine gate + report | low (advisory) | ☐ |

## 7. Risks & mitigations

- **Drift** (PRD/contracts change after QA) → QA matrix is *intent*, not code;
  coding regenerates `how` against real contracts each run. The matrix is
  re‑generated whenever QA re‑runs.
- **Cost** → never one task per (req × layer); only E2E P0/P1 become tasks;
  TDD/runtime stay generated. Repair gates default off / bounded.
- **Layer mis‑assignment by QA** → P4 gate surfaces under/over‑coverage; iterate
  the prompt.
- **Subsystem mode** → matrix rows carry `subsystem`; E2E tasks + coverage scope
  per domain, consistent with the per‑domain breakdown.

## 8. Open questions

1. Where should the runtime layer get its "expected states" — QA matrix, or stay
   purely contract‑derived (matrix only adds negative/edge cases)?
2. Should P2 E2E tasks be per‑flow or per‑requirement? (Lean: per user‑flow, each
   flow tagging multiple requirement ids.)
3. Do we want QA to also assign **data fixtures / seed** needs per flow (helps
   runtime + E2E), or keep that in the existing seeding logic?
