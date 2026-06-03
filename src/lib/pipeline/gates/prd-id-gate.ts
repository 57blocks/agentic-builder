/**
 * Strict PRD requirement-ID gate.
 *
 * The downstream pipeline (coverage gates, incremental rerun, per-domain task
 * breakdown, feature-checklist audit) keys on requirement IDs. A PRD that lacks
 * them (e.g. one reverse-engineered from a mockup) silently weakens every one of
 * those. This gate enforces, STRICTLY, that:
 *
 *   - every API endpoint defined in §26 (`#### METHOD /path`) carries an `API-NNN`
 *     id on its heading line, and
 *   - every app route in the §7.1 route table (`| `/path` | … |`) carries a
 *     `PAGE-NNN` id on its row.
 *
 * Runs after PRD generation. On failure the pipeline backfills the IDs (LLM)
 * and re-runs the gate; if it still fails, downstream execution is blocked.
 *
 * Pure (no IO / no LLM). The id PLACEMENT convention here is exactly what the
 * backfill must produce.
 */

const PAGE_ID_RE = /\bPAGE-\d+\b/;
const API_ID_RE = /\bAPI-\d+\b/;
const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

export interface PrdIdGateResult {
  passed: boolean;
  totalPages: number;
  taggedPages: number;
  /** Route paths (from §7.1) with no PAGE-NNN id on their row. */
  untaggedPages: string[];
  totalEndpoints: number;
  taggedEndpoints: number;
  /** Endpoint headings (from §26) with no API-NNN id on their heading line. */
  untaggedEndpoints: string[];
}

/** A markdown table row whose first cell is a backticked app route (not /api/*). */
function routeRowPath(line: string): string | null {
  const m = line.match(/^\|\s*`(\/[^`]+)`\s*\|/);
  if (!m) return null;
  const p = m[1].trim();
  if (p.startsWith("/api/")) return null;
  return p;
}

/** An §26-style endpoint heading line → its "METHOD /path" label (first method+path). */
function endpointHeading(line: string): string | null {
  const m = line.match(/^#{2,4}\s+([A-Z/\s]+?)\s+`([^`]+)`/);
  if (!m) return null;
  const method = m[1]
    .split(/[/\s]+/)
    .map((s) => s.trim().toUpperCase())
    .find((s) => HTTP_METHODS.includes(s));
  const path = m[2].trim();
  if (!method || !path.startsWith("/api/")) return null;
  return `${method} ${path}`;
}

export function runPrdIdGate(prd: string): PrdIdGateResult {
  const lines = prd.split("\n");
  const untaggedPages: string[] = [];
  const untaggedEndpoints: string[] = [];
  let totalPages = 0;
  let totalEndpoints = 0;

  for (const line of lines) {
    const route = routeRowPath(line);
    if (route) {
      totalPages += 1;
      if (!PAGE_ID_RE.test(line)) untaggedPages.push(route);
      continue;
    }
    const ep = endpointHeading(line);
    if (ep) {
      totalEndpoints += 1;
      if (!API_ID_RE.test(line)) untaggedEndpoints.push(ep);
    }
  }

  return {
    passed: untaggedPages.length === 0 && untaggedEndpoints.length === 0,
    totalPages,
    taggedPages: totalPages - untaggedPages.length,
    untaggedPages,
    totalEndpoints,
    taggedEndpoints: totalEndpoints - untaggedEndpoints.length,
    untaggedEndpoints,
  };
}

/** One-line human summary for logs / gate evidence. */
export function summarizePrdIdGate(r: PrdIdGateResult): string {
  return `PRD-ID gate: pages ${r.taggedPages}/${r.totalPages} tagged, endpoints ${r.taggedEndpoints}/${r.totalEndpoints} tagged${r.passed ? " — PASS" : " — FAIL"}`;
}
