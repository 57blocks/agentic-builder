import { describe, expect, it, vi } from "vitest";

import { runDomainScopedBreakdown, isFoundationTask, type BreakdownFn, type BreakdownInput } from "../domain-breakdown";
import type { SubsystemManifest } from "../types";
import type { KickoffWorkItem } from "../../types";

function task(id: string, phase: string, title = id): KickoffWorkItem {
  return { id, phase, title, description: "", estimatedHours: 1, executionKind: "ai_autonomous" };
}

const MANIFEST: SubsystemManifest = {
  version: 1,
  subsystems: [
    { id: "auth", name: "a", ownedRoutes: [], ownedApiEndpoints: [], ownedCollections: [], ownedModules: [], dependsOn: [], prdSections: [] },
    { id: "billing", name: "b", ownedRoutes: [], ownedApiEndpoints: [], ownedCollections: [], ownedModules: [], dependsOn: ["auth"], prdSections: [] },
  ],
};

describe("isFoundationTask", () => {
  it("treats structural phases + the frontend foundation task as foundation", () => {
    expect(isFoundationTask(task("t", "Data Layer"))).toBe(true);
    expect(isFoundationTask(task("t", "Scaffolding"))).toBe(true);
    expect(isFoundationTask(task("t", "Frontend", "Implement frontend foundation (design tokens, shell)"))).toBe(true);
    expect(isFoundationTask(task("t", "Frontend", "Family Dashboard page"))).toBe(false);
    expect(isFoundationTask(task("t", "Backend Services"))).toBe(false);
  });
});

describe("runDomainScopedBreakdown", () => {
  it("keeps foundation tasks, runs scoped per domain in topo order, tags each", async () => {
    const calls: BreakdownInput[] = [];
    const breakdownFn: BreakdownFn = vi.fn(async (input) => {
      calls.push(input);
      if (!input.incremental) {
        // foundation full pass: mix of structural + domain tasks
        return { tasks: [task("F-scaffold", "Scaffolding"), task("F-models", "Data Layer"), task("X-page", "Frontend", "Some page")], costUsd: 0.01 };
      }
      // scoped domain pass returns one task per domain
      const dom = input.incremental.requirementsToCover[0];
      return { tasks: [task(`${dom}-svc`, "Backend Services")], costUsd: 0.02 };
    });

    const r = await runDomainScopedBreakdown({
      docs: { prd: "PRD" },
      manifest: MANIFEST,
      domainRequirementIds: new Map([["auth", ["API-001"]], ["billing", ["API-010"]]]),
      buildLayers: [["auth"], ["billing"]],
      breakdownFn,
    });

    // foundation = only structural tasks (X-page dropped)
    expect(r.foundationTasks.map((t) => t.id).sort()).toEqual(["F-models", "F-scaffold"]);
    // each domain tagged
    expect(r.byDomain.get("auth")!.every((t) => t.subsystem === "auth")).toBe(true);
    expect(r.byDomain.get("billing")!.every((t) => t.subsystem === "billing")).toBe(true);
    // order: foundation first, then auth (layer 0), then billing (layer 1)
    expect(r.allTasks.map((t) => t.id)).toEqual(["F-scaffold", "F-models", "API-001-svc", "API-010-svc"]);
    // cost summed (foundation 0.01 + 2 domains 0.02 each)
    expect(r.costUsd).toBeCloseTo(0.05, 5);
    // scoped calls carried the domain's requirementsToCover + accumulated existingTasks
    expect(calls[1].incremental!.requirementsToCover).toEqual(["API-001"]);
    expect(calls[1].incremental!.existingTasks.map((t) => t.id)).toEqual(["F-scaffold", "F-models"]);
    // billing pass sees auth's task as already-built
    expect(calls[2].incremental!.existingTasks.map((t) => t.id)).toContain("API-001-svc");
  });

  it("skips a domain with no requirement ids (no breakdown call)", async () => {
    const breakdownFn: BreakdownFn = vi.fn(async () => ({ tasks: [], costUsd: 0 }));
    const r = await runDomainScopedBreakdown({
      docs: { prd: "P" },
      manifest: MANIFEST,
      domainRequirementIds: new Map([["auth", []], ["billing", []]]),
      buildLayers: [["auth"], ["billing"]],
      breakdownFn,
    });
    expect(r.byDomain.get("auth")).toEqual([]);
    // only the foundation full pass was called (no scoped calls)
    expect(breakdownFn).toHaveBeenCalledTimes(1);
  });
});
