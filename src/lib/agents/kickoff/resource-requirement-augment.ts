/**
 * Deterministic resource requirement augmentation. Backstops the LLM detector
 * when TRD contracts mention concrete providers but the JSON output omits keys.
 */

import type {
  ResourceCategory,
  ResourceRequirement,
} from "@/lib/pipeline/resource-requirements";

interface ResourceTemplate {
  envKey: string;
  label: string;
  description: string;
  category: ResourceCategory;
  required: boolean;
  example?: string;
  docsUrl?: string;
  isConfig?: boolean;
}

interface ResourceRule {
  id: string;
  matches: RegExp[];
  templates: ResourceTemplate[];
}

const RULES: ResourceRule[] = [
  {
    id: "coingecko",
    matches: [/\bcoingecko\b/i],
    templates: [
      {
        envKey: "COINGECKO_API_KEY",
        label: "CoinGecko API Key",
        description:
          "Used by market-data ingestion jobs that fetch real token market data from CoinGecko.",
        category: "analytics",
        required: true,
        example: "CG-...",
        docsUrl: "https://www.coingecko.com/en/api/pricing",
      },
    ],
  },
  {
    id: "quotient",
    matches: [/\bquotient\b/i],
    templates: [
      {
        envKey: "QUOTIENT_API_KEY",
        label: "Quotient API Key",
        description:
          "Used by reserve or on-chain ingestion jobs that call Quotient for provider data.",
        category: "analytics",
        required: true,
        example: "qt_...",
      },
    ],
  },
  {
    id: "x-twitter",
    matches: [
      /\bx\/twitter\b/i,
      /\btwitter\b/i,
      /\bx api\b/i,
      /\btweet(s|ing)?\b/i,
      /\bsocial sentiment\b/i,
    ],
    templates: [
      {
        envKey: "X_BEARER_TOKEN",
        label: "X Bearer Token",
        description:
          "Used by social-sentiment ingestion jobs that fetch real X/Twitter data.",
        category: "analytics",
        required: true,
        example: "AAAAAAAA...",
        docsUrl: "https://developer.x.com/en/portal/dashboard",
      },
    ],
  },
  {
    id: "jina",
    matches: [/\bjina\b/i],
    templates: [
      {
        envKey: "JINA_API_KEY",
        label: "Jina API Key",
        description:
          "Used by web/news ingestion jobs that fetch or extract external article content through Jina.",
        category: "ai",
        required: true,
        example: "jina_...",
        docsUrl: "https://jina.ai/",
      },
    ],
  },
  {
    id: "llm",
    matches: [
      /\bllm\b/i,
      /\bgpt\b/i,
      /\bopenai\b/i,
      /\bgemini\b/i,
      /\banthropic\b/i,
      /\bmodel classification\b/i,
      /\bllm classification\b/i,
      /\bsummarisation\b/i,
      /\bsummarization\b/i,
    ],
    templates: [
      {
        envKey: "LLM_PROVIDER",
        label: "LLM Provider",
        description:
          "Selects the provider used by generated LLM features such as classification, extraction, or summarization.",
        category: "ai",
        required: true,
        example: "openrouter",
        isConfig: true,
      },
      {
        envKey: "LLM_API_KEY",
        label: "LLM API Key",
        description:
          "Provider-agnostic secret used by all generated LLM features so the app can switch providers without code changes.",
        category: "ai",
        required: true,
        example: "sk-...",
      },
      {
        envKey: "LLM_BASE_URL",
        label: "LLM Base URL",
        description:
          "Optional OpenAI-compatible base URL for generated LLM adapters and proxy providers.",
        category: "ai",
        required: false,
        example: "https://...",
        isConfig: true,
      },
      {
        envKey: "LLM_MODEL",
        label: "LLM Model",
        description:
          "Default model id used by generated LLM classification, extraction, or summarization code.",
        category: "ai",
        required: true,
        example: "gpt-4o-mini",
        isConfig: true,
      },
    ],
  },
  {
    id: "smtp",
    matches: [
      /\bsmtp\b/i,
      /\bmagic link\b/i,
      /\bemail notification/i,
      /\btransactional email\b/i,
    ],
    templates: [
      {
        envKey: "SMTP_HOST",
        label: "SMTP Host",
        description:
          "Used by generated email flows such as magic links or notification delivery.",
        category: "email",
        required: true,
        example: "smtp.example.com",
        isConfig: true,
      },
      {
        envKey: "SMTP_PORT",
        label: "SMTP Port",
        description:
          "SMTP port used by generated email flows such as magic links or notification delivery.",
        category: "email",
        required: true,
        example: "587",
        isConfig: true,
      },
      {
        envKey: "SMTP_USER",
        label: "SMTP User",
        description:
          "SMTP username used by generated email flows such as magic links or notification delivery.",
        category: "email",
        required: true,
        example: "user@example.com",
      },
      {
        envKey: "SMTP_PASS",
        label: "SMTP Password",
        description:
          "SMTP password used by generated email flows such as magic links or notification delivery.",
        category: "email",
        required: true,
        example: "app-password",
      },
      {
        envKey: "SMTP_FROM",
        label: "SMTP From Address",
        description:
          "Sender address used by generated email flows such as magic links or notification delivery.",
        category: "email",
        required: true,
        example: "noreply@example.com",
        isConfig: true,
      },
    ],
  },
  {
    id: "background-jobs",
    matches: [
      /\bbackground (job|worker|pipeline)s?\b/i,
      /\bscheduled (job|worker|pipeline)s?\b/i,
      /\bingestion worker\b/i,
      /\bscoring worker\b/i,
      /\bqueue-driven\b/i,
      /\bbullmq\b/i,
      /\bredis queue\b/i,
    ],
    templates: [
      {
        envKey: "USE_REDIS_QUEUE",
        label: "Use Redis Queue",
        description:
          "Set to 1 when generated background jobs should use BullMQ and Redis instead of the default in-process queue.",
        category: "queue",
        required: false,
        example: "0",
        isConfig: true,
      },
    ],
  },
];

export function augmentResourceRequirementsFromDocuments(
  detected: ResourceRequirement[],
  documents: Array<string | undefined>,
): ResourceRequirement[] {
  const text = documents.filter(Boolean).join("\n\n");
  if (!text.trim()) return dedupeByEnvKey(detected);

  const additions: ResourceRequirement[] = [];
  for (const rule of RULES) {
    if (!rule.matches.some((pattern) => pattern.test(text))) continue;
    additions.push(...rule.templates.map(toRequirement));
  }

  return dedupeByEnvKey([...detected, ...additions]);
}

function toRequirement(template: ResourceTemplate): ResourceRequirement {
  return {
    ...template,
    value: "",
  };
}

function dedupeByEnvKey(items: ResourceRequirement[]): ResourceRequirement[] {
  const seen = new Set<string>();
  const result: ResourceRequirement[] = [];
  for (const item of items) {
    const envKey = item.envKey.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
    if (!envKey || seen.has(envKey)) continue;
    seen.add(envKey);
    result.push({ ...item, envKey });
  }
  return result;
}

