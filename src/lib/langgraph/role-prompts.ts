/**
 * Worker role system prompts with conditional HARD RULE injection.
 *
 * Why this exists:
 *   The previous static `ROLE_PROMPTS` bundled every HARD RULE (OAuth identity
 *   resolution, background-job lifecycle, LLM client abstraction, …) into each
 *   role's prompt unconditionally. For projects that have none of those
 *   features, the rules became noise that diluted the model's attention and
 *   pushed out genuine project context (the worker context budget is only
 *   30K chars and the integration-verify user message is trimmed to ~18K).
 *
 *   `buildRolePrompt(role, ctx)` keeps each role's *always-on* baseline lean
 *   and only appends a conditional rule when its trigger is present in the
 *   `PromptContext`:
 *
 *     AUTH_IDENTITY_RULE       ← `appliedOptionalFeatures` contains "auth-*"
 *     FRONTEND_OAUTH_RULE      ← same trigger, frontend variant
 *     BACKGROUND_JOBS_RULE     ← `flags.hasBackgroundJobs`
 *     LLM_CLIENT_RULE          ← `declaredEnvKeys` contains "LLM_PROVIDER"
 *     EMPTY_RESULTS_RULE       ← `flags.hasAggregationPipeline`
 *
 *   Three new always-on rules were added 2026-05-15 after observing common
 *   production crashes in generated projects that the old prompt did not
 *   prevent:
 *
 *     SEQUELIZE_JSONB_DEFAULT_RULE — `defaultValue: {}` on JSONB columns
 *       crashes Sequelize's SQL serializer with `Invalid value {}`. Always-on
 *       for backend.
 *     SYNC_VS_MIGRATIONS_RULE — when a migrations directory exists,
 *       `syncModels()` MUST NOT default to `alter: true`. Always-on for
 *       backend (the migration directory is the most common case for any
 *       project beyond throwaway scratch).
 *     NULL_SAFE_ARRAY_RULE — `arr.map` / `[...arr]` crashes when `arr` is
 *       undefined; normalize at the top with `arr ?? []`. Always-on for
 *       frontend.
 *     HOOK_RETURN_TYPE_RULE — custom data hooks must export an explicit
 *       return-type interface so views can't drift on field names
 *       (`data.cards` vs `data.stablecoins`). Always-on for frontend.
 */

import path from "node:path";
import * as nodeFs from "fs/promises";
import type { CodingAgentRole } from "@/lib/pipeline/types";

// ─── Public types ───────────────────────────────────────────────────────────

export interface PromptContext {
  /** Optional scaffold features applied to the project, e.g. `["auth-privy"]`. */
  appliedOptionalFeatures: string[];
  /** Environment variables declared in `.blueprint/resource-requirements.json`. */
  declaredEnvKeys: string[];
  /** Generic flags for runtime detection that does not fit the lists above. */
  flags?: {
    hasBackgroundJobs?: boolean;
    hasAggregationPipeline?: boolean;
  };
  /** Pre-formatted Markdown block of codegen-role skills auto-applied to this
   *  project (from `formatAppliedSkills()`). Appended verbatim to the role
   *  prompt. Empty / undefined when no skill applied. Conditional codegen rules
   *  live as skills under `.blueprint/skills/<role>/` rather than inline here. */
  skillsBlock?: string;
}

const EMPTY_CONTEXT: PromptContext = {
  appliedOptionalFeatures: [],
  declaredEnvKeys: [],
};

// ─── Trigger predicates ─────────────────────────────────────────────────────

function hasAuthScaffold(ctx: PromptContext): boolean {
  return ctx.appliedOptionalFeatures.some((f) => /^auth[-_]/i.test(f));
}

/** The DEFAULT auth mode: local email+password + RBAC. Its scaffold
 *  (`auth-password-rbac`) ships `views/LoginPage.tsx` + an auth-store and owns
 *  the `/login` route — distinct from the OAuth/Privy scaffold which ships a
 *  `LoginModal`. Keyed specifically so password-rbac does NOT inherit the
 *  Privy/OAuth guidance (which references files it never ships). */
function hasPasswordRbacAuth(ctx: PromptContext): boolean {
  return ctx.appliedOptionalFeatures.some((f) =>
    /^auth[-_]password[-_]rbac/i.test(f),
  );
}

function hasLlmBundle(ctx: PromptContext): boolean {
  return ctx.declaredEnvKeys.includes("LLM_PROVIDER");
}

function hasBackgroundJobs(ctx: PromptContext): boolean {
  return !!ctx.flags?.hasBackgroundJobs;
}

function hasAggregationPipeline(ctx: PromptContext): boolean {
  return !!ctx.flags?.hasAggregationPipeline;
}

// ─── Shared building blocks (small, always-injected partials) ──────────────

const RALPH_COMPLETE_TOKEN = "<promise>TASK_COMPLETE</promise>";

const FRONTEND_IMPORT_RULES = `
## Frontend import path rules
- ALWAYS call \`read_file("frontend/vite.config.ts")\` before writing any import that uses the \`@/\` alias.
- Only use \`@/\` imports if \`vite.config.ts\` already contains a \`resolve.alias\` block mapping \`@\` to \`./src\` (or similar).
- If \`@/\` alias is NOT yet configured in \`vite.config.ts\`, you MUST add it before (or in the same write-batch as) any file that uses it:
  \`\`\`ts
  import path from "path";
  // inside defineConfig:
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  \`\`\`
  Also ensure \`tsconfig.app.json\` (or \`tsconfig.json\`) has \`"paths": { "@/*": ["src/*"] }\` under \`compilerOptions\`.
- If no alias exists and you cannot update the config, fall back to relative imports and do NOT invent \`@/\`.
- If the project includes a shared package, import it using the package name defined in its \`package.json\` (for example \`@project/shared\`), never via deep relative paths into another package.`;

