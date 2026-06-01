/**
 * Overwritten by `_optional/auth-magic-link` scaffold.
 *
 * Mounts the apiRouter at `/api/v1` (not just `/api`) so the contract paths
 * declared in `.blueprint/API_CONTRACTS.json` resolve without each sub-router
 * needing to repeat a `/v1` prefix.
 *
 * Workers register additional modules by importing their `register*Routes`
 * function here and calling it on `apiRouter`. Every register function MUST
 * mount its sub-router on relative paths only (e.g. `router.get("/coins", ...)`)
 * — the `/api/v1` prefix is applied once at the root.
 */

import Router from "@koa/router";
import { registerHealthRoutes } from "./health/health.routes";
import { registerAuthRoutes } from "./auth/auth.routes";

export function createApiRouter(): Router {
  const apiRouter = new Router({ prefix: "/api/v1" });

  registerHealthRoutes(apiRouter);
  registerAuthRoutes(apiRouter);

  return apiRouter;
}
