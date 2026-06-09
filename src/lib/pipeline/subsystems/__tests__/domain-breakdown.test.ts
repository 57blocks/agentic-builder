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

  it("same-layer domains run on the same existingTasks snapshot (don't see each other); later layers see both", async () => {
    const calls: Record<string, string[]> = {};
    const breakdownFn: BreakdownFn = vi.fn(async (input) => {
      if (!input.incremental) return { tasks: [task("F", "Data Layer")], costUsd: 0 };
      const dom = input.incremental.requirementsToCover[0];
      calls[dom] = input.incremental.existingTasks.map((t: { id: string }) => t.id);
      return { tasks: [task(`${dom}-t`, "Backend Services")], costUsd: 0 };
    });
    const manifest3: SubsystemManifest = {
      version: 1,
      subsystems: ["a", "b", "c"].map((id) => ({ id, name: id, ownedRoutes: [], ownedApiEndpoints: [], ownedCollections: [], ownedModules: [], dependsOn: id === "c" ? ["a", "b"] : [], prdSections: [] })),
    };
    await runDomainScopedBreakdown({
      docs: { prd: "P" },
      manifest: manifest3,
      domainRequirementIds: new Map([["a", ["RA"]], ["b", ["RB"]], ["c", ["RC"]]]),
      buildLayers: [["a", "b"], ["c"]], // a,b same layer; c later
      breakdownFn,
    });
    // a and b (same layer) both see only the foundation task, NOT each other
    expect(calls["RA"]).toEqual(["F"]);
    expect(calls["RB"]).toEqual(["F"]);
    // c (later layer) sees foundation + a + b (tasks named by their req id in this fake)
    expect(calls["RC"]).toEqual(["F", "RA-t", "RB-t"]);
  });

  it("feeds each domain a SCOPED prd slice (own sections + shared), not the full PRD", async () => {
    const PRD = `# PRD
## 7. 信息架构
nav map
## 8. UI 组件库规格
Button specs.
## 10. Auth pages
### 10.1 Login
login page body AUTHONLY
## 20. Billing pages
### 20.1 Invoice
invoice page body BILLINGONLY
`;
    const manifest: SubsystemManifest = {
      version: 1,
      subsystems: [
        { id: "auth", name: "Auth", ownedRoutes: [], ownedApiEndpoints: [], ownedCollections: [], ownedModules: [], dependsOn: [], prdSections: ["§10.1"] },
        { id: "billing", name: "Billing", ownedRoutes: [], ownedApiEndpoints: [], ownedCollections: [], ownedModules: [], dependsOn: [], prdSections: ["§20.1"] },
      ],
    };
    const prdByDomain: Record<string, string> = {};
    const breakdownFn: BreakdownFn = vi.fn(async (input) => {
      if (!input.incremental) return { tasks: [task("F", "Data Layer")], costUsd: 0 };
      prdByDomain[input.incremental.requirementsToCover[0]] = input.prd;
      return { tasks: [task("t", "Backend Services")], costUsd: 0 };
    });
    await runDomainScopedBreakdown({
      docs: { prd: PRD },
      manifest,
      domainRequirementIds: new Map([["auth", ["§10.1"]], ["billing", ["§20.1"]]]),
      buildLayers: [["auth", "billing"]],
      breakdownFn,
    });
    const authPrd = prdByDomain["§10.1"];
    expect(authPrd).toContain("AUTHONLY"); // own section
    expect(authPrd).toContain("UI 组件库规格"); // shared spec injected
    expect(authPrd).not.toContain("BILLINGONLY"); // other domain's section excluded
    expect(authPrd).not.toBe(PRD); // not the full mega-PRD
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
