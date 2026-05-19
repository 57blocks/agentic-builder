/**
 * TRD contract validator for operational invariants that codegen must see
 * explicitly, especially background workers and real-data source semantics.
 */

export type TrdContractWarningCode =
  | "missing-runtime-boot-contract"
  | "missing-env-contract-key"
  | "missing-seed-data-isolation"
  | "missing-source-health-semantics"
  | "missing-auth-decision-contract";

export interface TrdContractWarning {
  code: TrdContractWarningCode;
  message: string;
}

export interface TrdContractValidation {
  ok: boolean;
  warnings: TrdContractWarning[];
  checkedContracts: string[];
  requiredEnvKeys: string[];
}

const PROVIDER_ENV_KEYS: Array<{ pattern: RegExp; envKeys: string[] }> = [
  { pattern: /\bcoingecko\b/i, envKeys: ["COINGECKO_API_KEY"] },
  { pattern: /\bquotient\b/i, envKeys: ["QUOTIENT_API_KEY"] },
  {
    pattern: /\b(x\/twitter|twitter|x api|tweet(s|ing)?|social sentiment)\b/i,
    envKeys: ["X_BEARER_TOKEN"],
  },
  { pattern: /\bjina\b/i, envKeys: ["JINA_API_KEY"] },
  {
    pattern: /\b(llm|gpt|openai|gemini|anthropic|llm classification)\b/i,
    envKeys: ["LLM_PROVIDER", "LLM_API_KEY", "LLM_BASE_URL", "LLM_MODEL"],
  },
  {
    pattern: /\b(smtp|magic link|email notification|transactional email)\b/i,
    envKeys: ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"],
  },
];

export function validateTrdContracts(markdown: string): TrdContractValidation {
  const warnings: TrdContractWarning[] = [];
  const checkedContracts: string[] = [];
  const requiredEnvKeys = collectRequiredEnvKeys(markdown);

  if (hasRuntimeJobs(markdown)) {
    checkedContracts.push("runtime-boot-contract");
    if (!hasRuntimeBootContract(markdown)) {
      warnings.push({
        code: "missing-runtime-boot-contract",
        message:
          "TRD describes workers/jobs/pipelines but does not explicitly require backend/src/server.ts to start exported start*Worker functions.",
      });
    }
  }

  if (requiredEnvKeys.length > 0) {
    checkedContracts.push("resource-env-contract");
    for (const envKey of requiredEnvKeys) {
      if (!new RegExp(`\\b${escapeRe(envKey)}\\b`).test(markdown)) {
        warnings.push({
          code: "missing-env-contract-key",
          message: `TRD mentions a provider requiring ${envKey}, but the literal env key is missing.`,
        });
      }
    }
  }

  if (hasSourceHealthSurface(markdown)) {
    checkedContracts.push("seed-data-isolation");
    if (!hasSeedIsolationContract(markdown)) {
      warnings.push({
        code: "missing-seed-data-isolation",
        message:
          "TRD exposes source freshness/scoring data but does not forbid seed/demo data from marking external feeds healthy.",
      });
    }

    checkedContracts.push("source-health-semantics");
    if (!hasSourceHealthSemantics(markdown)) {
      warnings.push({
        code: "missing-source-health-semantics",
        message:
          "TRD exposes source health but does not define not-configured/stale/failed/demo/healthy semantics for ingestion outcomes.",
      });
    }
  }

  if (hasAuthSurface(markdown)) {
    checkedContracts.push("auth-decision-contract");
    if (!/\bauth-decision\.json\b/i.test(markdown) && !/\bphase 0\b/i.test(markdown)) {
      warnings.push({
        code: "missing-auth-decision-contract",
        message:
          "TRD specifies authentication but does not bind the auth stack to the persisted auth decision / Phase 0 selection.",
      });
    }
  }

  return {
    ok: warnings.length === 0,
    warnings,
    checkedContracts,
    requiredEnvKeys,
  };
}

function collectRequiredEnvKeys(markdown: string): string[] {
  const keys = new Set<string>();
  for (const item of PROVIDER_ENV_KEYS) {
    if (!item.pattern.test(markdown)) continue;
    item.envKeys.forEach((key) => keys.add(key));
  }
  return Array.from(keys);
}

function hasRuntimeJobs(markdown: string): boolean {
  return /\b(worker|background job|scheduled job|pipeline-dag|ingestion|scoring cycle|queue-driven|cron)\b/i.test(
    markdown,
  );
}

function hasRuntimeBootContract(markdown: string): boolean {
  return /\bbackend\/src\/server\.ts\b/.test(markdown) && /\bstart\*Worker\b/.test(markdown);
}

function hasSourceHealthSurface(markdown: string): boolean {
  return /\b(source_feeds|source health|freshness|ingestion_runs|lastSuccessAt|real data|scoring)\b/i.test(
    markdown,
  );
}

function hasSeedIsolationContract(markdown: string): boolean {
  return /\b(seed|demo|fallback)\b/i.test(markdown) && /\b(healthy|success timestamp|lastSuccessAt|source health)\b/i.test(markdown);
}

function hasSourceHealthSemantics(markdown: string): boolean {
  return ["not configured", "stale", "failed", "demo", "healthy"].every((term) =>
    new RegExp(`\\b${escapeRe(term)}\\b`, "i").test(markdown),
  );
}

function hasAuthSurface(markdown: string): boolean {
  return /\b(auth|rbac|magic link|privy|oidc|username\/password|password)\b/i.test(
    markdown,
  );
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

