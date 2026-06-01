/**
 * Codegen → PRD-pattern outcome attribution.
 *
 * Closes the *downstream* half of the preparation feedback loop. Existing
 * preparation-attribution.ts only learns from the user's verdict on the PRD
 * text itself (human_approval / human_edit). This module adds the strongest
 * ground-truth signal we have — how the project that was *built* from that
 * PRD actually turned out — back onto the `prd-pattern` records that were
 * injected into the PRD agent for that session.
 *
 * Signal sources (all durable, append-only — survive an aborted run):
 *   - L2 `task-history` records: per-task completed / failed.
 *   - L2 `self-heal-log` records: coverage-gate repairs that fired, gave up,
 *     or left pages/requirements still missing. A coverage repair firing is
 *     direct evidence the PRD under-specified that page/requirement (the
 *     task-breakdown couldn't derive coverage from the PRD alone).
 *
 * Bridge: PRD patterns are injected at the PRD step keyed by `kickoffId`
 * (= sessionId) in the **L1** trace (agent="pm"). Codegen signals live in
 * **L2** keyed by the same `kickoffId`. We join on kickoffId — NOT taskId
 * (the failure-pattern attribution uses taskId; PRD injection has no taskId).
 *
 * Abort-resilience by asymmetry (see docs/prd-codegen-outcome-attribution-plan.md §2):
 *   - NEGATIVE verdict (failures / coverage gaps): derivable purely from the
 *     durable L2 records, no session report needed. Strong weight. This is
 *     the signal we care most about and it survives any abort/crash.
 *   - POSITIVE verdict (clean success): gated on `completedKickoffs` — only
 *     credited when a session report says the run completed. The report is
 *     the one losable artifact; losing a *weak positive* is acceptable.
 *   - Everything else (e.g. aborted with no failure evidence) → NEUTRAL.
 *
 * Pure function — no I/O. The reconcile wrapper handles file I/O + persistence.
 */

import type { TraceEvent } from "../trace";
import type { MemoryRecord } from "../types";

/** Magnitude deliberately exceeds both human_edit (0.05) and the codegen
 *  failure-pattern delta (0.10): a real build outcome is the most reliable
 *  verdict on PRD quality, so it moves the score harder than a noisy user
 *  edit. (Per product decision: codegen negative weight > human_edit.) */
export const DEFAULT_DELTA_CODEGEN_FAILURE = -0.12;
export const DEFAULT_DELTA_CODEGEN_SUCCESS = 0.05;

/** Cap negative "units" credited from a single kickoff so one catastrophic
 *  run can't slam a pattern from active to deprecated in one pass. */
const NEGATIVE_UNITS_CAP = 2;
/** Soft-negative weight for a coverage repair that fired but recovered: the
 *  PRD still needed repair, but the system self-healed, so it's a half-strike. */
const COVERAGE_FIXED_WEIGHT = 0.5;

export interface CodegenKickoffOutcome {
  kickoffId: string;
  failedTasks: number;
  completedTasks: number;
  /** Coverage self-heal logs that gave up or left requirements still missing. */
  coverageUnresolved: number;
  /** Coverage self-heal logs that fired but recovered (outcome=fixed). */
  coverageFixed: number;
}

type Verdict =
  | { kind: "negative"; blameUnits: number }
  | { kind: "positive" }
  | { kind: "neutral" };

export interface CodegenPrepAttributionInput {
  /** Trace events from the **L1** store (process.cwd()/.memory/trace.jsonl). */
  l1TraceEvents: TraceEvent[];
  /** L2 `task-history` records (refs.kickoffId, body.status). */
  taskHistory: MemoryRecord[];
  /** L2 `self-heal-log` records (refs.kickoffId, body.outcome/stage/stillMissing). */
  selfHealLogs: MemoryRecord[];
  /** prd-pattern id → current L1 record. Missing ids are skipped silently. */
  patternsById: Map<string, MemoryRecord>;
  /** sessionIds already attributed in past runs (cursor). */
  alreadyAttributed: Set<string>;
  /** sessionIds a session report marks as successfully completed. Gates the
   *  positive signal only — negatives never depend on this. */
  completedKickoffs: Set<string>;
  /** Score delta per credited success (default +0.05). */
  deltaSuccess: number;
  /** Score delta per credited failure unit (default -0.12). */
  deltaFailure: number;
}

export interface CodegenPrepPatternAttribution {
  patternId: string;
  oldScore: number;
  newScore: number;
  delta: number;
  /** Number of positive kickoff verdicts credited. */
  successes: number;
  /** Sum of negative blame units credited (may be fractional). */
  failures: number;
  immune: boolean;
  /** "cite" — PRD agent cited this pattern; "inject-fallback" — injection set
   *  only; "mixed" — both kinds of kickoff contributed. */
  source: "cite" | "inject-fallback" | "mixed";
}

