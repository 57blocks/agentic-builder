-- Add per-project code output directory (absolute path chosen by user via folder picker).
-- Empty string for existing rows — step-store falls back to 'generated-code' default.
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS code_output_dir text NOT NULL DEFAULT '';
