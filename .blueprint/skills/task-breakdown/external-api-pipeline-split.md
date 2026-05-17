---
id: external-api-pipeline-split
agent: task-breakdown
version: v1
description: Backend pipelines integrating 3+ external APIs must be split into client / orchestration / route tasks.
priority: 75
excludes: []
trigger:
  type: composite
  prefilter:
    type: regex
    match: both
    any_of:
      # Order matters: the loader returns the FIRST match as evidence, which
      # then anchors the LLM confirm. Put the most informative pattern
      # (vendor-name table row) first so the LLM sees concrete vendor names
      # rather than a generic "external API" paragraph.
      - "(CoinGecko|Quotient|Twitter|HackerNews|Jina|OpenAI|Anthropic|Polymarket|HyperLiquid|Deribit|Stripe|Mailgun|Alchemy|Infura|Etherscan|DefiLlama|Glassnode|Messari|CoinMarketCap|Chainalysis)"
      - "_API_KEY.*_API_KEY"
      - "external API"
      - "third[- ]party"
      - "data source"
      - "ingestion"
  confirm:
    type: llm
    match: both
    prompt: |
      Does the project plan to integrate 3 or more distinct external
      third-party APIs / services? Count any of the following as distinct
      "services": market data vendors, on-chain analytics vendors, social
      sentiment vendors, news/scraping vendors, LLM providers, email
      providers, payment providers, OAuth IdPs.

      Quote any one PRD/TRD line that names 3+ such services (e.g. a
      .env.example listing keys for CoinGecko + Quotient + Jina + OpenAI,
      or an integrations section mentioning Twitter + News + LLM).

      Answer YES if such a list exists anywhere in the document.
      Answer NO if at most 2 distinct external services are mentioned.
---

# Multi-vendor pipeline split (3+ external APIs)

When a backend pipeline integrates more than 3 distinct external HTTP APIs
or third-party services in one logical flow, you MUST NOT emit it as a
single task. The required split:

## Required split (minimum 3 tasks)

### Task A — External API client layer
Files like:
- `backend/src/services/externalApis/coinGeckoClient.ts`
- `backend/src/services/externalApis/quotientClient.ts`
- `backend/src/services/externalApis/jinaClient.ts`
- `backend/src/services/externalApis/openAiClient.ts`

This task creates the HTTP wrappers — auth headers, retry/timeout, typed
response shapes, lazy credential loading (per the lazy-adapter pattern).
It does NOT call the orchestration logic.

### Task B — Pipeline orchestration
Files like:
- `backend/src/services/feedAggregator.ts`
- `backend/src/services/scoringEngine.ts`
- `backend/src/services/reserveAttestationPipeline.ts`

This task reads from Task A's clients, sequences them, persists results,
and exposes a callable function. It does NOT directly construct HTTP requests.

### Task C — HTTP routes + SSE/queue wiring
Files like:
- `backend/src/api/modules/<feature>/<feature>.routes.ts`
- `backend/src/api/modules/<feature>/<feature>.controller.ts`

This task adds the public endpoints that enqueue the pipeline and stream
back run status. It depends on Task B.

## Why split?

- A single task touching 12+ files (clients + orchestration + routes) is
  impossible to test in isolation.
- Codegen produces lower-quality output when one task spans too many file
  patterns — the model loses coherence across vendor SDK shapes.
- Splitting lets you swap one client (e.g. switch CoinGecko → CoinMarketCap)
  without re-running the orchestration task.

## Anti-pattern

"Implement <feature> aggregation pipeline and APIs" as a single 8h task
covering 4 external clients + orchestration + 3 routes + SSE streaming +
queue wiring. → split into 3 tasks.

## Pairs with: background-job-lifecycle

When the pipeline runs as a background job (the common case), Task B owns
the lifecycle deliverables described in the `background-job-lifecycle`
skill (run_id, in-process fallback, clear-stale, etc.). Task C owns the
HTTP surface — including the SSE `inproc:` vs UUID branching.
