// Step: PRD — Product Requirements Document
// Category: doc-viewer
import { createPipelineSseAgent } from "../../../_shared/pipeline-sse-helpers";
import type { StepAgent } from "../../../_shared/types";
import type { ProjectTier } from "@/_config/pipeline-flow";

export const prdAgent: StepAgent = createPipelineSseAgent({
  stepId: "prd",
  apiEndpoint: "/api/agents/pipeline",
  buildPayload: (ctx) => ({
    featureBrief: ctx.editInstruction
      ? `Original brief:\n${ctx.featureBrief}\n\nCurrent PRD:\n${ctx.previousSteps.prd?.content ?? ""}\n\nEdit request: ${ctx.editInstruction}\n\nPlease generate an updated PRD incorporating the edit request above.`
      : ctx.featureBrief,
    codeOutputDir: ctx.codeOutputDir,
    sessionId: ctx.sessionId,
    pauseAfterPrd: true,
    // Always forward the current PRD so the classifier honors its
    // `**Project Tier: X**` badge — this is how a manual tier override (set in
    // the PRD UI) survives a regenerate instead of being re-classified back.
    ...(ctx.previousSteps.prd?.content
      ? { existingPrd: ctx.previousSteps.prd.content }
      : {}),
    // Edit-only: re-run just the PRD step with an instruction. Downstream is
    // regenerated per-step; task-breakdown's Regenerate runs incrementally.
    ...(ctx.editInstruction
      ? { prdEditInstruction: ctx.editInstruction }
      : {}),
    // Forward user-confirmed clarifications when present and we are not
    // in edit-only mode (edits bypass the intent gate).
    ...(!ctx.editInstruction && ctx.prdIntent
      ? { prdIntent: ctx.prdIntent }
      : {}),
  }),
  onCustomEvent: (event) => {
    // Extract tier from the intent step_complete event that the pipeline emits
    // before the PRD step, so breadcrumb hides S-tier steps immediately.
    if (event.type === "step_complete" && event.stepId === "intent") {
      const data = (event.data ?? event) as Record<string, unknown>;
      const meta = data.metadata as Record<string, unknown> | undefined;
      const classif = meta?.classification as Record<string, unknown> | undefined;
      const rawTier = (classif?.tier ?? meta?.tier) as string | undefined;
      if (rawTier) {
        const tier = rawTier.toUpperCase() as ProjectTier;
        import("@/store/step-navigation-store").then(({ useStepNavigationStore }) => {
          const store = useStepNavigationStore.getState();
          if (store.tier !== tier) {
            store.setTier(tier);
          }
        }).catch(() => {/* ignore */});
      }
      return true;
    }
    return false;
  },
});
