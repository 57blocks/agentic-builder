/**
 * Unit tests for `applyTaskBreakdownPatches`.
 *
 * Covers all three deterministic rules:
 *   • Rule A — worker-startup-wiring
 *   • Rule B — pipeline-dag-worker-coverage
 *   • Rule C — coverage-repair-orphan-merge
 *
 * Each rule is exercised in isolation, then a combined scenario reproduces
 * the real-world TRD-driven defect set that motivated the patches in the
 * first place (scoring-cycle without scoringWorker, no server.ts wiring,
 * fileless coverage-repair orphans).
 */

import { describe, expect, it } from "vitest";
import {
  applyTaskBreakdownPatches,
  type TaskBreakdownPatchEntry,
} from "../task-breakdown-patches";
import type { KickoffWorkItem } from "@/lib/pipeline/types";

function task(
  overrides: Partial<KickoffWorkItem> & Pick<KickoffWorkItem, "id">,
): KickoffWorkItem {
  return {
    id: overrides.id,
    phase: overrides.phase ?? "Backend Services",
    title: overrides.title ?? `Task ${overrides.id}`,
    description: overrides.description ?? "",
    estimatedHours: overrides.estimatedHours ?? 1,
    executionKind: overrides.executionKind ?? "ai_autonomous",
    files: overrides.files ?? { creates: [], modifies: [], reads: [] },
    dependencies: overrides.dependencies ?? [],
    coversRequirementIds: overrides.coversRequirementIds,
    acceptanceCriteria: overrides.acceptanceCriteria,
    subSteps: overrides.subSteps,
    priority: overrides.priority,
    tokenEstimate: overrides.tokenEstimate,
    humanReviewHours: overrides.humanReviewHours,
    tddPlan: overrides.tddPlan,
  };
}

function findPatch(
  patches: TaskBreakdownPatchEntry[],
  ruleId: TaskBreakdownPatchEntry["ruleId"],
): TaskBreakdownPatchEntry | undefined {
  return patches.find((p) => p.ruleId === ruleId);
}

describe("Rule A — worker-startup-wiring", () => {
  it("adds backend/src/server.ts + a wiring substep to the task that owns the most worker files", () => {
    const tasks: KickoffWorkItem[] = [
      task({
        id: "T-001",
        phase: "Data Layer",
        files: { creates: ["backend/src/models/User.ts"], modifies: [], reads: [] },
      }),
      task({
        id: "T-004",
        phase: "Backend Services",
        files: {
          creates: [
            "backend/src/workers/marketDataWorker.ts",
            "backend/src/workers/sentimentWorker.ts",
            "backend/src/workers/onchainWorker.ts",
          ],
          modifies: [],
          reads: [],
        },
      }),
      task({
        id: "T-014",
        phase: "Backend Services",
        files: {
          creates: ["backend/src/workers/notificationWorker.ts"],
          modifies: [],
          reads: [],
        },
      }),
    ];

    const result = applyTaskBreakdownPatches({ tasks });
    const owner = result.tasks.find((t) => t.id === "T-004");
    expect(owner).toBeDefined();
    const plan = owner!.files as { creates: string[]; modifies: string[]; reads: string[] };
    expect(plan.modifies).toContain("backend/src/server.ts");
    const substepDetails = (owner!.subSteps ?? []).map((s) => s.detail).join("\n");
    expect(substepDetails).toMatch(/server\.ts/);
    expect(substepDetails).toMatch(/start\*Worker|start\\\*Worker/);

    const patch = findPatch(result.patches, "worker-startup-wiring");
    expect(patch?.taskId).toBe("T-004");
  });

  it("skips wiring when no task creates a worker file", () => {
    const tasks: KickoffWorkItem[] = [
      task({
        id: "T-001",
        files: { creates: ["backend/src/models/User.ts"], modifies: [], reads: [] },
      }),
    ];
    const result = applyTaskBreakdownPatches({ tasks });
    expect(findPatch(result.patches, "worker-startup-wiring")).toBeUndefined();
  });

  it("does NOT re-wire server.ts when some task already touches it", () => {
    const tasks: KickoffWorkItem[] = [
      task({
        id: "T-004",
        files: {
          creates: ["backend/src/workers/marketDataWorker.ts"],
          modifies: ["backend/src/server.ts"],
          reads: [],
        },
      }),
    ];
    const result = applyTaskBreakdownPatches({ tasks });
    expect(findPatch(result.patches, "worker-startup-wiring")).toBeUndefined();
  });
});

