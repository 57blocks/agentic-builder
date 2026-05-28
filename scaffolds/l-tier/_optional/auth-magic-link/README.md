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
| `frontend/src/api/auth-client.ts` | `requestMagicLink`, `verifyMagicLink`, `getCurrentUser`, `logout`. |
| `frontend/src/store/auth-store.ts` | zustand store wrapping the API. |
| `frontend/src/components/auth/ProtectedRoute.tsx` | Same as password-rbac. |

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

## What the worker still has to wire up

1. Add `<Route path="/auth/magic/callback" element={<MagicLinkCallbackPage />} />`
   in `frontend/src/router.tsx`.
2. Add `<ProtectedRoute>` around routes that need auth.
3. Set `SMTP_HOST` etc. in `backend/.env` for real email delivery.
4. Run `pnpm run seed:auth-users` to create the role-mapped admin emails.
