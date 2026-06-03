/**
 * Auto-generates stub route files for API contract endpoints that have no
 * backend implementation. Called during IntegrationVerifyFix preflight when
 * the route-registration audit finds `missingContractEndpoints`.
 *
 * Strategy:
 *  1. Group missing endpoints by their first path segment (module name).
 *  2. For each module group, write a `{module}-stubs.routes.ts` file under
 *     `backend/src/api/modules/{module}/` with 501 placeholder handlers.
 *  3. Inject import + registration into `modules/index.ts` if not present.
 *
 * The verify-fix agent then only has to implement the 501 stubs — it doesn't
 * need to figure out what files to create or where to register them.
 */

import fs from "fs/promises";
import path from "path";

export interface MissingEndpoint {
  method: string;
  endpoint: string;
}

export interface RouteStubGroup {
  moduleName: string;
  /** Relative path under outputDir (e.g. "backend/src/api/modules/teacher/teacher-stubs.routes.ts") */
  stubFile: string;
  endpoints: MissingEndpoint[];
  /** Whether the stub file was freshly created (false = already existed) */
  created: boolean;
}

export interface GenerateMissingRouteStubsResult {
  groups: RouteStubGroup[];
  indexPatched: boolean;
}

const API_PREFIX_RE = /^\/api\/v\d+/;
const MODULES_DIR = "backend/src/api/modules";
const INDEX_REL = `${MODULES_DIR}/index.ts`;

function stripApiPrefix(endpoint: string): string {
  return endpoint.replace(API_PREFIX_RE, "");
}

function extractModuleName(strippedPath: string): string {
  return strippedPath.split("/").filter(Boolean)[0] ?? "misc";
}

function toPascal(s: string): string {
  return s
    .split(/[-_]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
}

function stubFunctionName(moduleName: string): string {
  return `register${toPascal(moduleName)}StubRoutes`;
}

function stubFileName(moduleName: string): string {
  return `${moduleName}-stubs.routes.ts`;
}

function buildStubFileContent(
  moduleName: string,
  endpoints: MissingEndpoint[],
): string {
  const fnName = stubFunctionName(moduleName);
  const lines: string[] = [
    `import type Router from "@koa/router";`,
    `import { requireAuth } from "../../middlewares/requireAuth";`,
    ``,
    `/**`,
    ` * AUTO-GENERATED STUBS — created by missing-route-stubs self-heal.`,
    ` * Each handler returns 501 until implemented.`,
    ` * TODO: replace each placeholder with real business logic.`,
    ` */`,
    `export function ${fnName}(router: Router): void {`,
  ];

  for (const ep of endpoints) {
    const stripped = stripApiPrefix(ep.endpoint);
    const method = ep.method.toLowerCase();
    lines.push(
      `  router.${method}("${stripped}", requireAuth, async (ctx) => {`,
      `    ctx.status = 501;`,
      `    ctx.body = { error: "Not implemented — ${ep.method} ${ep.endpoint}" };`,
      `  });`,
      ``,
    );
  }

  lines.push(`}`);
  return lines.join("\n");
}

export async function generateMissingRouteStubs(
  outputDir: string,
  missingEndpoints: MissingEndpoint[],
): Promise<GenerateMissingRouteStubsResult> {
  if (missingEndpoints.length === 0) {
    return { groups: [], indexPatched: false };
  }

  // Group by module name
  const byModule = new Map<string, MissingEndpoint[]>();
  for (const ep of missingEndpoints) {
    const mod = extractModuleName(stripApiPrefix(ep.endpoint));
    if (!byModule.has(mod)) byModule.set(mod, []);
    byModule.get(mod)!.push(ep);
  }

  const groups: RouteStubGroup[] = [];

  for (const [moduleName, endpoints] of byModule.entries()) {
    const relPath = `${MODULES_DIR}/${moduleName}/${stubFileName(moduleName)}`;
    const absPath = path.join(outputDir, relPath);

    await fs.mkdir(path.dirname(absPath), { recursive: true });

    let created = false;
    try {
      await fs.access(absPath);
      // File already exists — don't overwrite; agent may have partial impl
    } catch {
      await fs.writeFile(absPath, buildStubFileContent(moduleName, endpoints), "utf8");
      created = true;
    }

    groups.push({ moduleName, stubFile: relPath, endpoints, created });
  }

  // Patch modules/index.ts
  const indexAbs = path.join(outputDir, INDEX_REL);
  let indexPatched = false;

  try {
    let idx = await fs.readFile(indexAbs, "utf8");

    for (const g of groups) {
      if (!g.created) continue; // stub already existed; assume already registered
      const fnName = stubFunctionName(g.moduleName);
      if (idx.includes(fnName)) continue; // already registered

      const importLine = `import { ${fnName} } from "./${g.moduleName}/${g.moduleName}-stubs.routes";`;
      const registerLine = `${fnName}(apiRouter);`;

      // Insert import after last existing import line
      idx = idx.replace(/^(import [^\n]+\n)(?!\s*import)/m, `$1${importLine}\n`);

      // Insert registration call after the last register*Routes(apiRouter) line
      const lastRegisterRe = /(register\w+\(apiRouter\);)(\s*\n(?!register))/;
      if (lastRegisterRe.test(idx)) {
        idx = idx.replace(lastRegisterRe, `$1\n${registerLine}$2`);
      } else {
        // Fallback: append before the export statement
        idx = idx.replace(
          /^(export\s)/m,
          `${registerLine}\n\n$1`,
        );
      }

      indexPatched = true;
    }

    if (indexPatched) {
      await fs.writeFile(indexAbs, idx, "utf8");
    }
  } catch {
    // index.ts missing or unwritable — skip patching
  }

  return { groups, indexPatched };
}

/** Format as a structured repair block for the verify-fix agent's context. */
export function formatMissingRouteStubBlock(
  result: GenerateMissingRouteStubsResult,
): string {
  if (result.groups.length === 0) return "";

  const newGroups = result.groups.filter((g) => g.created);
  const existingGroups = result.groups.filter((g) => !g.created);

  const lines: string[] = [
    "",
    "## Missing route stubs (MUST implement before report_done(pass))",
  ];

  if (newGroups.length > 0) {
    lines.push(
      `${newGroups.length} stub file(s) were auto-created with 501 placeholder handlers.`,
      `Implement each handler with real business logic, then run validation.`,
      "",
    );
    for (const g of newGroups) {
      lines.push(`### \`${g.stubFile}\``);
      for (const ep of g.endpoints) {
        lines.push(`  - ${ep.method} ${ep.endpoint}`);
      }
    }
  }

  if (existingGroups.length > 0) {
    lines.push(
      "",
      "The following stub files already exist but still have unimplemented endpoints:",
    );
    for (const g of existingGroups) {
      lines.push(`  - \`${g.stubFile}\` (${g.endpoints.length} endpoint(s))`);
    }
  }

  lines.push(
    "",
    "For each stub: read the stub file, replace the 501 body with a real",
    "Sequelize query / service call, and ensure the response shape matches",
    "the API_CONTRACTS.json entry for that endpoint.",
  );

  return lines.join("\n");
}
