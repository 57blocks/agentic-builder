import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildCodingSkills } from "../build-coding-skills";

function writeSkill(root: string, rel: string, name: string, body: string) {
  const dir = path.join(root, rel, name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "SKILL.md"),
    `---\nname: ${name}\ndescription: ${name} desc.\n---\n\n# ${name}\n\n${body}\n`,
    "utf-8",
  );
}

describe("buildCodingSkills", () => {
  it("converts dir-layout Engineering skills into role folders", () => {
    const eng = fs.mkdtempSync(path.join(os.tmpdir(), "eng-"));
    const out = fs.mkdtempSync(path.join(os.tmpdir(), "bp-"));
    writeSkill(eng, "Backend", "auth", "Use JWTs.");
    writeSkill(eng, "Frontend/skills", "setup-auth", "Use Auth.js.");
    writeSkill(eng, "AI/skills", "ai-llm-application", "Call the model.");

    const summary = buildCodingSkills({ engineeringDir: eng, blueprintSkillsDir: out });

    expect(summary.written).toBe(3);
    expect(summary.errors).toEqual([]);
    expect(fs.existsSync(path.join(out, "backend", "auth.md"))).toBe(true);
    expect(fs.existsSync(path.join(out, "frontend", "setup-auth.md"))).toBe(true);
    // AI maps to backend
    expect(fs.existsSync(path.join(out, "backend", "ai-llm-application.md"))).toBe(true);
  });

  it("isolates a malformed SKILL.md as an error without aborting the batch", () => {
    const eng = fs.mkdtempSync(path.join(os.tmpdir(), "eng-"));
    const out = fs.mkdtempSync(path.join(os.tmpdir(), "bp-"));
    writeSkill(eng, "Backend", "good", "Fine.");
    // malformed: no frontmatter
    const badDir = path.join(eng, "Backend", "bad");
    fs.mkdirSync(badDir, { recursive: true });
    fs.writeFileSync(path.join(badDir, "SKILL.md"), "no frontmatter here", "utf-8");

    const summary = buildCodingSkills({ engineeringDir: eng, blueprintSkillsDir: out });
    expect(summary.written).toBe(1);
    expect(summary.errors.length).toBe(1);
    expect(fs.existsSync(path.join(out, "backend", "good.md"))).toBe(true);
  });

  it("is idempotent and removes stale .md files on re-run", () => {
    const eng = fs.mkdtempSync(path.join(os.tmpdir(), "eng-"));
    const out = fs.mkdtempSync(path.join(os.tmpdir(), "bp-"));
    writeSkill(eng, "Backend", "keep", "Keep me.");
    buildCodingSkills({ engineeringDir: eng, blueprintSkillsDir: out });
    // Plant a stale file in the managed role dir.
    fs.writeFileSync(path.join(out, "backend", "stale.md"), "stale", "utf-8");
    const second = buildCodingSkills({ engineeringDir: eng, blueprintSkillsDir: out });
    expect(second.written).toBe(1);
    expect(fs.existsSync(path.join(out, "backend", "keep.md"))).toBe(true);
    expect(fs.existsSync(path.join(out, "backend", "stale.md"))).toBe(false);
  });

  it("records an error instead of silently clobbering a duplicate id across source roots", () => {
    const eng = fs.mkdtempSync(path.join(os.tmpdir(), "eng-"));
    const out = fs.mkdtempSync(path.join(os.tmpdir(), "bp-"));
    // Both map to role `backend` and share the same frontmatter name → same id.
    writeSkill(eng, "Backend", "dup", "From backend.");
    writeSkill(eng, "AI/skills", "dup", "From ai.");
    const summary = buildCodingSkills({ engineeringDir: eng, blueprintSkillsDir: out });
    expect(summary.written).toBe(1);
    expect(summary.errors.length).toBe(1);
    expect(summary.errors[0]).toMatch(/duplicate id/i);
  });
});
