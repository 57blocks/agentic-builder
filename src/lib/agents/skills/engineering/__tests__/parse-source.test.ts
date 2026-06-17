import { describe, it, expect } from "vitest";
import { parseEngineeringFrontmatter } from "../parse-source";

const WITH_WHEN = `---
name: setup-auth
description: Set up application auth.
when_to_use:
  - Adding identity authentication to a new project
  - Protecting routes (middleware + page-level double check)
---

# Auth

Body line one.
`;

const NO_WHEN = `---
name: auth
description: Authentication and authorization.
---

# Authentication

Body.
`;

// Folded block scalar: description: >
const FOLDED_DESCRIPTION = `---
name: ai-demo
description: >
  Use when building LLM apps such as RAG and agents.
  Triggers include embedding, chatbot, tool calling.
when_to_use:
  - Building a RAG pipeline
---

# AI Demo

Body.
`;

// Literal block scalar: description: |
const LITERAL_DESCRIPTION = `---
name: literal-demo
description: |
  First line of description.
  Second line of description.
when_to_use:
  - Some use case
---

# Literal Demo

Body.
`;

describe("parseEngineeringFrontmatter", () => {
  it("extracts name, description, when_to_use list, and body", () => {
    const r = parseEngineeringFrontmatter(WITH_WHEN, "setup-auth/SKILL.md");
    expect(r.name).toBe("setup-auth");
    expect(r.description).toBe("Set up application auth.");
    expect(r.whenToUse).toEqual([
      "Adding identity authentication to a new project",
      "Protecting routes (middleware + page-level double check)",
    ]);
    expect(r.body.trim().startsWith("# Auth")).toBe(true);
  });

  it("defaults when_to_use to an empty array when absent", () => {
    const r = parseEngineeringFrontmatter(NO_WHEN, "auth/SKILL.md");
    expect(r.name).toBe("auth");
    expect(r.whenToUse).toEqual([]);
  });

  it("throws when frontmatter or name is missing", () => {
    expect(() => parseEngineeringFrontmatter("no frontmatter", "x/SKILL.md")).toThrow();
    expect(() =>
      parseEngineeringFrontmatter("---\ndescription: x\n---\nbody", "y/SKILL.md"),
    ).toThrow(/name/);
  });

  it("parses a folded block scalar description (>) joining lines with a single space", () => {
    const r = parseEngineeringFrontmatter(FOLDED_DESCRIPTION, "ai-demo/SKILL.md");
    expect(r.name).toBe("ai-demo");
    expect(r.description).toBe(
      "Use when building LLM apps such as RAG and agents. Triggers include embedding, chatbot, tool calling.",
    );
    // block end + list parsing must still work
    expect(r.whenToUse).toEqual(["Building a RAG pipeline"]);
    expect(r.body.trim().startsWith("# AI Demo")).toBe(true);
  });

  it("parses a literal block scalar description (|) joining lines with newlines", () => {
    const r = parseEngineeringFrontmatter(LITERAL_DESCRIPTION, "literal-demo/SKILL.md");
    expect(r.name).toBe("literal-demo");
    expect(r.description).toBe("First line of description.\nSecond line of description.");
    expect(r.whenToUse).toEqual(["Some use case"]);
  });
});
