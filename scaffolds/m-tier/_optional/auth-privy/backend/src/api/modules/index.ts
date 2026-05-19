/**
 * Overwritten by `_optional/auth-privy` scaffold.
 *
 * Mounts the apiRouter at `/api/v1` (not just `/api`) so the contract paths
 * declared in `.blueprint/API_CONTRACTS.json` (`/api/v1/auth/me`, etc.)
 * resolve without each sub-router needing to repeat a `/v1` prefix.
 *
 * Workers register additional modules by importing their `register*Routes`
 * function here and calling it on `apiRouter`. Sub-routers MUST mount on
 * relative paths only — the `/api/v1` prefix is applied once at the root.
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
