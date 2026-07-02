import { BaseAgent } from "../shared/base-agent";
import type { ProjectTier } from "../shared/project-classifier";
import { MODEL_CONFIG } from "@/lib/model-config";
import { chatCompletionWithFallback, resolveModel } from "@/lib/openrouter";
import { resolveModelChain } from "@/lib/model-config";
import type { OpenRouterOptions } from "@/lib/llm-types";

type ReasoningEffort = "low" | "medium" | "high";
type ThinkingVerbosity = "low" | "medium" | "high";

function isTruthyEnvFlag(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return (
    normalized === "1" ||
    normalized === "true" ||
    normalized === "yes" ||
    normalized === "on"
  );
}

function parseEffort(value: string | undefined): ReasoningEffort {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "low" || normalized === "high") return normalized;
  return "medium";
}

function parseVerbosity(value: string | undefined): ThinkingVerbosity {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "low" || normalized === "high") return normalized;
  return "medium";
}

function buildTaskBreakdownReasoningOptions(): Pick<
  OpenRouterOptions,
  "reasoning" | "thinking"
> {
  const enableReasoning = isTruthyEnvFlag(
    process.env.TASK_BREAKDOWN_ENABLE_REASONING,
  );
  const enableThinking = isTruthyEnvFlag(
    process.env.TASK_BREAKDOWN_ENABLE_THINKING,
  );

  const out: Pick<OpenRouterOptions, "reasoning" | "thinking"> = {};
  if (enableReasoning) {
    out.reasoning = {
      enabled: true,
      effort: parseEffort(process.env.TASK_BREAKDOWN_REASONING_EFFORT),
    };
  }
  if (enableThinking) {
    out.thinking = {
      thinking_effort: parseEffort(process.env.TASK_BREAKDOWN_THINKING_EFFORT),
      verbosity: parseVerbosity(process.env.TASK_BREAKDOWN_THINKING_VERBOSITY),
    };
  }
  return out;
}

/**
 * Tier affects *how* to shape tasks (breadth, monorepo conventions), not how many tasks to emit.
 * Task count must be derived from PRD/TRD scope — see system prompt "Task count" section.
 */
const TIER_CODING_STYLE: Record<ProjectTier, string> = {
  S: `Pipeline tier **S** (small scope): prefer **fewer, broader** tasks when the PRD is thin — scaffolding + core feature. Merge related work; do not pad with filler tasks to "look busy".`,

  M: `Pipeline tier **M** (split frontend/backend app): stack is \`frontend/\` (**Vite + React + React Router + Ant Design**, NOT Next.js) plus \`backend/\` (**Koa + Sequelize + PostgreSQL**). **NEVER use Next.js for M-tier.** The scaffold is prebuilt and already copied; **do not plan a Scaffolding task that recreates the repo structure**. Keep backend/data tasks reasonably broad; split **frontend by page or major flow** when the PRD lists multiple surfaces — first an **app shell/layout** task, then page-level tasks. Add an **early contracts/client** task so API shapes and the web client stay aligned with PRD requirement IDs. Coding tasks should implement pages, API modules, and middleware files, but final registration closure is handled later by \`integrationVerifyAndFix\` in \`frontend/src/router.tsx\`, \`backend/src/api/modules/index.ts\`, and \`backend/src/app.ts\`.`,

  L: `Pipeline tier **L** (production-grade full-stack): same stack as M — \`frontend/\` (**Vite + React + React Router + Tailwind**, NOT Next.js) plus \`backend/\` (**Koa + Sequelize + PostgreSQL**, NOT Fastify, NOT a pnpm monorepo). **NEVER use Next.js or Fastify for L-tier.** L tier additionally ships **production layers** that M does not: \`backend/src/workers/\` + \`backend/src/queue/inProcessQueue.ts\` (background-job queue with BullMQ-shaped API and in-process fallback), \`backend/src/config/logger.ts\` (pino) + \`backend/src/middlewares/requestLogger.ts\`, \`backend/src/middlewares/rateLimit.ts\`, and a \`docker-compose.yml\` that brings up postgres + redis by default. Any background-job / async-pipeline feature MUST register its worker through \`backend/src/workers/index.ts\` and use \`enqueueJob\` / \`registerWorker\` from \`backend/src/queue/inProcessQueue.ts\`; do NOT plan a task that introduces a parallel queue or worker bootstrap. Final registration closure is still handled by \`integrationVerifyAndFix\` in \`frontend/src/router.tsx\`, \`backend/src/api/modules/index.ts\`, and \`backend/src/app.ts\` — same as M.

**L-tier task granularity rules (overrides the "merge aggressively" default below for L-tier):**
- **Data Layer**: split by bounded context when there are 3+ distinct domains (e.g. one task for user/session models, one for scoring/rules models, one for data-source/adapter models). A single Data Layer task is only acceptable for PRDs with ≤ 3 models total.
- **Backend Services**: one task **per service or domain module** — e.g. "Data Ingestion Service", "Scoring Engine", "Admin API", "Notification Service" are separate tasks. Do NOT merge them into one task.
- **Background Workers**: each distinct scheduled/async job is its own task (e.g. "Periodic Scoring Worker", "Data Sync Worker").
- **Frontend**: one task per page or major flow (app-shell first, then one task per PRD page / CMP group). Do not merge multiple pages into one task.
- **Expected range**: PRDs with 10–20 pages typically warrant 25–45 tasks for L-tier. If you are generating fewer than 20 tasks for a PRD with 10+ pages or 30+ requirement IDs, you are merging too aggressively — split until each task has a clear, single deliverable that one coding agent can implement well.`,
};

/**
 * Phase + canonical-file guide shared by M and L tiers. They share the same
 * stack (Vite + React + Koa + Sequelize + Postgres) and the same flat
 * `frontend/` + `backend/` layout, so the task-shape rules are identical;
 * L-tier additional layers (workers, queue, pino logger, rate limit) are
 * appended via `lTierAddendum()` below.
 */
