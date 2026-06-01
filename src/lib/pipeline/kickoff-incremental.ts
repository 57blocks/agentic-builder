/**
 * Incremental Kickoff — produce a new task breakdown for a PRD edit without
 * throwing away the previous one.
 *
 * C-phase strategy (deliberately simple):
 *   1. Drop tasks whose `coversRequirementIds` are entirely in `removed`.
 *   2. If there are requirement IDs that no surviving task covers
 *      (`requirementsNeedingNewTasks`), run the existing task-breakdown agent
 *      against the NEW documents to get a fresh full breakdown, then keep only
 *      those tasks whose `coversRequirementIds` intersect that set. We re-ID
 *      them so they don't collide with surviving IDs.
 *   3. Concatenate: [surviving previous tasks] + [filtered new tasks].
 *   4. Compute `tasksToRerunIds` = previous task IDs flagged by
 *      `regenCtx.taskDelta.taskIdsToRerun` + every newly-added task's ID.
 *
 * B-phase will replace step 2 with a real "incremental mode" prompt so we
 * stop paying the cost of a full re-breakdown when only one feature changed.
 * The signature of this module is designed to make that swap a localized edit
 * inside `generateNewTasksForRequirements()`.
 */

import { buildTaskBreakdownFromDocuments } from "./kickoff-task-breakdown.server";
import { normalizeProjectTier, type ProjectTier } from "@/lib/agents/shared/project-classifier";
import type { KickoffWorkItem } from "./types";
import type { RegenerationContext } from "./incremental-rerun";
import type { PrdSpec } from "@/lib/requirements/prd-spec-types";

export interface IncrementalKickoffInput {
  regenCtx: RegenerationContext;
  /** Freshly regenerated documents from the doc-regen step. */
  newDocs: {
    prd: string;
    trd?: string;
    sysDesign?: string;
    implGuide?: string;
    designSpec?: string;
  };
  prdSpec?: PrdSpec | null;
  tier?: ProjectTier;
  sessionId?: string;
}

export interface IncrementalKickoffResult {
  /** Full task list to hand to coding: surviving + newly-generated. */
  tasks: KickoffWorkItem[];
  /** Task IDs that should be re-run by coding (subset of `tasks`). */
  tasksToRerunIds: string[];
  /** IDs that were dropped from the previous list. */
  droppedTaskIds: string[];
  /** IDs of newly-generated tasks (subset of `tasks`). */
  newTaskIds: string[];
  /** Bookkeeping for telemetry. */
  diagnostics: {
    requirementsRequested: string[];
    requirementsActuallyCovered: string[];
    requirementsStillUncovered: string[];
    costUsd: number;
    durationMs: number;
    parseFailed: boolean;
  };
}

/** Allocate IDs that don't collide with `taken`. */
function nextAvailableId(prefix: string, taken: Set<string>): string {
  let n = 1;
  while (taken.has(`${prefix}-${String(n).padStart(3, "0")}`)) n++;
  const id = `${prefix}-${String(n).padStart(3, "0")}`;
  taken.add(id);
  return id;
}

/**
 * Internal: invoke the breakdown agent in INCREMENTAL mode and filter its
 * output to tasks that cover at least one requested requirement ID. Re-IDs to
 * avoid collisions.
 *
 * The agent is told to emit ONLY tasks for `requirementsNeeded`, given
 * `surviving` as already-done context, so it returns a small targeted batch
 * instead of a full re-breakdown. The post-filter below remains the hard
 * guarantee (in case the model over-generates).
 */
