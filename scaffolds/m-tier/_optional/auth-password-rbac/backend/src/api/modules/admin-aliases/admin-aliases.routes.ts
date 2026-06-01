/**
 * Admin alias router.
 *
 * Purpose: keep `frontend/src/api/admin.ts` (and any other frontend
 * caller that hits `/admin/<resource>`) one URL change away from any
 * backend module reshuffle. Every admin-flavoured frontend call gets a
 * stable `/v1/admin/<resource>` mount here that delegates to whichever
 * domain controller actually owns the resource.
 *
 * The `admin-route-coverage` self-heal lint scans `frontend/src/**`
 * for `apiClient.<method>("/admin/...")` calls and emits a repair task
 * for any path NOT registered in this file — that's the contract the
 * worker has to keep green.
 *
 * Worker contract:
 *   1. For every `/admin/<resource>` path the frontend calls, add a
 *      handler row below that delegates to the matching domain
 *      controller (or implements it inline if no controller exists yet).
 *   2. Chain `requireAuth, requireRole("admin")` on every handler.
 *      ALL admin-aliases require admin RBAC, no exceptions. Putting
 *      `requireRole` BEFORE `requireAuth` silently 403s.
 *   3. This file is mounted by `api/modules/index.ts` via the
 *      `registerAdminAliasesRoutes(apiRouter)` call already wired
 *      there — if you add resources, just extend the body of this
 *      function. Don't touch the call site.
 *   4. Path strings MUST include the literal `/admin/` prefix here
 *      (NOT only on the frontend) — the lint matches on substring.
 */

import Router from "@koa/router";
import { requireAuth } from "../../../middlewares/requireAuth";
import { requireRole } from "../../../middlewares/requireRole";

// Import your domain controllers here, e.g.
//   import { listUsers, getUserById } from "../users/users.controller";
//   import { listAuditEntries } from "../audit/audit.controller";

export function registerAdminAliasesRoutes(router: Router): void {
  // Example rows — REPLACE with real aliases derived from the frontend
  // calls. Once you've added at least one real alias, delete the demo
  // block below so it doesn't shadow your handler with a 404.
  //
  // router.get(
  //   "/admin/users",
  //   requireAuth,
  //   requireRole("admin"),
  //   listUsers,
  // );
  // router.get(
  //   "/admin/users/:id",
  //   requireAuth,
  //   requireRole("admin"),
  //   getUserById,
  // );
  // router.get(
  //   "/admin/audit",
  //   requireAuth,
  //   requireRole("admin"),
  //   listAuditEntries,
  // );

  // Suppress "unused parameter" lint until real handlers land.
  void router;
}
