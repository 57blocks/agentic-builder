import { describe, it, expect } from "vitest";
import { synthesizeAnyOf, trimBody, convertEngineeringSkill } from "../synthesize";
import { parseSkillFile } from "@/lib/agents/skills/parser";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

describe("synthesizeAnyOf", () => {
  it("includes the spaced name and significant tokens, drops stopwords", () => {
    const got = synthesizeAnyOf({
      name: "setup-auth",
      description: "Set up auth.",
      whenToUse: ["Protecting routes with RBAC"],
    });
    expect(got).toContain("setup auth");
    expect(got).toContain("auth");
    expect(got).toContain("protecting routes with rbac");
    expect(got).not.toContain("setup"); // "setup" is not emitted as a standalone array entry
  });
});

describe("trimBody", () => {
  it("strips a leading H1 and leaves short bodies intact", () => {
    expect(trimBody("# Title\n\nHello world.")).toBe("Hello world.");
  });

  it("truncates long bodies at a paragraph boundary with a marker", () => {
    const para = "x".repeat(2000);
    const body = `# T\n\n${para}\n\n${para}\n\n${para}\n\n${para}`;
    const out = trimBody(body);
    expect(out.length).toBeLessThan(body.length);
    expect(out).toMatch(/truncated/i);
  });
});

describe("convertEngineeringSkill regex-escaping round-trip", () => {
  it("preserves single-backslash regex escapes through the real parser", () => {
    const { id, content } = convertEngineeringSkill(
      {
        name: "input-validation",
        description: "Validate inputs.",
        whenToUse: ["Adding validation (client + server)"],
        body: "# V\n\nValidate.",
      },
      "backend",
    );
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "esc-"));
    const file = path.join(dir, `${id}.md`);
    fs.writeFileSync(file, content, "utf-8");
    const skill = parseSkillFile(file);
    // Composite trigger → prefilter.any_of holds the regex alternatives.
    expect(skill.trigger.type).toBe("composite");
    const anyOf =
      skill.trigger.type === "composite" ? skill.trigger.prefilter.any_of : [];
    const escaped = anyOf.find((p) => p.includes("client"));
    expect(escaped).toBeDefined();
    // Must be single-backslash escaped, NOT double.
    expect(escaped).toBe("adding validation \\(client \\+ server\\)");
    expect(escaped).not.toContain("\\\\");
    // And it must actually match the literal phrase when compiled.
    expect(new RegExp(escaped!, "i").test("We are adding validation (client + server) now")).toBe(true);
  });
});

describe("convertEngineeringSkill YAML reserved-word safety", () => {
  it("keeps reserved-word / numeric any_of entries as strings through the parser", () => {
    const { id, content } = convertEngineeringSkill(
      {
        name: "demo",
        description: "Demo.",
        whenToUse: ["true", "false", "null", "12345"],
        body: "# D\n\nBody.",
      },
      "backend",
    );
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "yaml-"));
    const file = path.join(dir, `${id}.md`);
    fs.writeFileSync(file, content, "utf-8");
    // Must NOT throw (booleans/numbers would otherwise break asStringArray).
    const skill = parseSkillFile(file);
    expect(skill.trigger.type).toBe("composite");
    const anyOf =
      skill.trigger.type === "composite" ? skill.trigger.prefilter.any_of : [];
    expect(anyOf).toContain("true");
    expect(anyOf).toContain("false");
    expect(anyOf).toContain("null");
    expect(anyOf).toContain("12345");
    for (const p of anyOf) expect(typeof p).toBe("string");
  });
});

describe("convertEngineeringSkill", () => {
  it("emits a file the canonical loader parser accepts", () => {
    const { id, content } = convertEngineeringSkill(
      {
        name: "auth",
        description: "Authentication and authorization.",
        whenToUse: ["Verifying identity", "Enforcing permissions"],
        body: "# Auth\n\nUse JWTs.",
      },
      "backend",
    );
    expect(id).toBe("auth");

    // Round-trip through the REAL loader parser to prove compatibility.
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "conv-"));
    const file = path.join(dir, `${id}.md`);
    fs.writeFileSync(file, content, "utf-8");
    const skill = parseSkillFile(file);
    expect(skill.id).toBe("auth");
    expect(skill.agent).toBe("backend");
    expect(skill.trigger.type).toBe("composite");
    expect(skill.body).toContain("Use JWTs.");
  });
});
