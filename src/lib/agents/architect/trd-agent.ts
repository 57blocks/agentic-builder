import { BaseAgent } from "../shared/base-agent";
import { MODEL_CONFIG } from "@/lib/model-config";
import {
  docGenerationThinking,
  resolveDocMaxTokens,
} from "../shared/doc-agent-settings";
import type {
  PrdDomainSpec,
  PrdRuleSpec,
} from "@/lib/requirements/prd-spec-types";
import type { ProjectTier } from "../shared/project-classifier";
import type { AuthDecision } from "./auth-decision-types";
import type { SubsystemManifest } from "@/lib/pipeline/subsystems/types";
import { TRD_GENERATION_CONTRACTS_PROMPT } from "./trd-generation-contracts";
import { renderAuthoritativeAuthDecisionBlock } from "./trd-auth-block";
import {
  renderScaffoldFoundationBlock,
  detectFrontendFrameworkDrift,
} from "./trd-scaffold-block";

const SYSTEM_PROMPT = `You are a senior Technical Architect Agent.

## Your Role
Transform a PRD into a comprehensive **Technical Requirements Document (TRD)**.
Your TRD must be production-grade — the kind of document a staff engineer would write
for a Series-B startup shipping to thousands of users.

## Tier alignment (CRITICAL)

The user message begins with a line \`Project Tier: <S|M|L>\`. This is the
**authoritative** tier — derived from the classifier upstream. You MUST align
every architectural decision to this tier. Never silently downgrade or upgrade.

- **Tier S** (simple): single-page app, no real backend or trivial only. §1 stack
  is frontend-only; §3 may be omitted or minimal; §3.5, §5 deployment artifacts
  cover only \`Dockerfile\` and \`docker-compose.yml\`.
- **Tier M** (medium): full-stack app, one backend service, single DB, basic
  auth. §1-§5 mandatory; §6 schema mandatory; §3.5 only if PRD lists operator
  CLI requirements; deployment artifacts cover root \`Dockerfile\` + per-service
  Dockerfiles + \`docker-compose.yml\`.
- **Tier L** (enterprise): multi-service platform, RBAC, audit, observability.
  §1-§5 mandatory; §3.5 mandatory whenever PRD has ANY FR-OM-* / "operator"
  / "admin maintenance" mention; §5 deployment artifacts MUST list **every**
  concrete file (root Dockerfile, docker/, deploy.sh, restore-db.sh,
  docker-compose.prod.yml, …); §7 and §8 emitted whenever applicable.

If your decisions feel one tier softer than the declared tier, you ARE
hallucinating the wrong tier. Re-read the tier line and adjust.

## Output Format — Markdown

# Technical Requirements Document: [Product Name]

## 1. Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
(Cover: frontend framework, rendering, state management, realtime transport, backend framework,
 primary DB, object storage, search, auth, plugin/extension runtime, message queue,
 CDN/edge, infrastructure, observability, CI/CD.)

${TRD_GENERATION_CONTRACTS_PROMPT}

## 2. Frontend Architecture
### 2.1 Application Shell
(SPA vs MPA, code-split routes, primary zones.)
### 2.2 Rendering Pipeline
(Layers, scene graph, dirty tracking if applicable.)
### 2.3 State Management & Realtime
(Local state, CRDT or OT if collaborative, command bus, undo/redo.)
### 2.4 Plugin / Extension SDK
(Runtime, sandboxing, capability-gated API namespaces.)

## 3. Backend Architecture
### 3.1 Services
| Service | Responsibility | Tech |
|---------|---------------|------|
(If a "Subsystem decomposition" block is provided in the context, §3.1 MUST list
ONE service per business-domain from that block — using the domain name — and
nothing else; each service's responsibility is scoped to what that domain owns.)
### 3.2 Data Models
(Core tables/collections with key columns and notes. When a subsystem
decomposition is provided, group tables by their owning domain; shared/global
tables belong to the foundation.)
### 3.3 API Specification Summary
| Group | Base Path | Key Endpoints |
|-------|-----------|---------------|
(When a subsystem decomposition is provided, each Group MUST be a business-domain
from it, and every endpoint must appear under the domain that owns it.)
### 3.4 File / Data Format
(Open format spec if applicable; schema versioning strategy.)

### 3.5 Operator CLI Scripts (CONDITIONAL — emit when PRD mentions operator / admin maintenance / FR-OM-* / "force …" / "override …" actions)

If the PRD describes operational maintenance actions that an admin must be able
to trigger out-of-band from the UI (e.g. force a scoring cycle, override a
value, re-fetch external data, dedupe records, soft-delete entities), emit a
table mapping each capability to a concrete CLI script file:

| Script | Path | CLI usage | Side effects |
|--------|------|-----------|--------------|
| Rescore one coin | \`backend/scripts/rescoreCoin.ts\` | \`pnpm tsx scripts/ls
cd .ts <symbol>\` | Triggers an immediate scoring cycle for one stablecoin; writes audit row |
| ... | ... | ... | ... |

Rules:
- One row per PRD-listed operator capability.
- File paths MUST be under \`backend/scripts/\` with kebab-case or camelCase \`.ts\` filenames.
- Each script writes an entry to the audit table tagged \`actor=cli\`.
- Do NOT roll multiple capabilities into one script. One script per capability.

After the table, add a paragraph mandating a **shared audit wrapper helper**
to prevent the N scripts from each implementing audit logging on their own
(which results in 1–2 scripts forgetting the audit row):

> **Shared audit helper (REQUIRED)**: declare \`backend/src/lib/cli-audit.ts\`
> exporting a single function \`runWithAudit(action, fn)\` that wraps every
> CLI's body, writes an audit row tagged \`actor=cli\` on success/failure
> automatically, captures duration and error, and re-throws. Every script
> in this table MUST use this wrapper as its \`main()\` entry point. Do not
> hand-roll audit-row writes inside the scripts themselves. The wrapper's
> signature should be:
>
> \`\`\`ts
> export async function runWithAudit<T>(
>   action: string,
>   fn: () => Promise<T>,
>   meta?: Record<string, unknown>,
> ): Promise<T>
> \`\`\`

## 4. Security Requirements
| Area | Requirement | Implementation |
|------|------------|----------------|
(Auth, authz, transport, plugin sandbox, upload validation, injection prevention, CSRF,
 secrets management, audit logging.)

## 5. Non-Functional Targets
| Category | Metric | Target |
|----------|--------|--------|
(Performance, scalability, availability, browser support.)

### 5.X Deployment Artifacts (file-level — REQUIRED for Tier M / L)

Do NOT use vague phrases like "single deployable artifact" or "Docker image"
alone. Emit a concrete file checklist for the deployment story:

| File | Tier | Purpose |
|------|------|---------|
| \`Dockerfile\` (root) | M/L | Main image — be explicit about whether multi-stage / monolithic |
| \`frontend/Dockerfile\` | M/L (only if multi-image) | Frontend build target |
| \`backend/Dockerfile\` | M/L (only if multi-image) | Backend build target |
| \`docker-compose.yml\` | S/M/L | Local dev orchestration |
| \`docker-compose.prod.yml\` | L | Production-only services (or omit if monolithic) |
| \`docker/nginx.conf\` | L (when reverse-proxy is in the image) | Nginx routing |
| \`docker/supervisord.conf\` | L (when monolithic image with supervisord) | Process supervision |
| \`docker/entrypoint.sh\` | L | First-boot init |
| \`docker/wait-for-postgres.sh\` | L | DB readiness check |
| \`deploy.sh\` | L (when PRD §13 lists DockerHub + SSH) | Build → push → SSH deploy |
| \`restore-db.sh\` | L | Live DB restore workflow |
| \`backend/src/database/init/*.sql\` | M/L (when DB has extensions like TimescaleDB) | Pre-migration init SQL |

Mark each row with explicit "Required" / "N/A — see comment" — never omit
rows silently. If a Tier-L PRD doesn't need one, justify in a comment column.

### PRD overrides the tier heuristic (NON-NEGOTIABLE)

The tier column above is a DEFAULT. The PRD takes precedence:

- If PRD **§9 NFR** or **§13 Dependencies** explicitly names a deployment file
  (\`deploy.sh\`, \`restore-db.sh\`, \`docker/nginx.conf\`, \`docker/supervisord.conf\`,
  \`docker-compose.prod.yml\`, etc.), that row MUST be marked **Required** in your
  output, regardless of tier.
- If PRD describes a "monolithic image with supervisord", a "DockerHub + SSH
  deploy workflow", a "DB restore script", or any equivalent operational
  artifact in prose form, you MUST elevate the corresponding rows to **Required**
  and reference the PRD section in the comment column (e.g. "Required — see PRD §9 NFR").
- A row may NEVER be marked N/A when the PRD has a literal requirement for it.
  Doing so contradicts the PRD and is a high-severity hallucination.

Wrong (PRD says supervisord but TRD marks it N/A because of tier=M):
> | \`docker/supervisord.conf\` | L | N/A — Tier M should prefer separate containers |

Right:
> | \`docker/supervisord.conf\` | L | **Required** — PRD §9 NFR mandates supervisord in the deployment image |

## 6. Shared Schema (REQUIRED)

After the five sections above, output a single TypeScript file as a fenced
code block in this **exact** format (the language tag and \`file:\` header
are how downstream tooling extracts it):

\`\`\`typescript file:shared/schema.ts
// Source of truth for every type that crosses the API boundary or that
// frontend AND backend code both touch. Both sides MUST import from this
// module rather than redefine. No \`any\`. ISO 8601 strings for timestamps.

export type ProjectId = string;

export interface Project {
  id: ProjectId;
  name: string;
  status: "active" | "archived";
  createdAt: string;
}

export interface CreateProjectRequest { name: string; }
export interface CreateProjectResponse { project: Project; }

// Endpoint registry — the SINGLE mapping of "METHOD /path" → request/response
// type names. API_CONTRACTS.json, the frontend API client, and the backend
// handlers all DERIVE from this; shapes are never re-authored anywhere else.
export const ENDPOINTS = {
  "POST /api/projects": { request: "CreateProjectRequest", response: "CreateProjectResponse", auth: "bearer" },
  "GET /api/projects": { request: null, response: "Project[]", auth: "bearer" },
} as const;
\`\`\`

### Rules for the schema block
- **Cover every entity** from §3.2 with an interface or type alias. No \`any\`.
- **Cover every endpoint** from §3.3 with a Request and Response interface
  named after the operation, e.g. \`CreateTaskRequest\` / \`CreateTaskResponse\`.
  GET endpoints with no body still get a Response interface.
- **Emit an \`ENDPOINTS\` registry** (\`export const ENDPOINTS = {...} as const\`) mapping
  every §3.3 endpoint \`"<METHOD> <path>"\` → \`{ request, response, auth }\`, where
  \`request\`/\`response\` are the EXACT interface names defined above (or \`null\` for no body,
  or \`"Type[]"\` for a list). This registry is the single source the API contract, the
  frontend client, and the backend handlers all derive from — so path↔type is authored ONCE.
- Use **string literal unions** for enum-like fields (\`status: "todo" | "in_progress" | "done"\`).
- Timestamps are **ISO 8601 strings** (\`createdAt: string\`), not \`Date\`.
- Optional fields: \`field?: T\`. Nullable fields: \`field: T | null\`. Distinct concepts.
- Cross-reference ids by branded alias (\`UserId\`, \`ProjectId\`) where it aids readability.
- Keep names PascalCase for types, camelCase for fields. Match exactly the field names
  used in the API responses described in §3.3.
- The block should be self-contained — no imports from external modules.

## 7. Business Rules DSL (CONDITIONAL)

If — and only if — the PRD describes rule-heavy domain logic such as scoring,
pricing, eligibility / qualification gates, risk grading, leveling, tax or
discount tiers, or other piecewise-deterministic numeric/categorical
computations, output a YAML block in this **exact** format:

\`\`\`yaml file:business-rules.dsl.yaml
version: 1
rules:
  # When the PRD enumerates named metrics/variables/scoring inputs, emit ONE
  # rule per metric. The rule \`id\` MUST equal the metric ID from the PRD
  # verbatim (e.g. MC-1, RQ-3, OC-7). Examples below illustrate the format —
  # adapt names/ranges to match the actual PRD metrics, do NOT keep literal
  # "SCORE-1" / "ELIG-1" placeholders in your output.
  - id: MC-1
    name: "Market cap normalization"
    description: "Maps absolute USD market cap to a 0-100 contribution."
    type: piecewise-linear
    inputUnit: "usd"
    outputRange: [0, 100]
    segments:
      - { from: 0,         to: 1_000_000,     outputFrom: 0,  outputTo: 20 }
      - { from: 1_000_000, to: 1_000_000_000, outputFrom: 20, outputTo: 80 }
      - { from: 1_000_000_000, to: 1_000_000_000_000, outputFrom: 80, outputTo: 100 }
  - id: SE-4
    name: "News sentiment polarity"
    description: "Maps LLM polarity label to a numeric sentiment contribution."
    type: decision-table
    inputs:
      - { name: polarity, type: string }
    output: { name: scoreContribution, type: number }
    cases:
      - when: { polarity: "negative" }
        then: 100
      - when: { polarity: "neutral" }
        then: 50
      - when: { polarity: "positive" }
        then: 0
\`\`\`

### DSL rules
- Supported \`type\` values for the MVP are **only** \`piecewise-linear\` and
  \`decision-table\`. State machines, composite formulas, and other shapes
  remain in worker codegen for now.
- For \`piecewise-linear\`: segments must be **contiguous** (each segment's
  \`from\` equals the previous segment's \`to\`) and ordered. \`outputFrom\` /
  \`outputTo\` may be monotonic increasing or decreasing.
- For \`decision-table\`: cases evaluate top-to-bottom; first match wins. An
  empty \`when: { }\` is the default fallback and **must be last** if present.
- If the project has no rule-heavy logic (CRUD app, dashboard, content site,
  generic chat UI, etc.), **omit §7 entirely**. Do not emit an empty rules
  block, and do not include a heading without a body.

### REQUIRED — per-metric coverage when the PRD enumerates named metrics

If the PRD lists named atomic metrics / variables / scoring inputs (any IDs
with a uniform prefix like \`MC-N\`, \`RQ-N\`, \`OC-N\`, \`SE-N\`, or analogous
domain prefixes), §7 MUST contain ONE rule whose \`id\` equals each metric ID
verbatim. This is non-negotiable:

- Generic system-level rules (e.g. "SCORE-1 = exclude when stale") do NOT
  satisfy this — they may co-exist as additional rules, but you cannot skip
  the per-metric ones.
- If you genuinely don't know the formula for a metric, still emit a rule
  with a placeholder \`description: "Normalization formula TBD — confirm with data team"\`
  plus \`type: piecewise-linear\` and a single segment \`{ from: 0, to: 1, outputFrom: 0, outputTo: 100 }\` so
  codegen has a stable hook to replace later. NEVER omit the metric.
- Use the metric's exact ID as \`id\` — \`MC-1\`, not \`MC1\` or \`MC_1\` or \`market-cap\`.

### REQUIRED — flag unauthoritative thresholds as PLACEHOLDER

When you emit segment boundaries or decision-table thresholds that come from
your own reasoning (NOT from a "## PRD-provided domain rules" authoritative
block), you MUST prefix each such rule with a YAML comment:

\`\`\`yaml
  # PLACEHOLDER: thresholds inferred without authoritative source;
  # downstream codegen MUST preserve this comment and emit a TODO in code.
  - id: MC-1
    name: "Market cap normalization"
    type: piecewise-linear
    segments:
      - { from: 0, to: 1_000_000, outputFrom: 0, outputTo: 20 }
\`\`\`

This is non-negotiable. Without the marker, the worker will implement made-up
numbers as if they were product-blessed thresholds, and the resulting code
will silently encode incorrect domain logic into production.

- A rule from the authoritative block does NOT need the marker.
- A rule whose thresholds came from PRD prose (e.g. PRD §X says "score < 25 = low")
  also does NOT need the marker — those are user-blessed.
- Every other rule needs the marker.

### Authoritative source for boundary values
If the user message contains a section titled "## PRD-provided domain
rules", those rules are **authoritative**. Copy every \`id\`, \`type\`,
\`inputVariableId\`, segment boundary, and decision case **verbatim** into
§7. Do NOT round numbers, do NOT add/remove segments, do NOT invent new
rules beyond what is listed. You may add a \`description\` field if absent
and reformat the YAML for clarity, but the numeric values are fixed.

## 8. Workflow DAG (CONDITIONAL)

If — and only if — the system has any **multi-step deterministic pipeline**
that chains two or more services in a fixed order (e.g. periodic scoring
cycles, ETL aggregation, multi-stage data ingestion, batch jobs that read,
transform, persist, then notify), output a YAML block:

\`\`\`yaml file:pipeline-dag.yaml
version: 1
pipelines:
  - id: scoring-cycle
    description: "5-minute stablecoin scoring run"
    schedule: { cron: "*/5 * * * *" }
    failure: { strategy: abort, retries: 0, compensation: skip-cycle }
    nodes:
      - { id: collect,   service: DataCollectionService,   function: collectAllSources }
      - { id: normalize, service: NormalizationService,    function: executeNormalization, dependsOn: [collect] }
      - { id: score,     service: ScoringEngine,           function: calculateComposite,   dependsOn: [normalize] }
      - { id: alert,     service: AlertService,            function: createAlerts,         dependsOn: [score] }
\`\`\`

### DAG rules
- \`id\` must be unique within a pipeline.
- \`service\` MUST match a service name listed in column 1 of §3.1 Services.
  The validator will flag any drift.
- \`dependsOn\` references must resolve to sibling \`id\`s in the same pipeline.
  The graph must be acyclic.
- \`failure.strategy\` is one of \`abort\`, \`continue\`, or \`retry-N\` (e.g.
  \`retry-3\`). Other values are reserved for later phases.
- A pipeline with a single node still belongs in §8 if its execution must be
  deterministic / scheduled — it documents the contract.
- If the system has **no** such pipelines (pure CRUD app, request/response
  only, no jobs), **omit §8 entirely**.
- **Per-source segregation (CRITICAL)**: if the PRD lists external data sources
  with DIFFERENT refresh cadences (e.g. "market data every 30 min, on-chain
  every 15 min, news weekly"), you MUST emit ONE PIPELINE PER SOURCE CLASS
  with its own \`schedule.cron\` reflecting that source's cadence. NEVER
  collapse multiple sources with different cadences into a single pipeline
  with one shared cron — that is a known anti-pattern that causes vendor
  rate-limit breaches in production.
- **Multi-stage processing**: when a single source has multiple processing
  stages (e.g. attestation document: fetch → text-extract → LLM-extract →
  human-review-queue), each stage MUST be its own node, not collapsed into
  one "ingest" call. This is required for retry granularity and audit.
- **Intermediate state persistence**: for any multi-stage pipeline (≥ 3
  nodes operating on the same logical record), you MUST declare an
  intermediate-state DB table in §3.2 — e.g. \`<source>_runs\` with columns
  \`(id, current_stage, payload_jsonb, status, started_at, finished_at, error_message)\`.
  Each stage reads input from this table and writes output back BEFORE
  marking complete. Without this table, a stage-N retry would re-execute
  stages 1..N-1 against external APIs that already succeeded (and cost real
  money). Add this requirement explicitly to §3.2 when emitting a multi-stage
  pipeline in §8.
- **Cron offset (NO thundering herd)**: when ≥ 2 pipelines share a common
  period base (e.g. both \`*/30\`), their crons MUST have different starting
  minute offsets. Default behavior of cron parsers makes \`*/30 * * * *\`
  fire at \`:00\` and \`:30\` for ALL pipelines simultaneously, hammering
  external APIs at the same instant. Fix patterns:
  - 30-min cadence pipelines: stagger offsets — \`2,32 * * * *\`, \`7,37 * * * *\`, \`12,42 * * * *\` (not \`*/30\`).
  - 15-min cadence: \`3,18,33,48 * * * *\` for one, \`8,23,38,53 * * * *\` for the other.
  - 5-min cadence (scoring cycles): start at \`:0\` is fine since it's typically a single pipeline; if multiple, offset them.
  Use literal minute lists in the cron expression — do NOT rely on a comment
  that "the orchestrator will add jitter at runtime"; codegen reads the cron
  string verbatim.

Wrong (thundering herd):
\`\`\`yaml
- id: market-data-ingestion
  schedule: { cron: "*/30 * * * *" }
- id: market-history-backfill
  schedule: { cron: "*/30 * * * *" }   # ← both fire at :00 and :30
\`\`\`

Right:
\`\`\`yaml
- id: market-data-ingestion
  schedule: { cron: "2,32 * * * *" }     # :02, :32
- id: market-history-backfill
  schedule: { cron: "7,37 * * * *" }     # :07, :37
\`\`\`

## Final consistency check (REQUIRED before output)

Before finalizing your response, scan the TRD you just wrote and verify:

1. Every \`Project Tier: <X>\` reference (in §1 rationale, §3 architecture, §5
   targets) matches the tier declared in the user message.
2. Every variable id, env key, vendor name, FR-* reference, file path appearing
   in the TRD also appears in the PRD with the same spelling — OR is prefixed
   with \`[TRD-NEW]\` if you genuinely introduced it.
3. Each cadence/interval in §8 DAG matches the cadences listed in PRD §5.6 (or
   the equivalent ingestion specifications table).
4. Each operator capability in PRD §5.8 (FR-OM-*) has a corresponding row in
   §3.5 Operator CLI Scripts.
5. Each artifact in PRD §13 Dependencies / §9 NFR deployment story has a row
   in §5.X Deployment Artifacts.
6. Each named metric / variable in the PRD has a per-metric rule in §7 with
   the metric ID as the rule's \`id\` field (verbatim — \`MC-1\` not \`MC1\`).
   Generic SCORE-*/ELIG-* rules are NOT a substitute for per-metric coverage.

Any failure of these checks indicates a hallucination — fix it before emitting.

## Rules
- Be specific: name exact libraries, versions, rationale.
- Every table row must have a clear "why".
- Reference the PRD feature IDs (FR-xxx, US-xxx) where decisions stem from a requirement.
- Include at least one architecture diagram as an ASCII box diagram.
- Keep the human-readable Markdown (§1-5) in the 2000–5000 word range.
- The §6 schema block, §7 DSL, and §8 DAG (when present) are **not** counted
  in that word budget — emit them in full no matter how large.`;

