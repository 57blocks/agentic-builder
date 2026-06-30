// src/_config/__tests__/pipeline-flow-prototype.test.ts
import { describe, it, expect } from "vitest";
import {
  getStepsForTier,
  areDependenciesMet,
  getFlowNode,
  STEP_LABELS,
} from "@/_config/pipeline-flow";

describe("prototype step — flow integration & isolation", () => {
  it("is visible for M and L tiers, hidden for S", () => {
    expect(getStepsForTier("M")).toContain("prototype");
    expect(getStepsForTier("L")).toContain("prototype");
    expect(getStepsForTier("S")).not.toContain("prototype");
  });

  it("depends on trd and nothing else", () => {
    const node = getFlowNode("prototype");
    expect(node?.dependsOn).toEqual(["trd"]);
  });

  it("is depended-on by NO other node (cannot block the flow)", () => {
    const everyId = [
      ...getStepsForTier("S"), ...getStepsForTier("M"), ...getStepsForTier("L"),
    ];
    for (const id of new Set(everyId)) {
      const node = getFlowNode(id);
      expect(node?.dependsOn ?? []).not.toContain("prototype");
    }
  });

  it("its own dependency is satisfied once trd is completed", () => {
    expect(areDependenciesMet("prototype", new Set(["trd"]))).toBe(true);
    expect(areDependenciesMet("prototype", new Set())).toBe(false);
  });

  it("has a display label", () => {
    expect(STEP_LABELS.prototype).toBe("Prototype");
  });
});
