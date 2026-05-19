/**
 * Contract-coverage self-heal (B 方案).
 *
 * `runContractCoverageGate` (in pipeline/gates) identifies endpoints declared
 * in `API_CONTRACTS.json` that no kick-off task references. Without remedy,
 * those endpoints are silently skipped by coding agents because the task
 * list is the only thing driving worker codegen.
 *
 * This module is a thin wrapper around `repairTaskCoverage` (which exists
 * for the PRD-id coverage case): the missing-id list is just a `string[]`
 * passed straight to `TaskBreakdownAgent.generateSupplementaryTasks`, and
 * the agent is flexible enough to interpret `"POST /api/v1/auth/refresh"`
 * as "endpoint to implement" rather than "PRD requirement id". After
 * `repairTaskCoverage` merges the new tasks, we re-run the contract gate
 * against the merged list to confirm the LLM actually wrote task TEXT
 * referencing the endpoints (regex-based, independent of the LLM's
 * `coversRequirementIds` self-report — important because the LLM tends to
 * mechanically copy the missing-id back into coversRequirementIds without
 * always producing useful task content).
 *
 * What stays in scope here:
 *   • Bounded retry loop is delegated to `repairTaskCoverage` (already
 *     has circuit breaker + attempt tracker + dep inference + collision
 *     handling).
 *   • Pre/post gate snapshots get their own `preflight-task-contract-coverage`
 *     stage so the session report can distinguish PRD-id repair from
 *     contract repair.
 */

import type { KickoffWorkItem } from "@/lib/pipeline/types";
import type { ProjectTier } from "@/lib/agents";
import { runContractCoverageGate } from "@/lib/pipeline/gates";
import type { ContractEntryLike } from "@/lib/pipeline/gates";
import { repairTaskCoverage } from "./task-coverage-repair";
import type { RepairEmitter } from "./events";
import type { AttemptTracker } from "./attempt-tracker";

export interface ContractCoverageRepairInput {
  /** Contract entries (typically the parsed contents of API_CONTRACTS.json). */
  contracts: ContractEntryLike[];
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

export interface ContractCoverageRepairResult {
  /** Tasks after repair (existing + any newly added supplementary tasks). */
  tasks: KickoffWorkItem[];
  /** Tasks added during repair. */
  added: KickoffWorkItem[];
  /** Endpoints still uncovered after repair (text-match basis). */
  finalMissingEndpoints: string[];
  attempts: number;
  costUsd: number;
  durationMs: number;
  circuitOpen?: boolean;
}

export async function repairContractCoverage(
  input: ContractCoverageRepairInput,
): Promise<ContractCoverageRepairResult> {
  const {
    contracts,
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

  // ── 1. Identify uncovered endpoints (regex-on-task-text) ────────────────
  const initialGate = runContractCoverageGate(contracts, existingTasks);
  const missingEndpoints = initialGate.missingIds;

  if (missingEndpoints.length === 0) {
    return {
      tasks: existingTasks,
      added: [],
      finalMissingEndpoints: [],
      attempts: 0,
      costUsd: 0,
      durationMs: 0,
    };
  }

  emitter({
    stage: "preflight-task-contract-coverage",
    event: "repair_start",
    missingIds: missingEndpoints,
    details: {
      existingTaskCount: existingTasks.length,
      contractTotal: contracts.length,
    },
  });

  // ── 2. Hand off to the shared supplementary-task loop ───────────────────
  // The agent treats `missingIds` opaquely; passing endpoint strings yields
  // tasks like "Implement POST /api/v1/auth/refresh" because the LLM reads
  // the missing-list and the User-message body verbatim names them.
  const sharedResult = await repairTaskCoverage({
    missingIds: missingEndpoints,
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

  // ── 3. Re-evaluate coverage with the contract gate on the MERGED list ───
  // Don't trust `coversRequirementIds` self-reporting — the LLM may
  // mechanically echo the endpoint string back without writing useful
  // task TEXT about implementing it. The gate's regex scan is the ground
  // truth.
  const finalGate = runContractCoverageGate(contracts, sharedResult.tasks);

  emitter({
    stage: "preflight-task-contract-coverage",
    event: "repair_done",
    repairedIds: missingEndpoints.filter(
      (e: string) => !finalGate.missingIds.includes(e),
    ),
    stillMissing: finalGate.missingIds,
    details: {
      addedTotal: sharedResult.added.length,
      attempts: sharedResult.attempts,
      costUsd: sharedResult.costUsd,
      circuitOpen: sharedResult.circuitOpen ?? false,
    },
  });

  return {
    tasks: sharedResult.tasks,
    added: sharedResult.added,
    finalMissingEndpoints: finalGate.missingIds,
    attempts: sharedResult.attempts,
    costUsd: sharedResult.costUsd,
    durationMs: sharedResult.durationMs,
    circuitOpen: sharedResult.circuitOpen,
  };
}