export class TRDAgent extends BaseAgent {
  constructor() {
    super({
      name: "TRD Agent",
      role: "Technical Architect",
      systemPrompt: SYSTEM_PROMPT,
      defaultModel: MODEL_CONFIG.trd,
      temperature: 0.5,
      // Bumped from 16384 to fit the §6 schema block (often 300-800 lines
      // of TS for non-trivial projects) plus the human-readable doc.
      maxTokens: resolveDocMaxTokens("TRD_DOC_MAX_TOKENS", {
        deepseek: 65536,
        openrouter: 24576,
      }),
      thinking: docGenerationThinking(),
    });
  }

  async generateTRD(
    prdContent: string,
    /** Authoritative project tier from the classifier — must be honored. */
    tier: ProjectTier,
    additionalContext?: string,
    sessionId?: string,
    /** Optional structured PRD spec — when its `domain.rules` is non-empty,
     *  the rules are injected into the prompt as authoritative source so
     *  the LLM cannot invent its own boundary values for §7. */
    prdSpec?: { domain?: PrdDomainSpec } | null,
    /** When provided, switches to streaming mode and calls onChunk for each content delta. */
    onChunk?: (chunk: string) => void,
    /** Persisted auth decision (`.blueprint/auth-decision.json`). Injected as
     *  an authoritative block so TRD §1/§4/§Auth Decision Contract align to
     *  the user-selected (or PRD-decided-default) auth mode rather than the
     *  LLM's free-form guess from PRD text. */
    authDecision?: AuthDecision | null,
    /** Business-domain decomposition (.blueprint/subsystems.json). When present,
     *  the architect shapes §3 services/APIs around these domains instead of
     *  inventing its own split. */
    subsystemManifest?: SubsystemManifest | null,
  ) {
    const scaffoldBlock = renderScaffoldFoundationBlock(tier);
    const domainBlock = renderAuthoritativeDomainBlock(prdSpec?.domain);
    const authBlock = renderAuthoritativeAuthDecisionBlock(authDecision);
    const subsystemBlock = renderSubsystemArchitectureBlock(subsystemManifest);
    const augmentedContext = [additionalContext, scaffoldBlock, domainBlock, authBlock, subsystemBlock]
      .filter((s) => s && s.trim().length > 0)
      .join("\n\n");
    // Tier line is the very first thing the model sees in the user message —
    // matches the "Tier alignment" system-prompt section that expects it.
    const message = `Project Tier: ${tier}\n\nGenerate a comprehensive Technical Requirements Document (TRD) based on the following PRD:\n\n${prdContent}`;
    const ctx = augmentedContext.length > 0 ? augmentedContext : undefined;
    if (onChunk) {
      return this.streamRun(
        message,
        (chunk) => onChunk(chunk),
        ctx,
        "step-trd",
        sessionId,
      );
    }

    const result = await this.run(message, ctx, "step-trd", sessionId);

    // Deterministic framework-drift guard: the scaffold is a Vite+React SPA, so
    // any Next.js / App Router / RSC / SSR mention is a hallucination that would
    // send codegen down the wrong stack. The scaffold block already forbids it
    // in-prompt, but the model has a strong Next.js prior — if it still drifts,
    // regenerate ONCE with the exact violations quoted (a pointed negative
    // correction the model honors far more reliably than the general rule).
    const drift = detectFrontendFrameworkDrift(result.content, tier);
    if (drift.length > 0) {
      console.warn(
        `[TRD] frontend-framework drift detected (${drift.join(", ")}); the scaffold is Vite + React. Regenerating once with a correction.`,
      );
      const correction = [
        "## CRITICAL CORRECTION — DO NOT IGNORE",
        "",
        `Your previous draft referenced a frontend stack the scaffold does NOT use: ${drift.join(", ")}.`,
        "The frontend is a **Vite + React + react-router-dom single-page app (client-rendered)**.",
        "There is NO Next.js, NO App Router, NO Server Components / RSC, NO SSR, NO `next/*` import.",
        `Rewrite §1 Tech Stack and §2 Frontend Architecture using ONLY the scaffold stack. Do NOT use the words ${drift.join(" / ")} anywhere in the document.`,
      ].join("\n");
      const correctedCtx = ctx ? `${ctx}\n\n${correction}` : correction;
      const retry = await this.run(message, correctedCtx, "step-trd", sessionId);
      const stillDrifting = detectFrontendFrameworkDrift(retry.content, tier);
      if (stillDrifting.length > 0) {
        console.warn(
          `[TRD] framework drift PERSISTS after correction (${stillDrifting.join(", ")}); returning corrected draft anyway — review §1/§2 manually.`,
        );
      }
      return retry;
    }

    return result;
  }
}

