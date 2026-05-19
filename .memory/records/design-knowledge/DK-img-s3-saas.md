---
{"id":"DK-img-s3-saas","layer":"L1","kind":"design-knowledge","title":"Style Spec — s3-saas.png","tags":["industry:generic","source:vision-distill","image:s3-saas.png","manual:approved"],"source":"distill","refs":{},"createdAt":1778922891045,"updatedAt":1778922891045,"schemaVersion":1}
---

<!-- style-spec:json
{
  "industry": "generic",
  "summary": "A light, airy SaaS-style marketing landing page with soft gradients, rounded cards, and minimal UI chrome. The design emphasizes spacious layout, centered hero messaging, and gentle pastel accents for a polished modern feel.",
  "vibe": [
    "minimal",
    "soft",
    "clean",
    "friendly",
    "modern"
  ],
  "palette": {
    "primary": {
      "hex": "#6d7fd8",
      "label": "periwinkle blue"
    },
    "secondary": {
      "hex": "#dcd9f5",
      "label": "soft lavender"
    },
    "accent": {
      "hex": "#cfeeff",
      "label": "pale sky blue"
    },
    "background": {
      "hex": "#f6f7fb",
      "label": "mist white"
    },
    "surface": {
      "hex": "#ffffff",
      "label": "white"
    },
    "text": {
      "hex": "#17182e",
      "label": "deep navy"
    },
    "textMuted": {
      "hex": "#6f7285",
      "label": "cool gray"
    },
    "border": {
      "hex": "#e8eaf2",
      "label": "light gray"
    },
    "warning": {
      "hex": "#f2c8a8",
      "label": "soft peach"
    }
  },
  "typography": {
    "headingFont": "Inter",
    "bodyFont": "Inter",
    "headingWeight": 700,
    "bodyWeight": 400,
    "baseSizePx": 16,
    "notes": [
      "large centered hero headings",
      "clean sans serif with generous whitespace",
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
    "smPx": 6,
    "mdPx": 12,
    "lgPx": 20,
    "pillPx": 999
  },
  "shadows": [
    "0 1px 2px rgba(23,24,46,0.04)",
    "0 12px 36px rgba(109,127,216,0.12)"
  ],
  "components": {
    "button": {
      "description": "Rounded pill buttons with white or blue fills, subtle borders, small labels, and minimal shadow; primary CTA uses muted periwinkle background with white text."
    },
    "card": {
      "description": "Large white feature cards with very soft gradient tints, rounded corners, faint borders, and light shadow; interior content uses compact headings and muted descriptions."
    },
    "input": {
      "description": "Form fields inside scheduling mockups are white with thin light-gray borders, small radius, compact spacing, and understated labels."
    },
    "navigation": {
      "description": "Top horizontal navigation with small wordmark on the left, centered simple text links, and compact login/signup actions on the right."
    }
  },
  "layout": "top navigation + centered hero + floating product mockups + stacked feature sections with two-column marketing panels and pricing cards",
  "imagePath": "/knowledge-refs/s3-saas.png",
  "imageName": "s3-saas.png",
  "capturedAt": "2026-05-16T09:14:51.044Z",
  "model": "openai/gpt-5.4-20260305"
}
-->

# Style Spec — s3-saas.png

## Style Spec (Markdown)

**Industry**: generic
**Image**: s3-saas.png
**Vibe**: minimal, soft, clean, friendly, modern

**Summary**: A light, airy SaaS-style marketing landing page with soft gradients, rounded cards, and minimal UI chrome. The design emphasizes spacious layout, centered hero messaging, and gentle pastel accents for a polished modern feel.

### Palette
- Primary: `#6d7fd8` — periwinkle blue
- Secondary: `#dcd9f5` — soft lavender
- Accent: `#cfeeff` — pale sky blue
- Background: `#f6f7fb` — mist white
- Surface: `#ffffff` — white
- Text: `#17182e` — deep navy
- Text muted: `#6f7285` — cool gray
- Border: `#e8eaf2` — light gray
- Warning: `#f2c8a8` — soft peach

### Typography
- Heading font: Inter (weight 700)
- Body font: Inter (weight 400)
- Base size: 16px
- Note: large centered hero headings
- Note: clean sans serif with generous whitespace
- Note: small muted supporting copy

### Spacing & Radius
- Spacing base: 8px; scale: 4, 8, 12, 16, 24, 32, 48, 64
- Radius: sm 6px, md 12px, lg 20px, pill 999px
- Shadows: 2 variant(s)
  - `0 1px 2px rgba(23,24,46,0.04)`
  - `0 12px 36px rgba(109,127,216,0.12)`

### Components
- **button**: Rounded pill buttons with white or blue fills, subtle borders, small labels, and minimal shadow; primary CTA uses muted periwinkle background with white text.
- **card**: Large white feature cards with very soft gradient tints, rounded corners, faint borders, and light shadow; interior content uses compact headings and muted descriptions.
- **input**: Form fields inside scheduling mockups are white with thin light-gray borders, small radius, compact spacing, and understated labels.
- **navigation**: Top horizontal navigation with small wordmark on the left, centered simple text links, and compact login/signup actions on the right.

### Layout
top navigation + centered hero + floating product mockups + stacked feature sections with two-column marketing panels and pricing cards

## Style Spec (HTML)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Style Spec — s3-saas.png</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
    --color-primary:    #6d7fd8;
    --color-secondary:  #dcd9f5;
    --color-accent:     #cfeeff;
    --color-background: #f6f7fb;
    --color-surface:    #ffffff;
    --color-text:       #17182e;
    --color-text-muted: #6f7285;
    --color-border:     #e8eaf2;
    --color-success:    #22c55e;
    --color-warning:    #f2c8a8;
    --color-danger:     #ef4444;
    --font-heading: 'Inter', system-ui, sans-serif;
    --font-body:    'Inter', system-ui, sans-serif;
    --font-mono:    'JetBrains Mono', ui-monospace, monospace;
    --weight-heading: 700;
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
.section { margin-top: 32px; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 720px) { .grid-2 { grid-template-columns: 1fr; } }
</style>
</head>
<body>
  <div class="header">
    <img src="/knowledge-refs/s3-saas.png" alt="s3-saas.png">
    <div class="header__body">
      <div class="kicker">generic</div>
      <h1>s3-saas.png</h1>
      <p class="muted">A light, airy SaaS-style marketing landing page with soft gradients, rounded cards, and minimal UI chrome. The design emphasizes spacious layout, centered hero messaging, and gentle pastel accents for a polished modern feel.</p>
      <div class="tags">
        <span class="tag">minimal</span><span class="tag">soft</span><span class="tag">clean</span><span class="tag">friendly</span><span class="tag">modern</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Palette</h2>
    <div class="palette">
    <div class="swatch">
      <div class="swatch__chip" style="background:#6d7fd8"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Primary</div>
        <div class="swatch__hex">#6d7fd8</div>
        <div class="swatch__name">periwinkle blue</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#dcd9f5"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Secondary</div>
        <div class="swatch__hex">#dcd9f5</div>
        <div class="swatch__name">soft lavender</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#cfeeff"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Accent</div>
        <div class="swatch__hex">#cfeeff</div>
        <div class="swatch__name">pale sky blue</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f6f7fb"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Background</div>
        <div class="swatch__hex">#f6f7fb</div>
        <div class="swatch__name">mist white</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#ffffff"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Surface</div>
        <div class="swatch__hex">#ffffff</div>
        <div class="swatch__name">white</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#17182e"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text</div>
        <div class="swatch__hex">#17182e</div>
        <div class="swatch__name">deep navy</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#6f7285"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text muted</div>
        <div class="swatch__hex">#6f7285</div>
        <div class="swatch__name">cool gray</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#e8eaf2"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Border</div>
        <div class="swatch__hex">#e8eaf2</div>
        <div class="swatch__name">light gray</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f2c8a8"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Warning</div>
        <div class="swatch__hex">#f2c8a8</div>
        <div class="swatch__name">soft peach</div>
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

  <div class="section"><h2>Shadows</h2><div class="shadow-card" style="box-shadow:0 1px 2px rgba(23,24,46,0.04)">0 1px 2px rgba(23,24,46,0.04)</div><div class="shadow-card" style="box-shadow:0 12px 36px rgba(109,127,216,0.12)">0 12px 36px rgba(109,127,216,0.12)</div></div>

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
        <div class="component__desc">Rounded pill buttons with white or blue fills, subtle borders, small labels, and minimal shadow; primary CTA uses muted periwinkle background with white text.</div>
      </div>
      <div class="component">
        <div class="component__name">card</div>
        <div class="component__desc">Large white feature cards with very soft gradient tints, rounded corners, faint borders, and light shadow; interior content uses compact headings and muted descriptions.</div>
      </div>
      <div class="component">
        <div class="component__name">input</div>
        <div class="component__desc">Form fields inside scheduling mockups are white with thin light-gray borders, small radius, compact spacing, and understated labels.</div>
      </div>
      <div class="component">
        <div class="component__name">navigation</div>
        <div class="component__desc">Top horizontal navigation with small wordmark on the left, centered simple text links, and compact login/signup actions on the right.</div>
      </div></div>

  <div class="section"><h2>Layout pattern</h2><p>top navigation + centered hero + floating product mockups + stacked feature sections with two-column marketing panels and pricing cards</p></div>
</body>
</html>
```

