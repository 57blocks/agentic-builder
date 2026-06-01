/**
 * Incremental Rerun — diff & delta computation for PRD edits.
 *
 * This module is the pure, side-effect-free core of the "PRD edit → propagate
 * downstream" flow. It does NOT call any agents, write any files, or trigger
 * any pipeline steps — it only computes:
 *
 *   1. PRD requirement diff   (added / removed / modified IDs)
 *   2. Task delta             (obsolete / needs-rerun / new-needed)
 *   3. RegenerationContext    (the unified object handed to downstream agents)
 *
 * "modified" detection (Phase B):
 *   When callers pass the old + new PRD content to `buildRegenerationContext`,
 *   the helper splits both into markdown sections, finds which section bodies
 *   changed (pure string-diff, zero LLM), and pulls the FR-/AC-/US-/IC- IDs
 *   that appear in those changed bodies into `modified`. Any task whose
 *   `coversRequirementIds` intersects `modified` is flagged for rerun. This
 *   catches prose-only edits the ID-set diff alone cannot.
 */

import type { PrdRequirementIndex } from "@/lib/requirements/prd-spec-types";
import type { KickoffWorkItem } from "./types";
import type { PrdPatch } from "@/lib/agents/pm/prd-patch";
import type { KickoffSnapshot } from "./kickoff-snapshot";
import { diffPrdSections, type PrdSection } from "./prd-section-diff";

export interface PrdRequirementDiff {
  /** IDs present in the new index but not the old. */
  added: string[];
  /** IDs present in the old index but not the new. */
  removed: string[];
  /** IDs present in both old and new whose surrounding markdown section body
   *  changed. Populated by `buildRegenerationContext` when given both PRD
   *  bodies; otherwise empty (callers may also pass `[]` explicitly into
   *  `computeTaskDelta` to opt out). */
  modified: string[];
}

export interface TaskDelta {
  /** Tasks whose covered requirements are entirely gone. Safe to drop. */
  obsoleteTaskIds: string[];
  /** Tasks that cover at least one modified/removed requirement and should
   *  be re-executed by coding (their definition may or may not also change). */
  taskIdsToRerun: string[];
  /** Requirement IDs that no existing task covers — task-breakdown must
   *  produce new tasks for these. */
  requirementsNeedingNewTasks: string[];
}

export interface RegenerationContext {
  /** Union of added + modified + removed — the full set of "touched" requirement IDs. */
  affectedRequirementIds: string[];
  prdDiff: PrdRequirementDiff;
  taskDelta: TaskDelta;
  /** Section-level patches from `applyPrdPatches()`, if available.
   *  Carried through so per-section regeneration agents can target them. */
  changedSections?: PrdPatch[];
  /** Markdown headings whose body changed between old and new PRD. Populated
   *  by `buildRegenerationContext` when given both PRD bodies. Empty list
   *  means "no prose-only edits detected" (or the caller didn't supply
   *  enough info to detect them). */
  changedSectionHeadings: string[];
  /** The previous kickoff snapshot — exposed so downstream code can read
   *  old documents as base context for surgical regeneration. */
  previousSnapshot: KickoffSnapshot;
}

// ─── Internals ──────────────────────────────────────────────────────────────

/** Flatten all four ID buckets of a PrdRequirementIndex into one Set. */
function flatten(idx: PrdRequirementIndex): Set<string> {
  return new Set<string>([
    ...idx.acceptanceCriteriaIds,
    ...idx.featureIds,
    ...idx.userStoryIds,
    ...idx.componentIds,
  ]);
}

/** Pull every FR-/AC-/US-/IC- requirement ID out of a section body. The regex
 *  matches the same shapes `normalizeCoverageIds` accepts (letters + digits,
 *  optional compound suffix). Case-insensitive then upper-cased so it lines
 *  up with `extractPrdRequirementIndex` output. */
