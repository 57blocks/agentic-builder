import { describe, it, expect } from "vitest";
import { buildPrototypeBreakdownContext } from "../prototype-breakdown-context";
import type { PrototypeMarker } from "@/lib/pipeline/prototype-marker";
import type { PrdSpec } from "@/lib/requirements/prd-spec-types";

const marker: PrototypeMarker = {
  generatedAt: "t", scaffoldTier: "M", scopeTier: "M", baseScaffoldCopied: true,
  pages: [
    { pageId: "PAGE-001", route: "/", source: "demo-html", file: "src/views/Home.tsx" },
    { pageId: "PAGE-002", route: "/about", source: "url", file: "src/views/About.tsx" },
  ],
  generatedFiles: ["frontend/src/views/Home.tsx", "frontend/src/views/About.tsx"],
};

const prdSpec: PrdSpec = {
  allComponentIds: ["CMP-001", "CMP-002"],
  pages: [
    {
      id: "PAGE-001",
      name: "Home",
      route: "/",
      layoutRegions: ["Header", "Body"],
      staticElements: [],
      states: [],
      interactiveComponents: [
        { id: "CMP-001", name: "Search input", type: "input", location: "Header", interaction: "Type", effect: "Filters list" },
        { id: "CMP-002", name: "Submit button", type: "button", location: "Body", interaction: "Click", effect: "Submits form" },
      ],
    },
    {
      id: "PAGE-002",
      name: "About",
      route: "/about",
      layoutRegions: ["Body"],
      staticElements: [],
      states: [],
      interactiveComponents: [],
    },
  ],
};

describe("buildPrototypeBreakdownContext", () => {
  it("returns '' for no marker (legacy path unchanged)", () => {
    expect(buildPrototypeBreakdownContext(null)).toBe("");
  });
  it("lists each prototype page as an already-created file to MODIFY, with frontend-relative path", () => {
    const ctx = buildPrototypeBreakdownContext(marker);
    expect(ctx.toLowerCase()).toContain("already");
    expect(ctx).toContain("frontend/src/views/Home.tsx");
    expect(ctx).toContain("frontend/src/views/About.tsx");
    expect(ctx.toLowerCase()).toContain("modifies");
    expect(ctx.toLowerCase()).toContain("do not");
  });
  it("returns '' when the marker has no pages", () => {
    expect(buildPrototypeBreakdownContext({ ...marker, pages: [] })).toBe("");
  });

  it("declares already-inlined CMP-* ids per page when prdSpec is supplied", () => {
    const ctx = buildPrototypeBreakdownContext(marker, prdSpec);
    expect(ctx).toContain("CMP-001, CMP-002");
    expect(ctx.toLowerCase()).toContain("already implemented");
    expect(ctx).toContain("Do NOT emit a task whose `files.creates`");
  });

  it("omits the component block for a page with no interactive components", () => {
    const ctx = buildPrototypeBreakdownContext(marker, prdSpec);
    // PAGE-002 (About) has no interactiveComponents — its row has no cmp suffix.
    expect(ctx).toContain("frontend/src/views/About.tsx  (route /about)\n");
  });

  it("is byte-for-byte identical to the no-prdSpec output when prdSpec is omitted", () => {
    expect(buildPrototypeBreakdownContext(marker)).toBe(
      buildPrototypeBreakdownContext(marker, undefined),
    );
    expect(buildPrototypeBreakdownContext(marker)).not.toContain("CMP-");
  });

  it("does not crash and adds no component block when no marker page matches a PrdSpec page id", () => {
    const unrelatedSpec: PrdSpec = { allComponentIds: [], pages: [] };
    const ctx = buildPrototypeBreakdownContext(marker, unrelatedSpec);
    expect(ctx).not.toContain("CMP-");
    expect(ctx).toContain("frontend/src/views/Home.tsx");
  });
});