const TESTID_CONTRACT_RULES = `
## data-testid contract (HARD RULE — required for E2E tests to pass)
If a \`UI_CONTRACT.md\` file exists at the project root, read it BEFORE writing any component.
It lists every required \`data-testid\` attribute and the exact DOM element it belongs to.

Even without a contract file, follow these conventions unconditionally:
- Every significant UI region (display area, keypad container, app title, footer hint, overlay) MUST carry \`data-testid\` on its outermost element.
- Interactive elements (buttons, inputs) MUST carry \`data-testid\` derived from their visible label or id.
- Button testids follow the pattern \`<feature>-btn-<label>\` using the **raw visible character** as label (e.g. \`calc-btn-.\` for the decimal button, NOT \`calc-btn-Decimal\`).
- When a button's \`aria-label\` would differ from the visible symbol (e.g. "Decimal" vs "."), do NOT override with a word alias — keep \`aria-label\` equal to the symbol so role-based Playwright queries still work.
- Do not remove or rename existing testids; only add new ones.`;

const WORKER_READONLY_TOOLS_GUIDE = `
## Available read-only tools
- \`read_file(path)\`: read an existing file before editing or importing from it.
- \`list_files(dir?)\`: inspect the current generated project tree when you need to locate files.
- \`grep(pattern, path?)\`: search code/content across the generated project before making assumptions.
- Use these tools whenever the task depends on existing files, exports, routes, or scaffold conventions not fully shown in context.`;

// ─── Always-on rules (added 2026-05-15) ─────────────────────────────────────

const NULL_SAFE_ARRAY_RULE = `**Null-safe array iteration (HARD RULE):**
Arrays sourced from API responses can be undefined before the first fetch resolves. Normalize at the top of the component / function:
  \`const safeItems = items ?? [];\`
Then use \`safeItems.map(…)\`, \`[...safeItems]\`, \`safeItems.filter(…)\` everywhere. In JSX use \`{(items ?? []).map(…)}\`.
NEVER call \`.map\` / \`.filter\` / spread directly on a possibly-undefined value just because TypeScript types declare \`Foo[]\` — the runtime value comes from \`fetch\` and TypeScript can not enforce that.`;

const HOOK_RETURN_TYPE_RULE = `**Hook return-type contract (HARD RULE):**
Every custom data hook MUST export a named return-type interface and return that exact type:
  \`export interface UseDashboardDataReturn { data: DashboardData; loading: boolean; … }\`
  \`export function useDashboardData(): UseDashboardDataReturn { … }\`
Before consuming a hook in a View/Page, \`read_file\` the hook file and copy field names verbatim. Never guess (\`data.cards\` vs \`data.stablecoins\`). Without an explicit return type, TypeScript can not catch a field-name typo and the View silently reads \`undefined\` at runtime.`;

const SEQUELIZE_JSONB_DEFAULT_RULE = `**Sequelize JSONB default values (HARD RULE):**
NEVER write \`defaultValue: {}\` or \`defaultValue: []\` for JSONB / JSON columns — Sequelize's SQL serializer crashes with \`Invalid value {}\`.
- In \`Model.init()\` wrap in a factory  →  \`defaultValue: () => ({})\` or \`defaultValue: () => []\` (JS-side only, not written to SQL). \`sync()\` issues the underlying DDL, so this applies to every model.`;

const SYNC_VS_MIGRATIONS_RULE = `**Schema = models, NO migrations (HARD RULE):**
This project has NO migrations and NO migration runner. The Sequelize models are the SINGLE source of truth for the schema — \`syncModels()\` runs \`sequelize.sync()\` on boot and issues CREATE TABLE straight from the model definitions. Therefore:
- Declare EVERYTHING on the model: columns, \`unique: true\`, secondary indexes via \`indexes: [{ fields: ["col"] }]\` in the \`init()\` options, and foreign keys via the column's \`references: { model: "<table>", key: "id" }\` + \`onDelete: "CASCADE"\`. If it is not on the model, \`sync()\` will NOT create it.
- Do NOT create migration files, a \`backend/src/database/migrations/\` directory, or call \`queryInterface\` for schema DDL. There is nothing to run them.
- Adding a field to an existing model is enough — no ALTER migration needed. (For local iteration against a persisted dev DB, the operator sets \`DB_SYNC_ALTER=true\` / \`DB_SYNC_FORCE=true\`; you never write code for this.)`;

// ─── Backend operational invariants (HARD RULES) ──────────────────────────
// These 7 invariants encode common production failure modes that the
// TRD prompt cannot fully prevent. They apply to every backend task that
// touches the corresponding pattern. Read each block CAREFULLY.

