---
{"id":"DK-img-s4-saas","layer":"L1","kind":"design-knowledge","title":"Style Spec — s4-saas.png","tags":["industry:generic","source:vision-distill","image:s4-saas.png","manual:approved"],"source":"distill","refs":{},"createdAt":1778922899209,"updatedAt":1779236524059,"schemaVersion":1}
---

<!-- style-spec:json
{
  "industry": "generic",
  "summary": "A clean, premium SaaS-style landing page with a soft off-white canvas, minimalist black typography, and subtle dashboard mockups layered behind the hero. The design feels polished and editorial, using restrained color with gentle shadows and rounded controls to create a modern, trustworthy interface.",
  "vibe": [
    "minimal",
    "clean",
    "premium",
    "editorial",
    "soft"
  ],
  "palette": {
    "primary": {
      "hex": "#111111",
      "label": "charcoal black"
    },
    "secondary": {
      "hex": "#f4f3ef",
      "label": "warm off-white"
    },
    "accent": {
      "hex": "#2f8f6b",
      "label": "muted green"
    },
    "background": {
      "hex": "#f7f6f3",
      "label": "soft ivory background"
    },
    "surface": {
      "hex": "#ffffff",
      "label": "white card surface"
    },
    "text": {
      "hex": "#141414",
      "label": "near-black text"
    },
    "textMuted": {
      "hex": "#6f6f6b",
      "label": "warm gray text"
    },
    "border": {
      "hex": "#e6e3de",
      "label": "light warm gray border"
    },
    "success": {
      "hex": "#2f8f6b",
      "label": "growth green"
    }
  },
  "typography": {
    "headingFont": "Inter",
    "bodyFont": "Inter",
    "headingWeight": 600,
    "bodyWeight": 400,
    "baseSizePx": 16,
    "notes": [
      "large hero headings",
      "compact navigation labels",
      "lightweight body copy",
      "dashboard UI uses small dense text"
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
    "lgPx": 16,
    "pillPx": 999
  },
  "shadows": [
    "0 1px 2px rgba(0,0,0,0.04)",
    "0 12px 32px rgba(0,0,0,0.08)"
  ],
  "gradients": [
    {
      "id": "hero-wash",
      "type": "linear",
      "angleDeg": 90,
      "stops": [
        {
          "color": "#f7f6f3",
          "positionPct": 0,
          "opacity": 1
        },
        {
          "color": "#f5f4f0",
          "positionPct": 55,
          "opacity": 1
        },
        {
          "color": "#efeee9",
          "positionPct": 100,
          "opacity": 1
        }
      ],
      "usage": "overall page background wash"
    },
    {
      "id": "dashboard-fade",
      "type": "linear",
      "angleDeg": 180,
      "stops": [
        {
          "color": "#ffffff",
          "positionPct": 0,
          "opacity": 0.98
        },
        {
          "color": "#f3f1ed",
          "positionPct": 100,
          "opacity": 0.92
        }
      ],
      "usage": "mock dashboard panel shading"
    }
  ],
  "surfaceEffects": [
    {
      "name": "soft-card-elevation",
      "description": "dashboard cards and floating UI panels use clean white fills, thin warm borders, and very subtle shadow for gentle separation",
      "cssHints": [
        "background: #ffffff",
        "border: 1px solid rgba(20,20,20,0.08)",
        "box-shadow: 0 12px 32px rgba(0,0,0,0.08)"
      ]
    },
    {
      "name": "faded-mockup-layering",
      "description": "secondary dashboard screenshots are partially transparent and softly blended into the background to add depth without visual noise",
      "cssHints": [
        "opacity: 0.45",
        "filter: saturate(0.8)",
        "mask-image: linear-gradient(to top, rgba(0,0,0,0.8), transparent)"
      ]
    }
  ],
  "stateTokens": [
    {
      "component": "button.primary",
      "state": "default",
      "treatment": "solid black pill button with white text and no visible border"
    },
    {
      "component": "button.primary",
      "state": "hover",
      "treatment": "slightly lifted black surface with subtle shadow increase and marginally brighter fill"
    },
    {
      "component": "button.primary",
      "state": "focus",
      "treatment": "thin dark outer ring or soft neutral focus halo around the pill shape"
    },
    {
      "component": "navigation.item",
      "state": "default",
      "treatment": "small dark text on transparent background with generous horizontal spacing"
    },
    {
      "component": "navigation.item",
      "state": "hover",
      "treatment": "text darkens to full black and may gain subtle underline or opacity increase"
    }
  ],
  "components": {
    "button": {
      "description": "Rounded pill buttons with compact height; primary uses solid black fill with white text, while secondary ghost-style actions use white or transparent fills with fine borders."
    },
    "card": {
      "description": "White analytics cards with light gray borders, small labels, bold metric values, and restrained green percentage indicators; corners are softly rounded."
    },
    "input": {
      "description": "Search and utility inputs in the dashboard use pale backgrounds, thin borders, small iconography, and compact rounded corners."
    },
    "navigation": {
      "description": "Top navigation is sparse and horizontal with a small logo lockup on the left, lightweight menu items, and authentication CTA cluster on the right."
    }
  },
  "layout": "top navigation + left-aligned hero copy and CTA cluster + layered dashboard product mockups centered across the lower half",
  "visualElements": [
    {
      "name": "top navigation",
      "col": 2,
      "row": 1,
      "zoom": 3
    },
    {
      "name": "hero headline",
      "col": 1,
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
      "name": "dashboard mockup",
      "col": 2,
      "row": 2,
      "zoom": 2.2
    },
    {
      "name": "how it works pill",
      "col": 3,
      "row": 2,
      "zoom": 4
    },
    {
      "name": "analytics chart",
      "col": 2,
      "row": 3,
      "zoom": 2.8
    }
  ],
  "imagePath": "/knowledge-refs/s4-saas.png",
  "imageName": "s4-saas.png",
  "capturedAt": "2026-05-20T00:22:04.058Z",
  "model": "openai/gpt-5.4-20260305"
}
-->

# Style Spec — s4-saas.png

## Style Spec (Markdown)

**Industry**: generic
**Image**: s4-saas.png
**Vibe**: minimal, clean, premium, editorial, soft

**Summary**: A clean, premium SaaS-style landing page with a soft off-white canvas, minimalist black typography, and subtle dashboard mockups layered behind the hero. The design feels polished and editorial, using restrained color with gentle shadows and rounded controls to create a modern, trustworthy interface.

### Palette
- Primary: `#111111` — charcoal black
- Secondary: `#f4f3ef` — warm off-white
- Accent: `#2f8f6b` — muted green
- Background: `#f7f6f3` — soft ivory background
- Surface: `#ffffff` — white card surface
- Text: `#141414` — near-black text
- Text muted: `#6f6f6b` — warm gray text
- Border: `#e6e3de` — light warm gray border
- Success: `#2f8f6b` — growth green

### Typography
- Heading font: Inter (weight 600)
- Body font: Inter (weight 400)
- Base size: 16px
- Note: large hero headings
- Note: compact navigation labels
- Note: lightweight body copy
- Note: dashboard UI uses small dense text

### Spacing & Radius
- Spacing base: 8px; scale: 4, 8, 12, 16, 24, 32, 48, 64
- Radius: sm 4px, md 10px, lg 16px, pill 999px
- Shadows: 2 variant(s)
  - `0 1px 2px rgba(0,0,0,0.04)`
  - `0 12px 32px rgba(0,0,0,0.08)`

### Gradients
- **hero-wash** (linear, 90deg) — overall page background wash
  - stop 0%: `#f7f6f3`, alpha 1
  - stop 55%: `#f5f4f0`, alpha 1
  - stop 100%: `#efeee9`, alpha 1
- **dashboard-fade** (linear, 180deg) — mock dashboard panel shading
  - stop 0%: `#ffffff`, alpha 0.98
  - stop 100%: `#f3f1ed`, alpha 0.92

### Surface Effects
- **soft-card-elevation**: dashboard cards and floating UI panels use clean white fills, thin warm borders, and very subtle shadow for gentle separation
  - `background: #ffffff`
  - `border: 1px solid rgba(20,20,20,0.08)`
  - `box-shadow: 0 12px 32px rgba(0,0,0,0.08)`
- **faded-mockup-layering**: secondary dashboard screenshots are partially transparent and softly blended into the background to add depth without visual noise
  - `opacity: 0.45`
  - `filter: saturate(0.8)`
  - `mask-image: linear-gradient(to top, rgba(0,0,0,0.8), transparent)`

### Interaction State Tokens
- **button.primary.default**: solid black pill button with white text and no visible border
- **button.primary.hover**: slightly lifted black surface with subtle shadow increase and marginally brighter fill
- **button.primary.focus**: thin dark outer ring or soft neutral focus halo around the pill shape
- **navigation.item.default**: small dark text on transparent background with generous horizontal spacing
- **navigation.item.hover**: text darkens to full black and may gain subtle underline or opacity increase

### Components
- **button**: Rounded pill buttons with compact height; primary uses solid black fill with white text, while secondary ghost-style actions use white or transparent fills with fine borders.
- **card**: White analytics cards with light gray borders, small labels, bold metric values, and restrained green percentage indicators; corners are softly rounded.
- **input**: Search and utility inputs in the dashboard use pale backgrounds, thin borders, small iconography, and compact rounded corners.
- **navigation**: Top navigation is sparse and horizontal with a small logo lockup on the left, lightweight menu items, and authentication CTA cluster on the right.

### Layout
top navigation + left-aligned hero copy and CTA cluster + layered dashboard product mockups centered across the lower half

### UI Elements
Named UI regions identified in the reference screenshot (col/row = 3×3 grid):
- **top navigation** — col 2, row 1, zoom 3×
- **hero headline** — col 1, row 1, zoom 2.4×
- **primary CTA** — col 1, row 2, zoom 4×
- **dashboard mockup** — col 2, row 2, zoom 2.2×
- **how it works pill** — col 3, row 2, zoom 4×
- **analytics chart** — col 2, row 3, zoom 2.8×

## Style Spec (HTML)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Style Spec — s4-saas.png</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
    --color-primary:    #111111;
    --color-secondary:  #f4f3ef;
    --color-accent:     #2f8f6b;
    --color-background: #f7f6f3;
    --color-surface:    #ffffff;
    --color-text:       #141414;
    --color-text-muted: #6f6f6b;
    --color-border:     #e6e3de;
    --color-success:    #2f8f6b;
    --color-warning:    #f59e0b;
    --color-danger:     #ef4444;
    --font-heading: 'Inter', system-ui, sans-serif;
    --font-body:    'Inter', system-ui, sans-serif;
    --font-mono:    'JetBrains Mono', ui-monospace, monospace;
    --weight-heading: 600;
    --weight-body:    400;
    --size-base:      16px;
    --radius-sm: 4px;
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
    <img src="/knowledge-refs/s4-saas.png" alt="s4-saas.png">
    <div class="header__body">
      <div class="kicker">generic</div>
      <h1>s4-saas.png</h1>
      <p class="muted">A clean, premium SaaS-style landing page with a soft off-white canvas, minimalist black typography, and subtle dashboard mockups layered behind the hero. The design feels polished and editorial, using restrained color with gentle shadows and rounded controls to create a modern, trustworthy interface.</p>
      <div class="tags">
        <span class="tag">minimal</span><span class="tag">clean</span><span class="tag">premium</span><span class="tag">editorial</span><span class="tag">soft</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Palette</h2>
    <div class="palette">
    <div class="swatch">
      <div class="swatch__chip" style="background:#111111"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Primary</div>
        <div class="swatch__hex">#111111</div>
        <div class="swatch__name">charcoal black</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f4f3ef"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Secondary</div>
        <div class="swatch__hex">#f4f3ef</div>
        <div class="swatch__name">warm off-white</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#2f8f6b"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Accent</div>
        <div class="swatch__hex">#2f8f6b</div>
        <div class="swatch__name">muted green</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f7f6f3"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Background</div>
        <div class="swatch__hex">#f7f6f3</div>
        <div class="swatch__name">soft ivory background</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#ffffff"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Surface</div>
        <div class="swatch__hex">#ffffff</div>
        <div class="swatch__name">white card surface</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#141414"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text</div>
        <div class="swatch__hex">#141414</div>
        <div class="swatch__name">near-black text</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#6f6f6b"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text muted</div>
        <div class="swatch__hex">#6f6f6b</div>
        <div class="swatch__name">warm gray text</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#e6e3de"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Border</div>
        <div class="swatch__hex">#e6e3de</div>
        <div class="swatch__name">light warm gray border</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#2f8f6b"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Success</div>
        <div class="swatch__hex">#2f8f6b</div>
        <div class="swatch__name">growth green</div>
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

  <div class="section"><h2>Shadows</h2><div class="shadow-card" style="box-shadow:0 1px 2px rgba(0,0,0,0.04)">0 1px 2px rgba(0,0,0,0.04)</div><div class="shadow-card" style="box-shadow:0 12px 32px rgba(0,0,0,0.08)">0 12px 32px rgba(0,0,0,0.08)</div></div>

  <div class="section">
    <h2>Gradients</h2>
    <div class="signal-grid">
      <article class="signal-card">
        <div class="signal-preview" style="background:linear-gradient(90deg, #f7f6f3 0%, #f5f4f0 55%, #efeee9 100%);"></div>
        <div class="signal-title">hero-wash</div>
        <div class="signal-meta">linear 90deg · overall page background wash</div>
        <div class="signal-code">0% #f7f6f3 @1  |  55% #f5f4f0 @1  |  100% #efeee9 @1</div>
      </article>
      <article class="signal-card">
        <div class="signal-preview" style="background:linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(243, 241, 237, 0.92) 100%);"></div>
        <div class="signal-title">dashboard-fade</div>
        <div class="signal-meta">linear 180deg · mock dashboard panel shading</div>
        <div class="signal-code">0% #ffffff @0.98  |  100% #f3f1ed @0.92</div>
      </article></div>
  </div>

  <div class="section">
    <h2>Surface Effects</h2>
    <div class="signal-grid">
      <article class="signal-card">
        <div class="signal-title">soft-card-elevation</div>
        <div class="signal-meta">dashboard cards and floating UI panels use clean white fills, thin warm borders, and very subtle shadow for gentle separation</div>
        <div class="signal-code">background: #ffffff<br/>border: 1px solid rgba(20,20,20,0.08)<br/>box-shadow: 0 12px 32px rgba(0,0,0,0.08)</div>
      </article>
      <article class="signal-card">
        <div class="signal-title">faded-mockup-layering</div>
        <div class="signal-meta">secondary dashboard screenshots are partially transparent and softly blended into the background to add depth without visual noise</div>
        <div class="signal-code">opacity: 0.45<br/>filter: saturate(0.8)<br/>mask-image: linear-gradient(to top, rgba(0,0,0,0.8), transparent)</div>
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
        <td>solid black pill button with white text and no visible border</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-hover">hover</span></td>
        <td>slightly lifted black surface with subtle shadow increase and marginally brighter fill</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-focus">focus</span></td>
        <td>thin dark outer ring or soft neutral focus halo around the pill shape</td>
      </tr>
      <tr>
        <td>navigation.item</td>
        <td><span class="state-pill state-default">default</span></td>
        <td>small dark text on transparent background with generous horizontal spacing</td>
      </tr>
      <tr>
        <td>navigation.item</td>
        <td><span class="state-pill state-hover">hover</span></td>
        <td>text darkens to full black and may gain subtle underline or opacity increase</td>
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
            src="/knowledge-refs/s4-saas.png"
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
            src="/knowledge-refs/s4-saas.png"
            alt="hero headline"
            style="--ox:0%;--oy:0%;--zoom:2.4;"
            draggable="false"
          />
        </div>
        <figcaption>hero headline</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/s4-saas.png"
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
            src="/knowledge-refs/s4-saas.png"
            alt="dashboard mockup"
            style="--ox:50%;--oy:50%;--zoom:2.2;"
            draggable="false"
          />
        </div>
        <figcaption>dashboard mockup</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/s4-saas.png"
            alt="how it works pill"
            style="--ox:100%;--oy:50%;--zoom:4;"
            draggable="false"
          />
        </div>
        <figcaption>how it works pill</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/s4-saas.png"
            alt="analytics chart"
            style="--ox:50%;--oy:100%;--zoom:2.8;"
            draggable="false"
          />
        </div>
        <figcaption>analytics chart</figcaption>
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
        <div class="component__desc">Rounded pill buttons with compact height; primary uses solid black fill with white text, while secondary ghost-style actions use white or transparent fills with fine borders.</div>
      </div>
      <div class="component">
        <div class="component__name">card</div>
        <div class="component__desc">White analytics cards with light gray borders, small labels, bold metric values, and restrained green percentage indicators; corners are softly rounded.</div>
      </div>
      <div class="component">
        <div class="component__name">input</div>
        <div class="component__desc">Search and utility inputs in the dashboard use pale backgrounds, thin borders, small iconography, and compact rounded corners.</div>
      </div>
      <div class="component">
        <div class="component__name">navigation</div>
        <div class="component__desc">Top navigation is sparse and horizontal with a small logo lockup on the left, lightweight menu items, and authentication CTA cluster on the right.</div>
      </div></div>

  <div class="section"><h2>Layout pattern</h2><p>top navigation + left-aligned hero copy and CTA cluster + layered dashboard product mockups centered across the lower half</p></div>
</body>
</html>
```

