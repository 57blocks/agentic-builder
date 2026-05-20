---
{"id":"DK-img-f2-blocksphere","layer":"L1","kind":"design-knowledge","title":"Style Spec — f2-blocksphere.png","tags":["industry:fintech-web3","source:vision-distill","image:f2-blocksphere.png","manual:approved"],"source":"distill","refs":{},"createdAt":1778922838959,"updatedAt":1779236363253,"schemaVersion":1}
---

<!-- style-spec:json
{
  "industry": "fintech-web3",
  "summary": "A dark futuristic landing page for a Web3 product with neon purple illumination, glowing gradients, and floating crypto dashboard cards. The design combines a centered hero layout with soft glass-like panels and high-contrast typography.",
  "vibe": [
    "dark",
    "futuristic",
    "neon",
    "premium",
    "sleek"
  ],
  "palette": {
    "primary": {
      "hex": "#b963f0",
      "label": "electric purple"
    },
    "secondary": {
      "hex": "#f08bd8",
      "label": "pink lavender"
    },
    "accent": {
      "hex": "#6d8bff",
      "label": "cool indigo"
    },
    "background": {
      "hex": "#05081d",
      "label": "deep navy black"
    },
    "surface": {
      "hex": "#1a1f34",
      "label": "dark card slate"
    },
    "text": {
      "hex": "#f3edf9",
      "label": "soft white"
    },
    "textMuted": {
      "hex": "#9b90b6",
      "label": "muted lavender gray"
    },
    "border": {
      "hex": "#4b4a73",
      "label": "dim violet border"
    },
    "success": {
      "hex": "#41d39a",
      "label": "mint green"
    },
    "danger": {
      "hex": "#d86b7c",
      "label": "soft red"
    }
  },
  "typography": {
    "headingFont": "Inter",
    "bodyFont": "Inter",
    "headingWeight": 700,
    "bodyWeight": 400,
    "baseSizePx": 16,
    "notes": [
      "large centered hero heading",
      "pink accent word in headline",
      "compact nav text",
      "numeric KPI emphasis"
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
    "mdPx": 10,
    "lgPx": 20,
    "pillPx": 999
  },
  "shadows": [
    "0 8px 24px rgba(0,0,0,0.35)",
    "0 0 40px rgba(185,99,240,0.28)",
    "0 0 80px rgba(240,139,216,0.18)"
  ],
  "gradients": [
    {
      "id": "hero-glow",
      "type": "radial",
      "angleDeg": 0,
      "stops": [
        {
          "color": "#d18eff",
          "positionPct": 0,
          "opacity": 0.9
        },
        {
          "color": "#8f5dff",
          "positionPct": 35,
          "opacity": 0.55
        },
        {
          "color": "#05081d",
          "positionPct": 100,
          "opacity": 0
        }
      ],
      "usage": "central horizon glow behind floating cards"
    },
    {
      "id": "headline-accent",
      "type": "linear",
      "angleDeg": 90,
      "stops": [
        {
          "color": "#f4a5df",
          "positionPct": 0,
          "opacity": 1
        },
        {
          "color": "#b963f0",
          "positionPct": 100,
          "opacity": 1
        }
      ],
      "usage": "accent word and primary CTA fill"
    },
    {
      "id": "page-bg",
      "type": "linear",
      "angleDeg": 180,
      "stops": [
        {
          "color": "#0a1030",
          "positionPct": 0,
          "opacity": 1
        },
        {
          "color": "#05081d",
          "positionPct": 60,
          "opacity": 1
        },
        {
          "color": "#120d24",
          "positionPct": 100,
          "opacity": 1
        }
      ],
      "usage": "main page background"
    }
  ],
  "surfaceEffects": [
    {
      "name": "soft glass cards",
      "description": "dashboard cards use translucent dark fills, faint violet border strokes, and subtle bloom from the surrounding hero glow",
      "cssHints": [
        "background: rgba(26, 31, 52, 0.88)",
        "border: 1px solid rgba(150, 137, 199, 0.28)",
        "box-shadow: 0 0 0 1px rgba(255,255,255,0.03), 0 12px 30px rgba(0,0,0,0.35)"
      ]
    },
    {
      "name": "neon atmosphere",
      "description": "large blurred purple light source and curved linework create a sci-fi halo across the center of the page",
      "cssHints": [
        "background: radial-gradient(circle, rgba(209,142,255,0.9) 0%, rgba(143,93,255,0.55) 35%, rgba(5,8,29,0) 100%)",
        "filter: blur(24px)",
        "opacity: 0.85"
      ]
    }
  ],
  "stateTokens": [
    {
      "component": "button.primary",
      "state": "default",
      "treatment": "pill button with pink-to-purple fill and white text"
    },
    {
      "component": "button.primary",
      "state": "hover",
      "treatment": "slightly brighter gradient with stronger purple outer glow"
    },
    {
      "component": "button.primary",
      "state": "focus",
      "treatment": "soft 2px lavender focus ring outside rounded pill"
    },
    {
      "component": "input.email",
      "state": "focus",
      "treatment": "dark translucent field gains brighter violet border and inner glow"
    }
  ],
  "components": {
    "button": {
      "description": "Rounded pill CTA buttons using purple-pink gradient fills, medium-weight text, and compact padding."
    },
    "card": {
      "description": "Floating crypto stat cards with dark translucent backgrounds, muted labels, white figures, and color-coded token chips or trend values."
    },
    "input": {
      "description": "Long pill-shaped email field with soft purple-gray fill, subtle border, and low-contrast placeholder text."
    },
    "navigation": {
      "description": "Minimal top navigation with small centered links, compact spacing, and a right-aligned pill CTA."
    }
  },
  "layout": "centered top navigation + stacked hero content + inline email signup + floating crypto card cluster + three-column KPI stats footer",
  "visualElements": [
    {
      "name": "brand logo",
      "col": 1,
      "row": 1,
      "zoom": 4
    },
    {
      "name": "top navigation",
      "col": 2,
      "row": 1,
      "zoom": 3
    },
    {
      "name": "hero headline",
      "col": 2,
      "row": 1,
      "zoom": 2.2
    },
    {
      "name": "email signup",
      "col": 2,
      "row": 2,
      "zoom": 3.2
    },
    {
      "name": "crypto card",
      "col": 2,
      "row": 2,
      "zoom": 2.8
    },
    {
      "name": "kpi stats",
      "col": 2,
      "row": 3,
      "zoom": 2.4
    }
  ],
  "imagePath": "/knowledge-refs/f2-blocksphere.png",
  "imageName": "f2-blocksphere.png",
  "capturedAt": "2026-05-20T00:19:23.253Z",
  "model": "openai/gpt-5.4-20260305"
}
-->

# Style Spec — f2-blocksphere.png

## Style Spec (Markdown)

**Industry**: fintech-web3
**Image**: f2-blocksphere.png
**Vibe**: dark, futuristic, neon, premium, sleek

**Summary**: A dark futuristic landing page for a Web3 product with neon purple illumination, glowing gradients, and floating crypto dashboard cards. The design combines a centered hero layout with soft glass-like panels and high-contrast typography.

### Palette
- Primary: `#b963f0` — electric purple
- Secondary: `#f08bd8` — pink lavender
- Accent: `#6d8bff` — cool indigo
- Background: `#05081d` — deep navy black
- Surface: `#1a1f34` — dark card slate
- Text: `#f3edf9` — soft white
- Text muted: `#9b90b6` — muted lavender gray
- Border: `#4b4a73` — dim violet border
- Success: `#41d39a` — mint green
- Danger: `#d86b7c` — soft red

### Typography
- Heading font: Inter (weight 700)
- Body font: Inter (weight 400)
- Base size: 16px
- Note: large centered hero heading
- Note: pink accent word in headline
- Note: compact nav text
- Note: numeric KPI emphasis

### Spacing & Radius
- Spacing base: 8px; scale: 4, 8, 12, 16, 24, 32, 48, 64
- Radius: sm 4px, md 10px, lg 20px, pill 999px
- Shadows: 3 variant(s)
  - `0 8px 24px rgba(0,0,0,0.35)`
  - `0 0 40px rgba(185,99,240,0.28)`
  - `0 0 80px rgba(240,139,216,0.18)`

### Gradients
- **hero-glow** (radial) — central horizon glow behind floating cards
  - stop 0%: `#d18eff`, alpha 0.9
  - stop 35%: `#8f5dff`, alpha 0.55
  - stop 100%: `#05081d`, alpha 0
- **headline-accent** (linear, 90deg) — accent word and primary CTA fill
  - stop 0%: `#f4a5df`, alpha 1
  - stop 100%: `#b963f0`, alpha 1
- **page-bg** (linear, 180deg) — main page background
  - stop 0%: `#0a1030`, alpha 1
  - stop 60%: `#05081d`, alpha 1
  - stop 100%: `#120d24`, alpha 1

### Surface Effects
- **soft glass cards**: dashboard cards use translucent dark fills, faint violet border strokes, and subtle bloom from the surrounding hero glow
  - `background: rgba(26, 31, 52, 0.88)`
  - `border: 1px solid rgba(150, 137, 199, 0.28)`
  - `box-shadow: 0 0 0 1px rgba(255,255,255,0.03), 0 12px 30px rgba(0,0,0,0.35)`
- **neon atmosphere**: large blurred purple light source and curved linework create a sci-fi halo across the center of the page
  - `background: radial-gradient(circle, rgba(209,142,255,0.9) 0%, rgba(143,93,255,0.55) 35%, rgba(5,8,29,0) 100%)`
  - `filter: blur(24px)`
  - `opacity: 0.85`

### Interaction State Tokens
- **button.primary.default**: pill button with pink-to-purple fill and white text
- **button.primary.hover**: slightly brighter gradient with stronger purple outer glow
- **button.primary.focus**: soft 2px lavender focus ring outside rounded pill
- **input.email.focus**: dark translucent field gains brighter violet border and inner glow

### Components
- **button**: Rounded pill CTA buttons using purple-pink gradient fills, medium-weight text, and compact padding.
- **card**: Floating crypto stat cards with dark translucent backgrounds, muted labels, white figures, and color-coded token chips or trend values.
- **input**: Long pill-shaped email field with soft purple-gray fill, subtle border, and low-contrast placeholder text.
- **navigation**: Minimal top navigation with small centered links, compact spacing, and a right-aligned pill CTA.

### Layout
centered top navigation + stacked hero content + inline email signup + floating crypto card cluster + three-column KPI stats footer

### UI Elements
Named UI regions identified in the reference screenshot (col/row = 3×3 grid):
- **brand logo** — col 1, row 1, zoom 4×
- **top navigation** — col 2, row 1, zoom 3×
- **hero headline** — col 2, row 1, zoom 2.2×
- **email signup** — col 2, row 2, zoom 3.2×
- **crypto card** — col 2, row 2, zoom 2.8×
- **kpi stats** — col 2, row 3, zoom 2.4×

## Style Spec (HTML)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Style Spec — f2-blocksphere.png</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
    --color-primary:    #b963f0;
    --color-secondary:  #f08bd8;
    --color-accent:     #6d8bff;
    --color-background: #05081d;
    --color-surface:    #1a1f34;
    --color-text:       #f3edf9;
    --color-text-muted: #9b90b6;
    --color-border:     #4b4a73;
    --color-success:    #41d39a;
    --color-warning:    #f59e0b;
    --color-danger:     #d86b7c;
    --font-heading: 'Inter', system-ui, sans-serif;
    --font-body:    'Inter', system-ui, sans-serif;
    --font-mono:    'JetBrains Mono', ui-monospace, monospace;
    --weight-heading: 700;
    --weight-body:    400;
    --size-base:      16px;
    --radius-sm: 4px;
    --radius-md: 10px;
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
    <img src="/knowledge-refs/f2-blocksphere.png" alt="f2-blocksphere.png">
    <div class="header__body">
      <div class="kicker">fintech-web3</div>
      <h1>f2-blocksphere.png</h1>
      <p class="muted">A dark futuristic landing page for a Web3 product with neon purple illumination, glowing gradients, and floating crypto dashboard cards. The design combines a centered hero layout with soft glass-like panels and high-contrast typography.</p>
      <div class="tags">
        <span class="tag">dark</span><span class="tag">futuristic</span><span class="tag">neon</span><span class="tag">premium</span><span class="tag">sleek</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Palette</h2>
    <div class="palette">
    <div class="swatch">
      <div class="swatch__chip" style="background:#b963f0"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Primary</div>
        <div class="swatch__hex">#b963f0</div>
        <div class="swatch__name">electric purple</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f08bd8"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Secondary</div>
        <div class="swatch__hex">#f08bd8</div>
        <div class="swatch__name">pink lavender</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#6d8bff"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Accent</div>
        <div class="swatch__hex">#6d8bff</div>
        <div class="swatch__name">cool indigo</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#05081d"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Background</div>
        <div class="swatch__hex">#05081d</div>
        <div class="swatch__name">deep navy black</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#1a1f34"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Surface</div>
        <div class="swatch__hex">#1a1f34</div>
        <div class="swatch__name">dark card slate</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f3edf9"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text</div>
        <div class="swatch__hex">#f3edf9</div>
        <div class="swatch__name">soft white</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#9b90b6"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text muted</div>
        <div class="swatch__hex">#9b90b6</div>
        <div class="swatch__name">muted lavender gray</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#4b4a73"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Border</div>
        <div class="swatch__hex">#4b4a73</div>
        <div class="swatch__name">dim violet border</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#41d39a"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Success</div>
        <div class="swatch__hex">#41d39a</div>
        <div class="swatch__name">mint green</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#d86b7c"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Danger</div>
        <div class="swatch__hex">#d86b7c</div>
        <div class="swatch__name">soft red</div>
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

  <div class="section"><h2>Shadows</h2><div class="shadow-card" style="box-shadow:0 8px 24px rgba(0,0,0,0.35)">0 8px 24px rgba(0,0,0,0.35)</div><div class="shadow-card" style="box-shadow:0 0 40px rgba(185,99,240,0.28)">0 0 40px rgba(185,99,240,0.28)</div><div class="shadow-card" style="box-shadow:0 0 80px rgba(240,139,216,0.18)">0 0 80px rgba(240,139,216,0.18)</div></div>

  <div class="section">
    <h2>Gradients</h2>
    <div class="signal-grid">
      <article class="signal-card">
        <div class="signal-preview" style="background:radial-gradient(circle at center, rgba(209, 142, 255, 0.9) 0%, rgba(143, 93, 255, 0.55) 35%, rgba(5, 8, 29, 0) 100%);"></div>
        <div class="signal-title">hero-glow</div>
        <div class="signal-meta">radial · central horizon glow behind floating cards</div>
        <div class="signal-code">0% #d18eff @0.9  |  35% #8f5dff @0.55  |  100% #05081d @0</div>
      </article>
      <article class="signal-card">
        <div class="signal-preview" style="background:linear-gradient(90deg, #f4a5df 0%, #b963f0 100%);"></div>
        <div class="signal-title">headline-accent</div>
        <div class="signal-meta">linear 90deg · accent word and primary CTA fill</div>
        <div class="signal-code">0% #f4a5df @1  |  100% #b963f0 @1</div>
      </article>
      <article class="signal-card">
        <div class="signal-preview" style="background:linear-gradient(180deg, #0a1030 0%, #05081d 60%, #120d24 100%);"></div>
        <div class="signal-title">page-bg</div>
        <div class="signal-meta">linear 180deg · main page background</div>
        <div class="signal-code">0% #0a1030 @1  |  60% #05081d @1  |  100% #120d24 @1</div>
      </article></div>
  </div>

  <div class="section">
    <h2>Surface Effects</h2>
    <div class="signal-grid">
      <article class="signal-card">
        <div class="signal-title">soft glass cards</div>
        <div class="signal-meta">dashboard cards use translucent dark fills, faint violet border strokes, and subtle bloom from the surrounding hero glow</div>
        <div class="signal-code">background: rgba(26, 31, 52, 0.88)<br/>border: 1px solid rgba(150, 137, 199, 0.28)<br/>box-shadow: 0 0 0 1px rgba(255,255,255,0.03), 0 12px 30px rgba(0,0,0,0.35)</div>
      </article>
      <article class="signal-card">
        <div class="signal-title">neon atmosphere</div>
        <div class="signal-meta">large blurred purple light source and curved linework create a sci-fi halo across the center of the page</div>
        <div class="signal-code">background: radial-gradient(circle, rgba(209,142,255,0.9) 0%, rgba(143,93,255,0.55) 35%, rgba(5,8,29,0) 100%)<br/>filter: blur(24px)<br/>opacity: 0.85</div>
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
        <td>pill button with pink-to-purple fill and white text</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-hover">hover</span></td>
        <td>slightly brighter gradient with stronger purple outer glow</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-focus">focus</span></td>
        <td>soft 2px lavender focus ring outside rounded pill</td>
      </tr>
      <tr>
        <td>input.email</td>
        <td><span class="state-pill state-focus">focus</span></td>
        <td>dark translucent field gains brighter violet border and inner glow</td>
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
            src="/knowledge-refs/f2-blocksphere.png"
            alt="brand logo"
            style="--ox:0%;--oy:0%;--zoom:4;"
            draggable="false"
          />
        </div>
        <figcaption>brand logo</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/f2-blocksphere.png"
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
            src="/knowledge-refs/f2-blocksphere.png"
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
            src="/knowledge-refs/f2-blocksphere.png"
            alt="email signup"
            style="--ox:50%;--oy:50%;--zoom:3.2;"
            draggable="false"
          />
        </div>
        <figcaption>email signup</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/f2-blocksphere.png"
            alt="crypto card"
            style="--ox:50%;--oy:50%;--zoom:2.8;"
            draggable="false"
          />
        </div>
        <figcaption>crypto card</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/f2-blocksphere.png"
            alt="kpi stats"
            style="--ox:50%;--oy:100%;--zoom:2.4;"
            draggable="false"
          />
        </div>
        <figcaption>kpi stats</figcaption>
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
        <div class="component__desc">Rounded pill CTA buttons using purple-pink gradient fills, medium-weight text, and compact padding.</div>
      </div>
      <div class="component">
        <div class="component__name">card</div>
        <div class="component__desc">Floating crypto stat cards with dark translucent backgrounds, muted labels, white figures, and color-coded token chips or trend values.</div>
      </div>
      <div class="component">
        <div class="component__name">input</div>
        <div class="component__desc">Long pill-shaped email field with soft purple-gray fill, subtle border, and low-contrast placeholder text.</div>
      </div>
      <div class="component">
        <div class="component__name">navigation</div>
        <div class="component__desc">Minimal top navigation with small centered links, compact spacing, and a right-aligned pill CTA.</div>
      </div></div>

  <div class="section"><h2>Layout pattern</h2><p>centered top navigation + stacked hero content + inline email signup + floating crypto card cluster + three-column KPI stats footer</p></div>
</body>
</html>
```

