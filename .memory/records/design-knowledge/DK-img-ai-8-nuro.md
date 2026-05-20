---
{"id":"DK-img-ai-8-nuro","layer":"L1","kind":"design-knowledge","title":"Style Spec — ai-8-nuro.png","tags":["industry:ai","source:vision-distill","image:ai-8-nuro.png","manual:approved"],"source":"distill","refs":{},"createdAt":1778922812124,"updatedAt":1779235977041,"schemaVersion":1}
---

<!-- style-spec:json
{
  "industry": "ai",
  "summary": "A soft, minimal AI workspace with a light neutral canvas, rounded panels, and subtle pastel accents. The interface feels calm and premium, using airy spacing, low-contrast surfaces, and a dark primary CTA for emphasis.",
  "vibe": [
    "minimal",
    "soft",
    "clean",
    "airy",
    "premium"
  ],
  "palette": {
    "primary": {
      "hex": "#0f1722",
      "label": "near-black ink"
    },
    "secondary": {
      "hex": "#f1d9d1",
      "label": "soft blush"
    },
    "accent": {
      "hex": "#c7b7d8",
      "label": "pastel lavender"
    },
    "background": {
      "hex": "#f3f1ef",
      "label": "warm light gray"
    },
    "surface": {
      "hex": "#fbfaf9",
      "label": "off-white panel"
    },
    "text": {
      "hex": "#12161d",
      "label": "charcoal text"
    },
    "textMuted": {
      "hex": "#8f908f",
      "label": "muted gray"
    },
    "border": {
      "hex": "#e6e1dd",
      "label": "soft divider"
    },
    "success": {
      "hex": "#7fb39b",
      "label": "sage green"
    },
    "warning": {
      "hex": "#f0b78c",
      "label": "peach"
    },
    "danger": {
      "hex": "#de8d83",
      "label": "dusty coral"
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
      "muted helper text",
      "semi-bold navigation labels"
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
    "mdPx": 16,
    "lgPx": 24,
    "pillPx": 999
  },
  "shadows": [
    "0 1px 2px rgba(17,24,39,0.04)",
    "0 10px 30px rgba(17,24,39,0.06)"
  ],
  "gradients": [
    {
      "id": "page-wash",
      "type": "linear",
      "angleDeg": 90,
      "stops": [
        {
          "color": "#f3f1ef",
          "positionPct": 0,
          "opacity": 1
        },
        {
          "color": "#f4f0ee",
          "positionPct": 72,
          "opacity": 1
        },
        {
          "color": "#f4d2c8",
          "positionPct": 100,
          "opacity": 0.9
        }
      ],
      "usage": "overall page background with warm blush concentration near the bottom"
    },
    {
      "id": "logo-star",
      "type": "radial",
      "angleDeg": 0,
      "stops": [
        {
          "color": "#f5b29a",
          "positionPct": 0,
          "opacity": 1
        },
        {
          "color": "#c6b0d8",
          "positionPct": 45,
          "opacity": 0.9
        },
        {
          "color": "#f3f1ef",
          "positionPct": 100,
          "opacity": 0
        }
      ],
      "usage": "hero decorative starburst mark"
    },
    {
      "id": "cta-button",
      "type": "linear",
      "angleDeg": 180,
      "stops": [
        {
          "color": "#132031",
          "positionPct": 0,
          "opacity": 1
        },
        {
          "color": "#0d1320",
          "positionPct": 100,
          "opacity": 1
        }
      ],
      "usage": "primary action button background"
    }
  ],
  "surfaceEffects": [
    {
      "name": "soft card elevation",
      "description": "cards and side panels use nearly white fills with faint borders and very subtle shadowing",
      "cssHints": [
        "background: #fbfaf9",
        "border: 1px solid #e6e1dd",
        "box-shadow: 0 10px 30px rgba(17,24,39,0.06)"
      ]
    },
    {
      "name": "blurred pastel glow",
      "description": "decorative iconography and lower page area use diffuse blush-lavender glow for warmth",
      "cssHints": [
        "background: radial-gradient(circle, rgba(245,178,154,0.9) 0%, rgba(198,176,216,0.8) 45%, rgba(243,241,239,0) 100%)",
        "filter: blur(8px)"
      ]
    }
  ],
  "stateTokens": [
    {
      "component": "button.primary",
      "state": "default",
      "treatment": "dark near-black pill fill with white text and a subtle outer shadow"
    },
    {
      "component": "button.primary",
      "state": "hover",
      "treatment": "slightly brighter navy-black fill with stronger contrast and a soft glow"
    },
    {
      "component": "button.primary",
      "state": "focus",
      "treatment": "thin pale border or halo ring around the pill to preserve the minimal aesthetic"
    },
    {
      "component": "input.search",
      "state": "focus",
      "treatment": "light surface remains white while border darkens slightly and caret/icon gain prominence"
    }
  ],
  "components": {
    "button": {
      "description": "Rounded pill buttons in two styles: dark filled primary CTAs and soft white secondary pills with muted icons and labels."
    },
    "card": {
      "description": "Compact feature cards with large corner radius, white backgrounds, faint borders, small pastel icons, bold titles, and muted supporting text."
    },
    "input": {
      "description": "Search and composer inputs use wide pill or rounded-rectangle containers, soft off-white fill, subtle border, low-contrast placeholder text, and embedded icons."
    },
    "navigation": {
      "description": "Left sidebar navigation uses simple line icons, muted labels, generous vertical spacing, and a pale selected row highlight with darker active text."
    }
  },
  "layout": "rounded app shell with fixed left sidebar, centered welcome hero and feature cards, bottom prompt composer, and right chat history rail",
  "visualElements": [
    {
      "name": "brand sidebar",
      "col": 1,
      "row": 1,
      "zoom": 2.6
    },
    {
      "name": "hero headline",
      "col": 2,
      "row": 1,
      "zoom": 2.4
    },
    {
      "name": "feature cards",
      "col": 2,
      "row": 2,
      "zoom": 2.7
    },
    {
      "name": "chat history",
      "col": 3,
      "row": 1,
      "zoom": 2.6
    },
    {
      "name": "prompt composer",
      "col": 2,
      "row": 3,
      "zoom": 2.8
    },
    {
      "name": "primary CTA",
      "col": 3,
      "row": 3,
      "zoom": 3.8
    }
  ],
  "imagePath": "/knowledge-refs/ai-8-nuro.png",
  "imageName": "ai-8-nuro.png",
  "capturedAt": "2026-05-20T00:12:57.039Z",
  "model": "openai/gpt-5.4-20260305"
}
-->

# Style Spec — ai-8-nuro.png

## Style Spec (Markdown)

**Industry**: ai
**Image**: ai-8-nuro.png
**Vibe**: minimal, soft, clean, airy, premium

**Summary**: A soft, minimal AI workspace with a light neutral canvas, rounded panels, and subtle pastel accents. The interface feels calm and premium, using airy spacing, low-contrast surfaces, and a dark primary CTA for emphasis.

### Palette
- Primary: `#0f1722` — near-black ink
- Secondary: `#f1d9d1` — soft blush
- Accent: `#c7b7d8` — pastel lavender
- Background: `#f3f1ef` — warm light gray
- Surface: `#fbfaf9` — off-white panel
- Text: `#12161d` — charcoal text
- Text muted: `#8f908f` — muted gray
- Border: `#e6e1dd` — soft divider
- Success: `#7fb39b` — sage green
- Warning: `#f0b78c` — peach
- Danger: `#de8d83` — dusty coral

### Typography
- Heading font: Inter (weight 700)
- Body font: Inter (weight 400)
- Base size: 16px
- Note: large centered hero heading
- Note: muted helper text
- Note: semi-bold navigation labels

### Spacing & Radius
- Spacing base: 8px; scale: 4, 8, 12, 16, 24, 32, 48, 64
- Radius: sm 8px, md 16px, lg 24px, pill 999px
- Shadows: 2 variant(s)
  - `0 1px 2px rgba(17,24,39,0.04)`
  - `0 10px 30px rgba(17,24,39,0.06)`

### Gradients
- **page-wash** (linear, 90deg) — overall page background with warm blush concentration near the bottom
  - stop 0%: `#f3f1ef`, alpha 1
  - stop 72%: `#f4f0ee`, alpha 1
  - stop 100%: `#f4d2c8`, alpha 0.9
- **logo-star** (radial) — hero decorative starburst mark
  - stop 0%: `#f5b29a`, alpha 1
  - stop 45%: `#c6b0d8`, alpha 0.9
  - stop 100%: `#f3f1ef`, alpha 0
- **cta-button** (linear, 180deg) — primary action button background
  - stop 0%: `#132031`, alpha 1
  - stop 100%: `#0d1320`, alpha 1

### Surface Effects
- **soft card elevation**: cards and side panels use nearly white fills with faint borders and very subtle shadowing
  - `background: #fbfaf9`
  - `border: 1px solid #e6e1dd`
  - `box-shadow: 0 10px 30px rgba(17,24,39,0.06)`
- **blurred pastel glow**: decorative iconography and lower page area use diffuse blush-lavender glow for warmth
  - `background: radial-gradient(circle, rgba(245,178,154,0.9) 0%, rgba(198,176,216,0.8) 45%, rgba(243,241,239,0) 100%)`
  - `filter: blur(8px)`

### Interaction State Tokens
- **button.primary.default**: dark near-black pill fill with white text and a subtle outer shadow
- **button.primary.hover**: slightly brighter navy-black fill with stronger contrast and a soft glow
- **button.primary.focus**: thin pale border or halo ring around the pill to preserve the minimal aesthetic
- **input.search.focus**: light surface remains white while border darkens slightly and caret/icon gain prominence

### Components
- **button**: Rounded pill buttons in two styles: dark filled primary CTAs and soft white secondary pills with muted icons and labels.
- **card**: Compact feature cards with large corner radius, white backgrounds, faint borders, small pastel icons, bold titles, and muted supporting text.
- **input**: Search and composer inputs use wide pill or rounded-rectangle containers, soft off-white fill, subtle border, low-contrast placeholder text, and embedded icons.
- **navigation**: Left sidebar navigation uses simple line icons, muted labels, generous vertical spacing, and a pale selected row highlight with darker active text.

### Layout
rounded app shell with fixed left sidebar, centered welcome hero and feature cards, bottom prompt composer, and right chat history rail

### UI Elements
Named UI regions identified in the reference screenshot (col/row = 3×3 grid):
- **brand sidebar** — col 1, row 1, zoom 2.6×
- **hero headline** — col 2, row 1, zoom 2.4×
- **feature cards** — col 2, row 2, zoom 2.7×
- **chat history** — col 3, row 1, zoom 2.6×
- **prompt composer** — col 2, row 3, zoom 2.8×
- **primary CTA** — col 3, row 3, zoom 3.8×

## Style Spec (HTML)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Style Spec — ai-8-nuro.png</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
    --color-primary:    #0f1722;
    --color-secondary:  #f1d9d1;
    --color-accent:     #c7b7d8;
    --color-background: #f3f1ef;
    --color-surface:    #fbfaf9;
    --color-text:       #12161d;
    --color-text-muted: #8f908f;
    --color-border:     #e6e1dd;
    --color-success:    #7fb39b;
    --color-warning:    #f0b78c;
    --color-danger:     #de8d83;
    --font-heading: 'Inter', system-ui, sans-serif;
    --font-body:    'Inter', system-ui, sans-serif;
    --font-mono:    'JetBrains Mono', ui-monospace, monospace;
    --weight-heading: 700;
    --weight-body:    400;
    --size-base:      16px;
    --radius-sm: 8px;
    --radius-md: 16px;
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
    <img src="/knowledge-refs/ai-8-nuro.png" alt="ai-8-nuro.png">
    <div class="header__body">
      <div class="kicker">ai</div>
      <h1>ai-8-nuro.png</h1>
      <p class="muted">A soft, minimal AI workspace with a light neutral canvas, rounded panels, and subtle pastel accents. The interface feels calm and premium, using airy spacing, low-contrast surfaces, and a dark primary CTA for emphasis.</p>
      <div class="tags">
        <span class="tag">minimal</span><span class="tag">soft</span><span class="tag">clean</span><span class="tag">airy</span><span class="tag">premium</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Palette</h2>
    <div class="palette">
    <div class="swatch">
      <div class="swatch__chip" style="background:#0f1722"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Primary</div>
        <div class="swatch__hex">#0f1722</div>
        <div class="swatch__name">near-black ink</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f1d9d1"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Secondary</div>
        <div class="swatch__hex">#f1d9d1</div>
        <div class="swatch__name">soft blush</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#c7b7d8"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Accent</div>
        <div class="swatch__hex">#c7b7d8</div>
        <div class="swatch__name">pastel lavender</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f3f1ef"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Background</div>
        <div class="swatch__hex">#f3f1ef</div>
        <div class="swatch__name">warm light gray</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#fbfaf9"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Surface</div>
        <div class="swatch__hex">#fbfaf9</div>
        <div class="swatch__name">off-white panel</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#12161d"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text</div>
        <div class="swatch__hex">#12161d</div>
        <div class="swatch__name">charcoal text</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#8f908f"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text muted</div>
        <div class="swatch__hex">#8f908f</div>
        <div class="swatch__name">muted gray</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#e6e1dd"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Border</div>
        <div class="swatch__hex">#e6e1dd</div>
        <div class="swatch__name">soft divider</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#7fb39b"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Success</div>
        <div class="swatch__hex">#7fb39b</div>
        <div class="swatch__name">sage green</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f0b78c"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Warning</div>
        <div class="swatch__hex">#f0b78c</div>
        <div class="swatch__name">peach</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#de8d83"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Danger</div>
        <div class="swatch__hex">#de8d83</div>
        <div class="swatch__name">dusty coral</div>
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

  <div class="section"><h2>Shadows</h2><div class="shadow-card" style="box-shadow:0 1px 2px rgba(17,24,39,0.04)">0 1px 2px rgba(17,24,39,0.04)</div><div class="shadow-card" style="box-shadow:0 10px 30px rgba(17,24,39,0.06)">0 10px 30px rgba(17,24,39,0.06)</div></div>

  <div class="section">
    <h2>Gradients</h2>
    <div class="signal-grid">
      <article class="signal-card">
        <div class="signal-preview" style="background:linear-gradient(90deg, #f3f1ef 0%, #f4f0ee 72%, rgba(244, 210, 200, 0.9) 100%);"></div>
        <div class="signal-title">page-wash</div>
        <div class="signal-meta">linear 90deg · overall page background with warm blush concentration near the bottom</div>
        <div class="signal-code">0% #f3f1ef @1  |  72% #f4f0ee @1  |  100% #f4d2c8 @0.9</div>
      </article>
      <article class="signal-card">
        <div class="signal-preview" style="background:radial-gradient(circle at center, #f5b29a 0%, rgba(198, 176, 216, 0.9) 45%, rgba(243, 241, 239, 0) 100%);"></div>
        <div class="signal-title">logo-star</div>
        <div class="signal-meta">radial · hero decorative starburst mark</div>
        <div class="signal-code">0% #f5b29a @1  |  45% #c6b0d8 @0.9  |  100% #f3f1ef @0</div>
      </article>
      <article class="signal-card">
        <div class="signal-preview" style="background:linear-gradient(180deg, #132031 0%, #0d1320 100%);"></div>
        <div class="signal-title">cta-button</div>
        <div class="signal-meta">linear 180deg · primary action button background</div>
        <div class="signal-code">0% #132031 @1  |  100% #0d1320 @1</div>
      </article></div>
  </div>

  <div class="section">
    <h2>Surface Effects</h2>
    <div class="signal-grid">
      <article class="signal-card">
        <div class="signal-title">soft card elevation</div>
        <div class="signal-meta">cards and side panels use nearly white fills with faint borders and very subtle shadowing</div>
        <div class="signal-code">background: #fbfaf9<br/>border: 1px solid #e6e1dd<br/>box-shadow: 0 10px 30px rgba(17,24,39,0.06)</div>
      </article>
      <article class="signal-card">
        <div class="signal-title">blurred pastel glow</div>
        <div class="signal-meta">decorative iconography and lower page area use diffuse blush-lavender glow for warmth</div>
        <div class="signal-code">background: radial-gradient(circle, rgba(245,178,154,0.9) 0%, rgba(198,176,216,0.8) 45%, rgba(243,241,239,0) 100%)<br/>filter: blur(8px)</div>
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
        <td>dark near-black pill fill with white text and a subtle outer shadow</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-hover">hover</span></td>
        <td>slightly brighter navy-black fill with stronger contrast and a soft glow</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-focus">focus</span></td>
        <td>thin pale border or halo ring around the pill to preserve the minimal aesthetic</td>
      </tr>
      <tr>
        <td>input.search</td>
        <td><span class="state-pill state-focus">focus</span></td>
        <td>light surface remains white while border darkens slightly and caret/icon gain prominence</td>
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
            src="/knowledge-refs/ai-8-nuro.png"
            alt="brand sidebar"
            style="--ox:0%;--oy:0%;--zoom:2.6;"
            draggable="false"
          />
        </div>
        <figcaption>brand sidebar</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/ai-8-nuro.png"
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
            src="/knowledge-refs/ai-8-nuro.png"
            alt="feature cards"
            style="--ox:50%;--oy:50%;--zoom:2.7;"
            draggable="false"
          />
        </div>
        <figcaption>feature cards</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/ai-8-nuro.png"
            alt="chat history"
            style="--ox:100%;--oy:0%;--zoom:2.6;"
            draggable="false"
          />
        </div>
        <figcaption>chat history</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/ai-8-nuro.png"
            alt="prompt composer"
            style="--ox:50%;--oy:100%;--zoom:2.8;"
            draggable="false"
          />
        </div>
        <figcaption>prompt composer</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/ai-8-nuro.png"
            alt="primary CTA"
            style="--ox:100%;--oy:100%;--zoom:3.8;"
            draggable="false"
          />
        </div>
        <figcaption>primary CTA</figcaption>
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
        <div class="component__desc">Rounded pill buttons in two styles: dark filled primary CTAs and soft white secondary pills with muted icons and labels.</div>
      </div>
      <div class="component">
        <div class="component__name">card</div>
        <div class="component__desc">Compact feature cards with large corner radius, white backgrounds, faint borders, small pastel icons, bold titles, and muted supporting text.</div>
      </div>
      <div class="component">
        <div class="component__name">input</div>
        <div class="component__desc">Search and composer inputs use wide pill or rounded-rectangle containers, soft off-white fill, subtle border, low-contrast placeholder text, and embedded icons.</div>
      </div>
      <div class="component">
        <div class="component__name">navigation</div>
        <div class="component__desc">Left sidebar navigation uses simple line icons, muted labels, generous vertical spacing, and a pale selected row highlight with darker active text.</div>
      </div></div>

  <div class="section"><h2>Layout pattern</h2><p>rounded app shell with fixed left sidebar, centered welcome hero and feature cards, bottom prompt composer, and right chat history rail</p></div>
</body>
</html>
```

