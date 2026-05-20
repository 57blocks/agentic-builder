---
{"id":"DK-img-auto-ai-2026-05-16-4-copy-ai","layer":"L1","kind":"design-knowledge","title":"Style Spec — auto-ai-2026-05-16-4-copy-ai.png","tags":["industry:generic","source:vision-distill","image:auto-ai-2026-05-16-4-copy-ai.png","manual:approved"],"source":"distill","refs":{},"createdAt":1778926092115,"updatedAt":1779236083818,"schemaVersion":1}
---

<!-- style-spec:json
{
  "industry": "generic",
  "summary": "A clean enterprise landing page with a light neutral canvas, oversized black typography, and bold purple pipeline graphics cutting across the hero. The aesthetic balances editorial minimalism with vivid product-brand accents and clear conversion-focused UI.",
  "vibe": [
    "minimal",
    "editorial",
    "bold",
    "clean",
    "corporate"
  ],
  "palette": {
    "primary": {
      "hex": "#6c4ae4",
      "label": "brand purple"
    },
    "secondary": {
      "hex": "#32008b",
      "label": "deep violet"
    },
    "accent": {
      "hex": "#8f7ae0",
      "label": "soft lavender"
    },
    "background": {
      "hex": "#f8f9fa",
      "label": "off-white page"
    },
    "surface": {
      "hex": "#e9eef1",
      "label": "cool light gray panel"
    },
    "text": {
      "hex": "#111111",
      "label": "near-black text"
    },
    "textMuted": {
      "hex": "#647788",
      "label": "muted slate"
    },
    "border": {
      "hex": "#dfe5e8",
      "label": "light gray border"
    }
  },
  "typography": {
    "headingFont": "Inter",
    "bodyFont": "Inter",
    "headingWeight": 700,
    "bodyWeight": 400,
    "baseSizePx": 16,
    "notes": [
      "oversized multi-line hero heading",
      "clean sans serif throughout",
      "muted paragraph copy with generous line height"
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
    "0 1px 2px rgba(0,0,0,0.04)",
    "0 8px 24px rgba(0,0,0,0.08)"
  ],
  "gradients": [
    {
      "id": "promo-banner",
      "type": "linear",
      "angleDeg": 0,
      "stops": [
        {
          "color": "#111111",
          "positionPct": 0,
          "opacity": 1
        },
        {
          "color": "#2b175a",
          "positionPct": 45,
          "opacity": 1
        },
        {
          "color": "#111111",
          "positionPct": 100,
          "opacity": 1
        }
      ],
      "usage": "top announcement strip background"
    },
    {
      "id": "pipeline-bars",
      "type": "linear",
      "angleDeg": 0,
      "stops": [
        {
          "color": "#9b86ea",
          "positionPct": 0,
          "opacity": 1
        },
        {
          "color": "#6c4ae4",
          "positionPct": 45,
          "opacity": 1
        },
        {
          "color": "#32008b",
          "positionPct": 100,
          "opacity": 1
        }
      ],
      "usage": "hero pipeline illustration ribbons"
    }
  ],
  "surfaceEffects": [
    {
      "name": "flat editorial panels",
      "description": "large sections use crisp light-gray blocks with thin borders and almost no elevation",
      "cssHints": [
        "background: #e9eef1",
        "border: 1px solid #dfe5e8",
        "box-shadow: none"
      ]
    }
  ],
  "stateTokens": [
    {
      "component": "button.primary",
      "state": "default",
      "treatment": "solid brand purple fill with white text and softly rounded rectangle shape"
    },
    {
      "component": "button.primary",
      "state": "hover",
      "treatment": "slightly darker or richer purple fill with maintained white text"
    },
    {
      "component": "button.primary",
      "state": "focus",
      "treatment": "subtle outer focus ring in a pale purple tint around button bounds"
    },
    {
      "component": "input",
      "state": "focus",
      "treatment": "light field gains darker border emphasis while preserving minimal flat appearance"
    }
  ],
  "components": {
    "button": {
      "description": "Primary CTA uses a compact rounded rectangle with solid purple fill and medium-weight white text; secondary dark button appears in the embedded form with square corners and black fill."
    },
    "card": {
      "description": "Form module appears as a simple white rectangular panel inset over the purple hero graphic, using minimal decoration and clear spacing."
    },
    "input": {
      "description": "Single-line email field uses a pale gray background, thin border, low radius, and muted placeholder text."
    },
    "navigation": {
      "description": "Top navigation is a horizontal white bar with left-aligned wordmark, centered menu items with subtle dropdown chevrons, and right-side login plus prominent CTA button."
    }
  },
  "layout": "top promo strip + horizontal navigation + split hero with oversized headline, supporting copy, embedded signup form, and diagonal pipeline illustration",
  "visualElements": [
    {
      "name": "promo banner",
      "col": 2,
      "row": 1,
      "zoom": 3.2
    },
    {
      "name": "logo nav",
      "col": 1,
      "row": 1,
      "zoom": 2.8
    },
    {
      "name": "hero headline",
      "col": 2,
      "row": 1,
      "zoom": 2.4
    },
    {
      "name": "pipeline graphic",
      "col": 1,
      "row": 2,
      "zoom": 2.2
    },
    {
      "name": "email form",
      "col": 3,
      "row": 2,
      "zoom": 3.4
    },
    {
      "name": "primary cta",
      "col": 3,
      "row": 1,
      "zoom": 4
    }
  ],
  "imagePath": "/knowledge-refs/auto-ai-2026-05-16-4-copy-ai.png",
  "imageName": "auto-ai-2026-05-16-4-copy-ai.png",
  "capturedAt": "2026-05-20T00:14:43.817Z",
  "model": "openai/gpt-5.4-20260305"
}
-->

# Style Spec — auto-ai-2026-05-16-4-copy-ai.png

## Style Spec (Markdown)

**Industry**: generic
**Image**: auto-ai-2026-05-16-4-copy-ai.png
**Vibe**: minimal, editorial, bold, clean, corporate

**Summary**: A clean enterprise landing page with a light neutral canvas, oversized black typography, and bold purple pipeline graphics cutting across the hero. The aesthetic balances editorial minimalism with vivid product-brand accents and clear conversion-focused UI.

### Palette
- Primary: `#6c4ae4` — brand purple
- Secondary: `#32008b` — deep violet
- Accent: `#8f7ae0` — soft lavender
- Background: `#f8f9fa` — off-white page
- Surface: `#e9eef1` — cool light gray panel
- Text: `#111111` — near-black text
- Text muted: `#647788` — muted slate
- Border: `#dfe5e8` — light gray border

### Typography
- Heading font: Inter (weight 700)
- Body font: Inter (weight 400)
- Base size: 16px
- Note: oversized multi-line hero heading
- Note: clean sans serif throughout
- Note: muted paragraph copy with generous line height

### Spacing & Radius
- Spacing base: 8px; scale: 4, 8, 12, 16, 24, 32, 48, 64
- Radius: sm 2px, md 6px, lg 12px, pill 999px
- Shadows: 2 variant(s)
  - `0 1px 2px rgba(0,0,0,0.04)`
  - `0 8px 24px rgba(0,0,0,0.08)`

### Gradients
- **promo-banner** (linear, 0deg) — top announcement strip background
  - stop 0%: `#111111`, alpha 1
  - stop 45%: `#2b175a`, alpha 1
  - stop 100%: `#111111`, alpha 1
- **pipeline-bars** (linear, 0deg) — hero pipeline illustration ribbons
  - stop 0%: `#9b86ea`, alpha 1
  - stop 45%: `#6c4ae4`, alpha 1
  - stop 100%: `#32008b`, alpha 1

### Surface Effects
- **flat editorial panels**: large sections use crisp light-gray blocks with thin borders and almost no elevation
  - `background: #e9eef1`
  - `border: 1px solid #dfe5e8`
  - `box-shadow: none`

### Interaction State Tokens
- **button.primary.default**: solid brand purple fill with white text and softly rounded rectangle shape
- **button.primary.hover**: slightly darker or richer purple fill with maintained white text
- **button.primary.focus**: subtle outer focus ring in a pale purple tint around button bounds
- **input.focus**: light field gains darker border emphasis while preserving minimal flat appearance

### Components
- **button**: Primary CTA uses a compact rounded rectangle with solid purple fill and medium-weight white text; secondary dark button appears in the embedded form with square corners and black fill.
- **card**: Form module appears as a simple white rectangular panel inset over the purple hero graphic, using minimal decoration and clear spacing.
- **input**: Single-line email field uses a pale gray background, thin border, low radius, and muted placeholder text.
- **navigation**: Top navigation is a horizontal white bar with left-aligned wordmark, centered menu items with subtle dropdown chevrons, and right-side login plus prominent CTA button.

### Layout
top promo strip + horizontal navigation + split hero with oversized headline, supporting copy, embedded signup form, and diagonal pipeline illustration

### UI Elements
Named UI regions identified in the reference screenshot (col/row = 3×3 grid):
- **promo banner** — col 2, row 1, zoom 3.2×
- **logo nav** — col 1, row 1, zoom 2.8×
- **hero headline** — col 2, row 1, zoom 2.4×
- **pipeline graphic** — col 1, row 2, zoom 2.2×
- **email form** — col 3, row 2, zoom 3.4×
- **primary cta** — col 3, row 1, zoom 4×

## Style Spec (HTML)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Style Spec — auto-ai-2026-05-16-4-copy-ai.png</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
    --color-primary:    #6c4ae4;
    --color-secondary:  #32008b;
    --color-accent:     #8f7ae0;
    --color-background: #f8f9fa;
    --color-surface:    #e9eef1;
    --color-text:       #111111;
    --color-text-muted: #647788;
    --color-border:     #dfe5e8;
    --color-success:    #22c55e;
    --color-warning:    #f59e0b;
    --color-danger:     #ef4444;
    --font-heading: 'Inter', system-ui, sans-serif;
    --font-body:    'Inter', system-ui, sans-serif;
    --font-mono:    'JetBrains Mono', ui-monospace, monospace;
    --weight-heading: 700;
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
    <img src="/knowledge-refs/auto-ai-2026-05-16-4-copy-ai.png" alt="auto-ai-2026-05-16-4-copy-ai.png">
    <div class="header__body">
      <div class="kicker">generic</div>
      <h1>auto-ai-2026-05-16-4-copy-ai.png</h1>
      <p class="muted">A clean enterprise landing page with a light neutral canvas, oversized black typography, and bold purple pipeline graphics cutting across the hero. The aesthetic balances editorial minimalism with vivid product-brand accents and clear conversion-focused UI.</p>
      <div class="tags">
        <span class="tag">minimal</span><span class="tag">editorial</span><span class="tag">bold</span><span class="tag">clean</span><span class="tag">corporate</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Palette</h2>
    <div class="palette">
    <div class="swatch">
      <div class="swatch__chip" style="background:#6c4ae4"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Primary</div>
        <div class="swatch__hex">#6c4ae4</div>
        <div class="swatch__name">brand purple</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#32008b"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Secondary</div>
        <div class="swatch__hex">#32008b</div>
        <div class="swatch__name">deep violet</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#8f7ae0"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Accent</div>
        <div class="swatch__hex">#8f7ae0</div>
        <div class="swatch__name">soft lavender</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f8f9fa"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Background</div>
        <div class="swatch__hex">#f8f9fa</div>
        <div class="swatch__name">off-white page</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#e9eef1"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Surface</div>
        <div class="swatch__hex">#e9eef1</div>
        <div class="swatch__name">cool light gray panel</div>
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
      <div class="swatch__chip" style="background:#647788"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text muted</div>
        <div class="swatch__hex">#647788</div>
        <div class="swatch__name">muted slate</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#dfe5e8"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Border</div>
        <div class="swatch__hex">#dfe5e8</div>
        <div class="swatch__name">light gray border</div>
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

  <div class="section"><h2>Shadows</h2><div class="shadow-card" style="box-shadow:0 1px 2px rgba(0,0,0,0.04)">0 1px 2px rgba(0,0,0,0.04)</div><div class="shadow-card" style="box-shadow:0 8px 24px rgba(0,0,0,0.08)">0 8px 24px rgba(0,0,0,0.08)</div></div>

  <div class="section">
    <h2>Gradients</h2>
    <div class="signal-grid">
      <article class="signal-card">
        <div class="signal-preview" style="background:linear-gradient(0deg, #111111 0%, #2b175a 45%, #111111 100%);"></div>
        <div class="signal-title">promo-banner</div>
        <div class="signal-meta">linear 0deg · top announcement strip background</div>
        <div class="signal-code">0% #111111 @1  |  45% #2b175a @1  |  100% #111111 @1</div>
      </article>
      <article class="signal-card">
        <div class="signal-preview" style="background:linear-gradient(0deg, #9b86ea 0%, #6c4ae4 45%, #32008b 100%);"></div>
        <div class="signal-title">pipeline-bars</div>
        <div class="signal-meta">linear 0deg · hero pipeline illustration ribbons</div>
        <div class="signal-code">0% #9b86ea @1  |  45% #6c4ae4 @1  |  100% #32008b @1</div>
      </article></div>
  </div>

  <div class="section">
    <h2>Surface Effects</h2>
    <div class="signal-grid">
      <article class="signal-card">
        <div class="signal-title">flat editorial panels</div>
        <div class="signal-meta">large sections use crisp light-gray blocks with thin borders and almost no elevation</div>
        <div class="signal-code">background: #e9eef1<br/>border: 1px solid #dfe5e8<br/>box-shadow: none</div>
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
        <td>solid brand purple fill with white text and softly rounded rectangle shape</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-hover">hover</span></td>
        <td>slightly darker or richer purple fill with maintained white text</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-focus">focus</span></td>
        <td>subtle outer focus ring in a pale purple tint around button bounds</td>
      </tr>
      <tr>
        <td>input</td>
        <td><span class="state-pill state-focus">focus</span></td>
        <td>light field gains darker border emphasis while preserving minimal flat appearance</td>
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
            src="/knowledge-refs/auto-ai-2026-05-16-4-copy-ai.png"
            alt="promo banner"
            style="--ox:50%;--oy:0%;--zoom:3.2;"
            draggable="false"
          />
        </div>
        <figcaption>promo banner</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/auto-ai-2026-05-16-4-copy-ai.png"
            alt="logo nav"
            style="--ox:0%;--oy:0%;--zoom:2.8;"
            draggable="false"
          />
        </div>
        <figcaption>logo nav</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/auto-ai-2026-05-16-4-copy-ai.png"
            alt="hero headline"
            style="--ox:50%;--oy:0%;--zoom:2.4;"
            draggable="false"
          />
        </div>
        <figcaption>hero headline</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/auto-ai-2026-05-16-4-copy-ai.png"
            alt="pipeline graphic"
            style="--ox:0%;--oy:50%;--zoom:2.2;"
            draggable="false"
          />
        </div>
        <figcaption>pipeline graphic</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/auto-ai-2026-05-16-4-copy-ai.png"
            alt="email form"
            style="--ox:100%;--oy:50%;--zoom:3.4;"
            draggable="false"
          />
        </div>
        <figcaption>email form</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/auto-ai-2026-05-16-4-copy-ai.png"
            alt="primary cta"
            style="--ox:100%;--oy:0%;--zoom:4;"
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
        <p class="muted">Surface card on background, 12px radius, using primary as accent.</p>
        <button class="btn btn-primary" style="margin-top:8px;">Action</button>
      </div>
    </div>
  </div>

  <div class="section"><h2>Component Notes</h2>
      <div class="component">
        <div class="component__name">button</div>
        <div class="component__desc">Primary CTA uses a compact rounded rectangle with solid purple fill and medium-weight white text; secondary dark button appears in the embedded form with square corners and black fill.</div>
      </div>
      <div class="component">
        <div class="component__name">card</div>
        <div class="component__desc">Form module appears as a simple white rectangular panel inset over the purple hero graphic, using minimal decoration and clear spacing.</div>
      </div>
      <div class="component">
        <div class="component__name">input</div>
        <div class="component__desc">Single-line email field uses a pale gray background, thin border, low radius, and muted placeholder text.</div>
      </div>
      <div class="component">
        <div class="component__name">navigation</div>
        <div class="component__desc">Top navigation is a horizontal white bar with left-aligned wordmark, centered menu items with subtle dropdown chevrons, and right-side login plus prominent CTA button.</div>
      </div></div>

  <div class="section"><h2>Layout pattern</h2><p>top promo strip + horizontal navigation + split hero with oversized headline, supporting copy, embedded signup form, and diagonal pipeline illustration</p></div>
</body>
</html>
```

