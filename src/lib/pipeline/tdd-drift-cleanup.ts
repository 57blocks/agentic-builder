/**
 * Detects and removes stale TDD test files left over from a previous
 * task-breakdown / manifest revision.
 *
 * The failure mode this guards against (observed in session 1f29caa5,
 * 2026-05-19): the manifest declared `TDD-T-003-001` at
 * `backend/src/api/modules/auth/auth.routes.test.ts`, but the actual
 * file on disk had `TDD-T-025-001` in its header from a previous
 * 25-test manifest. The Test Writer skipped it (file exists ⇒ "already
 * written"), and the runtime executor kept running an obsolete test
 * against incompatible target files — guaranteeing GREEN failure.
 *
 * After pruning, the next Test Writer pass will recreate the file with
 * the current manifest's `testId` + `coversRequirementIds`.
 */
import fs from "fs/promises";
import path from "path";
import type { CodingTask } from "@/lib/pipeline/types";

export interface PruneDriftedTddResult {
  scanned: number;
  removed: string[];
  reasons: Record<string, string>;
}

const HEADER_SCAN_BYTES = 1024;
const TEST_ID_RE = /TDD-T-[A-Za-z0-9_-]+/g;

function expectedTestIdsForFile(
  tasks: CodingTask[],
  file: string,
): Set<string> {
  const ids = new Set<string>();
  for (const task of tasks) {
    for (const test of task.tddPlan?.tests ?? []) {
      if (test.file === file) ids.add(test.id);
    }
  }
  return ids;
}

function collectManifestFiles(tasks: CodingTask[]): string[] {
  const files = new Set<string>();
  for (const task of tasks) {
    for (const test of task.tddPlan?.tests ?? []) {
      if (test.file) files.add(test.file);
    }
  }
  return [...files];
}

async function readHeader(absPath: string): Promise<string> {
  const handle = await fs.open(absPath, "r");
  try {
    const buf = Buffer.alloc(HEADER_SCAN_BYTES);
    const { bytesRead } = await handle.read(buf, 0, HEADER_SCAN_BYTES, 0);
    return buf.slice(0, bytesRead).toString("utf-8");
  } finally {
    await handle.close();
  }
}

export async function pruneDriftedTddTests(
  outputDir: string,
  tasks: CodingTask[],
): Promise<PruneDriftedTddResult> {
  const manifestFiles = collectManifestFiles(tasks);
  const removed: string[] = [];
  const reasons: Record<string, string> = {};
  let scanned = 0;

  for (const relPath of manifestFiles) {
    const absPath = path.resolve(outputDir, relPath);
    let header: string;
    try {
      header = await readHeader(absPath);
    } catch {
      // File doesn't exist yet — Test Writer will create it. No drift.
      continue;
    }
    scanned += 1;
    const found = new Set(header.match(TEST_ID_RE) ?? []);
    if (found.size === 0) {
      // No id marker at all — leave it alone; Test Writer will overwrite
      // or static reviewer will flag missing requirement-id citation.
      continue;
    }
    const expected = expectedTestIdsForFile(tasks, relPath);
    const ok = [...found].some((id) => expected.has(id));
    if (!ok) {
      try {
        await fs.unlink(absPath);
        removed.push(relPath);
        reasons[relPath] = `header cites ${[...found].join(",")} but manifest expects ${[...expected].join(",") || "(none)"}`;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        reasons[relPath] = `unlink failed: ${msg}`;
      }
    }
  }

  return { scanned, removed, reasons };
}
