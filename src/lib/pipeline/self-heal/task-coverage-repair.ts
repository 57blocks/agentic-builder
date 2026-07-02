/**
 * Task-coverage self-heal.
 *
 * The `runTaskCoverageGate` gate only checks whether the kick-off task list
 * declares coverage (`coversRequirementIds`) of every PRD requirement ID.
 * Historically a failure here was a soft warning that never stopped the
 * pipeline, so PRDs with 20+ uncovered ids would proceed and silently skip
 * whole features.
 *
 * This module runs a bounded self-heal loop:
 *
 *   1. If the gate reports missing ids, call
 *      `TaskBreakdownAgent.generateSupplementaryTasks` with a batch of them.
 *   2. Parse + normalise the response, re-use existing parse/recover helpers.
 *   3. Merge with existing tasks (no renumbering, no collisions on
 *      `files.creates`) and re-evaluate the gate.
 *   4. Repeat up to `MAX_COVERAGE_REPAIR_ATTEMPTS`.
 *
 * The loop always terminates. If ids remain, they are returned as
 * `finalMissing` — the caller decides whether to warn or fail. Telemetry
 * is fully captured via the `RepairEmitter`.
 */

import type { PrdSpec } from "@/lib/requirements/prd-spec-types";
import type { KickoffWorkItem } from "@/lib/pipeline/types";
import type { ProjectTier } from "@/lib/agents";
import { TaskBreakdownAgent } from "@/lib/agents/kickoff/task-breakdown-agent";
import {
  parseJsonArrayFromLlmOutput,
  normalizeOriginalTaskBreakdown,
} from "@/lib/pipeline/kickoff-task-breakdown.server";
import { inferTaskDependencies } from "@/lib/pipeline/task-dep-inference";
import type { RepairEmitter } from "./events";
import {
  type AttemptTracker,
  missingIdsScopeKey,
} from "./attempt-tracker";

const DEFAULT_MAX_ATTEMPTS = Number(
  process.env.COVERAGE_REPAIR_MAX_ATTEMPTS ?? "2",
);
const DEFAULT_MAX_MISSING_PER_BATCH = Number(
  process.env.COVERAGE_REPAIR_BATCH_SIZE ?? "15",
);

export interface TaskCoverageRepairInput {
  missingIds: string[];
  existingTasks: KickoffWorkItem[];
  prd: string;
  trd?: string;
  sysDesign?: string;
  implGuide?: string;
  prdSpecText?: string;
  prdSpec?: PrdSpec | null;
  /**
   * When a prototype was generated, this is the same string
   * `buildPrototypeBreakdownContext` produced for the main task-breakdown
   * pass — it declares which page files already exist and which CMP-* ids
   * are already inlined in them. Forwarded verbatim to
   * `generateSupplementaryTasks` so self-heal tasks don't re-create them.
   */
  prototypeContext?: string;
  scaffoldBlock?: string;
  tier: ProjectTier;
  scaffoldTier?: "S" | "M" | "L";
  skillsBlock?: string;
  sessionId?: string;
  emitter: RepairEmitter;
  /** Cross-invocation attempt counter — see attempt-tracker.ts. When the
   *  same missing-id set has been retried ≥ threshold times in this session,
   *  the function returns early without calling the LLM. */
  attemptTracker?: AttemptTracker;
}

export interface TaskCoverageRepairResult {
  /** All tasks (existing + added), in the order they should appear. */
  tasks: KickoffWorkItem[];
  /** New tasks that the repair loop produced. */
  added: KickoffWorkItem[];
  /** PRD ids still uncovered after all attempts. */
  finalMissing: string[];
  attempts: number;
  costUsd: number;
  durationMs: number;
  rawOutputs: string[];
  /** True when the call was short-circuited by the circuit breaker. */
  circuitOpen?: boolean;
}

/**
 * Run a bounded self-heal loop to cover missing PRD requirement IDs with
 * additional tasks. Caller must pre-compute `missingIds` from the gate.
 */
