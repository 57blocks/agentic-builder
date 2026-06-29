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

  it("inherits FR-/AC-/CMP- ids from the domain's owned prdSections (gate alignment)", () => {
    const prd = [
      "## 10. Data Models",
      "### 10.2 Course",
      "Implements FR-CA01 and AC-03.",
      "### 10.3 Lesson",
      "FR-CA02 here. CMP-007 too.",
      "## 26. API",
      "### 26.1 Auth",
      "FR-AU01 AC-01",
    ].join("\n");
    const m: SubsystemManifest = {
      version: 1,
      subsystems: [
        { id: "catalog", name: "c", ownedRoutes: [], ownedApiEndpoints: [], ownedCollections: [], ownedModules: ["m"], dependsOn: [], prdSections: ["§10.2", "§10.3"] },
        { id: "auth", name: "a", ownedRoutes: [], ownedApiEndpoints: [], ownedCollections: [], ownedModules: ["m"], dependsOn: [], prdSections: ["§26.1"] },
      ],
    };
    const { byDomain } = resolveDomainRequirementIds(prd, m);
    expect(byDomain.get("catalog")).toEqual(["AC-03", "CMP-007", "FR-CA01", "FR-CA02"]);
    expect(byDomain.get("auth")).toEqual(["AC-01", "FR-AU01"]);
  });

  it("a parent section ref (§10) sweeps all its subsections", () => {
    const prd = ["## 10. X", "### 10.1 A", "FR-A01", "### 10.2 B", "FR-B01"].join("\n");
    const m: SubsystemManifest = {
      version: 1,
      subsystems: [{ id: "d", name: "d", ownedRoutes: [], ownedApiEndpoints: [], ownedCollections: [], ownedModules: ["m"], dependsOn: [], prdSections: ["§10"] }],
    };
    expect(resolveDomainRequirementIds(prd, m).byDomain.get("d")).toEqual(["FR-A01", "FR-B01"]);
  });
});

describe("resolveDomainRequirementIds — orphan rescue (coverage safety net)", () => {
  // §10 (family) and §11 (teacher) are claimed; §28 (marketing) is claimed by no
  // subsystem — its acceptance criteria used to be silently dropped from the build.
  const ORPHAN_PRD = [
    "## 10. Family",
    "### 10.1 Dashboard",
    "- (AC-041) profile switch re-filters cards",
    "- (AC-045) course color hashing",
    "### 10.2 Courses",
    "- (AC-057) filtered no-result shows Reset",
    "## 11. Teacher",
    "- (AC-130) teacher schedule view (FR-100)",
    "## 28. Marketing Sync",
    "- (AC-154) Run Full Sync shows toast",
    "- (AC-155) View Field Mapping modal",
    "- backed by FR-400",
  ].join("\n");

  const sub = (id: string, prdSections: string[]): SubsystemManifest["subsystems"][number] => ({
    id, name: id, ownedRoutes: [], ownedApiEndpoints: [], ownedCollections: [], ownedModules: ["m"], dependsOn: [], prdSections,
  });
  const orphanManifest: SubsystemManifest = {
    version: 1,
    subsystems: [sub("family", ["§10"]), sub("teacher", ["§11"])],
  };
  const flat = (res: { byDomain: Map<string, string[]> }) => [...res.byDomain.values()].flat();

  it("keeps section-claimed ids on their owning domain", () => {
    const { byDomain } = resolveDomainRequirementIds(ORPHAN_PRD, orphanManifest);
    expect(byDomain.get("family")).toEqual(["AC-041", "AC-045", "AC-057"]);
    expect(byDomain.get("teacher")).toEqual(expect.arrayContaining(["AC-130", "FR-100"]));
  });

  it("rescues ids from unclaimed sections into the numerically-nearest domain", () => {
    const res = resolveDomainRequirementIds(ORPHAN_PRD, orphanManifest);
    expect(res.orphanRequirementIds).toEqual(["AC-154", "AC-155", "FR-400"]);
    // |28-11| = 17 beats |28-10| = 18, so teacher absorbs the marketing orphans.
    expect(res.byDomain.get("teacher")).toEqual(expect.arrayContaining(["AC-154", "AC-155", "FR-400"]));
  });

  it("covers every PRD requirement id with nothing unrescuable", () => {
    const res = resolveDomainRequirementIds(ORPHAN_PRD, orphanManifest);
    expect(res.allRequirementIds).toEqual([
      "AC-041", "AC-045", "AC-057", "AC-130", "AC-154", "AC-155", "FR-100", "FR-400",
    ]);
    expect(res.unrescuableRequirementIds).toEqual([]);
    expect([...new Set(flat(res))].sort()).toEqual(res.allRequirementIds);
  });

  it("flags orphans as unrescuable when there are zero subsystems (gate trips)", () => {
    const res = resolveDomainRequirementIds(ORPHAN_PRD, { version: 1, subsystems: [] });
    expect(res.unrescuableRequirementIds).toEqual(res.allRequirementIds);
  });
});
