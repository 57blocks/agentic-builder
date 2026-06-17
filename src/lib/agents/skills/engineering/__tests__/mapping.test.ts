import { describe, it, expect } from "vitest";
import { ENGINEERING_SOURCE_ROOTS, roleForSourceRoot } from "../mapping";

describe("engineering mapping", () => {
  it("maps each source root to a CodingAgentRole", () => {
    expect(roleForSourceRoot("Backend")).toBe("backend");
    expect(roleForSourceRoot("Frontend/skills")).toBe("frontend");
    expect(roleForSourceRoot("AI/skills")).toBe("backend");
  });

  it("returns null for unmapped roots", () => {
    expect(roleForSourceRoot("Mobile")).toBeNull();
    expect(roleForSourceRoot("QA/skills")).toBeNull();
  });

  it("declares only dir-layout roots in scope", () => {
    expect(ENGINEERING_SOURCE_ROOTS.map((r) => r.relPath)).toEqual([
      "Backend",
      "Frontend/skills",
      "AI/skills",
    ]);
    for (const r of ENGINEERING_SOURCE_ROOTS) expect(r.layout).toBe("dir");
  });
});
