---
{"id":"DK-img-f4-videosnap","layer":"L1","kind":"design-knowledge","title":"Style Spec — f4-videosnap.png","tags":["industry:generic","source:vision-distill","image:f4-videosnap.png","manual:approved"],"source":"distill","refs":{},"createdAt":1778922855698,"updatedAt":1779236410474,"schemaVersion":1}
---

<!-- style-spec:json
{
  "industry": "generic",
  "summary": "A dark, futuristic landing page aesthetic built around cyan neon accents, subtle 3D illustration cards, and data-visual storytelling. The design feels premium and technical, with high-contrast typography over nearly black surfaces and glowing interface details.",
  "vibe": [
    "dark",
    "futuristic",
    "neon",
    "technical",
    "premium"
  ],
  "palette": {
    "primary": {
      "hex": "#12dfe3",
      "label": "neon cyan"
    },
    "secondary": {
      "hex": "#1d8f9c",
      "label": "teal blue"
    },
    "accent": {
      "hex": "#6ceff1",
      "label": "bright aqua glow"
    },
    "background": {
      "hex": "#040607",
      "label": "near-black"
    },
    "surface": {
      "hex": "#111417",
      "label": "charcoal panel"
    },
    "text": {
      "hex": "#f2f4f5",
      "label": "soft white"
    },
    "textMuted": {
      "hex": "#8b949c",
      "label": "cool gray"
    },
    "border": {
      "hex": "#1f2a2d",
      "label": "dim cyan-gray border"
    },
    "success": {
      "hex": "#29d7c8",
      "label": "teal success"
    },
    "warning": {
      "hex": "#e0b85c",
      "label": "muted amber"
    },
    "danger": {
      "hex": "#d65f6f",
      "label": "muted rose red"
    }
  },
  "typography": {
    "headingFont": "Inter",
    "bodyFont": "Inter",
    "headingWeight": 700,
    "bodyWeight": 400,
    "baseSizePx": 16,
    "notes": [
      "bold hero headlines",
      "mixed white and cyan emphasis in headings",
      "small muted supporting copy"
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
    "0 8px 24px rgba(0,0,0,0.45)",
    "0 0 24px rgba(18,223,227,0.18)"
  ],
  "gradients": [
    {
      "id": "cta-pill",
      "type": "linear",
      "angleDeg": 90,
      "stops": [
        {
          "color": "#0f5f66",
          "positionPct": 0,
          "opacity": 1
        },
        {
          "color": "#12dfe3",
          "positionPct": 100,
          "opacity": 1
        }
      ],
      "usage": "small pill badge and accent highlights"
    },
    {
      "id": "glow-panel",
      "type": "linear",
      "angleDeg": 135,
      "stops": [
        {
          "color": "#0b0e10",
          "positionPct": 0,
          "opacity": 1
        },
        {
          "color": "#111417",
          "positionPct": 65,
          "opacity": 1
        },
        {
          "color": "#12dfe3",
          "positionPct": 100,
          "opacity": 0.2
        }
      ],
      "usage": "feature card illumination and decorative panel glow"
    }
  ],
  "surfaceEffects": [
    {
      "name": "neonGlow",
      "description": "cyan UI accents, markers, and diagrams emit soft outer glow against black surfaces",
      "cssHints": [
        "box-shadow: 0 0 12px rgba(18,223,227,0.35)",
        "text-shadow: 0 0 16px rgba(18,223,227,0.18)",
        "background: #040607"
      ]
    },
    {
      "name": "dimGlassCard",
      "description": "cards use dark translucent fills with faint borders and subtle blur-like softness",
      "cssHints": [
        "background: rgba(17,20,23,0.82)",
        "border: 1px solid rgba(255,255,255,0.08)",
        "box-shadow: 0 8px 24px rgba(0,0,0,0.35)"
      ]
    }
  ],
  "stateTokens": [
    {
      "component": "button.primary",
      "state": "default",
      "treatment": "dark filled button or pill with cyan border/accent and high-contrast white label"
    },
    {
      "component": "button.primary",
      "state": "hover",
      "treatment": "cyan glow intensifies and border becomes brighter with slightly lighter surface"
    },
    {
      "component": "button.primary",
      "state": "focus",
      "treatment": "thin aqua outer ring with clear separation from dark background"
    },
    {
      "component": "navigation.item",
      "state": "active",
      "treatment": "active item uses brighter white text and subtle cyan underline or glow"
    }
  ],
  "components": {
    "button": {
      "description": "rounded dark buttons and pills with thin borders, compact padding, white labels, and cyan glow accents"
    },
    "card": {
      "description": "feature cards are rounded dark panels with faint borders, muted labels, white titles, and cyan-lit 3D illustrations"
    },
    "navigation": {
      "description": "top navigation is slim and minimal with centered links, small logo at left, and utility icons at right"
    }
  },
  "layout": "top navigation + centered hero headline + global map visualization on the left + feature card grid on the upper right + branching value proposition diagram near the bottom",
  "visualElements": [
    {
      "name": "top navigation",
      "col": 2,
      "row": 1,
      "zoom": 3.2
    },
    {
      "name": "hero headline",
      "col": 1,
      "row": 1,
      "zoom": 2.6
    },
    {
      "name": "world map graphic",
      "col": 1,
      "row": 2,
      "zoom": 2.1
    },
    {
      "name": "feature cards",
      "col": 3,
      "row": 1,
      "zoom": 2.3
    },
    {
      "name": "value diagram",
      "col": 3,
      "row": 3,
      "zoom": 2.5
    },
    {
      "name": "accent badge",
      "col": 2,
      "row": 1,
      "zoom": 4
    }
  ],
  "imagePath": "/knowledge-refs/f4-videosnap.png",
  "imageName": "f4-videosnap.png",
  "capturedAt": "2026-05-20T00:20:10.471Z",
  "model": "openai/gpt-5.4-20260305"
}
-->

# Style Spec — f4-videosnap.png

## Style Spec (Markdown)

**Industry**: generic
**Image**: f4-videosnap.png
**Vibe**: dark, futuristic, neon, technical, premium

**Summary**: A dark, futuristic landing page aesthetic built around cyan neon accents, subtle 3D illustration cards, and data-visual storytelling. The design feels premium and technical, with high-contrast typography over nearly black surfaces and glowing interface details.

### Palette
- Primary: `#12dfe3` — neon cyan
- Secondary: `#1d8f9c` — teal blue
- Accent: `#6ceff1` — bright aqua glow
- Background: `#040607` — near-black
- Surface: `#111417` — charcoal panel
- Text: `#f2f4f5` — soft white
- Text muted: `#8b949c` — cool gray
- Border: `#1f2a2d` — dim cyan-gray border
- Success: `#29d7c8` — teal success
- Warning: `#e0b85c` — muted amber
- Danger: `#d65f6f` — muted rose red

### Typography
- Heading font: Inter (weight 700)
- Body font: Inter (weight 400)
- Base size: 16px
- Note: bold hero headlines
- Note: mixed white and cyan emphasis in headings
- Note: small muted supporting copy

### Spacing & Radius
- Spacing base: 8px; scale: 4, 8, 12, 16, 24, 32, 48, 64
- Radius: sm 4px, md 10px, lg 18px, pill 999px
- Shadows: 2 variant(s)
  - `0 8px 24px rgba(0,0,0,0.45)`
  - `0 0 24px rgba(18,223,227,0.18)`

### Gradients
- **cta-pill** (linear, 90deg) — small pill badge and accent highlights
  - stop 0%: `#0f5f66`, alpha 1
  - stop 100%: `#12dfe3`, alpha 1
- **glow-panel** (linear, 135deg) — feature card illumination and decorative panel glow
  - stop 0%: `#0b0e10`, alpha 1
  - stop 65%: `#111417`, alpha 1
  - stop 100%: `#12dfe3`, alpha 0.2

### Surface Effects
- **neonGlow**: cyan UI accents, markers, and diagrams emit soft outer glow against black surfaces
  - `box-shadow: 0 0 12px rgba(18,223,227,0.35)`
  - `text-shadow: 0 0 16px rgba(18,223,227,0.18)`
  - `background: #040607`
- **dimGlassCard**: cards use dark translucent fills with faint borders and subtle blur-like softness
  - `background: rgba(17,20,23,0.82)`
  - `border: 1px solid rgba(255,255,255,0.08)`
  - `box-shadow: 0 8px 24px rgba(0,0,0,0.35)`

### Interaction State Tokens
- **button.primary.default**: dark filled button or pill with cyan border/accent and high-contrast white label
- **button.primary.hover**: cyan glow intensifies and border becomes brighter with slightly lighter surface
- **button.primary.focus**: thin aqua outer ring with clear separation from dark background
- **navigation.item.active**: active item uses brighter white text and subtle cyan underline or glow

### Components
- **button**: rounded dark buttons and pills with thin borders, compact padding, white labels, and cyan glow accents
- **card**: feature cards are rounded dark panels with faint borders, muted labels, white titles, and cyan-lit 3D illustrations
- **navigation**: top navigation is slim and minimal with centered links, small logo at left, and utility icons at right

### Layout
top navigation + centered hero headline + global map visualization on the left + feature card grid on the upper right + branching value proposition diagram near the bottom

### UI Elements
Named UI regions identified in the reference screenshot (col/row = 3×3 grid):
- **top navigation** — col 2, row 1, zoom 3.2×
- **hero headline** — col 1, row 1, zoom 2.6×
- **world map graphic** — col 1, row 2, zoom 2.1×
- **feature cards** — col 3, row 1, zoom 2.3×
- **value diagram** — col 3, row 3, zoom 2.5×
- **accent badge** — col 2, row 1, zoom 4×

## Style Spec (HTML)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Style Spec — f4-videosnap.png</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
    --color-primary:    #12dfe3;
    --color-secondary:  #1d8f9c;
    --color-accent:     #6ceff1;
    --color-background: #040607;
    --color-surface:    #111417;
    --color-text:       #f2f4f5;
    --color-text-muted: #8b949c;
    --color-border:     #1f2a2d;
    --color-success:    #29d7c8;
    --color-warning:    #e0b85c;
    --color-danger:     #d65f6f;
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
    <img src="/knowledge-refs/f4-videosnap.png" alt="f4-videosnap.png">
    <div class="header__body">
      <div class="kicker">generic</div>
      <h1>f4-videosnap.png</h1>
      <p class="muted">A dark, futuristic landing page aesthetic built around cyan neon accents, subtle 3D illustration cards, and data-visual storytelling. The design feels premium and technical, with high-contrast typography over nearly black surfaces and glowing interface details.</p>
      <div class="tags">
        <span class="tag">dark</span><span class="tag">futuristic</span><span class="tag">neon</span><span class="tag">technical</span><span class="tag">premium</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Palette</h2>
    <div class="palette">
    <div class="swatch">
      <div class="swatch__chip" style="background:#12dfe3"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Primary</div>
        <div class="swatch__hex">#12dfe3</div>
        <div class="swatch__name">neon cyan</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#1d8f9c"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Secondary</div>
        <div class="swatch__hex">#1d8f9c</div>
        <div class="swatch__name">teal blue</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#6ceff1"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Accent</div>
        <div class="swatch__hex">#6ceff1</div>
        <div class="swatch__name">bright aqua glow</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#040607"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Background</div>
        <div class="swatch__hex">#040607</div>
        <div class="swatch__name">near-black</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#111417"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Surface</div>
        <div class="swatch__hex">#111417</div>
        <div class="swatch__name">charcoal panel</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f2f4f5"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text</div>
        <div class="swatch__hex">#f2f4f5</div>
        <div class="swatch__name">soft white</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#8b949c"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text muted</div>
        <div class="swatch__hex">#8b949c</div>
        <div class="swatch__name">cool gray</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#1f2a2d"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Border</div>
        <div class="swatch__hex">#1f2a2d</div>
        <div class="swatch__name">dim cyan-gray border</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#29d7c8"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Success</div>
        <div class="swatch__hex">#29d7c8</div>
        <div class="swatch__name">teal success</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#e0b85c"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Warning</div>
        <div class="swatch__hex">#e0b85c</div>
        <div class="swatch__name">muted amber</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#d65f6f"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Danger</div>
        <div class="swatch__hex">#d65f6f</div>
        <div class="swatch__name">muted rose red</div>
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

  <div class="section"><h2>Shadows</h2><div class="shadow-card" style="box-shadow:0 8px 24px rgba(0,0,0,0.45)">0 8px 24px rgba(0,0,0,0.45)</div><div class="shadow-card" style="box-shadow:0 0 24px rgba(18,223,227,0.18)">0 0 24px rgba(18,223,227,0.18)</div></div>

  <div class="section">
    <h2>Gradients</h2>
    <div class="signal-grid">
      <article class="signal-card">
        <div class="signal-preview" style="background:linear-gradient(90deg, #0f5f66 0%, #12dfe3 100%);"></div>
        <div class="signal-title">cta-pill</div>
        <div class="signal-meta">linear 90deg · small pill badge and accent highlights</div>
        <div class="signal-code">0% #0f5f66 @1  |  100% #12dfe3 @1</div>
      </article>
      <article class="signal-card">
        <div class="signal-preview" style="background:linear-gradient(135deg, #0b0e10 0%, #111417 65%, rgba(18, 223, 227, 0.2) 100%);"></div>
        <div class="signal-title">glow-panel</div>
        <div class="signal-meta">linear 135deg · feature card illumination and decorative panel glow</div>
        <div class="signal-code">0% #0b0e10 @1  |  65% #111417 @1  |  100% #12dfe3 @0.2</div>
      </article></div>
  </div>

  <div class="section">
    <h2>Surface Effects</h2>
    <div class="signal-grid">
      <article class="signal-card">
        <div class="signal-title">neonGlow</div>
        <div class="signal-meta">cyan UI accents, markers, and diagrams emit soft outer glow against black surfaces</div>
        <div class="signal-code">box-shadow: 0 0 12px rgba(18,223,227,0.35)<br/>text-shadow: 0 0 16px rgba(18,223,227,0.18)<br/>background: #040607</div>
      </article>
      <article class="signal-card">
        <div class="signal-title">dimGlassCard</div>
        <div class="signal-meta">cards use dark translucent fills with faint borders and subtle blur-like softness</div>
        <div class="signal-code">background: rgba(17,20,23,0.82)<br/>border: 1px solid rgba(255,255,255,0.08)<br/>box-shadow: 0 8px 24px rgba(0,0,0,0.35)</div>
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
        <td>dark filled button or pill with cyan border/accent and high-contrast white label</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-hover">hover</span></td>
        <td>cyan glow intensifies and border becomes brighter with slightly lighter surface</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-focus">focus</span></td>
        <td>thin aqua outer ring with clear separation from dark background</td>
      </tr>
      <tr>
        <td>navigation.item</td>
        <td><span class="state-pill state-active">active</span></td>
        <td>active item uses brighter white text and subtle cyan underline or glow</td>
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
            src="/knowledge-refs/f4-videosnap.png"
            alt="top navigation"
            style="--ox:50%;--oy:0%;--zoom:3.2;"
            draggable="false"
          />
        </div>
        <figcaption>top navigation</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/f4-videosnap.png"
            alt="hero headline"
            style="--ox:0%;--oy:0%;--zoom:2.6;"
            draggable="false"
          />
        </div>
        <figcaption>hero headline</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/f4-videosnap.png"
            alt="world map graphic"
            style="--ox:0%;--oy:50%;--zoom:2.1;"
            draggable="false"
          />
        </div>
        <figcaption>world map graphic</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/f4-videosnap.png"
            alt="feature cards"
            style="--ox:100%;--oy:0%;--zoom:2.3;"
            draggable="false"
          />
        </div>
        <figcaption>feature cards</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/f4-videosnap.png"
            alt="value diagram"
            style="--ox:100%;--oy:100%;--zoom:2.5;"
            draggable="false"
          />
        </div>
        <figcaption>value diagram</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/f4-videosnap.png"
            alt="accent badge"
            style="--ox:50%;--oy:0%;--zoom:4;"
            draggable="false"
          />
        </div>
        <figcaption>accent badge</figcaption>
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
        <div class="component__desc">rounded dark buttons and pills with thin borders, compact padding, white labels, and cyan glow accents</div>
      </div>
      <div class="component">
        <div class="component__name">card</div>
        <div class="component__desc">feature cards are rounded dark panels with faint borders, muted labels, white titles, and cyan-lit 3D illustrations</div>
      </div>
      <div class="component">
        <div class="component__name">navigation</div>
        <div class="component__desc">top navigation is slim and minimal with centered links, small logo at left, and utility icons at right</div>
      </div></div>

  <div class="section"><h2>Layout pattern</h2><p>top navigation + centered hero headline + global map visualization on the left + feature card grid on the upper right + branching value proposition diagram near the bottom</p></div>
</body>
</html>
```

