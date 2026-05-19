/**
 * TRD generation hardening contracts. Keeps operational codegen constraints
 * out of the already-large TRD agent prompt body while making them reusable
 * by reviewer and future repair prompts.
 */

export const TRD_GENERATION_CONTRACTS_PROMPT = `
## Runtime / Data Contracts (REQUIRED when applicable)

When the PRD describes background jobs, scheduled ingestion, external data
feeds, scoring pipelines, or any user-visible "freshness"/"health" signal,
the TRD MUST add explicit contract subsections under §3 Backend Architecture
or §5 Non-Functional Targets. These are codegen contracts, not optional notes.

### Runtime Boot Contract
- If any backend module exports \`start*Worker(...)\`, \`backend/src/server.ts\`
  MUST import and start every such worker during server boot, after DB/model
  initialization and before \`app.listen(...)\`.
- For ingestion/scoring projects, explicitly state that the ingestion worker is
  required for real-data updates; generating the worker file without boot
  wiring is a correctness bug.
- Name the concrete file path \`backend/src/server.ts\` and the expected
  function pattern \`start*Worker\` so task breakdown/codegen can target it.

### Real Data Source Contract
- For every external source in the PRD, list: source name, variables/features it
  powers, canonical env key(s), cadence, failure behavior, and persistence
  target.
- Stablecoin/data-feed projects MUST explicitly cover these when mentioned:
  CoinGecko → \`COINGECKO_API_KEY\`; Quotient → \`QUOTIENT_API_KEY\`; X/Twitter
  → \`X_BEARER_TOKEN\`; Jina → \`JINA_API_KEY\`; LLM classification →
  \`LLM_PROVIDER\`, \`LLM_API_KEY\`, \`LLM_BASE_URL\`, \`LLM_MODEL\`; SMTP /
  magic-link email → \`SMTP_HOST\`, \`SMTP_PORT\`, \`SMTP_USER\`, \`SMTP_PASS\`,
  \`SMTP_FROM\`.
- Do not hide these keys only in prose. They must appear literally in an
  "Environment Variables Contract" table so resource detection can extract
  them deterministically.

### Seed / Fallback Data Contract
- Seed data is allowed only for bootstrap/demo accounts and local demo rows.
- Seed scripts MUST NOT mark external source feeds healthy, MUST NOT set
  \`source_feeds.lastSuccessAt\` / equivalent success timestamps for external
  providers, and MUST NOT create rows that the UI labels as real provider data.
- If demo metric values are emitted, they must be tagged as demo/fallback and
  excluded from source-health success semantics.

### Source Health / Ingestion Run Semantics
- \`source_feeds\` health fields and \`ingestion_runs\` rows MUST be updated only
  by real ingestion jobs or explicit admin/operator refetch actions.
- Successful provider calls write success timestamps; missing credentials,
  provider failures, and empty provider results write skipped/failed/stale
  states with a user-safe error reason.
- The UI must distinguish "not configured", "stale", "failed", "demo data",
  and "healthy real data" instead of collapsing all non-errors to healthy.

### Worker / Job Lifecycle Contract
- Background jobs need explicit run IDs, status transitions, retry policy,
  stale-run cleanup, and observable logs. If an in-process fallback exists, API
  status/SSE endpoints must branch between \`inproc:\` IDs and database UUIDs.
- Any queue/BullMQ implementation must have a documented local fallback so the
  generated project can run without Redis unless Redis is a hard PRD
  requirement.

### Auth Decision Contract
- Authentication mode must be consistent with the persisted auth decision
  (\`.blueprint/auth-decision.json\` or equivalent UI Phase 0 override).
- If the TRD proposes Magic Link, Privy, OIDC, or username/password RBAC, it
  must explain whether that came from PRD text or from the auth decision. Do not
  silently choose a different auth stack than the selected auth mode.

### Business Rules / Scoring Safety Contract
- When scoring thresholds are not authoritative, the TRD must label them as
  placeholder and require generated code to preserve a TODO/warning. Never
  present inferred thresholds as production-blessed methodology.
- If real provider values enter the system before authoritative thresholds are
  known, UI labels must make clear that the normalized score is provisional.
`;

