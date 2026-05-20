---
{"id":"DK-img-s3-saas","layer":"L1","kind":"design-knowledge","title":"Style Spec — s3-saas.png","tags":["industry:saas","source:vision-distill","image:s3-saas.png","manual:approved"],"source":"distill","refs":{},"createdAt":1778922891045,"updatedAt":1779236504869,"schemaVersion":1}
---

<!-- style-spec:json
{
  "industry": "saas",
  "summary": "A light, modern SaaS landing page with soft pastel gradients, spacious layout, and rounded UI cards. The design balances clean typography with subtle product mockups and airy component spacing for a polished, approachable feel.",
  "vibe": [
    "minimal",
    "airy",
    "soft",
    "modern",
    "friendly"
  ],
  "palette": {
    "primary": {
      "hex": "#667ad8",
      "label": "periwinkle blue"
    },
    "secondary": {
      "hex": "#dcd2fb",
      "label": "soft lavender"
    },
    "accent": {
      "hex": "#d9f3fb",
      "label": "pale sky blue"
    },
    "background": {
      "hex": "#f4f4f6",
      "label": "warm light gray"
    },
    "surface": {
      "hex": "#fefefe",
      "label": "white card"
    },
    "text": {
      "hex": "#171739",
      "label": "deep navy"
    },
    "textMuted": {
      "hex": "#6f6f7c",
      "label": "muted slate gray"
    },
    "border": {
      "hex": "#e6e4ea",
      "label": "soft gray border"
    },
    "warning": {
      "hex": "#f0c9bc",
      "label": "soft peach"
    }
  },
  "typography": {
    "headingFont": "Inter",
    "bodyFont": "Inter",
    "headingWeight": 600,
    "bodyWeight": 400,
    "baseSizePx": 16,
    "notes": [
      "large centered hero headings",
      "small muted supporting copy",
      "lightweight navigation labels"
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
    "0 1px 2px rgba(23,23,57,0.06)",
    "0 12px 32px rgba(102,122,216,0.12)"
  ],
  "gradients": [
    {
      "id": "hero-halo",
      "type": "linear",
      "angleDeg": 180,
      "stops": [
        {
          "color": "#ffffff",
          "positionPct": 0,
          "opacity": 1
        },
        {
          "color": "#eef6fb",
          "positionPct": 58,
          "opacity": 1
        },
        {
          "color": "#e5dcfb",
          "positionPct": 100,
          "opacity": 1
        }
      ],
      "usage": "soft glow behind hero product mockups"
    },
    {
      "id": "feature-card-blue",
      "type": "linear",
      "angleDeg": 135,
      "stops": [
        {
          "color": "#ecf9fd",
          "positionPct": 0,
          "opacity": 1
        },
        {
          "color": "#e9f3fb",
          "positionPct": 100,
          "opacity": 1
        }
      ],
      "usage": "left feature card background"
    },
    {
      "id": "feature-card-lilac",
      "type": "linear",
      "angleDeg": 135,
      "stops": [
        {
          "color": "#f2edfd",
          "positionPct": 0,
          "opacity": 1
        },
        {
          "color": "#ece7fb",
          "positionPct": 100,
          "opacity": 1
        }
      ],
      "usage": "right feature card background"
    },
    {
      "id": "pricing-card-tint",
      "type": "linear",
      "angleDeg": 135,
      "stops": [
        {
          "color": "#fdeee8",
          "positionPct": 0,
          "opacity": 1
        },
        {
          "color": "#edf3ff",
          "positionPct": 100,
          "opacity": 1
        }
      ],
      "usage": "highlighted pricing and secondary promotional panels"
    }
  ],
  "surfaceEffects": [
    {
      "name": "soft card elevation",
      "description": "cards use white surfaces with very light borders and subtle diffused shadow to float above the pale page background",
      "cssHints": [
        "background: #fefefe",
        "border: 1px solid #e6e4ea",
        "box-shadow: 0 12px 32px rgba(102,122,216,0.12)"
      ]
    },
    {
      "name": "pastel glow",
      "description": "hero mockup area sits over a faint blended blue-to-lilac glow that creates depth without strong contrast",
      "cssHints": [
        "background: linear-gradient(180deg, #ffffff 0%, #eef6fb 58%, #e5dcfb 100%)",
        "filter: blur(0px)"
      ]
    }
  ],
  "stateTokens": [
    {
      "component": "button.primary",
      "state": "default",
      "treatment": "solid periwinkle blue fill with white text, small radius, and soft shadow"
    },
    {
      "component": "button.primary",
      "state": "hover",
      "treatment": "slightly darker blue fill with stronger elevation"
    },
    {
      "component": "button.primary",
      "state": "focus",
      "treatment": "subtle pale blue outer ring around the button"
    },
    {
      "component": "button.secondary",
      "state": "default",
      "treatment": "white fill with light gray border and dark text"
    }
  ],
  "components": {
    "button": {
      "description": "Small rounded buttons with compact horizontal padding; primary buttons use blue fill and white text, while secondary buttons are white with faint border."
    },
    "card": {
      "description": "Rounded rectangular cards with white or pastel gradient backgrounds, fine borders, soft shadows, and generous internal spacing."
    },
    "input": {
      "description": "Form fields in the product mockup are narrow white inputs with thin gray borders, subtle corner radius, and understated labels."
    },
    "navigation": {
      "description": "Minimal top navigation with small text links, ample spacing, brand wordmark on the left, and auth buttons aligned right."
    }
  },
  "layout": "centered marketing landing page with top navigation, large hero section with floating product mockups, feature cards below, and a right-side column of stacked supporting sections",
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
      "zoom": 2.3
    },
    {
      "name": "primary CTA",
      "col": 2,
      "row": 1,
      "zoom": 4
    },
    {
      "name": "product mockup",
      "col": 2,
      "row": 2,
      "zoom": 2.4
    },
    {
      "name": "feature cards",
      "col": 2,
      "row": 3,
      "zoom": 2.2
    },
    {
      "name": "pricing cards",
      "col": 3,
      "row": 2,
      "zoom": 2.6
    }
  ],
  "imagePath": "/knowledge-refs/s3-saas.png",
  "imageName": "s3-saas.png",
  "capturedAt": "2026-05-20T00:21:44.868Z",
  "model": "openai/gpt-5.4-20260305"
}
-->