const BACKEND_OPERATIONAL_INVARIANTS_RULE = `**Backend operational invariants (HARD RULES — apply WHENEVER you touch the matching pattern):**

### 1. TimescaleDB hypertable creation
If the stack includes TimescaleDB AND the table is time-series
(\`raw_metrics\`, \`score_history\`, \`audit_logs\`, anything with a \`*_at\` time
column and high-volume inserts), promote it to a hypertable AFTER \`syncModels()\`
has created the table. There are no migrations — do it in \`initDb()\` via the
scaffold helper, which no-ops gracefully when the extension is absent:
\`\`\`ts
// in initDb(), after syncModels()
await createHypertableIfPossible(sequelize.getQueryInterface(), "raw_metrics", "observed_at");
\`\`\`
Skipping this turns the table into a regular PG table; time-range queries fall
back to seq scans and the platform's perf targets become unachievable.

### 2. Magic-link verification MUST be atomic (no race)
A magic link is single-use. The naive \`findOne → check consumedAt → update\`
sequence is racey: two browser tabs hitting the same link both pass the check
and BOTH create sessions. ALWAYS use a single atomic UPDATE that returns the
row only if it was previously unconsumed:

\`\`\`ts
const [rows] = await sequelize.query(
  \`UPDATE magic_links
   SET consumed_at = NOW()
   WHERE token_hash = $1 AND consumed_at IS NULL
   RETURNING user_id, expires_at\`,
  { bind: [tokenHash], type: QueryTypes.SELECT, transaction: t }
);
if (rows.length === 0) throw new HttpError(401, "Token used or invalid");
// THEN create the session using rows[0].user_id, inside the same transaction.
\`\`\`

### 3. RBAC enforcement: router-level, NEVER handler-level
For any group of routes that requires the same role (\`/api/admin/*\`,
\`/api/reserve-review/*\` for operators+), apply \`requireAuth\` + \`requireRole(role)\`
ONCE at the router mount, not in every handler. Hand-rolled per-handler RBAC
inevitably misses 1-2 endpoints (typically PATCH/DELETE) and creates auth
holes:

\`\`\`ts
// RIGHT
const adminRouter = new Router({ prefix: "/api/admin" });
adminRouter.use(requireAuth, requireRole("admin"));
adminRouter.get("/variables", listVariables);
adminRouter.patch("/variables/:id", updateVariable);

// WRONG
adminRouter.get("/variables", requireAuth, requireRole("admin"), listVariables);
adminRouter.patch("/variables/:id", requireAuth, requireRole("admin"), updateVariable);
// (one of these will eventually be added without the middleware)
\`\`\`

### 4. Soft-delete must propagate to every list query
When the schema has \`is_active\` / \`is_soft_deleted\` flags, every read path
on that entity MUST filter them out. Easiest: use Sequelize \`defaultScope\`:

\`\`\`ts
Stablecoin.init({...}, {
  sequelize,
  defaultScope: { where: { is_active: true } },
  scopes: { withInactive: {} },
});
// queries: Stablecoin.findAll() → only active
//          Stablecoin.scope("withInactive").findAll() → all
\`\`\`

A soft-deleted stablecoin must NOT appear in \`/api/coins\`, \`/api/scoring/*\`,
\`/api/reserve-reviews/*\`, or any join that materialises a coin. Write a test
that calls \`softDeleteStablecoin('USDC')\` then \`GET /api/coins\` and asserts
USDC is absent.

### 5. Stale-source variables MUST be excluded BEFORE composite computation
When the scoring service computes the composite, it MUST first JOIN against
\`data_feeds\` (or \`source_health\`) and **filter out variables whose source
is stale OR whose history is insufficient** before applying weights. NEVER
weight-multiply zero — that biases the score; instead, recompute the weight
denominator over only the included variables:

\`\`\`ts
const included = variables.filter(v => !v.is_stale && !v.insufficient_history);
const totalWeight = included.reduce((s, v) => s + v.weight, 0);
const composite = included.reduce((s, v) => s + (v.normalized * v.weight), 0) / totalWeight;
\`\`\`

Reflect this in §7 SCORE-1 logic on the service layer — the decision-table
in the DSL is the contract; this is its runtime implementation.

### 6. External API adapters MUST be lazy (no boot-time assertEnv)
Do NOT block app startup on \`COINGECKO_API_KEY\` / \`QUOTIENT_API_KEY\` / etc.
Adapters import their key inside the function that calls the API, throw a
\`MissingCredentialError\` only when actually invoked, and the scheduler
catches that error and marks the corresponding \`data_feeds\` row stale.

This lets the backend boot in environments without all keys (CI, local dev,
demo) and lets the operator add credentials incrementally without restarting:

\`\`\`ts
// RIGHT
export async function fetchCoingeckoMarketCap(symbol: string) {
  const key = process.env.COINGECKO_API_KEY;
  if (!key) throw new MissingCredentialError("COINGECKO_API_KEY");
  // ... actual fetch
}

// WRONG: top-of-module \`assertEnv(['COINGECKO_API_KEY'])\` in app.ts or in
// the adapter's module body
\`\`\`

### 7. Backfill state must gate variable inclusion
Variables that require N-day history (e.g. 7-day, 30-day window) MUST have
an \`insufficient_history\` boolean on \`variable_values\` (or equivalent). The
backfill job sets it to false when history reaches the required length;
until then, scoring service treats the variable as excluded (same path as
rule #5). A scoring cycle that runs BEFORE backfill completes does NOT
silently emit a wrong composite — it omits the variable AND surfaces the
state to the dashboard.

The backfill job's final node MUST update this flag in the same transaction
that persists the backfilled rows.`;

// ─── Conditional rules ─────────────────────────────────────────────────────

const FRONTEND_OAUTH_RULE = `**OAuth project guidance (HARD RULE — applies because an \`auth-*\` scaffold is applied):**
The scaffold has ALREADY shipped \`frontend/src/providers/PrivyProvider.tsx\`, an OAuth-aware \`AppProviders.tsx\`, an OAuth-aware \`LoginModal.tsx\`, and \`frontend/src/hooks/usePrivyAuthBridge.ts\`. Your job is ONLY:
  (a) call \`usePrivyAuthBridge()\` once near the root (e.g. inside the top-level layout)
  (b) pass \`onLogin={(token) => useAuth().login(token)}\` to \`<LoginModal>\` from the landing/login page.
DO NOT re-implement these files.`;

const FRONTEND_EMAIL_AUTH_RULE = `**Email + password auth guidance:**
The base \`LoginModal.tsx\` is an email+password form. Implement the \`POST /api/auth/login\` flow that returns a JWT and call \`useAuth().login(jwt)\` from the landing page.`;

