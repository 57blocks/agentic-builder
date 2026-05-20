---
{"id":"DK-img-ai-7-playex","layer":"L1","kind":"design-knowledge","title":"Style Spec — ai-7-playex.png","tags":["industry:ai","source:vision-distill","image:ai-7-playex.png","manual:approved"],"source":"distill","refs":{},"createdAt":1778922785924,"updatedAt":1779235926957,"schemaVersion":1}
---

<!-- style-spec:json
{
  "industry": "ai",
  "summary": "A clean AI landing page with a soft light-gray backdrop, oversized geometric typography, and restrained black-and-white UI. The design uses subtle gradients, rounded containers, and sparse accent imagery to feel polished, modern, and approachable.",
  "vibe": [
    "minimal",
    "clean",
    "soft",
    "modern",
    "editorial"
  ],
  "palette": {
    "primary": {
      "hex": "#000000",
      "label": "jet black"
    },
    "secondary": {
      "hex": "#d9d9d9",
      "label": "mist gray"
    },
    "accent": {
      "hex": "#a23ad9",
      "label": "thumbnail purple"
    },
    "background": {
      "hex": "#ececec",
      "label": "soft light gray"
    },
    "surface": {
      "hex": "#f4f4f4",
      "label": "frosted off-white"
    },
    "text": {
      "hex": "#111111",
      "label": "near-black"
    },
    "textMuted": {
      "hex": "#7b7b7b",
      "label": "cool gray"
    },
    "border": {
      "hex": "#d6d6d6",
      "label": "light gray border"
    }
  },
  "typography": {
    "headingFont": "Inter",
    "bodyFont": "Inter",
    "headingWeight": 500,
    "bodyWeight": 400,
    "baseSizePx": 16,
    "notes": [
      "oversized hero headline",
      "clean geometric sans",
      "lightweight supporting copy"
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
    "0 1px 2px rgba(0,0,0,0.06)",
    "0 8px 24px rgba(0,0,0,0.08)"
  ],
  "gradients": [
    {
      "id": "page-bg",
      "type": "linear",
      "angleDeg": 180,
      "stops": [
        {
          "color": "#f2f2f2",
          "positionPct": 0,
          "opacity": 1
        },
        {
          "color": "#e7e7e7",
          "positionPct": 100,
          "opacity": 1
        }
      ],
      "usage": "main page background"
    },
    {
      "id": "hero-arch",
      "type": "radial",
      "angleDeg": 0,
      "stops": [
        {
          "color": "#d8d8d8",
          "positionPct": 0,
          "opacity": 1
        },
        {
          "color": "#efefef",
          "positionPct": 100,
          "opacity": 1
        }
      ],
      "usage": "large circular hero illustration backdrop"
    }
  ],
  "surfaceEffects": [
    {
      "name": "soft glass panel",
      "description": "cards and floating pills use pale translucent fills with thin borders and very soft shadows",
      "cssHints": [
        "background: rgba(255,255,255,0.55)",
        "border: 1px solid rgba(0,0,0,0.10)",
        "box-shadow: 0 8px 24px rgba(0,0,0,0.06)"
      ]
    }
  ],
  "stateTokens": [
    {
      "component": "button.primary",
      "state": "default",
      "treatment": "solid black pill button with white text and subtle shadow"
    },
    {
      "component": "button.primary",
      "state": "hover",
      "treatment": "slightly lifted black fill with stronger shadow and preserved high contrast"
    },
    {
      "component": "button.primary",
      "state": "focus",
      "treatment": "thin light-gray outer ring around the dark pill shape"
    },
    {
      "component": "input.url",
      "state": "focus",
      "treatment": "white field with darkened border and soft outer glow"
    }
  ],
  "components": {
    "button": {
      "description": "Rounded pill buttons with black fill for primary actions, white text, medium weight, and compact horizontal padding; secondary buttons use light surfaces with subtle gray borders."
    },
    "card": {
      "description": "Small floating promo and testimonial cards with off-white backgrounds, rounded corners, thin gray borders, and light drop shadows."
    },
    "input": {
      "description": "Wide rounded URL input with white fill, light border, muted placeholder text, and paired CTA button aligned inline."
    },
    "navigation": {
      "description": "Minimal top navigation with small muted links, centered logo badge, and utility actions on the right including theme icon, login, and primary CTA."
    }
  },
  "layout": "top navigation + centered hero headline and CTA + floating proof cards around a circular input module + bottom KPI strip",
  "visualElements": [
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
      "name": "left promo card",
      "col": 1,
      "row": 2,
      "zoom": 3.2
    },
    {
      "name": "url input module",
      "col": 2,
      "row": 3,
      "zoom": 2.4
    },
    {
      "name": "kpi stats strip",
      "col": 2,
      "row": 3,
      "zoom": 2.8
    }
  ],
  "imagePath": "/knowledge-refs/ai-7-playex.png",
  "imageName": "ai-7-playex.png",
  "capturedAt": "2026-05-20T00:12:06.957Z",
  "model": "openai/gpt-5.4-20260305"
}
-->

