# Agentic Builder vs. Claude Code vs. Cursor — A Coding-Level Comparison

> Scope: the **coding** experience and output, not pricing, IDE polish, or
> ecosystem. Observations are grounded in a real end-to-end run of Agentic
> Builder generating a 12-domain, ~38-page full-stack app (the "CSMA" project),
> plus a full debugging session done *with Claude Code on Agentic Builder's own
> codebase*.

## 0. They are not the same category

The single most important framing: **these tools do different jobs.**

| | What it is | Operating mode |
|---|---|---|
| **Agentic Builder (AB)** | A spec-driven **app factory / pipeline**: PRD → TRD → scaffold → per-domain codegen → TDD → integration gates → a runnable full-stack app | Autonomous, fire-and-forget (hours, unattended) |
| **Claude Code (CC)** | A terminal-based **agentic coding assistant** (tool use, agentic search, scriptable) | Interactive, human-in-the-loop |
| **Cursor** | An **IDE-integrated coding assistant** (tab/inline edits, agent mode, codebase index) | Interactive, human-in-the-loop |

AB is best understood as a *layer above* an agent loop — it orchestrates many
worker agents under a fixed pipeline. CC/Cursor are *general-purpose* assistants
you drive. Comparing them at the coding level is really comparing **"generate
the whole app from a spec"** against **"help me code in my repo right now."**

---

## 1. Capability matrix (coding level)

| Dimension | Agentic Builder | Claude Code | Cursor |
|---|---|---|---|
| Greenfield 0→1 full-stack generation | ★★★★★ | ★★☆ | ★★☆ |
| Brownfield (work in an existing/large repo) | ★☆ | ★★★★★ | ★★★★★ |
| Architectural / contract enforcement (built-in) | ★★★★★ | ★★ (only if instructed) | ★★ |
| Human edit/steer of **prep** output (PRD/TRD/design) | ★★★★★ (fully editable, chat or direct) | ★★★★★ | ★★★★★ |
| Human steer **during coding** | ★☆ (fully autonomous **by design**) | ★★★★★ | ★★★★★ |
| Transparency / observability of actions | ★★ | ★★★★★ | ★★★★ |
| Built-in, spec-traceable testing (TDD/smoke/E2E) | ★★★★★ | ★★★ (on request) | ★★★ |
| DDD-style domain decomposition (built-in) | ★★★★★ | ★☆ | ★☆ |
| Context strategy for large codebases | ★★★★ (domain slicing) | ★★★★ (agentic search) | ★★★★ (index + retrieval) |
| Output reliability / "ready to run" | ★★ (needs cleanup) | ★★★★ | ★★★★ |
| Design/UI fidelity tooling | ★★★★ (reference pipeline) | ★☆ | ★★ |
| Flexibility (any language/task) | ★★ (pipeline-bound) | ★★★★★ | ★★★★★ |
| Cost control (per-stage model routing) | ★★★★ (cheap models per step) | ★★★ | ★★★ |

Stars are a coarse, opinionated read from this session — directional, not a benchmark.

---

## 2. Where Agentic Builder genuinely wins

### 2.1 Autonomous, spec-to-app generation at scale
AB took a PRD and produced a 12-domain full-stack codebase (backend + frontend,
~239 BE / ~190 FE source files) with **no human in the loop for hours**. CC and
Cursor cannot do "turn this PRD into the whole app while I'm away" — they assist
on increments you supervise.

### 2.2 Built-in architectural & contract discipline (the biggest differentiator)
AB *enforces* cross-cutting consistency that, with CC/Cursor, a human has to
maintain by hand on every change:

- **Single source of truth for the API contract.** The TRD authors an
  `ENDPOINTS` registry; `API_CONTRACTS.json` is **derived deterministically**
  from it (no LLM re-authoring from the PRD), so frontend client, backend
  handlers, and contracts cannot drift.
- **Shared schema** that both sides import rather than redefine.
- **Subsystem decomposition by business domain** (auth, billing, scheduling, …),
  each built against its own contracts + dependency contracts.
- **Tiered scaffolds (S/M/L) + optional feature packs** (e.g. password-RBAC auth)
  applied conditionally — a consistent, opinionated substrate every run starts from.
- **Convention cards / route registries** that keep routing and module wiring uniform.

CC/Cursor have *no* built-in notion of "this app has one canonical endpoint
registry"; they'll happily let two files define the same shape differently
unless the human notices.

### 2.3 Context engineering for big builds
- **Per-domain PRD slicing**: each coding worker receives only its domain's
  `domain-{id}.md` slice (verified: ~34% smaller combined slices, single-domain
  much smaller) instead of the full multi-hundred-KB PRD.
- **File-conflict-aware parallelism**: workers fan out by union-find over file +
  dependency conflicts — independent tasks run in parallel, coupled ones stay
  serial in one worker.

This is a *structural* context strategy purpose-built for generating large,
coherent codebases.

### 2.4 Built-in, multi-stage verification
AB tries to deliver a **running, verified** app, not just code:
- TDD **red → green** (write failing tests first, then implement).
- **Runtime smoke gate that actually boots the backend** and probes `/api/health`
  + real endpoints.
