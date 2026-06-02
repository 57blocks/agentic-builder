import { describe, expect, it } from "vitest";

import { validateSubsystemManifest } from "../validate";
import { CSMA_SUBSYSTEM_MANIFEST } from "../csma-sample";
import type { SubsystemManifest } from "../types";

function clone(): SubsystemManifest {
  return JSON.parse(JSON.stringify(CSMA_SUBSYSTEM_MANIFEST)) as SubsystemManifest;
}

describe("validateSubsystemManifest — CSMA golden sample", () => {
  it("passes all hard checks", () => {
    const r = validateSubsystemManifest(CSMA_SUBSYSTEM_MANIFEST);
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it("derives the expected topological build order (5 layers)", () => {
    const r = validateSubsystemManifest(CSMA_SUBSYSTEM_MANIFEST);
    expect(r.buildLayers).toEqual([
      ["auth-accounts"],
      ["admin-ops", "catalog", "messaging"],
      ["enrollment", "scheduling"],
      ["billing", "learning"],
      ["approvals"],
    ]);
  });

  it("exclusive ownership — no route/endpoint/collection owned twice", () => {
    const r = validateSubsystemManifest(CSMA_SUBSYSTEM_MANIFEST);
    expect(r.errors.filter((e) => /owned by multiple/.test(e))).toEqual([]);
  });
});

describe("validateSubsystemManifest — negative cases", () => {
  it("detects a dependency cycle", () => {
    const m = clone();
    // auth-accounts ← catalog ← auth-accounts
    m.subsystems.find((s) => s.id === "auth-accounts")!.dependsOn = ["catalog"];
    const r = validateSubsystemManifest(m);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => /cycle/.test(e))).toBe(true);
    expect(r.buildLayers).toEqual([]);
  });

  it("detects duplicate ownership across subsystems", () => {
    const m = clone();
    // give catalog an endpoint enrollment already owns
    m.subsystems.find((s) => s.id === "catalog")!.ownedApiEndpoints.push("POST /api/v1/cart");
    const r = validateSubsystemManifest(m);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => /owned by multiple/.test(e) && /\/api\/v1\/cart/.test(e))).toBe(true);
  });

  it("detects an unknown dependsOn reference", () => {
    const m = clone();
    m.subsystems.find((s) => s.id === "billing")!.dependsOn.push("nonexistent");
    const r = validateSubsystemManifest(m);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => /unknown subsystem "nonexistent"/.test(e))).toBe(true);
  });

  it("detects an empty subsystem", () => {
    const m = clone();
    const s = m.subsystems.find((x) => x.id === "approvals")!;
    s.ownedRoutes = [];
    s.ownedApiEndpoints = [];
    s.ownedModules = [];
    const r = validateSubsystemManifest(m);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => /owns no routes/.test(e))).toBe(true);
  });

  it("coverage check flags a missing route", () => {
    const r = validateSubsystemManifest(CSMA_SUBSYSTEM_MANIFEST, {
      routes: ["/family/cart", "/family/some-unowned-route"],
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => /some-unowned-route.*coverage gap/.test(e))).toBe(true);
  });
});
