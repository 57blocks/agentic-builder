---
{"id":"DK-img-ai-1-lumina","layer":"L1","kind":"design-knowledge","title":"Style Spec — ai-1-lumina.png","tags":["industry:ai","source:vision-distill","image:ai-1-lumina.png","manual:approved"],"source":"distill","refs":{},"createdAt":1778922739441,"updatedAt":1778922739441,"schemaVersion":1}
---

<!-- style-spec:json
{
  "industry": "ai",
  "summary": "A clean AI prompt interface with a soft light theme, oversized friendly hero copy, and subtle purple gradients used as the primary brand accent. The layout feels minimal and approachable, with rounded cards and restrained controls centered on a spacious canvas.",
  "vibe": [
    "minimal",
    "clean",
    "friendly",
    "soft",
    "modern"
  ],
  "palette": {
    "primary": {
      "hex": "#7357f6",
      "label": "violet brand"
    },
    "secondary": {
      "hex": "#b34f8e",
      "label": "magenta gradient"
    },
    "accent": {
      "hex": "#8a6cf7",
      "label": "purple action"
    },
    "background": {
      "hex": "#f6f6f7",
      "label": "light gray app background"
    },
    "surface": {
      "hex": "#ffffff",
      "label": "white card surface"
    },
    "text": {
      "hex": "#1d1721",
      "label": "near-black text"
    },
    "textMuted": {
      "hex": "#8e8a92",
      "label": "muted gray text"
    },
    "border": {
      "hex": "#ece9ef",
      "label": "soft gray border"
    }
  },
  "typography": {
    "headingFont": "Inter",
    "bodyFont": "Inter",
    "headingWeight": 700,
    "bodyWeight": 400,
    "baseSizePx": 16,
    "notes": [
      "oversized hero heading",
      "gradient-highlighted name and headline fragment",
      "compact card labels",
      "small muted helper text"
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
    "lgPx": 16,
    "pillPx": 999
  },
  "shadows": [
    "0 1px 2px rgba(0,0,0,0.04)",
    "0 8px 24px rgba(0,0,0,0.06)"
  ],
  "components": {
    "button": {
      "description": "Small rounded-square purple submit button with white arrow icon; secondary text actions are icon-led and low emphasis."
    },
    "card": {
      "description": "Prompt suggestion cards use white backgrounds, thin light-gray borders, subtle shadow, and medium rounded corners with compact text and small line icons."
    },
    "input": {
      "description": "Large white multi-action prompt composer with generous padding, muted placeholder text, bottom utility actions, top-right model/source selector, character count, and embedded send action."
    }
  },
  "layout": "centered hero heading + prompt suggestion card row + refresh action + large composer input",
  "imagePath": "/knowledge-refs/ai-1-lumina.png",
  "imageName": "ai-1-lumina.png",
  "capturedAt": "2026-05-16T09:12:19.440Z",
  "model": "openai/gpt-5.4-20260305"
}
-->

# Style Spec — ai-1-lumina.png

## Style Spec (Markdown)

**Industry**: ai
**Image**: ai-1-lumina.png
**Vibe**: minimal, clean, friendly, soft, modern

**Summary**: A clean AI prompt interface with a soft light theme, oversized friendly hero copy, and subtle purple gradients used as the primary brand accent. The layout feels minimal and approachable, with rounded cards and restrained controls centered on a spacious canvas.

### Palette
- Primary: `#7357f6` — violet brand
- Secondary: `#b34f8e` — magenta gradient
- Accent: `#8a6cf7` — purple action
- Background: `#f6f6f7` — light gray app background
- Surface: `#ffffff` — white card surface
- Text: `#1d1721` — near-black text
- Text muted: `#8e8a92` — muted gray text
- Border: `#ece9ef` — soft gray border

### Typography
- Heading font: Inter (weight 700)
- Body font: Inter (weight 400)
- Base size: 16px
- Note: oversized hero heading
- Note: gradient-highlighted name and headline fragment
- Note: compact card labels
- Note: small muted helper text

### Spacing & Radius
- Spacing base: 8px; scale: 4, 8, 12, 16, 24, 32, 48, 64
- Radius: sm 4px, md 10px, lg 16px, pill 999px
- Shadows: 2 variant(s)
  - `0 1px 2px rgba(0,0,0,0.04)`
  - `0 8px 24px rgba(0,0,0,0.06)`

### Components
- **button**: Small rounded-square purple submit button with white arrow icon; secondary text actions are icon-led and low emphasis.
- **card**: Prompt suggestion cards use white backgrounds, thin light-gray borders, subtle shadow, and medium rounded corners with compact text and small line icons.
- **input**: Large white multi-action prompt composer with generous padding, muted placeholder text, bottom utility actions, top-right model/source selector, character count, and embedded send action.

### Layout
centered hero heading + prompt suggestion card row + refresh action + large composer input

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
    --color-primary:    #7357f6;
    --color-secondary:  #b34f8e;
    --color-accent:     #8a6cf7;
    --color-background: #f6f6f7;
    --color-surface:    #ffffff;
    --color-text:       #1d1721;
    --color-text-muted: #8e8a92;
    --color-border:     #ece9ef;
    --color-success:    #22c55e;
    --color-warning:    #f59e0b;
    --color-danger:     #ef4444;
    --font-heading: 'Inter', system-ui, sans-serif;
    --font-body:    'Inter', system-ui, sans-serif;
    --font-mono:    'JetBrains Mono', ui-monospace, monospace;
    --weight-heading: 700;
    --weight-body:    400;
    --size-base:      16px;
    --radius-sm: 4px;
    --radius-md: 10px;
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
.section { margin-top: 32px; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 720px) { .grid-2 { grid-template-columns: 1fr; } }
</style>
</head>
<body>
  <div class="header">
    <img src="/knowledge-refs/ai-1-lumina.png" alt="ai-1-lumina.png">
    <div class="header__body">
      <div class="kicker">ai</div>
      <h1>ai-1-lumina.png</h1>
      <p class="muted">A clean AI prompt interface with a soft light theme, oversized friendly hero copy, and subtle purple gradients used as the primary brand accent. The layout feels minimal and approachable, with rounded cards and restrained controls centered on a spacious canvas.</p>
      <div class="tags">
        <span class="tag">minimal</span><span class="tag">clean</span><span class="tag">friendly</span><span class="tag">soft</span><span class="tag">modern</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Palette</h2>
    <div class="palette">
    <div class="swatch">
      <div class="swatch__chip" style="background:#7357f6"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Primary</div>
        <div class="swatch__hex">#7357f6</div>
        <div class="swatch__name">violet brand</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#b34f8e"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Secondary</div>
        <div class="swatch__hex">#b34f8e</div>
        <div class="swatch__name">magenta gradient</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#8a6cf7"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Accent</div>
        <div class="swatch__hex">#8a6cf7</div>
        <div class="swatch__name">purple action</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f6f6f7"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Background</div>
        <div class="swatch__hex">#f6f6f7</div>
        <div class="swatch__name">light gray app background</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#ffffff"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Surface</div>
        <div class="swatch__hex">#ffffff</div>
        <div class="swatch__name">white card surface</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#1d1721"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text</div>
        <div class="swatch__hex">#1d1721</div>
        <div class="swatch__name">near-black text</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#8e8a92"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text muted</div>
        <div class="swatch__hex">#8e8a92</div>
        <div class="swatch__name">muted gray text</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#ece9ef"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Border</div>
        <div class="swatch__hex">#ece9ef</div>
        <div class="swatch__name">soft gray border</div>
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

  <div class="section"><h2>Shadows</h2><div class="shadow-card" style="box-shadow:0 1px 2px rgba(0,0,0,0.04)">0 1px 2px rgba(0,0,0,0.04)</div><div class="shadow-card" style="box-shadow:0 8px 24px rgba(0,0,0,0.06)">0 8px 24px rgba(0,0,0,0.06)</div></div>

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
        <div class="component__desc">Small rounded-square purple submit button with white arrow icon; secondary text actions are icon-led and low emphasis.</div>
      </div>
      <div class="component">
        <div class="component__name">card</div>
        <div class="component__desc">Prompt suggestion cards use white backgrounds, thin light-gray borders, subtle shadow, and medium rounded corners with compact text and small line icons.</div>
      </div>
      <div class="component">
        <div class="component__name">input</div>
        <div class="component__desc">Large white multi-action prompt composer with generous padding, muted placeholder text, bottom utility actions, top-right model/source selector, character count, and embedded send action.</div>
      </div></div>

  <div class="section"><h2>Layout pattern</h2><p>centered hero heading + prompt suggestion card row + refresh action + large composer input</p></div>
</body>
</html>
```

