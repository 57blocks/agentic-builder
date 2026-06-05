/**
 * Agentic Build — public surface.
 *
 * Server-only (pulls in fs / child_process). Import from API routes / CLI, not
 * from browser components.
 */

import path from "path";
import fs from "fs/promises";

export * from "./types";
export { LocalBuildExecutor, isUnsafeCommand } from "./executor";
export type { BuildExecutor, CommandResult, RunOptions } from "./executor";
export {
  runMilestoneAcceptance,
  runAcceptanceCommand,
  renderAcceptanceFeedback,
} from "./acceptance";
export type { AcceptanceRunResult } from "./acceptance";
export { runMilestoneAgent } from "./milestone-agent";
export type {
  AgentEvent,
  RunMilestoneAgentInput,
  RunMilestoneAgentResult,
} from "./milestone-agent";
export { runBuildPlan, loadProgress } from "./orchestrator";
export type { OrchestratorEvent, RunBuildPlanInput } from "./orchestrator";
export { ContainerBuildExecutor } from "./sandbox/container";
export type {
  ContainerExecutorOptions,
  DockerRunner,
} from "./sandbox/container";
export { extractBuildPlan, parseBuildPlanDraft } from "./plan-extractor";
export type {
  BuildPlanDraft,
  ExtractBuildPlanResult,
} from "./plan-extractor";
export { hasPlanSignals, planHasUsableAcceptance } from "./plan-detection";
export type { PlanDetectionResult } from "./plan-detection";
export {
  writeBuildPlan,
  readBuildPlan,
  deleteBuildPlan,
  loadGoalModePlan,
} from "./plan-store";
export type { PersistedBuildPlan } from "./plan-store";
export { maybeExtractAndPersistPlan } from "./plan-gate";
export type {
  MaybePersistPlanInput,
  MaybePersistPlanResult,
} from "./plan-gate";
export { runGoalModeCoding } from "./goal-mode-coding";
export type {
  RunGoalModeCodingInput,
  GoalModeSseEvent,
} from "./goal-mode-coding";

/** Root under which relative workspaces are created. */
export const AGENTIC_BUILD_RUNS_ROOT = path.join(process.cwd(), "agentic-builds");

/** Filesystem-safe slug from an arbitrary name. */
export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "project"
  );
}

/**
 * Resolve (and create) the workspace dir for a run.
 *   - absolute `requested` path → used as-is (the agent owns that dir).
 *   - relative / missing → `<runs-root>/<slug(projectName)>`.
 */
export async function resolveWorkspaceDir(
  projectName: string,
  requested?: string,
): Promise<string> {
  const abs =
    requested && path.isAbsolute(requested)
      ? requested
      : path.join(AGENTIC_BUILD_RUNS_ROOT, slugify(requested || projectName));
  await fs.mkdir(abs, { recursive: true });
  return abs;
}
