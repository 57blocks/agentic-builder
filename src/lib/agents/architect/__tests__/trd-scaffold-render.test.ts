/**
 * Tests for renderScaffoldFoundationBlock — tells the TRD architect what the
 * per-tier scaffold already provides so it doesn't re-specify / duplicate it.
 */

import { describe, expect, it } from "vitest";
import {
  renderScaffoldFoundationBlock,
  detectFrontendFrameworkDrift,
} from "../trd-scaffold-block";

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

  it("forbids Next.js explicitly so the model can't drift to it", () => {
    for (const tier of ["S", "M", "L"] as const) {
      const out = renderScaffoldFoundationBlock(tier);
      expect(out).toMatch(/NOT Next\.js/i);
      expect(out).toMatch(/react-router-dom/i);
    }
  });
});

describe("detectFrontendFrameworkDrift", () => {
  it("flags Next.js / App Router / RSC / SSR drift", () => {
    expect(detectFrontendFrameworkDrift("Frontend framework | Next.js App Router", "L")).toContain(
      "Next.js",
    );
    expect(detectFrontendFrameworkDrift("rendered with the App Router", "L").length).toBeGreaterThan(0);
    expect(detectFrontendFrameworkDrift("uses React Server Components", "L").length).toBeGreaterThan(0);
    expect(detectFrontendFrameworkDrift("import x from 'next/navigation'", "M").length).toBeGreaterThan(0);
    expect(detectFrontendFrameworkDrift("via getServerSideProps", "M").length).toBeGreaterThan(0);
  });

  it("does not false-positive on a clean Vite/React TRD", () => {
    const clean = `## 2. Frontend Architecture
Vite + React + react-router-dom SPA. Client-rendered. Data via the scaffold HTTP client.
The next step is to define routes. Enrollment opens next semester.`;
    expect(detectFrontendFrameworkDrift(clean, "L")).toEqual([]);
  });
});
