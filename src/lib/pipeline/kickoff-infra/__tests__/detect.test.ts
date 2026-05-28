import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  detectRequiredServices,
  detectRequiredServicesByRegex,
} from "../detect";

describe("detectRequiredServicesByRegex", () => {
  it("detects postgres by name", () => {
    expect(
      detectRequiredServicesByRegex("We use PostgreSQL for storage."),
    ).toEqual({ needsPostgres: true, needsRedis: false });
  });
  it("detects postgres via ORM mention", () => {
    expect(
      detectRequiredServicesByRegex("Schema is managed with Drizzle.")
        .needsPostgres,
    ).toBe(true);
    expect(
      detectRequiredServicesByRegex("Use Prisma migrations.").needsPostgres,
    ).toBe(true);
  });
  it("detects redis by name", () => {
    expect(detectRequiredServicesByRegex("Sessions stored in Redis.")).toEqual({
      needsPostgres: false,
      needsRedis: true,
    });
  });
  it("detects redis via BullMQ / cache hints", () => {
    expect(
      detectRequiredServicesByRegex("Background jobs use BullMQ.").needsRedis,
    ).toBe(true);
    expect(
      detectRequiredServicesByRegex("Rate limiter for /api/*.").needsRedis,
    ).toBe(true);
    expect(detectRequiredServicesByRegex("Add a cache layer.").needsRedis).toBe(
      true,
    );
  });
  it("detects both", () => {
    expect(
      detectRequiredServicesByRegex(
        "PostgreSQL for the main store; Redis for session cache.",
      ),
    ).toEqual({ needsPostgres: true, needsRedis: true });
  });
  it("neither detected for a static site", () => {
    expect(
      detectRequiredServicesByRegex(
        "A simple static site rendered with Vite.",
      ),
    ).toEqual({ needsPostgres: false, needsRedis: false });
  });
});

describe("detectRequiredServices (orchestration)", () => {
  const orig = process.env.INFRA_DETECT_REGEX_ONLY;
  beforeEach(() => {
    process.env.INFRA_DETECT_REGEX_ONLY = "1";
  });
  afterEach(() => {
    if (orig === undefined) delete process.env.INFRA_DETECT_REGEX_ONLY;
    else process.env.INFRA_DETECT_REGEX_ONLY = orig;
  });

  it("uses regex path when INFRA_DETECT_REGEX_ONLY is set", async () => {
    const r = await detectRequiredServices("PostgreSQL with Redis caching.");
    expect(r.source).toBe("regex");
    expect(r.services).toEqual({ needsPostgres: true, needsRedis: true });
  });
});
