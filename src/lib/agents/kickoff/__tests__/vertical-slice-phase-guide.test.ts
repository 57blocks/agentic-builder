/**
 * P1 vertical-slice: the phase-guide selector must swap the horizontal
 * "one task per page" guide for the vertical "Feature" guide when the
 * BLUEPRINT_VERTICAL_SLICE flag is on, and fall back to the horizontal guide
 * when it is off. Pure selector — no agent construction needed.
 */

import { describe, expect, it } from "vitest";

import { selectPhaseGuide } from "../task-breakdown-agent";

describe("selectPhaseGuide", () => {
  it("flag ON (M/L) → vertical Feature guide, NOT one-task-per-page", () => {
    const guide = selectPhaseGuide("M", true);
    expect(guide).toContain("VERTICAL FEATURE SLICES");
    expect(guide).toContain("one `Feature` task per USER FLOW");
    expect(guide).toContain("`files.creates`");
    expect(guide).toContain("frontend/src/");
    expect(guide).toContain("backend/src/api/modules");
    // The horizontal one-task-per-page rule must be absent.
    expect(guide).not.toContain("Implement [SinglePageName] page");
    expect(guide).not.toContain("PAGE INVENTORY");
    // Shared canonical block + foundation guidance preserved.
    expect(guide).toContain("scaffold utilities are CANONICAL");
    expect(guide).toContain("Foundation");
  });

  it("flag OFF → horizontal flat-stack guide (one task per page)", () => {
    const guide = selectPhaseGuide("M", false);
    expect(guide).toContain("Implement [SinglePageName] page");
    expect(guide).toContain("PAGE INVENTORY");
    expect(guide).not.toContain("VERTICAL FEATURE SLICES");
    expect(guide).toContain("scaffold utilities are CANONICAL");
  });

  it("L-tier honors the flag the same way", () => {
    expect(selectPhaseGuide("L", true)).toContain("VERTICAL FEATURE SLICES");
    expect(selectPhaseGuide("L", false)).toContain(
      "Implement [SinglePageName] page",
    );
  });

  it("non-M/L tier returns empty regardless of flag", () => {
    expect(selectPhaseGuide("S", true)).toBe("");
    expect(selectPhaseGuide("S", false)).toBe("");
  });
});
