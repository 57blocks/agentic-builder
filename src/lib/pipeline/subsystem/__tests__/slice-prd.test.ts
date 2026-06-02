import { describe, expect, it } from "vitest";
import { parseH2Sections, slicePrd } from "../slice-prd";
import type { SubsystemPlan } from "../types";

const PRD = [
  "# Big PRD",
  "intro preamble line",
  "",
  "## 1. 术语表",
  "glossary body",
  "",
  "## 10. 家庭端模块详细规格 (FR-045)",
  "family pages body",
  "### 10.1 sub",
  "nested",
  "",
  "## 11. 教师端模块详细规格 (FR-144)",
  "teacher body",
  "",
  "## 13. 完整数据模型 (FR-285)",
  "shared models",
  "",
  "## 99. 未分类节",
  "orphan body",
].join("\n");

const plan: SubsystemPlan = {
  subsystems: [
    { id: "family", name: "家庭端", summary: "f", sectionHeadings: ["## 10. 家庭端模块详细规格 (FR-045)"], dependsOn: ["shared"] },
    { id: "teacher", name: "教师端", summary: "t", sectionHeadings: ["## 11. 教师端模块详细规格 (FR-144)"], dependsOn: ["shared"] },
  ],
  sharedHeadings: ["## 1. 术语表", "## 13. 完整数据模型 (FR-285)"],
};

describe("parseH2Sections", () => {
  it("splits preamble + H2 sections, nesting H3 under its H2", () => {
    const { preamble, sections } = parseH2Sections(PRD);
    expect(preamble).toContain("intro preamble");
    expect(sections.map((s) => s.heading)).toEqual([
      "## 1. 术语表",
      "## 10. 家庭端模块详细规格 (FR-045)",
      "## 11. 教师端模块详细规格 (FR-144)",
      "## 13. 完整数据模型 (FR-285)",
      "## 99. 未分类节",
    ]);
    // family section includes its H3 subsection
    const fam = sections.find((s) => s.heading.includes("家庭端"))!;
    expect(PRD.split("\n").slice(fam.start, fam.end).join("\n")).toContain("### 10.1 sub");
  });
});

describe("slicePrd", () => {
  const sliced = slicePrd(PRD, plan);

  it("shared slice = preamble + shared sections; unassigned defaults to shared", () => {
    expect(sliced.shared.markdown).toContain("intro preamble");
    expect(sliced.shared.markdown).toContain("glossary body");
    expect(sliced.shared.markdown).toContain("shared models");
    // the unassigned "## 99" section is reported AND folded into shared
    expect(sliced.unassigned).toContain("## 99. 未分类节");
    expect(sliced.shared.markdown).toContain("orphan body");
    // shared must NOT contain subsystem-specific bodies
    expect(sliced.shared.markdown).not.toContain("family pages body");
  });

  it("each subsystem slice is self-contained: shared contracts + own sections", () => {
    const fam = sliced.subsystems.find((s) => s.id === "family")!;
    expect(fam.markdown).toContain("shared models"); // shared contracts included
    expect(fam.markdown).toContain("family pages body"); // own section
    expect(fam.markdown).toContain("### 10.1 sub");
    expect(fam.markdown).not.toContain("teacher body"); // not other subsystem's
    expect(sliced.subsystems.map((s) => s.id)).toEqual(["family", "teacher"]);
  });
});
