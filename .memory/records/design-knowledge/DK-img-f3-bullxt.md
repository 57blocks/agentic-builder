---
{"id":"DK-img-f3-bullxt","layer":"L1","kind":"design-knowledge","title":"Style Spec — f3-bullxt.png","tags":["industry:fintech-web3","source:vision-distill","image:f3-bullxt.png","manual:approved"],"source":"distill","refs":{},"createdAt":1778922847099,"updatedAt":1779236382956,"schemaVersion":1}
---

<!-- style-spec:json
{
  "industry": "fintech-web3",
  "summary": "A dark futuristic landing page with glossy 3D geometric visuals, neon purple-blue lighting, and minimalist navigation. The design pairs generous negative space with soft glows and premium glass-like surfaces for a high-end web3 feel.",
  "vibe": [
    "dark",
    "futuristic",
    "premium",
    "minimal",
    "glossy"
  ],
  "palette": {
    "primary": {
      "hex": "#8f5bff",
      "label": "electric violet"
    },
    "secondary": {
      "hex": "#3a0f84",
      "label": "deep purple"
    },
    "accent": {
      "hex": "#00c8ff",
      "label": "neon cyan"
    },
    "background": {
      "hex": "#05040b",
      "label": "near-black space"
    },
    "surface": {
      "hex": "#161321",
      "label": "dark plum surface"
    },
    "text": {
      "hex": "#f3ecff",
      "label": "soft white"
    },
    "textMuted": {
      "hex": "#b6a8c9",
      "label": "muted lavender gray"
    },
    "border": {
      "hex": "#3b334b",
      "label": "dim violet border"
    },
    "warning": {
      "hex": "#f2a63b",
      "label": "warm amber highlight"
    }
  },
  "typography": {
    "headingFont": "Inter",
    "bodyFont": "Inter",
    "headingWeight": 500,
    "bodyWeight": 400,
    "baseSizePx": 16,
    "notes": [
      "large hero headings",
      "small minimalist nav labels",
      "soft muted body copy"
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
    "0 8px 30px rgba(0,0,0,0.45)",
    "0 0 80px rgba(143,91,255,0.28)"
  ],
  "gradients": [
    {
      "id": "page-bg",
      "type": "linear",
      "angleDeg": 180,
      "stops": [
        {
          "color": "#2e0f6d",
          "positionPct": 0,
          "opacity": 1
        },
        {
          "color": "#120a30",
          "positionPct": 35,
          "opacity": 0.95
        },
        {
          "color": "#05040b",
          "positionPct": 100,
          "opacity": 1
        }
      ],
      "usage": "main page background from purple glow at left into black"
    },
    {
      "id": "bottom-glow",
      "type": "radial",
      "angleDeg": 0,
      "stops": [
        {
          "color": "#c09bff",
          "positionPct": 0,
          "opacity": 0.95
        },
        {
          "color": "#7d42ff",
          "positionPct": 45,
          "opacity": 0.7
        },
        {
          "color": "#05040b",
          "positionPct": 100,
          "opacity": 0
        }
      ],
      "usage": "large atmospheric glow in lower left background"
    },
    {
      "id": "3d-cube-lighting",
      "type": "linear",
      "angleDeg": 135,
      "stops": [
        {
          "color": "#f0e4ff",
          "positionPct": 0,
          "opacity": 1
        },
        {
          "color": "#00d0ff",
          "positionPct": 68,
          "opacity": 0.9
        },
        {
          "color": "#c200ff",
          "positionPct": 100,
          "opacity": 0.85
        }
      ],
      "usage": "iridescent highlight on cube faces and edges"
    }
  ],
  "surfaceEffects": [
    {
      "name": "neon glow",
      "description": "background and 3D objects use diffused purple and cyan bloom to create depth and a sci-fi atmosphere",
      "cssHints": [
        "box-shadow: 0 0 80px rgba(143,91,255,0.28)",
        "box-shadow: 0 0 32px rgba(0,200,255,0.18)"
      ]
    },
    {
      "name": "glossy 3d material",
      "description": "hero cubes use dark metallic faces with iridescent reflections and bright edge highlights",
      "cssHints": [
        "background: linear-gradient(135deg, #f0e4ff 0%, #00d0ff 68%, #c200ff 100%)",
        "box-shadow: 0 12px 30px rgba(0,0,0,0.45)",
        "border: 1px solid rgba(255,255,255,0.08)"
      ]
    }
  ],
  "stateTokens": [
    {
      "component": "button.primary",
      "state": "default",
      "treatment": "light pill button with dark text and a subtle violet circular icon area"
    },
    {
      "component": "button.primary",
      "state": "hover",
      "treatment": "slightly brighter surface with stronger purple glow and more pronounced border contrast"
    },
    {
      "component": "button.primary",
      "state": "focus",
      "treatment": "soft outer focus ring in violet around the pill shape"
    },
    {
      "component": "navigation.link",
      "state": "default",
      "treatment": "small muted white text with low visual weight on dark background"
    },
    {
      "component": "navigation.link",
      "state": "hover",
      "treatment": "text brightens toward full white with subtle underline-free emphasis"
    }
  ],
  "components": {
    "button": {
      "description": "Rounded pill CTAs; primary action uses a white fill with dark label and an inset circular arrow accent, while the top-right sign-up button uses a dark translucent pill with thin border."
    },
    "card": {
      "description": "No traditional flat cards are visible; the main visual emphasis is on floating 3D cube clusters acting as premium content blocks."
    },
    "navigation": {
      "description": "Centered top navigation with sparse links, small type, generous spacing, and separate right-aligned auth actions including an outlined pill button."
    }
  },
  "layout": "top navigation bar with left-aligned hero copy, large 3D product visual on the right, and floating CTA anchored near the bottom left",
  "visualElements": [
    {
      "name": "brand logo",
      "col": 1,
      "row": 1,
      "zoom": 4
    },
    {
      "name": "navigation bar",
      "col": 2,
      "row": 1,
      "zoom": 3
    },
    {
      "name": "hero headline",
      "col": 1,
      "row": 2,
      "zoom": 2.6
    },
    {
      "name": "3d cube cluster",
      "col": 3,
      "row": 2,
      "zoom": 2.1
    },
    {
      "name": "primary cta",
      "col": 1,
      "row": 3,
      "zoom": 3.4
    },
    {
      "name": "scroll button",
      "col": 3,
      "row": 3,
      "zoom": 4.2
    }
  ],
  "imagePath": "/knowledge-refs/f3-bullxt.png",
  "imageName": "f3-bullxt.png",
  "capturedAt": "2026-05-20T00:19:42.955Z",
  "model": "openai/gpt-5.4-20260305"
}
-->

# Style Spec — f3-bullxt.png

## Style Spec (Markdown)

**Industry**: fintech-web3
**Image**: f3-bullxt.png
**Vibe**: dark, futuristic, premium, minimal, glossy

**Summary**: A dark futuristic landing page with glossy 3D geometric visuals, neon purple-blue lighting, and minimalist navigation. The design pairs generous negative space with soft glows and premium glass-like surfaces for a high-end web3 feel.

### Palette
- Primary: `#8f5bff` — electric violet
- Secondary: `#3a0f84` — deep purple
- Accent: `#00c8ff` — neon cyan
- Background: `#05040b` — near-black space
- Surface: `#161321` — dark plum surface
- Text: `#f3ecff` — soft white
- Text muted: `#b6a8c9` — muted lavender gray
- Border: `#3b334b` — dim violet border
- Warning: `#f2a63b` — warm amber highlight

### Typography
- Heading font: Inter (weight 500)
- Body font: Inter (weight 400)
- Base size: 16px
- Note: large hero headings
- Note: small minimalist nav labels
- Note: soft muted body copy

### Spacing & Radius
- Spacing base: 8px; scale: 4, 8, 12, 16, 24, 32, 48, 64
- Radius: sm 4px, md 8px, lg 16px, pill 999px
- Shadows: 2 variant(s)
  - `0 8px 30px rgba(0,0,0,0.45)`
  - `0 0 80px rgba(143,91,255,0.28)`

### Gradients
- **page-bg** (linear, 180deg) — main page background from purple glow at left into black
  - stop 0%: `#2e0f6d`, alpha 1
  - stop 35%: `#120a30`, alpha 0.95
  - stop 100%: `#05040b`, alpha 1
- **bottom-glow** (radial) — large atmospheric glow in lower left background
  - stop 0%: `#c09bff`, alpha 0.95
  - stop 45%: `#7d42ff`, alpha 0.7
  - stop 100%: `#05040b`, alpha 0
- **3d-cube-lighting** (linear, 135deg) — iridescent highlight on cube faces and edges
  - stop 0%: `#f0e4ff`, alpha 1
  - stop 68%: `#00d0ff`, alpha 0.9
  - stop 100%: `#c200ff`, alpha 0.85

### Surface Effects
- **neon glow**: background and 3D objects use diffused purple and cyan bloom to create depth and a sci-fi atmosphere
  - `box-shadow: 0 0 80px rgba(143,91,255,0.28)`
  - `box-shadow: 0 0 32px rgba(0,200,255,0.18)`
- **glossy 3d material**: hero cubes use dark metallic faces with iridescent reflections and bright edge highlights
  - `background: linear-gradient(135deg, #f0e4ff 0%, #00d0ff 68%, #c200ff 100%)`
  - `box-shadow: 0 12px 30px rgba(0,0,0,0.45)`
  - `border: 1px solid rgba(255,255,255,0.08)`

### Interaction State Tokens
- **button.primary.default**: light pill button with dark text and a subtle violet circular icon area
- **button.primary.hover**: slightly brighter surface with stronger purple glow and more pronounced border contrast
- **button.primary.focus**: soft outer focus ring in violet around the pill shape
- **navigation.link.default**: small muted white text with low visual weight on dark background
- **navigation.link.hover**: text brightens toward full white with subtle underline-free emphasis

### Components
- **button**: Rounded pill CTAs; primary action uses a white fill with dark label and an inset circular arrow accent, while the top-right sign-up button uses a dark translucent pill with thin border.
- **card**: No traditional flat cards are visible; the main visual emphasis is on floating 3D cube clusters acting as premium content blocks.
- **navigation**: Centered top navigation with sparse links, small type, generous spacing, and separate right-aligned auth actions including an outlined pill button.

### Layout
top navigation bar with left-aligned hero copy, large 3D product visual on the right, and floating CTA anchored near the bottom left

### UI Elements
Named UI regions identified in the reference screenshot (col/row = 3×3 grid):
- **brand logo** — col 1, row 1, zoom 4×
- **navigation bar** — col 2, row 1, zoom 3×
- **hero headline** — col 1, row 2, zoom 2.6×
- **3d cube cluster** — col 3, row 2, zoom 2.1×
- **primary cta** — col 1, row 3, zoom 3.4×
- **scroll button** — col 3, row 3, zoom 4.2×

## Style Spec (HTML)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Style Spec — f3-bullxt.png</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
    --color-primary:    #8f5bff;
    --color-secondary:  #3a0f84;
    --color-accent:     #00c8ff;
    --color-background: #05040b;
    --color-surface:    #161321;
    --color-text:       #f3ecff;
    --color-text-muted: #b6a8c9;
    --color-border:     #3b334b;
    --color-success:    #22c55e;
    --color-warning:    #f2a63b;
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
    <img src="/knowledge-refs/f3-bullxt.png" alt="f3-bullxt.png">
    <div class="header__body">
      <div class="kicker">fintech-web3</div>
      <h1>f3-bullxt.png</h1>
      <p class="muted">A dark futuristic landing page with glossy 3D geometric visuals, neon purple-blue lighting, and minimalist navigation. The design pairs generous negative space with soft glows and premium glass-like surfaces for a high-end web3 feel.</p>
      <div class="tags">
        <span class="tag">dark</span><span class="tag">futuristic</span><span class="tag">premium</span><span class="tag">minimal</span><span class="tag">glossy</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Palette</h2>
    <div class="palette">
    <div class="swatch">
      <div class="swatch__chip" style="background:#8f5bff"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Primary</div>
        <div class="swatch__hex">#8f5bff</div>
        <div class="swatch__name">electric violet</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#3a0f84"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Secondary</div>
        <div class="swatch__hex">#3a0f84</div>
        <div class="swatch__name">deep purple</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#00c8ff"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Accent</div>
        <div class="swatch__hex">#00c8ff</div>
        <div class="swatch__name">neon cyan</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#05040b"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Background</div>
        <div class="swatch__hex">#05040b</div>
        <div class="swatch__name">near-black space</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#161321"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Surface</div>
        <div class="swatch__hex">#161321</div>
        <div class="swatch__name">dark plum surface</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f3ecff"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text</div>
        <div class="swatch__hex">#f3ecff</div>
        <div class="swatch__name">soft white</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#b6a8c9"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text muted</div>
        <div class="swatch__hex">#b6a8c9</div>
        <div class="swatch__name">muted lavender gray</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#3b334b"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Border</div>
        <div class="swatch__hex">#3b334b</div>
        <div class="swatch__name">dim violet border</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f2a63b"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Warning</div>
        <div class="swatch__hex">#f2a63b</div>
        <div class="swatch__name">warm amber highlight</div>
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

  <div class="section"><h2>Shadows</h2><div class="shadow-card" style="box-shadow:0 8px 30px rgba(0,0,0,0.45)">0 8px 30px rgba(0,0,0,0.45)</div><div class="shadow-card" style="box-shadow:0 0 80px rgba(143,91,255,0.28)">0 0 80px rgba(143,91,255,0.28)</div></div>

  <div class="section">
    <h2>Gradients</h2>
    <div class="signal-grid">
      <article class="signal-card">
        <div class="signal-preview" style="background:linear-gradient(180deg, #2e0f6d 0%, rgba(18, 10, 48, 0.95) 35%, #05040b 100%);"></div>
        <div class="signal-title">page-bg</div>
        <div class="signal-meta">linear 180deg · main page background from purple glow at left into black</div>
        <div class="signal-code">0% #2e0f6d @1  |  35% #120a30 @0.95  |  100% #05040b @1</div>
      </article>
      <article class="signal-card">
        <div class="signal-preview" style="background:radial-gradient(circle at center, rgba(192, 155, 255, 0.95) 0%, rgba(125, 66, 255, 0.7) 45%, rgba(5, 4, 11, 0) 100%);"></div>
        <div class="signal-title">bottom-glow</div>
        <div class="signal-meta">radial · large atmospheric glow in lower left background</div>
        <div class="signal-code">0% #c09bff @0.95  |  45% #7d42ff @0.7  |  100% #05040b @0</div>
      </article>
      <article class="signal-card">
        <div class="signal-preview" style="background:linear-gradient(135deg, #f0e4ff 0%, rgba(0, 208, 255, 0.9) 68%, rgba(194, 0, 255, 0.85) 100%);"></div>
        <div class="signal-title">3d-cube-lighting</div>
        <div class="signal-meta">linear 135deg · iridescent highlight on cube faces and edges</div>
        <div class="signal-code">0% #f0e4ff @1  |  68% #00d0ff @0.9  |  100% #c200ff @0.85</div>
      </article></div>
  </div>

  <div class="section">
    <h2>Surface Effects</h2>
    <div class="signal-grid">
      <article class="signal-card">
        <div class="signal-title">neon glow</div>
        <div class="signal-meta">background and 3D objects use diffused purple and cyan bloom to create depth and a sci-fi atmosphere</div>
        <div class="signal-code">box-shadow: 0 0 80px rgba(143,91,255,0.28)<br/>box-shadow: 0 0 32px rgba(0,200,255,0.18)</div>
      </article>
      <article class="signal-card">
        <div class="signal-title">glossy 3d material</div>
        <div class="signal-meta">hero cubes use dark metallic faces with iridescent reflections and bright edge highlights</div>
        <div class="signal-code">background: linear-gradient(135deg, #f0e4ff 0%, #00d0ff 68%, #c200ff 100%)<br/>box-shadow: 0 12px 30px rgba(0,0,0,0.45)<br/>border: 1px solid rgba(255,255,255,0.08)</div>
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
        <td>light pill button with dark text and a subtle violet circular icon area</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-hover">hover</span></td>
        <td>slightly brighter surface with stronger purple glow and more pronounced border contrast</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-focus">focus</span></td>
        <td>soft outer focus ring in violet around the pill shape</td>
      </tr>
      <tr>
        <td>navigation.link</td>
        <td><span class="state-pill state-default">default</span></td>
        <td>small muted white text with low visual weight on dark background</td>
      </tr>
      <tr>
        <td>navigation.link</td>
        <td><span class="state-pill state-hover">hover</span></td>
        <td>text brightens toward full white with subtle underline-free emphasis</td>
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
            src="/knowledge-refs/f3-bullxt.png"
            alt="brand logo"
            style="--ox:0%;--oy:0%;--zoom:4;"
            draggable="false"
          />
        </div>
        <figcaption>brand logo</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/f3-bullxt.png"
            alt="navigation bar"
            style="--ox:50%;--oy:0%;--zoom:3;"
            draggable="false"
          />
        </div>
        <figcaption>navigation bar</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/f3-bullxt.png"
            alt="hero headline"
            style="--ox:0%;--oy:50%;--zoom:2.6;"
            draggable="false"
          />
        </div>
        <figcaption>hero headline</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/f3-bullxt.png"
            alt="3d cube cluster"
            style="--ox:100%;--oy:50%;--zoom:2.1;"
            draggable="false"
          />
        </div>
        <figcaption>3d cube cluster</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/f3-bullxt.png"
            alt="primary cta"
            style="--ox:0%;--oy:100%;--zoom:3.4;"
            draggable="false"
          />
        </div>
        <figcaption>primary cta</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/f3-bullxt.png"
            alt="scroll button"
            style="--ox:100%;--oy:100%;--zoom:4.2;"
            draggable="false"
          />
        </div>
        <figcaption>scroll button</figcaption>
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
        <div class="component__desc">Rounded pill CTAs; primary action uses a white fill with dark label and an inset circular arrow accent, while the top-right sign-up button uses a dark translucent pill with thin border.</div>
      </div>
      <div class="component">
        <div class="component__name">card</div>
        <div class="component__desc">No traditional flat cards are visible; the main visual emphasis is on floating 3D cube clusters acting as premium content blocks.</div>
      </div>
      <div class="component">
        <div class="component__name">navigation</div>
        <div class="component__desc">Centered top navigation with sparse links, small type, generous spacing, and separate right-aligned auth actions including an outlined pill button.</div>
      </div></div>

  <div class="section"><h2>Layout pattern</h2><p>top navigation bar with left-aligned hero copy, large 3D product visual on the right, and floating CTA anchored near the bottom left</p></div>
</body>
</html>
```

