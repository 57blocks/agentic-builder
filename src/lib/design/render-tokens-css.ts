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
 * shadcn-ui 期望的标准 CSS 变量层，引用上面的语义 token（不复制颜色值）。
 * 使 shadcn 组件类（bg-primary, border-input, ring-ring, rounded-[--radius]）开箱即用，
 * 且与项目语义调色板绑定，不产生第二套颜色源。
 */
const SHADCN_MAP = `
:root {
  --background: var(--color-bg);
  --foreground: var(--color-text-primary);
  --card: var(--color-surface);
  --card-foreground: var(--color-text-primary);
  --popover: var(--color-surface);
  --popover-foreground: var(--color-text-primary);
  --primary: var(--color-primary);
  --primary-foreground: var(--color-primary-ink);
  --secondary: var(--color-secondary);
  --secondary-foreground: var(--color-text-inverse);
  --muted: var(--color-surface-soft);
  --muted-foreground: var(--color-text-muted);
  --accent: var(--color-accent);
  --accent-foreground: var(--color-text-inverse);
  --destructive: var(--color-status-error);
  --destructive-foreground: var(--color-text-inverse);
  --border: var(--color-border);
  --input: var(--color-border);
  --ring: var(--color-primary);
  --radius: var(--radius-md);
}
`;

export function renderTokensCss(tokens: DesignTokens): string {
  const lines = [
    block(tokens.colors, "color"),
    `  --font-sans: ${tokens.fonts.sans};`,
    `  --font-mono: ${tokens.fonts.mono};`,
    block(tokens.fontSizes, "text"),
    block(tokens.spacing, "spacing"),
    block(tokens.radius, "radius"),
  ].join("\n");
  return `${HEADER}\n@theme {\n${lines}\n}\n${SHADCN_MAP}`;
}
