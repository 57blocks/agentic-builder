---
{"id":"DK-img-ai-4-avoid","layer":"L1","kind":"design-knowledge","title":"Style Spec — ai-4-avoid.png","tags":["industry:ai","source:vision-distill","image:ai-4-avoid.png","manual:approved"],"source":"distill","refs":{},"createdAt":1778922767164,"updatedAt":1779235891592,"schemaVersion":1}
---

<!-- style-spec:json
{
  "industry": "ai",
  "summary": "A dark AI landing page with a cinematic neon glow, centered hero messaging, and soft glassy interface elements. The design pairs minimal monochrome typography with vivid purple-pink gradients for a futuristic, premium feel.",
  "vibe": [
    "dark",
    "futuristic",
    "minimal",
    "glowing",
    "premium"
  ],
  "palette": {
    "primary": {
      "hex": "#7c3aed",
      "label": "electric purple"
    },
    "secondary": {
      "hex": "#ec4899",
      "label": "hot pink"
    },
    "accent": {
      "hex": "#ffffff",
      "label": "bright white"
    },
    "background": {
      "hex": "#050507",
      "label": "near-black"
    },
    "surface": {
      "hex": "#1a1522",
      "label": "smoky plum"
    },
    "text": {
      "hex": "#f5f5f6",
      "label": "soft white"
    },
    "textMuted": {
      "hex": "#8d8796",
      "label": "muted gray-lilac"
    },
    "border": {
      "hex": "#2d2536",
      "label": "dim violet border"
    }
  },
  "typography": {
    "headingFont": "Inter",
    "bodyFont": "Inter",
    "headingWeight": 500,
    "bodyWeight": 400,
    "baseSizePx": 16,
    "notes": [
      "large centered hero headings",
      "mixed serif italic emphasis on key word",
      "small muted navigation and supporting copy"
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
    "lgPx": 20,
    "pillPx": 999
  },
  "shadows": [
    "0 8px 24px rgba(0,0,0,0.35)",
    "0 0 40px rgba(124,58,237,0.22)"
  ],
  "gradients": [
    {
      "id": "hero-ambient-bg",
      "type": "linear",
      "angleDeg": 90,
      "stops": [
        {
          "color": "#050507",
          "positionPct": 0,
          "opacity": 1
        },
        {
          "color": "#7c3aed",
          "positionPct": 72,
          "opacity": 0.85
        },
        {
          "color": "#ec4899",
          "positionPct": 100,
          "opacity": 0.9
        }
      ],
      "usage": "main hero background glow rising from the bottom"
    },
    {
      "id": "primary-button-fill",
      "type": "linear",
      "angleDeg": 90,
      "stops": [
        {
          "color": "#8b5cf6",
          "positionPct": 0,
          "opacity": 1
        },
        {
          "color": "#7c3aed",
          "positionPct": 100,
          "opacity": 1
        }
      ],
      "usage": "primary CTA button"
    }
  ],
  "surfaceEffects": [
    {
      "name": "ambient neon glow",
      "description": "background uses blurred purple and pink light blooms over a near-black canvas",
      "cssHints": [
        "background: radial-gradient(circle at bottom left, rgba(124,58,237,0.55), transparent 35%), radial-gradient(circle at bottom right, rgba(236,72,153,0.45), transparent 35%), #050507",
        "filter: blur(0px)"
      ]
    },
    {
      "name": "soft glass panel",
      "description": "large prompt input panel uses a translucent dark fill with subtle border and shadow",
      "cssHints": [
        "background: rgba(26,21,34,0.82)",
        "border: 1px solid rgba(255,255,255,0.08)",
        "box-shadow: 0 8px 24px rgba(0,0,0,0.35)"
      ]
    }
  ],
  "stateTokens": [
    {
      "component": "button.primary",
      "state": "default",
      "treatment": "rounded pill with vivid purple gradient fill and white text"
    },
    {
      "component": "button.primary",
      "state": "hover",
      "treatment": "slightly brighter purple gradient with stronger outer glow"
    },
    {
      "component": "button.primary",
      "state": "focus",
      "treatment": "subtle light focus ring outside the pill shape"
    },
    {
      "component": "navigation.link",
      "state": "default",
      "treatment": "small muted gray text on transparent background"
    },
    {
      "component": "navigation.link",
      "state": "hover",
      "treatment": "text brightens toward white for higher contrast"
    }
  ],
  "components": {
    "button": {
      "description": "Rounded pill buttons; primary uses purple gradient fill, secondary uses dark translucent fill with subtle border and icon support."
    },
    "card": {
      "description": "Large centered prompt composer card with translucent dark background, soft corners, low-contrast border, and inset control row."
    },
    "input": {
      "description": "Chat-style multiline input area with placeholder text, dark glass surface, small rounded chips for integrations/model selection, and a compact send icon button."
    },
    "navigation": {
      "description": "Minimal top navigation with left-aligned logo, evenly spaced text links, and right-aligned auth/CTA actions."
    }
  },
  "layout": "top navigation above a centered hero with headline and supporting copy, followed by dual CTAs and a large prompt input panel over a glowing gradient backdrop with partner logos along the bottom",
  "visualElements": [
    {
      "name": "logo and nav",
      "col": 1,
      "row": 1,
      "zoom": 3
    },
    {
      "name": "hero headline",
      "col": 2,
      "row": 1,
      "zoom": 2.4
    },
    {
      "name": "cta buttons",
      "col": 2,
      "row": 2,
      "zoom": 3.5
    },
    {
      "name": "prompt panel",
      "col": 2,
      "row": 2,
      "zoom": 2.2
    },
    {
      "name": "gradient glow",
      "col": 1,
      "row": 3,
      "zoom": 2.8
    },
    {
      "name": "partner logos",
      "col": 2,
      "row": 3,
      "zoom": 3.2
    }
  ],
  "imagePath": "/knowledge-refs/ai-4-avoid.png",
  "imageName": "ai-4-avoid.png",
  "capturedAt": "2026-05-20T00:11:31.591Z",
  "model": "openai/gpt-5.4-20260305"
}
-->

# Style Spec — ai-4-avoid.png

## Style Spec (Markdown)

**Industry**: ai
**Image**: ai-4-avoid.png
**Vibe**: dark, futuristic, minimal, glowing, premium

**Summary**: A dark AI landing page with a cinematic neon glow, centered hero messaging, and soft glassy interface elements. The design pairs minimal monochrome typography with vivid purple-pink gradients for a futuristic, premium feel.

### Palette
- Primary: `#7c3aed` — electric purple
- Secondary: `#ec4899` — hot pink
- Accent: `#ffffff` — bright white
- Background: `#050507` — near-black
- Surface: `#1a1522` — smoky plum
- Text: `#f5f5f6` — soft white
- Text muted: `#8d8796` — muted gray-lilac
- Border: `#2d2536` — dim violet border

### Typography
- Heading font: Inter (weight 500)
- Body font: Inter (weight 400)
- Base size: 16px
- Note: large centered hero headings
- Note: mixed serif italic emphasis on key word
- Note: small muted navigation and supporting copy

### Spacing & Radius
- Spacing base: 8px; scale: 4, 8, 12, 16, 24, 32, 48, 64
- Radius: sm 6px, md 12px, lg 20px, pill 999px
- Shadows: 2 variant(s)
  - `0 8px 24px rgba(0,0,0,0.35)`
  - `0 0 40px rgba(124,58,237,0.22)`

### Gradients
- **hero-ambient-bg** (linear, 90deg) — main hero background glow rising from the bottom
  - stop 0%: `#050507`, alpha 1
  - stop 72%: `#7c3aed`, alpha 0.85
  - stop 100%: `#ec4899`, alpha 0.9
- **primary-button-fill** (linear, 90deg) — primary CTA button
  - stop 0%: `#8b5cf6`, alpha 1
  - stop 100%: `#7c3aed`, alpha 1

### Surface Effects
- **ambient neon glow**: background uses blurred purple and pink light blooms over a near-black canvas
  - `background: radial-gradient(circle at bottom left, rgba(124,58,237,0.55), transparent 35%), radial-gradient(circle at bottom right, rgba(236,72,153,0.45), transparent 35%), #050507`
  - `filter: blur(0px)`
- **soft glass panel**: large prompt input panel uses a translucent dark fill with subtle border and shadow
  - `background: rgba(26,21,34,0.82)`
  - `border: 1px solid rgba(255,255,255,0.08)`
  - `box-shadow: 0 8px 24px rgba(0,0,0,0.35)`

### Interaction State Tokens
- **button.primary.default**: rounded pill with vivid purple gradient fill and white text
- **button.primary.hover**: slightly brighter purple gradient with stronger outer glow
- **button.primary.focus**: subtle light focus ring outside the pill shape
- **navigation.link.default**: small muted gray text on transparent background
- **navigation.link.hover**: text brightens toward white for higher contrast

### Components
- **button**: Rounded pill buttons; primary uses purple gradient fill, secondary uses dark translucent fill with subtle border and icon support.
- **card**: Large centered prompt composer card with translucent dark background, soft corners, low-contrast border, and inset control row.
- **input**: Chat-style multiline input area with placeholder text, dark glass surface, small rounded chips for integrations/model selection, and a compact send icon button.
- **navigation**: Minimal top navigation with left-aligned logo, evenly spaced text links, and right-aligned auth/CTA actions.

### Layout
top navigation above a centered hero with headline and supporting copy, followed by dual CTAs and a large prompt input panel over a glowing gradient backdrop with partner logos along the bottom

### UI Elements
Named UI regions identified in the reference screenshot (col/row = 3×3 grid):
- **logo and nav** — col 1, row 1, zoom 3×
- **hero headline** — col 2, row 1, zoom 2.4×
- **cta buttons** — col 2, row 2, zoom 3.5×
- **prompt panel** — col 2, row 2, zoom 2.2×
- **gradient glow** — col 1, row 3, zoom 2.8×
- **partner logos** — col 2, row 3, zoom 3.2×

## Style Spec (HTML)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Style Spec — ai-4-avoid.png</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
    --color-primary:    #7c3aed;
    --color-secondary:  #ec4899;
    --color-accent:     #ffffff;
    --color-background: #050507;
    --color-surface:    #1a1522;
    --color-text:       #f5f5f6;
    --color-text-muted: #8d8796;
    --color-border:     #2d2536;
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
    <img src="/knowledge-refs/ai-4-avoid.png" alt="ai-4-avoid.png">
    <div class="header__body">
      <div class="kicker">ai</div>
      <h1>ai-4-avoid.png</h1>
      <p class="muted">A dark AI landing page with a cinematic neon glow, centered hero messaging, and soft glassy interface elements. The design pairs minimal monochrome typography with vivid purple-pink gradients for a futuristic, premium feel.</p>
      <div class="tags">
        <span class="tag">dark</span><span class="tag">futuristic</span><span class="tag">minimal</span><span class="tag">glowing</span><span class="tag">premium</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Palette</h2>
    <div class="palette">
    <div class="swatch">
      <div class="swatch__chip" style="background:#7c3aed"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Primary</div>
        <div class="swatch__hex">#7c3aed</div>
        <div class="swatch__name">electric purple</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#ec4899"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Secondary</div>
        <div class="swatch__hex">#ec4899</div>
        <div class="swatch__name">hot pink</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#ffffff"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Accent</div>
        <div class="swatch__hex">#ffffff</div>
        <div class="swatch__name">bright white</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#050507"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Background</div>
        <div class="swatch__hex">#050507</div>
        <div class="swatch__name">near-black</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#1a1522"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Surface</div>
        <div class="swatch__hex">#1a1522</div>
        <div class="swatch__name">smoky plum</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f5f5f6"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text</div>
        <div class="swatch__hex">#f5f5f6</div>
        <div class="swatch__name">soft white</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#8d8796"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text muted</div>
        <div class="swatch__hex">#8d8796</div>
        <div class="swatch__name">muted gray-lilac</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#2d2536"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Border</div>
        <div class="swatch__hex">#2d2536</div>
        <div class="swatch__name">dim violet border</div>
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

  <div class="section"><h2>Shadows</h2><div class="shadow-card" style="box-shadow:0 8px 24px rgba(0,0,0,0.35)">0 8px 24px rgba(0,0,0,0.35)</div><div class="shadow-card" style="box-shadow:0 0 40px rgba(124,58,237,0.22)">0 0 40px rgba(124,58,237,0.22)</div></div>

  <div class="section">
    <h2>Gradients</h2>
    <div class="signal-grid">
      <article class="signal-card">
        <div class="signal-preview" style="background:linear-gradient(90deg, #050507 0%, rgba(124, 58, 237, 0.85) 72%, rgba(236, 72, 153, 0.9) 100%);"></div>
        <div class="signal-title">hero-ambient-bg</div>
        <div class="signal-meta">linear 90deg · main hero background glow rising from the bottom</div>
        <div class="signal-code">0% #050507 @1  |  72% #7c3aed @0.85  |  100% #ec4899 @0.9</div>
      </article>
      <article class="signal-card">
        <div class="signal-preview" style="background:linear-gradient(90deg, #8b5cf6 0%, #7c3aed 100%);"></div>
        <div class="signal-title">primary-button-fill</div>
        <div class="signal-meta">linear 90deg · primary CTA button</div>
        <div class="signal-code">0% #8b5cf6 @1  |  100% #7c3aed @1</div>
      </article></div>
  </div>

  <div class="section">
    <h2>Surface Effects</h2>
    <div class="signal-grid">
      <article class="signal-card">
        <div class="signal-title">ambient neon glow</div>
        <div class="signal-meta">background uses blurred purple and pink light blooms over a near-black canvas</div>
        <div class="signal-code">background: radial-gradient(circle at bottom left, rgba(124,58,237,0.55), transparent 35%), radial-gradient(circle at bottom right, rgba(236,72,153,0.45), transparent 35%), #050507<br/>filter: blur(0px)</div>
      </article>
      <article class="signal-card">
        <div class="signal-title">soft glass panel</div>
        <div class="signal-meta">large prompt input panel uses a translucent dark fill with subtle border and shadow</div>
        <div class="signal-code">background: rgba(26,21,34,0.82)<br/>border: 1px solid rgba(255,255,255,0.08)<br/>box-shadow: 0 8px 24px rgba(0,0,0,0.35)</div>
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
        <td>rounded pill with vivid purple gradient fill and white text</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-hover">hover</span></td>
        <td>slightly brighter purple gradient with stronger outer glow</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-focus">focus</span></td>
        <td>subtle light focus ring outside the pill shape</td>
      </tr>
      <tr>
        <td>navigation.link</td>
        <td><span class="state-pill state-default">default</span></td>
        <td>small muted gray text on transparent background</td>
      </tr>
      <tr>
        <td>navigation.link</td>
        <td><span class="state-pill state-hover">hover</span></td>
        <td>text brightens toward white for higher contrast</td>
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
            src="/knowledge-refs/ai-4-avoid.png"
            alt="logo and nav"
            style="--ox:0%;--oy:0%;--zoom:3;"
            draggable="false"
          />
        </div>
        <figcaption>logo and nav</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/ai-4-avoid.png"
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
            src="/knowledge-refs/ai-4-avoid.png"
            alt="cta buttons"
            style="--ox:50%;--oy:50%;--zoom:3.5;"
            draggable="false"
          />
        </div>
        <figcaption>cta buttons</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/ai-4-avoid.png"
            alt="prompt panel"
            style="--ox:50%;--oy:50%;--zoom:2.2;"
            draggable="false"
          />
        </div>
        <figcaption>prompt panel</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/ai-4-avoid.png"
            alt="gradient glow"
            style="--ox:0%;--oy:100%;--zoom:2.8;"
            draggable="false"
          />
        </div>
        <figcaption>gradient glow</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/ai-4-avoid.png"
            alt="partner logos"
            style="--ox:50%;--oy:100%;--zoom:3.2;"
            draggable="false"
          />
        </div>
        <figcaption>partner logos</figcaption>
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
        <div class="component__desc">Rounded pill buttons; primary uses purple gradient fill, secondary uses dark translucent fill with subtle border and icon support.</div>
      </div>
      <div class="component">
        <div class="component__name">card</div>
        <div class="component__desc">Large centered prompt composer card with translucent dark background, soft corners, low-contrast border, and inset control row.</div>
      </div>
      <div class="component">
        <div class="component__name">input</div>
        <div class="component__desc">Chat-style multiline input area with placeholder text, dark glass surface, small rounded chips for integrations/model selection, and a compact send icon button.</div>
      </div>
      <div class="component">
        <div class="component__name">navigation</div>
        <div class="component__desc">Minimal top navigation with left-aligned logo, evenly spaced text links, and right-aligned auth/CTA actions.</div>
      </div></div>

  <div class="section"><h2>Layout pattern</h2><p>top navigation above a centered hero with headline and supporting copy, followed by dual CTAs and a large prompt input panel over a glowing gradient backdrop with partner logos along the bottom</p></div>
</body>
</html>
```

