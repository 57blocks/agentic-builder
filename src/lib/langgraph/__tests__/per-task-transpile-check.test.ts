import { describe, expect, it } from "vitest";
import {
  transpileCheckSource,
  formatTranspileDiagnostics,
} from "../per-task-transpile-check";

describe("transpileCheckSource", () => {
  it("passes valid TypeScript", () => {
    const src = `export function add(a: number, b: number): number {
  return a + b;
}
`;
    expect(transpileCheckSource("add.ts", src)).toEqual([]);
  });

  it("passes valid TSX (JSX enabled)", () => {
    const src = `export function View() {
  return <div className="x">hi</div>;
}
`;
    expect(transpileCheckSource("View.tsx", src)).toEqual([]);
  });

  it("flags a genuine syntax error (truncated / unbalanced)", () => {
    const src = `export function broken() {
  const x = {
    a: 1,
`; // missing closing braces — truncated mid-file
    const diags = transpileCheckSource("broken.ts", src);
    expect(diags.length).toBeGreaterThan(0);
    expect(diags[0].file).toBe("broken.ts");
    expect(diags[0].line).toBeGreaterThan(0);
  });

  it("flags invalid JSX", () => {
    const src = `export function Bad() {
  return <div><span></div>;
}
`;
    expect(transpileCheckSource("Bad.tsx", src).length).toBeGreaterThan(0);
  });

  it("does NOT flag a cross-file import to a not-yet-created module", () => {
    // The whole point: single-file transpile never resolves imports, so a
    // reference to a module a later task will create is not a false positive.
    const src = `import { Repo } from "./repo-created-by-a-later-task";
export function use(): void {
  new Repo().run();
}
`;
    expect(transpileCheckSource("use.ts", src)).toEqual([]);
  });
});

describe("formatTranspileDiagnostics", () => {
  it("renders canonical tsc lines", () => {
    const line = formatTranspileDiagnostics([
      { file: "src/a.ts", line: 3, col: 5, code: 1005, message: "';' expected." },
    ]);
    expect(line).toBe("src/a.ts(3,5): error TS1005: ';' expected.");
  });
});
