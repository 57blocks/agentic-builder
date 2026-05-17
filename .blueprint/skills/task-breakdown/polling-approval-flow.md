---
id: polling-approval-flow
agent: task-breakdown
version: v1
description: When user must remain in the browser checking approval status, a dedicated pending page is required.
priority: 60
excludes:
  - email-driven-approval-flow
trigger:
  type: composite
  prefilter:
    type: regex
    match: prd
    any_of:
      - "access request"
      - "approval"
      - "approve"
      - "pending"
      - "status check"
  confirm:
    type: llm
    match: prd
    prompt: |
      The PRD describes a flow where users submit some kind of request /
      action and have to wait for an asynchronous approval / decision.

      We need to determine whether the user is expected to remain in the
      browser and check approval STATUS over time — e.g. by polling a
      status endpoint, refreshing a page, or watching a status indicator.
      In particular: the PRD must indicate the USER is the one initiating
      the next step, NOT the system pushing it via email/notification.

      Answer YES with a verbatim PRD quote if the doc clearly says users
      stay in the browser and check status.
      Answer NO if approval notifications are pushed (email, notification)
      and the user doesn't need to actively check status in the browser,
      or if the approval flow is fire-and-forget.
---

# Polling-based approval workflow

## What this skill says

When the user must stay in the browser to track approval status, the task
list MUST include a dedicated `PendingApprovalPage.tsx` (or
`AwaitingAccessPage.tsx`, `RequestPendingPage.tsx`, etc.) as a separate file
from the submission form. The waiting state must survive page reloads.

## Hard rule — Acceptance bar (all must hold)

1. **Dedicated standalone page file** — a separate `.tsx` view that appears
   in some task's `files.creates`, distinct from the submission form page.
   Inline post-submit success messaging INSIDE the form page does NOT
   satisfy this rule.

2. **Dedicated URL route** — a stable URL path (`/pending`,
   `/awaiting-approval`, `/orders/:id/processing`, …) registered in the
   router so the user can bookmark / share / refresh.

3. **Post-submit redirect** — the submission task's subSteps must explicitly
   describe a client-side navigation to the waiting page after the POST
   succeeds (not just an inline message).

4. **Status surfacing** — the waiting page must be able to detect when the
   condition resolves. Pick the pattern that fits:
   - polling: periodic GET to a status endpoint
   - manual refresh: "Check status" button
   - server-push: SSE / WebSocket subscription
   A static page that never updates is INSUFFICIENT.

5. **Pre-auth interception** — the auth-guard task must redirect users in
   the intermediate state to the waiting page when they try to access
   protected routes.

## Anti-pattern to reject

A submission form page that POSTs, shows an inline "Request submitted"
message, and sits there indefinitely. User closes the tab; next day they
try to log in and have no way to learn whether they were approved.

## Self-check before emitting

1. Some task's `files.creates` lists a standalone waiting-state page file
   (distinct from the submission form).
2. The submission task's subSteps describe a navigation/redirect to the
   waiting route after submit.
3. The waiting page's subSteps describe a status-change mechanism.
4. The auth-guard task includes a "if still pending → redirect to waiting"
   subStep.
