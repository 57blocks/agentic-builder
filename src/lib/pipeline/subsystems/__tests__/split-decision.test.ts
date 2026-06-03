import { describe, expect, it } from "vitest";

import { shouldSplitIntoSubsystems, MIN_ENDPOINTS_FOR_SPLIT } from "../split-decision";
import type { PrdInventory } from "../inventory";
import type { SubsystemManifest } from "../types";
import type { ManifestValidationResult } from "../validate";

const okValidation: ManifestValidationResult = { ok: true, errors: [], warnings: [], buildLayers: [] };

function inventory(n: number): PrdInventory {
  return { routes: [], collections: [], apiEndpoints: Array.from({ length: n }, (_, i) => `GET /api/v1/r${i}`) };
}

/** Manifest with `domains` domains, `epsEach` endpoints each (balanced). */
function manifest(domains: number, epsEach: number): SubsystemManifest {
  return {
    version: 1,
    subsystems: Array.from({ length: domains }, (_, i) => ({
      id: `d${i}`,
      name: `d${i}`,
      ownedRoutes: [],
      ownedApiEndpoints: Array.from({ length: epsEach }, (_, j) => `GET /api/v1/d${i}/${j}`),
      ownedCollections: [],
      ownedModules: [`m/d${i}`],
      dependsOn: [],
      prdSections: [],
    })),
  };
}

describe("shouldSplitIntoSubsystems", () => {
  it("splits a large, well-decomposed L project (CSMA-like)", () => {
    const d = shouldSplitIntoSubsystems({
      tier: "L",
      inventory: inventory(127),
      manifest: manifest(11, 10),
      validation: okValidation,
    });
    expect(d.split).toBe(true);
  });

  it("does NOT split non-L tiers", () => {
    expect(shouldSplitIntoSubsystems({ tier: "M", inventory: inventory(127), manifest: manifest(11, 10), validation: okValidation }).split).toBe(false);
    expect(shouldSplitIntoSubsystems({ tier: "S", inventory: inventory(127), manifest: manifest(11, 10), validation: okValidation }).split).toBe(false);
  });

  it("does NOT split below the endpoint threshold", () => {
    const d = shouldSplitIntoSubsystems({ tier: "L", inventory: inventory(MIN_ENDPOINTS_FOR_SPLIT - 1), manifest: manifest(6, 12), validation: okValidation });
    expect(d.split).toBe(false);
    expect(d.reasons.some((r) => /endpoints=79 < 80/.test(r))).toBe(true);
  });

  it("does NOT split with too few domains", () => {
    expect(shouldSplitIntoSubsystems({ tier: "L", inventory: inventory(120), manifest: manifest(3, 40), validation: okValidation }).split).toBe(false);
  });

  it("does NOT split when one domain hoards >40% of endpoints", () => {
    const m: SubsystemManifest = {
      version: 1,
      subsystems: [
        { id: "giant", name: "g", ownedRoutes: [], ownedApiEndpoints: Array.from({ length: 90 }, (_, i) => `GET /api/v1/g/${i}`), ownedCollections: [], ownedModules: ["m/g"], dependsOn: [], prdSections: [] },
        ...manifest(5, 4).subsystems,
      ],
    };
    const d = shouldSplitIntoSubsystems({ tier: "L", inventory: inventory(120), manifest: m, validation: okValidation });
    expect(d.split).toBe(false);
    expect(d.reasons.some((r) => /imbalanced/.test(r))).toBe(true);
  });

  it("does NOT split when the manifest is invalid", () => {
    const bad: ManifestValidationResult = { ok: false, errors: ["x"], warnings: [], buildLayers: [] };
    expect(shouldSplitIntoSubsystems({ tier: "L", inventory: inventory(120), manifest: manifest(8, 12), validation: bad }).split).toBe(false);
  });
});
