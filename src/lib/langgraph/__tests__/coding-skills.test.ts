import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadCodingSkillsBlock, loadCodingSkills, clearCodingSkillsCache } from "../coding-skills";

function setupProject(prd: string): string {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "proj-"));
  fs.writeFileSync(path.join(out, "PRD.md"), prd, "utf-8");
  return out;
}

function setupSkillsRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "skills-"));
  const dir = path.join(root, "backend");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "caching.md"),
    `---\nid: caching\nagent: backend\nversion: v1\ndescription: Caching guidance.\npriority: 50\nexcludes: []\ntrigger:\n  type: regex\n  match: both\n  any_of:\n    - "cache"\n---\n\nUse a read-through cache.\n`,
    "utf-8",
  );
  return root;
}

describe("loadCodingSkillsBlock", () => {
  beforeEach(() => clearCodingSkillsCache());

  it("injects a matched skill (regex-only, no LLM) when the PRD mentions it", async () => {
    const out = setupProject("We need a Redis cache layer.");
    const skillsRoot = setupSkillsRoot();
    const block = await loadCodingSkillsBlock("backend", out, {
      skillsRoot,
      enableLlmConfirm: false,
    });
    expect(block).toContain("Skills auto-applied");
    expect(block).toContain("Use a read-through cache.");
  });

  it("returns empty string when nothing matches", async () => {
    const out = setupProject("A simple static landing page.");
    const skillsRoot = setupSkillsRoot();
    const block = await loadCodingSkillsBlock("backend", out, {
      skillsRoot,
      enableLlmConfirm: false,
    });
    expect(block).toBe("");
  });

  it("returns empty string for an empty outputDir", async () => {
    expect(await loadCodingSkillsBlock("backend", "")).toBe("");
  });

  it("serves a cached result on the second call, ignoring on-disk PRD changes", async () => {
    const out = setupProject("We need a Redis cache layer.");
    const skillsRoot = setupSkillsRoot();
    const opts = { skillsRoot, enableLlmConfirm: false };

    const first = await loadCodingSkillsBlock("backend", out, opts);
    expect(first).toContain("Use a read-through cache.");

    // Mutate PRD on disk; a cache HIT must not reflect the change.
    fs.writeFileSync(path.join(out, "PRD.md"), "totally unrelated landing page", "utf-8");
    const second = await loadCodingSkillsBlock("backend", out, opts);
    expect(second).toBe(first);

    // After clearing, the new PRD content is re-evaluated → no match → "".
    clearCodingSkillsCache();
    const third = await loadCodingSkillsBlock("backend", out, opts);
    expect(third).toBe("");
  });

  it("loadCodingSkills returns applied skill refs (id, relative filePath, version)", async () => {
    const out = setupProject("We need a Redis cache layer.");
    const skillsRoot = setupSkillsRoot();
    const { block, applied } = await loadCodingSkills("backend", out, {
      skillsRoot,
      enableLlmConfirm: false,
    });
    expect(block).toContain("Use a read-through cache.");
    expect(applied).toHaveLength(1);
    expect(applied[0].id).toBe("caching");
    expect(applied[0].version).toBe("v1");
    expect(applied[0].filePath.startsWith("/")).toBe(false);
    expect(applied[0].filePath.endsWith("caching.md")).toBe(true);
  });

  it("loadCodingSkills returns empty applied when nothing matches", async () => {
    const out = setupProject("A simple static landing page.");
    const skillsRoot = setupSkillsRoot();
    const { block, applied } = await loadCodingSkills("backend", out, {
      skillsRoot,
      enableLlmConfirm: false,
    });
    expect(block).toBe("");
    expect(applied).toEqual([]);
  });

  it("loadCodingSkills returns empty for an empty outputDir", async () => {
    expect(await loadCodingSkills("backend", "")).toEqual({ block: "", applied: [] });
  });
});
