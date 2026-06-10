import { describe, it, expect } from "vitest";
import {
  renormalizeWeightedAverage,
  scoreStaticChecks,
  scoreComplexity,
  scoreDuplication,
  scoreTypeSafety,
  scoreModularity,
  scoreCodeQuality,
  scoreFirstPass,
  calculateCodingOutcomeScores,
  type CodeQualityAuditLike,
  type CodeQualityJudgeLike,
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

describe("scoreCodeQuality", () => {
  const FULL_AUDIT: CodeQualityAuditLike = {
    present: true,
    staticChecks: { present: true, tscErrors: 0, lintErrors: 0, lintWarnings: 0 },
    complexity: { present: true, avgCyclomatic: 4, longFunctions: 0, largeFiles: 0 },
    duplication: { present: true, percentage: 0 },
    typeSafety: { present: true, anyCount: 0, tsIgnoreCount: 0, nonNullAssertCount: 0 },
    modularity: { present: true, circularDeps: 0, crossBoundaryImports: 0 },
  };
  const FULL_JUDGE: CodeQualityJudgeLike = {
    present: true,
    readability: { score: 90, reason: "ok" },
    idiomaticity: { score: 80, reason: "ok" },
    architecture: { score: 70, reason: "ok" },
  };

  it("perfect machine + judge → 92", () => {
    const r = scoreCodeQuality(FULL_AUDIT, FULL_JUDGE);
    // machine all 100, judge 90/80/70 → 0.18*100 + 0.12*100 + 0.12*100 + 0.10*100 + 0.08*100 + 0.14*90 + 0.14*80 + 0.12*70 = 60 + 12.6 + 11.2 + 8.4 = 92.2 → 92
    expect(r.overall.score).toBe(92);
    expect(r.subScores.staticChecks?.score).toBe(100);
    expect(r.subScores.readability?.score).toBe(90);
  });

  it("when judge absent, machine 60% reweighted to 100%", () => {
    const r = scoreCodeQuality(FULL_AUDIT, { present: false });
    expect(r.overall.score).toBe(100);
    expect(r.subScores.readability).toBeNull();
    expect(r.overall.reasons.join("\n")).toMatch(/absent/i);
  });

  it("when audit completely absent and judge absent → null overall", () => {
    const r = scoreCodeQuality({ present: false }, { present: false });
    expect(r.overall.score).toBeNull();
  });
});

describe("scoreFirstPass", () => {
  it("100 when all tasks first-pass, 0 fix iterations", () => {
    const r = scoreFirstPass({
      tasksTotal: 3,
      firstPassCount: 3,
      avgFixIterations: 0,
    });
    expect(r.score).toBe(100);
  });
  it("50% first-pass → score around 50", () => {
    const r = scoreFirstPass({
      tasksTotal: 4,
      firstPassCount: 2,
      avgFixIterations: 1,
    });
    expect(r.score).toBe(50);
  });
  it("avgFixIterations > 1 incurs additional penalty", () => {
    const r = scoreFirstPass({
      tasksTotal: 2,
      firstPassCount: 2,
      avgFixIterations: 3,
    });
    expect(r.score).toBe(84); // 100 - (3-1)*8
  });
  it("0 tasks → null (no signal)", () => {
    const r = scoreFirstPass({
      tasksTotal: 0,
      firstPassCount: 0,
      avgFixIterations: 0,
    });
    expect(r.score).toBeNull();
  });
});

describe("calculateCodingOutcomeScores (extended formula)", () => {
  const baseInput = {
    status: "pass" as const,
    sessionHealth: { score: 80, grade: "B", reasons: [] },
    taskResults: [
      { id: "T-001", title: "x", coversRequirementIds: [], generatedFiles: [], status: "completed" as const },
    ],
    repairSummary: { byEvent: {}, byStage: {}, totalEvents: 0, entries: [] as any[] },
    runtimeReadiness: { present: true, clean: true, hasError: false, findingsTotal: 0, errorCount: 0, warnCount: 0 },
    migrationCoverage: { present: false, tasksTouchedModels: 0, tasksWithGaps: 0, totalGaps: 0 },
    tddEvidenceSummary: { manifestPresent: true, evidencePresent: true, p0BlockingFailures: [] as any[] } as any,
    gatesExecuted: { integrationVerify: true, runtimeVerify: true, e2eVerify: true },
    modelUsage: [{ calls: 10, costUsd: 0.01, totalTokens: 1000 }],
    codeQualityAudit: { present: false } as any,
    codeQualityJudge: { present: false } as any,
    firstPassData: { tasksTotal: 1, firstPassCount: 1, avgFixIterations: 0 },
  };

  it("overall includes codeQuality and firstPass when present", () => {
    const r = calculateCodingOutcomeScores({
      ...baseInput,
      codeQualityAudit: {
        present: true,
        staticChecks: { present: true, tscErrors: 0, lintErrors: 0, lintWarnings: 0 },
        complexity: { present: true, avgCyclomatic: 4, longFunctions: 0, largeFiles: 0 },
        duplication: { present: true, percentage: 0 },
        typeSafety: { present: true, anyCount: 0, tsIgnoreCount: 0, nonNullAssertCount: 0 },
        modularity: { present: true, circularDeps: 0, crossBoundaryImports: 0 },
      },
      codeQualityJudge: {
        present: true,
        readability: { score: 100, reason: "ok" },
        idiomaticity: { score: 100, reason: "ok" },
        architecture: { score: 100, reason: "ok" },
      },
    });
    expect(r.codeQuality.overall.score).toBe(100);
    expect(r.firstPass.score).toBe(100);
    // Without finalAudit, requirementCoverage is ~70; overall lands ~94
    expect(r.overall.score).toBeGreaterThanOrEqual(90);
    expect(r.overall.reasons[0]).toMatch(/35%/);
  });

  it("renormalizes overall when codeQuality and firstPass absent", () => {
    const r = calculateCodingOutcomeScores({ ...baseInput, firstPassData: { tasksTotal: 0, firstPassCount: 0, avgFixIterations: 0 } });
    expect(r.codeQuality.overall.score).toBeNull();
    expect(r.firstPass.score).toBeNull();
    expect(r.overall.reasons.some((x: string) => /absent/i.test(x))).toBe(true);
  });
});
