---
{"id":"DK-img-auto-ai-2026-05-16-3-jasper-ai","layer":"L1","kind":"design-knowledge","title":"Style Spec — auto-ai-2026-05-16-3-jasper-ai.png","tags":["industry:generic","source:vision-distill","image:auto-ai-2026-05-16-3-jasper-ai.png","manual:approved"],"source":"distill","refs":{},"createdAt":1778926071971,"updatedAt":1779236053687,"schemaVersion":1}
---

<!-- style-spec:json
{
  "industry": "generic",
  "summary": "A clean, editorial-style SaaS landing page with generous whitespace, oversized serif hero typography, and sharp high-contrast CTAs. The design mixes soft neutral surfaces with deep navy text, vivid orange action accents, and a playful pastel grid motif near the footer.",
  "vibe": [
    "minimal",
    "editorial",
    "clean",
    "confident",
    "modern"
  ],
  "palette": {
    "primary": {
      "hex": "#0c1459",
      "label": "deep navy"
    },
    "secondary": {
      "hex": "#ff4b2b",
      "label": "bright orange-red"
    },
    "accent": {
      "hex": "#d8efc3",
      "label": "soft lime tag"
    },
    "background": {
      "hex": "#f2f2f2",
      "label": "light gray page background"
    },
    "surface": {
      "hex": "#ffffff",
      "label": "white cards and header"
    },
    "text": {
      "hex": "#0c1459",
      "label": "primary navy text"
    },
    "textMuted": {
      "hex": "#3f456f",
      "label": "muted indigo-gray"
    },
    "border": {
      "hex": "#cfcfcf",
      "label": "soft gray border"
    }
  },
  "typography": {
    "headingFont": "Canela",
    "bodyFont": "Inter",
    "headingWeight": 500,
    "bodyWeight": 400,
    "baseSizePx": 16,
    "notes": [
      "oversized serif hero heading",
      "compact sans-serif navigation",
      "centered marketing layout"
    ]
  },
  "spacing": {
    "basePx": 8,
    "scalePx": [
      4,
      8,
      12,
      16,
      24,
      32,
      48,
      64
    ]
  },
  "radius": {
    "smPx": 4,
    "mdPx": 8,
    "lgPx": 16,
    "pillPx": 999
  },
  "shadows": [
    "0 1px 2px rgba(0,0,0,0.04)",
    "0 8px 24px rgba(0,0,0,0.10)"
  ],
  "surfaceEffects": [
    {
      "name": "soft card elevation",
      "description": "cookie consent modal uses a white surface with subtle border and low shadow for gentle separation from the page",
      "cssHints": [
        "background: #ffffff",
        "border: 1px solid rgba(0,0,0,0.08)",
        "box-shadow: 0 8px 24px rgba(0,0,0,0.10)"
      ]
    }
  ],
  "stateTokens": [
    {
      "component": "button.primary",
      "state": "default",
      "treatment": "solid orange-red fill with white text and crisp rectangular shape"
    },
    {
      "component": "button.primary",
      "state": "hover",
      "treatment": "slightly darker orange-red fill with minimal transition and preserved high contrast"
    },
    {
      "component": "button.primary",
      "state": "focus",
      "treatment": "thin navy or blue focus ring outside button bounds"
    },
    {
      "component": "button.secondary",
      "state": "default",
      "treatment": "light background with navy border and navy text"
    },
    {
      "component": "nav.link",
      "state": "hover",
      "treatment": "text remains navy with subtle opacity shift or underline emphasis"
    }
  ],
  "components": {
    "button": {
      "description": "Rectangular CTA buttons with medium padding; primary uses solid orange-red fill, secondary uses light surface with navy outline, while cookie buttons use pill shapes with blue outlines."
    },
    "card": {
      "description": "Cookie consent card is a rounded white panel with subtle gray border, soft shadow, and horizontally arranged actions."
    },
    "navigation": {
      "description": "Top navigation bar on a white strip with left-aligned wordmark, centered nav links, and right-aligned auth links plus standout demo CTA."
    }
  },
  "layout": "top navigation + centered hero stack with announcement pill and dual CTAs + bottom cookie consent modal + decorative pastel grid accents near footer edges",
  "visualElements": [
    {
      "name": "brand logo",
      "col": 1,
      "row": 1,
      "zoom": 3.5
    },
    {
      "name": "top navigation",
      "col": 2,
      "row": 1,
      "zoom": 2.8
    },
    {
      "name": "hero headline",
      "col": 2,
      "row": 1,
      "zoom": 2.2
    },
    {
      "name": "cta buttons",
      "col": 2,
      "row": 2,
      "zoom": 3.8
    },
    {
      "name": "cookie modal",
      "col": 2,
      "row": 3,
      "zoom": 2.4
    },
    {
      "name": "pastel grid accent",
      "col": 1,
      "row": 3,
      "zoom": 3.2
    }
  ],
  "imagePath": "/knowledge-refs/auto-ai-2026-05-16-3-jasper-ai.png",
  "imageName": "auto-ai-2026-05-16-3-jasper-ai.png",
  "capturedAt": "2026-05-20T00:14:13.686Z",
  "model": "openai/gpt-5.4-20260305"
}
-->

