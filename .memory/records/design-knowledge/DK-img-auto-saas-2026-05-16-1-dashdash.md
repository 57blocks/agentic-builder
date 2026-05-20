---
{"id":"DK-img-auto-saas-2026-05-16-1-dashdash","layer":"L1","kind":"design-knowledge","title":"Style Spec — auto-saas-2026-05-16-1-dashdash.png","tags":["industry:generic","source:vision-distill","image:auto-saas-2026-05-16-1-dashdash.png","manual:approved"],"source":"distill","refs":{},"createdAt":1778924869271,"updatedAt":1779236264039,"schemaVersion":1}
---

<!-- style-spec:json
{
  "industry": "generic",
  "summary": "A clean, light SaaS-style interface with a large centered prompt composer, subtle outlined chips, and restrained utility navigation. The aesthetic is minimal and productivity-focused, using soft grays with a warm amber accent and a dark plum announcement bar.",
  "vibe": [
    "minimal",
    "airy",
    "neutral",
    "editorial",
    "soft"
  ],
  "palette": {
    "primary": {
      "hex": "#f0b15f",
      "label": "warm amber"
    },
    "secondary": {
      "hex": "#4d002d",
      "label": "deep plum"
    },
    "accent": {
      "hex": "#f6c98c",
      "label": "soft peach"
    },
    "background": {
      "hex": "#f6f6f6",
      "label": "app canvas"
    },
    "surface": {
      "hex": "#fbfbfb",
      "label": "card white"
    },
    "text": {
      "hex": "#2a2a2a",
      "label": "primary ink"
    },
    "textMuted": {
      "hex": "#8b8b8b",
      "label": "muted gray"
    },
    "border": {
      "hex": "#dddddd",
      "label": "light outline"
    },
    "success": {
      "hex": "#5fd3b3",
      "label": "mint green"
    },
    "warning": {
      "hex": "#f0b15f",
      "label": "amber"
    },
    "danger": {
      "hex": "#d96b6b",
      "label": "soft red"
    }
  },
  "typography": {
    "headingFont": "Inter",
    "bodyFont": "Inter",
    "headingWeight": 600,
    "bodyWeight": 400,
    "baseSizePx": 16,
    "notes": [
      "large centered hero prompt",
      "small muted utility labels",
      "medium-weight chip labels"
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
    "0 1px 2px rgba(0,0,0,0.04)"
  ],
  "surfaceEffects": [
    {
      "name": "subtle outline surfaces",
      "description": "inputs and chips rely on very light borders with near-flat white fills and almost no shadow",
      "cssHints": [
        "background: #fbfbfb",
        "border: 1px solid #dddddd",
        "box-shadow: 0 1px 2px rgba(0,0,0,0.04)"
      ]
    }
  ],
  "stateTokens": [
    {
      "component": "button.primary",
      "state": "default",
      "treatment": "small rounded square with warm amber-to-peach fill and white icon"
    },
    {
      "component": "button.primary",
      "state": "hover",
      "treatment": "slightly richer amber fill with stronger contrast against the pale canvas"
    },
    {
      "component": "button.primary",
      "state": "focus",
      "treatment": "thin amber focus outline matching the main composer border"
    },
    {
      "component": "input.composer",
      "state": "default",
      "treatment": "large white field with thin amber outline and muted placeholder text"
    },
    {
      "component": "input.composer",
      "state": "focus",
      "treatment": "persistent warm accent border indicating active input state"
    }
  ],
  "components": {
    "button": {
      "description": "Minimal buttons; primary action appears as a compact rounded-square icon button in amber gradient, while secondary actions are text-only links such as Log in and Start from blank."
    },
    "card": {
      "description": "Suggestion items are rendered as pill-like chips with white backgrounds, light gray borders, compact icons, and medium-gray text."
    },
    "input": {
      "description": "Large centered multiline composer with generous padding, soft rounded corners, muted placeholder, utility icons on the right, and a warm accent outline."
    },
    "navigation": {
      "description": "Sparse top navigation with file title on the left, authentication links on the right, and a full-width plum announcement banner above."
    }
  },
  "layout": "top announcement bar + slim app header + centered hero prompt + four-column suggestion chip grid + footer links + bottom-left cookie notice",
  "visualElements": [
    {
      "name": "announcement bar",
      "col": 2,
      "row": 1,
      "zoom": 2.3
    },
    {
      "name": "hero headline",
      "col": 2,
      "row": 1,
      "zoom": 3
    },
    {
      "name": "prompt composer",
      "col": 2,
      "row": 2,
      "zoom": 2.6
    },
    {
      "name": "suggestion chips",
      "col": 2,
      "row": 2,
      "zoom": 3.4
    },
    {
      "name": "auth nav",
      "col": 3,
      "row": 1,
      "zoom": 4
    },
    {
      "name": "cookie notice",
      "col": 1,
      "row": 3,
      "zoom": 3.2
    }
  ],
  "imagePath": "/knowledge-refs/auto-saas-2026-05-16-1-dashdash.png",
  "imageName": "auto-saas-2026-05-16-1-dashdash.png",
  "capturedAt": "2026-05-20T00:17:44.038Z",
  "model": "openai/gpt-5.4-20260305"
}
-->

# Style Spec — auto-saas-2026-05-16-1-dashdash.png

## Style Spec (Markdown)

**Industry**: generic
**Image**: auto-saas-2026-05-16-1-dashdash.png
**Vibe**: minimal, airy, neutral, editorial, soft

**Summary**: A clean, light SaaS-style interface with a large centered prompt composer, subtle outlined chips, and restrained utility navigation. The aesthetic is minimal and productivity-focused, using soft grays with a warm amber accent and a dark plum announcement bar.

### Palette
- Primary: `#f0b15f` — warm amber
- Secondary: `#4d002d` — deep plum
- Accent: `#f6c98c` — soft peach
- Background: `#f6f6f6` — app canvas
- Surface: `#fbfbfb` — card white
- Text: `#2a2a2a` — primary ink
- Text muted: `#8b8b8b` — muted gray
- Border: `#dddddd` — light outline
- Success: `#5fd3b3` — mint green
- Warning: `#f0b15f` — amber
- Danger: `#d96b6b` — soft red

### Typography
- Heading font: Inter (weight 600)
- Body font: Inter (weight 400)
- Base size: 16px
- Note: large centered hero prompt
- Note: small muted utility labels
- Note: medium-weight chip labels

### Spacing & Radius
- Spacing base: 8px; scale: 4, 8, 12, 16, 24, 32, 48, 64
- Radius: sm 4px, md 8px, lg 16px, pill 999px
- Shadows: 1 variant(s)
  - `0 1px 2px rgba(0,0,0,0.04)`

### Surface Effects
- **subtle outline surfaces**: inputs and chips rely on very light borders with near-flat white fills and almost no shadow
  - `background: #fbfbfb`
  - `border: 1px solid #dddddd`
  - `box-shadow: 0 1px 2px rgba(0,0,0,0.04)`

### Interaction State Tokens
- **button.primary.default**: small rounded square with warm amber-to-peach fill and white icon
- **button.primary.hover**: slightly richer amber fill with stronger contrast against the pale canvas
- **button.primary.focus**: thin amber focus outline matching the main composer border
- **input.composer.default**: large white field with thin amber outline and muted placeholder text
- **input.composer.focus**: persistent warm accent border indicating active input state

### Components
- **button**: Minimal buttons; primary action appears as a compact rounded-square icon button in amber gradient, while secondary actions are text-only links such as Log in and Start from blank.
- **card**: Suggestion items are rendered as pill-like chips with white backgrounds, light gray borders, compact icons, and medium-gray text.
- **input**: Large centered multiline composer with generous padding, soft rounded corners, muted placeholder, utility icons on the right, and a warm accent outline.
- **navigation**: Sparse top navigation with file title on the left, authentication links on the right, and a full-width plum announcement banner above.

### Layout
top announcement bar + slim app header + centered hero prompt + four-column suggestion chip grid + footer links + bottom-left cookie notice

### UI Elements
Named UI regions identified in the reference screenshot (col/row = 3×3 grid):
- **announcement bar** — col 2, row 1, zoom 2.3×
- **hero headline** — col 2, row 1, zoom 3×
- **prompt composer** — col 2, row 2, zoom 2.6×
- **suggestion chips** — col 2, row 2, zoom 3.4×
- **auth nav** — col 3, row 1, zoom 4×
- **cookie notice** — col 1, row 3, zoom 3.2×

## Style Spec (HTML)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Style Spec — auto-saas-2026-05-16-1-dashdash.png</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
    --color-primary:    #f0b15f;
    --color-secondary:  #4d002d;
    --color-accent:     #f6c98c;
    --color-background: #f6f6f6;
    --color-surface:    #fbfbfb;
    --color-text:       #2a2a2a;
    --color-text-muted: #8b8b8b;
    --color-border:     #dddddd;
    --color-success:    #5fd3b3;
    --color-warning:    #f0b15f;
    --color-danger:     #d96b6b;
    --font-heading: 'Inter', system-ui, sans-serif;
    --font-body:    'Inter', system-ui, sans-serif;
    --font-mono:    'JetBrains Mono', ui-monospace, monospace;
    --weight-heading: 600;
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
    <img src="/knowledge-refs/auto-saas-2026-05-16-1-dashdash.png" alt="auto-saas-2026-05-16-1-dashdash.png">
    <div class="header__body">
      <div class="kicker">generic</div>
      <h1>auto-saas-2026-05-16-1-dashdash.png</h1>
      <p class="muted">A clean, light SaaS-style interface with a large centered prompt composer, subtle outlined chips, and restrained utility navigation. The aesthetic is minimal and productivity-focused, using soft grays with a warm amber accent and a dark plum announcement bar.</p>
      <div class="tags">
        <span class="tag">minimal</span><span class="tag">airy</span><span class="tag">neutral</span><span class="tag">editorial</span><span class="tag">soft</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Palette</h2>
    <div class="palette">
    <div class="swatch">
      <div class="swatch__chip" style="background:#f0b15f"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Primary</div>
        <div class="swatch__hex">#f0b15f</div>
        <div class="swatch__name">warm amber</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#4d002d"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Secondary</div>
        <div class="swatch__hex">#4d002d</div>
        <div class="swatch__name">deep plum</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f6c98c"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Accent</div>
        <div class="swatch__hex">#f6c98c</div>
        <div class="swatch__name">soft peach</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f6f6f6"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Background</div>
        <div class="swatch__hex">#f6f6f6</div>
        <div class="swatch__name">app canvas</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#fbfbfb"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Surface</div>
        <div class="swatch__hex">#fbfbfb</div>
        <div class="swatch__name">card white</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#2a2a2a"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text</div>
        <div class="swatch__hex">#2a2a2a</div>
        <div class="swatch__name">primary ink</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#8b8b8b"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text muted</div>
        <div class="swatch__hex">#8b8b8b</div>
        <div class="swatch__name">muted gray</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#dddddd"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Border</div>
        <div class="swatch__hex">#dddddd</div>
        <div class="swatch__name">light outline</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#5fd3b3"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Success</div>
        <div class="swatch__hex">#5fd3b3</div>
        <div class="swatch__name">mint green</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f0b15f"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Warning</div>
        <div class="swatch__hex">#f0b15f</div>
        <div class="swatch__name">amber</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#d96b6b"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Danger</div>
        <div class="swatch__hex">#d96b6b</div>
        <div class="swatch__name">soft red</div>
      </div>
    </div></div>
  </div>

  <div class="section grid-2">
    <div>
      <h2>Typography</h2>
      <div class="type-stack">
        <h3 style="font-size: 2rem;">Heading — Inter 600</h3>
        <h3 style="font-size: 1.4rem;">Subhead — Inter 600</h3>
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

  <div class="section"><h2>Shadows</h2><div class="shadow-card" style="box-shadow:0 1px 2px rgba(0,0,0,0.04)">0 1px 2px rgba(0,0,0,0.04)</div></div>

  

  <div class="section">
    <h2>Surface Effects</h2>
    <div class="signal-grid">
      <article class="signal-card">
        <div class="signal-title">subtle outline surfaces</div>
        <div class="signal-meta">inputs and chips rely on very light borders with near-flat white fills and almost no shadow</div>
        <div class="signal-code">background: #fbfbfb<br/>border: 1px solid #dddddd<br/>box-shadow: 0 1px 2px rgba(0,0,0,0.04)</div>
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
        <td>small rounded square with warm amber-to-peach fill and white icon</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-hover">hover</span></td>
        <td>slightly richer amber fill with stronger contrast against the pale canvas</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-focus">focus</span></td>
        <td>thin amber focus outline matching the main composer border</td>
      </tr>
      <tr>
        <td>input.composer</td>
        <td><span class="state-pill state-default">default</span></td>
        <td>large white field with thin amber outline and muted placeholder text</td>
      </tr>
      <tr>
        <td>input.composer</td>
        <td><span class="state-pill state-focus">focus</span></td>
        <td>persistent warm accent border indicating active input state</td>
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
            src="/knowledge-refs/auto-saas-2026-05-16-1-dashdash.png"
            alt="announcement bar"
            style="--ox:50%;--oy:0%;--zoom:2.3;"
            draggable="false"
          />
        </div>
        <figcaption>announcement bar</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/auto-saas-2026-05-16-1-dashdash.png"
            alt="hero headline"
            style="--ox:50%;--oy:0%;--zoom:3;"
            draggable="false"
          />
        </div>
        <figcaption>hero headline</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/auto-saas-2026-05-16-1-dashdash.png"
            alt="prompt composer"
            style="--ox:50%;--oy:50%;--zoom:2.6;"
            draggable="false"
          />
        </div>
        <figcaption>prompt composer</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/auto-saas-2026-05-16-1-dashdash.png"
            alt="suggestion chips"
            style="--ox:50%;--oy:50%;--zoom:3.4;"
            draggable="false"
          />
        </div>
        <figcaption>suggestion chips</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/auto-saas-2026-05-16-1-dashdash.png"
            alt="auth nav"
            style="--ox:100%;--oy:0%;--zoom:4;"
            draggable="false"
          />
        </div>
        <figcaption>auth nav</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/auto-saas-2026-05-16-1-dashdash.png"
            alt="cookie notice"
            style="--ox:0%;--oy:100%;--zoom:3.2;"
            draggable="false"
          />
        </div>
        <figcaption>cookie notice</figcaption>
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
        <div class="component__desc">Minimal buttons; primary action appears as a compact rounded-square icon button in amber gradient, while secondary actions are text-only links such as Log in and Start from blank.</div>
      </div>
      <div class="component">
        <div class="component__name">card</div>
        <div class="component__desc">Suggestion items are rendered as pill-like chips with white backgrounds, light gray borders, compact icons, and medium-gray text.</div>
      </div>
      <div class="component">
        <div class="component__name">input</div>
        <div class="component__desc">Large centered multiline composer with generous padding, soft rounded corners, muted placeholder, utility icons on the right, and a warm accent outline.</div>
      </div>
      <div class="component">
        <div class="component__name">navigation</div>
        <div class="component__desc">Sparse top navigation with file title on the left, authentication links on the right, and a full-width plum announcement banner above.</div>
      </div></div>

  <div class="section"><h2>Layout pattern</h2><p>top announcement bar + slim app header + centered hero prompt + four-column suggestion chip grid + footer links + bottom-left cookie notice</p></div>
</body>
</html>
```

