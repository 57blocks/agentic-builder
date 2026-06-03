/**
 * Unit tests for `computeCodegenPrepAttributions`.
 *
 * Builds synthetic L1 inject trace + L2 task-history / self-heal-log records
 * and asserts the algorithm:
 *   - blames injected prd-patterns when codegen failed (failed task)
 *   - blames on unresolved coverage repair, soft-blames on recovered one
 *   - credits only when a completed report corroborates AND tasks completed
 *   - leaves a positive-looking-but-uncorroborated (e.g. aborted) kickoff NEUTRAL
 *   - prefers cite ids over the full inject set
 *   - leaves immune (manual:approved) patterns alone
 *   - skips already-attributed kickoffs via cursor
 *   - skips kickoffs with no PRD injection (and does not mark them attributed)
 *   - caps negative blame per kickoff and clamps scores to [-1, 1]
 */

import { describe, expect, it } from "vitest";

import {
  computeCodegenPrepAttributions,
  DEFAULT_DELTA_CODEGEN_FAILURE,
  DEFAULT_DELTA_CODEGEN_SUCCESS,
} from "../distill/codegen-prep-attribution";
import type { TraceEvent } from "../trace";
import type { MemoryRecord } from "../types";

function pattern(id: string, over: Partial<MemoryRecord> = {}): MemoryRecord {
  return {
    id,
    layer: "L1",
    kind: "prd-pattern",
    title: id,
    body: "",
    tags: [],
    source: "orchestrator",
    refs: {},
    metrics: { hits: 0, score: 0.4 },
    createdAt: 0,
    updatedAt: 0,
    schemaVersion: 1,
    ...over,
  };
}

function injectEvent(sessionId: string, activeIds: string[]): TraceEvent {
  return {
    ts: 1,
    op: "inject",
    layer: "L1",
    kickoffId: sessionId,
    agent: "pm",
    details: { injected: true, activeIds },
  };
}

function citeEvent(sessionId: string, validIds: string[]): TraceEvent {
  return {
    ts: 1,
    op: "cite",
    layer: "L1",
    kickoffId: sessionId,
    agent: "pm",
    details: { validIds },
  };
}

function taskHistory(
  kickoffId: string,
  taskId: string,
  status: string,
): MemoryRecord {
  return {
    id: `TH-${kickoffId}-${taskId}`,
    layer: "L2",
    kind: "task-history",
    title: taskId,
    body: JSON.stringify({ status, attempts: 1, files: [] }),
    tags: [],
    source: "orchestrator",
    refs: { kickoffId, taskId },
    metrics: {},
    createdAt: 0,
    updatedAt: 0,
    schemaVersion: 1,
  };
}

function selfHealLog(
  kickoffId: string,
  over: { stage?: string; outcome?: string; stillMissing?: string[] } = {},
): MemoryRecord {
  return {
    id: `SH-${kickoffId}-${over.stage ?? "x"}`,
    layer: "L2",
    kind: "self-heal-log",
    title: "self-heal",
    body: JSON.stringify({
      stage: over.stage ?? "coverage-gate",
      outcome: over.outcome ?? "fixed",
      stillMissing: over.stillMissing ?? [],
    }),
    tags: [],
    source: "self-heal",
    refs: { kickoffId },
    metrics: {},
    createdAt: 0,
    updatedAt: 0,
    schemaVersion: 1,
  };
}

const BASE = {
  deltaSuccess: DEFAULT_DELTA_CODEGEN_SUCCESS,
  deltaFailure: DEFAULT_DELTA_CODEGEN_FAILURE,
};

