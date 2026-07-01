// src/lib/pipeline/__tests__/scope-css.test.ts
import { describe, it, expect } from "vitest";
import { scopeCss, PROTOTYPE_ROOT_CLASS } from "../scope-css";

const S = `.${PROTOTYPE_ROOT_CLASS}`;

describe("scopeCss", () => {
  it("prefixes plain style rules with the scope selector", () => {
    expect(scopeCss(`.card{color:red}`, S)).toContain(`${S} .card`);
  });

  it("maps :root / html / body onto the scope wrapper itself", () => {
    const out = scopeCss(`:root{--bg:#fff}html{font-size:16px}body{margin:0}`, S);
    expect(out).toContain(`${S}{`);
    expect(out).not.toMatch(/(^|\})\s*:root\s*\{/);
    expect(out).not.toMatch(/(^|\})\s*html\s*\{/);
    expect(out).not.toMatch(/(^|\})\s*body\s*\{/);
  });

  it("prefixes selectors INSIDE @media but keeps the @media wrapper", () => {
    const out = scopeCss(`@media (min-width:768px){.grid{display:grid}}`, S);
    expect(out).toContain("@media (min-width:768px)");
    expect(out).toContain(`${S} .grid`);
  });

  it("leaves @keyframes step selectors and @font-face untouched", () => {
    const css = `@keyframes spin{0%{opacity:0}100%{opacity:1}}@font-face{font-family:X;src:url(x.woff2)}`;
    const out = scopeCss(css, S);
    expect(out).toContain("@keyframes spin");
    expect(out).toContain("0%");
    expect(out).not.toContain(`${S} 0%`);
    expect(out).toContain("@font-face");
    expect(out).not.toContain(`${S}{font-family`);
  });

  it("prefixes the universal + pseudo-element reset (compiled Tailwind)", () => {
    const out = scopeCss(`*,::before,::after{box-sizing:border-box}`, S);
    expect(out).toContain(`${S} *`);
  });

  it("returns empty string for empty input and never throws on odd css", () => {
    expect(scopeCss("", S)).toBe("");
    expect(() => scopeCss(`.x{color:red`, S)).not.toThrow();
  });

  it("glues a compound class/attr on html/body onto the scope (no descendant space)", () => {
    const S2 = `.${PROTOTYPE_ROOT_CLASS}`;
    expect(scopeCss(`body.dark .card{color:#fff}`, S2)).toContain(`${S2}.dark .card`);
    expect(scopeCss(`html[data-theme="dark"] .x{color:#000}`, S2)).toContain(`${S2}[data-theme="dark"] .x`);
  });

  it("keeps descendant/combinator selectors after body/html separated", () => {
    const S2 = `.${PROTOTYPE_ROOT_CLASS}`;
    expect(scopeCss(`body .card{color:red}`, S2)).toContain(`${S2} .card`);
    expect(scopeCss(`body > .container{margin:0}`, S2)).toContain(`${S2} > .container`);
  });
});
