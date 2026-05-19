---
{"id":"DK-img-ai-5-kodu","layer":"L1","kind":"design-knowledge","title":"Style Spec — ai-5-kodu.png","tags":["industry:ai","source:vision-distill","image:ai-5-kodu.png","manual:approved"],"source":"distill","refs":{},"createdAt":1778922777283,"updatedAt":1778922777283,"schemaVersion":1}
---

<!-- style-spec:json
{
  "industry": "ai",
  "summary": "A clean AI landing page with oversized editorial typography, soft frosted surfaces, and subtle 3D abstract visuals. The interface balances minimal black-and-white structure with luminous green accents for a modern, approachable feel.",
  "vibe": [
    "minimal",
    "airy",
    "futuristic",
    "editorial",
    "soft"
  ],
  "palette": {
    "primary": {
      "hex": "#000000",
      "label": "jet black"
    },
    "secondary": {
      "hex": "#78e66f",
      "label": "soft neon green"
    },
    "accent": {
      "hex": "#47d98a",
      "label": "mint green"
    },
    "background": {
      "hex": "#f2f1ef",
      "label": "warm light gray"
    },
    "surface": {
      "hex": "#ffffff",
      "label": "white"
    },
    "text": {
      "hex": "#111111",
      "label": "near-black"
    },
    "textMuted": {
      "hex": "#6f6f6f",
      "label": "medium gray"
    },
    "border": {
      "hex": "#d9d9d9",
      "label": "light gray"
    }
  },
  "typography": {
    "headingFont": "Inter",
    "bodyFont": "Inter",
    "headingWeight": 400,
    "bodyWeight": 400,
    "baseSizePx": 16,
    "notes": [
      "oversized hero headline",
      "lightweight geometric sans style",
      "high contrast scale between hero and body copy"
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
    "mdPx": 12,
    "lgPx": 20,
    "pillPx": 999
  },
  "shadows": [
    "0 8px 24px rgba(0,0,0,0.08)",
    "0 20px 40px rgba(0,0,0,0.10)"
  ],
  "components": {
    "button": {
      "description": "Primary CTA uses a black pill-shaped button with white uppercase text and a circular arrow segment on the right; secondary nav actions use white pill buttons with minimal shadow."
    },
    "card": {
      "description": "Small floating info card with white background, rounded corners, sparse body copy, and a small circular icon button anchored at the lower right."
    },
    "navigation": {
      "description": "Top navigation is centered in a white pill container with evenly spaced links, paired with a simple wordmark on the left and a separate sign-in pill on the right."
    }
  },
  "layout": "framed hero landing page with top navigation, centered oversized headline, primary CTA, abstract 3D background scene, and a floating feature card",
  "imagePath": "/knowledge-refs/ai-5-kodu.png",
  "imageName": "ai-5-kodu.png",
  "capturedAt": "2026-05-16T09:12:57.282Z",
  "model": "openai/gpt-5.4-20260305"
}
-->

# Style Spec — ai-5-kodu.png

## Style Spec (Markdown)

**Industry**: ai
**Image**: ai-5-kodu.png
**Vibe**: minimal, airy, futuristic, editorial, soft

**Summary**: A clean AI landing page with oversized editorial typography, soft frosted surfaces, and subtle 3D abstract visuals. The interface balances minimal black-and-white structure with luminous green accents for a modern, approachable feel.

### Palette
- Primary: `#000000` — jet black
- Secondary: `#78e66f` — soft neon green
- Accent: `#47d98a` — mint green
- Background: `#f2f1ef` — warm light gray
- Surface: `#ffffff` — white
- Text: `#111111` — near-black
- Text muted: `#6f6f6f` — medium gray
- Border: `#d9d9d9` — light gray

### Typography
- Heading font: Inter (weight 400)
- Body font: Inter (weight 400)
- Base size: 16px
- Note: oversized hero headline
- Note: lightweight geometric sans style
- Note: high contrast scale between hero and body copy

### Spacing & Radius
- Spacing base: 8px; scale: 4, 8, 12, 16, 24, 32, 48, 64
- Radius: sm 4px, md 12px, lg 20px, pill 999px
- Shadows: 2 variant(s)
  - `0 8px 24px rgba(0,0,0,0.08)`
  - `0 20px 40px rgba(0,0,0,0.10)`

### Components
- **button**: Primary CTA uses a black pill-shaped button with white uppercase text and a circular arrow segment on the right; secondary nav actions use white pill buttons with minimal shadow.
- **card**: Small floating info card with white background, rounded corners, sparse body copy, and a small circular icon button anchored at the lower right.
- **navigation**: Top navigation is centered in a white pill container with evenly spaced links, paired with a simple wordmark on the left and a separate sign-in pill on the right.

### Layout
framed hero landing page with top navigation, centered oversized headline, primary CTA, abstract 3D background scene, and a floating feature card

## Style Spec (HTML)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Style Spec — ai-5-kodu.png</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
    --color-primary:    #000000;
    --color-secondary:  #78e66f;
    --color-accent:     #47d98a;
    --color-background: #f2f1ef;
    --color-surface:    #ffffff;
    --color-text:       #111111;
    --color-text-muted: #6f6f6f;
    --color-border:     #d9d9d9;
    --color-success:    #22c55e;
    --color-warning:    #f59e0b;
    --color-danger:     #ef4444;
    --font-heading: 'Inter', system-ui, sans-serif;
    --font-body:    'Inter', system-ui, sans-serif;
    --font-mono:    'JetBrains Mono', ui-monospace, monospace;
    --weight-heading: 400;
    --weight-body:    400;
    --size-base:      16px;
    --radius-sm: 4px;
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
    <img src="/knowledge-refs/ai-5-kodu.png" alt="ai-5-kodu.png">
    <div class="header__body">
      <div class="kicker">ai</div>
      <h1>ai-5-kodu.png</h1>
      <p class="muted">A clean AI landing page with oversized editorial typography, soft frosted surfaces, and subtle 3D abstract visuals. The interface balances minimal black-and-white structure with luminous green accents for a modern, approachable feel.</p>
      <div class="tags">
        <span class="tag">minimal</span><span class="tag">airy</span><span class="tag">futuristic</span><span class="tag">editorial</span><span class="tag">soft</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Palette</h2>
    <div class="palette">
    <div class="swatch">
      <div class="swatch__chip" style="background:#000000"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Primary</div>
        <div class="swatch__hex">#000000</div>
        <div class="swatch__name">jet black</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#78e66f"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Secondary</div>
        <div class="swatch__hex">#78e66f</div>
        <div class="swatch__name">soft neon green</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#47d98a"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Accent</div>
        <div class="swatch__hex">#47d98a</div>
        <div class="swatch__name">mint green</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f2f1ef"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Background</div>
        <div class="swatch__hex">#f2f1ef</div>
        <div class="swatch__name">warm light gray</div>
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
      <div class="swatch__chip" style="background:#111111"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text</div>
        <div class="swatch__hex">#111111</div>
        <div class="swatch__name">near-black</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#6f6f6f"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text muted</div>
        <div class="swatch__hex">#6f6f6f</div>
        <div class="swatch__name">medium gray</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#d9d9d9"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Border</div>
        <div class="swatch__hex">#d9d9d9</div>
        <div class="swatch__name">light gray</div>
      </div>
    </div></div>
  </div>

  <div class="section grid-2">
    <div>
      <h2>Typography</h2>
      <div class="type-stack">
        <h3 style="font-size: 2rem;">Heading — Inter 400</h3>
        <h3 style="font-size: 1.4rem;">Subhead — Inter 400</h3>
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

  <div class="section"><h2>Shadows</h2><div class="shadow-card" style="box-shadow:0 8px 24px rgba(0,0,0,0.08)">0 8px 24px rgba(0,0,0,0.08)</div><div class="shadow-card" style="box-shadow:0 20px 40px rgba(0,0,0,0.10)">0 20px 40px rgba(0,0,0,0.10)</div></div>

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
        <div class="component__desc">Primary CTA uses a black pill-shaped button with white uppercase text and a circular arrow segment on the right; secondary nav actions use white pill buttons with minimal shadow.</div>
      </div>
      <div class="component">
        <div class="component__name">card</div>
        <div class="component__desc">Small floating info card with white background, rounded corners, sparse body copy, and a small circular icon button anchored at the lower right.</div>
      </div>
      <div class="component">
        <div class="component__name">navigation</div>
        <div class="component__desc">Top navigation is centered in a white pill container with evenly spaced links, paired with a simple wordmark on the left and a separate sign-in pill on the right.</div>
      </div></div>

  <div class="section"><h2>Layout pattern</h2><p>framed hero landing page with top navigation, centered oversized headline, primary CTA, abstract 3D background scene, and a floating feature card</p></div>
</body>
</html>
```

