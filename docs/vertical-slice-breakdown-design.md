# Vertical-Slice Task Breakdown (Design)

> Re-cut task breakdown from **horizontal (layer/file)** fragments into
> **vertical feature/flow slices** that one worker owns end-to-end, on top of
> the scaffold + frozen contracts. Goal: stop "half-implemented features"
> (button placed but not wired, flow breaks mid-way) at the structural root,
> without giving up parallelism / determinism / cost control.
>
> Status: **design, not implemented.** Companion to
> `docs/feature-coherence-plan.md` (the after-the-fact wiring audit that this
> design largely makes unnecessary) and `docs/ddd-prd-to-coding-design.md`
> (subsystem split = the coarser, domain-level grain).

---

## 1. Thesis

- Cursor / Claude Code produce coherent features because of a **feedback loop**
  (one agent, full-repo context, run→see-error→fix), **not** because of a
  template. The scaffold is incidental there.
- Our pipeline is **fragmentation + scoped context + state-driven**. Workers see
  only their slice, have a short budget, and no full-repo agency — so a feature
  chain (UI interaction → handler → API call → endpoint → model) **falls between
  tasks**. The scaffold + audits exist to **compensate** for fragmentation.
- The villain is not "having tasks" — it's **cutting along layers/files** so the
  chain spans multiple blind workers. The fix is to **cut along feature/flow
  verticals**: one worker owns a whole chain. Keep the scaffold as the shared
  foundation and contracts as the glue.

Guiding rule: **as coarse as cohesion requires, as fine as the context/output
budget allows.** We don't eliminate fragmentation — we re-cut it.

---

## 2. Current state — horizontal cut (the problem, in code)

`src/lib/agents/kickoff/task-breakdown-agent.ts` `flatStackPhaseGuide()` (`:87`)
cuts by **layer**, then fragments frontend by **page**:

- **Data Layer** (`:93`): one broad task — all Sequelize models / validation.
- **Backend Services** (`:98`): split **by resource domain** (4+ resources) and
  **by endpoint count** (≤6 endpoints/task).
- **Integration (contracts/client)** (`:103`): one early task aligning API
  contracts + frontend API client.
- **Frontend** (`:105`): **one task per page** — "Implement [SinglePageName]
  page", the word "and" forbidden, exactly ONE `frontend/src/views/*` file per
  task, `estimatedHours ≤ 0.5h` (`:109`–`:123`). Rationale in the prompt
  (`:119`): "a coding agent … attempts to implement two full pages in a single
  pass and always leaves at least one incomplete."

**Consequence.** A single user flow — e.g. *enroll in a course* — is shattered:
the **model** lands in Data Layer, the **`POST /api/enrollments` endpoint** in a
Backend Services task, the **enrollment page + Enroll button** in a Frontend
page task. Three workers, none owning the chain. The page worker is told to
*list* the endpoints it calls (`:125`) but a different worker implements them and
nobody owns "click Enroll → POST → persist → navigate". That gap is exactly what
`wiring-audit` / the L3 judge detect **after the fact**.

The page-level fragmentation also fights itself: `split-multipage-tasks.ts`
already caps it (`MAX_VIEWS_PER_FRONTEND_TASK=3`) and a Foundation task
(`frontend-foundation-task.ts`) re-introduces shared cohesion — both are
*partial walk-backs* of over-fragmentation. This design completes that move.

---

## 3. The unit of work: a feature vertical

A **vertical slice** = a cohesive, independently-shippable user capability, owned
end-to-end by ONE worker:

```
Vertical "Enroll in a course"
  ├─ UI:        EnrollmentPage view + the Enroll control + its states
  ├─ behavior:  onClick handler → calls enrollmentsApi.create(dto)
  ├─ client:    the api-client method(s) this flow uses
  ├─ endpoint:  POST /api/enrollments (+ any GET it reads) — implemented here
  └─ effect:    optimistic/loading state, navigate to /confirmation
        (reads shared: Enrollment model, frozen contracts, scaffold utils)
```

The worker that owns this slice writes the page, wires the button, implements the
endpoint, and asserts the whole chain — so it **cannot** leave the button inert.

### What is NOT a vertical (stays shared — built first)
- **Foundation** (build once, before verticals): scaffold (kept as-is), app
  shell / layout / router skeleton, design tokens + shared UI primitives, the
  **base API client**, **global data-layer bootstrap + shared models**, and the
  **frozen API contracts**. (This is today's Foundation task +
  `extract_real_contracts`, generalized.)
- **Shared models / contracts** are foundation, not per-vertical — so the schema
  stays consistent and two verticals can't define conflicting `Enrollment`
  models. A vertical *reads* the shared model and *owns* the endpoint+UI+wiring
  for its flow.

---

## 4. Slice contract (what each vertical task carries)

Extends `KickoffWorkItem`. A vertical declares its full chain so the worker — and
the verifier — know the slice is complete:

