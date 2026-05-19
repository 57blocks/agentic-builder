/**
 * One-shot: apply the deterministic task-breakdown patch rules
 * (`applyTaskBreakdownPatches`) to an existing kick-off snapshot WITHOUT
 * re-running the LLM. Useful when the breakdown was generated with the old
 * pipeline and now needs the new guarantees (worker startup wiring,
 * pipeline-dag coverage, coverage-repair orphan merge).
 *
 * Usage:
 *   npx tsx scripts/repatch-task-breakdown.ts <project_id>
 *
 * It reads:
 *   • project_step_snapshot row for (project_id, step_id='task-breakdown')
 *   • .blueprint/pipeline-dag.yaml  (optional but recommended)
 *   • the TRD body from project_step_snapshot                       (best-effort)
 *
 * It writes back the patched task array and an extra
 * `taskBreakdownPatches` field on the snapshot's metadata column.
 */

import { readFileSync, existsSync } from "fs";
import path from "path";
import { Pool } from "pg";
import { applyTaskBreakdownPatches } from "../src/lib/pipeline/self-heal/task-breakdown-patches";
import type { KickoffWorkItem } from "../src/lib/pipeline/types";

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
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadDotEnv(".env.local");
loadDotEnv(".env");

const projectId = process.argv[2];
if (!projectId) {
  console.error("Usage: tsx scripts/repatch-task-breakdown.ts <project_id>");
  process.exit(1);
}

async function main() {
  const conn =
    process.env.DATABASE_URL ||
    "postgresql://postgres@localhost/agentic_builder";
  const pool = new Pool({ connectionString: conn });

  const { rows } = await pool.query(
    `SELECT step_id, snapshot
     FROM project_step_snapshot
     WHERE project_id = $1 AND step_id IN ('task-breakdown', 'trd')`,
    [projectId],
  );

  let tbRow: { step_id: string; snapshot: any } | undefined;
  let trdRow: { step_id: string; snapshot: any } | undefined;
  for (const r of rows) {
    if (r.step_id === "task-breakdown") tbRow = r;
    if (r.step_id === "trd") trdRow = r;
  }

  if (!tbRow) {
    console.error(`No task-breakdown snapshot for project ${projectId}`);
    process.exit(2);
  }

  const snapshot = tbRow.snapshot;
  const tasksField = snapshot?.metadata?.taskBreakdown;
  if (!Array.isArray(tasksField)) {
    console.error("metadata.taskBreakdown is not an array; aborting");
    process.exit(3);
  }
  const tasks: KickoffWorkItem[] = tasksField as KickoffWorkItem[];
  const trdBody: string | undefined =
    typeof trdRow?.snapshot?.content === "string"
      ? trdRow.snapshot.content
      : undefined;

  let pipelineDagYaml: string | undefined;
  try {
    pipelineDagYaml = readFileSync(
      path.join(process.cwd(), ".blueprint", "pipeline-dag.yaml"),
      "utf-8",
    );
  } catch {
    pipelineDagYaml = undefined;
  }

  console.log(
    `[repatch] project=${projectId} existingTasks=${tasks.length} ` +
      `trdLen=${trdBody?.length ?? 0} pipelineDagYaml=${
        pipelineDagYaml ? "present" : "missing"
      }`,
  );

  const result = applyTaskBreakdownPatches({
    tasks,
    trd: trdBody,
    pipelineDagYaml,
    tier: "L",
  });

  console.log(`[repatch] patches applied: ${result.patches.length}`);
  for (const p of result.patches) {
    console.log(`  • [${p.ruleId}] task=${p.taskId} — ${p.summary}`);
  }

  if (result.patches.length === 0) {
    console.log("[repatch] nothing to do — exiting without DB write");
    await pool.end();
    return;
  }

  const nextSnapshot = {
    ...snapshot,
    metadata: {
      ...(snapshot.metadata ?? {}),
      taskBreakdown: result.tasks,
      taskBreakdownPatches: result.patches,
    },
  };

  await pool.query(
    `UPDATE project_step_snapshot
       SET snapshot = $1, updated_at = NOW()
     WHERE project_id = $2 AND step_id = 'task-breakdown'`,
    [nextSnapshot, projectId],
  );

  console.log(
    `[repatch] persisted ${result.tasks.length} tasks (delta=${
      result.tasks.length - tasks.length
    })`,
  );

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(99);
});
