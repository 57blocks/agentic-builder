# `auth-privy` — Privy OAuth (server + client)

This optional feature wires up Privy authentication on both the backend (Koa
middleware) and the frontend (apps install `@privy-io/react-auth` and use
`<PrivyProvider>` / `usePrivy()`).

## Triggers

The codegen pipeline copies this feature into the generated project when ANY
of these env vars appears in `.blueprint/resource-requirements.json`:

- `VITE_PRIVY_APP_ID` (frontend bundle)
- `NEXT_PUBLIC_PRIVY_APP_ID` (Next.js variant)
- `PRIVY_APP_ID` (server)
- `PRIVY_APP_SECRET` (server)

## Files copied (when applied)

### Backend

| Path | Purpose |
|------|---------|
| `backend/src/config/privy-env.ts`             | Reads `PRIVY_APP_ID` / `PRIVY_APP_SECRET` from env. NEVER hardcoded. |
| `backend/src/privy/client.ts`                 | Lazy-init `PrivyClient` (server SDK). |
| `backend/src/middlewares/privyAuth.ts`        | Token-verification middleware + `requirePrivyAuth(ctx)` helper. |
| `backend/src/app.ts`                          | **Overwrites** base — registers `privyAuthMiddleware`. |
| `backend/src/api/modules/auth/auth.routes.ts` | **Overwrites** base — uses `requirePrivyAuth`. |

### Frontend

| Path | Purpose |
|------|---------|
| `frontend/src/providers/PrivyProvider.tsx`         | Generic wrapper around `<PrivyProvider>`; reads `VITE_PRIVY_APP_ID`. Worker should narrow `loginMethods` per PRD. |
| `frontend/src/providers/AppProviders.tsx`          | **Overwrites** base — mounts `<PrivyAuthProvider>` around `<AuthProvider>` so `main.tsx` is unchanged. |
| `frontend/src/components/auth/LoginModal.tsx`      | **Overwrites** base — `usePrivy().login()` flow, forwards Privy access token via `onLogin?.(privyToken)`. |
| `frontend/src/hooks/usePrivyAuthBridge.ts`         | Optional helper hook — auto-syncs Privy access token into `AuthContext` so `apiClient` picks it up as `Bearer`. Mount once near root. |

## Deps appended (via manifest)

- `frontend`: `@privy-io/react-auth` `^3.22.0`
- `backend`: `@privy-io/node` `^0.16.0`

## What the worker still has to wire up

Once these files land, the remaining work for an OAuth-using project is just:

1. In `main.tsx` (already provider-neutral): nothing — `AppProviders` was overwritten.
2. In a top-level layout (e.g. `App.tsx`): add `usePrivyAuthBridge();` if you want the token to flow into `AuthContext` automatically.
3. In whichever page hosts `<LoginModal>` (typically a landing/login page): pass `onLogin={(privyToken) => useAuth().login(privyToken)}` (or an explicit `/api/auth/verify` exchange if PRD asks for an internal JWT).

The backend `privyAuthMiddleware` will verify the Bearer token on every
authenticated route — no further server wiring needed.

## When NOT applied

The base scaffold ships with a no-op auth pass-through and an email+password
`LoginModal`. Workers implement an email+password flow against
`/api/auth/login` (filled in based on PRD).
