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

  it("含 shadcn 颜色别名，落在 --color-* 命名空间（@theme 内）", () => {
    // shadcn 组件工具类依赖这些 --color-* 名才能被 Tailwind 生成
    expect(css).toContain("--color-background: #f4f6f8;"); // = colors.bg
    expect(css).toContain("--color-foreground: #1f2a30;"); // = colors.text-primary
    expect(css).toContain("--color-primary-foreground: #ffffff;"); // = colors.primary-ink
    expect(css).toContain("--color-muted-foreground: #8a949b;"); // = colors.text-muted
    expect(css).toContain("--color-input: #d7dde2;"); // = colors.border
    expect(css).toContain("--color-ring: #4f6670;"); // = colors.primary
    expect(css).toContain("--color-destructive: #a4453a;"); // = colors.status-error
  });

  it("shadcn 别名全部在 @theme 块内（非裸 :root）", () => {
    const theme = css.slice(css.indexOf("@theme {"), css.lastIndexOf("}") + 1);
    expect(theme).toContain("--color-background:");
    expect(theme).toContain("--color-ring:");
  });
});
