---
{"id":"DK-img-ai-7-seto","layer":"L1","kind":"design-knowledge","title":"Style Spec — ai-7-seto.png","tags":["industry:ai","source:vision-distill","image:ai-7-seto.png","manual:approved"],"source":"distill","refs":{},"createdAt":1778922794625,"updatedAt":1779235941661,"schemaVersion":1}
---

<!-- style-spec:json
{
  "industry": "ai",
  "summary": "A clean, airy AI landing page with a monochrome base, oversized typography, and sparse interface elements accented by subtle card imagery. The design feels premium and minimalist, relying on generous whitespace, soft gray surfaces, and high-contrast black CTAs.",
  "vibe": [
    "minimal",
    "clean",
    "premium",
    "airy",
    "editorial"
  ],
  "palette": {
    "primary": {
      "hex": "#000000",
      "label": "jet black"
    },
    "secondary": {
      "hex": "#d9d9d9",
      "label": "soft gray"
    },
    "accent": {
      "hex": "#c34bc8",
      "label": "thumbnail magenta"
    },
    "background": {
      "hex": "#f3f3f3",
      "label": "light gray canvas"
    },
    "surface": {
      "hex": "#ffffff",
      "label": "white panel"
    },
    "text": {
      "hex": "#111111",
      "label": "near-black text"
    },
    "textMuted": {
      "hex": "#7d7d7d",
      "label": "muted gray"
    },
    "border": {
      "hex": "#dfdfdf",
      "label": "light border"
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
      "lightweight geometric sans styling",
      "muted supporting copy"
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
    "0 1px 2px rgba(0,0,0,0.04)",
    "0 10px 30px rgba(0,0,0,0.06)"
  ],
  "gradients": [
    {
      "id": "hero-arch",
      "type": "radial",
      "angleDeg": 180,
      "stops": [
        {
          "color": "#dcdcdc",
          "positionPct": 0,
          "opacity": 1
        },
        {
          "color": "#ebebeb",
          "positionPct": 58,
          "opacity": 1
        },
        {
          "color": "#f3f3f3",
          "positionPct": 100,
          "opacity": 1
        }
      ],
      "usage": "large semicircle hero backdrop behind URL form"
    }
  ],
  "surfaceEffects": [
    {
      "name": "soft-card",
      "description": "small floating cards use white fill, thin gray border, and subtle soft shadow",
      "cssHints": [
        "background: rgba(255,255,255,0.92)",
        "border: 1px solid rgba(0,0,0,0.08)",
        "box-shadow: 0 8px 24px rgba(0,0,0,0.06)"
      ]
    }
  ],
  "stateTokens": [
    {
      "component": "button.primary",
      "state": "default",
      "treatment": "solid black fill with white text and rounded rectangle shape"
    },
    {
      "component": "button.primary",
      "state": "hover",
      "treatment": "slightly lifted dark button with stronger shadow and subtly lighter black surface"
    },
    {
      "component": "button.primary",
      "state": "focus",
      "treatment": "thin light-gray outer ring around the dark button"
    },
    {
      "component": "input.url",
      "state": "default",
      "treatment": "white field with light gray border and muted placeholder text"
    },
    {
      "component": "input.url",
      "state": "focus",
      "treatment": "higher contrast border with faint outer glow on white surface"
    }
  ],
  "components": {
    "button": {
      "description": "Primary actions are compact rounded rectangular buttons with black fill, white label text, and minimal iconography; secondary actions are ghost or outlined buttons on white."
    },
    "card": {
      "description": "Floating promotional cards are small white rounded panels with thin borders, soft shadows, and embedded thumbnail imagery."
    },
    "input": {
      "description": "Single-line URL input uses a white background, light border, pill-like rounded corners, and inline placement beside a dark generate button."
    },
    "navigation": {
      "description": "Top navigation is a slim horizontal bar with small muted text links, a centered logo tab, theme toggle icon, and right-aligned auth buttons."
    }
  },
  "layout": "centered marketing hero with top navigation, oversized headline, supporting CTA, floating sample cards, semicircular generator module, and bottom KPI stats bar",
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
      "name": "sample thumbnail card",
      "col": 1,
      "row": 3,
      "zoom": 3.2
    },
    {
      "name": "url input form",
      "col": 2,
      "row": 3,
      "zoom": 2.8
    },
    {
      "name": "stats strip",
      "col": 2,
      "row": 3,
      "zoom": 2.4
    }
  ],
  "imagePath": "/knowledge-refs/ai-7-seto.png",
  "imageName": "ai-7-seto.png",
  "capturedAt": "2026-05-20T00:12:21.660Z",
  "model": "openai/gpt-5.4-20260305"
}
-->

# Style Spec — ai-7-seto.png

## Style Spec (Markdown)

