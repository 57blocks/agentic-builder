import path from "path";
import fs from "fs/promises";

/** tier → 生成项目内 tokens.css 的相对目标路径。 */
export function tokensDestForTier(tier: string): string {
  const t = tier.toLowerCase();
  return t === "s"
    ? "src/styles/tokens.css"
    : "frontend/src/styles/tokens.css";
}

/**
 * 把 design 阶段产出的 <outputRoot>/tokens.css 复制到 tier 对应的最终位置。
 * 必须在 copyScaffold(forceOverwrite) 之后调用，否则会被 stub 覆盖。
 * 优雅回退：源不存在/失败时保留 scaffold stub，仅 warn，不抛错。
 */
export async function copyDesignTokens(
  outputRoot: string,
  tier: string,
): Promise<boolean> {
  const src = path.join(outputRoot, "tokens.css");
  const dest = path.join(outputRoot, tokensDestForTier(tier));
  try {
    const css = await fs.readFile(src, "utf-8");
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, css, "utf-8");
    return true;
  } catch (e) {
    console.warn(
      `[CodingAPI] design tokens.css not applied (using scaffold stub): ${e instanceof Error ? e.message : String(e)}`,
    );
    return false;
  }
}
