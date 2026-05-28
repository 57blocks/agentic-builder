/**
 * Overwritten by `_optional/auth-password-rbac` scaffold.
 *
 * Mounts the apiRouter at `/api/v1` (not just `/api`) so the contract paths
 * declared in `.blueprint/API_CONTRACTS.json` (`/api/v1/auth/login`, etc.)
 * resolve without each sub-router needing to repeat a `/v1` prefix.
 *
 * Workers register additional modules by importing their `register*Routes`
 * function here and calling it on `apiRouter`. Every register function MUST
 * mount its sub-router on relative paths only (e.g. `router.get("/coins", ...)`)
 * — the `/api/v1` prefix is applied once at the root.
 *
 * Side-effect imports below: scaffold owns background workers that must
 * run for the auth subsystem to stay healthy (e.g. pruning expired
 * sessions). They self-register on first import via `setInterval` with
 * `.unref()` — see each file's header for activation rules.
 */

import Router from "@koa/router";
import { registerHealthRoutes } from "./health/health.routes";
import { registerAuthRoutes } from "./auth/auth.routes";
// Admin alias router — provides stable `/admin/<resource>` URLs the
// frontend's `admin.ts` callers can hit regardless of how the backend
// modules are organised. Wired here so every project gets the mount
// point for free; handlers are added inside admin-aliases.routes.ts on
// demand (and the `admin-route-coverage` self-heal lint flags any
// missing alias).
import { registerAdminAliasesRoutes } from "./admin-aliases/admin-aliases.routes";
import "../../workers/sessionCleanupWorker";

export function createApiRouter(): Router {
  const apiRouter = new Router({ prefix: "/api/v1" });

  registerHealthRoutes(apiRouter);
  registerAuthRoutes(apiRouter);
  registerAdminAliasesRoutes(apiRouter);

  return apiRouter;
}
