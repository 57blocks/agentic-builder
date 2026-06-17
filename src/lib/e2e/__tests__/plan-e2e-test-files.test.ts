import { describe, it, expect } from "vitest";
import {
  routeToSpecSlug,
  planE2eTestFiles,
  formatScenarioForGeneration,
} from "../prd-e2e-spec";
import type { PrdE2eScenario, PrdE2eSpec } from "../prd-e2e-spec";

const scenario = (over: Partial<PrdE2eScenario>): PrdE2eScenario => ({
  id: "S-1",
  title: "Do a thing",
  route: "/board",
  persona: "member",
  priority: "P0",
  preconditions: [],
  expectedOutcome: "it works",
  coversRequirementIds: [],
  steps: [{ action: "click", target: "button", assertion: "visible" }],
  ...over,
});

const spec = (scenarios: PrdE2eScenario[]): PrdE2eSpec => ({
  personas: [],
  notes: [],
  scenarios,
});

describe("routeToSpecSlug", () => {
  it("slugifies routes, dropping params and leading slash", () => {
    expect(routeToSpecSlug("/board")).toBe("board");
    expect(routeToSpecSlug("/projects/:id")).toBe("projects");
    expect(routeToSpecSlug("/users/:id/settings")).toBe("users-settings");
    expect(routeToSpecSlug("/")).toBe("home");
    expect(routeToSpecSlug("")).toBe("home");
  });
});

describe("planE2eTestFiles", () => {
  it("groups scenarios by route into one spec file per route", () => {
    const groups = planE2eTestFiles(
      spec([
        scenario({ id: "S-1", route: "/board" }),
        scenario({ id: "S-2", route: "/board" }),
        scenario({ id: "S-3", route: "/dashboard" }),
      ]),
    );
    expect(groups).toHaveLength(2);
    const board = groups.find((g) => g.fileName.includes("board"))!;
    expect(board.fileName).toBe("frontend/e2e/board.spec.ts");
    expect(board.scenarios.map((s) => s.id)).toEqual(["S-1", "S-2"]);
    expect(groups.find((g) => g.fileName.includes("dashboard"))!.scenarios).toHaveLength(1);
  });

  it("splits a route with more than maxPerFile scenarios into numbered chunks", () => {
    const many = Array.from({ length: 7 }, (_, i) =>
      scenario({ id: `S-${i}`, route: "/board" }),
    );
    const groups = planE2eTestFiles(spec(many), { maxPerFile: 3 });
    // 7 scenarios / 3 per file = 3 files (3,3,1)
    expect(groups.map((g) => g.fileName)).toEqual([
      "frontend/e2e/board-1.spec.ts",
      "frontend/e2e/board-2.spec.ts",
      "frontend/e2e/board-3.spec.ts",
    ]);
    expect(groups[0].scenarios).toHaveLength(3);
    expect(groups[2].scenarios).toHaveLength(1);
    // every scenario is covered exactly once
    expect(groups.flatMap((g) => g.scenarios).length).toBe(7);
  });

  it("produces one file per route (scales with app, not with token budget)", () => {
    const routes = ["/a", "/b", "/c", "/d", "/e"];
    const groups = planE2eTestFiles(
      spec(routes.map((r, i) => scenario({ id: `S-${i}`, route: r }))),
    );
    expect(groups).toHaveLength(5);
  });
});

describe("formatScenarioForGeneration", () => {
  it("renders id, route, steps and expected outcome", () => {
    const block = formatScenarioForGeneration(
      scenario({
        id: "S-9",
        title: "Create task",
        route: "/board",
        coversRequirementIds: ["FR-TS-01"],
        steps: [
          { action: "click", target: "Add task", assertion: "input shown" },
          { action: "type", target: "title field", assertion: "card appears" },
        ],
      }),
    );
    expect(block).toMatch(/S-9: Create task \[P0\]/);
    expect(block).toMatch(/Route: \/board/);
    expect(block).toMatch(/1\. click → Add task/);
    expect(block).toMatch(/Covers: FR-TS-01/);
  });
});
