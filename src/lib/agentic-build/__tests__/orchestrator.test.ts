/**
 * Tests for the agentic-build core engine (no LLM, no shell):
 *  - acceptance runner: pass/fail/skipped, optional, precondition, expectOutput.
 *  - orchestrator: advance on pass, retry-with-feedback then pass, fail after cap,
 *    dependsOn skip, resume skips already-passed, progress persisted.
 *  - plan extractor: defensive JSON parsing.
 */

import { describe, expect, it, vi } from "vitest";
import type { BuildExecutor, CommandResult, RunOptions } from "../executor";
import {
  runAcceptanceCommand,
  runMilestoneAcceptance,
  renderAcceptanceFeedback,
} from "../acceptance";
import { runBuildPlan, loadProgress } from "../orchestrator";
import { parseBuildPlanDraft } from "../plan-extractor";
import type { BuildPlan, Milestone } from "../types";
import type {
  RunMilestoneAgentInput,
  RunMilestoneAgentResult,
} from "../milestone-agent";

/** Scriptable in-memory executor. `scripts[command]` is a queue of results;
 *  each call shifts one (last one repeats). Unknown commands default to exit 0. */
class FakeExecutor implements BuildExecutor {
  readonly workspaceDir = "/fake/ws";
  files = new Map<string, string>();
  runLog: string[] = [];
  constructor(private scripts: Record<string, Partial<CommandResult>[]> = {}) {}

  async run(command: string, _opts?: RunOptions): Promise<CommandResult> {
    this.runLog.push(command);
    const queue = this.scripts[command];
    const part = queue && queue.length > 0
      ? (queue.length > 1 ? queue.shift()! : queue[0])
      : {};
    const exitCode = part.exitCode ?? 0;
    const stdout = part.stdout ?? "";
    const stderr = part.stderr ?? "";
    return {
      exitCode,
      stdout,
      stderr,
      output: part.output ?? (stdout + stderr).trim(),
      timedOut: part.timedOut ?? false,
      durationMs: 1,
    };
  }
  async readFile(p: string): Promise<string | null> {
    return this.files.has(p) ? this.files.get(p)! : null;
  }
  async writeFile(p: string, content: string): Promise<void> {
    this.files.set(p, content);
  }
  async listFiles(): Promise<string[]> {
    return [...this.files.keys()];
  }
}

function milestone(id: string, acc: Milestone["acceptance"], extra: Partial<Milestone> = {}): Milestone {
  return { id, title: id, instructions: `build ${id}`, acceptance: acc, ...extra };
}

function plan(milestones: Milestone[]): BuildPlan {
  return { projectName: "demo", workspaceDir: "/fake/ws", milestones };
}

const noopAgent = async (
  _input: RunMilestoneAgentInput,
): Promise<RunMilestoneAgentResult> => ({
  filesTouched: [],
  steps: 1,
  costUsd: 0,
  finished: true,
});

describe("acceptance runner", () => {
  it("passes on exit 0 and fails on non-zero", async () => {
    const ex = new FakeExecutor({ ok: [{ exitCode: 0 }], bad: [{ exitCode: 1 }] });
    expect((await runAcceptanceCommand({ command: "ok" }, ex)).outcome).toBe("pass");
    expect((await runAcceptanceCommand({ command: "bad" }, ex)).outcome).toBe("fail");
  });

  it("honours passExitCodes and expectOutput", async () => {
    const ex = new FakeExecutor({
      a: [{ exitCode: 2 }],
      b: [{ exitCode: 0, output: "E2E PASS" }],
      c: [{ exitCode: 0, output: "nope" }],
    });
    expect((await runAcceptanceCommand({ command: "a", passExitCodes: [2] }, ex)).outcome).toBe("pass");
    expect((await runAcceptanceCommand({ command: "b", expectOutput: "E2E PASS" }, ex)).outcome).toBe("pass");
    expect((await runAcceptanceCommand({ command: "c", expectOutput: "E2E PASS" }, ex)).outcome).toBe("fail");
  });

  it("skips when precondition guard fails", async () => {
    const ex = new FakeExecutor({ guard: [{ exitCode: 1 }], real: [{ exitCode: 0 }] });
    const r = await runAcceptanceCommand({ command: "real", precondition: "guard" }, ex);
    expect(r.outcome).toBe("skipped");
    expect(ex.runLog).not.toContain("real");
  });

  it("optional failure does not block the milestone", async () => {
    const ex = new FakeExecutor({ hard: [{ exitCode: 0 }], soft: [{ exitCode: 1 }] });
    const m = milestone("M0", [
      { command: "hard" },
      { command: "soft", optional: true },
    ]);
    const acc = await runMilestoneAcceptance(m, ex);
    expect(acc.passed).toBe(true);
    expect(renderAcceptanceFeedback(acc.results)).toBe("");
  });

  it("renders feedback only for blocking failures", async () => {
    const ex = new FakeExecutor({ a: [{ exitCode: 1, output: "boom" }] });
    const acc = await runMilestoneAcceptance(milestone("M0", [{ command: "a" }]), ex);
    const fb = renderAcceptanceFeedback(acc.results);
    expect(fb).toContain("FAILED");
    expect(fb).toContain("boom");
  });
});

