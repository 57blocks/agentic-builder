import { describe, it, expect } from "vitest";
import { shouldSkipBaseCopy } from "@/lib/pipeline/prototype-coding-guard";
import { buildPrototypeBreakdownContext } from "@/lib/pipeline/prototype-breakdown-context";

// Isolation guarantee for sub-project 3: with NO prototype marker, both consumption
// seams (coding base-copy skip + port-aware task-breakdown context) are inert, so the
// legacy pipeline behaves exactly as before.
describe("prototype-consumed isolation: no marker → legacy behavior unchanged", () => {
  it("coding never skips the base scaffold copy without a marker", () => {
    expect(shouldSkipBaseCopy(null, "M")).toBe(false);
    expect(shouldSkipBaseCopy(null, "L")).toBe(false);
  });

  it("task-breakdown injects no prototype context without a marker", () => {
    expect(buildPrototypeBreakdownContext(null)).toBe("");
  });
});
