import path from "path";

/**
 * Validate an untrusted project id before it is interpolated into a filesystem
 * path (`designReferenceDirAbs` does `path.join(root, ".blueprint", "projects",
 * projectId, ...)`). `undefined` is allowed — it selects the shared default
 * manifest. Anything containing a separator, `..`, or an absolute path is rejected.
 */
export function isSafeProjectId(projectId: string | undefined | null): boolean {
  if (projectId == null) return true;
  if (projectId.length === 0) return false;
  if (projectId.includes("/") || projectId.includes("\\")) return false;
  if (projectId.includes("..")) return false;
  if (path.isAbsolute(projectId)) return false;
  return true;
}