**Industry**: ai
**Image**: ai-7-seto.png
**Vibe**: minimal, clean, premium, airy, editorial

**Summary**: A clean, airy AI landing page with a monochrome base, oversized typography, and sparse interface elements accented by subtle card imagery. The design feels premium and minimalist, relying on generous whitespace, soft gray surfaces, and high-contrast black CTAs.

### Palette
- Primary: `#000000` — jet black
- Secondary: `#d9d9d9` — soft gray
- Accent: `#c34bc8` — thumbnail magenta
- Background: `#f3f3f3` — light gray canvas
- Surface: `#ffffff` — white panel
- Text: `#111111` — near-black text
- Text muted: `#7d7d7d` — muted gray
- Border: `#dfdfdf` — light border

### Typography
- Heading font: Inter (weight 500)
- Body font: Inter (weight 400)
- Base size: 16px
- Note: oversized hero headline
- Note: lightweight geometric sans styling
- Note: muted supporting copy

### Spacing & Radius
- Spacing base: 8px; scale: 4, 8, 12, 16, 24, 32, 48, 64
- Radius: sm 6px, md 12px, lg 24px, pill 999px
- Shadows: 2 variant(s)
  - `0 1px 2px rgba(0,0,0,0.04)`
  - `0 10px 30px rgba(0,0,0,0.06)`

### Gradients
- **hero-arch** (radial) — large semicircle hero backdrop behind URL form
  - stop 0%: `#dcdcdc`, alpha 1
  - stop 58%: `#ebebeb`, alpha 1
  - stop 100%: `#f3f3f3`, alpha 1

### Surface Effects
- **soft-card**: small floating cards use white fill, thin gray border, and subtle soft shadow
  - `background: rgba(255,255,255,0.92)`
  - `border: 1px solid rgba(0,0,0,0.08)`
  - `box-shadow: 0 8px 24px rgba(0,0,0,0.06)`

### Interaction State Tokens
- **button.primary.default**: solid black fill with white text and rounded rectangle shape
- **button.primary.hover**: slightly lifted dark button with stronger shadow and subtly lighter black surface
- **button.primary.focus**: thin light-gray outer ring around the dark button
- **input.url.default**: white field with light gray border and muted placeholder text
- **input.url.focus**: higher contrast border with faint outer glow on white surface

### Components
- **button**: Primary actions are compact rounded rectangular buttons with black fill, white label text, and minimal iconography; secondary actions are ghost or outlined buttons on white.
- **card**: Floating promotional cards are small white rounded panels with thin borders, soft shadows, and embedded thumbnail imagery.
- **input**: Single-line URL input uses a white background, light border, pill-like rounded corners, and inline placement beside a dark generate button.
- **navigation**: Top navigation is a slim horizontal bar with small muted text links, a centered logo tab, theme toggle icon, and right-aligned auth buttons.

### Layout
centered marketing hero with top navigation, oversized headline, supporting CTA, floating sample cards, semicircular generator module, and bottom KPI stats bar

### UI Elements
Named UI regions identified in the reference screenshot (col/row = 3×3 grid):
- **top navigation** — col 2, row 1, zoom 3×
- **hero headline** — col 2, row 1, zoom 2.2×
- **primary CTA** — col 2, row 2, zoom 4×
- **sample thumbnail card** — col 1, row 3, zoom 3.2×
- **url input form** — col 2, row 3, zoom 2.8×
- **stats strip** — col 2, row 3, zoom 2.4×