function flatStackPhaseGuide(): string {
  return `

## Tier M / L — phases and task shape
Use **coarse-grained** tasks unless the PRD forces more splits. Typical **phase** labels (merge if empty):
- **Scaffolding** — Only if the PRD needs **extra** tooling not already in the template; otherwise **omit** or fold into **Integration**. Never plan \"greenfield\" recreation of \`frontend/\` or \`backend/\`.
- **Data Layer** — Prefer **one** broad task: Sequelize models (schema built by \`sequelize.sync()\` at boot — no migrations), request validation, and persistence wiring in \`backend/src\`.
  - Data-layer subSteps MUST explicitly cover cross-file consistency between ORM model fields, request DTO/types, validation schemas, and service/controller create/update payloads.
  - System-generated fields (e.g. \`id\`, \`createdAt\`, \`updatedAt\`, timestamp aliases, slugs generated by the server) must be identified as server-managed unless the PRD explicitly says the client supplies them.
  - For M-tier Sequelize projects, use exactly one canonical DB entry file: \`backend/src/db.ts\`. Do not plan a second database bootstrap file such as \`backend/src/config/database.ts\` or \`backend/src/database/connection.ts\` unless you are MODIFYING the existing canonical file.
  - HARD SPLIT RULE: Do **NOT** combine backend model/bootstrap work with frontend API client generation in the same task. If both are needed, emit separate tasks.
- **Backend Services** — **REQUIRED for full-stack.** Start with ONE broad backend task, then apply these **mandatory split rules**:
  - **SPLIT RULE (HARD)**: If the PRD describes **4 or more distinct resource types** (e.g. users, products, orders, payments, reports) — each with their own CRUD operations — split backend tasks **by resource domain** (e.g. "User & Auth API", "Product & Inventory API", "Order & Payment API"). A single backend task that covers 4+ resources will always be incomplete because one coding agent cannot implement 20+ endpoints in a single task.
  - **SPLIT RULE (HARD)**: If the total estimated API endpoint count is **8 or more**, split backend tasks so that no single task has more than 6 endpoints.
  - **CRUD COMPLETENESS (MANDATORY)**: For every data entity that has a Sequelize model, the backend task that owns that entity MUST implement ALL FIVE standard operations even if the PRD only mentions a subset: list (\`GET /api/{entities}\`), get-one (\`GET /api/{entities}/:id\`), create (\`POST /api/{entities}\`), update (\`PUT /api/{entities}/:id\`), and delete (\`DELETE /api/{entities}/:id\`). The only valid exception is when the PRD explicitly states an operation is forbidden (e.g. "records can never be deleted"). Missing CRUD operations produce apps where users cannot add new records, edit existing ones, or clean up stale data — even if the PRD didn't describe each endpoint individually, the app is incomplete without them.
  - **EXCEPTION (HARD)**: If a backend feature is a **multi-step pipeline that integrates more than 3 external HTTP APIs / third-party services** (e.g. news aggregator hitting HackerNews + Google News + Jina + OpenAI + multiple market venues; a scanner combining Twitter API + Jina + OpenAI + Polymarket + HyperLiquid + Deribit), it MUST NOT be a single task. Split it into at least 3 tasks: (a) external-API client layer, (b) pipeline orchestration / business logic, (c) HTTP routes + SSE/queue wiring. See "External API complexity split (HARD RULE)" below for the full specification.
- **Integration (contracts/client)** — Add an **early** task that defines/aligns API contracts + frontend API client in \`frontend/src/api\` with PRD IDs before page implementation.
  - HARD SPLIT RULE: If the task would create files in both \`backend/src\` and \`frontend/src\`, keep it limited to shared contract/type alignment plus client bindings. Do not also bundle root infra files like \`.env\` or \`docker-compose.yml\` into that same task.
- **Frontend** — follow these four steps IN ORDER before writing a single frontend task:

  **STEP 1 — PAGE INVENTORY**: List every distinct page in the PRD as a numbered list (e.g. 1. Login page, 2. Dashboard page, 3. Admin Approvals page, 4. Admin Settings page …). A "page" = a unique URL/route. Pages in the same role section (admin, teacher, family) are still separate pages — do NOT group them. Count the total: N pages.

  **STEP 2 — TITLE FORMAT (ABSOLUTE RULE, zero exceptions)**:
  Every frontend page task title MUST match this template exactly: **"Implement [SinglePageName] page"**
  - ONE noun phrase, singular, no conjunctions.
  - The word **"and"** may NEVER appear in a frontend page task title — not for "closely related" pages, not for admin pages, not for teacher pages, not for any reason.
  - The word **"pages"** (plural) may NEVER appear unless the task is the app shell (which is not a page task). A plural signals multiple pages merged — split them.

  **STEP 3 — COUNT CHECK**: After writing all frontend tasks, count your page-level tasks (excluding the app shell). That count MUST equal N from STEP 1. If it is less, you have illegally merged tasks — find each task with "and" or plural in the title and split it before continuing.

  **STEP 4 — FILES CHECK**: Every page task's \`files.creates\` MUST contain exactly ONE file under \`frontend/src/views/\`. If any task lists two view files, split it immediately into two tasks.

  **WHY MERGING BREAKS THE APP**: When a coding agent receives "Implement admin approvals and user management pages", it attempts to implement two full pages in a single pass and always leaves at least one incomplete or wired with placeholder data. Every merged task directly causes a broken page in the generated app — this is not a style issue, it is a correctness issue.

  Additional frontend rules:
  - The **first** frontend task MUST be the app shell / layout (sidebar, topbar, navigation skeleton, auth guards). It has no "and", no plural, and does not fetch data.
  - **SPLIT SIGNAL**: If a frontend task's \`estimatedHours\` would exceed **0.5h**, it covers too much — split it.
  - Coding tasks should build the shell, navigation UI, and pages, but **must not** do the final route registration in \`frontend/src/router.tsx\`; that closure is handled by \`integrationVerifyAndFix\`.
  - **MANDATORY for every page-level frontend task**: the task \`description\` and at least one \`subStep\` MUST explicitly list every backend API endpoint the page reads from or writes to (e.g. \`GET /api/projects\`, \`POST /api/projects\`, \`DELETE /api/projects/:id\`). Derive these from the PRD and the Backend Services task's file list. If no endpoint applies (e.g. a static layout task), state "no API calls required" explicitly.
  - **FORBIDDEN in frontend tasks**: any subStep that says "use mock data", "hardcode data", or "TODO: replace with API". All data must come from real API calls via the frontend API client.
- **Integration** — **Optional** single task: Vite proxy assumptions, Koa CORS/auth headers, frontend API client error handling, and env/config alignment between frontend and backend.
- **Testing** — **Do not** add separate tasks with phase "Testing". Instead, every P0/P1 implementation task MUST include an embedded \`tddPlan.tests[]\` array so Test Writer / Runtime Executor can create RED/GREEN evidence for that task.

**Bad for M / L — frontend (every line below is a violation that MUST be split):**
- "Implement authentication **and** onboarding pages" → 2 tasks: "Implement Authentication page" + "Implement Onboarding page"
- "Implement course catalog **and** teacher directory pages" → 2 tasks
- "Implement group enrollment **and** lecture/camp pages" → 2 tasks
- "Implement payment **and** billing pages" → 2 tasks
- "Implement my lessons **and** cart management pages" → 2 tasks
- "Implement family profile **and** messages pages" → 2 tasks
- "Implement teacher schedule **and** work hours pages" → 2 tasks
- "Implement teacher students **and** profile pages" → 2 tasks
- "Implement admin approvals **and** user management pages" → 2 tasks
- "Implement admin course **and** enrollment management pages" → 2 tasks
- "Implement admin finance **and** settings pages" → 2 tasks
- "Implement course enrollment **pages**" creating 3 view files → 3 tasks
- Any frontend task where \`files.creates\` has 2+ entries under \`frontend/src/views/\`

**Bad for M / L — backend / other:**
- a single "Backend Services" task that covers 8+ endpoints across 4+ resource types;
- separate tasks per tiny UI component, or \"create frontend/package.json from scratch\";
- bundling a multi-venue / multi-API pipeline (e.g. \"Implement feed aggregation pipeline and APIs\" doing HackerNews + Google News + Jina + OpenAI + Polymarket + HyperLiquid + Deribit + BullMQ + SSE + REST routes all in one task — this MUST be split, see External API complexity split rule).

**Good for M / L:**
- one contracts/client task, one app-shell/layout task, backend tasks split by resource domain when 4+ resource types exist, then **one task per PRD page** like "Implement Private Enrollment page", "Implement Group Enrollment page", "Implement Lecture/Camp Enrollment page";
- when a multi-API pipeline exists, split it into 3 tasks like "Build external API clients for {services}", "Implement {pipeline-name} orchestration", "Add {pipeline-name} HTTP routes + SSE streaming".
${flatStackScaffoldCanonicalBlock()}`;
}

/**
 * "Scaffold utilities are CANONICAL" block, shared by both the horizontal
 * (`flatStackPhaseGuide`) and vertical (`verticalSlicePhaseGuide`) guides so the
 * canonical-path rules are stated identically. Extracted verbatim from the
 * original inline block — the flag-off output stays byte-for-byte unchanged.
 */
function flatStackScaffoldCanonicalBlock(): string {
  return `
## Tier M / L — scaffold utilities are CANONICAL (do not re-plan)
The scaffold already provides the following files. NEVER plan a task whose subSteps create or "redesign" these — feature tasks must \`reads\` / \`modifies\` them only.
- \`frontend/src/api/client.ts\` — the ONLY HTTP client. Never plan \`frontend/src/utils/apiClient.ts\`, \`frontend/src/utils/api.ts\`, \`frontend/src/lib/http.ts\`, or any other parallel HTTP wrapper.
- \`backend/src/types/koa.d.ts\` — global \`koa\` module augmentation that types \`ctx.request.body\`. Never plan a duplicate augmentation file in feature scope.
- \`backend/src/utils/jwt.ts\` — canonical \`signJwt\` / \`verifyJwt\`. Never plan a custom JWT helper file in feature tasks.
- \`backend/src/utils/narrow.ts\` — \`parseEnumLiteral\` / \`asRecord\` helpers. Reference these instead of planning ad-hoc narrowing utilities.
- \`backend/src/middlewares/errorHandler.ts\`, \`backend/src/middlewares/cors.ts\` — already wired in \`backend/src/app.ts\`.

When a task needs JWT, body parsing, narrowing, or HTTP requests, list the relevant scaffold path under \`files.reads\` and have the subStep say "import from existing scaffold utility" rather than "create a new utility module".
`;
}

/**
 * L-tier ONLY supplement: workers, queue, pino logger, rate limit, docker.
 * Appended after `flatStackPhaseGuide()` so the LLM treats them as additional
 * deliverables on top of the shared M/L base.
 */
function lTierAddendum(): string {
  return `

## Tier L — production layers (in addition to the M / L base above)
The L-tier scaffold ships these files. NEVER plan a task whose subSteps recreate them.

- \`backend/src/config/logger.ts\` — pino instance + \`childLogger({ requestId, ... })\`. Feature code MUST use \`ctx.state.log\` inside HTTP handlers and \`childLogger(...)\` inside workers. Do NOT add \`console.log\` to feature code.
- \`backend/src/middlewares/requestLogger.ts\` — generates / propagates \`requestId\`, attaches a child logger to \`ctx.state.log\`, logs request completion. Already wired in \`app.ts\` first.
- \`backend/src/middlewares/rateLimit.ts\` — \`createRateLimit({ windowMs, max })\`. Apply per-route via \`router.use(createRateLimit({...}))\` inside a module's routes file. Do NOT plan a parallel rate-limit helper.
- \`backend/src/queue/inProcessQueue.ts\` — \`enqueueJob<TInput, TOutput>(queueName, payload)\` returns a \`runId\`. \`registerWorker(queueName, handler, options?)\` registers a worker. Worker bootstrap lives in \`backend/src/workers/index.ts\` — \`startAllWorkers()\` is invoked by \`server.ts\` **before** \`app.listen(...)\`.
- \`backend/src/workers/index.ts\` — central worker registry. Any new background-job feature MUST register its worker here. Do NOT plan a separate worker bootstrap file.
- \`docker-compose.yml\` — brings up \`postgres\` + \`redis\` (host-mapped 5432 / 6379). \`--profile full\` additionally builds backend + frontend images. Feature tasks should NOT plan a parallel \`docker-compose.yml\`.
- \`frontend/src/api/safeArray.ts\` — \`safeArray()\` / \`mapSafe()\` / \`hasItems()\`. Frontend page tasks MUST use these when rendering API-sourced lists; do NOT inline \`(data?.items ?? []).map(...)\` repeatedly.

### L-tier specific task-shape requirements
- **Background job task** = ONE task that delivers ALL of: (a) the worker file under \`backend/src/workers/<feature>Worker.ts\`, (b) the worker registration line in \`backend/src/workers/index.ts\`, (c) the public enqueue + status endpoint in \`backend/src/api/modules/<feature>/\`, (d) the SSE / polling consumer in \`frontend/src\`, (e) the structured \`logger.info({ ... }, "<event>")\` lines at start / external-call / success / fail / complete, (f) the \`inproc:*\` runId pass-through in the response. Do NOT split (a)-(f) across tasks — they are tightly coupled.
- **Auth / rate limiting**: protect mutating routes by composing \`createRateLimit(...)\` with the auth middleware in the module's routes file; do NOT wrap them in a new top-level middleware.
`;
}

