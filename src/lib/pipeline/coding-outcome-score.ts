/**
 * Outcome-oriented coding score. Separates final usability from run health so
 * recoverable generation issues do not permanently tank an otherwise usable app.
 */
import type { AuditTaskSummary, FeatureChecklistAuditResult } from "@/lib/pipeline/self-heal";
import type { TddEvidenceSummary } from "@/lib/pipeline/tdd-evidence";

export interface ScoreBreakdown {
  score: number;
  grade: string;
  reasons: string[];
}

export interface RepairSummaryLike {
  byEvent: Record<string, number>;
}

export interface RuntimeReadinessLike {
  present: boolean;
  clean: boolean;
  hasError: boolean;
  findingsTotal: number;
  errorCount: number;
  warnCount: number;
}

export interface MigrationCoverageLike {
  present: boolean;
  tasksTouchedModels: number;
  tasksWithGaps: number;
  totalGaps: number;
}

export interface ModelUsageLike {
  calls: number;
  costUsd: number;
  totalTokens: number;
}

export interface GatesExecutedLike {
  integrationVerify: boolean;
  runtimeVerify: boolean;
  e2eVerify: boolean;
}

export interface CodingOutcomeScores {
  overall: ScoreBreakdown;
  generatedBaseline: ScoreBreakdown;
  finalUsability: ScoreBreakdown;
  sessionHealth: ScoreBreakdown;
  requirementCoverage: ScoreBreakdown;
  evidence: ScoreBreakdown;
  repairBurden: ScoreBreakdown;
  costSpeed: ScoreBreakdown;
}

export interface CodingOutcomeScoreInput {
  status: "pass" | "fail" | "aborted";
  sessionHealth: ScoreBreakdown;
  integrationErrors?: string;
  runtimeVerifyErrors?: string;
  e2eVerifyErrors?: string;
  finalAudit?: FeatureChecklistAuditResult | null;
  taskResults: AuditTaskSummary[];
  repairSummary: RepairSummaryLike;
  runtimeReadiness: RuntimeReadinessLike;
  migrationCoverage: MigrationCoverageLike;
  tddEvidenceSummary: TddEvidenceSummary;
  gatesExecuted?: GatesExecutedLike;
  modelUsage: ModelUsageLike[];
  scaffoldFixAttempts?: number;
  integrationFixAttempts?: number;
}

const WEIGHTS = {
  finalUsability: 0.5,
  requirementCoverage: 0.2,
  evidence: 0.15,
  repairBurden: 0.1,
  costSpeed: 0.05,
} as const;

export function calculateCodingOutcomeScores(
  input: CodingOutcomeScoreInput,
): CodingOutcomeScores {
  const finalUsability = scoreFinalUsability(input);
  const requirementCoverage = scoreRequirementCoverage(input);
  const evidence = scoreEvidence(input);
  const repairBurden = scoreRepairBurden(input);
  const costSpeed = scoreCostSpeed(input);
  const generatedBaseline = scoreGeneratedBaseline(finalUsability, repairBurden);

  const rawOverall =
    finalUsability.score * WEIGHTS.finalUsability +
    requirementCoverage.score * WEIGHTS.requirementCoverage +
    evidence.score * WEIGHTS.evidence +
    repairBurden.score * WEIGHTS.repairBurden +
    costSpeed.score * WEIGHTS.costSpeed;
  const overallScore = roundScore(rawOverall);

  return {
    overall: {
      score: overallScore,
      grade: scoreToGrade(overallScore),
      reasons: [
        `Score formula: ${finalUsability.score}x50% + ${requirementCoverage.score}x20% + ${evidence.score}x15% + ${repairBurden.score}x10% + ${costSpeed.score}x5% = ${overallScore}`,
        "Overall prioritizes final app usability over whether the original session ran perfectly.",
      ],
    },
    generatedBaseline,
    finalUsability,
    sessionHealth: input.sessionHealth,
    requirementCoverage,
    evidence,
    repairBurden,
    costSpeed,
  };
}

function scoreGeneratedBaseline(
  finalUsability: ScoreBreakdown,
  repairBurden: ScoreBreakdown,
): ScoreBreakdown {
  const score = roundScore(finalUsability.score * 0.65 + repairBurden.score * 0.35);
  return {
    score,
    grade: scoreToGrade(score),
    reasons: [
      `Score formula: ${finalUsability.score}x65% + ${repairBurden.score}x35% = ${score}`,
      "Generated baseline estimates initial output quality by discounting final usability with repair burden.",
    ],
  };
}

