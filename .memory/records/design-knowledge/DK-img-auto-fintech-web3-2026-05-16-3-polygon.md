---
{"id":"DK-img-auto-fintech-web3-2026-05-16-3-polygon","layer":"L1","kind":"design-knowledge","title":"Style Spec — auto-fintech-web3-2026-05-16-3-polygon.png","tags":["industry:fintech-web3","source:vision-distill","image:auto-fintech-web3-2026-05-16-3-polygon.png","manual:approved"],"source":"distill","refs":{},"createdAt":1778925620594,"updatedAt":1779236235120,"schemaVersion":1}
---

<!-- style-spec:json
{
  "industry": "fintech-web3",
  "summary": "A bold web3 landing page with a futuristic 3D hero scene, cool neon gradients, and sharp geometric UI. The layout pairs a clean monochrome navigation shell with high-contrast electric blues, violets, and pink highlights.",
  "vibe": [
    "futuristic",
    "bold",
    "neon",
    "geometric",
    "high-contrast"
  ],
  "palette": {
    "primary": {
      "hex": "#6f1cff",
      "label": "electric violet"
    },
    "secondary": {
      "hex": "#1e57d8",
      "label": "saturated cobalt"
    },
    "accent": {
      "hex": "#f3a2ea",
      "label": "neon pink"
    },
    "background": {
      "hex": "#efeff1",
      "label": "light gray shell"
    },
    "surface": {
      "hex": "#ffffff",
      "label": "white UI panel"
    },
    "text": {
      "hex": "#ffffff",
      "label": "hero white"
    },
    "textMuted": {
      "hex": "#cfd6ff",
      "label": "cool pale blue"
    },
    "border": {
      "hex": "#d9d9df",
      "label": "soft gray border"
    }
  },
  "typography": {
    "headingFont": "Inter",
    "bodyFont": "Inter",
    "headingWeight": 400,
    "bodyWeight": 400,
    "baseSizePx": 16,
    "notes": [
      "oversized hero heading",
      "all-caps compact nav labels",
      "clean grotesk sans styling"
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
    "smPx": 2,
    "mdPx": 6,
    "lgPx": 12,
    "pillPx": 999
  },
  "shadows": [
    "0 8px 24px rgba(0,0,0,0.18)",
    "0 20px 48px rgba(0,0,0,0.35)"
  ],
  "gradients": [
    {
      "id": "hero-scene",
      "type": "linear",
      "angleDeg": 45,
      "stops": [
        {
          "color": "#1d4ec4",
          "positionPct": 0,
          "opacity": 1
        },
        {
          "color": "#2337a7",
          "positionPct": 35,
          "opacity": 1
        },
        {
          "color": "#6f1cff",
          "positionPct": 72,
          "opacity": 0.95
        },
        {
          "color": "#f3a2ea",
          "positionPct": 100,
          "opacity": 0.95
        }
      ],
      "usage": "main hero artwork and illuminated 3D surfaces"
    },
    {
      "id": "cta-button",
      "type": "linear",
      "angleDeg": 0,
      "stops": [
        {
          "color": "#7b1fff",
          "positionPct": 0,
          "opacity": 1
        },
        {
          "color": "#5c12e8",
          "positionPct": 100,
          "opacity": 1
        }
      ],
      "usage": "top-right book a call button and consent action"
    },
    {
      "id": "cyan-floor-glow",
      "type": "linear",
      "angleDeg": 90,
      "stops": [
        {
          "color": "#5bd4ff",
          "positionPct": 0,
          "opacity": 0.85
        },
        {
          "color": "#2e9fe9",
          "positionPct": 55,
          "opacity": 0.75
        },
        {
          "color": "#0a0a19",
          "positionPct": 100,
          "opacity": 0.95
        }
      ],
      "usage": "3D corridor planes and glow transitions"
    }
  ],
  "surfaceEffects": [
    {
      "name": "neonGlow",
      "description": "3D blocks and planes use vivid bloom with soft edge glow in blue, violet, and pink tones",
      "cssHints": [
        "box-shadow: 0 0 24px rgba(111,28,255,0.35)",
        "box-shadow: 0 0 32px rgba(91,212,255,0.28)",
        "background: linear-gradient(45deg, #1e57d8, #6f1cff, #f3a2ea)"
      ]
    },
    {
      "name": "hardPanel",
      "description": "UI panels and dropdowns use solid white fills with crisp light gray borders and minimal softness",
      "cssHints": [
        "background: #ffffff",
        "border: 1px solid #d9d9df",
        "box-shadow: 0 4px 12px rgba(0,0,0,0.06)"
      ]
    }
  ],
  "stateTokens": [
    {
      "component": "button.primary",
      "state": "default",
      "treatment": "solid violet gradient fill with white text and clipped angular right edge"
    },
    {
      "component": "button.primary",
      "state": "hover",
      "treatment": "slightly brighter violet fill with stronger glow and elevated shadow"
    },
    {
      "component": "button.primary",
      "state": "focus",
      "treatment": "thin high-contrast outline around the angular button silhouette"
    },
    {
      "component": "navigation.item",
      "state": "active",
      "treatment": "small violet dot indicator next to compact uppercase label"
    }
  ],
  "components": {
    "button": {
      "description": "Rectangular CTA buttons with subtle corner radius, uppercase mono-like labels, and some clipped/angular right edges; primary uses violet gradient, secondary uses near-black fill."
    },
    "card": {
      "description": "Floating white information panels and dropdown surfaces with thin gray borders, sparse content, and strong contrast against the colorful hero."
    },
    "navigation": {
      "description": "Top horizontal navigation bar on a white background with tightly spaced uppercase links, minimal branding on the left, and utility actions on the right."
    }
  },
  "layout": "top navigation over a full-width hero with oversized left-aligned headline, supporting copy and CTA row, plus floating utility panels and side widgets",
  "visualElements": [
    {
      "name": "brand nav",
      "col": 1,
      "row": 1,
      "zoom": 3
    },
    {
      "name": "hero headline",
      "col": 1,
      "row": 2,
      "zoom": 2.2
    },
    {
      "name": "cta buttons",
      "col": 1,
      "row": 3,
      "zoom": 3.2
    },
    {
      "name": "trusted panel",
      "col": 3,
      "row": 1,
      "zoom": 3.1
    },
    {
      "name": "3d corridor",
      "col": 2,
      "row": 3,
      "zoom": 2.4
    },
    {
      "name": "side social bar",
      "col": 3,
      "row": 3,
      "zoom": 3.8
    }
  ],
  "imagePath": "/knowledge-refs/auto-fintech-web3-2026-05-16-3-polygon.png",
  "imageName": "auto-fintech-web3-2026-05-16-3-polygon.png",
  "capturedAt": "2026-05-20T00:17:15.119Z",
  "model": "openai/gpt-5.4-20260305"
}
-->

# Style Spec — auto-fintech-web3-2026-05-16-3-polygon.png

## Style Spec (Markdown)

**Industry**: fintech-web3
**Image**: auto-fintech-web3-2026-05-16-3-polygon.png
**Vibe**: futuristic, bold, neon, geometric, high-contrast

**Summary**: A bold web3 landing page with a futuristic 3D hero scene, cool neon gradients, and sharp geometric UI. The layout pairs a clean monochrome navigation shell with high-contrast electric blues, violets, and pink highlights.

### Palette
- Primary: `#6f1cff` — electric violet
- Secondary: `#1e57d8` — saturated cobalt
- Accent: `#f3a2ea` — neon pink
- Background: `#efeff1` — light gray shell
- Surface: `#ffffff` — white UI panel
- Text: `#ffffff` — hero white
- Text muted: `#cfd6ff` — cool pale blue
- Border: `#d9d9df` — soft gray border

### Typography
- Heading font: Inter (weight 400)
- Body font: Inter (weight 400)
- Base size: 16px
- Note: oversized hero heading
- Note: all-caps compact nav labels
- Note: clean grotesk sans styling

### Spacing & Radius
- Spacing base: 8px; scale: 4, 8, 12, 16, 24, 32, 48, 64
- Radius: sm 2px, md 6px, lg 12px, pill 999px
- Shadows: 2 variant(s)
  - `0 8px 24px rgba(0,0,0,0.18)`
  - `0 20px 48px rgba(0,0,0,0.35)`

### Gradients
- **hero-scene** (linear, 45deg) — main hero artwork and illuminated 3D surfaces
  - stop 0%: `#1d4ec4`, alpha 1
  - stop 35%: `#2337a7`, alpha 1
  - stop 72%: `#6f1cff`, alpha 0.95
  - stop 100%: `#f3a2ea`, alpha 0.95
- **cta-button** (linear, 0deg) — top-right book a call button and consent action
  - stop 0%: `#7b1fff`, alpha 1
  - stop 100%: `#5c12e8`, alpha 1
- **cyan-floor-glow** (linear, 90deg) — 3D corridor planes and glow transitions
  - stop 0%: `#5bd4ff`, alpha 0.85
  - stop 55%: `#2e9fe9`, alpha 0.75
  - stop 100%: `#0a0a19`, alpha 0.95

### Surface Effects
- **neonGlow**: 3D blocks and planes use vivid bloom with soft edge glow in blue, violet, and pink tones
  - `box-shadow: 0 0 24px rgba(111,28,255,0.35)`
  - `box-shadow: 0 0 32px rgba(91,212,255,0.28)`
  - `background: linear-gradient(45deg, #1e57d8, #6f1cff, #f3a2ea)`
- **hardPanel**: UI panels and dropdowns use solid white fills with crisp light gray borders and minimal softness
  - `background: #ffffff`
  - `border: 1px solid #d9d9df`
  - `box-shadow: 0 4px 12px rgba(0,0,0,0.06)`

### Interaction State Tokens
- **button.primary.default**: solid violet gradient fill with white text and clipped angular right edge
- **button.primary.hover**: slightly brighter violet fill with stronger glow and elevated shadow
- **button.primary.focus**: thin high-contrast outline around the angular button silhouette
- **navigation.item.active**: small violet dot indicator next to compact uppercase label

### Components
- **button**: Rectangular CTA buttons with subtle corner radius, uppercase mono-like labels, and some clipped/angular right edges; primary uses violet gradient, secondary uses near-black fill.
- **card**: Floating white information panels and dropdown surfaces with thin gray borders, sparse content, and strong contrast against the colorful hero.
- **navigation**: Top horizontal navigation bar on a white background with tightly spaced uppercase links, minimal branding on the left, and utility actions on the right.

### Layout
top navigation over a full-width hero with oversized left-aligned headline, supporting copy and CTA row, plus floating utility panels and side widgets

### UI Elements
Named UI regions identified in the reference screenshot (col/row = 3×3 grid):
- **brand nav** — col 1, row 1, zoom 3×
- **hero headline** — col 1, row 2, zoom 2.2×
- **cta buttons** — col 1, row 3, zoom 3.2×
- **trusted panel** — col 3, row 1, zoom 3.1×
- **3d corridor** — col 2, row 3, zoom 2.4×
- **side social bar** — col 3, row 3, zoom 3.8×

## Style Spec (HTML)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Style Spec — auto-fintech-web3-2026-05-16-3-polygon.png</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
    --color-primary:    #6f1cff;
    --color-secondary:  #1e57d8;
    --color-accent:     #f3a2ea;
    --color-background: #efeff1;
    --color-surface:    #ffffff;
    --color-text:       #ffffff;
    --color-text-muted: #cfd6ff;
    --color-border:     #d9d9df;
    --color-success:    #22c55e;
    --color-warning:    #f59e0b;
    --color-danger:     #ef4444;
    --font-heading: 'Inter', system-ui, sans-serif;
    --font-body:    'Inter', system-ui, sans-serif;
    --font-mono:    'JetBrains Mono', ui-monospace, monospace;
    --weight-heading: 400;
    --weight-body:    400;
    --size-base:      16px;
    --radius-sm: 2px;
    --radius-md: 6px;
    --radius-lg: 12px;
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
    <img src="/knowledge-refs/auto-fintech-web3-2026-05-16-3-polygon.png" alt="auto-fintech-web3-2026-05-16-3-polygon.png">
    <div class="header__body">
      <div class="kicker">fintech-web3</div>
      <h1>auto-fintech-web3-2026-05-16-3-polygon.png</h1>
      <p class="muted">A bold web3 landing page with a futuristic 3D hero scene, cool neon gradients, and sharp geometric UI. The layout pairs a clean monochrome navigation shell with high-contrast electric blues, violets, and pink highlights.</p>
      <div class="tags">
        <span class="tag">futuristic</span><span class="tag">bold</span><span class="tag">neon</span><span class="tag">geometric</span><span class="tag">high-contrast</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Palette</h2>
    <div class="palette">
    <div class="swatch">
      <div class="swatch__chip" style="background:#6f1cff"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Primary</div>
        <div class="swatch__hex">#6f1cff</div>
        <div class="swatch__name">electric violet</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#1e57d8"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Secondary</div>
        <div class="swatch__hex">#1e57d8</div>
        <div class="swatch__name">saturated cobalt</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f3a2ea"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Accent</div>
        <div class="swatch__hex">#f3a2ea</div>
        <div class="swatch__name">neon pink</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#efeff1"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Background</div>
        <div class="swatch__hex">#efeff1</div>
        <div class="swatch__name">light gray shell</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#ffffff"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Surface</div>
        <div class="swatch__hex">#ffffff</div>
        <div class="swatch__name">white UI panel</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#ffffff"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text</div>
        <div class="swatch__hex">#ffffff</div>
        <div class="swatch__name">hero white</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#cfd6ff"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text muted</div>
        <div class="swatch__hex">#cfd6ff</div>
        <div class="swatch__name">cool pale blue</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#d9d9df"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Border</div>
        <div class="swatch__hex">#d9d9df</div>
        <div class="swatch__name">soft gray border</div>
      </div>
    </div></div>
  </div>

  <div class="section grid-2">
    <div>
      <h2>Typography</h2>
      <div class="type-stack">
        <h3 style="font-size: 2rem;">Heading — Inter 400</h3>
        <h3 style="font-size: 1.4rem;">Subhead — Inter 400</h3>
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

  <div class="section"><h2>Shadows</h2><div class="shadow-card" style="box-shadow:0 8px 24px rgba(0,0,0,0.18)">0 8px 24px rgba(0,0,0,0.18)</div><div class="shadow-card" style="box-shadow:0 20px 48px rgba(0,0,0,0.35)">0 20px 48px rgba(0,0,0,0.35)</div></div>

  <div class="section">
    <h2>Gradients</h2>
    <div class="signal-grid">
      <article class="signal-card">
        <div class="signal-preview" style="background:linear-gradient(45deg, #1d4ec4 0%, #2337a7 35%, rgba(111, 28, 255, 0.95) 72%, rgba(243, 162, 234, 0.95) 100%);"></div>
        <div class="signal-title">hero-scene</div>
        <div class="signal-meta">linear 45deg · main hero artwork and illuminated 3D surfaces</div>
        <div class="signal-code">0% #1d4ec4 @1  |  35% #2337a7 @1  |  72% #6f1cff @0.95  |  100% #f3a2ea @0.95</div>
      </article>
      <article class="signal-card">
        <div class="signal-preview" style="background:linear-gradient(0deg, #7b1fff 0%, #5c12e8 100%);"></div>
        <div class="signal-title">cta-button</div>
        <div class="signal-meta">linear 0deg · top-right book a call button and consent action</div>
        <div class="signal-code">0% #7b1fff @1  |  100% #5c12e8 @1</div>
      </article>
      <article class="signal-card">
        <div class="signal-preview" style="background:linear-gradient(90deg, rgba(91, 212, 255, 0.85) 0%, rgba(46, 159, 233, 0.75) 55%, rgba(10, 10, 25, 0.95) 100%);"></div>
        <div class="signal-title">cyan-floor-glow</div>
        <div class="signal-meta">linear 90deg · 3D corridor planes and glow transitions</div>
        <div class="signal-code">0% #5bd4ff @0.85  |  55% #2e9fe9 @0.75  |  100% #0a0a19 @0.95</div>
      </article></div>
  </div>

  <div class="section">
    <h2>Surface Effects</h2>
    <div class="signal-grid">
      <article class="signal-card">
        <div class="signal-title">neonGlow</div>
        <div class="signal-meta">3D blocks and planes use vivid bloom with soft edge glow in blue, violet, and pink tones</div>
        <div class="signal-code">box-shadow: 0 0 24px rgba(111,28,255,0.35)<br/>box-shadow: 0 0 32px rgba(91,212,255,0.28)<br/>background: linear-gradient(45deg, #1e57d8, #6f1cff, #f3a2ea)</div>
      </article>
      <article class="signal-card">
        <div class="signal-title">hardPanel</div>
        <div class="signal-meta">UI panels and dropdowns use solid white fills with crisp light gray borders and minimal softness</div>
        <div class="signal-code">background: #ffffff<br/>border: 1px solid #d9d9df<br/>box-shadow: 0 4px 12px rgba(0,0,0,0.06)</div>
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
        <td>solid violet gradient fill with white text and clipped angular right edge</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-hover">hover</span></td>
        <td>slightly brighter violet fill with stronger glow and elevated shadow</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-focus">focus</span></td>
        <td>thin high-contrast outline around the angular button silhouette</td>
      </tr>
      <tr>
        <td>navigation.item</td>
        <td><span class="state-pill state-active">active</span></td>
        <td>small violet dot indicator next to compact uppercase label</td>
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
            src="/knowledge-refs/auto-fintech-web3-2026-05-16-3-polygon.png"
            alt="brand nav"
            style="--ox:0%;--oy:0%;--zoom:3;"
            draggable="false"
          />
        </div>
        <figcaption>brand nav</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/auto-fintech-web3-2026-05-16-3-polygon.png"
            alt="hero headline"
            style="--ox:0%;--oy:50%;--zoom:2.2;"
            draggable="false"
          />
        </div>
        <figcaption>hero headline</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/auto-fintech-web3-2026-05-16-3-polygon.png"
            alt="cta buttons"
            style="--ox:0%;--oy:100%;--zoom:3.2;"
            draggable="false"
          />
        </div>
        <figcaption>cta buttons</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/auto-fintech-web3-2026-05-16-3-polygon.png"
            alt="trusted panel"
            style="--ox:100%;--oy:0%;--zoom:3.1;"
            draggable="false"
          />
        </div>
        <figcaption>trusted panel</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/auto-fintech-web3-2026-05-16-3-polygon.png"
            alt="3d corridor"
            style="--ox:50%;--oy:100%;--zoom:2.4;"
            draggable="false"
          />
        </div>
        <figcaption>3d corridor</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/auto-fintech-web3-2026-05-16-3-polygon.png"
            alt="side social bar"
            style="--ox:100%;--oy:100%;--zoom:3.8;"
            draggable="false"
          />
        </div>
        <figcaption>side social bar</figcaption>
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
        <p class="muted">Surface card on background, 12px radius, using primary as accent.</p>
        <button class="btn btn-primary" style="margin-top:8px;">Action</button>
      </div>
    </div>
  </div>

  <div class="section"><h2>Component Notes</h2>
      <div class="component">
        <div class="component__name">button</div>
        <div class="component__desc">Rectangular CTA buttons with subtle corner radius, uppercase mono-like labels, and some clipped/angular right edges; primary uses violet gradient, secondary uses near-black fill.</div>
      </div>
      <div class="component">
        <div class="component__name">card</div>
        <div class="component__desc">Floating white information panels and dropdown surfaces with thin gray borders, sparse content, and strong contrast against the colorful hero.</div>
      </div>
      <div class="component">
        <div class="component__name">navigation</div>
        <div class="component__desc">Top horizontal navigation bar on a white background with tightly spaced uppercase links, minimal branding on the left, and utility actions on the right.</div>
      </div></div>

  <div class="section"><h2>Layout pattern</h2><p>top navigation over a full-width hero with oversized left-aligned headline, supporting copy and CTA row, plus floating utility panels and side widgets</p></div>
</body>
</html>
```