/**
 * Vertical-slice phase guide (flag-gated by BLUEPRINT_VERTICAL_SLICE=1, M/L
 * tiers only). Re-cuts the breakdown from horizontal layer/page fragments into
 * vertical feature/flow slices owned end-to-end by one fullstack worker, on top
 * of a shared Foundation. Used INSTEAD of `flatStackPhaseGuide()` when the flag
 * is on; the horizontal guide stays the default. See
 * docs/vertical-slice-breakdown-design.md §3-§5.
 */
function verticalSlicePhaseGuide(): string {
  return `

## Tier M / L — VERTICAL FEATURE SLICES (flag: BLUEPRINT_VERTICAL_SLICE)
Cut the breakdown into **vertical feature slices**, NOT horizontal layer/page
fragments. The OLD "one task per page" and "never combine FE+BE in one task"
rules are **OVERRIDDEN** here: a feature slice deliberately spans both layers.

### Phase 1 — Foundation (build FIRST, shared, NOT per-feature)
These are shared and built before any Feature slice. Use the existing phase
labels so they map to the architect/backend roles:
- **Scaffolding / Data Layer / Infrastructure** (phase → architect): app shell /
  layout / router skeleton, design tokens + shared UI primitives, the base API
  client, DB bootstrap, and the **shared Sequelize models** (ONE canonical model
  per entity — features READ these, they do NOT redefine them).
- **Shared API contracts / types** (early): align API contracts + shared types so
  every slice wires to the same signatures. These are foundation, not per-slice,
  so two slices cannot define conflicting models or contracts.

### Phase 2 — one \`Feature\` task per USER FLOW
After Foundation, emit ONE task with phase **\`Feature\`** per user flow. A flow =
- a **page** (or ≤ 3 closely-related views) for that capability, PLUS
- ALL its interactive controls wired to the real API client — non-empty handlers
  that actually perform their effect (call the endpoint / navigate / update
  state); NEVER an inert control, PLUS
- the backend **endpoint(s) that flow OWNS** — implement them IN THIS SAME TASK
  (route + service + validation under \`backend/src/api/modules/...\`), PLUS
- the resulting navigation / state effect.

A \`Feature\` task's \`files.creates\` MAY span BOTH \`frontend/src/...\` AND
\`backend/src/api/modules/...\` — this is the entire point of the vertical cut. Do
NOT split a flow back into a page-only task and an endpoint-only task.

CRUD on one resource exercised by one page = ONE Feature slice (page + its
endpoints + wiring), not three layer-split tasks.

### Granularity cap (budget gate)
A Feature slice must fit one coherent generation:
- soft cap: ≤ ~6 OWNED endpoints **and** ≤ 3 views per slice.
- If a flow exceeds the cap, **sub-split along SUB-FLOWS** (e.g. "checkout:
  payment step" vs "checkout: confirmation step"), where each sub-flow is STILL a
  complete chain (its own page + handlers + owned endpoints). NEVER sub-split back
  into page-only / endpoint-only fragments.

### Shared-endpoint arbitration
If two flows hit the same endpoint, the FIRST/owning slice implements it; the
other slice CONSUMES it via the frozen contract (does not re-implement).

### Embedded TDD (still required)
Every \`Feature\` task MUST embed a \`tddPlan\` with at least one
**route-smoke / interaction** test that asserts the WHOLE chain inside the
slice: render the route, simulate the page's PRIMARY interaction (click/submit),
and assert the click → API call (with the expected payload) → effect
(navigation / state change). \`expectedGreen\` must name the interaction and its
effect. The slice owns the endpoint, so this test can assert the real call.
Do NOT emit standalone phase "Testing" tasks.
${flatStackScaffoldCanonicalBlock()}`;
}

/**
 * Pure selector for the phase guide. Extracted so the flag-gating logic is
 * unit-testable without constructing the whole agent. Returns the vertical
 * Feature guide when the flag is on AND the tier is M/L; otherwise the
 * horizontal flat-stack guide (the default). Returns "" for non-M/L tiers.
 */
export function selectPhaseGuide(
  scaffoldTier: "S" | "M" | "L",
  verticalSliceFlag: boolean,
): string {
  if (scaffoldTier !== "M" && scaffoldTier !== "L") return "";
  return verticalSliceFlag
    ? verticalSlicePhaseGuide()
    : flatStackPhaseGuide();
}

/**
 * Existing-task context + requirement-scope instructions for INCREMENTAL mode.
 *
 * Sibling prompt builder to `buildSystemPrompt`. The base system prompt is
 * built once at agent construction and only depends on tier/scaffold/skills,
 * so per-call incremental context is threaded through the *user* message
 * (same pattern as `improvementNotes`). When this block is present the model
 * must generate ONLY tasks for the listed requirement IDs and must not
 * regenerate or duplicate the existing tasks.
 *
 * Returns an empty string when no incremental payload is supplied, leaving the
 * full-breakdown path byte-for-byte identical to before.
 */
function buildIncrementalInstructionBlock(incremental?: {
  existingTasks: Array<{
    id: string;
    title: string;
    coversRequirementIds: string[];
  }>;
  requirementsToCover: string[];
}): string {
  if (!incremental || incremental.requirementsToCover.length === 0) return "";

  const existingLines =
    incremental.existingTasks.length > 0
      ? incremental.existingTasks
          .map((t) => {
            const covers =
              t.coversRequirementIds.length > 0
                ? ` — covers ${t.coversRequirementIds.join(", ")}`
                : "";
            return `- \`${t.id}\`: ${t.title}${covers}`;
          })
          .join("\n")
      : "(none)";

  // Suggest the next sequential T-id so the model continues the existing
  // naming convention. The caller re-IDs defensively, so this is a hint only.
  const maxNum = incremental.existingTasks.reduce((max, t) => {
    const m = /^T-(\d+)$/.exec(t.id);
    if (!m) return max;
    const n = Number.parseInt(m[1]!, 10);
    return Number.isNaN(n) ? max : Math.max(max, n);
  }, 0);
  const nextId = `T-${String(maxNum + 1).padStart(3, "0")}`;

  return [
    "## INCREMENTAL MODE — generate ONLY new tasks (do NOT re-break-down the whole PRD)",
    "",
    "The task list below already exists and is considered **done**. The PRD was",
    "edited; only a small set of requirement IDs are new or changed. Your job is",
    "to emit ONLY the additional tasks needed to cover those new/changed IDs.",
    "",
    "Hard rules:",
    "1. **Do NOT** regenerate, renumber, restate, or duplicate any existing task",
    "   listed under §Existing tasks. Treat them as already-implemented.",
    "2. Generate NEW tasks **only** for the requirement IDs in §Requirements to",
    "   cover. Every new task's `coversRequirementIds` MUST include at least one",
    "   of those IDs. Do not emit tasks for requirements already covered by an",
    "   existing task.",
    `3. Continue the existing ID naming convention. Existing IDs go up to ` +
      `\`T-${String(maxNum).padStart(3, "0")}\`, so start new IDs at \`${nextId}\` ` +
      "and increment sequentially.",
    "4. Keep the SAME output JSON schema (an array of task objects) described in",
    "   the Output Format section. Output ONLY the JSON array — no prose.",
    "",
    "## Requirements to cover (" +
      incremental.requirementsToCover.length +
      ")",
    "",
    incremental.requirementsToCover.map((id) => `- ${id}`).join("\n"),
    "",
    "## Existing tasks (already done — do NOT touch these)",
    "",
    existingLines,
  ].join("\n");
}

