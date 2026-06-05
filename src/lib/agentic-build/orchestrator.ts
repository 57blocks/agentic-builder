/**
 * Orchestrator — drives a BuildPlan milestone by milestone.
 *
 * For each milestone (in order, honouring dependsOn and skipping ones already
 * passed in a resumed run):
 *   1. run the milestone agent (build),
 *   2. run the acceptance commands,
 *   3. if they pass → record + advance,
 *      else → append the failure feedback and let the agent try again,
 *      up to `maxAttemptsPerMilestone`.
 * A milestone that never passes stops the run (its predecessors are required by
 * the next milestone's correctness anyway). Progress is persisted to
 * `<workspace>/.agentic-build/progress.json` so a run can resume.
 *
 * The agent runner is injected (`runMilestoneImpl`) so the whole control-flow is
 * unit-testable with a fake agent + fake executor — no LLM, no shell.
 */

import path from "path";
import fs from "fs/promises";
import type { ChatMessage } from "@/lib/llm-types";
import type { BuildExecutor } from "./executor";
import { runMilestoneAcceptance, renderAcceptanceFeedback } from "./acceptance";
import {
  runMilestoneAgent,
  type AgentEvent,
  type RunMilestoneAgentInput,
  type RunMilestoneAgentResult,
} from "./milestone-agent";
import type {
  BuildPlan,
  BuildProgress,
  BuildRunResult,
  Milestone,
  MilestoneResult,
} from "./types";

export interface OrchestratorEvent {
  type:
    | "milestone_start"
    | "milestone_attempt"
    | "milestone_passed"
    | "milestone_failed"
    | "milestone_skipped"
    | "run_done";
  milestoneId?: string;
  attempt?: number;
  details?: Record<string, unknown>;
}

export interface RunBuildPlanInput {
  plan: BuildPlan;
  executor: BuildExecutor;
  maxAttemptsPerMilestone?: number;
  maxStepsPerAttempt?: number;
  model?: string;
  /** Resume: skip milestones already marked passed in persisted progress. */
  resume?: boolean;
  emit?: (e: OrchestratorEvent) => void;
  /** Forward per-milestone agent tool activity (for live UI). */
  onAgentEvent?: (milestoneId: string, e: AgentEvent) => void;
  /** Test seam: inject the per-milestone agent runner. */
  runMilestoneImpl?: (
    input: RunMilestoneAgentInput,
  ) => Promise<RunMilestoneAgentResult>;
}

const PROGRESS_REL = path.join(".agentic-build", "progress.json");

export async function loadProgress(
  executor: BuildExecutor,
): Promise<BuildProgress | null> {
  const raw = await executor.readFile(PROGRESS_REL);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as BuildProgress;
  } catch {
    return null;
  }
}

async function saveProgress(
  executor: BuildExecutor,
  progress: BuildProgress,
): Promise<void> {
  progress.updatedAt = new Date().toISOString();
  await executor.writeFile(PROGRESS_REL, JSON.stringify(progress, null, 2));
}

