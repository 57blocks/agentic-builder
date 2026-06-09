import { describe, expect, it } from "vitest";

import { runPrdQualityGate } from "../prd-quality-gate";
import type { PrdPage, PrdSpec } from "@/lib/requirements/prd-spec-types";

function page(over: Partial<PrdPage> = {}): PrdPage {
  return {
    id: over.id ?? "PAGE-001",
    name: over.name ?? "Dashboard",
    route: over.route ?? "/dashboard",
    layoutRegions: over.layoutRegions ?? ["Header", "Body"],
    interactiveComponents: over.interactiveComponents ?? [
      {
        id: "CMP-001",
        name: "Refresh",
        type: "button",
        location: "Header",
        interaction: "Click",
        effect: "Reloads data",
      },
    ],
    staticElements: over.staticElements ?? ["Title"],
    states: over.states ?? ["loading", "empty", "error"],
  };
}

const GOOD_PRD = `# PRD
## Requirements
- AC-001: user can log in
- FR-001: dashboard lists items
## Pages
- IC-001 refresh button
`;

const THIN_PRD = `# PRD\nSome prose with no labeled requirements.`;

function spec(pages: PrdPage[], domain?: PrdSpec["domain"]): PrdSpec {
  return { pages, allComponentIds: [], domain };
}

describe("runPrdQualityGate — buildability (no spec)", () => {
  it("flags a thin PRD with no AC/FR as a blocker", () => {
    const r = runPrdQualityGate({ prdMarkdown: THIN_PRD });
    expect(r.specAnalyzed).toBe(false);
    expect(r.counts.blocker).toBeGreaterThanOrEqual(1);
    expect(r.passed).toBe(false);
    expect(r.findings.some((f) => f.dimension === "buildability")).toBe(true);
  });

  it("passes a PRD that has AC/FR and IC ids", () => {
    const r = runPrdQualityGate({ prdMarkdown: GOOD_PRD });
    expect(r.findings.filter((f) => f.dimension === "buildability")).toHaveLength(0);
    expect(r.passed).toBe(true);
    expect(r.score).toBe(100);
  });
});

describe("runPrdQualityGate — page checks", () => {
  it("blocks when there are no pages", () => {
    const r = runPrdQualityGate({ prdMarkdown: GOOD_PRD, spec: spec([]) });
    expect(r.specAnalyzed).toBe(true);
    expect(r.findings.some((f) => f.dimension === "page" && f.severity === "blocker")).toBe(true);
  });

  it("blocks a page with no route", () => {
    const r = runPrdQualityGate({
      prdMarkdown: GOOD_PRD,
      spec: spec([page({ route: "" })]),
    });
    const f = r.findings.find((x) => x.problem.includes("no route"));
    expect(f?.severity).toBe("blocker");
    expect(f?.downstreamImpact).toMatch(/404|runtime/i);
  });

  it("warns on duplicate routes", () => {
    const r = runPrdQualityGate({
      prdMarkdown: GOOD_PRD,
      spec: spec([page({ id: "PAGE-001" }), page({ id: "PAGE-002", name: "Other" })]),
    });
    expect(r.findings.some((f) => f.problem.includes("also used by"))).toBe(true);
  });

  it("warns on a page with no UI elements", () => {
    const r = runPrdQualityGate({
      prdMarkdown: GOOD_PRD,
      spec: spec([page({ interactiveComponents: [], staticElements: [] })]),
    });
    expect(r.findings.some((f) => f.problem.includes("no interactive components"))).toBe(true);
  });

  it("infos a data-bound page with no states", () => {
    const r = runPrdQualityGate({
      prdMarkdown: GOOD_PRD,
      spec: spec([page({ name: "Orders Table", states: [] })]),
    });
    expect(
      r.findings.some((f) => f.severity === "info" && f.problem.includes("no UI states")),
    ).toBe(true);
  });
});