- **Integration / route / contract-completeness audits**, with **deterministic
  repair rules** (e.g. wiring a `start*Worker` the server forgot to call).

CC/Cursor run tests when asked, but have no equivalent always-on, boots-the-app
verification pipeline.

### 2.5 Design-fidelity tooling
A reference-screenshot pipeline (capture by URL, extract CSS tokens, map to PRD
routes, generate a design system) — an attempt to match a target UI that CC/Cursor
don't provide out of the box.

### 2.6 Human-in-the-loop at every stage *except* coding (by design)
A common misconception is that AB is a black box. It isn't: the entire
**preparation pipeline is interactive and fully editable** — PRD → TRD → System
Design → Implementation Guide → Design Spec → QA → Verify. Each artifact is
generated, then the human can **revise it via chat or edit it directly** before
moving on (e.g. change the tier, tweak requirements, redo the design, adjust the
contract). Every step's output is a checkpoint you can shape.

**Only the coding phase is deliberately fully autonomous** — once the specs are
locked, AB takes over and builds unattended. So the right mental model is *not*
"black-box generator" but **"interactively authored specs → one hands-off coding
run."** The steerability gap (Section 3.2) is therefore narrow: it applies *only*
to the coding phase, which is autonomous on purpose; the rest is as steerable as
any chat tool.

### 2.7 DDD-style domain decomposition (a genuine innovation)
AB applies **Domain-Driven Design to AI codegen, automatically.** A large PRD is
decomposed into **business domains / bounded contexts** (auth, catalog,
enrollment, billing, scheduling, approvals, …), and that decomposition drives the
whole build:

- **Bounded contexts**: each domain (`domain-{id}.md`) owns its slice of the spec,
  its entities, and its endpoints.
- **Context mapping**: cross-domain dependencies are expressed as **frozen
  contracts** between domains, so one domain builds against another's interface,
  not its internals.
- **Ubiquitous language**: a single `shared-schema.ts` + `ENDPOINTS` registry is
  the shared vocabulary every domain derives from.
- **It drives execution, not just docs**: the decomposition scopes (a) per-domain
  context slicing, (b) file-conflict-aware parallelism, and (c) per-domain build +
  integration gates.

Doing DDD decomposition *automatically from a PRD* and using it as the backbone
for context, parallelism, and verification is something neither CC nor Cursor
attempts — they operate at the file/repo level with no domain model.

### 2.8 Spec-traceable, multi-layer testing (built in)
AB's testing is a pipeline, not an afterthought:

- **TDD red → green**: tests are written **first** and must **fail before**
  implementation; a "red" test that passes too early is flagged as invalid and
  **regenerated** (it proves nothing). After implementation, the **green** phase
  must pass.
- **Requirement traceability**: tests are expected to cite the PRD requirement
  ids they cover (`coversRequirementIds`), and a TDD review lints for it — so
  tests map back to the spec, not just to code.
- **Runtime smoke that boots the real backend** and probes `/api/health` + real
  endpoints (not a mock).
- **PRD-derived E2E**: browser journeys generated from the PRD, grouped by route,
  with a gate that passes only on deterministic green (flaky/infra failures are
  quarantined, not counted as pass).
- **Integration / route / contract-completeness audits** with deterministic
  auto-repair rules.

CC/Cursor will write and run tests competently *when you ask*, but they don't
impose red-then-green discipline, requirement traceability, or a boots-the-app
smoke + E2E gate as a standing part of every build.

### 2.9 Cost is *controlled*, not high — via per-stage model routing
AB routes each pipeline stage to an appropriate model (e.g. a cheaper/faster
model for task breakdown, codegen, or E2E generation, reserving stronger models
where they matter). Because most of the high-volume work runs on cheaper models,
the **total spend for generating a whole app can be lower than expected** — often
cheaper per unit of delivered code than driving a single top-tier model
interactively through the same scope. (Latency is still long in wall-clock terms
because the *scope* is a whole app, but $/output is optimized by the routing.)

---

## 3. Where Agentic Builder loses (all observed this session)

### 3.1 Greenfield-only; useless for brownfield
AB generates new apps from a scaffold; it cannot meaningfully "assist on your
existing/foreign codebase." The proof: **when AB's own run broke, we debugged
and fixed it using Claude Code** — navigating a large unfamiliar TS codebase,
tracing logs, patching modules. AB could not have done that meta-work.

