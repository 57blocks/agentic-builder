---
id: trd-data-model-coverage
agent: task-breakdown
version: v1
description: Every database table in TRD §3.2 must have a dedicated Sequelize model file.
priority: 80
excludes: []
trigger:
  type: regex
  match: trd
  any_of:
    - "## 3\\.2 Data Models"
    - "## 3\\.2 .*Data"
    - "Data Models"
---

# Data Model Coverage (TRD §3.2)

## Hard rule

For each table listed in TRD §3.2 Data Models, the task list MUST contain a
`files.creates` entry of the form `backend/src/models/<PascalCaseName>.ts`
where `PascalCaseName` is the table name converted:

- `weights_audit_log` → `WeightsAuditLog.ts`
- `coin_variable_values` → `CoinVariableValue.ts`
- `audit_logs` → `AuditLog.ts`
- `ingestion_runs` → `IngestionRun.ts`

All these typically belong to the Data Layer task (alongside migrations).

## Why this rule exists

Coalescing audit/observability tables into a generic `AuditLog.ts` model loses
their schema-level differences (different columns, different retention rules,
different indices). A previous run silently dropped `weights_audit_log` because
the task description said "all audit tables go into AuditLog.ts" — the
resulting code couldn't write weight-change events with the expected payload
shape.

## Anti-patterns to reject

- Single `AuditLog.ts` model claiming to "cover all audit-style tables".
- Skipping observability tables (`job_runs`, `ingestion_runs`) because they're
  "internal".
- Splitting a single table across two model files.

## Self-check before emitting

For each row in TRD §3.2 → compute the expected `<PascalCase>.ts` filename →
grep your draft for that exact filename in `files.creates`. Every table must
have a matching model file.
