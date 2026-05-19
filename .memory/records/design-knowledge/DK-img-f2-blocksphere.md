---
{"id":"DK-img-f2-blocksphere","layer":"L1","kind":"design-knowledge","title":"Style Spec — f2-blocksphere.png","tags":["industry:fintech-web3","source:vision-distill","image:f2-blocksphere.png","manual:approved"],"source":"distill","refs":{},"createdAt":1778922838959,"updatedAt":1778922838959,"schemaVersion":1}
---

<!-- style-spec:json
{
  "industry": "fintech-web3",
  "summary": "Dark neon landing page for a Web3 product with a centered hero, glowing purple gradients, and floating crypto dashboard cards. The aesthetic mixes premium fintech polish with futuristic web3 lighting effects and soft glassmorphism panels.",
  "vibe": [
    "dark",
    "futuristic",
    "glowing",
    "premium",
    "sleek"
  ],
  "palette": {
    "primary": {
      "hex": "#b15cff",
      "label": "electric violet"
    },
    "secondary": {
      "hex": "#f08cff",
      "label": "pink lavender"
    },
    "accent": {
      "hex": "#5ef0c8",
      "label": "mint green"
    },
    "background": {
      "hex": "#090916",
      "label": "deep navy black"
    },
    "surface": {
      "hex": "#1a1a2c",
      "label": "midnight panel"
    },
    "text": {
      "hex": "#f4efff",
      "label": "soft white"
    },
    "textMuted": {
      "hex": "#9a8fb3",
      "label": "muted lavender gray"
    },
    "border": {
      "hex": "#4a4163",
      "label": "dim purple border"
    },
    "success": {
      "hex": "#5ef0c8",
      "label": "aqua mint"
    },
    "warning": {
      "hex": "#f0b24f",
      "label": "amber gold"
    },
    "danger": {
      "hex": "#ff6b8f",
      "label": "rose red"
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
      "bold gradient-highlighted keyword",
      "small muted supporting copy",
      "numeric KPI callouts"
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
    "lgPx": 20,
    "pillPx": 999
  },
  "shadows": [
    "0 8px 24px rgba(0,0,0,0.35)",
    "0 0 40px rgba(177,92,255,0.35)",
    "0 0 80px rgba(240,140,255,0.18)"
  ],
  "components": {
    "button": {
      "description": "Rounded pill CTA with purple-to-pink gradient fill, white text, soft outer glow, and minimal border treatment."
    },
    "card": {
      "description": "Floating dark dashboard cards with subtle purple borders, soft inner glow, rounded corners, compact crypto metrics, and muted labels with brighter value text."
    },
    "input": {
      "description": "Wide pill-shaped email field in a translucent purple-gray surface with faint border, low-contrast placeholder, and paired CTA button."
    },
    "navigation": {
      "description": "Top horizontal navigation with logo on the left, centered text links, and a small pill CTA on the right; all elements sit on a clean dark background without a visible bar container."
    }
  },
  "layout": "top navigation + centered hero + email signup row + floating crypto card trio + three-column KPI stats section",
  "imagePath": "/knowledge-refs/f2-blocksphere.png",
  "imageName": "f2-blocksphere.png",
  "capturedAt": "2026-05-16T09:13:58.959Z",
  "model": "openai/gpt-5.4-20260305"
}
-->

# Style Spec — f2-blocksphere.png

## Style Spec (Markdown)

**Industry**: fintech-web3
**Image**: f2-blocksphere.png
**Vibe**: dark, futuristic, glowing, premium, sleek

**Summary**: Dark neon landing page for a Web3 product with a centered hero, glowing purple gradients, and floating crypto dashboard cards. The aesthetic mixes premium fintech polish with futuristic web3 lighting effects and soft glassmorphism panels.

### Palette
- Primary: `#b15cff` — electric violet
- Secondary: `#f08cff` — pink lavender
- Accent: `#5ef0c8` — mint green
- Background: `#090916` — deep navy black
- Surface: `#1a1a2c` — midnight panel
- Text: `#f4efff` — soft white
- Text muted: `#9a8fb3` — muted lavender gray
- Border: `#4a4163` — dim purple border
- Success: `#5ef0c8` — aqua mint
- Warning: `#f0b24f` — amber gold
- Danger: `#ff6b8f` — rose red

### Typography
- Heading font: Inter (weight 700)
- Body font: Inter (weight 400)
- Base size: 16px
- Note: large centered hero heading
- Note: bold gradient-highlighted keyword
- Note: small muted supporting copy
- Note: numeric KPI callouts

### Spacing & Radius
- Spacing base: 8px; scale: 4, 8, 12, 16, 24, 32, 48, 64
- Radius: sm 4px, md 10px, lg 20px, pill 999px
- Shadows: 3 variant(s)
  - `0 8px 24px rgba(0,0,0,0.35)`
  - `0 0 40px rgba(177,92,255,0.35)`
  - `0 0 80px rgba(240,140,255,0.18)`

### Components
- **button**: Rounded pill CTA with purple-to-pink gradient fill, white text, soft outer glow, and minimal border treatment.
- **card**: Floating dark dashboard cards with subtle purple borders, soft inner glow, rounded corners, compact crypto metrics, and muted labels with brighter value text.
- **input**: Wide pill-shaped email field in a translucent purple-gray surface with faint border, low-contrast placeholder, and paired CTA button.
- **navigation**: Top horizontal navigation with logo on the left, centered text links, and a small pill CTA on the right; all elements sit on a clean dark background without a visible bar container.

### Layout
top navigation + centered hero + email signup row + floating crypto card trio + three-column KPI stats section

## Style Spec (HTML)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Style Spec — f2-blocksphere.png</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
    --color-primary:    #b15cff;
    --color-secondary:  #f08cff;
    --color-accent:     #5ef0c8;
    --color-background: #090916;
    --color-surface:    #1a1a2c;
    --color-text:       #f4efff;
    --color-text-muted: #9a8fb3;
    --color-border:     #4a4163;
    --color-success:    #5ef0c8;
    --color-warning:    #f0b24f;
    --color-danger:     #ff6b8f;
    --font-heading: 'Inter', system-ui, sans-serif;
    --font-body:    'Inter', system-ui, sans-serif;
    --font-mono:    'JetBrains Mono', ui-monospace, monospace;
    --weight-heading: 700;
    --weight-body:    400;
    --size-base:      16px;
    --radius-sm: 4px;
    --radius-md: 10px;
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
    <img src="/knowledge-refs/f2-blocksphere.png" alt="f2-blocksphere.png">
    <div class="header__body">
      <div class="kicker">fintech-web3</div>
      <h1>f2-blocksphere.png</h1>
      <p class="muted">Dark neon landing page for a Web3 product with a centered hero, glowing purple gradients, and floating crypto dashboard cards. The aesthetic mixes premium fintech polish with futuristic web3 lighting effects and soft glassmorphism panels.</p>
      <div class="tags">
        <span class="tag">dark</span><span class="tag">futuristic</span><span class="tag">glowing</span><span class="tag">premium</span><span class="tag">sleek</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Palette</h2>
    <div class="palette">
    <div class="swatch">
      <div class="swatch__chip" style="background:#b15cff"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Primary</div>
        <div class="swatch__hex">#b15cff</div>
        <div class="swatch__name">electric violet</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f08cff"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Secondary</div>
        <div class="swatch__hex">#f08cff</div>
        <div class="swatch__name">pink lavender</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#5ef0c8"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Accent</div>
        <div class="swatch__hex">#5ef0c8</div>
        <div class="swatch__name">mint green</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#090916"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Background</div>
        <div class="swatch__hex">#090916</div>
        <div class="swatch__name">deep navy black</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#1a1a2c"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Surface</div>
        <div class="swatch__hex">#1a1a2c</div>
        <div class="swatch__name">midnight panel</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f4efff"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text</div>
        <div class="swatch__hex">#f4efff</div>
        <div class="swatch__name">soft white</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#9a8fb3"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text muted</div>
        <div class="swatch__hex">#9a8fb3</div>
        <div class="swatch__name">muted lavender gray</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#4a4163"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Border</div>
        <div class="swatch__hex">#4a4163</div>
        <div class="swatch__name">dim purple border</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#5ef0c8"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Success</div>
        <div class="swatch__hex">#5ef0c8</div>
        <div class="swatch__name">aqua mint</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f0b24f"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Warning</div>
        <div class="swatch__hex">#f0b24f</div>
        <div class="swatch__name">amber gold</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#ff6b8f"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Danger</div>
        <div class="swatch__hex">#ff6b8f</div>
        <div class="swatch__name">rose red</div>
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

  <div class="section"><h2>Shadows</h2><div class="shadow-card" style="box-shadow:0 8px 24px rgba(0,0,0,0.35)">0 8px 24px rgba(0,0,0,0.35)</div><div class="shadow-card" style="box-shadow:0 0 40px rgba(177,92,255,0.35)">0 0 40px rgba(177,92,255,0.35)</div><div class="shadow-card" style="box-shadow:0 0 80px rgba(240,140,255,0.18)">0 0 80px rgba(240,140,255,0.18)</div></div>

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
        <div class="component__desc">Rounded pill CTA with purple-to-pink gradient fill, white text, soft outer glow, and minimal border treatment.</div>
      </div>
      <div class="component">
        <div class="component__name">card</div>
        <div class="component__desc">Floating dark dashboard cards with subtle purple borders, soft inner glow, rounded corners, compact crypto metrics, and muted labels with brighter value text.</div>
      </div>
      <div class="component">
        <div class="component__name">input</div>
        <div class="component__desc">Wide pill-shaped email field in a translucent purple-gray surface with faint border, low-contrast placeholder, and paired CTA button.</div>
      </div>
      <div class="component">
        <div class="component__name">navigation</div>
        <div class="component__desc">Top horizontal navigation with logo on the left, centered text links, and a small pill CTA on the right; all elements sit on a clean dark background without a visible bar container.</div>
      </div></div>

  <div class="section"><h2>Layout pattern</h2><p>top navigation + centered hero + email signup row + floating crypto card trio + three-column KPI stats section</p></div>
</body>
</html>
```