# Style Spec — s3-saas.png

## Style Spec (Markdown)

**Industry**: saas
**Image**: s3-saas.png
**Vibe**: minimal, airy, soft, modern, friendly

**Summary**: A light, modern SaaS landing page with soft pastel gradients, spacious layout, and rounded UI cards. The design balances clean typography with subtle product mockups and airy component spacing for a polished, approachable feel.

### Palette
- Primary: `#667ad8` — periwinkle blue
- Secondary: `#dcd2fb` — soft lavender
- Accent: `#d9f3fb` — pale sky blue
- Background: `#f4f4f6` — warm light gray
- Surface: `#fefefe` — white card
- Text: `#171739` — deep navy
- Text muted: `#6f6f7c` — muted slate gray
- Border: `#e6e4ea` — soft gray border
- Warning: `#f0c9bc` — soft peach

### Typography
- Heading font: Inter (weight 600)
- Body font: Inter (weight 400)
- Base size: 16px
- Note: large centered hero headings
- Note: small muted supporting copy
- Note: lightweight navigation labels

### Spacing & Radius
- Spacing base: 8px; scale: 4, 8, 12, 16, 24, 32, 48, 64
- Radius: sm 4px, md 8px, lg 16px, pill 999px
- Shadows: 2 variant(s)
  - `0 1px 2px rgba(23,23,57,0.06)`
  - `0 12px 32px rgba(102,122,216,0.12)`

### Gradients
- **hero-halo** (linear, 180deg) — soft glow behind hero product mockups
  - stop 0%: `#ffffff`, alpha 1
  - stop 58%: `#eef6fb`, alpha 1
  - stop 100%: `#e5dcfb`, alpha 1
- **feature-card-blue** (linear, 135deg) — left feature card background
  - stop 0%: `#ecf9fd`, alpha 1
  - stop 100%: `#e9f3fb`, alpha 1
- **feature-card-lilac** (linear, 135deg) — right feature card background
  - stop 0%: `#f2edfd`, alpha 1
  - stop 100%: `#ece7fb`, alpha 1
- **pricing-card-tint** (linear, 135deg) — highlighted pricing and secondary promotional panels
  - stop 0%: `#fdeee8`, alpha 1
  - stop 100%: `#edf3ff`, alpha 1

### Surface Effects
- **soft card elevation**: cards use white surfaces with very light borders and subtle diffused shadow to float above the pale page background
  - `background: #fefefe`
  - `border: 1px solid #e6e4ea`
  - `box-shadow: 0 12px 32px rgba(102,122,216,0.12)`
- **pastel glow**: hero mockup area sits over a faint blended blue-to-lilac glow that creates depth without strong contrast
  - `background: linear-gradient(180deg, #ffffff 0%, #eef6fb 58%, #e5dcfb 100%)`
  - `filter: blur(0px)`

### Interaction State Tokens
- **button.primary.default**: solid periwinkle blue fill with white text, small radius, and soft shadow
- **button.primary.hover**: slightly darker blue fill with stronger elevation
- **button.primary.focus**: subtle pale blue outer ring around the button
- **button.secondary.default**: white fill with light gray border and dark text

