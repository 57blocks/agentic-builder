-- Migration 004: add project_step_navigation and project_step_artifacts tables

CREATE TABLE IF NOT EXISTS project_step_navigation (
  project_id  TEXT        PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  active_step TEXT        NOT NULL DEFAULT 'initial',
  tier        TEXT        NOT NULL DEFAULT 'M',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_step_artifacts (
  project_id   TEXT        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  step_id      TEXT        NOT NULL,
  run_index    TEXT        NOT NULL DEFAULT '0',
  status       TEXT        NOT NULL DEFAULT 'idle',
  input        JSONB       NOT NULL DEFAULT '{}',
  output       JSONB       NOT NULL DEFAULT '{}',
  cost_usd     FLOAT8      NOT NULL DEFAULT 0,
  duration_ms  FLOAT8      NOT NULL DEFAULT 0,
  model        TEXT,
  trace_id     TEXT,
  error        TEXT,
  started_at   TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (project_id, step_id, run_index)
);
