---
{"id":"DK-img-auto-fintech-web3-2026-05-16-2-sushiswap","layer":"L1","kind":"design-knowledge","title":"Style Spec — auto-fintech-web3-2026-05-16-2-sushiswap.png","tags":["industry:fintech-web3","source:vision-distill","image:auto-fintech-web3-2026-05-16-2-sushiswap.png","manual:approved"],"source":"distill","refs":{},"createdAt":1778925570124,"updatedAt":1779236213175,"schemaVersion":1}
---

<!-- style-spec:json
{
  "industry": "fintech-web3",
  "summary": "A clean, airy DeFi swap interface with soft gray surfaces, rounded controls, and restrained blue-pink brand accents. The layout is minimal and centered around a single transaction card with subtle elevation and high whitespace.",
  "vibe": [
    "minimal",
    "light",
    "rounded",
    "clean",
    "financial"
  ],
  "palette": {
    "primary": {
      "hex": "#3b82f6",
      "label": "wallet blue"
    },
    "secondary": {
      "hex": "#e879f9",
      "label": "cross-chain pink"
    },
    "accent": {
      "hex": "#637eea",
      "label": "ethereum blue"
    },
    "background": {
      "hex": "#f3f3f5",
      "label": "app gray background"
    },
    "surface": {
      "hex": "#f8f8f8",
      "label": "card surface"
    },
    "text": {
      "hex": "#171717",
      "label": "primary text"
    },
    "textMuted": {
      "hex": "#6b7280",
      "label": "muted label gray"
    },
    "border": {
      "hex": "#e5e7eb",
      "label": "soft divider gray"
    }
  },
  "typography": {
    "headingFont": "Inter",
    "bodyFont": "Inter",
    "headingWeight": 600,
    "bodyWeight": 400,
    "baseSizePx": 16,
    "notes": [
      "compact navigation text",
      "large numeric token amounts",
      "medium-weight tab labels"
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
    "smPx": 8,
    "mdPx": 12,
    "lgPx": 20,
    "pillPx": 999
  },
  "shadows": [
    "0 1px 2px rgba(0,0,0,0.04)",
    "0 8px 24px rgba(0,0,0,0.05)"
  ],
  "surfaceEffects": [
    {
      "name": "soft card elevation",
      "description": "main swap panel uses an off-white fill with very subtle shadow and rounded corners",
      "cssHints": [
        "background: #f8f8f8",
        "border-radius: 20px",
        "box-shadow: 0 8px 24px rgba(0,0,0,0.05)"
      ]
    }
  ],
  "stateTokens": [
    {
      "component": "button.primary",
      "state": "default",
      "treatment": "solid blue fill with white centered label and rounded rectangle shape"
    },
    {
      "component": "button.primary",
      "state": "hover",
      "treatment": "slightly darker or more saturated blue fill while preserving white text"
    },
    {
      "component": "button.primary",
      "state": "focus",
      "treatment": "subtle outer ring in pale blue around the rounded button"
    },
    {
      "component": "tab.active",
      "state": "default",
      "treatment": "light gray pill background with darker text to indicate selection"
    },
    {
      "component": "input.token",
      "state": "focus",
      "treatment": "soft blue border emphasis around the token amount panel"
    }
  ],
  "components": {
    "button": {
      "description": "Primary CTA is a full-width rounded button in vivid blue with medium-weight white text; header buttons are smaller pill buttons in light gray."
    },
    "card": {
      "description": "Central swap module is a large rounded card containing stacked token panels, tab navigation, and a bottom CTA; inner panels use subtle borders and very light fills."
    },
    "input": {
      "description": "Token amount inputs are embedded within rounded rectangular panels with small muted labels, oversized numeric value text, token selector pills on the right, and tiny helper balance rows."
    },
    "navigation": {
      "description": "Top navigation is a slim horizontal bar with logo on the left, spaced text links across the top, and pill-style utility actions on the right."
    }
  },
  "layout": "top navigation bar with centered swap card containing tabs, two stacked token panels, a middle switch control, and a full-width bottom CTA",
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
      "name": "wallet button",
      "col": 3,
      "row": 1,
      "zoom": 3.2
    },
    {
      "name": "swap tabs",
      "col": 2,
      "row": 1,
      "zoom": 4
    },
    {
      "name": "token panel",
      "col": 2,
      "row": 2,
      "zoom": 3
    },
    {
      "name": "primary cta",
      "col": 2,
      "row": 3,
      "zoom": 3.5
    }
  ],
  "imagePath": "/knowledge-refs/auto-fintech-web3-2026-05-16-2-sushiswap.png",
  "imageName": "auto-fintech-web3-2026-05-16-2-sushiswap.png",
  "capturedAt": "2026-05-20T00:16:53.174Z",
  "model": "openai/gpt-5.4-20260305"
}
-->

# Style Spec — auto-fintech-web3-2026-05-16-2-sushiswap.png

## Style Spec (Markdown)

