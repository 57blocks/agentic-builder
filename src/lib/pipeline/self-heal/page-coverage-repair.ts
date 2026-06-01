/**
 * Page-coverage self-heal.
 *
 * Mirrors the contract-coverage repair pattern: when `runPageCoverageGate`
 * finds PRD pages with no frontend task, this module calls
 * `repairTaskCoverage` with the missing page descriptions as `missingIds`.
 *
 * The descriptions are passed as human-readable strings like
 * "PAGE-001: Dashboard (route: /dashboard)" so the LLM generates a useful
 * task title and file list — not just a bare ID echo.
 */

import type { KickoffWorkItem } from "@/lib/pipeline/types";
import type { ProjectTier } from "@/lib/agents";
import type { PrdPage } from "@/lib/requirements/prd-spec-types";
import { runPageCoverageGate } from "@/lib/pipeline/gates/page-coverage-gate";
import { repairTaskCoverage } from "./task-coverage-repair";
import type { RepairEmitter } from "./events";
import type { AttemptTracker } from "./attempt-tracker";

export interface PageCoverageRepairInput {
  pages: PrdPage[];
  existingTasks: KickoffWorkItem[];
  prd: string;
  trd?: string;
  sysDesign?: string;
  implGuide?: string;
  prdSpecText?: string;
  scaffoldBlock?: string;
  tier: ProjectTier;
  sessionId?: string;
  emitter: RepairEmitter;
  attemptTracker?: AttemptTracker;
}

export interface PageCoverageRepairResult {
  tasks: KickoffWorkItem[];
  added: KickoffWorkItem[];
  finalMissingPageIds: string[];
  attempts: number;
  costUsd: number;
  durationMs: number;
  circuitOpen?: boolean;
}

export async function repairPageCoverage(
  input: PageCoverageRepairInput,
): Promise<PageCoverageRepairResult> {
  const {
    pages,
    existingTasks,
    prd,
    trd,
    sysDesign,
    implGuide,
    prdSpecText,
    scaffoldBlock,
    tier,
    sessionId,
    emitter,
    attemptTracker,
  } = input;

  // ── 1. Check which pages are missing ─────────────────────────────────────
  const initialGate = runPageCoverageGate(pages, existingTasks);

  if (initialGate.passed) {
    return {
      tasks: existingTasks,
      added: [],
      finalMissingPageIds: [],
      attempts: 0,
      costUsd: 0,
      durationMs: 0,
    };
  }

  emitter({
    stage: "preflight-task-contract-coverage",
    event: "repair_start",
    missingIds: initialGate.missingPageDescriptions,
    details: {
      when: "page-coverage-check",
      existingTaskCount: existingTasks.length,
      missingPages: initialGate.missingPageNames,
    },
  });

  // ── 2. Hand off to the shared repair loop ────────────────────────────────
  // Pass human-readable descriptions so the LLM creates meaningful task
  // titles rather than just echoing bare IDs.
  const sharedResult = await repairTaskCoverage({
    missingIds: initialGate.missingPageDescriptions,
    existingTasks,
    prd,
    trd,
    sysDesign,
    implGuide,
    prdSpecText,
    scaffoldBlock,
    tier,
    sessionId,
    emitter,
    attemptTracker,
  });

  // ── 3. Re-evaluate with the gate to verify coverage ──────────────────────
  const finalGate = runPageCoverageGate(pages, sharedResult.tasks);

  emitter({
    stage: "preflight-task-contract-coverage",
    event: "repair_done",
    repairedIds: initialGate.missingPageIds.filter(
      (id) => !finalGate.missingPageIds.includes(id),
    ),
    stillMissing: finalGate.missingPageDescriptions,
    details: {
      when: "page-coverage-check",
      addedTotal: sharedResult.added.length,
      attempts: sharedResult.attempts,
      costUsd: sharedResult.costUsd,
      circuitOpen: sharedResult.circuitOpen ?? false,
    },
  });

  return {
    tasks: sharedResult.tasks,
    added: sharedResult.added,
    finalMissingPageIds: finalGate.missingPageIds,
    attempts: sharedResult.attempts,
    costUsd: sharedResult.costUsd,
    durationMs: sharedResult.durationMs,
    circuitOpen: sharedResult.circuitOpen,
  };
}
