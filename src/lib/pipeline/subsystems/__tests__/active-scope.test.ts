import { describe, expect, it } from "vitest";

import {
  endpointMatchKey,
  scopeKeySet,
  filterEndpointsToScope,
  type ActiveSubsystemScope,
} from "../active-scope";
import { planSubsystemBuilds } from "../orchestrate";
import type { SubsystemManifest } from "../types";

describe("endpointMatchKey", () => {
  it("normalizes param formats and trailing slashes", () => {
    expect(endpointMatchKey("post", "/api/v1/x/:id/cancel")).toBe("POST /api/v1/x/*/cancel");
    expect(endpointMatchKey("POST", "/api/v1/x/{id}/cancel")).toBe("POST /api/v1/x/*/cancel");
    expect(endpointMatchKey("GET", "/api/v1/x/")).toBe("GET /api/v1/x");
  });
});

describe("scopeKeySet + filterEndpointsToScope", () => {
  const scope: ActiveSubsystemScope = {
    subsystemId: "enrollment",
    endpoints: ["POST /api/v1/enrollments", "POST /api/v1/admin/enrollments/{id}/cancel"],
  };
  it("keeps only in-scope endpoints; param formats match across :id vs {id}", () => {
    const keys = scopeKeySet(scope);
    const contract = [
      { method: "POST", endpoint: "/api/v1/enrollments" }, // in
      { method: "POST", endpoint: "/api/v1/admin/enrollments/:id/cancel" }, // in (param-normalized)
      { method: "GET", endpoint: "/api/v1/bills" }, // out (other domain)
    ];
    expect(filterEndpointsToScope(contract, keys).map((e) => e.endpoint)).toEqual([
      "/api/v1/enrollments",
      "/api/v1/admin/enrollments/:id/cancel",
    ]);
  });
  it("null key set (no sidecar) returns input unchanged", () => {
    const contract = [{ method: "GET", endpoint: "/x" }];
    expect(filterEndpointsToScope(contract, scopeKeySet(null))).toEqual(contract);
  });
});

describe("planSubsystemBuilds scopeEndpoints", () => {
  const MANIFEST: SubsystemManifest = {
    version: 1,
    subsystems: [
      { id: "auth", name: "auth", ownedRoutes: ["/auth"], ownedApiEndpoints: ["POST /api/v1/auth/login"], ownedCollections: [], ownedModules: ["m/auth"], dependsOn: [], prdSections: [] },
      { id: "enrollment", name: "enr", ownedRoutes: ["/cart"], ownedApiEndpoints: ["POST /api/v1/enrollments"], ownedCollections: [], ownedModules: ["m/enr"], dependsOn: ["auth"], prdSections: [] },
      { id: "billing", name: "bill", ownedRoutes: ["/billing"], ownedApiEndpoints: ["GET /api/v1/bills"], ownedCollections: [], ownedModules: ["m/bills"], dependsOn: ["enrollment"], prdSections: [] },
    ],
  };
  it("scope = own endpoints + transitive subsystem-dependency endpoints", () => {
    const plan = planSubsystemBuilds(MANIFEST, []);
    const byId = new Map(plan.layers.flat().map((s) => [s.subsystemId, s.scopeEndpoints]));
    expect(byId.get("auth")).toEqual(["POST /api/v1/auth/login"]);
    // enrollment depends on auth → both endpoints in scope
    expect(byId.get("enrollment")!.sort()).toEqual(["POST /api/v1/auth/login", "POST /api/v1/enrollments"]);
    // billing depends on enrollment→auth → all three
    expect(byId.get("billing")!.sort()).toEqual([
      "GET /api/v1/bills",
      "POST /api/v1/auth/login",
      "POST /api/v1/enrollments",
    ]);
  });
});