describe("runPrdQualityGate — user-path & business-flow", () => {
  it("warns when there is no entry page", () => {
    const r = runPrdQualityGate({
      prdMarkdown: GOOD_PRD,
      spec: spec([page({ route: "/settings", name: "Settings" })]),
    });
    expect(r.findings.some((f) => f.dimension === "user-path")).toBe(true);
  });

  it("no user-path finding when a root entry exists", () => {
    const r = runPrdQualityGate({
      prdMarkdown: GOOD_PRD,
      spec: spec([page({ route: "/", name: "Home" })]),
    });
    expect(r.findings.some((f) => f.dimension === "user-path")).toBe(false);
  });

  it("flags a rule whose input variable is undeclared", () => {
    const r = runPrdQualityGate({
      prdMarkdown: GOOD_PRD,
      spec: spec([page({ route: "/" })], {
        variables: [{ id: "V-1", name: "score", description: "x" }],
        rules: [
          { id: "R-1", name: "norm", type: "piecewise-linear", inputVariableId: "V-999" },
        ],
      }),
    });
    const f = r.findings.find((x) => x.problem.includes("V-999"));
    expect(f?.dimension).toBe("business-flow");
    expect(f?.severity).toBe("warn");
  });
});

describe("runPrdQualityGate — workflow closure (flow-completeness)", () => {
  type Wf = NonNullable<NonNullable<PrdSpec["domain"]>["workflows"]>[number];
  function wf(over: Partial<Wf> = {}): Wf {
    return {
      id: over.id ?? "WF-1",
      entity: over.entity ?? "order",
      initial: over.initial ?? "pending",
      states: over.states ?? ["pending", "approved", "rejected"],
      transitions: over.transitions ?? [
        { from: "pending", to: "approved", action: "approve" },
        { from: "pending", to: "rejected", action: "reject" },
      ],
    };
  }
  const flowFindings = (s: PrdSpec) =>
    runPrdQualityGate({ prdMarkdown: GOOD_PRD, spec: s }).findings.filter(
      (f) => f.dimension === "flow-completeness",
    );

  it("a closed, reachable FSM with terminal states produces no flow findings", () => {
    expect(flowFindings(spec([page({ route: "/" })], { workflows: [wf()] }))).toHaveLength(0);
  });

  it("blocks when the workflow declares no states", () => {
    const f = flowFindings(spec([page({ route: "/" })], { workflows: [wf({ states: [], transitions: [] })] }));
    expect(f.some((x) => x.severity === "blocker" && x.problem.includes("no states"))).toBe(true);
  });

  it("blocks when the initial state is not among the declared states", () => {
    const f = flowFindings(spec([page({ route: "/" })], { workflows: [wf({ initial: "draft" })] }));
    expect(f.some((x) => x.severity === "blocker" && x.problem.includes("Initial state"))).toBe(true);
  });

  it("blocks a transition into an undeclared state (dangling edge)", () => {
    const f = flowFindings(
      spec([page({ route: "/" })], {
        workflows: [
          wf({
            transitions: [
              { from: "pending", to: "approved", action: "approve" },
              { from: "pending", to: "shipped", action: "ship" }, // shipped not declared
            ],
          }),
        ],
      }),
    );
    expect(f.some((x) => x.severity === "blocker" && x.problem.includes("shipped"))).toBe(true);
  });

  it("warns on a transition with no action/trigger", () => {
    const f = flowFindings(
      spec([page({ route: "/" })], {
        workflows: [
          wf({
            transitions: [
              { from: "pending", to: "approved", action: "" },
              { from: "pending", to: "rejected", action: "reject" },
            ],
          }),
        ],
      }),
    );
    expect(f.some((x) => x.severity === "warn" && x.problem.includes("no action"))).toBe(true);
  });

  it("warns when a declared state is unreachable from initial", () => {
    const f = flowFindings(
      spec([page({ route: "/" })], {
        workflows: [wf({ states: ["pending", "approved", "rejected", "archived"] })],
      }),
    );
    expect(f.some((x) => x.severity === "warn" && x.problem.includes("archived"))).toBe(true);
  });

  it("warns when the lifecycle has no terminal state (pure cycle)", () => {
    const f = flowFindings(
      spec([page({ route: "/" })], {
        workflows: [
          wf({
            states: ["on", "off"],
            initial: "on",
            transitions: [
              { from: "on", to: "off", action: "disable" },
              { from: "off", to: "on", action: "enable" },
            ],
          }),
        ],
      }),
    );
    expect(f.some((x) => x.severity === "warn" && x.problem.includes("no terminal state"))).toBe(true);
  });
});

