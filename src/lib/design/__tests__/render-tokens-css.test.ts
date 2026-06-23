import { describe, it, expect } from "vitest";
import { renderTokensCss } from "../render-tokens-css";
import { DEFAULT_TOKENS } from "../tokens";

describe("renderTokensCss", () => {
  const css = renderTokensCss(DEFAULT_TOKENS);

  it("输出 @theme 块", () => {
    expect(css).toContain("@theme {");
    expect(css.trim().endsWith("}")).toBe(true);
  });

  it("颜色映射到 --color-*", () => {
    expect(css).toContain("--color-primary: #4f6670;");
    expect(css).toContain("--color-text-muted: #8a949b;");
  });

  it("字体/字号/间距/圆角映射到对应前缀", () => {
    expect(css).toContain("--font-sans:");
    expect(css).toContain("--text-base: 1rem;");
    expect(css).toContain("--spacing-4: 1rem;");
    expect(css).toContain("--radius-md: 12px;");
  });

  it("文件头含语义类用法提示注释", () => {
    expect(css).toMatch(/HARD RULE|语义|token/i);
  });
});
