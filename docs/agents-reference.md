# Agents Reference — Roles, Inputs and Outputs

> A reference guide to every LLM agent inside **AgenticBuilder**, organised by
> pipeline stage. For each agent: what problem it solves, what it consumes,
> what it produces, what its system prompt enforces, and what contracts the
> rest of the system relies on.
>
> Last updated: 2026-05-28

---

## 0. Pipeline at a Glance

```
 User brief
    │
    ▼
┌──────────┐   ┌──────┐   ┌─────────────────────────────────────┐
│  INTENT  │──▶│  PM  │──▶│             ARCHITECT               │
│  gap     │   │ PRD  │   │  TRD → Reviewer → AuthDecider       │
│  check   │   │ gen  │   │  → SysDesign → ImplGuide            │
└──────────┘   └──────┘   └─────────────────────────────────────┘
                                       │
                                       ▼
┌──────────┐  ┌──────────┐  ┌──────────────────────────────────┐
│  DESIGN  │  │  KICKOFF │  │  SETUP                           │
│  Design  │  │ Resource │  │  SetupMdGenerator                │
│  Mockup  │  │ Detector │  │  ParseTrdEnv / EnvKeyCatalog     │
│  Pencil  │  │ TaskBrk  │  │                                  │
└──────────┘  │ CodeGen  │  └──────────────────────────────────┘
              └──────────┘
                   │
                   ▼
┌──────────────────────┐   ┌──────────────────────┐
│         QA           │──▶│      CODE-CHAT       │
│  QAAgent             │   │  AgentLoop (read,    │
│  VerifierAgent       │   │  list, grep, edit,   │
│                      │   │  write — sandboxed)  │
└──────────────────────┘   └──────────────────────┘
```

Every agent extends a common `BaseAgent` class, takes structured input from
upstream artifacts (PRD, TRD, …), and emits a downstream artifact (Markdown
document, JSON object, code file map, or a stream of events). The shape of
each artifact is a *contract* — downstream agents and validators rely on it
being well-formed.

---

## 1. Shared Infrastructure

These three modules underpin every agent in the pipeline.

### 1.1 BaseAgent (`shared/base-agent.ts`)

**Role.** Foundation class for every agent. Wraps the LLM provider (OpenRouter
or DeepSeek-direct) and provides a uniform invocation surface.

**Responsibilities.**

- Synchronous (`run`) and streaming (`streamRun`) execution paths.
- Structured message construction: `system` prompt (immutable per agent)
  followed by `user` content and optional `additionalContext`.
- Execution metadata: cost, duration, token usage, traceId — all bundled into
  the `AgentResult` contract returned to callers.
- Streams reasoning traces separately from final content so that clients with
  "thinking" UIs can display chain-of-thought without contaminating the
  artifact.
- Optional `customChatCompletion` / `customStreamRun` overrides so agents that
  speak a non-standard protocol (DeepSeek direct, Pencil MCP) can plug in
  their own dispatcher.

**Configuration contract (`AgentConfig`).**

| Field | Notes |
|---|---|
| `name`, `role`, `systemPrompt` | Immutable identity. |
| `defaultModel` | `string` or `string[]`; an array becomes a fallback chain. |
| `temperature`, `maxTokens`, `thinking` | Optional sampling overrides. |
| `customChatCompletion`, `customStreamRun` | Override the built-in OpenRouter call. |

**Output contract (`AgentResult`).**

```ts
{
  content: string;          // final LLM output
  model: string;            // model that actually answered
  costUsd?: number;
  durationMs: number;
  usage?: { promptTokens, completionTokens, totalTokens };
  traceId?: string;
  evidence?: Evidence[];    // self-attested completion claims
}
```

The `evidence` array is the substrate for the *evidence system* — an agent can
declare things like `"PRD covers users-and-roles dimension"`, which downstream
validation gates can require before advancing.

### 1.2 DocAgentSettings (`shared/doc-agent-settings.ts`)

**Role.** Centralised token-budget resolution for long-document agents.

A single helper, `resolveDocMaxTokens(envName, defaults)`, picks between the
conservative OpenRouter ceiling (8K–32K) and the larger DeepSeek-direct
ceiling (24K–96K) based on `LLM_PROVIDER`. Used by every "produce a big
document" agent: PM, TRD, SysDesign, ImplGuide, Design, QA, Verifier.

### 1.3 ProjectClassifier (`project-classifier.ts`)

**Role.** Decide the project's complexity *tier* — `S`, `M`, or `L` — which
all downstream agents key off.

| Tier | Shape |
|---|---|
| **S** | Single-page apps, utilities, browser-only. No backend or trivial API. |
| **M** | Full-stack with one backend service, single DB, basic auth. *Default.* |
| **L** | Multi-service platform with RBAC, audit, observability, workers. |

**Mechanism.**

- LLM-driven classification cached by SHA-256 of the brief + prompt version.
- The PRD can carry a literal badge `**Project Tier: [SML]**` that takes
  precedence over re-classification (user override).
- Returns a `ProjectClassification` object with the tier plus boolean flags
  (`needsBackend`, `needsDatabase`, `needsAuth`, etc.) consumed by every
  agent that branches on tier.

---

## 2. Intent Stage

### 2.1 PRDIntentAgent (`intent/prd-intent-agent.ts`)

**Role.** Before the PRD is written, run a two-pass gap analysis on the
user's raw feature brief so that the PM agent receives a complete,
disambiguated input.

**Where it sits.** First agent. Triggered when the user submits a brief.

**Inputs.**

- The feature brief (free-form prose).
- The fixed list of 10 PRD dimensions from `gap-checklist.ts`:
  users-and-roles, auth, external-data, retention, audit, notifications,
  admin-config, ops, scale, explicit-non-goals.

**Output — `IntentResult`.**

```ts
{
  coverage: Array<{
    dimension: string;
    status: "asked" | "answered_in_input" | "not_applicable";
    question?: ClarificationQuestion;   // when status === "asked"
  }>;
  extras: ClarificationQuestion[];      // up to 25 specificity questions
  meta: { model, cost, duration, promptVersion };
}
```

A `ClarificationQuestion` has a `type` (`single_select` / `multi_select` /
`text` / `yes_no`), `rationale`, `category`, and — for select types —
options including exactly one `default: true`.

**System prompt — two passes.**

- **Pass A (Coverage).** For each of the 10 fixed dimensions, decide whether
  the brief answers it. If not, emit one cross-cutting question.
- **Pass B (Specificity).** Scan the brief for named concepts (RQ-1,
  variables, entities, roles, screens, APIs, KPIs, workflows). For each
  concept check 7 operational facts: provenance, credential, cadence, format,
  dependencies, validation, ownership. Emit a targeted question for each gap.

**Quality rules baked into the prompt.**

- Use the domain language of the brief, not generic phrasing.
- Prefer `single_select` with 3–5 finite options and exactly one default.
- Provide a one-sentence rationale per question.
- Budget: ≤ 10 coverage questions + ≤ 25 extras (total ≤ 35).

**Model config.** `temp=0.2`, `max_tokens=16 384`, `response_format=json_object`.

**Validation.**

- Defensive JSON parsing — malformed output falls back to an empty result
  rather than throwing.