describe("Rule B — pipeline-dag-worker-coverage", () => {
  const pipelineDagYaml = `pipelines:
  - id: market-data-ingestion
    schedule: { cron: "2,32 * * * *" }
  - id: onchain-analytics-ingestion
    schedule: { cron: "3,18,33,48 * * * *" }
  - id: scoring-cycle
    schedule: { cron: "0,15,30,45 * * * *" }
`;

  it("injects a scoringWorker.ts into the task that owns scoringService.ts when pipeline-dag declares scoring-cycle but no worker matches", () => {
    const tasks: KickoffWorkItem[] = [
      task({
        id: "T-004",
        files: {
          creates: [
            "backend/src/workers/marketDataWorker.ts",
            "backend/src/workers/onchainWorker.ts",
          ],
          modifies: [],
          reads: [],
        },
      }),
      task({
        id: "T-005",
        files: {
          creates: [
            "backend/src/services/scoringService.ts",
            "backend/src/api/modules/coins/coins.routes.ts",
          ],
          modifies: [],
          reads: [],
        },
      }),
    ];

    const result = applyTaskBreakdownPatches({ tasks, pipelineDagYaml });
    const owner = result.tasks.find((t) => t.id === "T-005");
    const plan = owner!.files as { creates: string[]; modifies: string[]; reads: string[] };
    expect(plan.creates).toContain("backend/src/workers/scoringWorker.ts");

    const patch = findPatch(result.patches, "pipeline-dag-worker-coverage");
    expect(patch?.taskId).toBe("T-005");
    expect(patch?.details?.workerFile).toBe(
      "backend/src/workers/scoringWorker.ts",
    );
    const substepDetails = (owner!.subSteps ?? []).map((s) => s.detail).join("\n");
    expect(substepDetails).toMatch(/scoringWorker\.ts/);
    expect(substepDetails).toMatch(/startScoringWorker/);
  });

  it("does NOT inject when every scheduled pipeline already has a matching worker", () => {
    const tasks: KickoffWorkItem[] = [
      task({
        id: "T-004",
        files: {
          creates: [
            "backend/src/workers/marketDataWorker.ts",
            "backend/src/workers/onchainWorker.ts",
            "backend/src/workers/scoringWorker.ts",
          ],
          modifies: [],
          reads: [],
        },
      }),
    ];
    const result = applyTaskBreakdownPatches({ tasks, pipelineDagYaml });
    expect(
      findPatch(result.patches, "pipeline-dag-worker-coverage"),
    ).toBeUndefined();
  });

  it("is a no-op when no pipeline-dag content is supplied", () => {
    const tasks: KickoffWorkItem[] = [
      task({
        id: "T-005",
        files: {
          creates: ["backend/src/services/scoringService.ts"],
          modifies: [],
          reads: [],
        },
      }),
    ];
    const result = applyTaskBreakdownPatches({ tasks });
    expect(
      findPatch(result.patches, "pipeline-dag-worker-coverage"),
    ).toBeUndefined();
  });
});