const RE_ANY_REQUIREMENT_ID = /\b(?:AC|FR|US|IC)-[A-Z0-9]+(?:-[A-Z0-9]+)?\b/gi;
function extractIdsFromBody(body: string): Set<string> {
  const out = new Set<string>();
  const matches = body.match(RE_ANY_REQUIREMENT_ID) ?? [];
  for (const id of matches) out.add(id.toUpperCase());
  return out;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Compute the set-difference between two PRD requirement indexes.
 * `modified` is always empty here — callers wanting prose-edit detection
 * should use `diffPrdRequirementsWithSections` (or `buildRegenerationContext`,
 * which calls it). Kept as a thin building block.
 */
export function diffPrdRequirements(
  oldIdx: PrdRequirementIndex,
  newIdx: PrdRequirementIndex,
): PrdRequirementDiff {
  const oldSet = flatten(oldIdx);
  const newSet = flatten(newIdx);
  const added: string[] = [];
  const removed: string[] = [];
  for (const id of newSet) if (!oldSet.has(id)) added.push(id);
  for (const id of oldSet) if (!newSet.has(id)) removed.push(id);
  added.sort();
  removed.sort();
  return { added, removed, modified: [] };
}

/**
 * Same as `diffPrdRequirements`, but also computes `modified` by scanning the
 * `changedSections` bodies for requirement IDs that survive in both indexes.
 * Pure: no LLM, no I/O.
 */
export function diffPrdRequirementsWithSections(
  oldIdx: PrdRequirementIndex,
  newIdx: PrdRequirementIndex,
  changedSections: PrdSection[],
): PrdRequirementDiff {
  const base = diffPrdRequirements(oldIdx, newIdx);
  if (changedSections.length === 0) return base;

  const addedSet = new Set(base.added);
  const removedSet = new Set(base.removed);
  const newSet = flatten(newIdx);
  const oldSet = flatten(oldIdx);
  const modified = new Set<string>();
  for (const section of changedSections) {
    const idsInBody = extractIdsFromBody(section.body);
    for (const id of idsInBody) {
      // Only count IDs that exist in BOTH indexes — purely-added /
      // purely-removed IDs are already reported by `added` / `removed`.
      if (
        newSet.has(id) &&
        oldSet.has(id) &&
        !addedSet.has(id) &&
        !removedSet.has(id)
      ) {
        modified.add(id);
      }
    }
  }
  return {
    ...base,
    modified: [...modified].sort(),
  };
}

/**
 * Given the previous tasks and the requirement diff, decide which tasks are
 * obsolete, which need re-running, and which requirements still need NEW tasks.
 *
 * Rules:
 *   - A task is *obsolete* iff it has a non-empty `coversRequirementIds` AND
 *     every one of those IDs is in `removed`. (If a task covers some still-
 *     present IDs, it is kept and only flagged for rerun.)
 *   - A task is *to-rerun* iff it covers at least one ID in (removed ∪ modified)
 *     but is not itself obsolete.
 *   - `requirementsNeedingNewTasks` = `added` IDs that are not already covered
 *     by any surviving (non-obsolete) task. In practice newly-added IDs won't
 *     appear on old tasks at all, but we filter defensively.
 *
 * Tasks with no `coversRequirementIds` are treated as cross-cutting (setup,
 * scaffolding, integration) and are NEVER marked obsolete or rerun from this
 * function — they survive untouched by default. Callers that want to rerun
 * the whole project can override.
 */
export function computeTaskDelta(
  previousTasks: KickoffWorkItem[],
  prdDiff: PrdRequirementDiff,
): TaskDelta {
  const removedSet = new Set(prdDiff.removed);
  const modifiedSet = new Set(prdDiff.modified);
  const touchedSet = new Set<string>([...removedSet, ...modifiedSet]);

  const obsoleteTaskIds: string[] = [];
  const taskIdsToRerun: string[] = [];
  const survivingCoverage = new Set<string>();

  for (const task of previousTasks) {
    const covers = task.coversRequirementIds ?? [];
    if (covers.length === 0) {
      // Cross-cutting task — keep, do not rerun unless caller overrides.
      continue;
    }

    const allGone = covers.every((id) => removedSet.has(id));
    if (allGone) {
      obsoleteTaskIds.push(task.id);
      continue;
    }

    const touchesAny = covers.some((id) => touchedSet.has(id));
    if (touchesAny) {
      taskIdsToRerun.push(task.id);
    }
    // Record what surviving tasks still cover.
    for (const id of covers) {
      if (!removedSet.has(id)) survivingCoverage.add(id);
    }
  }

  const requirementsNeedingNewTasks = prdDiff.added.filter(
    (id) => !survivingCoverage.has(id),
  );

  return {
    obsoleteTaskIds,
    taskIdsToRerun,
    requirementsNeedingNewTasks,
  };
}

/**
 * Assemble the full RegenerationContext for downstream consumers.
 * Pure function — no I/O. Callers pass the previously-loaded snapshot and
 * the freshly-extracted new index. When `newPrdContent` is also supplied, the
 * helper runs a section-level diff against `previousSnapshot.prdContent` so
 * prose-only edits (no ID change) still flag the right tasks for rerun.
 */
export function buildRegenerationContext(args: {
  previousSnapshot: KickoffSnapshot;
  newRequirementIndex: PrdRequirementIndex;
  /** New PRD body. When omitted, section-diff is skipped (modified=[],
   *  changedSectionHeadings=[]) — same behavior as the old API. */
  newPrdContent?: string;
  changedSections?: PrdPatch[];
}): RegenerationContext {
  const {
    previousSnapshot,
    newRequirementIndex,
    newPrdContent,
    changedSections,
  } = args;

  const sectionDiff =
    typeof newPrdContent === "string"
      ? diffPrdSections(previousSnapshot.prdContent, newPrdContent)
      : { changed: [], added: [], removed: [] };
  const prdDiff = diffPrdRequirementsWithSections(
    previousSnapshot.prdRequirementIndex,
    newRequirementIndex,
    sectionDiff.changed,
  );
  const taskDelta = computeTaskDelta(previousSnapshot.tasks, prdDiff);
  const affectedRequirementIds = [
    ...new Set([...prdDiff.added, ...prdDiff.modified, ...prdDiff.removed]),
  ].sort();
  return {
    affectedRequirementIds,
    prdDiff,
    taskDelta,
    changedSections,
    changedSectionHeadings: sectionDiff.changed.map((s) => s.heading),
    previousSnapshot,
  };
}