function buildSystemPrompt(
  tier: ProjectTier,
  scaffoldBlock?: string,
  skillsBlock?: string,
  scaffoldTier?: "S" | "M" | "L",
): string {
  const effectiveScaffoldTier = scaffoldTier ?? (tier as "S" | "M" | "L");
  const tierStyle = TIER_CODING_STYLE[tier];
  // Vertical-slice "Feature" guide is flag-gated (M/L only); otherwise the
  // horizontal flat-stack guide is the default. selectPhaseGuide is a pure
  // selector so the gating is unit-testable.
  const phaseGuide = selectPhaseGuide(
    effectiveScaffoldTier,
    process.env.BLUEPRINT_VERTICAL_SLICE === "1",
  );
  const lAddendum = effectiveScaffoldTier === "L" ? lTierAddendum() : "";
  const scaffoldSection =
    scaffoldBlock && scaffoldBlock.trim().length > 0
      ? `\n${scaffoldBlock.trim()}\n`
      : "";
  // Skills auto-discovered by the loader from `.blueprint/skills/task-breakdown/`.
  // Empty when no trigger matched — section omitted from prompt in that case.
  const skillsSection =
    skillsBlock && skillsBlock.trim().length > 0
      ? `\n${skillsBlock.trim()}\n`
      : "";

  return `You are a senior Engineering Lead that produces detailed coding task breakdowns.

## Your Role
Analyze the provided documents to produce a list of **coding tasks**. Each task is a concrete
unit of work that can be assigned to a developer or AI coding agent.
Each task MUST include detailed implementation sub-steps and token usage estimates.

## CRITICAL: Determine Project Type FIRST
Before generating tasks, analyze the PRD to determine the project type:

1. **Frontend-only** — ONLY when the PRD **explicitly** states one or more of: "no backend", "no API", "no database",
   "no server", "single-page app", "client-side only", "localStorage only", or the described product is inherently
   compute-only with zero data persistence (e.g. a pure offline timer, offline calculator, static game with no scores).
   **Do NOT classify as frontend-only** just because the PRD describes a simple or small product — if there is any
   mention of saving data, user accounts, multi-user access, notifications, or any server-side feature, it is full-stack.
   → Use **React + Vite + TypeScript + Tailwind CSS**. NEVER use Next.js.
   → **The stack is FIXED even for the simplest app.** NEVER produce a vanilla HTML/CSS/JS three-file site (\`index.html\` + \`styles.css\` + \`script.js\` at the repo root). All UI is React components/views under \`frontend/src/\`; all tests are vitest (\`*.test.tsx\`), never browser-opened HTML harnesses. "Simple scope" means FEWER tasks, NOT a downgraded tech stack.
   → Allowed phases: "Scaffolding", "Frontend" ONLY (do NOT use phase "Testing").
   → Do NOT generate "Data Layer", "Backend Services", "Auth & Gateway", "Infrastructure", or "Integration" tasks.
   → Do NOT use Prisma, API routes, Docker, Kubernetes, or any server-side technology.

2. **Full-stack with separate backend** — The PRD requires persistence, APIs, user data, or a separate backend service.
   → **S-scope using M scaffold** (S-tier PRD with backend): scaffold is **identical to M-tier** — **Koa + Sequelize** backend in \`backend/\`, **Vite + React** frontend in \`frontend/\`. Follow all M-tier conventions below. **NEVER use Express/Node or a single-repo layout for this case.**
   → **M-tier**: **Koa + Sequelize** backend in \`backend/\`, **Vite + React** frontend in \`frontend/\`. **NEVER use Next.js for M-tier.** **NEVER use Prisma** — Prisma's binary footprint and separate migration runner are not supported here. All persistence goes through Sequelize models, associations, and migrations.
   → **L-tier**: **same stack as M-tier** (Koa + Sequelize backend in \`backend/\`, Vite + React frontend in \`frontend/\`) PLUS production layers: \`backend/src/workers/\` + \`backend/src/queue/inProcessQueue.ts\` (background-job queue, BullMQ-shaped, with in-process fallback), pino logger (\`backend/src/config/logger.ts\`) wired via \`requestLoggerMiddleware\`, \`createRateLimit\` middleware, and \`docker-compose.yml\` running postgres + redis. **NEVER use Next.js, Fastify, or a pnpm monorepo for L-tier** — that is the old layout and no longer exists. **NEVER use Prisma** at any tier.
   → All phases are allowed except **Testing** (do not emit phase "Testing"). Backend Services phase is **mandatory** — see rule below.

## CRITICAL: Mandatory phases for full-stack projects
For any full-stack full-stack project, the output MUST contain:
- At least **one task with phase "Backend Services"** — implementing the actual API routes, controllers, and domain logic in \`backend/src\`. The scaffold ships starter shells; your task adds the feature code.

## TRD / PRD artifact coverage

Project-specific artifact-coverage rules (TRD §3.5 CLI scripts, TRD §3.2
data models, magic-link callback page, intermediate "waiting state" pages,
etc.) are now declared as **skills** under \`.blueprint/skills/task-breakdown/\`.
The applicable skills for this run are listed in the **Skills auto-applied
to this project** section below. Each lists its hard rules + self-check
inline — read them when present and treat them as binding.

<!-- TRD/PRD artifact coverage migrated to skills system, see SKILLS block below -->
## CRITICAL: OAuth / social-login wiring (scaffold ships SDK; you wire it)
The scaffold's optional-feature layer (\`scaffolds/<tier>/_optional/auth-*\`) is automatically copied into the project when the kickoff resource detector declares a matching trigger env (e.g. \`VITE_PRIVY_APP_ID\` → \`auth-privy\`). When applied, the scaffold has ALREADY shipped:

- \`frontend/src/providers/PrivyProvider.tsx\` (or \`ClerkProvider\` etc.) — real SDK wrapper reading \`import.meta.env.VITE_PRIVY_APP_ID\`.
- \`frontend/src/providers/AppProviders.tsx\` — overwrites base; mounts \`<PrivyAuthProvider>\` around \`<AuthProvider>\` so \`main.tsx\` is unchanged.
- \`frontend/src/components/auth/LoginModal.tsx\` — overwrites base; uses \`usePrivy().login()\` and forwards Privy access token via \`onLogin?.(privyToken)\`.
- \`frontend/src/hooks/usePrivyAuthBridge.ts\` — optional helper that auto-syncs Privy token into AuthContext.
- \`backend/src/middlewares/privyAuth.ts\` + \`backend/src/privy/client.ts\` + \`backend/src/api/modules/auth/auth.routes.ts\` — token-verification middleware and a \`/auth/me\` route.
- \`@privy-io/react-auth\` (frontend) and \`@privy-io/node\` (backend) added to \`dependencies\` automatically.

You do NOT need to plan tasks that re-create any of those files. The auth-related task list MUST instead:

1. **App-shell / layout task**: list whatever top-level component renders the router (e.g. \`frontend/src/App.tsx\` or the layout) in \`files.modifies\` with a subStep \"call \`usePrivyAuthBridge()\` once near the root so apiClient gets the Bearer token automatically\". DO NOT plan to modify \`AppProviders.tsx\` — it is already overwritten.
2. **Landing / login page task**: list the landing page (e.g. \`frontend/src/views/LandingPage.tsx\`) in \`files.modifies\` with a subStep \"render \`<LoginModal>\` and pass \`onLogin={(privyToken) => useAuth().login(privyToken)}\`; do not re-implement the modal\". The token is then automatically attached as \`Authorization: Bearer <privyToken>\` by \`apiClient\`, and the backend \`privyAuthMiddleware\` (already shipped) verifies it on every request.
3. **Backend user lookup**: any controller/service that consumes \`ctx.state.user.id\` MUST resolve the Privy DID to the internal DB UUID first (see the External Identity vs DB PK rule in the backend role prompt). This usually shows up as a 1-line subStep in EACH backend task that reads the current user.
4. **DO NOT** plan a task whose subStep is \"install \`@privy-io/react-auth\`\" or \"replace placeholder LoginModal\" — both are already done by the optional scaffold.

If the PRD describes a different OAuth provider that is NOT yet a registered \`_optional/auth-*\` feature (e.g. custom Auth0 setup), then you MAY plan a task that creates the SDK Provider + LoginModal — but flag it in the task description as \"scaffold optional feature missing for this provider; falling back to in-task implementation\".

**Acceptance criterion** for any OAuth task: \"the LandingPage wires \`onLogin\` to \`useAuth().login(privyToken)\`; some top-level component calls \`usePrivyAuthBridge()\`; backend controllers do NOT call \`findByPk(ctx.state.user.id)\` directly — they resolve via \`privy_id\` first.\"

This rule is **independent** of the External API split rule and the Background-job lifecycle rule below.

## TDD seed plan — REQUIRED for P0/P1 tasks
Do not emit standalone testing tasks. Instead, embed a \`tddPlan\` object in each P0/P1 task:
- Backend route/API tasks MUST include at least one \`api-contract\` test.
- Frontend API client tasks MUST include at least one \`frontend-service\` test.
- Page/route tasks MUST include at least one \`route-smoke\` test that (a) proves the route renders the real page (not a placeholder) AND (b) simulates the page's PRIMARY interaction (click the main button / submit the form) and asserts its effect — the API client method called with the expected payload, navigation to the target route, or the declared state change. \`expectedGreen\` MUST name the interaction and its effect (e.g. "clicking Pay calls paymentsApi.create with the cart payload and navigates to /confirmation"). Author the interaction-flow assertion at priority **P1** (it should surface and drive repair, not hard-block the gate) unless it guards a critical auth/payment flow.
- Runtime/dependency tasks MUST include at least one \`runtime-smoke\` test for local startup/fallback behavior.
- Each test MUST state the exact test file path, command, expected RED failure, and expected GREEN result.
- **Test runner is FIXED — never invent one (HARD RULE):** the scaffold always ships **vitest** (unit / component / service) and **playwright** (e2e). EVERY test you plan MUST run under one of these. This is NOT a judgement call about the project's tech stack — the stack is always Vite + React + TypeScript (frontend) and Koa + Sequelize (backend), and the test tooling is always vitest + playwright.
  - Test files MUST be \`*.test.ts\` / \`*.test.tsx\` (vitest) or a playwright spec under \`frontend/tests/e2e/\`. NEVER a standalone \`*.html\` file, and NEVER a test that targets \`index.html\` / \`styles.css\` / \`script.js\` as if the app were a vanilla HTML/CSS/JS page — the app is React/TypeScript under \`frontend/src/\`.
  - \`command\` MUST be a real, headless runner invocation: \`pnpm test <file>\` / \`pnpm vitest run <file>\` / \`pnpm exec playwright test <file>\` (prefix \`cd frontend &&\` / \`cd backend &&\` as needed). NEVER a manual step like "open … in browser", "open the test page", or any instruction a human performs by hand.
  - Assertions MUST use vitest \`expect(...)\` (or Playwright \`expect\`). Do NOT hand-roll a custom \`assert(...)\` harness.
- **Test file extension (HARD RULE):** any test that renders a React component (imports a \`.tsx\` and uses \`render(<Component />)\` / JSX) MUST use a \`.test.tsx\` extension — NEVER \`.test.ts\`. esbuild cannot parse JSX inside a \`.ts\` file, so a \`.ts\` React test fails to transform and permanently breaks the TDD gate. Use \`.test.ts\` only for pure-logic tests (hooks/services/utils with no JSX).

Example \`tddPlan\`:
\`\`\`json
"tddPlan": {
  "tests": [
    {
      "id": "TDD-AUTH-LOGIN-001",
      "type": "api-contract",
      "priority": "P0",
      "file": "backend/src/api/modules/auth/auth.routes.test.ts",
      "command": "cd backend && pnpm test auth.routes.test.ts",
      "expectedRed": "POST /api/v1/auth/login returns 404 or not implemented before route exists",
      "expectedGreen": "valid email/password returns 200 with accessToken, refreshToken and user role"
    }
  ]
}
\`\`\`

## Task count — derive from PRD (no fixed quota)
- **Do not** target a predetermined number of tasks. The **only** driver for how many tasks to output is **document scope**: user flows, pages, APIs, data stores, integrations, and **coverage of every AC/FR (and PAGE-*/CMP-* if listed)** via \`coversRequirementIds\`.
- **Derive** the list by: (1) enumerating what must exist in code to satisfy the PRD; (2) grouping into tasks that respect dependencies and parallelizable units; (3) **merging** work that belongs in one deliverable; **splitting** only when dependency order or review boundaries require it.
- **Fewer tasks** for narrow PRDs; **more tasks** only when the PRD truly implies many separable surfaces (many pages, many services, strict phases). Never add filler tasks to match an imagined count.
- **ProjectTier** (S/M/L) below is a **style and stack hint** — it does **not** set a minimum or maximum number of tasks.
- **HARD LIMIT — S-tier (frontend-only)**: When the project is a pure frontend S-tier app (no backend, scaffold is still S), MUST NOT exceed **4 tasks total**. If generating more than 4 tasks, merge related work until at or below 4. Typical breakdown: (1) Scaffolding + project setup, (2) Core feature(s), (3) UI polish + integration, (4) optional infra — collapse further for thin-scope PRDs. **This limit does NOT apply when the S-scope PRD needs a backend (M scaffold used).**

## Project tier hint (style only — not task count)
${tierStyle}
${phaseGuide}${lAddendum}${scaffoldSection}${skillsSection}
## Output Format — strict JSON array

You MUST output ONLY a JSON array (no markdown fences, no explanation, no preamble).
Each element has this shape:

{
  "id": "T-001",
  "phase": "Scaffolding",
  "title": "Initialize Vite + React project (S-tier only — M/L scaffold is already copied)",
  "description": "S-tier only: Setup package.json with Vite, vite.config.ts, index.html, src/main.tsx. The scaffold uses Tailwind CSS v4 via @tailwindcss/vite plugin — do NOT create tailwind.config.js or postcss.config.js.",
  "estimatedHours": 2,
  "humanReviewHours": 0,
  "executionKind": "ai_autonomous",
  "files": {
    "creates": ["package.json", "vite.config.ts", "tsconfig.json", "index.html", "src/main.tsx", "src/index.css"],
    "modifies": [],
    "reads": []
  },
  "dependencies": [],
  "priority": "P0",
  "subSteps": [
    { "step": 1, "action": "Create package.json", "detail": "Initialize with name, version, type: module, scripts (dev: vite, build: vite build, preview: vite preview), dependencies (react, react-dom, react-router-dom), devDependencies (vite, @vitejs/plugin-react, @tailwindcss/vite, typescript, @types/react, @types/react-dom, tailwindcss). NOTE: tailwindcss v4 uses @tailwindcss/vite plugin — do NOT add postcss, autoprefixer, or tailwind.config.js." },
    { "step": 2, "action": "Create vite.config.ts", "detail": "Import defineConfig from vite, react from @vitejs/plugin-react, tailwindcss from @tailwindcss/vite. Add both to plugins array. No postcss.config.js needed." },
    { "step": 3, "action": "Create index.html and entry point", "detail": "Root HTML with div#root and script type=module src=/src/main.tsx. Create src/main.tsx with ReactDOM.createRoot." },
    { "step": 4, "action": "Create src/index.css", "detail": "Add @import 'tailwindcss'; at the top. This is all that is needed for Tailwind v4 — no @tailwind base/components/utilities directives." }
  ],
  "tokenEstimate": {
    "inputTokens": 2000,
    "outputTokens": 3500,
    "totalTokens": 5500,
    "estimatedCostUsd": 0.08
  },
  "acceptanceCriteria": [
    "pnpm install runs without errors",
    "pnpm build succeeds without errors",
    "pnpm dev starts the dev server on localhost"
  ],
  "coversRequirementIds": ["AC-01", "FR-FE01", "F-01"],
  "tddPlan": {
    "tests": [
      {
        "id": "TDD-T-001-001",
        "type": "runtime-smoke",
        "priority": "P0",
        "file": "tests/runtime/startup.test.ts",
        "command": "pnpm test tests/runtime/startup.test.ts",
        "expectedRed": "startup smoke fails before the feature wiring exists",
        "expectedGreen": "startup smoke passes with the generated app booting cleanly"
      }
    ]
  }
}

Field rules:
- **id**: sequential T-001, T-002, ... (string)
- **phase**: one of "Scaffolding", "Frontend", "Data Layer", "Auth & Gateway", "Backend Services",
  "Integration", "Infrastructure" (string).
  **Never** use phase "Testing" — TDD is embedded in implementation tasks via \`tddPlan.tests[]\`.
  For frontend-only projects, use ONLY "Scaffolding", "Frontend".
- **title**: short imperative sentence (< 80 chars)
- **description**: 1-3 sentences explaining what to build, which files to touch, and
  any relevant FR-xxx / US-xx references from the PRD.
- **estimatedHours**: number (0.1–2, one decimal allowed), **AI agent execution hours** ONLY (not human engineer time). AI works very fast — these ranges reflect real execution time, not human-paced estimates. Use these reference ranges:
  - Simple single-file task (one component, one route): **0.1–0.3h**
  - Moderate multi-file feature (page + service + types): **0.3–0.5h**
  - Complex multi-file task (full CRUD module, several pages): **0.5–1h**
  - Exceptionally broad task (rare): **1–2h**
  Values over 2 are almost always wrong and should be split. This field is the AI coding time only.
- **humanReviewHours**: number, hours a **human developer** would take to write this same task from scratch. **REQUIRED for ALL tasks.** Human time is typically **5-10x AI time**, since humans read docs, debug, test, and iterate. Use these reference ranges:
  - Simple single-file task: **2–4h** for a human
  - Moderate multi-file feature: **4–8h** for a human
  - Complex multi-file task: **8–24h** for a human
  - Exceptionally broad task: **24–40h** for a human
  CRITICAL: \`humanReviewHours\` MUST be **larger than** \`estimatedHours\` for every task (humans are slower than AI). Example: if \`estimatedHours\` is 1, then \`humanReviewHours\` should be 4–8.
- **executionKind**: "ai_autonomous" (AI can fully handle) or "human_confirm_after"
  (needs human review/approval after completion).
- **files**: object with three sub-arrays:
  - "creates": files this task creates from scratch. These files MUST NOT exist before this task runs.
  - "modifies": files this task edits. These MUST already exist (created by a dependency task).
  - "reads": files this task only imports or references without editing.
  - CRITICAL: A file that appears in any other task's "creates" MUST appear in this task's "modifies" or "reads", NEVER in "creates" again. No file path may appear in "creates" across more than one task.
  - **File name consistency (CRITICAL)**: Every file path used across ALL tasks MUST be identical — same capitalization, same extension, same directory. If T-003 creates \`frontend/src/views/DiffView.tsx\`, then T-006 must list \`frontend/src/views/DiffView.tsx\` in its "modifies" — NOT \`frontend/src/views/MainDiffPage.tsx\`, NOT \`frontend/src/views/diffView.tsx\`. Inconsistent naming causes the worker to look for a file that does not exist, triggering an infinite read-loop. Before emitting the final JSON, do a global name-collision pass: for every path that appears in more than one task, confirm the spelling is byte-for-byte identical.
- **dependencies**: array of task IDs that must be done first (e.g. ["T-001"]).
  - **PARALLEL BY DEFAULT**: Tasks in the same phase are almost always INDEPENDENT and should run in parallel. They share the same prerequisite (e.g. the Data Layer task), but they do NOT depend on each other.
  - **CORRECT** — Backend Services tasks T-004..T-007 all depend only on T-002 (Data Layer), NOT on each other:
      T-004 → ["T-002"]
      T-005 → ["T-002"]   (NOT ["T-004"])
      T-006 → ["T-002"]   (NOT ["T-005"])
      T-007 → ["T-002"]   (NOT ["T-006"])
  - **CORRECT** — Frontend page tasks T-012..T-014 all depend only on T-011 (App Shell), NOT on each other:
      T-012 → ["T-011"]
      T-013 → ["T-011"]   (NOT ["T-012"])
      T-014 → ["T-011"]   (NOT ["T-013"])
  - **WRONG** (serial chain — NEVER do this):
      T-005 → ["T-004"] → T-006 → ["T-005"] → T-013 → ["T-012"] → T-014 → ["T-013"]
  - Only list multiple dependencies when the task truly cannot start before **multiple independent** predecessors are all complete (e.g. a frontend page that needs both the app shell AND the API client).
  - Do **NOT** include transitive/indirect dependencies. If T-003 already depends on T-002, and T-002 depends on T-001, T-003 should NOT also list T-001 — the chain is implicit.
  - **App Shell dependency (CRITICAL)**: If the task list contains an "App Shell" or "Routing" task (a task that creates \`router.tsx\`, \`App.tsx\`, or the root layout), **every page task MUST list it as a dependency**. A page task that runs before the App Shell exists cannot be wired into the router — it creates a floating component with no entry point.
  - **Integration task dependency (CRITICAL)**: A task in the "Integration" phase that wires frontend pages to backend APIs MUST depend on BOTH:
      1. The backend API task(s) that expose the endpoints being called.
      2. The frontend page task(s) whose files it modifies to add API calls.
      Example: if T-006 (Integration) modifies \`DiffView.tsx\` and \`HistoryPage.tsx\` AND calls APIs from T-005, it MUST declare \`deps: ["T-003", "T-004", "T-005"]\` (where T-003 creates DiffView.tsx, T-004 creates HistoryPage.tsx, T-005 is the backend task). Failing to do so causes the agent to run integration before the pages exist, leading to an infinite read-loop trying to find missing files.
- **priority**: "P0" (must have), "P1" (should have), "P2" (nice to have).
- **subSteps**: array of 2-6 concrete implementation steps. Each step has:
  - "step": sequential number (1, 2, 3...)
  - "action": short imperative phrase (< 60 chars) describing WHAT to do
  - "detail": 1-2 sentences explaining HOW to do it, including specific APIs, patterns, or code structure
  - Each step's "detail" MUST explicitly state whether the file is being CREATED or MODIFIED.
  - If a file is listed in "modifies", the detail MUST say "MODIFY existing [filename]" and describe what to add/change. NEVER say "create" for a file in "modifies".
  - If a file is listed in "creates", the detail MUST say "CREATE new file [filename]".
- **tokenEstimate**: estimated LLM token usage for an AI agent to complete this task:
  - "inputTokens": tokens needed for context (project docs + task description + existing code), typically 1500-4000
  - "outputTokens": tokens the AI will generate (code output), estimate based on file count and complexity: config files ~500, components ~1500, services ~2000, complex pages ~3000
  - "totalTokens": inputTokens + outputTokens
  - "estimatedCostUsd": (totalTokens / 1000000) * 15 — based on ~$15 per 1M tokens, which is the typical LLM API pricing. This represents the actual compute cost.
- **acceptanceCriteria**: 2-4 concrete, testable conditions that verify the task is done correctly.
  - For **Frontend page tasks**: MUST include at least one criterion like "Page fetches [resource] from \`GET /api/[path]\` via the API client — no mock/hardcoded data". If the page has mutations, also include "Form submits to \`POST /api/[path]\` and reflects the server response".
- **coversRequirementIds**: string array of PRD IDs this task fully or materially implements.
  Include **every** relevant **AC-***, **FR-*** (and **F-** if used in PRD) ID that this task addresses.
  Across all tasks, these IDs should cover as much of the PRD’s AC/FR list as possible (pipeline validates coverage).
- **tddPlan.tests**: required for P0/P1 tasks. Each test MUST include \`id\`, \`type\`, \`priority\`, \`file\`, \`command\`, \`expectedRed\`, and \`expectedGreen\`. The command must be executable by the generated project, and RED/GREEN expectations must be specific enough for a runtime executor to validate.
  Every \`tddPlan.tests[].file\` MUST also be listed in this task's \`files.creates\` or \`files.modifies\` so the worker produces the test file before/with the implementation.

## Critical: Scaffolding task behavior per tier

### For M-tier and L-tier prebuilt projects:
The scaffold is **already copied** from a prebuilt template before coding begins.
- **Do NOT generate a Scaffolding task** that recreates the project from scratch — the skeleton already exists.
- If a Scaffolding task is needed at all, it should ONLY make small alignment changes (e.g. add env files, adjust scripts) on top of the existing skeleton.
- **M-tier and L-tier BOTH use the same stack and layout**: \`frontend/\` (**React + Vite + React Router + Tailwind**) and \`backend/\` (**Koa + Sequelize + PostgreSQL**). **NEVER use Next.js, Fastify, or pnpm monorepo** for M or L. **NEVER introduce Prisma** — use Sequelize models and migrations only.
- The only difference: L-tier additionally ships \`backend/src/workers/\` + \`backend/src/queue/inProcessQueue.ts\` (background-job queue), pino logger + request logger middleware, rate-limit middleware, and a richer \`docker-compose.yml\` (postgres + redis by default). Treat those as **already shipped** — never plan a task that recreates them.
- **Tailwind CSS v4 (CRITICAL)**: M-tier and L-tier scaffolds use **Tailwind CSS v4** configured via \`@tailwindcss/vite\` Vite plugin and \`@import "tailwindcss"\` in \`src/index.css\`. **NEVER create \`tailwind.config.js\`, \`tailwind.config.ts\`, or \`postcss.config.js\`** — these are Tailwind v3 patterns and will break the build with a version conflict. The correct devDependencies are \`tailwindcss: ^4.x\` and \`@tailwindcss/vite: ^4.x\` — do NOT add \`postcss\` or \`autoprefixer\` as separate packages.

### For S-tier (single app) projects — frontend-only scaffold:
The scaffold is also prebuilt (Vite + React + TypeScript + Tailwind CSS). If a Scaffolding task exists, it should only extend the existing template.
- **Build tool**: Vite with @vitejs/plugin-react. NEVER use create-react-app, react-scripts, or Next.js.
- **Import convention** (applies to ALL subsequent tasks): all cross-directory imports inside \`src/\` use \`@/\` alias (e.g. \`import Button from '@/components/Button'\`), never relative \`../\` paths.

### For S-scope projects using the M scaffold (S-tier PRD that needs a backend):
The scaffold is the **M-tier prebuilt template** — \`frontend/\` (Vite + React + React Router + Tailwind) and \`backend/\` (Koa + Sequelize + PostgreSQL). Apply **all M-tier conventions** above: same file layout, same Koa routing pattern, same Sequelize migration style. The only difference from pure M is task count — keep tasks **smaller in number** consistent with the S-scope PRD, but there is **no 4-task cap**.

If a scaffolding task is generated, its acceptanceCriteria MUST include: "pnpm install && pnpm build succeeds without errors" and "pnpm dev starts the dev server".

## CRITICAL: Route / Module / Middleware Registration Ownership
Coding tasks should **implement feature files**, but they should **not** perform the final shared-entry registration closure.

**Backend feature tasks:**
- Do **NOT** require shared entry files such as \`backend/src/app.ts\` or \`backend/src/api/modules/index.ts\` in \`files.modifies\` just for route/middleware registration.
- Create or modify the concrete feature files instead (e.g. \`backend/src/api/modules/*/*.routes.ts\`, controllers, services, validation, middleware implementation files).
- acceptanceCriteria should verify that handlers/modules are implemented and ready for registration, not that the shared entrypoint is already wired.

**Frontend page tasks:**
- Do **NOT** require \`frontend/src/router.tsx\` in \`files.modifies\` for page registration.
- Implement the page/view/component files and any local navigation UI, but defer final route registration to \`integrationVerifyAndFix\`.
- acceptanceCriteria should verify the page/component implementation itself, not final path reachability through the global router.
- **Directory convention (M-tier and L-tier)**: All page-level view files MUST be placed under \`frontend/src/views/\` with a **flat** structure (e.g. \`frontend/src/views/LoginPage.tsx\`, \`frontend/src/views/DashboardPage.tsx\`). NEVER use \`frontend/src/pages/\` — that is a Next.js convention. NEVER nest into subdirectories like \`frontend/src/views/auth/\`; keep every page file directly under \`frontend/src/views/\`.

**Final registration closure owner:**
- \`integrationVerifyAndFix\` is responsible for scanning and registering:
  - frontend pages from \`frontend/src/views\` into \`frontend/src/router.tsx\`
  - backend module routes from \`backend/src/api/modules\` into \`backend/src/api/modules/index.ts\`
  - backend middlewares from \`backend/src/middlewares\` into \`backend/src/app.ts\`

## CRITICAL: Database & Infrastructure
Scan the PRD for any persistence requirement (database, file storage, cache, queues). If found:

1. The first backend task OR a dedicated "Infrastructure" phase task MUST include in its \`files.creates\`:
   - \`docker-compose.yml\` — with the required database/cache service(s) and correct ports.
   - \`.env\` — required keys (DATABASE_URL is written at coding scaffold when \`BLUEPRINT_GENERATED_DATABASE_URL\` is set in Agentic Builder; tasks must still declare REDIS_URL, PORT, JWT_SECRET, etc. as needed).
   - For Sequelize stacks, the schema is built from the models at boot via \`syncModels()\` → \`sequelize.sync()\` — there are NO migration files. (A non-Sequelize stack may use \`scripts/init-db.sql\` if it genuinely needs raw bootstrap SQL.)
   - For M-tier Sequelize projects, the runtime env/bootstrap chain must remain single-source: use \`backend/src/db.ts\` for DB connection and ensure startup loads \`.env\` before reading env vars.
   - Never invent localhost PostgreSQL credentials such as \`postgres:postgres@localhost\` unless the same task also provisions that exact user via \`docker-compose.yml\` or documented setup. Prefer the provided generated DATABASE_URL or align with the actual local role/database bootstrap strategy.

2. If the project uses **Sequelize** (the M-tier default; Prisma is NOT supported):
   - Define models as ES modules under \`backend/src/models/*.ts\` with explicit \`Model.init(...)\` and \`.hasMany\` / \`.belongsTo\` associations wired in \`backend/src/models/index.ts\`.
   - **Schema = models, NO migrations.** Do NOT create migration files or a \`backend/src/database/migrations/\` directory — \`syncModels()\` → \`sequelize.sync()\` builds every table from the models at boot. Declare secondary indexes (\`indexes: [...]\` in the \`init()\` options) and foreign keys (\`references\` + \`onDelete\` on the column) ON THE MODEL, or \`sync()\` won't create them. Do NOT introduce \`prisma/schema.prisma\`, \`@prisma/client\`, or \`npx prisma ...\` commands — they are explicitly disallowed.
   - acceptanceCriteria MUST include: \`"Sequelize models load and sync() completes without errors"\`.
   - **SEED DATA (MANDATORY)**: Every Data Layer task that defines one or more Sequelize models MUST include a subStep that creates an initial seed script at \`backend/src/scripts/seed-<entity>.ts\` (or a combined \`seed-demo-data.ts\` if multiple entities are seeded together). The seed script MUST:
     - Insert **3–5 realistic demo records** per entity (not "Test Item 1", use real-looking names/values that match the domain).
     - Use **upsert** semantics (findOrCreate / upsert) so re-running on an existing database is safe.
     - Export a \`run()\` function (no DB close inside) and call it from a \`main()\` wrapper that opens and closes the DB, following the same pattern as \`backend/src/scripts/seed-auth-users.ts\`.
     - Be callable from \`server.ts\` startup via \`AUTO_SEED\` env flag (same pattern as auth seed), so the demo data is present from the first \`pnpm dev\`.\n   - acceptanceCriteria MUST include: \`"pnpm run seed (or AUTO_SEED=1) inserts demo records; re-running is idempotent"\`.

3. If the project uses **SQLite** (e.g. better-sqlite3, sql.js):
   - The init subStep must create the DB file and execute \`CREATE TABLE\` statements on app startup.
   - No docker-compose needed, but \`.env\` must still define \`DATABASE_PATH\`.

4. **In-memory storage** is only acceptable for small-scope (S-tier) projects with no persistence requirement in the PRD.
   - If used, the task description MUST explicitly state: \`"Uses in-memory store; data does not persist across restarts"\`.

## Rules
- If the prompt includes **Pipeline coding tier** and template paths, the **scaffold is already copied before coding** — do not plan tasks that duplicate that layout; implement features on top of it.
- **Task count** follows the **Task count — derive from PRD** section above — never optimize for a fixed number; optimize for **full PRD coverage** and sensible dependency order.
- Sequence tasks so cross-task context is stable:
  - Add an early **contracts/client** task (phase can be "Data Layer" or "Integration") that aligns request/response schemas, shared types, and frontend API client with PRD IDs.
  - For backend persistence flows, this contracts/client task or the early data-layer task MUST also align ORM-required fields with validation and service payloads so system fields are not accidentally treated as client input.
  - Do not split backend env/bootstrap ownership across multiple files. If a task touches backend runtime config, it must MODIFY the canonical startup/database files instead of creating parallel alternatives.
  - Ensure this contracts/client task appears before backend endpoint implementation and before page-level frontend tasks.
- **Task size cap (HARD RULE)**:
  - If a task would create more than **8 files**, split it into multiple tasks unless the extra files are tiny same-scope siblings (e.g. one controller/routes/service trio).
  - If a task would create files across **root infra** (\`.env\`, \`docker-compose.yml\`), **backend/src**, and **frontend/src**, it MUST be split into at least two tasks.
  - For M-tier full-stack projects, prefer this early sequence: **(1) backend data/model task**, **(2) contracts/frontend API client task**, **(3) infra/env task if needed** rather than one mega bootstrap task.
- **External API complexity split (HARD RULE)**:
  - If a single task would integrate **more than 3 distinct external HTTP APIs or third-party services** within the same pipeline (e.g. HackerNews + Google News + Jina + OpenAI + Polymarket + HyperLiquid + Deribit all in one task), it MUST be split into at least two tasks. This includes background job pipelines, scanner pipelines, and aggregation pipelines. Suggested split strategy for such pipeline tasks:
    - **Task A — External API client layer**: wrappers/helpers for each external service (HTTP clients, auth headers, timeout handling, typed response shapes). These files are reused by all pipeline tasks.
    - **Task B — Pipeline orchestration**: step-by-step coordination logic, error classification (fatal vs. non-fatal), deduplication, and ranking.
    - **Task C — API endpoint + streaming layer**: SSE/polling controller, routes, BullMQ job wiring, and queue setup.
  - The rule applies regardless of how many files the task creates — integration complexity alone is sufficient grounds for a split.
- **Single-task file creates cap (SOFT RULE)**:
  - Prefer tasks that create **≤ 4 files** in \`files.creates\`. Tasks with 5–8 creates are acceptable only if all files belong to the same narrow domain (e.g. a controller + routes + service + validation quartet for one module). If a task would create 5+ files spanning multiple domains (e.g. a job worker + external API clients + an SSE controller + a DB model), split it.
- Frontend task granularity:
  - Create one **app shell/layout** frontend task first (app shell, navigation/layout wiring).
  - Do not assign final edits to shared route registries (\`frontend/src/router.tsx\` or \`src/routes.tsx\`) to Coding tasks; \`integrationVerifyAndFix\` handles final registration closure.
  - Then split frontend implementation by **page/flow** (one task per page), not by tiny component.
- **Frontend API binding (CRITICAL)**: Every frontend page task that renders data from the backend MUST:
  1. List in its \`description\` the specific API endpoints it consumes (e.g. \`GET /api/users\`, \`POST /api/orders\`).
  2. Include a \`subStep\` that explicitly says: "Call \`[METHOD] /api/[path]\` via the API client to load/submit data".
  3. Include in \`acceptanceCriteria\` a criterion asserting no mock/hardcoded data is used.
  This information allows the AI coding agent to know which real endpoints to call instead of inventing mock data.
- Merge related work for backend/data when scope is thin (M-tier or simple PRDs): combine multiple API endpoints and models into broader tasks. **For L-tier projects** with 10+ PRD pages or 30+ requirement IDs, follow the L-tier granularity rules above instead — do NOT merge across domain boundaries.
- Order tasks by execution sequence (respecting dependencies).
- Focus on CODING tasks — skip pure planning, meeting, or documentation-only items.
- Reference PRD feature IDs (FR-xxx) and user stories (US-xx) where applicable.
- Tasks that involve security, payment, auth, data mutation (create/update/delete), destructive operations (drop, reset, purge), external API integration wiring, or complex frontend UI pages with forms/validation MUST be "human_confirm_after". Only purely scaffold/generate tasks (e.g. "create model file", "add config") should be "ai_autonomous".
- Every task MUST have subSteps (2-6 steps), tokenEstimate, acceptanceCriteria, and coversRequirementIds (non-empty when PRD lists AC/FR ids).
- Every file path across all tasks must be assigned to exactly one task's "files.creates". All other tasks that touch the same file must list it under "files.modifies" or "files.reads".
- Before writing subSteps for a task, check its "dependencies" array. Any file listed in a dependency task's "files.creates" is already on disk — reference it via "modifies" or "reads", never recreate it.
- Output ONLY the JSON array. No other text.`;
}