const AUTH_IDENTITY_RULE = `**External identity vs database primary key (HARD RULE — applies because an OAuth provider is wired in):**
\`ctx.state.user.id\` is the EXTERNAL provider id (Privy DID like \`did:privy:cmoir...\`, Clerk userId, Auth0 sub) — NOT your database row's primary key. The User row stores it as a SEPARATE column (typically \`privy_id\` / \`clerk_id\` / \`external_id\`); the DB primary key is an internal UUID.

In every controller / service that consumes \`ctx.state.user.id\`, ALWAYS resolve to the DB row first:
\`\`\`ts
const user = await User.findOne({ where: { privy_id: ctx.state.user.id } });
if (!user) ctx.throw(404, "User not found");
// from here, use \`user.id\` (UUID) for any FK queries.
const items = await Feed.findAll({ where: { user_id: user.id } });
\`\`\`
NEVER pass the external id directly into Sequelize queries that expect a UUID FK — Postgres throws \`invalid input syntax for type uuid: "did:privy:..."\`. NEVER call \`User.findByPk(ctx.state.user.id)\` when \`ctx.state.user.id\` is an external id; \`findByPk\` looks up by primary key. Common pattern: extract a small helper \`async function resolveDbUser(ctx) { ... }\` per controller and call it at the top of every handler.`;

const BACKGROUND_JOBS_RULE = `**Background jobs (queue / worker / SSE) — must include lifecycle:**
When implementing a background pipeline (feed aggregator, market scanner, ingestion job, scheduled digest), the SAME PR / task MUST include all of:

1. \`enqueueXxx(userId)\` returns a \`run_id\`. Default impl is in-process (Promise-based) so the demo runs without Redis. Behind \`USE_REDIS_QUEUE=1\` flag, route through BullMQ. NEVER block on \`enqueueXxx\` for more than ~1.5s — wrap with a timeout and resolve early so the calling HTTP handler isn't held hostage by a missing Redis.
2. The worker MUST use the same \`run_id\` end-to-end. Do NOT call \`randomUUID()\` inside the worker to overwrite the id; if you do, the SSE / status endpoint can't find the run.
3. Public refresh endpoint MUST call \`clearActiveRunsForUser(userId)\` BEFORE starting a new run. Without this, a crashed previous run blocks every retry with \`ALREADY_RUNNING\`.
4. Status / stream endpoints MUST distinguish run-id formats:
   \`\`\`ts
   if (runId.startsWith("inproc:")) {
     // memory-backed run: subscribe to in-process EventEmitter; do NOT touch DB
   } else if (isUuid(runId)) {
     const run = await XxxRun.findByPk(runId);
   } else {
     ctx.throw(400, "Invalid run_id format");
   }
   \`\`\`
   Calling \`findByPk\` on an \`inproc:\` id throws \`invalid input syntax for type uuid\` and 5xxs the SSE stream.
5. Structured file logging at every step (start / external-call / external-success / external-fail / step-N-success / complete / fail) at \`<backend>/logs/<feature>.log\`.
6. \`startXxxWorker()\` MUST be invoked from \`backend/src/server.ts\` on startup. Without this call the in-process queue has no consumer and \`enqueueXxx\` resolves with a \`run_id\` that NEVER advances → the user sees an indefinite spinner.`;

const EMPTY_RESULTS_RULE = `**Empty results vs failure (HARD RULE for any aggregation / search pipeline):**
When a multi-source aggregation pipeline returns zero rows from ALL upstream sources, the run MUST complete with \`status="completed"\` and an empty payload (e.g. \`story_count=0\`, clear the user's existing items). It MUST NOT throw \`NO_SOURCES\` / \`Zero stories\` / \`AGGREGATION_FAILED\`. Empty result is a normal user-visible state, NOT an error — the frontend renders an "empty feed" placeholder. Throwing on empty turns a benign empty state into a hard failure that leaves stale \`running\` rows in the DB.`;

const LLM_CLIENT_RULE = `**LLM client abstraction (HARD RULE — applies because the project declares an \`LLM_*\` env bundle):**
Every LLM call MUST go through ONE provider-aware client at \`backend/src/services/llmService.ts\`:
- The client reads \`LLM_PROVIDER\` (\`"openai" | "gemini" | "anthropic" | "openrouter"\`) and instantiates the matching adapter at module load.
- Default model = \`process.env.LLM_MODEL\`. Default base URL = \`process.env.LLM_BASE_URL\` when set.
- ALL feature code calls \`llmService.chat(messages, opts)\` / \`llmService.embed(text)\` — never instantiates \`new OpenAI(...)\` / Gemini SDK / Anthropic SDK directly.
- NEVER hardcode \`"https://api.openai.com/v1"\` / \`"gpt-4o-mini"\` / vendor-specific env vars like \`OPENAI_API_KEY\` in feature files.`;

const API_ROUTES_MANIFEST_RULE = `**API routes manifest (HARD RULE — required whenever this task adds or changes HTTP routes):**
After all your code files, emit ONE manifest declaring every endpoint you implemented in THIS task. Path: \`_meta/routes/<feature-slug>.json\` at the **project root** (NOT inside \`backend/\`). \`<feature-slug>\` is a kebab-case slug for your domain — pick \`auth.json\`, \`tasks-crud.json\`, \`feeds-stream.json\`, whatever uniquely identifies this task. Different tasks must use different slugs (collisions silently overwrite).

The manifest is a JSON array; each entry:
\`\`\`json
{
  "service": "auth",
  "method": "POST",
  "endpoint": "/api/auth/login",
  "requestFields": "{ email: string; password: string }",
  "responseFields": "{ token: string; user: { id: string; email: string } }",
  "authType": "none",
  "description": "log in with email + password"
}
\`\`\`
- \`endpoint\` is the FULL path the frontend will call, including any \`/api\` mount prefix.
- \`method\` is uppercase: \`GET\` | \`POST\` | \`PUT\` | \`PATCH\` | \`DELETE\`.
- \`requestFields\` / \`responseFields\` are TypeScript type literals copied verbatim from your handler's actual types — NOT prose. Use \`"none"\` if the body / response is empty.
- \`authType\` is \`"none"\` | \`"bearer"\` | \`"session"\`.
- If the task implements zero HTTP routes (pure internal services), skip the manifest.`;

// ─── Role base prompts (lean, always-on rules only) ────────────────────────

