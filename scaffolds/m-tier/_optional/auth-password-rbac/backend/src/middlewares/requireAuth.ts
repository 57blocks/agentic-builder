/**
 * JWT bearer-token auth middleware.
 *
 * Reads `Authorization: Bearer <token>` (or `auth_token` cookie), verifies
 * the signature using `AUTH_JWT_SECRET`, and populates:
 *   - ctx.state.user      = { id, email?, role }
 *   - ctx.state.sessionId = the JWT's sessionId claim
 *
 * Throws 401 on missing / malformed / expired tokens. Calls `next()` on
 * success so it can be chained on routes:
 *
 *   router.get("/users/me", requireAuth, getCurrentUser);
 */

import type Koa from "koa";
import { Errors } from "./errorHandler";
import { verifyJwt } from "../utils/jwt";
import { Session } from "../models/Session";

export const requireAuth: Koa.Middleware = async (ctx, next) => {
  const token = extractToken(ctx);
  if (!token) throw Errors.Unauthorized("Missing bearer token");

  let payload: ReturnType<typeof verifyJwt>;
  try {
    payload = verifyJwt(token);
  } catch {
    throw Errors.Unauthorized("Invalid or expired token");
  }

  const sessionId =
    typeof payload.sessionId === "string" ? payload.sessionId : undefined;
  if (!sessionId) throw Errors.Unauthorized("Token missing sessionId claim");

  const session = await Session.findByPk(sessionId);
  if (!session) throw Errors.Unauthorized("Session revoked");
  if (session.expiresAt && session.expiresAt.getTime() < Date.now()) {
    throw Errors.Unauthorized("Session expired");
  }

  ctx.state.user = {
    id: String(payload.sub ?? ""),
    role: typeof payload.role === "string" ? payload.role : undefined,
  };
  ctx.state.sessionId = sessionId;

  // Best-effort heartbeat — don't block the request if it fails.
  try {
    session.lastActivityAt = new Date();
    await session.save();
  } catch {
    /* swallow */
  }

  await next();
};

function extractToken(ctx: Koa.Context): string | null {
  const header = ctx.headers["authorization"];
  if (typeof header === "string" && header.toLowerCase().startsWith("bearer ")) {
    return header.slice(7).trim();
  }
  const cookieToken = ctx.cookies.get("auth_token");
  return cookieToken && cookieToken.trim() ? cookieToken.trim() : null;
}
