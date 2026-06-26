import { DEFAULT_TOKENS, type DesignTokens } from "./tokens";

/** 提取第一个 :root{} 块里的 --var: value; 键值对。 */
function parseRootVars(html: string): Record<string, string> {
  const out: Record<string, string> = {};
  const root = /:root\s*\{([^}]*)\}/m.exec(html);
  if (!root) return out;
  const decl = /--([\w-]+)\s*:\s*([^;]+);/g;
  let m: RegExpExecArray | null;
  while ((m = decl.exec(root[1])) !== null) {
    out[m[1].trim()] = m[2].trim();
  }
  return out;
}

type MapBucket = "colors" | "fontSizes" | "spacing" | "radius" | "shadows" | "lineHeights" | "extras";

/**
 * DesignSpec 语义短名 → DesignTokens 桶 + 该桶内的 key。
 *
 * 大多数未知变量在设计稿里确实是颜色（--surface, --role-student, --progress-low …），
 * 所以 catch-all 仍归 colors；但明确的非颜色命名（阴影 / 行高 / 渐变）单独路由，
 * 避免被塞进 `--color-*`：
 *   --shadow-*            → shadows     → 渲染 `--shadow-*`
 *   --lh-* / --leading-*  → lineHeights → 渲染 `--leading-*`
 *   *-gradient / gradient → extras      → 原样透传 `--<name>`（不进 --color-*）
 */
function classify(varName: string): { bucket: MapBucket; key: string } {
  if (varName.startsWith("space-")) return { bucket: "spacing", key: varName.slice(6) };
  if (varName.startsWith("text-") && /-(xs|sm|base|lg|xl|\dxl|\d)$/.test(varName))
    return { bucket: "fontSizes", key: varName.slice(5) };
  if (varName.startsWith("radius-")) return { bucket: "radius", key: varName.slice(7) };
  if (varName === "shadow" || varName.startsWith("shadow-"))
    return { bucket: "shadows", key: varName === "shadow" ? "DEFAULT" : varName.slice(7) };
  if (varName.startsWith("lh-")) return { bucket: "lineHeights", key: varName.slice(3) };
  if (varName.startsWith("leading-")) return { bucket: "lineHeights", key: varName.slice(8) };
  if (/(^|-)gradient(-|$)/.test(varName)) return { bucket: "extras", key: varName };
  // 其余都当颜色（--primary, --text-primary, --surface, --status-success ...）
  return { bucket: "colors", key: varName };
}

export function deriveTokensFromDesignSpec(html: string): DesignTokens {
  const vars = parseRootVars(html ?? "");
  const t: Required<DesignTokens> = {
    colors: { ...DEFAULT_TOKENS.colors },
    fonts: { ...DEFAULT_TOKENS.fonts },
    fontSizes: { ...DEFAULT_TOKENS.fontSizes },
    spacing: { ...DEFAULT_TOKENS.spacing },
    radius: { ...DEFAULT_TOKENS.radius },
    shadows: { ...(DEFAULT_TOKENS.shadows ?? {}) },
    lineHeights: { ...(DEFAULT_TOKENS.lineHeights ?? {}) },
    extras: { ...(DEFAULT_TOKENS.extras ?? {}) },
  };
  for (const [name, value] of Object.entries(vars)) {
    // fonts 在此处理；classify() 不返回 fonts。
    if (name === "font-sans") { t.fonts.sans = value; continue; }
    if (name === "font-mono") { t.fonts.mono = value; continue; }
    const c = classify(name);
    (t[c.bucket] as Record<string, string>)[c.key] = value;
  }
  return t;
}
