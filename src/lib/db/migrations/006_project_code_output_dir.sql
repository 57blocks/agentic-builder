-- Add per-project code output directory (absolute path chosen by user).
-- Empty string for existing rows — resolveCodeOutputRoot falls back to "generated-code".
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS code_output_dir text NOT NULL DEFAULT '';
