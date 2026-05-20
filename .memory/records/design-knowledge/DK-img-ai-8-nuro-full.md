---
{"id":"DK-img-ai-8-nuro-full","layer":"L1","kind":"design-knowledge","title":"Style Spec — ai-8-nuro-full.png","tags":["industry:ai","source:vision-distill","image:ai-8-nuro-full.png","manual:approved"],"source":"distill","refs":{},"createdAt":1778922803701,"updatedAt":1779235956418,"schemaVersion":1}
---

<!-- style-spec:json
{
  "industry": "ai",
  "summary": "A soft, light-mode AI workspace with muted neutrals, rounded panels, and subtle pastel accents. The interface balances clean productivity patterns with gentle glow effects and approachable, card-based onboarding.",
  "vibe": [
    "minimal",
    "soft",
    "clean",
    "friendly",
    "airy"
  ],
  "palette": {
    "primary": {
      "hex": "#111827",
      "label": "near-black ink"
    },
    "secondary": {
      "hex": "#c9b6d8",
      "label": "soft lavender"
    },
    "accent": {
      "hex": "#f1b39a",
      "label": "peach blush"
    },
    "background": {
      "hex": "#f5f4f5",
      "label": "warm off-white"
    },
    "surface": {
      "hex": "#fdfcfc",
      "label": "white panel"
    },
    "text": {
      "hex": "#101623",
      "label": "deep charcoal"
    },
    "textMuted": {
      "hex": "#8c8c91",
      "label": "cool gray"
    },
    "border": {
      "hex": "#e7e3e4",
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
      "large centered hero heading",
      "muted secondary copy",
      "medium-weight navigation labels"
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
    "0 1px 2px rgba(16,22,35,0.04)",
    "0 8px 24px rgba(16,22,35,0.06)"
  ],
  "gradients": [
    {
      "id": "logo-glow",
      "type": "radial",
      "angleDeg": 0,
      "stops": [
        {
          "color": "#f1b39a",
          "positionPct": 0,
          "opacity": 1
        },
        {
          "color": "#c9b6d8",
          "positionPct": 55,
          "opacity": 0.85
        },
        {
          "color": "#f5f4f5",
          "positionPct": 100,
          "opacity": 0
        }
      ],
      "usage": "centered star logo glow"
    },
    {
      "id": "cta-panel",
      "type": "linear",
      "angleDeg": 135,
      "stops": [
        {
          "color": "#a8b2c1",
          "positionPct": 0,
          "opacity": 1
        },
        {
          "color": "#b8bfca",
          "positionPct": 45,
          "opacity": 1
        },
        {
          "color": "#d8cfd0",
          "positionPct": 100,
          "opacity": 1
        }
      ],
      "usage": "upgrade card background in sidebar"
    },
    {
      "id": "primary-button",
      "type": "linear",
      "angleDeg": 180,
      "stops": [
        {
          "color": "#162230",
          "positionPct": 0,
          "opacity": 1
        },
        {
          "color": "#0f1723",
          "positionPct": 100,
          "opacity": 1
        }
      ],
      "usage": "chat history create button"
    }
  ],
  "surfaceEffects": [
    {
      "name": "soft-panel",
      "description": "cards and side panels use solid white surfaces with delicate borders and very light elevation",
      "cssHints": [
        "background: #fdfcfc",
        "border: 1px solid #e7e3e4",
        "box-shadow: 0 8px 24px rgba(16,22,35,0.06)"
      ]
    },
    {
      "name": "pastel-glow",
      "description": "decorative icons and logo use blurred peach-lavender glow to soften the interface",
      "cssHints": [
        "filter: blur(10px)",
        "background: radial-gradient(circle, rgba(241,179,154,0.9) 0%, rgba(201,182,216,0.75) 55%, rgba(245,244,245,0) 100%)"
      ]
    }
  ],
  "stateTokens": [
    {
      "component": "button.primary",
      "state": "default",
      "treatment": "dark navy pill button with subtle inner glow and white text"
    },
    {
      "component": "button.primary",
      "state": "hover",
      "treatment": "slightly brighter dark fill with stronger outer shadow"
    },
    {
      "component": "button.primary",
      "state": "focus",
      "treatment": "2px soft gray focus ring outside rounded bounds"
    },
    {
      "component": "navigation.item",
      "state": "active",
      "treatment": "white pill background with dark text and icon"
    },
    {
      "component": "input.chat",
      "state": "focus",
      "treatment": "white input surface with slightly darker border and soft shadow emphasis"
    }
  ],
  "components": {
    "button": {
      "description": "Rounded pill buttons; primary uses dark filled treatment with white label, while secondary buttons are white pills with light borders and muted icons."
    },
    "card": {
      "description": "Compact onboarding cards with white backgrounds, large rounded corners, minimal borders, pastel illustrative icons, and stacked title/body text."
    },
    "input": {
      "description": "Large bottom composer input with rounded rectangular container, subtle border, placeholder text, and pill-shaped utility actions inside."
    },
    "navigation": {
      "description": "Left vertical sidebar with icon-label menu items, active row highlighted by a white rounded pill; right-side history panel uses stacked list rows with thumbnails and timestamps."
    }
  },
  "layout": "fixed left sidebar + centered welcome hero + onboarding card row + bottom composer + right chat history panel",
  "visualElements": [
    {
      "name": "sidebar nav",
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
      "name": "onboarding cards",
      "col": 2,
      "row": 2,
      "zoom": 2.6
    },
    {
      "name": "chat history panel",
      "col": 3,
      "row": 1,
      "zoom": 2.2
    },
    {
      "name": "composer input",
      "col": 2,
      "row": 3,
      "zoom": 2.5
    },
    {
      "name": "primary CTA button",
      "col": 3,
      "row": 3,
      "zoom": 4
    }
  ],
  "imagePath": "/knowledge-refs/ai-8-nuro-full.png",
  "imageName": "ai-8-nuro-full.png",
  "capturedAt": "2026-05-20T00:12:36.418Z",
  "model": "openai/gpt-5.4-20260305"
}
-->

# Style Spec — ai-8-nuro-full.png

## Style Spec (Markdown)

**Industry**: ai
**Image**: ai-8-nuro-full.png
**Vibe**: minimal, soft, clean, friendly, airy

**Summary**: A soft, light-mode AI workspace with muted neutrals, rounded panels, and subtle pastel accents. The interface balances clean productivity patterns with gentle glow effects and approachable, card-based onboarding.

### Palette
- Primary: `#111827` — near-black ink
- Secondary: `#c9b6d8` — soft lavender
- Accent: `#f1b39a` — peach blush
- Background: `#f5f4f5` — warm off-white
- Surface: `#fdfcfc` — white panel
- Text: `#101623` — deep charcoal
- Text muted: `#8c8c91` — cool gray
- Border: `#e7e3e4` — light gray border

### Typography
- Heading font: Inter (weight 700)
- Body font: Inter (weight 400)
- Base size: 16px
- Note: large centered hero heading
- Note: muted secondary copy
- Note: medium-weight navigation labels

### Spacing & Radius
- Spacing base: 8px; scale: 4, 8, 12, 16, 24, 32, 48, 64
- Radius: sm 4px, md 8px, lg 16px, pill 999px
- Shadows: 2 variant(s)
  - `0 1px 2px rgba(16,22,35,0.04)`
  - `0 8px 24px rgba(16,22,35,0.06)`

### Gradients
- **logo-glow** (radial) — centered star logo glow
  - stop 0%: `#f1b39a`, alpha 1
  - stop 55%: `#c9b6d8`, alpha 0.85
  - stop 100%: `#f5f4f5`, alpha 0
- **cta-panel** (linear, 135deg) — upgrade card background in sidebar
  - stop 0%: `#a8b2c1`, alpha 1
  - stop 45%: `#b8bfca`, alpha 1
  - stop 100%: `#d8cfd0`, alpha 1
- **primary-button** (linear, 180deg) — chat history create button
  - stop 0%: `#162230`, alpha 1
  - stop 100%: `#0f1723`, alpha 1

### Surface Effects
- **soft-panel**: cards and side panels use solid white surfaces with delicate borders and very light elevation
  - `background: #fdfcfc`
  - `border: 1px solid #e7e3e4`
  - `box-shadow: 0 8px 24px rgba(16,22,35,0.06)`
- **pastel-glow**: decorative icons and logo use blurred peach-lavender glow to soften the interface
  - `filter: blur(10px)`
  - `background: radial-gradient(circle, rgba(241,179,154,0.9) 0%, rgba(201,182,216,0.75) 55%, rgba(245,244,245,0) 100%)`

### Interaction State Tokens
- **button.primary.default**: dark navy pill button with subtle inner glow and white text
- **button.primary.hover**: slightly brighter dark fill with stronger outer shadow
- **button.primary.focus**: 2px soft gray focus ring outside rounded bounds
- **navigation.item.active**: white pill background with dark text and icon
- **input.chat.focus**: white input surface with slightly darker border and soft shadow emphasis

### Components
- **button**: Rounded pill buttons; primary uses dark filled treatment with white label, while secondary buttons are white pills with light borders and muted icons.
- **card**: Compact onboarding cards with white backgrounds, large rounded corners, minimal borders, pastel illustrative icons, and stacked title/body text.
- **input**: Large bottom composer input with rounded rectangular container, subtle border, placeholder text, and pill-shaped utility actions inside.
- **navigation**: Left vertical sidebar with icon-label menu items, active row highlighted by a white rounded pill; right-side history panel uses stacked list rows with thumbnails and timestamps.

### Layout
fixed left sidebar + centered welcome hero + onboarding card row + bottom composer + right chat history panel

### UI Elements
Named UI regions identified in the reference screenshot (col/row = 3×3 grid):
- **sidebar nav** — col 1, row 1, zoom 2.6×
- **hero headline** — col 2, row 1, zoom 2.4×
- **onboarding cards** — col 2, row 2, zoom 2.6×
- **chat history panel** — col 3, row 1, zoom 2.2×
- **composer input** — col 2, row 3, zoom 2.5×
- **primary CTA button** — col 3, row 3, zoom 4×

## Style Spec (HTML)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Style Spec — ai-8-nuro-full.png</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
    --color-primary:    #111827;
    --color-secondary:  #c9b6d8;
    --color-accent:     #f1b39a;
    --color-background: #f5f4f5;
    --color-surface:    #fdfcfc;
    --color-text:       #101623;
    --color-text-muted: #8c8c91;
    --color-border:     #e7e3e4;
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
    <img src="/knowledge-refs/ai-8-nuro-full.png" alt="ai-8-nuro-full.png">
    <div class="header__body">
      <div class="kicker">ai</div>
      <h1>ai-8-nuro-full.png</h1>
      <p class="muted">A soft, light-mode AI workspace with muted neutrals, rounded panels, and subtle pastel accents. The interface balances clean productivity patterns with gentle glow effects and approachable, card-based onboarding.</p>
      <div class="tags">
        <span class="tag">minimal</span><span class="tag">soft</span><span class="tag">clean</span><span class="tag">friendly</span><span class="tag">airy</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Palette</h2>
    <div class="palette">
    <div class="swatch">
      <div class="swatch__chip" style="background:#111827"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Primary</div>
        <div class="swatch__hex">#111827</div>
        <div class="swatch__name">near-black ink</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#c9b6d8"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Secondary</div>
        <div class="swatch__hex">#c9b6d8</div>
        <div class="swatch__name">soft lavender</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f1b39a"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Accent</div>
        <div class="swatch__hex">#f1b39a</div>
        <div class="swatch__name">peach blush</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f5f4f5"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Background</div>
        <div class="swatch__hex">#f5f4f5</div>
        <div class="swatch__name">warm off-white</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#fdfcfc"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Surface</div>
        <div class="swatch__hex">#fdfcfc</div>
        <div class="swatch__name">white panel</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#101623"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text</div>
        <div class="swatch__hex">#101623</div>
        <div class="swatch__name">deep charcoal</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#8c8c91"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text muted</div>
        <div class="swatch__hex">#8c8c91</div>
        <div class="swatch__name">cool gray</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#e7e3e4"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Border</div>
        <div class="swatch__hex">#e7e3e4</div>
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

  <div class="section"><h2>Shadows</h2><div class="shadow-card" style="box-shadow:0 1px 2px rgba(16,22,35,0.04)">0 1px 2px rgba(16,22,35,0.04)</div><div class="shadow-card" style="box-shadow:0 8px 24px rgba(16,22,35,0.06)">0 8px 24px rgba(16,22,35,0.06)</div></div>

  <div class="section">
    <h2>Gradients</h2>
    <div class="signal-grid">
      <article class="signal-card">
        <div class="signal-preview" style="background:radial-gradient(circle at center, #f1b39a 0%, rgba(201, 182, 216, 0.85) 55%, rgba(245, 244, 245, 0) 100%);"></div>
        <div class="signal-title">logo-glow</div>
        <div class="signal-meta">radial · centered star logo glow</div>
        <div class="signal-code">0% #f1b39a @1  |  55% #c9b6d8 @0.85  |  100% #f5f4f5 @0</div>
      </article>
      <article class="signal-card">
        <div class="signal-preview" style="background:linear-gradient(135deg, #a8b2c1 0%, #b8bfca 45%, #d8cfd0 100%);"></div>
        <div class="signal-title">cta-panel</div>
        <div class="signal-meta">linear 135deg · upgrade card background in sidebar</div>
        <div class="signal-code">0% #a8b2c1 @1  |  45% #b8bfca @1  |  100% #d8cfd0 @1</div>
      </article>
      <article class="signal-card">
        <div class="signal-preview" style="background:linear-gradient(180deg, #162230 0%, #0f1723 100%);"></div>
        <div class="signal-title">primary-button</div>
        <div class="signal-meta">linear 180deg · chat history create button</div>
        <div class="signal-code">0% #162230 @1  |  100% #0f1723 @1</div>
      </article></div>
  </div>

  <div class="section">
    <h2>Surface Effects</h2>
    <div class="signal-grid">
      <article class="signal-card">
        <div class="signal-title">soft-panel</div>
        <div class="signal-meta">cards and side panels use solid white surfaces with delicate borders and very light elevation</div>
        <div class="signal-code">background: #fdfcfc<br/>border: 1px solid #e7e3e4<br/>box-shadow: 0 8px 24px rgba(16,22,35,0.06)</div>
      </article>
      <article class="signal-card">
        <div class="signal-title">pastel-glow</div>
        <div class="signal-meta">decorative icons and logo use blurred peach-lavender glow to soften the interface</div>
        <div class="signal-code">filter: blur(10px)<br/>background: radial-gradient(circle, rgba(241,179,154,0.9) 0%, rgba(201,182,216,0.75) 55%, rgba(245,244,245,0) 100%)</div>
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
        <td>dark navy pill button with subtle inner glow and white text</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-hover">hover</span></td>
        <td>slightly brighter dark fill with stronger outer shadow</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-focus">focus</span></td>
        <td>2px soft gray focus ring outside rounded bounds</td>
      </tr>
      <tr>
        <td>navigation.item</td>
        <td><span class="state-pill state-active">active</span></td>
        <td>white pill background with dark text and icon</td>
      </tr>
      <tr>
        <td>input.chat</td>
        <td><span class="state-pill state-focus">focus</span></td>
        <td>white input surface with slightly darker border and soft shadow emphasis</td>
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
            src="/knowledge-refs/ai-8-nuro-full.png"
            alt="sidebar nav"
            style="--ox:0%;--oy:0%;--zoom:2.6;"
            draggable="false"
          />
        </div>
        <figcaption>sidebar nav</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/ai-8-nuro-full.png"
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
            src="/knowledge-refs/ai-8-nuro-full.png"
            alt="onboarding cards"
            style="--ox:50%;--oy:50%;--zoom:2.6;"
            draggable="false"
          />
        </div>
        <figcaption>onboarding cards</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/ai-8-nuro-full.png"
            alt="chat history panel"
            style="--ox:100%;--oy:0%;--zoom:2.2;"
            draggable="false"
          />
        </div>
        <figcaption>chat history panel</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/ai-8-nuro-full.png"
            alt="composer input"
            style="--ox:50%;--oy:100%;--zoom:2.5;"
            draggable="false"
          />
        </div>
        <figcaption>composer input</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/ai-8-nuro-full.png"
            alt="primary CTA button"
            style="--ox:100%;--oy:100%;--zoom:4;"
            draggable="false"
          />
        </div>
        <figcaption>primary CTA button</figcaption>
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
        <div class="component__desc">Rounded pill buttons; primary uses dark filled treatment with white label, while secondary buttons are white pills with light borders and muted icons.</div>
      </div>
      <div class="component">
        <div class="component__name">card</div>
        <div class="component__desc">Compact onboarding cards with white backgrounds, large rounded corners, minimal borders, pastel illustrative icons, and stacked title/body text.</div>
      </div>
      <div class="component">
        <div class="component__name">input</div>
        <div class="component__desc">Large bottom composer input with rounded rectangular container, subtle border, placeholder text, and pill-shaped utility actions inside.</div>
      </div>
      <div class="component">
        <div class="component__name">navigation</div>
        <div class="component__desc">Left vertical sidebar with icon-label menu items, active row highlighted by a white rounded pill; right-side history panel uses stacked list rows with thumbnails and timestamps.</div>
      </div></div>

  <div class="section"><h2>Layout pattern</h2><p>fixed left sidebar + centered welcome hero + onboarding card row + bottom composer + right chat history panel</p></div>
</body>
</html>
```

