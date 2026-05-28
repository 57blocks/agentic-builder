# `auth-password-rbac` — Username + Password + Role-Based Access Control

The **default / fallback** auth scaffold. Ships a self-contained email +
password login flow with `admin / operator / viewer` seed accounts and
JWT-based session middleware. Zero external dependencies — works offline,
ideal for internal back-office tools, multi-role observability dashboards,
and any project where the PRD is silent on the auth provider.

## L-tier specifics

- The backend uses **pino structured logging** (`logger.info` / `logger.error`)
  instead of `console.log`. The seed script keeps `console.log` for
  interactive CLI output.
- Redis is already present in the L-tier docker-compose — sessions are still
  stored in Postgres (the `sessions` table); add Redis-backed session store
  if you need horizontal scaling beyond the single-process default.

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
| `backend/src/models/Session.ts` | Sequelize model — `id`, `userId`, `expiresAt`, `lastActivityAt`. **No `token` column** by design (cryptographic verification via `AUTH_JWT_SECRET` keeps revocation working without the DB-leak liability). |
| `backend/src/workers/sessionCleanupWorker.ts` | Periodic sweep (default 1h) deleting expired `sessions` rows. Self-starts on first import — no edits to `backend/src/workers/index.ts` needed. Configure via `SESSION_CLEANUP_INTERVAL_MS` / `SESSION_CLEANUP_DISABLED`. |
| `backend/src/models/index.ts` | **Overwrites** base — wires `User` + `Session` into `syncModels`. |
| `backend/src/database/migrations/100-create-auth-users.ts` | DDL for `users` + `sessions` tables (snake_case columns, uuid PK, partial indexes). |
| `backend/src/scripts/seed-auth-users.ts` | Idempotent seeder — inserts admin / operator / viewer with bcrypt-hashed passwords from `.blueprint/auth-decision.json`. |
| `backend/src/utils/jwt.ts` | Sign / verify helpers around `AUTH_JWT_SECRET`. |

### Frontend

| Path | Purpose |
|------|---------|
| `frontend/src/views/LoginPage.tsx` | **Overwrites** base — email + password form, calls `POST /v1/auth/login` (via apiClient → `/api/v1/auth/login`), stores token in localStorage, redirects to `/`. |
| `frontend/src/api/auth-client.ts` | Typed wrappers: `loginWithPassword`, `getCurrentUser`, `logout`. Passes paths starting at `/v1/auth/*` — apiClient prepends `/api`. Do NOT pass `/api/...` here. |
| `frontend/src/components/auth/ProtectedRoute.tsx` | Route guard. `<ProtectedRoute role="admin">{...}</ProtectedRoute>` — redirects to `/login` if no token, to `/forbidden` if role mismatch. |
| `frontend/src/store/auth-store.ts` | Tiny zustand store holding `{ user, token, login(), logout() }`. Auto-hydrates from localStorage on first render. |

## Deps appended (via manifest)

- `backend`: `bcryptjs ^2.4.3`, `jsonwebtoken ^9.0.2`, `@types/bcryptjs ^2.4.6`, `@types/jsonwebtoken ^9.0.5`
- `frontend`: `zustand ^4.5.0`

## Hard rules for workers (READ THIS FIRST)

1. **Backend mounts apiRouter at `/api/v1` (NOT `/api`).** The base
   scaffold's `api/modules/index.ts` is OVERWRITTEN here. Sub-routers
   register paths WITHOUT a `/v1` segment — the `/api/v1` prefix is
   applied once at the root.

2. **Frontend paths start at `/v1/...` — apiClient prepends `/api`.**
   - In `auth-client.ts` / any `api/<module>.ts` wrapper: pass
     `apiClient.post("/v1/auth/login", ...)`.
   - In React components/views: never `fetch()` directly, always go
     through `auth-client.ts` or `apiClient`.
   - **Never** pass `/api/v1/...` to apiClient — that double-prepends
     and produces `/api/api/v1/...` → 404. This was the historic
     "double /api prefix" bug.

3. **`requireAuth` is a real Koa middleware (calls `next()`).** Chain it
   directly on routes:
   ```ts
   router.get("/users/me", requireAuth, getCurrentUser);
   router.get("/admin/audit", requireAuth, requireRole("admin"), listAudit);
   ```
   Putting `requireRole("admin")` BEFORE `requireAuth` will silently 403.

4. **Seed accounts have FIXED passwords for demo / E2E convenience.**
   (`Admin@2026`, `Operator@2026`, `Viewer@2026`). Change them in production.

5. **`AUTH_JWT_SECRET` is auto-generated by the Setup Wizard.** Never
   hard-code a secret in `jwt.ts`. Boot will refuse with a clear error
   when `NODE_ENV=production` and the secret is missing / shorter than
   32 chars (see `backend/src/config/env.ts#assertRequiredEnv`). The
   legacy `JWT_SECRET` name is still accepted with a deprecation warning.

6. **Sessions table is pruned automatically.** The
   `sessionCleanupWorker` removes rows whose `expires_at` is in the
   past every hour. Disable with `SESSION_CLEANUP_DISABLED=1` for
   one-shot scripts; tune cadence via `SESSION_CLEANUP_INTERVAL_MS`
   (minimum 60s).

## What the worker still has to wire up

1. Add `<ProtectedRoute>` around routes that need auth in `frontend/src/router.tsx`.
2. Add `requireAuth` + `requireRole(...)` to any module routes that need it.
3. Run `pnpm run seed:auth-users` after `pnpm run migrate` to populate the
   default accounts.