# Style Spec — auto-ai-2026-05-16-3-jasper-ai.png

## Style Spec (Markdown)

**Industry**: generic
**Image**: auto-ai-2026-05-16-3-jasper-ai.png
**Vibe**: minimal, editorial, clean, confident, modern

**Summary**: A clean, editorial-style SaaS landing page with generous whitespace, oversized serif hero typography, and sharp high-contrast CTAs. The design mixes soft neutral surfaces with deep navy text, vivid orange action accents, and a playful pastel grid motif near the footer.

### Palette
- Primary: `#0c1459` — deep navy
- Secondary: `#ff4b2b` — bright orange-red
- Accent: `#d8efc3` — soft lime tag
- Background: `#f2f2f2` — light gray page background
- Surface: `#ffffff` — white cards and header
- Text: `#0c1459` — primary navy text
- Text muted: `#3f456f` — muted indigo-gray
- Border: `#cfcfcf` — soft gray border

### Typography
- Heading font: Canela (weight 500)
- Body font: Inter (weight 400)
- Base size: 16px
- Note: oversized serif hero heading
- Note: compact sans-serif navigation
- Note: centered marketing layout

### Spacing & Radius
- Spacing base: 8px; scale: 4, 8, 12, 16, 24, 32, 48, 64
- Radius: sm 4px, md 8px, lg 16px, pill 999px
- Shadows: 2 variant(s)
  - `0 1px 2px rgba(0,0,0,0.04)`
  - `0 8px 24px rgba(0,0,0,0.10)`

### Surface Effects
- **soft card elevation**: cookie consent modal uses a white surface with subtle border and low shadow for gentle separation from the page
  - `background: #ffffff`
  - `border: 1px solid rgba(0,0,0,0.08)`
  - `box-shadow: 0 8px 24px rgba(0,0,0,0.10)`

### Interaction State Tokens
- **button.primary.default**: solid orange-red fill with white text and crisp rectangular shape
- **button.primary.hover**: slightly darker orange-red fill with minimal transition and preserved high contrast
- **button.primary.focus**: thin navy or blue focus ring outside button bounds
- **button.secondary.default**: light background with navy border and navy text
- **nav.link.hover**: text remains navy with subtle opacity shift or underline emphasis

### Components
- **button**: Rectangular CTA buttons with medium padding; primary uses solid orange-red fill, secondary uses light surface with navy outline, while cookie buttons use pill shapes with blue outlines.
- **card**: Cookie consent card is a rounded white panel with subtle gray border, soft shadow, and horizontally arranged actions.
- **navigation**: Top navigation bar on a white strip with left-aligned wordmark, centered nav links, and right-aligned auth links plus standout demo CTA.

