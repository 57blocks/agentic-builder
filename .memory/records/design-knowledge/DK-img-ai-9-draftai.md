---
{"id":"DK-img-ai-9-draftai","layer":"L1","kind":"design-knowledge","title":"Style Spec — ai-9-draftai.png","tags":["industry:ai","source:vision-distill","image:ai-9-draftai.png","manual:approved"],"source":"distill","refs":{},"createdAt":1778922821033,"updatedAt":1779235996743,"schemaVersion":1}
---

<!-- style-spec:json
{
  "industry": "ai",
  "summary": "A bright, minimal AI product landing page with soft grayscale surfaces, rounded containers, and a vivid electric-blue accent used sparingly for CTAs and highlighted chat content. The interface feels polished and contemporary, balancing clean typography with subtle shadows, glows, and dotted texture.",
  "vibe": [
    "minimal",
    "clean",
    "soft",
    "modern",
    "premium"
  ],
  "palette": {
    "primary": {
      "hex": "#2d9dff",
      "label": "electric blue"
    },
    "secondary": {
      "hex": "#111111",
      "label": "near-black"
    },
    "accent": {
      "hex": "#66c2ff",
      "label": "soft sky blue glow"
    },
    "background": {
      "hex": "#f8f8f8",
      "label": "warm white page background"
    },
    "surface": {
      "hex": "#ffffff",
      "label": "card white"
    },
    "text": {
      "hex": "#1f1a1e",
      "label": "deep charcoal"
    },
    "textMuted": {
      "hex": "#8f8c93",
      "label": "muted gray"
    },
    "border": {
      "hex": "#ecebed",
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
      "oversized bold hero heading",
      "lightweight muted supporting copy",
      "compact rounded button labels"
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
    "mdPx": 14,
    "lgPx": 24,
    "pillPx": 999
  },
  "shadows": [
    "0 2px 8px rgba(0,0,0,0.04)",
    "0 12px 30px rgba(45,157,255,0.28)"
  ],
  "gradients": [
    {
      "id": "cta-glow",
      "type": "linear",
      "angleDeg": 0,
      "stops": [
        {
          "color": "#2d9dff",
          "positionPct": 0,
          "opacity": 1
        },
        {
          "color": "#3ba8ff",
          "positionPct": 55,
          "opacity": 1
        },
        {
          "color": "#66c2ff",
          "positionPct": 100,
          "opacity": 1
        }
      ],
      "usage": "top-right primary button and highlighted AI chat bubble"
    }
  ],
  "surfaceEffects": [
    {
      "name": "soft glow",
      "description": "blue interactive elements use a luminous outer glow against otherwise flat white surfaces",
      "cssHints": [
        "box-shadow: 0 0 0 1px rgba(45,157,255,0.08), 0 10px 24px rgba(45,157,255,0.30)",
        "background: linear-gradient(90deg, #2d9dff 0%, #66c2ff 100%)"
      ]
    },
    {
      "name": "subtle texture",
      "description": "hero panel background includes a faint repeating dot pattern over white",
      "cssHints": [
        "background-color: #ffffff",
        "background-image: radial-gradient(rgba(0,0,0,0.05) 1px, transparent 1px)",
        "background-size: 16px 16px"
      ]
    }
  ],
  "stateTokens": [
    {
      "component": "button.primary",
      "state": "default",
      "treatment": "rounded pill with bright blue gradient fill, white text, and soft blue outer glow"
    },
    {
      "component": "button.primary",
      "state": "hover",
      "treatment": "slightly brighter blue fill with expanded blur glow and stronger shadow"
    },
    {
      "component": "button.primary",
      "state": "focus",
      "treatment": "soft blue focus halo around the pill outside the button edge"
    },
    {
      "component": "input.email",
      "state": "focus",
      "treatment": "white field retains minimal styling with a subtle gray-to-blue outline emphasis"
    }
  ],
  "components": {
    "button": {
      "description": "Pill-shaped buttons with minimal borders; primary actions use glowing blue gradient fills while secondary actions are white with light gray border and dark text."
    },
    "card": {
      "description": "Large white rounded panels with very light borders and almost invisible shadows, used for chat preview and hero content blocks."
    },
    "input": {
      "description": "Single-line email input with soft rounded corners, white fill, thin light-gray border, and understated placeholder text."
    },
    "navigation": {
      "description": "Centered top navigation with lightweight text links inside a soft pill container; brand on the left and auth actions on the right."
    }
  },
  "layout": "top navigation with logo and auth CTA above a two-column hero: AI chat-preview panel on the left and headline, CTA, newsletter form, and sponsor logos on the right",
  "visualElements": [
    {
      "name": "logo header",
      "col": 1,
      "row": 1,
      "zoom": 3
    },
    {
      "name": "top nav",
      "col": 2,
      "row": 1,
      "zoom": 3
    },
    {
      "name": "primary CTA",
      "col": 3,
      "row": 1,
      "zoom": 3.5
    },
    {
      "name": "chat preview",
      "col": 1,
      "row": 2,
      "zoom": 2.4
    },
    {
      "name": "hero headline",
      "col": 3,
      "row": 1,
      "zoom": 2.2
    },
    {
      "name": "newsletter form",
      "col": 3,
      "row": 3,
      "zoom": 3.2
    }
  ],
  "imagePath": "/knowledge-refs/ai-9-draftai.png",
  "imageName": "ai-9-draftai.png",
  "capturedAt": "2026-05-20T00:13:16.742Z",
  "model": "openai/gpt-5.4-20260305"
}
-->

# Style Spec — ai-9-draftai.png

## Style Spec (Markdown)

**Industry**: ai
**Image**: ai-9-draftai.png
**Vibe**: minimal, clean, soft, modern, premium

**Summary**: A bright, minimal AI product landing page with soft grayscale surfaces, rounded containers, and a vivid electric-blue accent used sparingly for CTAs and highlighted chat content. The interface feels polished and contemporary, balancing clean typography with subtle shadows, glows, and dotted texture.

### Palette
- Primary: `#2d9dff` — electric blue
- Secondary: `#111111` — near-black
- Accent: `#66c2ff` — soft sky blue glow
- Background: `#f8f8f8` — warm white page background
- Surface: `#ffffff` — card white
- Text: `#1f1a1e` — deep charcoal
- Text muted: `#8f8c93` — muted gray
- Border: `#ecebed` — light gray border

### Typography
- Heading font: Inter (weight 700)
- Body font: Inter (weight 400)
- Base size: 16px
- Note: oversized bold hero heading
- Note: lightweight muted supporting copy
- Note: compact rounded button labels

### Spacing & Radius
- Spacing base: 8px; scale: 4, 8, 12, 16, 24, 32, 48, 64
- Radius: sm 8px, md 14px, lg 24px, pill 999px
- Shadows: 2 variant(s)
  - `0 2px 8px rgba(0,0,0,0.04)`
  - `0 12px 30px rgba(45,157,255,0.28)`

### Gradients
- **cta-glow** (linear, 0deg) — top-right primary button and highlighted AI chat bubble
  - stop 0%: `#2d9dff`, alpha 1
  - stop 55%: `#3ba8ff`, alpha 1
  - stop 100%: `#66c2ff`, alpha 1

### Surface Effects
- **soft glow**: blue interactive elements use a luminous outer glow against otherwise flat white surfaces
  - `box-shadow: 0 0 0 1px rgba(45,157,255,0.08), 0 10px 24px rgba(45,157,255,0.30)`
  - `background: linear-gradient(90deg, #2d9dff 0%, #66c2ff 100%)`
- **subtle texture**: hero panel background includes a faint repeating dot pattern over white
  - `background-color: #ffffff`
  - `background-image: radial-gradient(rgba(0,0,0,0.05) 1px, transparent 1px)`
  - `background-size: 16px 16px`

### Interaction State Tokens
- **button.primary.default**: rounded pill with bright blue gradient fill, white text, and soft blue outer glow
- **button.primary.hover**: slightly brighter blue fill with expanded blur glow and stronger shadow
- **button.primary.focus**: soft blue focus halo around the pill outside the button edge
- **input.email.focus**: white field retains minimal styling with a subtle gray-to-blue outline emphasis

### Components
- **button**: Pill-shaped buttons with minimal borders; primary actions use glowing blue gradient fills while secondary actions are white with light gray border and dark text.
- **card**: Large white rounded panels with very light borders and almost invisible shadows, used for chat preview and hero content blocks.
- **input**: Single-line email input with soft rounded corners, white fill, thin light-gray border, and understated placeholder text.
- **navigation**: Centered top navigation with lightweight text links inside a soft pill container; brand on the left and auth actions on the right.

### Layout
top navigation with logo and auth CTA above a two-column hero: AI chat-preview panel on the left and headline, CTA, newsletter form, and sponsor logos on the right

### UI Elements
Named UI regions identified in the reference screenshot (col/row = 3×3 grid):
- **logo header** — col 1, row 1, zoom 3×
- **top nav** — col 2, row 1, zoom 3×
- **primary CTA** — col 3, row 1, zoom 3.5×
- **chat preview** — col 1, row 2, zoom 2.4×
- **hero headline** — col 3, row 1, zoom 2.2×
- **newsletter form** — col 3, row 3, zoom 3.2×

## Style Spec (HTML)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Style Spec — ai-9-draftai.png</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
    --color-primary:    #2d9dff;
    --color-secondary:  #111111;
    --color-accent:     #66c2ff;
    --color-background: #f8f8f8;
    --color-surface:    #ffffff;
    --color-text:       #1f1a1e;
    --color-text-muted: #8f8c93;
    --color-border:     #ecebed;
    --color-success:    #22c55e;
    --color-warning:    #f59e0b;
    --color-danger:     #ef4444;
    --font-heading: 'Inter', system-ui, sans-serif;
    --font-body:    'Inter', system-ui, sans-serif;
    --font-mono:    'JetBrains Mono', ui-monospace, monospace;
    --weight-heading: 700;
    --weight-body:    400;
    --size-base:      16px;
    --radius-sm: 8px;
    --radius-md: 14px;
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
    <img src="/knowledge-refs/ai-9-draftai.png" alt="ai-9-draftai.png">
    <div class="header__body">
      <div class="kicker">ai</div>
      <h1>ai-9-draftai.png</h1>
      <p class="muted">A bright, minimal AI product landing page with soft grayscale surfaces, rounded containers, and a vivid electric-blue accent used sparingly for CTAs and highlighted chat content. The interface feels polished and contemporary, balancing clean typography with subtle shadows, glows, and dotted texture.</p>
      <div class="tags">
        <span class="tag">minimal</span><span class="tag">clean</span><span class="tag">soft</span><span class="tag">modern</span><span class="tag">premium</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Palette</h2>
    <div class="palette">
    <div class="swatch">
      <div class="swatch__chip" style="background:#2d9dff"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Primary</div>
        <div class="swatch__hex">#2d9dff</div>
        <div class="swatch__name">electric blue</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#111111"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Secondary</div>
        <div class="swatch__hex">#111111</div>
        <div class="swatch__name">near-black</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#66c2ff"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Accent</div>
        <div class="swatch__hex">#66c2ff</div>
        <div class="swatch__name">soft sky blue glow</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f8f8f8"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Background</div>
        <div class="swatch__hex">#f8f8f8</div>
        <div class="swatch__name">warm white page background</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#ffffff"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Surface</div>
        <div class="swatch__hex">#ffffff</div>
        <div class="swatch__name">card white</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#1f1a1e"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text</div>
        <div class="swatch__hex">#1f1a1e</div>
        <div class="swatch__name">deep charcoal</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#8f8c93"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text muted</div>
        <div class="swatch__hex">#8f8c93</div>
        <div class="swatch__name">muted gray</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#ecebed"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Border</div>
        <div class="swatch__hex">#ecebed</div>
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

  <div class="section"><h2>Shadows</h2><div class="shadow-card" style="box-shadow:0 2px 8px rgba(0,0,0,0.04)">0 2px 8px rgba(0,0,0,0.04)</div><div class="shadow-card" style="box-shadow:0 12px 30px rgba(45,157,255,0.28)">0 12px 30px rgba(45,157,255,0.28)</div></div>

  <div class="section">
    <h2>Gradients</h2>
    <div class="signal-grid">
      <article class="signal-card">
        <div class="signal-preview" style="background:linear-gradient(0deg, #2d9dff 0%, #3ba8ff 55%, #66c2ff 100%);"></div>
        <div class="signal-title">cta-glow</div>
        <div class="signal-meta">linear 0deg · top-right primary button and highlighted AI chat bubble</div>
        <div class="signal-code">0% #2d9dff @1  |  55% #3ba8ff @1  |  100% #66c2ff @1</div>
      </article></div>
  </div>

  <div class="section">
    <h2>Surface Effects</h2>
    <div class="signal-grid">
      <article class="signal-card">
        <div class="signal-title">soft glow</div>
        <div class="signal-meta">blue interactive elements use a luminous outer glow against otherwise flat white surfaces</div>
        <div class="signal-code">box-shadow: 0 0 0 1px rgba(45,157,255,0.08), 0 10px 24px rgba(45,157,255,0.30)<br/>background: linear-gradient(90deg, #2d9dff 0%, #66c2ff 100%)</div>
      </article>
      <article class="signal-card">
        <div class="signal-title">subtle texture</div>
        <div class="signal-meta">hero panel background includes a faint repeating dot pattern over white</div>
        <div class="signal-code">background-color: #ffffff<br/>background-image: radial-gradient(rgba(0,0,0,0.05) 1px, transparent 1px)<br/>background-size: 16px 16px</div>
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
        <td>rounded pill with bright blue gradient fill, white text, and soft blue outer glow</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-hover">hover</span></td>
        <td>slightly brighter blue fill with expanded blur glow and stronger shadow</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-focus">focus</span></td>
        <td>soft blue focus halo around the pill outside the button edge</td>
      </tr>
      <tr>
        <td>input.email</td>
        <td><span class="state-pill state-focus">focus</span></td>
        <td>white field retains minimal styling with a subtle gray-to-blue outline emphasis</td>
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
            src="/knowledge-refs/ai-9-draftai.png"
            alt="logo header"
            style="--ox:0%;--oy:0%;--zoom:3;"
            draggable="false"
          />
        </div>
        <figcaption>logo header</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/ai-9-draftai.png"
            alt="top nav"
            style="--ox:50%;--oy:0%;--zoom:3;"
            draggable="false"
          />
        </div>
        <figcaption>top nav</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/ai-9-draftai.png"
            alt="primary CTA"
            style="--ox:100%;--oy:0%;--zoom:3.5;"
            draggable="false"
          />
        </div>
        <figcaption>primary CTA</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/ai-9-draftai.png"
            alt="chat preview"
            style="--ox:0%;--oy:50%;--zoom:2.4;"
            draggable="false"
          />
        </div>
        <figcaption>chat preview</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/ai-9-draftai.png"
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
            src="/knowledge-refs/ai-9-draftai.png"
            alt="newsletter form"
            style="--ox:100%;--oy:100%;--zoom:3.2;"
            draggable="false"
          />
        </div>
        <figcaption>newsletter form</figcaption>
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
        <div class="component__desc">Pill-shaped buttons with minimal borders; primary actions use glowing blue gradient fills while secondary actions are white with light gray border and dark text.</div>
      </div>
      <div class="component">
        <div class="component__name">card</div>
        <div class="component__desc">Large white rounded panels with very light borders and almost invisible shadows, used for chat preview and hero content blocks.</div>
      </div>
      <div class="component">
        <div class="component__name">input</div>
        <div class="component__desc">Single-line email input with soft rounded corners, white fill, thin light-gray border, and understated placeholder text.</div>
      </div>
      <div class="component">
        <div class="component__name">navigation</div>
        <div class="component__desc">Centered top navigation with lightweight text links inside a soft pill container; brand on the left and auth actions on the right.</div>
      </div></div>

  <div class="section"><h2>Layout pattern</h2><p>top navigation with logo and auth CTA above a two-column hero: AI chat-preview panel on the left and headline, CTA, newsletter form, and sponsor logos on the right</p></div>
</body>
</html>
```