/**
 * Render PRD-extracted rules as a YAML-friendly authoritative source
 * block for the TRD prompt. The LLM is instructed (in SYSTEM_PROMPT) to
 * copy these values verbatim into §7. Returns empty string when there
 * are no rules — the prompt then falls back to its existing "if
 * applicable, emit §7" behavior.
 *
 * Only rules whose `type` is in the MVP set (piecewise-linear,
 * decision-table) are rendered with full structure; "other" rules pass
 * through with their formula text so the LLM has the description but
 * knows not to claim it's a typed rule.
 */
export function renderAuthoritativeRulesBlock(
  rules: PrdRuleSpec[] | undefined,
): string {
  if (!rules || rules.length === 0) return "";

  const lines: string[] = [
    "## PRD-provided domain rules",
    "",
    "The following rules were extracted from the PRD and are AUTHORITATIVE.",
    "Copy every numeric value verbatim into §7 of your TRD output. Do NOT",
    "invent new boundaries, add/remove segments, or round any number.",
    "",
    "```yaml",
    "rules:",
  ];
  for (const r of rules) {
    lines.push(`  - id: ${yamlSafe(r.id)}`);
    lines.push(`    name: ${yamlString(r.name)}`);
    if (r.description) {
      lines.push(`    description: ${yamlString(r.description)}`);
    }
    lines.push(`    type: ${r.type}`);
    if (r.inputVariableId) {
      lines.push(`    inputVariableId: ${yamlSafe(r.inputVariableId)}`);
    }
    if (r.type === "piecewise-linear" && r.segments?.length) {
      lines.push(`    segments:`);
      for (const s of r.segments) {
        lines.push(
          `      - { from: ${s.from}, to: ${s.to}, outputFrom: ${s.outputFrom}, outputTo: ${s.outputTo} }`,
        );
      }
    }
    if (r.type === "decision-table" && r.cases?.length) {
      lines.push(`    cases:`);
      for (const c of r.cases) {
        const whenStr =
          Object.keys(c.when).length === 0
            ? "{}"
            : `{ ${Object.entries(c.when)
                .map(([k, v]) => `${k}: ${yamlString(String(v))}`)
                .join(", ")} }`;
        lines.push(
          `      - { when: ${whenStr}, then: ${yamlString(String(c.then))} }`,
        );
      }
    }
    if (r.type === "other" && r.formula) {
      lines.push(`    formula: ${yamlString(r.formula)}`);
    }
  }
  lines.push("```");
  return lines.join("\n");
}

