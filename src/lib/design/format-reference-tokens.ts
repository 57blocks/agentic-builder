/**
 * Shared types + pure formatter for design tokens extracted from a live page
 * rendered in Electron (see electron/main.js `render-reference-url`).
 *
 * Kept free of any Electron / DOM / React dependency so it can be unit-tested
 * in isolation and reused by both the renderer and tests.
 */

/** Design tokens scraped from the rendered reference page. */
export interface ReferenceTokens {
  /** CSS custom properties found across the page's stylesheets (`--name` → value). */
  cssVars: Record<string, string>;
  fontFamily?: string;
  backgroundColor?: string;
  color?: string;
}

/** Result of `electronAPI.renderReferenceUrl`. */
export interface ReferenceCaptureResult {
  ok: boolean;
  /** Full-page screenshot as a JPEG data URL. */
  screenshotDataUrl?: string;
  /** Extracted design tokens (best-effort; may be null if extraction failed). */
  tokens?: ReferenceTokens | null;
  /** The URL actually landed on (after redirects). */
  finalUrl?: string;
  /** True when capture failed because an interactive login was required but not completed. */
  needsAuth?: boolean;
  error?: string;
}

/** Cap on how many CSS variables we inline into the prompt to bound token cost. */
const MAX_VARS = 60;

/**
 * Format extracted tokens into a Markdown block suitable for injection into the
 * design model's `designDirectionPrompt`. Returns a stable, deterministic string.
 */
export function formatReferenceTokens(
  url: string,
  tokens: ReferenceTokens | null | undefined,
): string {
  const lines: string[] = [
    `<!-- Reference URL (rendered in Electron): ${url} -->`,
    "## Extracted design tokens from the live rendered page",
    "Treat these as authoritative color/typography signals when building the Design System.",
  ];

  if (tokens?.fontFamily) lines.push(`- Body font-family: ${tokens.fontFamily}`);
  if (tokens?.backgroundColor) lines.push(`- Body background: ${tokens.backgroundColor}`);
  if (tokens?.color) lines.push(`- Body text color: ${tokens.color}`);

  const entries = Object.entries(tokens?.cssVars ?? {});
  if (entries.length > 0) {
    const shown = entries
      .slice(0, MAX_VARS)
      .map(([k, v]) => `${k}: ${v}`)
      .join("; ");
    const suffix = entries.length > MAX_VARS ? ` … (+${entries.length - MAX_VARS} more)` : "";
    lines.push(`- CSS variables: ${shown}${suffix}`);
  }

  return lines.join("\n");
}
