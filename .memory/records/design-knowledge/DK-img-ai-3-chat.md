---
{"id":"DK-img-ai-3-chat","layer":"L1","kind":"design-knowledge","title":"Style Spec — ai-3-chat.png","tags":["industry:ai","source:vision-distill","image:ai-3-chat.png","manual:approved"],"source":"distill","refs":{},"createdAt":1778922758186,"updatedAt":1779235871252,"schemaVersion":1}
---

<!-- style-spec:json
{
  "industry": "ai",
  "summary": "A soft, premium AI landing page with an airy neutral background, warm luminous gradients, and elegant dark pill controls. The design balances minimal typography with abstract flowing landscape waves to create a calm futuristic feel.",
  "vibe": [
    "minimal",
    "premium",
    "airy",
    "organic",
    "futuristic"
  ],
  "palette": {
    "primary": {
      "hex": "#2f302c",
      "label": "charcoal button"
    },
    "secondary": {
      "hex": "#f2d7a7",
      "label": "warm sand glow"
    },
    "accent": {
      "hex": "#ec8f2f",
      "label": "amber orange wave"
    },
    "background": {
      "hex": "#f3efeb",
      "label": "warm ivory mist"
    },
    "surface": {
      "hex": "#f6f1ec",
      "label": "soft pearl surface"
    },
    "text": {
      "hex": "#171413",
      "label": "deep near-black"
    },
    "textMuted": {
      "hex": "#7c6f67",
      "label": "muted taupe gray"
    },
    "border": {
      "hex": "#ddd1c6",
      "label": "soft warm beige line"
    }
  },
  "typography": {
    "headingFont": "Inter",
    "bodyFont": "Inter",
    "headingWeight": 500,
    "bodyWeight": 400,
    "baseSizePx": 16,
    "notes": [
      "large centered hero heading",
      "lightweight modern sans",
      "muted compact navigation labels"
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
    "0 4px 10px rgba(0,0,0,0.08)",
    "0 12px 28px rgba(0,0,0,0.22)"
  ],
  "gradients": [
    {
      "id": "page-bg",
      "type": "linear",
      "angleDeg": 180,
      "stops": [
        {
          "color": "#f5f1ec",
          "positionPct": 0,
          "opacity": 1
        },
        {
          "color": "#efe5dc",
          "positionPct": 52,
          "opacity": 1
        },
        {
          "color": "#f2d59e",
          "positionPct": 100,
          "opacity": 0.95
        }
      ],
      "usage": "overall hero background wash"
    },
    {
      "id": "wave-landscape",
      "type": "linear",
      "angleDeg": 0,
      "stops": [
        {
          "color": "#e36a34",
          "positionPct": 0,
          "opacity": 0.95
        },
        {
          "color": "#f2a53c",
          "positionPct": 44,
          "opacity": 0.95
        },
        {
          "color": "#f7d993",
          "positionPct": 100,
          "opacity": 0.85
        }
      ],
      "usage": "abstract flowing terrain illustration"
    },
    {
      "id": "lower-haze",
      "type": "linear",
      "angleDeg": 0,
      "stops": [
        {
          "color": "#b79ac5",
          "positionPct": 0,
          "opacity": 0.45
        },
        {
          "color": "#e39a8d",
          "positionPct": 52,
          "opacity": 0.35
        },
        {
          "color": "#f0c28d",
          "positionPct": 100,
          "opacity": 0.3
        }
      ],
      "usage": "soft atmospheric haze near bottom of hero"
    }
  ],
  "surfaceEffects": [
    {
      "name": "soft atmospheric blur",
      "description": "background and illustration layers use diffused glow and blur to create depth without hard edges",
      "cssHints": [
        "filter: blur(24px)",
        "background: radial-gradient(circle, rgba(242,167,76,0.28), transparent 60%)",
        "opacity: 0.8"
      ]
    },
    {
      "name": "elevated dark pill",
      "description": "buttons use a dark glossy fill with rounded pill shape and pronounced soft shadow",
      "cssHints": [
        "background: linear-gradient(180deg, rgba(62,63,58,1), rgba(40,41,38,1))",
        "border-radius: 999px",
        "box-shadow: 0 10px 24px rgba(0,0,0,0.24)"
      ]
    }
  ],
  "stateTokens": [
    {
      "component": "button.primary",
      "state": "default",
      "treatment": "dark charcoal pill with subtle glossy gradient, white text, and soft drop shadow"
    },
    {
      "component": "button.primary",
      "state": "hover",
      "treatment": "slightly lighter top highlight with stronger shadow and brighter surface sheen"
    },
    {
      "component": "button.primary",
      "state": "focus",
      "treatment": "soft warm outer ring or glow around pill boundary while preserving dark fill"
    },
    {
      "component": "navigation.item",
      "state": "default",
      "treatment": "small muted text inside pale rounded capsule background"
    },
    {
      "component": "navigation.item",
      "state": "hover",
      "treatment": "slightly darker label and stronger capsule contrast"
    }
  ],
  "components": {
    "button": {
      "description": "Rounded pill buttons with dark glossy fill, subtle icon at left, compact medium-size label, and pronounced shadow; secondary action appears as text-only link."
    },
    "card": {
      "description": "Navigation items act like mini capsule cards with soft off-white fill and minimal elevation."
    },
    "navigation": {
      "description": "Top navigation has a left-aligned logo, centered compact menu inside individual soft pills, and a right-aligned prominent CTA button."
    }
  },
  "layout": "centered hero landing page with top navigation, large headline and CTA row, abstract flowing illustration across the lower half, and client logo strip near the bottom",
  "visualElements": [
    {
      "name": "brand logo",
      "col": 1,
      "row": 1,
      "zoom": 3.5
    },
    {
      "name": "top navigation",
      "col": 2,
      "row": 1,
      "zoom": 3
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
      "name": "gradient waves",
      "col": 3,
      "row": 2,
      "zoom": 1.8
    },
    {
      "name": "client logos",
      "col": 2,
      "row": 3,
      "zoom": 2.8
    }
  ],
  "imagePath": "/knowledge-refs/ai-3-chat.png",
  "imageName": "ai-3-chat.png",
  "capturedAt": "2026-05-20T00:11:11.250Z",
  "model": "openai/gpt-5.4-20260305"
}
-->

# Style Spec — ai-3-chat.png

## Style Spec (Markdown)

**Industry**: ai
**Image**: ai-3-chat.png
**Vibe**: minimal, premium, airy, organic, futuristic

**Summary**: A soft, premium AI landing page with an airy neutral background, warm luminous gradients, and elegant dark pill controls. The design balances minimal typography with abstract flowing landscape waves to create a calm futuristic feel.

### Palette
- Primary: `#2f302c` — charcoal button
- Secondary: `#f2d7a7` — warm sand glow
- Accent: `#ec8f2f` — amber orange wave
- Background: `#f3efeb` — warm ivory mist
- Surface: `#f6f1ec` — soft pearl surface
- Text: `#171413` — deep near-black
- Text muted: `#7c6f67` — muted taupe gray
- Border: `#ddd1c6` — soft warm beige line

### Typography
- Heading font: Inter (weight 500)
- Body font: Inter (weight 400)
- Base size: 16px
- Note: large centered hero heading
- Note: lightweight modern sans
- Note: muted compact navigation labels

### Spacing & Radius
- Spacing base: 8px; scale: 4, 8, 12, 16, 24, 32, 48, 64
- Radius: sm 4px, md 8px, lg 16px, pill 999px
- Shadows: 2 variant(s)
  - `0 4px 10px rgba(0,0,0,0.08)`
  - `0 12px 28px rgba(0,0,0,0.22)`

### Gradients
- **page-bg** (linear, 180deg) — overall hero background wash
  - stop 0%: `#f5f1ec`, alpha 1
  - stop 52%: `#efe5dc`, alpha 1
  - stop 100%: `#f2d59e`, alpha 0.95
- **wave-landscape** (linear, 0deg) — abstract flowing terrain illustration
  - stop 0%: `#e36a34`, alpha 0.95
  - stop 44%: `#f2a53c`, alpha 0.95
  - stop 100%: `#f7d993`, alpha 0.85
- **lower-haze** (linear, 0deg) — soft atmospheric haze near bottom of hero
  - stop 0%: `#b79ac5`, alpha 0.45
  - stop 52%: `#e39a8d`, alpha 0.35
  - stop 100%: `#f0c28d`, alpha 0.3

### Surface Effects
- **soft atmospheric blur**: background and illustration layers use diffused glow and blur to create depth without hard edges
  - `filter: blur(24px)`
  - `background: radial-gradient(circle, rgba(242,167,76,0.28), transparent 60%)`
  - `opacity: 0.8`
- **elevated dark pill**: buttons use a dark glossy fill with rounded pill shape and pronounced soft shadow
  - `background: linear-gradient(180deg, rgba(62,63,58,1), rgba(40,41,38,1))`
  - `border-radius: 999px`
  - `box-shadow: 0 10px 24px rgba(0,0,0,0.24)`

### Interaction State Tokens
- **button.primary.default**: dark charcoal pill with subtle glossy gradient, white text, and soft drop shadow
- **button.primary.hover**: slightly lighter top highlight with stronger shadow and brighter surface sheen
- **button.primary.focus**: soft warm outer ring or glow around pill boundary while preserving dark fill
- **navigation.item.default**: small muted text inside pale rounded capsule background
- **navigation.item.hover**: slightly darker label and stronger capsule contrast

### Components
- **button**: Rounded pill buttons with dark glossy fill, subtle icon at left, compact medium-size label, and pronounced shadow; secondary action appears as text-only link.
- **card**: Navigation items act like mini capsule cards with soft off-white fill and minimal elevation.
- **navigation**: Top navigation has a left-aligned logo, centered compact menu inside individual soft pills, and a right-aligned prominent CTA button.

### Layout
centered hero landing page with top navigation, large headline and CTA row, abstract flowing illustration across the lower half, and client logo strip near the bottom

### UI Elements
Named UI regions identified in the reference screenshot (col/row = 3×3 grid):
- **brand logo** — col 1, row 1, zoom 3.5×
- **top navigation** — col 2, row 1, zoom 3×
- **hero headline** — col 2, row 1, zoom 2.2×
- **primary CTA** — col 2, row 2, zoom 4×
- **gradient waves** — col 3, row 2, zoom 1.8×
- **client logos** — col 2, row 3, zoom 2.8×

## Style Spec (HTML)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Style Spec — ai-3-chat.png</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
    --color-primary:    #2f302c;
    --color-secondary:  #f2d7a7;
    --color-accent:     #ec8f2f;
    --color-background: #f3efeb;
    --color-surface:    #f6f1ec;
    --color-text:       #171413;
    --color-text-muted: #7c6f67;
    --color-border:     #ddd1c6;
    --color-success:    #22c55e;
    --color-warning:    #f59e0b;
    --color-danger:     #ef4444;
    --font-heading: 'Inter', system-ui, sans-serif;
    --font-body:    'Inter', system-ui, sans-serif;
    --font-mono:    'JetBrains Mono', ui-monospace, monospace;
    --weight-heading: 500;
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
    <img src="/knowledge-refs/ai-3-chat.png" alt="ai-3-chat.png">
    <div class="header__body">
      <div class="kicker">ai</div>
      <h1>ai-3-chat.png</h1>
      <p class="muted">A soft, premium AI landing page with an airy neutral background, warm luminous gradients, and elegant dark pill controls. The design balances minimal typography with abstract flowing landscape waves to create a calm futuristic feel.</p>
      <div class="tags">
        <span class="tag">minimal</span><span class="tag">premium</span><span class="tag">airy</span><span class="tag">organic</span><span class="tag">futuristic</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Palette</h2>
    <div class="palette">
    <div class="swatch">
      <div class="swatch__chip" style="background:#2f302c"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Primary</div>
        <div class="swatch__hex">#2f302c</div>
        <div class="swatch__name">charcoal button</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f2d7a7"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Secondary</div>
        <div class="swatch__hex">#f2d7a7</div>
        <div class="swatch__name">warm sand glow</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#ec8f2f"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Accent</div>
        <div class="swatch__hex">#ec8f2f</div>
        <div class="swatch__name">amber orange wave</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f3efeb"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Background</div>
        <div class="swatch__hex">#f3efeb</div>
        <div class="swatch__name">warm ivory mist</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f6f1ec"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Surface</div>
        <div class="swatch__hex">#f6f1ec</div>
        <div class="swatch__name">soft pearl surface</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#171413"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text</div>
        <div class="swatch__hex">#171413</div>
        <div class="swatch__name">deep near-black</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#7c6f67"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text muted</div>
        <div class="swatch__hex">#7c6f67</div>
        <div class="swatch__name">muted taupe gray</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#ddd1c6"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Border</div>
        <div class="swatch__hex">#ddd1c6</div>
        <div class="swatch__name">soft warm beige line</div>
      </div>
    </div></div>
  </div>

  <div class="section grid-2">
    <div>
      <h2>Typography</h2>
      <div class="type-stack">
        <h3 style="font-size: 2rem;">Heading — Inter 500</h3>
        <h3 style="font-size: 1.4rem;">Subhead — Inter 500</h3>
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

  <div class="section"><h2>Shadows</h2><div class="shadow-card" style="box-shadow:0 4px 10px rgba(0,0,0,0.08)">0 4px 10px rgba(0,0,0,0.08)</div><div class="shadow-card" style="box-shadow:0 12px 28px rgba(0,0,0,0.22)">0 12px 28px rgba(0,0,0,0.22)</div></div>

  <div class="section">
    <h2>Gradients</h2>
    <div class="signal-grid">
      <article class="signal-card">
        <div class="signal-preview" style="background:linear-gradient(180deg, #f5f1ec 0%, #efe5dc 52%, rgba(242, 213, 158, 0.95) 100%);"></div>
        <div class="signal-title">page-bg</div>
        <div class="signal-meta">linear 180deg · overall hero background wash</div>
        <div class="signal-code">0% #f5f1ec @1  |  52% #efe5dc @1  |  100% #f2d59e @0.95</div>
      </article>
      <article class="signal-card">
        <div class="signal-preview" style="background:linear-gradient(0deg, rgba(227, 106, 52, 0.95) 0%, rgba(242, 165, 60, 0.95) 44%, rgba(247, 217, 147, 0.85) 100%);"></div>
        <div class="signal-title">wave-landscape</div>
        <div class="signal-meta">linear 0deg · abstract flowing terrain illustration</div>
        <div class="signal-code">0% #e36a34 @0.95  |  44% #f2a53c @0.95  |  100% #f7d993 @0.85</div>
      </article>
      <article class="signal-card">
        <div class="signal-preview" style="background:linear-gradient(0deg, rgba(183, 154, 197, 0.45) 0%, rgba(227, 154, 141, 0.35) 52%, rgba(240, 194, 141, 0.3) 100%);"></div>
        <div class="signal-title">lower-haze</div>
        <div class="signal-meta">linear 0deg · soft atmospheric haze near bottom of hero</div>
        <div class="signal-code">0% #b79ac5 @0.45  |  52% #e39a8d @0.35  |  100% #f0c28d @0.3</div>
      </article></div>
  </div>

  <div class="section">
    <h2>Surface Effects</h2>
    <div class="signal-grid">
      <article class="signal-card">
        <div class="signal-title">soft atmospheric blur</div>
        <div class="signal-meta">background and illustration layers use diffused glow and blur to create depth without hard edges</div>
        <div class="signal-code">filter: blur(24px)<br/>background: radial-gradient(circle, rgba(242,167,76,0.28), transparent 60%)<br/>opacity: 0.8</div>
      </article>
      <article class="signal-card">
        <div class="signal-title">elevated dark pill</div>
        <div class="signal-meta">buttons use a dark glossy fill with rounded pill shape and pronounced soft shadow</div>
        <div class="signal-code">background: linear-gradient(180deg, rgba(62,63,58,1), rgba(40,41,38,1))<br/>border-radius: 999px<br/>box-shadow: 0 10px 24px rgba(0,0,0,0.24)</div>
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
        <td>dark charcoal pill with subtle glossy gradient, white text, and soft drop shadow</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-hover">hover</span></td>
        <td>slightly lighter top highlight with stronger shadow and brighter surface sheen</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-focus">focus</span></td>
        <td>soft warm outer ring or glow around pill boundary while preserving dark fill</td>
      </tr>
      <tr>
        <td>navigation.item</td>
        <td><span class="state-pill state-default">default</span></td>
        <td>small muted text inside pale rounded capsule background</td>
      </tr>
      <tr>
        <td>navigation.item</td>
        <td><span class="state-pill state-hover">hover</span></td>
        <td>slightly darker label and stronger capsule contrast</td>
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
            src="/knowledge-refs/ai-3-chat.png"
            alt="brand logo"
            style="--ox:0%;--oy:0%;--zoom:3.5;"
            draggable="false"
          />
        </div>
        <figcaption>brand logo</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/ai-3-chat.png"
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
            src="/knowledge-refs/ai-3-chat.png"
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
            src="/knowledge-refs/ai-3-chat.png"
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
            src="/knowledge-refs/ai-3-chat.png"
            alt="gradient waves"
            style="--ox:100%;--oy:50%;--zoom:1.8;"
            draggable="false"
          />
        </div>
        <figcaption>gradient waves</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/ai-3-chat.png"
            alt="client logos"
            style="--ox:50%;--oy:100%;--zoom:2.8;"
            draggable="false"
          />
        </div>
        <figcaption>client logos</figcaption>
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
        <div class="component__desc">Rounded pill buttons with dark glossy fill, subtle icon at left, compact medium-size label, and pronounced shadow; secondary action appears as text-only link.</div>
      </div>
      <div class="component">
        <div class="component__name">card</div>
        <div class="component__desc">Navigation items act like mini capsule cards with soft off-white fill and minimal elevation.</div>
      </div>
      <div class="component">
        <div class="component__name">navigation</div>
        <div class="component__desc">Top navigation has a left-aligned logo, centered compact menu inside individual soft pills, and a right-aligned prominent CTA button.</div>
      </div></div>

  <div class="section"><h2>Layout pattern</h2><p>centered hero landing page with top navigation, large headline and CTA row, abstract flowing illustration across the lower half, and client logo strip near the bottom</p></div>
</body>
</html>
```