function scoreFinalUsability(input: CodingOutcomeScoreInput): ScoreBreakdown {
  const lines: ScoreLine[] = [];
  const counts = taskCounts(input.taskResults);
  const total = Math.max(counts.total, 1);

  if (input.integrationErrors?.trim()) {
    lines.push(line(-25, "integration", "Final integration verification still has blocking errors."));
  }
  if (input.runtimeVerifyErrors?.trim()) {
    lines.push(line(-20, "runtime", "Final runtime verification still has blocking errors."));
  }
  const e2ePenalty = e2eFailurePenalty(input.e2eVerifyErrors, 20);
  if (e2ePenalty.delta < 0) lines.push(e2ePenalty);

  const hardUncovered = hardUncoveredCount(input.finalAudit);
  if (hardUncovered > 0) {
    lines.push(
      line(
        -Math.min(30, hardUncovered * 3),
        `uncovered:${hardUncovered}`,
        `${hardUncovered} hard PRD requirement id(s) remain uncovered.`,
      ),
    );
  }

  if (counts.failed > 0) {
    lines.push(line(-Math.min(20, counts.failed * 5), `failed-tasks:${counts.failed}`, `${counts.failed}/${total} task(s) failed.`));
  }
  if (counts.unknown > 0) {
    lines.push(line(-Math.min(10, counts.unknown), `unknown-tasks:${counts.unknown}`, `${counts.unknown}/${total} task(s) did not produce a final status.`));
  }
  if (input.runtimeReadiness.present && input.runtimeReadiness.hasError) {
    lines.push(line(-Math.min(15, input.runtimeReadiness.errorCount * 5), "runtime-readiness", `${input.runtimeReadiness.errorCount} runtime-readiness error finding(s).`));
  }
  if (input.migrationCoverage.present && input.migrationCoverage.totalGaps > 0) {
    lines.push(line(-Math.min(15, input.migrationCoverage.totalGaps * 3), "migration-gaps", `${input.migrationCoverage.totalGaps} Sequelize migration coverage gap(s).`));
  }
  if (input.tddEvidenceSummary.p0BlockingFailures.length > 0) {
    const gaps = input.tddEvidenceSummary.p0BlockingFailures.length;
    lines.push(line(-Math.min(20, gaps * 3), `p0-tdd:${gaps}`, `${gaps} P0 TDD evidence gap(s) remain.`));
  }

  return finishScore(100, lines, "No final usability blockers captured.");
}

function scoreRequirementCoverage(input: CodingOutcomeScoreInput): ScoreBreakdown {
  const lines: ScoreLine[] = [];
  if (!input.finalAudit) {
    lines.push(line(-30, "audit-skipped", "Feature audit did not produce a final coverage snapshot."));
    return finishScore(100, lines, "No feature audit snapshot was available.");
  }

  const hard = hardUncoveredCount(input.finalAudit);
  const soft = input.finalAudit.uncovered.filter((e) => /^IC-\d+$/i.test(e.id)).length;
  if (hard > 0) {
    lines.push(line(-Math.min(50, hard * 5), `hard-uncovered:${hard}`, `${hard} hard requirement id(s) are uncovered.`));
  }
  if (soft > 0) {
    lines.push(line(-Math.min(10, soft), `soft-uncovered:${soft}`, `${soft} soft interaction warning(s) remain.`));
  }
  return finishScore(100, lines, "All hard PRD requirement ids are covered.");
}

function scoreEvidence(input: CodingOutcomeScoreInput): ScoreBreakdown {
  const lines: ScoreLine[] = [];
  const gates = input.gatesExecuted;
  if (!gates?.integrationVerify) lines.push(line(-20, "integration-skipped", "Integration verify did not run."));
  if (!gates?.runtimeVerify) lines.push(line(-15, "runtime-skipped", "Runtime verify did not run."));
  if (!gates?.e2eVerify) lines.push(line(-15, "e2e-skipped", "E2E verify did not run."));
  if (!input.finalAudit) lines.push(line(-15, "audit-skipped", "Feature audit evidence is missing."));
  if (!input.runtimeReadiness.present) lines.push(line(-10, "readiness-missing", "Runtime-readiness audit evidence is missing."));
  if (!input.tddEvidenceSummary.manifestPresent) lines.push(line(-10, "tdd-manifest", "TDD manifest evidence is missing."));
  if (!input.tddEvidenceSummary.evidencePresent) lines.push(line(-10, "tdd-evidence", "TDD execution evidence is missing."));
  if (input.status === "aborted") lines.push(line(-10, "aborted", "Session ended before all evidence could be collected."));
  return finishScore(100, lines, "Quality evidence is complete enough to support the score.");
}

