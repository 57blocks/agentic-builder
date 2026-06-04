/**
 * Bug Fix Checkpoint
 *
 * Persists bug reports and their fix results to
 * `.blueprint/bug-fix-session.json` inside the generated-code root.
 *
 * Lifecycle:
 *   1. Panel mounts → readBugFixCheckpoint() restores last session's bugs.
 *   2. Session ends  → writeBugFixCheckpoint() saves results.
 *   3. User re-opens panel → fixed bugs show ✓, failed bugs are pre-loaded for retry.
 */

import fs from "fs/promises";
import path from "path";
import type { BugReport } from "./bug-fix-session";
import type { BugVerificationResult } from "./bug-fix-verify";

const CHECKPOINT_FILE = path.join(".blueprint", "bug-fix-session.json");

function checkpointPath(outputDir: string): string {
  return path.join(outputDir, CHECKPOINT_FILE);
}

export interface BugFixCheckpointEntry {
  bug: BugReport;
  status: "pending" | "fixed" | "failed";
  /** Files written by the worker for this bug. */
  generatedFiles: string[];
  fixedAt?: string;
  costUsd?: number;
  tokens?: { promptTokens: number; completionTokens: number; totalTokens: number };
  verification?: BugVerificationResult;
  e2eVerification?: BugVerificationResult;
}

export interface BugFixCheckpoint {
  sessionId: string;
  startedAt: string;
  savedAt: string;
  entries: BugFixCheckpointEntry[];
  totalCostUsd?: number;
}

/** Read the last bug-fix checkpoint. Returns null if none exists. */
export async function readBugFixCheckpoint(
  outputDir: string,
): Promise<BugFixCheckpoint | null> {
  try {
    const raw = await fs.readFile(checkpointPath(outputDir), "utf-8");
    const parsed = JSON.parse(raw) as BugFixCheckpoint;
    if (!parsed.sessionId || !Array.isArray(parsed.entries)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Persist checkpoint after a bug-fix session ends. */
export async function writeBugFixCheckpoint(
  outputDir: string,
  sessionId: string,
  entries: BugFixCheckpointEntry[],
  totalCostUsd?: number,
  startedAt?: string,
): Promise<void> {
  const now = new Date().toISOString();
  const checkpoint: BugFixCheckpoint = {
    sessionId,
    startedAt: startedAt ?? now,
    savedAt: now,
    entries,
    ...(totalCostUsd !== undefined && totalCostUsd > 0 ? { totalCostUsd } : {}),
  };
  try {
    await fs.mkdir(path.join(outputDir, ".blueprint"), { recursive: true });
    await fs.writeFile(
      checkpointPath(outputDir),
      JSON.stringify(checkpoint, null, 2) + "\n",
      "utf-8",
    );
    const fixed  = entries.filter((e) => e.status === "fixed").length;
    const failed = entries.filter((e) => e.status === "failed").length;
    console.log(`[BugFixCheckpoint] Saved session ${sessionId}: ${fixed} fixed, ${failed} failed.`);
  } catch (err) {
    console.warn("[BugFixCheckpoint] Failed to write (ignored):", err instanceof Error ? err.message : err);
  }
}
