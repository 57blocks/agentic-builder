# Prototype Step — generate previewable static frontend before kickoff

**Date:** 2026-06-26
**Branch:** feature/demo-html-capture
**Status:** Draft (pending user review)

---

## Overview

A new, **feature-gated** pipeline step — **"prototype"** — inserted **after TRD,
before kickoff**. When a demo URL is present, it:

1. Copies the **base tier scaffold** into the project output tree.
2. Writes the **frontend static code for every PRD-declared page** into it
   (port from captured demo HTML / a user-added URL / free-generate from
   DesignSpec).
3. Is **previewable** — it is a real scaffolded frontend app, so it runs via the
   existing app-server infra.

The generated frontend becomes the **actual code the coding phase later modifies**
(logic-wiring), instead of coding creating every page from scratch. The prototype
also serves as **context for task-breakdown**.

This is **sub-project 2** of the demo-driven frontend-fidelity initiative.
Sub-project 1 (demo HTML capture — `2026-06-26-demo-html-capture-design.md`) is the
upstream foundation that supplies the captured HTML this step ports from.

### Decomposition note

This spec covers the **prototype step itself** (generation + preview + the scaffold
split + the gating marker). The **downstream consumption** — making task-breakdown
and coding "prototype-aware" (plan/modify instead of create, idempotent scaffold) —
is **sub-project 3** and gets its own spec; the marker contract this step writes
(§7) is the interface between them.

---

## Source-of-truth precedence (reaffirmed) + gap-fill rules

The PRD is the single authoritative source of truth (see
`prd-single-source-of-truth` memory and the cross-cutting principle in the
sub-project 1 spec). For each PRD page, generation source is chosen in this order:

1. **Demo HTML captured** (sub-project 1, bound to the page's `PAGE-id`) → **port**
   it into idiomatic scaffold components.
2. **Demo missing the page, user adds a URL** → capture it (reuse the existing
   per-card URL fetch from sub-project 1) → port.
3. **No source at all** → **free-generate** the static page from the **DesignSpec**
   (`design` step output) + the PRD page spec.

In all cases the PRD wins on conflicts (page existence, fields, flows, copy,
behavior); the demo informs visual/structural fidelity only. Pages exist iff the
PRD declares them (`extractPrdPageHints`), never because the demo has them.

---

## Isolation = feature-gating (hard requirement)

User requirement: **this must not affect the existing flow/logic.** Because the
chosen model makes prototype pages the real frontend code coding modifies — which
*does* change coding/task-breakdown — isolation is achieved by **gating**:

> When no prototype was generated (no demo URL, or the step did not run), every
> downstream stage behaves **exactly as today**: scaffold is copied at coding time,
> frontend is created from scratch. All new behavior is conditional on the
> **prototype marker** (§7) existing.

No legacy code path is removed or altered in-place; new behavior is additive and
marker-gated.

### Isolation guarantees (made explicit after code review)

Verified against `src/_config/pipeline-flow.ts` + `PipelineBreadcrumb.tsx`:
`completedStepIds` is built **only** from individual steps whose `status ===
"completed"`, and `kickoff` `dependsOn: ["preparation"]` (the whole group). That
imposes three NON-NEGOTIABLE requirements so the existing flow is not affected:

1. **The step must auto-complete when there is no demo URL.** With no demo URL the
   step immediately records `status: "completed"` (rendered as "skipped") and writes
   **no** marker. It must NEVER sit in `idle/pending`, or it could block
   `preparation` → `kickoff` for every no-demo project. (This hardens the earlier
   "inert no-op" wording, which did not guarantee non-blocking.)
2. **Nothing may `dependsOn` the prototype step.** `kickoff` / `task-breakdown` /
   any node keep their existing `dependsOn`; only `prototype` itself gains
   `dependsOn: ["trd"]`. The step stays off everyone else's critical path.
3. **Downstream edits must be pure conditionals + a regression test.** Every
   load-bearing change (`coding/route.ts`, `copyScaffold`, task-breakdown) wraps the
   existing code in `if (markerExists) { …new… } else { …existing code, untouched… }`,
   guarded by a test asserting the **no-marker path is byte-for-byte today's
   behavior**.

**Residual, unavoidable change (honest disclosure):** because flow construction
(`getStepsForTier`) keys visibility off **tier only**, not project state, the step
cannot be fully hidden for no-demo projects without a larger change (threading
project state into flow building). So no-demo projects will show one extra,
auto-skipped step in the flow UI. This is a cosmetic flow change, not a logic one.
If even that is unacceptable, it is a separate (larger) sub-task — flagged, not
assumed.

---

## Pipeline placement

New `StepId: "prototype"` in the **preparation** stage, ordered **after
`tech-docs` (TRD)** and before the `kickoff` stage. It depends on `trd` (TRD must
exist) and reads the `design` step's DesignSpec/tokens (already produced earlier in
preparation).

