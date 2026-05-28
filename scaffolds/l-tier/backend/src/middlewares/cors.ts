import type Koa from "koa";

/**
 * CORS middleware.
 *
 * Origin policy:
 *   - `CORS_ORIGINS`: comma-separated allowlist of trusted origins
 *     (e.g. `https://app.example.com,https://admin.example.com`).
 *     Used verbatim; entry must exactly match `ctx.get("Origin")` —
 *     scheme + host + port.
 *   - `FRONTEND_URL`: legacy single-origin variable. Still honored as
 *     a fallback when `CORS_ORIGINS` is unset.
 *   - dev fallback: `http://localhost:5173` (Vite default) — only
 *     applied when `NODE_ENV !== "production"`.
 *
 * Reflection rules:
 *   - When the request `Origin` matches the allowlist, that exact value
 *     is reflected in `Access-Control-Allow-Origin`. We never reflect
 *     untrusted values, never wildcard with `credentials: true`.
 *   - When the request has no `Origin` header (same-origin / curl /
 *     server-side fetch), the middleware doesn't set CORS headers at
 *     all — the request is allowed unconditionally.
 *
 * Boot-time enforcement: `config/env.ts#assertRequiredEnv` fatal-exits
 * in production when neither `CORS_ORIGINS` nor `FRONTEND_URL` is set.
 */

const DEV_FALLBACK_ORIGIN = "http://localhost:5173";

const ALLOW_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];
const ALLOW_HEADERS = ["Content-Type", "Authorization", "Accept"];
const EXPOSE_HEADERS = ["Content-Length", "Date"];
const MAX_AGE_SECONDS = 86_400;

function loadAllowlist(): readonly string[] {
  const csv =
    process.env.CORS_ORIGINS ??
    process.env.FRONTEND_URL ??
    "";
  const fromEnv = csv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (fromEnv.length > 0) return Object.freeze(fromEnv);

  if (process.env.NODE_ENV !== "production") {
    return Object.freeze([DEV_FALLBACK_ORIGIN]);
  }

  // Production with no allowlist — `assertRequiredEnv` should have
  // already process-exited; if it didn't (e.g. someone short-circuited
  // it), return an empty allowlist so we reject every cross-origin
  // request instead of leaking a default.
  return Object.freeze([]);
}

const ALLOWLIST = loadAllowlist();

function isAllowed(origin: string): boolean {
  return ALLOWLIST.includes(origin);
}

export const corsMiddleware: Koa.Middleware = async (ctx, next) => {
  const origin = ctx.get("Origin");

  if (origin && isAllowed(origin)) {
    ctx.set("Access-Control-Allow-Origin", origin);
    ctx.set("Access-Control-Allow-Credentials", "true");
    ctx.set("Vary", "Origin");
  }

  if (ctx.method === "OPTIONS") {
    // Preflight — answer immediately regardless of whether `next()` would
    // succeed, but ONLY echo allow headers when the origin is trusted.
    if (origin && isAllowed(origin)) {
      ctx.set("Access-Control-Allow-Methods", ALLOW_METHODS.join(", "));
      ctx.set("Access-Control-Allow-Headers", ALLOW_HEADERS.join(", "));
      ctx.set("Access-Control-Max-Age", String(MAX_AGE_SECONDS));
      ctx.set("Access-Control-Expose-Headers", EXPOSE_HEADERS.join(", "));
      ctx.status = 204;
    } else {
      ctx.status = 403;
      ctx.body = "";
    }
    return;
  }

  if (origin && isAllowed(origin)) {
    ctx.set("Access-Control-Expose-Headers", EXPOSE_HEADERS.join(", "));
  }

  await next();
};
