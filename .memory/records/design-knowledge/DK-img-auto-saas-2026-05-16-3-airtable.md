---
{"id":"DK-img-auto-saas-2026-05-16-3-airtable","layer":"L1","kind":"design-knowledge","title":"Trend Capture — Airtable (saas)","tags":["industry:saas","source:trend-capture","image:auto-saas-2026-05-16-3-airtable.png","site:airtable.com","url:https://airtable.com","captured:2026-05-16","manual:approved"],"source":"distill","refs":{},"createdAt":1778924914243,"updatedAt":1778924914243,"schemaVersion":1}
---

<!-- style-spec:json
{
  "industry": "saas",
  "summary": "A clean enterprise SaaS landing page with expansive white space, large editorial-style hero typography, and restrained monochrome UI accented by subtle blue promotional highlights. The design feels polished and conversion-focused, using simple outlined and filled buttons with trust-building logo rows.",
  "vibe": [
    "minimal",
    "clean",
    "corporate",
    "modern",
    "airy"
  ],
  "palette": {
    "primary": {
      "hex": "#1f2530",
      "label": "charcoal navy"
    },
    "secondary": {
      "hex": "#2f6fec",
      "label": "link blue"
    },
    "background": {
      "hex": "#fefefe",
      "label": "white"
    },
    "surface": {
      "hex": "#ffffff",
      "label": "page white"
    },
    "text": {
      "hex": "#1f2530",
      "label": "dark charcoal"
    },
    "textMuted": {
      "hex": "#6b7280",
      "label": "cool gray"
    },
    "border": {
      "hex": "#cfd5de",
      "label": "light gray border"
    }
  },
  "typography": {
    "headingFont": "Inter",
    "bodyFont": "Inter",
    "headingWeight": 500,
    "bodyWeight": 400,
    "baseSizePx": 16,
    "notes": [
      "oversized centered hero heading",
      "neutral grotesk sans serif",
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
    "mdPx": 8,
    "lgPx": 16,
    "pillPx": 999
  },
  "shadows": [
    "0 1px 2px rgba(15,23,42,0.08)"
  ],
  "components": {
    "button": {
      "description": "Large pill-shaped CTA buttons; primary uses dark charcoal fill with white text, secondary uses white fill with thin dark outline and dark text. Header CTAs mirror the same system with generous horizontal padding."
    },
    "navigation": {
      "description": "Top navigation bar with left-aligned logo, horizontal menu links, and right-aligned actions. Includes a slim announcement bar above with pale blue background and blue text link."
    },
    "card": {
      "description": "No prominent cards in the visible area; content sits directly on the white page with section-based spacing and a logo strip acting as a trust band."
    }
  },
  "layout": "top announcement bar + fixed-style horizontal header + centered hero with dual CTAs + trusted-by logo row + next section intro",
  "imagePath": "/knowledge-refs/auto-saas-2026-05-16-3-airtable.png",
  "imageName": "auto-saas-2026-05-16-3-airtable.png",
  "capturedAt": "2026-05-16T09:48:34.242Z",
  "model": "openai/gpt-5.4-20260305"
}
-->

# Style Spec — auto-saas-2026-05-16-3-airtable.png

## Style Spec (Markdown)

**Industry**: saas
**Image**: auto-saas-2026-05-16-3-airtable.png
**Vibe**: minimal, clean, corporate, modern, airy

**Summary**: A clean enterprise SaaS landing page with expansive white space, large editorial-style hero typography, and restrained monochrome UI accented by subtle blue promotional highlights. The design feels polished and conversion-focused, using simple outlined and filled buttons with trust-building logo rows.

### Palette
- Primary: `#1f2530` — charcoal navy
- Secondary: `#2f6fec` — link blue
- Background: `#fefefe` — white
- Surface: `#ffffff` — page white
- Text: `#1f2530` — dark charcoal
- Text muted: `#6b7280` — cool gray
- Border: `#cfd5de` — light gray border

### Typography
- Heading font: Inter (weight 500)
- Body font: Inter (weight 400)
- Base size: 16px
- Note: oversized centered hero heading
- Note: neutral grotesk sans serif
- Note: medium-weight navigation and buttons

### Spacing & Radius
- Spacing base: 8px; scale: 4, 8, 12, 16, 24, 32, 48, 64
- Radius: sm 4px, md 8px, lg 16px, pill 999px
- Shadows: 1 variant(s)
  - `0 1px 2px rgba(15,23,42,0.08)`

### Components
- **button**: Large pill-shaped CTA buttons; primary uses dark charcoal fill with white text, secondary uses white fill with thin dark outline and dark text. Header CTAs mirror the same system with generous horizontal padding.
- **navigation**: Top navigation bar with left-aligned logo, horizontal menu links, and right-aligned actions. Includes a slim announcement bar above with pale blue background and blue text link.
- **card**: No prominent cards in the visible area; content sits directly on the white page with section-based spacing and a logo strip acting as a trust band.

### Layout
top announcement bar + fixed-style horizontal header + centered hero with dual CTAs + trusted-by logo row + next section intro

## Style Spec (HTML)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Style Spec — auto-saas-2026-05-16-3-airtable.png</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
    --color-primary:    #1f2530;
    --color-secondary:  #2f6fec;
    --color-accent:     #1f2530;
    --color-background: #fefefe;
    --color-surface:    #ffffff;
    --color-text:       #1f2530;
    --color-text-muted: #6b7280;
    --color-border:     #cfd5de;
    --color-success:    #22c55e;
    --color-warning:    #f59e0b;
    --color-danger:     #ef4444;
    --font-heading: 'Inter', system-ui, sans-serif;
    --font-body:    'Inter', system-ui, sans-serif;
    --font-mono:    'JetBrains Mono', ui-monospace, monospace;
    --weight-heading: 500;
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
</style>
</head>
<body>
  <div class="header">
    <img src="/knowledge-refs/auto-saas-2026-05-16-3-airtable.png" alt="auto-saas-2026-05-16-3-airtable.png">
    <div class="header__body">
      <div class="kicker">saas</div>
      <h1>auto-saas-2026-05-16-3-airtable.png</h1>
      <p class="muted">A clean enterprise SaaS landing page with expansive white space, large editorial-style hero typography, and restrained monochrome UI accented by subtle blue promotional highlights. The design feels polished and conversion-focused, using simple outlined and filled buttons with trust-building logo rows.</p>
      <div class="tags">
        <span class="tag">minimal</span><span class="tag">clean</span><span class="tag">corporate</span><span class="tag">modern</span><span class="tag">airy</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Palette</h2>
    <div class="palette">
    <div class="swatch">
      <div class="swatch__chip" style="background:#1f2530"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Primary</div>
        <div class="swatch__hex">#1f2530</div>
        <div class="swatch__name">charcoal navy</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#2f6fec"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Secondary</div>
        <div class="swatch__hex">#2f6fec</div>
        <div class="swatch__name">link blue</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#fefefe"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Background</div>
        <div class="swatch__hex">#fefefe</div>
        <div class="swatch__name">white</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#ffffff"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Surface</div>
        <div class="swatch__hex">#ffffff</div>
        <div class="swatch__name">page white</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#1f2530"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text</div>
        <div class="swatch__hex">#1f2530</div>
        <div class="swatch__name">dark charcoal</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#6b7280"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text muted</div>
        <div class="swatch__hex">#6b7280</div>
        <div class="swatch__name">cool gray</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#cfd5de"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Border</div>
        <div class="swatch__hex">#cfd5de</div>
        <div class="swatch__name">light gray border</div>
      </div>
    </div></div>
  </div>

  <div class="section grid-2">
    <div>
      <h2>Typography</h2>
      <div class="type-stack">
        <h3 style="font-size: 2rem;">Heading — Inter 500</h3>
        <h3 style="font-size: 1.4rem;">Subhead — Inter 500</h3>
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

  <div class="section"><h2>Shadows</h2><div class="shadow-card" style="box-shadow:0 1px 2px rgba(15,23,42,0.08)">0 1px 2px rgba(15,23,42,0.08)</div></div>

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
        <div class="component__desc">Large pill-shaped CTA buttons; primary uses dark charcoal fill with white text, secondary uses white fill with thin dark outline and dark text. Header CTAs mirror the same system with generous horizontal padding.</div>
      </div>
      <div class="component">
        <div class="component__name">navigation</div>
        <div class="component__desc">Top navigation bar with left-aligned logo, horizontal menu links, and right-aligned actions. Includes a slim announcement bar above with pale blue background and blue text link.</div>
      </div>
      <div class="component">
        <div class="component__name">card</div>
        <div class="component__desc">No prominent cards in the visible area; content sits directly on the white page with section-based spacing and a logo strip acting as a trust band.</div>
      </div></div>

  <div class="section"><h2>Layout pattern</h2><p>top announcement bar + fixed-style horizontal header + centered hero with dual CTAs + trusted-by logo row + next section intro</p></div>
</body>
</html>
```

