---
{"id":"DK-img-auto-saas-2026-05-16-4-scribe","layer":"L1","kind":"design-knowledge","title":"Style Spec — auto-saas-2026-05-16-4-scribe.png","tags":["industry:saas","source:vision-distill","image:auto-saas-2026-05-16-4-scribe.png","manual:approved"],"source":"distill","refs":{},"createdAt":1778924950012,"updatedAt":1779236307810,"schemaVersion":1}
---

<!-- style-spec:json
{
  "industry": "saas",
  "summary": "A polished SaaS landing hero with a vibrant blue-to-magenta gradient background, oversized centered headline, and soft elevated UI cards. The design mixes friendly enterprise trust cues with subtle glow, rounded geometry, and clean modern typography.",
  "vibe": [
    "modern",
    "bright",
    "friendly",
    "polished",
    "gradient-rich"
  ],
  "palette": {
    "primary": {
      "hex": "#3a41e0",
      "label": "brand blue"
    },
    "secondary": {
      "hex": "#8d43bf",
      "label": "violet"
    },
    "accent": {
      "hex": "#d89b4b",
      "label": "warm amber"
    },
    "background": {
      "hex": "#364bcf",
      "label": "gradient blue base"
    },
    "surface": {
      "hex": "#ebebf0",
      "label": "light card surface"
    },
    "text": {
      "hex": "#f3f2f2",
      "label": "soft white"
    },
    "textMuted": {
      "hex": "#d4d1e7",
      "label": "muted lavender white"
    },
    "border": {
      "hex": "#9b91d9",
      "label": "soft lilac border"
    }
  },
  "typography": {
    "headingFont": "Inter",
    "bodyFont": "Inter",
    "headingWeight": 700,
    "bodyWeight": 400,
    "baseSizePx": 16,
    "notes": [
      "oversized centered hero headline",
      "clean geometric sans-serif",
      "semi-bold navigation and CTA text"
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
    "lgPx": 18,
    "pillPx": 999
  },
  "shadows": [
    "0 2px 6px rgba(32,24,98,0.18)",
    "0 10px 24px rgba(49,58,188,0.28)"
  ],
  "gradients": [
    {
      "id": "hero-bg",
      "type": "linear",
      "angleDeg": 25,
      "stops": [
        {
          "color": "#2b2fc2",
          "positionPct": 0,
          "opacity": 1
        },
        {
          "color": "#3b63d7",
          "positionPct": 22,
          "opacity": 1
        },
        {
          "color": "#7c35bb",
          "positionPct": 72,
          "opacity": 1
        },
        {
          "color": "#d69b47",
          "positionPct": 100,
          "opacity": 0.95
        }
      ],
      "usage": "main page background"
    },
    {
      "id": "primary-button",
      "type": "linear",
      "angleDeg": 180,
      "stops": [
        {
          "color": "#4a5bf1",
          "positionPct": 0,
          "opacity": 1
        },
        {
          "color": "#3940dc",
          "positionPct": 100,
          "opacity": 1
        }
      ],
      "usage": "primary CTA fill"
    }
  ],
  "surfaceEffects": [
    {
      "name": "soft glow",
      "description": "CTA buttons and hero elements use a subtle luminous edge and shadow over the gradient backdrop",
      "cssHints": [
        "box-shadow: 0 10px 24px rgba(49,58,188,0.28)",
        "border: 1px solid rgba(255,255,255,0.18)"
      ]
    },
    {
      "name": "frosted panel",
      "description": "the segmented option tray appears as a translucent lilac panel behind solid cards",
      "cssHints": [
        "background: rgba(219,214,245,0.22)",
        "border: 1px solid rgba(255,255,255,0.18)",
        "backdrop-filter: blur(6px)"
      ]
    }
  ],
  "stateTokens": [
    {
      "component": "button.primary",
      "state": "default",
      "treatment": "solid blue gradient pill with white semi-bold text and soft outer shadow"
    },
    {
      "component": "button.primary",
      "state": "hover",
      "treatment": "slightly brighter blue-violet gradient with stronger glow and lift"
    },
    {
      "component": "button.primary",
      "state": "focus",
      "treatment": "thin light-lilac outer ring around pill boundary"
    },
    {
      "component": "navigation.link",
      "state": "default",
      "treatment": "small white text with reduced opacity over transparent background"
    },
    {
      "component": "navigation.link",
      "state": "hover",
      "treatment": "full-opacity white text with subtle underline or brighter contrast"
    }
  ],
  "components": {
    "button": {
      "description": "Rounded pill buttons with blue gradient fills for primary actions and muted translucent fills for secondary actions; white text, medium shadow, and generous horizontal padding."
    },
    "card": {
      "description": "Small rounded rectangular option cards with very light gray backgrounds, thin cool-gray borders, centered pastel icons, and dark label text, grouped inside a translucent rounded container."
    },
    "navigation": {
      "description": "Minimal top navigation bar with centered text links, subtle dropdown chevrons, left-aligned logo, and right-aligned sign-in and primary CTA buttons."
    }
  },
  "layout": "centered top navigation above a full-width hero with large centered headline, supporting copy, segmented use-case card row, primary CTA, and trust-logo strip at the bottom",
  "visualElements": [
    {
      "name": "logo and nav",
      "col": 1,
      "row": 1,
      "zoom": 2.8
    },
    {
      "name": "hero headline",
      "col": 2,
      "row": 1,
      "zoom": 2.2
    },
    {
      "name": "review badge",
      "col": 2,
      "row": 1,
      "zoom": 4
    },
    {
      "name": "use-case cards",
      "col": 2,
      "row": 2,
      "zoom": 2.4
    },
    {
      "name": "primary cta",
      "col": 2,
      "row": 3,
      "zoom": 4
    },
    {
      "name": "trust logos",
      "col": 3,
      "row": 3,
      "zoom": 2.8
    }
  ],
  "imagePath": "/knowledge-refs/auto-saas-2026-05-16-4-scribe.png",
  "imageName": "auto-saas-2026-05-16-4-scribe.png",
  "capturedAt": "2026-05-20T00:18:27.809Z",
  "model": "openai/gpt-5.4-20260305"
}
-->

# Style Spec — auto-saas-2026-05-16-4-scribe.png

## Style Spec (Markdown)

**Industry**: saas
**Image**: auto-saas-2026-05-16-4-scribe.png
**Vibe**: modern, bright, friendly, polished, gradient-rich

**Summary**: A polished SaaS landing hero with a vibrant blue-to-magenta gradient background, oversized centered headline, and soft elevated UI cards. The design mixes friendly enterprise trust cues with subtle glow, rounded geometry, and clean modern typography.

### Palette
- Primary: `#3a41e0` — brand blue
- Secondary: `#8d43bf` — violet
- Accent: `#d89b4b` — warm amber
- Background: `#364bcf` — gradient blue base
- Surface: `#ebebf0` — light card surface
- Text: `#f3f2f2` — soft white
- Text muted: `#d4d1e7` — muted lavender white
- Border: `#9b91d9` — soft lilac border

### Typography
- Heading font: Inter (weight 700)
- Body font: Inter (weight 400)
- Base size: 16px
- Note: oversized centered hero headline
- Note: clean geometric sans-serif
- Note: semi-bold navigation and CTA text

### Spacing & Radius
- Spacing base: 8px; scale: 4, 8, 12, 16, 24, 32, 48, 64
- Radius: sm 4px, md 10px, lg 18px, pill 999px
- Shadows: 2 variant(s)
  - `0 2px 6px rgba(32,24,98,0.18)`
  - `0 10px 24px rgba(49,58,188,0.28)`

### Gradients
- **hero-bg** (linear, 25deg) — main page background
  - stop 0%: `#2b2fc2`, alpha 1
  - stop 22%: `#3b63d7`, alpha 1
  - stop 72%: `#7c35bb`, alpha 1
  - stop 100%: `#d69b47`, alpha 0.95
- **primary-button** (linear, 180deg) — primary CTA fill
  - stop 0%: `#4a5bf1`, alpha 1
  - stop 100%: `#3940dc`, alpha 1

### Surface Effects
- **soft glow**: CTA buttons and hero elements use a subtle luminous edge and shadow over the gradient backdrop
  - `box-shadow: 0 10px 24px rgba(49,58,188,0.28)`
  - `border: 1px solid rgba(255,255,255,0.18)`
- **frosted panel**: the segmented option tray appears as a translucent lilac panel behind solid cards
  - `background: rgba(219,214,245,0.22)`
  - `border: 1px solid rgba(255,255,255,0.18)`
  - `backdrop-filter: blur(6px)`

### Interaction State Tokens
- **button.primary.default**: solid blue gradient pill with white semi-bold text and soft outer shadow
- **button.primary.hover**: slightly brighter blue-violet gradient with stronger glow and lift
- **button.primary.focus**: thin light-lilac outer ring around pill boundary
- **navigation.link.default**: small white text with reduced opacity over transparent background
- **navigation.link.hover**: full-opacity white text with subtle underline or brighter contrast

### Components
- **button**: Rounded pill buttons with blue gradient fills for primary actions and muted translucent fills for secondary actions; white text, medium shadow, and generous horizontal padding.
- **card**: Small rounded rectangular option cards with very light gray backgrounds, thin cool-gray borders, centered pastel icons, and dark label text, grouped inside a translucent rounded container.
- **navigation**: Minimal top navigation bar with centered text links, subtle dropdown chevrons, left-aligned logo, and right-aligned sign-in and primary CTA buttons.

### Layout
centered top navigation above a full-width hero with large centered headline, supporting copy, segmented use-case card row, primary CTA, and trust-logo strip at the bottom

### UI Elements
Named UI regions identified in the reference screenshot (col/row = 3×3 grid):
- **logo and nav** — col 1, row 1, zoom 2.8×
- **hero headline** — col 2, row 1, zoom 2.2×
- **review badge** — col 2, row 1, zoom 4×
- **use-case cards** — col 2, row 2, zoom 2.4×
- **primary cta** — col 2, row 3, zoom 4×
- **trust logos** — col 3, row 3, zoom 2.8×

## Style Spec (HTML)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Style Spec — auto-saas-2026-05-16-4-scribe.png</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
    --color-primary:    #3a41e0;
    --color-secondary:  #8d43bf;
    --color-accent:     #d89b4b;
    --color-background: #364bcf;
    --color-surface:    #ebebf0;
    --color-text:       #f3f2f2;
    --color-text-muted: #d4d1e7;
    --color-border:     #9b91d9;
    --color-success:    #22c55e;
    --color-warning:    #f59e0b;
    --color-danger:     #ef4444;
    --font-heading: 'Inter', system-ui, sans-serif;
    --font-body:    'Inter', system-ui, sans-serif;
    --font-mono:    'JetBrains Mono', ui-monospace, monospace;
    --weight-heading: 700;
    --weight-body:    400;
    --size-base:      16px;
    --radius-sm: 4px;
    --radius-md: 10px;
    --radius-lg: 18px;
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
    <img src="/knowledge-refs/auto-saas-2026-05-16-4-scribe.png" alt="auto-saas-2026-05-16-4-scribe.png">
    <div class="header__body">
      <div class="kicker">saas</div>
      <h1>auto-saas-2026-05-16-4-scribe.png</h1>
      <p class="muted">A polished SaaS landing hero with a vibrant blue-to-magenta gradient background, oversized centered headline, and soft elevated UI cards. The design mixes friendly enterprise trust cues with subtle glow, rounded geometry, and clean modern typography.</p>
      <div class="tags">
        <span class="tag">modern</span><span class="tag">bright</span><span class="tag">friendly</span><span class="tag">polished</span><span class="tag">gradient-rich</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Palette</h2>
    <div class="palette">
    <div class="swatch">
      <div class="swatch__chip" style="background:#3a41e0"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Primary</div>
        <div class="swatch__hex">#3a41e0</div>
        <div class="swatch__name">brand blue</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#8d43bf"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Secondary</div>
        <div class="swatch__hex">#8d43bf</div>
        <div class="swatch__name">violet</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#d89b4b"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Accent</div>
        <div class="swatch__hex">#d89b4b</div>
        <div class="swatch__name">warm amber</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#364bcf"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Background</div>
        <div class="swatch__hex">#364bcf</div>
        <div class="swatch__name">gradient blue base</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#ebebf0"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Surface</div>
        <div class="swatch__hex">#ebebf0</div>
        <div class="swatch__name">light card surface</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f3f2f2"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text</div>
        <div class="swatch__hex">#f3f2f2</div>
        <div class="swatch__name">soft white</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#d4d1e7"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text muted</div>
        <div class="swatch__hex">#d4d1e7</div>
        <div class="swatch__name">muted lavender white</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#9b91d9"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Border</div>
        <div class="swatch__hex">#9b91d9</div>
        <div class="swatch__name">soft lilac border</div>
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

  <div class="section"><h2>Shadows</h2><div class="shadow-card" style="box-shadow:0 2px 6px rgba(32,24,98,0.18)">0 2px 6px rgba(32,24,98,0.18)</div><div class="shadow-card" style="box-shadow:0 10px 24px rgba(49,58,188,0.28)">0 10px 24px rgba(49,58,188,0.28)</div></div>

  <div class="section">
    <h2>Gradients</h2>
    <div class="signal-grid">
      <article class="signal-card">
        <div class="signal-preview" style="background:linear-gradient(25deg, #2b2fc2 0%, #3b63d7 22%, #7c35bb 72%, rgba(214, 155, 71, 0.95) 100%);"></div>
        <div class="signal-title">hero-bg</div>
        <div class="signal-meta">linear 25deg · main page background</div>
        <div class="signal-code">0% #2b2fc2 @1  |  22% #3b63d7 @1  |  72% #7c35bb @1  |  100% #d69b47 @0.95</div>
      </article>
      <article class="signal-card">
        <div class="signal-preview" style="background:linear-gradient(180deg, #4a5bf1 0%, #3940dc 100%);"></div>
        <div class="signal-title">primary-button</div>
        <div class="signal-meta">linear 180deg · primary CTA fill</div>
        <div class="signal-code">0% #4a5bf1 @1  |  100% #3940dc @1</div>
      </article></div>
  </div>

  <div class="section">
    <h2>Surface Effects</h2>
    <div class="signal-grid">
      <article class="signal-card">
        <div class="signal-title">soft glow</div>
        <div class="signal-meta">CTA buttons and hero elements use a subtle luminous edge and shadow over the gradient backdrop</div>
        <div class="signal-code">box-shadow: 0 10px 24px rgba(49,58,188,0.28)<br/>border: 1px solid rgba(255,255,255,0.18)</div>
      </article>
      <article class="signal-card">
        <div class="signal-title">frosted panel</div>
        <div class="signal-meta">the segmented option tray appears as a translucent lilac panel behind solid cards</div>
        <div class="signal-code">background: rgba(219,214,245,0.22)<br/>border: 1px solid rgba(255,255,255,0.18)<br/>backdrop-filter: blur(6px)</div>
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
        <td>solid blue gradient pill with white semi-bold text and soft outer shadow</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-hover">hover</span></td>
        <td>slightly brighter blue-violet gradient with stronger glow and lift</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-focus">focus</span></td>
        <td>thin light-lilac outer ring around pill boundary</td>
      </tr>
      <tr>
        <td>navigation.link</td>
        <td><span class="state-pill state-default">default</span></td>
        <td>small white text with reduced opacity over transparent background</td>
      </tr>
      <tr>
        <td>navigation.link</td>
        <td><span class="state-pill state-hover">hover</span></td>
        <td>full-opacity white text with subtle underline or brighter contrast</td>
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
            src="/knowledge-refs/auto-saas-2026-05-16-4-scribe.png"
            alt="logo and nav"
            style="--ox:0%;--oy:0%;--zoom:2.8;"
            draggable="false"
          />
        </div>
        <figcaption>logo and nav</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/auto-saas-2026-05-16-4-scribe.png"
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
            src="/knowledge-refs/auto-saas-2026-05-16-4-scribe.png"
            alt="review badge"
            style="--ox:50%;--oy:0%;--zoom:4;"
            draggable="false"
          />
        </div>
        <figcaption>review badge</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/auto-saas-2026-05-16-4-scribe.png"
            alt="use-case cards"
            style="--ox:50%;--oy:50%;--zoom:2.4;"
            draggable="false"
          />
        </div>
        <figcaption>use-case cards</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/auto-saas-2026-05-16-4-scribe.png"
            alt="primary cta"
            style="--ox:50%;--oy:100%;--zoom:4;"
            draggable="false"
          />
        </div>
        <figcaption>primary cta</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/auto-saas-2026-05-16-4-scribe.png"
            alt="trust logos"
            style="--ox:100%;--oy:100%;--zoom:2.8;"
            draggable="false"
          />
        </div>
        <figcaption>trust logos</figcaption>
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
        <p class="muted">Surface card on background, 18px radius, using primary as accent.</p>
        <button class="btn btn-primary" style="margin-top:8px;">Action</button>
      </div>
    </div>
  </div>

  <div class="section"><h2>Component Notes</h2>
      <div class="component">
        <div class="component__name">button</div>
        <div class="component__desc">Rounded pill buttons with blue gradient fills for primary actions and muted translucent fills for secondary actions; white text, medium shadow, and generous horizontal padding.</div>
      </div>
      <div class="component">
        <div class="component__name">card</div>
        <div class="component__desc">Small rounded rectangular option cards with very light gray backgrounds, thin cool-gray borders, centered pastel icons, and dark label text, grouped inside a translucent rounded container.</div>
      </div>
      <div class="component">
        <div class="component__name">navigation</div>
        <div class="component__desc">Minimal top navigation bar with centered text links, subtle dropdown chevrons, left-aligned logo, and right-aligned sign-in and primary CTA buttons.</div>
      </div></div>

  <div class="section"><h2>Layout pattern</h2><p>centered top navigation above a full-width hero with large centered headline, supporting copy, segmented use-case card row, primary CTA, and trust-logo strip at the bottom</p></div>
</body>
</html>
```