- Question `type` is normalised to the allowed set.
- Single-select / yes-no questions are forced to have exactly one default.
- Items marked `"asked"` without a payload are demoted to
  `"answered_in_input"`.

**Downstream.** The UI renders coverage + extras as a survey; the user's
answers are formatted by `format-answers.ts` and prepended to the PM agent's
`additionalContext`.

### 2.2 GapChecklist (`intent/gap-checklist.ts`)

Not an agent — a data module. Exports `PRD_DIMENSIONS` (10), `TRD_DIMENSIONS`
(11: deployment, packaging, database, cache/queue, vendors, mail, LLM,
observability, CI/CD, constraints, secrets), and `dimensionsForStage(stage)`.

### 2.3 FormatAnswers (`intent/format-answers.ts`)

Not an agent — a renderer. Turns `IntentResult` + the user's selections into
a Markdown block:

```markdown
## User-confirmed product clarifications

- **Will admins be able to invite users?**
  → Yes
  → Detail: admins receive a one-time invite link by email
```

The block is prepended to PM's `additionalContext` so the LLM sees the
answers as binding requirements, not suggestions.

---

## 3. PM Stage

### 3.1 PMAgent (`pm/pm-agent.ts`)

**Role.** Author a full PRD from the brief plus the intent-survey answers.

**Inputs.**

- Original feature brief.
- `IntentResult` + the user's `ClarificationAnswer[]` (formatted by
  `format-answers.ts`).
- Project tier — optional user override in the Wizard, defaults to `M`.

**Output.** Markdown PRD, 1 200 – 3 000+ words, with a tier-specific
structure. Three distinct prompts live in `pm-agent.ts`
(`PROMPT_TIER_S`, `PROMPT_TIER_M`, `PROMPT_TIER_L`); the agent picks one
based on the resolved tier.

| Tier | Required sections |
|---|---|
| **S** | Overview · Core Features · Pages & Screens · Interaction Table · Mermaid Diagram · User Flow · Acceptance Criteria · Technical Constraints |
| **M** | Adds Executive Summary · Problem & Solution · Goals / Non-Goals · Feature Requirements (FR-* IDs) · Interaction Index · User Stories (US-*) · Acceptance Criteria |
| **L** | Adds RACI · detailed personas · per-feature acceptance criteria · comprehensive technical requirements |

Every tier shares two structural elements:

- An **Interaction Component table** with the columns
  `| ID | Page | Component | Type | User interaction | Effect |`. This table
  is the canonical source for the downstream Mockup and CodeGen agents.
- A **Mermaid diagram** (`flowchart LR` or `TD`) showing inter-page
  navigation. The prompt explicitly tells the model to wrap labels with
  special characters in double quotes (`A["Node (text)"]`) because Mermaid
  rejects unquoted parentheses.

**Model config.** `temp=0.5`; `max_tokens` 8K / 12K / 16K for S / M / L via
`resolveDocMaxTokens`; `thinking: docGenerationThinking()`.

**Notable contracts.**

- **Tier badge.** PRD must emit `**Project Tier: [SML]**` near the top so
  the TRD agent and Kickoff stage can extract it without re-classifying.
- **Requirement IDs.** Feature requirements use `FR-XX##`, e.g.
  `FR-DASH01`. The pattern is `\bFR-[A-Z]+\d+\b` — the regex used by the
  TRD reviewer, by `prdRequirementIndex`, and by the incremental-rerun
  diff. Two-letter prefixes are common; the agent is allowed any uppercase
  prefix of length ≥ 1.
- **Acceptance criteria** must be binary pass/fail and testable, never
  vague.

### 3.2 PrdPatch (`pm/prd-patch.ts`)

Not an agent — a section-level patcher. `applyPrdPatches(existingPrd,
patches[])` locates a heading like `### 5.1 Monitor Dashboard`, replaces
everything down to the next same-or-higher heading, and wraps the changed
block in `<div class="prd-changed-section">` so the UI can highlight what
moved. Used when the user manually edits a PRD section.

---

## 4. Architect Stage

The Architect stage takes a confirmed PRD and produces the technical
contract the rest of the pipeline obeys.

### 4.1 TRDAgent (`architect/trd-agent.ts`)

**Role.** Turn the PRD into a comprehensive Technical Requirements
Document.

**Inputs.** PRD, project tier, optional reviewer feedback (for iterative
refinement).

**Output.** Markdown TRD with seven mandatory sections (tier-dependent
sub-sections):

1. **Technology Stack** — table of `Layer | Technology | Rationale`.
2. **Frontend Architecture** — 2.1 Shell · 2.2 Rendering · 2.3 State · 2.4
   Plugin SDK.
3. **Backend Architecture** — 3.1 Services table · 3.2 Data models · 3.3
   API Specification · 3.4 File formats · 3.5 Operator CLI *(conditional)*.
4. **Security Requirements** — table of `Area | Requirement |
   Implementation`.
5. **Non-Functional Targets** — `Category | Metric | Target`; sub-section
   5.X **Deployment Artifacts** lists *concrete file paths*.
6. **Shared Schema** — a TypeScript code block
   (`file:shared/schema.ts`) with every entity interface and every
   endpoint's request / response types. **No `any`.**
7. **Business Rules DSL** *(conditional)* — YAML block
   (`file:business-rules.dsl.yaml`) mapping PRD metric IDs (e.g. `MC-1`,
   `RQ-1`) to normalisation rules.

**System prompt highlights.**

- **Tier alignment is non-negotiable.** The prompt forbids downgrading the
  stack relative to the declared tier.
- **Deployment artifacts must be concrete.** Not "Docker" — actual paths
  like `Dockerfile`, `docker/nginx.conf`, `docker/supervisord.conf`,
  `docker-compose.yml`, `docker-compose.prod.yml`, `deploy.sh`,
  `restore-db.sh`. When the PRD mentions a specific tool (supervisord,
  SSH-based deploy, etc.) the corresponding row is elevated to **Required**.
- **§3.5 Operator CLI** appears only when the PRD lists operator / admin
  maintenance actions (force-rescore, override, re-fetch). Each action
  maps to a script under `backend/scripts/` with a CLI usage line and a
  documented side-effect. A shared wrapper `backend/src/lib/cli-audit.ts`
  is mandatory.
- **§7 Business Rules DSL** appears only when the product is
  metrics-or-scoring-heavy. Rule IDs in the YAML must match PRD IDs
  *verbatim* — `MC-1`, not `MARKET_CAP_1`.

**Model config.** `temp=0.2`; `max_tokens` 16K (OpenRouter) – 32K
(DeepSeek direct); `thinking: docGenerationThinking()`.

**Operational contracts the TRD must encode.**

- **Auth decision contract.** The TRD must note that auth mode obeys the
  persisted `AuthDecision`, not silently pick Magic Link.
- **Runtime boot contract.** If the TRD describes workers / queues /
  pipelines, it *must* state that `backend/src/server.ts` imports and
  starts every exported `start*Worker` function at boot.
- **Resource env contract.** Literal environment variable names
  (`COINGECKO_API_KEY`, `SMTP_HOST`, etc.) for every external service
  named.
