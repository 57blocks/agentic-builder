---
{"id":"DK-img-f5-nebula","layer":"L1","kind":"design-knowledge","title":"Style Spec — f5-nebula.png","tags":["industry:fintech-web3","source:vision-distill","image:f5-nebula.png","manual:approved"],"source":"distill","refs":{},"createdAt":1778922863691,"updatedAt":1779236429832,"schemaVersion":1}
---

<!-- style-spec:json
{
  "industry": "fintech-web3",
  "summary": "A dark, futuristic blockchain landing page with neon violet accents, centered hero messaging, and holographic UI cards floating over a technical schematic illustration. The design emphasizes trust, innovation, and premium product polish through glow effects and minimal navigation.",
  "vibe": [
    "dark",
    "futuristic",
    "sleek",
    "premium",
    "technical"
  ],
  "palette": {
    "primary": {
      "hex": "#9b4dff",
      "label": "neon violet"
    },
    "secondary": {
      "hex": "#5f6bff",
      "label": "electric indigo"
    },
    "accent": {
      "hex": "#6effb8",
      "label": "success mint"
    },
    "background": {
      "hex": "#04011f",
      "label": "deep midnight navy"
    },
    "surface": {
      "hex": "#13112c",
      "label": "dark glass panel"
    },
    "text": {
      "hex": "#f4f2ff",
      "label": "soft white"
    },
    "textMuted": {
      "hex": "#a6a2bf",
      "label": "muted lavender gray"
    },
    "border": {
      "hex": "#2a244d",
      "label": "dim violet border"
    },
    "success": {
      "hex": "#6effb8",
      "label": "positive mint"
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
      "italic serif-style emphasis on one keyword",
      "small uppercase-style nav and logo text"
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
    "0 8px 24px rgba(0,0,0,0.35)",
    "0 0 24px rgba(155,77,255,0.28)"
  ],
  "gradients": [
    {
      "id": "page-bg",
      "type": "linear",
      "angleDeg": 180,
      "stops": [
        {
          "color": "#0a0630",
          "positionPct": 0,
          "opacity": 1
        },
        {
          "color": "#04011f",
          "positionPct": 55,
          "opacity": 1
        },
        {
          "color": "#020114",
          "positionPct": 100,
          "opacity": 1
        }
      ],
      "usage": "main page background"
    },
    {
      "id": "primary-button",
      "type": "linear",
      "angleDeg": 0,
      "stops": [
        {
          "color": "#8d46ff",
          "positionPct": 0,
          "opacity": 1
        },
        {
          "color": "#b458ff",
          "positionPct": 100,
          "opacity": 1
        }
      ],
      "usage": "book a demo and CTA buttons"
    }
  ],
  "surfaceEffects": [
    {
      "name": "dark glass cards",
      "description": "floating wallet and portfolio panels use translucent dark fills with subtle blur, thin borders, and soft glow",
      "cssHints": [
        "background: rgba(19, 17, 44, 0.78)",
        "backdrop-filter: blur(10px)",
        "border: 1px solid rgba(255,255,255,0.08)"
      ]
    },
    {
      "name": "neon line glow",
      "description": "illustration and device outlines use dim violet strokes with ambient bloom for a holographic feel",
      "cssHints": [
        "box-shadow: 0 0 18px rgba(95,107,255,0.18)",
        "filter: drop-shadow(0 0 8px rgba(155,77,255,0.22))"
      ]
    }
  ],
  "stateTokens": [
    {
      "component": "button.primary",
      "state": "default",
      "treatment": "pill button with violet gradient fill and white text"
    },
    {
      "component": "button.primary",
      "state": "hover",
      "treatment": "slightly brighter purple gradient with stronger outer glow"
    },
    {
      "component": "button.primary",
      "state": "focus",
      "treatment": "subtle purple focus ring outside the rounded button"
    },
    {
      "component": "navigation.link",
      "state": "default",
      "treatment": "small muted white text on transparent background"
    },
    {
      "component": "navigation.link",
      "state": "hover",
      "treatment": "brighter white text with faint underline or glow emphasis"
    }
  ],
  "components": {
    "button": {
      "description": "Rounded pill CTA buttons; primary uses a purple gradient fill, while secondary sign-in button is dark with a thin low-contrast border."
    },
    "card": {
      "description": "Compact floating data cards with dark translucent backgrounds, subtle borders, tiny labels, right-aligned values, and faint glow."
    },
    "navigation": {
      "description": "Minimal top navigation with left-aligned logo, centered text links, and right-aligned auth/CTA actions."
    }
  },
  "layout": "top navigation + centered hero copy + primary CTA + layered blockchain illustration with floating stat cards + partner logo strip",
  "visualElements": [
    {
      "name": "brand logo",
      "col": 1,
      "row": 1,
      "zoom": 3.2
    },
    {
      "name": "top navigation",
      "col": 2,
      "row": 1,
      "zoom": 3
    },
    {
      "name": "demo button",
      "col": 3,
      "row": 1,
      "zoom": 3.8
    },
    {
      "name": "hero headline",
      "col": 2,
      "row": 1,
      "zoom": 2.2
    },
    {
      "name": "primary cta",
      "col": 2,
      "row": 2,
      "zoom": 4.2
    },
    {
      "name": "wallet card",
      "col": 1,
      "row": 2,
      "zoom": 3.4
    }
  ],
  "imagePath": "/knowledge-refs/f5-nebula.png",
  "imageName": "f5-nebula.png",
  "capturedAt": "2026-05-20T00:20:29.831Z",
  "model": "openai/gpt-5.4-20260305"
}
-->

# Style Spec — f5-nebula.png

## Style Spec (Markdown)

**Industry**: fintech-web3
**Image**: f5-nebula.png
**Vibe**: dark, futuristic, sleek, premium, technical

**Summary**: A dark, futuristic blockchain landing page with neon violet accents, centered hero messaging, and holographic UI cards floating over a technical schematic illustration. The design emphasizes trust, innovation, and premium product polish through glow effects and minimal navigation.

### Palette
- Primary: `#9b4dff` — neon violet
- Secondary: `#5f6bff` — electric indigo
- Accent: `#6effb8` — success mint
- Background: `#04011f` — deep midnight navy
- Surface: `#13112c` — dark glass panel
- Text: `#f4f2ff` — soft white
- Text muted: `#a6a2bf` — muted lavender gray
- Border: `#2a244d` — dim violet border
- Success: `#6effb8` — positive mint

### Typography
- Heading font: Inter (weight 600)
- Body font: Inter (weight 400)
- Base size: 16px
- Note: large centered hero headings
- Note: italic serif-style emphasis on one keyword
- Note: small uppercase-style nav and logo text

### Spacing & Radius
- Spacing base: 8px; scale: 4, 8, 12, 16, 24, 32, 48, 64
- Radius: sm 4px, md 8px, lg 16px, pill 999px
- Shadows: 2 variant(s)
  - `0 8px 24px rgba(0,0,0,0.35)`
  - `0 0 24px rgba(155,77,255,0.28)`

### Gradients
- **page-bg** (linear, 180deg) — main page background
  - stop 0%: `#0a0630`, alpha 1
  - stop 55%: `#04011f`, alpha 1
  - stop 100%: `#020114`, alpha 1
- **primary-button** (linear, 0deg) — book a demo and CTA buttons
  - stop 0%: `#8d46ff`, alpha 1
  - stop 100%: `#b458ff`, alpha 1

### Surface Effects
- **dark glass cards**: floating wallet and portfolio panels use translucent dark fills with subtle blur, thin borders, and soft glow
  - `background: rgba(19, 17, 44, 0.78)`
  - `backdrop-filter: blur(10px)`
  - `border: 1px solid rgba(255,255,255,0.08)`
- **neon line glow**: illustration and device outlines use dim violet strokes with ambient bloom for a holographic feel
  - `box-shadow: 0 0 18px rgba(95,107,255,0.18)`
  - `filter: drop-shadow(0 0 8px rgba(155,77,255,0.22))`

### Interaction State Tokens
- **button.primary.default**: pill button with violet gradient fill and white text
- **button.primary.hover**: slightly brighter purple gradient with stronger outer glow
- **button.primary.focus**: subtle purple focus ring outside the rounded button
- **navigation.link.default**: small muted white text on transparent background
- **navigation.link.hover**: brighter white text with faint underline or glow emphasis

### Components
- **button**: Rounded pill CTA buttons; primary uses a purple gradient fill, while secondary sign-in button is dark with a thin low-contrast border.
- **card**: Compact floating data cards with dark translucent backgrounds, subtle borders, tiny labels, right-aligned values, and faint glow.
- **navigation**: Minimal top navigation with left-aligned logo, centered text links, and right-aligned auth/CTA actions.

### Layout
top navigation + centered hero copy + primary CTA + layered blockchain illustration with floating stat cards + partner logo strip

### UI Elements
Named UI regions identified in the reference screenshot (col/row = 3×3 grid):
- **brand logo** — col 1, row 1, zoom 3.2×
- **top navigation** — col 2, row 1, zoom 3×
- **demo button** — col 3, row 1, zoom 3.8×
- **hero headline** — col 2, row 1, zoom 2.2×
- **primary cta** — col 2, row 2, zoom 4.2×
- **wallet card** — col 1, row 2, zoom 3.4×

## Style Spec (HTML)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Style Spec — f5-nebula.png</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
    --color-primary:    #9b4dff;
    --color-secondary:  #5f6bff;
    --color-accent:     #6effb8;
    --color-background: #04011f;
    --color-surface:    #13112c;
    --color-text:       #f4f2ff;
    --color-text-muted: #a6a2bf;
    --color-border:     #2a244d;
    --color-success:    #6effb8;
    --color-warning:    #f59e0b;
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
    <img src="/knowledge-refs/f5-nebula.png" alt="f5-nebula.png">
    <div class="header__body">
      <div class="kicker">fintech-web3</div>
      <h1>f5-nebula.png</h1>
      <p class="muted">A dark, futuristic blockchain landing page with neon violet accents, centered hero messaging, and holographic UI cards floating over a technical schematic illustration. The design emphasizes trust, innovation, and premium product polish through glow effects and minimal navigation.</p>
      <div class="tags">
        <span class="tag">dark</span><span class="tag">futuristic</span><span class="tag">sleek</span><span class="tag">premium</span><span class="tag">technical</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Palette</h2>
    <div class="palette">
    <div class="swatch">
      <div class="swatch__chip" style="background:#9b4dff"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Primary</div>
        <div class="swatch__hex">#9b4dff</div>
        <div class="swatch__name">neon violet</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#5f6bff"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Secondary</div>
        <div class="swatch__hex">#5f6bff</div>
        <div class="swatch__name">electric indigo</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#6effb8"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Accent</div>
        <div class="swatch__hex">#6effb8</div>
        <div class="swatch__name">success mint</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#04011f"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Background</div>
        <div class="swatch__hex">#04011f</div>
        <div class="swatch__name">deep midnight navy</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#13112c"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Surface</div>
        <div class="swatch__hex">#13112c</div>
        <div class="swatch__name">dark glass panel</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f4f2ff"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text</div>
        <div class="swatch__hex">#f4f2ff</div>
        <div class="swatch__name">soft white</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#a6a2bf"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text muted</div>
        <div class="swatch__hex">#a6a2bf</div>
        <div class="swatch__name">muted lavender gray</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#2a244d"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Border</div>
        <div class="swatch__hex">#2a244d</div>
        <div class="swatch__name">dim violet border</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#6effb8"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Success</div>
        <div class="swatch__hex">#6effb8</div>
        <div class="swatch__name">positive mint</div>
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

  <div class="section"><h2>Shadows</h2><div class="shadow-card" style="box-shadow:0 8px 24px rgba(0,0,0,0.35)">0 8px 24px rgba(0,0,0,0.35)</div><div class="shadow-card" style="box-shadow:0 0 24px rgba(155,77,255,0.28)">0 0 24px rgba(155,77,255,0.28)</div></div>

  <div class="section">
    <h2>Gradients</h2>
    <div class="signal-grid">
      <article class="signal-card">
        <div class="signal-preview" style="background:linear-gradient(180deg, #0a0630 0%, #04011f 55%, #020114 100%);"></div>
        <div class="signal-title">page-bg</div>
        <div class="signal-meta">linear 180deg · main page background</div>
        <div class="signal-code">0% #0a0630 @1  |  55% #04011f @1  |  100% #020114 @1</div>
      </article>
      <article class="signal-card">
        <div class="signal-preview" style="background:linear-gradient(0deg, #8d46ff 0%, #b458ff 100%);"></div>
        <div class="signal-title">primary-button</div>
        <div class="signal-meta">linear 0deg · book a demo and CTA buttons</div>
        <div class="signal-code">0% #8d46ff @1  |  100% #b458ff @1</div>
      </article></div>
  </div>

  <div class="section">
    <h2>Surface Effects</h2>
    <div class="signal-grid">
      <article class="signal-card">
        <div class="signal-title">dark glass cards</div>
        <div class="signal-meta">floating wallet and portfolio panels use translucent dark fills with subtle blur, thin borders, and soft glow</div>
        <div class="signal-code">background: rgba(19, 17, 44, 0.78)<br/>backdrop-filter: blur(10px)<br/>border: 1px solid rgba(255,255,255,0.08)</div>
      </article>
      <article class="signal-card">
        <div class="signal-title">neon line glow</div>
        <div class="signal-meta">illustration and device outlines use dim violet strokes with ambient bloom for a holographic feel</div>
        <div class="signal-code">box-shadow: 0 0 18px rgba(95,107,255,0.18)<br/>filter: drop-shadow(0 0 8px rgba(155,77,255,0.22))</div>
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
        <td>pill button with violet gradient fill and white text</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-hover">hover</span></td>
        <td>slightly brighter purple gradient with stronger outer glow</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-focus">focus</span></td>
        <td>subtle purple focus ring outside the rounded button</td>
      </tr>
      <tr>
        <td>navigation.link</td>
        <td><span class="state-pill state-default">default</span></td>
        <td>small muted white text on transparent background</td>
      </tr>
      <tr>
        <td>navigation.link</td>
        <td><span class="state-pill state-hover">hover</span></td>
        <td>brighter white text with faint underline or glow emphasis</td>
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
            src="/knowledge-refs/f5-nebula.png"
            alt="brand logo"
            style="--ox:0%;--oy:0%;--zoom:3.2;"
            draggable="false"
          />
        </div>
        <figcaption>brand logo</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/f5-nebula.png"
            alt="top navigation"
            style="--ox:50%;--oy:0%;--zoom:3;"
            draggable="false"
          />
        </div>
        <figcaption>top navigation</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/f5-nebula.png"
            alt="demo button"
            style="--ox:100%;--oy:0%;--zoom:3.8;"
            draggable="false"
          />
        </div>
        <figcaption>demo button</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/f5-nebula.png"
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
            src="/knowledge-refs/f5-nebula.png"
            alt="primary cta"
            style="--ox:50%;--oy:50%;--zoom:4.2;"
            draggable="false"
          />
        </div>
        <figcaption>primary cta</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/f5-nebula.png"
            alt="wallet card"
            style="--ox:0%;--oy:50%;--zoom:3.4;"
            draggable="false"
          />
        </div>
        <figcaption>wallet card</figcaption>
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
        <div class="component__desc">Rounded pill CTA buttons; primary uses a purple gradient fill, while secondary sign-in button is dark with a thin low-contrast border.</div>
      </div>
      <div class="component">
        <div class="component__name">card</div>
        <div class="component__desc">Compact floating data cards with dark translucent backgrounds, subtle borders, tiny labels, right-aligned values, and faint glow.</div>
      </div>
      <div class="component">
        <div class="component__name">navigation</div>
        <div class="component__desc">Minimal top navigation with left-aligned logo, centered text links, and right-aligned auth/CTA actions.</div>
      </div></div>

  <div class="section"><h2>Layout pattern</h2><p>top navigation + centered hero copy + primary CTA + layered blockchain illustration with floating stat cards + partner logo strip</p></div>
</body>
</html>
```