**Industry**: fintech-web3
**Image**: auto-fintech-web3-2026-05-16-2-sushiswap.png
**Vibe**: minimal, light, rounded, clean, financial

**Summary**: A clean, airy DeFi swap interface with soft gray surfaces, rounded controls, and restrained blue-pink brand accents. The layout is minimal and centered around a single transaction card with subtle elevation and high whitespace.

### Palette
- Primary: `#3b82f6` — wallet blue
- Secondary: `#e879f9` — cross-chain pink
- Accent: `#637eea` — ethereum blue
- Background: `#f3f3f5` — app gray background
- Surface: `#f8f8f8` — card surface
- Text: `#171717` — primary text
- Text muted: `#6b7280` — muted label gray
- Border: `#e5e7eb` — soft divider gray

### Typography
- Heading font: Inter (weight 600)
- Body font: Inter (weight 400)
- Base size: 16px
- Note: compact navigation text
- Note: large numeric token amounts
- Note: medium-weight tab labels

### Spacing & Radius
- Spacing base: 8px; scale: 4, 8, 12, 16, 24, 32, 48, 64
- Radius: sm 8px, md 12px, lg 20px, pill 999px
- Shadows: 2 variant(s)
  - `0 1px 2px rgba(0,0,0,0.04)`
  - `0 8px 24px rgba(0,0,0,0.05)`

### Surface Effects
- **soft card elevation**: main swap panel uses an off-white fill with very subtle shadow and rounded corners
  - `background: #f8f8f8`
  - `border-radius: 20px`
  - `box-shadow: 0 8px 24px rgba(0,0,0,0.05)`

### Interaction State Tokens
- **button.primary.default**: solid blue fill with white centered label and rounded rectangle shape
- **button.primary.hover**: slightly darker or more saturated blue fill while preserving white text
- **button.primary.focus**: subtle outer ring in pale blue around the rounded button
- **tab.active.default**: light gray pill background with darker text to indicate selection
- **input.token.focus**: soft blue border emphasis around the token amount panel

### Components
- **button**: Primary CTA is a full-width rounded button in vivid blue with medium-weight white text; header buttons are smaller pill buttons in light gray.
- **card**: Central swap module is a large rounded card containing stacked token panels, tab navigation, and a bottom CTA; inner panels use subtle borders and very light fills.
- **input**: Token amount inputs are embedded within rounded rectangular panels with small muted labels, oversized numeric value text, token selector pills on the right, and tiny helper balance rows.
- **navigation**: Top navigation is a slim horizontal bar with logo on the left, spaced text links across the top, and pill-style utility actions on the right.

### Layout
top navigation bar with centered swap card containing tabs, two stacked token panels, a middle switch control, and a full-width bottom CTA

### UI Elements
Named UI regions identified in the reference screenshot (col/row = 3×3 grid):
- **brand logo** — col 1, row 1, zoom 3.5×
- **top navigation** — col 2, row 1, zoom 2.8×
- **wallet button** — col 3, row 1, zoom 3.2×
- **swap tabs** — col 2, row 1, zoom 4×
- **token panel** — col 2, row 2, zoom 3×
- **primary cta** — col 2, row 3, zoom 3.5×

