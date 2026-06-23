import { describe, it, expect } from "vitest";
import { DEFAULT_TOKENS, type DesignTokens } from "../tokens";

describe("DEFAULT_TOKENS", () => {
  it("含五大维度且非空", () => {
    expect(Object.keys(DEFAULT_TOKENS.colors).length).toBeGreaterThan(0);
    expect(DEFAULT_TOKENS.fonts.sans).toBeTruthy();
    expect(DEFAULT_TOKENS.fonts.mono).toBeTruthy();
    expect(Object.keys(DEFAULT_TOKENS.fontSizes).length).toBeGreaterThan(0);
    expect(Object.keys(DEFAULT_TOKENS.spacing).length).toBeGreaterThan(0);
    expect(Object.keys(DEFAULT_TOKENS.radius).length).toBeGreaterThan(0);
  });

  it("保留 m-tier stub 的核心颜色命名(下游类名依赖)", () => {
    for (const key of ["primary", "surface", "border", "text-primary", "text-muted", "status-success"]) {
      expect(DEFAULT_TOKENS.colors[key], `colors.${key}`).toMatch(/^#|rgb|hsl/);
    }
  });

  it("radius 含 sm/md/lg/xl/pill", () => {
    for (const key of ["sm", "md", "lg", "xl", "pill"]) {
      expect(DEFAULT_TOKENS.radius[key]).toBeTruthy();
    }
  });
});
