/**
 * Tests for renderScaffoldFoundationBlock — tells the TRD architect what the
 * per-tier scaffold already provides so it doesn't re-specify / duplicate it.
 */

import { describe, expect, it } from "vitest";
import { renderScaffoldFoundationBlock } from "../trd-scaffold-block";

describe("renderScaffoldFoundationBlock", () => {
  it("always emits the do-not-re-specify instruction", () => {
    for (const tier of ["S", "M", "L"] as const) {
      const out = renderScaffoldFoundationBlock(tier);
      expect(out).toContain(`Scaffold foundation — Tier ${tier}`);
      expect(out).toMatch(/do NOT re-specify/i);
      expect(out).toMatch(/NEVER introduce a parallel/i);
    }
  });

  it("S-tier: frontend-only, explicitly no backend", () => {
    const out = renderScaffoldFoundationBlock("S");
    expect(out).toMatch(/NO backend in the S-tier scaffold/i);
    expect(out).not.toContain("Koa");
  });

  it("M-tier: ships canonical frontend client + backend utils, no L-only layers", () => {
    const out = renderScaffoldFoundationBlock("M");
    expect(out).toContain("frontend/src/api/client.ts");
    expect(out).toContain("backend/src/utils/jwt.ts");
    expect(out).toContain("docker-compose.yml");
    expect(out).not.toContain("inProcessQueue"); // L-only
    expect(out).not.toContain("pino");
  });

  it("L-tier: M base + production layers (logger / queue / rate-limit)", () => {
    const out = renderScaffoldFoundationBlock("L");
    expect(out).toContain("frontend/src/api/client.ts"); // M base present
    expect(out).toContain("inProcessQueue");
    expect(out).toContain("rateLimit");
    expect(out).toContain("logger.ts");
    expect(out).toContain("workers/index.ts");
  });
});