export async function runBuildPlan(
  input: RunBuildPlanInput,
): Promise<BuildRunResult> {
  const { plan, executor, emit } = input;
  const maxAttempts = input.maxAttemptsPerMilestone ?? 3;
  const maxSteps = input.maxStepsPerAttempt ?? 30;
  const runMilestone = input.runMilestoneImpl ?? runMilestoneAgent;
  const startedMs = Date.now();

  const progress: BuildProgress =
    (input.resume ? await loadProgress(executor) : null) ?? {
      projectName: plan.projectName,
      passed: [],
      results: {},
      updatedAt: new Date().toISOString(),
    };
  const passedSet = new Set(progress.passed);

  // Single conversation thread carried across milestones so the agent keeps
  // context of what it already built.
  const messages: ChatMessage[] = [];
  const milestoneResults: MilestoneResult[] = [];
  let totalCost = 0;
  let failedAt: string | undefined;

  for (const milestone of plan.milestones) {
    if (input.resume && passedSet.has(milestone.id)) {
      const prior = progress.results[milestone.id];
      if (prior) milestoneResults.push(prior);
      emit?.({ type: "milestone_skipped", milestoneId: milestone.id });
      continue;
    }

    const unmetDep = findUnmetDependency(milestone, plan, passedSet);
    if (unmetDep) {
      const result: MilestoneResult = {
        id: milestone.id,
        title: milestone.title,
        outcome: "skipped",
        attempts: 0,
        acceptance: [],
        filesTouched: [],
        reason: `Dependency ${unmetDep} has not passed.`,
        costUsd: 0,
      };
      milestoneResults.push(result);
      progress.results[milestone.id] = result;
      await saveProgress(executor, progress);
      emit?.({
        type: "milestone_failed",
        milestoneId: milestone.id,
        details: { reason: result.reason },
      });
      failedAt = milestone.id;
      break;
    }

    emit?.({ type: "milestone_start", milestoneId: milestone.id });
    const result = await runSingleMilestone({
      plan,
      milestone,
      executor,
      messages,
      maxAttempts,
      maxSteps,
      model: input.model,
      runMilestone,
      emit,
      onAgentEvent: input.onAgentEvent,
    });
    totalCost += result.costUsd;
    milestoneResults.push(result);
    progress.results[milestone.id] = result;

    if (result.outcome === "passed") {
      passedSet.add(milestone.id);
      progress.passed = [...passedSet];
      await saveProgress(executor, progress);
      emit?.({ type: "milestone_passed", milestoneId: milestone.id, attempt: result.attempts });
    } else {
      await saveProgress(executor, progress);
      emit?.({
        type: "milestone_failed",
        milestoneId: milestone.id,
        attempt: result.attempts,
        details: { reason: result.reason },
      });
      failedAt = milestone.id;
      break;
    }
  }

  const outcome = failedAt ? "failed" : "passed";
  emit?.({ type: "run_done", details: { outcome, failedAt } });
  return {
    outcome,
    milestones: milestoneResults,
    failedAt,
    costUsd: totalCost,
    durationMs: Date.now() - startedMs,
  };
}

interface RunSingleMilestoneArgs {
  plan: BuildPlan;
  milestone: Milestone;
  executor: BuildExecutor;
  messages: ChatMessage[];
  maxAttempts: number;
  maxSteps: number;
  model?: string;
  runMilestone: (
    input: RunMilestoneAgentInput,
  ) => Promise<RunMilestoneAgentResult>;
  emit?: (e: OrchestratorEvent) => void;
  onAgentEvent?: (milestoneId: string, e: AgentEvent) => void;
}

async function runSingleMilestone(
  args: RunSingleMilestoneArgs,
): Promise<MilestoneResult> {
  const { plan, milestone, executor, messages, maxAttempts, maxSteps, runMilestone, emit } = args;
  const filesTouched = new Set<string>();
  let costUsd = 0;
  let attempts = 0;
  let lastFeedback: string | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    attempts = attempt;
    emit?.({ type: "milestone_attempt", milestoneId: milestone.id, attempt });

    const agentRes = await runMilestone({
      plan,
      milestone,
      executor,
      messages,
      attemptInstruction: lastFeedback,
      model: args.model,
      maxSteps,
      onEvent: args.onAgentEvent
        ? (e) => args.onAgentEvent!(milestone.id, e)
        : undefined,
    });
    costUsd += agentRes.costUsd;
    for (const f of agentRes.filesTouched) filesTouched.add(f);

    const acc = await runMilestoneAcceptance(milestone, executor);
    if (acc.passed) {
      return {
        id: milestone.id,
        title: milestone.title,
        outcome: "passed",
        attempts,
        acceptance: acc.results,
        filesTouched: [...filesTouched],
        costUsd,
      };
    }

    lastFeedback = renderAcceptanceFeedback(acc.results);
    if (attempt === maxAttempts) {
      return {
        id: milestone.id,
        title: milestone.title,
        outcome: "failed",
        attempts,
        acceptance: acc.results,
        filesTouched: [...filesTouched],
        reason: `Acceptance still failing after ${maxAttempts} attempt(s).`,
        costUsd,
      };
    }
  }

  // Unreachable, but satisfies the type checker.
  return {
    id: milestone.id,
    title: milestone.title,
    outcome: "failed",
    attempts,
    acceptance: [],
    filesTouched: [...filesTouched],
    reason: "No attempts ran.",
    costUsd,
  };
}

/** Returns the id of the first unmet dependency, or null. Defaults dependsOn to
 *  the immediately preceding milestone when not specified. */
function findUnmetDependency(
  milestone: Milestone,
  plan: BuildPlan,
  passed: Set<string>,
): string | null {
  let deps = milestone.dependsOn;
  if (!deps) {
    const idx = plan.milestones.findIndex((m) => m.id === milestone.id);
    deps = idx > 0 ? [plan.milestones[idx - 1].id] : [];
  }
  for (const d of deps) {
    if (!passed.has(d)) return d;
  }
  return null;
}
