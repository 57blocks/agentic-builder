import { recordCodingSessionLlmUsage } from "@/lib/pipeline/coding-session-report";

/**
 * Helpers for normalising and recording OpenRouter LLM usage emitted by the
 * supervisor itself (NOT worker sub-graphs). Worker usage is tracked inside
 * agent-subgraph.
 */

export function getOpenRouterUsageCounts(usage: unknown): {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
} {
  const raw = usage as
    | {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
        promptTokens?: number;
        completionTokens?: number;
        totalTokens?: number;
      }
    | undefined;
  const promptTokens = raw?.prompt_tokens ?? raw?.promptTokens ?? 0;
  const completionTokens = raw?.completion_tokens ?? raw?.completionTokens ?? 0;
  const totalTokens =
    raw?.total_tokens ?? raw?.totalTokens ?? promptTokens + completionTokens;
  return { promptTokens, completionTokens, totalTokens };
}

export function recordSupervisorLlmUsage(args: {
  sessionId: string;
  stage: string;
  label?: string;
  model: string;
  usage: unknown;
  costUsd: number;
}): void {
  const usageCounts = getOpenRouterUsageCounts(args.usage);
  recordCodingSessionLlmUsage({
    sessionId: args.sessionId,
    stage: args.stage,
    label: args.label,
    model: args.model,
    costUsd: args.costUsd,
    promptTokens: usageCounts.promptTokens,
    completionTokens: usageCounts.completionTokens,
    totalTokens: usageCounts.totalTokens,
  });
}
