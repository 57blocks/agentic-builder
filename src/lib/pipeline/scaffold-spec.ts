import fs from "fs/promises";
import path from "path";
import type { ScaffoldTier } from "./scaffold-copy";

const LOCKFILE_NAMES = new Set([
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock",
]);

function shouldOmitFromPathSummary(rel: string): boolean {
  const base = rel.split("/").pop() ?? rel;
  if (LOCKFILE_NAMES.has(base)) return true;
  if (rel.endsWith(".DS_Store") || rel.endsWith(".swp")) return true;
  return false;
}

/**
 * Cap and normalize template paths for LLM prompts (task breakdown, etc.).
 */
export function summarizeTemplatePathsForPrompt(
  paths: string[],
  maxLines = 50,
): string {
  const filtered = paths
    .map((p) => p.replace(/\\/g, "/"))
    .filter((p) => !shouldOmitFromPathSummary(p))
    .sort();
  const lines = filtered.slice(0, maxLines);
  const more =
    filtered.length > maxLines
      ? `\n... and ${filtered.length - maxLines} more path(s)`
      : "";
  return (lines.length ? lines.join("\n") : "(no paths)") + more;
}

function tierScaffoldBrief(tier: ScaffoldTier): string {
  switch (tier) {
    case "S":
      return [
        "- Single **Vite + React + TypeScript** app at repository root.",
        "- Entry: `index.html`, `src/main.tsx`, `src/App.tsx`; Tailwind + PostCSS at root.",
        "- Use **Vitest** under `src/test/` when adding tests.",
        "- Do **not** introduce Next.js unless the PRD explicitly requires SSR or Next.js API routes.",
      ].join("\n");
    case "M":
      return [
        "- Root layout: `frontend/`, `backend/`, `PRD.md`, `README.md`.",
        "- **`frontend/`**: Vite + React + TypeScript + React Router + Tailwind CSS + Ant Design.",
        "- **`backend/`**: Koa + TypeScript + Sequelize + PostgreSQL.",
        "- Frontend API requests use `/api`; Vite dev server proxies `/api` to `http://localhost:4000`.",
        "- Backend entrypoints: `src/app.ts` assembles Koa middleware/routes, `src/server.ts` starts the service, `src/api/modules/*` contains business modules.",
        "- Run apps separately: `cd frontend && pnpm dev`, `cd backend && pnpm dev`.",
      ].join("\n");
    case "L":
      return [
        "- Root layout: `frontend/`, `backend/`, `_optional/`, `docker-compose.yml`, `PRD.md`, `README.md`.",
        "- **`frontend/`**: Vite + React + TypeScript + React Router + Tailwind CSS (same stack as M).",
        "- **`backend/`**: Koa + TypeScript + Sequelize + PostgreSQL (same stack as M) PLUS **L-tier-only** layers:",
        "  - `src/workers/` + `src/queue/inProcessQueue.ts` — background-job queue + worker bootstrap (`startAllWorkers()` called from `server.ts` before `listen()`).",
        "  - `src/config/logger.ts` — pino structured logger; per-request child logger attached to `ctx.state.log` by `requestLoggerMiddleware`.",
        "  - `src/middlewares/requestLogger.ts` + `src/middlewares/rateLimit.ts` — request-level structured logging and window-based rate limiting.",
        "- **`docker-compose.yml`**: brings up Postgres + Redis by default; `--profile full` also builds backend/frontend images.",
        "- Frontend API requests use `/api`; Vite dev server proxies `/api` to `http://localhost:4000`.",
        "- Run apps separately: `cd frontend && pnpm dev`, `cd backend && pnpm dev` (same as M).",
      ].join("\n");
    default:
      return "";
  }
}

/**
 * Short block for task-breakdown system/user context (prebuilt scaffold awareness).
 */
export function buildTaskBreakdownScaffoldBlock(
  tier: ScaffoldTier,
  templateRelativePaths: string[],
): string {
  const pathBlock = summarizeTemplatePathsForPrompt(templateRelativePaths, 50);
  const prebuiltNote =
    tier === "S"
      ? 'The template already ships a runnable Vite app. **Do not** plan a greenfield "create Vite from zero" task unless the PRD requires replacing the stack. Plan Frontend tasks to implement the actual product features (do not add phase "Testing" tasks — automated tests are not scheduled in the pipeline yet).'
      : tier === "M"
        ? 'The template already ships a runnable **frontend/backend split skeleton** (`frontend/`, `backend/`, base configs, health route, router shell). **Do not** recreate that structure. You **MUST** still plan Backend Services tasks (to implement real API routes/logic in `backend/src`) and Frontend tasks (to implement real pages/flows in `frontend/src`) — the scaffold ships shells, not product features. Do not add phase "Testing" tasks until the pipeline runs test workers.'
        : 'The template already ships a runnable **frontend/backend split skeleton PLUS L-tier production layers** (`src/workers/`, `src/queue/inProcessQueue.ts`, `src/config/logger.ts`, `src/middlewares/requestLogger.ts`, `src/middlewares/rateLimit.ts`, `docker-compose.yml` with postgres + redis). **Do not** recreate any of that. You **MUST** still plan Backend Services tasks (to implement real API routes/logic in `backend/src/api/modules`) and Frontend tasks (to implement real pages/flows in `frontend/src/views`) on top of the L scaffold. Background-job features MUST register their worker in `backend/src/workers/index.ts` and use `enqueueJob` / `registerWorker` from `backend/src/queue/inProcessQueue.ts`. Do not add phase "Testing" tasks until the pipeline runs test workers.';

  return [
    `## Pipeline coding tier: **${tier}**`,
    "",
    "Before coding agents run, the pipeline **copies the tier scaffold** into the output directory.",
    prebuiltNote,
    "Plan **product features** on top of the paths below.",
    "",
    "### Layout (abbrev.)",
    tierScaffoldBrief(tier),
    "",
    "### Representative template paths (lockfiles omitted)",
    "```text",
    pathBlock,
    "```",
    "",
  ].join("\n");
}

