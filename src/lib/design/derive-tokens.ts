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

/** DesignSpec 语义短名 → DesignTokens 桶。 */
function classify(varName: string): { bucket: keyof DesignTokens; key: string } | null {
  if (varName.startsWith("space-")) return { bucket: "spacing", key: varName.slice(6) };
  if (varName.startsWith("text-") && /-(xs|sm|base|lg|xl|\dxl|\d)$/.test(varName))
    return { bucket: "fontSizes", key: varName.slice(5) };
  if (varName.startsWith("radius-")) return { bucket: "radius", key: varName.slice(7) };
  // 其余都当颜色（--primary, --text-primary, --surface, --status-success ...）
  return { bucket: "colors", key: varName };
}

export function deriveTokensFromDesignSpec(html: string): DesignTokens {
  const vars = parseRootVars(html ?? "");
  const t: DesignTokens = {
    colors: { ...DEFAULT_TOKENS.colors },
    fonts: { ...DEFAULT_TOKENS.fonts },
    fontSizes: { ...DEFAULT_TOKENS.fontSizes },
    spacing: { ...DEFAULT_TOKENS.spacing },
    radius: { ...DEFAULT_TOKENS.radius },
  };
  for (const [name, value] of Object.entries(vars)) {
    // fonts are handled here; classify() only returns spacing/fontSizes/radius/colors
    if (name === "font-sans") { t.fonts.sans = value; continue; }
    if (name === "font-mono") { t.fonts.mono = value; continue; }
    const c = classify(name);
    if (!c) continue;
    (t[c.bucket] as Record<string, string>)[c.key] = value;
  }
  return t;
}