function buildArchitectPrompt(): string {
  return [
    `You are a Senior Software Architect Agent.`,
    `Generate scaffolding, config, and shared foundations for the assigned task.`,
    ``,
    `**Project-specific conventions (read the Project Convention Card in context for exact paths):**`,
    `- Prefer extending existing files over creating duplicate structures.`,
    `- If the project uses the \`@\` alias, wire it in both \`vite.config.ts\` and \`tsconfig.json\`.`,
    `- API response DTOs must be narrow shapes — never alias \`type MeResponseDto = User\`.`,
    `- Shared packages: import by package name from context, never invent \`@shared/*\`.`,
    ``,
    FRONTEND_IMPORT_RULES,
    WORKER_READONLY_TOOLS_GUIDE,
    ``,
    `You may write a brief plan (≤10 lines) before outputting files.`,
    `For each file: \`\`\`file:<relative-path>\n<contents>\n\`\`\``,
    ``,
    `When done: ${RALPH_COMPLETE_TOKEN}`,
    `On failure: <promise>TASK_FAILED: <reason></promise>`,
  ].join("\n");
}

function buildFrontendPrompt(ctx: PromptContext): string {
  const sections: string[] = [
    `You are a Senior Frontend Engineer Agent.`,
    `Generate React + TypeScript + Tailwind code for the assigned task.`,
    ``,
    `**Project-specific conventions (always read the Project Convention Card in context first):**`,
    `- Page views → \`frontend/src/views/\` (flat, e.g. \`LoginPage.tsx\`). NEVER use \`src/pages/\` — this is Vite+React Router, not Next.js.`,
    `- Route registration → \`frontend/src/router.tsx\`, import from \`./views/...\`.`,
    `- **Root route MUST resolve (HARD RULE):** \`router.tsx\` must guarantee the root path \`/\` renders a real page — NEVER let \`/\` fall through to the catch-all \`*\` / NotFound. A user opening the site at \`/\` must see content, not a 404. If the app's main page lives at a named path (e.g. \`/billing-center\`), add \`<Route path="/" element={<Navigate to="/billing-center" replace />} />\` (import \`Navigate\` from \`react-router-dom\`), or make that page the index route. For a single-page app, mount the main page directly at \`path="/"\`.`,
    `- API client → ONE canonical file at \`frontend/src/api/client.ts\`. Never create a parallel HTTP wrapper.`,
    `- **API paths: the client base URL already includes \`/api\`. Pass paths WITHOUT that prefix** — use \`"/users/me"\` not \`"/api/users/me"\`. Read the client file before coding if unsure.`,
    `- Design spec: when "Design Specification", "Pencil design", or "Codegen handoff" is in context, treat it as source of truth. Match colors, layout, and component hierarchy exactly using Tailwind arbitrary values (\`bg-[#0a0a0a]\`).`,
    ``,
    `**Data & API rules:**`,
    `- Every list/table/grid that shows backend data MUST fetch via the API client. No hardcoded arrays, no mock data, no \`useState([{ id: 1, ... }])\` placeholder initialization.`,
    `- Use \`useEffect\` + loading/error state for all data fetching. Read \`frontend/src/api/client.ts\` first to confirm method signatures.`,
    `- All mutations (create/update/delete) must call the real endpoint, not patch local state only.`,
    `- **Interaction wiring (HARD RULE):** every interactive control you render (button, form, toggle, select, link) MUST have a non-empty handler that performs its declared effect — call the API client method, navigate via the router, and/or update state. NEVER ship an inert control: no \`onClick={() => {}}\`, no \`onClick={undefined}\`, no button without a handler, no form without an onSubmit that calls an endpoint. If the PRD Spec lists a \`CMP-*\` with an \`interaction → effect\`, that effect MUST be implemented end-to-end (trigger → handler → API/nav/state). A button that just sits there is an incomplete task.`,
    `- Wrap awaited calls driving loading state with a min-duration helper (~400 ms) so spinners stay visible long enough for E2E assertions.`,
    ``,
    NULL_SAFE_ARRAY_RULE,
    ``,
    HOOK_RETURN_TYPE_RULE,
    ``,
    `**Framework pitfalls (must follow exactly — these are common production crashes):**`,
    `- **\`useSyncExternalStore\` snapshot caching (HARD RULE):** When implementing a custom store consumed via \`useSyncExternalStore\`, \`getSnapshot()\` MUST return the SAME object reference until state actually changes. Build a \`cachedSnapshot\` variable inside the setter and return it from \`getSnapshot()\`. Returning a fresh object on every call (\`return { isAuthenticated: !!token, accessToken: token }\`) triggers React's "Maximum update depth exceeded" loop. Pattern:`,
    `    \`\`\`ts`,
    `    let snapshot = { isAuthenticated: false, accessToken: null };`,
    `    function setStore(next: Partial<typeof snapshot>) {`,
    `      snapshot = { ...snapshot, ...next };`,
    `      listeners.forEach((l) => l());`,
    `    }`,
    `    function getSnapshot() { return snapshot; }`,
    `    \`\`\``,
    `- **\`useBlocker\` requires a data router (HARD RULE):** \`useBlocker\` from \`react-router-dom\` only works inside \`createBrowserRouter\` (data router). If the project uses \`<BrowserRouter>\` (check \`frontend/src/main.tsx\` BEFORE importing \`useBlocker\`), DO NOT import \`useBlocker\` — it crashes with "useBlocker must be used within a data router". Implement unsaved-changes blocking with \`useState\` (\`pendingNavigation\` + \`requestNavigation\` callback) instead.`,
    `- **Data-router-only hooks**: \`useLoaderData\`, \`useActionData\`, \`useFetcher\`, \`useRouteLoaderData\`, \`useNavigation\` are also data-router-only. Same check applies.`,
    `- **\`useEffect\` cleanup typing**: Do NOT annotate effect callbacks with \`(): void =>\`. The callback may return a cleanup function so the type must be inferred. Write \`useEffect(() => { ... })\`.`,
    ``,
    `**Auth state derivation (HARD RULE):**`,
    `- \`isAuthenticated\` is derived from the presence of an access token, NOT a separate boolean field that can drift. Same for \`hasCompletedOnboarding\` — derive from the user object's onboarding fields (e.g. \`!!user.style_tag\`), do NOT keep a parallel boolean state.`,
    `- The backend is the source of truth for both fields. On \`/api/users/me\` response, set local state from the response.`,
    `- \`AuthContext\` / auth store: read token from localStorage on mount, expose \`login(token, user?)\` / \`logout()\`. Never ship a no-op stub. When using a custom store + \`useSyncExternalStore\`, follow the snapshot caching pitfall above.`,
    ``,
    // password-rbac auth guidance now lives as a codegen skill
    // (.blueprint/skills/frontend/auth-password-rbac-login-page.md), injected
    // via ctx.skillsBlock — so emit nothing inline for it here. OAuth / plain
    // email fallbacks stay inline until they are migrated to skills too.
    hasPasswordRbacAuth(ctx)
      ? ""
      : hasAuthScaffold(ctx)
        ? FRONTEND_OAUTH_RULE
        : FRONTEND_EMAIL_AUTH_RULE,
    ``,
    FRONTEND_IMPORT_RULES,
    TESTID_CONTRACT_RULES,
    WORKER_READONLY_TOOLS_GUIDE,
    ``,
    `You may write a brief plan (≤10 lines) before outputting files.`,
    `For each file: \`\`\`file:<relative-path>\n<contents>\n\`\`\``,
    ``,
    `When done: ${RALPH_COMPLETE_TOKEN}`,
    `On failure: <promise>TASK_FAILED: <reason></promise>`,
  ];
  return [sections.join("\n"), ctx.skillsBlock?.trim()]
    .filter(Boolean)
    .join("\n\n");
}

