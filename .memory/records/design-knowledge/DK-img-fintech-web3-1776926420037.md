---
{"id":"DK-img-fintech-web3-1776926420037","layer":"L1","kind":"design-knowledge","title":"Style Spec — fintech-web3-1776926420037.jpg","tags":["industry:fintech-web3","source:vision-distill","image:fintech-web3-1776926420037.jpg","manual:approved"],"source":"distill","refs":{},"createdAt":1778923024116,"updatedAt":1778923024116,"schemaVersion":1}
---

<!-- style-spec:json
{
  "industry": "fintech-web3",
  "summary": "A retro-terminal inspired fintech interface combining muted utility tones with a high-contrast orange brand strip and dark green system panels. The layout feels like a market scanning dashboard with minimalist structure, monospaced details, and bold uppercase messaging.",
  "vibe": [
    "retro",
    "terminal",
    "minimal",
    "industrial",
    "tactical"
  ],
  "palette": {
    "primary": {
      "hex": "#fb5102",
      "label": "signal orange"
    },
    "secondary": {
      "hex": "#00351f",
      "label": "deep terminal green"
    },
    "accent": {
      "hex": "#eea68b",
      "label": "soft salmon"
    },
    "background": {
      "hex": "#d8d7c7",
      "label": "warm fog"
    },
    "surface": {
      "hex": "#ebe9dc",
      "label": "pale canvas"
    },
    "text": {
      "hex": "#0d2f24",
      "label": "dark pine"
    },
    "textMuted": {
      "hex": "#7f8776",
      "label": "muted olive gray"
    },
    "border": {
      "hex": "#6a7c61",
      "label": "faded moss"
    },
    "success": {
      "hex": "#91da10",
      "label": "neon lime"
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
      "bold uppercase hero headlines",
      "monospaced UI labels and system text",
      "condensed terminal-style secondary copy"
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
    "smPx": 0,
    "mdPx": 2,
    "lgPx": 4,
    "pillPx": 999
  },
  "shadows": [
    "0 1px 2px rgba(0,0,0,0.06)"
  ],
  "components": {
    "button": {
      "description": "Rectangular flat buttons with thin borders, muted salmon fill for the primary action, uppercase monospaced labels, and almost no corner rounding."
    },
    "card": {
      "description": "Large flat terminal-style panels in deep green with subtle borders, minimal elevation, and monospaced status rows in lime and orange accents."
    },
    "input": {
      "description": "Wide white input field with thin gray border, left icon, uppercase/URL content, and adjacent filled action button; designed as a horizontal command bar."
    },
    "navigation": {
      "description": "Fixed left sidebar in dark green with stacked icon-and-label links, thin dividers, uppercase section headers, and an active item highlighted by a slightly lighter green block with lime indicator."
    }
  },
  "layout": "top brand bar + fixed left sidebar + centered hero headline + horizontal input/action row + filter chips + terminal output panel",
  "imagePath": "/knowledge-refs/fintech-web3-1776926420037.jpg",
  "imageName": "fintech-web3-1776926420037.jpg",
  "capturedAt": "2026-05-16T09:17:04.115Z",
  "model": "openai/gpt-5.4-20260305"
}
-->

# Style Spec — fintech-web3-1776926420037.jpg

## Style Spec (Markdown)

**Industry**: fintech-web3
**Image**: fintech-web3-1776926420037.jpg
**Vibe**: retro, terminal, minimal, industrial, tactical

**Summary**: A retro-terminal inspired fintech interface combining muted utility tones with a high-contrast orange brand strip and dark green system panels. The layout feels like a market scanning dashboard with minimalist structure, monospaced details, and bold uppercase messaging.

### Palette
- Primary: `#fb5102` — signal orange
- Secondary: `#00351f` — deep terminal green
- Accent: `#eea68b` — soft salmon
- Background: `#d8d7c7` — warm fog
- Surface: `#ebe9dc` — pale canvas
- Text: `#0d2f24` — dark pine
- Text muted: `#7f8776` — muted olive gray
- Border: `#6a7c61` — faded moss
- Success: `#91da10` — neon lime

### Typography
- Heading font: Inter (weight 700)
- Body font: Inter (weight 400)
- Mono font: JetBrains Mono
- Base size: 16px
- Note: bold uppercase hero headlines
- Note: monospaced UI labels and system text
- Note: condensed terminal-style secondary copy

### Spacing & Radius
- Spacing base: 8px; scale: 4, 8, 12, 16, 24, 32, 48, 64
- Radius: sm 0px, md 2px, lg 4px, pill 999px
- Shadows: 1 variant(s)
  - `0 1px 2px rgba(0,0,0,0.06)`

### Components
- **button**: Rectangular flat buttons with thin borders, muted salmon fill for the primary action, uppercase monospaced labels, and almost no corner rounding.
- **card**: Large flat terminal-style panels in deep green with subtle borders, minimal elevation, and monospaced status rows in lime and orange accents.
- **input**: Wide white input field with thin gray border, left icon, uppercase/URL content, and adjacent filled action button; designed as a horizontal command bar.
- **navigation**: Fixed left sidebar in dark green with stacked icon-and-label links, thin dividers, uppercase section headers, and an active item highlighted by a slightly lighter green block with lime indicator.

### Layout
top brand bar + fixed left sidebar + centered hero headline + horizontal input/action row + filter chips + terminal output panel

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
    --color-primary:    #fb5102;
    --color-secondary:  #00351f;
    --color-accent:     #eea68b;
    --color-background: #d8d7c7;
    --color-surface:    #ebe9dc;
    --color-text:       #0d2f24;
    --color-text-muted: #7f8776;
    --color-border:     #6a7c61;
    --color-success:    #91da10;
    --color-warning:    #f59e0b;
    --color-danger:     #ef4444;
    --font-heading: 'Inter', system-ui, sans-serif;
    --font-body:    'Inter', system-ui, sans-serif;
    --font-mono:    'JetBrains Mono', ui-monospace, monospace;
    --weight-heading: 700;
    --weight-body:    400;
    --size-base:      16px;
    --radius-sm: 0px;
    --radius-md: 2px;
    --radius-lg: 4px;
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
.section { margin-top: 32px; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 720px) { .grid-2 { grid-template-columns: 1fr; } }
</style>
</head>
<body>
  <div class="header">
    <img src="/knowledge-refs/fintech-web3-1776926420037.jpg" alt="fintech-web3-1776926420037.jpg">
    <div class="header__body">
      <div class="kicker">fintech-web3</div>
      <h1>fintech-web3-1776926420037.jpg</h1>
      <p class="muted">A retro-terminal inspired fintech interface combining muted utility tones with a high-contrast orange brand strip and dark green system panels. The layout feels like a market scanning dashboard with minimalist structure, monospaced details, and bold uppercase messaging.</p>
      <div class="tags">
        <span class="tag">retro</span><span class="tag">terminal</span><span class="tag">minimal</span><span class="tag">industrial</span><span class="tag">tactical</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Palette</h2>
    <div class="palette">
    <div class="swatch">
      <div class="swatch__chip" style="background:#fb5102"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Primary</div>
        <div class="swatch__hex">#fb5102</div>
        <div class="swatch__name">signal orange</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#00351f"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Secondary</div>
        <div class="swatch__hex">#00351f</div>
        <div class="swatch__name">deep terminal green</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#eea68b"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Accent</div>
        <div class="swatch__hex">#eea68b</div>
        <div class="swatch__name">soft salmon</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#d8d7c7"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Background</div>
        <div class="swatch__hex">#d8d7c7</div>
        <div class="swatch__name">warm fog</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#ebe9dc"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Surface</div>
        <div class="swatch__hex">#ebe9dc</div>
        <div class="swatch__name">pale canvas</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#0d2f24"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text</div>
        <div class="swatch__hex">#0d2f24</div>
        <div class="swatch__name">dark pine</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#7f8776"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text muted</div>
        <div class="swatch__hex">#7f8776</div>
        <div class="swatch__name">muted olive gray</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#6a7c61"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Border</div>
        <div class="swatch__hex">#6a7c61</div>
        <div class="swatch__name">faded moss</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#91da10"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Success</div>
        <div class="swatch__hex">#91da10</div>
        <div class="swatch__name">neon lime</div>
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

  <div class="section"><h2>Shadows</h2><div class="shadow-card" style="box-shadow:0 1px 2px rgba(0,0,0,0.06)">0 1px 2px rgba(0,0,0,0.06)</div></div>

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
        <p class="muted">Surface card on background, 4px radius, using primary as accent.</p>
        <button class="btn btn-primary" style="margin-top:8px;">Action</button>
      </div>
    </div>
  </div>

  <div class="section"><h2>Component Notes</h2>
      <div class="component">
        <div class="component__name">button</div>
        <div class="component__desc">Rectangular flat buttons with thin borders, muted salmon fill for the primary action, uppercase monospaced labels, and almost no corner rounding.</div>
      </div>
      <div class="component">
        <div class="component__name">card</div>
        <div class="component__desc">Large flat terminal-style panels in deep green with subtle borders, minimal elevation, and monospaced status rows in lime and orange accents.</div>
      </div>
      <div class="component">
        <div class="component__name">input</div>
        <div class="component__desc">Wide white input field with thin gray border, left icon, uppercase/URL content, and adjacent filled action button; designed as a horizontal command bar.</div>
      </div>
      <div class="component">
        <div class="component__name">navigation</div>
        <div class="component__desc">Fixed left sidebar in dark green with stacked icon-and-label links, thin dividers, uppercase section headers, and an active item highlighted by a slightly lighter green block with lime indicator.</div>
      </div></div>

  <div class="section"><h2>Layout pattern</h2><p>top brand bar + fixed left sidebar + centered hero headline + horizontal input/action row + filter chips + terminal output panel</p></div>
</body>
</html>
```

