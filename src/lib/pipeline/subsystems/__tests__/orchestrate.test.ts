import { describe, expect, it } from "vitest";

import {
  assignTasksToSubsystems,
  closeOverDependencies,
  planSubsystemBuilds,
  runSubsystemBuilds,
  type SubsystemBuildPlan,
  type SubsystemBuildStep,
} from "../orchestrate";
import type { SubsystemManifest } from "../types";
import type { KickoffWorkItem } from "../../types";

function task(id: string, opts: Partial<KickoffWorkItem> = {}): KickoffWorkItem {
  return {
    id,
    phase: opts.phase ?? "Backend Services",
    title: id,
    description: "",
    estimatedHours: 1,
    executionKind: "ai_autonomous",
    ...opts,
  };
}

// Minimal 3-domain manifest: auth ← enrollment ← billing.
const MANIFEST: SubsystemManifest = {
  version: 1,
  subsystems: [
    { id: "auth", name: "auth", ownedRoutes: ["/auth"], ownedApiEndpoints: ["POST /api/v1/auth/login"], ownedCollections: [], ownedModules: ["backend/src/api/modules/auth"], dependsOn: [], prdSections: [] },
    { id: "enrollment", name: "enrollment", ownedRoutes: ["/cart"], ownedApiEndpoints: ["POST /api/v1/enrollments"], ownedCollections: [], ownedModules: ["backend/src/api/modules/enrollments"], dependsOn: ["auth"], prdSections: [] },
    { id: "billing", name: "billing", ownedRoutes: ["/billing"], ownedApiEndpoints: ["GET /api/v1/bills"], ownedCollections: [], ownedModules: ["backend/src/api/modules/bills"], dependsOn: ["enrollment"], prdSections: [] },
  ],
};

describe("assignTasksToSubsystems", () => {
  it("assigns by explicit subsystem tag, then by ownedModules file prefix, else unassigned", () => {
    const tasks = [
      task("t-auth", { subsystem: "auth" }),
      task("t-enr", { files: { creates: ["backend/src/api/modules/enrollments/enrollments.routes.ts"], modifies: [], reads: [] } }),
      task("t-bill", { files: ["backend/src/api/modules/bills/bills.controller.ts"] }),
      task("t-shared", { files: { creates: ["backend/src/models/User.ts"], modifies: [], reads: [] } }),
    ];
    const { bySubsystem, unassigned } = assignTasksToSubsystems(tasks, MANIFEST);
    expect(bySubsystem.get("auth")).toEqual(["t-auth"]);
    expect(bySubsystem.get("enrollment")).toEqual(["t-enr"]);
    expect(bySubsystem.get("billing")).toEqual(["t-bill"]);
    expect(unassigned).toEqual(["t-shared"]); // shared model → foundation, not a subsystem
  });
});

describe("closeOverDependencies", () => {
  it("pulls in transitive deps and drops ids outside the task list", () => {
    const tasks = [
      task("a", { dependencies: ["b"] }),
      task("b", { dependencies: ["c", "external"] }),
      task("c"),
      task("d"),
    ];
    const closed = closeOverDependencies(["a"], tasks).sort();
    expect(closed).toEqual(["a", "b", "c"]); // not d, "external" dropped
  });
});

