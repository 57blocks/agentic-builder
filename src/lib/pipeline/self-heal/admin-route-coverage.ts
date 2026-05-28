/**
 * Admin-route coverage detector — catches the "frontend calls
 * `/admin/<resource>` but backend has no matching route" class of bugs
 * that produced the F-09 outage (frontend `apiClient.get("/admin/users")`
 * 404'd because every admin URL was housed in domain modules with
 * non-admin paths).
 *
 * Sibling pure function alongside `schema-drift.ts` and
 * `migration-quality.ts`. This file checks the orthogonal question:
 *
 *   "For every literal `apiClient.<method>("/admin/...")` call in
 *    `frontend/src/**`, is there a matching
 *    `router.<method>("/admin/...")` registration in
 *    `backend/src/api/modules/**`?"
 *
 * Detection model — text-based regex over file content:
 *   - No TypeScript compile / no router import.
 *   - One pass per file.
 *   - Path normalisation collapses template-literal interpolations
 *     (`${id}`) and Koa-router param placeholders (`:id`) onto a single
 *     `:param` token so dynamic segments line up regardless of which
 *     side names them.
 *   - HTTP method must match exactly (a backend `POST /admin/users`
 *     does NOT satisfy a frontend `GET /admin/users`).
 *   - We INTENTIONALLY ignore non-admin paths — the L-tier
 *     `admin-aliases` scaffold is the contract surface for `/admin/*`
 *     and these are the only paths that benefit from the alias
 *     indirection.
 *
 * Opt-out — append `// admin-route-coverage-ignore` on the same line as
 * the offending call (used when a project routes admin via a custom
 * gateway or proxies through SSR).
 */

export type AdminRouteCoverageRuleId = "admin-call-without-route";

export interface AdminRouteCoverageFinding {
  rule: AdminRouteCoverageRuleId;
  /** Project-relative path of the frontend file that issued the call. */
  filePath: string;
  /** 1-indexed line number of the call. */
  line: number;
  /** Upper-case HTTP method ("GET" | "POST" | ...). */
  method: string;
  /** Literal URL as it appears in source (template literals preserved). */
  url: string;
  /** Normalised path used for matching (`:param` placeholders). */
  normalisedPath: string;
  /** Short human-readable message embedded in the repair directive. */
  message: string;
}

export interface AdminRouteCoverageFile {
  /** Project-relative path, forward-slash. */
  path: string;
  /** File contents. */
  content: string;
}

export interface AdminRouteCoverageInput {
  /** Frontend source files (`.ts` / `.tsx`) to scan for apiClient calls. */
  frontendFiles: readonly AdminRouteCoverageFile[];
  /** Backend source files (typically `*.routes.ts`) to scan for routes. */
  backendFiles: readonly AdminRouteCoverageFile[];
}

export interface AdminRouteCoverageResult {
  frontendFilesScanned: number;
  backendFilesScanned: number;
  /** Total `/admin/*` frontend calls discovered (matched + unmatched). */
  totalAdminCalls: number;
  /** Total `/admin/*` backend route registrations discovered. */
  totalAdminRoutes: number;
  findings: AdminRouteCoverageFinding[];
}

/** Pragma comment that disables the lint for one call site. */
const IGNORE_PRAGMA = "admin-route-coverage-ignore";

/**
 * Match `apiClient.get("...")`, `apiClient.raw.post('...')`,
 * `apiClient.delete<Foo>(`...`)`, etc. The captures are
 *   [1] = method, [2|3|4] = path string (double / single / backtick).
 */
