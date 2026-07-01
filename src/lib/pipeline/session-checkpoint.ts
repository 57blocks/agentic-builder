/**
 * Session Checkpoint
 *
 * After each coding session completes (pass or fail), a lightweight checkpoint
 * is written to `.blueprint/last-coding-session.json` so the next run can
 * resume from where it left off without re-running already-completed tasks.
 *
 * Lifecycle:
 *   1. Coding session ends → writeSessionCheckpoint() saves task results.
 *   2. User clicks "Retry Failed Tasks" → readSessionCheckpoint() returns
 *      the list of failed task IDs.
 *   3. Next coding API call includes `retryFailedTaskIds` → only those tasks
 *      are executed; already-completed tasks are reported as skipped.
 */

import fs from "fs/promises";
import path from "path";

export interface TaskCheckpointEntry {
  status: "completed" | "completed_with_warnings" | "failed" | "unknown";
  generatedFiles: string[];
}

export interface SessionCheckpoint {
  sessionId: string;
  savedAt: string;
  /** IDs of tasks that completed successfully (including with warnings). */
  completedTaskIds: string[];
  /** IDs of tasks that failed or produced no files. */
  failedTaskIds: string[];
  /** IDs of tasks actively being generated at the moment this checkpoint was
   *  written (started but not yet terminal). Advisory ONLY — used by the
   *  reconnect/poll UI to show "in progress" instead of a dead-looking all-
   *  PENDING grid during early codegen. Does NOT affect retry semantics, which
   *  key off failedTaskIds. */
  inProgressTaskIds?: string[];
  /** Full per-task result map. */
  taskResults: Record<string, TaskCheckpointEntry>;
}

const CHECKPOINT_FILE = path.join(".blueprint", "last-coding-session.json");

function checkpointPath(projectRoot: string): string {
  return path.join(projectRoot, CHECKPOINT_FILE);
}

/** Persist a checkpoint after a coding session ends. */
export async function writeSessionCheckpoint(
  projectRoot: string,
  sessionId: string,
  taskResults: Map<string, TaskCheckpointEntry>,
  /** Full list of task IDs for this session. Any ID not present in taskResults
   *  (i.e. never started) is treated as unknown/failed so it appears in the
   *  "Retry Failed Tasks" flow. */
  allTaskIds?: string[],
  /** Tasks currently being generated (started, not yet terminal). Advisory —
   *  recorded verbatim for the reconnect UI; never reclassified as failed. */
  inProgressTaskIds?: string[],
): Promise<void> {
  const completedTaskIds: string[] = [];
  const failedTaskIds: string[] = [];
  const taskResultsObj: Record<string, TaskCheckpointEntry> = {};

  for (const [id, result] of taskResults) {
    taskResultsObj[id] = result;
    if (result.status === "failed" || result.status === "unknown") {
      failedTaskIds.push(id);
    } else {
      completedTaskIds.push(id);
    }
  }

  // Tasks that were planned but never started (e.g. session aborted early)
  // must also land in failedTaskIds so the Retry button surfaces them.
  if (allTaskIds) {
    for (const id of allTaskIds) {
      if (!taskResults.has(id)) {
        failedTaskIds.push(id);
        taskResultsObj[id] = { status: "unknown", generatedFiles: [] };
      }
    }
  }

  // Only surface ids with NO real terminal result yet (taskResults is the map of
  // genuinely-collected outcomes; failedTaskIds also holds synthetic "unknown"
  // entries for not-yet-started tasks, so we must not filter against it here or
  // every in-progress id would be dropped during an incremental write).
  const liveInProgress = (inProgressTaskIds ?? []).filter((id) => !taskResults.has(id));

  const checkpoint: SessionCheckpoint = {
    sessionId,
    savedAt: new Date().toISOString(),
    completedTaskIds,
    failedTaskIds,
    ...(liveInProgress.length ? { inProgressTaskIds: liveInProgress } : {}),
    taskResults: taskResultsObj,
  };

  try {
    await fs.mkdir(path.join(projectRoot, ".blueprint"), { recursive: true });
    await fs.writeFile(checkpointPath(projectRoot), JSON.stringify(checkpoint, null, 2) + "\n", "utf-8");
    console.log(
      `[Checkpoint] Saved session ${sessionId}: ${completedTaskIds.length} completed, ${failedTaskIds.length} failed.`,
    );
  } catch (err) {
    console.warn(
      `[Checkpoint] Failed to write checkpoint (ignored):`,
      err instanceof Error ? err.message : err,
    );
  }
}

/** Read the last session checkpoint. Returns null if none exists. */
export async function readSessionCheckpoint(
  projectRoot: string,
): Promise<SessionCheckpoint | null> {
  try {
    const raw = await fs.readFile(checkpointPath(projectRoot), "utf-8");
    const parsed = JSON.parse(raw) as SessionCheckpoint;
    if (!parsed.sessionId || !Array.isArray(parsed.failedTaskIds)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Clear the checkpoint (e.g., when starting a full fresh run). */
export async function clearSessionCheckpoint(projectRoot: string): Promise<void> {
  try {
    await fs.unlink(checkpointPath(projectRoot));
  } catch {
    // File may not exist — that's fine.
  }
}
