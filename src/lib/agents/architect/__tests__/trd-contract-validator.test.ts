import { describe, expect, it } from "vitest";

import { validateTrdContracts } from "../trd-contract-validator";

describe("validateTrdContracts", () => {
  it("requires worker boot wiring when jobs are described", () => {
    const result = validateTrdContracts(
      "The backend has an ingestion worker and scoring worker with scheduled jobs.",
    );

    expect(result.ok).toBe(false);
    expect(result.warnings.map((w) => w.code)).toContain(
      "missing-runtime-boot-contract",
    );
  });

  it("passes a TRD with runtime, env, seed, source health, and auth contracts", () => {
    const result = validateTrdContracts(`
      Runtime Boot Contract: backend/src/server.ts must start every exported start*Worker function.
      Environment Variables Contract: COINGECKO_API_KEY, QUOTIENT_API_KEY, X_BEARER_TOKEN,
      JINA_API_KEY, LLM_PROVIDER, LLM_API_KEY, LLM_BASE_URL, LLM_MODEL, SMTP_HOST,
      SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM.
      CoinGecko, Quotient, X/Twitter, Jina, LLM classification, and SMTP are used.
      Seed/demo/fallback data must not mark source health healthy or set a success timestamp.
      source_feeds and ingestion_runs distinguish not configured, stale, failed, demo, healthy.
      Auth uses username/password RBAC from .blueprint/auth-decision.json Phase 0.
    `);

    expect(result.ok).toBe(true);
    expect(result.requiredEnvKeys).toEqual(
      expect.arrayContaining([
        "COINGECKO_API_KEY",
        "QUOTIENT_API_KEY",
        "X_BEARER_TOKEN",
        "JINA_API_KEY",
        "LLM_PROVIDER",
        "SMTP_HOST",
      ]),
    );
  });

  it("flags missing literal env keys for mentioned providers", () => {
    const result = validateTrdContracts(
      "CoinGecko market data and Jina article extraction feed the ingestion pipeline.",
    );

    expect(result.warnings.map((w) => w.code)).toContain("missing-env-contract-key");
    expect(result.requiredEnvKeys).toEqual(
      expect.arrayContaining(["COINGECKO_API_KEY", "JINA_API_KEY"]),
    );
  });
});