## Style Spec (HTML)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Style Spec — auto-fintech-web3-2026-05-16-2-sushiswap.png</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
    --color-primary:    #3b82f6;
    --color-secondary:  #e879f9;
    --color-accent:     #637eea;
    --color-background: #f3f3f5;
    --color-surface:    #f8f8f8;
    --color-text:       #171717;
    --color-text-muted: #6b7280;
    --color-border:     #e5e7eb;
    --color-success:    #22c55e;
    --color-warning:    #f59e0b;
    --color-danger:     #ef4444;
    --font-heading: 'Inter', system-ui, sans-serif;
    --font-body:    'Inter', system-ui, sans-serif;
    --font-mono:    'JetBrains Mono', ui-monospace, monospace;
    --weight-heading: 600;
    --weight-body:    400;
    --size-base:      16px;
    --radius-sm: 8px;
    --radius-md: 12px;
    --radius-lg: 20px;
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
    <img src="/knowledge-refs/auto-fintech-web3-2026-05-16-2-sushiswap.png" alt="auto-fintech-web3-2026-05-16-2-sushiswap.png">
    <div class="header__body">
      <div class="kicker">fintech-web3</div>
      <h1>auto-fintech-web3-2026-05-16-2-sushiswap.png</h1>
      <p class="muted">A clean, airy DeFi swap interface with soft gray surfaces, rounded controls, and restrained blue-pink brand accents. The layout is minimal and centered around a single transaction card with subtle elevation and high whitespace.</p>
      <div class="tags">
        <span class="tag">minimal</span><span class="tag">light</span><span class="tag">rounded</span><span class="tag">clean</span><span class="tag">financial</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Palette</h2>
    <div class="palette">
    <div class="swatch">
      <div class="swatch__chip" style="background:#3b82f6"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Primary</div>
        <div class="swatch__hex">#3b82f6</div>
        <div class="swatch__name">wallet blue</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#e879f9"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Secondary</div>
        <div class="swatch__hex">#e879f9</div>
        <div class="swatch__name">cross-chain pink</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#637eea"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Accent</div>
        <div class="swatch__hex">#637eea</div>
        <div class="swatch__name">ethereum blue</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f3f3f5"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Background</div>
        <div class="swatch__hex">#f3f3f5</div>
        <div class="swatch__name">app gray background</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f8f8f8"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Surface</div>
        <div class="swatch__hex">#f8f8f8</div>
        <div class="swatch__name">card surface</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#171717"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text</div>
        <div class="swatch__hex">#171717</div>
        <div class="swatch__name">primary text</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#6b7280"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text muted</div>
        <div class="swatch__hex">#6b7280</div>
        <div class="swatch__name">muted label gray</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#e5e7eb"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Border</div>
        <div class="swatch__hex">#e5e7eb</div>
        <div class="swatch__name">soft divider gray</div>
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

  <div class="section"><h2>Shadows</h2><div class="shadow-card" style="box-shadow:0 1px 2px rgba(0,0,0,0.04)">0 1px 2px rgba(0,0,0,0.04)</div><div class="shadow-card" style="box-shadow:0 8px 24px rgba(0,0,0,0.05)">0 8px 24px rgba(0,0,0,0.05)</div></div>

  

  <div class="section">
    <h2>Surface Effects</h2>
    <div class="signal-grid">
      <article class="signal-card">
        <div class="signal-title">soft card elevation</div>
        <div class="signal-meta">main swap panel uses an off-white fill with very subtle shadow and rounded corners</div>
        <div class="signal-code">background: #f8f8f8<br/>border-radius: 20px<br/>box-shadow: 0 8px 24px rgba(0,0,0,0.05)</div>
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
        <td>solid blue fill with white centered label and rounded rectangle shape</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-hover">hover</span></td>
        <td>slightly darker or more saturated blue fill while preserving white text</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-focus">focus</span></td>
        <td>subtle outer ring in pale blue around the rounded button</td>
      </tr>
      <tr>
        <td>tab.active</td>
        <td><span class="state-pill state-default">default</span></td>
        <td>light gray pill background with darker text to indicate selection</td>
      </tr>
      <tr>
        <td>input.token</td>
        <td><span class="state-pill state-focus">focus</span></td>
        <td>soft blue border emphasis around the token amount panel</td>
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
            src="/knowledge-refs/auto-fintech-web3-2026-05-16-2-sushiswap.png"
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
            src="/knowledge-refs/auto-fintech-web3-2026-05-16-2-sushiswap.png"
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
            src="/knowledge-refs/auto-fintech-web3-2026-05-16-2-sushiswap.png"
            alt="wallet button"
            style="--ox:100%;--oy:0%;--zoom:3.2;"
            draggable="false"
          />
        </div>
        <figcaption>wallet button</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/auto-fintech-web3-2026-05-16-2-sushiswap.png"
            alt="swap tabs"
            style="--ox:50%;--oy:0%;--zoom:4;"
            draggable="false"
          />
        </div>
        <figcaption>swap tabs</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/auto-fintech-web3-2026-05-16-2-sushiswap.png"
            alt="token panel"
            style="--ox:50%;--oy:50%;--zoom:3;"
            draggable="false"
          />
        </div>
        <figcaption>token panel</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/auto-fintech-web3-2026-05-16-2-sushiswap.png"
            alt="primary cta"
            style="--ox:50%;--oy:100%;--zoom:3.5;"
            draggable="false"
          />
        </div>
        <figcaption>primary cta</figcaption>
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
        <p class="muted">Surface card on background, 20px radius, using primary as accent.</p>
        <button class="btn btn-primary" style="margin-top:8px;">Action</button>
      </div>
    </div>
  </div>

  <div class="section"><h2>Component Notes</h2>
      <div class="component">
        <div class="component__name">button</div>
        <div class="component__desc">Primary CTA is a full-width rounded button in vivid blue with medium-weight white text; header buttons are smaller pill buttons in light gray.</div>
      </div>
      <div class="component">
        <div class="component__name">card</div>
        <div class="component__desc">Central swap module is a large rounded card containing stacked token panels, tab navigation, and a bottom CTA; inner panels use subtle borders and very light fills.</div>
      </div>
      <div class="component">
        <div class="component__name">input</div>
        <div class="component__desc">Token amount inputs are embedded within rounded rectangular panels with small muted labels, oversized numeric value text, token selector pills on the right, and tiny helper balance rows.</div>
      </div>
      <div class="component">
        <div class="component__name">navigation</div>
        <div class="component__desc">Top navigation is a slim horizontal bar with logo on the left, spaced text links across the top, and pill-style utility actions on the right.</div>
      </div></div>

  <div class="section"><h2>Layout pattern</h2><p>top navigation bar with centered swap card containing tabs, two stacked token panels, a middle switch control, and a full-width bottom CTA</p></div>
</body>
</html>
```

