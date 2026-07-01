import { describe, it, expect } from "vitest";
import { ensureDemoCssImport, DEMO_CSS_IMPORT } from "../prototype-demo-css";

describe("ensureDemoCssImport", () => {
  const index = `@import "tailwindcss";\n@import "./styles/tokens.css";\n\n#root { width: 100%; }\n`;

  it("adds the import after the existing @imports and before other rules", () => {
    const out = ensureDemoCssImport(index);
    expect(out).toContain(DEMO_CSS_IMPORT);
    const importIdx = out.indexOf("prototype-demo.css");
    const ruleIdx = out.indexOf("#root");
    expect(importIdx).toBeGreaterThan(0);
    expect(importIdx).toBeLessThan(ruleIdx);
    // grouped with the other imports (after tokens.css)
    expect(out.indexOf("prototype-demo.css")).toBeGreaterThan(out.indexOf("tokens.css"));
  });

  it("is idempotent", () => {
    const once = ensureDemoCssImport(index);
    expect(ensureDemoCssImport(once)).toBe(once);
  });

  it("inserts at the top when there are no existing imports", () => {
    const out = ensureDemoCssImport(`body { margin: 0; }\n`);
    expect(out.startsWith(DEMO_CSS_IMPORT)).toBe(true);
  });
});
