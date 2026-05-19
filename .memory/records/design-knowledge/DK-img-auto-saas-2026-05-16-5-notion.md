---
{"id":"DK-img-auto-saas-2026-05-16-5-notion","layer":"L1","kind":"design-knowledge","title":"Trend Capture — Notion (saas)","tags":["industry:saas","source:trend-capture","image:auto-saas-2026-05-16-5-notion.png","site:notion.so","url:https://www.notion.so","captured:2026-05-16","manual:approved"],"source":"distill","refs":{},"createdAt":1778924987346,"updatedAt":1778924987346,"schemaVersion":1}
---

<!-- style-spec:json
{
  "industry": "saas",
  "summary": "A polished SaaS landing page with a deep midnight backdrop, oversized white hero typography, and floating product mockups layered over playful illustrated accents. The design balances enterprise credibility with friendly, slightly whimsical visuals and soft-glow depth.",
  "vibe": [
    "dark",
    "minimal",
    "playful",
    "premium",
    "friendly"
  ],
  "palette": {
    "primary": {
      "hex": "#5367e9",
      "label": "periwinkle blue"
    },
    "secondary": {
      "hex": "#2e77e5",
      "label": "cta blue"
    },
    "accent": {
      "hex": "#ffc650",
      "label": "warm yellow"
    },
    "background": {
      "hex": "#080d59",
      "label": "midnight navy"
    },
    "surface": {
      "hex": "#f7f6f2",
      "label": "warm off-white"
    },
    "text": {
      "hex": "#ffffff",
      "label": "white"
    },
    "textMuted": {
      "hex": "#c6cada",
      "label": "cool light gray"
    },
    "border": {
      "hex": "#e6e4de",
      "label": "soft neutral border"
    },
    "success": {
      "hex": "#91c89f",
      "label": "soft green"
    },
    "warning": {
      "hex": "#e4c663",
      "label": "muted amber"
    },
    "danger": {
      "hex": "#ff7a6b",
      "label": "coral red"
    }
  },
  "typography": {
    "headingFont": "Inter",
    "bodyFont": "Inter",
    "headingWeight": 700,
    "bodyWeight": 400,
    "baseSizePx": 16,
    "notes": [
      "oversized bold hero headline",
      "clean sans serif throughout",
      "medium-weight navigation and buttons"
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
    "0 8px 24px rgba(0,0,0,0.18)",
    "0 24px 60px rgba(0,0,0,0.28)"
  ],
  "components": {
    "button": {
      "description": "Rounded medium-large CTA buttons with solid blue fills, white text, minimal border treatment, and generous horizontal padding; secondary actions use a darker blue variant."
    },
    "card": {
      "description": "Floating white product cards and modal panels with soft neutral borders, subtle shadow, rounded corners, and airy internal spacing."
    },
    "table": {
      "description": "Kanban-style task board using pale tinted column backgrounds, compact rounded task cards, subtle separators, and small status pills in pastel colors."
    },
    "navigation": {
      "description": "Top horizontal navigation on a dark background with centered menu items, simple text links, a prominent primary CTA on the right, and a slim announcement bar above."
    }
  },
  "layout": "top announcement bar + dark horizontal navbar + centered hero copy with dual CTAs + floating auth modal + oversized product mockup + logo strip footer",
  "imagePath": "/knowledge-refs/auto-saas-2026-05-16-5-notion.png",
  "imageName": "auto-saas-2026-05-16-5-notion.png",
  "capturedAt": "2026-05-16T09:49:47.346Z",
  "model": "openai/gpt-5.4-20260305"
}
-->

# Style Spec — auto-saas-2026-05-16-5-notion.png

## Style Spec (Markdown)

**Industry**: saas
**Image**: auto-saas-2026-05-16-5-notion.png
**Vibe**: dark, minimal, playful, premium, friendly

**Summary**: A polished SaaS landing page with a deep midnight backdrop, oversized white hero typography, and floating product mockups layered over playful illustrated accents. The design balances enterprise credibility with friendly, slightly whimsical visuals and soft-glow depth.

### Palette
- Primary: `#5367e9` — periwinkle blue
- Secondary: `#2e77e5` — cta blue
- Accent: `#ffc650` — warm yellow
- Background: `#080d59` — midnight navy
- Surface: `#f7f6f2` — warm off-white
- Text: `#ffffff` — white
- Text muted: `#c6cada` — cool light gray
- Border: `#e6e4de` — soft neutral border
- Success: `#91c89f` — soft green
- Warning: `#e4c663` — muted amber
- Danger: `#ff7a6b` — coral red

### Typography
- Heading font: Inter (weight 700)
- Body font: Inter (weight 400)
- Base size: 16px
- Note: oversized bold hero headline
- Note: clean sans serif throughout
- Note: medium-weight navigation and buttons

### Spacing & Radius
- Spacing base: 8px; scale: 4, 8, 12, 16, 24, 32, 48, 64
- Radius: sm 4px, md 10px, lg 16px, pill 999px
- Shadows: 2 variant(s)
  - `0 8px 24px rgba(0,0,0,0.18)`
  - `0 24px 60px rgba(0,0,0,0.28)`

### Components
- **button**: Rounded medium-large CTA buttons with solid blue fills, white text, minimal border treatment, and generous horizontal padding; secondary actions use a darker blue variant.
- **card**: Floating white product cards and modal panels with soft neutral borders, subtle shadow, rounded corners, and airy internal spacing.
- **table**: Kanban-style task board using pale tinted column backgrounds, compact rounded task cards, subtle separators, and small status pills in pastel colors.
- **navigation**: Top horizontal navigation on a dark background with centered menu items, simple text links, a prominent primary CTA on the right, and a slim announcement bar above.

### Layout
top announcement bar + dark horizontal navbar + centered hero copy with dual CTAs + floating auth modal + oversized product mockup + logo strip footer

## Style Spec (HTML)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Style Spec — auto-saas-2026-05-16-5-notion.png</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
    --color-primary:    #5367e9;
    --color-secondary:  #2e77e5;
    --color-accent:     #ffc650;
    --color-background: #080d59;
    --color-surface:    #f7f6f2;
    --color-text:       #ffffff;
    --color-text-muted: #c6cada;
    --color-border:     #e6e4de;
    --color-success:    #91c89f;
    --color-warning:    #e4c663;
    --color-danger:     #ff7a6b;
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
    <img src="/knowledge-refs/auto-saas-2026-05-16-5-notion.png" alt="auto-saas-2026-05-16-5-notion.png">
    <div class="header__body">
      <div class="kicker">saas</div>
      <h1>auto-saas-2026-05-16-5-notion.png</h1>
      <p class="muted">A polished SaaS landing page with a deep midnight backdrop, oversized white hero typography, and floating product mockups layered over playful illustrated accents. The design balances enterprise credibility with friendly, slightly whimsical visuals and soft-glow depth.</p>
      <div class="tags">
        <span class="tag">dark</span><span class="tag">minimal</span><span class="tag">playful</span><span class="tag">premium</span><span class="tag">friendly</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Palette</h2>
    <div class="palette">
    <div class="swatch">
      <div class="swatch__chip" style="background:#5367e9"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Primary</div>
        <div class="swatch__hex">#5367e9</div>
        <div class="swatch__name">periwinkle blue</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#2e77e5"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Secondary</div>
        <div class="swatch__hex">#2e77e5</div>
        <div class="swatch__name">cta blue</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#ffc650"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Accent</div>
        <div class="swatch__hex">#ffc650</div>
        <div class="swatch__name">warm yellow</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#080d59"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Background</div>
        <div class="swatch__hex">#080d59</div>
        <div class="swatch__name">midnight navy</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f7f6f2"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Surface</div>
        <div class="swatch__hex">#f7f6f2</div>
        <div class="swatch__name">warm off-white</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#ffffff"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text</div>
        <div class="swatch__hex">#ffffff</div>
        <div class="swatch__name">white</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#c6cada"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text muted</div>
        <div class="swatch__hex">#c6cada</div>
        <div class="swatch__name">cool light gray</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#e6e4de"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Border</div>
        <div class="swatch__hex">#e6e4de</div>
        <div class="swatch__name">soft neutral border</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#91c89f"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Success</div>
        <div class="swatch__hex">#91c89f</div>
        <div class="swatch__name">soft green</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#e4c663"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Warning</div>
        <div class="swatch__hex">#e4c663</div>
        <div class="swatch__name">muted amber</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#ff7a6b"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Danger</div>
        <div class="swatch__hex">#ff7a6b</div>
        <div class="swatch__name">coral red</div>
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

  <div class="section"><h2>Shadows</h2><div class="shadow-card" style="box-shadow:0 8px 24px rgba(0,0,0,0.18)">0 8px 24px rgba(0,0,0,0.18)</div><div class="shadow-card" style="box-shadow:0 24px 60px rgba(0,0,0,0.28)">0 24px 60px rgba(0,0,0,0.28)</div></div>

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
        <div class="component__desc">Rounded medium-large CTA buttons with solid blue fills, white text, minimal border treatment, and generous horizontal padding; secondary actions use a darker blue variant.</div>
      </div>
      <div class="component">
        <div class="component__name">card</div>
        <div class="component__desc">Floating white product cards and modal panels with soft neutral borders, subtle shadow, rounded corners, and airy internal spacing.</div>
      </div>
      <div class="component">
        <div class="component__name">table</div>
        <div class="component__desc">Kanban-style task board using pale tinted column backgrounds, compact rounded task cards, subtle separators, and small status pills in pastel colors.</div>
      </div>
      <div class="component">
        <div class="component__name">navigation</div>
        <div class="component__desc">Top horizontal navigation on a dark background with centered menu items, simple text links, a prominent primary CTA on the right, and a slim announcement bar above.</div>
      </div></div>

  <div class="section"><h2>Layout pattern</h2><p>top announcement bar + dark horizontal navbar + centered hero copy with dual CTAs + floating auth modal + oversized product mockup + logo strip footer</p></div>
</body>
</html>
```

