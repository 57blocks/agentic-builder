---
{"id":"DK-img-s5-saas","layer":"L1","kind":"design-knowledge","title":"Style Spec — s5-saas.png","tags":["industry:saas","source:vision-distill","image:s5-saas.png","manual:approved"],"source":"distill","refs":{},"createdAt":1778922907619,"updatedAt":1779236542940,"schemaVersion":1}
---

<!-- style-spec:json
{
  "industry": "saas",
  "summary": "A bright, airy SaaS landing page with a soft neutral foundation, orange brand accents, and lightweight dashboard illustrations. The design feels conversion-focused and approachable, combining clean typography with rounded cards and subtle shadows.",
  "vibe": [
    "minimal",
    "clean",
    "modern",
    "friendly",
    "lightweight"
  ],
  "palette": {
    "primary": {
      "hex": "#f58b4b",
      "label": "warm orange"
    },
    "secondary": {
      "hex": "#f2c46f",
      "label": "soft gold"
    },
    "accent": {
      "hex": "#7b776f",
      "label": "muted taupe gray"
    },
    "background": {
      "hex": "#f7f6f5",
      "label": "warm off-white"
    },
    "surface": {
      "hex": "#ffffff",
      "label": "white card"
    },
    "text": {
      "hex": "#121212",
      "label": "near-black"
    },
    "textMuted": {
      "hex": "#8d8b87",
      "label": "soft gray"
    },
    "border": {
      "hex": "#ece8e4",
      "label": "light warm border"
    },
    "success": {
      "hex": "#8cc88d",
      "label": "soft green"
    },
    "warning": {
      "hex": "#f2c46f",
      "label": "amber gold"
    },
    "danger": {
      "hex": "#de8b79",
      "label": "muted coral"
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
      "small muted supporting copy",
      "clean sans-serif throughout"
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
    "mdPx": 10,
    "lgPx": 16,
    "pillPx": 999
  },
  "shadows": [
    "0 1px 2px rgba(18,18,18,0.04)",
    "0 8px 24px rgba(18,18,18,0.06)"
  ],
  "gradients": [
    {
      "id": "cta-fill",
      "type": "linear",
      "angleDeg": 180,
      "stops": [
        {
          "color": "#f9a266",
          "positionPct": 0,
          "opacity": 1
        },
        {
          "color": "#f58b4b",
          "positionPct": 100,
          "opacity": 1
        }
      ],
      "usage": "primary buttons and orange emphasis areas"
    }
  ],
  "surfaceEffects": [
    {
      "name": "soft-card-elevation",
      "description": "cards use solid white fills, subtle warm borders, and faint shadow to separate from the off-white background",
      "cssHints": [
        "background: #ffffff",
        "border: 1px solid #ece8e4",
        "box-shadow: 0 8px 24px rgba(18,18,18,0.06)"
      ]
    }
  ],
  "stateTokens": [
    {
      "component": "button.primary",
      "state": "default",
      "treatment": "solid orange fill with white text, rounded pill corners, minimal shadow"
    },
    {
      "component": "button.primary",
      "state": "hover",
      "treatment": "slightly deeper orange fill with stronger elevation"
    },
    {
      "component": "button.primary",
      "state": "focus",
      "treatment": "soft orange outer ring around pill button"
    },
    {
      "component": "navigation.link",
      "state": "default",
      "treatment": "small dark text on transparent background"
    },
    {
      "component": "navigation.link",
      "state": "hover",
      "treatment": "text darkens and may gain subtle underline or opacity increase"
    }
  ],
  "components": {
    "button": {
      "description": "Rounded pill buttons; primary uses orange fill with white text, secondary is white or transparent with dark text and subtle border/shadow."
    },
    "card": {
      "description": "White dashboard and feature cards with light warm borders, medium corner radius, faint shadows, and sparse content layout."
    },
    "table": {
      "description": "Dashboard-style data panels with thin dividers, compact labels, muted metadata, and tiny chart areas."
    },
    "navigation": {
      "description": "Top horizontal navigation with left logo, centered links, and compact sign-in/sign-up actions on the right."
    }
  },
  "layout": "top navigation + centered hero copy + dual CTA row + large dashboard preview + right-side feature card mosaic + logo strip + lower three-step section",
  "visualElements": [
    {
      "name": "top navigation",
      "col": 1,
      "row": 1,
      "zoom": 3
    },
    {
      "name": "hero headline",
      "col": 2,
      "row": 1,
      "zoom": 2.4
    },
    {
      "name": "primary CTA",
      "col": 2,
      "row": 2,
      "zoom": 4
    },
    {
      "name": "dashboard preview",
      "col": 2,
      "row": 2,
      "zoom": 1.9
    },
    {
      "name": "feature cards",
      "col": 3,
      "row": 1,
      "zoom": 2.3
    },
    {
      "name": "logo strip",
      "col": 2,
      "row": 3,
      "zoom": 2.6
    }
  ],
  "imagePath": "/knowledge-refs/s5-saas.png",
  "imageName": "s5-saas.png",
  "capturedAt": "2026-05-20T00:22:22.940Z",
  "model": "openai/gpt-5.4-20260305"
}
-->

# Style Spec — s5-saas.png

## Style Spec (Markdown)

**Industry**: saas
**Image**: s5-saas.png
**Vibe**: minimal, clean, modern, friendly, lightweight

**Summary**: A bright, airy SaaS landing page with a soft neutral foundation, orange brand accents, and lightweight dashboard illustrations. The design feels conversion-focused and approachable, combining clean typography with rounded cards and subtle shadows.

### Palette
- Primary: `#f58b4b` — warm orange
- Secondary: `#f2c46f` — soft gold
- Accent: `#7b776f` — muted taupe gray
- Background: `#f7f6f5` — warm off-white
- Surface: `#ffffff` — white card
- Text: `#121212` — near-black
- Text muted: `#8d8b87` — soft gray
- Border: `#ece8e4` — light warm border
- Success: `#8cc88d` — soft green
- Warning: `#f2c46f` — amber gold
- Danger: `#de8b79` — muted coral

### Typography
- Heading font: Inter (weight 700)
- Body font: Inter (weight 400)
- Base size: 16px
- Note: large centered hero heading
- Note: small muted supporting copy
- Note: clean sans-serif throughout

### Spacing & Radius
- Spacing base: 8px; scale: 4, 8, 12, 16, 24, 32, 48, 64
- Radius: sm 6px, md 10px, lg 16px, pill 999px
- Shadows: 2 variant(s)
  - `0 1px 2px rgba(18,18,18,0.04)`
  - `0 8px 24px rgba(18,18,18,0.06)`

### Gradients
- **cta-fill** (linear, 180deg) — primary buttons and orange emphasis areas
  - stop 0%: `#f9a266`, alpha 1
  - stop 100%: `#f58b4b`, alpha 1

### Surface Effects
- **soft-card-elevation**: cards use solid white fills, subtle warm borders, and faint shadow to separate from the off-white background
  - `background: #ffffff`
  - `border: 1px solid #ece8e4`
  - `box-shadow: 0 8px 24px rgba(18,18,18,0.06)`

### Interaction State Tokens
- **button.primary.default**: solid orange fill with white text, rounded pill corners, minimal shadow
- **button.primary.hover**: slightly deeper orange fill with stronger elevation
- **button.primary.focus**: soft orange outer ring around pill button
- **navigation.link.default**: small dark text on transparent background
- **navigation.link.hover**: text darkens and may gain subtle underline or opacity increase

### Components
- **button**: Rounded pill buttons; primary uses orange fill with white text, secondary is white or transparent with dark text and subtle border/shadow.
- **card**: White dashboard and feature cards with light warm borders, medium corner radius, faint shadows, and sparse content layout.
- **table**: Dashboard-style data panels with thin dividers, compact labels, muted metadata, and tiny chart areas.
- **navigation**: Top horizontal navigation with left logo, centered links, and compact sign-in/sign-up actions on the right.

### Layout
top navigation + centered hero copy + dual CTA row + large dashboard preview + right-side feature card mosaic + logo strip + lower three-step section

### UI Elements
Named UI regions identified in the reference screenshot (col/row = 3×3 grid):
- **top navigation** — col 1, row 1, zoom 3×
- **hero headline** — col 2, row 1, zoom 2.4×
- **primary CTA** — col 2, row 2, zoom 4×
- **dashboard preview** — col 2, row 2, zoom 1.9×
- **feature cards** — col 3, row 1, zoom 2.3×
- **logo strip** — col 2, row 3, zoom 2.6×

## Style Spec (HTML)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Style Spec — s5-saas.png</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
    --color-primary:    #f58b4b;
    --color-secondary:  #f2c46f;
    --color-accent:     #7b776f;
    --color-background: #f7f6f5;
    --color-surface:    #ffffff;
    --color-text:       #121212;
    --color-text-muted: #8d8b87;
    --color-border:     #ece8e4;
    --color-success:    #8cc88d;
    --color-warning:    #f2c46f;
    --color-danger:     #de8b79;
    --font-heading: 'Inter', system-ui, sans-serif;
    --font-body:    'Inter', system-ui, sans-serif;
    --font-mono:    'JetBrains Mono', ui-monospace, monospace;
    --weight-heading: 700;
    --weight-body:    400;
    --size-base:      16px;
    --radius-sm: 6px;
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
    <img src="/knowledge-refs/s5-saas.png" alt="s5-saas.png">
    <div class="header__body">
      <div class="kicker">saas</div>
      <h1>s5-saas.png</h1>
      <p class="muted">A bright, airy SaaS landing page with a soft neutral foundation, orange brand accents, and lightweight dashboard illustrations. The design feels conversion-focused and approachable, combining clean typography with rounded cards and subtle shadows.</p>
      <div class="tags">
        <span class="tag">minimal</span><span class="tag">clean</span><span class="tag">modern</span><span class="tag">friendly</span><span class="tag">lightweight</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Palette</h2>
    <div class="palette">
    <div class="swatch">
      <div class="swatch__chip" style="background:#f58b4b"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Primary</div>
        <div class="swatch__hex">#f58b4b</div>
        <div class="swatch__name">warm orange</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f2c46f"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Secondary</div>
        <div class="swatch__hex">#f2c46f</div>
        <div class="swatch__name">soft gold</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#7b776f"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Accent</div>
        <div class="swatch__hex">#7b776f</div>
        <div class="swatch__name">muted taupe gray</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f7f6f5"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Background</div>
        <div class="swatch__hex">#f7f6f5</div>
        <div class="swatch__name">warm off-white</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#ffffff"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Surface</div>
        <div class="swatch__hex">#ffffff</div>
        <div class="swatch__name">white card</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#121212"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text</div>
        <div class="swatch__hex">#121212</div>
        <div class="swatch__name">near-black</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#8d8b87"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text muted</div>
        <div class="swatch__hex">#8d8b87</div>
        <div class="swatch__name">soft gray</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#ece8e4"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Border</div>
        <div class="swatch__hex">#ece8e4</div>
        <div class="swatch__name">light warm border</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#8cc88d"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Success</div>
        <div class="swatch__hex">#8cc88d</div>
        <div class="swatch__name">soft green</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f2c46f"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Warning</div>
        <div class="swatch__hex">#f2c46f</div>
        <div class="swatch__name">amber gold</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#de8b79"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Danger</div>
        <div class="swatch__hex">#de8b79</div>
        <div class="swatch__name">muted coral</div>
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

  <div class="section"><h2>Shadows</h2><div class="shadow-card" style="box-shadow:0 1px 2px rgba(18,18,18,0.04)">0 1px 2px rgba(18,18,18,0.04)</div><div class="shadow-card" style="box-shadow:0 8px 24px rgba(18,18,18,0.06)">0 8px 24px rgba(18,18,18,0.06)</div></div>

  <div class="section">
    <h2>Gradients</h2>
    <div class="signal-grid">
      <article class="signal-card">
        <div class="signal-preview" style="background:linear-gradient(180deg, #f9a266 0%, #f58b4b 100%);"></div>
        <div class="signal-title">cta-fill</div>
        <div class="signal-meta">linear 180deg · primary buttons and orange emphasis areas</div>
        <div class="signal-code">0% #f9a266 @1  |  100% #f58b4b @1</div>
      </article></div>
  </div>

  <div class="section">
    <h2>Surface Effects</h2>
    <div class="signal-grid">
      <article class="signal-card">
        <div class="signal-title">soft-card-elevation</div>
        <div class="signal-meta">cards use solid white fills, subtle warm borders, and faint shadow to separate from the off-white background</div>
        <div class="signal-code">background: #ffffff<br/>border: 1px solid #ece8e4<br/>box-shadow: 0 8px 24px rgba(18,18,18,0.06)</div>
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
        <td>solid orange fill with white text, rounded pill corners, minimal shadow</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-hover">hover</span></td>
        <td>slightly deeper orange fill with stronger elevation</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-focus">focus</span></td>
        <td>soft orange outer ring around pill button</td>
      </tr>
      <tr>
        <td>navigation.link</td>
        <td><span class="state-pill state-default">default</span></td>
        <td>small dark text on transparent background</td>
      </tr>
      <tr>
        <td>navigation.link</td>
        <td><span class="state-pill state-hover">hover</span></td>
        <td>text darkens and may gain subtle underline or opacity increase</td>
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
            src="/knowledge-refs/s5-saas.png"
            alt="top navigation"
            style="--ox:0%;--oy:0%;--zoom:3;"
            draggable="false"
          />
        </div>
        <figcaption>top navigation</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/s5-saas.png"
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
            src="/knowledge-refs/s5-saas.png"
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
            src="/knowledge-refs/s5-saas.png"
            alt="dashboard preview"
            style="--ox:50%;--oy:50%;--zoom:1.9;"
            draggable="false"
          />
        </div>
        <figcaption>dashboard preview</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/s5-saas.png"
            alt="feature cards"
            style="--ox:100%;--oy:0%;--zoom:2.3;"
            draggable="false"
          />
        </div>
        <figcaption>feature cards</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/s5-saas.png"
            alt="logo strip"
            style="--ox:50%;--oy:100%;--zoom:2.6;"
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
        <div class="component__desc">Rounded pill buttons; primary uses orange fill with white text, secondary is white or transparent with dark text and subtle border/shadow.</div>
      </div>
      <div class="component">
        <div class="component__name">card</div>
        <div class="component__desc">White dashboard and feature cards with light warm borders, medium corner radius, faint shadows, and sparse content layout.</div>
      </div>
      <div class="component">
        <div class="component__name">table</div>
        <div class="component__desc">Dashboard-style data panels with thin dividers, compact labels, muted metadata, and tiny chart areas.</div>
      </div>
      <div class="component">
        <div class="component__name">navigation</div>
        <div class="component__desc">Top horizontal navigation with left logo, centered links, and compact sign-in/sign-up actions on the right.</div>
      </div></div>

  <div class="section"><h2>Layout pattern</h2><p>top navigation + centered hero copy + dual CTA row + large dashboard preview + right-side feature card mosaic + logo strip + lower three-step section</p></div>
</body>
</html>
```

