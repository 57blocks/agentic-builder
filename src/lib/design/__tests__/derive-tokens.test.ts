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
});
