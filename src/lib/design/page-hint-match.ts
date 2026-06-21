/**
 * Client-safe matcher: does a design reference's `pageHint` belong to a given
 * route/page id?
 *
 * Auto-match (Vision) persists an ENRICHED hint — `"PAGE-003 dashboard family …"`
 * (server-side `buildEnrichedPageHint`, which prepends the PAGE-id then appends
 * page-name + URL-slug tokens) — while manual / per-card capture persists the
 * bare `"PAGE-003"`. The Route Mapping grid keys cards by the bare `PAGE-xxx`
 * id, so an exact-equality check (`pageHint === routeId`) only matched the
 * manual case: Vision-matched screenshots silently never appeared on a card
 * (the grid stuck at "0 / N matched" even though capture + auto-match returned
 * 200). Matching on TOKEN ownership covers both shapes and mirrors the server's
 * `pageHintOwnsId`.
 */
export function pageHintOwnsRoute(
  pageHint: string | null | undefined,
  routeId: string,
): boolean {
  if (!pageHint) return false;
  const target = routeId.trim().toUpperCase();
  if (!target) return false;
  // Split on WHITESPACE only — `buildEnrichedPageHint` space-joins its tokens
  // and keeps the `PAGE-003` id intact. Splitting on every non-alphanumeric
  // would shatter the hyphenated id into ["PAGE", "003"] and never match.
  return pageHint
    .trim()
    .split(/\s+/)
    .some((tok) => tok.toUpperCase() === target);
}
