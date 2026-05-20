---
{"id":"DK-img-auto-saas-2026-05-16-5-notion","layer":"L1","kind":"design-knowledge","title":"Style Spec — auto-saas-2026-05-16-5-notion.png","tags":["industry:generic","source:vision-distill","image:auto-saas-2026-05-16-5-notion.png","manual:approved"],"source":"distill","refs":{},"createdAt":1778924987346,"updatedAt":1779236327448,"schemaVersion":1}
---

<!-- style-spec:json
{
  "industry": "generic",
  "summary": "A polished SaaS-style landing page with a dark midnight-blue hero, bright blue call-to-action buttons, and a large product UI mockup framed by playful illustrated accents. The aesthetic balances enterprise credibility with friendly, approachable visuals through soft glows, rounded shapes, and spacious typography.",
  "vibe": [
    "dark",
    "clean",
    "playful",
    "modern",
    "enterprise"
  ],
  "palette": {
    "primary": {
      "hex": "#4f6cf0",
      "label": "cta blue"
    },
    "secondary": {
      "hex": "#04105d",
      "label": "deep navy"
    },
    "accent": {
      "hex": "#f6c64e",
      "label": "warm yellow accent"
    },
    "background": {
      "hex": "#020b57",
      "label": "midnight blue background"
    },
    "surface": {
      "hex": "#f5f5f4",
      "label": "light app canvas"
    },
    "text": {
      "hex": "#ffffff",
      "label": "primary white text"
    },
    "textMuted": {
      "hex": "#b9bfd6",
      "label": "muted hero text"
    },
    "border": {
      "hex": "#d9d9d6",
      "label": "light gray border"
    },
    "success": {
      "hex": "#73be7d",
      "label": "soft green status"
    },
    "warning": {
      "hex": "#f2c24d",
      "label": "soft amber status"
    },
    "danger": {
      "hex": "#ef6b63",
      "label": "soft coral alert"
    }
  },
  "typography": {
    "headingFont": "Inter",
    "bodyFont": "Inter",
    "headingWeight": 700,
    "bodyWeight": 400,
    "baseSizePx": 16,
    "notes": [
      "oversized bold hero headline",
      "clean geometric sans body text",
      "small uppercase-like nav labels"
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
    "mdPx": 8,
    "lgPx": 16,
    "pillPx": 999
  },
  "shadows": [
    "0 1px 2px rgba(0,0,0,0.06)",
    "0 12px 32px rgba(0,0,0,0.28)",
    "0 0 48px rgba(255,255,255,0.12)"
  ],
  "gradients": [
    {
      "id": "hero-spotlight",
      "type": "radial",
      "angleDeg": 0,
      "stops": [
        {
          "color": "#ffffff",
          "positionPct": 0,
          "opacity": 0.18
        },
        {
          "color": "#5a67c9",
          "positionPct": 45,
          "opacity": 0.1
        },
        {
          "color": "#020b57",
          "positionPct": 100,
          "opacity": 1
        }
      ],
      "usage": "soft central glow behind hero headline"
    },
    {
      "id": "button-blue",
      "type": "linear",
      "angleDeg": 180,
      "stops": [
        {
          "color": "#5f7cff",
          "positionPct": 0,
          "opacity": 1
        },
        {
          "color": "#4f6cf0",
          "positionPct": 100,
          "opacity": 1
        }
      ],
      "usage": "primary and secondary CTA buttons"
    }
  ],
  "surfaceEffects": [
    {
      "name": "hero glow",
      "description": "hero area uses a diffused spotlight glow behind the main heading and buttons",
      "cssHints": [
        "background: radial-gradient(circle at center, rgba(255,255,255,0.18) 0%, rgba(90,103,201,0.10) 45%, rgba(2,11,87,1) 100%)"
      ]
    },
    {
      "name": "elevated mockup",
      "description": "large product screenshot card floats above the dark background with soft shadow and rounded corners",
      "cssHints": [
        "border-radius: 10px",
        "box-shadow: 0 12px 32px rgba(0,0,0,0.28)",
        "overflow: hidden"
      ]
    }
  ],
  "stateTokens": [
    {
      "component": "button.primary",
      "state": "default",
      "treatment": "solid bright blue fill with white text and medium rounded corners"
    },
    {
      "component": "button.primary",
      "state": "hover",
      "treatment": "slightly brighter blue fill with stronger lift and subtle glow"
    },
    {
      "component": "button.primary",
      "state": "focus",
      "treatment": "2px soft blue outer ring around button"
    },
    {
      "component": "navigation.item",
      "state": "default",
      "treatment": "plain white text on transparent dark background"
    },
    {
      "component": "navigation.item",
      "state": "hover",
      "treatment": "slightly brighter text with subtle underline or opacity increase"
    }
  ],
  "components": {
    "button": {
      "description": "Rounded medium-sized CTA buttons with solid blue fill, white centered label text, and minimal border treatment."
    },
    "card": {
      "description": "Large browser-like product preview card with light neutral background, subtle border, rounded corners, and strong drop shadow."
    },
    "navigation": {
      "description": "Top horizontal navigation with compact white text links, simple spacing, and right-aligned primary CTA plus login link."
    }
  },
  "layout": "top announcement bar + centered top navigation + large hero headline and CTA row + floating sign-in panel on the right + oversized product mockup centered below + logo strip footer",
  "visualElements": [
    {
      "name": "announcement bar",
      "col": 2,
      "row": 1,
      "zoom": 3.2
    },
    {
      "name": "hero headline",
      "col": 2,
      "row": 1,
      "zoom": 2.2
    },
    {
      "name": "primary CTA",
      "col": 2,
      "row": 2,
      "zoom": 4
    },
    {
      "name": "sign-in panel",
      "col": 3,
      "row": 1,
      "zoom": 3
    },
    {
      "name": "product mockup",
      "col": 2,
      "row": 2,
      "zoom": 1.8
    },
    {
      "name": "brand logos",
      "col": 2,
      "row": 3,
      "zoom": 2.8
    }
  ],
  "imagePath": "/knowledge-refs/auto-saas-2026-05-16-5-notion.png",
  "imageName": "auto-saas-2026-05-16-5-notion.png",
  "capturedAt": "2026-05-20T00:18:47.447Z",
  "model": "openai/gpt-5.4-20260305"
}
-->

# Style Spec — auto-saas-2026-05-16-5-notion.png

## Style Spec (Markdown)

**Industry**: generic
**Image**: auto-saas-2026-05-16-5-notion.png
**Vibe**: dark, clean, playful, modern, enterprise

**Summary**: A polished SaaS-style landing page with a dark midnight-blue hero, bright blue call-to-action buttons, and a large product UI mockup framed by playful illustrated accents. The aesthetic balances enterprise credibility with friendly, approachable visuals through soft glows, rounded shapes, and spacious typography.

### Palette
- Primary: `#4f6cf0` — cta blue
- Secondary: `#04105d` — deep navy
- Accent: `#f6c64e` — warm yellow accent
- Background: `#020b57` — midnight blue background
- Surface: `#f5f5f4` — light app canvas
- Text: `#ffffff` — primary white text
- Text muted: `#b9bfd6` — muted hero text
- Border: `#d9d9d6` — light gray border
- Success: `#73be7d` — soft green status
- Warning: `#f2c24d` — soft amber status
- Danger: `#ef6b63` — soft coral alert

### Typography
- Heading font: Inter (weight 700)
- Body font: Inter (weight 400)
- Base size: 16px
- Note: oversized bold hero headline
- Note: clean geometric sans body text
- Note: small uppercase-like nav labels

### Spacing & Radius
- Spacing base: 8px; scale: 4, 8, 12, 16, 24, 32, 48, 64
- Radius: sm 4px, md 8px, lg 16px, pill 999px
- Shadows: 3 variant(s)
  - `0 1px 2px rgba(0,0,0,0.06)`
  - `0 12px 32px rgba(0,0,0,0.28)`
  - `0 0 48px rgba(255,255,255,0.12)`

### Gradients
- **hero-spotlight** (radial) — soft central glow behind hero headline
  - stop 0%: `#ffffff`, alpha 0.18
  - stop 45%: `#5a67c9`, alpha 0.1
  - stop 100%: `#020b57`, alpha 1
- **button-blue** (linear, 180deg) — primary and secondary CTA buttons
  - stop 0%: `#5f7cff`, alpha 1
  - stop 100%: `#4f6cf0`, alpha 1

### Surface Effects
- **hero glow**: hero area uses a diffused spotlight glow behind the main heading and buttons
  - `background: radial-gradient(circle at center, rgba(255,255,255,0.18) 0%, rgba(90,103,201,0.10) 45%, rgba(2,11,87,1) 100%)`
- **elevated mockup**: large product screenshot card floats above the dark background with soft shadow and rounded corners
  - `border-radius: 10px`
  - `box-shadow: 0 12px 32px rgba(0,0,0,0.28)`
  - `overflow: hidden`

### Interaction State Tokens
- **button.primary.default**: solid bright blue fill with white text and medium rounded corners
- **button.primary.hover**: slightly brighter blue fill with stronger lift and subtle glow
- **button.primary.focus**: 2px soft blue outer ring around button
- **navigation.item.default**: plain white text on transparent dark background
- **navigation.item.hover**: slightly brighter text with subtle underline or opacity increase

### Components
- **button**: Rounded medium-sized CTA buttons with solid blue fill, white centered label text, and minimal border treatment.
- **card**: Large browser-like product preview card with light neutral background, subtle border, rounded corners, and strong drop shadow.
- **navigation**: Top horizontal navigation with compact white text links, simple spacing, and right-aligned primary CTA plus login link.

### Layout
top announcement bar + centered top navigation + large hero headline and CTA row + floating sign-in panel on the right + oversized product mockup centered below + logo strip footer

### UI Elements
Named UI regions identified in the reference screenshot (col/row = 3×3 grid):
- **announcement bar** — col 2, row 1, zoom 3.2×
- **hero headline** — col 2, row 1, zoom 2.2×
- **primary CTA** — col 2, row 2, zoom 4×
- **sign-in panel** — col 3, row 1, zoom 3×
- **product mockup** — col 2, row 2, zoom 1.8×
- **brand logos** — col 2, row 3, zoom 2.8×

## Style Spec (HTML)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Style Spec — auto-saas-2026-05-16-5-notion.png</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
    --color-primary:    #4f6cf0;
    --color-secondary:  #04105d;
    --color-accent:     #f6c64e;
    --color-background: #020b57;
    --color-surface:    #f5f5f4;
    --color-text:       #ffffff;
    --color-text-muted: #b9bfd6;
    --color-border:     #d9d9d6;
    --color-success:    #73be7d;
    --color-warning:    #f2c24d;
    --color-danger:     #ef6b63;
    --font-heading: 'Inter', system-ui, sans-serif;
    --font-body:    'Inter', system-ui, sans-serif;
    --font-mono:    'JetBrains Mono', ui-monospace, monospace;
    --weight-heading: 700;
    --weight-body:    400;
    --size-base:      16px;
    --radius-sm: 4px;
    --radius-md: 8px;
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
    <img src="/knowledge-refs/auto-saas-2026-05-16-5-notion.png" alt="auto-saas-2026-05-16-5-notion.png">
    <div class="header__body">
      <div class="kicker">generic</div>
      <h1>auto-saas-2026-05-16-5-notion.png</h1>
      <p class="muted">A polished SaaS-style landing page with a dark midnight-blue hero, bright blue call-to-action buttons, and a large product UI mockup framed by playful illustrated accents. The aesthetic balances enterprise credibility with friendly, approachable visuals through soft glows, rounded shapes, and spacious typography.</p>
      <div class="tags">
        <span class="tag">dark</span><span class="tag">clean</span><span class="tag">playful</span><span class="tag">modern</span><span class="tag">enterprise</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Palette</h2>
    <div class="palette">
    <div class="swatch">
      <div class="swatch__chip" style="background:#4f6cf0"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Primary</div>
        <div class="swatch__hex">#4f6cf0</div>
        <div class="swatch__name">cta blue</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#04105d"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Secondary</div>
        <div class="swatch__hex">#04105d</div>
        <div class="swatch__name">deep navy</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f6c64e"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Accent</div>
        <div class="swatch__hex">#f6c64e</div>
        <div class="swatch__name">warm yellow accent</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#020b57"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Background</div>
        <div class="swatch__hex">#020b57</div>
        <div class="swatch__name">midnight blue background</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f5f5f4"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Surface</div>
        <div class="swatch__hex">#f5f5f4</div>
        <div class="swatch__name">light app canvas</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#ffffff"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text</div>
        <div class="swatch__hex">#ffffff</div>
        <div class="swatch__name">primary white text</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#b9bfd6"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text muted</div>
        <div class="swatch__hex">#b9bfd6</div>
        <div class="swatch__name">muted hero text</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#d9d9d6"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Border</div>
        <div class="swatch__hex">#d9d9d6</div>
        <div class="swatch__name">light gray border</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#73be7d"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Success</div>
        <div class="swatch__hex">#73be7d</div>
        <div class="swatch__name">soft green status</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f2c24d"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Warning</div>
        <div class="swatch__hex">#f2c24d</div>
        <div class="swatch__name">soft amber status</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#ef6b63"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Danger</div>
        <div class="swatch__hex">#ef6b63</div>
        <div class="swatch__name">soft coral alert</div>
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

  <div class="section"><h2>Shadows</h2><div class="shadow-card" style="box-shadow:0 1px 2px rgba(0,0,0,0.06)">0 1px 2px rgba(0,0,0,0.06)</div><div class="shadow-card" style="box-shadow:0 12px 32px rgba(0,0,0,0.28)">0 12px 32px rgba(0,0,0,0.28)</div><div class="shadow-card" style="box-shadow:0 0 48px rgba(255,255,255,0.12)">0 0 48px rgba(255,255,255,0.12)</div></div>

  <div class="section">
    <h2>Gradients</h2>
    <div class="signal-grid">
      <article class="signal-card">
        <div class="signal-preview" style="background:radial-gradient(circle at center, rgba(255, 255, 255, 0.18) 0%, rgba(90, 103, 201, 0.1) 45%, #020b57 100%);"></div>
        <div class="signal-title">hero-spotlight</div>
        <div class="signal-meta">radial · soft central glow behind hero headline</div>
        <div class="signal-code">0% #ffffff @0.18  |  45% #5a67c9 @0.1  |  100% #020b57 @1</div>
      </article>
      <article class="signal-card">
        <div class="signal-preview" style="background:linear-gradient(180deg, #5f7cff 0%, #4f6cf0 100%);"></div>
        <div class="signal-title">button-blue</div>
        <div class="signal-meta">linear 180deg · primary and secondary CTA buttons</div>
        <div class="signal-code">0% #5f7cff @1  |  100% #4f6cf0 @1</div>
      </article></div>
  </div>

  <div class="section">
    <h2>Surface Effects</h2>
    <div class="signal-grid">
      <article class="signal-card">
        <div class="signal-title">hero glow</div>
        <div class="signal-meta">hero area uses a diffused spotlight glow behind the main heading and buttons</div>
        <div class="signal-code">background: radial-gradient(circle at center, rgba(255,255,255,0.18) 0%, rgba(90,103,201,0.10) 45%, rgba(2,11,87,1) 100%)</div>
      </article>
      <article class="signal-card">
        <div class="signal-title">elevated mockup</div>
        <div class="signal-meta">large product screenshot card floats above the dark background with soft shadow and rounded corners</div>
        <div class="signal-code">border-radius: 10px<br/>box-shadow: 0 12px 32px rgba(0,0,0,0.28)<br/>overflow: hidden</div>
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
        <td>solid bright blue fill with white text and medium rounded corners</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-hover">hover</span></td>
        <td>slightly brighter blue fill with stronger lift and subtle glow</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-focus">focus</span></td>
        <td>2px soft blue outer ring around button</td>
      </tr>
      <tr>
        <td>navigation.item</td>
        <td><span class="state-pill state-default">default</span></td>
        <td>plain white text on transparent dark background</td>
      </tr>
      <tr>
        <td>navigation.item</td>
        <td><span class="state-pill state-hover">hover</span></td>
        <td>slightly brighter text with subtle underline or opacity increase</td>
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
            src="/knowledge-refs/auto-saas-2026-05-16-5-notion.png"
            alt="announcement bar"
            style="--ox:50%;--oy:0%;--zoom:3.2;"
            draggable="false"
          />
        </div>
        <figcaption>announcement bar</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/auto-saas-2026-05-16-5-notion.png"
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
            src="/knowledge-refs/auto-saas-2026-05-16-5-notion.png"
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
            src="/knowledge-refs/auto-saas-2026-05-16-5-notion.png"
            alt="sign-in panel"
            style="--ox:100%;--oy:0%;--zoom:3;"
            draggable="false"
          />
        </div>
        <figcaption>sign-in panel</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/auto-saas-2026-05-16-5-notion.png"
            alt="product mockup"
            style="--ox:50%;--oy:50%;--zoom:1.8;"
            draggable="false"
          />
        </div>
        <figcaption>product mockup</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/auto-saas-2026-05-16-5-notion.png"
            alt="brand logos"
            style="--ox:50%;--oy:100%;--zoom:2.8;"
            draggable="false"
          />
        </div>
        <figcaption>brand logos</figcaption>
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
        <div class="component__desc">Rounded medium-sized CTA buttons with solid blue fill, white centered label text, and minimal border treatment.</div>
      </div>
      <div class="component">
        <div class="component__name">card</div>
        <div class="component__desc">Large browser-like product preview card with light neutral background, subtle border, rounded corners, and strong drop shadow.</div>
      </div>
      <div class="component">
        <div class="component__name">navigation</div>
        <div class="component__desc">Top horizontal navigation with compact white text links, simple spacing, and right-aligned primary CTA plus login link.</div>
      </div></div>

  <div class="section"><h2>Layout pattern</h2><p>top announcement bar + centered top navigation + large hero headline and CTA row + floating sign-in panel on the right + oversized product mockup centered below + logo strip footer</p></div>
</body>
</html>
```

