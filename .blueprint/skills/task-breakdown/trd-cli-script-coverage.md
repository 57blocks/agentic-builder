---
id: trd-cli-script-coverage
agent: task-breakdown
version: v1
description: Every backend/scripts/*.ts path declared in TRD §3.5 must appear in some task's files.creates verbatim.
priority: 80
excludes: []
trigger:
  type: regex
  match: trd
  any_of:
    - "Operator CLI Scripts"
    - "backend/scripts/[a-zA-Z]+\\.ts"
---

# CLI Script Coverage (TRD §3.5)

## Hard rule

If the TRD declares an "Operator CLI Scripts" section listing paths shaped like
`backend/scripts/<name>.ts`, then EACH listed path MUST appear verbatim in the
`files.creates` array of exactly ONE task. Use the path string from the TRD
character-for-character — do not rename, do not normalise case.

Typical pattern: a single consolidated "CLI maintenance scripts" task whose
`files.creates` lists ALL of those paths plus the shared
`backend/src/lib/cli-audit.ts` helper.

## Why this rule exists

- Skipping a CLI script because its FR-OM-* is also implemented as an admin
  HTTP endpoint creates an "operator dead-end": the script is referenced in
  the deployment docs (and the audit logs expect `actor=cli`) but cannot
  actually be run.
- A previous run shipped 4 scripts when the TRD listed 5 — the missing one
  (`forceScoringCycle.ts`) had its FR-OM01 marked as covered because a
  matching HTTP endpoint existed, but the CLI itself was silently dropped.

## Anti-patterns to reject

- Coalescing 3 scripts into one "multi-action" file with a switch.
- Replacing a script with an admin HTTP endpoint and calling Rule 1 satisfied.
- Renaming a script (`forceScoringCycle.ts` → `forceScoring.ts`).

## Self-check before emitting

For each path in TRD §3.5 → grep your draft task list for that exact substring.
Every path must appear in exactly one `files.creates`.
