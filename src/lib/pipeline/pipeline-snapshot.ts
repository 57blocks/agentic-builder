/**
 * Pipeline snapshot persistence.
 *
 * The pipeline/kickoff routes save a snapshot of every step result so the work
 * can be reused. It must land in TWO places:
 *
 *   1. the builder's cwd `.blueprint/` — a single-slot "last run" used by
 *      GET /api/agents/load-pipeline-snapshot for debug reuse, and
 *   2. the generated project's `<codeOutputDir>/.blueprint/` — so the project
 *      directory carries its own snapshot and can later be re-imported with its
 *      PRD / TRD / design / task-breakdown intact (see /api/projects/import).
 *
 * Historically only (1) was written, so imported projects had no snapshot and
 * came in blank. Writing (2) as well is what makes a freshly generated project
 * round-trip through import.
 */

import fs from "fs/promises";
import path from "path";

import type { PipelineStepId, StepResult } from "./types";

export interface PipelineSnapshot {
  savedAt: string;
  featureBrief: string;
  codeOutputDir: string;
  totalCostUsd: number;
  steps: Record<PipelineStepId, StepResult | null>;
}

/**
 * Write the snapshot to the builder cwd and (when set) the generated project
 * directory. Best-effort per target: a failure on one is logged and swallowed so
 * snapshotting never breaks the pipeline.
 */
export async function savePipelineSnapshot(
  snapshot: PipelineSnapshot,
): Promise<void> {
  const targets = new Set<string>([path.resolve(process.cwd(), ".blueprint")]);
  const out = snapshot.codeOutputDir?.trim();
  if (out) targets.add(path.resolve(out, ".blueprint"));

  await Promise.all(
    [...targets].map(async (dir) => {
      try {
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(
          path.join(dir, "pipeline-snapshot.json"),
          JSON.stringify(snapshot, null, 2),
          "utf-8",
        );
      } catch (err) {
        console.warn(
          `[pipeline-snapshot] failed to write ${dir} (ignored):`,
          err instanceof Error ? err.message : err,
        );
      }
    }),
  );
}
