/**
 * Deterministic PRD requirement-ID backfill.
 *
 * Inserts the IDs the strict PRD-ID gate (prd-id-gate.ts) requires:
 *   - `PAGE-NNN` appended to each untagged §7.1 route-table row, and
 *   - `API-NNN` appended to each untagged §26 endpoint heading line.
 *
 * Purely mechanical (no LLM): the items are enumerable structure, so a
 * deterministic pass is more reliable than rewriting a large PRD with an LLM
 * (no truncation/drift, no collateral edits). Idempotent — numbering continues
 * from the existing max, and already-tagged rows/headings are left untouched, so
 * re-running is safe.
 *
 * Uses the SAME row/heading detection as the gate so backfill ⇒ gate passes.
 */

const PAGE_ID_RE = /\bPAGE-(\d+)\b/;
const API_ID_RE = /\bAPI-(\d+)\b/;
const PAGE_ID_RE_G = /\bPAGE-(\d+)\b/g;
const API_ID_RE_G = /\bAPI-(\d+)\b/g;
const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

export interface BackfillResult {
  prd: string;
  addedPages: number;
  addedEndpoints: number;
}

function isRouteRow(line: string): boolean {
  const m = line.match(/^\|\s*`(\/[^`]+)`\s*\|/);
  return !!m && !m[1].startsWith("/api/");
}

function isEndpointHeading(line: string): boolean {
  const m = line.match(/^#{2,4}\s+([A-Z/\s]+?)\s+`([^`]+)`/);
  if (!m) return false;
  const hasMethod = m[1]
    .split(/[/\s]+/)
    .some((s) => HTTP_METHODS.includes(s.trim().toUpperCase()));
  return hasMethod && m[2].trim().startsWith("/api/");
}

/** Highest existing N for a given id family, so backfill never collides. */
function maxId(text: string, re: RegExp): number {
  let max = 0;
  for (const m of text.matchAll(re)) max = Math.max(max, Number(m[1]));
  return max;
}

function pad(n: number): string {
  return String(n).padStart(3, "0");
}

/** Append an id to a markdown table row, inside the last cell (keeps column count). */
function appendIdToRow(line: string, id: string): string {
  // Trailing "|" (with optional whitespace) → insert " · ID " before it.
  if (/\|\s*$/.test(line)) return line.replace(/\s*\|\s*$/, ` · ${id} |`);
  return `${line} · ${id}`;
}

export function backfillPrdIds(prd: string): BackfillResult {
  const lines = prd.split("\n");
  let pageN = maxId(prd, PAGE_ID_RE_G);
  let apiN = maxId(prd, API_ID_RE_G);
  let addedPages = 0;
  let addedEndpoints = 0;

  const out = lines.map((line) => {
    if (isRouteRow(line) && !PAGE_ID_RE.test(line)) {
      pageN += 1;
      addedPages += 1;
      return appendIdToRow(line, `PAGE-${pad(pageN)}`);
    }
    if (isEndpointHeading(line) && !API_ID_RE.test(line)) {
      apiN += 1;
      addedEndpoints += 1;
      return `${line.replace(/\s*$/, "")} · API-${pad(apiN)}`;
    }
    return line;
  });

  return { prd: out.join("\n"), addedPages, addedEndpoints };
}
