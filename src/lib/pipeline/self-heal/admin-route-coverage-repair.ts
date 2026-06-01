/**
 * Convert `admin-route-coverage.ts` findings into deterministic
 * repair-task descriptors the supervisor's verify-fix worker can pick
 * up. Mirror of `schema-drift-repair.ts` so wiring stays symmetric.
 *
 * Inputs:
 *   - `outputDir` of the generated project. We scan every frontend
 *     source file under `frontend/src/` and every backend module file
 *     under `backend/src/api/modules/` ourselves (no per-task report
 *     dependency — coverage is a "current state" property, so
 *     re-scanning on demand is the safer source of truth).
 *
 * Outputs:
 *   - `AdminRouteCoverageRepairTask[]` keyed by `(method, normalisedPath)`
 *     so duplicate frontend call sites (e.g. one helper exported and
 *     consumed by N components) yield ONE repair task.
 *   - `formatAdminRouteCoverageBlock(result)` for inline embedding into
 *     the verify-fix worker's user message (mirrors
 *     `formatSchemaDriftBlock` / `formatMigrationQualityBlock`).
 */

import fs from "fs/promises";
import path from "path";
import {
  checkAdminRouteCoverage,
  type AdminRouteCoverageFile,
  type AdminRouteCoverageFinding,
  type AdminRouteCoverageRuleId,
} from "./admin-route-coverage";
import type { RepairEmitter } from "./events";

const FRONTEND_REL_DIR = "frontend/src";
const BACKEND_REL_DIR = "backend/src/api/modules";

export interface AdminRouteCoverageRepairTask {
  /** Stable id (`admin-route-${METHOD}-${normalisedPath}`) so reruns dedup. */
  id: string;
  rule: AdminRouteCoverageRuleId;
  method: string;
  url: string;
  normalisedPath: string;
  /** First frontend file + line that surfaced the gap (for traceability). */
  filePath: string;
  line: number;
  /** Ready-to-paste directive embedded in the worker's user message. */
  directive: string;
}

export interface AdminRouteCoverageRepairInput {
  outputDir: string;
  emitter?: RepairEmitter | null;
  sessionId?: string;
}

export interface AdminRouteCoverageRepairResult {
  totalFindings: number;
  frontendFilesScanned: number;
  backendFilesScanned: number;
  totalAdminCalls: number;
  totalAdminRoutes: number;
  pendingRepairTasks: AdminRouteCoverageRepairTask[];
  scanFailed?: string;
}