async function generateNewTasksForRequirements(args: {
  requirementsNeeded: string[];
  takenIds: Set<string>;
  /** Surviving previous tasks — passed to the agent as already-done context. */
  surviving: KickoffWorkItem[];
  newDocs: IncrementalKickoffInput["newDocs"];
  prdSpec?: PrdSpec | null;
  tier?: ProjectTier;
  sessionId?: string;
}): Promise<{
  tasks: KickoffWorkItem[];
  costUsd: number;
  durationMs: number;
  parseFailed: boolean;
  coveredIds: string[];
}> {
  const {
    requirementsNeeded,
    takenIds,
    surviving,
    newDocs,
    prdSpec,
    tier,
    sessionId,
  } = args;

  if (requirementsNeeded.length === 0) {
    return {
      tasks: [],
      costUsd: 0,
      durationMs: 0,
      parseFailed: false,
      coveredIds: [],
    };
  }

  const needed = new Set(requirementsNeeded);
  const breakdown = await buildTaskBreakdownFromDocuments({
    prd: newDocs.prd,
    trd: newDocs.trd,
    sysDesign: newDocs.sysDesign,
    implGuide: newDocs.implGuide,
    designSpec: newDocs.designSpec,
    prdSpec: prdSpec ?? null,
    sessionId,
    tier,
    // INCREMENTAL mode: the agent is told to emit ONLY tasks for the new /
    // changed requirement IDs, treating the surviving previous tasks as
    // already done. This replaces the old "full re-breakdown + post-filter"
    // cost. The post-filter below stays as the hard guarantee.
    incremental: {
      existingTasks: surviving.map((t) => ({
        id: t.id,
        title: t.title,
        coversRequirementIds: t.coversRequirementIds ?? [],
      })),
      requirementsToCover: requirementsNeeded,
    },
  });

  const filtered: KickoffWorkItem[] = [];
  const coveredSet = new Set<string>();
  for (const t of breakdown.tasks) {
    const covers = t.coversRequirementIds ?? [];
    const hits = covers.filter((id) => needed.has(id));
    if (hits.length === 0) continue;
    // Re-ID to avoid collision with surviving task IDs.
    const phasePrefix = "T";
    const newId = nextAvailableId(phasePrefix, takenIds);
    filtered.push({
      ...t,
      id: newId,
      // Remap any self-references in dependencies — the previous task list's
      // IDs are stable, but this new task's dependencies may point at IDs the
      // agent invented inside this same batch. We zero those out; coding's
      // dependency inference will fix obvious ones, and the surviving tasks
      // are not dependent on these new ones by construction.
      dependencies: undefined,
    });
    for (const h of hits) coveredSet.add(h);
  }

  return {
    tasks: filtered,
    costUsd: breakdown.costUsd,
    durationMs: breakdown.durationMs,
    parseFailed: breakdown.parseFailed,
    coveredIds: [...coveredSet].sort(),
  };
}

/**
 * Top-level entry: produce the new task list and the rerun set for a PRD edit.
 */
export async function kickoffIncremental(
  input: IncrementalKickoffInput,
): Promise<IncrementalKickoffResult> {
  const { regenCtx, newDocs, prdSpec, tier, sessionId } = input;
  const { previousSnapshot, taskDelta } = regenCtx;

  const obsoleteSet = new Set(taskDelta.obsoleteTaskIds);
  const surviving = previousSnapshot.tasks.filter((t) => !obsoleteSet.has(t.id));
  const takenIds = new Set(surviving.map((t) => t.id));

  const requirementsNeeded = taskDelta.requirementsNeedingNewTasks;
  const gen = await generateNewTasksForRequirements({
    requirementsNeeded,
    takenIds,
    surviving,
    newDocs,
    prdSpec,
    tier: normalizeProjectTier(tier ?? "M"),
    sessionId,
  });

  const allTasks = [...surviving, ...gen.tasks];
  const newTaskIds = gen.tasks.map((t) => t.id);
  const tasksToRerunIds = [
    ...new Set([...taskDelta.taskIdsToRerun, ...newTaskIds]),
  ].sort();

  const requirementsStillUncovered = requirementsNeeded.filter(
    (id) => !gen.coveredIds.includes(id),
  );

  return {
    tasks: allTasks,
    tasksToRerunIds,
    droppedTaskIds: [...obsoleteSet].sort(),
    newTaskIds,
    diagnostics: {
      requirementsRequested: requirementsNeeded,
      requirementsActuallyCovered: gen.coveredIds,
      requirementsStillUncovered,
      costUsd: gen.costUsd,
      durationMs: gen.durationMs,
      parseFailed: gen.parseFailed,
    },
  };
}
