import type { OpenRouterOptions } from "@/lib/openrouter";
import type { ScopedValidationKind } from "./scoped-validation";

export function isMutatingSupervisorBashCommand(command: string): boolean {
  const normalized = command.replace(/\s+/g, " ").trim().toLowerCase();
  return (
    /\b(pnpm|npm|yarn)\s+(install|add|remove|unlink|update)\b/.test(
      normalized,
    ) ||
    /\b(npx\s+)?prisma\s+generate\b/.test(normalized) ||
    /\bmkdir\b|\btouch\b|\bcp\b|\bmv\b|\bsed\s+-i\b|\bperl\s+-pi\b/.test(
      normalized,
    )
  );
}

export function detectScopedValidationKind(
  command: string,
): ScopedValidationKind | null {
  return detectScopedValidationKinds(command)[0] ?? null;
}

export function detectScopedValidationKinds(
  command: string,
): ScopedValidationKind[] {
  const normalized = command.replace(/\s+/g, " ").trim().toLowerCase();
  const touchesFrontend =
    normalized.includes("cd frontend") ||
    normalized.includes("/frontend") ||
    normalized.includes(" frontend/");
  const touchesBackend =
    normalized.includes("cd backend") ||
    normalized.includes("/backend") ||
    normalized.includes(" backend/");

  const kinds: ScopedValidationKind[] = [];
  if (touchesFrontend && /\b(tsc|npx tsc)\b/.test(normalized)) {
    kinds.push("frontend_tsc");
  }
  if (
    touchesFrontend &&
    /\b(pnpm|npm|yarn)\s+(run\s+)?build\b/.test(normalized)
  ) {
    kinds.push("frontend_build");
  }
  if (touchesBackend && /\b(tsc|npx tsc)\b/.test(normalized)) {
    kinds.push("backend_tsc");
  }
  if (
    touchesBackend &&
    (normalized.includes("createapp export missing") ||
      normalized.includes("backend_smoke_ok") ||
      normalized.includes("tsx --eval"))
  ) {
    kinds.push("backend_smoke");
  }
  return [...new Set(kinds)];
}

export function isValidationLikeBashCommand(command: string): boolean {
  const normalized = command.replace(/\s+/g, " ").trim().toLowerCase();
  return (
    /\b(tsc|npx tsc)\b/.test(normalized) ||
    /\b(pnpm|npm|yarn)\s+(run\s+)?build\b/.test(normalized) ||
    normalized.includes("tsx --eval")
  );
}

export function buildIntegrationReasoningOptions(): Pick<
  OpenRouterOptions,
  "reasoning" | "thinking"
> {
  const enabled =
    (
      process.env.INTEGRATION_VERIFYFIX_ENABLE_REASONING ?? "true"
    ).toLowerCase() !== "false";
  if (!enabled) {
    return {};
  }

  const effortRaw =
    process.env.INTEGRATION_VERIFYFIX_REASONING_EFFORT?.trim().toLowerCase() ??
    "medium";
  const effort =
    effortRaw === "low" || effortRaw === "high" ? effortRaw : "medium";

  const verbosityRaw =
    process.env.INTEGRATION_VERIFYFIX_THINKING_VERBOSITY?.trim().toLowerCase() ??
    "medium";
  const verbosity =
    verbosityRaw === "low" || verbosityRaw === "high" ? verbosityRaw : "medium";

  return {
    reasoning: {
      enabled: true,
      effort,
    },
    thinking: {
      thinking_effort: effort,
      verbosity,
    },
  };
}
