import { describe, expect, it } from "vitest";

import { augmentResourceRequirementsFromDocuments } from "../resource-requirement-augment";
import type { ResourceRequirement } from "@/lib/pipeline/resource-requirements";

describe("augmentResourceRequirementsFromDocuments", () => {
  it("adds real-data provider keys from TRD source contracts", () => {
    const result = augmentResourceRequirementsFromDocuments([], [
      [
        "CoinGecko powers market data.",
        "Quotient powers reserve attestations.",
        "X/Twitter powers social sentiment.",
        "Jina extracts news articles.",
        "LLM classification labels article sentiment.",
      ].join("\n"),
    ]);

    expect(result.map((item) => item.envKey)).toEqual(
      expect.arrayContaining([
        "COINGECKO_API_KEY",
        "QUOTIENT_API_KEY",
        "X_BEARER_TOKEN",
        "JINA_API_KEY",
        "LLM_PROVIDER",
        "LLM_API_KEY",
        "LLM_BASE_URL",
        "LLM_MODEL",
      ]),
    );
  });

  it("preserves detected items and deduplicates generated env keys", () => {
    const detected: ResourceRequirement[] = [
      {
        envKey: "COINGECKO_API_KEY",
        label: "Existing CoinGecko Key",
        description: "Existing detector output.",
        category: "analytics",
        required: true,
        value: "already-set",
      },
    ];

    const result = augmentResourceRequirementsFromDocuments(detected, [
      "CoinGecko market ingestion needs a real provider key.",
    ]);

    expect(result.filter((item) => item.envKey === "COINGECKO_API_KEY")).toHaveLength(1);
    expect(result[0]?.label).toBe("Existing CoinGecko Key");
    expect(result[0]?.value).toBe("already-set");
  });

  it("adds SMTP and queue config from auth and worker contracts", () => {
    const result = augmentResourceRequirementsFromDocuments([], [
      "Magic Link email uses SMTP. Background worker jobs can use a Redis queue.",
    ]);

    expect(result.map((item) => item.envKey)).toEqual(
      expect.arrayContaining([
        "SMTP_HOST",
        "SMTP_PORT",
        "SMTP_USER",
        "SMTP_PASS",
        "SMTP_FROM",
        "USE_REDIS_QUEUE",
      ]),
    );
    expect(result.find((item) => item.envKey === "USE_REDIS_QUEUE")?.required).toBe(false);
  });
});

