---
{"id":"DK-img-s1-saas","layer":"L1","kind":"design-knowledge","title":"Style Spec — s1-saas.png","tags":["industry:saas","source:vision-distill","image:s1-saas.png","manual:approved"],"source":"distill","refs":{},"createdAt":1778922871673,"updatedAt":1779236462422,"schemaVersion":1}
---

<!-- style-spec:json
{
  "industry": "saas",
  "summary": "A soft, modern SaaS landing page with airy whitespace, pastel gradients, rounded cards, and clean product-marketing sections. The aesthetic feels polished and friendly, blending subtle glassy surfaces with warm pink-blue highlights.",
  "vibe": [
    "minimal",
    "soft",
    "clean",
    "friendly",
    "premium"
  ],
  "palette": {
    "primary": {
      "hex": "#1f3f86",
      "label": "deep navy blue"
    },
    "secondary": {
      "hex": "#f3d9d8",
      "label": "soft blush pink"
    },
    "accent": {
      "hex": "#f28f8b",
      "label": "coral peach"
    },
    "background": {
      "hex": "#f6f5f3",
      "label": "warm off-white"
    },
    "surface": {
      "hex": "#ffffff",
      "label": "white"
    },
    "text": {
      "hex": "#18233d",
      "label": "dark navy text"
    },
    "textMuted": {
      "hex": "#707585",
      "label": "muted slate gray"
    },
    "border": {
      "hex": "#e8e3e1",
      "label": "light warm gray"
    },
    "success": {
      "hex": "#8bc8b2",
      "label": "mint green"
    }
  },
  "typography": {
    "headingFont": "Inter",
    "bodyFont": "Inter",
    "headingWeight": 700,
    "bodyWeight": 400,
    "baseSizePx": 16,
    "notes": [
      "large centered hero headings",
      "clean sans serif marketing typography",
      "small muted supporting copy"
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
    "smPx": 6,
    "mdPx": 12,
    "lgPx": 24,
    "pillPx": 999
  },
  "shadows": [
    "0 2px 8px rgba(24,35,61,0.06)",
    "0 12px 32px rgba(24,35,61,0.08)"
  ],
  "gradients": [
    {
      "id": "hero-panel",
      "type": "linear",
      "angleDeg": 135,
      "stops": [
        {
          "color": "#eef2fb",
          "positionPct": 0,
          "opacity": 1
        },
        {
          "color": "#f5edf0",
          "positionPct": 100,
          "opacity": 1
        }
      ],
      "usage": "main hero card background"
    },
    {
      "id": "faq-card",
      "type": "linear",
      "angleDeg": 180,
      "stops": [
        {
          "color": "#eef8fb",
          "positionPct": 0,
          "opacity": 1
        },
        {
          "color": "#f8f2f5",
          "positionPct": 100,
          "opacity": 1
        }
      ],
      "usage": "illustration panel in FAQ section"
    },
    {
      "id": "cta-band",
      "type": "linear",
      "angleDeg": 180,
      "stops": [
        {
          "color": "#f5dedd",
          "positionPct": 0,
          "opacity": 1
        },
        {
          "color": "#f7ebe7",
          "positionPct": 100,
          "opacity": 1
        }
      ],
      "usage": "bottom call-to-action section background"
    }
  ],
  "surfaceEffects": [
    {
      "name": "soft-glass",
      "description": "large panels use translucent pastel fills with gentle blur-like softness and very light borders",
      "cssHints": [
        "background: rgba(255,255,255,0.72)",
        "border: 1px solid rgba(232,227,225,0.9)",
        "box-shadow: 0 12px 32px rgba(24,35,61,0.08)"
      ]
    }
  ],
  "stateTokens": [
    {
      "component": "button.primary",
      "state": "default",
      "treatment": "solid deep navy fill with white text and subtle shadow"
    },
    {
      "component": "button.primary",
      "state": "hover",
      "treatment": "slightly darker navy fill with stronger shadow for lift"
    },
    {
      "component": "button.primary",
      "state": "focus",
      "treatment": "2px soft coral or blue outer ring around rounded button"
    },
    {
      "component": "input",
      "state": "focus",
      "treatment": "light surface fill with coral gradient outline and faint glow"
    }
  ],
  "components": {
    "button": {
      "description": "Rounded medium-height buttons; primary uses dark navy filled style, secondary is white or ghost with dark text and minimal border."
    },
    "card": {
      "description": "Floating cards with white backgrounds, large rounded corners, soft shadows, and sparse content such as stats, testimonials, and product snippets."
    },
    "input": {
      "description": "Pill-shaped prompt/input bar with white fill, subtle border, embedded icon button, and coral highlight ring."
    },
    "navigation": {
      "description": "Top navigation sits inside a rounded white bar with logo left, compact center links, and a small sign-up button on the right."
    }
  },
  "layout": "top navigation + centered hero panel + floating product cards + partner logos + testimonial cards + FAQ split layout + bottom CTA band",
  "visualElements": [
    {
      "name": "navigation bar",
      "col": 1,
      "row": 1,
      "zoom": 2.8
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
      "name": "floating stat card",
      "col": 1,
      "row": 2,
      "zoom": 3.6
    },
    {
      "name": "testimonial cards",
      "col": 3,
      "row": 2,
      "zoom": 2.8
    },
    {
      "name": "faq panel",
      "col": 3,
      "row": 3,
      "zoom": 2.7
    }
  ],
  "imagePath": "/knowledge-refs/s1-saas.png",
  "imageName": "s1-saas.png",
  "capturedAt": "2026-05-20T00:21:02.421Z",
  "model": "openai/gpt-5.4-20260305"
}
-->

# Style Spec — s1-saas.png

## Style Spec (Markdown)

**Industry**: saas
**Image**: s1-saas.png
**Vibe**: minimal, soft, clean, friendly, premium

**Summary**: A soft, modern SaaS landing page with airy whitespace, pastel gradients, rounded cards, and clean product-marketing sections. The aesthetic feels polished and friendly, blending subtle glassy surfaces with warm pink-blue highlights.

### Palette
- Primary: `#1f3f86` — deep navy blue
- Secondary: `#f3d9d8` — soft blush pink
- Accent: `#f28f8b` — coral peach
- Background: `#f6f5f3` — warm off-white
- Surface: `#ffffff` — white
- Text: `#18233d` — dark navy text
- Text muted: `#707585` — muted slate gray
- Border: `#e8e3e1` — light warm gray
- Success: `#8bc8b2` — mint green

### Typography
- Heading font: Inter (weight 700)
- Body font: Inter (weight 400)
- Base size: 16px
- Note: large centered hero headings
- Note: clean sans serif marketing typography
- Note: small muted supporting copy

### Spacing & Radius
- Spacing base: 8px; scale: 4, 8, 12, 16, 24, 32, 48, 64
- Radius: sm 6px, md 12px, lg 24px, pill 999px
- Shadows: 2 variant(s)
  - `0 2px 8px rgba(24,35,61,0.06)`
  - `0 12px 32px rgba(24,35,61,0.08)`

### Gradients
- **hero-panel** (linear, 135deg) — main hero card background
  - stop 0%: `#eef2fb`, alpha 1
  - stop 100%: `#f5edf0`, alpha 1
- **faq-card** (linear, 180deg) — illustration panel in FAQ section
  - stop 0%: `#eef8fb`, alpha 1
  - stop 100%: `#f8f2f5`, alpha 1
- **cta-band** (linear, 180deg) — bottom call-to-action section background
  - stop 0%: `#f5dedd`, alpha 1
  - stop 100%: `#f7ebe7`, alpha 1

### Surface Effects
- **soft-glass**: large panels use translucent pastel fills with gentle blur-like softness and very light borders
  - `background: rgba(255,255,255,0.72)`
  - `border: 1px solid rgba(232,227,225,0.9)`
  - `box-shadow: 0 12px 32px rgba(24,35,61,0.08)`

### Interaction State Tokens
- **button.primary.default**: solid deep navy fill with white text and subtle shadow
- **button.primary.hover**: slightly darker navy fill with stronger shadow for lift
- **button.primary.focus**: 2px soft coral or blue outer ring around rounded button
- **input.focus**: light surface fill with coral gradient outline and faint glow

### Components
- **button**: Rounded medium-height buttons; primary uses dark navy filled style, secondary is white or ghost with dark text and minimal border.
- **card**: Floating cards with white backgrounds, large rounded corners, soft shadows, and sparse content such as stats, testimonials, and product snippets.
- **input**: Pill-shaped prompt/input bar with white fill, subtle border, embedded icon button, and coral highlight ring.
- **navigation**: Top navigation sits inside a rounded white bar with logo left, compact center links, and a small sign-up button on the right.

### Layout
top navigation + centered hero panel + floating product cards + partner logos + testimonial cards + FAQ split layout + bottom CTA band

### UI Elements
Named UI regions identified in the reference screenshot (col/row = 3×3 grid):
- **navigation bar** — col 1, row 1, zoom 2.8×
- **hero headline** — col 1, row 1, zoom 2.4×
- **primary CTA** — col 1, row 2, zoom 4×
- **floating stat card** — col 1, row 2, zoom 3.6×
- **testimonial cards** — col 3, row 2, zoom 2.8×
- **faq panel** — col 3, row 3, zoom 2.7×

## Style Spec (HTML)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Style Spec — s1-saas.png</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
    --color-primary:    #1f3f86;
    --color-secondary:  #f3d9d8;
    --color-accent:     #f28f8b;
    --color-background: #f6f5f3;
    --color-surface:    #ffffff;
    --color-text:       #18233d;
    --color-text-muted: #707585;
    --color-border:     #e8e3e1;
    --color-success:    #8bc8b2;
    --color-warning:    #f59e0b;
    --color-danger:     #ef4444;
    --font-heading: 'Inter', system-ui, sans-serif;
    --font-body:    'Inter', system-ui, sans-serif;
    --font-mono:    'JetBrains Mono', ui-monospace, monospace;
    --weight-heading: 700;
    --weight-body:    400;
    --size-base:      16px;
    --radius-sm: 6px;
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
    <img src="/knowledge-refs/s1-saas.png" alt="s1-saas.png">
    <div class="header__body">
      <div class="kicker">saas</div>
      <h1>s1-saas.png</h1>
      <p class="muted">A soft, modern SaaS landing page with airy whitespace, pastel gradients, rounded cards, and clean product-marketing sections. The aesthetic feels polished and friendly, blending subtle glassy surfaces with warm pink-blue highlights.</p>
      <div class="tags">
        <span class="tag">minimal</span><span class="tag">soft</span><span class="tag">clean</span><span class="tag">friendly</span><span class="tag">premium</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Palette</h2>
    <div class="palette">
    <div class="swatch">
      <div class="swatch__chip" style="background:#1f3f86"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Primary</div>
        <div class="swatch__hex">#1f3f86</div>
        <div class="swatch__name">deep navy blue</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f3d9d8"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Secondary</div>
        <div class="swatch__hex">#f3d9d8</div>
        <div class="swatch__name">soft blush pink</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f28f8b"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Accent</div>
        <div class="swatch__hex">#f28f8b</div>
        <div class="swatch__name">coral peach</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f6f5f3"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Background</div>
        <div class="swatch__hex">#f6f5f3</div>
        <div class="swatch__name">warm off-white</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#ffffff"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Surface</div>
        <div class="swatch__hex">#ffffff</div>
        <div class="swatch__name">white</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#18233d"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text</div>
        <div class="swatch__hex">#18233d</div>
        <div class="swatch__name">dark navy text</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#707585"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text muted</div>
        <div class="swatch__hex">#707585</div>
        <div class="swatch__name">muted slate gray</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#e8e3e1"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Border</div>
        <div class="swatch__hex">#e8e3e1</div>
        <div class="swatch__name">light warm gray</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#8bc8b2"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Success</div>
        <div class="swatch__hex">#8bc8b2</div>
        <div class="swatch__name">mint green</div>
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

  <div class="section"><h2>Shadows</h2><div class="shadow-card" style="box-shadow:0 2px 8px rgba(24,35,61,0.06)">0 2px 8px rgba(24,35,61,0.06)</div><div class="shadow-card" style="box-shadow:0 12px 32px rgba(24,35,61,0.08)">0 12px 32px rgba(24,35,61,0.08)</div></div>

  <div class="section">
    <h2>Gradients</h2>
    <div class="signal-grid">
      <article class="signal-card">
        <div class="signal-preview" style="background:linear-gradient(135deg, #eef2fb 0%, #f5edf0 100%);"></div>
        <div class="signal-title">hero-panel</div>
        <div class="signal-meta">linear 135deg · main hero card background</div>
        <div class="signal-code">0% #eef2fb @1  |  100% #f5edf0 @1</div>
      </article>
      <article class="signal-card">
        <div class="signal-preview" style="background:linear-gradient(180deg, #eef8fb 0%, #f8f2f5 100%);"></div>
        <div class="signal-title">faq-card</div>
        <div class="signal-meta">linear 180deg · illustration panel in FAQ section</div>
        <div class="signal-code">0% #eef8fb @1  |  100% #f8f2f5 @1</div>
      </article>
      <article class="signal-card">
        <div class="signal-preview" style="background:linear-gradient(180deg, #f5dedd 0%, #f7ebe7 100%);"></div>
        <div class="signal-title">cta-band</div>
        <div class="signal-meta">linear 180deg · bottom call-to-action section background</div>
        <div class="signal-code">0% #f5dedd @1  |  100% #f7ebe7 @1</div>
      </article></div>
  </div>

  <div class="section">
    <h2>Surface Effects</h2>
    <div class="signal-grid">
      <article class="signal-card">
        <div class="signal-title">soft-glass</div>
        <div class="signal-meta">large panels use translucent pastel fills with gentle blur-like softness and very light borders</div>
        <div class="signal-code">background: rgba(255,255,255,0.72)<br/>border: 1px solid rgba(232,227,225,0.9)<br/>box-shadow: 0 12px 32px rgba(24,35,61,0.08)</div>
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
        <td>solid deep navy fill with white text and subtle shadow</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-hover">hover</span></td>
        <td>slightly darker navy fill with stronger shadow for lift</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-focus">focus</span></td>
        <td>2px soft coral or blue outer ring around rounded button</td>
      </tr>
      <tr>
        <td>input</td>
        <td><span class="state-pill state-focus">focus</span></td>
        <td>light surface fill with coral gradient outline and faint glow</td>
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
            src="/knowledge-refs/s1-saas.png"
            alt="navigation bar"
            style="--ox:0%;--oy:0%;--zoom:2.8;"
            draggable="false"
          />
        </div>
        <figcaption>navigation bar</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/s1-saas.png"
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
            src="/knowledge-refs/s1-saas.png"
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
            src="/knowledge-refs/s1-saas.png"
            alt="floating stat card"
            style="--ox:0%;--oy:50%;--zoom:3.6;"
            draggable="false"
          />
        </div>
        <figcaption>floating stat card</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/s1-saas.png"
            alt="testimonial cards"
            style="--ox:100%;--oy:50%;--zoom:2.8;"
            draggable="false"
          />
        </div>
        <figcaption>testimonial cards</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/s1-saas.png"
            alt="faq panel"
            style="--ox:100%;--oy:100%;--zoom:2.7;"
            draggable="false"
          />
        </div>
        <figcaption>faq panel</figcaption>
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
        <div class="component__desc">Rounded medium-height buttons; primary uses dark navy filled style, secondary is white or ghost with dark text and minimal border.</div>
      </div>
      <div class="component">
        <div class="component__name">card</div>
        <div class="component__desc">Floating cards with white backgrounds, large rounded corners, soft shadows, and sparse content such as stats, testimonials, and product snippets.</div>
      </div>
      <div class="component">
        <div class="component__name">input</div>
        <div class="component__desc">Pill-shaped prompt/input bar with white fill, subtle border, embedded icon button, and coral highlight ring.</div>
      </div>
      <div class="component">
        <div class="component__name">navigation</div>
        <div class="component__desc">Top navigation sits inside a rounded white bar with logo left, compact center links, and a small sign-up button on the right.</div>
      </div></div>

  <div class="section"><h2>Layout pattern</h2><p>top navigation + centered hero panel + floating product cards + partner logos + testimonial cards + FAQ split layout + bottom CTA band</p></div>
</body>
</html>
```