export interface CodegenPrepAttributionResult {
  attributions: CodegenPrepPatternAttribution[];
  /** sessionIds newly attributed by this run (to merge into the cursor). */
  newlyAttributed: string[];
  stats: {
    kickoffsConsidered: number;
    kickoffsNegative: number;
    kickoffsPositive: number;
    kickoffsNeutral: number;
    kickoffsSkippedAlreadyAttributed: number;
    kickoffsSkippedNoInjection: number;
    patternsTouched: number;
  };
}

function clamp(v: number, lo: number, hi: number): number {
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v;
}

function parseBody<T>(record: MemoryRecord): T | null {
  try {
    return JSON.parse(record.body) as T;
  } catch {
    return null;
  }
}

/**
 * sessionId → injected prd-pattern ids the PM agent actually saw
 * (`injected: true`, agent="pm"). Mirrors preparation-attribution but keyed
 * by sessionId only (PRD has a single injection point per session).
 */
function buildInjectionIndex(events: TraceEvent[]): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const ev of events) {
    if (ev.op !== "inject" && ev.op !== "reinject") continue;
    if (ev.agent !== "pm") continue;
    if (!ev.kickoffId) continue;
    const det = ev.details as
      | { injected?: boolean; activeIds?: unknown }
      | undefined;
    if (!det || det.injected !== true) continue;
    if (!Array.isArray(det.activeIds)) continue;
    let set = out.get(ev.kickoffId);
    if (!set) {
      set = new Set();
      out.set(ev.kickoffId, set);
    }
    for (const id of det.activeIds) {
      if (typeof id === "string") set.add(id);
    }
  }
  return out;
}

/** sessionId → cited prd-pattern ids (validated against the injection set). */
function buildCitationIndex(
  events: TraceEvent[],
  injIndex: Map<string, Set<string>>,
): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const ev of events) {
    if (ev.op !== "cite") continue;
    if (ev.agent !== "pm") continue;
    if (!ev.kickoffId) continue;
    const det = ev.details as { validIds?: unknown; citedIds?: unknown } | undefined;
    const ids = Array.isArray(det?.validIds)
      ? det.validIds
      : Array.isArray(det?.citedIds)
        ? det.citedIds
        : [];
    if (ids.length === 0) continue;
    const allowed = injIndex.get(ev.kickoffId);
    let set = out.get(ev.kickoffId);
    if (!set) {
      set = new Set();
      out.set(ev.kickoffId, set);
    }
    for (const id of ids) {
      if (typeof id !== "string") continue;
      if (allowed && !allowed.has(id)) continue;
      set.add(id);
    }
  }
  return out;
}

interface TaskHistoryBody {
  status?: string;
}

interface SelfHealLogBody {
  stage?: string;
  outcome?: string;
  stillMissing?: unknown;
}

/**
 * Roll up the durable L2 codegen signals per kickoff. Pure derivation — does
 * not interpret them into a verdict (that's `verdictFor`), so it stays
 * testable and reusable.
 */
export function deriveCodegenOutcomes(
  taskHistory: MemoryRecord[],
  selfHealLogs: MemoryRecord[],
): Map<string, CodegenKickoffOutcome> {
  const out = new Map<string, CodegenKickoffOutcome>();
  const ensure = (kickoffId: string): CodegenKickoffOutcome => {
    let o = out.get(kickoffId);
    if (!o) {
      o = {
        kickoffId,
        failedTasks: 0,
        completedTasks: 0,
        coverageUnresolved: 0,
        coverageFixed: 0,
      };
      out.set(kickoffId, o);
    }
    return o;
  };

  for (const th of taskHistory) {
    const kickoffId = th.refs.kickoffId;
    if (!kickoffId) continue;
    const body = parseBody<TaskHistoryBody>(th);
    const status = body?.status;
    if (status === "failed") ensure(kickoffId).failedTasks += 1;
    else if (status === "completed") ensure(kickoffId).completedTasks += 1;
  }

  for (const sh of selfHealLogs) {
    const kickoffId = sh.refs.kickoffId;
    if (!kickoffId) continue;
    const body = parseBody<SelfHealLogBody>(sh);
    if (!body) continue;
    const stage = typeof body.stage === "string" ? body.stage : "";
    // Only coverage-stage repairs are PRD-attributable: they signal the PRD
    // under-specified a page/requirement so task-breakdown couldn't cover it.
    if (!/coverage/i.test(stage)) continue;
    const stillMissing = Array.isArray(body.stillMissing)
      ? body.stillMissing.length
      : 0;
    const gaveUp = body.outcome === "gave_up";
    const o = ensure(kickoffId);
    if (gaveUp || stillMissing > 0) o.coverageUnresolved += 1;
    else o.coverageFixed += 1;
  }

  return out;
}

