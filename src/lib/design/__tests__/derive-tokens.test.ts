import { describe, it, expect } from "vitest";
import { deriveTokensFromDesignSpec } from "../derive-tokens";
import { DEFAULT_TOKENS } from "../tokens";

const HTML = `<!DOCTYPE html><html><head><style>
:root {
  --primary: #112233;
  --text-primary: #000000;
  --radius-md: 10px;
  --space-4: 1.1rem;
  --text-lg: 1.2rem;
}
</style></head><body></body></html>`;

describe("deriveTokensFromDesignSpec", () => {
  it("解析 :root 并映射到 DesignTokens 命名", () => {
    const t = deriveTokensFromDesignSpec(HTML);
    expect(t.colors.primary).toBe("#112233");
    expect(t.colors["text-primary"]).toBe("#000000");
    expect(t.radius.md).toBe("10px");
    expect(t.spacing["4"]).toBe("1.1rem");
    expect(t.fontSizes.lg).toBe("1.2rem");
  });

  it("缺失字段回退 DEFAULT_TOKENS", () => {
    const t = deriveTokensFromDesignSpec(HTML);
    expect(t.colors.surface).toBe(DEFAULT_TOKENS.colors.surface);
    expect(t.radius.pill).toBe(DEFAULT_TOKENS.radius.pill);
    expect(t.fonts.sans).toBe(DEFAULT_TOKENS.fonts.sans);
  });

  it("无 :root / 空输入时整体回退预设,不抛错", () => {
    expect(() => deriveTokensFromDesignSpec("")).not.toThrow();
    const t = deriveTokensFromDesignSpec("<html></html>");
    expect(t.colors.primary).toBe(DEFAULT_TOKENS.colors.primary);
  });

  it("--font-sans / --font-mono 路由到 t.fonts.sans / t.fonts.mono", () => {
    const html = `<!DOCTYPE html><html><head><style>
:root {
  --font-sans: 'Roboto', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
</style></head><body></body></html>`;
    const t = deriveTokensFromDesignSpec(html);
    expect(t.fonts.sans).toBe("'Roboto', sans-serif");
    expect(t.fonts.mono).toBe("'JetBrains Mono', monospace");
  });

  it("fontSizes/spacing 局部覆盖时其余键仍回退 DEFAULT_TOKENS", () => {
    const html = `<!DOCTYPE html><html><head><style>
:root {
  --text-lg: 1.5rem;
  --space-4: 2rem;
}
</style></head><body></body></html>`;
    const t = deriveTokensFromDesignSpec(html);
    // overridden values
    expect(t.fontSizes.lg).toBe("1.5rem");
    expect(t.spacing["4"]).toBe("2rem");
    // other keys must still equal DEFAULT_TOKENS
    expect(t.fontSizes.base).toBe(DEFAULT_TOKENS.fontSizes.base);
    expect(t.spacing["6"]).toBe(DEFAULT_TOKENS.spacing["6"]);
  });

  it("阴影/行高/渐变正确归类,不污染 colors", () => {
    const html = `<!DOCTYPE html><html><head><style>
:root {
  --shadow-sm: 0 4px 14px rgba(0,0,0,0.08);
  --lh-tight: 1.2;
  --leading-base: 1.5;
  --hero-gradient: linear-gradient(135deg, #fff 0%, #000 100%);
}
</style></head><body></body></html>`;
    const t = deriveTokensFromDesignSpec(html);
    expect(t.shadows?.sm).toBe("0 4px 14px rgba(0,0,0,0.08)");
    expect(t.lineHeights?.tight).toBe("1.2");
    expect(t.lineHeights?.base).toBe("1.5");
    expect(t.extras?.["hero-gradient"]).toBe(
      "linear-gradient(135deg, #fff 0%, #000 100%)",
    );
    // 关键:这些都不应进 colors 桶
    expect(t.colors["shadow-sm"]).toBeUndefined();
    expect(t.colors["lh-tight"]).toBeUndefined();
    expect(t.colors["hero-gradient"]).toBeUndefined();
  });
});
