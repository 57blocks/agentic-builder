import { describe, it, expect } from "vitest";
import { buildPrototypeBreakdownContext } from "../prototype-breakdown-context";
import type { PrototypeMarker } from "@/lib/pipeline/prototype-marker";

const marker: PrototypeMarker = {
  generatedAt: "t", scaffoldTier: "M", scopeTier: "M", baseScaffoldCopied: true,
  pages: [
    { pageId: "PAGE-001", route: "/", source: "demo-html", file: "src/views/Home.tsx" },
    { pageId: "PAGE-002", route: "/about", source: "url", file: "src/views/About.tsx" },
  ],
  generatedFiles: ["frontend/src/views/Home.tsx", "frontend/src/views/About.tsx"],
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
});
