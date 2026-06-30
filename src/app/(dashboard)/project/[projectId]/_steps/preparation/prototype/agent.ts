// src/app/(dashboard)/project/[projectId]/_steps/preparation/prototype/agent.ts
// Step: Prototype — generation + preview are interactive in the UI. The agent
// is a non-blocking no-op (like serve) so an un-run prototype never blocks
// preparation → kickoff.
import type { StepAgent, StepAgentContext, StepResultData, SseEvent, StepAgentState } from "../../_shared/types";

export const prototypeAgent: StepAgent = {
  async execute(_ctx: StepAgentContext): Promise<StepResultData> {
    return { stepId: "prototype", status: "completed", timestamp: new Date().toISOString() };
  },
  handleEvent(_event: SseEvent, _ctx: StepAgentContext): Partial<StepAgentState> { return {}; },
  async retry(_ctx: StepAgentContext): Promise<StepResultData> {
    return { stepId: "prototype", status: "completed", timestamp: new Date().toISOString() };
  },
};