- **Seed-data isolation.** If source freshness or scoring data is
  UI-visible, the TRD must forbid seed/demo data from marking external
  sources as healthy.
- **Source health semantics.** `source_feeds` / `ingestion_runs` are
  updated only by real jobs, with distinct states: `not-configured`,
  `stale`, `failed`, `demo`, `healthy`.

### 4.2 TRDReviewerAgent (`architect/trd-reviewer-agent.ts`)

**Role.** Cross-vendor critic of the TRD output. Catches blockers before
code generation burns time on a flawed spec.

**Inputs.** Original PRD, freshly generated TRD, project tier.

**Output — `TrdReviewResult`.**

```ts
{
  overall: { score: 1..10, summary: string };
  dimensions: Array<{
    name: string;            // one of 12 fixed dimensions
    score: 1..10;
    evidence: string;
    suggestions: string[];
  }>;
  blockers: Array<{ severity: "high"|"medium"|"low"; description: string }>;
  improvements: Array<{ description: string }>;
  meta: { model, promptVersion, cost, duration };
}
```

**The 12 fixed dimensions** (each graded 1 – 10).

1. **tier-consistency** — declared tier reflected in stack choices.
2. **per-source-granularity** — separate pipelines per data source when
   cadences differ.
3. **deployment-artifacts** — concrete file paths, not vague phrases.
4. **schema-completeness** — every entity / endpoint has request /
   response types.
5. **normalization-formulas** — metrics-heavy products have per-variable
   rules.
6. **identifier-consistency** — TRD IDs match PRD verbatim or are
   explicitly marked `[TRD-NEW]`.
7. **stack-appropriateness** — right-sized for PRD constraints (no
   Kubernetes for a PoC).
8. **runtime-boot-contract** — workers explicitly required in `server.ts`
   boot.
9. **resource-env-contract** — literal env keys for every named vendor.
10. **seed-data-isolation** — demo data forbidden from marking real
    sources healthy.
11. **source-health-semantics** — `source_feeds` / `ingestion_runs`
    updated only by real jobs.
12. **auth-decision-alignment** — auth mode respects persisted decision.

A dimension can score 10 with the evidence "not applicable" (e.g. Tier S
has no per-source DAG). The prompt also enforces priority: at most 8
blockers and 12 improvements.

**Model config.** `MODEL_CONFIG.trdReviewer` (deliberately a different
model than `TRDAgent` for a fresh perspective); `temp=0.2`; `max_tokens=
8 192`; `response_format=json_object`.

**Mandatory high-severity blockers.** The prompt explicitly demands
high-severity blockers for missing `runtime-boot-contract` when the PRD
has workers, missing literal env keys when the PRD names external
providers, and missing seed-data isolation / source-health semantics when
the UI shows source freshness or scoring.

### 4.3 AuthDeciderAgent (`architect/auth-decider-agent.ts`)

**Role.** Pick exactly one authentication mode from three options.

**Inputs.** PRD (required), TRD (optional).

**Output — `AuthDecision`.**

```ts
{
  mode: "password-rbac" | "magic-link" | "privy";
  rationale: string;       // one sentence of PRD evidence
  confidence: "high" | "medium" | "low";
  // Derived deterministically from `mode` — the LLM is never trusted with these:
  seedAccounts: SeedAccount[];
  rbacRoles: string[];
  requiredEnvKeys: string[];
  scaffold: string;        // template id
}
```

**Mode selection heuristics.**

- **password-rbac** — multiple roles, internal tool, back-office, or
  silent / vague on auth. *Tie-breaker default.*
- **magic-link** — PRD explicitly says "passwordless" / "magic link" /
  single-role consumer app.
- **privy** — multiple social providers, Web3 / wallet login, or explicit
  Privy mention.

**Fallback chain.** LLM → keyword heuristic → default `password-rbac`. The
final decision is always returned, even if the LLM fails.

**Model config.** `MODEL_CONFIG.taskBreakdown` (lightweight, deterministic);
`temp=0.1`; `max_tokens=1024`.

**Hydration contract.** The `mode` field alone determines
`seedAccounts`, `rbacRoles`, `requiredEnvKeys`, and `scaffold` — these are
filled in by deterministic code after the LLM returns. The LLM cannot
override them.

### 4.4 SysDesignAgent (`architect/sysdesign-agent.ts`)

**Role.** Bridge TRD choices to concrete architectural decisions.

**Inputs.** PRD, TRD.

**Output.** Markdown System Design Document, 2 000 – 4 000 words.

Required sections:

1. **High-Level Architecture** — ASCII diagram of Client / Application /
   Data planes.
2. **Core System Flows** — numbered steps with latency budgets (P50, P99)
   and error handling.
3. **Conflict Resolution / Consistency Strategy** — scenario table.
4. **Rendering / Processing Pipeline** *(if applicable)*.
5. **Scalability & Deployment** — Kubernetes / container spec, self-host
   profiles.
6. **Observability** — signals, tools, metrics.
7. **Data Flow Diagram** — end-to-end lifecycle.

**Style constraints.** Every decision states the trade-off considered.
ASCII diagrams only, no image links. References TRD service names so the
two documents are cross-checkable.

**Model config.** `temp=0.5`; `max_tokens` 16K – 49K via
`resolveDocMaxTokens`.

### 4.5 ImplGuideAgent (`architect/implguide-agent.ts`)

**Role.** Produce a phased, step-by-step Implementation Guide for
engineers — the document that downstream task-breakdown reads.

**Inputs.** PRD, TRD, SysDesign.

**Output.** Markdown Implementation Guide, 1 500 – 3 000 words.

Structure:

- **Phase 0 — Project Scaffolding** — directory tree, scaffold commands.
- **Phases 1 … N — Foundation, Core Features, …** — each with day range,
  file paths, commands, and explicit acceptance-criteria checkboxes.
- **Phase N — Testing & Launch** — launch checklist.

**Style constraints.** Every phase has a day range. Every phase has
explicit acceptance criteria. Directory trees are inlined for new folders.
Env-var tables are intentionally omitted (they live in the README, not the
guide). Boilerplate is skipped — only the critical path is documented.

**Model config.** `temp=0.4`; `max_tokens` 16K – 49K via
`resolveDocMaxTokens`.

### 4.6 TRD supporting validators

These are *not* standalone agents but lightweight rule-based validators
that run after the TRD or TRD-reviewer:

- **`trd-rules-validator.ts`** — regex shape check for §7 Business Rules
  DSL (version, rule ids, rule types). Advisory only.
- **`dag-validator.ts`** — validates §8 Workflow DAG. Detects cycles,
  dangling `dependsOn`. Cross-checks node service names against §3.1.
  Advisory only.
- **`trd-contract-validator.ts`** — enforces the five operational
  contracts (runtime-boot, resource-env, seed-data-isolation,
  source-health-semantics, auth-decision-alignment) and provides
  deterministic augmentation of resource requirements based on text
  scanning of PRD / TRD.

---

## 5. Design Stage

The Design stage has three alternative agents — they share inputs but
produce different artifacts, and the user picks which one to run.

### 5.1 DesignAgent (`design/design-agent.ts`)

