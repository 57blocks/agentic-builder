---
{"id":"DK-img-s6-saas","layer":"L1","kind":"design-knowledge","title":"Style Spec — s6-saas.png","tags":["industry:generic","source:vision-distill","image:s6-saas.png","manual:approved"],"source":"distill","refs":{},"createdAt":1778922916191,"updatedAt":1779236558622,"schemaVersion":1}
---

<!-- style-spec:json
{
  "industry": "generic",
  "summary": "A soft, modern landing page with a warm neutral palette, rounded cards, and subtle productivity-dashboard UI previews. The aesthetic feels clean and editorial, using airy spacing, dark monochrome CTAs, and light cream surfaces with gentle shadows.",
  "vibe": [
    "minimal",
    "warm",
    "clean",
    "friendly",
    "editorial"
  ],
  "palette": {
    "primary": {
      "hex": "#111111",
      "label": "charcoal black"
    },
    "secondary": {
      "hex": "#efe7d8",
      "label": "warm beige"
    },
    "accent": {
      "hex": "#b9c4ec",
      "label": "soft periwinkle"
    },
    "background": {
      "hex": "#f6f4ef",
      "label": "off-white cream"
    },
    "surface": {
      "hex": "#ffffff",
      "label": "pure white"
    },
    "text": {
      "hex": "#1a1a1a",
      "label": "near-black"
    },
    "textMuted": {
      "hex": "#7d7a73",
      "label": "muted taupe gray"
    },
    "border": {
      "hex": "#e7e1d6",
      "label": "light warm border"
    },
    "warning": {
      "hex": "#e6c766",
      "label": "soft mustard"
    }
  },
  "typography": {
    "headingFont": "Inter",
    "bodyFont": "Inter",
    "headingWeight": 600,
    "bodyWeight": 400,
    "baseSizePx": 16,
    "notes": [
      "large centered hero heading",
      "small muted marketing body copy",
      "compact UI card labels"
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
    "0 1px 2px rgba(17,17,17,0.04)",
    "0 12px 30px rgba(17,17,17,0.08)"
  ],
  "gradients": [
    {
      "id": "hero-glow",
      "type": "radial",
      "angleDeg": 0,
      "stops": [
        {
          "color": "#f1d88f",
          "positionPct": 0,
          "opacity": 0.35
        },
        {
          "color": "#f6f4ef",
          "positionPct": 70,
          "opacity": 0.12
        },
        {
          "color": "#f6f4ef",
          "positionPct": 100,
          "opacity": 0
        }
      ],
      "usage": "soft ambient glow behind hero card montage"
    }
  ],
  "surfaceEffects": [
    {
      "name": "soft-card-shadow",
      "description": "floating white cards use subtle elevation with faint warm borders and no harsh contrast",
      "cssHints": [
        "background: #ffffff",
        "border: 1px solid #e7e1d6",
        "box-shadow: 0 12px 30px rgba(17,17,17,0.08)"
      ]
    }
  ],
  "stateTokens": [
    {
      "component": "button.primary",
      "state": "default",
      "treatment": "solid black pill button with white text and circular white arrow icon"
    },
    {
      "component": "button.primary",
      "state": "hover",
      "treatment": "slightly lifted black surface with stronger shadow and brighter contrast"
    },
    {
      "component": "button.primary",
      "state": "focus",
      "treatment": "thin dark focus outline outside pill shape"
    },
    {
      "component": "navigation.link",
      "state": "default",
      "treatment": "small muted text on transparent background"
    },
    {
      "component": "navigation.link",
      "state": "hover",
      "treatment": "text darkens toward primary with subtle emphasis"
    }
  ],
  "components": {
    "button": {
      "description": "Rounded pill CTA buttons in black with white text, often paired with a small circular arrow icon on the right."
    },
    "card": {
      "description": "White dashboard-style cards with rounded corners, light warm borders, subtle shadows, and compact charts or task metadata."
    },
    "navigation": {
      "description": "Minimal top navigation with left-aligned wordmark, centered text links, and right-aligned auth plus primary CTA."
    }
  },
  "layout": "centered marketing hero with top navigation, floating product-preview cards beneath the headline, logo strip below, and alternating two-column feature sections on a warm neutral background",
  "visualElements": [
    {
      "name": "brand header",
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
      "name": "primary CTA",
      "col": 2,
      "row": 2,
      "zoom": 4
    },
    {
      "name": "dashboard cards",
      "col": 2,
      "row": 2,
      "zoom": 2.8
    },
    {
      "name": "feature block",
      "col": 3,
      "row": 1,
      "zoom": 2.6
    },
    {
      "name": "logo strip",
      "col": 2,
      "row": 3,
      "zoom": 2.8
    }
  ],
  "imagePath": "/knowledge-refs/s6-saas.png",
  "imageName": "s6-saas.png",
  "capturedAt": "2026-05-20T00:22:38.621Z",
  "model": "openai/gpt-5.4-20260305"
}
-->

# Style Spec — s6-saas.png

## Style Spec (Markdown)

**Industry**: generic
**Image**: s6-saas.png
**Vibe**: minimal, warm, clean, friendly, editorial

**Summary**: A soft, modern landing page with a warm neutral palette, rounded cards, and subtle productivity-dashboard UI previews. The aesthetic feels clean and editorial, using airy spacing, dark monochrome CTAs, and light cream surfaces with gentle shadows.

### Palette
- Primary: `#111111` — charcoal black
- Secondary: `#efe7d8` — warm beige
- Accent: `#b9c4ec` — soft periwinkle
- Background: `#f6f4ef` — off-white cream
- Surface: `#ffffff` — pure white
- Text: `#1a1a1a` — near-black
- Text muted: `#7d7a73` — muted taupe gray
- Border: `#e7e1d6` — light warm border
- Warning: `#e6c766` — soft mustard

### Typography
- Heading font: Inter (weight 600)
- Body font: Inter (weight 400)
- Base size: 16px
- Note: large centered hero heading
- Note: small muted marketing body copy
- Note: compact UI card labels

### Spacing & Radius
- Spacing base: 8px; scale: 4, 8, 12, 16, 24, 32, 48, 64
- Radius: sm 4px, md 8px, lg 16px, pill 999px
- Shadows: 2 variant(s)
  - `0 1px 2px rgba(17,17,17,0.04)`
  - `0 12px 30px rgba(17,17,17,0.08)`

### Gradients
- **hero-glow** (radial) — soft ambient glow behind hero card montage
  - stop 0%: `#f1d88f`, alpha 0.35
  - stop 70%: `#f6f4ef`, alpha 0.12
  - stop 100%: `#f6f4ef`, alpha 0

### Surface Effects
- **soft-card-shadow**: floating white cards use subtle elevation with faint warm borders and no harsh contrast
  - `background: #ffffff`
  - `border: 1px solid #e7e1d6`
  - `box-shadow: 0 12px 30px rgba(17,17,17,0.08)`

### Interaction State Tokens
- **button.primary.default**: solid black pill button with white text and circular white arrow icon
- **button.primary.hover**: slightly lifted black surface with stronger shadow and brighter contrast
- **button.primary.focus**: thin dark focus outline outside pill shape
- **navigation.link.default**: small muted text on transparent background
- **navigation.link.hover**: text darkens toward primary with subtle emphasis

### Components
- **button**: Rounded pill CTA buttons in black with white text, often paired with a small circular arrow icon on the right.
- **card**: White dashboard-style cards with rounded corners, light warm borders, subtle shadows, and compact charts or task metadata.
- **navigation**: Minimal top navigation with left-aligned wordmark, centered text links, and right-aligned auth plus primary CTA.

### Layout
centered marketing hero with top navigation, floating product-preview cards beneath the headline, logo strip below, and alternating two-column feature sections on a warm neutral background

### UI Elements
Named UI regions identified in the reference screenshot (col/row = 3×3 grid):
- **brand header** — col 1, row 1, zoom 3×
- **hero headline** — col 2, row 1, zoom 2.4×
- **primary CTA** — col 2, row 2, zoom 4×
- **dashboard cards** — col 2, row 2, zoom 2.8×
- **feature block** — col 3, row 1, zoom 2.6×
- **logo strip** — col 2, row 3, zoom 2.8×

## Style Spec (HTML)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Style Spec — s6-saas.png</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
    --color-primary:    #111111;
    --color-secondary:  #efe7d8;
    --color-accent:     #b9c4ec;
    --color-background: #f6f4ef;
    --color-surface:    #ffffff;
    --color-text:       #1a1a1a;
    --color-text-muted: #7d7a73;
    --color-border:     #e7e1d6;
    --color-success:    #22c55e;
    --color-warning:    #e6c766;
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
    <img src="/knowledge-refs/s6-saas.png" alt="s6-saas.png">
    <div class="header__body">
      <div class="kicker">generic</div>
      <h1>s6-saas.png</h1>
      <p class="muted">A soft, modern landing page with a warm neutral palette, rounded cards, and subtle productivity-dashboard UI previews. The aesthetic feels clean and editorial, using airy spacing, dark monochrome CTAs, and light cream surfaces with gentle shadows.</p>
      <div class="tags">
        <span class="tag">minimal</span><span class="tag">warm</span><span class="tag">clean</span><span class="tag">friendly</span><span class="tag">editorial</span>
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
        <div class="swatch__name">charcoal black</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#efe7d8"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Secondary</div>
        <div class="swatch__hex">#efe7d8</div>
        <div class="swatch__name">warm beige</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#b9c4ec"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Accent</div>
        <div class="swatch__hex">#b9c4ec</div>
        <div class="swatch__name">soft periwinkle</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f6f4ef"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Background</div>
        <div class="swatch__hex">#f6f4ef</div>
        <div class="swatch__name">off-white cream</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#ffffff"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Surface</div>
        <div class="swatch__hex">#ffffff</div>
        <div class="swatch__name">pure white</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#1a1a1a"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text</div>
        <div class="swatch__hex">#1a1a1a</div>
        <div class="swatch__name">near-black</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#7d7a73"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text muted</div>
        <div class="swatch__hex">#7d7a73</div>
        <div class="swatch__name">muted taupe gray</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#e7e1d6"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Border</div>
        <div class="swatch__hex">#e7e1d6</div>
        <div class="swatch__name">light warm border</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#e6c766"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Warning</div>
        <div class="swatch__hex">#e6c766</div>
        <div class="swatch__name">soft mustard</div>
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

  <div class="section"><h2>Shadows</h2><div class="shadow-card" style="box-shadow:0 1px 2px rgba(17,17,17,0.04)">0 1px 2px rgba(17,17,17,0.04)</div><div class="shadow-card" style="box-shadow:0 12px 30px rgba(17,17,17,0.08)">0 12px 30px rgba(17,17,17,0.08)</div></div>

  <div class="section">
    <h2>Gradients</h2>
    <div class="signal-grid">
      <article class="signal-card">
        <div class="signal-preview" style="background:radial-gradient(circle at center, rgba(241, 216, 143, 0.35) 0%, rgba(246, 244, 239, 0.12) 70%, rgba(246, 244, 239, 0) 100%);"></div>
        <div class="signal-title">hero-glow</div>
        <div class="signal-meta">radial · soft ambient glow behind hero card montage</div>
        <div class="signal-code">0% #f1d88f @0.35  |  70% #f6f4ef @0.12  |  100% #f6f4ef @0</div>
      </article></div>
  </div>

  <div class="section">
    <h2>Surface Effects</h2>
    <div class="signal-grid">
      <article class="signal-card">
        <div class="signal-title">soft-card-shadow</div>
        <div class="signal-meta">floating white cards use subtle elevation with faint warm borders and no harsh contrast</div>
        <div class="signal-code">background: #ffffff<br/>border: 1px solid #e7e1d6<br/>box-shadow: 0 12px 30px rgba(17,17,17,0.08)</div>
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
        <td>solid black pill button with white text and circular white arrow icon</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-hover">hover</span></td>
        <td>slightly lifted black surface with stronger shadow and brighter contrast</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-focus">focus</span></td>
        <td>thin dark focus outline outside pill shape</td>
      </tr>
      <tr>
        <td>navigation.link</td>
        <td><span class="state-pill state-default">default</span></td>
        <td>small muted text on transparent background</td>
      </tr>
      <tr>
        <td>navigation.link</td>
        <td><span class="state-pill state-hover">hover</span></td>
        <td>text darkens toward primary with subtle emphasis</td>
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
            src="/knowledge-refs/s6-saas.png"
            alt="brand header"
            style="--ox:0%;--oy:0%;--zoom:3;"
            draggable="false"
          />
        </div>
        <figcaption>brand header</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/s6-saas.png"
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
            src="/knowledge-refs/s6-saas.png"
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
            src="/knowledge-refs/s6-saas.png"
            alt="dashboard cards"
            style="--ox:50%;--oy:50%;--zoom:2.8;"
            draggable="false"
          />
        </div>
        <figcaption>dashboard cards</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/s6-saas.png"
            alt="feature block"
            style="--ox:100%;--oy:0%;--zoom:2.6;"
            draggable="false"
          />
        </div>
        <figcaption>feature block</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/s6-saas.png"
            alt="logo strip"
            style="--ox:50%;--oy:100%;--zoom:2.8;"
            draggable="false"
          />
        </div>
        <figcaption>logo strip</figcaption>
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
        <div class="component__desc">Rounded pill CTA buttons in black with white text, often paired with a small circular arrow icon on the right.</div>
      </div>
      <div class="component">
        <div class="component__name">card</div>
        <div class="component__desc">White dashboard-style cards with rounded corners, light warm borders, subtle shadows, and compact charts or task metadata.</div>
      </div>
      <div class="component">
        <div class="component__name">navigation</div>
        <div class="component__desc">Minimal top navigation with left-aligned wordmark, centered text links, and right-aligned auth plus primary CTA.</div>
      </div></div>

  <div class="section"><h2>Layout pattern</h2><p>centered marketing hero with top navigation, floating product-preview cards beneath the headline, logo strip below, and alternating two-column feature sections on a warm neutral background</p></div>
</body>
</html>
```

