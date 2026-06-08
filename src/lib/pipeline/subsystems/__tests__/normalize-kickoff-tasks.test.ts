import { describe, expect, it } from "vitest";
import fs from "fs";

import { normalizeKickoffTasks } from "../normalize-kickoff-tasks";
import type { SubsystemManifest } from "../types";
import type { KickoffWorkItem } from "../../types";

function t(over: Partial<KickoffWorkItem>): KickoffWorkItem {
  return {
    id: over.id ?? "T-001",
    phase: over.phase ?? "Backend Services",
    title: over.title ?? "x",
    description: "",
    estimatedHours: 1,
    executionKind: "ai_autonomous",
    ...over,
  } as KickoffWorkItem;
}

const MANIFEST: SubsystemManifest = {
  version: 1,
  subsystems: [
    { id: "catalog", name: "Catalog", ownedRoutes: [], ownedApiEndpoints: [], ownedCollections: [], ownedModules: ["backend/src/api/modules/courses", "frontend/src/pages/family/courses"], dependsOn: [], prdSections: [] },
    { id: "billing", name: "Billing", ownedRoutes: [], ownedApiEndpoints: [], ownedCollections: [], ownedModules: ["backend/src/api/modules/bills", "frontend/src/pages/family/billing"], dependsOn: [], prdSections: [] },
  ],
};

describe("normalizeKickoffTasks", () => {
  it("dedupes by title, tags by file path, leaves foundation shared, re-ids", () => {
    const tasks: KickoffWorkItem[] = [
      // foundation, duplicated across two passes (colliding id T-001)
      t({ id: "T-001", phase: "Scaffolding", title: "Initialize monorepo", files: { creates: ["package.json"], modifies: [], reads: [] }, dependencies: [] }),
      t({ id: "T-001", phase: "Scaffolding", title: "Initialize Monorepo", files: { creates: ["tsconfig.json"], modifies: [], reads: [] }, dependencies: [] }),
      // catalog backend task, untagged, depends on foundation (T-001)
      t({ id: "T-002", phase: "Backend Services", title: "Courses API", files: { creates: ["backend/src/api/modules/courses/index.ts"], modifies: [], reads: [] }, dependencies: ["T-001"] }),
      // billing frontend task, already tagged
      t({ id: "T-003", phase: "Frontend", subsystem: "billing", title: "Billing page", files: { creates: ["frontend/src/pages/family/billing/Page.tsx"], modifies: [], reads: [] }, dependencies: ["T-001"] }),
      // unresolvable (no module match, not foundation)
      t({ id: "T-004", phase: "Backend Services", title: "Mystery task", files: { creates: ["backend/src/api/modules/unknown/x.ts"], modifies: [], reads: [] }, dependencies: [] }),
    ];

    const { tasks: out, report } = normalizeKickoffTasks(tasks, MANIFEST);

    // dedupe: the two "Initialize monorepo" collapse into one
    expect(report.before).toBe(5);
    expect(report.after).toBe(4);
    expect(report.duplicatesRemoved).toBe(1);
    // merged foundation task unions both files
    const found = out.find((x) => /initialize monorepo/i.test(x.title))!;
    expect((found.files as { creates: string[] }).creates.sort()).toEqual(["package.json", "tsconfig.json"]);
    // catalog task tagged by file path
    expect(out.find((x) => x.title === "Courses API")!.subsystem).toBe("catalog");
    // already-tagged preserved
    expect(out.find((x) => x.title === "Billing page")!.subsystem).toBe("billing");
    // foundation stays shared (untagged)
    expect(found.subsystem).toBeUndefined();
    expect(report.foundationShared).toBe(1);
    expect(report.newlyTagged).toBe(1);
    expect(report.alreadyTagged).toBe(1);
    expect(report.unresolved).toEqual(["Mystery task"]);
    // unique ids
    expect(new Set(out.map((x) => x.id)).size).toBe(out.length);
    // dependency on colliding T-001 remapped to the foundation task
    expect(out.find((x) => x.title === "Courses API")!.dependencies).toEqual([found.id]);
  });
});

// Dry-run against the user's real snapshot when present (no hard data asserts).
const REAL = "/Users/57block/Downloads/test-x/.blueprint";
describe.runIf(fs.existsSync(`${REAL}/last-kickoff-snapshot.json`))(
  "normalizeKickoffTasks — dry run on test-x",
  () => {
    it("reports the repair plan", () => {
      const snap = JSON.parse(fs.readFileSync(`${REAL}/last-kickoff-snapshot.json`, "utf8"));
      const manifest = JSON.parse(fs.readFileSync(`${REAL}/subsystems.json`, "utf8"));
      const { tasks, report } = normalizeKickoffTasks(snap.tasks, manifest);
      const byDomain: Record<string, number> = {};
      let untagged = 0;
      for (const t of tasks) {
        if (t.subsystem) byDomain[t.subsystem] = (byDomain[t.subsystem] ?? 0) + 1;
        else untagged++;
      }
      // eslint-disable-next-line no-console
      console.log("\n[dry-run] report:", JSON.stringify(report, null, 2));
      // eslint-disable-next-line no-console
      console.log("[dry-run] tasks/domain:", JSON.stringify(byDomain, null, 2), "| shared/untagged:", untagged);
      expect(report.after).toBeLessThanOrEqual(report.before);
    });
  },
);
