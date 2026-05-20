---
{"id":"DK-img-f1-solvance","layer":"L1","kind":"design-knowledge","title":"Style Spec — f1-solvance.png","tags":["industry:fintech-web3","source:vision-distill","image:f1-solvance.png","manual:approved"],"source":"distill","refs":{},"createdAt":1778922829180,"updatedAt":1779236342132,"schemaVersion":1}
---

<!-- style-spec:json
{
  "industry": "fintech-web3",
  "summary": "A clean fintech landing page with a soft neutral canvas, dark green brand accents, rounded cards, and generous whitespace. The aesthetic feels trustworthy and modern, combining editorial typography with simple product-focused illustrations and data widgets.",
  "vibe": [
    "minimal",
    "clean",
    "trustworthy",
    "soft",
    "modern"
  ],
  "palette": {
    "primary": {
      "hex": "#144e44",
      "label": "deep teal green"
    },
    "secondary": {
      "hex": "#dcebe7",
      "label": "pale mint"
    },
    "accent": {
      "hex": "#dccf35",
      "label": "chart yellow"
    },
    "background": {
      "hex": "#f5f5f3",
      "label": "warm off-white"
    },
    "surface": {
      "hex": "#eef5f3",
      "label": "cool light card"
    },
    "text": {
      "hex": "#222222",
      "label": "charcoal"
    },
    "textMuted": {
      "hex": "#8c8c86",
      "label": "soft gray"
    },
    "border": {
      "hex": "#e5e4df",
      "label": "light neutral border"
    }
  },
  "typography": {
    "headingFont": "Inter",
    "bodyFont": "Inter",
    "headingWeight": 600,
    "bodyWeight": 400,
    "baseSizePx": 16,
    "notes": [
      "large editorial hero heading",
      "muted supporting paragraph text",
      "small uppercase-style brand sublabel"
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
    "0 8px 24px rgba(0,0,0,0.08)",
    "0 12px 32px rgba(20,78,68,0.10)"
  ],
  "gradients": [
    {
      "id": "phone-card-bg",
      "type": "linear",
      "angleDeg": 135,
      "stops": [
        {
          "color": "#5fc9af",
          "positionPct": 0,
          "opacity": 1
        },
        {
          "color": "#144e44",
          "positionPct": 100,
          "opacity": 1
        }
      ],
      "usage": "background behind handheld phone mockup"
    },
    {
      "id": "chart-card-bg",
      "type": "linear",
      "angleDeg": 135,
      "stops": [
        {
          "color": "#1d5b50",
          "positionPct": 0,
          "opacity": 1
        },
        {
          "color": "#123f38",
          "positionPct": 100,
          "opacity": 1
        }
      ],
      "usage": "financial chart widget background"
    }
  ],
  "surfaceEffects": [
    {
      "name": "soft card fill",
      "description": "cards use flat pastel fills with very subtle shadowing and rounded corners",
      "cssHints": [
        "background: #eef5f3",
        "border-radius: 24px",
        "box-shadow: 0 8px 24px rgba(0,0,0,0.05)"
      ]
    }
  ],
  "stateTokens": [
    {
      "component": "button.primary",
      "state": "default",
      "treatment": "solid deep teal pill with light text and no visible border"
    },
    {
      "component": "button.primary",
      "state": "hover",
      "treatment": "slightly darker green fill with stronger shadow for lift"
    },
    {
      "component": "button.primary",
      "state": "focus",
      "treatment": "2px soft mint focus ring outside rounded pill"
    },
    {
      "component": "navigation.link",
      "state": "default",
      "treatment": "small dark text on plain background"
    },
    {
      "component": "navigation.link",
      "state": "hover",
      "treatment": "brand green text or subtle underline emphasis"
    }
  ],
  "components": {
    "button": {
      "description": "Rounded pill CTA buttons in deep teal green with centered light text, medium height, and compact horizontal padding."
    },
    "card": {
      "description": "Large-radius stat and widget cards using pastel mint, cream, or dark green surfaces; some cards contain simple icons, avatars, or chart visuals."
    },
    "navigation": {
      "description": "Top horizontal navigation with centered links, left-aligned wordmark, and a right-aligned sign-up pill button."
    }
  },
  "layout": "top navigation + two-column hero with card collage on the left and headline/CTA on the right, followed by a muted logo strip and centered about statement section",
  "visualElements": [
    {
      "name": "brand logo",
      "col": 1,
      "row": 1,
      "zoom": 3.2
    },
    {
      "name": "top navigation",
      "col": 2,
      "row": 1,
      "zoom": 3
    },
    {
      "name": "phone mockup card",
      "col": 1,
      "row": 1,
      "zoom": 2.4
    },
    {
      "name": "hero headline",
      "col": 3,
      "row": 1,
      "zoom": 2.2
    },
    {
      "name": "chart widget",
      "col": 1,
      "row": 2,
      "zoom": 3
    },
    {
      "name": "logo strip",
      "col": 2,
      "row": 2,
      "zoom": 2.1
    }
  ],
  "imagePath": "/knowledge-refs/f1-solvance.png",
  "imageName": "f1-solvance.png",
  "capturedAt": "2026-05-20T00:19:02.131Z",
  "model": "openai/gpt-5.4-20260305"
}
-->

# Style Spec — f1-solvance.png

## Style Spec (Markdown)

**Industry**: fintech-web3
**Image**: f1-solvance.png
**Vibe**: minimal, clean, trustworthy, soft, modern

**Summary**: A clean fintech landing page with a soft neutral canvas, dark green brand accents, rounded cards, and generous whitespace. The aesthetic feels trustworthy and modern, combining editorial typography with simple product-focused illustrations and data widgets.

### Palette
- Primary: `#144e44` — deep teal green
- Secondary: `#dcebe7` — pale mint
- Accent: `#dccf35` — chart yellow
- Background: `#f5f5f3` — warm off-white
- Surface: `#eef5f3` — cool light card
- Text: `#222222` — charcoal
- Text muted: `#8c8c86` — soft gray
- Border: `#e5e4df` — light neutral border

### Typography
- Heading font: Inter (weight 600)
- Body font: Inter (weight 400)
- Base size: 16px
- Note: large editorial hero heading
- Note: muted supporting paragraph text
- Note: small uppercase-style brand sublabel

### Spacing & Radius
- Spacing base: 8px; scale: 4, 8, 12, 16, 24, 32, 48, 64
- Radius: sm 4px, md 8px, lg 16px, pill 999px
- Shadows: 2 variant(s)
  - `0 8px 24px rgba(0,0,0,0.08)`
  - `0 12px 32px rgba(20,78,68,0.10)`

### Gradients
- **phone-card-bg** (linear, 135deg) — background behind handheld phone mockup
  - stop 0%: `#5fc9af`, alpha 1
  - stop 100%: `#144e44`, alpha 1
- **chart-card-bg** (linear, 135deg) — financial chart widget background
  - stop 0%: `#1d5b50`, alpha 1
  - stop 100%: `#123f38`, alpha 1

### Surface Effects
- **soft card fill**: cards use flat pastel fills with very subtle shadowing and rounded corners
  - `background: #eef5f3`
  - `border-radius: 24px`
  - `box-shadow: 0 8px 24px rgba(0,0,0,0.05)`

### Interaction State Tokens
- **button.primary.default**: solid deep teal pill with light text and no visible border
- **button.primary.hover**: slightly darker green fill with stronger shadow for lift
- **button.primary.focus**: 2px soft mint focus ring outside rounded pill
- **navigation.link.default**: small dark text on plain background
- **navigation.link.hover**: brand green text or subtle underline emphasis

### Components
- **button**: Rounded pill CTA buttons in deep teal green with centered light text, medium height, and compact horizontal padding.
- **card**: Large-radius stat and widget cards using pastel mint, cream, or dark green surfaces; some cards contain simple icons, avatars, or chart visuals.
- **navigation**: Top horizontal navigation with centered links, left-aligned wordmark, and a right-aligned sign-up pill button.

### Layout
top navigation + two-column hero with card collage on the left and headline/CTA on the right, followed by a muted logo strip and centered about statement section

### UI Elements
Named UI regions identified in the reference screenshot (col/row = 3×3 grid):
- **brand logo** — col 1, row 1, zoom 3.2×
- **top navigation** — col 2, row 1, zoom 3×
- **phone mockup card** — col 1, row 1, zoom 2.4×
- **hero headline** — col 3, row 1, zoom 2.2×
- **chart widget** — col 1, row 2, zoom 3×
- **logo strip** — col 2, row 2, zoom 2.1×

## Style Spec (HTML)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Style Spec — f1-solvance.png</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
    --color-primary:    #144e44;
    --color-secondary:  #dcebe7;
    --color-accent:     #dccf35;
    --color-background: #f5f5f3;
    --color-surface:    #eef5f3;
    --color-text:       #222222;
    --color-text-muted: #8c8c86;
    --color-border:     #e5e4df;
    --color-success:    #22c55e;
    --color-warning:    #f59e0b;
    --color-danger:     #ef4444;
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
    <img src="/knowledge-refs/f1-solvance.png" alt="f1-solvance.png">
    <div class="header__body">
      <div class="kicker">fintech-web3</div>
      <h1>f1-solvance.png</h1>
      <p class="muted">A clean fintech landing page with a soft neutral canvas, dark green brand accents, rounded cards, and generous whitespace. The aesthetic feels trustworthy and modern, combining editorial typography with simple product-focused illustrations and data widgets.</p>
      <div class="tags">
        <span class="tag">minimal</span><span class="tag">clean</span><span class="tag">trustworthy</span><span class="tag">soft</span><span class="tag">modern</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Palette</h2>
    <div class="palette">
    <div class="swatch">
      <div class="swatch__chip" style="background:#144e44"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Primary</div>
        <div class="swatch__hex">#144e44</div>
        <div class="swatch__name">deep teal green</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#dcebe7"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Secondary</div>
        <div class="swatch__hex">#dcebe7</div>
        <div class="swatch__name">pale mint</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#dccf35"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Accent</div>
        <div class="swatch__hex">#dccf35</div>
        <div class="swatch__name">chart yellow</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f5f5f3"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Background</div>
        <div class="swatch__hex">#f5f5f3</div>
        <div class="swatch__name">warm off-white</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#eef5f3"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Surface</div>
        <div class="swatch__hex">#eef5f3</div>
        <div class="swatch__name">cool light card</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#222222"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text</div>
        <div class="swatch__hex">#222222</div>
        <div class="swatch__name">charcoal</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#8c8c86"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text muted</div>
        <div class="swatch__hex">#8c8c86</div>
        <div class="swatch__name">soft gray</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#e5e4df"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Border</div>
        <div class="swatch__hex">#e5e4df</div>
        <div class="swatch__name">light neutral border</div>
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

  <div class="section"><h2>Shadows</h2><div class="shadow-card" style="box-shadow:0 8px 24px rgba(0,0,0,0.08)">0 8px 24px rgba(0,0,0,0.08)</div><div class="shadow-card" style="box-shadow:0 12px 32px rgba(20,78,68,0.10)">0 12px 32px rgba(20,78,68,0.10)</div></div>

  <div class="section">
    <h2>Gradients</h2>
    <div class="signal-grid">
      <article class="signal-card">
        <div class="signal-preview" style="background:linear-gradient(135deg, #5fc9af 0%, #144e44 100%);"></div>
        <div class="signal-title">phone-card-bg</div>
        <div class="signal-meta">linear 135deg · background behind handheld phone mockup</div>
        <div class="signal-code">0% #5fc9af @1  |  100% #144e44 @1</div>
      </article>
      <article class="signal-card">
        <div class="signal-preview" style="background:linear-gradient(135deg, #1d5b50 0%, #123f38 100%);"></div>
        <div class="signal-title">chart-card-bg</div>
        <div class="signal-meta">linear 135deg · financial chart widget background</div>
        <div class="signal-code">0% #1d5b50 @1  |  100% #123f38 @1</div>
      </article></div>
  </div>

  <div class="section">
    <h2>Surface Effects</h2>
    <div class="signal-grid">
      <article class="signal-card">
        <div class="signal-title">soft card fill</div>
        <div class="signal-meta">cards use flat pastel fills with very subtle shadowing and rounded corners</div>
        <div class="signal-code">background: #eef5f3<br/>border-radius: 24px<br/>box-shadow: 0 8px 24px rgba(0,0,0,0.05)</div>
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
        <td>solid deep teal pill with light text and no visible border</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-hover">hover</span></td>
        <td>slightly darker green fill with stronger shadow for lift</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-focus">focus</span></td>
        <td>2px soft mint focus ring outside rounded pill</td>
      </tr>
      <tr>
        <td>navigation.link</td>
        <td><span class="state-pill state-default">default</span></td>
        <td>small dark text on plain background</td>
      </tr>
      <tr>
        <td>navigation.link</td>
        <td><span class="state-pill state-hover">hover</span></td>
        <td>brand green text or subtle underline emphasis</td>
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
            src="/knowledge-refs/f1-solvance.png"
            alt="brand logo"
            style="--ox:0%;--oy:0%;--zoom:3.2;"
            draggable="false"
          />
        </div>
        <figcaption>brand logo</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/f1-solvance.png"
            alt="top navigation"
            style="--ox:50%;--oy:0%;--zoom:3;"
            draggable="false"
          />
        </div>
        <figcaption>top navigation</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/f1-solvance.png"
            alt="phone mockup card"
            style="--ox:0%;--oy:0%;--zoom:2.4;"
            draggable="false"
          />
        </div>
        <figcaption>phone mockup card</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/f1-solvance.png"
            alt="hero headline"
            style="--ox:100%;--oy:0%;--zoom:2.2;"
            draggable="false"
          />
        </div>
        <figcaption>hero headline</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/f1-solvance.png"
            alt="chart widget"
            style="--ox:0%;--oy:50%;--zoom:3;"
            draggable="false"
          />
        </div>
        <figcaption>chart widget</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/f1-solvance.png"
            alt="logo strip"
            style="--ox:50%;--oy:50%;--zoom:2.1;"
            draggable="false"
          />
        </div>
        <figcaption>logo strip</figcaption>
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
        <div class="component__desc">Rounded pill CTA buttons in deep teal green with centered light text, medium height, and compact horizontal padding.</div>
      </div>
      <div class="component">
        <div class="component__name">card</div>
        <div class="component__desc">Large-radius stat and widget cards using pastel mint, cream, or dark green surfaces; some cards contain simple icons, avatars, or chart visuals.</div>
      </div>
      <div class="component">
        <div class="component__name">navigation</div>
        <div class="component__desc">Top horizontal navigation with centered links, left-aligned wordmark, and a right-aligned sign-up pill button.</div>
      </div></div>

  <div class="section"><h2>Layout pattern</h2><p>top navigation + two-column hero with card collage on the left and headline/CTA on the right, followed by a muted logo strip and centered about statement section</p></div>
</body>
</html>
```

