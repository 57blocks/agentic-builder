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
| `backend/src/api/modules/index.ts` | **Overwrites** base — mounts `apiRouter` at `/api/v1` (NOT `/api`) so `/v1/auth/*` paths in API_CONTRACTS resolve correctly. Pre-wires `registerAdminAliasesRoutes(apiRouter)` so the admin-aliases module is mounted for free. |
| `backend/src/api/modules/auth/auth.routes.ts` | **Overwrites** base — registers `POST /v1/auth/login`, `GET /v1/auth/me`, `POST /v1/auth/logout`. |
| `backend/src/api/modules/admin-aliases/admin-aliases.routes.ts` | Stable `/admin/<resource>` alias router (admin RBAC enforced). Empty body by default — worker fills in one handler per `/admin/*` frontend call. The `admin-route-coverage` self-heal lint flags any frontend call that lacks a matching alias here. |
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
| `frontend/src/views/UnauthorizedPage.tsx` | 403 placeholder rendered when `<ProtectedRoute>` rejects a request. Wire as `/unauthorized` in `router.tsx`. |
| `frontend/src/api/auth-client.ts` | Typed wrappers: `loginWithPassword`, `getCurrentUser`, `logout`. Passes paths starting at `/v1/auth/*` — apiClient prepends `/api`. Do NOT pass `/api/...` here. `AuthUser` carries both `role` (RBAC) and `domainRole` (business persona). |
| `frontend/src/components/auth/ProtectedRoute.tsx` | Route guard. Two independent gates: `role` (RBAC: `admin`/`operator`/`viewer`) AND `requiredDomainRole` (business persona). Admin RBAC role bypasses domainRole gates. Usable as a layout route (`<ProtectedRoute><Outlet /></ProtectedRoute>`). |
| `frontend/src/components/layout/PersonaShell.tsx` | Generic persona-scoped layout. `<PersonaShell persona="family" navItems={...} />` wraps its children in `<ProtectedRoute requiredDomainRole={persona}>` and renders sidebar + header + `<Outlet />`. **Replaces** hand-rolled `FamilyShell` / `TeacherShell` / `AdminShell` files. |
| `frontend/src/hooks/useAuth.ts` | Canonical auth hook. Exposes `{ user, token, isAuthenticated, sessionRole, login, logout, refresh, ... }`. `sessionRole` prioritises `user.domainRole` over `user.role` so persona-aware UIs work without leaking the RBAC enum into business code. |
| `frontend/src/store/auth-store.ts` | Tiny zustand store holding `{ user, token, login(), logout() }`. Auto-hydrates from localStorage on first render. Prefer `useAuth()` over reading the store directly so the `sessionRole` derivation stays in one place. |

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

7. **Persona vs RBAC are two ORTHOGONAL concepts.** `role` answers "what
   CRUD verbs can this user run" (admin = god, operator = write, viewer =
   read). `domainRole` answers "which business persona's UI does this
   account live in" (family, teacher, student, coach, ...). A single
   account CAN have both — e.g. a "family head" might be
   `role=operator, domainRole=family`. Components MUST read persona via
   `useAuth().sessionRole` (which prioritises `domainRole`), NOT via
   `user.role`.

8. **Admin-flavoured frontend calls hit `/admin/<resource>` — register
   them in `admin-aliases.routes.ts`.** When `frontend/src/api/admin.ts`
   calls `apiClient.get("/admin/users")`, the backend MUST have a
   matching `router.get("/admin/users", ...)` row in
   `admin-aliases.routes.ts` (NOT in `users/users.routes.ts` — those
   are the domain primitives). This keeps admin URLs decoupled from
   module boundaries. The `admin-route-coverage` self-heal lint emits
   a repair task for any frontend `/admin/*` call without a matching
   backend alias.

9. **One PersonaShell per persona — DO NOT hand-roll FamilyShell.tsx +
   TeacherShell.tsx + AdminShell.tsx + ...** The generic
   `<PersonaShell persona="family" navItems={...} />` covers every
   persona surface. Three near-identical shell files always drift and
   forget to gate on `domainRole` — that's the F-10 / F-13 / F-15
   outage class.

## What the worker still has to wire up

1. In `frontend/src/router.tsx`, mount persona-scoped routes under
   `<PersonaShell persona="..." navItems={...} />` (which internally
   wraps in `<ProtectedRoute requiredDomainRole="...">`). Mount
   RBAC-scoped admin routes under `<ProtectedRoute role="admin" />`.
2. Add a `/unauthorized` route in `frontend/src/router.tsx` rendering
   the shipped `<UnauthorizedPage />` (or restyle it to match the
   project's design system).
3. Chain `requireAuth` + `requireRole(...)` on any module routes that
   need server-side enforcement (frontend gates are advisory only).
4. Run `pnpm run seed:auth-users` after `pnpm run migrate` to populate
   the default accounts (with `domainRole` from
   `.blueprint/auth-decision.json`).

### Wiring example (`router.tsx`)

```tsx
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { PersonaShell } from "./components/layout/PersonaShell";
import { UnauthorizedPage } from "./views/UnauthorizedPage";

const familyNav = [
  { to: "/family/dashboard", label: "Dashboard" },
  { to: "/family/lessons",   label: "Lessons" },
  { to: "/family/billing",   label: "Billing" },
];

const adminNav = [
  { to: "/admin/users",  label: "Users" },
  { to: "/admin/audit",  label: "Audit log" },
];

<Routes>
  <Route path="/login"        element={<LoginPage />} />
  <Route path="/unauthorized" element={<UnauthorizedPage />} />

  {/* Family persona shell — gates on domainRole === "family" */}
  <Route element={<PersonaShell persona="family" navItems={familyNav} />}>
    <Route path="/family/dashboard" element={<FamilyDashboardPage />} />
    <Route path="/family/lessons"   element={<FamilyLessonsPage />} />
    <Route path="/family/billing"   element={<FamilyBillingPage />} />
  </Route>

  {/* Admin shell — gates on RBAC role admin */}
  <Route
    element={
      <ProtectedRoute role="admin">
        <PersonaShell persona="admin" navItems={adminNav} requiredDomainRole={["admin", "family", "teacher"]} />
      </ProtectedRoute>
    }
  >
    <Route path="/admin/users" element={<AdminUsersPage />} />
    <Route path="/admin/audit" element={<AdminAuditPage />} />
  </Route>
</Routes>
```
