---
id: intermediate-waiting-state-page
agent: task-breakdown
version: v1
description: Multi-stage backend pipelines need a dedicated frontend "processing" page so users see progress between stages.
priority: 70
excludes: []
trigger:
  type: composite
  prefilter:
    type: regex
    match: both
    any_of:
      # Order matters — most specific first so the LLM gets useful evidence.
      - "(fetch|ingest)\\s*[→\\->]+\\s*(extract|parse|classify|score|review)"
      - "ingestion[_-]?run"
      - "multi[- ]stage"
      - "intermediate (stage|state)"
      - "(processing|extraction|attestation)\\s+pipeline"
      - "(stage|step)\\s+indicator"
  confirm:
    type: llm
    match: both
    prompt: |
      Does the project have a backend pipeline that processes one user-initiated
      action through 3 or more distinct stages (e.g. fetch → extract → classify
      → human review), where each stage can be observed or take noticeable time?

      Examples that QUALIFY (answer YES):
      - "Reserve attestation pipeline: fetch document → AI extracts text → LLM
         structures values → operator reviews"
      - "Ingestion job runs in stages tracked by an `ingestion_runs` table"
      - "Multi-step extraction pipeline for documents"

      Quote any one supporting line from the PRD or TRD.

      Answer NO when the only async work is a single-stage call (one HTTP
      request, one job) with no intermediate observable states.
---

# Intermediate "waiting state" page

## Hard rule

When the project has a multi-stage backend pipeline (3+ observable stages
between user action and final result), the task list MUST include a
frontend task whose `files.creates` lists a dedicated **processing /
waiting** page (or component) that shows which stage the pipeline is in.

The exact filename is your choice — match the project's domain:
- `ReserveProcessingPage.tsx` + `ProcessingStageIndicator.tsx`
- `AttestationProgressPage.tsx`
- `IngestionStatusPage.tsx`
- `ExtractionInProgressPage.tsx`
- A reusable `ProcessingStateView.tsx` + per-flow page is also fine.

## What the page must do

1. Read the pipeline run id from the URL or query string (e.g. `?runId=…`).
2. Subscribe to status updates (poll `GET /ingestion-runs/:id` every few
   seconds, or consume an SSE/WebSocket stream if the backend offers one).
3. Render a stage indicator: which stage is currently running, which have
   completed, which failed. Use the same stage names as the backend
   `ingestion_runs.currentStage` column (or equivalent).
4. On terminal success → redirect to the result page (e.g. the review queue
   entry, the score page, the extracted-data page).
5. On terminal failure → show the error message plus a retry affordance.

## Anti-pattern

A task that says "Implement reserve review queue" with only
`ReserveReviewQueue.tsx` does NOT satisfy this rule — the queue shows
only completed runs. Between user action and queue arrival the user sees
nothing, and they will either reload-spam or assume the action failed.

A spinner inside a button does NOT count as a stage indicator — the rule
exists because pipelines that take minutes need observable intermediate
state.

## Self-check before emitting

Grep your draft for any file under `frontend/src/views/` or
`frontend/src/components/` whose name contains `Processing` /
`InProgress` / `Stage` / `Progress` AND is positioned as the bridge
between "user submitted" and "final result visible". If none exists, this
rule is violated.

## Pairs with: background-job-lifecycle

This skill handles the FRONTEND side of multi-stage pipelines. The
`background-job-lifecycle` skill handles the BACKEND side
(`run_id` propagation, clear-stale endpoint, in-process fallback). Both
typically apply together, so check that the run id surfaced here matches
the id format the backend skill produces.
