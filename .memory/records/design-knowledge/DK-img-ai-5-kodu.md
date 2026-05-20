---
{"id":"DK-img-ai-5-kodu","layer":"L1","kind":"design-knowledge","title":"Style Spec — ai-5-kodu.png","tags":["industry:ai","source:vision-distill","image:ai-5-kodu.png","manual:approved"],"source":"distill","refs":{},"createdAt":1778922777283,"updatedAt":1779235909899,"schemaVersion":1}
---

<!-- style-spec:json
{
  "industry": "ai",
  "summary": "A minimal monochrome AI landing page with soft 3D terrain imagery, rounded chrome-like containers, and a restrained neon green accent. The design balances oversized editorial typography with pill-shaped navigation and CTA controls for a polished, futuristic feel.",
  "vibe": [
    "minimal",
    "futuristic",
    "soft",
    "editorial",
    "premium"
  ],
  "palette": {
    "primary": {
      "hex": "#000000",
      "label": "primary black"
    },
    "secondary": {
      "hex": "#62d45e",
      "label": "soft lime green"
    },
    "accent": {
      "hex": "#8fe78a",
      "label": "glow green"
    },
    "background": {
      "hex": "#e7e7e7",
      "label": "light warm gray"
    },
    "surface": {
      "hex": "#f4f4f4",
      "label": "frosted white"
    },
    "text": {
      "hex": "#111111",
      "label": "near-black text"
    },
    "textMuted": {
      "hex": "#6e6e6e",
      "label": "medium gray"
    },
    "border": {
      "hex": "#d9d9d9",
      "label": "soft gray border"
    }
  },
  "typography": {
    "headingFont": "Inter",
    "bodyFont": "Inter",
    "headingWeight": 500,
    "bodyWeight": 400,
    "baseSizePx": 16,
    "notes": [
      "oversized hero heading",
      "clean neo-grotesk sans serif",
      "lightweight body copy with strong contrast"
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
    "mdPx": 12,
    "lgPx": 24,
    "pillPx": 999
  },
  "shadows": [
    "0 1px 2px rgba(0,0,0,0.04)",
    "0 12px 30px rgba(0,0,0,0.10)"
  ],
  "gradients": [
    {
      "id": "hero-terrain-glow",
      "type": "radial",
      "angleDeg": 0,
      "stops": [
        {
          "color": "#62d45e",
          "positionPct": 0,
          "opacity": 0.9
        },
        {
          "color": "#a9e9a2",
          "positionPct": 45,
          "opacity": 0.45
        },
        {
          "color": "#e7e7e7",
          "positionPct": 100,
          "opacity": 0
        }
      ],
      "usage": "soft glow around floating sphere and terrain highlights"
    },
    {
      "id": "hero-surface-fade",
      "type": "linear",
      "angleDeg": 180,
      "stops": [
        {
          "color": "#f3f3f3",
          "positionPct": 0,
          "opacity": 1
        },
        {
          "color": "#d8d8d8",
          "positionPct": 100,
          "opacity": 1
        }
      ],
      "usage": "hero image background and raised terrain depth"
    }
  ],
  "surfaceEffects": [
    {
      "name": "frosted-soft-panel",
      "description": "large hero frame and floating cards use pale translucent fills with soft depth and subtle borders",
      "cssHints": [
        "background: rgba(255,255,255,0.55)",
        "border: 1px solid rgba(0,0,0,0.06)",
        "box-shadow: 0 12px 30px rgba(0,0,0,0.10)"
      ]
    },
    {
      "name": "diffused-glow",
      "description": "green accent elements emit a blurred atmospheric glow against the grayscale background",
      "cssHints": [
        "filter: blur(20px)",
        "box-shadow: 0 0 40px rgba(98,212,94,0.35)",
        "background: radial-gradient(circle, rgba(98,212,94,0.9) 0%, rgba(98,212,94,0) 100%)"
      ]
    }
  ],
  "stateTokens": [
    {
      "component": "button.primary",
      "state": "default",
      "treatment": "solid black pill with white uppercase text and integrated circular arrow segment"
    },
    {
      "component": "button.primary",
      "state": "hover",
      "treatment": "slightly lifted pill with brighter black fill and stronger shadow"
    },
    {
      "component": "button.primary",
      "state": "focus",
      "treatment": "subtle light outer ring around dark pill to preserve accessibility on pale background"
    },
    {
      "component": "navigation.item",
      "state": "default",
      "treatment": "dark text inside translucent white pill container"
    },
    {
      "component": "navigation.item",
      "state": "hover",
      "treatment": "slightly darker text with faint white highlight behind item"
    }
  ],
  "components": {
    "button": {
      "description": "Rounded pill CTA in solid black with compact uppercase label, white arrow icon, and segmented circular icon area on the right."
    },
    "card": {
      "description": "Small floating white info card with large rounded corners, minimal body copy, and a tiny dark circular play/action icon anchored near the bottom-right."
    },
    "navigation": {
      "description": "Top navigation uses separate pill containers: a centered translucent white nav capsule for links and a standalone sign-in pill on the right."
    }
  },
  "layout": "framed hero landing page with top logo, centered pill navigation, oversized headline, centered CTA, floating info card, and immersive 3D background scene",
  "visualElements": [
    {
      "name": "brand logo",
      "col": 1,
      "row": 1,
      "zoom": 4
    },
    {
      "name": "pill navigation",
      "col": 2,
      "row": 1,
      "zoom": 3
    },
    {
      "name": "sign in button",
      "col": 3,
      "row": 1,
      "zoom": 4
    },
    {
      "name": "hero headline",
      "col": 2,
      "row": 1,
      "zoom": 2
    },
    {
      "name": "primary CTA",
      "col": 2,
      "row": 2,
      "zoom": 4
    },
    {
      "name": "info card",
      "col": 1,
      "row": 2,
      "zoom": 3.5
    }
  ],
  "imagePath": "/knowledge-refs/ai-5-kodu.png",
  "imageName": "ai-5-kodu.png",
  "capturedAt": "2026-05-20T00:11:49.898Z",
  "model": "openai/gpt-5.4-20260305"
}
-->

# Style Spec — ai-5-kodu.png

## Style Spec (Markdown)

**Industry**: ai
**Image**: ai-5-kodu.png
**Vibe**: minimal, futuristic, soft, editorial, premium

**Summary**: A minimal monochrome AI landing page with soft 3D terrain imagery, rounded chrome-like containers, and a restrained neon green accent. The design balances oversized editorial typography with pill-shaped navigation and CTA controls for a polished, futuristic feel.

### Palette
- Primary: `#000000` — primary black
- Secondary: `#62d45e` — soft lime green
- Accent: `#8fe78a` — glow green
- Background: `#e7e7e7` — light warm gray
- Surface: `#f4f4f4` — frosted white
- Text: `#111111` — near-black text
- Text muted: `#6e6e6e` — medium gray
- Border: `#d9d9d9` — soft gray border

### Typography
- Heading font: Inter (weight 500)
- Body font: Inter (weight 400)
- Base size: 16px
- Note: oversized hero heading
- Note: clean neo-grotesk sans serif
- Note: lightweight body copy with strong contrast

### Spacing & Radius
- Spacing base: 8px; scale: 4, 8, 12, 16, 24, 32, 48, 64
- Radius: sm 4px, md 12px, lg 24px, pill 999px
- Shadows: 2 variant(s)
  - `0 1px 2px rgba(0,0,0,0.04)`
  - `0 12px 30px rgba(0,0,0,0.10)`

### Gradients
- **hero-terrain-glow** (radial) — soft glow around floating sphere and terrain highlights
  - stop 0%: `#62d45e`, alpha 0.9
  - stop 45%: `#a9e9a2`, alpha 0.45
  - stop 100%: `#e7e7e7`, alpha 0
- **hero-surface-fade** (linear, 180deg) — hero image background and raised terrain depth
  - stop 0%: `#f3f3f3`, alpha 1
  - stop 100%: `#d8d8d8`, alpha 1

### Surface Effects
- **frosted-soft-panel**: large hero frame and floating cards use pale translucent fills with soft depth and subtle borders
  - `background: rgba(255,255,255,0.55)`
  - `border: 1px solid rgba(0,0,0,0.06)`
  - `box-shadow: 0 12px 30px rgba(0,0,0,0.10)`
- **diffused-glow**: green accent elements emit a blurred atmospheric glow against the grayscale background
  - `filter: blur(20px)`
  - `box-shadow: 0 0 40px rgba(98,212,94,0.35)`
  - `background: radial-gradient(circle, rgba(98,212,94,0.9) 0%, rgba(98,212,94,0) 100%)`

### Interaction State Tokens
- **button.primary.default**: solid black pill with white uppercase text and integrated circular arrow segment
- **button.primary.hover**: slightly lifted pill with brighter black fill and stronger shadow
- **button.primary.focus**: subtle light outer ring around dark pill to preserve accessibility on pale background
- **navigation.item.default**: dark text inside translucent white pill container
- **navigation.item.hover**: slightly darker text with faint white highlight behind item

### Components
- **button**: Rounded pill CTA in solid black with compact uppercase label, white arrow icon, and segmented circular icon area on the right.
- **card**: Small floating white info card with large rounded corners, minimal body copy, and a tiny dark circular play/action icon anchored near the bottom-right.
- **navigation**: Top navigation uses separate pill containers: a centered translucent white nav capsule for links and a standalone sign-in pill on the right.

### Layout
framed hero landing page with top logo, centered pill navigation, oversized headline, centered CTA, floating info card, and immersive 3D background scene

### UI Elements
Named UI regions identified in the reference screenshot (col/row = 3×3 grid):
- **brand logo** — col 1, row 1, zoom 4×
- **pill navigation** — col 2, row 1, zoom 3×
- **sign in button** — col 3, row 1, zoom 4×
- **hero headline** — col 2, row 1, zoom 2×
- **primary CTA** — col 2, row 2, zoom 4×
- **info card** — col 1, row 2, zoom 3.5×

## Style Spec (HTML)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Style Spec — ai-5-kodu.png</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
    --color-primary:    #000000;
    --color-secondary:  #62d45e;
    --color-accent:     #8fe78a;
    --color-background: #e7e7e7;
    --color-surface:    #f4f4f4;
    --color-text:       #111111;
    --color-text-muted: #6e6e6e;
    --color-border:     #d9d9d9;
    --color-success:    #22c55e;
    --color-warning:    #f59e0b;
    --color-danger:     #ef4444;
    --font-heading: 'Inter', system-ui, sans-serif;
    --font-body:    'Inter', system-ui, sans-serif;
    --font-mono:    'JetBrains Mono', ui-monospace, monospace;
    --weight-heading: 500;
    --weight-body:    400;
    --size-base:      16px;
    --radius-sm: 4px;
    --radius-md: 12px;
    --radius-lg: 24px;
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
    <img src="/knowledge-refs/ai-5-kodu.png" alt="ai-5-kodu.png">
    <div class="header__body">
      <div class="kicker">ai</div>
      <h1>ai-5-kodu.png</h1>
      <p class="muted">A minimal monochrome AI landing page with soft 3D terrain imagery, rounded chrome-like containers, and a restrained neon green accent. The design balances oversized editorial typography with pill-shaped navigation and CTA controls for a polished, futuristic feel.</p>
      <div class="tags">
        <span class="tag">minimal</span><span class="tag">futuristic</span><span class="tag">soft</span><span class="tag">editorial</span><span class="tag">premium</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Palette</h2>
    <div class="palette">
    <div class="swatch">
      <div class="swatch__chip" style="background:#000000"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Primary</div>
        <div class="swatch__hex">#000000</div>
        <div class="swatch__name">primary black</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#62d45e"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Secondary</div>
        <div class="swatch__hex">#62d45e</div>
        <div class="swatch__name">soft lime green</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#8fe78a"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Accent</div>
        <div class="swatch__hex">#8fe78a</div>
        <div class="swatch__name">glow green</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#e7e7e7"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Background</div>
        <div class="swatch__hex">#e7e7e7</div>
        <div class="swatch__name">light warm gray</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f4f4f4"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Surface</div>
        <div class="swatch__hex">#f4f4f4</div>
        <div class="swatch__name">frosted white</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#111111"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text</div>
        <div class="swatch__hex">#111111</div>
        <div class="swatch__name">near-black text</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#6e6e6e"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text muted</div>
        <div class="swatch__hex">#6e6e6e</div>
        <div class="swatch__name">medium gray</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#d9d9d9"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Border</div>
        <div class="swatch__hex">#d9d9d9</div>
        <div class="swatch__name">soft gray border</div>
      </div>
    </div></div>
  </div>

  <div class="section grid-2">
    <div>
      <h2>Typography</h2>
      <div class="type-stack">
        <h3 style="font-size: 2rem;">Heading — Inter 500</h3>
        <h3 style="font-size: 1.4rem;">Subhead — Inter 500</h3>
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

  <div class="section"><h2>Shadows</h2><div class="shadow-card" style="box-shadow:0 1px 2px rgba(0,0,0,0.04)">0 1px 2px rgba(0,0,0,0.04)</div><div class="shadow-card" style="box-shadow:0 12px 30px rgba(0,0,0,0.10)">0 12px 30px rgba(0,0,0,0.10)</div></div>

  <div class="section">
    <h2>Gradients</h2>
    <div class="signal-grid">
      <article class="signal-card">
        <div class="signal-preview" style="background:radial-gradient(circle at center, rgba(98, 212, 94, 0.9) 0%, rgba(169, 233, 162, 0.45) 45%, rgba(231, 231, 231, 0) 100%);"></div>
        <div class="signal-title">hero-terrain-glow</div>
        <div class="signal-meta">radial · soft glow around floating sphere and terrain highlights</div>
        <div class="signal-code">0% #62d45e @0.9  |  45% #a9e9a2 @0.45  |  100% #e7e7e7 @0</div>
      </article>
      <article class="signal-card">
        <div class="signal-preview" style="background:linear-gradient(180deg, #f3f3f3 0%, #d8d8d8 100%);"></div>
        <div class="signal-title">hero-surface-fade</div>
        <div class="signal-meta">linear 180deg · hero image background and raised terrain depth</div>
        <div class="signal-code">0% #f3f3f3 @1  |  100% #d8d8d8 @1</div>
      </article></div>
  </div>

  <div class="section">
    <h2>Surface Effects</h2>
    <div class="signal-grid">
      <article class="signal-card">
        <div class="signal-title">frosted-soft-panel</div>
        <div class="signal-meta">large hero frame and floating cards use pale translucent fills with soft depth and subtle borders</div>
        <div class="signal-code">background: rgba(255,255,255,0.55)<br/>border: 1px solid rgba(0,0,0,0.06)<br/>box-shadow: 0 12px 30px rgba(0,0,0,0.10)</div>
      </article>
      <article class="signal-card">
        <div class="signal-title">diffused-glow</div>
        <div class="signal-meta">green accent elements emit a blurred atmospheric glow against the grayscale background</div>
        <div class="signal-code">filter: blur(20px)<br/>box-shadow: 0 0 40px rgba(98,212,94,0.35)<br/>background: radial-gradient(circle, rgba(98,212,94,0.9) 0%, rgba(98,212,94,0) 100%)</div>
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
        <td>solid black pill with white uppercase text and integrated circular arrow segment</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-hover">hover</span></td>
        <td>slightly lifted pill with brighter black fill and stronger shadow</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-focus">focus</span></td>
        <td>subtle light outer ring around dark pill to preserve accessibility on pale background</td>
      </tr>
      <tr>
        <td>navigation.item</td>
        <td><span class="state-pill state-default">default</span></td>
        <td>dark text inside translucent white pill container</td>
      </tr>
      <tr>
        <td>navigation.item</td>
        <td><span class="state-pill state-hover">hover</span></td>
        <td>slightly darker text with faint white highlight behind item</td>
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
            src="/knowledge-refs/ai-5-kodu.png"
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
            src="/knowledge-refs/ai-5-kodu.png"
            alt="pill navigation"
            style="--ox:50%;--oy:0%;--zoom:3;"
            draggable="false"
          />
        </div>
        <figcaption>pill navigation</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/ai-5-kodu.png"
            alt="sign in button"
            style="--ox:100%;--oy:0%;--zoom:4;"
            draggable="false"
          />
        </div>
        <figcaption>sign in button</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/ai-5-kodu.png"
            alt="hero headline"
            style="--ox:50%;--oy:0%;--zoom:2;"
            draggable="false"
          />
        </div>
        <figcaption>hero headline</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/ai-5-kodu.png"
            alt="primary CTA"
            style="--ox:50%;--oy:50%;--zoom:4;"
            draggable="false"
          />
        </div>
        <figcaption>primary CTA</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/ai-5-kodu.png"
            alt="info card"
            style="--ox:0%;--oy:50%;--zoom:3.5;"
            draggable="false"
          />
        </div>
        <figcaption>info card</figcaption>
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
        <p class="muted">Surface card on background, 24px radius, using primary as accent.</p>
        <button class="btn btn-primary" style="margin-top:8px;">Action</button>
      </div>
    </div>
  </div>

  <div class="section"><h2>Component Notes</h2>
      <div class="component">
        <div class="component__name">button</div>
        <div class="component__desc">Rounded pill CTA in solid black with compact uppercase label, white arrow icon, and segmented circular icon area on the right.</div>
      </div>
      <div class="component">
        <div class="component__name">card</div>
        <div class="component__desc">Small floating white info card with large rounded corners, minimal body copy, and a tiny dark circular play/action icon anchored near the bottom-right.</div>
      </div>
      <div class="component">
        <div class="component__name">navigation</div>
        <div class="component__desc">Top navigation uses separate pill containers: a centered translucent white nav capsule for links and a standalone sign-in pill on the right.</div>
      </div></div>

  <div class="section"><h2>Layout pattern</h2><p>framed hero landing page with top logo, centered pill navigation, oversized headline, centered CTA, floating info card, and immersive 3D background scene</p></div>
</body>
</html>
```