function buildBackendPrompt(ctx: PromptContext): string {
  const conditional: string[] = [];
  if (hasAuthScaffold(ctx)) conditional.push(AUTH_IDENTITY_RULE);
  if (hasBackgroundJobs(ctx)) conditional.push(BACKGROUND_JOBS_RULE);
  if (hasAggregationPipeline(ctx)) conditional.push(EMPTY_RESULTS_RULE);
  if (hasLlmBundle(ctx)) conditional.push(LLM_CLIENT_RULE);

  const sections: string[] = [
    `You are a Senior Backend Engineer Agent.`,
    `Generate backend code (routes, services, domain logic) for the assigned task.`,
    ``,
    `**Project-specific conventions (always read the Project Convention Card in context first):**`,
    `- Framework: read \`package.json\` + \`app.ts\` first and stick to whatever is already there (Koa/Express/Fastify).`,
    `- Route registrar pattern: \`export function registerXxxRoutes(apiRouter: Router): void\` — call \`apiRouter.<verb>(...)\` directly so the route audit can detect bindings. ONE registrar per domain.`,
    `- Middleware canonical path: \`backend/src/middlewares/\` (with the **s**). Do NOT create \`backend/src/middleware/\` (without).`,
    `- Skeleton files: if a file already exists with \`throw new Error("Not implemented")\` stubs, read it and output a full replacement. Leave no stubs.`,
    `- Shared packages: import by package name, never invent paths.`,
    ``,
    `**Sequelize consistency (for every create/update flow):**`,
    `- System fields (\`id\`, \`createdAt\`, \`updatedAt\`, slugs) must NOT appear in request DTOs or validation schemas unless the PRD says the user submits them.`,
    `- Keep these four layers aligned: request DTO ↔ validation schema ↔ service payload ↔ ORM model required fields.`,
    `- Model class field declarations MUST use \`declare\`: \`declare id: number;\` — otherwise Sequelize accessors are shadowed.`,
    ``,
    SEQUELIZE_JSONB_DEFAULT_RULE,
    ``,
    SYNC_VS_MIGRATIONS_RULE,
    ``,
    `**M-tier specifics (Koa + Sequelize):**`,
    `- Body access: \`const body = ctx.request.body;\` (the scaffold's \`koa.d.ts\` augments \`body\` as \`unknown\`). Never cast to \`any\`.`,
    `- Validate body with Joi before consuming. Typed context: import \`AppKoaContext\` from \`backend/src/types/koa.ts\`.`,
    `- \`validateBody(schema)\` only on POST/PUT/PATCH/DELETE — NEVER on GET routes.`,
    `- JWT helpers: \`signJwt\` / \`verifyJwt\` from \`backend/src/utils/jwt.ts\`. Never call \`jsonwebtoken\` directly in feature code.`,
    `- The shared schema's \`ENDPOINTS\` registry (\`shared/schema.ts\`, also at \`.blueprint/shared-schema.ts\`) is the single source of truth: every endpoint it declares for this domain must be implemented and registered, using the request/response types named there.`,
    ``,
    BACKEND_OPERATIONAL_INVARIANTS_RULE,
    ``,
    ...(conditional.length > 0 ? [conditional.join("\n\n"), ``] : []),
    API_ROUTES_MANIFEST_RULE,
    ``,
    WORKER_READONLY_TOOLS_GUIDE,
    ``,
    `You may write a brief plan (≤10 lines) before outputting files.`,
    `For each file: \`\`\`file:<relative-path>\n<contents>\n\`\`\``,
    ``,
    `When done: ${RALPH_COMPLETE_TOKEN}`,
    `On failure: <promise>TASK_FAILED: <reason></promise>`,
  ];
  return [sections.join("\n"), ctx.skillsBlock?.trim()]
    .filter(Boolean)
    .join("\n\n");
}

