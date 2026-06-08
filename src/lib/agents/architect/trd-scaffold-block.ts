/**
 * Scaffold-foundation block for the TRD prompt.
 *
 * Code generation starts from a per-tier scaffold (template project under
 * `scaffolds/<tier>-tier/`) that already ships the stack, app shell, HTTP
 * client, auth/JWT utils, DB wiring, middlewares, Docker, and (for L) the
 * logger / rate-limiter / job queue / worker registry. Without this block the
 * TRD re-specifies all of that from scratch, which makes downstream coding
 * agents re-invent or duplicate scaffold-provided infrastructure (a second
 * HTTP client, a custom JWT helper, a parallel docker-compose, …).
 *
 * This block tells the architect: the scaffold is already there — reference it,
 * build on it, and only design what's PROJECT-SPECIFIC and missing. It mirrors
 * the "scaffold utilities are CANONICAL" guidance the task-breakdown agent
 * already gives, so the two stages agree on the same baseline.
 */

import type { ProjectTier } from "../shared/project-classifier";

const INSTRUCTION = `The generated project STARTS from this tier's scaffold (already copied into the repo). In the TRD you MUST:
- §1 Tech Stack: state the scaffold's stack as-is — do NOT propose a different framework, database, or build tool.
- FRONTEND IS A VITE + REACT + react-router-dom SINGLE-PAGE APP (client-rendered). It is NOT Next.js. Do NOT mention Next.js, the App Router, React Server Components / RSC, SSR, getServerSideProps, or any \`next/*\` import ANYWHERE in the TRD — the scaffold ships none of these and codegen builds on a Vite SPA. Routing is client-side via react-router-dom; data loads through the scaffold HTTP client, not server components.
- Treat every file / capability listed below as EXISTING infrastructure. Do NOT re-design it, list it as "to build", or duplicate it. NEVER introduce a parallel or renamed copy of a canonical scaffold file (e.g. a second HTTP client, a custom JWT helper, a parallel rate-limiter / worker bootstrap, another docker-compose).
- Spend §3 (services / data models / APIs), §5, §7, §8 on what is PROJECT-SPECIFIC and MISSING from the scaffold — the domain models, feature endpoints, and domain workflows — built ON the scaffold's middlewares / utils / queue.
- When a design decision depends on a scaffold file, reference it by its canonical path rather than restating its contents.`;

const FRONTEND_M = `- Frontend (Vite + React + TypeScript + Tailwind v4, already configured): ONE canonical HTTP client at \`frontend/src/api/client.ts\` (base URL already includes \`/api\` — pass paths without that prefix); router at \`frontend/src/router.tsx\`; providers at \`frontend/src/providers/AppProviders.tsx\`; auth state at \`frontend/src/context/AuthContext.tsx\`; Playwright e2e harness + \`vite.config.ts\`.`;

const BACKEND_M = `- Backend (Koa + Sequelize + PostgreSQL): app entry \`backend/src/app.ts\` + \`server.ts\`; DB at \`backend/src/db.ts\`; env at \`backend/src/config/env.ts\`; route registration at \`backend/src/api/modules/index.ts\`; models entry \`backend/src/models/index.ts\`. Canonical middlewares (\`errorHandler\`, \`cors\`, \`responseEnvelope\`) are already wired in \`app.ts\`. Canonical utils: \`backend/src/utils/jwt.ts\` (\`signJwt\` / \`verifyJwt\`), \`backend/src/utils/narrow.ts\`, \`backend/src/types/koa.d.ts\` (types \`ctx.request.body\`). Auth + health modules are scaffolded.`;

const DEPLOY_M = `- Deployment: root \`Dockerfile\`, per-service Dockerfiles, \`docker-compose.yml\` (brings up postgres), and \`nginx.conf\` for the frontend image.`;

const PROD_L = `- Production layers (L only): pino logger at \`backend/src/config/logger.ts\` — use \`ctx.state.log\` in handlers, \`childLogger(...)\` in workers (no \`console.log\` in feature code); \`backend/src/middlewares/requestLogger.ts\` (requestId propagation, already wired first); \`backend/src/middlewares/rateLimit.ts\` (\`createRateLimit({ windowMs, max })\`); job queue \`backend/src/queue/inProcessQueue.ts\` (\`enqueueJob\` / \`registerWorker\`) with the worker registry \`backend/src/workers/index.ts\` (\`startAllWorkers()\`, invoked by \`server.ts\`); \`frontend/src/api/safeArray.ts\`; \`docker-compose.yml\` also starts redis; optional \`docker-compose.prod.yml\`.`;

/**
 * Render the scaffold-foundation block for a tier. Always non-empty (every
 * tier ships a scaffold) so the architect is always told what already exists.
 */
export function renderScaffoldFoundationBlock(tier: ProjectTier): string {
  const lines: string[] = [
    `## Scaffold foundation — Tier ${tier} (ALREADY PROVIDED — do NOT re-specify)`,
    "",
    INSTRUCTION,
    "",
    "The scaffold already ships:",
  ];

  if (tier === "S") {
    lines.push(
      `- Frontend-only (Vite + React + TypeScript + Tailwind, already configured): app shell \`src/App.tsx\` / \`src/main.tsx\`, \`vite.config.ts\`, Playwright e2e harness, \`Dockerfile\`, \`nginx.conf\`, \`docker-compose.yml\`.`,
      `- There is NO backend in the S-tier scaffold. Do not design a backend unless the PRD genuinely requires one (in which case the project would be M-tier).`,
    );
  } else {
    lines.push(FRONTEND_M, BACKEND_M, DEPLOY_M);
    if (tier === "L") lines.push(PROD_L);
  }

  return lines.join("\n");
}

// ── Deterministic framework-drift guard ────────────────────────────────────────

/**
 * Tokens that prove the TRD drifted to a frontend framework the scaffold does
 * NOT ship. Every tier's scaffold is a Vite + React + react-router-dom SPA, so
 * any mention of Next.js / the App Router / Server Components / SSR is a
 * hallucination that would send codegen down the wrong stack. Kept narrow to
 * avoid false positives (e.g. plain "next step" / "next semester" never match).
 */
const FORBIDDEN_FRONTEND_TOKENS: RegExp[] = [
  /next\.?js/i,
  /next\/(app|link|router|image|navigation|font|server|head)\b/i,
  /\bapp router\b/i,
  /react server components?/i,
  /\bserver components?\b/i,
  /\brsc\b/i,
  /getServerSideProps|getStaticProps/i,
];

/**
 * Scan a generated TRD for frontend-framework drift away from the scaffold.
 * Returns the distinct offending snippets (empty = clean). Pure, deterministic
 * — used to reject/correct a TRD that ignored the scaffold's Vite+React stack.
 */
export function detectFrontendFrameworkDrift(
  trd: string,
  _tier: ProjectTier,
): string[] {
  const hits = new Set<string>();
  for (const re of FORBIDDEN_FRONTEND_TOKENS) {
    const m = trd.match(re);
    if (m) hits.add(m[0]);
  }
  return [...hits];
}
