# `auth-magic-link` — Passwordless email magic-link auth

Modern, password-less auth flow. User submits email → backend emails a
one-time signed link → clicking the link logs them in. RBAC roles still
work (admin / operator / viewer); the magic-link just replaces the
password step.

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
| `backend/src/services/emailService.ts` | SMTP delivery; falls back to stdout logging in dev when SMTP_* missing. |
| `backend/src/scripts/seed-auth-users.ts` | Pre-creates admin / operator / viewer rows (no password) so first magic-link can be issued to known emails. |
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

2. **Magic-link tokens expire in 15 minutes** and are **single-use**. The
   `MagicLinkToken` row is deleted on successful `verify`. If the same
   token is replayed, verify returns 401.

3. **In dev (no SMTP_* env vars), `emailService` writes the link to stdout**
   instead of sending email. Look for `[emailService] Magic link for X:` in
   the backend log when testing locally. **Never** swallow this in
   production — `emailService.send()` throws if SMTP is misconfigured AND
   `NODE_ENV !== "development"`.

4. **Seed accounts have NO passwords** — they exist only so that pre-known
   emails (admin@example.com / operator@example.com / viewer@example.com)
   get the right role on first magic-link login. Workers can extend with
   email-domain → role mapping if PRD calls for it.

5. **Frontend route for the callback is `/auth/magic/callback`.** Don't
   rename without updating the backend's `MAGIC_LINK_REDIRECT_URL`
   construction in `auth-magic.controller.ts`.

## What the worker still has to wire up

1. Add `<Route path="/auth/magic/callback" element={<MagicLinkCallbackPage />} />`
   in `frontend/src/router.tsx`.
2. Add `<ProtectedRoute>` around routes that need auth.
3. Set `SMTP_HOST` etc. in `backend/.env` for real email delivery (or
   leave blank in dev to use stdout logging).
4. Run `pnpm run seed:auth-users` to create the role-mapped admin emails.

## When NOT applied

The base scaffold has no magic-link flow. Workers would have to implement
all of: token model, email service, callback page, JWT signing — that's
what made magic-link a top-2 failure mode in earlier runs.
