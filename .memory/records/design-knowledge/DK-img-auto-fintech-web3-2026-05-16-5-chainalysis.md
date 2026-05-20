---
{"id":"DK-img-auto-fintech-web3-2026-05-16-5-chainalysis","layer":"L1","kind":"design-knowledge","title":"Style Spec — auto-fintech-web3-2026-05-16-5-chainalysis.png","tags":["industry:fintech-web3","source:vision-distill","image:auto-fintech-web3-2026-05-16-5-chainalysis.png","manual:approved"],"source":"distill","refs":{},"createdAt":1778925651127,"updatedAt":1779236250424,"schemaVersion":1}
---

<!-- style-spec:json
{
  "industry": "fintech-web3",
  "summary": "A clean enterprise landing page with a bright neutral canvas, bold indigo typography, and strong orange CTAs. The design feels corporate and trustworthy, using soft shadows and floating product cards to showcase the platform UI.",
  "vibe": [
    "clean",
    "corporate",
    "minimal",
    "trustworthy",
    "modern"
  ],
  "palette": {
    "primary": {
      "hex": "#2d4187",
      "label": "brand indigo"
    },
    "secondary": {
      "hex": "#ff5c02",
      "label": "cta orange"
    },
    "accent": {
      "hex": "#6f8cc9",
      "label": "soft blue accent"
    },
    "background": {
      "hex": "#f5f5f5",
      "label": "light gray page background"
    },
    "surface": {
      "hex": "#ffffff",
      "label": "white cards and panels"
    },
    "text": {
      "hex": "#34467a",
      "label": "deep blue text"
    },
    "textMuted": {
      "hex": "#6d78a0",
      "label": "muted slate blue"
    },
    "border": {
      "hex": "#e7eaef",
      "label": "light card border"
    },
    "warning": {
      "hex": "#f0c45c",
      "label": "gold chart accent"
    },
    "danger": {
      "hex": "#c50b0b",
      "label": "alert red"
    }
  },
  "typography": {
    "headingFont": "Inter",
    "bodyFont": "Inter",
    "headingWeight": 700,
    "bodyWeight": 400,
    "baseSizePx": 16,
    "notes": [
      "large centered hero heading",
      "sentence-case navigation and CTA labels",
      "brand-heavy use of bold indigo headlines"
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
    "0 2px 8px rgba(39,57,102,0.08)",
    "0 10px 24px rgba(39,57,102,0.12)"
  ],
  "surfaceEffects": [
    {
      "name": "soft floating cards",
      "description": "UI panels float over the page with white fills, faint borders, and diffused shadows for a polished SaaS marketing look",
      "cssHints": [
        "background: #ffffff",
        "border: 1px solid #e7eaef",
        "box-shadow: 0 10px 24px rgba(39,57,102,0.12)"
      ]
    }
  ],
  "stateTokens": [
    {
      "component": "button.primary",
      "state": "default",
      "treatment": "solid orange pill button with white text and no visible border"
    },
    {
      "component": "button.primary",
      "state": "hover",
      "treatment": "slightly darker orange fill with stronger shadow emphasis"
    },
    {
      "component": "button.primary",
      "state": "focus",
      "treatment": "high-contrast outline or glow ring around the pill button in a soft blue tone"
    },
    {
      "component": "navigation.link",
      "state": "default",
      "treatment": "plain text links in dark neutral blue-gray on white background"
    },
    {
      "component": "navigation.link",
      "state": "hover",
      "treatment": "text shifts toward brand indigo with subtle underline or opacity emphasis"
    }
  ],
  "components": {
    "button": {
      "description": "Large pill-shaped CTAs in solid orange or indigo; white medium-weight text, generous horizontal padding, and minimal chrome."
    },
    "card": {
      "description": "Floating white product-preview cards with rounded corners, thin light borders, soft shadows, and concise labels or data visuals."
    },
    "navigation": {
      "description": "Top horizontal navigation with left-aligned logo, centered primary links, and right-side utility actions including language, login, and a pill CTA."
    }
  },
  "layout": "top announcement bar + horizontal header navigation + centered hero section + layered product illustration with floating analytics cards",
  "visualElements": [
    {
      "name": "announcement bar",
      "col": 2,
      "row": 1,
      "zoom": 3.2
    },
    {
      "name": "brand logo",
      "col": 1,
      "row": 1,
      "zoom": 3.4
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
      "name": "pie chart card",
      "col": 1,
      "row": 3,
      "zoom": 3
    },
    {
      "name": "summary card",
      "col": 3,
      "row": 2,
      "zoom": 3.2
    }
  ],
  "imagePath": "/knowledge-refs/auto-fintech-web3-2026-05-16-5-chainalysis.png",
  "imageName": "auto-fintech-web3-2026-05-16-5-chainalysis.png",
  "capturedAt": "2026-05-20T00:17:30.423Z",
  "model": "openai/gpt-5.4-20260305"
}
-->

# Style Spec — auto-fintech-web3-2026-05-16-5-chainalysis.png

## Style Spec (Markdown)

**Industry**: fintech-web3
**Image**: auto-fintech-web3-2026-05-16-5-chainalysis.png
**Vibe**: clean, corporate, minimal, trustworthy, modern

**Summary**: A clean enterprise landing page with a bright neutral canvas, bold indigo typography, and strong orange CTAs. The design feels corporate and trustworthy, using soft shadows and floating product cards to showcase the platform UI.

### Palette
- Primary: `#2d4187` — brand indigo
- Secondary: `#ff5c02` — cta orange
- Accent: `#6f8cc9` — soft blue accent
- Background: `#f5f5f5` — light gray page background
- Surface: `#ffffff` — white cards and panels
- Text: `#34467a` — deep blue text
- Text muted: `#6d78a0` — muted slate blue
- Border: `#e7eaef` — light card border
- Warning: `#f0c45c` — gold chart accent
- Danger: `#c50b0b` — alert red

### Typography
- Heading font: Inter (weight 700)
- Body font: Inter (weight 400)
- Base size: 16px
- Note: large centered hero heading
- Note: sentence-case navigation and CTA labels
- Note: brand-heavy use of bold indigo headlines

### Spacing & Radius
- Spacing base: 8px; scale: 4, 8, 12, 16, 24, 32, 48, 64
- Radius: sm 4px, md 8px, lg 16px, pill 999px
- Shadows: 2 variant(s)
  - `0 2px 8px rgba(39,57,102,0.08)`
  - `0 10px 24px rgba(39,57,102,0.12)`

### Surface Effects
- **soft floating cards**: UI panels float over the page with white fills, faint borders, and diffused shadows for a polished SaaS marketing look
  - `background: #ffffff`
  - `border: 1px solid #e7eaef`
  - `box-shadow: 0 10px 24px rgba(39,57,102,0.12)`

### Interaction State Tokens
- **button.primary.default**: solid orange pill button with white text and no visible border
- **button.primary.hover**: slightly darker orange fill with stronger shadow emphasis
- **button.primary.focus**: high-contrast outline or glow ring around the pill button in a soft blue tone
- **navigation.link.default**: plain text links in dark neutral blue-gray on white background
- **navigation.link.hover**: text shifts toward brand indigo with subtle underline or opacity emphasis

### Components
- **button**: Large pill-shaped CTAs in solid orange or indigo; white medium-weight text, generous horizontal padding, and minimal chrome.
- **card**: Floating white product-preview cards with rounded corners, thin light borders, soft shadows, and concise labels or data visuals.
- **navigation**: Top horizontal navigation with left-aligned logo, centered primary links, and right-side utility actions including language, login, and a pill CTA.

### Layout
top announcement bar + horizontal header navigation + centered hero section + layered product illustration with floating analytics cards

### UI Elements
Named UI regions identified in the reference screenshot (col/row = 3×3 grid):
- **announcement bar** — col 2, row 1, zoom 3.2×
- **brand logo** — col 1, row 1, zoom 3.4×
- **hero headline** — col 2, row 1, zoom 2.2×
- **primary CTA** — col 2, row 2, zoom 4×
- **pie chart card** — col 1, row 3, zoom 3×
- **summary card** — col 3, row 2, zoom 3.2×

## Style Spec (HTML)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Style Spec — auto-fintech-web3-2026-05-16-5-chainalysis.png</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
    --color-primary:    #2d4187;
    --color-secondary:  #ff5c02;
    --color-accent:     #6f8cc9;
    --color-background: #f5f5f5;
    --color-surface:    #ffffff;
    --color-text:       #34467a;
    --color-text-muted: #6d78a0;
    --color-border:     #e7eaef;
    --color-success:    #22c55e;
    --color-warning:    #f0c45c;
    --color-danger:     #c50b0b;
    --font-heading: 'Inter', system-ui, sans-serif;
    --font-body:    'Inter', system-ui, sans-serif;
    --font-mono:    'JetBrains Mono', ui-monospace, monospace;
    --weight-heading: 700;
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
    <img src="/knowledge-refs/auto-fintech-web3-2026-05-16-5-chainalysis.png" alt="auto-fintech-web3-2026-05-16-5-chainalysis.png">
    <div class="header__body">
      <div class="kicker">fintech-web3</div>
      <h1>auto-fintech-web3-2026-05-16-5-chainalysis.png</h1>
      <p class="muted">A clean enterprise landing page with a bright neutral canvas, bold indigo typography, and strong orange CTAs. The design feels corporate and trustworthy, using soft shadows and floating product cards to showcase the platform UI.</p>
      <div class="tags">
        <span class="tag">clean</span><span class="tag">corporate</span><span class="tag">minimal</span><span class="tag">trustworthy</span><span class="tag">modern</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Palette</h2>
    <div class="palette">
    <div class="swatch">
      <div class="swatch__chip" style="background:#2d4187"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Primary</div>
        <div class="swatch__hex">#2d4187</div>
        <div class="swatch__name">brand indigo</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#ff5c02"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Secondary</div>
        <div class="swatch__hex">#ff5c02</div>
        <div class="swatch__name">cta orange</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#6f8cc9"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Accent</div>
        <div class="swatch__hex">#6f8cc9</div>
        <div class="swatch__name">soft blue accent</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f5f5f5"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Background</div>
        <div class="swatch__hex">#f5f5f5</div>
        <div class="swatch__name">light gray page background</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#ffffff"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Surface</div>
        <div class="swatch__hex">#ffffff</div>
        <div class="swatch__name">white cards and panels</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#34467a"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text</div>
        <div class="swatch__hex">#34467a</div>
        <div class="swatch__name">deep blue text</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#6d78a0"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text muted</div>
        <div class="swatch__hex">#6d78a0</div>
        <div class="swatch__name">muted slate blue</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#e7eaef"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Border</div>
        <div class="swatch__hex">#e7eaef</div>
        <div class="swatch__name">light card border</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f0c45c"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Warning</div>
        <div class="swatch__hex">#f0c45c</div>
        <div class="swatch__name">gold chart accent</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#c50b0b"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Danger</div>
        <div class="swatch__hex">#c50b0b</div>
        <div class="swatch__name">alert red</div>
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

  <div class="section"><h2>Shadows</h2><div class="shadow-card" style="box-shadow:0 2px 8px rgba(39,57,102,0.08)">0 2px 8px rgba(39,57,102,0.08)</div><div class="shadow-card" style="box-shadow:0 10px 24px rgba(39,57,102,0.12)">0 10px 24px rgba(39,57,102,0.12)</div></div>

  

  <div class="section">
    <h2>Surface Effects</h2>
    <div class="signal-grid">
      <article class="signal-card">
        <div class="signal-title">soft floating cards</div>
        <div class="signal-meta">UI panels float over the page with white fills, faint borders, and diffused shadows for a polished SaaS marketing look</div>
        <div class="signal-code">background: #ffffff<br/>border: 1px solid #e7eaef<br/>box-shadow: 0 10px 24px rgba(39,57,102,0.12)</div>
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
        <td>solid orange pill button with white text and no visible border</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-hover">hover</span></td>
        <td>slightly darker orange fill with stronger shadow emphasis</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-focus">focus</span></td>
        <td>high-contrast outline or glow ring around the pill button in a soft blue tone</td>
      </tr>
      <tr>
        <td>navigation.link</td>
        <td><span class="state-pill state-default">default</span></td>
        <td>plain text links in dark neutral blue-gray on white background</td>
      </tr>
      <tr>
        <td>navigation.link</td>
        <td><span class="state-pill state-hover">hover</span></td>
        <td>text shifts toward brand indigo with subtle underline or opacity emphasis</td>
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
            src="/knowledge-refs/auto-fintech-web3-2026-05-16-5-chainalysis.png"
            alt="announcement bar"
            style="--ox:50%;--oy:0%;--zoom:3.2;"
            draggable="false"
          />
        </div>
        <figcaption>announcement bar</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/auto-fintech-web3-2026-05-16-5-chainalysis.png"
            alt="brand logo"
            style="--ox:0%;--oy:0%;--zoom:3.4;"
            draggable="false"
          />
        </div>
        <figcaption>brand logo</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/auto-fintech-web3-2026-05-16-5-chainalysis.png"
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
            src="/knowledge-refs/auto-fintech-web3-2026-05-16-5-chainalysis.png"
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
            src="/knowledge-refs/auto-fintech-web3-2026-05-16-5-chainalysis.png"
            alt="pie chart card"
            style="--ox:0%;--oy:100%;--zoom:3;"
            draggable="false"
          />
        </div>
        <figcaption>pie chart card</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/auto-fintech-web3-2026-05-16-5-chainalysis.png"
            alt="summary card"
            style="--ox:100%;--oy:50%;--zoom:3.2;"
            draggable="false"
          />
        </div>
        <figcaption>summary card</figcaption>
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
        <div class="component__desc">Large pill-shaped CTAs in solid orange or indigo; white medium-weight text, generous horizontal padding, and minimal chrome.</div>
      </div>
      <div class="component">
        <div class="component__name">card</div>
        <div class="component__desc">Floating white product-preview cards with rounded corners, thin light borders, soft shadows, and concise labels or data visuals.</div>
      </div>
      <div class="component">
        <div class="component__name">navigation</div>
        <div class="component__desc">Top horizontal navigation with left-aligned logo, centered primary links, and right-side utility actions including language, login, and a pill CTA.</div>
      </div></div>

  <div class="section"><h2>Layout pattern</h2><p>top announcement bar + horizontal header navigation + centered hero section + layered product illustration with floating analytics cards</p></div>
</body>
</html>
```

