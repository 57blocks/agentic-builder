/**
 * P1 vertical-slice: buildRolePrompt("fullstack") returns a Senior Full-Stack
 * Engineer prompt that combines frontend rules (API client / interaction
 * wiring) and backend rules (route registrar / endpoint), framed as owning one
 * feature end-to-end.
 */

import { describe, expect, it } from "vitest";

import { buildRolePrompt } from "../role-prompts";

describe('buildRolePrompt("fullstack")', () => {
  const prompt = buildRolePrompt("fullstack");

  it("is a non-empty string", () => {
    expect(typeof prompt).toBe("string");
    expect(prompt.length).toBeGreaterThan(0);
  });

  it("frames the worker as owning one feature end-to-end", () => {
    expect(prompt).toContain("Full-Stack Engineer");
    expect(prompt.toLowerCase()).toContain("end-to-end");
  });

  it("mentions a frontend rule (api client)", () => {
    expect(prompt.toLowerCase()).toContain("api client");
  });

  it("mentions a backend rule (endpoint / registrar)", () => {
    expect(prompt.toLowerCase()).toContain("endpoint");
    expect(prompt).toContain("registerXxxRoutes");
  });
});