# Style Spec — ai-7-playex.png

## Style Spec (Markdown)

**Industry**: ai
**Image**: ai-7-playex.png
**Vibe**: minimal, clean, soft, modern, editorial

**Summary**: A clean AI landing page with a soft light-gray backdrop, oversized geometric typography, and restrained black-and-white UI. The design uses subtle gradients, rounded containers, and sparse accent imagery to feel polished, modern, and approachable.

### Palette
- Primary: `#000000` — jet black
- Secondary: `#d9d9d9` — mist gray
- Accent: `#a23ad9` — thumbnail purple
- Background: `#ececec` — soft light gray
- Surface: `#f4f4f4` — frosted off-white
- Text: `#111111` — near-black
- Text muted: `#7b7b7b` — cool gray
- Border: `#d6d6d6` — light gray border

### Typography
- Heading font: Inter (weight 500)
- Body font: Inter (weight 400)
- Base size: 16px
- Note: oversized hero headline
- Note: clean geometric sans
- Note: lightweight supporting copy

### Spacing & Radius
- Spacing base: 8px; scale: 4, 8, 12, 16, 24, 32, 48, 64
- Radius: sm 4px, md 10px, lg 20px, pill 999px
- Shadows: 2 variant(s)
  - `0 1px 2px rgba(0,0,0,0.06)`
  - `0 8px 24px rgba(0,0,0,0.08)`

### Gradients
- **page-bg** (linear, 180deg) — main page background
  - stop 0%: `#f2f2f2`, alpha 1
  - stop 100%: `#e7e7e7`, alpha 1
- **hero-arch** (radial) — large circular hero illustration backdrop
  - stop 0%: `#d8d8d8`, alpha 1
  - stop 100%: `#efefef`, alpha 1

### Surface Effects
- **soft glass panel**: cards and floating pills use pale translucent fills with thin borders and very soft shadows
  - `background: rgba(255,255,255,0.55)`
  - `border: 1px solid rgba(0,0,0,0.10)`
  - `box-shadow: 0 8px 24px rgba(0,0,0,0.06)`

### Interaction State Tokens
- **button.primary.default**: solid black pill button with white text and subtle shadow
- **button.primary.hover**: slightly lifted black fill with stronger shadow and preserved high contrast
- **button.primary.focus**: thin light-gray outer ring around the dark pill shape
- **input.url.focus**: white field with darkened border and soft outer glow

### Components
- **button**: Rounded pill buttons with black fill for primary actions, white text, medium weight, and compact horizontal padding; secondary buttons use light surfaces with subtle gray borders.
- **card**: Small floating promo and testimonial cards with off-white backgrounds, rounded corners, thin gray borders, and light drop shadows.
- **input**: Wide rounded URL input with white fill, light border, muted placeholder text, and paired CTA button aligned inline.
- **navigation**: Minimal top navigation with small muted links, centered logo badge, and utility actions on the right including theme icon, login, and primary CTA.

### Layout
top navigation + centered hero headline and CTA + floating proof cards around a circular input module + bottom KPI strip

### UI Elements
Named UI regions identified in the reference screenshot (col/row = 3×3 grid):
- **top navigation** — col 2, row 1, zoom 3×
- **hero headline** — col 2, row 1, zoom 2.2×
- **primary CTA** — col 2, row 2, zoom 4×
- **left promo card** — col 1, row 2, zoom 3.2×
- **url input module** — col 2, row 3, zoom 2.4×
- **kpi stats strip** — col 2, row 3, zoom 2.8×