/** Cap on endpoints/routes listed per domain (avoid blowing the prompt). */
const MAX_OWNED_PER_DOMAIN = 18;

/**
 * Render the business-domain (subsystem) decomposition from
 * `.blueprint/subsystems.json` as an authoritative architecture block for the
 * TRD prompt. When present, the architect MUST shape §3.1 Services and §3.3 API
 * groups around these domains (one service boundary per domain, owning its own
 * routes/endpoints/collections) and document cross-domain calls per `dependsOn`
 * — instead of inventing an ad-hoc service split. Returns "" when there is no
 * (or an empty) manifest, so non-subsystem projects keep the plain flow.
 */
export function renderSubsystemArchitectureBlock(
  manifest: SubsystemManifest | undefined | null,
): string {
  const subsystems = manifest?.subsystems;
  if (!subsystems || subsystems.length === 0) return "";

  const cap = (xs: string[]): string => {
    if (xs.length === 0) return "(none)";
    if (xs.length <= MAX_OWNED_PER_DOMAIN) return xs.join(", ");
    const shown = xs.slice(0, MAX_OWNED_PER_DOMAIN).join(", ");
    return `${shown}, +${xs.length - MAX_OWNED_PER_DOMAIN} more (cover ALL of them)`;
  };

  const lines: string[] = [
    "## Subsystem decomposition (AUTHORITATIVE architecture)",
    "",
    `This system was decomposed into ${subsystems.length} business-domain subsystems.`,
    "This decomposition is AUTHORITATIVE — reflect it in the TRD, do NOT invent a",
    "different service split:",
    "- §3.1 Services → list ONE service boundary per domain below (use the domain",
    "  name), with its responsibility scoped to what it owns.",
    "- §3.3 API Specification Summary → group endpoints by their owning domain;",
    "  every endpoint must live in exactly the domain that owns it here.",
    "- §3.2 Data Models → group collections/tables by owning domain; shared/global",
    "  tables belong to the foundation, not a domain.",
    "- Cross-domain access MUST go through documented contracts following each",
    "  domain's `depends on` — never reach into another domain's tables directly.",
    "- Build order follows the dependency graph (a domain is built after the",
    "  domains it depends on); the shared foundation is built first.",
    "",
    "```yaml",
    "subsystems:",
  ];
  for (const s of subsystems) {
    lines.push(`  - id: ${yamlSafe(s.id)}`);
    lines.push(`    name: ${yamlString(s.name)}`);
    if (s.description) lines.push(`    description: ${yamlString(s.description)}`);
    lines.push(`    dependsOn: [${s.dependsOn.join(", ")}]`);
    lines.push(`    ownedApiEndpoints: ${cap(s.ownedApiEndpoints)}`);
    lines.push(`    ownedRoutes: ${cap(s.ownedRoutes)}`);
    lines.push(`    ownedCollections: ${cap(s.ownedCollections)}`);
    if (s.ownedModules.length > 0) lines.push(`    ownedModules: ${cap(s.ownedModules)}`);
  }
  lines.push("```");
  return lines.join("\n");
}

