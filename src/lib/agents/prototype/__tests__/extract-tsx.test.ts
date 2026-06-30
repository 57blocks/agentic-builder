// src/lib/agents/prototype/__tests__/extract-tsx.test.ts
import { describe, it, expect } from "vitest";
import { extractTsxFromLlmOutput } from "../extract-tsx";

describe("extractTsxFromLlmOutput", () => {
  it("extracts the fenced tsx block and drops prose", () => {
    const raw = [
      "Here is the page:",
      "```tsx",
      `export function Dashboard() {\n  return <div>hi</div>;\n}`,
      "```",
      "Done.",
    ].join("\n");
    const out = extractTsxFromLlmOutput(raw);
    expect(out).toContain("export function Dashboard()");
    expect(out).not.toContain("Here is the page");
    expect(out.endsWith("\n")).toBe(true);
  });

  it("prefers the block containing an export when multiple fences exist", () => {
    const raw = [
      "```bash\nnpm i\n```",
      "```tsx\nexport const Foo = () => null;\n```",
    ].join("\n");
    expect(extractTsxFromLlmOutput(raw)).toContain("export const Foo");
  });

  it("returns the raw text (trimmed) when there is no fence", () => {
    const raw = "export function Bare() { return null; }";
    expect(extractTsxFromLlmOutput(raw)).toBe("export function Bare() { return null; }\n");
  });
});