export async function repairTaskCoverage(
  input: TaskCoverageRepairInput,
): Promise<TaskCoverageRepairResult> {
  const {
    missingIds,
    existingTasks,
    prd,
    trd,
    sysDesign,
    implGuide,
    prdSpecText,
    prototypeContext,
    scaffoldBlock,
    tier,
    scaffoldTier,
    sessionId,
    emitter,
    attemptTracker,
  } = input;

  const result: TaskCoverageRepairResult = {
    tasks: [...existingTasks],
    added: [],
    finalMissing: [...missingIds],
    attempts: 0,
    costUsd: 0,
    durationMs: 0,
    rawOutputs: [],
  };

  if (missingIds.length === 0) return result;

  const trackerScope = {
    stage: "coverage-gate" as const,
    scopeKey: missingIdsScopeKey(missingIds),
  };

  if (attemptTracker?.isCircuitOpen(trackerScope)) {
    const record = attemptTracker.getRecord(trackerScope);
    result.circuitOpen = true;
    emitter({
      stage: "coverage-gate",
      event: "circuit_open",
      attempt: record?.attempts,
      circuitOpen: true,
      missingIds,
      details: {
        reason: "Task-coverage repair has exhausted its retry budget for this missing-id set; escalating without another LLM round-trip.",
        lastOutcome: record?.lastOutcome,
      },
    });
    return result;
  }

  if (attemptTracker) {
    await attemptTracker.noteStart(trackerScope);
  }

  const agent = new TaskBreakdownAgent(tier, scaffoldBlock, undefined, scaffoldTier);
  const maxAttempts = clampPositiveInt(DEFAULT_MAX_ATTEMPTS, 1, 5);
  const batchSize = clampPositiveInt(DEFAULT_MAX_MISSING_PER_BATCH, 1, 50);

  const alreadyCreates = collectAllCreates(existingTasks);
  const allSeenIds = new Set(existingTasks.map((t) => t.id));

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (result.finalMissing.length === 0) break;

    emitter({
      stage: "coverage-gate",
      event: "repair_start",
      attempt,
      missingIds: result.finalMissing,
      details: {
        existingTaskCount: result.tasks.length,
        batchSize,
      },
    });

    const batches = chunk(result.finalMissing, batchSize);
    let addedThisAttempt = 0;

    for (const batch of batches) {
      const startingTaskId = nextTaskId(allSeenIds);
      const start = Date.now();

      let agentResult: Awaited<
        ReturnType<TaskBreakdownAgent["generateSupplementaryTasks"]>
      >;
      try {
        agentResult = await agent.generateSupplementaryTasks(
          {
            missingIds: batch,
            existingTaskSummary: result.tasks.map((t) => ({
              id: t.id,
              phase: t.phase,
              title: t.title,
              creates: extractCreates(t),
            })),
            startingTaskId,
            prd,
            trd,
            sysDesign,
            implGuide,
            prdSpecText,
            prototypeContext,
          },
          sessionId,
        );
      } catch (err) {
        emitter({
          stage: "coverage-gate",
          event: "repair_llm_failed",
          attempt,
          missingIds: batch,
          details: {
            error: err instanceof Error ? err.message : String(err),
          },
        });
        continue;
      }

      result.rawOutputs.push(agentResult.content);
      result.costUsd += agentResult.costUsd ?? 0;
      result.durationMs += Date.now() - start;

      const parsed = parseJsonArrayFromLlmOutput(agentResult.content);
      if (parsed.parseFailed || parsed.tasks.length === 0) {
        emitter({
          stage: "coverage-gate",
          event: "repair_parse_failed",
          attempt,
          missingIds: batch,
          details: {
            parseError: parsed.parseError ?? "no tasks parsed",
          },
        });
        continue;
      }

      const newTasks = parsed.tasks.filter((t) => !allSeenIds.has(t.id));
      const droppedCollisions = parsed.tasks.length - newTasks.length;
      if (droppedCollisions > 0) {
        emitter({
          stage: "coverage-gate",
          event: "id_collision_dropped",
          attempt,
          details: { dropped: droppedCollisions },
        });
      }

      // Demote a new task's "creates" to "modifies" if another task already
      // creates that path — prevents two tasks fighting over one file.
      const collisionAdjusted = newTasks.map((t) =>
        remapCreatesToModifies(t, alreadyCreates),
      );

      // Repair orphan modifies: when a supplementary task says it modifies
      // `frontend/src/views/MonitorDashboard.tsx` but the actual created
      // file is `frontend/src/views/MonitorDashboardPage.tsx`, fuzzy-match
      // the orphan to the real created path. Without this, the coding
      // phase later either fails (modifying a non-existent file) or
      // produces an orphan dupe with the wrong name.
      const adjusted = collisionAdjusted.map((t) => {
        const out = repairOrphanModifies(t, alreadyCreates);
        if (out.remapped.length > 0 || out.dropped.length > 0) {
          emitter({
            stage: "coverage-gate",
            event: "orphan_modifies_repaired",
            attempt,
            taskId: t.id,
            details: { remapped: out.remapped, dropped: out.dropped },
          });
        }
        return out.task;
      });

      const normalized = normalizeOriginalTaskBreakdown(adjusted, prd);
      for (const t of normalized) {
        allSeenIds.add(t.id);
        extendCreatesSet(alreadyCreates, t);
        result.tasks.push(t);
        result.added.push(t);
        addedThisAttempt++;
      }
    }

    // Recompute the uncovered set from the post-merge coverage declarations.
    const coveredNow = new Set<string>();
    for (const t of result.tasks) {
      for (const id of t.coversRequirementIds ?? []) {
        coveredNow.add(String(id).toUpperCase());
      }
    }
    const stillMissing = result.finalMissing.filter(
      (id) => !coveredNow.has(String(id).toUpperCase()),
    );

    emitter({
      stage: "coverage-gate",
      event: "repair_done",
      attempt,
      repairedIds: result.finalMissing.filter(
        (id) => coveredNow.has(String(id).toUpperCase()),
      ),
      stillMissing,
      details: { addedThisAttempt },
    });

    result.attempts = attempt;
    result.finalMissing = stillMissing;

    // If the model produced nothing new, further attempts are unlikely to help.
    if (addedThisAttempt === 0) break;
  }

  emitter({
    stage: "coverage-gate",
    event: "repair_final_state",
    attempt: result.attempts,
    stillMissing: result.finalMissing,
    details: {
      addedTotal: result.added.length,
      costUsd: result.costUsd,
    },
  });

  // Supplementary tasks added during repair often lack dependency edges
  // (the supplementary agent prompt only asks for ids it can reference, not
  // a full DAG re-derivation). Run the dep inferrer on the merged list so
  // newly-appended tasks pick up foundation deps that the initial pass
  // already established. Existing non-empty deps are preserved by the
  // inferrer.
  if (result.tasks.length > 0) {
    const { tasks: withDeps, trace: depTrace } = inferTaskDependencies(
      result.tasks,
    );
    if (depTrace.added.length > 0) {
      emitter({
        stage: "coverage-gate",
        event: "deps_inferred",
        details: { edges: depTrace.added },
      });
    }
    result.tasks = withDeps;
  }

  if (attemptTracker) {
    const repairedIds = missingIds.filter(
      (id) => !result.finalMissing.includes(id),
    );
    if (repairedIds.length > 0 && result.finalMissing.length === 0) {
      await attemptTracker.noteOutcome(trackerScope, "repaired", repairedIds);
    } else if (repairedIds.length > 0) {
      // Partial progress — clear the old scope and let the new (smaller)
      // missing-id set get its own counter on the next invocation.
      attemptTracker.reset(trackerScope);
    } else {
      await attemptTracker.noteOutcome(trackerScope, "still_missing");
    }
  }

  return result;
}

