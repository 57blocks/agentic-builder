import type Koa from "koa";

/**
 * CORS middleware with a strict allowlist.
 *
 * Why not `koa2-cors` with `origin: "*"`:
 *   - `*` + `Access-Control-Allow-Credentials: true` is rejected by every
 *     modern browser, so it silently breaks cookie-based auth.
 *   - Reflecting whatever `Origin` the client sends opens the API to any
 *     site that can entice a logged-in user to load it — including evil
 *     internal IPs in private subnets.
 *
 * Source of truth: `CORS_ORIGINS` env (comma-separated list). `FRONTEND_URL`
 * is honoured as a legacy fallback for single-origin deployments. Anything
 * not on the list gets the same headers as an unrelated cross-origin
 * request — i.e. no ACAO — and preflight requests are rejected with 403
 * so the failure is observable in browser devtools instead of looking like
 * a backend 500.
 *
 * Boot validation lives in `config/env.ts#assertRequiredEnv`.
 */

const ALLOW_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];
const ALLOW_HEADERS = ["Content-Type", "Authorization", "Accept"];
const EXPOSE_HEADERS = ["Content-Length", "Date"];
const MAX_AGE = 86400;

function parseAllowedOrigins(): string[] {
  const raw =
    process.env.CORS_ORIGINS ?? process.env.FRONTEND_URL ?? "";
  return raw
    .split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

// Cached on first call. Boot-time validation (`assertRequiredEnv`) guarantees
// the env is set before middleware runs.
let allowedOrigins: string[] | null = null;
function getAllowedOrigins(): string[] {
  if (allowedOrigins === null) allowedOrigins = parseAllowedOrigins();
  return allowedOrigins;
}

function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return false;
  return getAllowedOrigins().includes(origin.replace(/\/$/, ""));
}

export const corsMiddleware: Koa.Middleware = async (ctx, next) => {
  const origin = ctx.get("Origin");
  const allowed = isOriginAllowed(origin);

  if (allowed) {
    ctx.set("Access-Control-Allow-Origin", origin);
    ctx.set("Vary", "Origin");
    ctx.set("Access-Control-Allow-Credentials", "true");
    ctx.set("Access-Control-Expose-Headers", EXPOSE_HEADERS.join(", "));
  }

  if (ctx.method === "OPTIONS") {
    if (!allowed) {
      // Reject preflight from non-allowlisted origin. The browser surfaces
      // this as a CORS error in devtools rather than a generic network fail.
      ctx.status = 403;
      ctx.body = "";
      return;
    }
    ctx.set("Access-Control-Allow-Methods", ALLOW_METHODS.join(", "));
    ctx.set("Access-Control-Allow-Headers", ALLOW_HEADERS.join(", "));
    ctx.set("Access-Control-Max-Age", String(MAX_AGE));
    ctx.status = 204;
    return;
  }

  await next();
};