export class TaskBreakdownAgent extends BaseAgent {
  private tier: ProjectTier;

  constructor(
    tier: ProjectTier = "L",
    scaffoldBlock?: string,
    /** Pre-formatted Markdown block emitted by `formatAppliedSkills()` from
     *  the skills loader. When present, gets injected into the system
     *  prompt right before the Output Format section. */
    skillsBlock?: string,
    /** The scaffold tier actually used (may differ from scope tier for
     *  S-scope projects that need a backend — they reuse the M scaffold). */
    scaffoldTier?: "S" | "M" | "L",
  ) {
    const modelChain = resolveModelChain(
      MODEL_CONFIG.taskBreakdown,
      resolveModel,
    );
    super({
      name: "Task Breakdown Agent",
      role: "Engineering Lead",
      systemPrompt: buildSystemPrompt(tier, scaffoldBlock, skillsBlock, scaffoldTier),
      defaultModel: MODEL_CONFIG.taskBreakdown,
      temperature: 0.3,
      maxTokens: 64000,
      customChatCompletion: async (messages, opts) => {
        const { model: _ignoredModel, ...rest } = opts;
        const reasoningOptions = buildTaskBreakdownReasoningOptions();
        return chatCompletionWithFallback(messages, modelChain, {
          ...rest,
          ...reasoningOptions,
        });
      },
    });
    this.tier = tier;
  }

