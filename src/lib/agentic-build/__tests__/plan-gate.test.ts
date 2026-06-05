/**
 * Tests for the goal-mode routing layer:
 *  - hasPlanSignals: conservative detection (both milestone + acceptance needed).
 *  - planHasUsableAcceptance: requires a real acceptance command.
 *  - plan-store: write/read/loadGoalModePlan round-trip + gating.
 *  - maybeExtractAndPersistPlan: only persists when signals + usable plan.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs/promises";
import os from "os";
import path from "path";

import { hasPlanSignals, planHasUsableAcceptance } from "../plan-detection";
import {
  writeBuildPlan,
  readBuildPlan,
  loadGoalModePlan,
} from "../plan-store";
import { maybeExtractAndPersistPlan } from "../plan-gate";
import type { BuildPlanDraft, ExtractBuildPlanResult } from "../plan-extractor";

const PLAN_WITH_ACCEPTANCE: BuildPlanDraft = {
  projectName: "pi-node",
  context: "coordinator has zero torch",
  milestones: [
    {
      id: "M0",
      title: "bootstrap",
      instructions: "scaffold compose",
      acceptance: [{ command: "docker compose config", label: "compose valid" }],
    },
  ],
};

describe("hasPlanSignals (conservative)", () => {
  it("detects when milestone + acceptance signals both present", () => {
    const md = `## Milestones\n- M0: bootstrap\n- M1: embed\n\nAcceptance: each step's command must exit 0.`;
    expect(hasPlanSignals(md).detected).toBe(true);
  });

  it("detects via >=2 M<n> ids + exit code wording", () => {
    const md = `Build M0 then M1 then M2. Each verified by its shell exit code.`;
    expect(hasPlanSignals(md).detected).toBe(true);
  });

  it("rejects an ordinary PRD with no acceptance signal", () => {
    const md = `# PRD\nThe TeacherDashboardPage shows classes. Families enroll students. Milestone planning is informal.`;
    // has "milestone" word but no acceptance/exit-code signal
    expect(hasPlanSignals(md).detected).toBe(false);
  });

  it("rejects acceptance wording with no milestone structure", () => {
    const md = `User acceptance testing will be done manually before launch.`;
    expect(hasPlanSignals(md).detected).toBe(false);
  });
});

describe("planHasUsableAcceptance", () => {
  it("true when a milestone has a non-empty command", () => {
    expect(planHasUsableAcceptance(PLAN_WITH_ACCEPTANCE)).toBe(true);
  });
  it("false when no acceptance commands", () => {
    const empty: BuildPlanDraft = {
      projectName: "x",
      context: "",
      milestones: [{ id: "M0", title: "t", instructions: "i", acceptance: [] }],
    };
    expect(planHasUsableAcceptance(empty)).toBe(false);
  });
});

describe("plan-store round-trip + gating", () => {
  let root: string;
  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "plan-store-"));
  });
  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it("writes and reads back the plan", async () => {
    await writeBuildPlan(root, {
      ...PLAN_WITH_ACCEPTANCE,
      source: "extracted",
      createdAt: new Date().toISOString(),
    });
    const got = await readBuildPlan(root);
    expect(got?.projectName).toBe("pi-node");
    expect(got?.milestones).toHaveLength(1);
  });

  it("loadGoalModePlan returns null when no file", async () => {
    expect(await loadGoalModePlan(root)).toBeNull();
  });

  it("loadGoalModePlan returns null when plan lacks usable acceptance", async () => {
    await writeBuildPlan(root, {
      projectName: "x",
      context: "",
      milestones: [{ id: "M0", title: "t", instructions: "i", acceptance: [] }],
      source: "extracted",
      createdAt: new Date().toISOString(),
    });
    expect(await loadGoalModePlan(root)).toBeNull();
  });

  it("loadGoalModePlan returns the plan when usable", async () => {
    await writeBuildPlan(root, {
      ...PLAN_WITH_ACCEPTANCE,
      source: "extracted",
      createdAt: new Date().toISOString(),
    });
    const got = await loadGoalModePlan(root);
    expect(got?.milestones[0]?.acceptance[0]?.command).toBe("docker compose config");
  });
});

describe("maybeExtractAndPersistPlan", () => {
  let root: string;
  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "plan-gate-"));
  });
  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  const fakeExtract = (plan: BuildPlanDraft) =>
    vi.fn(
      async (): Promise<ExtractBuildPlanResult> => ({
        plan,
        model: "fake-model",
        promptVersion: "test",
        costUsd: 0,
        durationMs: 1,
      }),
    );

  it("does NOT extract when no plan signals", async () => {
    const extractImpl = fakeExtract(PLAN_WITH_ACCEPTANCE);
    const res = await maybeExtractAndPersistPlan({
      projectRoot: root,
      specMarkdown: "# Plain PRD\nFamilies enroll students. Teachers see classes.",
      extractImpl,
    });
    expect(res.persisted).toBe(false);
    expect(extractImpl).not.toHaveBeenCalled();
    expect(await readBuildPlan(root)).toBeNull();
  });

  it("persists when signals present and plan usable", async () => {
    const extractImpl = fakeExtract(PLAN_WITH_ACCEPTANCE);
    const res = await maybeExtractAndPersistPlan({
      projectRoot: root,
      specMarkdown: "Milestones M0, M1. Acceptance commands must exit 0.",
      extractImpl,
    });
    expect(res.persisted).toBe(true);
    expect(res.milestones).toBe(1);
    expect(extractImpl).toHaveBeenCalledOnce();
    const saved = await readBuildPlan(root);
    expect(saved?.source).toBe("extracted");
    expect(saved?.model).toBe("fake-model");
  });

  it("does NOT persist when extracted plan has no usable acceptance", async () => {
    const unusable: BuildPlanDraft = {
      projectName: "x",
      context: "",
      milestones: [{ id: "M0", title: "t", instructions: "i", acceptance: [] }],
    };
    const res = await maybeExtractAndPersistPlan({
      projectRoot: root,
      specMarkdown: "Milestones M0, M1. Acceptance commands must exit 0.",
      extractImpl: fakeExtract(unusable),
    });
    expect(res.persisted).toBe(false);
    expect(await readBuildPlan(root)).toBeNull();
  });

  it("degrades gracefully when extraction throws", async () => {
    const res = await maybeExtractAndPersistPlan({
      projectRoot: root,
      specMarkdown: "Milestones M0, M1. Acceptance commands must exit 0.",
      extractImpl: vi.fn(async () => {
        throw new Error("LLM down");
      }),
    });
    expect(res.persisted).toBe(false);
    expect(res.reason).toContain("extraction failed");
  });
});
