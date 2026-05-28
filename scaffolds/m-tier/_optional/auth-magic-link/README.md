# `auth-magic-link` — Passwordless email magic-link auth

Modern, password-less auth flow. User submits email → backend emails a
one-time signed link → clicking the link logs them in. RBAC roles still
work (admin / operator / viewer); the magic-link just replaces the
password step.

## L-tier specifics

- The backend uses **pino structured logging** (`logger.info`) instead of
  `console.log`. The dev stub in `emailService.ts` logs the magic link as a
  structured JSON field (`text`) — use `pino-pretty` or `jq '.text'` to
  extract the URL when testing locally.
- Redis is already present in the L-tier docker-compose. Sessions are stored
  in Postgres (the `sessions` table); MagicLinkToken rows live in
  `magic_link_tokens`. Add Redis-backed storage if you need cross-process
  token invalidation at scale.

## Triggers

Applied when `.blueprint/auth-decision.json` has `mode: "magic-link"`. The
AuthDeciderAgent picks this mode when the PRD explicitly mentions
"passwordless / magic link / email OTP" OR describes a single-role
consumer app with no role differentiation.

## Files copied (when applied)

### Backend

| Path | Purpose |
|------|---------|
| `backend/src/api/modules/index.ts` | **Overwrites** base — mounts apiRouter at `/api/v1`. |
| `backend/src/api/modules/auth/auth.routes.ts` | **Overwrites** base — registers `POST /v1/auth/magic`, `GET /v1/auth/magic/verify`, `GET /v1/auth/me`, `POST /v1/auth/logout`. |
| `backend/src/api/modules/auth/auth-magic.controller.ts` | Request + verify magic link, return JWT on verify. |
| `backend/src/middlewares/requireAuth.ts` | JWT bearer-token middleware. |
| `backend/src/middlewares/requireRole.ts` | RBAC middleware factory. |
| `backend/src/models/User.ts` | Sequelize model — same as password-rbac but `passwordHash` is unused. |
| `backend/src/models/Session.ts` | Sequelize model. |
| `backend/src/models/MagicLinkToken.ts` | One-shot tokens with 15-minute TTL. |
| `backend/src/models/index.ts` | **Overwrites** base — registers User + Session + MagicLinkToken. |
| `backend/src/database/migrations/100-create-auth-magic.ts` | DDL for users + sessions + magic_link_tokens. |
| `backend/src/services/emailService.ts` | SMTP delivery; falls back to pino logger in dev when SMTP_* missing. |
| `backend/src/scripts/seed-auth-users.ts` | Pre-creates admin / operator / viewer rows (no password). |
| `backend/src/utils/jwt.ts` | Sign / verify helpers. |

### Frontend

| Path | Purpose |
|------|---------|
| `frontend/src/views/LoginPage.tsx` | **Overwrites** base — email-only form, calls `POST /api/v1/auth/magic`. |
| `frontend/src/views/MagicLinkCallbackPage.tsx` | Handles `?token=...` URL — verifies token, stores session, redirects. |
| `frontend/src/views/UnauthorizedPage.tsx` | 403 placeholder rendered when `<ProtectedRoute>` rejects a request. Wire as `/unauthorized` in `router.tsx`. |
| `frontend/src/api/auth-client.ts` | `requestMagicLink`, `verifyMagicLink`, `getCurrentUser`, `logout`. `AuthUser` carries both `role` (RBAC) and `domainRole` (business persona). |
| `frontend/src/store/auth-store.ts` | zustand store wrapping the API. Prefer `useAuth()` over reading this directly so the `sessionRole` derivation stays in one place. |
| `frontend/src/components/auth/ProtectedRoute.tsx` | Route guard. Two independent gates: `role` (RBAC: `admin`/`operator`/`viewer`) AND `requiredDomainRole` (business persona). Admin RBAC role bypasses domainRole gates. Usable as a layout route (`<ProtectedRoute><Outlet /></ProtectedRoute>`). |
| `frontend/src/components/layout/PersonaShell.tsx` | Generic persona-scoped layout. `<PersonaShell persona="family" navItems={...} />` wraps its children in `<ProtectedRoute requiredDomainRole={persona}>` and renders sidebar + header + `<Outlet />`. **Replaces** hand-rolled `FamilyShell` / `TeacherShell` / `AdminShell` files. |
| `frontend/src/hooks/useAuth.ts` | Canonical auth hook. Exposes `{ user, token, isAuthenticated, sessionRole, requestLink, consumeToken, logout, refresh, ... }`. `sessionRole` prioritises `user.domainRole` over `user.role` so persona-aware UIs work without leaking the RBAC enum into business code. |

## Deps appended (via manifest)

- `backend`: `jsonwebtoken ^9.0.2`, `@types/jsonwebtoken ^9.0.5`, `nodemailer ^6.9.16`, `@types/nodemailer ^6.4.17`
- `frontend`: `zustand ^4.5.0`

## Hard rules for workers (READ THIS FIRST)

1. **API base is `/api/v1`** — same as password-rbac. Sub-routers register
   relative paths only.

2. **Magic-link tokens expire in 15 minutes** and are **single-use**.

3. **In dev (no SMTP_* env vars), `emailService` writes the link via pino
   logger** — look for `[emailService] SMTP disabled` in the log output and
   extract the magic link from the `text` field. **Never** swallow this in
   production — `emailService.send()` throws if SMTP is misconfigured AND
   `NODE_ENV !== "development"`.

4. **Seed accounts have NO passwords** — they exist only so that pre-known
   emails get the right role on first magic-link login.

5. **Frontend route for the callback is `/auth/magic/callback`.** Don't
   rename without updating `frontendBase()` in `auth-magic.controller.ts`.

6. **`sessions` table has NO `token` column.** The raw JWT is verified
   per-request via `AUTH_JWT_SECRET`; persisting it turns every DB
   backup into a session leak with no revocation benefit. Migration 100
   drops the column on upgrade if it existed previously. The model and
   controller must NOT pass `token` to `Session.create`.

7. **Persona vs RBAC are two ORTHOGONAL concepts.** `role` answers "what
   CRUD verbs can this user run". `domainRole` answers "which business
   persona's UI does this account live in" (family / teacher / student
   / coach / ...). Components MUST read persona via `useAuth().sessionRole`
   (which prioritises `domainRole`), NOT via `user.role`.

8. **One PersonaShell per persona — DO NOT hand-roll FamilyShell.tsx +
   TeacherShell.tsx + AdminShell.tsx + ...** The generic
   `<PersonaShell persona="family" navItems={...} />` covers every
   persona surface. Three near-identical shell files always drift and
   forget to gate on `domainRole` — that's the F-10 / F-13 / F-15
   outage class.

## What the worker still has to wire up

1. Add `<Route path="/auth/magic/callback" element={<MagicLinkCallbackPage />} />`
   in `frontend/src/router.tsx`.
2. Mount persona-scoped routes under `<PersonaShell persona="..." navItems={...} />`
   (which internally wraps in `<ProtectedRoute requiredDomainRole="...">`).
   Mount RBAC-scoped admin routes under `<ProtectedRoute role="admin" />`.
3. Add a `/unauthorized` route rendering the shipped `<UnauthorizedPage />`
   (or restyle it to match the project's design system).
4. Set `SMTP_HOST` etc. in `backend/.env` for real email delivery.
5. Run `pnpm run seed:auth-users` to create the role-mapped admin emails
   with their `domainRole` from `.blueprint/auth-decision.json`.