describe("runPrdQualityGate — page reachability (user-path)", () => {
  function navCmp(name: string, effect: string): PrdPage["interactiveComponents"][number] {
    return { id: `CMP-${name}`, name, type: "button", location: "Body", interaction: "Click", effect };
  }
  const userPath = (s: PrdSpec) =>
    runPrdQualityGate({ prdMarkdown: GOOD_PRD, spec: s }).findings.filter(
      (f) => f.dimension === "user-path",
    );

  it("warns on a navigation control whose destination page doesn't exist", () => {
    const home = page({
      id: "PAGE-001",
      name: "Home",
      route: "/",
      interactiveComponents: [navCmp("Checkout", "navigate to the checkout page")],
    });
    const other = page({ id: "PAGE-002", name: "Profile", route: "/profile", interactiveComponents: [] });
    const f = userPath(spec([home, other]));
    expect(f.some((x) => x.severity === "warn" && x.problem.includes("Checkout"))).toBe(true);
  });

  it("does not warn when the navigation target resolves to a real page", () => {
    const home = page({
      id: "PAGE-001",
      name: "Home",
      route: "/",
      interactiveComponents: [navCmp("To Profile", "go to profile")],
    });
    const profile = page({ id: "PAGE-002", name: "Profile", route: "/profile", interactiveComponents: [] });
    const f = userPath(spec([home, profile]));
    expect(f.some((x) => x.severity === "warn")).toBe(false);
  });

  it("flags an orphan page once navigation is described but never reaches it", () => {
    const home = page({
      id: "PAGE-001",
      name: "Home",
      route: "/",
      interactiveComponents: [navCmp("To Profile", "go to profile")],
    });
    const profile = page({ id: "PAGE-002", name: "Profile", route: "/profile", interactiveComponents: [] });
    const settings = page({ id: "PAGE-003", name: "Settings", route: "/settings", interactiveComponents: [] });
    const f = userPath(spec([home, profile, settings]));
    expect(f.some((x) => x.severity === "info" && x.problem.includes("PAGE-003"))).toBe(true);
  });

  it("stays silent on orphans when the PRD describes no navigation at all", () => {
    const home = page({ id: "PAGE-001", name: "Home", route: "/", interactiveComponents: [] });
    const settings = page({ id: "PAGE-002", name: "Settings", route: "/settings", interactiveComponents: [] });
    const f = userPath(spec([home, settings]));
    expect(f.some((x) => x.problem.includes("No described navigation reaches"))).toBe(false);
  });

  it("ignores external links (http URLs) when flagging dead navigation", () => {
    const home = page({
      id: "PAGE-001",
      name: "Home",
      route: "/",
      interactiveComponents: [navCmp("Docs", "redirect to https://example.com/docs")],
    });
    const other = page({ id: "PAGE-002", name: "Profile", route: "/profile", interactiveComponents: [] });
    const f = userPath(spec([home, other]));
    expect(f.some((x) => x.severity === "warn" && x.problem.includes("Docs"))).toBe(false);
  });
});

describe("runPrdQualityGate — report shape", () => {
  it("ids findings sequentially and computes counts/score", () => {
    const r = runPrdQualityGate({
      prdMarkdown: THIN_PRD,
      spec: spec([page({ route: "" })]),
    });
    expect(r.findings[0].id).toBe("PQ-001");
    expect(r.counts.blocker + r.counts.warn + r.counts.info).toBe(r.findings.length);
    expect(r.score).toBeLessThan(100);
    expect(r.gateId).toBe("prd-quality");
  });
});
