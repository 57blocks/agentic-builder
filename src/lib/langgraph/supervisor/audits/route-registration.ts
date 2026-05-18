import {
  fsRead,
  fsWrite,
  listFiles,
} from "../../tools";
import {
  wireRegistrationsIntoIndex,
  computeRelativeImportPath,
} from "../../route-audit-autofix";
import { pathExistsUnderOutput } from "../shared/output-fs";

export interface RouteRegistrationAudit {
  /** Human-readable lines suitable for feeding into the system prompt. */
  findings: string[];
  /** Modules that have a `*.routes.ts` file but are never wired into index.ts. */
  unregisteredModules: string[];
  /** Structured per-module data — used by the route-audit auto-wire codemod. */
  implementedModules: Array<{
    file: string;
    exportNames: string[];
    primaryExportName: string | null;
    isRegistered: boolean;
  }>;
  /** Detected apiRouter prefix from index.ts (defaults to "/api"). */
  apiRouterPrefix: string;
  /** register*Routes imports in index.ts that don't resolve to a real module. */
  unresolvedRegistrations: string[];
  /** Endpoints declared in API_CONTRACTS.json but no matching route implementation found. */
  missingContractEndpoints: Array<{ method: string; endpoint: string }>;
  /**
   * Endpoints implemented in routes.ts but not present in API_CONTRACTS.json.
   * Warning only — not a hard failure (internal endpoints may legitimately
   * live outside the public contract).
   */
  undeclaredEndpoints: Array<{ method: string; endpoint: string }>;
}

/**
 * Audits backend API route wiring against three sources of truth:
 *   1. Filesystem: what route files actually exist under backend/src/api/modules.
 *   2. Router entry: what register*Routes functions index.ts imports AND calls.
 *   3. Contract: API_CONTRACTS.json endpoints (method + path).
 *
 * Inconsistencies between these three are the #1 cause of "generated project
 * starts but returns 404 on the paths the PRD promised". This audit is
 * deliberately regex-based (not AST): the patterns below match the scaffold
 * template conventions and fail loud when they don't — the LLM then has to
 * close the gaps before integrationVerifyAndFix can pass.
 *
 * Returns an empty result (no findings) if the project has no backend or no
 * api/modules tree, so frontend-only projects are a no-op.
 */