describe("orchestrator", () => {
  it("advances through milestones when acceptance passes", async () => {
    const ex = new FakeExecutor();
    const res = await runBuildPlan({
      plan: plan([
        milestone("M0", [{ command: "true0" }]),
        milestone("M1", [{ command: "true1" }]),
      ]),
      executor: ex,
      runMilestoneImpl: noopAgent,
    });
    expect(res.outcome).toBe("passed");
    expect(res.milestones.map((m) => m.outcome)).toEqual(["passed", "passed"]);
  });

  it("retries with feedback then passes", async () => {
    // First acceptance run fails, second passes.
    const ex = new FakeExecutor({ chk: [{ exitCode: 1, output: "fail once" }, { exitCode: 0 }] });
    const agent = vi.fn(noopAgent);
    const res = await runBuildPlan({
      plan: plan([milestone("M0", [{ command: "chk" }])]),
      executor: ex,
      maxAttemptsPerMilestone: 3,
      runMilestoneImpl: agent,
    });
    expect(res.outcome).toBe("passed");
    expect(res.milestones[0].attempts).toBe(2);
    expect(agent).toHaveBeenCalledTimes(2);
    // Second agent call should have received the failure feedback.
    expect(agent.mock.calls[1][0].attemptInstruction).toContain("FAILED");
  });

  it("fails after exhausting attempts and stops the run", async () => {
    const ex = new FakeExecutor({ chk: [{ exitCode: 1, output: "always" }] });
    const res = await runBuildPlan({
      plan: plan([
        milestone("M0", [{ command: "chk" }]),
        milestone("M1", [{ command: "true1" }]),
      ]),
      executor: ex,
      maxAttemptsPerMilestone: 2,
      runMilestoneImpl: noopAgent,
    });
    expect(res.outcome).toBe("failed");
    expect(res.failedAt).toBe("M0");
    expect(res.milestones[0].attempts).toBe(2);
    // M1 never ran.
    expect(res.milestones.find((m) => m.id === "M1")).toBeUndefined();
  });

  it("persists progress and resumes skipping passed milestones", async () => {
    const ex = new FakeExecutor();
    await runBuildPlan({
      plan: plan([milestone("M0", [{ command: "t" }])]),
      executor: ex,
      runMilestoneImpl: noopAgent,
    });
    const prog = await loadProgress(ex);
    expect(prog?.passed).toEqual(["M0"]);

    const agent = vi.fn(noopAgent);
    const res = await runBuildPlan({
      plan: plan([
        milestone("M0", [{ command: "t" }]),
        milestone("M1", [{ command: "t1" }]),
      ]),
      executor: ex,
      resume: true,
      runMilestoneImpl: agent,
    });
    expect(res.outcome).toBe("passed");
    // M0's historical `passed` result is carried over; the agent is NOT re-run
    // for it — only M1 runs this time.
    expect(res.milestones.find((m) => m.id === "M0")?.outcome).toBe("passed");
    expect(agent).toHaveBeenCalledTimes(1);
    expect(agent.mock.calls[0][0].milestone.id).toBe("M1");
  });

  it("skips a milestone whose explicit dependency never passed", async () => {
    const ex = new FakeExecutor({ chk: [{ exitCode: 1 }] });
    const res = await runBuildPlan({
      plan: plan([
        milestone("M0", [{ command: "chk" }]),
        milestone("M2", [{ command: "t" }], { dependsOn: ["M0"] }),
      ]),
      executor: ex,
      maxAttemptsPerMilestone: 1,
      runMilestoneImpl: noopAgent,
    });
    expect(res.outcome).toBe("failed");
    expect(res.failedAt).toBe("M0");
  });
});

describe("parseBuildPlanDraft", () => {
  it("parses milestones with acceptance, precondition and optional", () => {
    const draft = parseBuildPlanDraft(
      JSON.stringify({
        projectName: "pi",
        context: "no torch in coordinator",
        milestones: [
          {
            id: "M9",
            title: "real model",
            instructions: "run real e2e",
            acceptance: [
              { command: "bash scripts/e2e_real_smoke.sh", expectOutput: "REAL E2E PASS", precondition: "test -f ./checkpoints/v16.ckpt", optional: true },
            ],
          },
        ],
      }),
    );
    expect(draft.projectName).toBe("pi");
    expect(draft.milestones).toHaveLength(1);
    const a = draft.milestones[0].acceptance[0];
    expect(a.precondition).toBe("test -f ./checkpoints/v16.ckpt");
    expect(a.optional).toBe(true);
    expect(a.expectOutput).toBe("REAL E2E PASS");
  });

  it("degrades to empty milestones on non-JSON", () => {
    expect(parseBuildPlanDraft("garbage").milestones).toEqual([]);
  });

  it("drops milestones with neither instructions nor acceptance", () => {
    const draft = parseBuildPlanDraft(
      JSON.stringify({ projectName: "x", milestones: [{ id: "M0" }, { id: "M1", instructions: "do", acceptance: [{ command: "c" }] }] }),
    );
    expect(draft.milestones.map((m) => m.id)).toEqual(["M1"]);
  });
});
