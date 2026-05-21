/**
 * Central coding-stage model selection by user-selected mode.
 */
import { MODEL_CONFIG } from "@/lib/model-config";
import type { CodingMode } from "./coding-mode";

export type CodingModelVariant =
  | "codeGen"
  | "codeGenFrontend"
  | "codeFix"
  | "phaseVerifyFix"
  | "e2eGen"
  | "taskBreakdown";

const FAST_CHAINS: Record<CodingModelVariant, string[]> = {
  codeGen: [
    "openai/gpt-5.4",
    "anthropic/claude-sonnet-4",
    "openai/gpt-5.3-codex",
  ],
  codeGenFrontend: [
    "openai/gpt-5.4",
    "openai/gpt-5.3-codex",
    "anthropic/claude-sonnet-4",
  ],
  codeFix: [
    "anthropic/claude-sonnet-4",
    "openai/gpt-5.4",
    "openai/gpt-5.3-codex",
  ],
  phaseVerifyFix: [
    "anthropic/claude-sonnet-4",
    "openai/gpt-5.4",
    "openai/gpt-5.3-codex",
  ],
  e2eGen: [
    "openai/gpt-5.4",
    "anthropic/claude-sonnet-4",
    "openai/gpt-5.3-codex",
  ],
  taskBreakdown: [
    "openai/gpt-5.4",
    "anthropic/claude-sonnet-4",
    "openai/gpt-5.3-codex",
  ],
};

const NORMAL_CHAINS: Record<CodingModelVariant, string[]> = {
  codeGen: [
    "openai/gpt-5.3-codex",
    "anthropic/claude-sonnet-4",
    "qwen/qwen3.6-plus",
  ],
  codeGenFrontend: [
    "openai/gpt-5.3-codex",
    "anthropic/claude-sonnet-4",
    "qwen/qwen3.6-plus",
  ],
  codeFix: [
    "openai/gpt-5.3-codex",
    "anthropic/claude-sonnet-4",
    "qwen/qwen3.6-plus",
  ],
  phaseVerifyFix: [
    "openai/gpt-5.3-codex",
    "anthropic/claude-sonnet-4",
    "qwen/qwen3.6-plus",
  ],
  e2eGen: [
    "openai/gpt-5.3-codex",
    "anthropic/claude-sonnet-4",
    "openai/gpt-5.4",
  ],
  taskBreakdown: [
    "openai/gpt-5.3-codex",
    "anthropic/claude-sonnet-4",
    "openai/gpt-5.4",
  ],
};

export function resolveCodingModelConfigValue(
  mode: CodingMode,
  variant: CodingModelVariant,
): string | readonly string[] {
  if (mode === "fast") return FAST_CHAINS[variant];
  if (mode === "normal") return NORMAL_CHAINS[variant];
  return MODEL_CONFIG[variant] ?? "gpt-4o";
}

/**
 * Fast/normal should stick to OpenRouter model chains instead of being
 * silently rerouted to direct DeepSeek provider.
 */
export function shouldForceOpenRouterForCodingMode(mode: CodingMode): boolean {
  return mode === "fast" || mode === "normal";
}
