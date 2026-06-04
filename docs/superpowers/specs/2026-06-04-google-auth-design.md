# Google OAuth Login — Design Spec

**Date:** 2026-06-04  
**Status:** Approved  

---

## Summary

Add Google OAuth sign-in alongside the existing email/password login. Only `@57blocks.com` accounts are allowed. Works in both the web browser and the Electron desktop app. Authenticated users are persisted to a new `users` table. Route protection is added via Next.js middleware (currently absent).

---

## Architecture

### Files changed

| File | Change |
|---|---|
| `src/middleware.ts` | New — protects all routes, redirects unauthenticated to `/login` |
| `src/lib/db/schema.ts` | Edit — add `users` table definition |
| `src/lib/db/migrations/005_users.sql` | New — SQL migration for `users` table |
| `src/lib/auth.ts` | Edit — export `OAUTH_STATE_COOKIE` constant |
| `src/app/api/auth/google/route.ts` | New — GET: generates PKCE + state, redirects to Google |
| `src/app/api/auth/callback/google/route.ts` | New — GET: exchanges code, verifies domain, upserts user, mints token |
| `src/app/api/auth/logout/route.ts` | New — POST: clears `auth_token` cookie |
| `src/app/api/auth/login/route.ts` | Edit — add `@57blocks.com` domain check + upsert user on success |
| `src/app/login/page.tsx` | Edit — add "Sign in with Google" button + error message display |
| `.env.example` | Edit — document `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |

### What does NOT change

- `auth_token` cookie name, format, and TTL
- `signToken` / `verifyToken` in `src/lib/auth.ts`
- Dashboard layout and all existing pages
- Existing password auth path (extended, not replaced)

---

## Database

### `users` table (migration `005_users.sql`)

```sql
CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  name        TEXT,
  picture     TEXT,
  google_id   TEXT UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

- `google_id` is the Google `sub` claim. It is `NULL` for password-only users.
- `picture` stores the Google avatar URL for future profile display.
- Upsert key for both login paths: `email`. This allows a user who registered via email/password to later sign in with Google (same email) — the row is updated with their `google_id` automatically.

### Drizzle schema addition (`src/lib/db/schema.ts`)

Add a `users` pgTable matching the SQL above.

---

## OAuth Flow

### Credentials

- **Client ID:** `YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com`
- **Client Secret:** stored in `GOOGLE_CLIENT_SECRET` env var (never hard-coded)
- **App type:** Installed (desktop) — Google allows any `localhost` port for this type
- **Redirect URI:** `http://localhost:3000/api/auth/callback/google`

### Step-by-step

```
1. User clicks "Sign in with Google" on /login
   → navigates to GET /api/auth/google

2. Server:
   - generates code_verifier (32 random bytes → base64url)
   - derives code_challenge = base64url(SHA-256(code_verifier))
   - generates state (16 random bytes → hex)
   - sets cookie: oauth_state = "{state}:{code_verifier}"
       (httpOnly, sameSite=lax, maxAge=600s)
   - redirects to:
       https://accounts.google.com/o/oauth2/auth
         ?client_id=<GOOGLE_CLIENT_ID>
         &redirect_uri=http://localhost:3000/api/auth/callback/google
         &response_type=code
         &scope=openid email profile
         &code_challenge=<code_challenge>
         &code_challenge_method=S256
         &state=<state>
         &access_type=offline

3. User authenticates with Google in browser

4. Google redirects to:
   GET /api/auth/callback/google?code=<code>&state=<state>

5. Server:
   a. reads oauth_state cookie → splits on ":" → extracts state + code_verifier
   b. verifies query ?state matches cookie state → 400 if mismatch (CSRF)
   c. clears oauth_state cookie immediately
   d. POSTs to https://oauth2.googleapis.com/token:
        { code, client_id, client_secret, redirect_uri,
          grant_type: "authorization_code", code_verifier }
   e. decodes id_token payload (base64url, middle segment — no crypto needed here,
      Google already verified it on their end; we only use email/sub/name/picture)
   f. checks email ends with "@57blocks.com"
        → if not: redirect to /login?error=domain
   g. upserts into users table:
        ON CONFLICT (email) DO UPDATE SET
          google_id = EXCLUDED.google_id,
          name      = EXCLUDED.name,
          picture   = EXCLUDED.picture,
          updated_at = NOW()
   h. calls signToken(email) → sets auth_token cookie (same as password login)
   i. redirects to /
```

### Error states

| Condition | Behavior |
|---|---|
| Email not `@57blocks.com` | Redirect to `/login?error=domain` |
| State mismatch | Redirect to `/login?error=state` |
| Google token exchange fails | Redirect to `/login?error=oauth` |
| Google returns no email | Redirect to `/login?error=oauth` |

---

## Route Protection

### `src/middleware.ts`

```
Protected: all routes
Excluded: /login, /api/auth/*, /_next/*, /favicon.ico

Logic:
  1. Read auth_token cookie
  2. verifyToken(token)
     - null / expired → redirect to /login
     - valid → continue
  3. If request is for /login and token is valid → redirect to /
```

The matcher uses Next.js `config.matcher` to exclude static assets.

---

## Login Page Changes

### Google button

Placed below the existing form, separated by an "or" divider:

```
─────────── or ───────────

[ G  Sign in with Google ]    ← link to /api/auth/google
```

The button is a plain `<a href="/api/auth/google">` (not a form submit) so it triggers a full navigation that the middleware/Electron browser can follow naturally.

### Error messages

Read `?error` from the URL search params on mount:

| `?error=` | Message shown |
|---|---|
| `domain` | Only @57blocks.com accounts are allowed. |
| `state` | Authentication failed. Please try again. |
| `oauth` | Google sign-in failed. Please try again. |

---

## Email/Password Login Changes

`src/app/api/auth/login/route.ts`:

1. After email/password validation succeeds, check `email.endsWith("@57blocks.com")` → 403 if not.
2. Upsert into `users` table (`google_id = NULL`, name from email prefix) before minting token.

---

## Logout

`POST /api/auth/logout` — clears `auth_token` cookie, returns `{ ok: true }`.

The `AppNav` sidebar gets a logout button (inspect during implementation; add if not present).

---

## Environment Variables

```env
# Google OAuth (installed app)
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=       # GOCSPX-... — set in .env.local only, never commit
```

---

## Security Notes

- `client_secret` goes in `.env.local` only, never in `.env.example` as a value.
- PKCE (`code_challenge`) prevents authorization code interception — important for the installed/desktop app type.
- `state` parameter prevents CSRF.
- `oauth_state` cookie is `httpOnly` + short-lived (10 min).
- ID token payload is decoded but **not cryptographically verified** server-side (Google verified it; we trust the HTTPS transport). This is standard practice for server-side OAuth flows.
- `@57blocks.com` domain check happens before any DB write or token mint.

---

## Out of Scope

- Role-based access control
- Multiple Google accounts per user
- Account linking (Google ↔ password for the same email)
- Refresh token handling
- Profile page / avatar display