  async generateTaskBreakdown(
    documents: {
      prd: string;
      trd?: string;
      sysDesign?: string;
      implGuide?: string;
      designSpec?: string;
      /** Formatted structured PRD spec (pages + component IDs). Injected for coverage. */
      prdSpecText?: string;
      /** User-selected guidance from task breakdown review pass. */
      improvementNotes?: string[];
      /** Pre-formatted markdown block describing user-uploaded design references. */
      designReferencesBlock?: string;
      /**
       * When a prototype was generated, this block tells the agent which
       * frontend page files ALREADY EXIST so it emits them as `files.modifies`
       * ("wire logic into the existing page") rather than `files.creates`.
       * '' / undefined → no-op; the legacy breakdown is byte-for-byte unchanged.
       */
      prototypeContext?: string;
      /**
       * INCREMENTAL mode. When present, the agent generates ONLY tasks for the
       * `requirementsToCover` IDs, treating `existingTasks` as already done.
       * Absent → behavior is identical to the full-breakdown path.
       */
      incremental?: {
        existingTasks: Array<{
          id: string;
          title: string;
          coversRequirementIds: string[];
        }>;
        requirementsToCover: string[];
      };
    },
    sessionId?: string,
  ) {
    const sections: string[] = [];

    sections.push("## PRD\n\n" + documents.prd);

    if (documents.prdSpecText) {
      sections.push(documents.prdSpecText);
    }
    if (documents.trd) {
      sections.push("## TRD\n\n" + documents.trd);
    }
    if (documents.sysDesign) {
      sections.push("## System Design\n\n" + documents.sysDesign);
    }
    if (documents.implGuide) {
      sections.push("## Implementation Guide\n\n" + documents.implGuide);
    }
    if (documents.designSpec) {
      sections.push("## Design Spec\n\n" + documents.designSpec);
    }
    if (documents.designReferencesBlock) {
      sections.push(documents.designReferencesBlock);
    }
    if (documents.prototypeContext) {
      sections.push(documents.prototypeContext);
    }

    const context = sections.slice(1).join("\n\n---\n\n");

    const hasPrdSpec = Boolean(documents.prdSpecText);
    const focusHint = documents.implGuide
      ? "Focus especially on the Implementation Guide phases and Design Spec components."
      : hasPrdSpec
        ? "Focus on the Structured PRD Spec — every PAGE-*, CMP-* ID listed must be implemented; add each covered ID to coversRequirementIds."
        : "Focus on the PRD requirements and Design Spec components.";

    const referencesHint = documents.designReferencesBlock
      ? ` The user attached design reference screenshots AFTER writing the PRD — see the **Per-page design digests** section below. For any page that HAS a digest, that digest is AUTHORITATIVE for the page's UI structure and OUTRANKS the PRD: decompose the page to MATCH the digest exactly, and DROP any PRD-described component the digest does not show (e.g. summary/KPI cards, stats dashboard, invoice table, modals) — do not create tasks for them. If the digest shows a 'vertical list of cards' with receipt actions, the page is a card list, NOT a dashboard. Keep the PRD only for non-visual functional details that don't contradict the digest. Cite the reference path in each such task's description. Pages with no digest have no screenshot — decompose those from the PRD as usual.`
      : "";

    const incrementalBlock = buildIncrementalInstructionBlock(
      documents.incremental,
    );

    const userMessage =
      `Analyze all provided documents and generate a coding task breakdown as a JSON array. ` +
      `Respect the **ProjectTier** and any **Pipeline coding tier** / scaffold section in the system prompt. ` +
      `${focusHint}${referencesHint}` +
      (documents.improvementNotes && documents.improvementNotes.length > 0
        ? `\n\nApply these selected improvement suggestions while regenerating:\n- ${documents.improvementNotes.join("\n- ")}`
        : "") +
      (incrementalBlock ? `\n\n${incrementalBlock}` : "") +
      `\n\n` +
      sections[0];

    return this.run(
      userMessage,
      context.length > 0 ? context : undefined,
      "step-task-breakdown",
      sessionId,
    );
  }

