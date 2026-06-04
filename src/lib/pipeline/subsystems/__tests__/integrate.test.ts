import { afterEach, describe, expect, it, vi } from "vitest";
import { runCrossDomainIntegration } from "../integrate";
import type { RuntimeSmokeGateResult } from "../../self-heal/runtime-smoke-gate";

function smokeResult(over: Partial<RuntimeSmokeGateResult>): RuntimeSmokeGateResult {
  return {
    pass: true,
    bootFailed: false,
    failures: [],
    successes: [],
    port: 4000,
    probedEndpoints: [],
    ...over,
  };
}

const prevEnv = process.env.BLUEPRINT_SUBSYSTEM_INTEGRATE;
afterEach(() => {
  if (prevEnv === undefined) delete process.env.BLUEPRINT_SUBSYSTEM_INTEGRATE;
  else process.env.BLUEPRINT_SUBSYSTEM_INTEGRATE = prevEnv;
});

describe("runCrossDomainIntegration", () => {
  it("is a no-op when disabled via env", async () => {
    process.env.BLUEPRINT_SUBSYSTEM_INTEGRATE = "0";
    const smokeGate = vi.fn();
    const r = await runCrossDomainIntegration({ outputDir: "/x", smokeGate, clearScope: vi.fn() });
    expect(r.ran).toBe(false);
    expect(r.ok).toBe(true);
    expect(smokeGate).not.toHaveBeenCalled();
  });

  it("clears scope, runs whole-app smoke, ok on pass", async () => {
    delete process.env.BLUEPRINT_SUBSYSTEM_INTEGRATE;
    const clearScope = vi.fn(async () => {});
    const smokeGate = vi.fn(async () => smokeResult({ pass: true }));
    const r = await runCrossDomainIntegration({ outputDir: "/proj", smokeGate, clearScope });
    expect(clearScope).toHaveBeenCalledWith("/proj");
    expect(smokeGate).toHaveBeenCalledTimes(1);
    expect(r).toMatchObject({ ran: true, ok: true, smokePassed: true });
  });

  it("fails with boot reason when backend did not boot", async () => {
    const r = await runCrossDomainIntegration({
      outputDir: "/proj",
      clearScope: vi.fn(async () => {}),
      smokeGate: async () => smokeResult({ pass: false, bootFailed: true }),
    });
    expect(r.ok).toBe(false);
    expect(r.bootFailed).toBe(true);
    expect(r.reason).toMatch(/boot/i);
  });

  it("maps endpoint findings on failure", async () => {
    const r = await runCrossDomainIntegration({
      outputDir: "/proj",
      clearScope: vi.fn(async () => {}),
      smokeGate: async () =>
        smokeResult({
          pass: false,
          failures: [{ code: "missing_route", target: "GET /api/v1/x", directive: "register it", evidence: "404" } as never],
        }),
    });
    expect(r.ok).toBe(false);
    expect(r.findings[0]).toContain("GET /api/v1/x");
    expect(r.findings[0]).toContain("register it");
  });

  it("contains a thrown gate error instead of crashing", async () => {
    const r = await runCrossDomainIntegration({
      outputDir: "/proj",
      clearScope: vi.fn(async () => {}),
      smokeGate: async () => {
        throw new Error("boom");
      },
    });
    expect(r.ran).toBe(true);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("boom");
  });
});