**Role.** Generate a complete, self-contained HTML Design System document
that downstream coding tasks use as the visual source of truth. The
deep-dive on the recall path that feeds this agent lives in
[design-knowledge-base.md](design-knowledge-base.md).

**Inputs.** PRD (full Markdown), optional reference image (base-64),
optional `additionalContext` (the recalled design-knowledge block, see
the design knowledge base doc).

**Output.** A single HTML file, self-contained. The required sections —
the prompt enumerates them as a numbered list — are:

1. Left fixed TOC sidebar (220 px wide).
2. Hero section — product name, description, style badges.
3. **Color System** — CSS `:root` tokens with swatches.
4. **Typography** — font pairs, scale table.
5. **Spacing** — visual scale (4 px base).
6. **Radius** — sm / md / lg with demos.
7. **Shadows** — visual demos.
8. **Components** — buttons, badges, inputs, tabs, cards, KPI grid, data
   table, alert feed.
9. **Page Patterns** — sidebar nav, top-bar, domain-specific patterns.
10. **CSS Token Quick Reference** — the `:root { … }` block as code.

**System prompt — hard rules.**

- Output ONLY HTML. No preamble, no code fences. The first character
  must be `<`.
- Embed all CSS inline in a `<style>` tag.
- Embed all JS inline in a `<script>` tag.
- Load fonts only from the Google Fonts CDN (`Inter` + `Fira Code`).
- Live HTML only — no screenshots, no "placeholder" copy.
- Token names are domain-semantic (e.g. `--risk-high`, `--status-success`)
  derived from the PRD, not generic `--primary-1`.
- Every component demo shows all states side-by-side: default, hover,
  active, disabled, error.
- Section budget guidance: 10 % colour, 10 % typography, 10 % spacing /
  radius / shadows, 40 % components, 20 % patterns, 10 % token reference.

**Model config.** `MODEL_CONFIG.design`; `temp=0.7`; `max_tokens` 32K – 96K
via `resolveDocMaxTokens`; streaming supported.

**Vision-augmented mode.** An alternative entry point
`generateDesignWithReferenceImage(prd, base64Image, context)` ships the
image through OpenRouter's vision API and instructs the model to extract a
palette / typography / spacing / aesthetic before generating the HTML.

### 5.2 MockupAgent (`design/mockup-agent.ts`)

**Role.** Turn the Design System spec into a working React + Tailwind
mockup so designers and stakeholders can click through pages before any
real backend exists.

**Inputs.** The Design System document, the PRD, optional Pencil notes.

**Output.** A JSON object inside a ```json``` code block mapping file
paths to full source files:

```
pages/index.tsx          → home page
pages/<other>.tsx        → other pages
components/<Name>.tsx    → shared components
lib/mock-data.ts         → all mock data, inline
README.md                → setup instructions
```

**Tech contract.**

- React 18 + TypeScript + Tailwind CSS v3 (className only — no CSS
  modules, no styled-components).
- Animations via `motion` (the framer-motion successor).
- Dark theme: `bg-zinc-950` / `text-zinc-100`; accent `indigo-500`.
- Loading states use a consistent `Spinner` (zinc-600 border, indigo
  accent).
- Mock data is inline — *no `fetch()` calls*. Mocks live in
  `lib/mock-data.ts` so they're swappable.
- All interactive controls are real: `useState` / `useReducer` / Zustand
  back every input, modal, and counter.

**Model config.** `MODEL_CONFIG.mockup`; `temp=0.4`; `max_tokens=16 384`.

### 5.3 PencilAgent (`design/pencil-agent.ts`)

**Role.** When visual precision matters more than mockup interactivity,
this agent drives the Pencil MCP protocol to produce a `.pen` design
file.

**Inputs.** PRD, optional reference image, session context.

**Output.** A `.pen` file (encrypted; accessed only through Pencil MCP
tools). Internally serialised as a `DesignOperation[]` of
Insert / Update / Copy / Delete / Move ops, batched at 500 ms intervals
to respect Pencil API rate limits.

**Coordination.** Uses `runWithPencilMcpExclusive` to ensure single-
threaded access; if structured JSON parsing fails it falls back to
raw-script parsing.

---

## 6. Kickoff Stage

The kickoff stage converts the design + spec into an executable plan and
then generates the code.

### 6.1 ResourceDetectorAgent (`kickoff/resource-detector-agent.ts`)

**Role.** Identify every external service / credential the generated app
will need. The output drives the Wizard's resource-collection screen.

**Inputs.** PRD; optionally TRD, SysDesign, ImplGuide.

**Output — `ResourceRequirement[]`** (strict JSON, possibly empty):

```ts
{
  envKey: "STRIPE_SECRET_KEY",
  label: "Stripe Secret Key",
  description: "Server-side key for payment intents and refunds.",
  category: "payment",
  required: true,
  example: "sk_test_...",
  docsUrl: "https://...",
  isConfig?: false        // true means "configuration switch", not a secret
}
```

**Hard prompt rules.**

- **LLM bundle (critical).** If the PRD mentions *any* LLM feature,
  always emit all four of:
  - `LLM_PROVIDER` (`isConfig: true`) — `openai` / `gemini` / `anthropic` /
    `openrouter`
  - `LLM_API_KEY` (required) — provider-agnostic
  - `LLM_BASE_URL` (`isConfig: true`, optional)
  - `LLM_MODEL` (`isConfig: true`, required) — e.g. `gpt-4o-mini`

  Never emit `OPENAI_API_KEY` / `GEMINI_API_KEY` / `ANTHROPIC_API_KEY`
  separately.
- **Background jobs.** Emit `USE_REDIS_QUEUE` (`isConfig: true`) whenever
  the PRD describes queues / workers.
- **OAuth.** Emit `GOOGLE_CLIENT_ID` + `VITE_GOOGLE_CLIENT_ID` (public) +
  `GOOGLE_CLIENT_SECRET` (private) as separate entries.
- **Privy.** Emit `VITE_PRIVY_APP_ID` only if the PRD explicitly names
  Privy.
- **Reserved keys never emitted:** `DATABASE_URL`, `JWT_SECRET`,
  `JWT_EXPIRES_IN`, `NODE_ENV`, `PORT`, `HOST`.

**Model config.** `MODEL_CONFIG.taskBreakdown`; `temp=0.1`;
`max_tokens=4096`. Uses `chatCompletionWithFallback` for resilience.

**Post-processing.** A deterministic
`augmentResourceRequirementsFromDocuments()` pass applies regex
fallbacks for known vendors (CoinGecko, Quotient, X / Twitter, Jina,
SMTP, …). If the LLM forgets a key but the TRD mentions the vendor, the
augment pass fills the gap.

### 6.2 TaskBreakdownAgent (`kickoff/task-breakdown-agent.ts`)

**Role.** Plan the work — produce a phased task list that drives every
subsequent CodeGen invocation.

**Inputs.** PRD, TRD, SysDesign, ImplGuide, tier, optional existing tasks
(for incremental regeneration), optional improvement notes.

**Output — `TaskBreakdownResult`.**

