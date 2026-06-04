// Step: TRD — Technical Requirements Document
// Category: doc-viewer
import { createParallelGenerateAgent } from "../../../_shared/pipeline-sse-helpers";
import type { StepAgent } from "../../../_shared/types";
import type { PrdSpec } from "@/lib/requirements/prd-spec-types";

export const trdAgent: StepAgent = createParallelGenerateAgent({
  stepId: "trd",
  docId: "trd",
  buildPayload: (ctx) => ({
    prdContent: ctx.previousSteps.prd?.content ?? ctx.featureBrief,
    selectedDocs: ["trd"],
    sessionId: ctx.sessionId,
    codeOutputDir: ctx.codeOutputDir,
    tier: ctx.tier,
    instruction: ctx.editInstruction,
    // Forward the structured PRD spec (domain rules / entities / workflows)
    // extracted at PRD time, so a standalone TRD re-run actually uses the
    // produced domain — not just the PRD prose.
    prdSpec:
      (ctx.previousSteps.prd?.metadata as { prdSpec?: PrdSpec } | undefined)
        ?.prdSpec ?? null,
  }),
});
