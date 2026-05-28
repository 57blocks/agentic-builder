/**
 * Convert `migration-quality.ts` findings into deterministic repair-task
 * descriptors the supervisor's verify-fix worker can pick up. Sibling of
 * `migration-coverage-repair.ts`, same I/O shape so wiring it in stays
 * symmetric.
 *
 * Inputs:
 *   - `outputDir` of the generated project. We scan every file under
 *     `backend/src/database/migrations/` ourselves (no per-task report
 *     dependency — quality issues survive across tasks until fixed, so
 *     re-scanning on demand is the safer source of truth).
 *
 * Outputs:
 *   - `MigrationQualityRepairTask[]` keyed by `(filePath, rule, line)`
 *     so dedup is automatic across audit ticks.
 *   - `formatMigrationQualityBlock(result)` for inline embedding into
 *     verify-fix worker prompts (mirrors `formatMigrationCoverageBlock`).
 */

import fs from "fs/promises";
import path from "path";
import {
  checkMigrationQuality,
  type MigrationFile,
  type MigrationQualityFinding,
  type MigrationQualityRuleId,
} from "./migration-quality";
import type { RepairEmitter } from "./events";

const MIGRATIONS_REL_DIR = "backend/src/database/migrations";

export interface MigrationQualityRepairTask {
  /** Stable id (filename + rule + line) so re-runs don't duplicate work. */
  id: string;
  /** Project-relative migration path the worker must rewrite. */
  filePath: string;
  rule: MigrationQualityRuleId;
  line: number;
  /** Ready-to-paste directive embedded in the worker's user message. */
  directive: string;
}

export interface MigrationQualityRepairInput {
  outputDir: string;
  emitter?: RepairEmitter | null;
  sessionId?: string;
}

export interface MigrationQualityRepairResult {
  totalFindings: number;
  filesScanned: number;
  pendingRepairTasks: MigrationQualityRepairTask[];
  scanFailed?: string;
}

export async function runMigrationQualityRepair(
  input: MigrationQualityRepairInput,
): Promise<MigrationQualityRepairResult> {
  const dir = path.join(input.outputDir, MIGRATIONS_REL_DIR);

  let files: MigrationFile[];
  try {
    files = await loadMigrationFiles(dir);
  } catch (err) {
    // Missing directory is fine — project may not have any migrations yet.
    if (isNotFound(err)) {
      return {
        totalFindings: 0,
        filesScanned: 0,
        pendingRepairTasks: [],
      };
    }
    return {
      totalFindings: 0,
      filesScanned: 0,
      pendingRepairTasks: [],
      scanFailed: err instanceof Error ? err.message : String(err),
    };
  }

  const result = checkMigrationQuality({ files });

  const pendingRepairTasks: MigrationQualityRepairTask[] = result.findings.map(
    (f) => ({
      id: makeStableId(f),
      filePath: f.filePath,
      rule: f.rule,
      line: f.line,
      directive: formatDirective(f),
    }),
  );

  if (input.emitter && pendingRepairTasks.length > 0) {
    try {
      input.emitter({
        sessionId: input.sessionId,
        stage: "post-gen-audit",
        event: "migration-quality-issues",
        details: {
          totalFindings: pendingRepairTasks.length,
          filesScanned: result.filesScanned,
          ruleCounts: countByRule(result.findings),
        },
      });
    } catch {
      // Telemetry must never break the pipeline.
    }
  }

  return {
    totalFindings: pendingRepairTasks.length,
    filesScanned: result.filesScanned,
    pendingRepairTasks,
  };
}

/**
 * Render the repair tasks as a Markdown checklist for the verify-fix
 * worker's user message. Mirrors `formatMigrationCoverageBlock` so the
 * worker sees a consistent layout across all coverage-style audits.
 */
export function formatMigrationQualityBlock(
  result: MigrationQualityRepairResult,
): string {
  if (result.pendingRepairTasks.length === 0) return "";

  const lines: string[] = ["", "## Migration quality repair"];
  lines.push(
    `Detected ${result.totalFindings} non-idempotent / FK-order issue(s) across ${result.filesScanned} migration file(s). Each entry below is a deterministic rewrite — execute them all before the runtime audit re-runs.`,
  );
  lines.push("");
  for (const t of result.pendingRepairTasks.slice(0, 16)) {
    const where = t.line > 0 ? `:${t.line}` : "";
    lines.push(`  - [backend] ${t.filePath}${where} — ${t.directive}`);
  }
  if (result.pendingRepairTasks.length > 16) {
    lines.push(
      `  - … (+${result.pendingRepairTasks.length - 16} more — run the audit a second time after the first batch lands)`,
    );
  }
  return lines.join("\n");
}

// ─── Helpers ───────────────────────────────────────────────────────────────

async function loadMigrationFiles(dir: string): Promise<MigrationFile[]> {
  const entries = await fs.readdir(dir);
  const tsFiles = entries.filter((f) => /\.[tj]s$/i.test(f));
  return Promise.all(
    tsFiles.map(async (name) => {
      const abs = path.join(dir, name);
      const content = await fs.readFile(abs, "utf8");
      return {
        path: `${MIGRATIONS_REL_DIR}/${name}`,
        content,
      };
    }),
  );
}

function makeStableId(f: MigrationQualityFinding): string {
  // filePath already contains the prefix; line distinguishes multiple
  // findings of the same rule inside one file.
  const safePath = f.filePath.replace(/[^a-zA-Z0-9]/g, "-");
  return `migration-quality-${f.rule}-${safePath}-L${f.line}`;
}

function countByRule(
  findings: readonly MigrationQualityFinding[],
): Record<MigrationQualityRuleId, number> {
  const out: Partial<Record<MigrationQualityRuleId, number>> = {};
  for (const f of findings) {
    out[f.rule] = (out[f.rule] ?? 0) + 1;
  }
  return out as Record<MigrationQualityRuleId, number>;
}

function formatDirective(f: MigrationQualityFinding): string {
  const where = f.line > 0 ? ` at line ${f.line}` : "";
  const snippet = f.snippet ? ` ("${f.snippet}")` : "";
  return `${f.rule}${where}${snippet}: ${f.message}`;
}

function isNotFound(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "ENOENT"
  );
}
