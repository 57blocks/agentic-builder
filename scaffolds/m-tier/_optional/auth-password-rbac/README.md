# `auth-password-rbac` — Username + Password + Role-Based Access Control

The **default / fallback** auth scaffold. Ships a self-contained email +
password login flow with `admin / operator / viewer` seed accounts and
JWT-based session middleware. Zero external dependencies — works offline,
ideal for internal back-office tools, multi-role observability dashboards,
and any project where the PRD is silent on the auth provider.

## Triggers

The codegen pipeline copies this feature into the generated project when
`.blueprint/auth-decision.json` has `mode: "password-rbac"`. The AuthDeciderAgent
picks this mode when the PRD describes multiple roles (admin / operator /
viewer / staff) OR when no auth provider is named at all (safe default).

## Files copied (when applied)

### Backend

| Path | Purpose |
|------|---------|
| `backend/src/api/modules/index.ts` | **Overwrites** base — mounts `apiRouter` at `/api/v1` (NOT `/api`) so `/v1/auth/*` paths in API_CONTRACTS resolve correctly. |
| `backend/src/api/modules/auth/auth.routes.ts` | **Overwrites** base — registers `POST /v1/auth/login`, `GET /v1/auth/me`, `POST /v1/auth/logout`. |
| `backend/src/api/modules/auth/auth-password.controller.ts` | Email + password login (bcryptjs hash compare) and current-user / logout handlers. |
| `backend/src/middlewares/requireAuth.ts` | JWT-bearer middleware. Calls `next()` — safe to chain on routes. |
| `backend/src/middlewares/requireRole.ts` | RBAC middleware factory `requireRole("admin")`. Chain AFTER `requireAuth`. |
| `backend/src/models/User.ts` | Sequelize model — `id (uuid)`, `email`, `passwordHash`, `role`, `displayName`. |
| `backend/src/models/Session.ts` | Sequelize model — `id`, `userId`, `token`, `expiresAt`, `lastActivityAt`. |
| `backend/src/models/index.ts` | **Overwrites** base — wires `User` + `Session` into `syncModels`. |
| `backend/src/database/migrations/100-create-auth-users.ts` | DDL for `users` + `sessions` tables (snake_case columns, uuid PK, partial indexes). |
| `backend/src/scripts/seed-auth-users.ts` | Idempotent seeder — inserts admin / operator / viewer with bcrypt-hashed passwords from `.blueprint/auth-decision.json`. |
| `backend/src/utils/jwt.ts` | Sign / verify helpers around `AUTH_JWT_SECRET`. |

### Frontend

| Path | Purpose |
|------|---------|
| `frontend/src/views/LoginPage.tsx` | **Overwrites** base — email + password form, calls `POST /api/v1/auth/login`, stores token in localStorage, redirects to `/`. |
| `frontend/src/api/auth-client.ts` | Typed wrappers: `loginWithPassword`, `getCurrentUser`, `logout`. All paths use the canonical `/api/v1/auth/*` prefix. |
| `frontend/src/components/auth/ProtectedRoute.tsx` | Route guard. `<ProtectedRoute role="admin">{...}</ProtectedRoute>` — redirects to `/login` if no token, to `/forbidden` if role mismatch. |
| `frontend/src/store/auth-store.ts` | Tiny zustand store holding `{ user, token, login(), logout() }`. Auto-hydrates from localStorage on first render. |

## Deps appended (via manifest)

- `backend`: `bcryptjs ^2.4.3`, `jsonwebtoken ^9.0.2`, `@types/bcryptjs ^2.4.6`, `@types/jsonwebtoken ^9.0.5`
- `frontend`: `zustand ^4.5.0`

(Frontend reuses `axios` / `fetch` already present in the base scaffold.)

## Hard rules for workers (READ THIS FIRST)

These rules prevent the entire class of "login flow looks fine in the UI but
every authenticated route returns 404 / 500" failures observed in earlier
generator runs.

1. **API base path is `/api/v1` — NOT `/api`.** The base scaffold's
   `api/modules/index.ts` is OVERWRITTEN by this scaffold to mount the
   `apiRouter` at `/api/v1`. All sub-routers (`auth`, `coins`, `admin`, …)
   register paths WITHOUT a `/v1` segment — the prefix is applied once at
   the root. The contract path `/api/v1/auth/login` therefore lives in
   `auth.routes.ts` as simply `router.post("/auth/login", ...)`.

2. **Frontend MUST go through `auth-client.ts` / `apiClient`.** Never write
   `fetch("/v1/auth/login")` in a component — that omits the `/api` prefix
   and returns 404 in production. The `apiClient` in the base scaffold (or
   the `auth-client.ts` exports added by this scaffold) hard-code the full
   `/api/v1/...` prefix and accept relative endpoint names.

3. **`requireAuth` is a real Koa middleware (calls `next()`).** Chain it
   directly on routes:
   ```ts
   router.get("/users/me", requireAuth, getCurrentUser);
   router.get("/admin/audit", requireAuth, requireRole("admin"), listAudit);
   ```
   Putting `requireRole("admin")` BEFORE `requireAuth` will silently 403
   because `ctx.state.user` isn't populated yet.

4. **Seed accounts have FIXED passwords for demo / E2E convenience.** The
   passwords (`Admin@2026`, `Operator@2026`, `Viewer@2026`) are intentionally
   weak so:
   - E2E tests can hard-code them.
   - Demo videos / screenshots are reproducible.
   - The deploy `README` warns the operator to rotate them on first deploy.

   DO NOT randomise these in the seed script. The `.blueprint/auth-decision.json`
   is the single source of truth — if the user wants different defaults, they
   change them in the Wizard's "Advanced" section and the seed script reads
   the JSON.

5. **`AUTH_JWT_SECRET` is auto-generated by the Setup Wizard.** It is hex-
   random and lives in `.env`. Never hard-code a secret in `jwt.ts`. Verify
   helpers throw a typed error on a missing secret so boot-time issues
   surface immediately instead of silently signing with `"undefined"`.

## What the worker still has to wire up

After these files land, the remaining work is minimal:

1. Add `<ProtectedRoute>` around routes that need auth in `frontend/src/router.tsx`.
2. Add `requireAuth` + `requireRole(...)` to any module routes that need it.
3. Run `pnpm run seed:auth-users` after `pnpm run migrate` to populate the
   default accounts.

## When NOT applied

The base scaffold ships with a no-op `/auth/me` stub that returns 401. No
DB tables for users exist. The frontend has no login flow. The project is
fundamentally not usable until SOME auth scaffold is applied — that's why
the Wizard makes this Phase 0 and selects password-rbac by default.