- **Gate:** the step is only active when a demo URL is on record for the project
  (the same signal that drives sub-project 1 capture). With no demo URL the step is
  a no-op (renders an inert "no demo URL" state) and writes **no** marker → legacy
  flow downstream.
- Implemented with the standard 3-file step pattern (§8).

---

## The scaffold-copy split (key technical decision)

Scaffold copy currently runs at **coding time** (`coding/route.ts` →
`copyScaffold(tier, outputRoot, { forceOverwrite:true, resourceRequirements,
authDecision })`). It depends on **`resourceRequirements` + `authDecision`, which
are collected during kickoff** (env-setup / Setup Wizard). The prototype step runs
*before* kickoff, so those inputs do not exist yet.

Therefore scaffold copy is **split**, not moved wholesale:

- **Prototype step (pre-kickoff): copy the BASE scaffold only.** The base tier
  layout (`scaffolds/<tier>/frontend`, `backend`, root files) needs no kickoff
  input. The frontend subtree is what the step then fills with pages and previews.
  The `_optional/` auth/feature layers are **not** applied here (they need the
  kickoff auth decision).
- **Coding (post-kickoff): apply only the OPTIONAL/auth overlays**, and **do not
  re-copy or force-overwrite** the base scaffold or the prototype-generated frontend
  files (idempotency — see §7). This requires a `copyScaffold` option to apply
  optional layers without the base force-overwrite when a prototype marker is
  present (e.g. `{ baseAlreadyPresent: true }`), plus a preserve-list of
  prototype-generated files.

Tier resolution that today depends on `prdSignalsBackend` stays valid pre-kickoff
(PRD exists). The S→M scaffold promotion logic is reused unchanged.

---

## Page generation (the prototype agent)

A single new agent with three input modes (HTML-port / added-URL-port /
DesignSpec-freegen), producing files into the scaffold `frontend/` subtree.

**Two-phase to avoid per-page duplication and respect shadcn reuse:**

1. **Shared-shell pass** — inspect all captured pages together; extract shared
   chrome (nav, layout, repeated cards) into reusable components + the routing
   skeleton, generated once.
2. **Per-page pass** — for each PRD page, generate its route + page file composing
   the shared components. **Logic is stubbed**: static markup + placeholder data +
   inert handlers + explicit `// TODO(logic): …` seams so sub-project 3's modify
   tasks have clear insertion points.

Generation reuses the **same design-system / token / scaffold-component context**
the coding frontend worker uses (Tailwind v4 + tokens.css + pre-installed shadcn
set), so ported Tailwind classes from the demo map directly and free-generated
pages match the design system. No separate codegen engine is introduced.

---

## Preview

