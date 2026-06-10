import { describe, it, expect } from "vitest";
import {
  renormalizeWeightedAverage,
  scoreStaticChecks,
  scoreComplexity,
  scoreDuplication,
  scoreTypeSafety,
  scoreModularity,
} from "@/lib/pipeline/coding-outcome-score";

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

describe("scoreStaticChecks", () => {
  it("starts at 100 when no errors", () => {
    expect(scoreStaticChecks({ tscErrors: 0, lintErrors: 0, lintWarnings: 0 }).score).toBe(100);
  });
  it("penalizes tsc errors heavily", () => {
    expect(scoreStaticChecks({ tscErrors: 5, lintErrors: 0, lintWarnings: 0 }).score).toBe(80);
  });
  it("caps tsc penalty at 40", () => {
    expect(scoreStaticChecks({ tscErrors: 50, lintErrors: 0, lintWarnings: 0 }).score).toBe(60);
  });
  it("combines tsc + lint penalties", () => {
    // -4 (tsc=1) - 4 (lintErr=2) - 5 (lintWarn=10) = -13
    expect(scoreStaticChecks({ tscErrors: 1, lintErrors: 2, lintWarnings: 10 }).score).toBe(87);
  });
});

describe("scoreComplexity", () => {
  it("starts at 100 for healthy avg", () => {
    expect(scoreComplexity({ avgCyclomatic: 4, longFunctions: 0, largeFiles: 0 }).score).toBe(100);
  });
  it("penalizes when avg cyclomatic exceeds 5", () => {
    // delta = -min(30, (10-5)*3) = -15
    expect(scoreComplexity({ avgCyclomatic: 10, longFunctions: 0, largeFiles: 0 }).score).toBe(85);
  });
  it("counts long functions and large files", () => {
    expect(scoreComplexity({ avgCyclomatic: 4, longFunctions: 3, largeFiles: 2 }).score).toBe(80); // -12 -8
  });
});

describe("scoreDuplication", () => {
  it("starts at 100 with 0% dup", () => {
    expect(scoreDuplication({ percentage: 0 }).score).toBe(100);
  });
  it("scales: 5% → -15", () => {
    expect(scoreDuplication({ percentage: 5 }).score).toBe(85);
  });
  it("caps at -60", () => {
    expect(scoreDuplication({ percentage: 50 }).score).toBe(40);
  });
});

describe("scoreTypeSafety", () => {
  it("starts at 100", () => {
    expect(scoreTypeSafety({ anyCount: 0, tsIgnoreCount: 0, nonNullAssertCount: 0 }).score).toBe(100);
  });
  it("combines penalties", () => {
    // -min(30, 10*1.5)=-15  -min(20, 2*4)=-8  -min(15, 20*0.5)=-10
    expect(scoreTypeSafety({ anyCount: 10, tsIgnoreCount: 2, nonNullAssertCount: 20 }).score).toBe(67);
  });
});

describe("scoreModularity", () => {
  it("starts at 100", () => {
    expect(scoreModularity({ circularDeps: 0, crossBoundaryImports: 0 }).score).toBe(100);
  });
  it("circular deps weigh heavily", () => {
    expect(scoreModularity({ circularDeps: 2, crossBoundaryImports: 0 }).score).toBe(80);
  });
  it("caps both penalties", () => {
    expect(scoreModularity({ circularDeps: 10, crossBoundaryImports: 30 }).score).toBe(40);
  });
});
