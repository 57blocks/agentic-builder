---
{"id":"DK-img-auto-ai-2026-05-16-5-notion-ai","layer":"L1","kind":"design-knowledge","title":"Style Spec — auto-ai-2026-05-16-5-notion-ai.png","tags":["industry:generic","source:vision-distill","image:auto-ai-2026-05-16-5-notion-ai.png","manual:approved"],"source":"distill","refs":{},"createdAt":1778926118923,"updatedAt":1779236099012,"schemaVersion":1}
---

<!-- style-spec:json
{
  "industry": "generic",
  "summary": "A clean, editorial SaaS-style landing page with generous whitespace, bold black typography, soft neutral surfaces, and restrained blue accent CTAs. Playful illustrated hero graphics add personality while the UI remains minimal and highly legible.",
  "vibe": [
    "minimal",
    "clean",
    "editorial",
    "playful",
    "modern"
  ],
  "palette": {
    "primary": {
      "hex": "#0b6ddf",
      "label": "brand blue"
    },
    "secondary": {
      "hex": "#f7c59f",
      "label": "soft peach"
    },
    "accent": {
      "hex": "#ff4b2e",
      "label": "signal orange"
    },
    "background": {
      "hex": "#f5f5f5",
      "label": "warm light gray"
    },
    "surface": {
      "hex": "#ffffff",
      "label": "white card"
    },
    "text": {
      "hex": "#111111",
      "label": "near-black"
    },
    "textMuted": {
      "hex": "#4a4a4a",
      "label": "muted graphite"
    },
    "border": {
      "hex": "#d9d9d9",
      "label": "light gray border"
    },
    "warning": {
      "hex": "#f0b323",
      "label": "gold yellow"
    }
  },
  "typography": {
    "headingFont": "Inter",
    "bodyFont": "Inter",
    "headingWeight": 700,
    "bodyWeight": 400,
    "baseSizePx": 16,
    "notes": [
      "very large bold hero heading",
      "clean neo-grotesk UI typography",
      "body copy uses comfortable line height",
      "navigation and card labels use medium weight"
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
    "smPx": 6,
    "mdPx": 10,
    "lgPx": 16,
    "pillPx": 999
  },
  "shadows": [
    "0 1px 2px rgba(0,0,0,0.04)",
    "0 2px 8px rgba(0,0,0,0.06)"
  ],
  "surfaceEffects": [
    {
      "name": "paper grain",
      "description": "lower feature panel uses a soft peach surface with subtle grain texture",
      "cssHints": [
        "background: #f7c59f",
        "background-image: radial-gradient(rgba(255,255,255,0.25) 1px, transparent 1px)",
        "opacity: 0.9"
      ]
    }
  ],
  "stateTokens": [
    {
      "component": "button.primary",
      "state": "default",
      "treatment": "solid blue fill with white text and minimal border"
    },
    {
      "component": "button.primary",
      "state": "hover",
      "treatment": "slightly darker blue fill with subtle elevation"
    },
    {
      "component": "button.primary",
      "state": "focus",
      "treatment": "2px soft blue focus ring outside rounded bounds"
    },
    {
      "component": "button.secondary",
      "state": "default",
      "treatment": "pale blue-tinted surface with blue text and no strong border"
    }
  ],
  "components": {
    "button": {
      "description": "Rounded rectangular buttons with medium height, clear horizontal padding, primary solid blue CTA and secondary soft-tint variant."
    },
    "card": {
      "description": "Feature cards are white with light gray borders, medium corner radius, minimal shadow, and left-aligned icon plus label."
    },
    "navigation": {
      "description": "Top navigation bar with centered product links, compact text, subtle dropdown chevrons, right-aligned CTA, and a slim announcement strip above."
    }
  },
  "layout": "announcement bar + top navigation + two-column hero with left text/CTAs and right illustration + trusted-by logo row + four-card feature grid + large textured content panel",
  "visualElements": [
    {
      "name": "announcement bar",
      "col": 2,
      "row": 1,
      "zoom": 3.2
    },
    {
      "name": "hero headline",
      "col": 1,
      "row": 1,
      "zoom": 2.2
    },
    {
      "name": "hero illustration",
      "col": 3,
      "row": 1,
      "zoom": 2.4
    },
    {
      "name": "primary CTA",
      "col": 1,
      "row": 2,
      "zoom": 4
    },
    {
      "name": "logo row",
      "col": 2,
      "row": 2,
      "zoom": 2.8
    },
    {
      "name": "feature card",
      "col": 3,
      "row": 3,
      "zoom": 3.2
    }
  ],
  "imagePath": "/knowledge-refs/auto-ai-2026-05-16-5-notion-ai.png",
  "imageName": "auto-ai-2026-05-16-5-notion-ai.png",
  "capturedAt": "2026-05-20T00:14:59.011Z",
  "model": "openai/gpt-5.4-20260305"
}
-->

# Style Spec — auto-ai-2026-05-16-5-notion-ai.png

## Style Spec (Markdown)

**Industry**: generic
**Image**: auto-ai-2026-05-16-5-notion-ai.png
**Vibe**: minimal, clean, editorial, playful, modern

**Summary**: A clean, editorial SaaS-style landing page with generous whitespace, bold black typography, soft neutral surfaces, and restrained blue accent CTAs. Playful illustrated hero graphics add personality while the UI remains minimal and highly legible.

### Palette
- Primary: `#0b6ddf` — brand blue
- Secondary: `#f7c59f` — soft peach
- Accent: `#ff4b2e` — signal orange
- Background: `#f5f5f5` — warm light gray
- Surface: `#ffffff` — white card
- Text: `#111111` — near-black
- Text muted: `#4a4a4a` — muted graphite
- Border: `#d9d9d9` — light gray border
- Warning: `#f0b323` — gold yellow

### Typography
- Heading font: Inter (weight 700)
- Body font: Inter (weight 400)
- Base size: 16px
- Note: very large bold hero heading
- Note: clean neo-grotesk UI typography
- Note: body copy uses comfortable line height
- Note: navigation and card labels use medium weight

### Spacing & Radius
- Spacing base: 8px; scale: 4, 8, 12, 16, 24, 32, 48, 64
- Radius: sm 6px, md 10px, lg 16px, pill 999px
- Shadows: 2 variant(s)
  - `0 1px 2px rgba(0,0,0,0.04)`
  - `0 2px 8px rgba(0,0,0,0.06)`

### Surface Effects
- **paper grain**: lower feature panel uses a soft peach surface with subtle grain texture
  - `background: #f7c59f`
  - `background-image: radial-gradient(rgba(255,255,255,0.25) 1px, transparent 1px)`
  - `opacity: 0.9`

### Interaction State Tokens
- **button.primary.default**: solid blue fill with white text and minimal border
- **button.primary.hover**: slightly darker blue fill with subtle elevation
- **button.primary.focus**: 2px soft blue focus ring outside rounded bounds
- **button.secondary.default**: pale blue-tinted surface with blue text and no strong border

### Components
- **button**: Rounded rectangular buttons with medium height, clear horizontal padding, primary solid blue CTA and secondary soft-tint variant.
- **card**: Feature cards are white with light gray borders, medium corner radius, minimal shadow, and left-aligned icon plus label.
- **navigation**: Top navigation bar with centered product links, compact text, subtle dropdown chevrons, right-aligned CTA, and a slim announcement strip above.

### Layout
announcement bar + top navigation + two-column hero with left text/CTAs and right illustration + trusted-by logo row + four-card feature grid + large textured content panel

### UI Elements
Named UI regions identified in the reference screenshot (col/row = 3×3 grid):
- **announcement bar** — col 2, row 1, zoom 3.2×
- **hero headline** — col 1, row 1, zoom 2.2×
- **hero illustration** — col 3, row 1, zoom 2.4×
- **primary CTA** — col 1, row 2, zoom 4×
- **logo row** — col 2, row 2, zoom 2.8×
- **feature card** — col 3, row 3, zoom 3.2×

## Style Spec (HTML)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Style Spec — auto-ai-2026-05-16-5-notion-ai.png</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
    --color-primary:    #0b6ddf;
    --color-secondary:  #f7c59f;
    --color-accent:     #ff4b2e;
    --color-background: #f5f5f5;
    --color-surface:    #ffffff;
    --color-text:       #111111;
    --color-text-muted: #4a4a4a;
    --color-border:     #d9d9d9;
    --color-success:    #22c55e;
    --color-warning:    #f0b323;
    --color-danger:     #ef4444;
    --font-heading: 'Inter', system-ui, sans-serif;
    --font-body:    'Inter', system-ui, sans-serif;
    --font-mono:    'JetBrains Mono', ui-monospace, monospace;
    --weight-heading: 700;
    --weight-body:    400;
    --size-base:      16px;
    --radius-sm: 6px;
    --radius-md: 10px;
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
    <img src="/knowledge-refs/auto-ai-2026-05-16-5-notion-ai.png" alt="auto-ai-2026-05-16-5-notion-ai.png">
    <div class="header__body">
      <div class="kicker">generic</div>
      <h1>auto-ai-2026-05-16-5-notion-ai.png</h1>
      <p class="muted">A clean, editorial SaaS-style landing page with generous whitespace, bold black typography, soft neutral surfaces, and restrained blue accent CTAs. Playful illustrated hero graphics add personality while the UI remains minimal and highly legible.</p>
      <div class="tags">
        <span class="tag">minimal</span><span class="tag">clean</span><span class="tag">editorial</span><span class="tag">playful</span><span class="tag">modern</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Palette</h2>
    <div class="palette">
    <div class="swatch">
      <div class="swatch__chip" style="background:#0b6ddf"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Primary</div>
        <div class="swatch__hex">#0b6ddf</div>
        <div class="swatch__name">brand blue</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f7c59f"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Secondary</div>
        <div class="swatch__hex">#f7c59f</div>
        <div class="swatch__name">soft peach</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#ff4b2e"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Accent</div>
        <div class="swatch__hex">#ff4b2e</div>
        <div class="swatch__name">signal orange</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f5f5f5"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Background</div>
        <div class="swatch__hex">#f5f5f5</div>
        <div class="swatch__name">warm light gray</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#ffffff"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Surface</div>
        <div class="swatch__hex">#ffffff</div>
        <div class="swatch__name">white card</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#111111"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text</div>
        <div class="swatch__hex">#111111</div>
        <div class="swatch__name">near-black</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#4a4a4a"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text muted</div>
        <div class="swatch__hex">#4a4a4a</div>
        <div class="swatch__name">muted graphite</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#d9d9d9"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Border</div>
        <div class="swatch__hex">#d9d9d9</div>
        <div class="swatch__name">light gray border</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f0b323"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Warning</div>
        <div class="swatch__hex">#f0b323</div>
        <div class="swatch__name">gold yellow</div>
      </div>
    </div></div>
  </div>

  <div class="section grid-2">
    <div>
      <h2>Typography</h2>
      <div class="type-stack">
        <h3 style="font-size: 2rem;">Heading — Inter 700</h3>
        <h3 style="font-size: 1.4rem;">Subhead — Inter 700</h3>
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

  <div class="section"><h2>Shadows</h2><div class="shadow-card" style="box-shadow:0 1px 2px rgba(0,0,0,0.04)">0 1px 2px rgba(0,0,0,0.04)</div><div class="shadow-card" style="box-shadow:0 2px 8px rgba(0,0,0,0.06)">0 2px 8px rgba(0,0,0,0.06)</div></div>

  

  <div class="section">
    <h2>Surface Effects</h2>
    <div class="signal-grid">
      <article class="signal-card">
        <div class="signal-title">paper grain</div>
        <div class="signal-meta">lower feature panel uses a soft peach surface with subtle grain texture</div>
        <div class="signal-code">background: #f7c59f<br/>background-image: radial-gradient(rgba(255,255,255,0.25) 1px, transparent 1px)<br/>opacity: 0.9</div>
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
        <td>solid blue fill with white text and minimal border</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-hover">hover</span></td>
        <td>slightly darker blue fill with subtle elevation</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-focus">focus</span></td>
        <td>2px soft blue focus ring outside rounded bounds</td>
      </tr>
      <tr>
        <td>button.secondary</td>
        <td><span class="state-pill state-default">default</span></td>
        <td>pale blue-tinted surface with blue text and no strong border</td>
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
            src="/knowledge-refs/auto-ai-2026-05-16-5-notion-ai.png"
            alt="announcement bar"
            style="--ox:50%;--oy:0%;--zoom:3.2;"
            draggable="false"
          />
        </div>
        <figcaption>announcement bar</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/auto-ai-2026-05-16-5-notion-ai.png"
            alt="hero headline"
            style="--ox:0%;--oy:0%;--zoom:2.2;"
            draggable="false"
          />
        </div>
        <figcaption>hero headline</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/auto-ai-2026-05-16-5-notion-ai.png"
            alt="hero illustration"
            style="--ox:100%;--oy:0%;--zoom:2.4;"
            draggable="false"
          />
        </div>
        <figcaption>hero illustration</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/auto-ai-2026-05-16-5-notion-ai.png"
            alt="primary CTA"
            style="--ox:0%;--oy:50%;--zoom:4;"
            draggable="false"
          />
        </div>
        <figcaption>primary CTA</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/auto-ai-2026-05-16-5-notion-ai.png"
            alt="logo row"
            style="--ox:50%;--oy:50%;--zoom:2.8;"
            draggable="false"
          />
        </div>
        <figcaption>logo row</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/auto-ai-2026-05-16-5-notion-ai.png"
            alt="feature card"
            style="--ox:100%;--oy:100%;--zoom:3.2;"
            draggable="false"
          />
        </div>
        <figcaption>feature card</figcaption>
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
        <div class="component__desc">Rounded rectangular buttons with medium height, clear horizontal padding, primary solid blue CTA and secondary soft-tint variant.</div>
      </div>
      <div class="component">
        <div class="component__name">card</div>
        <div class="component__desc">Feature cards are white with light gray borders, medium corner radius, minimal shadow, and left-aligned icon plus label.</div>
      </div>
      <div class="component">
        <div class="component__name">navigation</div>
        <div class="component__desc">Top navigation bar with centered product links, compact text, subtle dropdown chevrons, right-aligned CTA, and a slim announcement strip above.</div>
      </div></div>

  <div class="section"><h2>Layout pattern</h2><p>announcement bar + top navigation + two-column hero with left text/CTAs and right illustration + trusted-by logo row + four-card feature grid + large textured content panel</p></div>
</body>
</html>
```