describe("planSubsystemBuilds", () => {
  it("lays out topological layers with per-subsystem task subsets incl. deps", () => {
    const tasks = [
      task("auth-1", { subsystem: "auth" }),
      task("enr-1", { subsystem: "enrollment", dependencies: ["auth-1"] }),
      task("bill-1", { subsystem: "billing", dependencies: ["enr-1"] }),
      task("foundation", { files: { creates: ["backend/src/models/User.ts"], modifies: [], reads: [] } }),
    ];
    const plan = planSubsystemBuilds(MANIFEST, tasks);
    expect(plan.errors).toEqual([]);
    expect(plan.layers.map((l) => l.map((s) => s.subsystemId))).toEqual([
      ["auth"],
      ["enrollment"],
      ["billing"],
    ]);
    // billing's subset includes its transitive deps (enr-1, auth-1), original order preserved
    const billing = plan.layers[2][0];
    expect(billing.taskIds).toEqual(["auth-1", "enr-1", "bill-1"]);
    expect(plan.unassignedTaskIds).toEqual(["foundation"]);
  });

  it("returns errors (and no layers) for an invalid manifest", () => {
    const bad: SubsystemManifest = {
      version: 1,
      subsystems: [{ id: "x", name: "x", ownedRoutes: [], ownedApiEndpoints: [], ownedCollections: [], ownedModules: [], dependsOn: ["ghost"], prdSections: [] }],
    };
    const plan = planSubsystemBuilds(bad, []);
    expect(plan.layers).toEqual([]);
    expect(plan.errors.length).toBeGreaterThan(0);
  });
});

describe("runSubsystemBuilds", () => {
  const plan: SubsystemBuildPlan = {
    layers: [
      [{ layer: 0, subsystemId: "auth", taskIds: ["auth-1"], dependsOn: [], scopeEndpoints: [] }],
      [{ layer: 1, subsystemId: "enrollment", taskIds: ["enr-1"], dependsOn: ["auth"], scopeEndpoints: [] }],
      [{ layer: 2, subsystemId: "billing", taskIds: ["bill-1"], dependsOn: ["enrollment"], scopeEndpoints: [] }],
    ],
    unassignedTaskIds: [],
    errors: [],
  };

  it("runs layers in order, skips already-done, records each result", async () => {
    const ran: string[] = [];
    const results = await runSubsystemBuilds(
      plan,
      async (step: SubsystemBuildStep) => {
        ran.push(step.subsystemId);
        return { ok: true };
      },
      { alreadyDone: new Set(["auth"]) },
    );
    expect(ran).toEqual(["enrollment", "billing"]); // auth skipped
    expect(results.map((r) => `${r.subsystemId}:${r.status}`)).toEqual([
      "auth:skipped",
      "enrollment:completed",
      "billing:completed",
    ]);
  });

  it("blocks only the failed domain's transitive dependents (not the whole run)", async () => {
    const ran: string[] = [];
    const results = await runSubsystemBuilds(plan, async (step) => {
      ran.push(step.subsystemId);
      return { ok: step.subsystemId !== "enrollment" };
    });
    // enrollment failed → billing (depends on enrollment) is blocked, NOT run.
    expect(ran).toEqual(["auth", "enrollment"]); // billing never attempted
    const byId = new Map(results.map((r) => [r.subsystemId, r.status]));
    expect(byId.get("auth")).toBe("completed");
    expect(byId.get("enrollment")).toBe("failed");
    expect(byId.get("billing")).toBe("blocked"); // recorded, not silently dropped
  });

  it("still builds INDEPENDENT domains when an unrelated domain fails", async () => {
    // auth fails; reports (depends only on auth → blocked) but messaging
    // (independent) must still build.
    const independentPlan: SubsystemBuildPlan = {
      layers: [
        [{ layer: 0, subsystemId: "auth", taskIds: ["a"], dependsOn: [], scopeEndpoints: [] }],
        [
          { layer: 1, subsystemId: "reports", taskIds: ["r"], dependsOn: ["auth"], scopeEndpoints: [] },
          { layer: 1, subsystemId: "messaging", taskIds: ["m"], dependsOn: [], scopeEndpoints: [] },
        ],
      ],
      unassignedTaskIds: [],
      errors: [],
    };
    const ran: string[] = [];
    const results = await runSubsystemBuilds(independentPlan, async (step) => {
      ran.push(step.subsystemId);
      return { ok: step.subsystemId !== "auth" };
    });
    expect(ran).toContain("messaging"); // independent domain still built
    const byId = new Map(results.map((r) => [r.subsystemId, r.status]));
    expect(byId.get("auth")).toBe("failed");
    expect(byId.get("reports")).toBe("blocked"); // depends on failed auth
    expect(byId.get("messaging")).toBe("completed"); // independent → built
  });
});