function scoreRepairBurden(input: CodingOutcomeScoreInput): ScoreBreakdown {
  const lines: ScoreLine[] = [];
  const extraIntegration = Math.max(0, (input.integrationFixAttempts ?? 0) - 1);
  const extraScaffold = Math.max(0, (input.scaffoldFixAttempts ?? 0) - 1);
  const trunc = input.repairSummary.byEvent.doc_truncated ?? 0;
  const stagnation = input.repairSummary.byEvent.stagnation_warning ?? 0;
  const plan = input.repairSummary.byEvent.task_plan_unfulfilled ?? 0;
  const fallback =
    input.repairSummary.byEvent.fallback_triggered ??
    input.repairSummary.byEvent.stagnation_fallback_triggered ??
    0;

  if (extraIntegration > 0) lines.push(line(-Math.min(35, extraIntegration * 8), `integration-fix:${extraIntegration}`, `Integration fix required ${extraIntegration} extra iteration(s).`));
  if (extraScaffold > 0) lines.push(line(-Math.min(20, extraScaffold * 4), `scaffold-fix:${extraScaffold}`, `Scaffold fix required ${extraScaffold} extra iteration(s).`));
  if (trunc > 0) lines.push(line(-Math.min(20, trunc * 5), `trunc:${trunc}`, `${trunc} context truncation event(s).`));
  if (stagnation > 0) lines.push(line(-Math.min(25, stagnation * 8), `stagnation:${stagnation}`, `${stagnation} stagnation warning(s).`));
  if (plan > 0) lines.push(line(-Math.min(20, plan * 5), `plan:${plan}`, `${plan} task/file-plan mismatch event(s).`));
  if (fallback > 0) lines.push(line(-Math.min(20, fallback * 6), `fallback:${fallback}`, `${fallback} fallback escalation event(s).`));

  const warningTasks = input.taskResults.filter((t) => t.status === "completed_with_warnings").length;
  if (warningTasks > 0) lines.push(line(-Math.min(12, warningTasks * 2), `warnings:${warningTasks}`, `${warningTasks} task(s) completed with warnings.`));
  return finishScore(100, lines, "No meaningful repair burden was captured.");
}

function scoreCostSpeed(input: CodingOutcomeScoreInput): ScoreBreakdown {
  const calls = input.modelUsage.reduce((sum, item) => sum + item.calls, 0);
  const cost = input.modelUsage.reduce((sum, item) => sum + item.costUsd, 0);
  const tokens = input.modelUsage.reduce((sum, item) => sum + item.totalTokens, 0);
  const lines: ScoreLine[] = [];
  if (calls > 80) lines.push(line(-15, `calls:${calls}`, `High LLM call count (${calls}) indicates low iteration efficiency.`));
  else if (calls > 40) lines.push(line(-8, `calls:${calls}`, `Moderate LLM call count (${calls}).`));
  if (cost > 1) lines.push(line(-15, `cost:${cost.toFixed(2)}`, `High LLM spend: $${cost.toFixed(2)}.`));
  else if (cost > 0.25) lines.push(line(-8, `cost:${cost.toFixed(2)}`, `Moderate LLM spend: $${cost.toFixed(2)}.`));
  if (tokens > 2_000_000) lines.push(line(-10, "tokens", `Very high token volume (${tokens.toLocaleString()}).`));
  return finishScore(100, lines, "Cost and call volume are within expected range.");
}

export interface ScoreLine {
  delta: number;
  label: string;
  reason: string;
}

function line(delta: number, label: string, reason: string): ScoreLine {
  return { delta, label, reason };
}

