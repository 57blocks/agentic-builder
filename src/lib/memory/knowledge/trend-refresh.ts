/**
 * Daily Design Trend refresh — body composer.
 *
 * The refresh endpoint (`/api/memory/knowledge/refresh`) asks the LLM for a
 * short Markdown trend note. We wrap that note into a `design-knowledge`
 * record body that mirrors the Style-Spec layout, so the same Knowledge UI
 * preview modal can render either type of record:
 *
 *   <!-- trend-refresh:json
 *   { industry, year, label, refreshedAt }
 *   -->
 *
 *   # Design Trends <year> — <label>
 *
 *   ## Trend Report (Markdown)
 *   …LLM markdown…
 *
 *   ## Trend Report (HTML)
 *   ```html
 *   …self-contained HTML document, themed per industry…
 *   ```
 *
 * The HTML view is for the Knowledge page preview only — recall still uses
 * the Markdown section, so trend records stay token-cheap.
 */

import type { StyleSpecIndustry } from "./style-spec/types";

const JSON_OPEN = "<!-- trend-refresh:json";
const JSON_CLOSE = "-->";

interface ComposeInput {
  industry: StyleSpecIndustry;
  label: string;
  year: number;
  trendMarkdown: string;
  refreshedAt: string;
}

export function composeTrendRefreshBody(input: ComposeInput): string {
  const meta = {
    industry: input.industry,
    label: input.label,
    year: input.year,
    refreshedAt: input.refreshedAt,
  };
  const md = input.trendMarkdown.trim();
  const html = renderTrendRefreshHtml(input, md);

  return [
    JSON_OPEN,
    JSON.stringify(meta, null, 2),
    JSON_CLOSE,
    "",
    `# Design Trends ${input.year} — ${input.label}`,
    "",
    "## Trend Report (Markdown)",
    "",
    md,
    "",
    "## Trend Report (HTML)",
    "",
    "```html",
    html,
    "```",
    "",
  ].join("\n");
}

export function extractTrendRefreshMarkdown(body: string): string | null {
  const m = body.match(
    /## Trend Report \(Markdown\)\s*([\s\S]*?)\n## Trend Report \(HTML\)/,
  );
  return m ? m[1].trim() : null;
}

// ─── HTML renderer ───────────────────────────────────────────────────────────

interface Theme {
  bg: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
  accentSoft: string;
  badge: string;
  badgeBg: string;
}

const THEMES: Record<StyleSpecIndustry, Theme> = {
  ai: {
    bg: "#0b0d18",
    surface: "#161a2c",
    text: "#f3f4f8",
    muted: "#9aa3bd",
    border: "#27304d",
    accent: "#8b5cf6",
    accentSoft: "rgba(139, 92, 246, 0.16)",
    badge: "#c4b5fd",
    badgeBg: "rgba(139, 92, 246, 0.18)",
  },
  "fintech-web3": {
    bg: "#0a0f1f",
    surface: "#111935",
    text: "#eef1ff",
    muted: "#94a3c4",
    border: "#1f2a4a",
    accent: "#6366f1",
    accentSoft: "rgba(99, 102, 241, 0.18)",
    badge: "#a5b4fc",
    badgeBg: "rgba(99, 102, 241, 0.18)",
  },
  saas: {
    bg: "#f7f9fc",
    surface: "#ffffff",
    text: "#0f172a",
    muted: "#64748b",
    border: "#e2e8f0",
    accent: "#0ea5e9",
    accentSoft: "rgba(14, 165, 233, 0.12)",
    badge: "#0369a1",
    badgeBg: "rgba(14, 165, 233, 0.12)",
  },
  generic: {
    bg: "#0f172a",
    surface: "#1e293b",
    text: "#f1f5f9",
    muted: "#94a3b8",
    border: "#334155",
    accent: "#22d3ee",
    accentSoft: "rgba(34, 211, 238, 0.14)",
    badge: "#67e8f9",
    badgeBg: "rgba(34, 211, 238, 0.16)",
  },
};

function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Convert the trend Markdown into HTML.
 *
 * The LLM is asked for a tightly-structured note (### sections + bullet
 * lists with **bold** lead-ins), so a small purpose-built converter is
 * enough and avoids pulling a markdown lib server-side.
 */