The prototype is a real scaffolded frontend, so preview = **run the scaffold's
frontend Vite dev server** (`frontend` package `dev: vite`) via the existing
**`app-server-manager` / `preview-server`** infra, surfaced in the prototype step's
UI. Backend is not required for a static-frontend preview. (Detailed wiring reuses
the preview stage's mechanism; no new server framework.)

---

## Artifacts & marker contract (interface to sub-project 3)

Everything lands in the **project output tree** (the same tree coding uses) so
coding modifies it in place:

- `frontend/**` — base scaffold + generated pages/components/routes.
- `.blueprint/prototype.json` — the **marker**: `{ generatedAt, scaffoldTier,
  scopeTier, baseScaffoldCopied: true, pages: [{ pageId, route, source:
  "demo-html"|"url"|"design-spec", file }], generatedFiles: string[] }`.

The marker is the gate every downstream stage checks. `generatedFiles` is the
preserve-list coding must not overwrite.

---

## Step implementation (3-file pattern)

- `_steps/preparation/prototype/{agent.ts, ui.tsx, snapshot.ts}` (folder placement
  TBD between tech-docs and a new sub-group; mirror existing groups).
- Register in `step-registry.ts`; add `"prototype"` to `StepId` and the
  `preparation` stage config in `_config/pipeline-flow.ts` with `dependsOn:
  ["trd"]`.
- API route under `src/app/api/agents/...` for the generation run (SSE like other
  agent steps).

---

## Error handling & edge cases

- **No demo URL** → step is an inert no-op, no marker, legacy flow downstream.
- **Some pages have no source** → free-generate from DesignSpec; never skip a
  PRD-declared page.
- **Scaffold base copy failure** → step fails loudly (no partial marker), legacy
  flow remains usable.
- **Coding idempotency** → with a marker present, coding applies optional/auth
  overlays only and preserves `generatedFiles`; without a marker, coding runs
  exactly as today (force-overwrite base + create pages).
- **Param routes / role-gated pages** → handled upstream by sub-project 1 capture
  (redirect guard, session seeding); pages with no usable capture fall back to
  DesignSpec free-gen.
- **PRD/demo page-set mismatch** → only PRD pages are generated; demo-only pages
  ignored.

---

## Testing

- **Unit — scaffold split**: base-only copy writes frontend/backend base, applies
  no `_optional`; coding overlay path with marker present applies optional layers
  and preserves the preserve-list (no clobber); without marker, behaves as today.
- **Unit — marker contract**: shape, `generatedFiles` round-trip, gate read by a
  downstream stub.
- **Unit — page-source selection**: demo-html > added-url > design-spec precedence;
  PRD-only page set.
- **Unit — prototype agent prompt assembly** (where deterministic): shared-shell +
  per-page composition, logic-stub seams present.
- **Manual / integration acceptance**: run on a project with `csma-demo2` demo —
  verify base scaffold + all PRD pages generated, prototype previews in the browser,
  marker written; then run coding and confirm it modifies (does not recreate) the
  pages and does not clobber generated files; and confirm a project with **no** demo
  URL is byte-for-byte unchanged in behavior (legacy path).

---

## Sequencing & risks (review pass)

- **Sub-projects 2 and 3 are tightly coupled — ship together.** This step writes
  the prototype frontend + marker, but the payoff (coding *modifies* it) only lands
  with sub-project 3. Worse: today coding runs `copyScaffold({ forceOverwrite:true })`
  and creates pages from scratch — **without the sub-project-3 idempotency guard it
  would clobber the prototype frontend** (harmless = falls back to legacy output, but
  the prototype work is wasted). Therefore either (a) deliver 2+3 together, or (b)
  include the coding-side idempotency guard (marker check + preserve-list) **inside**
  sub-project 2's scope. **Recommend (b)**: fold the minimal coding guard into this
  step so it is self-protecting even before the full port-aware breakdown lands.
- **Generation cost/scale.** A large PRD (L-tier, 40+ pages) means a long, expensive
  per-page LLM run. Mitigations to design into the agent: the shared-shell pass
  first (amortizes chrome), per-page generation in bounded parallel batches, a
  page-count budget/cap with explicit `log()` of any truncation, and resumability
  (skip pages already generated per the marker).
- **Overlap with the existing `mockup` (Stitch) step.** `mockup` already produces a
  frontend design artifact. This step produces *runnable scaffolded code*. They are
  not the same output, but the relationship must be explicit: does prototype consume
  the mockup, run alongside it, or supersede it for the "has-demo-URL" path? **Open
  — must be resolved before implementation** (see open question 5).

## Open questions / decisions flagged for review

1. **Coding idempotency mechanism** — preferred: marker + `copyScaffold({
   baseAlreadyPresent })` + `generatedFiles` preserve-list. Alternative: a cleanup
   step that re-copies base but restores generated files. (Recommend the marker
   approach.)
2. **Shared-component extraction** — recommend the two-phase port (shared-shell then
   per-page). Acceptable, or keep v1 per-page only and dedupe later?
3. **Free-gen for no-source pages** — recommend reusing the existing frontend-worker
   design-system context inside the prototype agent (one agent, three modes) rather
   than a separate generator. Confirm.
4. **Folder/sub-group** for the new step under `preparation` (naming only).
5. **`mockup` step relationship** — consume / coexist / supersede on the has-demo
   path. Must be resolved before implementation.