export async function auditApiRouteRegistration(
  outputDir: string,
): Promise<RouteRegistrationAudit> {
  const empty: RouteRegistrationAudit = {
    findings: [],
    unregisteredModules: [],
    implementedModules: [],
    apiRouterPrefix: "/api",
    unresolvedRegistrations: [],
    missingContractEndpoints: [],
    undeclaredEndpoints: [],
  };

  const hasBackend = await pathExistsUnderOutput(
    outputDir,
    "backend/package.json",
  );
  if (!hasBackend) return empty;

  const apiModulesDir = "backend/src/api/modules";
  if (!(await pathExistsUnderOutput(outputDir, apiModulesDir))) return empty;

  const moduleFiles = (await listFiles(apiModulesDir, outputDir)).filter((f) =>
    f.endsWith(".routes.ts"),
  );

  // Implemented modules: map export name → { file, endpoints: [{method, path}] }
  interface ModuleImpl {
    file: string;
    /** All register*Routes export names found in the file (a module may export aliases). */
    exportNames: string[];
    /** Primary export name used for backward-compat reporting. */
    exportName: string | null;
    mountPrefix: string | null;
    endpoints: Array<{ method: string; endpoint: string }>;
  }
  const implemented: ModuleImpl[] = [];

  // Collect ALL register*Routes exports (not just the first one) so modules
  // that export both a canonical name and a backward-compat alias don't get
  // flagged as unregistered when the alias is what index.ts actually calls.
  const exportNameRe =
    /export\s+(?:async\s+)?function\s+(register[A-Z]\w*Routes)\s*\(/g;
  // Match common Koa router variable names: `router`, `apiRouter`,
  // `<feature>Router`, plus inline `new Router().<verb>()`. Generators
  // alternate between mounting a sub-router (`router.get(...)` then
  // `apiRouter.use("/foo", router.routes())`) and binding directly on
  // the parent (`apiRouter.get("/foo", ...)`); both must be picked up.
  const routerVerbRe =
    /\b(?:router|apiRouter|[A-Za-z_$][\w$]*Router)\.(get|post|put|patch|delete|all|options|head)\s*\(\s*["'`]([^"'`]+)["'`]/g;
  const inlineNewRouterRe =
    /new\s+Router\s*\([^)]*\)\.(get|post|put|patch|delete|all|options|head)\s*\(\s*["'`]([^"'`]+)["'`]/g;
  // Form 1: `apiRouter.use("/prefix", router.routes())`  — explicit string in .use()
  const mountPrefixRe =
    /apiRouter\.use\s*\(\s*["'`]([^"'`]+)["'`]\s*,\s*(?:router|[A-Za-z_$][\w$]*Router)\.routes/;
  // Form 2: `new Router({ prefix: "/prefix" })` — prefix in constructor, then
  // `apiRouter.use(router.routes(), ...)` with NO string argument.  This is the
  // pattern Koa codegen uses for autogen/routes.ts and must be detected separately.
  // Previously blind to this, which caused phantom "missing contract" findings.
  const routerCtorPrefixRe =
    /new\s+Router\s*\(\s*\{[^}]*\bprefix\s*:\s*["'`]([^"'`]+)["'`]/;

  for (const rel of moduleFiles) {
    const content = await fsRead(rel, outputDir);
    if (
      content.startsWith("FILE_NOT_FOUND") ||
      content.startsWith("REJECTED")
    ) {
      continue;
    }
    // Collect all register*Routes exports (reset lastIndex for global re-use).
    exportNameRe.lastIndex = 0;
    const exportNames: string[] = [];
    let enm: RegExpExecArray | null;
    while ((enm = exportNameRe.exec(content)) !== null) {
      exportNames.push(enm[1]);
    }
    const mountMatch = content.match(mountPrefixRe);
    // Fall back to constructor-based prefix when the .use("/prefix", ...) form
    // is absent — i.e. the sub-router was created with `new Router({ prefix })`.
    const ctorPrefixMatch = mountMatch
      ? null
      : content.match(routerCtorPrefixRe);
    const endpoints: Array<{ method: string; endpoint: string }> = [];
    const seen = new Set<string>();
    const pushEndpoint = (method: string, endpoint: string): void => {
      const key = `${method.toUpperCase()} ${endpoint}`;
      if (seen.has(key)) return;
      seen.add(key);
      endpoints.push({ method: method.toUpperCase(), endpoint });
    };
    let vm: RegExpExecArray | null;
    routerVerbRe.lastIndex = 0;
    while ((vm = routerVerbRe.exec(content)) !== null) {
      pushEndpoint(vm[1], vm[2]);
    }
    inlineNewRouterRe.lastIndex = 0;
    while ((vm = inlineNewRouterRe.exec(content)) !== null) {
      pushEndpoint(vm[1], vm[2]);
    }
    // If the file binds directly on `apiRouter` (no sub-router .use),
    // do not prepend a mountPrefix later — endpoints already carry full
    // paths relative to apiPrefix. Detect this by: any `apiRouter.<verb>`
    // call exists.
    const bindsDirectlyOnApiRouter =
      /\bapiRouter\.(get|post|put|patch|delete|all|options|head)\s*\(/.test(
        content,
      );
    implemented.push({
      file: rel,
      exportNames,
      exportName: exportNames[0] ?? null,
      mountPrefix: bindsDirectlyOnApiRouter
        ? null
        : mountMatch
          ? mountMatch[1]
          : ctorPrefixMatch
            ? ctorPrefixMatch[1]
            : null,
      endpoints,
    });
  }

  // Parse index.ts: which register*Routes are imported AND called.
  const indexPath = `${apiModulesDir}/index.ts`;
  const indexContent = await fsRead(indexPath, outputDir);
  const indexExists =
    !indexContent.startsWith("FILE_NOT_FOUND") &&
    !indexContent.startsWith("REJECTED");

  const registeredNames = new Set<string>();
  const importedNames = new Set<string>();
  const apiPrefixMatch = indexContent.match(
    /new\s+Router\s*\(\s*\{[^}]*\bprefix\s*:\s*["'`]([^"'`]+)["'`]/,
  );
  const apiPrefix = apiPrefixMatch ? apiPrefixMatch[1] : "/api";

  if (indexExists) {
    const importLineRe =
      /import\s*\{([^}]*)\}\s*from\s*["'][^"']*\/([\w-]+)\/\2\.routes["']/g;
    let im: RegExpExecArray | null;
    while ((im = importLineRe.exec(indexContent)) !== null) {
      for (const n of im[1].split(",")) {
        const name = n
          .trim()
          .split(/\s+as\s+/)[0]
          .trim();
        if (name) importedNames.add(name);
      }
    }
    // Also accept flat-form imports like `from "./health/health.routes"`.
    const flatImportRe =
      /import\s*\{([^}]*)\}\s*from\s*["'][^"']*\.routes["']/g;
    let fm: RegExpExecArray | null;
    while ((fm = flatImportRe.exec(indexContent)) !== null) {
      for (const n of fm[1].split(",")) {
        const name = n
          .trim()
          .split(/\s+as\s+/)[0]
          .trim();
        if (name) importedNames.add(name);
      }
    }
    // Called registrations: `registerFooRoutes(apiRouter)`
    const callRe = /(register[A-Z]\w*Routes)\s*\(/g;
    let cm: RegExpExecArray | null;
    while ((cm = callRe.exec(indexContent)) !== null) {
      registeredNames.add(cm[1]);
    }
  }

  // Find modules where NONE of their register*Routes exports are called in index.ts.
  // A module that exports both a canonical name AND a backward-compat alias is
  // considered registered if ANY of its exports is called.
  const unregisteredModules: string[] = [];
  for (const mod of implemented) {
    if (mod.exportNames.length === 0) continue;
    const anyRegistered = mod.exportNames.some((n) => registeredNames.has(n));
    if (!anyRegistered) {
      const primary = mod.exportNames[0];
      unregisteredModules.push(
        `${mod.file}: exports "${primary}" but index.ts never calls it.`,
      );
    }
  }

  // Imports referencing a register*Routes that doesn't exist in any routes.ts.
  const knownExports = new Set(implemented.flatMap((m) => m.exportNames));
  const unresolvedRegistrations: string[] = [];
  for (const name of importedNames) {
    if (!knownExports.has(name)) {
      unresolvedRegistrations.push(
        `index.ts imports "${name}" but no routes.ts defines that export.`,
      );
    }
  }

  // Compare against API_CONTRACTS.json.
  const missingContractEndpoints: Array<{ method: string; endpoint: string }> =
    [];
  const undeclaredEndpoints: Array<{ method: string; endpoint: string }> = [];

  const contractRaw = await fsRead("API_CONTRACTS.json", outputDir);
  const hasContract =
    !contractRaw.startsWith("FILE_NOT_FOUND") &&
    !contractRaw.startsWith("REJECTED");

  if (hasContract) {
    let contracts: Array<{ method?: string; endpoint?: string }> = [];
    try {
      const parsed = JSON.parse(contractRaw);
      if (Array.isArray(parsed)) {
        contracts = parsed as Array<{ method?: string; endpoint?: string }>;
      }
    } catch {
      // Ignore malformed contracts — earlier phases should have rejected them.
    }

    // Normalise implemented endpoints: method + full path = apiPrefix + mount + route.
    const implementedPaths = new Set<string>();
    for (const mod of implemented) {
      for (const ep of mod.endpoints) {
        const fullPath = joinApiPath(
          apiPrefix,
          mod.mountPrefix ?? "",
          ep.endpoint,
        );
        implementedPaths.add(`${ep.method} ${fullPath}`);
      }
    }

    const contractKeys = new Set<string>();
    for (const c of contracts) {
      if (!c.method || !c.endpoint) continue;
      // Defensive: contributors sometimes accidentally include /api/health in
      // API_CONTRACTS — strip it so it can't double-count.
      if (isContractAuditExempt(c.method, c.endpoint)) continue;
      const key = `${c.method.toUpperCase()} ${normaliseApiPath(c.endpoint)}`;
      contractKeys.add(key);
      if (!routeMatches(key, implementedPaths)) {
        missingContractEndpoints.push({
          method: c.method.toUpperCase(),
          endpoint: c.endpoint,
        });
      }
    }

    for (const key of implementedPaths) {
      if (!routeMatches(key, contractKeys)) {
        const [method, endpoint] = key.split(" ");
        // The scaffold-provided `/api/health` probe is intentionally NOT in
        // API_CONTRACTS.json (it's infra, not a PRD-driven endpoint). Don't
        // ding it as "undeclared" — that just creates noisy findings the
        // worker can't resolve. See CODEGEN_HARDENING_PLAN.md §4.x.
        if (isContractAuditExempt(method, endpoint)) continue;
        undeclaredEndpoints.push({ method, endpoint });
      }
    }
  }

  const findings: string[] = [];
  if (unregisteredModules.length > 0) {
    findings.push("## Unregistered backend modules");
    findings.push(...unregisteredModules.map((l) => `- ${l}`));
  }
  if (unresolvedRegistrations.length > 0) {
    findings.push("## Dangling register*Routes imports in index.ts");
    findings.push(...unresolvedRegistrations.map((l) => `- ${l}`));
  }
  if (missingContractEndpoints.length > 0) {
    findings.push("## API_CONTRACTS endpoints with no matching implementation");
    findings.push(
      ...missingContractEndpoints.map((e) => `- ${e.method} ${e.endpoint}`),
    );
  }
  if (undeclaredEndpoints.length > 0) {
    findings.push(
      "## Implemented endpoints not declared in API_CONTRACTS (verify intent)",
    );
    findings.push(
      ...undeclaredEndpoints.map((e) => `- ${e.method} ${e.endpoint}`),
    );
  }

  return {
    findings,
    unregisteredModules,
    implementedModules: implemented.map((m) => ({
      file: m.file,
      exportNames: m.exportNames,
      primaryExportName: m.exportName,
      isRegistered: m.exportNames.some((n) => registeredNames.has(n)),
    })),
    apiRouterPrefix: apiPrefix,
    unresolvedRegistrations,
    missingContractEndpoints,
    undeclaredEndpoints,
  };
}

function normaliseApiPath(p: string): string {
  const withLeading = p.startsWith("/") ? p : `/${p}`;
  return withLeading.replace(/\/+/g, "/").replace(/\/$/, "") || "/";
}

/**
 * Endpoints that are infrastructure-provided by the scaffold and intentionally
 * absent from API_CONTRACTS.json. They MUST be skipped from both the
 * "undeclared endpoint" finding (in `auditApiRouteRegistration`) and the
 * runtime smoke gate's auth-required-route assertions.
 *
 * Currently exempt:
 *   - `GET /api/health` and `GET /health` (Playwright webServer probe).
 */
const CONTRACT_AUDIT_EXEMPT_ENDPOINTS: ReadonlyArray<{
  method: string;
  pathRe: RegExp;
}> = [{ method: "GET", pathRe: /^\/(?:api\/)?health\/?$/ }];

export function isContractAuditExempt(
  method: string,
  endpoint: string,
): boolean {
  const m = method.toUpperCase();
  const p = normaliseApiPath(endpoint);
  return CONTRACT_AUDIT_EXEMPT_ENDPOINTS.some(
    (rule) => rule.method === m && rule.pathRe.test(p),
  );
}

function joinApiPath(prefix: string, mount: string, route: string): string {
  const parts = [prefix, mount, route]
    .filter((s) => s && s.length > 0)
    .map((s) => (s.startsWith("/") ? s : `/${s}`))
    .join("");
  return normaliseApiPath(parts);
}

/**
 * Match a route key ("METHOD /api/foo/:id") against a set, treating path
 * parameters (`:id`, `:userId`) as wildcards so that `/api/users/:id` in the
 * contract matches `/api/users/:userId` in code (and vice versa).
 */
function routeMatches(key: string, candidates: Set<string>): boolean {
  if (candidates.has(key)) return true;
  const [method, path] = key.split(" ", 2);
  if (!path) return false;
  const pattern = new RegExp(
    "^" + path.replace(/:\w+/g, ":[A-Za-z0-9_]+") + "$",
  );
  for (const candidate of candidates) {
    const [cMethod, cPath] = candidate.split(" ", 2);
    if (cMethod !== method || !cPath) continue;
    if (pattern.test(cPath)) return true;
    const reverse = new RegExp(
      "^" + cPath.replace(/:\w+/g, ":[A-Za-z0-9_]+") + "$",
    );
    if (reverse.test(path)) return true;
  }
  return false;
}

export interface ContractCompletenessResult {
  /** Unique parent→child relationships extracted from Sequelize models. */
  inferredRelationships: Array<{
    parent: string;
    child: string;
    file: string;
  }>;
  /**
   * Relationships where the scoped-list endpoint (GET /api/parents/:id/children)
   * is absent from API_CONTRACTS.json AND no acceptable alternative exists.
   * Only HARD FAIL cases — warnings are separated into `warnOnlyEndpoints`.
   */
  missingScopedEndpoints: Array<{
    parent: string;
    child: string;
    expectedPath: string;
    reason: string;
  }>;
  /**
   * Relationships that look "missing" at first glance but are likely served
   * via a /me/... or flat filtered endpoint pattern. Reported as WARN only
   * and do NOT block report_done(pass).
   */
  warnOnlyEndpoints: Array<{
    parent: string;
    child: string;
    expectedPath: string;
    reason: string;
  }>;
  /**
   * Human-readable findings lines ready to paste into an LLM system prompt or
   * repair-log payload. Includes both HARD and WARN items, each labelled.
   */
  findings: string[];
  /** True when only warnOnly items remain — does not block report_done. */
  warnOnly: boolean;
}

/**
 * Audits the API contract against Sequelize models to catch "the contract
 * omits scoped endpoints the data model obviously requires" — e.g. Project
 * hasMany Task but no `GET /api/projects/:id/tasks` in API_CONTRACTS.json.
 *
 * auditApiRouteRegistration only checks consistency between the contract and
 * the implementation. When the contract itself under-specifies the domain,
 * both ends look "consistent" and the bug ships. This audit derives the
 * expected endpoint set from a stronger source of truth (the ORM models)
 * and surfaces the delta.
 *
 * Regex-based on purpose — AST adds a Sequelize-typed dependency surface and
 * the scaffold conventions are narrow enough that regex is precise.
 */
export async function auditContractCompleteness(
  outputDir: string,
): Promise<ContractCompletenessResult> {
  const empty: ContractCompletenessResult = {
    inferredRelationships: [],
    missingScopedEndpoints: [],
    warnOnlyEndpoints: [],
    findings: [],
    warnOnly: true,
  };

  if (!(await pathExistsUnderOutput(outputDir, "backend/package.json"))) {
    return empty;
  }
  const modelsDir = "backend/src/models";
  if (!(await pathExistsUnderOutput(outputDir, modelsDir))) return empty;

  const modelFiles = (await listFiles(modelsDir, outputDir)).filter(
    (f) => /\.(ts|js)$/.test(f) && !f.includes("node_modules"),
  );

  // ── 1. Extract Sequelize hasMany / belongsTo relationships ───────────────
  // hasMany: `Parent.hasMany(Child[, opts])` — parent "1" → child "many"
  // belongsTo: `Child.belongsTo(Parent[, opts])` — same relationship, other side
  const hasManyRe =
    /([A-Z][A-Za-z0-9_]*)\s*\.\s*hasMany\s*\(\s*([A-Z][A-Za-z0-9_]*)/g;
  const belongsToRe =
    /([A-Z][A-Za-z0-9_]*)\s*\.\s*belongsTo\s*\(\s*([A-Z][A-Za-z0-9_]*)/g;

  const unique = new Map<
    string,
    { parent: string; child: string; file: string }
  >();
  for (const rel of modelFiles) {
    const content = await fsRead(rel, outputDir);
    if (
      content.startsWith("FILE_NOT_FOUND") ||
      content.startsWith("REJECTED")
    ) {
      continue;
    }
    let m: RegExpExecArray | null;
    hasManyRe.lastIndex = 0;
    while ((m = hasManyRe.exec(content)) !== null) {
      const key = `${m[1]}->${m[2]}`;
      if (!unique.has(key)) {
        unique.set(key, { parent: m[1], child: m[2], file: rel });
      }
    }
    belongsToRe.lastIndex = 0;
    while ((m = belongsToRe.exec(content)) !== null) {
      // m[1] = child, m[2] = parent
      const key = `${m[2]}->${m[1]}`;
      if (!unique.has(key)) {
        unique.set(key, { parent: m[2], child: m[1], file: rel });
      }
    }
  }

  const relationships = [...unique.values()];
  if (relationships.length === 0) {
    return { ...empty, inferredRelationships: [] };
  }

  // ── 2. Load API_CONTRACTS.json ──────────────────────────────────────────
  const contractRaw = await fsRead("API_CONTRACTS.json", outputDir);
  if (
    contractRaw.startsWith("FILE_NOT_FOUND") ||
    contractRaw.startsWith("REJECTED")
  ) {
    return { ...empty, inferredRelationships: relationships };
  }

  let contracts: Array<{ method?: string; endpoint?: string }> = [];
  try {
    const parsed = JSON.parse(contractRaw);
    if (Array.isArray(parsed)) {
      contracts = parsed as Array<{ method?: string; endpoint?: string }>;
    }
  } catch {
    return { ...empty, inferredRelationships: relationships };
  }

  const declaredSet = new Set<string>();
  for (const c of contracts) {
    if (typeof c.method !== "string" || typeof c.endpoint !== "string") {
      continue;
    }
    declaredSet.add(
      `${c.method.toUpperCase()} ${normaliseApiPath(c.endpoint)}`,
    );
  }

  /**
   * Find the plural path segment the contract uses for a model, by looking at
   * its flat list endpoint. If the contract declares `GET /api/tasks`, the
   * child plural for model "Task" is "tasks". Falls back to lowercased name + "s"
   * only when no flat endpoint exists at all (so we still give LLM a hint).
   */
  const flatSegmentFor = (modelName: string): string | null => {
    const modelLower = modelName.toLowerCase();
    for (const c of contracts) {
      if (c.method?.toUpperCase() !== "GET") continue;
      if (!c.endpoint) continue;
      const ep = normaliseApiPath(c.endpoint);
      const match = ep.match(/^\/api\/([^/]+)$/);
      if (!match) continue;
      const segment = match[1].toLowerCase();
      // Accept segment if it starts with the model's lowercase name (projects,
      // tasks, users, etc.) — tolerant of pluralisation variance.
      if (
        segment === modelLower ||
        segment === `${modelLower}s` ||
        segment === `${modelLower}es` ||
        segment === modelLower.replace(/y$/, "ies") ||
        segment.startsWith(modelLower)
      ) {
        return match[1];
      }
    }
    return null;
  };

  // ── 3. For each relationship, check scoped endpoint is declared ─────────
  const hardMissing: ContractCompletenessResult["missingScopedEndpoints"] = [];
  const warnOnly: ContractCompletenessResult["warnOnlyEndpoints"] = [];

  for (const rel of relationships) {
    const parentSegment = flatSegmentFor(rel.parent);
    const childSegment = flatSegmentFor(rel.child);

    // When the parent has no flat list endpoint, the scoped endpoint is
    // ambiguous — downgrade to WARN rather than blocking the build.
    if (!parentSegment || !childSegment) {
      warnOnly.push({
        parent: rel.parent,
        child: rel.child,
        expectedPath: `GET /api/{${rel.parent.toLowerCase()}s}/:id/{${rel.child.toLowerCase()}s}`,
        reason: `Model relationship ${rel.parent}.hasMany(${rel.child}) found in ${rel.file}, but ${!parentSegment ? "parent" : "child"} has no flat /api list endpoint to derive the plural segment from. Consider adding a filtered endpoint or a /me/${rel.child.toLowerCase()}s pattern.`,
      });
      continue;
    }

    const expectedPattern = new RegExp(
      `^/api/${parentSegment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/:\\w+/${childSegment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
    );
    const hasScoped = [...declaredSet].some((key) => {
      if (!key.startsWith("GET ")) return false;
      return expectedPattern.test(key.slice(4));
    });

    if (hasScoped) continue;

    // Check for acceptable /me/<child> pattern (e.g. GET /api/users/me/interests).
    // Apps frequently serve user-owned resources via /me/... instead of a full
    // scoped path — both are valid designs; treat /me pattern as satisfying the
    // completeness requirement.
    const childLower = childSegment.toLowerCase();
    const meAlternatives = [
      `/api/users/me/${childLower}`,
      `/api/${parentSegment}/me/${childLower}`,
      `/api/me/${childLower}`,
    ];
    const hasMeAlternative = meAlternatives.some((alt) =>
      [...declaredSet].some(
        (key) => key.startsWith("GET ") && key.slice(4) === alt,
      ),
    );
    if (hasMeAlternative) continue;

    // Also accept if the child has a flat filtered endpoint (e.g. GET /api/alerts
    // filtered by auth user satisfies User.hasMany(Alert)).
    const hasChildFlat = [...declaredSet].some(
      (key) =>
        key.startsWith("GET ") &&
        (key === `GET /api/${childLower}` ||
          key === `GET /api/${childSegment}`),
    );
    if (hasChildFlat) {
      // Flat child endpoint exists — likely filtered by auth. Downgrade to WARN.
      warnOnly.push({
        parent: rel.parent,
        child: rel.child,
        expectedPath: `GET /api/${parentSegment}/:id/${childSegment}`,
        reason: `A flat GET /api/${childSegment} endpoint exists (auth-filtered pattern). If that endpoint already returns only the current user's ${rel.child} records, the scoped endpoint is redundant. Otherwise add it.`,
      });
      continue;
    }

    hardMissing.push({
      parent: rel.parent,
      child: rel.child,
      expectedPath: `GET /api/${parentSegment}/:id/${childSegment}`,
      reason: `Model relationship ${rel.parent}.hasMany(${rel.child}) implies this scoped-list endpoint, which is missing from API_CONTRACTS.json with no /me/... alternative.`,
    });
  }

  const findings: string[] = [];
  if (hardMissing.length > 0) {
    findings.push(
      "## Contract completeness: missing scoped-list endpoints [HARD FAIL — implement these]",
    );
    for (const m of hardMissing) {
      findings.push(`- ${m.expectedPath}`);
      findings.push(`  reason: ${m.reason}`);
    }
  }
  if (warnOnly.length > 0) {
    findings.push(
      "## Contract completeness: advisory endpoints [WARN only — review but do not block]",
    );
    for (const w of warnOnly) {
      findings.push(`- ${w.expectedPath} (advisory)`);
      findings.push(`  note: ${w.reason}`);
    }
  }

  return {
    inferredRelationships: relationships,
    missingScopedEndpoints: hardMissing,
    warnOnlyEndpoints: warnOnly,
    findings,
    warnOnly: hardMissing.length === 0,
  };
}

/**
 * Programmatically append stub contract entries for scoped-list endpoints
 * that `auditContractCompleteness` flagged as missing.
 *
 * Feeding these into `API_CONTRACTS.json` BEFORE the backend worker phase
 * means downstream codegen sees a complete contract and implements the
 * missing endpoints naturally — instead of the LLM reading "you forgot X"
 * during the late integration loop and potentially stalling on it.
 *
 * Idempotent: skips entries whose `METHOD /path` already exists, and skips
 * entries whose `expectedPath` still contains `{...}` placeholders (meaning
 * the audit couldn't resolve a plural segment and it's not safe to synthesize).
 */
export async function autoAppendMissingScopedEndpoints(
  outputDir: string,
  missing: ContractCompletenessResult["missingScopedEndpoints"],
): Promise<{ added: string[]; skipped: string[] }> {
  const added: string[] = [];
  const skipped: string[] = [];
  if (missing.length === 0) return { added, skipped };

  const contractPath = "API_CONTRACTS.json";
  const raw = await fsRead(contractPath, outputDir);
  if (raw.startsWith("FILE_NOT_FOUND") || raw.startsWith("REJECTED")) {
    return { added, skipped: missing.map((m) => m.expectedPath) };
  }

  let parsed: Array<Record<string, unknown>>;
  try {
    const json = JSON.parse(raw);
    if (!Array.isArray(json)) {
      return { added, skipped: missing.map((m) => m.expectedPath) };
    }
    parsed = json as Array<Record<string, unknown>>;
  } catch {
    return { added, skipped: missing.map((m) => m.expectedPath) };
  }

  const existing = new Set<string>();
  for (const c of parsed) {
    if (typeof c.method === "string" && typeof c.endpoint === "string") {
      existing.add(`${c.method.toUpperCase()} ${normaliseApiPath(c.endpoint)}`);
    }
  }

  for (const m of missing) {
    const [methodRaw, pathRaw] = m.expectedPath.split(" ", 2);
    if (!methodRaw || !pathRaw) {
      skipped.push(m.expectedPath);
      continue;
    }
    // Skip unresolved placeholder paths like "GET /api/{users}/:id/{tasks}".
    if (pathRaw.includes("{") || pathRaw.includes("}")) {
      skipped.push(
        `${m.expectedPath} (unresolved plural — fix flat endpoints first)`,
      );
      continue;
    }
    const method = methodRaw.toUpperCase();
    const normPath = normaliseApiPath(pathRaw);
    if (existing.has(`${method} ${normPath}`)) {
      skipped.push(`${m.expectedPath} (already present)`);
      continue;
    }
    const segMatch = normPath.match(/^\/api\/([^/]+)\/:\w+\/([^/]+)$/);
    const parentSeg = segMatch?.[1] ?? m.parent.toLowerCase();
    const childSeg = segMatch?.[2] ?? m.child.toLowerCase();
    parsed.push({
      service: parentSeg,
      endpoint: normPath,
      method,
      requestSchema:
        "params: { id: string }; query?: { limit?: number; offset?: number }",
      responseSchema: `${m.child}Dto[]`,
      auth: "bearer",
      description: `List all ${childSeg} belonging to the ${m.parent.toLowerCase()} identified by :id.`,
    });
    existing.add(`${method} ${normPath}`);
    added.push(`${method} ${normPath}`);
  }

  if (added.length === 0) return { added, skipped };

  // Re-assign sequential ids so the contract file stays consistent with the
  // pattern `API-NNN` that `generateApiContracts` establishes.
  const withIds = parsed.map((item, i) => ({
    ...item,
    id: `API-${String(i + 1).padStart(3, "0")}`,
  }));
  await fsWrite(contractPath, JSON.stringify(withIds, null, 2), outputDir);
  return { added, skipped };
}

export interface RouteAutoRepairResult {
  appliedAny: boolean;
  wired: string[];
  skippedWires: Array<{ exportName: string; reason: string }>;
}

/**
 * Deterministic preflight repair: for every `*.routes.ts` whose
 * `register<X>Routes` export is not called in
 * `backend/src/api/modules/index.ts`, append the matching `import` + call
 * to the aggregator. Caller MUST re-run `auditApiRouteRegistration` after
 * any successful repair so downstream telemetry + system-prompt blocks
 * reflect the post-repair state.
 *
 * An earlier version also rewrote the apiRouter prefix when contracts
 * used `/api/vN` but `index.ts` used `/api`. That codemod was removed
 * after the replay harness revealed that most real backends inject the
 * `/v1/...` segment via a SUB-router prefix
 * (`new Router({ prefix: "/v1/foo" })`) inside the routes file —
 * bumping the apiRouter prefix to `/api/v1` would have produced
 * double-versioned paths like `/api/v1/v1/foo`. The audit parser was
 * fixed instead to recognize sub-router prefixes, which addresses the
 * same symptom (phantom "missing contract" findings) without the
 * regression risk.
 */
export async function autoRepairRouteRegistration(
  outputDir: string,
  audit: RouteRegistrationAudit,
): Promise<RouteAutoRepairResult> {
  const indexPath = "backend/src/api/modules/index.ts";
  const indexRaw = await fsRead(indexPath, outputDir);
  if (
    indexRaw.startsWith("FILE_NOT_FOUND") ||
    indexRaw.startsWith("REJECTED")
  ) {
    return { appliedAny: false, wired: [], skippedWires: [] };
  }

  const toWire = audit.implementedModules
    .filter((m) => !m.isRegistered && m.primaryExportName !== null)
    .map((m) => ({
      exportName: m.primaryExportName as string,
      importPath: computeRelativeImportPath(indexPath, m.file),
    }));
  if (toWire.length === 0) {
    return { appliedAny: false, wired: [], skippedWires: [] };
  }

  const r = wireRegistrationsIntoIndex(indexRaw, toWire);
  if (r.wired.length === 0) {
    return { appliedAny: false, wired: [], skippedWires: r.skipped };
  }
  await fsWrite(indexPath, r.content, outputDir);
  return { appliedAny: true, wired: r.wired, skippedWires: r.skipped };
}