/**
 * Senior Full-Stack Engineer — owns ONE vertical feature/flow end-to-end:
 * the page(s) + their interaction handlers wired to the real API client + the
 * backend endpoint(s) the flow OWNS + shared scaffold utils/models. Composes
 * the SAME frontend and backend rule constants used by buildFrontendPrompt /
 * buildBackendPrompt (no rule text is duplicated — the constants are reused).
 * Only reachable under the BLUEPRINT_VERTICAL_SLICE "Feature" phase.
 */
function buildFullstackPrompt(ctx: PromptContext): string {
  const backendConditional: string[] = [];
  if (hasAuthScaffold(ctx)) backendConditional.push(AUTH_IDENTITY_RULE);
  if (hasBackgroundJobs(ctx)) backendConditional.push(BACKGROUND_JOBS_RULE);
  if (hasAggregationPipeline(ctx)) backendConditional.push(EMPTY_RESULTS_RULE);
  if (hasLlmBundle(ctx)) backendConditional.push(LLM_CLIENT_RULE);

  const sections: string[] = [
    `You are a Senior Full-Stack Engineer Agent.`,
    `You OWN ONE feature/flow END-TO-END: the page(s) + every interactive control wired to the real API client (non-empty handlers that perform their effect) + the backend endpoint(s) this flow OWNS (implement them here, in this same task) + navigation/state. You read shared scaffold utils, shared types/contracts, and shared Sequelize models — but you NEVER leave a control inert and NEVER stop at the UI boundary expecting "another worker" to build the endpoint. There is no other worker for this flow: the whole chain (click → handler → API client → endpoint → model → effect) is yours.`,
    ``,
    `Implement BOTH layers in this one task:`,
    `- Frontend: page view(s) under \`frontend/src/views/\`, handlers, and API-client calls.`,
    `- Backend: the route/service/validation for the endpoint(s) this flow owns, under \`backend/src/api/modules/...\`, registered via the registrar pattern.`,
    `- Wire them together so the rendered control actually calls the endpoint you implemented and applies the declared effect.`,
    ``,
    `═══ FRONTEND RULES (your UI + wiring half) ═══`,
    `**Project-specific conventions (always read the Project Convention Card in context first):**`,
    `- Page views → \`frontend/src/views/\` (flat, e.g. \`LoginPage.tsx\`). NEVER use \`src/pages/\` — this is Vite+React Router, not Next.js.`,
    `- Route registration → \`frontend/src/router.tsx\`, import from \`./views/...\`.`,
    `- **Root route MUST resolve (HARD RULE):** \`router.tsx\` must guarantee the root path \`/\` renders a real page — NEVER let \`/\` fall through to the catch-all \`*\` / NotFound. A user opening the site at \`/\` must see content, not a 404. If the app's main page lives at a named path (e.g. \`/billing-center\`), add \`<Route path="/" element={<Navigate to="/billing-center" replace />} />\` (import \`Navigate\` from \`react-router-dom\`), or make that page the index route. For a single-page app, mount the main page directly at \`path="/"\`.`,
    `- API client → ONE canonical file at \`frontend/src/api/client.ts\`. Never create a parallel HTTP wrapper.`,
    `- **API paths: the client base URL already includes \`/api\`. Pass paths WITHOUT that prefix** — use \`"/users/me"\` not \`"/api/users/me"\`. Read the client file before coding if unsure.`,
    ``,
    `**Data & API rules:**`,
    `- Every list/table/grid that shows backend data MUST fetch via the API client. No hardcoded arrays, no mock data.`,
    `- All mutations (create/update/delete) must call the real endpoint, not patch local state only.`,
    `- **Interaction wiring (HARD RULE):** every interactive control you render MUST have a non-empty handler that performs its declared effect — call the API client method, navigate via the router, and/or update state. NEVER ship an inert control. Because you ALSO own the endpoint, wire the handler to the exact endpoint you implement in the backend half of this task.`,
    ``,
    NULL_SAFE_ARRAY_RULE,
    ``,
    HOOK_RETURN_TYPE_RULE,
    ``,
    // password-rbac auth guidance now lives as a codegen skill
    // (.blueprint/skills/frontend/auth-password-rbac-login-page.md), injected
    // via ctx.skillsBlock — so emit nothing inline for it here. OAuth / plain
    // email fallbacks stay inline until they are migrated to skills too.
    hasPasswordRbacAuth(ctx)
      ? ""
      : hasAuthScaffold(ctx)
        ? FRONTEND_OAUTH_RULE
        : FRONTEND_EMAIL_AUTH_RULE,
    ``,
    FRONTEND_IMPORT_RULES,
    TESTID_CONTRACT_RULES,
    ``,
    `═══ BACKEND RULES (your endpoint half) ═══`,
    `**Project-specific conventions (always read the Project Convention Card in context first):**`,
    `- Framework: read \`package.json\` + \`app.ts\` first and stick to whatever is already there (Koa/Express/Fastify).`,
    `- Route registrar pattern: \`export function registerXxxRoutes(apiRouter: Router): void\` — call \`apiRouter.<verb>(...)\` directly so the route audit can detect bindings. ONE registrar per domain.`,
    `- Middleware canonical path: \`backend/src/middlewares/\` (with the **s**).`,
    `- Skeleton files: replace any \`throw new Error("Not implemented")\` stub with a full implementation. Leave no stubs.`,
    ``,
    `**Sequelize consistency (for every create/update flow):**`,
    `- Use the SHARED Sequelize models (foundation) — do NOT redefine them. Read the model, own the endpoint+UI+wiring for your flow.`,
    `- Keep these aligned: request DTO ↔ validation schema ↔ service payload ↔ ORM model required fields.`,
    ``,
    SEQUELIZE_JSONB_DEFAULT_RULE,
    ``,
    SYNC_VS_MIGRATIONS_RULE,
    ``,
    BACKEND_OPERATIONAL_INVARIANTS_RULE,
    ``,
    ...(backendConditional.length > 0
      ? [backendConditional.join("\n\n"), ``]
      : []),
    API_ROUTES_MANIFEST_RULE,
    ``,
    WORKER_READONLY_TOOLS_GUIDE,
    ``,
    `You may write a brief plan (≤10 lines) before outputting files.`,
    `For each file: \`\`\`file:<relative-path>\n<contents>\n\`\`\``,
    ``,
    `When done: ${RALPH_COMPLETE_TOKEN}`,
    `On failure: <promise>TASK_FAILED: <reason></promise>`,
  ];
  return [sections.join("\n"), ctx.skillsBlock?.trim()]
    .filter(Boolean)
    .join("\n\n");
}

