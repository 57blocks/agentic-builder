import { describe, expect, it } from "vitest";
import fs from "fs/promises";
import os from "os";
import path from "path";

import {
  collectSharedSectionAnchors,
  buildDependencyContracts,
  buildDomainMd,
  buildCombinedDomainSlice,
  writeDomainFiles,
} from "../domain-files";
import type { Subsystem } from "../types";

const PRD = `# PRD

## 7. 信息架构 (FR-001)

Global nav and routing map.

## 8. UI 组件库规格 (FR-012)

Button, Card, and Modal component specs.

## 10. 家庭端模块详细规格 (FR-045)

### 10.4 PrivateEnrollmentPage

The private enrollment page body.

## 13. 完整数据模型 (FR-285)

data model details.

## 14. 枚举值汇总 (FR-318)

status: pending | active | done

## 26. REST API 端点设计 (FR-367)

A very long API design chapter.
`;

function sub(over: Partial<Subsystem>): Subsystem {
  return {
    id: over.id ?? "x",
    name: over.name ?? "X",
    description: over.description,
    ownedRoutes: over.ownedRoutes ?? [],
    ownedApiEndpoints: over.ownedApiEndpoints ?? [],
    ownedCollections: over.ownedCollections ?? [],
    ownedModules: over.ownedModules ?? [],
    dependsOn: over.dependsOn ?? [],
    prdSections: over.prdSections ?? [],
  };
}

const CATALOG = sub({
  id: "catalog",
  name: "课程目录",
  ownedApiEndpoints: ["GET /api/v1/courses", "GET /api/v1/courses/:id"],
  ownedCollections: ["courses"],
  prdSections: ["§13"],
});
const ENROLLMENT = sub({
  id: "enrollment",
  name: "报名",
  dependsOn: ["catalog"],
  ownedApiEndpoints: ["POST /api/v1/enrollments"],
  prdSections: ["§10.4"],
});

describe("collectSharedSectionAnchors", () => {
  it("picks global spec chapters (component library, IA, enums) by heading", () => {
    const anchors = collectSharedSectionAnchors(PRD);
    expect(anchors).toContain("§7"); // 信息架构
    expect(anchors).toContain("§8"); // UI 组件库
    expect(anchors).toContain("§14"); // 枚举
  });

  it("excludes per-domain chapters and the full REST API chapter", () => {
    const anchors = collectSharedSectionAnchors(PRD);
    expect(anchors).not.toContain("§10"); // 家庭端模块 — owned per-domain
    expect(anchors).not.toContain("§26"); // REST API design — too big, use contracts
    expect(anchors).not.toContain("§13"); // data model — owned
  });
});

describe("buildDependencyContracts", () => {
  it("renders depended-on domains' endpoints + collections", () => {
    const md = buildDependencyContracts(ENROLLMENT, [ENROLLMENT, CATALOG]);
    expect(md).toContain("课程目录");
    expect(md).toContain("GET /api/v1/courses");
    expect(md).toContain("courses");
  });

  it("is empty when a domain has no upstream dependencies", () => {
    expect(buildDependencyContracts(CATALOG, [CATALOG, ENROLLMENT])).toBe("");
  });
});

describe("buildDomainMd", () => {
  it("injects Dependency Contracts and Shared / Global Specs sections", () => {
    const md = buildDomainMd(
      ENROLLMENT,
      [ENROLLMENT, CATALOG],
      1,
      "the private enrollment page body.",
      "## 8. UI 组件库规格\nButton, Card, and Modal component specs.",
    );
    expect(md).toContain("## Dependency Contracts");
    expect(md).toContain("GET /api/v1/courses");
    expect(md).toContain("## Shared / Global Specs");
    expect(md).toContain("UI 组件库规格");
  });

  it("notes absent dependencies and omits the shared block when empty", () => {
    const md = buildDomainMd(CATALOG, [CATALOG, ENROLLMENT], 0, "data model details.", "");
    expect(md).toContain("No upstream dependencies");
    expect(md).not.toContain("## Shared / Global Specs");
  });
});

describe("buildCombinedDomainSlice", () => {
  it("combines several domains' owned sections + contracts + ONE shared block, dropping other domains", () => {
    const md = buildCombinedDomainSlice(
      ["enrollment", "catalog"],
      [ENROLLMENT, CATALOG],
      PRD,
    );
    // both in-scope domains' owned sections present
    expect(md).toContain("报名"); // enrollment name
    expect(md).toContain("课程目录"); // catalog name
    expect(md).toContain("private enrollment page body"); // §10.4 owned body
    // enrollment depends on catalog → its contracts appear
    expect(md).toContain("Dependency Contracts");
    expect(md).toContain("GET /api/v1/courses");
    // shared block appears exactly once
    expect(md.split("## Shared / Global Specs").length - 1).toBe(1);
    expect(md).toContain("UI 组件库规格");
    // a domain NOT in scope contributes nothing extra
    expect(md).not.toContain("billing");
  });

  it("returns empty when no domain ids resolve", () => {
    expect(buildCombinedDomainSlice(["nope"], [CATALOG], PRD)).toBe("");
  });
});

describe("writeDomainFiles — end to end", () => {
  it("writes domain files carrying shared specs + contracts, without duplicating owned shared sections", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "domain-files-"));
    try {
      // catalog OWNS §8 here, so it must NOT get §8 re-injected as shared.
      const catalogOwnsUi = sub({
        ...CATALOG,
        prdSections: ["§8", "§13"],
      });
      const ok = await writeDomainFiles(
        dir,
        [catalogOwnsUi, ENROLLMENT],
        [["catalog"], ["enrollment"]],
        PRD,
      );
      expect(ok).toBe(true);

      const enrollmentMd = await fs.readFile(
        path.join(dir, "domain-enrollment.md"),
        "utf-8",
      );
      // enrollment does NOT own §8 → gets it as a shared spec, plus contracts.
      expect(enrollmentMd).toContain("## Shared / Global Specs");
      expect(enrollmentMd).toContain("UI 组件库规格");
      expect(enrollmentMd).toContain("## Dependency Contracts");
      expect(enrollmentMd).toContain("GET /api/v1/courses");

      const catalogMd = await fs.readFile(
        path.join(dir, "domain-catalog.md"),
        "utf-8",
      );
      // catalog OWNS §8 → it appears once (in PRD Sections), not duplicated in Shared.
      const sharedIdx = catalogMd.indexOf("## Shared / Global Specs");
      const sharedBlock = sharedIdx >= 0 ? catalogMd.slice(sharedIdx) : "";
      expect(sharedBlock).not.toContain("UI 组件库规格");
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});
