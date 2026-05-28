/**
 * RBAC middleware factory.
 *
 * Usage:
 *   router.get("/admin/audit", requireAuth, requireRole("admin"), listAudit);
 *
 * MUST be chained AFTER `requireAuth` — it reads `ctx.state.user.role` which
 * `requireAuth` populates from the verified JWT.
 *
 * Accepts a single role or an allow-list:
 *   requireRole("admin")
 *   requireRole("admin", "operator")
 */

import type Koa from "koa";
import { Errors } from "./errorHandler";

export function requireRole(...allowed: string[]): Koa.Middleware {
  if (allowed.length === 0) {
    throw new Error("requireRole called with no allowed roles");
  }
  const allowSet = new Set(allowed.map((r) => r.toLowerCase()));

  return async function requireRoleMiddleware(ctx, next) {
    const role = ctx.state.user?.role;
    if (typeof role !== "string") {
      throw Errors.Forbidden("Role missing on session");
    }
    if (!allowSet.has(role.toLowerCase())) {
      throw Errors.Forbidden(
        `Role "${role}" not allowed (need: ${[...allowSet].join("/")})`,
      );
    }
    await next();
  };
}