```ts
{
  tasks: Array<{
    id: "task-001",
    title: "Implement Dashboard view",
    phase: "Frontend",
    description: "...",
    estimate: "2d",
    coversRequirementIds: ["FR-DASH01", "US-01"],
    files: { reads: string[], creates: string[], modifies: string[] },
    subSteps: string[],
    tddPlan?: { tests: Array<{ name, type, intent }> }
  }>,
  phases: ["Scaffolding", "Data Layer", ...],
  totalEstimate: "10d",
  reasoning: "..."
}
```

**Tier-specific style.**

- **S** — fewer, broader tasks when the PRD is thin. Scaffolding + core
  feature.
- **M** — stack is **Vite + React + Ant Design** frontend, **Koa +
  Sequelize + PostgreSQL** backend. **Never Next.js.** Tasks: one broad
  Data Layer, one Backend Services, Frontend app-shell + page-level tasks.
- **L** — same stack as M, plus the production layer: workers, BullMQ
  queue, `pino` logger, rate limiting, docker-compose. **Each background
  job is ONE task** that bundles (a) worker file (b) registration (c)
  endpoints (d) UI consumer (e) structured logging (f) `runId`
  pass-through.

**Hard split rules.**

- **Multi-API pipeline rule.** If a feature integrates more than three
  external HTTP APIs, split into at least three tasks:
  1. External API client layer.
  2. Pipeline orchestration / business logic.
  3. HTTP routes + SSE / queue wiring.
- Task descriptions may *never* say "use mock data" or "TODO: replace with
  API". All data must come from real API calls.

**Canonical scaffold utilities.** The prompt explicitly forbids re-planning
these — they exist in the scaffold and must be imported:

- `frontend/src/api/client.ts` — the only HTTP client.
- `backend/src/types/koa.d.ts` — Koa `ctx.request.body` global augmentation.
- `backend/src/utils/jwt.ts` — `signJwt` / `verifyJwt`.
- `backend/src/utils/narrow.ts` — `parseEnumLiteral` / `asRecord`.
- `backend/src/middlewares/errorHandler.ts`, `.cors.ts`.

**Frontend-page mandate.** Each frontend-page task description (or at
least one of its `subSteps`) must list every backend API endpoint the page
reads or writes, e.g. `GET /api/projects`, `POST /api/projects`. Phrases
like "use mock data" or "hardcode data" are forbidden.

**Incremental mode.** When `existingTasks` is provided, regenerate only
those covering `requirementsToCover` IDs; do not duplicate existing tasks.
This is the agent that powers the *PRD-edit → task-breakdown re-run*
flow described in [[incremental-rerun-initiative]].

**Model config.** `MODEL_CONFIG.taskBreakdown` with fallback chain;
`temp=0.3`; `max_tokens=16 384`. Optional reasoning / thinking flags via
`TASK_BREAKDOWN_ENABLE_REASONING` and `TASK_BREAKDOWN_ENABLE_THINKING`.

**Contracts.**

- Every task's `coversRequirementIds` must match real PRD `FR-` / `US-` /
  `AC-` IDs.
- Every P0 / P1 task must include a `tddPlan.tests[]` array.
- `task.files` lists exact paths — the CodeGen agent uses these as a
  checklist.

### 6.3 CodeGenAgent (`kickoff/code-gen-agent.ts`)

**Role.** Execute a single task — actually write the code.

The agent is instantiated *per role*: `architect`, `frontend`, `backend`,
or `test`. Each role has its own system prompt with role-specific contracts.

**Inputs.** A task spec from `TaskBreakdownAgent`, the full document
context (PRD / TRD / SysDesign / ImplGuide), optional Design System HTML
(for token alignment), optional previous file content (for modify tasks).

**Output.** A file map embedded as ```file:path``` code-fence blocks:

```
```file:frontend/src/pages/Dashboard.tsx
// full source code here
```
```

**Per-role contracts.**

**Architect role.**

- Generates scaffolding, config files, foundational infrastructure
  (`package.json`, `tsconfig.json`, `docker-compose.yml`, DB schemas,
  migrations, API route skeletons, middleware, env templates, CI / CD).
- Koa request-body augmentation already exists in scaffold — never
  re-declare.
- React component return types are inferred or written as
  `React.JSX.Element`, never the bare `JSX.Element`.

**Frontend role.**

- Every interactive control must work — no dead buttons or links.
  - `<button>` has an `onClick` or sits inside a `<form onSubmit>`.
  - Links use `<Link to="…">` or `useNavigate()`.
  - Inputs / toggles / selects are controlled with `useState` +
    `onChange`.
  - Timers / counters / modals use real state.
  - Every `CMP-*` from the PRD interaction table must be implemented.
- If Pencil design tokens are provided, the agent uses arbitrary Tailwind
  values for *exact* fidelity: `bg-[#1E293B]`, `w-[720px]`, `gap-[24px]`,
  `text-[20px]`, `rounded-[16px]`.
- Canonical API client only — `frontend/src/api/client.ts`. Never create
  a parallel `frontend/src/utils/apiClient.ts`.
- `useEffect` is never annotated `(): void =>` — return type inference
  is required so a cleanup function can be returned.

**Backend role.**

- Read Koa body as `const body = ctx.request.body;` (typed `unknown` by
  scaffold augmentation), validate with a Joi schema before consuming,
  never duplicate the type augmentation.
- `validateBody(schema)` is applied *only* to `POST` / `PUT` / `PATCH` /
  `DELETE`, never `GET`.
- Handler naming matches verb: `GET → list / get / fetch`, `POST →
  create`, `PUT / PATCH → update`, `DELETE → remove / delete`.
- Each domain owns one `registerXxxRoutes(apiRouter: Router): void`
  function.
- JWT helpers come from `backend/src/utils/jwt.ts`; never call
  `jsonwebtoken` directly. `JWT_SECRET` is read only inside that file.
- Sequelize models use the `declare` keyword to avoid class-field
  shadowing: `declare id: string;`. Required fields (`allowNull: false`)
  appear in the create DTO; system-managed fields (`id`, `createdAt`,
  `updatedAt`) never appear.
- Enum narrowing uses `parseEnumLiteral(value, [...])` from
  `utils/narrow.ts` — never unchecked `as` casts.

**Test role.**

- Generates unit tests (Vitest), integration tests, component tests
  (`@testing-library/react`), end-to-end tests (Playwright), and k6 load
  tests.
- Follows the `tddPlan.tests[]` from the task spec — each planned test
  becomes a real test.

**Model config (all roles).** `primaryModel(MODEL_CONFIG.codeGen)` with
provider-aware dispatch via `invokeCodegenOrOpenRouter`; `temp=0.3`;
`max_tokens=16 384`.

**Cross-role contracts.**

- Output is *only* ```file:path``` blocks — no surrounding prose.
- Never plan an `npm install` / `pip install`. If a dep is missing, edit
  `package.json`.
- Both frontend and backend import from `shared/schema.ts`; never
  redefine types.
- API-response DTOs are never aliased to broad entity types
  (`type MeResponseDto = User` is forbidden).

### 6.4 ResourceRequirementAugment (`kickoff/resource-requirement-augment.ts`)