  /**
   * Supplementary task generation used by the Coverage Gate self-heal loop.
   *
   * Given the set of PRD requirement IDs that were not covered by the
   * original task breakdown, plus a short summary of tasks already emitted,
   * this asks the model for ADDITIONAL tasks — never re-numbering or
   * replacing existing ones — whose `coversRequirementIds` collectively
   * cover the missing ids.
   *
   * The agent must stay aligned with the tier/scaffold conventions from the
   * original system prompt; no prompt re-derivation is needed because we
   * reuse `this.run`.
   */
  async generateSupplementaryTasks(
    params: {
      missingIds: string[];
      existingTaskSummary: Array<{
        id: string;
        phase?: string;
        title: string;
        /** Files this task already creates. Listed verbatim in the prompt
         *  so supplementary tasks can REUSE these exact paths in their
         *  own `files.modifies` instead of inventing names that drift
         *  (e.g. `MonitorDashboard.tsx` when the real file is
         *  `MonitorDashboardPage.tsx`). */
        creates?: string[];
      }>;
      startingTaskId: string;
      prd: string;
      trd?: string;
      sysDesign?: string;
      implGuide?: string;
      prdSpecText?: string;
    },
    sessionId?: string,
  ) {
    const summaryLines = params.existingTaskSummary
      .map((t) => {
        const head = `- \`${t.id}\`${t.phase ? ` (${t.phase})` : ""}: ${t.title}`;
        if (!t.creates || t.creates.length === 0) return head;
        // Cap to keep prompt size sane; the most-likely-targeted files
        // (views, pages, controllers) tend to live at predictable paths
        // and we expect drift mostly on those. 12 entries per task is
        // a generous bound (the largest task in practice has ~30 creates).
        const shown = t.creates.slice(0, 12);
        const more = t.creates.length - shown.length;
        const tail = shown.map((f) => `    • \`${f}\``).join("\n");
        const overflow = more > 0 ? `\n    • …(+${more} more)` : "";
        return `${head}\n${tail}${overflow}`;
      })
      .join("\n");

    const contextSections: string[] = [];
    contextSections.push("## PRD (authoritative)\n\n" + params.prd);
    if (params.prdSpecText) contextSections.push(params.prdSpecText);
    if (params.trd) contextSections.push("## TRD\n\n" + params.trd);
    if (params.sysDesign)
      contextSections.push("## System Design\n\n" + params.sysDesign);
    if (params.implGuide)
      contextSections.push("## Implementation Guide\n\n" + params.implGuide);

    const userMessage = [
      "## Supplementary task generation (self-heal)",
      "",
      "The previous task breakdown did NOT cover every PRD requirement ID.",
      "Produce ADDITIONAL tasks — one JSON array, no prose — that cover the",
      "missing ids below. Rules:",
      "",
      "1. **Do NOT** regenerate, renumber, or modify any task already present.",
      "2. Every new task's `coversRequirementIds` MUST include at least one",
      "   id from the missing list.",
      "3. Number new tasks starting from `" +
        params.startingTaskId +
        "` and increment sequentially.",
      "4. Use the SAME phase vocabulary and tier conventions as the original",
      "   system prompt (Scaffolding / Data Layer / Auth & Gateway /",
      "   Backend Services / Integration / Frontend / Testing / Infrastructure).",
      "5. For every new task declare `files.creates` / `files.modifies` that",
      "   do NOT collide with files already created by earlier tasks.",
      "6. **CRITICAL — exact filenames**: when you need to extend behavior in",
      "   a file created by an earlier task, copy its path **verbatim** from",
      "   the bullet-list under that task in §Existing tasks below. Do NOT",
      "   abbreviate or guess (e.g. NEVER write `MonitorDashboard.tsx` when",
      "   the listed path is `MonitorDashboardPage.tsx`). A `files.modifies`",
      "   entry that doesn't match an existing path verbatim is a defect.",
      "7. Dependencies may reference earlier task ids from the summary.",
      "8. Output strict JSON: an array of task objects. No markdown fencing.",
      "",
      "## Missing requirement IDs (" + params.missingIds.length + ")",
      "",
      params.missingIds.map((id) => `- ${id}`).join("\n"),
      "",
      "## Existing tasks (summary — do not touch these)",
      "",
      summaryLines.length > 0 ? summaryLines : "(none)",
    ].join("\n");

    const context =
      contextSections.length > 0
        ? contextSections.join("\n\n---\n\n")
        : undefined;

    return this.run(
      userMessage,
      context,
      "step-task-breakdown-supplementary",
      sessionId,
    );
  }

