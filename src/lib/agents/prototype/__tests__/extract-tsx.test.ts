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

  it("ignores a non-code fence that merely mentions export, choosing the real tsx block", () => {
    const raw = [
      "```json",
      `{ "note": "use export const X here" }`,
      "```",
      "```tsx",
      `export function Real() { return <div/>; }`,
      "```",
    ].join("\n");
    const out = extractTsxFromLlmOutput(raw);
    expect(out).toContain("export function Real()");
    expect(out).not.toContain('"note"');
  });

  it("trims surrounding blank lines on the no-fence path", () => {
    expect(extractTsxFromLlmOutput("\n\nexport function Bare() {}\n\n")).toBe(
      "export function Bare() {}\n",
    );
  });

  it("when multiple tsx export blocks exist, the first wins", () => {
    const raw = [
      "```tsx",
      "export function First() { return null; }",
      "```",
      "```tsx",
      "export function Second() { return null; }",
      "```",
    ].join("\n");
    expect(extractTsxFromLlmOutput(raw)).toContain("export function First()");
  });

  it("treats an untagged fence as a code candidate", () => {
    const raw = ["```", "export const Foo = () => null;", "```"].join("\n");
    expect(extractTsxFromLlmOutput(raw)).toContain("export const Foo");
  });
});
