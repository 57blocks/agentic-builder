-- 006_project_cover.sql
-- Add a cover-image pointer to each project. The image bytes live on disk
-- (public/project-covers/<projectId>.jpg, served at /project-covers/...);
-- this column stores only the public URL path. Nullable — projects without
-- a captured preview simply have no cover.
--
-- Idempotent: the migration runner re-executes every file on each startup,
-- so guard with IF NOT EXISTS.
ALTER TABLE projects ADD COLUMN IF NOT EXISTS cover_image_path text;
