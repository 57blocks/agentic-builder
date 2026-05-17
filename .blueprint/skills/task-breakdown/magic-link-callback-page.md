---
id: magic-link-callback-page
agent: task-breakdown
version: v1
description: Magic-link / passwordless email auth requires a dedicated frontend callback page.
priority: 70
excludes: []
trigger:
  type: composite
  prefilter:
    type: regex
    match: prd
    any_of:
      - "magic link"
      - "magic[- ]link"
      - "passwordless"
      - "one[- ]time link"
      - "email[- ]based login"
  confirm:
    type: llm
    match: prd
    prompt: |
      Does the PRD describe an authentication flow where the user receives
      a clickable link or token via email and uses it to sign in?

      Examples that QUALIFY (answer YES):
      - "Passwordless email link login"
      - "Send Magic Link" button + email containing a link
      - Any flow where the email itself contains the sign-in mechanism

      Quote any one supporting line from the PRD.

      Answer NO only when authentication is exclusively password-based,
      OAuth-only, or SAML-only with NO email-link mechanism anywhere.
---

# Magic-link callback page

## Hard rule

When the PRD specifies magic-link / passwordless email-based auth, the task
list MUST include a task whose `files.creates` lists a dedicated frontend
route+page that handles the link callback.

The exact filename is your choice — match the project's domain:
- `MagicLoginVerifyPage.tsx`
- `VerifyLoginPage.tsx`
- `AuthVerifyPage.tsx`
- `SignInCallbackPage.tsx`

Mount the route at a stable, human-readable path:
- `/auth/verify`
- `/login/verify`
- `/sign-in/callback`

## What the page must do

1. Read the token from the URL query string (`?token=…`).
2. POST it to the backend verify endpoint (`/api/auth/verify` or equivalent).
3. On success: store the returned session and redirect to the authenticated
   landing page.
4. On failure (expired / consumed token): show a clear error with a
   "Resend link" affordance pointing back to the login page.

## Anti-pattern

A task that says "Implement authentication pages" but only lists `LoginPage.tsx`
does NOT satisfy this rule — without the callback page, every email the
backend sends out lands on a 404.

## Self-check before emitting

Grep your draft for any file under `frontend/src/views/` (or equivalent) whose
name contains `verify` / `callback` / `confirm` and is positioned as the
"after email click" handler. If none, this rule is violated.
