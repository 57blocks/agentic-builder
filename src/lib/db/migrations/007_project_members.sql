-- Add owner_id to projects (nullable — existing rows stay NULL, meaning "legacy/unowned")
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS owner_id TEXT REFERENCES users(id) ON DELETE SET NULL;

-- Membership table (owner + collaborator rows both live here)
CREATE TABLE IF NOT EXISTS project_members (
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('owner', 'collaborator')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS project_members_user_idx ON project_members(user_id);
