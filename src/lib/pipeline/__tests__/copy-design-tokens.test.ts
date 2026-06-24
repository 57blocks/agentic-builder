import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "path";
import os from "os";
import fs from "fs/promises";
import { tokensDestForTier, copyDesignTokens } from "../copy-design-tokens";

describe("tokensDestForTier", () => {
  it("m/l-tier 写 frontend/src/styles", () => {
    expect(tokensDestForTier("m")).toBe("frontend/src/styles/tokens.css");
    expect(tokensDestForTier("l")).toBe("frontend/src/styles/tokens.css");
  });
  it("s-tier 写 src/styles", () => {
    expect(tokensDestForTier("s")).toBe("src/styles/tokens.css");
  });
});

describe("copyDesignTokens", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "tok-"));
  });
  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("优先用显式 <outputRoot>/tokens.css", async () => {
    await fs.writeFile(path.join(dir, "tokens.css"), "@theme { --color-primary: #abcdef; }\n");
    const ok = await copyDesignTokens(dir, "s");
    expect(ok).toBe(true);
    const out = await fs.readFile(path.join(dir, "src/styles/tokens.css"), "utf-8");
    expect(out).toContain("#abcdef");
  });

  it("无 tokens.css 时从 DesignSpec.md 服务端反推", async () => {
    await fs.writeFile(
      path.join(dir, "DesignSpec.md"),
      `<style>:root{ --primary: #8ea07f; --radius-md: 12px; --space-4: 16px; }</style>`,
    );
    const ok = await copyDesignTokens(dir, "m");
    expect(ok).toBe(true);
    const out = await fs.readFile(path.join(dir, "frontend/src/styles/tokens.css"), "utf-8");
    expect(out).toContain("--color-primary: #8ea07f;"); // 反推出设计色
    expect(out).toContain("@theme {");
    expect(out).toContain("--color-ring: #8ea07f;"); // shadcn 别名跟随
  });

  it("显式 tokens.css 优先于 DesignSpec.md", async () => {
    await fs.writeFile(path.join(dir, "tokens.css"), "@theme { --color-primary: #111111; }\n");
    await fs.writeFile(path.join(dir, "DesignSpec.md"), `<style>:root{ --primary: #222222; }</style>`);
    await copyDesignTokens(dir, "s");
    const out = await fs.readFile(path.join(dir, "src/styles/tokens.css"), "utf-8");
    expect(out).toContain("#111111");
    expect(out).not.toContain("#222222");
  });

  it("既无 tokens.css 也无 DesignSpec → 返回 false,不抛错(保留 stub)", async () => {
    const ok = await copyDesignTokens(dir, "s");
    expect(ok).toBe(false);
  });
});
