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