  /**
   * L-tier self-heal: given a list of overbroad tasks (too few tasks for a
   * large PRD), ask the model to produce fine-grained replacement tasks.
   *
   * Callers should remove the overbroad tasks from the list, merge in the
   * returned replacements, and re-run dep inference.
   */
  async expandOverbroadTasks(
    params: {
      overbroadTasks: Array<{
        id: string;
        phase?: string;
        title: string;
        description: string;
        creates: string[];
      }>;
      existingTaskSummary: Array<{
        id: string;
        phase?: string;
        title: string;
        creates: string[];
      }>;
      totalOriginalCount: number;
      startingTaskId: string;
      prd: string;
      trd?: string;
      sysDesign?: string;
      implGuide?: string;
      prdSpecText?: string;
    },
    sessionId?: string,
  ) {
    const keptSummary = params.existingTaskSummary
      .map((t) => {
        const head = `- \`${t.id}\`${t.phase ? ` (${t.phase})` : ""}: ${t.title}`;
        if (!t.creates || t.creates.length === 0) return head;
        const shown = t.creates.slice(0, 8);
        const more = t.creates.length - shown.length;
        const tail = shown.map((f) => `    • \`${f}\``).join("\n");
        const overflow = more > 0 ? `\n    • …(+${more} more)` : "";
        return `${head}\n${tail}${overflow}`;
      })
      .join("\n");

    const expandLines = params.overbroadTasks
      .map((t) => {
        const lines = [`### \`${t.id}\` — ${t.title}`];
        if (t.phase) lines.push(`**Phase**: ${t.phase}`);
        if (t.description) lines.push(`**Description**: ${t.description}`);
        if (t.creates.length > 0) {
          lines.push(`**Creates** (${t.creates.length} files):`);
          lines.push(...t.creates.map((f) => `  • \`${f}\``));
        }
        return lines.join("\n");
      })
      .join("\n\n");

    const contextSections: string[] = [];
    contextSections.push("## PRD (authoritative)\n\n" + params.prd);
    if (params.prdSpecText) contextSections.push(params.prdSpecText);
    if (params.trd) contextSections.push("## TRD\n\n" + params.trd);
    if (params.sysDesign)
      contextSections.push("## System Design\n\n" + params.sysDesign);
    if (params.implGuide)
      contextSections.push("## Implementation Guide\n\n" + params.implGuide);

    const userMessage = [
      "## L-tier task expansion (granularity self-heal)",
      "",
      `The initial task breakdown generated only ${params.totalOriginalCount} tasks for an L-tier project,`,
      "which is too few for full PRD coverage. The tasks listed in §Overbroad tasks below",
      "are overly broad — each covers too many domains or pages — and must be split.",
      "",
      "**Instructions:**",
      "1. For each overbroad task, produce **2–5 replacement tasks** that together cover",
      "   everything the original described. No scope may be silently dropped.",
      "2. Do NOT include the original overbroad task IDs in the output.",
      "3. Do NOT re-emit any kept task — output ONLY the new replacement tasks.",
      `4. Number replacement tasks starting from \`${params.startingTaskId}\` and increment sequentially.`,
      "5. Apply L-tier granularity rules from the system prompt: one task per page/flow,",
      "   one task per service domain, one task per distinct background job.",
      "6. Every task must have: `subSteps`, `tokenEstimate`, `acceptanceCriteria`, `coversRequirementIds`.",
      "7. `files.creates`: each path must appear in exactly ONE task. Paths already listed",
      "   under §Kept tasks must use `files.modifies` instead.",
      "8. Output strict JSON array only. No markdown fencing, no prose.",
      "",
      `## Overbroad tasks to expand (${params.overbroadTasks.length})`,
      "",
      expandLines,
      "",
      "## Kept tasks (do NOT modify — reference via dependencies or files.modifies only)",
      "",
      keptSummary || "(none)",
    ].join("\n");

    const context = contextSections.join("\n\n---\n\n");

    return this.run(
      userMessage,
      context,
      "step-task-breakdown-expand",
      sessionId,
    );
  }
}