```
verticalSlice: {
  flowId: string;                 // stable id, e.g. FLOW-ENROLL
  coversRequirementIds: string[]; // PAGE-/CMP-/FR-/AC- ids this flow satisfies
  ui:        { views: string[]; primaryInteractions: WiringObligation[] };
  endpoints: { method: string; path: string; owns: boolean }[]; // owns=implement here
  consumes:  { contracts: string[]; models: string[] };          // shared deps (read-only)
  effect:    string;             // navigation / state outcome
}
```

- `primaryInteractions` reuses the existing `WiringObligation`
  (`wiring-contract.ts`) — but now the SAME worker that renders the control also
  implements its handler and the endpoint it calls, so wiring is owned, not
  audited-after.
- `owns: true` endpoints are implemented in this slice; `owns: false` are
  consumed from another (already-built) vertical via the frozen contract.

---

## 5. Breakdown algorithm (PRD → verticals)

Replace the layer-phase guide with a flow-first cut:

1. **Foundation pass** (unchanged in spirit): scaffold-aware foundation tasks +
   shared data models + frozen contracts. These build first.
2. **Flow inventory**: from the PRD, enumerate **user flows** — a flow is a
   page/section + its primary interactions + the endpoints those interactions
   hit + the resulting effect. Derive from the PRD's interactive components
   (`PrdInteractiveComponent.interaction → effect`) and the page→endpoint map the
   current prompt already builds (`task-breakdown-agent.ts:125`).
3. **Cut one vertical per flow.** Each vertical owns its page(s), handlers,
   client calls, and the endpoints unique to that flow. CRUD on one resource
   that's exercised by one page = one vertical (page + all 5 endpoints + wiring),
   not split across Data/Backend/Frontend.
4. **Granularity bounds (budget gate).** A vertical must fit one coherent
   generation:
   - soft cap: ≤ ~6 endpoints **and** ≤ ~3 views per slice (reuse the existing
     6-endpoint / `MAX_VIEWS_PER_FRONTEND_TASK=3` numbers);
   - if a flow exceeds the cap, **sub-split along sub-flows** (e.g. "checkout:
     payment step" vs "checkout: confirmation step"), each still a complete
     chain — **never** split back into page-only / endpoint-only fragments.
5. **Shared-endpoint arbitration.** If two flows hit the same endpoint, the
   endpoint is implemented by the first/owning vertical (or promoted to a small
   shared "API foundation" task) and consumed (`owns:false`) by the others via
   the contract — exclusive ownership, like the subsystem rule.

---

## 6. Parallelism & dependencies

- **Foundation → verticals**, verticals run in **dependency layers**: a vertical
  that consumes another's endpoints depends on it; independent verticals run
  **concurrently**. This is the same DAG-layer execution the subsystem
  orchestrator already does (`orchestrate.ts`), just at the finer flow grain.
- We **keep parallelism across independent flows/domains** — we only stop
  parallelizing *the layers of one flow* (which is what broke the chain).
- Subsystem split (domain level) and vertical slicing (flow level) **compose**:
  domains partition the app; verticals are the units inside a domain.

---

## 7. Per-worker feedback loop (lean toward Cursor)

Coarser, fewer, cohesive tasks can afford a real loop:

- Raise the per-task self-verify budget for verticals (today
  `DEFAULT_WORKER_TSC_FIX_MAX_ATTEMPTS=1`, `agent-subgraph.ts`) to a few
  generate→typecheck→**run the slice's test**→fix iterations.
- The slice's `route-smoke` / interaction test (Phase 3b in
  `feature-coherence-plan.md`) now validates the **whole chain inside the slice**
  (click → API called with payload → effect) — which it can, because the slice
  owns the chain. Make it the slice's GREEN gate.
- This is the closest we get to the Cursor loop without full-repo agency: a
  bounded, slice-scoped run→see-error→fix cycle.

---

## 8. Integration glue (where the scaffold + contracts carry the load)

Coarser verticals mean fewer seams, but the seams that remain matter more:

- **Scaffold** stays the common foundation — `renderScaffoldFoundationBlock`
  (TRD) + the "scaffold utilities are CANONICAL" breakdown block
  (`task-breakdown-agent.ts:154`) still tell every slice "don't recreate the
  HTTP client / JWT / DB wiring".
- **Frozen contracts + shared types/models** are the inter-slice interface; a
  slice's `consumes.contracts` is read-only. `extract_real_contracts` feeds the
  real signatures so a consuming slice wires to the actual method.
- **scaffold-protected paths** still prevent slices from overwriting shared
  infra.

---

## 9. Relationship to existing mechanisms (they become safety nets)

| Mechanism | Today | Under vertical slicing |
|---|---|---|
| Frontend one-task-per-page (`:105`) | primary cut | **replaced** by flow-vertical cut |
| Backend-by-resource (`:98`) | primary cut | folded into the owning vertical (endpoints live with their flow) |
| Foundation task (`frontend-foundation-task.ts`) | partial cohesion patch | **promoted** to the explicit foundation phase |
| `split-multipage-tasks.ts` cap=3 | walk-back of over-split | becomes the slice granularity bound |
| wiring-audit / L3 judge | **primary** chain-completion mechanism | **safety net** (chain owned in-slice now) |
| subsystem split | domain grain | unchanged; verticals nest inside domains |

