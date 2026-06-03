import { describe, expect, it } from "vitest";

import { buildRouteIdMap, buildEndpointIdMap, resolveDomainRequirementIds } from "../domain-requirements";
import type { SubsystemManifest } from "../types";

const PRD = `## 7.1 路由
| 路径 | 说明 |
|---|---|
| \`/family/cart\` | 购物车 · PAGE-014 |
| \`/admin/users\` | 用户 · PAGE-020 |

## 26. API
#### POST \`/api/v1/enrollments\` · API-030
#### GET / POST \`/api/v1/admin/users/:id\` · API-045
`;

describe("id maps", () => {
  it("route → PAGE id", () => {
    const m = buildRouteIdMap(PRD);
    expect(m.get("/family/cart")).toBe("PAGE-014");
    expect(m.get("/admin/users")).toBe("PAGE-020");
  });
  it("endpoint → API id (multi-method shares the id; param-normalized)", () => {
    const m = buildEndpointIdMap(PRD);
    expect(m.get("POST /api/v1/enrollments")).toBe("API-030");
    // {id} in manifest must still hit the :id heading
    expect(m.get("GET /api/v1/admin/users/*")).toBe("API-045");
    expect(m.get("POST /api/v1/admin/users/*")).toBe("API-045");
  });
});

describe("resolveDomainRequirementIds", () => {
  const manifest: SubsystemManifest = {
    version: 1,
    subsystems: [
      { id: "enrollment", name: "e", ownedRoutes: ["/family/cart"], ownedApiEndpoints: ["POST /api/v1/enrollments"], ownedCollections: [], ownedModules: ["m"], dependsOn: [], prdSections: [] },
      { id: "user-admin", name: "u", ownedRoutes: ["/admin/users"], ownedApiEndpoints: ["GET /api/v1/admin/users/{id}"], ownedCollections: [], ownedModules: ["m"], dependsOn: [], prdSections: [] },
    ],
  };
  it("maps each domain to its PAGE/API ids (param formats reconcile)", () => {
    const { byDomain, unresolved } = resolveDomainRequirementIds(PRD, manifest);
    expect(byDomain.get("enrollment")!.sort()).toEqual(["API-030", "PAGE-014"]);
    expect(byDomain.get("user-admin")!.sort()).toEqual(["API-045", "PAGE-020"]); // {id} → :id heading
    expect(unresolved).toEqual([]);
  });
  it("reports unresolved owned items not found in the PRD", () => {
    const m2: SubsystemManifest = { version: 1, subsystems: [{ id: "x", name: "x", ownedRoutes: ["/nope"], ownedApiEndpoints: [], ownedCollections: [], ownedModules: ["m"], dependsOn: [], prdSections: [] }] };
    expect(resolveDomainRequirementIds(PRD, m2).unresolved.some((u) => /\/nope/.test(u))).toBe(true);
  });
});
