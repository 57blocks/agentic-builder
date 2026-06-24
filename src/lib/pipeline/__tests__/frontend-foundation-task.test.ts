import { describe, expect, it } from "vitest";

import { ensureFrontendFoundationTask } from "../frontend-foundation-task";
import type { KickoffWorkItem, TaskFilePlan } from "../types";

function task(
  id: string,
  phase: string,
  creates: string[],
  extra: Partial<KickoffWorkItem> = {},
): KickoffWorkItem {
  return {
    id,
    phase,
    title: `Task ${id}`,
    description: "",
    estimatedHours: 2,
    executionKind: "ai_autonomous",
    files: { creates, modifies: [], reads: [] },
    ...extra,
  };
}

const creates = (t: KickoffWorkItem) => (t.files as TaskFilePlan).creates ?? [];
const reads = (t: KickoffWorkItem) => (t.files as TaskFilePlan).reads ?? [];

describe("ensureFrontendFoundationTask", () => {
  it("is a no-op for backend-only projects", () => {
    const tasks = [
      task("T-001", "Backend", ["backend/src/models/User.ts"]),
      task("T-002", "Backend", ["backend/src/api/modules/index.ts"]),
    ];
    expect(ensureFrontendFoundationTask(tasks)).toEqual(tasks);
  });

  it("augments an existing app-shell task instead of duplicating it", () => {
    const tasks = [
      task("T-001", "Frontend", ["frontend/src/router.tsx"], {
        title: "Setup shell",
      }),
      task("T-002", "Frontend", ["frontend/src/views/HomePage.tsx"]),
    ];
    const out = ensureFrontendFoundationTask(tasks);

    // No new task added, ids preserved.
    expect(out).toHaveLength(2);
    expect(out.map((t) => t.id)).toEqual(["T-001", "T-002"]);

    const shell = out.find((t) => t.id === "T-001")!;
    // Shell keeps router.tsx and gains tokens. shadcn primitives are
    // pre-installed by the scaffold, so the Foundation no longer CREATES them.
    expect(creates(shell)).toContain("frontend/src/router.tsx");
    expect(creates(shell)).toContain("frontend/src/styles/tokens.css");
    expect(creates(shell)).not.toContain("frontend/src/components/ui/Button.tsx");
    expect(creates(shell)).not.toContain("frontend/src/components/ui/index.ts");
    expect(shell.priority).toBe("P0");
    // Contract now points at the pre-installed shadcn primitives + token-first.
    expect(shell.description).toContain("@/components/ui");
    // router.tsx is created exactly once across all tasks.
    const routerOwners = out.filter((t) =>
      creates(t).includes("frontend/src/router.tsx"),
    );
    expect(routerOwners).toHaveLength(1);
  });

  it("synthesises a Foundation task when no shell exists, and renumbers", () => {
    const tasks = [
      task("T-001", "Frontend", ["frontend/src/views/HomePage.tsx"]),
      task("T-002", "Frontend", ["frontend/src/views/AboutPage.tsx"]),
    ];
    const out = ensureFrontendFoundationTask(tasks);

    expect(out).toHaveLength(3);
    // Renumbered to a clean sequence, foundation first.
    expect(out.map((t) => t.id)).toEqual(["T-001", "T-002", "T-003"]);
    const foundation = out[0];
    expect(foundation.priority).toBe("P0");
    expect(creates(foundation)).toContain("frontend/src/router.tsx");
    expect(creates(foundation)).toContain("frontend/src/styles/tokens.css");
    expect(foundation.dependencies).toEqual([]);
  });

  it("wires page tasks to read the tokens + UI barrel", () => {
    const tasks = [
      task("T-001", "Frontend", ["frontend/src/router.tsx"]),
      task("T-002", "Frontend", ["frontend/src/views/HomePage.tsx"]),
    ];
    const out = ensureFrontendFoundationTask(tasks);
    const page = out.find((t) => t.id === "T-002")!;
    expect(reads(page)).toContain("frontend/src/styles/tokens.css");
    expect(reads(page)).toContain("frontend/src/components/ui/index.ts");
    // The foundation/host task does not read its own outputs.
    const shell = out.find((t) => t.id === "T-001")!;
    expect(reads(shell)).not.toContain("frontend/src/components/ui/index.ts");
  });

  it("never creates a file already owned by another task", () => {
    const tasks = [
      task("T-001", "Frontend", ["frontend/src/router.tsx"]),
      // Another task already owns Button.
      task("T-002", "Frontend", ["frontend/src/components/ui/Button.tsx"]),
      task("T-003", "Frontend", ["frontend/src/views/HomePage.tsx"]),
    ];
    const out = ensureFrontendFoundationTask(tasks);
    const buttonOwners = out.filter((t) =>
      creates(t).includes("frontend/src/components/ui/Button.tsx"),
    );
    expect(buttonOwners).toHaveLength(1);
    expect(buttonOwners[0].id).toBe("T-002");
  });

  it("is idempotent", () => {
    const tasks = [
      task("T-001", "Frontend", ["frontend/src/router.tsx"]),
      task("T-002", "Frontend", ["frontend/src/views/HomePage.tsx"]),
    ];
    const once = ensureFrontendFoundationTask(tasks);
    const twice = ensureFrontendFoundationTask(once);
    expect(twice).toEqual(once);
  });
});
