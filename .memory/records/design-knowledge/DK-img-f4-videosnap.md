---
{"id":"DK-img-f4-videosnap","layer":"L1","kind":"design-knowledge","title":"Style Spec — f4-videosnap.png","tags":["industry:fintech-web3","source:vision-distill","image:f4-videosnap.png","manual:approved"],"source":"distill","refs":{},"createdAt":1778922855698,"updatedAt":1778922855698,"schemaVersion":1}
---

<!-- style-spec:json
{
  "industry": "fintech-web3",
  "summary": "A dark, high-contrast landing page with neon cyan accents, futuristic data visuals, and glossy feature cards. The aesthetic blends web3 dashboard motifs with premium product-marketing structure.",
  "vibe": [
    "dark",
    "futuristic",
    "sleek",
    "techy",
    "high-contrast"
  ],
  "palette": {
    "primary": {
      "hex": "#18e0e3",
      "label": "neon cyan"
    },
    "secondary": {
      "hex": "#0f6f74",
      "label": "deep teal"
    },
    "accent": {
      "hex": "#7ff7f4",
      "label": "bright aqua glow"
    },
    "background": {
      "hex": "#050505",
      "label": "near-black"
    },
    "surface": {
      "hex": "#111214",
      "label": "charcoal panel"
    },
    "text": {
      "hex": "#f4f4f4",
      "label": "off-white"
    },
    "textMuted": {
      "hex": "#8e959b",
      "label": "muted gray"
    },
    "border": {
      "hex": "#2a2e31",
      "label": "subtle graphite"
    }
  },
  "typography": {
    "headingFont": "Inter",
    "bodyFont": "Inter",
    "headingWeight": 700,
    "bodyWeight": 400,
    "baseSizePx": 16,
    "notes": [
      "large bold hero headings",
      "cyan-highlighted keywords",
      "small muted supporting copy",
      "uppercase micro labels"
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
    "0 0 0 1px rgba(255,255,255,0.06)",
    "0 12px 32px rgba(0,0,0,0.45)",
    "0 0 24px rgba(24,224,227,0.18)"
  ],
  "components": {
    "button": {
      "description": "Rounded rectangular CTA buttons with dark fills, thin light borders, white text, and occasional cyan glow or highlight states."
    },
    "card": {
      "description": "Feature cards use dark charcoal surfaces, subtle gradients, thin borders, rounded corners, and cyan-lit isometric illustrations."
    },
    "navigation": {
      "description": "Minimal top navigation with centered links, sparse icon actions, and a dark browser-like frame around the page."
    }
  },
  "layout": "top navigation + centered hero + world-map visualization + feature card grid + lower value-proposition section",
  "imagePath": "/knowledge-refs/f4-videosnap.png",
  "imageName": "f4-videosnap.png",
  "capturedAt": "2026-05-16T09:14:15.698Z",
  "model": "openai/gpt-5.4-20260305"
}
-->

# Style Spec — f4-videosnap.png

## Style Spec (Markdown)

**Industry**: fintech-web3
**Image**: f4-videosnap.png
**Vibe**: dark, futuristic, sleek, techy, high-contrast

**Summary**: A dark, high-contrast landing page with neon cyan accents, futuristic data visuals, and glossy feature cards. The aesthetic blends web3 dashboard motifs with premium product-marketing structure.

### Palette
- Primary: `#18e0e3` — neon cyan
- Secondary: `#0f6f74` — deep teal
- Accent: `#7ff7f4` — bright aqua glow
- Background: `#050505` — near-black
- Surface: `#111214` — charcoal panel
- Text: `#f4f4f4` — off-white
- Text muted: `#8e959b` — muted gray
- Border: `#2a2e31` — subtle graphite

### Typography
- Heading font: Inter (weight 700)
- Body font: Inter (weight 400)
- Base size: 16px
- Note: large bold hero headings
- Note: cyan-highlighted keywords
- Note: small muted supporting copy
- Note: uppercase micro labels

### Spacing & Radius
- Spacing base: 8px; scale: 4, 8, 12, 16, 24, 32, 48, 64
- Radius: sm 6px, md 12px, lg 20px, pill 999px
- Shadows: 3 variant(s)
  - `0 0 0 1px rgba(255,255,255,0.06)`
  - `0 12px 32px rgba(0,0,0,0.45)`
  - `0 0 24px rgba(24,224,227,0.18)`

### Components
- **button**: Rounded rectangular CTA buttons with dark fills, thin light borders, white text, and occasional cyan glow or highlight states.
- **card**: Feature cards use dark charcoal surfaces, subtle gradients, thin borders, rounded corners, and cyan-lit isometric illustrations.
- **navigation**: Minimal top navigation with centered links, sparse icon actions, and a dark browser-like frame around the page.

### Layout
top navigation + centered hero + world-map visualization + feature card grid + lower value-proposition section

## Style Spec (HTML)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Style Spec — f4-videosnap.png</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
    --color-primary:    #18e0e3;
    --color-secondary:  #0f6f74;
    --color-accent:     #7ff7f4;
    --color-background: #050505;
    --color-surface:    #111214;
    --color-text:       #f4f4f4;
    --color-text-muted: #8e959b;
    --color-border:     #2a2e31;
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
    <img src="/knowledge-refs/f4-videosnap.png" alt="f4-videosnap.png">
    <div class="header__body">
      <div class="kicker">fintech-web3</div>
      <h1>f4-videosnap.png</h1>
      <p class="muted">A dark, high-contrast landing page with neon cyan accents, futuristic data visuals, and glossy feature cards. The aesthetic blends web3 dashboard motifs with premium product-marketing structure.</p>
      <div class="tags">
        <span class="tag">dark</span><span class="tag">futuristic</span><span class="tag">sleek</span><span class="tag">techy</span><span class="tag">high-contrast</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Palette</h2>
    <div class="palette">
    <div class="swatch">
      <div class="swatch__chip" style="background:#18e0e3"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Primary</div>
        <div class="swatch__hex">#18e0e3</div>
        <div class="swatch__name">neon cyan</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#0f6f74"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Secondary</div>
        <div class="swatch__hex">#0f6f74</div>
        <div class="swatch__name">deep teal</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#7ff7f4"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Accent</div>
        <div class="swatch__hex">#7ff7f4</div>
        <div class="swatch__name">bright aqua glow</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#050505"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Background</div>
        <div class="swatch__hex">#050505</div>
        <div class="swatch__name">near-black</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#111214"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Surface</div>
        <div class="swatch__hex">#111214</div>
        <div class="swatch__name">charcoal panel</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f4f4f4"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text</div>
        <div class="swatch__hex">#f4f4f4</div>
        <div class="swatch__name">off-white</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#8e959b"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text muted</div>
        <div class="swatch__hex">#8e959b</div>
        <div class="swatch__name">muted gray</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#2a2e31"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Border</div>
        <div class="swatch__hex">#2a2e31</div>
        <div class="swatch__name">subtle graphite</div>
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

  <div class="section"><h2>Shadows</h2><div class="shadow-card" style="box-shadow:0 0 0 1px rgba(255,255,255,0.06)">0 0 0 1px rgba(255,255,255,0.06)</div><div class="shadow-card" style="box-shadow:0 12px 32px rgba(0,0,0,0.45)">0 12px 32px rgba(0,0,0,0.45)</div><div class="shadow-card" style="box-shadow:0 0 24px rgba(24,224,227,0.18)">0 0 24px rgba(24,224,227,0.18)</div></div>

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
        <div class="component__desc">Rounded rectangular CTA buttons with dark fills, thin light borders, white text, and occasional cyan glow or highlight states.</div>
      </div>
      <div class="component">
        <div class="component__name">card</div>
        <div class="component__desc">Feature cards use dark charcoal surfaces, subtle gradients, thin borders, rounded corners, and cyan-lit isometric illustrations.</div>
      </div>
      <div class="component">
        <div class="component__name">navigation</div>
        <div class="component__desc">Minimal top navigation with centered links, sparse icon actions, and a dark browser-like frame around the page.</div>
      </div></div>

  <div class="section"><h2>Layout pattern</h2><p>top navigation + centered hero + world-map visualization + feature card grid + lower value-proposition section</p></div>
</body>
</html>
```

