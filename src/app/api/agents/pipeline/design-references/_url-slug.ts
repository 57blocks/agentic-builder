/**
 * Stable, filesystem-safe slug from a capture URL (host + path). Distinct URLs
 * → distinct fileNames; the SAME URL re-captured → same fileName so
 * `addDesignReference` replaces it in place. Falls back to "url-capture".
 */
export function urlToFileSlug(url: string | undefined): string {
  const raw = (url ?? "").trim();
  let base = raw;
  try {
    const u = new URL(raw);
    base = `${u.host}${u.pathname}`;
  } catch {
    // not a parseable URL — slug the raw string
  }
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return slug || "url-capture";
}
