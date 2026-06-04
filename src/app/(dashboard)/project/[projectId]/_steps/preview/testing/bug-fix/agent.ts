import type { StepAgent, StepAgentContext, StepResultData, SseEvent, StepAgentState } from "../../../_shared/types";

export const bugFixAgent: StepAgent = {
  async execute(_ctx: StepAgentContext): Promise<StepResultData> {
    return { stepId: "bug-fix", status: "completed", timestamp: new Date().toISOString() };
  },
  handleEvent(_event: SseEvent, _ctx: StepAgentContext): Partial<StepAgentState> { return {}; },
  async retry(_ctx: StepAgentContext): Promise<StepResultData> {
    return { stepId: "bug-fix", status: "completed", timestamp: new Date().toISOString() };
  },
};