### Layout
top navigation + centered hero stack with announcement pill and dual CTAs + bottom cookie consent modal + decorative pastel grid accents near footer edges

### UI Elements
Named UI regions identified in the reference screenshot (col/row = 3×3 grid):
- **brand logo** — col 1, row 1, zoom 3.5×
- **top navigation** — col 2, row 1, zoom 2.8×
- **hero headline** — col 2, row 1, zoom 2.2×
- **cta buttons** — col 2, row 2, zoom 3.8×
- **cookie modal** — col 2, row 3, zoom 2.4×
- **pastel grid accent** — col 1, row 3, zoom 3.2×

## Style Spec (HTML)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Style Spec — auto-ai-2026-05-16-3-jasper-ai.png</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Canela:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
    --color-primary:    #0c1459;
    --color-secondary:  #ff4b2b;
    --color-accent:     #d8efc3;
    --color-background: #f2f2f2;
    --color-surface:    #ffffff;
    --color-text:       #0c1459;
    --color-text-muted: #3f456f;
    --color-border:     #cfcfcf;
    --color-success:    #22c55e;
    --color-warning:    #f59e0b;
    --color-danger:     #ef4444;
    --font-heading: 'Canela', system-ui, sans-serif;
    --font-body:    'Inter', system-ui, sans-serif;
    --font-mono:    'JetBrains Mono', ui-monospace, monospace;
    --weight-heading: 500;
    --weight-body:    400;
    --size-base:      16px;
    --radius-sm: 4px;
    --radius-md: 8px;
    --radius-lg: 16px;
    --radius-pill: 999px;
  }
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
.signal-grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
.signal-card { background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: var(--radius-md); padding: 12px; }
.signal-preview { height: 72px; border-radius: var(--radius-sm); border: 1px solid var(--color-border); margin-bottom: 8px; }
.signal-title { font-size: 13px; font-weight: 700; color: var(--color-text); }
.signal-meta { margin-top: 4px; font-size: 12px; color: var(--color-text-muted); }
.signal-code { margin-top: 8px; font-family: var(--font-mono); font-size: 11px; line-height: 1.45;
  color: var(--color-text-muted); padding: 8px; border-radius: var(--radius-sm); background: var(--color-background);
  border: 1px solid var(--color-border); }
.state-table-wrap { overflow-x: auto; border: 1px solid var(--color-border); border-radius: var(--radius-md);
  background: var(--color-surface); }
.state-table { width: 100%; border-collapse: collapse; min-width: 680px; }
.state-table th, .state-table td { text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--color-border); font-size: 13px; }
.state-table th { color: var(--color-text-muted); font-weight: 600; }
.state-pill { display:inline-flex; align-items:center; padding: 2px 8px; border-radius: 999px; font-size: 11px;
  border: 1px solid var(--color-border); text-transform: uppercase; letter-spacing: 0.03em; }
