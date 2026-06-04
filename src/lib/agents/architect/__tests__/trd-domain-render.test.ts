/**
 * Tests for renderAuthoritativeDomainBlock — renders the FULL PRD domain spec
 * (entities / variables / rules / dataSources / schedules / workflows / alerts)
 * into the authoritative block injected into the TRD prompt.
 */

import { describe, expect, it } from "vitest";
import { renderAuthoritativeDomainBlock } from "../trd-agent";
import type { PrdDomainSpec } from "@/lib/requirements/prd-spec-types";

describe("renderAuthoritativeDomainBlock", () => {
  it("returns empty string for empty/undefined domain", () => {
    expect(renderAuthoritativeDomainBlock(undefined)).toBe("");
    expect(renderAuthoritativeDomainBlock(null)).toBe("");
    expect(renderAuthoritativeDomainBlock({})).toBe("");
  });

  it("renders each sub-spec with its TRD-section routing comment + verbatim values", () => {
    const domain: PrdDomainSpec = {
      entities: [
        { type: "stablecoins", instances: [{ symbol: "USDT", peg: 1 }] },
      ],
      variables: [
        { id: "RQ-1", name: "Reserve Quality", description: "x", unit: "%", source: "DS-1", historyWindow: "30d" },
      ],
      dataSources: [
        { id: "DS-1", name: "CoinGecko", kind: "http-rest", baseUrl: "https://api.x", auth: "api-key-header", rateLimit: "30 rpm", freshness: "fresh<5min" },
      ],
      schedules: [
        { id: "SCH-1", description: "refresh", cron: "*/5 * * * *", pipelineId: "P1" },
      ],
      workflows: [
        {
          id: "WF-1",
          entity: "audit",
          initial: "pending",
          states: ["pending", "approved", "rejected"],
          transitions: [
            { from: "pending", to: "approved", action: "approve", requires: ["note"], guard: "isReviewer" },
          ],
          auditTrail: true,
        },
      ],
      alerts: [
        { id: "AL-1", description: "spike", trigger: "delta >= 25", severity: "high", channels: ["email", "push"] },
      ],
      rules: [
        { id: "R-1", name: "Norm", type: "piecewise-linear", inputVariableId: "RQ-1", segments: [{ from: 0, to: 100, outputFrom: 0, outputTo: 5 }] },
      ],
    };

    const out = renderAuthoritativeDomainBlock(domain);

    // Header + authoritative warning.
    expect(out).toContain("PRD-provided domain spec (AUTHORITATIVE)");

    // Each sub-spec present with its routing comment.
    expect(out).toMatch(/entities → §3\.2 Data Models/);
    expect(out).toContain("stablecoins");
    expect(out).toContain("USDT");

    expect(out).toMatch(/variables → §3\.2/);
    expect(out).toContain("RQ-1");
    expect(out).toContain("30d");

    expect(out).toMatch(/dataSources → §3 external adapters/);
    expect(out).toContain("CoinGecko");
    expect(out).toContain("30 rpm");

    expect(out).toMatch(/schedules → §8 Workflow DAG/);
    expect(out).toContain("*/5 * * * *");

    expect(out).toMatch(/workflows → §3 Backend/);
    expect(out).toContain("WF-1");
    expect(out).toContain("requires: [note]");
    expect(out).toContain("auditTrail: true");

    expect(out).toMatch(/alerts → §3 notification service/);
    expect(out).toContain("channels: [email, push]");

    // Rules still flow through the existing renderer (§7).
    expect(out).toContain("PRD-provided domain rules");
    expect(out).toContain("piecewise-linear");
  });

  it("renders only the present sub-specs (rules-only domain still works)", () => {
    const out = renderAuthoritativeDomainBlock({
      rules: [{ id: "R-1", name: "R", type: "other", formula: "x*2" }],
    });
    expect(out).toContain("PRD-provided domain rules");
    expect(out).not.toContain("entities:");
    expect(out).not.toContain("workflows:");
  });

  it("caps entity instances and notes the overflow", () => {
    const instances = Array.from({ length: 30 }, (_, i) => ({ symbol: `C${i}` }));
    const out = renderAuthoritativeDomainBlock({
      entities: [{ type: "coins", instances }],
    });
    expect(out).toMatch(/\+5 more \(seed ALL of them\)/);
  });
});