### Components
- **button**: Small rounded buttons with compact horizontal padding; primary buttons use blue fill and white text, while secondary buttons are white with faint border.
- **card**: Rounded rectangular cards with white or pastel gradient backgrounds, fine borders, soft shadows, and generous internal spacing.
- **input**: Form fields in the product mockup are narrow white inputs with thin gray borders, subtle corner radius, and understated labels.
- **navigation**: Minimal top navigation with small text links, ample spacing, brand wordmark on the left, and auth buttons aligned right.

### Layout
centered marketing landing page with top navigation, large hero section with floating product mockups, feature cards below, and a right-side column of stacked supporting sections

### UI Elements
Named UI regions identified in the reference screenshot (col/row = 3×3 grid):
- **top navigation** — col 1, row 1, zoom 3×
- **hero headline** — col 2, row 1, zoom 2.3×
- **primary CTA** — col 2, row 1, zoom 4×
- **product mockup** — col 2, row 2, zoom 2.4×
- **feature cards** — col 2, row 3, zoom 2.2×
- **pricing cards** — col 3, row 2, zoom 2.6×

## Style Spec (HTML)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Style Spec — s3-saas.png</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
    --color-primary:    #667ad8;
    --color-secondary:  #dcd2fb;
    --color-accent:     #d9f3fb;
    --color-background: #f4f4f6;
    --color-surface:    #fefefe;
    --color-text:       #171739;
    --color-text-muted: #6f6f7c;
    --color-border:     #e6e4ea;
    --color-success:    #22c55e;
    --color-warning:    #f0c9bc;
    --color-danger:     #ef4444;
    --font-heading: 'Inter', system-ui, sans-serif;
    --font-body:    'Inter', system-ui, sans-serif;
    --font-mono:    'JetBrains Mono', ui-monospace, monospace;
    --weight-heading: 600;
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
    <img src="/knowledge-refs/s3-saas.png" alt="s3-saas.png">
    <div class="header__body">
      <div class="kicker">saas</div>
      <h1>s3-saas.png</h1>
      <p class="muted">A light, modern SaaS landing page with soft pastel gradients, spacious layout, and rounded UI cards. The design balances clean typography with subtle product mockups and airy component spacing for a polished, approachable feel.</p>
      <div class="tags">
        <span class="tag">minimal</span><span class="tag">airy</span><span class="tag">soft</span><span class="tag">modern</span><span class="tag">friendly</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Palette</h2>
    <div class="palette">
    <div class="swatch">
      <div class="swatch__chip" style="background:#667ad8"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Primary</div>
        <div class="swatch__hex">#667ad8</div>
        <div class="swatch__name">periwinkle blue</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#dcd2fb"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Secondary</div>
        <div class="swatch__hex">#dcd2fb</div>
        <div class="swatch__name">soft lavender</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#d9f3fb"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Accent</div>
        <div class="swatch__hex">#d9f3fb</div>
        <div class="swatch__name">pale sky blue</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f4f4f6"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Background</div>
        <div class="swatch__hex">#f4f4f6</div>
        <div class="swatch__name">warm light gray</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#fefefe"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Surface</div>
        <div class="swatch__hex">#fefefe</div>
        <div class="swatch__name">white card</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#171739"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text</div>
        <div class="swatch__hex">#171739</div>
        <div class="swatch__name">deep navy</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#6f6f7c"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text muted</div>
        <div class="swatch__hex">#6f6f7c</div>
        <div class="swatch__name">muted slate gray</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#e6e4ea"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Border</div>
        <div class="swatch__hex">#e6e4ea</div>
        <div class="swatch__name">soft gray border</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f0c9bc"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Warning</div>
        <div class="swatch__hex">#f0c9bc</div>
        <div class="swatch__name">soft peach</div>
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

  <div class="section"><h2>Shadows</h2><div class="shadow-card" style="box-shadow:0 1px 2px rgba(23,23,57,0.06)">0 1px 2px rgba(23,23,57,0.06)</div><div class="shadow-card" style="box-shadow:0 12px 32px rgba(102,122,216,0.12)">0 12px 32px rgba(102,122,216,0.12)</div></div>

  <div class="section">
    <h2>Gradients</h2>
    <div class="signal-grid">
      <article class="signal-card">
        <div class="signal-preview" style="background:linear-gradient(180deg, #ffffff 0%, #eef6fb 58%, #e5dcfb 100%);"></div>
        <div class="signal-title">hero-halo</div>
        <div class="signal-meta">linear 180deg · soft glow behind hero product mockups</div>
        <div class="signal-code">0% #ffffff @1  |  58% #eef6fb @1  |  100% #e5dcfb @1</div>
      </article>
      <article class="signal-card">
        <div class="signal-preview" style="background:linear-gradient(135deg, #ecf9fd 0%, #e9f3fb 100%);"></div>
        <div class="signal-title">feature-card-blue</div>
        <div class="signal-meta">linear 135deg · left feature card background</div>
        <div class="signal-code">0% #ecf9fd @1  |  100% #e9f3fb @1</div>
      </article>
      <article class="signal-card">
        <div class="signal-preview" style="background:linear-gradient(135deg, #f2edfd 0%, #ece7fb 100%);"></div>
        <div class="signal-title">feature-card-lilac</div>
        <div class="signal-meta">linear 135deg · right feature card background</div>
        <div class="signal-code">0% #f2edfd @1  |  100% #ece7fb @1</div>
      </article>
      <article class="signal-card">
        <div class="signal-preview" style="background:linear-gradient(135deg, #fdeee8 0%, #edf3ff 100%);"></div>
        <div class="signal-title">pricing-card-tint</div>
        <div class="signal-meta">linear 135deg · highlighted pricing and secondary promotional panels</div>
        <div class="signal-code">0% #fdeee8 @1  |  100% #edf3ff @1</div>
      </article></div>
  </div>

  <div class="section">
    <h2>Surface Effects</h2>
    <div class="signal-grid">
      <article class="signal-card">
        <div class="signal-title">soft card elevation</div>
        <div class="signal-meta">cards use white surfaces with very light borders and subtle diffused shadow to float above the pale page background</div>
        <div class="signal-code">background: #fefefe<br/>border: 1px solid #e6e4ea<br/>box-shadow: 0 12px 32px rgba(102,122,216,0.12)</div>
      </article>
      <article class="signal-card">
        <div class="signal-title">pastel glow</div>
        <div class="signal-meta">hero mockup area sits over a faint blended blue-to-lilac glow that creates depth without strong contrast</div>
        <div class="signal-code">background: linear-gradient(180deg, #ffffff 0%, #eef6fb 58%, #e5dcfb 100%)<br/>filter: blur(0px)</div>
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
        <td>solid periwinkle blue fill with white text, small radius, and soft shadow</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-hover">hover</span></td>
        <td>slightly darker blue fill with stronger elevation</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-focus">focus</span></td>
        <td>subtle pale blue outer ring around the button</td>
      </tr>
      <tr>
        <td>button.secondary</td>
        <td><span class="state-pill state-default">default</span></td>
        <td>white fill with light gray border and dark text</td>
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
            src="/knowledge-refs/s3-saas.png"
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
            src="/knowledge-refs/s3-saas.png"
            alt="hero headline"
            style="--ox:50%;--oy:0%;--zoom:2.3;"
            draggable="false"
          />
        </div>
        <figcaption>hero headline</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/s3-saas.png"
            alt="primary CTA"
            style="--ox:50%;--oy:0%;--zoom:4;"
            draggable="false"
          />
        </div>
        <figcaption>primary CTA</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/s3-saas.png"
            alt="product mockup"
            style="--ox:50%;--oy:50%;--zoom:2.4;"
            draggable="false"
          />
        </div>
        <figcaption>product mockup</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/s3-saas.png"
            alt="feature cards"
            style="--ox:50%;--oy:100%;--zoom:2.2;"
            draggable="false"
          />
        </div>
        <figcaption>feature cards</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/s3-saas.png"
            alt="pricing cards"
            style="--ox:100%;--oy:50%;--zoom:2.6;"
            draggable="false"
          />
        </div>
        <figcaption>pricing cards</figcaption>
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
        <div class="component__desc">Small rounded buttons with compact horizontal padding; primary buttons use blue fill and white text, while secondary buttons are white with faint border.</div>
      </div>
      <div class="component">
        <div class="component__name">card</div>
        <div class="component__desc">Rounded rectangular cards with white or pastel gradient backgrounds, fine borders, soft shadows, and generous internal spacing.</div>
      </div>
      <div class="component">
        <div class="component__name">input</div>
        <div class="component__desc">Form fields in the product mockup are narrow white inputs with thin gray borders, subtle corner radius, and understated labels.</div>
      </div>
      <div class="component">
        <div class="component__name">navigation</div>
        <div class="component__desc">Minimal top navigation with small text links, ample spacing, brand wordmark on the left, and auth buttons aligned right.</div>
      </div></div>

  <div class="section"><h2>Layout pattern</h2><p>centered marketing landing page with top navigation, large hero section with floating product mockups, feature cards below, and a right-side column of stacked supporting sections</p></div>
</body>
</html>
```