describe("computeCodegenPrepAttributions", () => {
  it("blames injected prd-patterns when a codegen task failed", () => {
    const res = computeCodegenPrepAttributions({
      l1TraceEvents: [injectEvent("S1", ["PRD-a"])],
      taskHistory: [taskHistory("S1", "T1", "failed")],
      selfHealLogs: [],
      patternsById: new Map([["PRD-a", pattern("PRD-a")]]),
      alreadyAttributed: new Set(),
      completedKickoffs: new Set(),
      ...BASE,
    });
    expect(res.attributions).toHaveLength(1);
    const a = res.attributions[0];
    expect(a.patternId).toBe("PRD-a");
    expect(a.failures).toBe(1);
    expect(a.newScore).toBeCloseTo(0.4 + DEFAULT_DELTA_CODEGEN_FAILURE, 6);
    expect(res.newlyAttributed).toEqual(["S1"]);
    expect(res.stats.kickoffsNegative).toBe(1);
  });

  it("treats an unresolved coverage repair as a full strike, a recovered one as half", () => {
    const unresolved = computeCodegenPrepAttributions({
      l1TraceEvents: [injectEvent("S1", ["PRD-a"])],
      taskHistory: [],
      selfHealLogs: [selfHealLog("S1", { outcome: "gave_up", stillMissing: ["PAGE-007"] })],
      patternsById: new Map([["PRD-a", pattern("PRD-a")]]),
      alreadyAttributed: new Set(),
      completedKickoffs: new Set(),
      ...BASE,
    });
    expect(unresolved.attributions[0].failures).toBe(1);

    const recovered = computeCodegenPrepAttributions({
      l1TraceEvents: [injectEvent("S2", ["PRD-a"])],
      taskHistory: [],
      selfHealLogs: [selfHealLog("S2", { outcome: "fixed", stillMissing: [] })],
      patternsById: new Map([["PRD-a", pattern("PRD-a")]]),
      alreadyAttributed: new Set(),
      completedKickoffs: new Set(),
      ...BASE,
    });
    expect(recovered.attributions[0].failures).toBe(0.5);
  });

  it("ignores non-coverage self-heal stages", () => {
    const res = computeCodegenPrepAttributions({
      l1TraceEvents: [injectEvent("S1", ["PRD-a"])],
      taskHistory: [],
      selfHealLogs: [selfHealLog("S1", { stage: "integration-verify", outcome: "gave_up" })],
      patternsById: new Map([["PRD-a", pattern("PRD-a")]]),
      alreadyAttributed: new Set(),
      completedKickoffs: new Set(),
      ...BASE,
    });
    // No coverage signal + no completed/failed task → no rolled-up outcome,
    // so the kickoff is never even considered (no PRD-attributable signal).
    expect(res.attributions).toHaveLength(0);
    expect(res.stats.kickoffsConsidered).toBe(0);
  });

  it("credits only when a completed report corroborates AND tasks completed", () => {
    const corroborated = computeCodegenPrepAttributions({
      l1TraceEvents: [injectEvent("S1", ["PRD-a"])],
      taskHistory: [taskHistory("S1", "T1", "completed")],
      selfHealLogs: [],
      patternsById: new Map([["PRD-a", pattern("PRD-a")]]),
      alreadyAttributed: new Set(),
      completedKickoffs: new Set(["S1"]),
      ...BASE,
    });
    expect(corroborated.attributions[0].successes).toBe(1);
    expect(corroborated.attributions[0].newScore).toBeCloseTo(
      0.4 + DEFAULT_DELTA_CODEGEN_SUCCESS,
      6,
    );

    // Same completed tasks but NO report entry (e.g. aborted / report lost) →
    // neutral, no positive credited.
    const uncorroborated = computeCodegenPrepAttributions({
      l1TraceEvents: [injectEvent("S1", ["PRD-a"])],
      taskHistory: [taskHistory("S1", "T1", "completed")],
      selfHealLogs: [],
      patternsById: new Map([["PRD-a", pattern("PRD-a")]]),
      alreadyAttributed: new Set(),
      completedKickoffs: new Set(),
      ...BASE,
    });
    expect(uncorroborated.attributions).toHaveLength(0);
    expect(uncorroborated.stats.kickoffsNeutral).toBe(1);
  });

  it("prefers cited ids over the full inject set", () => {
    const res = computeCodegenPrepAttributions({
      l1TraceEvents: [
        injectEvent("S1", ["PRD-a", "PRD-b"]),
        citeEvent("S1", ["PRD-a"]),
      ],
      taskHistory: [taskHistory("S1", "T1", "failed")],
      selfHealLogs: [],
      patternsById: new Map([
        ["PRD-a", pattern("PRD-a")],
        ["PRD-b", pattern("PRD-b")],
      ]),
      alreadyAttributed: new Set(),
      completedKickoffs: new Set(),
      ...BASE,
    });
    expect(res.attributions).toHaveLength(1);
    expect(res.attributions[0].patternId).toBe("PRD-a");
    expect(res.attributions[0].source).toBe("cite");
  });

  it("leaves immune (manual:approved) patterns unchanged", () => {
    const res = computeCodegenPrepAttributions({
      l1TraceEvents: [injectEvent("S1", ["PRD-a"])],
      taskHistory: [taskHistory("S1", "T1", "failed")],
      selfHealLogs: [],
      patternsById: new Map([
        ["PRD-a", pattern("PRD-a", { tags: ["manual:approved"] })],
      ]),
      alreadyAttributed: new Set(),
      completedKickoffs: new Set(),
      ...BASE,
    });
    expect(res.attributions[0].immune).toBe(true);
    expect(res.attributions[0].delta).toBe(0);
    expect(res.attributions[0].newScore).toBe(0.4);
  });

  it("skips already-attributed kickoffs via the cursor", () => {
    const res = computeCodegenPrepAttributions({
      l1TraceEvents: [injectEvent("S1", ["PRD-a"])],
      taskHistory: [taskHistory("S1", "T1", "failed")],
      selfHealLogs: [],
      patternsById: new Map([["PRD-a", pattern("PRD-a")]]),
      alreadyAttributed: new Set(["S1"]),
      completedKickoffs: new Set(),
      ...BASE,
    });
    expect(res.attributions).toHaveLength(0);
    expect(res.stats.kickoffsSkippedAlreadyAttributed).toBe(1);
    expect(res.newlyAttributed).toEqual([]);
  });

  it("skips kickoffs with no PRD injection without marking them attributed", () => {
    const res = computeCodegenPrepAttributions({
      l1TraceEvents: [],
      taskHistory: [taskHistory("S1", "T1", "failed")],
      selfHealLogs: [],
      patternsById: new Map([["PRD-a", pattern("PRD-a")]]),
      alreadyAttributed: new Set(),
      completedKickoffs: new Set(),
      ...BASE,
    });
    expect(res.attributions).toHaveLength(0);
    expect(res.stats.kickoffsSkippedNoInjection).toBe(1);
    expect(res.newlyAttributed).toEqual([]);
  });

  it("caps negative blame per kickoff and clamps the score floor", () => {
    const res = computeCodegenPrepAttributions({
      l1TraceEvents: [injectEvent("S1", ["PRD-a"])],
      // 5 failed tasks would be 5 units; cap is 2.
      taskHistory: [
        taskHistory("S1", "T1", "failed"),
        taskHistory("S1", "T2", "failed"),
        taskHistory("S1", "T3", "failed"),
        taskHistory("S1", "T4", "failed"),
        taskHistory("S1", "T5", "failed"),
      ],
      selfHealLogs: [],
      patternsById: new Map([["PRD-a", pattern("PRD-a", { metrics: { score: -0.95 } })]]),
      alreadyAttributed: new Set(),
      completedKickoffs: new Set(),
      ...BASE,
    });
    expect(res.attributions[0].failures).toBe(2); // capped
    expect(res.attributions[0].newScore).toBe(-1); // clamped floor
  });
});
