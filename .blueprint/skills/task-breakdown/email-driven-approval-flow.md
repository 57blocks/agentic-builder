---
id: email-driven-approval-flow
agent: task-breakdown
version: v1
description: When approved users get a sign-in email, the submit page may use inline success — a separate pending page is NOT required.
priority: 70
excludes:
  - polling-approval-flow
trigger:
  type: composite
  prefilter:
    type: regex
    match: prd
    any_of:
      - "access request"
      - "access[- ]request"
      - "approval"
      - "approve"
  confirm:
    type: llm
    match: prd
    prompt: |
      The PRD describes a flow where users submit some kind of access request
      and an admin approves it asynchronously.

      We need to determine whether the approval flow is EMAIL-DRIVEN, i.e.:
      after approval, the user is notified by email with a magic link / sign-in
      link / credentials, AND they re-enter the product by clicking that
      email link (NOT by polling a "/pending" page in their browser).

      Answer YES with a verbatim PRD quote if the doc clearly says that
      approved users receive an email link / credentials by email and that's
      how they get back in.
      Answer NO if the user is expected to poll/refresh a status page in
      their browser, or if the approval notification mechanism is unspecified.
---

# Email-driven approval workflow

## What this skill says

When the approval flow is email-driven, the user does NOT need to keep their
browser open or come back to a `/pending` URL to learn that the approval
happened. The email itself is the return path.

In this configuration, the submission page (`AccessRequestPage.tsx` or
equivalent) is allowed to:

1. POST the form to the backend.
2. Replace the form with an inline success block:
   > "Request submitted — watch your email for an approval notice."
3. Leave the user there. No client-side redirect needed.

## Anti-pattern to AVOID

Do NOT add a separate `PendingApprovalPage.tsx` with status polling. The
backend has no "current status" endpoint to poll against (because approval
events are pushed via email), so polling would be dead code — and a route at
`/pending` would dead-end the user with nothing useful to do.

## Hard rule

When this skill is applied (and `polling-approval-flow` is consequently
excluded), the task that creates the submission page MUST include a subStep
describing the inline-success behavior. Do NOT also create a separate pending
page.

## Self-check before emitting

If you find yourself drafting a `PendingPage.tsx` / `AwaitingApprovalPage.tsx`
when this skill is applied, that's a violation — remove it.
