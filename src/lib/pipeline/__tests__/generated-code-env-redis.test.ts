import { describe, it, expect } from "vitest";
import {
  upsertRedisUrlEnv,
  resolveBlueprintGeneratedRedisUrl,
  formatGeneratedCodeDotEnv,
} from "../generated-code-env";

describe("formatGeneratedCodeDotEnv", () => {
  it("includes TIMESCALE_DISABLED=1 so the backend boots on plain Postgres", () => {
    const env = formatGeneratedCodeDotEnv("postgres://app:pw@db:5432/app");
    expect(env).toMatch(/^TIMESCALE_DISABLED=1$/m);
    expect(env).toMatch(/^PORT=\d+$/m);
    expect(env).toContain("DATABASE_URL=");
  });
});

describe("upsertRedisUrlEnv", () => {
  const url = "redis://default:pw@host.example:16777";
  it("creates the line when env is empty", () => {
    expect(upsertRedisUrlEnv("", url)).toBe(`REDIS_URL=${JSON.stringify(url)}\n`);
  });
  it("replaces an existing REDIS_URL line", () => {
    const before = `PORT=4000\nREDIS_URL="redis://old"\nJWT=x\n`;
    const after = upsertRedisUrlEnv(before, url);
    expect(after).toContain(`REDIS_URL=${JSON.stringify(url)}`);
    expect(after).not.toContain(`"redis://old"`);
    expect(after).toContain(`PORT=4000`);
    expect(after).toContain(`JWT=x`);
  });
  it("appends when REDIS_URL is missing", () => {
    const before = `PORT=4000\n`;
    expect(upsertRedisUrlEnv(before, url)).toBe(
      `PORT=4000\nREDIS_URL=${JSON.stringify(url)}\n`,
    );
  });
});

describe("resolveBlueprintGeneratedRedisUrl", () => {
  it("prefers request override", () => {
    expect(resolveBlueprintGeneratedRedisUrl("redis://override")).toBe(
      "redis://override",
    );
  });
  it("falls back to env var", () => {
    const orig = process.env.BLUEPRINT_GENERATED_REDIS_URL;
    process.env.BLUEPRINT_GENERATED_REDIS_URL = "redis://from-env";
    try {
      expect(resolveBlueprintGeneratedRedisUrl()).toBe("redis://from-env");
    } finally {
      if (orig === undefined) delete process.env.BLUEPRINT_GENERATED_REDIS_URL;
      else process.env.BLUEPRINT_GENERATED_REDIS_URL = orig;
    }
  });
  it("returns null when nothing set", () => {
    const orig = process.env.BLUEPRINT_GENERATED_REDIS_URL;
    delete process.env.BLUEPRINT_GENERATED_REDIS_URL;
    try {
      expect(resolveBlueprintGeneratedRedisUrl()).toBeNull();
    } finally {
      if (orig !== undefined) process.env.BLUEPRINT_GENERATED_REDIS_URL = orig;
    }
  });
});
