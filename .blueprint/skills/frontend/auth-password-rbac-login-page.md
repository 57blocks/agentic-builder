---
id: auth-password-rbac-login-page
agent: frontend
version: v1
description: With the password-rbac auth scaffold, all sign-in/registration/onboarding UI lives in the shipped LoginPage.tsx at /login — never a separate AuthPage or /auth route.
priority: 90
excludes: []
trigger:
  type: context
  any_of_features:
    - "auth-password-rbac"
---

# Auth = the scaffold's LoginPage at `/login` (this project uses password-rbac auth)

The `auth-password-rbac` scaffold has ALREADY shipped
`frontend/src/views/LoginPage.tsx` (an email+password form that calls
`useAuthStore.login(email, password)`) plus a Zustand `auth-store`. The
canonical auth route is `/login`, and `ProtectedRoute` already redirects
unauthenticated users there.

- Implement ALL sign-in / registration / email-verification / onboarding /
  role-selection UI by EXTENDING (overwriting) `frontend/src/views/LoginPage.tsx`.
  You MUST keep the `useAuthStore.login(...)` call — that is the contract with
  the rest of the scaffold.
- There is EXACTLY ONE auth page, mounted at `/login`. DO NOT create a separate
  `AuthPage.tsx`, and DO NOT register an `/auth` route (or any second login
  route). If you encounter an `/auth` route, treat it as a bug and consolidate
  onto `/login`.
- The root `/` redirect and EVERY post-logout / post-account-deletion redirect
  MUST target `/login` — never `/auth`.
- After a successful login, navigate to the signed-in user's role landing route
  (e.g. `/family/dashboard`, `/teacher/dashboard`, `/admin/...`).
- This is NOT an OAuth/Privy project: there is no `PrivyProvider` /
  `LoginModal` / `usePrivyAuthBridge`. Ignore any OAuth-specific guidance.
