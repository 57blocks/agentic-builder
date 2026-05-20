---
{"id":"DK-img-ai-1-lumina","layer":"L1","kind":"design-knowledge","title":"Style Spec — ai-1-lumina.png","tags":["industry:ai","source:vision-distill","image:ai-1-lumina.png","manual:approved"],"source":"distill","refs":{},"createdAt":1778922739441,"updatedAt":1779235826892,"schemaVersion":1}
---

<!-- style-spec:json
{
  "industry": "ai",
  "summary": "A clean AI assistant landing/input screen with a soft light-gray background, large conversational headline, and subtle card-based prompt suggestions. The interface feels approachable and minimal, using a purple gradient accent to add personality without overwhelming the layout.",
  "vibe": [
    "minimal",
    "clean",
    "friendly",
    "modern",
    "soft"
  ],
  "palette": {
    "primary": {
      "hex": "#7a4fe0",
      "label": "assistant purple"
    },
    "secondary": {
      "hex": "#b34b8d",
      "label": "magenta gradient start"
    },
    "accent": {
      "hex": "#8a63f6",
      "label": "cta violet"
    },
    "background": {
      "hex": "#f2f2f2",
      "label": "app background"
    },
    "surface": {
      "hex": "#f7f7f7",
      "label": "card and input surface"
    },
    "text": {
      "hex": "#1f1f1f",
      "label": "primary text"
    },
    "textMuted": {
      "hex": "#8f8f8f",
      "label": "secondary text"
    },
    "border": {
      "hex": "#e3e3e3",
      "label": "subtle border"
    }
  },
  "typography": {
    "headingFont": "Inter",
    "bodyFont": "Inter",
    "headingWeight": 700,
    "bodyWeight": 400,
    "baseSizePx": 16,
    "notes": [
      "oversized greeting headline",
      "gradient-filled emphasis text",
      "small muted helper copy"
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
    "lgPx": 16,
    "pillPx": 999
  },
  "shadows": [
    "0 1px 2px rgba(0,0,0,0.04)",
    "0 4px 12px rgba(0,0,0,0.05)"
  ],
  "gradients": [
    {
      "id": "headline-accent",
      "type": "linear",
      "angleDeg": 90,
      "stops": [
        {
          "color": "#b34b8d",
          "positionPct": 0,
          "opacity": 1
        },
        {
          "color": "#8a4fd8",
          "positionPct": 55,
          "opacity": 1
        },
        {
          "color": "#6b5cf0",
          "positionPct": 100,
          "opacity": 1
        }
      ],
      "usage": "highlighted name and question text in hero heading"
    },
    {
      "id": "cta-button",
      "type": "linear",
      "angleDeg": 135,
      "stops": [
        {
          "color": "#8d62f5",
          "positionPct": 0,
          "opacity": 1
        },
        {
          "color": "#6d47d8",
          "positionPct": 100,
          "opacity": 1
        }
      ],
      "usage": "send arrow button background"
    }
  ],
  "surfaceEffects": [
    {
      "name": "soft-flat-card",
      "description": "cards and input areas use barely elevated light surfaces with thin borders and minimal shadow",
      "cssHints": [
        "background: #f7f7f7",
        "border: 1px solid #e3e3e3",
        "box-shadow: 0 1px 2px rgba(0,0,0,0.04)"
      ]
    }
  ],
  "stateTokens": [
    {
      "component": "button.primary",
      "state": "default",
      "treatment": "small rounded square button with violet gradient fill and white arrow icon"
    },
    {
      "component": "button.primary",
      "state": "hover",
      "treatment": "slightly deeper purple gradient with stronger shadow for lift"
    },
    {
      "component": "button.primary",
      "state": "focus",
      "treatment": "subtle purple outer ring around the compact button"
    },
    {
      "component": "card.prompt",
      "state": "hover",
      "treatment": "light border darkens slightly and surface becomes marginally brighter"
    },
    {
      "component": "input.chat",
      "state": "focus",
      "treatment": "clean light field with more visible border and soft purple focus glow"
    }
  ],
  "components": {
    "button": {
      "description": "Primary action is a compact icon-only send button with rounded corners and violet gradient fill; secondary actions are text-plus-icon ghost controls in muted gray."
    },
    "card": {
      "description": "Prompt suggestion cards are small rounded rectangles with light gray fill, subtle border, concise multiline labels, and tiny monochrome icons anchored near the lower left."
    },
    "input": {
      "description": "Large chat input container spans most of the content width, with generous padding, top-left placeholder prompt, utility actions along the bottom left, and model selector plus character counter on the right."
    },
    "navigation": {
      "description": "No full navigation bar is visible; utility controls are lightweight inline labels and icon buttons integrated directly into the content area."
    }
  },
  "layout": "centered single-column assistant welcome layout with large hero text, four prompt cards in a row, a refresh utility link, and a wide chat composer beneath",
  "visualElements": [
    {
      "name": "hero headline",
      "col": 1,
      "row": 1,
      "zoom": 2.6
    },
    {
      "name": "prompt cards",
      "col": 2,
      "row": 2,
      "zoom": 2.8
    },
    {
      "name": "refresh link",
      "col": 1,
      "row": 2,
      "zoom": 4
    },
    {
      "name": "chat input",
      "col": 2,
      "row": 3,
      "zoom": 2.3
    },
    {
      "name": "model selector",
      "col": 3,
      "row": 3,
      "zoom": 4.2
    },
    {
      "name": "send button",
      "col": 3,
      "row": 3,
      "zoom": 4.8
    }
  ],
  "imagePath": "/knowledge-refs/ai-1-lumina.png",
  "imageName": "ai-1-lumina.png",
  "capturedAt": "2026-05-20T00:10:26.889Z",
  "model": "openai/gpt-5.4-20260305"
}
-->

# Style Spec — ai-1-lumina.png

## Style Spec (Markdown)

**Industry**: ai
**Image**: ai-1-lumina.png
**Vibe**: minimal, clean, friendly, modern, soft

**Summary**: A clean AI assistant landing/input screen with a soft light-gray background, large conversational headline, and subtle card-based prompt suggestions. The interface feels approachable and minimal, using a purple gradient accent to add personality without overwhelming the layout.

### Palette
- Primary: `#7a4fe0` — assistant purple
- Secondary: `#b34b8d` — magenta gradient start
- Accent: `#8a63f6` — cta violet
- Background: `#f2f2f2` — app background
- Surface: `#f7f7f7` — card and input surface
- Text: `#1f1f1f` — primary text
- Text muted: `#8f8f8f` — secondary text
- Border: `#e3e3e3` — subtle border

### Typography
- Heading font: Inter (weight 700)
- Body font: Inter (weight 400)
- Base size: 16px
- Note: oversized greeting headline
- Note: gradient-filled emphasis text
- Note: small muted helper copy

### Spacing & Radius
- Spacing base: 8px; scale: 4, 8, 12, 16, 24, 32, 48, 64
- Radius: sm 6px, md 12px, lg 16px, pill 999px
- Shadows: 2 variant(s)
  - `0 1px 2px rgba(0,0,0,0.04)`
  - `0 4px 12px rgba(0,0,0,0.05)`

### Gradients
- **headline-accent** (linear, 90deg) — highlighted name and question text in hero heading
  - stop 0%: `#b34b8d`, alpha 1
  - stop 55%: `#8a4fd8`, alpha 1
  - stop 100%: `#6b5cf0`, alpha 1
- **cta-button** (linear, 135deg) — send arrow button background
  - stop 0%: `#8d62f5`, alpha 1
  - stop 100%: `#6d47d8`, alpha 1

### Surface Effects
- **soft-flat-card**: cards and input areas use barely elevated light surfaces with thin borders and minimal shadow
  - `background: #f7f7f7`
  - `border: 1px solid #e3e3e3`
  - `box-shadow: 0 1px 2px rgba(0,0,0,0.04)`

### Interaction State Tokens
- **button.primary.default**: small rounded square button with violet gradient fill and white arrow icon
- **button.primary.hover**: slightly deeper purple gradient with stronger shadow for lift
- **button.primary.focus**: subtle purple outer ring around the compact button
- **card.prompt.hover**: light border darkens slightly and surface becomes marginally brighter
- **input.chat.focus**: clean light field with more visible border and soft purple focus glow

### Components
- **button**: Primary action is a compact icon-only send button with rounded corners and violet gradient fill; secondary actions are text-plus-icon ghost controls in muted gray.
- **card**: Prompt suggestion cards are small rounded rectangles with light gray fill, subtle border, concise multiline labels, and tiny monochrome icons anchored near the lower left.
- **input**: Large chat input container spans most of the content width, with generous padding, top-left placeholder prompt, utility actions along the bottom left, and model selector plus character counter on the right.
- **navigation**: No full navigation bar is visible; utility controls are lightweight inline labels and icon buttons integrated directly into the content area.

### Layout
centered single-column assistant welcome layout with large hero text, four prompt cards in a row, a refresh utility link, and a wide chat composer beneath

### UI Elements
Named UI regions identified in the reference screenshot (col/row = 3×3 grid):
- **hero headline** — col 1, row 1, zoom 2.6×
- **prompt cards** — col 2, row 2, zoom 2.8×
- **refresh link** — col 1, row 2, zoom 4×
- **chat input** — col 2, row 3, zoom 2.3×
- **model selector** — col 3, row 3, zoom 4.2×
- **send button** — col 3, row 3, zoom 4.8×

## Style Spec (HTML)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Style Spec — ai-1-lumina.png</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
    --color-primary:    #7a4fe0;
    --color-secondary:  #b34b8d;
    --color-accent:     #8a63f6;
    --color-background: #f2f2f2;
    --color-surface:    #f7f7f7;
    --color-text:       #1f1f1f;
    --color-text-muted: #8f8f8f;
    --color-border:     #e3e3e3;
    --color-success:    #22c55e;
    --color-warning:    #f59e0b;
    --color-danger:     #ef4444;
    --font-heading: 'Inter', system-ui, sans-serif;
    --font-body:    'Inter', system-ui, sans-serif;
    --font-mono:    'JetBrains Mono', ui-monospace, monospace;
    --weight-heading: 700;
    --weight-body:    400;
    --size-base:      16px;
    --radius-sm: 6px;
    --radius-md: 12px;
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
    <img src="/knowledge-refs/ai-1-lumina.png" alt="ai-1-lumina.png">
    <div class="header__body">
      <div class="kicker">ai</div>
      <h1>ai-1-lumina.png</h1>
      <p class="muted">A clean AI assistant landing/input screen with a soft light-gray background, large conversational headline, and subtle card-based prompt suggestions. The interface feels approachable and minimal, using a purple gradient accent to add personality without overwhelming the layout.</p>
      <div class="tags">
        <span class="tag">minimal</span><span class="tag">clean</span><span class="tag">friendly</span><span class="tag">modern</span><span class="tag">soft</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Palette</h2>
    <div class="palette">
    <div class="swatch">
      <div class="swatch__chip" style="background:#7a4fe0"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Primary</div>
        <div class="swatch__hex">#7a4fe0</div>
        <div class="swatch__name">assistant purple</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#b34b8d"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Secondary</div>
        <div class="swatch__hex">#b34b8d</div>
        <div class="swatch__name">magenta gradient start</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#8a63f6"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Accent</div>
        <div class="swatch__hex">#8a63f6</div>
        <div class="swatch__name">cta violet</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f2f2f2"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Background</div>
        <div class="swatch__hex">#f2f2f2</div>
        <div class="swatch__name">app background</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f7f7f7"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Surface</div>
        <div class="swatch__hex">#f7f7f7</div>
        <div class="swatch__name">card and input surface</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#1f1f1f"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text</div>
        <div class="swatch__hex">#1f1f1f</div>
        <div class="swatch__name">primary text</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#8f8f8f"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text muted</div>
        <div class="swatch__hex">#8f8f8f</div>
        <div class="swatch__name">secondary text</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#e3e3e3"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Border</div>
        <div class="swatch__hex">#e3e3e3</div>
        <div class="swatch__name">subtle border</div>
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

  <div class="section"><h2>Shadows</h2><div class="shadow-card" style="box-shadow:0 1px 2px rgba(0,0,0,0.04)">0 1px 2px rgba(0,0,0,0.04)</div><div class="shadow-card" style="box-shadow:0 4px 12px rgba(0,0,0,0.05)">0 4px 12px rgba(0,0,0,0.05)</div></div>

  <div class="section">
    <h2>Gradients</h2>
    <div class="signal-grid">
      <article class="signal-card">
        <div class="signal-preview" style="background:linear-gradient(90deg, #b34b8d 0%, #8a4fd8 55%, #6b5cf0 100%);"></div>
        <div class="signal-title">headline-accent</div>
        <div class="signal-meta">linear 90deg · highlighted name and question text in hero heading</div>
        <div class="signal-code">0% #b34b8d @1  |  55% #8a4fd8 @1  |  100% #6b5cf0 @1</div>
      </article>
      <article class="signal-card">
        <div class="signal-preview" style="background:linear-gradient(135deg, #8d62f5 0%, #6d47d8 100%);"></div>
        <div class="signal-title">cta-button</div>
        <div class="signal-meta">linear 135deg · send arrow button background</div>
        <div class="signal-code">0% #8d62f5 @1  |  100% #6d47d8 @1</div>
      </article></div>
  </div>

  <div class="section">
    <h2>Surface Effects</h2>
    <div class="signal-grid">
      <article class="signal-card">
        <div class="signal-title">soft-flat-card</div>
        <div class="signal-meta">cards and input areas use barely elevated light surfaces with thin borders and minimal shadow</div>
        <div class="signal-code">background: #f7f7f7<br/>border: 1px solid #e3e3e3<br/>box-shadow: 0 1px 2px rgba(0,0,0,0.04)</div>
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
        <td>small rounded square button with violet gradient fill and white arrow icon</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-hover">hover</span></td>
        <td>slightly deeper purple gradient with stronger shadow for lift</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-focus">focus</span></td>
        <td>subtle purple outer ring around the compact button</td>
      </tr>
      <tr>
        <td>card.prompt</td>
        <td><span class="state-pill state-hover">hover</span></td>
        <td>light border darkens slightly and surface becomes marginally brighter</td>
      </tr>
      <tr>
        <td>input.chat</td>
        <td><span class="state-pill state-focus">focus</span></td>
        <td>clean light field with more visible border and soft purple focus glow</td>
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
            src="/knowledge-refs/ai-1-lumina.png"
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
            src="/knowledge-refs/ai-1-lumina.png"
            alt="prompt cards"
            style="--ox:50%;--oy:50%;--zoom:2.8;"
            draggable="false"
          />
        </div>
        <figcaption>prompt cards</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/ai-1-lumina.png"
            alt="refresh link"
            style="--ox:0%;--oy:50%;--zoom:4;"
            draggable="false"
          />
        </div>
        <figcaption>refresh link</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/ai-1-lumina.png"
            alt="chat input"
            style="--ox:50%;--oy:100%;--zoom:2.3;"
            draggable="false"
          />
        </div>
        <figcaption>chat input</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/ai-1-lumina.png"
            alt="model selector"
            style="--ox:100%;--oy:100%;--zoom:4.2;"
            draggable="false"
          />
        </div>
        <figcaption>model selector</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/ai-1-lumina.png"
            alt="send button"
            style="--ox:100%;--oy:100%;--zoom:4.8;"
            draggable="false"
          />
        </div>
        <figcaption>send button</figcaption>
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
        <div class="component__desc">Primary action is a compact icon-only send button with rounded corners and violet gradient fill; secondary actions are text-plus-icon ghost controls in muted gray.</div>
      </div>
      <div class="component">
        <div class="component__name">card</div>
        <div class="component__desc">Prompt suggestion cards are small rounded rectangles with light gray fill, subtle border, concise multiline labels, and tiny monochrome icons anchored near the lower left.</div>
      </div>
      <div class="component">
        <div class="component__name">input</div>
        <div class="component__desc">Large chat input container spans most of the content width, with generous padding, top-left placeholder prompt, utility actions along the bottom left, and model selector plus character counter on the right.</div>
      </div>
      <div class="component">
        <div class="component__name">navigation</div>
        <div class="component__desc">No full navigation bar is visible; utility controls are lightweight inline labels and icon buttons integrated directly into the content area.</div>
      </div></div>

  <div class="section"><h2>Layout pattern</h2><p>centered single-column assistant welcome layout with large hero text, four prompt cards in a row, a refresh utility link, and a wide chat composer beneath</p></div>
</body>
</html>
```