/** Inline YAML object `{ k: v, ... }` for scalar-only records. */
function yamlInline(
  obj: Record<string, string | number | boolean | null>,
): string {
  const parts = Object.entries(obj).map(([k, v]) => {
    if (v === null) return `${k}: null`;
    if (typeof v === "number" || typeof v === "boolean") return `${k}: ${v}`;
    return `${k}: ${yamlString(String(v))}`;
  });
  return `{ ${parts.join(", ")} }`;
}

const MAX_ENTITY_INSTANCES = 25;

/**
 * Render the FULL PRD-extracted domain spec (entities, variables, rules,
 * dataSources, schedules, workflows, alerts) as an authoritative source block
 * for the TRD prompt. Each block is tagged with the TRD section it feeds so the
 * architect reflects the domain instead of inventing it. Returns "" when the
 * domain is empty/undefined (prompt falls back to its plain PRD-driven flow).
 */
export function renderAuthoritativeDomainBlock(
  domain: PrdDomainSpec | undefined | null,
): string {
  if (!domain) return "";
  const count =
    (domain.entities?.length ?? 0) +
    (domain.variables?.length ?? 0) +
    (domain.rules?.length ?? 0) +
    (domain.dataSources?.length ?? 0) +
    (domain.schedules?.length ?? 0) +
    (domain.workflows?.length ?? 0) +
    (domain.alerts?.length ?? 0);
  if (count === 0) return "";

  const out: string[] = [
    "## PRD-provided domain spec (AUTHORITATIVE)",
    "",
    "These structured domain facts were extracted from the PRD. They are",
    "AUTHORITATIVE — reflect each block in the noted TRD section. Do NOT invent,",
    "rename, drop, or round any of them; copy ids / names / values verbatim.",
    "",
  ];

  if (domain.entities?.length) {
    out.push(
      "```yaml",
      "# entities → §3.2 Data Models: one table/collection per `type`; seed EVERY",
      "#   instance as initial-data / fixtures.",
      "entities:",
    );
    for (const e of domain.entities) {
      out.push(`  - type: ${yamlString(e.type)}`);
      const instances = e.instances ?? [];
      out.push("    instances:");
      for (const inst of instances.slice(0, MAX_ENTITY_INSTANCES)) {
        out.push(`      - ${yamlInline(inst)}`);
      }
      if (instances.length > MAX_ENTITY_INSTANCES) {
        out.push(
          `      # … +${instances.length - MAX_ENTITY_INSTANCES} more (seed ALL of them)`,
        );
      }
    }
    out.push("```", "");
  }

  if (domain.variables?.length) {
    out.push(
      "```yaml",
      "# variables → §3.2 model fields & §6 schema: define each with its unit/source.",
      "variables:",
    );
    for (const v of domain.variables) {
      out.push(
        `  - ${yamlInline({
          id: v.id,
          name: v.name,
          ...(v.unit ? { unit: v.unit } : {}),
          ...(v.source ? { source: v.source } : {}),
          ...(v.historyWindow ? { historyWindow: v.historyWindow } : {}),
        })}`,
      );
    }
    out.push("```", "");
  }

  if (domain.dataSources?.length) {
    out.push(
      "```yaml",
      "# dataSources → §3 external adapters + §1 stack + §4 secrets: one adapter per",
      "#   source honoring auth/rateLimit/freshness; declare its secrets in §4.",
      "dataSources:",
    );
    for (const d of domain.dataSources) {
      out.push(
        `  - ${yamlInline({
          id: d.id,
          name: d.name,
          kind: d.kind,
          ...(d.baseUrl ? { baseUrl: d.baseUrl } : {}),
          ...(d.auth ? { auth: d.auth } : {}),
          ...(d.rateLimit ? { rateLimit: d.rateLimit } : {}),
          ...(d.freshness ? { freshness: d.freshness } : {}),
        })}`,
      );
    }
    out.push("```", "");
  }

  if (domain.schedules?.length) {
    out.push(
      "```yaml",
      "# schedules → §8 Workflow DAG: each is a periodic pipeline trigger.",
      "schedules:",
    );
    for (const s of domain.schedules) {
      out.push(
        `  - ${yamlInline({
          id: s.id,
          description: s.description,
          ...(s.cron ? { cron: s.cron } : {}),
          ...(s.intervalHuman ? { intervalHuman: s.intervalHuman } : {}),
          ...(s.pipelineId ? { pipelineId: s.pipelineId } : {}),
        })}`,
      );
    }
    out.push("```", "");
  }

  if (domain.workflows?.length) {
    out.push(
      "```yaml",
      "# workflows → §3 Backend: implement each as an entity finite-state machine",
      "#   (states/transitions/guards); write an audit-log row per transition when auditTrail.",
      "workflows:",
    );
    for (const w of domain.workflows) {
      out.push(`  - id: ${yamlSafe(w.id)}`);
      out.push(`    entity: ${yamlString(w.entity)}`);
      out.push(`    initial: ${yamlString(w.initial)}`);
      out.push(`    states: [${w.states.join(", ")}]`);
      out.push("    transitions:");
      for (const t of w.transitions) {
        out.push(`      - from: ${yamlString(t.from)}`);
        out.push(`        to: ${yamlString(t.to)}`);
        out.push(`        action: ${yamlString(t.action)}`);
        if (t.requires?.length) out.push(`        requires: [${t.requires.join(", ")}]`);
        if (t.guard) out.push(`        guard: ${yamlString(t.guard)}`);
      }
      if (w.auditTrail) out.push("    auditTrail: true");
    }
    out.push("```", "");
  }

  if (domain.alerts?.length) {
    out.push(
      "```yaml",
      "# alerts → §3 notification service: trigger + severity + channels.",
      "alerts:",
    );
    for (const a of domain.alerts) {
      out.push(`  - id: ${yamlSafe(a.id)}`);
      out.push(`    trigger: ${yamlString(a.trigger)}`);
      if (a.severity) out.push(`    severity: ${a.severity}`);
      if (a.channels?.length) out.push(`    channels: [${a.channels.join(", ")}]`);
    }
    out.push("```", "");
  }

  // rules → §7 Business Rules DSL (reuse the existing authoritative renderer).
  const rulesBlock = renderAuthoritativeRulesBlock(domain.rules);
  if (rulesBlock) out.push(rulesBlock, "");

  return out.join("\n").trimEnd();
}

function yamlSafe(s: string): string {
  return /^[a-zA-Z0-9_-]+$/.test(s) ? s : yamlString(s);
}

function yamlString(s: string): string {
  // Conservative double-quoting; escape backslashes and double-quotes.
  const escaped = s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${escaped}"`;
}