Not an agent — a deterministic post-pass for `ResourceDetectorAgent`.
Scans PRD / TRD text for vendor keywords (CoinGecko, Jina, SMTP, etc.)
and emits any env-key requirements the LLM missed. This is the safety net
that catches cases where the LLM produces a TRD that names a vendor but
forgets to add the corresponding env key.

---

## 7. Setup Stage

These three modules are deterministic — no LLM calls — but they assemble
the artefacts that ship with the generated project.

### 7.1 SetupMdGenerator (`setup/setup-md-generator.ts`)

**Role.** Generate `SETUP.md` for the generated project.

**Inputs — `SetupMdInput`.**

```ts
{
  projectName: string;            // from PRD line 1
  infraChoice: "bundled" | "byo"; // docker-compose vs bring-your-own
  keys: SetupKeyEntry[];          // { key, state, hint? }
}
```

**Output.** Markdown `SETUP.md` with five sections:

1. **Quick start** — `docker-compose up`, migrations, `pnpm dev`.
2. **Infrastructure** — bundled vs BYO: PostgreSQL 16 + TimescaleDB +
   Redis 7.
3. **Credentials by category** — auto-generated, vendor, auth, deploy.
4. **Per-key details** — feature served, signup URL, skip behaviour.
5. **How to fill skipped keys later** — edit `.env`, lazy adapters
   reload.

**Key states.** `provided` (user supplied), `skipped` (user deferred),
`auto` (generated by scaffold), `deferred` (optional, fill later).

**Security contract.** Hints are masked — `sk_test_...` shows format only,
never an actual secret.

### 7.2 ParseTrdEnv (`setup/parse-trd-env.ts`)

**Role.** Pull env-key declarations out of a TRD.

Scans for `.env` / `bash` / `shell` / `ini` fences and matches lines
against `^[ \t]*([A-Z][A-Z0-9_]{2,})[ \t]*=`. Filters false positives
(`NOTE=`, `TODO=`, `TBD=`, `FIXME=`). Returns keys in discovery order
with duplicates removed.

### 7.3 EnvKeyCatalog (`setup/env-key-catalog.ts`)

**Role.** Centralised metadata for every known env key.

`getEnvKeyMeta(key)` returns:

```ts
{
  key: string;
  category: "auto" | "vendor" | "auth" | "deploy";
  feature: string;        // what feature needs it
  signupUrl?: string;
  freeTierOk?: boolean;
  skipBehavior: string;   // what happens if the key is left empty
}
```

Categories:

- **auto** — generated by scaffold (`DATABASE_URL`, `JWT_SECRET`).
- **vendor** — third-party API keys (`STRIPE_SECRET_KEY`,
  `OPENAI_API_KEY`).
- **auth** — mail / auth provider keys (`GOOGLE_CLIENT_ID`,
  `RESEND_API_KEY`).
- **deploy** — optional deployment keys (`AWS_ACCESS_KEY_ID` for S3,
  `SSH_KEY` for `deploy.sh`).

---

## 8. QA Stage — the "Test Agents"

The QA stage has **two complementary agents**. The user-facing label
"test agent" maps to the pair: `QAAgent` produces the test *plan* and
audit, `VerifierAgent` produces the drift / alignment analysis. **Neither
of them executes tests at runtime** — execution happens later, in the
generated project or via the code-chat assistant. Understanding the
boundary is important, so this section is intentionally the longest.

### 8.1 QAAgent (`qa/qa-agent.ts`)

#### 8.1.1 Role

`QAAgent` is a **static QA reviewer** that ingests the PRD and the
generated Design and produces an audit report + a comprehensive test
plan. It is the closest thing AgenticBuilder has to a dedicated Test
Agent in the pipeline, but its job is to *plan and audit*, not to
*execute*.

#### 8.1.2 Where it sits

After the Design stage (Design System and / or Mockup are in hand) and
before the verifier. Conceptually it answers two questions:

1. *Is the design complete enough to satisfy every PRD requirement?*
2. *What test cases will we need once code is generated?*

The test plan it emits is the spec that the `test`-role CodeGen agent
implements later.

#### 8.1.3 Inputs

- PRD (full Markdown).
- Design specification — the Design System HTML or the Mockup JSON file
  map (or both).

#### 8.1.4 Output — `AUDIT.json`

Wrapped in a ```json``` fence, the JSON has this shape:

```ts
{
  auditId: string;
  timestamp: string;            // ISO-8601
  prdVersion: string;           // hash
  designVersion: string;        // hash
  summary: {
    totalChecks: number;
    passed: number;
    warnings: number;
    failures: number;
    coverage: number;           // percent of PRD requirements covered
  };
  checks: Array<{
    id: string;
    category: "functional" | "ui" | "accessibility" | "security" | "performance";
    requirement: string;        // PRD ref, e.g. "FR-DASH01"
    status: "pass" | "warn" | "fail";
    detail: string;
    testCase: { given: string; when: string; then: string };
  }>;
  testPlan: Array<{
    suite: string;
    cases: Array<{
      id: string;
      title: string;
      type: "unit" | "integration" | "e2e";
      priority: "P0" | "P1" | "P2";
      steps: string[];
      expected: string;
    }>;
  }>;
  recommendations: string[];
}
```

#### 8.1.5 System prompt

The system prompt frames the agent as a *QA architect*:

- **Coverage.** Every acceptance criterion in the PRD must appear in at
  least one check or test case.
- **Drift detection.** Compare the design against the PRD requirements;
  flag any UI element / page that exists in one but not the other.
- **Edge cases.** Generate test cases for error scenarios, boundary
  conditions, and degraded states.
- **Inconsistency flagging.** Catch PRD ↔ Design misalignments.
- **Target.** ≥ 80 % requirement coverage.

#### 8.1.6 Check categories

| Category | What it covers |
|---|---|
| `functional` | Core features, user stories, acceptance criteria |
| `ui` | Visual layout, component states, responsive behaviour |
| `accessibility` | WCAG, keyboard navigation, screen-reader support |
| `security` | Auth, authz, injection prevention, CSRF, data protection |
| `performance` | Load times, responsiveness, scalability |

#### 8.1.7 Test priority tiers

| Priority | Meaning |
|---|---|
| `P0` | Critical user paths and core functionality. Signup, the main workflow. |
| `P1` | Important features, edge cases, error handling. |
| `P2` | Nice-to-have, optional features, optimisation. |

`P0` / `P1` cases bind to the Test-role CodeGen agent's `tddPlan`.

#### 8.1.8 Model configuration

| Setting | Value |
|---|---|
| Model | `MODEL_CONFIG.qa` |
| Temperature | `0.3` |
| Max tokens | 8K (OpenRouter) – 24K (DeepSeek direct) |
| Thinking | `docGenerationThinking()` |
| Streaming | yes — `onChunk` callback supported |

#### 8.1.9 What QAAgent does NOT do

This is the crucial part. The QAAgent is a *planner and auditor*, not a
test runner:

- **No `npm run`.** It does not execute any shell commands.
- **No Vitest invocation.** Unit tests are not run.
- **No Playwright run.** End-to-end tests are not run.
- **No build / type-check.** It does not invoke the TypeScript compiler.
- **No HTTP requests.** It does not call any APIs.

Test *execution* happens in three other places:

1. **Test-role CodeGen** writes the actual test files from the
   `testPlan` and `tddPlan`.
2. **Generated project's CI** runs `pnpm test`, `pnpm build`, etc. once
   the user actually uses the scaffolded scripts.
3. **Code-chat AgentLoop** can be asked to read failing tests and
   propose fixes (still without executing the tests itself — it reads
   and edits, never runs).

#### 8.1.10 What QAAgent does catch

In practice, the audit surfaces:

- **Missing requirement coverage** — a PRD `FR-` ID with no matching
  design page / component.
- **Vague acceptance criteria** — criteria that are not binary
  pass/fail.
- **Underspecified test cases** — vague steps, missing expected
  outcomes.
- **Design ↔ PRD drift** — interactions in the PRD's interaction table
  that don't appear in the design.
- **Accessibility gaps** — missing focus states, no keyboard navigation
  affordance, absent ARIA labels.
- **Security gaps in design** — missing auth gates on flows that the PRD
  says require auth.

#### 8.1.11 Persistence

`AUDIT.json` is held in memory during the QA stage and surfaced in the
Wizard UI. It is *not* persisted to disk during this stage — the report
is advisory. If the user proceeds, the `testPlan` is read by the
`TaskBreakdownAgent` to seed each task's `tddPlan`, and from there
becomes real test files via the Test-role CodeGen.

### 8.2 VerifierAgent (`qa/verifier-agent.ts`)

#### 8.2.1 Role

Where `QAAgent` audits depth (every requirement → test case),
`VerifierAgent` audits *breadth*: it computes an overall alignment score
between PRD and Design, and produces a single recommendation for whether
to proceed, revise, or escalate.

#### 8.2.2 Inputs

- PRD (full Markdown).
- Design specification (Design System HTML or Mockup JSON).
- Optional session context.

#### 8.2.3 Output — Drift Analysis Report (Markdown)

```markdown
# Drift Analysis Report

## Alignment Score: 87%

## Coverage Matrix
| PRD Requirement | Design Coverage | Status | Notes |
| --- | --- | --- | --- |
| FR-DASH01 | DashboardPage + KpiCard | covered | — |
| FR-DASH02 | (missing)              | gap     | needs filter chips |

## Drift Detected
### Critical (blocks pipeline)
- …

### Warning (needs attention)
- …

### Info (minor observation)
- …

## Correction Suggestions
1. Add a filter-chip row to DashboardPage to satisfy FR-DASH02.
2. …

## Recommendation
PROCEED
```

#### 8.2.4 Verification process

The system prompt instructs the model to:

1. Parse PRD functional requirements (P0 / P1 / P2 features, user
   stories, acceptance criteria).
2. Map each requirement to design elements (pages, components,
   interactions).
3. Identify gaps, contradictions, unaddressed requirements.
4. Score alignment 0 – 100 %.
5. Generate correction suggestions.

#### 8.2.5 Scoring thresholds

| Score | Recommendation |
|---|---|
| ≥ 95 % | `PROCEED` (high confidence) |
| 85 – 95 % | `PROCEED` with warnings |
| 70 – 85 % | `REVISE_DESIGN` |
| < 70 % | `ESCALATE_TO_HUMAN` |

#### 8.2.6 Drift severity

| Severity | Definition |
|---|---|
| **Critical** | Design is missing a core PRD feature, contradicts PRD intent, or breaks a user story. |
| **Warning** | Design is incomplete, needs clarification, or shows minor inconsistency. |
| **Info** | Observation only; no action required. |

#### 8.2.7 Model configuration

| Setting | Value |
|---|---|
| Model | `MODEL_CONFIG.verify` |
| Temperature | `0.2` |
| Max tokens | 8K – 24K via `resolveDocMaxTokens` |
| Thinking | `docGenerationThinking()` |
| Context | Long-context optimised — both full PRD and full design pass in |

#### 8.2.8 QA vs Verifier — a one-line summary

- **QAAgent** = "did we write enough test cases?" — depth, per-requirement.
- **VerifierAgent** = "do PRD and Design tell the same story?" — breadth,
  whole-picture, with a single binary recommendation.

The two are not redundant. QAAgent's audit can pass even if the design
contradicts the PRD on a structural level — VerifierAgent catches that.
Conversely, VerifierAgent can give a high alignment score even if the
test plan is shallow — QAAgent enforces that.

---

## 9. Code-Chat Stage

This is the post-generation assistant — the agent the user talks to when
the generated project has a bug or needs a refinement.

### 9.1 AgentLoop (`code-chat/agent-loop.ts`)

**Role.** Drive an interactive coding loop that can read, search, and
edit files inside the generated project.

**Inputs.**

- Chat history (`ChatMessage[]`).
- Tool handler context (`appDir` path + session context).
- Optional model override (defaults to `anthropic/claude-sonnet-4`).
- Optional abort signal for user cancellation.

**Output.** A stream of `CodeChatEvent`:

- `assistant_delta` — assistant prose delta.
- `thinking_delta` — reasoning trace delta (Claude extended thinking).
- `tool_call_start` / `tool_call_args_delta` — tool invocation progress.
- `tool_result` — tool completion result.
- `done` — total iteration count.
- `error` — failure message.

**Loop mechanics.**

- Hard cap of **20 iterations** to prevent infinite loops.
- The model reads / edits via tool calls; outputs and tool calls are
  appended to the message list in place.
- Loop terminates on `finish_reason != "tool_calls"` (the model says it's
  done), reaching `MAX_ITERATIONS`, user cancel, or two consecutive
  empty-tool turns.

**Tool forcing.** If the model narrates without calling tools
(`finish_reason != "tool_calls"`), the next turn forces
`tool_choice: "required"`. After two consecutive empty-tool turns the
loop emits an error: *"Model produced N consecutive replies without
using any tool — try a stronger model."*

**Halfway nudge.** At iteration 10, a system message is inserted: *"You
have 10 turns remaining. If you are still investigating, switch to
editing now."*

**Model configuration.** Default `anthropic/claude-sonnet-4`;
`temp=0.2`; `max_tokens=4096` per turn; `reasoning: { enabled: true }`.
Crucially, `forceOpenRouter: true` — DeepSeek direct emits a different
`tool_calls` delta shape that breaks the streaming UI, so this agent
always goes through OpenRouter.

### 9.2 SystemPrompt (`code-chat/system-prompt.ts`)

The constant `CODE_CHAT_SYSTEM_PROMPT` defines the assistant's behaviour:

- Start by reading files; never guess paths.
- Make the smallest correct fix; prefer `edit_file` over `write_file`.
- After each edit, explain WHAT and WHY in 1 – 2 sentences (the diff is
  shown automatically).
- Batch read / grep calls per turn; don't one-by-one.
- Take action via tool calls; don't narrate intentions without acting.
- Keep prose short between tool calls.
- Never install packages, run shells, or start servers.

### 9.3 ToolDefs (`code-chat/tool-defs.ts`)

Five tools, all read or file-edit, no shell:

1. **`read_file` { path }** — `MAX_READ_BYTES = 200K`.
2. **`list_files` { dir? }** — recursive; `MAX_LIST_ENTRIES = 500`.
3. **`grep` { pattern, path? }** — substring or regex;
   `MAX_GREP_MATCHES = 80`.
