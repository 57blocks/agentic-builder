export interface DesignTokens {
  /** 语义颜色，键名沿用脚手架 stub（primary, surface, text-primary, status-success ...）。 */
  colors: Record<string, string>;
  /** 字体族。 */
  fonts: { sans: string; mono: string };
  /** 字号标度，键名如 xs/sm/base/lg/xl/2xl/3xl/4xl。 */
  fontSizes: Record<string, string>;
  /** 间距标度（p-x/m-x/gap-x 共用），键名如 1/2/3/4/6/8/12。 */
  spacing: Record<string, string>;
  /** 圆角标度：sm/md/lg/xl/pill。 */
  radius: Record<string, string>;
}

/**
 * 降级预设：值取自 scaffolds/m-tier 的 tokens.css 调色板，补齐字体/字号/间距的中性默认。
 * 作用：① 字段级兜底（deepMerge 的 base）② 文件级兜底（三档 stub 由它渲染）。
 */
export const DEFAULT_TOKENS: DesignTokens = {
  colors: {
    primary: "#4f6670",
    "primary-light": "#dbe4e8",
    "primary-dark": "#3a4d56",
    "primary-ink": "#ffffff",
    secondary: "#6f8c96",
    "secondary-light": "#d8e4e8",
    "secondary-dark": "#58717a",
    accent: "#b5713f",
    "accent-light": "#f0d8c4",
    "accent-dark": "#8f5730",
    bg: "#f4f6f8",
    "bg-subtle": "#fbfcfd",
    surface: "#ffffff",
    "surface-soft": "#f3f6f8",
    "surface-tint": "#eef3f6",
    border: "#d7dde2",
    "border-strong": "#bcc6cd",
    "text-primary": "#1f2a30",
    "text-secondary": "#4d5a62",
    "text-muted": "#8a949b",
    "text-inverse": "#ffffff",
    "status-success": "#4f7a52",
    "status-success-bg": "#e7f1e6",
    "status-warning": "#9a6a1f",
    "status-warning-bg": "#f7ecd6",
    "status-error": "#a4453a",
    "status-error-bg": "#f7e2df",
    "status-info": "#4f6670",
    "status-info-bg": "#e6eef1",
  },
  fonts: {
    sans: "Inter, system-ui, -apple-system, sans-serif",
    mono: "'Fira Code', ui-monospace, monospace",
  },
  fontSizes: {
    xs: "0.75rem",
    sm: "0.875rem",
    base: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
    "3xl": "1.875rem",
    "4xl": "2.25rem",
  },
  spacing: {
    "1": "0.25rem",
    "2": "0.5rem",
    "3": "0.75rem",
    "4": "1rem",
    "5": "1.25rem",
    "6": "1.5rem",
    "8": "2rem",
    "10": "2.5rem",
    "12": "3rem",
  },
  radius: {
    sm: "8px",
    md: "12px",
    lg: "16px",
    xl: "24px",
    pill: "999px",
  },
};