const FRONTEND_CALL_RE =
  /\bapiClient(?:\.raw)?\s*\.\s*(get|post|put|patch|delete|del)\s*(?:<[^>(]*>)?\s*\(\s*(?:"([^"]+)"|'([^']+)'|`([^`]+)`)/g;

/**
 * Match `router.get("...")`, `apiRouter.post(`...`)`, etc. Captures
 * mirror FRONTEND_CALL_RE so the parsing helper can be shared.
 */
const BACKEND_ROUTE_RE =
  /\b(?:apiRouter|router|adminRouter|aliasRouter)\s*\.\s*(get|post|put|patch|delete|del)\s*\(\s*(?:"([^"]+)"|'([^']+)'|`([^`]+)`)/g;

interface RawHit {
  method: string;
  url: string;
  line: number;
  ignored: boolean;
}

function collectHits(content: string, re: RegExp): RawHit[] {
  const hits: RawHit[] = [];
  // Pre-compute newline offsets so we can map char-index → line cheaply.
  const lineOffsets = computeLineOffsets(content);
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const method = m[1].toLowerCase() === "del" ? "delete" : m[1].toLowerCase();
    const url = m[2] ?? m[3] ?? m[4];
    if (!url) continue;
    const line = offsetToLine(lineOffsets, m.index);
    // Look at the source line — pragma suppresses the call.
    const lineText = sliceLine(content, lineOffsets, line);
    const ignored = lineText.includes(IGNORE_PRAGMA);
    hits.push({ method: method.toUpperCase(), url, line, ignored });
  }
  return hits;
}

/** Convert a raw URL (with `${id}` or `:id`) to a normalised match key. */
export function normaliseAdminPath(url: string): string {
  // Strip query string and trailing slash, replace dynamic segments.
  const base = url.replace(/\?.*$/, "").replace(/\/+$/, "");
  return base
    .replace(/\$\{[^}]+\}/g, ":param")
    .replace(/:[A-Za-z0-9_]+/g, ":param");
}

/** True iff the normalised path starts with `/admin/` (case-insensitive). */
function isAdminPath(normalised: string): boolean {
  return /^\/admin(?:\/|$)/i.test(normalised);
}

function computeLineOffsets(src: string): number[] {
  const offsets: number[] = [0];
  for (let i = 0; i < src.length; i++) {
    if (src.charCodeAt(i) === 10 /* \n */) offsets.push(i + 1);
  }
  return offsets;
}

function offsetToLine(offsets: readonly number[], offset: number): number {
  // Binary search — offsets is monotonically increasing.
  let lo = 0;
  let hi = offsets.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >>> 1;
    if (offsets[mid] <= offset) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1; // 1-indexed
}

function sliceLine(src: string, offsets: readonly number[], line: number): string {
  const start = offsets[line - 1] ?? 0;
  const end = offsets[line] ?? src.length;
  return src.slice(start, end);
}

export function checkAdminRouteCoverage(
  input: AdminRouteCoverageInput,
): AdminRouteCoverageResult {
  // 1. Gather backend `/admin/*` routes — key = `${METHOD} ${normPath}`.
  const backendRoutes = new Set<string>();
  let totalAdminRoutes = 0;
  for (const file of input.backendFiles) {
    const hits = collectHits(file.content, BACKEND_ROUTE_RE);
    for (const h of hits) {
      const norm = normaliseAdminPath(h.url);
      if (!isAdminPath(norm)) continue;
      totalAdminRoutes += 1;
      backendRoutes.add(`${h.method} ${norm}`);
    }
  }

  // 2. Walk frontend calls, emit a finding for every unmatched `/admin/*`.
  const findings: AdminRouteCoverageFinding[] = [];
  let totalAdminCalls = 0;
  for (const file of input.frontendFiles) {
    const hits = collectHits(file.content, FRONTEND_CALL_RE);
    for (const h of hits) {
      const norm = normaliseAdminPath(h.url);
      if (!isAdminPath(norm)) continue;
      totalAdminCalls += 1;
      if (h.ignored) continue;
      if (backendRoutes.has(`${h.method} ${norm}`)) continue;
      findings.push({
        rule: "admin-call-without-route",
        filePath: file.path,
        line: h.line,
        method: h.method,
        url: h.url,
        normalisedPath: norm,
        message: `Frontend calls ${h.method} ${h.url} but no backend route matches \`${h.method} ${norm}\`. Register the alias in backend/src/api/modules/admin-aliases/admin-aliases.routes.ts (router.${h.method.toLowerCase()}("${norm}", requireAuth, requireRole("admin"), <handler>)). Chain requireAuth BEFORE requireRole.`,
      });
    }
  }

  return {
    frontendFilesScanned: input.frontendFiles.length,
    backendFilesScanned: input.backendFiles.length,
    totalAdminCalls,
    totalAdminRoutes,
    findings,
  };
}