function finishScore(base: number, lines: ScoreLine[], emptyReason: string): ScoreBreakdown {
  const score = roundScore(base + lines.reduce((sum, ln) => sum + ln.delta, 0));
  const formula = renderFormula(base, lines, score);
  return {
    score,
    grade: scoreToGrade(score),
    reasons: [
      `Score formula: ${formula}`,
      ...(lines.length > 0 ? lines.map((ln) => ln.reason) : [emptyReason]),
    ],
  };
}

function renderFormula(base: number, lines: ScoreLine[], score: number): string {
  const parts = [String(base)];
  for (const ln of lines) {
    const sign = ln.delta < 0 ? "-" : "+";
    parts.push(`${sign} ${Math.abs(ln.delta)}(${ln.label})`);
  }
  parts.push(`= ${score}`);
  return parts.join(" ");
}

function e2eFailurePenalty(errors: string | undefined, maxPenalty: number): ScoreLine {
  const text = errors?.trim() ?? "";
  if (!text) return line(0, "e2e", "");
  const plain = text.replace(/\x1b\[[0-9;]*m/g, "");
  const failed = parseInt(plain.match(/(\d+)\s+failed/i)?.[1] ?? "0", 10);
  const passed = parseInt(plain.match(/(\d+)\s+passed/i)?.[1] ?? "0", 10);
  const total = failed + passed;
  const ratio = total > 0 ? failed / total : 1;
  let delta = -Math.round(maxPenalty * ratio);
  const triage = plain.match(/triage:\s*(\d+)\s*deterministic,\s*(\d+)\s*flaky,\s*(\d+)\s*infra/i);
  if (triage) {
    const deterministic = parseInt(triage[1], 10);
    const flaky = parseInt(triage[2], 10);
    const infra = parseInt(triage[3], 10);
    if (deterministic === 0 && flaky === 0 && infra > 0) delta = Math.round(delta / 2);
  }
  if (delta === 0) return line(0, "e2e", "");
  return line(delta, total > 0 ? `e2e:${failed}/${total}` : "e2e", total > 0 ? `E2E has ${failed}/${total} failing test(s).` : "E2E verification still has blocking errors.");
}

function hardUncoveredCount(finalAudit: FeatureChecklistAuditResult | null | undefined): number {
  if (!finalAudit) return 0;
  return (
    finalAudit.hardUncovered?.length ??
    finalAudit.uncovered.filter((entry) => !/^IC-\d+$/i.test(entry.id)).length
  );
}

function taskCounts(tasks: AuditTaskSummary[]): {
  total: number;
  completed: number;
  warnings: number;
  failed: number;
  unknown: number;
} {
  return {
    total: tasks.length,
    completed: tasks.filter((t) => t.status === "completed").length,
    warnings: tasks.filter((t) => t.status === "completed_with_warnings").length,
    failed: tasks.filter((t) => t.status === "failed").length,
    unknown: tasks.filter((t) => t.status === "unknown").length,
  };
}

export interface WeightedDimension {
  score: number | null;
  weight: number;
  absent: boolean;
  label?: string;
}

export interface RenormalizedResult {
  /** Weighted average over only the non-absent dimensions. null if all absent. */
  score: number | null;
  /** Effective (renormalized) weight per active dimension, keyed by label
   *  (falls back to numeric index when label omitted). */
  activeWeights: Record<string, number>;
  /** Labels of dimensions that were absent. */
  absentLabels: string[];
}

export function renormalizeWeightedAverage(
  dims: WeightedDimension[],
): RenormalizedResult {
  const active = dims.filter((d) => !d.absent && d.score !== null);
  const absent = dims.filter((d) => d.absent);
  const absentLabels = absent.map((d, i) => d.label ?? String(dims.indexOf(d)));
  if (active.length === 0) {
    return { score: null, activeWeights: {}, absentLabels };
  }
  const totalWeight = active.reduce((sum, d) => sum + d.weight, 0);
  const activeWeights: Record<string, number> = {};
  let weighted = 0;
  for (const d of active) {
    const key = d.label ?? String(dims.indexOf(d));
    const w = d.weight / totalWeight;
    activeWeights[key] = w;
    weighted += (d.score as number) * w;
  }
  return {
    score: roundScore(weighted),
    activeWeights,
    absentLabels,
  };
}

export function roundScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export interface StaticChecksInput {
  tscErrors: number;
  lintErrors: number;
  lintWarnings: number;
}
export function scoreStaticChecks(input: StaticChecksInput): ScoreBreakdown {
  const lines: ScoreLine[] = [];
  if (input.tscErrors > 0) {
    lines.push(line(-Math.min(40, input.tscErrors * 4), `tsc:${input.tscErrors}`, `${input.tscErrors} TypeScript error(s).`));
  }
  if (input.lintErrors > 0) {
    lines.push(line(-Math.min(30, input.lintErrors * 2), `lint-err:${input.lintErrors}`, `${input.lintErrors} ESLint error(s).`));
  }
  if (input.lintWarnings > 0) {
    lines.push(line(-Math.min(15, Math.round(input.lintWarnings * 0.5)), `lint-warn:${input.lintWarnings}`, `${input.lintWarnings} ESLint warning(s).`));
  }
  return finishScore(100, lines, "No static check findings.");
}

export interface ComplexityInput {
  avgCyclomatic: number;
  longFunctions: number;
  largeFiles: number;
}
export function scoreComplexity(input: ComplexityInput): ScoreBreakdown {
  const lines: ScoreLine[] = [];
  if (input.avgCyclomatic > 5) {
    const delta = -Math.min(30, Math.round((input.avgCyclomatic - 5) * 3));
    lines.push(line(delta, `cyclomatic:${input.avgCyclomatic.toFixed(1)}`, `Average cyclomatic complexity ${input.avgCyclomatic.toFixed(1)} exceeds 5.`));
  }
  if (input.longFunctions > 0) {
    lines.push(line(-Math.min(20, input.longFunctions * 4), `long-fn:${input.longFunctions}`, `${input.longFunctions} function(s) longer than threshold (50 lines).`));
  }
  if (input.largeFiles > 0) {
    lines.push(line(-Math.min(20, input.largeFiles * 4), `large-file:${input.largeFiles}`, `${input.largeFiles} file(s) larger than threshold (400 lines).`));
  }
  return finishScore(100, lines, "Complexity within thresholds.");
}

export interface DuplicationInput { percentage: number }
export function scoreDuplication(input: DuplicationInput): ScoreBreakdown {
  const lines: ScoreLine[] = [];
  if (input.percentage > 0) {
    lines.push(line(-Math.min(60, Math.round(input.percentage * 3)), `dup:${input.percentage.toFixed(1)}%`, `Code duplication ${input.percentage.toFixed(1)}%.`));
  }
  return finishScore(100, lines, "No duplication detected.");
}

export interface TypeSafetyInput {
  anyCount: number;
  tsIgnoreCount: number;
  nonNullAssertCount: number;
}
export function scoreTypeSafety(input: TypeSafetyInput): ScoreBreakdown {
  const lines: ScoreLine[] = [];
  if (input.anyCount > 0) lines.push(line(-Math.min(30, Math.round(input.anyCount * 1.5)), `any:${input.anyCount}`, `${input.anyCount} \`any\` usage(s).`));
  if (input.tsIgnoreCount > 0) lines.push(line(-Math.min(20, input.tsIgnoreCount * 4), `ts-ignore:${input.tsIgnoreCount}`, `${input.tsIgnoreCount} \`@ts-ignore\`/\`@ts-expect-error\` directive(s).`));
  if (input.nonNullAssertCount > 0) lines.push(line(-Math.min(15, Math.round(input.nonNullAssertCount * 0.5)), `non-null:${input.nonNullAssertCount}`, `${input.nonNullAssertCount} non-null assertion(s).`));
  return finishScore(100, lines, "Type safety is clean.");
}

export interface ModularityInput {
  circularDeps: number;
  crossBoundaryImports: number;
}
export function scoreModularity(input: ModularityInput): ScoreBreakdown {
  const lines: ScoreLine[] = [];
  if (input.circularDeps > 0) lines.push(line(-Math.min(40, input.circularDeps * 10), `circular:${input.circularDeps}`, `${input.circularDeps} circular dependency cycle(s).`));
  if (input.crossBoundaryImports > 0) lines.push(line(-Math.min(20, input.crossBoundaryImports * 2), `cross-import:${input.crossBoundaryImports}`, `${input.crossBoundaryImports} cross-boundary import(s).`));
  return finishScore(100, lines, "Modularity boundaries clean.");
}

export function scoreToGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}
