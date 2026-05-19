import { describe, it, expect } from "vitest";
import { parseInfraSpec } from "../types";

describe("parseInfraSpec", () => {
  it("accepts a minimal S-tier spec", () => {
    const r = parseInfraSpec({
      tier: "S",
      services: [
        {
          name: "app",
          kind: "app",
          role: "frontend",
          runtime: "node20-alpine",
          context: ".",
          workdir: "/app",
          install: "pnpm install --frozen-lockfile",
          build: "pnpm run build",
          start: "node dist/server.js",
          servesStatic: true,
          envs: [],
          depends: [],
        },
      ],
    });
    expect(r.ok).toBe(true);
    expect(r.spec?.tier).toBe("S");
  });

  it("rejects non-whitelisted runtime", () => {
    const r = parseInfraSpec({
      tier: "S",
      services: [
        {
          name: "app",
          kind: "app",
          role: "frontend",
          runtime: "node99-alpine",
          start: "node x",
        },
      ],
    });
    expect(r.ok).toBe(false);
    expect((r.errors ?? []).some((e) => /runtime/i.test(e))).toBe(true);
  });

  it("rejects non-whitelisted managed image", () => {
    const r = parseInfraSpec({
      tier: "M",
      services: [
        {
          name: "cache",
          kind: "managed",
          image: "memcached:latest",
        },
      ],
    });
    expect(r.ok).toBe(false);
  });

  it("rejects duplicate service names", () => {
    const r = parseInfraSpec({
      tier: "M",
      services: [
        {
          name: "backend",
          kind: "app",
          role: "backend",
          runtime: "node20-alpine",
          context: "backend",
          start: "node dist/server.js",
          port: 3001,
        },
        {
          name: "backend",
          kind: "app",
          role: "worker",
          runtime: "node20-alpine",
          context: "worker",
          start: "node dist/worker.js",
          port: 3002,
        },
      ],
    });
    expect(r.ok).toBe(false);
    expect((r.errors ?? []).some((e) => /duplicate/.test(e))).toBe(true);
  });

  it("rejects port conflicts", () => {
    const r = parseInfraSpec({
      tier: "M",
      services: [
        {
          name: "a",
          kind: "app",
          role: "backend",
          runtime: "node20-alpine",
          context: "a",
          start: "node x",
          port: 3001,
        },
        {
          name: "b",
          kind: "app",
          role: "worker",
          runtime: "node20-alpine",
          context: "b",
          start: "node y",
          port: 3001,
        },
      ],
    });
    expect(r.ok).toBe(false);
    expect((r.errors ?? []).some((e) => /port 3001/.test(e))).toBe(true);
  });

  it("rejects depends pointing at a missing service", () => {
    const r = parseInfraSpec({
      tier: "L",
      services: [
        {
          name: "backend",
          kind: "app",
          role: "backend",
          runtime: "node20-alpine",
          context: "backend",
          start: "node x",
          port: 3001,
          depends: ["redis"],
        },
      ],
    });
    expect(r.ok).toBe(false);
  });

  it("parses raw JSON strings", () => {
    const r = parseInfraSpec(
      JSON.stringify({
        tier: "S",
        services: [
          {
            name: "app",
            kind: "app",
            role: "frontend",
            runtime: "node20-alpine",
            start: "node dist/server.js",
            servesStatic: true,
          },
        ],
      }),
    );
    expect(r.ok).toBe(true);
  });

  it("returns error on invalid JSON", () => {
    const r = parseInfraSpec("{not json");
    expect(r.ok).toBe(false);
    expect((r.errors ?? [])[0]).toMatch(/invalid JSON/);
  });
});
