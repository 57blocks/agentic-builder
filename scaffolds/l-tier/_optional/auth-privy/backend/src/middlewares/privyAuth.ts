import type { Middleware } from "koa";
import { getPrivyClient } from "../privy/client";
import { User } from "../models";

export interface PrivyVerifiedClaims {
  user_id: string;
  session_id: string;
  app_id: string;
  issuer: string;
  issued_at: number;
  expiration: number;
}

function getBearerToken(headerValue: string | undefined): string | null {
  if (!headerValue) return null;
  const m = headerValue.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

/**
 * Verifies the inbound Privy access token (Bearer header or `privy-token`
 * cookie) and populates `ctx.state.user` / `ctx.state.privy`. NEVER throws —
 * unauthenticated requests just continue with `ctx.state.user === undefined`,
 * letting downstream guards decide.
 */
export const privyAuthMiddleware: Middleware = async (ctx, next) => {
  const token =
    getBearerToken(ctx.headers.authorization) ?? ctx.cookies.get("privy-token");
  if (!token) return next();

  try {
    const privy = getPrivyClient();
    const claims = (await privy
      .utils()
      .auth()
      .verifyAccessToken(token)) as unknown as PrivyVerifiedClaims;

    ctx.state.user = { id: claims.user_id };
    ctx.state.privy = claims;
  } catch {
    // Leave ctx.state.user undefined — guards below will surface 401.
    ctx.state.user = undefined;
    ctx.state.privy = undefined;
  }

  return next();
};

/**
 * Phantom brand that makes {@link requirePrivyAuth} structurally INCOMPATIBLE
 * with `Koa.Middleware`. The optional second parameter is never supplied at a
 * call site — its only job is to turn `router.get(path, requirePrivyAuth)`
 * into a COMPILE error: Koa's `Next` is not assignable to `AssertionGuardOnly`,
 * so the type checker rejects mounting the guard as middleware. This converts
 * the old silent-404 runtime bug (the #1 "OAuth succeeds but every /api/* 404s"
 * cause) into a type error the worker cannot ship. See the `auth-guard-as-
 * middleware` rule in runtime-integration-audit.ts — this type is the primary
 * guard; that lint is now only a backstop for hand-written code.
 */
declare const ASSERTION_GUARD_ONLY: unique symbol;
type AssertionGuardOnly = { readonly [ASSERTION_GUARD_ONLY]: true };

/**
 * Assertion guard. Call from inside a handler to assert that a verified
 * Privy session is on the context. Throws 401 otherwise. Returns the claims
 * for convenience.
 *
 * IMPORTANT: This is NOT a Koa middleware. Passing it to
 * `router.get(path, requirePrivyAuth, handler)` is now a COMPILE error (see
 * `AssertionGuardOnly` above) — it has no `next()` call and would leave the
 * chain stalled (the request silently 404s once Koa fails to find a downstream
 * responder). Use `requirePrivyAuthMiddleware` to mount on a route; call
 * `requirePrivyAuth(ctx)` directly to assert auth from inside a handler body.
 */
export function requirePrivyAuth(
  ctx: Parameters<Middleware>[0],
  // Phantom — never passed. Forces a type error if used as Koa middleware.
  _assertionGuardOnly?: AssertionGuardOnly,
): PrivyVerifiedClaims {
  if (!ctx.state.user || !ctx.state.privy) {
    ctx.throw(401, "Not authenticated");
  }
  return ctx.state.privy as PrivyVerifiedClaims;
}

/**
 * Koa middleware that asserts a verified Privy session and yields to the
 * next handler. Use this in route definitions:
 *
 *     router.get("/users/me", requirePrivyAuthMiddleware, handler);
 */
export const requirePrivyAuthMiddleware: Middleware = async (ctx, next) => {
  requirePrivyAuth(ctx);
  await next();
};

/**
 * Resolve the DB user row for the verified Privy session. If the row is
 * missing (first authenticated request after OAuth, before any explicit
 * `/auth/verify` call), a minimal record is created on the fly so
 * downstream handlers never surface a 404 "User not found" for a
 * legitimately authenticated session.
 *
 * RULE OF THUMB: Any handler whose only auth dependency is "I need the
 * DB user row" should call this helper instead of doing
 * `User.findOne + ctx.throw(404)`. The 404 path was the #1 cause of
 * "OAuth succeeds but every subsequent /api/* call returns 404" in the
 * previous generator runs.
 */
export async function resolveOrCreateDbUser(
  ctx: Parameters<Middleware>[0],
): Promise<InstanceType<typeof User>> {
  requirePrivyAuth(ctx);
  const privyId = ctx.state.user?.id;
  if (!privyId) {
    ctx.throw(401, "Not authenticated");
  }

  let user = await User.findOne({ where: { privy_id: privyId } });
  if (!user) {
    user = await User.create({ privy_id: privyId });
  }
  return user;
}
