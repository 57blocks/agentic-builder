/**
 * StyleSpec → standalone HTML visualisation document.
 *
 * Produces a self-contained HTML file that:
 *   - defines all tokens as CSS variables
 *   - renders a colour palette, type scale, spacing scale, components preview
 *   - includes the original reference image at the top
 *
 * The output is shown in the Knowledge UI (iframe preview) and is also
 * embedded into the `design-knowledge` record body so the DesignAgent can
 * read concrete visual examples during recall.
 */

import type { StyleSpec, StyleSpecColor } from "./types";

function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function colorCard(label: string, c?: StyleSpecColor): string {
  if (!c) return "";
  return `
    <div class="swatch">
      <div class="swatch__chip" style="background:${esc(c.hex)}"></div>
      <div class="swatch__meta">
        <div class="swatch__label">${esc(label)}</div>
        <div class="swatch__hex">${esc(c.hex)}</div>
        ${c.label ? `<div class="swatch__name">${esc(c.label)}</div>` : ""}
      </div>
    </div>`;
}

export function renderStyleSpecHtml(spec: StyleSpec): string {
  const p = spec.palette;
  const t = spec.typography;
  const r = spec.radius;
  const baseFont = t.bodyFont;

  const cssVars = `
    --color-primary:    ${p.primary.hex};
    --color-secondary:  ${p.secondary?.hex ?? p.primary.hex};
    --color-accent:     ${p.accent?.hex ?? p.primary.hex};
    --color-background: ${p.background.hex};
    --color-surface:    ${p.surface.hex};
    --color-text:       ${p.text.hex};
    --color-text-muted: ${p.textMuted?.hex ?? p.text.hex};
    --color-border:     ${p.border?.hex ?? p.text.hex + "22"};
    --color-success:    ${p.success?.hex ?? "#22c55e"};
    --color-warning:    ${p.warning?.hex ?? "#f59e0b"};
    --color-danger:     ${p.danger?.hex ?? "#ef4444"};
    --font-heading: '${t.headingFont}', system-ui, sans-serif;
    --font-body:    '${t.bodyFont}', system-ui, sans-serif;
    --font-mono:    '${t.monoFont ?? "JetBrains Mono"}', ui-monospace, monospace;
    --weight-heading: ${t.headingWeight};
    --weight-body:    ${t.bodyWeight};
    --size-base:      ${t.baseSizePx}px;
    --radius-sm: ${r.smPx}px;
    --radius-md: ${r.mdPx}px;
    --radius-lg: ${r.lgPx}px;
    --radius-pill: ${r.pillPx ?? 999}px;
  `;

  const paletteCards = [
    colorCard("Primary", p.primary),
    colorCard("Secondary", p.secondary),
    colorCard("Accent", p.accent),
    colorCard("Background", p.background),
    colorCard("Surface", p.surface),
    colorCard("Text", p.text),
    colorCard("Text muted", p.textMuted),
    colorCard("Border", p.border),
    colorCard("Success", p.success),
    colorCard("Warning", p.warning),
    colorCard("Danger", p.danger),
  ]
    .filter(Boolean)
    .join("\n");

  const spacingBars = spec.spacing.scalePx
    .map(
      (px) => `
      <div class="spacing__row">
        <div class="spacing__bar" style="width:${px}px"></div>
        <div class="spacing__label">${px}px</div>
      </div>`,
    )
    .join("");

  const componentEntries = Object.entries(spec.components).filter(
    ([, v]) => v?.description,
  );
  const componentList = componentEntries
    .map(
      ([name, def]) => `
      <div class="component">
        <div class="component__name">${esc(name)}</div>
        <div class="component__desc">${esc(def!.description)}</div>
      </div>`,
    )
    .join("");

  // Build CSS-crop tiles from the reference screenshot itself.
  // Each tile uses object-position to zoom into a named region of the image
  // so every "element detail" is guaranteed to match the actual design.
  const cropTiles = buildCropTiles(spec);

  const fontImports = buildFontImports([t.headingFont, t.bodyFont, t.monoFont]);

  const shadowList = (spec.shadows ?? [])
    .map((s) => `<div class="shadow-card" style="box-shadow:${esc(s)}">${esc(s)}</div>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Style Spec — ${esc(spec.imageName)}</title>
${fontImports}
<style>
:root {${cssVars}}
* { box-sizing: border-box; }
body {
  margin: 0;
  padding: 32px;
  background: var(--color-background);
  color: var(--color-text);
  font-family: var(--font-body);
  font-weight: var(--weight-body);
  font-size: var(--size-base);
  line-height: 1.55;
}
h1, h2, h3 {
  font-family: var(--font-heading);
  font-weight: var(--weight-heading);
  color: var(--color-text);
  margin: 0 0 12px;
}
h1 { font-size: 2rem; }
h2 { font-size: 1.4rem; margin-top: 40px; padding-bottom: 8px; border-bottom: 1px solid var(--color-border); }
h3 { font-size: 1.1rem; margin-top: 24px; }
.muted { color: var(--color-text-muted); }
.kicker { display: inline-block; padding: 4px 10px; border-radius: var(--radius-pill);
  background: var(--color-primary); color: white; font-size: 12px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.05em; }
.header { display: flex; gap: 24px; align-items: flex-start; flex-wrap: wrap; }
.header img { max-width: 380px; width: 100%; border-radius: var(--radius-md);
  border: 1px solid var(--color-border); }
.header__body { flex: 1; min-width: 260px; }
.tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
.tag { padding: 4px 10px; border-radius: var(--radius-pill); background: var(--color-surface);
  border: 1px solid var(--color-border); font-size: 12px; color: var(--color-text-muted); }
.palette { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
.swatch { background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: var(--radius-md); padding: 12px; }
.swatch__chip { height: 64px; border-radius: var(--radius-sm); border: 1px solid var(--color-border); }
.swatch__meta { margin-top: 8px; }
.swatch__label { font-weight: 600; font-size: 13px; }
.swatch__hex { font-family: var(--font-mono); font-size: 12px; color: var(--color-text-muted); }
.swatch__name { font-size: 11px; color: var(--color-text-muted); margin-top: 2px; }
.type-stack { display: grid; gap: 8px; padding: 16px; background: var(--color-surface);
  border: 1px solid var(--color-border); border-radius: var(--radius-md); }
.type-stack h3 { margin: 0; }
.spacing { display: grid; gap: 4px; padding: 12px; background: var(--color-surface);
  border: 1px solid var(--color-border); border-radius: var(--radius-md); }
.spacing__row { display: flex; align-items: center; gap: 12px; }
.spacing__bar { height: 16px; background: var(--color-primary); border-radius: var(--radius-sm); }
.spacing__label { font-family: var(--font-mono); font-size: 12px; color: var(--color-text-muted);
  min-width: 60px; }
.preview { display: grid; gap: 16px; padding: 16px; background: var(--color-surface);
  border: 1px solid var(--color-border); border-radius: var(--radius-md); }
.btn-row { display: flex; gap: 12px; flex-wrap: wrap; }
.btn { padding: 10px 20px; border: none; border-radius: var(--radius-md); cursor: pointer;
  font-family: var(--font-body); font-weight: 600; font-size: 14px; }
.btn-primary { background: var(--color-primary); color: white; }
.btn-secondary { background: var(--color-surface); color: var(--color-text);
  border: 1px solid var(--color-border); }
.btn-danger { background: var(--color-danger); color: white; }
.card { padding: 16px; background: var(--color-background); border: 1px solid var(--color-border);
  border-radius: var(--radius-lg); }
.card h3 { margin-top: 0; }
.input { width: 100%; padding: 10px 14px; background: var(--color-background);
  border: 1px solid var(--color-border); border-radius: var(--radius-md);
  color: var(--color-text); font-family: var(--font-body); font-size: 14px; }
.component { padding: 12px 16px; background: var(--color-surface);
  border: 1px solid var(--color-border); border-radius: var(--radius-md);
  margin-bottom: 8px; }
.component__name { font-weight: 600; font-size: 14px; margin-bottom: 4px;
  color: var(--color-primary); text-transform: capitalize; }
.component__desc { font-size: 13px; color: var(--color-text-muted); }
.shadow-card { padding: 16px; background: var(--color-surface);
  border-radius: var(--radius-md); margin-bottom: 12px; font-family: var(--font-mono);
  font-size: 12px; }
.section { margin-top: 32px; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 720px) { .grid-2 { grid-template-columns: 1fr; } }
.crop-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 10px; }
.crop-tile { margin: 0; border-radius: var(--radius-md); overflow: hidden;
  border: 1px solid var(--color-border); background: var(--color-surface); }
.crop-tile__viewport { width: 100%; aspect-ratio: 4/3; overflow: hidden; position: relative; }
.crop-tile__viewport img { position: absolute; top: 0; left: 0;
  width: 100%; height: 100%; object-fit: cover; transform-origin: var(--ox) var(--oy);
  transform: scale(var(--zoom)); }
.crop-tile figcaption { padding: 7px 12px; font-size: 11px; font-weight: 500;
  color: var(--color-text-muted); background: var(--color-surface);
  border-top: 1px solid var(--color-border); letter-spacing: 0.02em; text-transform: capitalize; }
</style>
</head>
<body>
  <div class="header">
    <img src="${esc(spec.imagePath)}" alt="${esc(spec.imageName)}">
    <div class="header__body">
      <div class="kicker">${esc(spec.industry)}</div>
      <h1>${esc(spec.imageName)}</h1>
      <p class="muted">${esc(spec.summary)}</p>
      <div class="tags">
        ${spec.vibe.map((v) => `<span class="tag">${esc(v)}</span>`).join("")}
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Palette</h2>
    <div class="palette">${paletteCards}</div>
  </div>

  <div class="section grid-2">
    <div>
      <h2>Typography</h2>
      <div class="type-stack">
        <h3 style="font-size: 2rem;">Heading — ${esc(t.headingFont)} ${t.headingWeight}</h3>
        <h3 style="font-size: 1.4rem;">Subhead — ${esc(t.headingFont)} ${t.headingWeight}</h3>
        <p style="font-size: 1rem; margin: 0;">Body — ${esc(t.bodyFont)} ${t.bodyWeight} at ${t.baseSizePx}px</p>
        <p class="muted" style="font-size: 0.85rem; margin: 0;">Caption / muted text uses --color-text-muted.</p>
        ${t.monoFont ? `<code style="font-family:${esc(t.monoFont)}; font-size: 13px;">const monoExample = "${esc(t.monoFont)}";</code>` : ""}
      </div>
    </div>
    <div>
      <h2>Spacing</h2>
      <div class="spacing">${spacingBars}</div>
    </div>
  </div>

  ${
    shadowList
      ? `<div class="section"><h2>Shadows</h2>${shadowList}</div>`
      : ""
  }

  ${
    cropTiles
      ? `<div class="section">
    <h2>UI Element Details</h2>
    <p class="muted" style="margin-top:-4px;font-size:13px;">CSS-zoomed crops of the reference screenshot — each tile zooms into an identified element region.</p>
    <div class="crop-grid">${cropTiles}</div>
  </div>`
      : ""
  }

  <div class="section">
    <h2>Component Preview</h2>
    <div class="preview">
      <div class="btn-row">
        <button class="btn btn-primary">Primary</button>
        <button class="btn btn-secondary">Secondary</button>
        <button class="btn btn-danger">Danger</button>
      </div>
      <input class="input" type="text" placeholder="Search…">
      <div class="card">
        <h3>Card title</h3>
        <p class="muted">Surface card on background, ${r.lgPx}px radius, using primary as accent.</p>
        <button class="btn btn-primary" style="margin-top:8px;">Action</button>
      </div>
    </div>
  </div>

  ${
    componentList
      ? `<div class="section"><h2>Component Notes</h2>${componentList}</div>`
      : ""
  }

  ${
    spec.layout
      ? `<div class="section"><h2>Layout pattern</h2><p>${esc(spec.layout)}</p></div>`
      : ""
  }
</body>
</html>`;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build the crop-tile HTML for the "UI Element Details" section.
 *
 * Each tile shows the original screenshot zoomed and panned to a specific
 * 3×3 grid cell, so visitors can inspect named UI elements up-close without
 * any external HTTP requests.
 *
 * Implementation uses CSS:
 *   - `transform: scale(zoom)` to enlarge the image
 *   - `transform-origin` set to the centre of the target grid cell
 * The viewport container hides overflow, so only the zoomed region shows.
 */
function buildCropTiles(spec: StyleSpec): string {
  const elements = resolveElements(spec);
  return elements
    .map(({ name, col, row, zoom }) => {
      // Convert 1-indexed col/row (1-3) to percentage origins.
      // col 1 → 16.7%, col 2 → 50%, col 3 → 83.3%
      const ox = `${((col - 1) * 50).toFixed(0)}%`;
      const oy = `${((row - 1) * 50).toFixed(0)}%`;
      const z = Math.max(1.5, Math.min(zoom ?? 2.5, 6));
      return `
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="${esc(spec.imagePath)}"
            alt="${esc(name)}"
            style="--ox:${esc(ox)};--oy:${esc(oy)};--zoom:${z};"
            draggable="false"
          />
        </div>
        <figcaption>${esc(name)}</figcaption>
      </figure>`;
    })
    .join("");
}

/**
 * Resolve which visual elements to crop.
 *
 * Priority:
 *   1. `spec.visualElements` — LLM-identified elements with precise positions
 *   2. Fixed 3×3 grid scan — when the field is absent (legacy / back-compat)
 */
interface ResolvedElement {
  name: string;
  col: 1 | 2 | 3;
  row: 1 | 2 | 3;
  zoom?: number;
}

const GRID_FALLBACK: ResolvedElement[] = [
  { name: "top left",     col: 1, row: 1, zoom: 2.5 },
  { name: "hero area",    col: 2, row: 1, zoom: 2.5 },
  { name: "top right",    col: 3, row: 1, zoom: 2.5 },
  { name: "left panel",   col: 1, row: 2, zoom: 2.5 },
  { name: "center",       col: 2, row: 2, zoom: 2.5 },
  { name: "right detail", col: 3, row: 3, zoom: 3   },
];

function resolveElements(spec: StyleSpec): ResolvedElement[] {
  const els = spec.visualElements;
  if (Array.isArray(els) && els.length >= 2) {
    return els
      .filter(
        (e) =>
          e &&
          typeof e.name === "string" &&
          Number.isInteger(e.col) &&
          e.col >= 1 && e.col <= 3 &&
          Number.isInteger(e.row) &&
          e.row >= 1 && e.row <= 3,
      )
      .slice(0, 8)
      .map((e) => ({
        name: e.name,
        col: e.col as 1 | 2 | 3,
        row: e.row as 1 | 2 | 3,
        zoom: e.zoom,
      }));
  }
  return GRID_FALLBACK;
}

function buildFontImports(fonts: Array<string | undefined>): string {
  const unique = Array.from(
    new Set(
      fonts
        .filter((f): f is string => Boolean(f))
        .map((f) => f.trim())
        .filter(Boolean),
    ),
  );
  if (unique.length === 0) return "";
  // Google Fonts URL builder
  const families = unique
    .map((f) => `family=${encodeURIComponent(f)}:wght@300;400;500;600;700`)
    .join("&");
  return `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?${families}&display=swap" rel="stylesheet">`;
}
