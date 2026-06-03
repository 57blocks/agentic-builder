/**
 * Centralized model assignment for every pipeline step and agent role.
 *
 * Each key maps to either:
 *   - A single model alias / raw OpenRouter model ID (string)
 *   - An ordered fallback chain (string[]) — first model tried; on failure, next, etc.
 *
 * Available aliases (see src/lib/openrouter.ts → MODELS):
 *   "gpt-5.4"            → gpt-5.4-2026-03-05  (ByteDance gateway)
 *   "gpt-4o"             → openai/gpt-4o
 *   "gpt-4o-mini"        → openai/gpt-4o-mini
 *   "claude-sonnet"      → anthropic/claude-sonnet-4
 *   "claude-opus"        → anthropic/claude-opus-4
 *   "gemini-pro"         → google/gemini-2.5-pro
 *   "gemini-flash"       → google/gemini-2.0-flash-exp:free  (free)
 *
 * Provider routing:
 *   - Default: use DeepSeek direct provider via DEEPSEEK_API_KEY.
 *   - Set LLM_PROVIDER=openrouter or USE_OPENROUTER=1 to keep using OpenRouter.
 */

const DEEPSEEK_DIRECT_MODEL = "deepseek-v4-pro";
const DEEPSEEK_DIRECT_CHAIN = [DEEPSEEK_DIRECT_MODEL] as const;

// Direct connection first, then OpenRouter as fallback for fix/verify phases
const DEEPSEEK_CODEGEN_CHAIN = [
  "openai/gpt-5.3-codex",
  DEEPSEEK_DIRECT_MODEL,
  "qwen/qwen3.6-plus",
  "deepseek/deepseek-v3.2",
  "moonshotai/kimi-k2.6",
  "claude-sonnet",
] as const;

const DEEPSEEK_CODEFX_CHAIN = [
  DEEPSEEK_DIRECT_MODEL,
  "openai/gpt-5.3-codex",
  "claude-sonnet-4",
  "qwen/qwen3.6-plus",
  "claude-sonnet",
  "deepseek/deepseek-v3.2",
] as const;

const DEEPSEEK_VERIFYFX_CHAIN = [
  DEEPSEEK_DIRECT_MODEL,
  "openai/gpt-5.3-codex",
  "claude-sonnet-4",
  "qwen/qwen3.6-plus",
  "deepseek/deepseek-v3.2",
] as const;

const OPENROUTER_MODEL_CONFIG = {
  // ── Preparation phase ──────────────────────────────────────────────────────

  intent: "deepseek/deepseek-v4-flash",
  /** Skill trigger evaluator. Tiny classification task (YES <quote> | NO)
   *  on a 12 KB haystack. Reliability matters more than depth — flash
   *  models occasionally return empty content and tank the eval; mini
   *  models can miss edge cases. gpt-5.4-mini is the sweet spot. */
  skillTrigger: "openai/gpt-5.4-mini",
  prd: "deepseek/deepseek-v4-pro",
  prdInteractionImage: "alibaba/wan-2.6",
  prdSpecExtract: "openai/gpt-5.4",
  prdRefine: "openai/gpt-5.4",
  trd: "openai/gpt-5.4-mini",
  /** TRD reviewer — INTENTIONALLY DIFFERENT model from `trd` writer so the
   *  reviewer can catch hallucinations the writer wouldn't self-detect.
   *  Defaults to Claude Sonnet; override via env if a stronger model is
   *  preferred. */
  trdReviewer: "claude-sonnet-4",
  /** PRD reviewer (Layer 2 quality gate) — INTENTIONALLY different from the PRD
   *  writer (`prd` / `prdSpecExtract`) so it doesn't share the author's blind
   *  spots. Cross-vendor (Claude) judge of PRD buildability/completeness. */
  prdReviewer: "claude-sonnet-4",
  sysdesign: "gpt-4o",
  implguide: "gpt-4o",
  design: "openai/gpt-5.4",
  pencil: "openai/gpt-5.4",
  pencilToolUse: "openai/gpt-5.4",
  mockup: "gpt-4o-mini",
  qa: "gpt-4o-mini",
  verify: "gpt-4o-mini",

  // ── Kick-off phase ─────────────────────────────────────────────────────────

  // claude-sonnet-4 supports 64K output tokens — much less likely to truncate large task lists.
  taskBreakdown: ["claude-sonnet-4", "openai/gpt-5.4"] as string[],
  taskBreakdownReview: ["openai/gpt-5.4", "claude-sonnet-4"] as string[],

  /** Infra spec generation — small JSON task. A cheap model is fine. */
  infra: "openai/gpt-5.4-mini",

  /** Service detection — tiny classification task on TRD/SysDesign. */
  serviceDetect: "openai/gpt-5.4-mini",

  // ── Coding phase ───────────────────────────────────────────────────────────

  /** Code generation (backend/architect): keep DeepSeek as primary. */
  codeGen: [
    "deepseek/deepseek-v4-pro",
    "openai/gpt-5.3-codex",
    "qwen/qwen3.6-plus",
    "deepseek/deepseek-v3.2",
    "moonshotai/kimi-k2.6",
    "claude-sonnet",
  ] as string[],

  /** Code generation (frontend only): prefer gpt-5.3-codex for better UI fidelity. */
  codeGenFrontend: [
    "openai/gpt-5.3-codex",
    "deepseek/deepseek-v4-pro",
    "qwen/qwen3.6-plus",
    "deepseek/deepseek-v3.2",
    "moonshotai/kimi-k2.6",
    "claude-sonnet",
  ] as string[],

  /** Error-fix pass: cheaper models suffice for targeted tsc/build fixes. */
  codeFix: [
    "deepseek/deepseek-v4-pro",
    "openai/gpt-5.3-codex",
    "claude-sonnet-4",
    "qwen/qwen3.6-plus",
    "claude-sonnet",
    "deepseek/deepseek-v3.2",
  ] as string[],

  /**
   * Phase verify+fix agentic loop (merged).
   * Needs strong tool-use / function-calling capability.
   */
  phaseVerifyFix: [
    "deepseek/deepseek-v4-pro",
    "openai/gpt-5.3-codex",
    "claude-sonnet-4",
    "qwen/qwen3.6-plus",
    "deepseek/deepseek-v3.2",
    "gpt-4o",
  ] as string[],

  /**
   * E2E coverage generation / repair.
   * Prefer stronger first model because this step must align test cases to PRD.
   */
  e2eGen: [
    "openai/gpt-5.3-codex",
    "claude-sonnet-4",
    "openai/gpt-5.4",
    "openai/gpt-5.3-codex",
  ] as string[],
} as const;

