/**
 * One-shot validator: re-run the task-coverage and phase-requirement gates
 * against the persisted breakdown of a project.
 *
 * Usage: npx tsx scripts/verify-task-breakdown.ts <project_id>
 */

import { readFileSync, existsSync } from "fs";
import { Pool } from "pg";
import { runTaskCoverageGate, runPhaseRequirementGate } from "../src/lib/pipeline/gates";
import { extractPrdRequirementIndex } from "../src/lib/requirements/extract-prd-spec";

function loadDotEnv(file: string) {
  if (!existsSync(file)) return;
  const raw = readFileSync(file, "utf-8");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadDotEnv(".env.local");
loadDotEnv(".env");

const projectId = process.argv[2];
if (!projectId) {
  console.error("Usage: tsx scripts/verify-task-breakdown.ts <project_id>");
  process.exit(1);
}

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres@localhost/agentic_builder",
  });
  const { rows } = await pool.query(
    `SELECT step_id, snapshot
       FROM project_step_snapshot
      WHERE project_id = $1 AND step_id IN ('prd', 'task-breakdown')`,
    [projectId],
  );
  const tb = rows.find((r) => r.step_id === "task-breakdown")?.snapshot;
  const prd = rows.find((r) => r.step_id === "prd")?.snapshot?.content || "";
  if (!tb) {
    console.error(`No task-breakdown for ${projectId}`);
    process.exit(2);
  }
  const tasks = tb?.metadata?.taskBreakdown || [];
  const prdIndex = extractPrdRequirementIndex(prd);
  const cov = runTaskCoverageGate(prdIndex, tasks);
  const phase = runPhaseRequirementGate({ tier: "L", tasks, needsBackend: true });
  console.log(`coverage: passed=${cov.passed} missing=${cov.missingIds.length} warnings=${cov.warnings.length}`);
  if (cov.missingIds.length) console.log("  missing:", cov.missingIds);
  console.log(`phase:    passed=${phase.passed} missingPhases=${(phase.missingPhases||[]).join(",") || "-"}`);
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(99); });
