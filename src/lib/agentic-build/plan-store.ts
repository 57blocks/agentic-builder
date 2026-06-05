/**
 * Read / write the persisted build plan at `.blueprint/build-plan.json`.
 *
 * This is the SWITCH between the two coding pathways: when this file exists (and
 * carries usable acceptance commands), the coding stage enters "goal mode" (the
 * agentic milestone + acceptance loop) instead of the scaffolded sharded
 * pipeline. Mirrors the subsystem manifest IO pattern: best-effort writes,
 * null on missing/corrupt.
 */

import fs from "fs/promises";
import path from "path";
import type { BuildPlanDraft } from "./plan-extractor";
import { planHasUsableAcceptance } from "./plan-detection";

const PLAN_FILE = path.join(".blueprint", "build-plan.json");

/** On-disk shape: the plan draft + provenance. */
export interface PersistedBuildPlan extends BuildPlanDraft {
  /** Where the plan came from, for debugging / audit. */
  source: "extracted" | "manual";
  model?: string;
  createdAt: string;
}

function planPath(projectRoot: string): string {
  return path.join(projectRoot, PLAN_FILE);
}

export async function writeBuildPlan(
  projectRoot: string,
  plan: PersistedBuildPlan,
): Promise<void> {
  try {
    await fs.mkdir(path.join(projectRoot, ".blueprint"), { recursive: true });
    await fs.writeFile(
      planPath(projectRoot),
      JSON.stringify(plan, null, 2) + "\n",
      "utf-8",
    );
    console.log(
      `[AgenticBuild] Saved build plan: ${plan.milestones.length} milestone(s) → goal mode armed.`,
    );
  } catch (err) {
    console.warn(
      `[AgenticBuild] Failed to write build plan (ignored):`,
      err instanceof Error ? err.message : err,
    );
  }
}

export async function readBuildPlan(
  projectRoot: string,
): Promise<PersistedBuildPlan | null> {
  let raw: string;
  try {
    raw = await fs.readFile(planPath(projectRoot), "utf-8");
  } catch {
    return null; // no plan → normal pipeline
  }
  try {
    const parsed = JSON.parse(raw) as PersistedBuildPlan;
    if (!parsed || !Array.isArray(parsed.milestones)) return null;
    return parsed;
  } catch (err) {
    console.warn(
      `[AgenticBuild] Corrupt build plan at ${PLAN_FILE} (ignored):`,
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

export async function deleteBuildPlan(projectRoot: string): Promise<void> {
  await fs.rm(planPath(projectRoot), { force: true }).catch(() => undefined);
}

/**
 * The coding-stage gate: returns the persisted plan IFF goal mode should engage
 * (file present AND it carries usable acceptance commands), else null.
 */
export async function loadGoalModePlan(
  projectRoot: string,
): Promise<PersistedBuildPlan | null> {
  const plan = await readBuildPlan(projectRoot);
  if (!plan) return null;
  if (!planHasUsableAcceptance(plan)) {
    console.log(
      `[AgenticBuild] build-plan.json present but has no usable acceptance commands — staying on normal pipeline.`,
    );
    return null;
  }
  return plan;
}
