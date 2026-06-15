import { describe, it, expect } from "vitest";
import {
  hashPrompt,
  computePromptSetHash,
  type RolePromptEntry,
} from "@/lib/pipeline/prompt-capture";

describe("hashPrompt", () => {
  it("returns deterministic SHA-256 hex string", () => {
    expect(hashPrompt("hello")).toBe(hashPrompt("hello"));
    expect(hashPrompt("hello")).toMatch(/^[0-9a-f]{64}$/);
  });
  it("differs when content differs", () => {
    expect(hashPrompt("a")).not.toBe(hashPrompt("b"));
  });
});

describe("computePromptSetHash", () => {
  it("orders by role name so insertion order doesn't matter", () => {
    const a: RolePromptEntry[] = [
      { role: "architect", hash: "h1", bytes: 1, content: "x" },
      { role: "frontend",  hash: "h2", bytes: 1, content: "y" },
    ];
    const b: RolePromptEntry[] = [
      { role: "frontend",  hash: "h2", bytes: 1, content: "y" },
      { role: "architect", hash: "h1", bytes: 1, content: "x" },
    ];
    expect(computePromptSetHash(a)).toBe(computePromptSetHash(b));
  });
  it("differs when any role's hash changes", () => {
    const a: RolePromptEntry[] = [
      { role: "architect", hash: "h1", bytes: 1, content: "x" },
    ];
    const b: RolePromptEntry[] = [
      { role: "architect", hash: "h2", bytes: 1, content: "x" },
    ];
    expect(computePromptSetHash(a)).not.toBe(computePromptSetHash(b));
  });
});
