/**
 * Tests for the goal-mode coding bridge: it must build a BuildPlan whose
 * workspace IS the project output dir, forward orchestrator + agent events as
 * `goal_*` SSE payloads, and return the orchestrator's result.
 */

import { describe, expect, it, vi } from "vitest";
import { runGoalModeCoding, type GoalModeSseEvent } from "../goal-mode-coding";
import type { RunBuildPlanInput } from "../orchestrator";
import type { BuildExecutor } from "../executor";
import type { BuildRunResult } from "../types";
import type { PersistedBuildPlan } from "../plan-store";

const PLAN: PersistedBuildPlan = {
  projectName: "demo",
  context: "ctx",
  milestones: [
    {
      id: "M0",
      title: "bootstrap",
      instructions: "do it",
      acceptance: [{ command: "true" }],
    },
  ],
  source: "extracted",
  createdAt: new Date().toISOString(),
};

const fakeExecutor = {} as BuildExecutor;

describe("runGoalModeCoding", () => {
  it("builds a plan rooted at outputRoot and forwards events", async () => {
    const sent: GoalModeSseEvent[] = [];
    let captured: RunBuildPlanInput | null = null;

    const runBuildPlanImpl = vi.fn(
      async (input: RunBuildPlanInput): Promise<BuildRunResult> => {
        captured = input;
        // Simulate orchestrator + agent events flowing back out.
        input.emit?.({ type: "milestone_start", milestoneId: "M0" });
        input.onAgentEvent?.("M0", {
          type: "tool_call",
        } as unknown as Parameters<NonNullable<RunBuildPlanInput["onAgentEvent"]>>[1]);
        input.emit?.({ type: "run_done", details: { outcome: "passed" } });
        return {
          outcome: "passed",
          milestones: [
            {
              id: "M0",
              title: "bootstrap",
              outcome: "passed",
              attempts: 1,
              acceptance: [],
              filesTouched: ["a.ts"],
              costUsd: 0,
            },
          ],
          costUsd: 0,
          durationMs: 1,
        };
      },
    );

    const result = await runGoalModeCoding({
      outputRoot: "/project/out",
      plan: PLAN,
      send: (e) => sent.push(e),
      runBuildPlanImpl,
      executorFactory: () => fakeExecutor,
    });

    expect(result.outcome).toBe("passed");
    expect(captured!.plan.workspaceDir).toBe("/project/out");
    expect(captured!.plan.milestones).toHaveLength(1);

    const orchEvents = sent.filter((e) => e.type === "goal_orchestrator");
    const agentEvents = sent.filter((e) => e.type === "goal_agent");
    expect(orchEvents).toHaveLength(2);
    expect(agentEvents).toHaveLength(1);
    expect((agentEvents[0] as { milestoneId: string }).milestoneId).toBe("M0");
  });
});