function verdictFor(
  o: CodegenKickoffOutcome,
  completedKickoffs: Set<string>,
): Verdict {
  const negativeUnits =
    o.failedTasks +
    o.coverageUnresolved +
    o.coverageFixed * COVERAGE_FIXED_WEIGHT;
  if (negativeUnits > 0) {
    return { kind: "negative", blameUnits: Math.min(negativeUnits, NEGATIVE_UNITS_CAP) };
  }
  // Positive only with a corroborating "completed" report AND real work done.
  if (completedKickoffs.has(o.kickoffId) && o.completedTasks > 0) {
    return { kind: "positive" };
  }
  return { kind: "neutral" };
}

interface PatternAccum {
  successes: number;
  failures: number;
  sawCite: boolean;
  sawFallback: boolean;
}

export function computeCodegenPrepAttributions(
  input: CodegenPrepAttributionInput,
): CodegenPrepAttributionResult {
  const injIndex = buildInjectionIndex(input.l1TraceEvents);
  const citeIndex = buildCitationIndex(input.l1TraceEvents, injIndex);
  const outcomes = deriveCodegenOutcomes(input.taskHistory, input.selfHealLogs);

  const accum = new Map<string, PatternAccum>();
  const newlyAttributed: string[] = [];
  const stats = {
    kickoffsConsidered: 0,
    kickoffsNegative: 0,
    kickoffsPositive: 0,
    kickoffsNeutral: 0,
    kickoffsSkippedAlreadyAttributed: 0,
    kickoffsSkippedNoInjection: 0,
    patternsTouched: 0,
  };

  for (const [kickoffId, outcome] of outcomes) {
    stats.kickoffsConsidered++;
    if (input.alreadyAttributed.has(kickoffId)) {
      stats.kickoffsSkippedAlreadyAttributed++;
      continue;
    }
    const verdict = verdictFor(outcome, input.completedKickoffs);
    if (verdict.kind === "neutral") {
      stats.kickoffsNeutral++;
      // Neutral is a terminal judgment for this kickoff's current evidence,
      // but we do NOT mark it attributed: late-arriving failure signals (or a
      // report that flips it positive) should still be picked up next sweep.
      continue;
    }

    const injectedIds = injIndex.get(kickoffId);
    if (!injectedIds || injectedIds.size === 0) {
      // No prd-pattern was injected for this session → nothing to credit.
      // Don't mark attributed (a late inject event could still arrive).
      stats.kickoffsSkippedNoInjection++;
      continue;
    }

    if (verdict.kind === "negative") stats.kickoffsNegative++;
    else stats.kickoffsPositive++;

    // Cite preference: if the PM agent cited a subset, only those get the
    // credit/blame; otherwise the whole injected set shares it.
    const cited = citeIndex.get(kickoffId);
    const useCites = cited !== undefined && cited.size > 0;
    const credited = useCites ? cited : injectedIds;

    newlyAttributed.push(kickoffId);

    for (const patternId of credited) {
      if (!input.patternsById.has(patternId)) continue;
      let acc = accum.get(patternId);
      if (!acc) {
        acc = { successes: 0, failures: 0, sawCite: false, sawFallback: false };
        accum.set(patternId, acc);
      }
      if (verdict.kind === "negative") acc.failures += verdict.blameUnits;
      else acc.successes += 1;
      if (useCites) acc.sawCite = true;
      else acc.sawFallback = true;
    }
  }

  const attributions: CodegenPrepPatternAttribution[] = [];
  for (const [patternId, acc] of accum) {
    const rec = input.patternsById.get(patternId);
    if (!rec) continue;
    const oldScore = rec.metrics.score ?? 0;
    const immune = rec.tags.includes("manual:approved");
    const rawDelta =
      acc.successes * input.deltaSuccess + acc.failures * input.deltaFailure;
    const newScore = immune ? oldScore : clamp(oldScore + rawDelta, -1, 1);
    const source: CodegenPrepPatternAttribution["source"] =
      acc.sawCite && acc.sawFallback
        ? "mixed"
        : acc.sawCite
          ? "cite"
          : "inject-fallback";
    attributions.push({
      patternId,
      oldScore,
      newScore,
      delta: newScore - oldScore,
      successes: acc.successes,
      failures: acc.failures,
      immune,
      source,
    });
  }
  stats.patternsTouched = attributions.length;
  attributions.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  return { attributions, newlyAttributed, stats };
}
