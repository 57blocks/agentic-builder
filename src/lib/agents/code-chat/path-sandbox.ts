import path from "path";

/**
 * Resolve a user-provided relative path against an absolute root, rejecting
 * absolute paths and `..` traversal that would escape the sandbox.
 */
export function resolveSandboxedPath(
  root: string,
  rel: string,
): { abs: string; normalized: string } {
  const trimmed = (rel ?? "").trim();
  if (!trimmed) throw new Error("Path must not be empty.");
  if (path.isAbsolute(trimmed)) {
    throw new Error(`Absolute paths are not allowed: ${trimmed}`);
  }
  const normalized = path.posix.normalize(trimmed.replace(/\\/g, "/"));
  if (normalized.startsWith("..") || normalized.split("/").includes("..")) {
    throw new Error(`Path escapes project root: ${trimmed}`);
  }
  const abs = path.resolve(root, normalized);
  const rootResolved = path.resolve(root);
  if (abs !== rootResolved && !abs.startsWith(rootResolved + path.sep)) {
    throw new Error(`Path escapes project root: ${trimmed}`);
  }
  return { abs, normalized };
}