describe("Rule C — coverage-repair-orphan-merge", () => {
  it("merges fileless orphans into the closest same-phase sibling and drops the orphan", () => {
    const tasks: KickoffWorkItem[] = [
      task({
        id: "T-005",
        phase: "Backend Services",
        title: "Implement core API routes and business logic",
        description:
          "Create REST API endpoints, scoring service, audit logging.",
        files: {
          creates: [
            "backend/src/services/auditService.ts",
            "backend/src/api/modules/access-requests/access-requests.controller.ts",
          ],
          modifies: [],
          reads: [],
        },
        coversRequirementIds: ["FR-AR02"],
      }),
      task({
        id: "T-013",
        phase: "Backend Services",
        title: "Implement access request decision audit logging",
        description:
          "Add audit trail recording for access request approvals and rejections to satisfy FR-AR05.",
        files: { creates: [], modifies: [], reads: [] },
        coversRequirementIds: ["FR-AR05"],
        acceptanceCriteria: ["Every decision records actor + timestamp"],
      }),
    ];

    const result = applyTaskBreakdownPatches({ tasks });
    expect(result.tasks.map((t) => t.id)).toEqual(["T-005"]);
    const merged = result.tasks[0];
    expect(merged.coversRequirementIds).toEqual(
      expect.arrayContaining(["FR-AR02", "FR-AR05"]),
    );
    expect(merged.acceptanceCriteria).toEqual(
      expect.arrayContaining(["Every decision records actor + timestamp"]),
    );
    const substepActions = (merged.subSteps ?? []).map((s) => s.action).join("\n");
    expect(substepActions).toMatch(/merged from T-013/);

    const patch = findPatch(result.patches, "coverage-repair-orphan-merge");
    expect(patch?.taskId).toBe("T-005");
    expect(patch?.details?.orphanId).toBe("T-013");
  });

  it("prunes dangling dependencies after removing orphans", () => {
    const tasks: KickoffWorkItem[] = [
      task({
        id: "T-005",
        phase: "Backend Services",
        files: {
          creates: ["backend/src/services/auditService.ts"],
          modifies: [],
          reads: [],
        },
        coversRequirementIds: ["FR-AR02"],
      }),
      task({
        id: "T-013",
        phase: "Backend Services",
        description: "audit decision",
        files: { creates: [], modifies: [], reads: [] },
        coversRequirementIds: ["FR-AR05"],
      }),
      task({
        id: "T-020",
        phase: "Backend Services",
        files: {
          creates: ["backend/src/api/modules/audit/audit.routes.ts"],
          modifies: [],
          reads: [],
        },
        dependencies: ["T-005", "T-013"],
        coversRequirementIds: ["FR-AR06"],
      }),
    ];
    const result = applyTaskBreakdownPatches({ tasks });
    const t020 = result.tasks.find((t) => t.id === "T-020")!;
    expect(t020.dependencies).toEqual(["T-005"]);
  });

  it("falls back to any task with files when no same-phase parent has a file plan", () => {
    const tasks: KickoffWorkItem[] = [
      task({
        id: "T-001",
        phase: "Data Layer",
        files: {
          creates: ["backend/src/models/User.ts"],
          modifies: [],
          reads: [],
        },
      }),
      task({
        id: "T-099",
        phase: "Backend Services",
        description: "lonely orphan",
        files: { creates: [], modifies: [], reads: [] },
        coversRequirementIds: ["FR-Z01"],
      }),
    ];
    const result = applyTaskBreakdownPatches({ tasks });
    expect(result.tasks.map((t) => t.id)).toEqual(["T-001"]);
    const merged = result.tasks[0];
    expect(merged.coversRequirementIds).toContain("FR-Z01");
  });
});

describe("combined scenario — real-world TRD case", () => {
  it("applies all three rules in one pass", () => {
    const pipelineDagYaml = `pipelines:
  - id: market-data-ingestion
    schedule: { cron: "2,32 * * * *" }
  - id: scoring-cycle
    schedule: { cron: "0,15,30,45 * * * *" }
`;

    const tasks: KickoffWorkItem[] = [
      task({
        id: "T-001",
        phase: "Data Layer",
        files: { creates: ["backend/src/models/User.ts"], modifies: [], reads: [] },
        coversRequirementIds: ["FR-DI01"],
      }),
      task({
        id: "T-004",
        phase: "Backend Services",
        files: {
          creates: [
            "backend/src/workers/marketDataWorker.ts",
            "backend/src/workers/sentimentWorker.ts",
          ],
          modifies: [],
          reads: [],
        },
        coversRequirementIds: ["FR-DI02"],
      }),
      task({
        id: "T-005",
        phase: "Backend Services",
        files: {
          creates: [
            "backend/src/services/scoringService.ts",
            "backend/src/services/auditService.ts",
          ],
          modifies: [],
          reads: [],
        },
        coversRequirementIds: ["FR-MN01"],
      }),
      task({
        id: "T-013",
        phase: "Backend Services",
        description: "Add access request decision audit",
        files: { creates: [], modifies: [], reads: [] },
        coversRequirementIds: ["FR-AR05"],
      }),
    ];

    const result = applyTaskBreakdownPatches({ tasks, pipelineDagYaml });

    expect(findPatch(result.patches, "worker-startup-wiring")?.taskId).toBe("T-004");
    expect(findPatch(result.patches, "pipeline-dag-worker-coverage")?.taskId).toBe(
      "T-005",
    );
    expect(findPatch(result.patches, "coverage-repair-orphan-merge")?.taskId).toBeDefined();

    expect(result.tasks.map((t) => t.id)).not.toContain("T-013");
    const t005 = result.tasks.find((t) => t.id === "T-005")!;
    const t005Plan = t005.files as { creates: string[]; modifies: string[]; reads: string[] };
    expect(t005Plan.creates).toContain("backend/src/workers/scoringWorker.ts");
    expect(t005.coversRequirementIds).toEqual(
      expect.arrayContaining(["FR-MN01", "FR-AR05"]),
    );

    const t004 = result.tasks.find((t) => t.id === "T-004")!;
    const t004Plan = t004.files as { creates: string[]; modifies: string[]; reads: string[] };
    expect(t004Plan.modifies).toContain("backend/src/server.ts");
  });
});