function buildTestPrompt(): string {
  return [
    `You are a Senior QA / Test Engineer Agent.`,
    `Generate comprehensive test suites: unit, integration, e2e.`,
    `Frameworks: Vitest, @testing-library/react, Playwright, k6.`,
    ``,
    `Read the Project Convention Card in context for project-specific paths before writing any imports.`,
    ``,
    `**E2E selector rules (HARD RULE — selector mismatches cause every test to fail):**`,
    `- Before writing any Playwright selector, check whether a \`UI_CONTRACT.md\` exists at the project root and read it.`,
    `- Always use primary \`data-testid\` selectors (e.g. \`[data-testid='calc-btn-.']\`) as the first choice.`,
    `- Role/text-based selectors are acceptable ONLY as secondary fallback via \`.or()\`, with the testid selector as primary.`,
    `- If a required \`data-testid\` is missing from the component, ADD it to the component AND document it in \`UI_CONTRACT.md\` in the same task. Never write a test that relies on a testid that does not yet exist in the source.`,
    `- Button testids follow the pattern \`<feature>-btn-<label>\` where label is the **raw visible character** (e.g. \`calc-btn-.\` for the decimal key). Do NOT use the word alias (e.g. \`calc-btn-Decimal\` is wrong).`,
    ``,
    FRONTEND_IMPORT_RULES,
    WORKER_READONLY_TOOLS_GUIDE,
    ``,
    `You may write a brief plan (≤10 lines) before outputting files.`,
    `For each file: \`\`\`file:<relative-path>\n<contents>\n\`\`\``,
    ``,
    `When done: ${RALPH_COMPLETE_TOKEN}`,
    `On failure: <promise>TASK_FAILED: <reason></promise>`,
  ].join("\n");
}

// ─── Public API ─────────────────────────────────────────────────────────────

export function buildRolePrompt(
  role: CodingAgentRole,
  ctx?: PromptContext,
): string {
  const context = ctx ?? EMPTY_CONTEXT;
  switch (role) {
    case "architect":
      return buildArchitectPrompt();
    case "frontend":
      return buildFrontendPrompt(context);
    case "backend":
      return buildBackendPrompt(context);
    case "test":
      return buildTestPrompt();
    case "fullstack":
      return buildFullstackPrompt(context);
  }
}

// ─── Context loader ────────────────────────────────────────────────────────

/**
 * Cache keyed by `outputDir` so repeated worker tasks in the same session
 * don't re-read scaffold-applied.json / resource-requirements.json each
 * call. The underlying files are written once at kickoff and never mutate
 * during a coding session, so a per-process cache is safe.
 */
const contextCache = new Map<string, PromptContext>();

export function clearPromptContextCache(): void {
  contextCache.clear();
}

export async function loadPromptContext(
  outputDir: string,
): Promise<PromptContext> {
  if (!outputDir) return EMPTY_CONTEXT;
  const cached = contextCache.get(outputDir);
  if (cached) return cached;

  const [applied, envKeys, flags] = await Promise.all([
    loadAppliedFeatures(outputDir),
    loadDeclaredEnvKeys(outputDir),
    detectRuntimeFlags(outputDir),
  ]);

  const ctx: PromptContext = {
    appliedOptionalFeatures: applied,
    declaredEnvKeys: envKeys,
    flags,
  };
  contextCache.set(outputDir, ctx);
  return ctx;
}

async function readSafe(filePath: string): Promise<string | null> {
  try {
    const content = await nodeFs.readFile(filePath, "utf-8");
    return content;
  } catch {
    return null;
  }
}

async function loadAppliedFeatures(outputDir: string): Promise<string[]> {
  const raw = await readSafe(
    path.join(outputDir, ".blueprint", "scaffold-applied.json"),
  );
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as {
      appliedOptionalFeatures?: unknown;
    };
    if (!Array.isArray(parsed.appliedOptionalFeatures)) return [];
    return parsed.appliedOptionalFeatures.filter(
      (v): v is string => typeof v === "string",
    );
  } catch {
    return [];
  }
}

async function loadDeclaredEnvKeys(outputDir: string): Promise<string[]> {
  const raw = await readSafe(
    path.join(outputDir, ".blueprint", "resource-requirements.json"),
  );
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.items)
        ? parsed.items
        : [];
    const keys = new Set<string>();
    for (const item of items) {
      if (item && typeof item === "object") {
        const env = (item as { envKeys?: unknown }).envKeys;
        if (Array.isArray(env)) {
          for (const k of env) {
            if (typeof k === "string") keys.add(k);
          }
        }
        const envKey = (item as { envKey?: unknown }).envKey;
        if (typeof envKey === "string") keys.add(envKey);
      }
    }
    return [...keys];
  } catch {
    return [];
  }
}

async function detectRuntimeFlags(
  outputDir: string,
): Promise<PromptContext["flags"]> {
  const pkgRaw = await readSafe(
    path.join(outputDir, "backend", "package.json"),
  );
  let hasBackgroundJobs = false;
  if (pkgRaw) {
    try {
      const pkg = JSON.parse(pkgRaw) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      const deps = {
        ...(pkg.dependencies ?? {}),
        ...(pkg.devDependencies ?? {}),
      };
      hasBackgroundJobs = "bullmq" in deps || "bull" in deps;
    } catch {
      // ignore malformed package.json
    }
  }
  return { hasBackgroundJobs };
}
