import type { DesignTokens } from "./tokens";

const HEADER = `/**
 * Design-system semantic tokens (Tailwind v4 @theme) — GENERATED.
 *
 * 由 design 阶段从 DesignSpec 反推生成，coding 阶段复制到位。
 * HARD RULE for pages: 优先使用语义工具类（bg-primary, text-muted, rounded-md,
 * p-4, text-lg）。仅在无对应 token 时才回退任意值（bg-[#...]）。
 */`;

function block(entries: Record<string, string>, prefix: string): string {
  return Object.entries(entries)
    .map(([k, v]) => `  --${prefix}-${k}: ${v};`)
    .join("\n");
}

/**
 * shadcn-ui 期望的标准颜色名（--color-background / --color-foreground /
 * --color-primary-foreground / --color-input / --color-ring / ...）映射到项目
 * 语义调色板。这些必须落在 Tailwind 的 `--color-*` 命名空间（@theme 内），
 * 否则 shadcn 组件的 bg-background / border-input / ring-ring / *-foreground
 * 等工具类不会被生成。值取自语义 token，不产生第二套配色。
 *
 * 注：--color-primary / --color-secondary / --color-accent / --color-border
 * 已由项目语义 token 提供，shadcn 直接复用，不在此重复。
 */
function shadcnAliasBlock(colors: Record<string, string>): string {
  const pick = (k: string, fallback: string) => colors[k] ?? fallback;
  const aliases: Record<string, string> = {
    background: pick("bg", "#ffffff"),
    foreground: pick("text-primary", "#1f2a30"),
    card: pick("surface", "#ffffff"),
    "card-foreground": pick("text-primary", "#1f2a30"),
    popover: pick("surface", "#ffffff"),
    "popover-foreground": pick("text-primary", "#1f2a30"),
    "primary-foreground": pick("primary-ink", "#ffffff"),
    "secondary-foreground": pick("text-inverse", "#ffffff"),
    muted: pick("surface-soft", "#f3f6f8"),
    "muted-foreground": pick("text-muted", "#8a949b"),
    "accent-foreground": pick("text-inverse", "#ffffff"),
    destructive: pick("status-error", "#a4453a"),
    "destructive-foreground": pick("text-inverse", "#ffffff"),
    input: pick("border", "#d7dde2"),
    ring: pick("primary", "#4f6670"),
  };
  return block(aliases, "color");
}

export function renderTokensCss(tokens: DesignTokens): string {
  const lines = [
    block(tokens.colors, "color"),
    shadcnAliasBlock(tokens.colors),
    `  --font-sans: ${tokens.fonts.sans};`,
    `  --font-mono: ${tokens.fonts.mono};`,
    block(tokens.fontSizes, "text"),
    block(tokens.spacing, "spacing"),
    block(tokens.radius, "radius"),
  ].join("\n");
  return `${HEADER}\n@theme {\n${lines}\n}\n`;
}