export async function runAdminRouteCoverageRepair(
  input: AdminRouteCoverageRepairInput,
): Promise<AdminRouteCoverageRepairResult> {
  let frontendFiles: AdminRouteCoverageFile[];
  let backendFiles: AdminRouteCoverageFile[];
  try {
    frontendFiles = await loadDir(input.outputDir, FRONTEND_REL_DIR, /\.tsx?$/i);
    backendFiles = await loadDir(input.outputDir, BACKEND_REL_DIR, /\.tsx?$/i);
  } catch (err) {
    return {
      totalFindings: 0,
      frontendFilesScanned: 0,
      backendFilesScanned: 0,
      totalAdminCalls: 0,
      totalAdminRoutes: 0,
      pendingRepairTasks: [],
      scanFailed: err instanceof Error ? err.message : String(err),
    };
  }

  // Zero frontend → nothing to lint. Zero backend is fine: every admin
  // call becomes a finding (worker has to create the alias router).
  if (frontendFiles.length === 0) {
    return {
      totalFindings: 0,
      frontendFilesScanned: 0,
      backendFilesScanned: backendFiles.length,
      totalAdminCalls: 0,
      totalAdminRoutes: 0,
      pendingRepairTasks: [],
    };
  }

  const result = checkAdminRouteCoverage({ frontendFiles, backendFiles });

  // De-dup findings by `(method, normalisedPath)` — the first occurrence
  // wins for traceability fields (filePath + line).
  const dedup = new Map<string, AdminRouteCoverageFinding>();
  for (const f of result.findings) {
    const key = `${f.method} ${f.normalisedPath}`;
    if (!dedup.has(key)) dedup.set(key, f);
  }

  const pendingRepairTasks: AdminRouteCoverageRepairTask[] = [];
  for (const [key, f] of dedup) {
    pendingRepairTasks.push({
      id: makeStableId(key),
      rule: f.rule,
      method: f.method,
      url: f.url,
      normalisedPath: f.normalisedPath,
      filePath: f.filePath,
      line: f.line,
      directive: f.message,
    });
  }

  if (input.emitter && pendingRepairTasks.length > 0) {
    try {
      input.emitter({
        sessionId: input.sessionId,
        stage: "post-gen-audit",
        event: "admin-route-coverage-issues",
        details: {
          totalFindings: pendingRepairTasks.length,
          frontendFilesScanned: result.frontendFilesScanned,
          backendFilesScanned: result.backendFilesScanned,
          totalAdminCalls: result.totalAdminCalls,
          totalAdminRoutes: result.totalAdminRoutes,
        },
      });
    } catch {
      // Telemetry must never break the pipeline.
    }
  }

  return {
    totalFindings: pendingRepairTasks.length,
    frontendFilesScanned: result.frontendFilesScanned,
    backendFilesScanned: result.backendFilesScanned,
    totalAdminCalls: result.totalAdminCalls,
    totalAdminRoutes: result.totalAdminRoutes,
    pendingRepairTasks,
  };
}

export function formatAdminRouteCoverageBlock(
  result: AdminRouteCoverageRepairResult,
): string {
  if (result.pendingRepairTasks.length === 0) return "";

  const lines: string[] = ["", "## Admin-route alias coverage repair"];
  lines.push(
    `Detected ${result.totalFindings} frontend \`/admin/*\` call(s) without a matching backend route across ${result.frontendFilesScanned} frontend file(s) (${result.totalAdminCalls} admin calls, ${result.totalAdminRoutes} admin routes registered). Each entry below is a deterministic repair instruction — register every missing alias in \`backend/src/api/modules/admin-aliases/admin-aliases.routes.ts\` before the runtime audit re-runs. Every alias MUST be chained with \`requireAuth, requireRole("admin")\` (in that order).`,
  );
  lines.push("");
  for (const t of result.pendingRepairTasks.slice(0, 16)) {
    lines.push(`  - [frontend] ${t.filePath}:${t.line} — ${t.directive}`);
  }
  if (result.pendingRepairTasks.length > 16) {
    lines.push(
      `  - … (+${result.pendingRepairTasks.length - 16} more; re-run admin-route-coverage lint locally to see the full set)`,
    );
  }
  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────

async function loadDir(
  outputDir: string,
  relDir: string,
  fileMatch: RegExp,
): Promise<AdminRouteCoverageFile[]> {
  const abs = path.join(outputDir, relDir);
  let files: string[];
  try {
    files = await listFiles(abs, fileMatch);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
  const out: AdminRouteCoverageFile[] = [];
  for (const f of files) {
    const content = await fs.readFile(f, "utf8");
    out.push({
      path: path.relative(outputDir, f).replace(/\\/g, "/"),
      content,
    });
  }
  return out;
}

async function listFiles(dir: string, match: RegExp): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const out: string[] = [];
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      // Skip generated / vendored trees that would inflate the scan.
      if (e.name === "node_modules" || e.name === "dist" || e.name === "build") {
        continue;
      }
      out.push(...(await listFiles(p, match)));
      continue;
    }
    if (!e.isFile()) continue;
    if (!match.test(e.name)) continue;
    // Skip `.d.ts` — declarations never contain real call sites.
    if (e.name.endsWith(".d.ts")) continue;
    out.push(p);
  }
  return out;
}

function makeStableId(key: string): string {
  const safe = key.replace(/[^A-Za-z0-9_.-]+/g, "_");
  return `admin-route-${safe}`;
}