/**
 * Full markdown written to the generated repo as `SCAFFOLD_SPEC.md` and injected into coding context.
 * Kept in English for agent/human consumption in the output project.
 */
export function getTierScaffoldSpecMarkdown(tier: ScaffoldTier): string {
  const brief = tierScaffoldBrief(tier);
  switch (tier) {
    case "S":
      return [
        "# Scaffold specification (tier S)",
        "",
        "This project was bootstrapped from the **S-tier** scaffold (single Vite + React app).",
        "",
        "## Layout",
        brief,
        "",
        "## Where to implement",
        "- UI and routes: `src/` (components, pages, hooks, stores).",
        "- Styles: Tailwind + `src/index.css` (`@tailwind` directives).",
        "- Tests: colocate `*.test.ts(x)` or under `src/test/`.",
        "",
        "## Commands",
        "- `pnpm install` — install dependencies.",
        "- `pnpm dev` — Vite dev server.",
        "- `pnpm build` — production build.",
        "- `pnpm test` — Vitest.",
        "",
        "## Do not",
        "- Add Next.js or a second frontend app unless the PRD explicitly requires it.",
        "",
      ].join("\n");
    case "M":
      return [
        "# Scaffold specification (tier M)",
        "",
        "This project was bootstrapped from the **M-tier** scaffold: separate `frontend` + `backend` applications with a shared product-level root.",
        "",
        "## Layout",
        brief,
        "",
        "## Where to implement",
        "- **Backend**: `backend/src` for Koa app assembly, API modules, models, DB config, middleware, and services.",
        "- **Backend routing policy**: register API resources under `backend/src/api/modules`, then wire them through `backend/src/api/modules/index.ts` and `backend/src/app.ts`.",
        "- **Backend middleware folder**: the canonical directory is `backend/src/middlewares` (plural). Do NOT create files in `backend/src/middleware` (singular).",
        "- **Frontend**: `frontend/src` for routes, page-level views, reusable components, API client helpers, and state.",
        "- **Frontend page policy**: prefer page-level screens under `frontend/src/views`; keep route registration in `frontend/src/router.tsx` and mount it from `frontend/src/main.tsx` / `frontend/src/App.tsx` as appropriate.",
        "- **Navigation policy**: `/` must expose visible navigation entry links/buttons to the main product flows.",
        "",
        "## Canonical scaffold utilities — DO NOT recreate",
        "- `frontend/src/api/client.ts` — the **only** HTTP client. Exports `apiClient` with `get / post / put / patch / delete` and an options bag `{ auth?, headers?, query?, signal? }`. NEVER create `frontend/src/utils/apiClient.ts`, `frontend/src/utils/api.ts`, `frontend/src/lib/http.ts`, or any parallel wrapper.",
        "- `backend/src/types/koa.d.ts` — global `koa` module augmentation that types `ctx.request.body` as `unknown` and `state.user`. Read `ctx.request.body` directly; never write `(ctx.request as any).body`.",
        "- `backend/src/types/koa.ts` — re-exports `AppKoaContext` for typed handlers.",
        "- `backend/src/utils/jwt.ts` — canonical `signJwt` / `verifyJwt`. Feature code MUST import from here; do NOT call `jsonwebtoken` directly and do NOT create a parallel JWT helper.",
        "- `backend/src/utils/narrow.ts` — `parseEnumLiteral` / `asRecord` for safe input narrowing. Use instead of `as`-casts on string-literal unions.",
        "- `backend/src/middlewares/{cors,errorHandler}.ts` — already wired in `app.ts`; do not redeclare them.",
        "",
        "## Commands",
        "- `cd frontend && pnpm install && pnpm dev`",
        "- `cd frontend && pnpm build`",
        "- `cd backend && pnpm install && pnpm dev`",
        "- `cd backend && pnpm build`",
        "",
        "## Protected / prebuilt files",
        "- Config and app shells from the scaffold should be **extended**, not replaced wholesale.",
        "- After coding starts, see also `ARCHITECTURE_SCAFFOLD.md` for the concrete file list registered for this run.",
        "",
      ].join("\n");
    case "L":
      return [
        "# Scaffold specification (tier L)",
        "",
        "This project was bootstrapped from the **L-tier** scaffold: same `frontend/` + `backend/` flat layout as M-tier (Vite + React on the front, Koa + Sequelize + PostgreSQL on the back), with **production-grade additions baked in**:",
        "- background-job queue + worker bootstrap",
        "- pino structured logger with per-request correlation",
        "- request-logger and rate-limit middlewares",
        "- docker-compose that stands up Postgres + Redis for local dev",
        "",
        "## Layout",
        brief,
        "",
        "## Where to implement",
        "- **Backend**: `backend/src` for Koa app assembly, API modules, models, DB config, middleware, services, **and background workers under `src/workers/`**.",
        "- **Backend routing policy**: register API resources under `backend/src/api/modules/<feature>/<feature>.routes.ts`, then wire them through `backend/src/api/modules/index.ts` and `backend/src/app.ts`.",
        "- **Backend middleware folder**: the canonical directory is `backend/src/middlewares` (plural). Do NOT create files in `backend/src/middleware` (singular).",
        "- **Background jobs**: every queue MUST register its worker in `backend/src/workers/index.ts` via `registerWorker(...)`. Use `enqueueJob` / `registerWorker` from `backend/src/queue/inProcessQueue.ts`. `startAllWorkers()` is called from `server.ts` BEFORE `app.listen(...)` — never enqueue work that depends on an unregistered queue.",
        "- **Logging**: use `ctx.state.log` inside HTTP handlers and `childLogger({ ... })` inside workers. Never `console.log` in feature code; tests scan log files for run progress.",
        "- **Frontend**: `frontend/src` for routes, page-level views, reusable components, API client helpers, and state.",
        "- **Frontend page policy**: prefer page-level screens under `frontend/src/views`; keep route registration in `frontend/src/router.tsx`.",
        "- **Frontend null-safe arrays**: any API-sourced list MUST go through `safeArray(...)` / `mapSafe(...)` from `frontend/src/api/safeArray.ts` before `.map` / spread.",
        "",
        "## Canonical scaffold utilities — DO NOT recreate",
        "- `frontend/src/api/client.ts` — the **only** HTTP client. NEVER create a parallel wrapper.",
        "- `frontend/src/api/safeArray.ts` — null-safe array helpers. Use these instead of inlining `(arr ?? []).map(...)` everywhere.",
        "- `backend/src/types/koa.d.ts` / `backend/src/types/koa.ts` — global `koa` module augmentation and `AppKoaContext`. Re-use; never redeclare.",
        "- `backend/src/utils/jwt.ts` — canonical `signJwt` / `verifyJwt`. Feature code MUST import from here.",
        "- `backend/src/utils/narrow.ts` — `parseEnumLiteral` / `asRecord` helpers.",
        "- `backend/src/middlewares/{cors,errorHandler,requestLogger,rateLimit}.ts` — already wired in `app.ts`. Do not redeclare.",
        "- `backend/src/config/logger.ts` — pino instance + `childLogger()`. Use `ctx.state.log` inside handlers.",
        "- `backend/src/queue/inProcessQueue.ts` — queue API matching BullMQ shape. `runId` prefixed `inproc:*` MUST be threaded end-to-end; the worker never calls `randomUUID()` to overwrite it.",
        "",
        "## Commands",
        "- `docker compose up -d` — start Postgres + Redis (host-mapped on 5432 / 6379).",
        "- `cd backend && pnpm install && pnpm migrate && pnpm dev`",
        "- `cd frontend && pnpm install && pnpm dev`",
        "- `docker compose --profile full up --build` — production-shaped full-stack sanity check.",
        "",
        "## Protected / prebuilt files",
        "- Config, middlewares, queue, and worker bootstrap from the scaffold should be **extended**, not replaced wholesale.",
        "- See `ARCHITECTURE_SCAFFOLD.md` for the concrete file list registered for this run.",
        "",
      ].join("\n");
    default:
      return "# Scaffold specification\n\nUnknown tier.\n";
  }
}

const SCAFFOLD_SPEC_MAX_CONTEXT_CHARS = 6000;

/** Truncated spec for appending to supervisor `projectContext`. */
export function getTierScaffoldSpecForCodingContext(
  tier: ScaffoldTier,
): string {
  const full = getTierScaffoldSpecMarkdown(tier);
  if (full.length <= SCAFFOLD_SPEC_MAX_CONTEXT_CHARS) return full;
  return `${full.slice(0, SCAFFOLD_SPEC_MAX_CONTEXT_CHARS)}\n\n[SCAFFOLD_SPEC truncated for context length]\n`;
}

/**
 * Writes `SCAFFOLD_SPEC.md` into the output directory (always overwrites).
 * Call after `copyScaffold` so the doc is present for humans and agents.
 */
export async function writeScaffoldSpecFile(
  outputDir: string,
  tier: ScaffoldTier,
): Promise<void> {
  const md = getTierScaffoldSpecMarkdown(tier);
  await fs.writeFile(path.join(outputDir, "SCAFFOLD_SPEC.md"), md, "utf-8");
}