The win: chain completeness moves from *detect-and-repair after* to *owned by
construction*.

---

## 10. Rollout (phased, behind a flag)

> **Dispatch constraint discovered during implementation.** The supervisor
> worker dispatch is a **hardcoded two-phase pipeline**:
> `dispatchBackendAndTestWorkers` (backend+test) → contract barrier →
> `dispatchFrontendWorkers` (frontend), and `PHASE_TO_ROLE`
> (`supervisor/role-mapping.ts:13`) maps each task to a **single** role
> (Frontend→frontend, Backend Services→backend). So "page + its endpoints in
> one task" requires a **new `fullstack` worker role** AND an **additive
> dispatch path** in the supervisor graph — it is NOT a prompt-only change.
> The flag keeps it safe: with `BLUEPRINT_VERTICAL_SLICE` off, no `Feature`
> tasks are emitted and the new dispatch path never activates.

1. **P1 — vertical "Feature" slice + fullstack worker (flag-gated).** Concretely:
   - `types.ts`: add `"fullstack"` to `CodingAgentRole`.
   - `supervisor/role-mapping.ts`: `PHASE_TO_ROLE["Feature"] = "fullstack"`; add
     a `fullstack` bucket to every `byRole` literal.
   - `role-prompts.ts`: `buildFullstackPrompt` = frontend rules + backend rules
     for one flow (own the page, handlers, client calls, AND the endpoints +
     model usage the flow needs); add a `case "fullstack"`.
   - `state.ts` + `supervisor.ts`: a `fullstackTasks` bucket and an **additive**
     `dispatchFullstackWorkers` node, edged to run **after** foundation/shared
     models + contract extraction (a Feature slice consumes shared models and
     produces its own endpoints/contracts). Only fires when Feature tasks exist
     (i.e. only under the flag).
   - `task-breakdown-agent.ts`: behind `BLUEPRINT_VERTICAL_SLICE=1`, a
     `verticalSlicePhaseGuide()` that emits Foundation + Data-Layer/shared-models
     (architect) + one `Feature` task per user flow (page(s) + handlers + client
     + owned endpoints), replacing the one-task-per-page frontend guide.
     Horizontal `flatStackPhaseGuide()` stays the default fallback.
   - Validate half-done-rate drop on a few projects.
   - **Risk:** touches the supervisor graph (high blast radius); gate strictly,
     consider building/verifying in an isolated worktree.
2. **P2 — slice contract + granularity gate.** Add `verticalSlice` to the task
   shape; enforce the ≤6-endpoint / ≤3-view caps; shared-endpoint arbitration.
3. **P3 — slice-scoped feedback loop.** Raise the per-vertical verify budget;
   make the interaction test the GREEN gate.
4. **P4 — compose with subsystem layers** for L-tier (verticals inside domains).

Keep `wiring-audit` / L3 judge on as the safety net throughout.

---

## 11. Trade-offs & risks (honest)

- **Truncation / budget.** Coarser slices = bigger context+output → the very
  thing fragmentation avoided. Mitigate by scoping the slice's context to its
  flow (scaffold + the specific contracts/models it touches), not the whole PRD,
  and by the granularity cap. There IS a ceiling; a slice that can't fit must
  sub-split along sub-flows.
- **Model/contract consistency.** Keeping models+contracts as foundation (not
  per-vertical) avoids conflicting schemas; the cost is a foundation phase that
  must get the shared schema right up front (weak foundation → cross-slice
  breakage surfaces late, like today's Phase-3 integration gate).
- **Less intra-feature parallelism.** Accept it; preserve inter-flow/domain
  parallelism (the parallelism that mattered).
- **Breakdown prompt complexity.** Cutting by flow is harder for the LLM than
  "one task per page". Needs a new flow-first phase guide + examples, and the
  granularity gate as a deterministic backstop.
- **Endpoint ownership disputes.** Two flows sharing an endpoint needs the
  arbitration rule; otherwise duplicate endpoint implementations.

---

## 12. Open questions

1. Flow detection — drive purely from PRD interactive-components + page→endpoint
   map, or add a light LLM "flow inventory" pass before breakdown?
2. Foundation scope — do shared models belong to foundation (consistency) or to
   the first owning vertical (max ownership)? (Design leans foundation.)
3. Granularity numbers — are 6 endpoints / 3 views the right caps for a slice, or
   should the cap be output-token-estimate based?
4. How aggressively to raise the per-vertical verify budget before cost/latency
   outweighs the coherence gain.

---

*See also: `docs/feature-coherence-plan.md`, `docs/ddd-prd-to-coding-design.md`,
`docs/subsystem-build-design.md`.*
