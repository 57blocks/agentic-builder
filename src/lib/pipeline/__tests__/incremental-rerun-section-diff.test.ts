import { describe, expect, it } from "vitest";

import {
  buildRegenerationContext,
  computeTaskDelta,
  diffPrdRequirementsWithSections,
} from "../incremental-rerun";
import { splitPrdSections } from "../prd-section-diff";
import type { KickoffSnapshot } from "../kickoff-snapshot";
import type { KickoffWorkItem } from "../types";

const PRD_V1 = `# PRD: Demo

## 1. Overview
The platform tracks coins.

## 2. Features

### 2.1 Listing
- FR-LS01: list coins.
- FR-LS02: filter by chain.

### 2.2 Detail
- FR-DT01: show coin score.
`;

const TASKS: KickoffWorkItem[] = [
  {
    id: "T-001",
    phase: "Backend Services",
    title: "Listing API",
    description: "",
    estimatedHours: 1,
    executionKind: "ai_autonomous",
    coversRequirementIds: ["FR-LS01", "FR-LS02"],
  },
  {
    id: "T-002",
    phase: "Backend Services",
    title: "Detail API",
    description: "",
    estimatedHours: 1,
    executionKind: "ai_autonomous",
    coversRequirementIds: ["FR-DT01"],
  },
  {
    id: "T-003",
    phase: "Scaffolding",
    title: "Project scaffold",
    description: "",
    estimatedHours: 1,
    executionKind: "ai_autonomous",
    // Cross-cutting (no covers) — should never rerun from a content edit.
    coversRequirementIds: [],
  },
];

const PRD_INDEX = {
  acceptanceCriteriaIds: [],
  featureIds: ["FR-LS01", "FR-LS02", "FR-DT01"],
  userStoryIds: [],
  componentIds: [],
};

function snapshot(prd: string): KickoffSnapshot {
  return {
    sessionId: "test-session",
    runId: "test-run",
    savedAt: new Date().toISOString(),
    prdContent: prd,
    prdRequirementIndex: PRD_INDEX,
    tasks: TASKS,
    docs: { prd },
  };
}

describe("diffPrdRequirementsWithSections", () => {
  it("populates `modified` from IDs that appear in changed section bodies", () => {
    const v2 = PRD_V1.replace(
      "- FR-LS01: list coins.",
      "- FR-LS01: list coins (sorted alphabetically by symbol).",
    );
    const changed = splitPrdSections(v2).filter((s) => {
      // Pick out the Listing section as the only changed one.
      return s.heading === "### 2.1 Listing";
    });
    const diff = diffPrdRequirementsWithSections(PRD_INDEX, PRD_INDEX, changed);
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
    // Both IDs live in the touched section body.
    expect(diff.modified).toEqual(["FR-LS01", "FR-LS02"]);
  });

  it("does NOT count purely-added or purely-removed IDs as modified", () => {
    const newIndex = {
      ...PRD_INDEX,
      featureIds: [...PRD_INDEX.featureIds, "FR-AU01"],
    };
    const fakeSection = {
      heading: "### 2.3 Audit",
      level: 3,
      body: "- FR-AU01: audit log.",
    };
    const diff = diffPrdRequirementsWithSections(PRD_INDEX, newIndex, [
      fakeSection,
    ]);
    expect(diff.added).toEqual(["FR-AU01"]);
    expect(diff.modified).toEqual([]);
  });
});

describe("buildRegenerationContext — prose-only edit", () => {
  it("flags the task that covers IDs in the changed section as rerun", () => {
    const v2 = PRD_V1.replace(
      "- FR-LS01: list coins.",
      "- FR-LS01: list coins (sorted alphabetically by symbol).",
    );
    const ctx = buildRegenerationContext({
      previousSnapshot: snapshot(PRD_V1),
      newRequirementIndex: PRD_INDEX,
      newPrdContent: v2,
    });

    expect(ctx.changedSectionHeadings).toEqual(["### 2.1 Listing"]);
    expect(ctx.prdDiff.added).toEqual([]);
    expect(ctx.prdDiff.removed).toEqual([]);
    expect(ctx.prdDiff.modified).toEqual(["FR-LS01", "FR-LS02"]);
    expect(ctx.taskDelta.taskIdsToRerun).toEqual(["T-001"]);
    expect(ctx.taskDelta.obsoleteTaskIds).toEqual([]);
    expect(ctx.taskDelta.requirementsNeedingNewTasks).toEqual([]);
  });

  it("identical PRD produces an empty delta and no changed sections", () => {
    const ctx = buildRegenerationContext({
      previousSnapshot: snapshot(PRD_V1),
      newRequirementIndex: PRD_INDEX,
      newPrdContent: PRD_V1,
    });
    expect(ctx.changedSectionHeadings).toEqual([]);
    expect(ctx.prdDiff.added).toEqual([]);
    expect(ctx.prdDiff.removed).toEqual([]);
    expect(ctx.prdDiff.modified).toEqual([]);
    expect(ctx.taskDelta.taskIdsToRerun).toEqual([]);
  });

  it("retains old behavior (empty modified) when newPrdContent is omitted", () => {
    const ctx = buildRegenerationContext({
      previousSnapshot: snapshot(PRD_V1),
      newRequirementIndex: PRD_INDEX,
    });
    expect(ctx.changedSectionHeadings).toEqual([]);
    expect(ctx.prdDiff.modified).toEqual([]);
  });
});

describe("computeTaskDelta — modified-IDs path", () => {
  it("marks task rerun when its covers intersect `modified`", () => {
    const delta = computeTaskDelta(TASKS, {
      added: [],
      removed: [],
      modified: ["FR-DT01"],
    });
    expect(delta.taskIdsToRerun).toEqual(["T-002"]);
    expect(delta.obsoleteTaskIds).toEqual([]);
    expect(delta.requirementsNeedingNewTasks).toEqual([]);
  });

  it("never touches cross-cutting tasks (empty covers)", () => {
    const delta = computeTaskDelta(TASKS, {
      added: [],
      removed: [],
      modified: ["FR-LS01", "FR-DT01"],
    });
    expect(delta.taskIdsToRerun).not.toContain("T-003");
  });
});
