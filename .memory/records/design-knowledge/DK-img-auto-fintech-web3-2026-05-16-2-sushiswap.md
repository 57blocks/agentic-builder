---
{"id":"DK-img-auto-fintech-web3-2026-05-16-2-sushiswap","layer":"L1","kind":"design-knowledge","title":"Trend Capture — SushiSwap (fintech-web3)","tags":["industry:fintech-web3","source:trend-capture","image:auto-fintech-web3-2026-05-16-2-sushiswap.png","site:sushi.com","url:https://sushi.com","captured:2026-05-16","manual:approved"],"source":"distill","refs":{},"createdAt":1778925570124,"updatedAt":1778925570124,"schemaVersion":1}
---

<!-- style-spec:json
{
  "industry": "fintech-web3",
  "summary": "A bright, minimalist DeFi trading interface with generous whitespace, soft rounded containers, and subtle crypto-native accent colors. The design feels approachable and polished, prioritizing clarity over dense market-data complexity.",
  "vibe": [
    "minimal",
    "clean",
    "soft",
    "modern",
    "airy"
  ],
  "palette": {
    "primary": {
      "hex": "#427de1",
      "label": "action blue"
    },
    "secondary": {
      "hex": "#667fe7",
      "label": "token blue"
    },
    "accent": {
      "hex": "#d95cff",
      "label": "cross-chain magenta"
    },
    "background": {
      "hex": "#f8f8f8",
      "label": "app background"
    },
    "surface": {
      "hex": "#ffffff",
      "label": "card white"
    },
    "text": {
      "hex": "#111111",
      "label": "primary text"
    },
    "textMuted": {
      "hex": "#6b7280",
      "label": "muted slate"
    },
    "border": {
      "hex": "#e5e7eb",
      "label": "soft gray border"
    }
  },
  "typography": {
    "headingFont": "Inter",
    "bodyFont": "Inter",
    "headingWeight": 600,
    "bodyWeight": 400,
    "baseSizePx": 16,
    "notes": [
      "large numeric amount fields",
      "compact navigation labels",
      "medium-weight pill tab labels"
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
    "0 1px 2px rgba(0,0,0,0.04)",
    "0 8px 24px rgba(0,0,0,0.06)"
  ],
  "components": {
    "button": {
      "description": "Large full-width primary CTA with solid blue fill, white text, medium corner radius, and minimal elevation; secondary buttons appear as light-gray pill buttons in the top nav and token selectors."
    },
    "card": {
      "description": "Centered swap module inside a white rounded card with very soft border/shadow, containing segmented tabs, two stacked token amount panels, and a circular swap-direction control between panels."
    },
    "input": {
      "description": "Token amount inputs are embedded within large bordered panels; labels sit above oversized numeric values, with token selector pills aligned to the right and small muted balance rows underneath."
    },
    "navigation": {
      "description": "Top horizontal navigation bar with logo on the left, spaced text links across the header, and rounded utility pills for network selection and wallet connection on the right."
    }
  },
  "layout": "top navigation + centered swap card with segmented tabs + stacked trade panels + full-width CTA",
  "imageMotifs": [
    "crypto tokens",
    "minimal workspace",
    "soft gradient",
    "futuristic finance"
  ],
  "imagePath": "/knowledge-refs/auto-fintech-web3-2026-05-16-2-sushiswap.png",
  "imageName": "auto-fintech-web3-2026-05-16-2-sushiswap.png",
  "capturedAt": "2026-05-16T09:59:30.123Z",
  "model": "openai/gpt-5.4-20260305"
}
-->

# Style Spec — auto-fintech-web3-2026-05-16-2-sushiswap.png

## Style Spec (Markdown)

**Industry**: fintech-web3
**Image**: auto-fintech-web3-2026-05-16-2-sushiswap.png
**Vibe**: minimal, clean, soft, modern, airy

**Summary**: A bright, minimalist DeFi trading interface with generous whitespace, soft rounded containers, and subtle crypto-native accent colors. The design feels approachable and polished, prioritizing clarity over dense market-data complexity.

### Palette
- Primary: `#427de1` — action blue
- Secondary: `#667fe7` — token blue
- Accent: `#d95cff` — cross-chain magenta
- Background: `#f8f8f8` — app background
- Surface: `#ffffff` — card white
- Text: `#111111` — primary text
- Text muted: `#6b7280` — muted slate
- Border: `#e5e7eb` — soft gray border

### Typography
- Heading font: Inter (weight 600)
- Body font: Inter (weight 400)
- Base size: 16px
- Note: large numeric amount fields
- Note: compact navigation labels
- Note: medium-weight pill tab labels

### Spacing & Radius
- Spacing base: 8px; scale: 4, 8, 12, 16, 24, 32, 48, 64
- Radius: sm 4px, md 8px, lg 16px, pill 999px
- Shadows: 2 variant(s)
  - `0 1px 2px rgba(0,0,0,0.04)`
  - `0 8px 24px rgba(0,0,0,0.06)`

### Components
- **button**: Large full-width primary CTA with solid blue fill, white text, medium corner radius, and minimal elevation; secondary buttons appear as light-gray pill buttons in the top nav and token selectors.
- **card**: Centered swap module inside a white rounded card with very soft border/shadow, containing segmented tabs, two stacked token amount panels, and a circular swap-direction control between panels.
- **input**: Token amount inputs are embedded within large bordered panels; labels sit above oversized numeric values, with token selector pills aligned to the right and small muted balance rows underneath.
- **navigation**: Top horizontal navigation bar with logo on the left, spaced text links across the header, and rounded utility pills for network selection and wallet connection on the right.

### Layout
top navigation + centered swap card with segmented tabs + stacked trade panels + full-width CTA

### Imagery & Motifs
On-theme photography subjects that pair well with this style:
- crypto tokens
- minimal workspace
- soft gradient
- futuristic finance

## Style Spec (HTML)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Style Spec — auto-fintech-web3-2026-05-16-2-sushiswap.png</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
    --color-primary:    #427de1;
    --color-secondary:  #667fe7;
    --color-accent:     #d95cff;
    --color-background: #f8f8f8;
    --color-surface:    #ffffff;
    --color-text:       #111111;
    --color-text-muted: #6b7280;
    --color-border:     #e5e7eb;
    --color-success:    #22c55e;
    --color-warning:    #f59e0b;
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
.section { margin-top: 32px; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 720px) { .grid-2 { grid-template-columns: 1fr; } }
.motif-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
.motif { margin: 0; border-radius: var(--radius-md); overflow: hidden; border: 1px solid var(--color-border);
  background: var(--color-surface); position: relative; }
.motif img { display: block; width: 100%; aspect-ratio: 3/2; object-fit: cover; }
.motif figcaption { padding: 8px 12px; font-size: 12px; color: var(--color-text-muted);
  background: var(--color-surface); border-top: 1px solid var(--color-border); }
</style>
</head>
<body>
  <div class="header">
    <img src="/knowledge-refs/auto-fintech-web3-2026-05-16-2-sushiswap.png" alt="auto-fintech-web3-2026-05-16-2-sushiswap.png">
    <div class="header__body">
      <div class="kicker">fintech-web3</div>
      <h1>auto-fintech-web3-2026-05-16-2-sushiswap.png</h1>
      <p class="muted">A bright, minimalist DeFi trading interface with generous whitespace, soft rounded containers, and subtle crypto-native accent colors. The design feels approachable and polished, prioritizing clarity over dense market-data complexity.</p>
      <div class="tags">
        <span class="tag">minimal</span><span class="tag">clean</span><span class="tag">soft</span><span class="tag">modern</span><span class="tag">airy</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Palette</h2>
    <div class="palette">
    <div class="swatch">
      <div class="swatch__chip" style="background:#427de1"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Primary</div>
        <div class="swatch__hex">#427de1</div>
        <div class="swatch__name">action blue</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#667fe7"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Secondary</div>
        <div class="swatch__hex">#667fe7</div>
        <div class="swatch__name">token blue</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#d95cff"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Accent</div>
        <div class="swatch__hex">#d95cff</div>
        <div class="swatch__name">cross-chain magenta</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f8f8f8"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Background</div>
        <div class="swatch__hex">#f8f8f8</div>
        <div class="swatch__name">app background</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#ffffff"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Surface</div>
        <div class="swatch__hex">#ffffff</div>
        <div class="swatch__name">card white</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#111111"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text</div>
        <div class="swatch__hex">#111111</div>
        <div class="swatch__name">primary text</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#6b7280"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text muted</div>
        <div class="swatch__hex">#6b7280</div>
        <div class="swatch__name">muted slate</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#e5e7eb"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Border</div>
        <div class="swatch__hex">#e5e7eb</div>
        <div class="swatch__name">soft gray border</div>
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

  <div class="section"><h2>Shadows</h2><div class="shadow-card" style="box-shadow:0 1px 2px rgba(0,0,0,0.04)">0 1px 2px rgba(0,0,0,0.04)</div><div class="shadow-card" style="box-shadow:0 8px 24px rgba(0,0,0,0.06)">0 8px 24px rgba(0,0,0,0.06)</div></div>

  <div class="section">
    <h2>Imagery &amp; Motifs</h2>
    <p class="muted" style="margin-top:-4px;">On-theme photography suggested for this style — keywords feed Unsplash (live) with picsum as fallback so the slots always render.</p>
    <div class="motif-grid">
      <figure class="motif">
        <img
          src="https://source.unsplash.com/600x400/?crypto%20tokens"
          data-fallback="https://picsum.photos/seed/auto-fintech-web3-2026-05-16-2-s-1/600/400"
          alt="crypto tokens"
          loading="lazy"
          referrerpolicy="no-referrer"
          onerror="if(this.dataset.fallback&&this.src!==this.dataset.fallback){this.src=this.dataset.fallback;}"
        />
        <figcaption>crypto tokens</figcaption>
      </figure>
      <figure class="motif">
        <img
          src="https://source.unsplash.com/600x400/?minimal%20workspace"
          data-fallback="https://picsum.photos/seed/auto-fintech-web3-2026-05-16-2-s-2/600/400"
          alt="minimal workspace"
          loading="lazy"
          referrerpolicy="no-referrer"
          onerror="if(this.dataset.fallback&&this.src!==this.dataset.fallback){this.src=this.dataset.fallback;}"
        />
        <figcaption>minimal workspace</figcaption>
      </figure>
      <figure class="motif">
        <img
          src="https://source.unsplash.com/600x400/?soft%20gradient"
          data-fallback="https://picsum.photos/seed/auto-fintech-web3-2026-05-16-2-s-3/600/400"
          alt="soft gradient"
          loading="lazy"
          referrerpolicy="no-referrer"
          onerror="if(this.dataset.fallback&&this.src!==this.dataset.fallback){this.src=this.dataset.fallback;}"
        />
        <figcaption>soft gradient</figcaption>
      </figure>
      <figure class="motif">
        <img
          src="https://source.unsplash.com/600x400/?futuristic%20finance"
          data-fallback="https://picsum.photos/seed/auto-fintech-web3-2026-05-16-2-s-4/600/400"
          alt="futuristic finance"
          loading="lazy"
          referrerpolicy="no-referrer"
          onerror="if(this.dataset.fallback&&this.src!==this.dataset.fallback){this.src=this.dataset.fallback;}"
        />
        <figcaption>futuristic finance</figcaption>
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
        <div class="component__desc">Large full-width primary CTA with solid blue fill, white text, medium corner radius, and minimal elevation; secondary buttons appear as light-gray pill buttons in the top nav and token selectors.</div>
      </div>
      <div class="component">
        <div class="component__name">card</div>
        <div class="component__desc">Centered swap module inside a white rounded card with very soft border/shadow, containing segmented tabs, two stacked token amount panels, and a circular swap-direction control between panels.</div>
      </div>
      <div class="component">
        <div class="component__name">input</div>
        <div class="component__desc">Token amount inputs are embedded within large bordered panels; labels sit above oversized numeric values, with token selector pills aligned to the right and small muted balance rows underneath.</div>
      </div>
      <div class="component">
        <div class="component__name">navigation</div>
        <div class="component__desc">Top horizontal navigation bar with logo on the left, spaced text links across the header, and rounded utility pills for network selection and wallet connection on the right.</div>
      </div></div>

  <div class="section"><h2>Layout pattern</h2><p>top navigation + centered swap card with segmented tabs + stacked trade panels + full-width CTA</p></div>
</body>
</html>
```