export const DEEPSEEK_MODEL_CONFIG = {
  intent: DEEPSEEK_DIRECT_MODEL,
  skillTrigger: DEEPSEEK_DIRECT_MODEL,
  prd: DEEPSEEK_DIRECT_MODEL,
  prdInteractionImage: DEEPSEEK_DIRECT_MODEL,
  prdSpecExtract: DEEPSEEK_DIRECT_MODEL,
  prdRefine: DEEPSEEK_DIRECT_MODEL,
  trd: DEEPSEEK_DIRECT_MODEL,
  // Reviewer intentionally uses a non-DeepSeek model — cross-vendor review.
  // Falls back to DEEPSEEK_DIRECT_MODEL if `claude-sonnet-4` is unreachable.
  trdReviewer: "claude-sonnet-4",
  // PRD reviewer — cross-vendor (non-DeepSeek) judge, like trdReviewer.
  prdReviewer: "claude-sonnet-4",
  sysdesign: DEEPSEEK_DIRECT_MODEL,
  implguide: DEEPSEEK_DIRECT_MODEL,
  design: DEEPSEEK_DIRECT_MODEL,
  pencil: DEEPSEEK_DIRECT_MODEL,
  pencilToolUse: DEEPSEEK_DIRECT_MODEL,
  mockup: DEEPSEEK_DIRECT_MODEL,
  qa: DEEPSEEK_DIRECT_MODEL,
  verify: DEEPSEEK_DIRECT_MODEL,
  taskBreakdown: DEEPSEEK_DIRECT_CHAIN,
  taskBreakdownReview: DEEPSEEK_DIRECT_CHAIN,
  infra: DEEPSEEK_DIRECT_MODEL,
  serviceDetect: DEEPSEEK_DIRECT_MODEL,
  codeGen: DEEPSEEK_DIRECT_CHAIN,
  codeGenFrontend: DEEPSEEK_CODEGEN_CHAIN,
  codeFix: DEEPSEEK_CODEFX_CHAIN,
  phaseVerifyFix: DEEPSEEK_VERIFYFX_CHAIN,
  e2eGen: DEEPSEEK_DIRECT_CHAIN,
} as const satisfies Record<
  keyof typeof OPENROUTER_MODEL_CONFIG,
  string | readonly string[]
>;

export { OPENROUTER_MODEL_CONFIG };

function isTruthyEnvFlag(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return (
    normalized === "1" ||
    normalized === "true" ||
    normalized === "yes" ||
    normalized === "on"
  );
}

function shouldUseOpenRouterModelConfig(): boolean {
  const env =
    typeof process !== "undefined"
      ? (process.env as Record<string, string | undefined>)
      : {};
  const provider = env.LLM_PROVIDER?.trim().toLowerCase();
  return (
    provider === "openrouter" ||
    isTruthyEnvFlag(env.USE_OPENROUTER) ||
    isTruthyEnvFlag(env.FORCE_OPENROUTER)
  );
}

export const MODEL_CONFIG = shouldUseOpenRouterModelConfig()
  ? OPENROUTER_MODEL_CONFIG
  : DEEPSEEK_MODEL_CONFIG;

export type ModelConfigKey = keyof typeof MODEL_CONFIG;

/**
 * Normalize a MODEL_CONFIG value (string or string[]) to an ordered chain of resolved IDs.
 * Always returns at least one element.
 */
export function resolveModelChain(
  configValue: string | readonly string[],
  resolver: (alias: string) => string,
): string[] {
  const raw = Array.isArray(configValue) ? configValue : [configValue];
  return raw.map(resolver);
}

/**
 * Get the primary (first) model from a config value.
 * Convenience wrapper for contexts that only need a single model.
 */
export function primaryModel(configValue: string | readonly string[]): string {
  if (typeof configValue === "string") return configValue;
  return (configValue as readonly string[])[0] ?? "gpt-4o";
}
