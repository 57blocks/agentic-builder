import { describe, it, expect } from "vitest";
import { renormalizeWeightedAverage } from "@/lib/pipeline/coding-outcome-score";

describe("renormalizeWeightedAverage", () => {
  it("returns simple weighted average when all dims present", () => {
    const result = renormalizeWeightedAverage([
      { score: 80, weight: 0.5, absent: false },
      { score: 60, weight: 0.5, absent: false },
    ]);
    expect(result.score).toBe(70);
    expect(result.activeWeights).toEqual({ "0": 0.5, "1": 0.5 });
  });

  it("scales remaining weights up when one dim absent", () => {
    const result = renormalizeWeightedAverage([
      { score: 80, weight: 0.5, absent: false, label: "a" },
      { score: null, weight: 0.5, absent: true, label: "b" },
    ]);
    expect(result.score).toBe(80);
    expect(result.activeWeights).toEqual({ a: 1 });
    expect(result.absentLabels).toEqual(["b"]);
  });

  it("returns null score when all absent", () => {
    const result = renormalizeWeightedAverage([
      { score: null, weight: 0.5, absent: true, label: "a" },
      { score: null, weight: 0.5, absent: true, label: "b" },
    ]);
    expect(result.score).toBeNull();
    expect(result.absentLabels).toEqual(["a", "b"]);
  });
});
