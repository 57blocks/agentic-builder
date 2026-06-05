/**
 * P1 vertical-slice: inferRole must map the vertical "Feature" phase to the
 * new "fullstack" worker role, while leaving the existing phase mappings
 * untouched.
 */

import { describe, expect, it } from "vitest";

import type { KickoffWorkItem } from "@/lib/pipeline/types";
import { inferRole } from "../role-mapping";

function makeTask(overrides: Partial<KickoffWorkItem>): KickoffWorkItem {
  return {
    id: "T-001",
    phase: "Feature",
    title: "Enroll in a course flow",
    description: "Enrollment page + Enroll button wired to POST /api/enrollments",
    estimatedHours: 1,
    executionKind: "ai_autonomous",
    ...overrides,
  } as KickoffWorkItem;
}

describe("inferRole — fullstack", () => {
  it('returns "fullstack" for a task with phase "Feature"', () => {
    expect(inferRole(makeTask({ phase: "Feature" }))).toBe("fullstack");
  });

  it("still maps existing phases to their original roles", () => {
    expect(inferRole(makeTask({ phase: "Frontend" }))).toBe("frontend");
    expect(inferRole(makeTask({ phase: "Backend Services" }))).toBe("backend");
    expect(inferRole(makeTask({ phase: "Data Layer" }))).toBe("architect");
    expect(inferRole(makeTask({ phase: "Testing" }))).toBe("test");
  });
});
