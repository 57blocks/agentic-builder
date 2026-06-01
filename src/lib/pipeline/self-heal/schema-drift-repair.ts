/**
 * Convert `schema-drift.ts` findings into deterministic repair-task
 * descriptors the supervisor's verify-fix worker can pick up. Mirror of
 * `migration-quality-repair.ts` so wiring stays symmetric.
 *
 * Inputs:
 *   - `outputDir` of the generated project. We scan every Sequelize
 *     model under `backend/src/models/` and every migration under
 *     `backend/src/database/migrations/` ourselves (no per-task report
 *     dependency — drift is a "current state" property, so re-scanning
 *     on demand is the safer source of truth).
 *
 * Outputs:
 *   - `SchemaDriftRepairTask[]` keyed by `(modelPath, fieldName, rule)`
 *     so dedup is automatic across audit ticks.
 *   - `formatSchemaDriftBlock(result)` for inline embedding into the
 *     verify-fix worker's user message (mirrors
 *     `formatMigrationCoverageBlock` / `formatMigrationQualityBlock`).
 */

import fs from "fs/promises";
import path from "path";
import {
  checkSchemaDrift,
  type ModelFile,
  type MigrationTextFile,
  type SchemaDriftFinding,
  type SchemaDriftRuleId,
} from "./schema-drift";
import type { RepairEmitter } from "./events";

const MODELS_REL_DIR = "backend/src/models";
const MIGRATIONS_REL_DIR = "backend/src/database/migrations";

export interface SchemaDriftRepairTask {
  /** Stable id (modelPath + rule + fieldName) so re-runs don't duplicate work. */
  id: string;
  /** Project-relative model path the worker must consult. */
  modelPath: string;
  modelName: string;
  rule: SchemaDriftRuleId;
  fieldName?: string;
  snakeFieldName?: string;
  line?: number;
  /** Ready-to-paste directive embedded in the worker's user message. */
  directive: string;
}

export interface SchemaDriftRepairInput {
  outputDir: string;
  emitter?: RepairEmitter | null;
  sessionId?: string;
}

export interface SchemaDriftRepairResult {
  totalFindings: number;
  modelsScanned: number;
  migrationsScanned: number;
  pendingRepairTasks: SchemaDriftRepairTask[];
  scanFailed?: string;
}

export async function runSchemaDriftRepair(
  input: SchemaDriftRepairInput,
): Promise<SchemaDriftRepairResult> {
  let models: ModelFile[];
  let migrations: MigrationTextFile[];
  try {
    models = await loadDir(input.outputDir, MODELS_REL_DIR, /\.tsx?$/i, true);
    migrations = await loadDir(
      input.outputDir,
      MIGRATIONS_REL_DIR,
      /\.[tj]s$/i,
      false,
    );
  } catch (err) {
    return {
      totalFindings: 0,
      modelsScanned: 0,
      migrationsScanned: 0,
      pendingRepairTasks: [],
      scanFailed: err instanceof Error ? err.message : String(err),
    };
  }

  // No models touched yet → nothing to drift against; not an error.
  if (models.length === 0) {
    return {
      totalFindings: 0,
      modelsScanned: 0,
      migrationsScanned: migrations.length,
      pendingRepairTasks: [],
    };
  }

  const result = checkSchemaDrift({ models, migrations });

  const pendingRepairTasks: SchemaDriftRepairTask[] = result.findings.map((f) => ({
    id: makeStableId(f),
    modelPath: f.modelPath,
    modelName: f.modelName,
    rule: f.rule,
    fieldName: f.fieldName,
    snakeFieldName: f.snakeFieldName,
    line: f.line,
    directive: f.message,
  }));

  if (input.emitter && pendingRepairTasks.length > 0) {
    try {
      input.emitter({
        sessionId: input.sessionId,
        stage: "post-gen-audit",
        event: "schema-drift-issues",
        details: {
          totalFindings: pendingRepairTasks.length,
          modelsScanned: models.length,
          ruleCounts: countByRule(result.findings),
        },
      });
    } catch {
      // Telemetry must never break the pipeline.
    }
  }

  return {
    totalFindings: pendingRepairTasks.length,
    modelsScanned: models.length,
    migrationsScanned: migrations.length,
    pendingRepairTasks,
  };
}

export function formatSchemaDriftBlock(result: SchemaDriftRepairResult): string {
  if (result.pendingRepairTasks.length === 0) return "";

  const lines: string[] = ["", "## Schema drift repair"];
  lines.push(
    `Detected ${result.totalFindings} model field(s) without a matching migration column across ${result.modelsScanned} model file(s). Each entry below is a deterministic repair instruction — execute them all before the runtime audit re-runs. A missing column triggers \`column "<name>" does not exist\` at the first query against the table.`,
  );
  lines.push("");
  for (const t of result.pendingRepairTasks.slice(0, 16)) {
    const loc = t.line ? `:${t.line}` : "";
    lines.push(`  - [backend] ${t.modelPath}${loc} — ${t.directive}`);
  }
  if (result.pendingRepairTasks.length > 16) {
    lines.push(
      `  - … (+${result.pendingRepairTasks.length - 16} more; re-run schema-drift lint locally to see the full set)`,
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
  recursive: boolean,
): Promise<ModelFile[]> {
  const abs = path.join(outputDir, relDir);
  let files: string[];
  try {
    files = await listFiles(abs, fileMatch, recursive);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
  const out: ModelFile[] = [];
  for (const f of files) {
    const content = await fs.readFile(f, "utf8");
    out.push({
      path: path
        .relative(outputDir, f)
        .replace(/\\/g, "/"),
      content,
    });
  }
  return out;
}

async function listFiles(
  dir: string,
  match: RegExp,
  recursive: boolean,
): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const out: string[] = [];
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!recursive) continue;
      out.push(...(await listFiles(p, match, recursive)));
      continue;
    }
    if (!e.isFile()) continue;
    // Skip the conventional model barrel.
    if (e.name === "index.ts" || e.name === "index.tsx") continue;
    if (!match.test(e.name)) continue;
    out.push(p);
  }
  return out;
}

function makeStableId(f: SchemaDriftFinding): string {
  const safe = f.modelPath.replace(/[^A-Za-z0-9_.-]+/g, "_");
  return `schema-drift-${safe}-${f.rule}-${f.fieldName ?? "all"}`;
}

function countByRule(
  findings: readonly SchemaDriftFinding[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const f of findings) {
    out[f.rule] = (out[f.rule] ?? 0) + 1;
  }
  return out;
}
