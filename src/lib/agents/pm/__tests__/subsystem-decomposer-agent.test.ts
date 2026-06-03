import { describe, expect, it } from "vitest";
import {
  decomposeSubsystems,
  parseDecomposeResponse,
  SUBSYSTEM_DECOMPOSER_PROMPT_VERSION,
} from "../subsystem-decomposer-agent";
import type { OpenRouterResponse } from "@/lib/llm-types";

const HEADINGS = [
  "## 1. 术语表",
  "## 10. 家庭端模块详细规格 (FR-045)",
  "## 11. 教师端模块详细规格 (FR-144)",
  "## 13. 完整数据模型 (FR-285)",
];

const GOOD = JSON.stringify({
  subsystems: [
    { id: "family", name: "家庭端", summary: "家庭报名", sectionHeadings: ["## 10. 家庭端模块详细规格 (FR-045)"], dependsOn: ["shared"] },
    { name: "教师端", sectionHeadings: ["## 11. 教师端模块详细规格 (FR-144)"] }, // missing id/deps → defaulted
    { name: "空的", sectionHeadings: [] }, // dropped (no sections)
  ],
  sharedHeadings: ["## 1. 术语表", "## 13. 完整数据模型 (FR-285)"],
  notes: "three roles",
});

function fake(content: string): OpenRouterResponse {
  return { model: "claude-sonnet-4", choices: [{ message: { content } }], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } } as unknown as OpenRouterResponse;
}

describe("parseDecomposeResponse", () => {
  it("parses subsystems, defaults id/dependsOn, drops empty ones", () => {
    const p = parseDecomposeResponse(GOOD, HEADINGS);
    expect(p.subsystems).toHaveLength(2);
    expect(p.subsystems[0].id).toBe("family");
    expect(p.subsystems[1].id).toBe("教师端".toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "sub-2");
    expect(p.subsystems[1].dependsOn).toEqual(["shared"]);
    expect(p.sharedHeadings).toContain("## 13. 完整数据模型 (FR-285)");
  });

  it("falls back to all-shared / no-subsystems on malformed output", () => {
    const p = parseDecomposeResponse("not json", HEADINGS);
    expect(p.subsystems).toHaveLength(0);
    expect(p.sharedHeadings).toEqual(HEADINGS);
    expect(p.notes).toMatch(/unparseable/);
  });
});

describe("decomposeSubsystems (hermetic)", () => {
  it("returns a plan + provenance via injected impl", async () => {
    let sawHeadings = false;
    const r = await decomposeSubsystems(HEADINGS, {
      chatCompletionImpl: async (messages) => {
        sawHeadings = messages[1].content.includes("家庭端");
        return fake(GOOD);
      },
    });
    expect(sawHeadings).toBe(true);
    expect(r.subsystems.map((s) => s.id)).toContain("family");
    expect(r.model).toBe("claude-sonnet-4");
    expect(r.promptVersion).toBe(SUBSYSTEM_DECOMPOSER_PROMPT_VERSION);
  });
});
