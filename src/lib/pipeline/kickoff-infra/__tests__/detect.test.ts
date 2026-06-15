import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  detectRequiredServices,
  detectRequiredServicesByRegex,
} from "../detect";

describe("detectRequiredServicesByRegex", () => {
  it("detects postgres by name", () => {
    expect(
      detectRequiredServicesByRegex("We use PostgreSQL for storage."),
    ).toEqual({ needsPostgres: true, needsRedis: false, needsS3: false });
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
      needsS3: false,
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
  it("detects s3 by name", () => {
    expect(
      detectRequiredServicesByRegex("Store uploads in an S3 bucket."),
    ).toEqual({ needsPostgres: false, needsRedis: false, needsS3: true });
  });
  it("detects s3 via upload / object-storage hints", () => {
    expect(
      detectRequiredServicesByRegex("Users can upload avatar images.")
        .needsS3,
    ).toBe(true);
    expect(
      detectRequiredServicesByRegex("Files persisted to object storage.")
        .needsS3,
    ).toBe(true);
    expect(
      detectRequiredServicesByRegex("Generate a presigned URL for downloads.")
        .needsS3,
    ).toBe(true);
    expect(
      detectRequiredServicesByRegex("Document upload with MinIO.").needsS3,
    ).toBe(true);
  });
  it("does NOT flag s3 for a text-only CRUD app", () => {
    expect(
      detectRequiredServicesByRegex("A todo list app with PostgreSQL.").needsS3,
    ).toBe(false);
  });
  it("detects all three", () => {
    expect(
      detectRequiredServicesByRegex(
        "PostgreSQL for the main store; Redis for session cache; S3 for media uploads.",
      ),
    ).toEqual({ needsPostgres: true, needsRedis: true, needsS3: true });
  });
  it("none detected for a static site", () => {
    expect(
      detectRequiredServicesByRegex("A simple static site rendered with Vite."),
    ).toEqual({ needsPostgres: false, needsRedis: false, needsS3: false });
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
    const r = await detectRequiredServices(
      "PostgreSQL with Redis caching and S3 image uploads.",
    );
    expect(r.source).toBe("regex");
    expect(r.services).toEqual({
      needsPostgres: true,
      needsRedis: true,
      needsS3: true,
    });
  });
});
