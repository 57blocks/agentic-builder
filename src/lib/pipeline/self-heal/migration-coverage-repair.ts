/**
 * Convert per-task migration-coverage gaps (recorded in
 * `<outputDir>/.ralph/migration-coverage.json` by the agent-subgraph
 * worker hook) into deterministic repair-task descriptors that the
 * supervisor's verify-fix worker can pick up.
 *
 * Closes the loop opened by `migration-coverage.ts`: that file *detects*
 * gaps as workers run; this file converts them into actionable work
 * before the runtime-integration-audit phase tries to start a server
 * with a missing column.
 */

import fs from "fs/promises";
import path from "path";

import type { RepairEmitter } from "./events";

const MIGRATIONS_REL_DIR = "backend/src/database/migrations";

interface ReportEntry {
  taskId: string;
  taskTitle: string;
  ok: boolean;
  modelFilesTouched: string[];
  migrationFilesTouched: string[];
  gaps: { modelPath: string; modelName: string; instruction: string }[];
  checkedAt: string;
}

interface CoverageReport {
  version: number;
  updatedAt: string;
  tasks: Record<string, ReportEntry>;
}

export interface MigrationRepairTask {
  /** Stable id derived from the originating task + modelName. */
  id: string;
  /** Source task that introduced the gap. */
  sourceTaskId: string;
  /** Model file the worker modified without writing a migration. */
  modelPath: string;
  modelName: string;
  /** Pre-formatted directive to embed in the worker's instruction. */
  directive: string;
}

export interface MigrationCoverageRepairInput {
  outputDir: string;
  emitter?: RepairEmitter | null;
  sessionId?: string;
  /**
   * When true, cross-reference the per-task gap list against the actual
   * migration files in `backend/src/database/migrations/` and drop gaps
   * whose model name appears in a migration filename. This eliminates
   * stale gaps that an earlier task recorded but a later task resolved —
   * without filtering, the verify-fix worker keeps being told to "write
   * a migration for Stablecoin" even when `003-add-stablecoin-*.ts`
   * already exists.
   *
   * Defaults to `false` to preserve existing test behavior (callers that
   * want a raw per-task view, e.g. forensic audits, still get it).
   */
  filterByDisk?: boolean;
}

export interface MigrationCoverageRepairResult {
  /** Total gaps observed across all tasks (sum over tasks). */
  totalGaps: number;
  /** Number of distinct source tasks that have gaps. */
  tasksWithGaps: number;
  /** Repair-task descriptors, one per gap. */
  pendingRepairTasks: MigrationRepairTask[];
  /** True when no report file existed (no models touched yet). */
  reportMissing: boolean;
}

const REPORT_RELATIVE = ".ralph/migration-coverage.json";

export async function runMigrationCoverageRepair(
  input: MigrationCoverageRepairInput,
): Promise<MigrationCoverageRepairResult> {
  const reportPath = path.join(input.outputDir, REPORT_RELATIVE);
  let raw: string;
  try {
    raw = await fs.readFile(reportPath, "utf8");
  } catch {
    return {
      totalGaps: 0,
      tasksWithGaps: 0,
      pendingRepairTasks: [],
      reportMissing: true,
    };
  }

  let report: CoverageReport;
  try {
    report = JSON.parse(raw);
  } catch {
    return {
      totalGaps: 0,
      tasksWithGaps: 0,
      pendingRepairTasks: [],
      reportMissing: false,
    };
  }
  if (!report || typeof report.tasks !== "object") {
    return {
      totalGaps: 0,
      tasksWithGaps: 0,
      pendingRepairTasks: [],
      reportMissing: false,
    };
  }

  const rawPendingRepairTasks: MigrationRepairTask[] = [];
  for (const entry of Object.values(report.tasks)) {
    if (!entry || entry.ok || !Array.isArray(entry.gaps) || entry.gaps.length === 0) {
      continue;
    }
    for (const gap of entry.gaps) {
      rawPendingRepairTasks.push({
        id: `migration-repair-${entry.taskId}-${gap.modelName}`,
        sourceTaskId: entry.taskId,
        modelPath: gap.modelPath,
        modelName: gap.modelName,
        directive: gap.instruction,
      });
    }
  }

  // Optionally drop gaps already resolved by a migration file on disk
  // (model name appears in any `backend/src/database/migrations/*.ts`).
  // Without this, append-only per-task reporting keeps surfacing gaps
  // long after subsequent tasks fixed them.
  const pendingRepairTasks = input.filterByDisk
    ? await filterByMigrationFiles(input.outputDir, rawPendingRepairTasks)
    : rawPendingRepairTasks;

  // tasksWithGaps must reflect the FILTERED list — when filterByDisk is
  // on, a task whose only gap got resolved should no longer count as
  // "with gaps". Compute distinct source-task ids from the survivors.
  const tasksWithGaps = new Set(pendingRepairTasks.map((t) => t.sourceTaskId))
    .size;

  if (input.emitter && pendingRepairTasks.length > 0) {
    try {
      input.emitter({
        sessionId: input.sessionId,
        stage: "post-gen-audit",
        event: "migration-coverage-gaps",
        details: {
          totalGaps: pendingRepairTasks.length,
          tasksWithGaps,
          taskIds: Array.from(
            new Set(pendingRepairTasks.map((t) => t.sourceTaskId)),
          ),
        },
      });
    } catch {
      // Telemetry must never break the pipeline.
    }
  }

  return {
    totalGaps: pendingRepairTasks.length,
    tasksWithGaps,
    pendingRepairTasks,
    reportMissing: false,
  };
}

