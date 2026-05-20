---
{"id":"DK-img-fintech-web3-1776926420037","layer":"L1","kind":"design-knowledge","title":"Style Spec — fintech-web3-1776926420037.jpg","tags":["industry:fintech-web3","source:vision-distill","image:fintech-web3-1776926420037.jpg","manual:approved"],"source":"distill","refs":{},"createdAt":1778923024116,"updatedAt":1779236447165,"schemaVersion":1}
---

<!-- style-spec:json
{
  "industry": "fintech-web3",
  "summary": "A retro-terminal inspired market discovery dashboard that combines muted utility tones with sharp safety-orange highlights. The layout feels like an institutional trading tool reimagined with editorial hero messaging and low-noise, command-line interface styling.",
  "vibe": [
    "retro",
    "terminal",
    "utilitarian",
    "minimal",
    "editorial"
  ],
  "palette": {
    "primary": {
      "hex": "#fa4c00",
      "label": "safety orange"
    },
    "secondary": {
      "hex": "#003f25",
      "label": "deep terminal green"
    },
    "accent": {
      "hex": "#9bea00",
      "label": "neon lime"
    },
    "background": {
      "hex": "#c1c2b4",
      "label": "muted sage gray"
    },
    "surface": {
      "hex": "#f2f1ef",
      "label": "soft off-white"
    },
    "text": {
      "hex": "#002d1b",
      "label": "dark green-black"
    },
    "textMuted": {
      "hex": "#7c7f74",
      "label": "faded gray olive"
    },
    "border": {
      "hex": "#9ca08f",
      "label": "dusty olive border"
    },
    "success": {
      "hex": "#9bea00",
      "label": "neon lime"
    },
    "warning": {
      "hex": "#e3a185",
      "label": "dusty peach"
    },
    "danger": {
      "hex": "#fa4c00",
      "label": "alert orange"
    }
  },
  "typography": {
    "headingFont": "Inter",
    "bodyFont": "Inter",
    "monoFont": "JetBrains Mono",
    "headingWeight": 700,
    "bodyWeight": 400,
    "baseSizePx": 16,
    "notes": [
      "condensed uppercase hero headings",
      "mono UI labels and system text",
      "wide letter spacing on metadata"
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
    "smPx": 2,
    "mdPx": 4,
    "lgPx": 8,
    "pillPx": 999
  },
  "shadows": [
    "0 1px 0 rgba(0,45,27,0.10)",
    "0 2px 6px rgba(0,45,27,0.08)"
  ],
  "stateTokens": [
    {
      "component": "button.primary",
      "state": "default",
      "treatment": "muted peach fill with thin olive border and uppercase label"
    },
    {
      "component": "button.primary",
      "state": "hover",
      "treatment": "slightly stronger orange tint with darker border and increased contrast"
    },
    {
      "component": "button.primary",
      "state": "focus",
      "treatment": "thin high-contrast outline using bright lime or orange around the rectangular button"
    },
    {
      "component": "sidebar.navItem",
      "state": "active",
      "treatment": "dark green inset panel with subtle border and lime status dot"
    },
    {
      "component": "input.urlField",
      "state": "focus",
      "treatment": "clean light surface with sharper border and restrained glow-free emphasis"
    }
  ],
  "components": {
    "button": {
      "description": "Rectangular action button with muted peach fill, fine border, uppercase mono label, and minimal radius; visually aligned with industrial control panels."
    },
    "card": {
      "description": "Terminal-style dark green panel with thin divider line, tiny status indicator, mono text, and low-radius corners."
    },
    "input": {
      "description": "Wide horizontal input bar on an off-white surface with dark text, subtle border, left icon, and spacious internal padding."
    },
    "navigation": {
      "description": "Fixed left sidebar in deep green with stacked icon-label nav items, uppercase section labels, and one highlighted active row."
    }
  },
  "layout": "top utility bar + fixed left sidebar navigation + centered hero copy + wide URL input with CTA + tag filters + terminal progress panel",
  "visualElements": [
    {
      "name": "brand top bar",
      "col": 1,
      "row": 1,
      "zoom": 2.6
    },
    {
      "name": "sidebar nav",
      "col": 1,
      "row": 2,
      "zoom": 2.2
    },
    {
      "name": "hero headline",
      "col": 2,
      "row": 1,
      "zoom": 2.4
    },
    {
      "name": "url input",
      "col": 2,
      "row": 2,
      "zoom": 3.2
    },
    {
      "name": "scan button",
      "col": 3,
      "row": 2,
      "zoom": 4.2
    },
    {
      "name": "terminal status",
      "col": 2,
      "row": 3,
      "zoom": 2.8
    }
  ],
  "imagePath": "/knowledge-refs/fintech-web3-1776926420037.jpg",
  "imageName": "fintech-web3-1776926420037.jpg",
  "capturedAt": "2026-05-20T00:20:47.165Z",
  "model": "openai/gpt-5.4-20260305"
}
-->

# Style Spec — fintech-web3-1776926420037.jpg

## Style Spec (Markdown)

**Industry**: fintech-web3
**Image**: fintech-web3-1776926420037.jpg
**Vibe**: retro, terminal, utilitarian, minimal, editorial

**Summary**: A retro-terminal inspired market discovery dashboard that combines muted utility tones with sharp safety-orange highlights. The layout feels like an institutional trading tool reimagined with editorial hero messaging and low-noise, command-line interface styling.

### Palette
- Primary: `#fa4c00` — safety orange
- Secondary: `#003f25` — deep terminal green
- Accent: `#9bea00` — neon lime
- Background: `#c1c2b4` — muted sage gray
- Surface: `#f2f1ef` — soft off-white
- Text: `#002d1b` — dark green-black
- Text muted: `#7c7f74` — faded gray olive
- Border: `#9ca08f` — dusty olive border
- Success: `#9bea00` — neon lime
- Warning: `#e3a185` — dusty peach
- Danger: `#fa4c00` — alert orange

### Typography
- Heading font: Inter (weight 700)
- Body font: Inter (weight 400)
- Mono font: JetBrains Mono
- Base size: 16px
- Note: condensed uppercase hero headings
- Note: mono UI labels and system text
- Note: wide letter spacing on metadata

### Spacing & Radius
- Spacing base: 8px; scale: 4, 8, 12, 16, 24, 32, 48, 64
- Radius: sm 2px, md 4px, lg 8px, pill 999px
- Shadows: 2 variant(s)
  - `0 1px 0 rgba(0,45,27,0.10)`
  - `0 2px 6px rgba(0,45,27,0.08)`

### Interaction State Tokens
- **button.primary.default**: muted peach fill with thin olive border and uppercase label
- **button.primary.hover**: slightly stronger orange tint with darker border and increased contrast
- **button.primary.focus**: thin high-contrast outline using bright lime or orange around the rectangular button
- **sidebar.navItem.active**: dark green inset panel with subtle border and lime status dot
- **input.urlField.focus**: clean light surface with sharper border and restrained glow-free emphasis

### Components
- **button**: Rectangular action button with muted peach fill, fine border, uppercase mono label, and minimal radius; visually aligned with industrial control panels.
- **card**: Terminal-style dark green panel with thin divider line, tiny status indicator, mono text, and low-radius corners.
- **input**: Wide horizontal input bar on an off-white surface with dark text, subtle border, left icon, and spacious internal padding.
- **navigation**: Fixed left sidebar in deep green with stacked icon-label nav items, uppercase section labels, and one highlighted active row.

### Layout
top utility bar + fixed left sidebar navigation + centered hero copy + wide URL input with CTA + tag filters + terminal progress panel

### UI Elements
Named UI regions identified in the reference screenshot (col/row = 3×3 grid):
- **brand top bar** — col 1, row 1, zoom 2.6×
- **sidebar nav** — col 1, row 2, zoom 2.2×
- **hero headline** — col 2, row 1, zoom 2.4×
- **url input** — col 2, row 2, zoom 3.2×
- **scan button** — col 3, row 2, zoom 4.2×
- **terminal status** — col 2, row 3, zoom 2.8×

## Style Spec (HTML)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Style Spec — fintech-web3-1776926420037.jpg</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains%20Mono:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
    --color-primary:    #fa4c00;
    --color-secondary:  #003f25;
    --color-accent:     #9bea00;
    --color-background: #c1c2b4;
    --color-surface:    #f2f1ef;
    --color-text:       #002d1b;
    --color-text-muted: #7c7f74;
    --color-border:     #9ca08f;
    --color-success:    #9bea00;
    --color-warning:    #e3a185;
    --color-danger:     #fa4c00;
    --font-heading: 'Inter', system-ui, sans-serif;
    --font-body:    'Inter', system-ui, sans-serif;
    --font-mono:    'JetBrains Mono', ui-monospace, monospace;
    --weight-heading: 700;
    --weight-body:    400;
    --size-base:      16px;
    --radius-sm: 2px;
    --radius-md: 4px;
    --radius-lg: 8px;
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
    <img src="/knowledge-refs/fintech-web3-1776926420037.jpg" alt="fintech-web3-1776926420037.jpg">
    <div class="header__body">
      <div class="kicker">fintech-web3</div>
      <h1>fintech-web3-1776926420037.jpg</h1>
      <p class="muted">A retro-terminal inspired market discovery dashboard that combines muted utility tones with sharp safety-orange highlights. The layout feels like an institutional trading tool reimagined with editorial hero messaging and low-noise, command-line interface styling.</p>
      <div class="tags">
        <span class="tag">retro</span><span class="tag">terminal</span><span class="tag">utilitarian</span><span class="tag">minimal</span><span class="tag">editorial</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Palette</h2>
    <div class="palette">
    <div class="swatch">
      <div class="swatch__chip" style="background:#fa4c00"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Primary</div>
        <div class="swatch__hex">#fa4c00</div>
        <div class="swatch__name">safety orange</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#003f25"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Secondary</div>
        <div class="swatch__hex">#003f25</div>
        <div class="swatch__name">deep terminal green</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#9bea00"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Accent</div>
        <div class="swatch__hex">#9bea00</div>
        <div class="swatch__name">neon lime</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#c1c2b4"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Background</div>
        <div class="swatch__hex">#c1c2b4</div>
        <div class="swatch__name">muted sage gray</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f2f1ef"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Surface</div>
        <div class="swatch__hex">#f2f1ef</div>
        <div class="swatch__name">soft off-white</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#002d1b"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text</div>
        <div class="swatch__hex">#002d1b</div>
        <div class="swatch__name">dark green-black</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#7c7f74"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text muted</div>
        <div class="swatch__hex">#7c7f74</div>
        <div class="swatch__name">faded gray olive</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#9ca08f"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Border</div>
        <div class="swatch__hex">#9ca08f</div>
        <div class="swatch__name">dusty olive border</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#9bea00"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Success</div>
        <div class="swatch__hex">#9bea00</div>
        <div class="swatch__name">neon lime</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#e3a185"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Warning</div>
        <div class="swatch__hex">#e3a185</div>
        <div class="swatch__name">dusty peach</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#fa4c00"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Danger</div>
        <div class="swatch__hex">#fa4c00</div>
        <div class="swatch__name">alert orange</div>
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
        <code style="font-family:JetBrains Mono; font-size: 13px;">const monoExample = "JetBrains Mono";</code>
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

  <div class="section"><h2>Shadows</h2><div class="shadow-card" style="box-shadow:0 1px 0 rgba(0,45,27,0.10)">0 1px 0 rgba(0,45,27,0.10)</div><div class="shadow-card" style="box-shadow:0 2px 6px rgba(0,45,27,0.08)">0 2px 6px rgba(0,45,27,0.08)</div></div>

  

  

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
        <td>muted peach fill with thin olive border and uppercase label</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-hover">hover</span></td>
        <td>slightly stronger orange tint with darker border and increased contrast</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-focus">focus</span></td>
        <td>thin high-contrast outline using bright lime or orange around the rectangular button</td>
      </tr>
      <tr>
        <td>sidebar.navItem</td>
        <td><span class="state-pill state-active">active</span></td>
        <td>dark green inset panel with subtle border and lime status dot</td>
      </tr>
      <tr>
        <td>input.urlField</td>
        <td><span class="state-pill state-focus">focus</span></td>
        <td>clean light surface with sharper border and restrained glow-free emphasis</td>
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
            src="/knowledge-refs/fintech-web3-1776926420037.jpg"
            alt="brand top bar"
            style="--ox:0%;--oy:0%;--zoom:2.6;"
            draggable="false"
          />
        </div>
        <figcaption>brand top bar</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/fintech-web3-1776926420037.jpg"
            alt="sidebar nav"
            style="--ox:0%;--oy:50%;--zoom:2.2;"
            draggable="false"
          />
        </div>
        <figcaption>sidebar nav</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/fintech-web3-1776926420037.jpg"
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
            src="/knowledge-refs/fintech-web3-1776926420037.jpg"
            alt="url input"
            style="--ox:50%;--oy:50%;--zoom:3.2;"
            draggable="false"
          />
        </div>
        <figcaption>url input</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/fintech-web3-1776926420037.jpg"
            alt="scan button"
            style="--ox:100%;--oy:50%;--zoom:4.2;"
            draggable="false"
          />
        </div>
        <figcaption>scan button</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/fintech-web3-1776926420037.jpg"
            alt="terminal status"
            style="--ox:50%;--oy:100%;--zoom:2.8;"
            draggable="false"
          />
        </div>
        <figcaption>terminal status</figcaption>
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
        <p class="muted">Surface card on background, 8px radius, using primary as accent.</p>
        <button class="btn btn-primary" style="margin-top:8px;">Action</button>
      </div>
    </div>
  </div>

  <div class="section"><h2>Component Notes</h2>
      <div class="component">
        <div class="component__name">button</div>
        <div class="component__desc">Rectangular action button with muted peach fill, fine border, uppercase mono label, and minimal radius; visually aligned with industrial control panels.</div>
      </div>
      <div class="component">
        <div class="component__name">card</div>
        <div class="component__desc">Terminal-style dark green panel with thin divider line, tiny status indicator, mono text, and low-radius corners.</div>
      </div>
      <div class="component">
        <div class="component__name">input</div>
        <div class="component__desc">Wide horizontal input bar on an off-white surface with dark text, subtle border, left icon, and spacious internal padding.</div>
      </div>
      <div class="component">
        <div class="component__name">navigation</div>
        <div class="component__desc">Fixed left sidebar in deep green with stacked icon-label nav items, uppercase section labels, and one highlighted active row.</div>
      </div></div>

  <div class="section"><h2>Layout pattern</h2><p>top utility bar + fixed left sidebar navigation + centered hero copy + wide URL input with CTA + tag filters + terminal progress panel</p></div>
</body>
</html>
```

