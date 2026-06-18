import { describe, it, expect } from "vitest";
import {
  isDataNeedingControl,
  inferControlResource,
  getReadResources,
  auditEndpointCompleteness,
  formatCompletenessForReviewer,
} from "../endpoint-completeness";
import type { PrdSpec, PrdInteractiveComponent } from "@/lib/requirements/prd-spec-types";
import { parseEndpointsRegistry } from "@/lib/pipeline/endpoints-registry";

const cmp = (over: Partial<PrdInteractiveComponent>): PrdInteractiveComponent => ({
  id: "CMP-001",
  name: "Button",
  type: "button",
  location: "Body",
  interaction: "Click",
  effect: "does a thing",
  ...over,
});

// A schema whose ENDPOINTS lacks any GET /users (the real taskflow gap).
const SCHEMA_NO_USERS = `
export const ENDPOINTS = {
  "POST /tasks": { request: "CreateTaskRequest", response: "Task", auth: "cookie" },
  "GET /tasks": { request: null, response: "TaskListResponse", auth: "cookie" },
  "GET /projects": { request: null, response: "ProjectListResponse", auth: "cookie" },
} as const;
`;

const SCHEMA_WITH_USERS = `
export const ENDPOINTS = {
  "GET /tasks": { request: null, response: "TaskListResponse", auth: "cookie" },
  "GET /users/team-members": { request: null, response: "TeamMembersResponse", auth: "cookie" },
} as const;
`;

describe("isDataNeedingControl", () => {
  it("flags select/list/dropdown control types", () => {
    expect(isDataNeedingControl(cmp({ type: "select" }))).toBe(true);
    expect(isDataNeedingControl(cmp({ type: "list" }))).toBe(true);
    expect(isDataNeedingControl(cmp({ type: "autocomplete" }))).toBe(true);
  });
  it("flags controls whose text signals a data fetch (bilingual)", () => {
    expect(
      isDataNeedingControl(cmp({ name: "负责人选择器", type: "form" })),
    ).toBe(true);
    expect(
      isDataNeedingControl(cmp({ name: "Assignee dropdown", type: "input" })),
    ).toBe(true);
  });
  it("does NOT flag a plain action button", () => {
    expect(isDataNeedingControl(cmp({ name: "Save", type: "button" }))).toBe(
      false,
    );
  });
});

describe("inferControlResource", () => {
  it("maps assignee/member labels to the user resource", () => {
    expect(inferControlResource(cmp({ name: "负责人选择器" }))).toBe("user");
    expect(inferControlResource(cmp({ name: "Assignee dropdown" }))).toBe("user");
    expect(inferControlResource(cmp({ name: "成员头像列表" }))).toBe("user");
  });
  it("returns null when no known resource is referenced", () => {
    expect(inferControlResource(cmp({ name: "Mystery widget" }))).toBe(null);
  });
});

describe("getReadResources", () => {
  it("extracts singularised path resources from GET endpoints", () => {
    const eps = parseEndpointsRegistry(SCHEMA_WITH_USERS)!;
    const res = getReadResources(eps);
    expect(res.has("tasks")).toBe(true);
    expect(res.has("task")).toBe(true);
    expect(res.has("users")).toBe(true);
    expect(res.has("team-members")).toBe(true);
  });
});

describe("auditEndpointCompleteness", () => {
  const prd: PrdSpec = {
    allComponentIds: ["CMP-09"],
    pages: [
      {
        id: "PAGE-06",
        name: "Project Board",
        route: "/board",
        layoutRegions: [],
        staticElements: [],
        states: [],
        interactiveComponents: [
          cmp({ id: "CMP-09", name: "负责人选择器", type: "select" }),
          cmp({ id: "CMP-10", name: "Save button", type: "button" }),
        ],
      },
    ],
  };

  it("flags the assignee dropdown when no GET /users exists (taskflow gap)", () => {
    const r = auditEndpointCompleteness(prd, SCHEMA_NO_USERS);
    expect(r.hasRegistry).toBe(true);
    expect(r.findings.map((f) => f.resource)).toContain("user");
    expect(r.findings[0].componentId).toBe("CMP-09");
    // demand captures the data-needing control; the button is excluded
    expect(r.demand.map((d) => d.id)).toEqual(["CMP-09"]);
  });

  it("does NOT flag when a covering GET endpoint exists", () => {
    const r = auditEndpointCompleteness(prd, SCHEMA_WITH_USERS);
    expect(r.findings).toEqual([]);
  });

  it("returns hasRegistry=false (no judgement) when the registry is absent", () => {
    const r = auditEndpointCompleteness(prd, "export interface Foo { id: string }");
    expect(r.hasRegistry).toBe(false);
    expect(r.findings).toEqual([]);
  });
});

describe("formatCompletenessForReviewer", () => {
  it("renders demand, supply, and gaps for the prompt", () => {
    const prd: PrdSpec = {
      allComponentIds: ["CMP-09"],
      pages: [
        {
          id: "PAGE-06",
          name: "Board",
          route: "/b",
          layoutRegions: [],
          staticElements: [],
          states: [],
          interactiveComponents: [
            cmp({ id: "CMP-09", name: "Assignee dropdown", type: "select" }),
          ],
        },
      ],
    };
    const block = formatCompletenessForReviewer(
      auditEndpointCompleteness(prd, SCHEMA_NO_USERS),
    );
    expect(block).toMatch(/SUPPLY/);
    expect(block).toMatch(/DEMAND/);
    expect(block).toMatch(/CMP-09/);
    expect(block).toMatch(/read endpoint missing/i);
  });
});
