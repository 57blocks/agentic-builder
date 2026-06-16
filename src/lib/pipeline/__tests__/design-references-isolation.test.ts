import { describe, it, expect } from "vitest";
import { designReferenceDirAbs } from "../design-references";

describe("design-references per-project isolation", () => {
  const root = "/repo";
  it("scopes to .blueprint/projects/<id>/design-references when projectId given", () => {
    expect(designReferenceDirAbs(root, "proj-abc")).toBe(
      "/repo/.blueprint/projects/proj-abc/design-references",
    );
  });
  it("falls back to the legacy global dir when no projectId", () => {
    expect(designReferenceDirAbs(root)).toBe("/repo/.blueprint/design-references");
  });
  it("two projects resolve to different dirs (no bleed)", () => {
    expect(designReferenceDirAbs(root, "a")).not.toBe(designReferenceDirAbs(root, "b"));
  });
});
