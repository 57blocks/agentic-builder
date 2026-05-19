/**
 * Auth routes — magic-link variant.
 *
 * Registered at the root apiRouter (prefix `/api/v1`). Final paths:
 *   POST /api/v1/auth/magic          → request a magic link by email
 *   GET  /api/v1/auth/magic/verify   → consume the token, return JWT
 *   GET  /api/v1/auth/me             → current user (requires auth)
 *   POST /api/v1/auth/logout         → revoke session
 */

import Router from "@koa/router";
import {
  requestMagicLink,
  verifyMagicLink,
  getCurrentUser,
  logoutSession,
} from "./auth-magic.controller";
import { requireAuth } from "../../../middlewares/requireAuth";

export function registerAuthRoutes(router: Router): void {
  router.post("/auth/magic", requestMagicLink);
  router.get("/auth/magic/verify", verifyMagicLink);
  router.get("/auth/me", requireAuth, getCurrentUser);
  router.post("/auth/logout", requireAuth, logoutSession);
}
