import path from "path";
import fs from "fs/promises";
import { deriveTokensFromDesignSpec } from "@/lib/design/derive-tokens";
import { renderTokensCss } from "@/lib/design/render-tokens-css";

/** tier → 生成项目内 tokens.css 的相对目标路径。 */
export function tokensDestForTier(tier: string): string {
  const t = tier.toLowerCase();
  return t === "s"
    ? "src/styles/tokens.css"
    : "frontend/src/styles/tokens.css";
}

/**
 * 解析出本次项目应使用的 tokens.css 内容（确定性，服务端，与前端 UI 是否运行无关）。
 * 优先级：
 *   1. `<outputRoot>/tokens.css` —— 若 design 步骤已显式产出（如交互式 UI 流程）。
 *   2. 从 `<outputRoot>/DesignSpec.md` 反推 —— DesignSpec 内嵌 `:root{}`，在 coding
 *      阶段必定存在；这条路径让 headless / Ralph 等自动化运行也能拿到设计派生 token。
 * 都没有则返回 null（保留 scaffold stub）。
 */
async function resolveDesignTokensCss(outputRoot: string): Promise<string | null> {
  // 1) design 阶段显式产出的 tokens.css
  try {
    return await fs.readFile(path.join(outputRoot, "tokens.css"), "utf-8");
  } catch {
    /* fall through to DesignSpec derivation */
  }
  // 2) 从 DesignSpec.md 反推（服务端确定性）
  try {
    const spec = await fs.readFile(
      path.join(outputRoot, "DesignSpec.md"),
      "utf-8",
    );
    if (spec.trim()) {
      return renderTokensCss(deriveTokensFromDesignSpec(spec));
    }
  } catch {
    /* no DesignSpec either */
  }
  return null;
}

/**
 * 把设计派生的 tokens.css 写入 tier 对应的最终位置。
 * 必须在 copyScaffold(forceOverwrite) 之后调用，否则会被 stub 覆盖。
 * 优雅回退：无显式 tokens.css 且无 DesignSpec 时保留 scaffold stub，仅 warn，不抛错。
 */
export async function copyDesignTokens(
  outputRoot: string,
  tier: string,
): Promise<boolean> {
  const css = await resolveDesignTokensCss(outputRoot);
  const dest = path.join(outputRoot, tokensDestForTier(tier));
  if (!css) {
    console.warn(
      "[CodingAPI] design tokens.css not applied (no tokens.css / DesignSpec.md; using scaffold stub)",
    );
    return false;
  }
  try {
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, css, "utf-8");
    return true;
  } catch (e) {
    console.warn(
      `[CodingAPI] failed to write design tokens.css (using scaffold stub): ${e instanceof Error ? e.message : String(e)}`,
    );
    return false;
  }
}
