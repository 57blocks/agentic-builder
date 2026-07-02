// src/lib/pipeline/__tests__/coding-prototype-guard.test.ts
import { describe, it, expect } from "vitest";
import { shouldSkipBaseCopy } from "@/lib/pipeline/prototype-coding-guard";
import type { PrototypeMarker } from "@/lib/pipeline/prototype-marker";

const marker: PrototypeMarker = {
  generatedAt: "t", scaffoldTier: "M", scopeTier: "M", baseScaffoldCopied: true,
  pages: [{ pageId: "PAGE-001", route: "/", source: "demo-html", file: "src/views/Home.tsx" }],
  generatedFiles: ["frontend/src/views/Home.tsx"],
};

describe("shouldSkipBaseCopy", () => {
  it("skips base copy when a marker exists with baseScaffoldCopied and tier matches", () => {
    expect(shouldSkipBaseCopy(marker, "M")).toBe(true);
  });
  it("does NOT skip when there is no marker (legacy path)", () => {
    expect(shouldSkipBaseCopy(null, "M")).toBe(false);
  });
  it("does NOT skip when the scaffold tier disagrees (safety → full copy)", () => {
    expect(shouldSkipBaseCopy(marker, "L")).toBe(false);
  });
  it("does NOT skip when baseScaffoldCopied is not true", () => {
    expect(shouldSkipBaseCopy({ ...marker, baseScaffoldCopied: false as unknown as true }, "M")).toBe(false);
  });
});
