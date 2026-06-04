import { afterEach, describe, expect, it } from "vitest";
import { isFoundationTask } from "../domain-breakdown";
import { shouldSplitIntoSubsystems } from "../split-decision";
import { summarizeSubsystemStatus, formatSubsystemStatusLine } from "../subsystem-status";
import type { SubsystemManifest } from "../types";
import type { KickoffWorkItem } from "../../types";
import type { PrdInventory } from "../inventory";

function task(over: Partial<KickoffWorkItem> & { phase: string; title: string }): KickoffWorkItem {
  return {
    id: over.id ?? "T-1",
    phase: over.phase,
    title: over.title,
    description: "",
    estimatedHours: 1,
    executionKind: "ai_autonomous",
    files: over.files,
  } as KickoffWorkItem;
}

// ── P3.3 — isFoundationTask robustness ──────────────────────────────────────
describe("isFoundationTask (P3.3 file-signature fallback)", () => {
  it("catches a shared-foundation task by FILE even when the title doesn't match", () => {
    const t = task({
      phase: "Frontend",
      title: "Implement Family pages", // does NOT match the foundation title regex
      files: { creates: ["frontend/src/components/ui/Button.tsx"], modifies: [], reads: [] },
    });
    expect(isFoundationTask(t)).toBe(true);
  });
  it("catches tokens.css / router.tsx / layout files", () => {
    for (const f of [
      "frontend/src/styles/tokens.css",
      "frontend/src/router.tsx",
      "frontend/src/components/layout/AppLayout.tsx",
    ]) {
      expect(
        isFoundationTask(task({ phase: "Frontend", title: "x", files: { creates: [f], modifies: [], reads: [] } })),
      ).toBe(true);
    }
  });
  it("does NOT treat a domain page as foundation", () => {
    const t = task({
      phase: "Frontend",
      title: "Implement Family Courses page",
      files: { creates: ["frontend/src/pages/family/CoursesPage.tsx"], modifies: [], reads: [] },
    });
    expect(isFoundationTask(t)).toBe(false);
  });
  it("still honours foundation phases", () => {
    expect(isFoundationTask(task({ phase: "Data Layer", title: "models" }))).toBe(true);
  });
});

// ── P3.4 — env-overridable split threshold ──────────────────────────────────
function balancedManifest(domains: number, epsPerDomain: number): SubsystemManifest {
  return {
    version: 1,
    subsystems: Array.from({ length: domains }, (_v, i) => ({
      id: `d${i}`,
      name: `d${i}`,
      ownedRoutes: [],
      ownedApiEndpoints: Array.from({ length: epsPerDomain }, (_w, j) => `GET /api/v1/d${i}/r${j}`),
      ownedCollections: [],
      ownedModules: [],
      dependsOn: [],
      prdSections: [],
    })),
  };
}
function inv(n: number): PrdInventory {
  return {
    routes: [],
    apiEndpoints: Array.from({ length: n }, (_v, i) => `GET /api/v1/r${i}`),
    collections: [],
  } as PrdInventory;
}

const prev = process.env.BLUEPRINT_SUBSYSTEM_MIN_ENDPOINTS;
afterEach(() => {
  if (prev === undefined) delete process.env.BLUEPRINT_SUBSYSTEM_MIN_ENDPOINTS;
  else process.env.BLUEPRINT_SUBSYSTEM_MIN_ENDPOINTS = prev;
});

describe("shouldSplitIntoSubsystems (P3.4 env threshold)", () => {
  const manifest = balancedManifest(5, 12);
  const validation = { ok: true, errors: [], warnings: [], buildLayers: [["d0", "d1", "d2", "d3", "d4"]] };
  it("does not split at 60 endpoints with the default threshold (80)", () => {
    delete process.env.BLUEPRINT_SUBSYSTEM_MIN_ENDPOINTS;
    expect(shouldSplitIntoSubsystems({ tier: "L", inventory: inv(60), manifest, validation }).split).toBe(false);
  });
  it("splits at 60 endpoints when the env threshold is lowered to 50", () => {
    process.env.BLUEPRINT_SUBSYSTEM_MIN_ENDPOINTS = "50";
    expect(shouldSplitIntoSubsystems({ tier: "L", inventory: inv(60), manifest, validation }).split).toBe(true);
  });
});

// ── P3.4 — status summary ───────────────────────────────────────────────────
describe("summarizeSubsystemStatus", () => {
  const manifest: SubsystemManifest = {
    version: 1,
    subsystems: [
      { id: "auth", name: "auth", ownedRoutes: [], ownedApiEndpoints: [], ownedCollections: [], ownedModules: [], dependsOn: [], prdSections: [] },
      { id: "billing", name: "billing", ownedRoutes: [], ownedApiEndpoints: [], ownedCollections: [], ownedModules: [], dependsOn: ["auth"], prdSections: [] },
    ],
  };
  it("computes per-domain state + layers", () => {
    const s = summarizeSubsystemStatus(manifest, ["auth"], "billing");
    expect(s.total).toBe(2);
    expect(s.completed).toBe(1);
    expect(s.domains.find((d) => d.id === "auth")!.state).toBe("completed");
    expect(s.domains.find((d) => d.id === "billing")!.state).toBe("active");
    expect(s.layers[0]).toContain("auth");
    expect(formatSubsystemStatusLine(s)).toContain("active=billing");
  });
});