### 3.2 The (deliberately) autonomous coding phase has weak failure handling
To be clear: this is *not* "AB is an un-steerable black box" — the prep pipeline
is fully interactive and editable (Section 2.6). The gap is narrower and specific
to the **one phase that is autonomous by design — coding**. When that phase hits a
wall it doesn't fix, it spins instead of escalating: the integration gate emitted
**24 stagnation warnings and burned ~45 no-mutation iterations** before exhausting
its fallback/replan budget — all without pausing to ask the human. The autonomy is
the intended tradeoff; the weakness is that its *failure mode* is "spin silently"
rather than "stop and surface a clear, human-actionable problem." (An interactive
tool can't spin like this because a human is watching every step.)

### 3.3 Brittle at infrastructure / config seams
The whole run stalled because the generated `backend/.env` was unbootable:
- `TIMESCALE_DISABLED=1` was dropped from the runtime `.env` (only the
  `.env.example` had it) → `CREATE EXTENSION timescaledb` crashed boot on plain
  Postgres.
- A TDD phase blanks `DATABASE_URL` (backing it up to `.env.tdd-bak`) and a
  killed/restarted run left it blank.

Crucially, the **LLM self-heal loop is (correctly) barred from editing `.env`**
(it can't invent secrets), so it had **no lever** to fix an env-induced boot
failure → it stagnated. The fix we added (a deterministic *boot-error doctor*:
restore secrets from backup, set *knowable* switches like `TIMESCALE_DISABLED`
from the error, retry) is exactly the kind of seam AB had left open.

### 3.4 Output completeness / correctness is not yet reliable
The autonomous output needed real cleanup before it could run:
- Only **17 of ~38 pages** were generated → many routes 404'd.
- Backend wouldn't boot (the env issues above).
- **81 of 120** TDD green tests failed; 148 endpoints undeclared in the route audit.

The promise ("a full app from a PRD") vs. reality ("a partial app that needs a
human to finish") is the most honest weakness. CC/Cursor produce smaller but
more correct increments precisely because a human verifies each step.

### 3.5 Weak observability
- The UI didn't even show per-task "running" status during coding (an SSE
  forwarding gap in subsystem mode) — work was happening but invisible.
- Understanding *why* the run looped required hand-parsing `.ralph/repair-log.jsonl`.

CC/Cursor make every action visible and trivially interruptible.

### 3.6 Long wall-clock and all-or-nothing within the coding phase
This is about *time and salvageability*, not money — cost is actually optimized
by per-stage model routing (Section 2.9). The coding run is hours of wall-clock
because the scope is a whole app, and once it's running there's limited ability to
intervene mid-flight or to salvage a partial result without internal knowledge.
Combined with 3.2, a stuck coding run can burn a lot of wall-clock before it's
clear it needs a human.

---

## 4. Where Claude Code & Cursor win (coding level)

- **Brownfield mastery.** Navigate, understand, and edit large existing codebases
  surgically — their home turf, and AB's blind spot.
- **Tight human feedback loop.** Catch and correct mistakes immediately; never
  spin for 45 iterations.
- **Transparency & control.** Every edit/command is visible and reversible;
  interrupt anytime.
- **Flexibility.** Any language, framework, or task — not bound to a fixed
  PRD→app pipeline.
- **Ergonomics.** Cursor: in-IDE inline edits, tab completion, codebase index,
  multi-file agent edits. Claude Code: terminal-native agent, rich tool use,
  scriptable/automatable, hooks.

What they *lack* vs AB: no built-in app-generation pipeline, no enforced
architecture/contract layer, no always-on boots-the-app verification, no design
pipeline — you (the human) are that layer.

---

## 5. When to reach for which

- **"Turn this PRD into a new full-stack app"** → Agentic Builder.
- **"Work in / extend / debug an existing codebase"** → Claude Code or Cursor.
- **"AB generated something and it's broken / needs polish"** → Claude Code or
  Cursor (as we did all session).
- **Best combined workflow**: AB for the 0→1 scaffold + domain generation, then a
  human with CC/Cursor to finish, verify, and harden the output.

---

## 6. What would most improve Agentic Builder (priorities from this run)

1. **Observability**: surface per-task status reliably; make "why is it looping"
   legible without log spelunking.
2. **Interruptibility / steerability**: a clean way to pause, inspect, and
   redirect a run; salvage partial output.
3. **Infra/config self-healing**: deterministic, error-driven `.env`/boot repair
   for *knowable* config (the boot-error doctor pattern), distinct from secrets
   which must be provisioned/restored, never invented.
4. **Generation completeness gates**: don't declare "done" with 17/38 pages or a
   backend that never booted; make page/route/boot coverage hard, surfaced gates.
5. **Loop convergence**: detect non-converging gates early (the integration
   stagnation) and fail loud + actionable instead of burning the budget silently.

---

## 7. One-line takeaway

Agentic Builder is **not** a black box and **not** more expensive — the specs are
authored interactively (PRD/TRD/design are all editable via chat), and per-stage
model routing keeps cost optimized. What it trades is **hands-off autonomy in the
single coding phase** for **DDD-decomposed, contract-enforced, spec-traceable-test
verified, whole-app generation**. It is not a better Claude Code or Cursor — it is
an **app factory built on top of an agent loop**, with genuine innovations
(automatic domain decomposition, derived single-source contracts, red→green +
boots-the-app verification). Its frontier is narrow and specific: the **coding
phase's** failure handling, observability, infra-seam self-healing, and output
completeness. Tellingly, when that one autonomous phase jams, you still reach for
an interactive assistant to get it running — which is exactly how this session went.
