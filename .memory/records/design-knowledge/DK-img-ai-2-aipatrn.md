---
{"id":"DK-img-ai-2-aipatrn","layer":"L1","kind":"design-knowledge","title":"Style Spec — ai-2-aipatrn.png","tags":["industry:ai","source:vision-distill","image:ai-2-aipatrn.png","manual:approved"],"source":"distill","refs":{},"createdAt":1778922749279,"updatedAt":1779235849090,"schemaVersion":1}
---

<!-- style-spec:json
{
  "industry": "ai",
  "summary": "A minimalist AI landing page with oversized editorial typography, soft neutral backgrounds, and vibrant gradient-driven showcase panels. The design mixes clean whitespace with futuristic abstract pattern imagery and understated UI chrome.",
  "vibe": [
    "minimal",
    "futuristic",
    "editorial",
    "airy",
    "premium"
  ],
  "palette": {
    "primary": {
      "hex": "#171634",
      "label": "deep navy"
    },
    "secondary": {
      "hex": "#d9d9dd",
      "label": "light gray"
    },
    "accent": {
      "hex": "#ea5bf0",
      "label": "electric magenta"
    },
    "background": {
      "hex": "#f2f2f4",
      "label": "soft off-white"
    },
    "surface": {
      "hex": "#ebebed",
      "label": "mist gray"
    },
    "text": {
      "hex": "#171634",
      "label": "ink navy"
    },
    "textMuted": {
      "hex": "#8d8a94",
      "label": "muted lavender gray"
    },
    "border": {
      "hex": "#d7d7dc",
      "label": "soft cool gray"
    }
  },
  "typography": {
    "headingFont": "Inter",
    "bodyFont": "Inter",
    "headingWeight": 600,
    "bodyWeight": 400,
    "baseSizePx": 16,
    "notes": [
      "oversized hero headline",
      "clean neo-grotesk sans",
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
    "mdPx": 8,
    "lgPx": 16,
    "pillPx": 999
  },
  "shadows": [
    "0 1px 2px rgba(23,22,52,0.04)",
    "0 8px 24px rgba(23,22,52,0.08)"
  ],
  "gradients": [
    {
      "id": "showcase-card-warm",
      "type": "linear",
      "angleDeg": 135,
      "stops": [
        {
          "color": "#fff3d6",
          "positionPct": 0,
          "opacity": 1
        },
        {
          "color": "#ff8a6a",
          "positionPct": 40,
          "opacity": 0.95
        },
        {
          "color": "#ff4fa0",
          "positionPct": 72,
          "opacity": 0.95
        },
        {
          "color": "#ff8c2f",
          "positionPct": 100,
          "opacity": 0.9
        }
      ],
      "usage": "middle showcase card background"
    },
    {
      "id": "showcase-card-cool",
      "type": "linear",
      "angleDeg": 0,
      "stops": [
        {
          "color": "#f5f1ff",
          "positionPct": 0,
          "opacity": 1
        },
        {
          "color": "#ea73ff",
          "positionPct": 38,
          "opacity": 0.9
        },
        {
          "color": "#8d5bff",
          "positionPct": 68,
          "opacity": 0.92
        },
        {
          "color": "#9bc7ff",
          "positionPct": 100,
          "opacity": 0.95
        }
      ],
      "usage": "right showcase card background"
    },
    {
      "id": "page-bg-soft",
      "type": "linear",
      "angleDeg": 180,
      "stops": [
        {
          "color": "#f5f5f6",
          "positionPct": 0,
          "opacity": 1
        },
        {
          "color": "#efeff1",
          "positionPct": 100,
          "opacity": 1
        }
      ],
      "usage": "main page background"
    }
  ],
  "surfaceEffects": [
    {
      "name": "soft blur abstraction",
      "description": "showcase imagery uses blurred prismatic gradients and ribbed distortion to create AI-generated pattern visuals",
      "cssHints": [
        "filter: blur(0px)",
        "background: linear-gradient(...)",
        "mask-image: repeating-linear-gradient(...)"
      ]
    },
    {
      "name": "subtle line art",
      "description": "hero area includes faint curved line drawings and starburst marks over a pale background",
      "cssHints": [
        "border-color: rgba(23,22,52,0.08)",
        "opacity: 0.5"
      ]
    }
  ],
  "stateTokens": [
    {
      "component": "button.primary",
      "state": "default",
      "treatment": "solid deep navy pill button with white uppercase text and no visible border"
    },
    {
      "component": "button.primary",
      "state": "hover",
      "treatment": "slightly brighter navy fill with stronger contrast and subtle lift shadow"
    },
    {
      "component": "button.primary",
      "state": "focus",
      "treatment": "thin soft gray outer ring around pill button"
    },
    {
      "component": "navigation.item",
      "state": "default",
      "treatment": "small muted gray text on clean background"
    },
    {
      "component": "navigation.item",
      "state": "active",
      "treatment": "darker text weight for the current page link"
    }
  ],
  "components": {
    "button": {
      "description": "Rounded pill CTAs with compact height, uppercase text, and dark solid fill; secondary pill appears as a light outlined menu control."
    },
    "card": {
      "description": "Large edge-to-edge showcase tiles arranged in a three-column strip, each with abstract imagery, small circular index badge, and overlaid content near the bottom."
    },
    "navigation": {
      "description": "Minimal top navigation with small text links split into two columns and a pill-shaped menu button aligned right."
    }
  },
  "layout": "minimal top navigation + oversized left-aligned hero copy + inline CTA/subtext + three-column visual showcase grid",
  "visualElements": [
    {
      "name": "brand wordmark",
      "col": 1,
      "row": 1,
      "zoom": 4
    },
    {
      "name": "hero headline",
      "col": 1,
      "row": 1,
      "zoom": 2.2
    },
    {
      "name": "top navigation",
      "col": 3,
      "row": 1,
      "zoom": 3
    },
    {
      "name": "primary CTA",
      "col": 2,
      "row": 2,
      "zoom": 4
    },
    {
      "name": "warm gradient card",
      "col": 2,
      "row": 3,
      "zoom": 2.4
    },
    {
      "name": "cool showcase card",
      "col": 3,
      "row": 3,
      "zoom": 2.1
    }
  ],
  "imagePath": "/knowledge-refs/ai-2-aipatrn.png",
  "imageName": "ai-2-aipatrn.png",
  "capturedAt": "2026-05-20T00:10:49.087Z",
  "model": "openai/gpt-5.4-20260305"
}
-->

# Style Spec — ai-2-aipatrn.png

## Style Spec (Markdown)

**Industry**: ai
**Image**: ai-2-aipatrn.png
**Vibe**: minimal, futuristic, editorial, airy, premium

**Summary**: A minimalist AI landing page with oversized editorial typography, soft neutral backgrounds, and vibrant gradient-driven showcase panels. The design mixes clean whitespace with futuristic abstract pattern imagery and understated UI chrome.

### Palette
- Primary: `#171634` — deep navy
- Secondary: `#d9d9dd` — light gray
- Accent: `#ea5bf0` — electric magenta
- Background: `#f2f2f4` — soft off-white
- Surface: `#ebebed` — mist gray
- Text: `#171634` — ink navy
- Text muted: `#8d8a94` — muted lavender gray
- Border: `#d7d7dc` — soft cool gray

### Typography
- Heading font: Inter (weight 600)
- Body font: Inter (weight 400)
- Base size: 16px
- Note: oversized hero headline
- Note: clean neo-grotesk sans
- Note: lightweight supporting copy

### Spacing & Radius
- Spacing base: 8px; scale: 4, 8, 12, 16, 24, 32, 48, 64
- Radius: sm 4px, md 8px, lg 16px, pill 999px
- Shadows: 2 variant(s)
  - `0 1px 2px rgba(23,22,52,0.04)`
  - `0 8px 24px rgba(23,22,52,0.08)`

### Gradients
- **showcase-card-warm** (linear, 135deg) — middle showcase card background
  - stop 0%: `#fff3d6`, alpha 1
  - stop 40%: `#ff8a6a`, alpha 0.95
  - stop 72%: `#ff4fa0`, alpha 0.95
  - stop 100%: `#ff8c2f`, alpha 0.9
- **showcase-card-cool** (linear, 0deg) — right showcase card background
  - stop 0%: `#f5f1ff`, alpha 1
  - stop 38%: `#ea73ff`, alpha 0.9
  - stop 68%: `#8d5bff`, alpha 0.92
  - stop 100%: `#9bc7ff`, alpha 0.95
- **page-bg-soft** (linear, 180deg) — main page background
  - stop 0%: `#f5f5f6`, alpha 1
  - stop 100%: `#efeff1`, alpha 1

### Surface Effects
- **soft blur abstraction**: showcase imagery uses blurred prismatic gradients and ribbed distortion to create AI-generated pattern visuals
  - `filter: blur(0px)`
  - `background: linear-gradient(...)`
  - `mask-image: repeating-linear-gradient(...)`
- **subtle line art**: hero area includes faint curved line drawings and starburst marks over a pale background
  - `border-color: rgba(23,22,52,0.08)`
  - `opacity: 0.5`

### Interaction State Tokens
- **button.primary.default**: solid deep navy pill button with white uppercase text and no visible border
- **button.primary.hover**: slightly brighter navy fill with stronger contrast and subtle lift shadow
- **button.primary.focus**: thin soft gray outer ring around pill button
- **navigation.item.default**: small muted gray text on clean background
- **navigation.item.active**: darker text weight for the current page link

### Components
- **button**: Rounded pill CTAs with compact height, uppercase text, and dark solid fill; secondary pill appears as a light outlined menu control.
- **card**: Large edge-to-edge showcase tiles arranged in a three-column strip, each with abstract imagery, small circular index badge, and overlaid content near the bottom.
- **navigation**: Minimal top navigation with small text links split into two columns and a pill-shaped menu button aligned right.

### Layout
minimal top navigation + oversized left-aligned hero copy + inline CTA/subtext + three-column visual showcase grid

### UI Elements
Named UI regions identified in the reference screenshot (col/row = 3×3 grid):
- **brand wordmark** — col 1, row 1, zoom 4×
- **hero headline** — col 1, row 1, zoom 2.2×
- **top navigation** — col 3, row 1, zoom 3×
- **primary CTA** — col 2, row 2, zoom 4×
- **warm gradient card** — col 2, row 3, zoom 2.4×
- **cool showcase card** — col 3, row 3, zoom 2.1×

## Style Spec (HTML)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Style Spec — ai-2-aipatrn.png</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
    --color-primary:    #171634;
    --color-secondary:  #d9d9dd;
    --color-accent:     #ea5bf0;
    --color-background: #f2f2f4;
    --color-surface:    #ebebed;
    --color-text:       #171634;
    --color-text-muted: #8d8a94;
    --color-border:     #d7d7dc;
    --color-success:    #22c55e;
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
    <img src="/knowledge-refs/ai-2-aipatrn.png" alt="ai-2-aipatrn.png">
    <div class="header__body">
      <div class="kicker">ai</div>
      <h1>ai-2-aipatrn.png</h1>
      <p class="muted">A minimalist AI landing page with oversized editorial typography, soft neutral backgrounds, and vibrant gradient-driven showcase panels. The design mixes clean whitespace with futuristic abstract pattern imagery and understated UI chrome.</p>
      <div class="tags">
        <span class="tag">minimal</span><span class="tag">futuristic</span><span class="tag">editorial</span><span class="tag">airy</span><span class="tag">premium</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Palette</h2>
    <div class="palette">
    <div class="swatch">
      <div class="swatch__chip" style="background:#171634"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Primary</div>
        <div class="swatch__hex">#171634</div>
        <div class="swatch__name">deep navy</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#d9d9dd"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Secondary</div>
        <div class="swatch__hex">#d9d9dd</div>
        <div class="swatch__name">light gray</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#ea5bf0"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Accent</div>
        <div class="swatch__hex">#ea5bf0</div>
        <div class="swatch__name">electric magenta</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f2f2f4"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Background</div>
        <div class="swatch__hex">#f2f2f4</div>
        <div class="swatch__name">soft off-white</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#ebebed"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Surface</div>
        <div class="swatch__hex">#ebebed</div>
        <div class="swatch__name">mist gray</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#171634"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text</div>
        <div class="swatch__hex">#171634</div>
        <div class="swatch__name">ink navy</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#8d8a94"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text muted</div>
        <div class="swatch__hex">#8d8a94</div>
        <div class="swatch__name">muted lavender gray</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#d7d7dc"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Border</div>
        <div class="swatch__hex">#d7d7dc</div>
        <div class="swatch__name">soft cool gray</div>
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

  <div class="section"><h2>Shadows</h2><div class="shadow-card" style="box-shadow:0 1px 2px rgba(23,22,52,0.04)">0 1px 2px rgba(23,22,52,0.04)</div><div class="shadow-card" style="box-shadow:0 8px 24px rgba(23,22,52,0.08)">0 8px 24px rgba(23,22,52,0.08)</div></div>

  <div class="section">
    <h2>Gradients</h2>
    <div class="signal-grid">
      <article class="signal-card">
        <div class="signal-preview" style="background:linear-gradient(135deg, #fff3d6 0%, rgba(255, 138, 106, 0.95) 40%, rgba(255, 79, 160, 0.95) 72%, rgba(255, 140, 47, 0.9) 100%);"></div>
        <div class="signal-title">showcase-card-warm</div>
        <div class="signal-meta">linear 135deg · middle showcase card background</div>
        <div class="signal-code">0% #fff3d6 @1  |  40% #ff8a6a @0.95  |  72% #ff4fa0 @0.95  |  100% #ff8c2f @0.9</div>
      </article>
      <article class="signal-card">
        <div class="signal-preview" style="background:linear-gradient(0deg, #f5f1ff 0%, rgba(234, 115, 255, 0.9) 38%, rgba(141, 91, 255, 0.92) 68%, rgba(155, 199, 255, 0.95) 100%);"></div>
        <div class="signal-title">showcase-card-cool</div>
        <div class="signal-meta">linear 0deg · right showcase card background</div>
        <div class="signal-code">0% #f5f1ff @1  |  38% #ea73ff @0.9  |  68% #8d5bff @0.92  |  100% #9bc7ff @0.95</div>
      </article>
      <article class="signal-card">
        <div class="signal-preview" style="background:linear-gradient(180deg, #f5f5f6 0%, #efeff1 100%);"></div>
        <div class="signal-title">page-bg-soft</div>
        <div class="signal-meta">linear 180deg · main page background</div>
        <div class="signal-code">0% #f5f5f6 @1  |  100% #efeff1 @1</div>
      </article></div>
  </div>

  <div class="section">
    <h2>Surface Effects</h2>
    <div class="signal-grid">
      <article class="signal-card">
        <div class="signal-title">soft blur abstraction</div>
        <div class="signal-meta">showcase imagery uses blurred prismatic gradients and ribbed distortion to create AI-generated pattern visuals</div>
        <div class="signal-code">filter: blur(0px)<br/>background: linear-gradient(...)<br/>mask-image: repeating-linear-gradient(...)</div>
      </article>
      <article class="signal-card">
        <div class="signal-title">subtle line art</div>
        <div class="signal-meta">hero area includes faint curved line drawings and starburst marks over a pale background</div>
        <div class="signal-code">border-color: rgba(23,22,52,0.08)<br/>opacity: 0.5</div>
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
        <td>solid deep navy pill button with white uppercase text and no visible border</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-hover">hover</span></td>
        <td>slightly brighter navy fill with stronger contrast and subtle lift shadow</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-focus">focus</span></td>
        <td>thin soft gray outer ring around pill button</td>
      </tr>
      <tr>
        <td>navigation.item</td>
        <td><span class="state-pill state-default">default</span></td>
        <td>small muted gray text on clean background</td>
      </tr>
      <tr>
        <td>navigation.item</td>
        <td><span class="state-pill state-active">active</span></td>
        <td>darker text weight for the current page link</td>
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
            src="/knowledge-refs/ai-2-aipatrn.png"
            alt="brand wordmark"
            style="--ox:0%;--oy:0%;--zoom:4;"
            draggable="false"
          />
        </div>
        <figcaption>brand wordmark</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/ai-2-aipatrn.png"
            alt="hero headline"
            style="--ox:0%;--oy:0%;--zoom:2.2;"
            draggable="false"
          />
        </div>
        <figcaption>hero headline</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/ai-2-aipatrn.png"
            alt="top navigation"
            style="--ox:100%;--oy:0%;--zoom:3;"
            draggable="false"
          />
        </div>
        <figcaption>top navigation</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/ai-2-aipatrn.png"
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
            src="/knowledge-refs/ai-2-aipatrn.png"
            alt="warm gradient card"
            style="--ox:50%;--oy:100%;--zoom:2.4;"
            draggable="false"
          />
        </div>
        <figcaption>warm gradient card</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/ai-2-aipatrn.png"
            alt="cool showcase card"
            style="--ox:100%;--oy:100%;--zoom:2.1;"
            draggable="false"
          />
        </div>
        <figcaption>cool showcase card</figcaption>
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
        <div class="component__desc">Rounded pill CTAs with compact height, uppercase text, and dark solid fill; secondary pill appears as a light outlined menu control.</div>
      </div>
      <div class="component">
        <div class="component__name">card</div>
        <div class="component__desc">Large edge-to-edge showcase tiles arranged in a three-column strip, each with abstract imagery, small circular index badge, and overlaid content near the bottom.</div>
      </div>
      <div class="component">
        <div class="component__name">navigation</div>
        <div class="component__desc">Minimal top navigation with small text links split into two columns and a pill-shaped menu button aligned right.</div>
      </div></div>

  <div class="section"><h2>Layout pattern</h2><p>minimal top navigation + oversized left-aligned hero copy + inline CTA/subtext + three-column visual showcase grid</p></div>
</body>
</html>
```