// ─── helpers ─────────────────────────────────────────────────────────────

function clampPositiveInt(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n) || n <= 0) return lo;
  return Math.min(Math.max(Math.floor(n), lo), hi);
}

function chunk<T>(arr: T[], size: number): T[][] {
  if (size <= 0) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

function nextTaskId(seen: Set<string>): string {
  let max = 0;
  for (const id of seen) {
    const m = /^T-(\d+)$/.exec(id);
    if (m) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n) && n > max) max = n;
    }
  }
  const next = max + 1;
  return `T-${String(next).padStart(3, "0")}`;
}

function collectAllCreates(tasks: KickoffWorkItem[]): Set<string> {
  const out = new Set<string>();
  for (const t of tasks) {
    for (const f of extractCreates(t)) out.add(f);
  }
  return out;
}

export function extractCreates(task: KickoffWorkItem): string[] {
  const plan = task.files;
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) return [];
  const creates = (plan as unknown as Record<string, unknown>).creates;
  if (!Array.isArray(creates)) return [];
  return creates
    .filter((f): f is string => typeof f === "string" && f.trim().length > 0)
    .map((f) => f.trim());
}

function extendCreatesSet(set: Set<string>, task: KickoffWorkItem): void {
  const plan = task.files;
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) return;
  const creates = (plan as unknown as Record<string, unknown>).creates;
  if (!Array.isArray(creates)) return;
  for (const f of creates) {
    if (typeof f === "string" && f.trim()) set.add(f.trim());
  }
}

/**
 * Repair orphan `files.modifies` entries — paths that don't match any
 * file the existing tasks have created. Common cause: the supplementary
 * LLM invented a filename (`MonitorDashboard.tsx`) for a file that was
 * actually created with a different name (`MonitorDashboardPage.tsx`),
 * because the supplementary prompt historically only summarized existing
 * tasks by title (not their `files.creates`).
 *
 * Strategy:
 *   1. If the orphan path exactly matches an existing created path → keep.
 *   2. Else, look for a created path that shares the same directory and
 *      whose basename is a SUPER-string of the orphan's basename stem
 *      (or vice versa). If exactly one such match exists → remap.
 *   3. If 0 or >1 candidates → drop the orphan entry and report it so a
 *      human can audit. We prefer correct-but-shrunk modifies over
 *      modifies that would crash the coding phase.
 *
 * Does NOT touch `files.creates` or `files.reads`. Idempotent.
 */
