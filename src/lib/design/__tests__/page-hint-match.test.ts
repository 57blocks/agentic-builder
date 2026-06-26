import { describe, it, expect } from "vitest";
import { pageHintOwnsRoute } from "../page-hint-match";

describe("pageHintOwnsRoute", () => {
  it("matches the bare manual hint (per-card / drag capture)", () => {
    expect(pageHintOwnsRoute("PAGE-003", "PAGE-003")).toBe(true);
  });

  it("matches the enriched auto-match hint (the regression: PAGE-id is one token)", () => {
    // server buildEnrichedPageHint output: "PAGE-003 dashboard family"
    expect(pageHintOwnsRoute("PAGE-003 dashboard family", "PAGE-003")).toBe(true);
    // PAGE-id can appear after name tokens too
    expect(pageHintOwnsRoute("dashboard family PAGE-003", "PAGE-003")).toBe(true);
  });

  it("is case-insensitive on the id token", () => {
    expect(pageHintOwnsRoute("page-003 dashboard", "PAGE-003")).toBe(true);
  });

  it("does NOT match a different route id", () => {
    expect(pageHintOwnsRoute("PAGE-003 dashboard", "PAGE-001")).toBe(false);
  });

  it("does NOT substring-match (PAGE-03 must not own PAGE-003 and vice-versa)", () => {
    expect(pageHintOwnsRoute("PAGE-003 dashboard", "PAGE-03")).toBe(false);
    expect(pageHintOwnsRoute("PAGE-3", "PAGE-003")).toBe(false);
  });

  it("returns false for empty / missing hints", () => {
    expect(pageHintOwnsRoute("", "PAGE-001")).toBe(false);
    expect(pageHintOwnsRoute(null, "PAGE-001")).toBe(false);
    expect(pageHintOwnsRoute(undefined, "PAGE-001")).toBe(false);
  });
});