4. **`edit_file` { path, oldText, newText, replaceAll? }** — replace
   exact snippet; fails if `oldText` is not unique unless
   `replaceAll=true`.
5. **`write_file` { path, content }** — create or overwrite.

Ignored directories during `list_files` / `grep`: `node_modules`, `.git`,
`dist`, `build`, `.next`, `.turbo`, `coverage`, `.vite`.

### 9.4 ToolHandlers (`code-chat/tool-handlers.ts`)

Per-tool implementations against the filesystem. Every result follows
the shape:

```ts
{
  ok: boolean;
  summary: string;        // short — for streaming events
  modelContent: string;   // full result returned to the model
  fileEdit?: { id, path, before, after };
  preview?: string;       // first lines for UI
}
```

All paths are resolved via `resolveSandboxedPath()` before being touched.

### 9.5 PathSandbox (`code-chat/path-sandbox.ts`)

Hardened path resolver:

- Reject absolute paths (`path.isAbsolute()`).
- Normalise and reject any `..` segments.
- Verify the resolved path starts with the project root plus a path
  separator.

Returns `{ abs, normalized }`. Any violation throws and the tool call
fails — so the code-chat assistant is structurally incapable of reading
`/etc/passwd` or writing outside the project.

---

## 10. Top-Level / Misc

### 10.1 Root re-exports

`agents/task-breakdown-agent.ts` and `agents/code-gen-agent.ts` are one-
line re-exports from `./kickoff/...`:

```ts
export { TaskBreakdownAgent } from "./kickoff/task-breakdown-agent";
export { CodeGenAgent }       from "./kickoff/code-gen-agent";
```

These are convenience exports for pipeline orchestration code that
imports from the package root. They are *not* legacy or duplicates.

### 10.2 ProjectClassifier (`agents/project-classifier.ts`)

Shared classifier module — documented in §1.3.

---

## 11. Summary Table

| Agent | Stage | Inputs | Outputs | Model / temp / max tokens | Key contract |
|---|---|---|---|---|---|
| PRDIntentAgent | Intent | brief | `IntentResult` (coverage + extras) | `qa`-ish / `0.2` / `16 384` | ≤ 35 questions; one default per single-select |
| PMAgent | PM | brief + intent answers | PRD Markdown (tier-specific) | `pm` / `0.5` / 8 – 16K | Tier badge; FR-XX IDs; Mermaid |
| TRDAgent | Architect | PRD + tier | TRD Markdown (7 sections) | `trd` / `0.2` / 16 – 32K | Tier alignment; `schema.ts`; deployment artifacts; operational contracts |
| TRDReviewerAgent | Architect | PRD + TRD | `TrdReviewResult` (12 dims) | `trdReviewer` / `0.2` / `8 192` | ≤ 8 blockers, ≤ 12 improvements |
| AuthDeciderAgent | Architect | PRD | `AuthDecision` | `taskBreakdown` / `0.1` / `1024` | LLM → heuristic → default fallback |
| SysDesignAgent | Architect | PRD + TRD | System Design Markdown | `sysdesign` / `0.5` / 16 – 49K | Architecture diagram + latency budgets |
| ImplGuideAgent | Architect | PRD + TRD + SysDesign | Implementation Guide Markdown | `implguide` / `0.4` / 16 – 49K | Phased; explicit acceptance criteria |
| DesignAgent | Design | PRD (+ ref image, + recall block) | Self-contained HTML Design System | `design` / `0.7` / 32 – 96K | 9 mandatory sections; live HTML only |
| MockupAgent | Design | Design + PRD | JSON file map (React + Tailwind) | `mockup` / `0.4` / `16 384` | Inline mocks; all interactions real |
| PencilAgent | Design | PRD | `.pen` file via Pencil MCP | `pencil` | Exclusive access; rate-limited batches |
| ResourceDetectorAgent | Kickoff | PRD + docs | `ResourceRequirement[]` | `taskBreakdown` / `0.1` / `4096` | LLM-bundle of 4 keys; reserved keys excluded |
| TaskBreakdownAgent | Kickoff | PRD + TRD + SD + IG + tier | `TaskBreakdownResult` | `taskBreakdown` / `0.3` / `16 384` | Multi-API split rule; TDD plan mandatory |
| CodeGenAgent | Kickoff | task + docs | `file:`-fenced source code | `codeGen` / `0.3` / `16 384` | Per-role contracts; canonical utilities |
| SetupMdGenerator | Setup | keys + infraChoice | `SETUP.md` | deterministic | Category grouping; masked hints |
| **QAAgent** | **QA** | **PRD + Design** | **`AUDIT.json`** | **`qa` / `0.3` / 8 – 24K** | **≥ 80 % coverage; 5 check categories; no runtime execution** |
| **VerifierAgent** | **QA** | **PRD + Design** | **Drift Analysis Markdown** | **`verify` / `0.2` / 8 – 24K** | **≥ 95 % → PROCEED, < 70 % → ESCALATE** |
| AgentLoop (code-chat) | Post-gen | chat + appDir | `CodeChatEvent` stream | `claude-sonnet-4` / `0.2` / `4096` | 20-iteration cap; sandboxed FS only |

---

## 12. Cross-Cutting Contracts

These hold across multiple agents and matter when extending the pipeline:

1. **Tier consistency.** The PRD badge `**Project Tier: [SML]**` is
   authoritative. Downstream agents extract it; nobody re-classifies.
2. **Requirement ID traceability.** Every task `coversRequirementIds`
   matches real PRD `FR-` / `US-` / `AC-` IDs. The regex pattern is
   `\bFR-[A-Z]+\d+\b`.
3. **Schema completeness.** TRD §6 `shared/schema.ts` covers every
   entity and every endpoint. `any` is forbidden.
4. **Operator CLI contract.** When TRD §3.5 lists scripts,
   `backend/src/lib/cli-audit.ts` is mandatory.
5. **Auth decision respect.** CodeGen uses the persisted
   `AuthDecision`; the LLM cannot override.
6. **Resource requirement augmentation.** When the LLM forgets a key
   that the TRD names, the deterministic augmenter fills the gap.
7. **File-inventory precision.** Each task lists exact paths. CodeGen
   uses these as a checklist; vague entries (`"create frontend/"`) are
   rejected.
8. **TDD mandatory.** Every P0 / P1 task has a `tddPlan.tests[]` array
   that the Test-role CodeGen turns into real tests.
9. **Multi-API split rule.** Features integrating more than three
   external HTTP APIs split into ≥ 3 tasks: clients, orchestration,
   routes.
10. **Sandbox isolation.** Code-chat tool handlers reject absolute paths,
    `..` segments, and anything outside the project root.

---

## 13. Where to Read Next

- **Design knowledge subsystem** — [design-knowledge-base.md](design-knowledge-base.md)
- **PRD-edit incremental re-run** — `src/lib/pipeline/incremental-rerun.ts`
  and `kickoff-incremental.ts`
- **Memory store mechanics** — `src/lib/memory/file-store.ts`
- **Skill triggers** — `src/lib/agents/skills/`

---

*Document end.*
