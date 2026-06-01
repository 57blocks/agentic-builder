/**
 * Kickoff Snapshot
 *
 * After each successful kickoff step, a snapshot of the inputs that produced
 * the task breakdown is written to `.blueprint/last-kickoff-snapshot.json`.
 * A later "PRD edit → propagate downstream" flow reads this snapshot to:
 *   - diff the new PRD's requirement index against the saved one,
 *   - compute which tasks are obsolete / need rerun / need new generation,
 *   - feed downstream agents the previous documents as base context.
 *
 * Schema notes:
 *   - All document bodies are stored verbatim from the PipelineRun step results.
 *     The PRD body is stored AFTER `stripChangeMarkers()` so the canonical PRD
 *     used for diffing has no `<div class="prd-changed-section">` noise.
 *   - `prdSpec` is the structured PRD spec (pages, components, domain) — kept here
 *     in addition to the sidecar `.blueprint/PRD_SPEC.json` so the snapshot is
 *     self-contained for diffing without a second file read.
 *   - `tasks` is the final post-repair task list (after self-heal patches),
 *     i.e. exactly what was handed to coding.
 */

import fs from "fs/promises";
import path from "path";

import type { PrdRequirementIndex, PrdSpec } from "@/lib/requirements/prd-spec-types";
import type { KickoffWorkItem } from "./types";

export interface KickoffSnapshotDocs {
  prd: string;
  trd?: string;
  sysdesign?: string;
  implguide?: string;
  design?: string;
}

export interface KickoffSnapshot {
  sessionId: string;
  runId: string;
  savedAt: string;
  /** Canonical PRD content (change markers stripped). */
  prdContent: string;
  prdRequirementIndex: PrdRequirementIndex;
  prdSpec?: PrdSpec;
  /** Final task list handed to coding (post self-heal). */
  tasks: KickoffWorkItem[];
  /** Document bodies as they were when these tasks were produced.
   *  Kept so the B-phase (per-doc patcher) can use them as base context. */
  docs: KickoffSnapshotDocs;
}

const SNAPSHOT_FILE = path.join(".blueprint", "last-kickoff-snapshot.json");

function snapshotPath(projectRoot: string): string {
  return path.join(projectRoot, SNAPSHOT_FILE);
}

export async function writeKickoffSnapshot(
  projectRoot: string,
  snapshot: KickoffSnapshot,
): Promise<void> {
  try {
    await fs.mkdir(path.join(projectRoot, ".blueprint"), { recursive: true });
    await fs.writeFile(
      snapshotPath(projectRoot),
      JSON.stringify(snapshot, null, 2) + "\n",
      "utf-8",
    );
    console.log(
      `[KickoffSnapshot] Saved session ${snapshot.sessionId}: ${snapshot.tasks.length} tasks, ` +
        `${snapshot.prdRequirementIndex.featureIds.length} FRs, ` +
        `${snapshot.prdRequirementIndex.acceptanceCriteriaIds.length} ACs.`,
    );
  } catch (err) {
    console.warn(
      `[KickoffSnapshot] Failed to write snapshot (ignored):`,
      err instanceof Error ? err.message : err,
    );
  }
}

export async function readKickoffSnapshot(
  projectRoot: string,
): Promise<KickoffSnapshot | null> {
  try {
    const raw = await fs.readFile(snapshotPath(projectRoot), "utf-8");
    const parsed = JSON.parse(raw) as KickoffSnapshot;
    if (
      !parsed.sessionId ||
      !parsed.prdContent ||
      !Array.isArray(parsed.tasks) ||
      !parsed.prdRequirementIndex
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function clearKickoffSnapshot(projectRoot: string): Promise<void> {
  try {
    await fs.unlink(snapshotPath(projectRoot));
  } catch {
    // ignore — already absent
  }
}
