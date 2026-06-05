/**
 * Goal-mode coding bridge.
 *
 * When the coding stage detects a persisted build plan (`.blueprint/build-plan.json`
 * with usable acceptance commands), it runs THIS instead of the scaffolded sharded
 * pipeline: a single autonomous agent drives the plan milestone-by-milestone, each
 * gated by its acceptance commands. No task breakdown, no scaffold.
 *
 * The workspace IS the project's code output dir, so the result lands where the
 * dashboard expects it. Orchestrator/agent events are forwarded through `send` so
 * the coding SSE channel can surface live progress.
 *
 * Kept route-agnostic and dependency-injectable (executor + runner) so it is unit
 * testable without an LLM or a shell.
 */

import { LocalBuildExecutor, type BuildExecutor } from "./executor";
import { runBuildPlan, type RunBuildPlanInput } from "./orchestrator";
import type { BuildPlan, BuildRunResult } from "./types";
import type { PersistedBuildPlan } from "./plan-store";

/** Custom SSE event shapes emitted on the coding channel for goal mode. */
export type GoalModeSseEvent =
  | { type: "goal_orchestrator"; event: unknown }
  | { type: "goal_agent"; milestoneId: string; event: unknown };

export interface RunGoalModeCodingInput {
  /** Project code output dir — becomes the agent's workspace. */
  outputRoot: string;
  plan: PersistedBuildPlan;
  maxAttemptsPerMilestone?: number;
  maxStepsPerAttempt?: number;
  model?: string;
  resume?: boolean;
  /** Emit a (already-typed) SSE payload onto the coding channel. */
  send: (event: GoalModeSseEvent) => void;
  /** Test seam: inject the orchestrator. */
  runBuildPlanImpl?: (input: RunBuildPlanInput) => Promise<BuildRunResult>;
  /** Test seam: inject the executor. */
  executorFactory?: (workspaceDir: string) => BuildExecutor;
}

export async function runGoalModeCoding(
  input: RunGoalModeCodingInput,
): Promise<BuildRunResult> {
  const plan: BuildPlan = {
    projectName: input.plan.projectName,
    workspaceDir: input.outputRoot,
    context: input.plan.context,
    milestones: input.plan.milestones,
  };

  const executor = input.executorFactory
    ? input.executorFactory(input.outputRoot)
    : new LocalBuildExecutor(input.outputRoot);

  const run = input.runBuildPlanImpl ?? runBuildPlan;
  return run({
    plan,
    executor,
    maxAttemptsPerMilestone: input.maxAttemptsPerMilestone,
    maxStepsPerAttempt: input.maxStepsPerAttempt,
    model: input.model,
    resume: input.resume,
    emit: (event) => input.send({ type: "goal_orchestrator", event }),
    onAgentEvent: (milestoneId, event) =>
      input.send({ type: "goal_agent", milestoneId, event }),
  });
}
