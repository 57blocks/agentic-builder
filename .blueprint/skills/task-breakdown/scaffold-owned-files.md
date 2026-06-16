---
id: scaffold-owned-files
agent: task-breakdown
version: v2
description: When an auth scaffold (password-rbac / magic-link) is selected, the task list MUST NOT recreate scaffold-owned files, MUST keep exactly ONE auth page (the shipped LoginPage.tsx at /login — never a parallel AuthPage / /auth route), MUST use the generic PersonaShell + ProtectedRoute(requiredDomainRole), and MUST register every /admin/* route in the shipped admin-aliases.routes.ts (not in a parallel modules/admin/* tree).
priority: 85
excludes: []
trigger:
  type: regex
  match: both
  any_of:
    - "password-rbac"
    - "magic-link"
    - "auth-password-rbac"
    - "auth-magic-link"
    - "ProtectedRoute"
    - "PersonaShell"
    - "useAuth"
    - "auth-decision"
    - "RBAC"
    - "role-based"
    - "/admin/"
    - "/admin "
    - "domainRole"
    - "domain role"
    - "persona"
    - "family"
    - "teacher"
    - "student"
    - "operator"
    - "viewer"
---

# Auth-scaffold ownership hard rules

The `_optional/auth-password-rbac` (or `_optional/auth-magic-link`) scaffold is
applied at kickoff time, BEFORE task implementation runs. It already ships a
full vertical slice of auth infrastructure — User/Session models, login flow,
JWT middleware, frontend route guard, persona shell, admin alias router. The
scaffold is the **single source of truth** for these files. Every task you
emit either reuses them as-is or `modifies` them in place — **never** lists
them under `creates`.

The 4 outage classes these rules prevent (each shipped at least once before):

- **F-04**: a task recreated `models/User.ts` from scratch and dropped the
  `domainRole` column the scaffold added → seed accounts couldn't store
  persona, persona-gated pages 403'd for everyone.
- **F-07**: a task created `frontend/src/store/authStore.ts` (no hyphen)
  beside the scaffold's `auth-store.ts` (hyphen) → two zustand stores ran in
  parallel, token drifted, every API call returned 401.
- **F-09**: admin routes were scattered across `modules/admin/users.routes.ts`,
  `modules/admin/courses.routes.ts`, etc. → frontend `apiClient.get("/admin/X")`
  literal didn't match any file's route → 404 cascade.
- **F-10 / F-13 / F-15**: hand-rolled `FamilyShell.tsx + TeacherShell.tsx +
  AdminShell.tsx` → three near-identical files drifted, two forgot the
  `requiredDomainRole` gate → wrong-persona accounts saw private pages.

## Hard rule 1 — Do NOT `create` any scaffold-owned file

When the project uses `auth-password-rbac`, the following files **already
exist** in the repository before the first task runs. They MUST NOT appear
in any task's `files.creates`. If a task needs to extend them, list them
under `files.modifies` instead.

```
backend/src/api/modules/auth/auth.routes.ts
backend/src/api/modules/auth/auth-password.controller.ts
backend/src/api/modules/index.ts
backend/src/api/modules/admin-aliases/admin-aliases.routes.ts
backend/src/middlewares/requireAuth.ts
backend/src/middlewares/requireRole.ts
backend/src/models/User.ts
backend/src/models/Session.ts
backend/src/models/index.ts
backend/src/scripts/seed-auth-users.ts
backend/src/utils/jwt.ts
backend/src/workers/sessionCleanupWorker.ts
frontend/src/api/auth-client.ts
frontend/src/components/auth/ProtectedRoute.tsx
frontend/src/components/layout/PersonaShell.tsx
frontend/src/hooks/useAuth.ts
frontend/src/store/auth-store.ts
frontend/src/views/LoginPage.tsx
frontend/src/views/UnauthorizedPage.tsx
```

When the project uses `auth-magic-link`, swap `auth-password.controller.ts`
for `auth-magic.controller.ts`, add `models/MagicLinkToken.ts`,
`views/MagicLinkCallbackPage.tsx`, and `services/emailService.ts`. The
remaining shared list stays identical.

### Naming-collision check

The scaffold uses kebab-case (`auth-store.ts`, `auth-client.ts`) and `.ts`
(not `.tsx`) for non-JSX files. Do NOT introduce a parallel `authStore.ts` /
`useAuth.tsx` — they will sit alongside the scaffold's files and produce
two stores / two hooks. Always use the EXACT scaffold filename when the
intent is to extend.

### When you DO need to extend

Use `files.modifies` (or `files.references` when read-only), and the task
description MUST quote which scaffold file is being touched and why:

```
T-NNN: Add MFA challenge step to existing auth flow
modifies:
  - backend/src/api/modules/auth/auth-password.controller.ts
  - backend/src/middlewares/requireAuth.ts
```

## Hard rule 2 — Schema lives on the models, NOT in migrations

This project has NO migrations. The Sequelize models are the single source of
truth — `syncModels()` runs `sequelize.sync()` on boot and CREATEs every table
from the model definitions. So:

- Do NOT plan a `backend/src/database/migrations/` directory or any migration
  files. A task that "adds a column" just `modifies` the model under
  `backend/src/models/`.
- Declare secondary indexes (`indexes: [{ fields: ["..."] }]` in `init()`
  options) and foreign keys (`references` + `onDelete` on the column) ON THE
  MODEL — `sync()` only creates what the model declares.

## Hard rule 3 — Persona pages MUST use `PersonaShell`, not hand-rolled shells

For every business persona the PRD mentions (family / teacher / student /
coach / parent / admin / ...), persona-scoped pages mount under a SINGLE
generic shell:

```tsx
// router.tsx
<Route element={<PersonaShell persona="family" navItems={familyNav} />}>
  <Route path="/family/dashboard" element={<FamilyDashboardPage />} />
  <Route path="/family/lessons"   element={<FamilyLessonsPage />} />
</Route>

<Route element={<PersonaShell persona="teacher" navItems={teacherNav} />}>
  <Route path="/teacher/dashboard" element={<TeacherDashboardPage />} />
</Route>
```

`PersonaShell` internally wraps in `<ProtectedRoute
requiredDomainRole={[persona]}>` so the persona gate is automatic — admin
RBAC role bypasses it by convention.

### What NEVER to plan

- ❌ `components/layout/FamilyShell.tsx` (or `TeacherShell.tsx`,
  `AdminShell.tsx`, `StudentShell.tsx`, `<Persona>Shell.tsx` in any form)
- ❌ A new `components/auth/RoleGuard.tsx` — `ProtectedRoute` already does
  both RBAC `role` AND persona `requiredDomainRole`. Two guards diverge.
- ❌ Re-implementing `useAuth` / `useAuthStore` in a task — the scaffold's
  `hooks/useAuth.ts` already exposes `sessionRole` derived correctly
  (prioritises `domainRole` over the RBAC `role`).

### What IS expected per persona

For each persona surface, the task list should contain:

1. The persona's **page** tasks (creates `views/<Persona><Page>.tsx` files).
2. **Optional** sub-components under `components/<persona>/` (cards,
   modals, tables specific to that persona).
3. **NO** shell / layout / guard files — those are scaffold-provided.
4. The wiring task (single `modifies frontend/src/router.tsx` task that
   adds every persona's `<PersonaShell>` route block at once).

## Hard rule 4 — `/admin/*` routes go in `admin-aliases.routes.ts`

Every backend path the frontend hits as `apiClient.<method>("/admin/<X>")`
MUST be registered inside the scaffold-shipped file
`backend/src/api/modules/admin-aliases/admin-aliases.routes.ts`. That file
already exists with an empty body and is pre-wired into the API router.
The implementing worker fills in the body — they do NOT touch
`api/modules/index.ts`, do NOT create `api/modules/admin/`, and do NOT
add a new `registerXxxRoutes()` call site.

### What NEVER to plan

- ❌ `backend/src/api/modules/admin/users.routes.ts`
- ❌ `backend/src/api/modules/admin/courses.routes.ts`
- ❌ `backend/src/api/modules/admin/<anything>.routes.ts`
- ❌ Adding `registerAdminRoutes(apiRouter)` to `modules/index.ts`

### What IS expected

ONE task whose `modifies` list contains `admin-aliases.routes.ts` and
whose description enumerates every `/admin/<resource>` path the frontend
calls. Handlers may delegate to domain controllers (e.g.
`import { listUsers } from "../users/users.controller"; router.get(
"/admin/users", requireAuth, requireRole("admin"), listUsers);`). The
handlers themselves can be split into separate tasks if needed (one per
controller), but the ROUTE FILE stays single.

Coupling note: `requireAuth` MUST chain BEFORE `requireRole` — the
opposite order silently 403s.

## Hard rule 5 — Always emit the auth-decision seed accounts

`.blueprint/auth-decision.json#seedAccounts[]` lists every account
`seed-auth-users.ts` will upsert at boot. Each entry can carry an optional
`domainRole` (business persona). When the PRD mentions multiple personas
(family / teacher / student / ...) the project SHOULD have at least ONE
seed account per persona so E2E and manual QA can verify the persona
gates. The scaffold already supports this — no model / script changes
needed. The task list MUST NOT create a new seed script or overwrite
`seed-auth-users.ts`.

## Hard rule 6 — Exactly ONE auth page, mounted at `/login`

The scaffold ships `frontend/src/views/LoginPage.tsx` mounted at `/login`, and
`ProtectedRoute` redirects unauthenticated users to `/login`. ALL sign-in,
registration, email-verification, onboarding and role-selection UI belongs in
`LoginPage.tsx` on the `/login` route. Hard rule 1 already forbids *recreating*
`LoginPage.tsx`; this rule additionally forbids standing up a SECOND auth
surface beside it.

### What NEVER to plan

- ❌ A new `frontend/src/views/AuthPage.tsx` (or a separate `SignInPage` /
  `SignupPage` / `OnboardingPage` used as the *primary auth surface*). It
  competes with the scaffold's `LoginPage`: `ProtectedRoute` keeps sending
  users to `/login` while `/` redirects to the new page, so the two drift and
  half the app redirect-loops / 401s. (Shipped at least once: `LoginPage` at
  `/login` AND `AuthPage` at `/auth` in the same build — two login screens, one
  dead.)
- ❌ An `/auth` route (or any second login route) in `router.tsx`.

### What IS expected

- ONE task that lists `frontend/src/views/LoginPage.tsx` under `files.modifies`
  to extend/restyle the sign-in + registration + onboarding UI (keeping the
  `useAuthStore.login` call — the scaffold contract).
- The `/` root redirect and every post-logout / post-account-deletion redirect
  target `/login` (never `/auth`).
- In STEP 1 PAGE INVENTORY, fold a separate "Auth page" / "Onboarding page"
  that is really the same sign-in surface into the single `LoginPage` entry —
  count them as ONE page.

## Self-check before emitting tasks

Before returning the task array, run the following mental pass over your
draft:

1. Grep the candidate `files.creates` lists for any path in Hard rule 1's
   inventory. Every hit is a regression — convert to `modifies` or drop.
2. Grep candidate `creates` for `database/migrations/` or any migration
   file. There are no migrations (Hard rule 2) — drop every such file and
   fold its schema onto the relevant Sequelize model.
3. Grep candidate `creates` for `Shell.tsx` (case-insensitive). Every
   `<Persona>Shell.tsx` is a violation of Hard rule 3 — remove the file
   and ensure the wiring task uses `<PersonaShell persona="...">` instead.
4. Grep candidate `creates` for `modules/admin/`. Every match is a
   violation of Hard rule 4 — collapse all `/admin/*` routes into ONE
   `modifies backend/src/api/modules/admin-aliases/admin-aliases.routes.ts`
   task.
5. Confirm no task lists `RoleGuard.tsx` or `authStore.ts` (the
   no-hyphen variant) in its `creates`.
6. Grep candidate `creates` for `AuthPage` and `router.tsx` route definitions
   for an `/auth` path. Every match is a violation of Hard rule 6 — there is
   exactly one auth page (`LoginPage.tsx` at `/login`); fold the
   sign-in/registration/onboarding UI into it and drop the second route.

The downstream `coding` worker has NO knowledge of which files the
scaffold already wrote. If a task `creates` a scaffold-owned file, the
worker will overwrite it — every contract the scaffold guarantees is
forfeit, and the deterministic self-heal lints (e.g. admin-route-coverage)
will start firing for the wrong reasons.
