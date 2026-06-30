// src/lib/pipeline/__tests__/prototype-marker.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import os from "os";
import path from "path";
import {
  writePrototypeMarker,
  readPrototypeMarker,
  prototypeMarkerPath,
  type PrototypeMarker,
} from "../prototype-marker";

let dir: string;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "proto-marker-"));
});
afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

const sample: PrototypeMarker = {
  generatedAt: "2026-06-30T00:00:00.000Z",
  scaffoldTier: "M",
  scopeTier: "M",
  baseScaffoldCopied: true,
  pages: [
    { pageId: "PAGE-001", route: "/dashboard", source: "demo-html", file: "src/views/Dashboard.tsx" },
  ],
  generatedFiles: ["frontend/src/views/Dashboard.tsx", "frontend/src/router.tsx"],
};

describe("prototype-marker", () => {
  it("writes the marker to .blueprint/prototype.json and reads it back round-trip", async () => {
    await writePrototypeMarker(dir, sample);
    expect(prototypeMarkerPath(dir)).toBe(path.join(dir, ".blueprint", "prototype.json"));
    const back = await readPrototypeMarker(dir);
    expect(back).toEqual(sample);
  });

  it("preserves generatedFiles as the preserve-list round-trip", async () => {
    await writePrototypeMarker(dir, sample);
    const back = await readPrototypeMarker(dir);
    expect(back?.generatedFiles).toEqual(sample.generatedFiles);
  });

  it("returns null when no marker exists (gate read by a downstream stub)", async () => {
    expect(await readPrototypeMarker(dir)).toBeNull();
  });

  it("returns null for a corrupt marker (no pages array)", async () => {
    await fs.mkdir(path.join(dir, ".blueprint"), { recursive: true });
    await fs.writeFile(prototypeMarkerPath(dir), "{ not json", "utf-8");
    expect(await readPrototypeMarker(dir)).toBeNull();
  });
});
