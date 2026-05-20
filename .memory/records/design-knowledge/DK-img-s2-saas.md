---
{"id":"DK-img-s2-saas","layer":"L1","kind":"design-knowledge","title":"Style Spec — s2-saas.png","tags":["industry:saas","source:vision-distill","image:s2-saas.png","manual:approved"],"source":"distill","refs":{},"createdAt":1778922881809,"updatedAt":1779236483926,"schemaVersion":1}
---

<!-- style-spec:json
{
  "industry": "saas",
  "summary": "A soft, modern SaaS landing page with a light lavender backdrop, rounded cards, and indigo CTAs. The design feels clean and approachable, using spacious sections, subtle shadows, and product mockups to emphasize usability.",
  "vibe": [
    "minimal",
    "soft",
    "modern",
    "friendly",
    "clean"
  ],
  "palette": {
    "primary": {
      "hex": "#28207f",
      "label": "deep indigo"
    },
    "secondary": {
      "hex": "#cfc7f2",
      "label": "soft lavender"
    },
    "accent": {
      "hex": "#6f65cc",
      "label": "vivid violet"
    },
    "background": {
      "hex": "#f4f1fb",
      "label": "pale lavender background"
    },
    "surface": {
      "hex": "#ffffff",
      "label": "white card surface"
    },
    "text": {
      "hex": "#2d2956",
      "label": "dark slate indigo"
    },
    "textMuted": {
      "hex": "#8c88a8",
      "label": "muted lavender gray"
    },
    "border": {
      "hex": "#e8e3f3",
      "label": "soft lilac border"
    },
    "success": {
      "hex": "#78c98b",
      "label": "soft green"
    },
    "warning": {
      "hex": "#f2c46d",
      "label": "warm amber"
    },
    "danger": {
      "hex": "#e78b8b",
      "label": "soft coral"
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
      "compact navigation labels",
      "muted paragraph copy"
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
    "0 2px 8px rgba(40,32,127,0.06)",
    "0 12px 30px rgba(40,32,127,0.08)"
  ],
  "gradients": [
    {
      "id": "hero-panel-bg",
      "type": "linear",
      "angleDeg": 180,
      "stops": [
        {
          "color": "#f7f5fc",
          "positionPct": 0,
          "opacity": 1
        },
        {
          "color": "#ece6fb",
          "positionPct": 100,
          "opacity": 1
        }
      ],
      "usage": "hero product showcase background"
    },
    {
      "id": "cta-button",
      "type": "linear",
      "angleDeg": 90,
      "stops": [
        {
          "color": "#3c3298",
          "positionPct": 0,
          "opacity": 1
        },
        {
          "color": "#28207f",
          "positionPct": 100,
          "opacity": 1
        }
      ],
      "usage": "primary buttons and highlighted pricing CTA"
    }
  ],
  "surfaceEffects": [
    {
      "name": "soft card elevation",
      "description": "cards use white fills, faint lilac borders, and subtle shadow for a soft floating effect",
      "cssHints": [
        "background: #ffffff",
        "border: 1px solid #e8e3f3",
        "box-shadow: 0 12px 30px rgba(40,32,127,0.08)"
      ]
    }
  ],
  "stateTokens": [
    {
      "component": "button.primary",
      "state": "default",
      "treatment": "pill-shaped indigo gradient fill with white text and soft shadow"
    },
    {
      "component": "button.primary",
      "state": "hover",
      "treatment": "slightly brighter indigo fill with stronger shadow and higher contrast"
    },
    {
      "component": "button.primary",
      "state": "focus",
      "treatment": "indigo button with subtle outer ring in pale lavender"
    },
    {
      "component": "navigation.link",
      "state": "default",
      "treatment": "small dark text on light background with low emphasis"
    },
    {
      "component": "navigation.link",
      "state": "hover",
      "treatment": "text darkens and gains stronger contrast without heavy decoration"
    }
  ],
  "components": {
    "button": {
      "description": "Rounded pill buttons in dark indigo gradient, medium weight text, compact height, used for hero and pricing CTAs."
    },
    "card": {
      "description": "White rounded cards with soft borders and light shadow; used for feature blocks, UI previews, testimonials, and pricing tiers."
    },
    "input": {
      "description": "Mock form controls use white fields with subtle borders, rounded corners, and small labels; toggles and radio inputs appear in indigo."
    },
    "navigation": {
      "description": "Top navigation bar is minimal and centered within a rounded white header strip, with logo on the left and a pill CTA on the right."
    }
  },
  "layout": "top navigation + centered hero + product mockup grid + alternating feature sections + pricing cards + testimonial row",
  "visualElements": [
    {
      "name": "navigation bar",
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
      "row": 1,
      "zoom": 4
    },
    {
      "name": "booking mockup",
      "col": 2,
      "row": 2,
      "zoom": 2.8
    },
    {
      "name": "feature cards",
      "col": 3,
      "row": 2,
      "zoom": 2.6
    },
    {
      "name": "pricing table",
      "col": 3,
      "row": 3,
      "zoom": 2.6
    }
  ],
  "imagePath": "/knowledge-refs/s2-saas.png",
  "imageName": "s2-saas.png",
  "capturedAt": "2026-05-20T00:21:23.925Z",
  "model": "openai/gpt-5.4-20260305"
}
-->

# Style Spec — s2-saas.png

## Style Spec (Markdown)

**Industry**: saas
**Image**: s2-saas.png
**Vibe**: minimal, soft, modern, friendly, clean

**Summary**: A soft, modern SaaS landing page with a light lavender backdrop, rounded cards, and indigo CTAs. The design feels clean and approachable, using spacious sections, subtle shadows, and product mockups to emphasize usability.

### Palette
- Primary: `#28207f` — deep indigo
- Secondary: `#cfc7f2` — soft lavender
- Accent: `#6f65cc` — vivid violet
- Background: `#f4f1fb` — pale lavender background
- Surface: `#ffffff` — white card surface
- Text: `#2d2956` — dark slate indigo
- Text muted: `#8c88a8` — muted lavender gray
- Border: `#e8e3f3` — soft lilac border
- Success: `#78c98b` — soft green
- Warning: `#f2c46d` — warm amber
- Danger: `#e78b8b` — soft coral

### Typography
- Heading font: Inter (weight 700)
- Body font: Inter (weight 400)
- Base size: 16px
- Note: large centered hero headings
- Note: compact navigation labels
- Note: muted paragraph copy

### Spacing & Radius
- Spacing base: 8px; scale: 4, 8, 12, 16, 24, 32, 48, 64
- Radius: sm 4px, md 10px, lg 20px, pill 999px
- Shadows: 2 variant(s)
  - `0 2px 8px rgba(40,32,127,0.06)`
  - `0 12px 30px rgba(40,32,127,0.08)`

### Gradients
- **hero-panel-bg** (linear, 180deg) — hero product showcase background
  - stop 0%: `#f7f5fc`, alpha 1
  - stop 100%: `#ece6fb`, alpha 1
- **cta-button** (linear, 90deg) — primary buttons and highlighted pricing CTA
  - stop 0%: `#3c3298`, alpha 1
  - stop 100%: `#28207f`, alpha 1

### Surface Effects
- **soft card elevation**: cards use white fills, faint lilac borders, and subtle shadow for a soft floating effect
  - `background: #ffffff`
  - `border: 1px solid #e8e3f3`
  - `box-shadow: 0 12px 30px rgba(40,32,127,0.08)`

### Interaction State Tokens
- **button.primary.default**: pill-shaped indigo gradient fill with white text and soft shadow
- **button.primary.hover**: slightly brighter indigo fill with stronger shadow and higher contrast
- **button.primary.focus**: indigo button with subtle outer ring in pale lavender
- **navigation.link.default**: small dark text on light background with low emphasis
- **navigation.link.hover**: text darkens and gains stronger contrast without heavy decoration

### Components
- **button**: Rounded pill buttons in dark indigo gradient, medium weight text, compact height, used for hero and pricing CTAs.
- **card**: White rounded cards with soft borders and light shadow; used for feature blocks, UI previews, testimonials, and pricing tiers.
- **input**: Mock form controls use white fields with subtle borders, rounded corners, and small labels; toggles and radio inputs appear in indigo.
- **navigation**: Top navigation bar is minimal and centered within a rounded white header strip, with logo on the left and a pill CTA on the right.

### Layout
top navigation + centered hero + product mockup grid + alternating feature sections + pricing cards + testimonial row

### UI Elements
Named UI regions identified in the reference screenshot (col/row = 3×3 grid):
- **navigation bar** — col 2, row 1, zoom 3×
- **hero headline** — col 1, row 1, zoom 2.4×
- **primary CTA** — col 1, row 1, zoom 4×
- **booking mockup** — col 2, row 2, zoom 2.8×
- **feature cards** — col 3, row 2, zoom 2.6×
- **pricing table** — col 3, row 3, zoom 2.6×

## Style Spec (HTML)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Style Spec — s2-saas.png</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
    --color-primary:    #28207f;
    --color-secondary:  #cfc7f2;
    --color-accent:     #6f65cc;
    --color-background: #f4f1fb;
    --color-surface:    #ffffff;
    --color-text:       #2d2956;
    --color-text-muted: #8c88a8;
    --color-border:     #e8e3f3;
    --color-success:    #78c98b;
    --color-warning:    #f2c46d;
    --color-danger:     #e78b8b;
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
    <img src="/knowledge-refs/s2-saas.png" alt="s2-saas.png">
    <div class="header__body">
      <div class="kicker">saas</div>
      <h1>s2-saas.png</h1>
      <p class="muted">A soft, modern SaaS landing page with a light lavender backdrop, rounded cards, and indigo CTAs. The design feels clean and approachable, using spacious sections, subtle shadows, and product mockups to emphasize usability.</p>
      <div class="tags">
        <span class="tag">minimal</span><span class="tag">soft</span><span class="tag">modern</span><span class="tag">friendly</span><span class="tag">clean</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Palette</h2>
    <div class="palette">
    <div class="swatch">
      <div class="swatch__chip" style="background:#28207f"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Primary</div>
        <div class="swatch__hex">#28207f</div>
        <div class="swatch__name">deep indigo</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#cfc7f2"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Secondary</div>
        <div class="swatch__hex">#cfc7f2</div>
        <div class="swatch__name">soft lavender</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#6f65cc"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Accent</div>
        <div class="swatch__hex">#6f65cc</div>
        <div class="swatch__name">vivid violet</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f4f1fb"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Background</div>
        <div class="swatch__hex">#f4f1fb</div>
        <div class="swatch__name">pale lavender background</div>
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
      <div class="swatch__chip" style="background:#2d2956"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text</div>
        <div class="swatch__hex">#2d2956</div>
        <div class="swatch__name">dark slate indigo</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#8c88a8"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text muted</div>
        <div class="swatch__hex">#8c88a8</div>
        <div class="swatch__name">muted lavender gray</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#e8e3f3"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Border</div>
        <div class="swatch__hex">#e8e3f3</div>
        <div class="swatch__name">soft lilac border</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#78c98b"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Success</div>
        <div class="swatch__hex">#78c98b</div>
        <div class="swatch__name">soft green</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f2c46d"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Warning</div>
        <div class="swatch__hex">#f2c46d</div>
        <div class="swatch__name">warm amber</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#e78b8b"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Danger</div>
        <div class="swatch__hex">#e78b8b</div>
        <div class="swatch__name">soft coral</div>
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

  <div class="section"><h2>Shadows</h2><div class="shadow-card" style="box-shadow:0 2px 8px rgba(40,32,127,0.06)">0 2px 8px rgba(40,32,127,0.06)</div><div class="shadow-card" style="box-shadow:0 12px 30px rgba(40,32,127,0.08)">0 12px 30px rgba(40,32,127,0.08)</div></div>

  <div class="section">
    <h2>Gradients</h2>
    <div class="signal-grid">
      <article class="signal-card">
        <div class="signal-preview" style="background:linear-gradient(180deg, #f7f5fc 0%, #ece6fb 100%);"></div>
        <div class="signal-title">hero-panel-bg</div>
        <div class="signal-meta">linear 180deg · hero product showcase background</div>
        <div class="signal-code">0% #f7f5fc @1  |  100% #ece6fb @1</div>
      </article>
      <article class="signal-card">
        <div class="signal-preview" style="background:linear-gradient(90deg, #3c3298 0%, #28207f 100%);"></div>
        <div class="signal-title">cta-button</div>
        <div class="signal-meta">linear 90deg · primary buttons and highlighted pricing CTA</div>
        <div class="signal-code">0% #3c3298 @1  |  100% #28207f @1</div>
      </article></div>
  </div>

  <div class="section">
    <h2>Surface Effects</h2>
    <div class="signal-grid">
      <article class="signal-card">
        <div class="signal-title">soft card elevation</div>
        <div class="signal-meta">cards use white fills, faint lilac borders, and subtle shadow for a soft floating effect</div>
        <div class="signal-code">background: #ffffff<br/>border: 1px solid #e8e3f3<br/>box-shadow: 0 12px 30px rgba(40,32,127,0.08)</div>
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
        <td>pill-shaped indigo gradient fill with white text and soft shadow</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-hover">hover</span></td>
        <td>slightly brighter indigo fill with stronger shadow and higher contrast</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-focus">focus</span></td>
        <td>indigo button with subtle outer ring in pale lavender</td>
      </tr>
      <tr>
        <td>navigation.link</td>
        <td><span class="state-pill state-default">default</span></td>
        <td>small dark text on light background with low emphasis</td>
      </tr>
      <tr>
        <td>navigation.link</td>
        <td><span class="state-pill state-hover">hover</span></td>
        <td>text darkens and gains stronger contrast without heavy decoration</td>
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
            src="/knowledge-refs/s2-saas.png"
            alt="navigation bar"
            style="--ox:50%;--oy:0%;--zoom:3;"
            draggable="false"
          />
        </div>
        <figcaption>navigation bar</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/s2-saas.png"
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
            src="/knowledge-refs/s2-saas.png"
            alt="primary CTA"
            style="--ox:0%;--oy:0%;--zoom:4;"
            draggable="false"
          />
        </div>
        <figcaption>primary CTA</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/s2-saas.png"
            alt="booking mockup"
            style="--ox:50%;--oy:50%;--zoom:2.8;"
            draggable="false"
          />
        </div>
        <figcaption>booking mockup</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/s2-saas.png"
            alt="feature cards"
            style="--ox:100%;--oy:50%;--zoom:2.6;"
            draggable="false"
          />
        </div>
        <figcaption>feature cards</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/s2-saas.png"
            alt="pricing table"
            style="--ox:100%;--oy:100%;--zoom:2.6;"
            draggable="false"
          />
        </div>
        <figcaption>pricing table</figcaption>
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
        <div class="component__desc">Rounded pill buttons in dark indigo gradient, medium weight text, compact height, used for hero and pricing CTAs.</div>
      </div>
      <div class="component">
        <div class="component__name">card</div>
        <div class="component__desc">White rounded cards with soft borders and light shadow; used for feature blocks, UI previews, testimonials, and pricing tiers.</div>
      </div>
      <div class="component">
        <div class="component__name">input</div>
        <div class="component__desc">Mock form controls use white fields with subtle borders, rounded corners, and small labels; toggles and radio inputs appear in indigo.</div>
      </div>
      <div class="component">
        <div class="component__name">navigation</div>
        <div class="component__desc">Top navigation bar is minimal and centered within a rounded white header strip, with logo on the left and a pill CTA on the right.</div>
      </div></div>

  <div class="section"><h2>Layout pattern</h2><p>top navigation + centered hero + product mockup grid + alternating feature sections + pricing cards + testimonial row</p></div>
</body>
</html>
```

