import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import os from "os";
import path from "path";
import {
  BUILD_FAILED_MARKER_REL,
  readBuildFailedMarker,
} from "../build-quarantine";

describe("build-quarantine marker", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "quarantine-"));
  });
  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("returns null when no marker is present (clean build)", async () => {
    expect(await readBuildFailedMarker(dir)).toBeNull();
  });

  it("reads a written marker (quarantined build)", async () => {
    const full = path.join(dir, BUILD_FAILED_MARKER_REL);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(
      full,
      JSON.stringify({
        sessionId: "sess-1",
        failedAt: "2026-06-12T00:00:00.000Z",
        gate: "integration",
        summary: "Runtime smoke gate failed: 3 endpoints 404",
      }),
    );
    const marker = await readBuildFailedMarker(dir);
    expect(marker).not.toBeNull();
    expect(marker?.sessionId).toBe("sess-1");
    expect(marker?.gate).toBe("integration");
    expect(marker?.summary).toContain("404");
  });

  it("tolerates a malformed marker file (returns null, never throws)", async () => {
    const full = path.join(dir, BUILD_FAILED_MARKER_REL);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, "{ not json");
    expect(await readBuildFailedMarker(dir)).toBeNull();
  });

  it("defaults missing fields rather than throwing", async () => {
    const full = path.join(dir, BUILD_FAILED_MARKER_REL);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, JSON.stringify({ sessionId: "x" }));
    const marker = await readBuildFailedMarker(dir);
    expect(marker?.sessionId).toBe("x");
    expect(marker?.gate).toBe("unknown");
    expect(marker?.summary).toBe("");
  });
});
