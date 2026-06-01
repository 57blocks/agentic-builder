/**
 * Auth routes — password-rbac variant.
 *
 * Registered at the root apiRouter (which has prefix `/api/v1`). Final
 * resolved paths:
 *   POST /api/v1/auth/login
 *   GET  /api/v1/auth/me
 *   POST /api/v1/auth/logout
 *
 * Workers may add additional routes (refresh, password reset, …) but MUST
 * NOT remove the three above — the frontend `auth-client.ts` + `LoginPage`
 * assume they exist.
 */

import Router from "@koa/router";
import {
  loginWithPassword,
  getCurrentUser,
  logoutSession,
} from "./auth-password.controller";
import { requireAuth } from "../../../middlewares/requireAuth";

export function registerAuthRoutes(router: Router): void {
  router.post("/auth/login", loginWithPassword);
  router.get("/auth/me", requireAuth, getCurrentUser);
  router.post("/auth/logout", requireAuth, logoutSession);
}