## Style Spec (HTML)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Style Spec — ai-7-seto.png</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
    --color-primary:    #000000;
    --color-secondary:  #d9d9d9;
    --color-accent:     #c34bc8;
    --color-background: #f3f3f3;
    --color-surface:    #ffffff;
    --color-text:       #111111;
    --color-text-muted: #7d7d7d;
    --color-border:     #dfdfdf;
    --color-success:    #22c55e;
    --color-warning:    #f59e0b;
    --color-danger:     #ef4444;
    --font-heading: 'Inter', system-ui, sans-serif;
    --font-body:    'Inter', system-ui, sans-serif;
    --font-mono:    'JetBrains Mono', ui-monospace, monospace;
    --weight-heading: 500;
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
    <img src="/knowledge-refs/ai-7-seto.png" alt="ai-7-seto.png">
    <div class="header__body">
      <div class="kicker">ai</div>
      <h1>ai-7-seto.png</h1>
      <p class="muted">A clean, airy AI landing page with a monochrome base, oversized typography, and sparse interface elements accented by subtle card imagery. The design feels premium and minimalist, relying on generous whitespace, soft gray surfaces, and high-contrast black CTAs.</p>
      <div class="tags">
        <span class="tag">minimal</span><span class="tag">clean</span><span class="tag">premium</span><span class="tag">airy</span><span class="tag">editorial</span>
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
        <div class="swatch__name">soft gray</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#c34bc8"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Accent</div>
        <div class="swatch__hex">#c34bc8</div>
        <div class="swatch__name">thumbnail magenta</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f3f3f3"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Background</div>
        <div class="swatch__hex">#f3f3f3</div>
        <div class="swatch__name">light gray canvas</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#ffffff"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Surface</div>
        <div class="swatch__hex">#ffffff</div>
        <div class="swatch__name">white panel</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#111111"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text</div>
        <div class="swatch__hex">#111111</div>
        <div class="swatch__name">near-black text</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#7d7d7d"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text muted</div>
        <div class="swatch__hex">#7d7d7d</div>
        <div class="swatch__name">muted gray</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#dfdfdf"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Border</div>
        <div class="swatch__hex">#dfdfdf</div>
        <div class="swatch__name">light border</div>
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

  <div class="section"><h2>Shadows</h2><div class="shadow-card" style="box-shadow:0 1px 2px rgba(0,0,0,0.04)">0 1px 2px rgba(0,0,0,0.04)</div><div class="shadow-card" style="box-shadow:0 10px 30px rgba(0,0,0,0.06)">0 10px 30px rgba(0,0,0,0.06)</div></div>

  <div class="section">
    <h2>Gradients</h2>
    <div class="signal-grid">
      <article class="signal-card">
        <div class="signal-preview" style="background:radial-gradient(circle at center, #dcdcdc 0%, #ebebeb 58%, #f3f3f3 100%);"></div>
        <div class="signal-title">hero-arch</div>
        <div class="signal-meta">radial · large semicircle hero backdrop behind URL form</div>
        <div class="signal-code">0% #dcdcdc @1  |  58% #ebebeb @1  |  100% #f3f3f3 @1</div>
      </article></div>
  </div>

  <div class="section">
    <h2>Surface Effects</h2>
    <div class="signal-grid">
      <article class="signal-card">
        <div class="signal-title">soft-card</div>
        <div class="signal-meta">small floating cards use white fill, thin gray border, and subtle soft shadow</div>
        <div class="signal-code">background: rgba(255,255,255,0.92)<br/>border: 1px solid rgba(0,0,0,0.08)<br/>box-shadow: 0 8px 24px rgba(0,0,0,0.06)</div>
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
        <td>solid black fill with white text and rounded rectangle shape</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-hover">hover</span></td>
        <td>slightly lifted dark button with stronger shadow and subtly lighter black surface</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-focus">focus</span></td>
        <td>thin light-gray outer ring around the dark button</td>
      </tr>
      <tr>
        <td>input.url</td>
        <td><span class="state-pill state-default">default</span></td>
        <td>white field with light gray border and muted placeholder text</td>
      </tr>
      <tr>
        <td>input.url</td>
        <td><span class="state-pill state-focus">focus</span></td>
        <td>higher contrast border with faint outer glow on white surface</td>
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
            src="/knowledge-refs/ai-7-seto.png"
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
            src="/knowledge-refs/ai-7-seto.png"
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
            src="/knowledge-refs/ai-7-seto.png"
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
            src="/knowledge-refs/ai-7-seto.png"
            alt="sample thumbnail card"
            style="--ox:0%;--oy:100%;--zoom:3.2;"
            draggable="false"
          />
        </div>
        <figcaption>sample thumbnail card</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/ai-7-seto.png"
            alt="url input form"
            style="--ox:50%;--oy:100%;--zoom:2.8;"
            draggable="false"
          />
        </div>
        <figcaption>url input form</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/ai-7-seto.png"
            alt="stats strip"
            style="--ox:50%;--oy:100%;--zoom:2.4;"
            draggable="false"
          />
        </div>
        <figcaption>stats strip</figcaption>
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
        <div class="component__desc">Primary actions are compact rounded rectangular buttons with black fill, white label text, and minimal iconography; secondary actions are ghost or outlined buttons on white.</div>
      </div>
      <div class="component">
        <div class="component__name">card</div>
        <div class="component__desc">Floating promotional cards are small white rounded panels with thin borders, soft shadows, and embedded thumbnail imagery.</div>
      </div>
      <div class="component">
        <div class="component__name">input</div>
        <div class="component__desc">Single-line URL input uses a white background, light border, pill-like rounded corners, and inline placement beside a dark generate button.</div>
      </div>
      <div class="component">
        <div class="component__name">navigation</div>
        <div class="component__desc">Top navigation is a slim horizontal bar with small muted text links, a centered logo tab, theme toggle icon, and right-aligned auth buttons.</div>
      </div></div>

  <div class="section"><h2>Layout pattern</h2><p>centered marketing hero with top navigation, oversized headline, supporting CTA, floating sample cards, semicircular generator module, and bottom KPI stats bar</p></div>
</body>
</html>
```