async function filterByMigrationFiles(
  outputDir: string,
  gaps: MigrationRepairTask[],
): Promise<MigrationRepairTask[]> {
  if (gaps.length === 0) return gaps;
  const files = await listMigrationFilesLower(outputDir);
  if (files.length === 0) return gaps;
  return gaps.filter(
    (g) => !isCoveredByMigrationFile(g.modelName, files),
  );
}

/**
 * Cross-reference per-task gaps against the actual migration files on disk
 * and return only the gaps that are STILL unresolved.
 *
 * Why this exists: `runMigrationCoverageRepair` returns whatever the
 * per-task report says, but the report is append-only — a gap recorded
 * by task T-005 (`Stablecoin model written without migration`) stays
 * `ok: false` even when task T-REPAIR-BACKEND later writes
 * `0042_stablecoin.ts`. Reading the migration directory at audit time
 * resolves this by checking whether ANY migration file's basename
 * mentions the model name (camel, kebab, or snake case).
 *
 * Returns the filtered list of `MigrationRepairTask` entries. The
 * supervisor uses an empty result to decide whether the runtime smoke
 * probe can safely run, or whether to short-circuit with a clear
 * "migrations missing" failure so we don't waste cycles probing
 * endpoints we already know will 5xx on a schema mismatch.
 */
export async function getUnresolvedMigrationGaps(
  outputDir: string,
): Promise<MigrationRepairTask[]> {
  const repair = await runMigrationCoverageRepair({
    outputDir,
    filterByDisk: true,
  });
  return repair.pendingRepairTasks;
}

async function listMigrationFilesLower(outputDir: string): Promise<string[]> {
  const dir = path.join(outputDir, MIGRATIONS_REL_DIR);
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return [];
  }
  return entries
    .filter((f) => /\.[tj]s$/i.test(f))
    .map((f) => f.toLowerCase());
}

function modelNameVariants(modelName: string): string[] {
  const lower = modelName.toLowerCase();
  const kebab = modelName
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/_/g, "-")
    .toLowerCase();
  const snake = modelName
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/-/g, "_")
    .toLowerCase();
  return Array.from(new Set([lower, kebab, snake]));
}

function isCoveredByMigrationFile(
  modelName: string,
  migrationFilesLowerCase: string[],
): boolean {
  const variants = modelNameVariants(modelName);
  return migrationFilesLowerCase.some((file) =>
    variants.some((v) => file.includes(v)),
  );
}

/** Render the repair tasks as a Markdown checklist for the verify-fix
 *  worker's opening user message — mirrors the contract-usage-coverage
 *  block style so the worker sees a consistent format across audits. */
export function formatMigrationCoverageBlock(
  result: MigrationCoverageRepairResult,
): string {
  if (result.pendingRepairTasks.length === 0) return "";

  const lines: string[] = ["", "## Migration coverage repair"];
  lines.push(
    `Detected ${result.totalGaps} Sequelize model file(s) modified without a corresponding migration across ${result.tasksWithGaps} task(s). Each entry below is a deterministic repair instruction — execute them all before the runtime audit re-runs.`,
  );
  lines.push("");
  for (const t of result.pendingRepairTasks.slice(0, 12)) {
    lines.push(`  - [backend] ${t.modelPath} — ${t.directive}`);
  }
  if (result.pendingRepairTasks.length > 12) {
    lines.push(
      `  - … (+${result.pendingRepairTasks.length - 12} more, full list in .ralph/migration-coverage.json)`,
    );
  }
  return lines.join("\n");
}
