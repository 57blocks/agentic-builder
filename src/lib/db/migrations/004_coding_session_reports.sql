-- Migration 004: persist coding-session reports
-- Mirrors `.ralph/coding-session-report.<sessionId>.{json,md}` so reports
-- survive output-dir cleanups and become queryable across projects.

CREATE TABLE IF NOT EXISTS coding_session_reports (
  session_id        TEXT        PRIMARY KEY,
  project_id        TEXT        REFERENCES projects(id) ON DELETE CASCADE,
  output_dir        TEXT        NOT NULL,
  status            TEXT        NOT NULL,
  score             DOUBLE PRECISION,
  grade             TEXT,
  primary_model     TEXT,
  total_calls       DOUBLE PRECISION NOT NULL DEFAULT 0,
  total_tokens      DOUBLE PRECISION NOT NULL DEFAULT 0,
  total_cost_usd    DOUBLE PRECISION NOT NULL DEFAULT 0,
  duration_ms       DOUBLE PRECISION NOT NULL DEFAULT 0,
  started_at        TIMESTAMPTZ NOT NULL,
  ended_at          TIMESTAMPTZ NOT NULL,
  generator_git_sha TEXT,
  payload           JSONB       NOT NULL,
  markdown          TEXT        NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS coding_session_reports_project_ended_idx
  ON coding_session_reports (project_id, ended_at);

CREATE INDEX IF NOT EXISTS coding_session_reports_ended_idx
  ON coding_session_reports (ended_at);
