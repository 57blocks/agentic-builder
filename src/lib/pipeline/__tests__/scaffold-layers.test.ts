import { describe, expect, it } from "vitest";
import {
  scaffoldLayerDirsForTier,
  listScaffoldTemplateRelativePaths,
} from "../scaffold-copy";

describe("scaffoldLayerDirsForTier", () => {
  it("S and M resolve to a single own-tier layer", () => {
    expect(scaffoldLayerDirsForTier("S")).toEqual(["s-tier"]);
    expect(scaffoldLayerDirsForTier("M")).toEqual(["m-tier"]);
  });

  it("L is composed as M base + L overlay", () => {
    expect(scaffoldLayerDirsForTier("L")).toEqual(["m-tier", "l-tier"]);
  });
});

describe("listScaffoldTemplateRelativePaths for the merged L tier", () => {
  it("unions M base files with the L overlay delta", async () => {
    const paths = await listScaffoldTemplateRelativePaths("L");
    const set = new Set(paths);

    // A file that lives ONLY in the M base (no longer duplicated in l-tier)
    // must still surface for L — proves the base layer is being walked.
    expect(set.has("backend/src/middlewares/responseEnvelope.ts")).toBe(true);

    // A file that lives ONLY in the L overlay (production queue layer) must
    // surface too — proves the overlay layer is being walked.
    expect(set.has("backend/src/queue/inProcessQueue.ts")).toBe(true);

    // Each path appears at most once even though the overlay overwrites some
    // base files.
    expect(paths.length).toBe(set.size);
  });

  it("does not leak the M base's concrete .env or _optional into L", async () => {
    const paths = await listScaffoldTemplateRelativePaths("L");
    // Concrete env files are environment-specific and excluded from a base
    // layer that sits under an overlay.
    expect(paths).not.toContain("backend/.env");
    expect(paths).not.toContain("frontend/.env");
  });
});
