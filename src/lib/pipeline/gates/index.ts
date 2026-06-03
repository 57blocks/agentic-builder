// Pipeline gates — barrel of pre-flight + post-flight invariant checks.
export { runPrdSpecGate } from "./prd-spec-gate";
export type { PrdSpecGateResult } from "./prd-spec-gate";
export { runPrdIdGate, summarizePrdIdGate } from "./prd-id-gate";
export type { PrdIdGateResult } from "./prd-id-gate";
export { backfillPrdIds } from "./prd-id-backfill";
export type { BackfillResult } from "./prd-id-backfill";
export { runQaCoverageGate } from "./qa-coverage-gate";
export { runTaskCoverageGate } from "./task-coverage-gate";
export { runContractCoverageGate } from "./contract-coverage-gate";
export type { ContractEntryLike } from "./contract-coverage-gate";
export { runPageCoverageGate } from "./page-coverage-gate";
export type { PageCoverageGateResult } from "./page-coverage-gate";
export { runPhaseRequirementGate } from "./phase-requirement-gate";
export type { PhaseRequirementGateInput } from "./phase-requirement-gate";
export { runEvidenceGate, makeEvidence } from "./evidence-gate";
export type { EvidenceGateResult } from "./evidence-gate";
export {
  EVIDENCE_POLICIES,
  byKindAndName,
  byCommandPrefix,
} from "./evidence-requirements";
export type {
  EvidenceStage,
  EvidenceRequirement,
  EvidenceStagePolicy,
} from "./evidence-requirements";
export {
  evidenceFromRuntimeSmokeGate,
  evidenceFromTscDiagnostics,
  evidenceFromTddReview,
  evidenceFromPrdSpecGate,
  evidenceFromGateReport,
  evidenceFromRulesValidation,
  evidenceFromDagValidation,
  evidenceFromTrdContractValidation,
} from "./evidence-adapters";
export { collectCodingStageEvidence } from "./coding-stage-evidence";
export type { CollectCodingStageEvidenceResult } from "./coding-stage-evidence";
