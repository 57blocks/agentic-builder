---
{"id":"DK-img-auto-ai-2026-05-16-1-chatgpt","layer":"L1","kind":"design-knowledge","title":"Style Spec — auto-ai-2026-05-16-1-chatgpt.png","tags":["industry:generic","source:vision-distill","image:auto-ai-2026-05-16-1-chatgpt.png","manual:approved"],"source":"distill","refs":{},"createdAt":1778926016077,"updatedAt":1779236014280,"schemaVersion":1}
---

<!-- style-spec:json
{
  "industry": "generic",
  "summary": "A highly minimal light-theme conversational interface with generous whitespace, soft neutral surfaces, and understated monochrome controls. The design relies on subtle borders, rounded pills, and sparse iconography rather than strong color or decoration.",
  "vibe": [
    "minimal",
    "clean",
    "soft",
    "neutral",
    "editorial"
  ],
  "palette": {
    "primary": {
      "hex": "#111111",
      "label": "near-black UI ink"
    },
    "secondary": {
      "hex": "#e9e9e9",
      "label": "soft neutral panel"
    },
    "accent": {
      "hex": "#000000",
      "label": "solid black CTA"
    },
    "background": {
      "hex": "#f4f4f4",
      "label": "app canvas"
    },
    "surface": {
      "hex": "#ffffff",
      "label": "card and input surface"
    },
    "text": {
      "hex": "#202020",
      "label": "primary text"
    },
    "textMuted": {
      "hex": "#8a8a8a",
      "label": "muted placeholder and supporting text"
    },
    "border": {
      "hex": "#d9d9d9",
      "label": "hairline border"
    }
  },
  "typography": {
    "headingFont": "Inter",
    "bodyFont": "Inter",
    "headingWeight": 500,
    "bodyWeight": 400,
    "baseSizePx": 16,
    "notes": [
      "medium-weight sans headings",
      "small muted utility text",
      "minimal typographic hierarchy"
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
    "0 0 0 1px rgba(0,0,0,0.06)"
  ],
  "surfaceEffects": [
    {
      "name": "soft-outline",
      "description": "surfaces use very light borders and almost no elevation, creating a quiet flat appearance",
      "cssHints": [
        "background: #ffffff",
        "border: 1px solid #d9d9d9",
        "box-shadow: 0 1px 2px rgba(0,0,0,0.04)"
      ]
    }
  ],
  "stateTokens": [
    {
      "component": "button.primary",
      "state": "default",
      "treatment": "solid black pill with white text and no visible border"
    },
    {
      "component": "button.primary",
      "state": "hover",
      "treatment": "slightly softened black fill with subtle elevation increase"
    },
    {
      "component": "button.primary",
      "state": "focus",
      "treatment": "thin dark outer ring around the pill"
    },
    {
      "component": "input",
      "state": "default",
      "treatment": "white pill field with light gray border and muted placeholder"
    },
    {
      "component": "input",
      "state": "focus",
      "treatment": "clearer gray border and slightly darker text/icons"
    }
  ],
  "components": {
    "button": {
      "description": "Rounded pill buttons; primary action is black with white text, secondary actions are white or very light gray with thin gray outlines and dark text."
    },
    "card": {
      "description": "Large framed content canvas and sidebar panels use flat white or very pale gray surfaces with subtle strokes and modest corner rounding."
    },
    "input": {
      "description": "Long horizontal pill input centered on the page, with left utility icon, muted placeholder, and compact right-side voice action cluster."
    },
    "navigation": {
      "description": "Left sidebar with icon-plus-label nav items, light selected row highlight, and top bar branding with utility auth buttons on the right."
    }
  },
  "layout": "fixed left sidebar + top app bar + centered prompt headline + wide composer input + footer legal text",
  "visualElements": [
    {
      "name": "sidebar nav",
      "col": 1,
      "row": 1,
      "zoom": 2.6
    },
    {
      "name": "brand header",
      "col": 2,
      "row": 1,
      "zoom": 3.2
    },
    {
      "name": "auth buttons",
      "col": 3,
      "row": 1,
      "zoom": 3.5
    },
    {
      "name": "hero headline",
      "col": 2,
      "row": 2,
      "zoom": 3.2
    },
    {
      "name": "prompt input",
      "col": 2,
      "row": 2,
      "zoom": 2.4
    },
    {
      "name": "login panel",
      "col": 1,
      "row": 3,
      "zoom": 2.8
    }
  ],
  "imagePath": "/knowledge-refs/auto-ai-2026-05-16-1-chatgpt.png",
  "imageName": "auto-ai-2026-05-16-1-chatgpt.png",
  "capturedAt": "2026-05-20T00:13:34.279Z",
  "model": "openai/gpt-5.4-20260305"
}
-->

# Style Spec — auto-ai-2026-05-16-1-chatgpt.png

## Style Spec (Markdown)

**Industry**: generic
**Image**: auto-ai-2026-05-16-1-chatgpt.png
**Vibe**: minimal, clean, soft, neutral, editorial

**Summary**: A highly minimal light-theme conversational interface with generous whitespace, soft neutral surfaces, and understated monochrome controls. The design relies on subtle borders, rounded pills, and sparse iconography rather than strong color or decoration.

### Palette
- Primary: `#111111` — near-black UI ink
- Secondary: `#e9e9e9` — soft neutral panel
- Accent: `#000000` — solid black CTA
- Background: `#f4f4f4` — app canvas
- Surface: `#ffffff` — card and input surface
- Text: `#202020` — primary text
- Text muted: `#8a8a8a` — muted placeholder and supporting text
- Border: `#d9d9d9` — hairline border

### Typography
- Heading font: Inter (weight 500)
- Body font: Inter (weight 400)
- Base size: 16px
- Note: medium-weight sans headings
- Note: small muted utility text
- Note: minimal typographic hierarchy

### Spacing & Radius
- Spacing base: 8px; scale: 4, 8, 12, 16, 24, 32, 48, 64
- Radius: sm 6px, md 12px, lg 24px, pill 999px
- Shadows: 2 variant(s)
  - `0 1px 2px rgba(0,0,0,0.04)`
  - `0 0 0 1px rgba(0,0,0,0.06)`

### Surface Effects
- **soft-outline**: surfaces use very light borders and almost no elevation, creating a quiet flat appearance
  - `background: #ffffff`
  - `border: 1px solid #d9d9d9`
  - `box-shadow: 0 1px 2px rgba(0,0,0,0.04)`

### Interaction State Tokens
- **button.primary.default**: solid black pill with white text and no visible border
- **button.primary.hover**: slightly softened black fill with subtle elevation increase
- **button.primary.focus**: thin dark outer ring around the pill
- **input.default**: white pill field with light gray border and muted placeholder
- **input.focus**: clearer gray border and slightly darker text/icons

### Components
- **button**: Rounded pill buttons; primary action is black with white text, secondary actions are white or very light gray with thin gray outlines and dark text.
- **card**: Large framed content canvas and sidebar panels use flat white or very pale gray surfaces with subtle strokes and modest corner rounding.
- **input**: Long horizontal pill input centered on the page, with left utility icon, muted placeholder, and compact right-side voice action cluster.
- **navigation**: Left sidebar with icon-plus-label nav items, light selected row highlight, and top bar branding with utility auth buttons on the right.

### Layout
fixed left sidebar + top app bar + centered prompt headline + wide composer input + footer legal text

### UI Elements
Named UI regions identified in the reference screenshot (col/row = 3×3 grid):
- **sidebar nav** — col 1, row 1, zoom 2.6×
- **brand header** — col 2, row 1, zoom 3.2×
- **auth buttons** — col 3, row 1, zoom 3.5×
- **hero headline** — col 2, row 2, zoom 3.2×
- **prompt input** — col 2, row 2, zoom 2.4×
- **login panel** — col 1, row 3, zoom 2.8×

## Style Spec (HTML)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Style Spec — auto-ai-2026-05-16-1-chatgpt.png</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
    --color-primary:    #111111;
    --color-secondary:  #e9e9e9;
    --color-accent:     #000000;
    --color-background: #f4f4f4;
    --color-surface:    #ffffff;
    --color-text:       #202020;
    --color-text-muted: #8a8a8a;
    --color-border:     #d9d9d9;
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
    <img src="/knowledge-refs/auto-ai-2026-05-16-1-chatgpt.png" alt="auto-ai-2026-05-16-1-chatgpt.png">
    <div class="header__body">
      <div class="kicker">generic</div>
      <h1>auto-ai-2026-05-16-1-chatgpt.png</h1>
      <p class="muted">A highly minimal light-theme conversational interface with generous whitespace, soft neutral surfaces, and understated monochrome controls. The design relies on subtle borders, rounded pills, and sparse iconography rather than strong color or decoration.</p>
      <div class="tags">
        <span class="tag">minimal</span><span class="tag">clean</span><span class="tag">soft</span><span class="tag">neutral</span><span class="tag">editorial</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Palette</h2>
    <div class="palette">
    <div class="swatch">
      <div class="swatch__chip" style="background:#111111"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Primary</div>
        <div class="swatch__hex">#111111</div>
        <div class="swatch__name">near-black UI ink</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#e9e9e9"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Secondary</div>
        <div class="swatch__hex">#e9e9e9</div>
        <div class="swatch__name">soft neutral panel</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#000000"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Accent</div>
        <div class="swatch__hex">#000000</div>
        <div class="swatch__name">solid black CTA</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f4f4f4"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Background</div>
        <div class="swatch__hex">#f4f4f4</div>
        <div class="swatch__name">app canvas</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#ffffff"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Surface</div>
        <div class="swatch__hex">#ffffff</div>
        <div class="swatch__name">card and input surface</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#202020"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text</div>
        <div class="swatch__hex">#202020</div>
        <div class="swatch__name">primary text</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#8a8a8a"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text muted</div>
        <div class="swatch__hex">#8a8a8a</div>
        <div class="swatch__name">muted placeholder and supporting text</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#d9d9d9"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Border</div>
        <div class="swatch__hex">#d9d9d9</div>
        <div class="swatch__name">hairline border</div>
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

  <div class="section"><h2>Shadows</h2><div class="shadow-card" style="box-shadow:0 1px 2px rgba(0,0,0,0.04)">0 1px 2px rgba(0,0,0,0.04)</div><div class="shadow-card" style="box-shadow:0 0 0 1px rgba(0,0,0,0.06)">0 0 0 1px rgba(0,0,0,0.06)</div></div>

  

  <div class="section">
    <h2>Surface Effects</h2>
    <div class="signal-grid">
      <article class="signal-card">
        <div class="signal-title">soft-outline</div>
        <div class="signal-meta">surfaces use very light borders and almost no elevation, creating a quiet flat appearance</div>
        <div class="signal-code">background: #ffffff<br/>border: 1px solid #d9d9d9<br/>box-shadow: 0 1px 2px rgba(0,0,0,0.04)</div>
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
        <td>solid black pill with white text and no visible border</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-hover">hover</span></td>
        <td>slightly softened black fill with subtle elevation increase</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-focus">focus</span></td>
        <td>thin dark outer ring around the pill</td>
      </tr>
      <tr>
        <td>input</td>
        <td><span class="state-pill state-default">default</span></td>
        <td>white pill field with light gray border and muted placeholder</td>
      </tr>
      <tr>
        <td>input</td>
        <td><span class="state-pill state-focus">focus</span></td>
        <td>clearer gray border and slightly darker text/icons</td>
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
            src="/knowledge-refs/auto-ai-2026-05-16-1-chatgpt.png"
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
            src="/knowledge-refs/auto-ai-2026-05-16-1-chatgpt.png"
            alt="brand header"
            style="--ox:50%;--oy:0%;--zoom:3.2;"
            draggable="false"
          />
        </div>
        <figcaption>brand header</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/auto-ai-2026-05-16-1-chatgpt.png"
            alt="auth buttons"
            style="--ox:100%;--oy:0%;--zoom:3.5;"
            draggable="false"
          />
        </div>
        <figcaption>auth buttons</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/auto-ai-2026-05-16-1-chatgpt.png"
            alt="hero headline"
            style="--ox:50%;--oy:50%;--zoom:3.2;"
            draggable="false"
          />
        </div>
        <figcaption>hero headline</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/auto-ai-2026-05-16-1-chatgpt.png"
            alt="prompt input"
            style="--ox:50%;--oy:50%;--zoom:2.4;"
            draggable="false"
          />
        </div>
        <figcaption>prompt input</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/auto-ai-2026-05-16-1-chatgpt.png"
            alt="login panel"
            style="--ox:0%;--oy:100%;--zoom:2.8;"
            draggable="false"
          />
        </div>
        <figcaption>login panel</figcaption>
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
        <div class="component__desc">Rounded pill buttons; primary action is black with white text, secondary actions are white or very light gray with thin gray outlines and dark text.</div>
      </div>
      <div class="component">
        <div class="component__name">card</div>
        <div class="component__desc">Large framed content canvas and sidebar panels use flat white or very pale gray surfaces with subtle strokes and modest corner rounding.</div>
      </div>
      <div class="component">
        <div class="component__name">input</div>
        <div class="component__desc">Long horizontal pill input centered on the page, with left utility icon, muted placeholder, and compact right-side voice action cluster.</div>
      </div>
      <div class="component">
        <div class="component__name">navigation</div>
        <div class="component__desc">Left sidebar with icon-plus-label nav items, light selected row highlight, and top bar branding with utility auth buttons on the right.</div>
      </div></div>

  <div class="section"><h2>Layout pattern</h2><p>fixed left sidebar + top app bar + centered prompt headline + wide composer input + footer legal text</p></div>
</body>
</html>
```

