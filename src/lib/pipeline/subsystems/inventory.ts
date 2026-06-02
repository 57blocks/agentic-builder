/**
 * Deterministic PRD inventory extraction (no LLM).
 *
 * Pulls the partition set the decomposer must assign to subsystems — and that
 * the validator's coverage check uses to detect gaps:
 *   - API endpoints: "#### METHOD `/api/v1/...`" headings (multi-method and
 *     multi-path headings are expanded to one "METHOD /path" each).
 *   - Routes: backticked app paths in table rows (NOT /api/* paths).
 *   - Collections: data-dictionary entries "### N.M <identifier>（…）".
 *
 * Extraction is best-effort and shape-tolerant; the decomposer LLM also reads
 * the PRD, so a thin inventory degrades gracefully (fewer coverage assertions).
 */

export interface PrdInventory {
  routes: string[];
  apiEndpoints: string[];
  collections: string[];
}

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

/** "#### POST `/api/v1/auth/login`" → ["POST /api/v1/auth/login"].
 *  "#### GET / POST `/api/v1/x`" → one per method.
 *  "#### POST `/a` & `/b`" → one per path. */
export function extractApiEndpoints(prd: string): string[] {
  const out = new Set<string>();
  const headingRe = /^#{2,4}\s+([A-Z/\s]+?)\s+(`[^`]+`(?:\s*&\s*`[^`]+`)*)\s*$/gm;
  for (const m of prd.matchAll(headingRe)) {
    const methods = m[1]
      .split(/[/\s]+/)
      .map((s) => s.trim().toUpperCase())
      .filter((s) => HTTP_METHODS.includes(s));
    if (methods.length === 0) continue;
    const paths = [...m[2].matchAll(/`([^`]+)`/g)]
      .map((p) => p[1].trim())
      // Real endpoints are absolute `/api/...`. Drop `& `/unlock``-style relative
      // shorthand fragments that share the sibling's prefix.
      .filter((p) => p.startsWith("/api/"));
    for (const method of methods) {
      for (const path of paths) out.add(`${method} ${path}`);
    }
  }
  return [...out].sort();
}

/** App route paths from markdown table rows: `| `/family/cart` | … |`.
 *  Excludes /api/* (those are endpoints) and dynamic-only noise. */
export function extractRoutes(prd: string): string[] {
  const out = new Set<string>();
  const rowRe = /^\|\s*`(\/[^`]+)`\s*\|/gm;
  for (const m of prd.matchAll(rowRe)) {
    const p = m[1].trim();
    if (p.startsWith("/api/")) continue;
    out.add(p);
  }
  return [...out].sort();
}

/** Data collections from the data-dictionary section only.
 *
 *  Scoped to the H2 section whose title names a data model/dictionary (so we
 *  don't grab page specs "### 9.1 AuthPage" or enum tables "### 14.6 channel").
 *  Within that section, captures "### N.M <identifier>" entries whose id is a
 *  camelCase collection name (lowercase-first by convention). */
export function extractCollections(prd: string): string[] {
  const lines = prd.split("\n");
  const isH2 = (l: string) => /^##\s+\S/.test(l) && !/^###/.test(l);
  // Find the data-dictionary H2 section bounds.
  let start = -1;
  let end = lines.length;
  for (let i = 0; i < lines.length; i++) {
    if (
      isH2(lines[i]) &&
      /数据模型|数据字典|data\s*(model|dictionary)/i.test(lines[i])
    ) {
      start = i;
      for (let j = i + 1; j < lines.length; j++) {
        if (isH2(lines[j])) {
          end = j;
          break;
        }
      }
      break;
    }
  }
  if (start === -1) return []; // no data dictionary → collections owned globally anyway
  const out = new Set<string>();
  const re = /^#{3,4}\s+\d+\.\d+\s+([a-z][A-Za-z0-9_]*)/;
  for (let i = start; i < end; i++) {
    const m = lines[i].match(re);
    if (m) out.add(m[1].trim());
  }
  return [...out].sort();
}

export function extractPrdInventory(prd: string): PrdInventory {
  return {
    routes: extractRoutes(prd),
    apiEndpoints: extractApiEndpoints(prd),
    collections: extractCollections(prd),
  };
}