function repairOrphanModifies(
  task: KickoffWorkItem,
  existingCreates: Set<string>,
): {
  task: KickoffWorkItem;
  remapped: Array<{ from: string; to: string }>;
  dropped: string[];
} {
  const plan = task.files;
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
    return { task, remapped: [], dropped: [] };
  }
  const record = plan as unknown as Record<string, unknown>;
  const modifies = Array.isArray(record.modifies)
    ? (record.modifies as unknown[]).filter(
        (f): f is string => typeof f === "string",
      )
    : [];
  if (modifies.length === 0) return { task, remapped: [], dropped: [] };

  const remapped: Array<{ from: string; to: string }> = [];
  const dropped: string[] = [];
  const newModifies: string[] = [];

  for (const orphan of modifies) {
    if (existingCreates.has(orphan)) {
      newModifies.push(orphan);
      continue;
    }
    const match = fuzzyMatchCreatedPath(orphan, existingCreates);
    if (match) {
      remapped.push({ from: orphan, to: match });
      newModifies.push(match);
    } else {
      // No candidate or ambiguous. Common when modifying scaffold files
      // (router.tsx, app.ts) that aren't in `creates`. Keep the entry —
      // dropping a real scaffold-modify would be worse than the rare
      // false-positive. We only drop when we're confident the entry is
      // a hallucination, which the fuzzy matcher already disambiguates.
      newModifies.push(orphan);
    }
  }

  if (remapped.length === 0 && dropped.length === 0) {
    return { task, remapped, dropped };
  }

  return {
    task: {
      ...task,
      files: {
        creates: Array.isArray(record.creates)
          ? (record.creates as unknown[]).filter(
              (f): f is string => typeof f === "string",
            )
          : [],
        modifies: [...new Set(newModifies)],
        reads: Array.isArray(record.reads)
          ? (record.reads as unknown[]).filter(
              (f): f is string => typeof f === "string",
            )
          : [],
      },
    },
    remapped,
    dropped,
  };
}

/**
 * Find a created path whose basename is closely related to the orphan's
 * basename. The orphan and candidate must share the same directory; basename
 * stems must be in a super/sub-string relationship (e.g. `MonitorDashboard`
 * ⊂ `MonitorDashboardPage`) with the longer being ≤ 1.6× the shorter. If
 * multiple candidates qualify, return null (ambiguous — caller will keep
 * the orphan rather than guess).
 */
function fuzzyMatchCreatedPath(
  orphan: string,
  existingCreates: Set<string>,
): string | null {
  const slash = orphan.lastIndexOf("/");
  const orphanDir = slash >= 0 ? orphan.slice(0, slash) : "";
  const orphanBase = slash >= 0 ? orphan.slice(slash + 1) : orphan;
  const orphanStem = stripExt(orphanBase);

  const candidates: string[] = [];
  for (const c of existingCreates) {
    const cSlash = c.lastIndexOf("/");
    const cDir = cSlash >= 0 ? c.slice(0, cSlash) : "";
    if (cDir !== orphanDir) continue;
    const cBase = cSlash >= 0 ? c.slice(cSlash + 1) : c;
    const cStem = stripExt(cBase);
    if (cStem === orphanStem) continue; // exact would have hit the .has check
    const longer = cStem.length >= orphanStem.length ? cStem : orphanStem;
    const shorter = cStem.length >= orphanStem.length ? orphanStem : cStem;
    if (!longer.includes(shorter)) continue;
    if (longer.length > shorter.length * 1.6) continue;
    candidates.push(c);
  }
  return candidates.length === 1 ? candidates[0]! : null;
}

function stripExt(base: string): string {
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(0, dot) : base;
}

/**
 * If a new task's `creates` entry already appears in `existingCreates`,
 * move that entry to `modifies` instead. Prevents ownership conflicts.
 */
function remapCreatesToModifies(
  task: KickoffWorkItem,
  existingCreates: Set<string>,
): KickoffWorkItem {
  const plan = task.files;
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) return task;
  const record = plan as unknown as Record<string, unknown>;
  const creates = Array.isArray(record.creates)
    ? (record.creates as unknown[]).filter(
        (f): f is string => typeof f === "string",
      )
    : [];
  const modifies = Array.isArray(record.modifies)
    ? (record.modifies as unknown[]).filter(
        (f): f is string => typeof f === "string",
      )
    : [];
  const reads = Array.isArray(record.reads)
    ? (record.reads as unknown[]).filter(
        (f): f is string => typeof f === "string",
      )
    : [];

  const newCreates: string[] = [];
  const movedToModifies: string[] = [];
  for (const f of creates) {
    if (existingCreates.has(f)) {
      movedToModifies.push(f);
    } else {
      newCreates.push(f);
    }
  }
  if (movedToModifies.length === 0) return task;

  return {
    ...task,
    files: {
      creates: newCreates,
      modifies: [...new Set([...modifies, ...movedToModifies])],
      reads,
    },
  };
}