function markdownToHtml(md: string): string {
  const lines = md.split(/\r?\n/);
  const out: string[] = [];
  let inList = false;
  let inParagraph = false;
  const closeList = () => {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  };
  const closeParagraph = () => {
    if (inParagraph) {
      out.push("</p>");
      inParagraph = false;
    }
  };

  const inline = (text: string): string => {
    // Order matters: escape first, then re-introduce inline markup.
    let t = esc(text);
    t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    t = t.replace(/`([^`]+)`/g, "<code>$1</code>");
    t = t.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    return t;
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      closeList();
      closeParagraph();
      continue;
    }
    const h3 = line.match(/^###\s+(.*)/);
    const h2 = line.match(/^##\s+(.*)/);
    const h1 = line.match(/^#\s+(.*)/);
    const bullet = line.match(/^\s*[-*]\s+(.*)/);

    if (h3) {
      closeList();
      closeParagraph();
      out.push(`<h3>${inline(h3[1])}</h3>`);
    } else if (h2) {
      closeList();
      closeParagraph();
      out.push(`<h2>${inline(h2[1])}</h2>`);
    } else if (h1) {
      closeList();
      closeParagraph();
      out.push(`<h1>${inline(h1[1])}</h1>`);
    } else if (bullet) {
      closeParagraph();
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${inline(bullet[1])}</li>`);
    } else {
      closeList();
      if (!inParagraph) {
        out.push("<p>");
        inParagraph = true;
      }
      out.push(inline(line));
    }
  }
  closeList();
  closeParagraph();
  return out.join("\n");
}

function renderTrendRefreshHtml(
  input: ComposeInput,
  trendMarkdown: string,
): string {
  const theme = THEMES[input.industry] ?? THEMES.generic;
  const bodyHtml = markdownToHtml(trendMarkdown);
  const dateLabel = input.refreshedAt.slice(0, 10);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Design Trends ${esc(String(input.year))} — ${esc(input.label)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
<style>
:root {
  --bg: ${theme.bg};
  --surface: ${theme.surface};
  --text: ${theme.text};
  --muted: ${theme.muted};
  --border: ${theme.border};
  --accent: ${theme.accent};
  --accent-soft: ${theme.accentSoft};
  --badge: ${theme.badge};
  --badge-bg: ${theme.badgeBg};
}
* { box-sizing: border-box; }
body {
  margin: 0;
  padding: 0;
  background: var(--bg);
  color: var(--text);
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 15px;
  line-height: 1.65;
  min-height: 100vh;
}
.wrap { max-width: 880px; margin: 0 auto; padding: 56px 32px 96px; }
.hero {
  background: linear-gradient(135deg, var(--accent-soft) 0%, transparent 70%);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 36px 36px 32px;
  margin-bottom: 40px;
}
.kicker {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 5px 12px; border-radius: 999px;
  background: var(--badge-bg); color: var(--badge);
  font-family: 'Space Grotesk', sans-serif;
  font-size: 11px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.08em;
}
.hero h1 {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 2.2rem; line-height: 1.15; font-weight: 700;
  margin: 14px 0 6px;
  color: var(--text);
}
.hero .meta {
  display: flex; gap: 12px; flex-wrap: wrap;
  font-size: 13px; color: var(--muted);
  margin-top: 14px;
}
.hero .meta span::before { content: "·"; margin-right: 12px; color: var(--border); }
.hero .meta span:first-child::before { content: ""; margin: 0; }
.content h1, .content h2, .content h3 {
  font-family: 'Space Grotesk', sans-serif;
  color: var(--text);
  margin-top: 36px; margin-bottom: 14px;
  font-weight: 600;
}
.content h1 { font-size: 1.6rem; }
.content h2 { font-size: 1.3rem; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
.content h3 {
  font-size: 1.05rem;
  padding-left: 12px;
  border-left: 3px solid var(--accent);
  color: var(--accent);
}
.content p { margin: 12px 0; color: var(--text); }
.content ul {
  list-style: none; padding: 0; margin: 16px 0;
}
.content ul li {
  position: relative;
  background: var(--surface);
  border: 1px solid var(--border);
  border-left: 3px solid var(--accent);
  border-radius: 12px;
  padding: 14px 18px 14px 22px;
  margin-bottom: 10px;
}
.content ul li strong {
  color: var(--accent);
  font-weight: 600;
}
.content code {
  background: var(--accent-soft);
  color: var(--accent);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.85em;
}
.content em { color: var(--muted); }
.footer {
  margin-top: 56px;
  padding-top: 24px;
  border-top: 1px solid var(--border);
  font-size: 12px; color: var(--muted);
  display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px;
}
</style>
</head>
<body>
  <div class="wrap">
    <div class="hero">
      <div class="kicker">⚡ Trend Refresh · ${esc(input.industry)}</div>
      <h1>Design Trends ${esc(String(input.year))}<br><span style="color: var(--muted); font-size: 1.2rem;">${esc(input.label)}</span></h1>
      <div class="meta">
        <span>Generated ${esc(dateLabel)}</span>
        <span>LLM-distilled industry signal</span>
        <span>Used as DesignAgent injection context</span>
      </div>
    </div>
    <div class="content">
      ${bodyHtml}
    </div>
    <div class="footer">
      <span>design-knowledge · daily-refresh · industry:${esc(input.industry)}</span>
      <span>Auto-injected into DesignAgent when PRD matches this industry.</span>
    </div>
  </div>
</body>
</html>`;
}
