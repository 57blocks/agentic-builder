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

export function renderTokensCss(tokens: DesignTokens): string {
  const lines = [
    block(tokens.colors, "color"),
    `  --font-sans: ${tokens.fonts.sans};`,
    `  --font-mono: ${tokens.fonts.mono};`,
    block(tokens.fontSizes, "text"),
    block(tokens.spacing, "spacing"),
    block(tokens.radius, "radius"),
  ].join("\n");
  return `${HEADER}\n@theme {\n${lines}\n}\n`;
}