## Style Spec (HTML)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Style Spec — ai-7-playex.png</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
    --color-primary:    #000000;
    --color-secondary:  #d9d9d9;
    --color-accent:     #a23ad9;
    --color-background: #ececec;
    --color-surface:    #f4f4f4;
    --color-text:       #111111;
    --color-text-muted: #7b7b7b;
    --color-border:     #d6d6d6;
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
    <img src="/knowledge-refs/ai-7-playex.png" alt="ai-7-playex.png">
    <div class="header__body">
      <div class="kicker">ai</div>
      <h1>ai-7-playex.png</h1>
      <p class="muted">A clean AI landing page with a soft light-gray backdrop, oversized geometric typography, and restrained black-and-white UI. The design uses subtle gradients, rounded containers, and sparse accent imagery to feel polished, modern, and approachable.</p>
      <div class="tags">
        <span class="tag">minimal</span><span class="tag">clean</span><span class="tag">soft</span><span class="tag">modern</span><span class="tag">editorial</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Palette</h2>
    <div class="palette">
    <div class="swatch">
      <div class="swatch__chip" style="background:#000000"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Primary</div>
        <div class="swatch__hex">#000000</div>
        <div class="swatch__name">jet black</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#d9d9d9"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Secondary</div>
        <div class="swatch__hex">#d9d9d9</div>
        <div class="swatch__name">mist gray</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#a23ad9"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Accent</div>
        <div class="swatch__hex">#a23ad9</div>
        <div class="swatch__name">thumbnail purple</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#ececec"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Background</div>
        <div class="swatch__hex">#ececec</div>
        <div class="swatch__name">soft light gray</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f4f4f4"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Surface</div>
        <div class="swatch__hex">#f4f4f4</div>
        <div class="swatch__name">frosted off-white</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#111111"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text</div>
        <div class="swatch__hex">#111111</div>
        <div class="swatch__name">near-black</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#7b7b7b"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text muted</div>
        <div class="swatch__hex">#7b7b7b</div>
        <div class="swatch__name">cool gray</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#d6d6d6"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Border</div>
        <div class="swatch__hex">#d6d6d6</div>
        <div class="swatch__name">light gray border</div>
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

  <div class="section"><h2>Shadows</h2><div class="shadow-card" style="box-shadow:0 1px 2px rgba(0,0,0,0.06)">0 1px 2px rgba(0,0,0,0.06)</div><div class="shadow-card" style="box-shadow:0 8px 24px rgba(0,0,0,0.08)">0 8px 24px rgba(0,0,0,0.08)</div></div>

  <div class="section">
    <h2>Gradients</h2>
    <div class="signal-grid">
      <article class="signal-card">
        <div class="signal-preview" style="background:linear-gradient(180deg, #f2f2f2 0%, #e7e7e7 100%);"></div>
        <div class="signal-title">page-bg</div>
        <div class="signal-meta">linear 180deg · main page background</div>
        <div class="signal-code">0% #f2f2f2 @1  |  100% #e7e7e7 @1</div>
      </article>
      <article class="signal-card">
        <div class="signal-preview" style="background:radial-gradient(circle at center, #d8d8d8 0%, #efefef 100%);"></div>
        <div class="signal-title">hero-arch</div>
        <div class="signal-meta">radial · large circular hero illustration backdrop</div>
        <div class="signal-code">0% #d8d8d8 @1  |  100% #efefef @1</div>
      </article></div>
  </div>

  <div class="section">
    <h2>Surface Effects</h2>
    <div class="signal-grid">
      <article class="signal-card">
        <div class="signal-title">soft glass panel</div>
        <div class="signal-meta">cards and floating pills use pale translucent fills with thin borders and very soft shadows</div>
        <div class="signal-code">background: rgba(255,255,255,0.55)<br/>border: 1px solid rgba(0,0,0,0.10)<br/>box-shadow: 0 8px 24px rgba(0,0,0,0.06)</div>
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
        <td>solid black pill button with white text and subtle shadow</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-hover">hover</span></td>
        <td>slightly lifted black fill with stronger shadow and preserved high contrast</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-focus">focus</span></td>
        <td>thin light-gray outer ring around the dark pill shape</td>
      </tr>
      <tr>
        <td>input.url</td>
        <td><span class="state-pill state-focus">focus</span></td>
        <td>white field with darkened border and soft outer glow</td>
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
            src="/knowledge-refs/ai-7-playex.png"
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
            src="/knowledge-refs/ai-7-playex.png"
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
            src="/knowledge-refs/ai-7-playex.png"
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
            src="/knowledge-refs/ai-7-playex.png"
            alt="left promo card"
            style="--ox:0%;--oy:50%;--zoom:3.2;"
            draggable="false"
          />
        </div>
        <figcaption>left promo card</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/ai-7-playex.png"
            alt="url input module"
            style="--ox:50%;--oy:100%;--zoom:2.4;"
            draggable="false"
          />
        </div>
        <figcaption>url input module</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/ai-7-playex.png"
            alt="kpi stats strip"
            style="--ox:50%;--oy:100%;--zoom:2.8;"
            draggable="false"
          />
        </div>
        <figcaption>kpi stats strip</figcaption>
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
        <div class="component__desc">Rounded pill buttons with black fill for primary actions, white text, medium weight, and compact horizontal padding; secondary buttons use light surfaces with subtle gray borders.</div>
      </div>
      <div class="component">
        <div class="component__name">card</div>
        <div class="component__desc">Small floating promo and testimonial cards with off-white backgrounds, rounded corners, thin gray borders, and light drop shadows.</div>
      </div>
      <div class="component">
        <div class="component__name">input</div>
        <div class="component__desc">Wide rounded URL input with white fill, light border, muted placeholder text, and paired CTA button aligned inline.</div>
      </div>
      <div class="component">
        <div class="component__name">navigation</div>
        <div class="component__desc">Minimal top navigation with small muted links, centered logo badge, and utility actions on the right including theme icon, login, and primary CTA.</div>
      </div></div>

  <div class="section"><h2>Layout pattern</h2><p>top navigation + centered hero headline and CTA + floating proof cards around a circular input module + bottom KPI strip</p></div>
</body>
</html>
```

