/**
 * Per-run subsystem build progress, persisted to `.blueprint/subsystems-progress.json`.
 * Lets a subsystem-by-subsystem build resume: completed subsystems are skipped
 * on the next run. Best-effort IO (mirrors the snapshot/manifest pattern).
 */

import fs from "fs/promises";
import path from "path";

import type { SubsystemRunResult } from "./orchestrate";

const PROGRESS_FILE = path.join(".blueprint", "subsystems-progress.json");

export interface SubsystemProgressEntry {
  subsystemId: string;
  status: "completed" | "failed" | "skipped";
  summary?: string;
  updatedAt?: string;
}

export interface SubsystemProgress {
  entries: SubsystemProgressEntry[];
}

function progressPath(projectRoot: string): string {
  return path.join(projectRoot, PROGRESS_FILE);
}

export async function readSubsystemProgress(
  projectRoot: string,
): Promise<SubsystemProgress> {
  try {
    const raw = await fs.readFile(progressPath(projectRoot), "utf-8");
    const parsed = JSON.parse(raw) as SubsystemProgress;
    if (parsed && Array.isArray(parsed.entries)) return parsed;
  } catch {
    /* missing/corrupt → empty */
  }
  return { entries: [] };
}

/** Set of subsystem ids that completed — pass as `alreadyDone` to the runner. */
export function completedSubsystemIds(progress: SubsystemProgress): Set<string> {
  return new Set(
    progress.entries.filter((e) => e.status === "completed").map((e) => e.subsystemId),
  );
}

/** Upsert one subsystem's result and persist. `now` is injected (deterministic). */
export async function recordSubsystemResult(
  projectRoot: string,
  result: SubsystemRunResult,
  now: string,
): Promise<void> {
  const progress = await readSubsystemProgress(projectRoot);
  const next = progress.entries.filter((e) => e.subsystemId !== result.subsystemId);
  next.push({
    subsystemId: result.subsystemId,
    status: result.status,
    summary: result.summary,
    updatedAt: now,
  });
  try {
    await fs.mkdir(path.join(projectRoot, ".blueprint"), { recursive: true });
    await fs.writeFile(
      progressPath(projectRoot),
      JSON.stringify({ entries: next }, null, 2) + "\n",
      "utf-8",
    );
  } catch (err) {
    console.warn(
      "[Subsystems] Failed to write progress (ignored):",
      err instanceof Error ? err.message : err,
    );
  }
}
