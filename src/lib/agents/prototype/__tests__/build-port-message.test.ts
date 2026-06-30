// src/lib/agents/prototype/__tests__/build-port-message.test.ts
import { describe, it, expect } from "vitest";
import { extractPortableMarkup, buildPortMessage } from "../build-port-message";

describe("extractPortableMarkup", () => {
  it("drops inlined <style> blocks and keeps body markup with classes", () => {
    const html = `<!doctype html><html><head><style>.x{color:red}</style></head><body><main class="flex gap-4"><h1>Hi</h1></main></body></html>`;
    const out = extractPortableMarkup(html);
    expect(out).toContain(`<main class="flex gap-4">`);
    expect(out).not.toContain("color:red");
    expect(out).not.toContain("<style");
  });

  it("returns the whole (style-stripped) doc when there is no body tag", () => {
    expect(extractPortableMarkup(`<div class="p-4">x</div>`)).toBe(`<div class="p-4">x</div>`);
  });
});

describe("buildPortMessage", () => {
  const base = {
    componentName: "Dashboard",
    pageName: "Family Dashboard",
    route: "/dashboard",
    capturedHtml: `<body><main class="flex"><h1>Dash</h1><button>Save</button></main></body>`,
    designContext: "TOKENS: --color-bg",
    prdExcerpt: "The dashboard shows family activity.",
  };

  it("includes the portable markup, the component contract, and logic-stub instructions", () => {
    const msg = buildPortMessage(base);
    expect(msg).toContain(`<main class="flex">`);
    expect(msg).toContain("export function Dashboard()");
    expect(msg).toContain("/dashboard");
    expect(msg).toContain("Family Dashboard");
    expect(msg).toContain("TODO(logic");
    expect(msg).toContain("The dashboard shows family activity.");
  });

  it("embeds the design-system context so ported Tailwind maps to the scaffold", () => {
    expect(buildPortMessage(base)).toContain("TOKENS: --color-bg");
  });
});