.state-default { background: #64748b22; }
.state-hover { background: #2563eb22; }
.state-active { background: #7c3aed22; }
.state-focus { background: #06b6d422; }
.state-disabled { background: #94a3b822; }
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
    <img src="/knowledge-refs/auto-ai-2026-05-16-3-jasper-ai.png" alt="auto-ai-2026-05-16-3-jasper-ai.png">
    <div class="header__body">
      <div class="kicker">generic</div>
      <h1>auto-ai-2026-05-16-3-jasper-ai.png</h1>
      <p class="muted">A clean, editorial-style SaaS landing page with generous whitespace, oversized serif hero typography, and sharp high-contrast CTAs. The design mixes soft neutral surfaces with deep navy text, vivid orange action accents, and a playful pastel grid motif near the footer.</p>
      <div class="tags">
        <span class="tag">minimal</span><span class="tag">editorial</span><span class="tag">clean</span><span class="tag">confident</span><span class="tag">modern</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Palette</h2>
    <div class="palette">
    <div class="swatch">
      <div class="swatch__chip" style="background:#0c1459"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Primary</div>
        <div class="swatch__hex">#0c1459</div>
        <div class="swatch__name">deep navy</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#ff4b2b"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Secondary</div>
        <div class="swatch__hex">#ff4b2b</div>
        <div class="swatch__name">bright orange-red</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#d8efc3"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Accent</div>
        <div class="swatch__hex">#d8efc3</div>
        <div class="swatch__name">soft lime tag</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f2f2f2"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Background</div>
        <div class="swatch__hex">#f2f2f2</div>
        <div class="swatch__name">light gray page background</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#ffffff"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Surface</div>
        <div class="swatch__hex">#ffffff</div>
        <div class="swatch__name">white cards and header</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#0c1459"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text</div>
        <div class="swatch__hex">#0c1459</div>
        <div class="swatch__name">primary navy text</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#3f456f"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text muted</div>
        <div class="swatch__hex">#3f456f</div>
        <div class="swatch__name">muted indigo-gray</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#cfcfcf"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Border</div>
        <div class="swatch__hex">#cfcfcf</div>
        <div class="swatch__name">soft gray border</div>
      </div>
    </div></div>
  </div>

  <div class="section grid-2">
    <div>
      <h2>Typography</h2>
      <div class="type-stack">
        <h3 style="font-size: 2rem;">Heading — Canela 500</h3>
        <h3 style="font-size: 1.4rem;">Subhead — Canela 500</h3>
        <p style="font-size: 1rem; margin: 0;">Body — Inter 400 at 16px</p>
        <p class="muted" style="font-size: 0.85rem; margin: 0;">Caption / muted text uses --color-text-muted.</p>
        
      </div>
    </div>
    <div>
      <h2>Spacing</h2>
      <div class="spacing">
      <div class="spacing__row">
        <div class="spacing__bar" style="width:4px"></div>
        <div class="spacing__label">4px</div>
      </div>
      <div class="spacing__row">
        <div class="spacing__bar" style="width:8px"></div>
        <div class="spacing__label">8px</div>
      </div>
      <div class="spacing__row">
        <div class="spacing__bar" style="width:12px"></div>
        <div class="spacing__label">12px</div>
      </div>
      <div class="spacing__row">
        <div class="spacing__bar" style="width:16px"></div>
        <div class="spacing__label">16px</div>
      </div>
      <div class="spacing__row">
        <div class="spacing__bar" style="width:24px"></div>
        <div class="spacing__label">24px</div>
      </div>
      <div class="spacing__row">
        <div class="spacing__bar" style="width:32px"></div>
        <div class="spacing__label">32px</div>
      </div>
      <div class="spacing__row">
        <div class="spacing__bar" style="width:48px"></div>
        <div class="spacing__label">48px</div>
      </div>
      <div class="spacing__row">
        <div class="spacing__bar" style="width:64px"></div>
        <div class="spacing__label">64px</div>
      </div></div>
    </div>
  </div>

  <div class="section"><h2>Shadows</h2><div class="shadow-card" style="box-shadow:0 1px 2px rgba(0,0,0,0.04)">0 1px 2px rgba(0,0,0,0.04)</div><div class="shadow-card" style="box-shadow:0 8px 24px rgba(0,0,0,0.10)">0 8px 24px rgba(0,0,0,0.10)</div></div>

  

  <div class="section">
    <h2>Surface Effects</h2>
    <div class="signal-grid">
      <article class="signal-card">
        <div class="signal-title">soft card elevation</div>
        <div class="signal-meta">cookie consent modal uses a white surface with subtle border and low shadow for gentle separation from the page</div>
        <div class="signal-code">background: #ffffff<br/>border: 1px solid rgba(0,0,0,0.08)<br/>box-shadow: 0 8px 24px rgba(0,0,0,0.10)</div>
      </article></div>
  </div>

  <div class="section">
    <h2>Interaction State Tokens</h2>
    <div class="state-table-wrap">
      <table class="state-table">
        <thead>
          <tr>
            <th>Component</th>
            <th>State</th>
            <th>Treatment</th>
          </tr>
        </thead>
        <tbody>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-default">default</span></td>
        <td>solid orange-red fill with white text and crisp rectangular shape</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-hover">hover</span></td>
        <td>slightly darker orange-red fill with minimal transition and preserved high contrast</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-focus">focus</span></td>
        <td>thin navy or blue focus ring outside button bounds</td>
      </tr>
      <tr>
        <td>button.secondary</td>
        <td><span class="state-pill state-default">default</span></td>
        <td>light background with navy border and navy text</td>
      </tr>
      <tr>
        <td>nav.link</td>
        <td><span class="state-pill state-hover">hover</span></td>
        <td>text remains navy with subtle opacity shift or underline emphasis</td>
      </tr></tbody>
      </table>
    </div>
  </div>

  <div class="section">
    <h2>UI Element Details</h2>
    <p class="muted" style="margin-top:-4px;font-size:13px;">CSS-zoomed crops of the reference screenshot — each tile zooms into an identified element region.</p>
    <div class="crop-grid">
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/auto-ai-2026-05-16-3-jasper-ai.png"
            alt="brand logo"
            style="--ox:0%;--oy:0%;--zoom:3.5;"
            draggable="false"
          />
        </div>
        <figcaption>brand logo</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/auto-ai-2026-05-16-3-jasper-ai.png"
            alt="top navigation"
            style="--ox:50%;--oy:0%;--zoom:2.8;"
            draggable="false"
          />
        </div>
        <figcaption>top navigation</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/auto-ai-2026-05-16-3-jasper-ai.png"
            alt="hero headline"
            style="--ox:50%;--oy:0%;--zoom:2.2;"
            draggable="false"
          />
        </div>
        <figcaption>hero headline</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/auto-ai-2026-05-16-3-jasper-ai.png"
            alt="cta buttons"
            style="--ox:50%;--oy:50%;--zoom:3.8;"
            draggable="false"
          />
        </div>
        <figcaption>cta buttons</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/auto-ai-2026-05-16-3-jasper-ai.png"
            alt="cookie modal"
            style="--ox:50%;--oy:100%;--zoom:2.4;"
            draggable="false"
          />
        </div>
        <figcaption>cookie modal</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/auto-ai-2026-05-16-3-jasper-ai.png"
            alt="pastel grid accent"
            style="--ox:0%;--oy:100%;--zoom:3.2;"
            draggable="false"
          />
        </div>
        <figcaption>pastel grid accent</figcaption>
      </figure></div>
  </div>

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
        <p class="muted">Surface card on background, 16px radius, using primary as accent.</p>
        <button class="btn btn-primary" style="margin-top:8px;">Action</button>
      </div>
    </div>
  </div>

  <div class="section"><h2>Component Notes</h2>
      <div class="component">
        <div class="component__name">button</div>
        <div class="component__desc">Rectangular CTA buttons with medium padding; primary uses solid orange-red fill, secondary uses light surface with navy outline, while cookie buttons use pill shapes with blue outlines.</div>
      </div>
      <div class="component">
        <div class="component__name">card</div>
        <div class="component__desc">Cookie consent card is a rounded white panel with subtle gray border, soft shadow, and horizontally arranged actions.</div>
      </div>
      <div class="component">
        <div class="component__name">navigation</div>
        <div class="component__desc">Top navigation bar on a white strip with left-aligned wordmark, centered nav links, and right-aligned auth links plus standout demo CTA.</div>
      </div></div>

  <div class="section"><h2>Layout pattern</h2><p>top navigation + centered hero stack with announcement pill and dual CTAs + bottom cookie consent modal + decorative pastel grid accents near footer edges</p></div>
</body>
</html>
```

