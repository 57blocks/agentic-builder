---
{"id":"DK-img-auto-saas-2026-05-16-3-airtable","layer":"L1","kind":"design-knowledge","title":"Style Spec — auto-saas-2026-05-16-3-airtable.png","tags":["industry:saas","source:vision-distill","image:auto-saas-2026-05-16-3-airtable.png","manual:approved"],"source":"distill","refs":{},"createdAt":1778924914243,"updatedAt":1779236281850,"schemaVersion":1}
---

<!-- style-spec:json
{
  "industry": "saas",
  "summary": "A clean enterprise SaaS landing page with a bright neutral canvas, restrained dark accents, and generous whitespace. The design emphasizes clarity, trust, and conversion with simple typography, outlined secondary actions, and logo-driven social proof.",
  "vibe": [
    "minimal",
    "clean",
    "corporate",
    "trustworthy",
    "airy"
  ],
  "palette": {
    "primary": {
      "hex": "#111827",
      "label": "deep navy"
    },
    "secondary": {
      "hex": "#d9e4f7",
      "label": "pale blue banner"
    },
    "accent": {
      "hex": "#2563eb",
      "label": "link blue"
    },
    "background": {
      "hex": "#ffffff",
      "label": "white page"
    },
    "surface": {
      "hex": "#f8fafc",
      "label": "soft cool gray"
    },
    "text": {
      "hex": "#1f2937",
      "label": "charcoal text"
    },
    "textMuted": {
      "hex": "#6b7280",
      "label": "muted gray"
    },
    "border": {
      "hex": "#d1d5db",
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
      "large centered hero heading",
      "neutral grotesk sans styling",
      "subdued body copy with medium line height"
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
    "lgPx": 12,
    "pillPx": 999
  },
  "shadows": [
    "0 1px 2px rgba(17,24,39,0.04)"
  ],
  "stateTokens": [
    {
      "component": "button.primary",
      "state": "default",
      "treatment": "solid deep navy fill with white text and subtle borderless appearance"
    },
    {
      "component": "button.primary",
      "state": "hover",
      "treatment": "slightly darker or richer navy fill with preserved white text"
    },
    {
      "component": "button.primary",
      "state": "focus",
      "treatment": "subtle outer ring in pale blue or gray around the rounded button"
    },
    {
      "component": "button.secondary",
      "state": "default",
      "treatment": "white fill with dark text and 1px gray outline"
    },
    {
      "component": "navigation.link",
      "state": "hover",
      "treatment": "text darkens slightly and chevron remains understated"
    }
  ],
  "components": {
    "button": {
      "description": "Rounded rectangular CTA buttons with medium corner radius; primary uses dark navy fill and white text, secondary uses white background with thin gray border and dark text."
    },
    "navigation": {
      "description": "Top horizontal navigation with left-aligned brand, simple text links with small chevrons for dropdown items, and right-aligned utility actions including outlined and filled buttons plus login link."
    },
    "card": {
      "description": "No strong card system is visible; content sits directly on the page with sections separated by whitespace rather than elevated panels."
    }
  },
  "layout": "top promo bar + horizontal header navigation + centered hero + dual CTA row + logo cloud social proof",
  "visualElements": [
    {
      "name": "promo bar",
      "col": 2,
      "row": 1,
      "zoom": 3.2
    },
    {
      "name": "brand nav",
      "col": 1,
      "row": 1,
      "zoom": 2.8
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
      "name": "signup button",
      "col": 3,
      "row": 1,
      "zoom": 3.5
    },
    {
      "name": "logo cloud",
      "col": 2,
      "row": 3,
      "zoom": 2.1
    }
  ],
  "imagePath": "/knowledge-refs/auto-saas-2026-05-16-3-airtable.png",
  "imageName": "auto-saas-2026-05-16-3-airtable.png",
  "capturedAt": "2026-05-20T00:18:01.849Z",
  "model": "openai/gpt-5.4-20260305"
}
-->

# Style Spec — auto-saas-2026-05-16-3-airtable.png

## Style Spec (Markdown)

**Industry**: saas
**Image**: auto-saas-2026-05-16-3-airtable.png
**Vibe**: minimal, clean, corporate, trustworthy, airy

**Summary**: A clean enterprise SaaS landing page with a bright neutral canvas, restrained dark accents, and generous whitespace. The design emphasizes clarity, trust, and conversion with simple typography, outlined secondary actions, and logo-driven social proof.

### Palette
- Primary: `#111827` — deep navy
- Secondary: `#d9e4f7` — pale blue banner
- Accent: `#2563eb` — link blue
- Background: `#ffffff` — white page
- Surface: `#f8fafc` — soft cool gray
- Text: `#1f2937` — charcoal text
- Text muted: `#6b7280` — muted gray
- Border: `#d1d5db` — light gray border

### Typography
- Heading font: Inter (weight 500)
- Body font: Inter (weight 400)
- Base size: 16px
- Note: large centered hero heading
- Note: neutral grotesk sans styling
- Note: subdued body copy with medium line height

### Spacing & Radius
- Spacing base: 8px; scale: 4, 8, 12, 16, 24, 32, 48, 64
- Radius: sm 4px, md 8px, lg 12px, pill 999px
- Shadows: 1 variant(s)
  - `0 1px 2px rgba(17,24,39,0.04)`

### Interaction State Tokens
- **button.primary.default**: solid deep navy fill with white text and subtle borderless appearance
- **button.primary.hover**: slightly darker or richer navy fill with preserved white text
- **button.primary.focus**: subtle outer ring in pale blue or gray around the rounded button
- **button.secondary.default**: white fill with dark text and 1px gray outline
- **navigation.link.hover**: text darkens slightly and chevron remains understated

### Components
- **button**: Rounded rectangular CTA buttons with medium corner radius; primary uses dark navy fill and white text, secondary uses white background with thin gray border and dark text.
- **navigation**: Top horizontal navigation with left-aligned brand, simple text links with small chevrons for dropdown items, and right-aligned utility actions including outlined and filled buttons plus login link.
- **card**: No strong card system is visible; content sits directly on the page with sections separated by whitespace rather than elevated panels.

### Layout
top promo bar + horizontal header navigation + centered hero + dual CTA row + logo cloud social proof

### UI Elements
Named UI regions identified in the reference screenshot (col/row = 3×3 grid):
- **promo bar** — col 2, row 1, zoom 3.2×
- **brand nav** — col 1, row 1, zoom 2.8×
- **hero headline** — col 2, row 1, zoom 2.2×
- **primary CTA** — col 2, row 2, zoom 4×
- **signup button** — col 3, row 1, zoom 3.5×
- **logo cloud** — col 2, row 3, zoom 2.1×

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
    --color-primary:    #111827;
    --color-secondary:  #d9e4f7;
    --color-accent:     #2563eb;
    --color-background: #ffffff;
    --color-surface:    #f8fafc;
    --color-text:       #1f2937;
    --color-text-muted: #6b7280;
    --color-border:     #d1d5db;
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
    --radius-lg: 12px;
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
    <img src="/knowledge-refs/auto-saas-2026-05-16-3-airtable.png" alt="auto-saas-2026-05-16-3-airtable.png">
    <div class="header__body">
      <div class="kicker">saas</div>
      <h1>auto-saas-2026-05-16-3-airtable.png</h1>
      <p class="muted">A clean enterprise SaaS landing page with a bright neutral canvas, restrained dark accents, and generous whitespace. The design emphasizes clarity, trust, and conversion with simple typography, outlined secondary actions, and logo-driven social proof.</p>
      <div class="tags">
        <span class="tag">minimal</span><span class="tag">clean</span><span class="tag">corporate</span><span class="tag">trustworthy</span><span class="tag">airy</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Palette</h2>
    <div class="palette">
    <div class="swatch">
      <div class="swatch__chip" style="background:#111827"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Primary</div>
        <div class="swatch__hex">#111827</div>
        <div class="swatch__name">deep navy</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#d9e4f7"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Secondary</div>
        <div class="swatch__hex">#d9e4f7</div>
        <div class="swatch__name">pale blue banner</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#2563eb"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Accent</div>
        <div class="swatch__hex">#2563eb</div>
        <div class="swatch__name">link blue</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#ffffff"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Background</div>
        <div class="swatch__hex">#ffffff</div>
        <div class="swatch__name">white page</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f8fafc"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Surface</div>
        <div class="swatch__hex">#f8fafc</div>
        <div class="swatch__name">soft cool gray</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#1f2937"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text</div>
        <div class="swatch__hex">#1f2937</div>
        <div class="swatch__name">charcoal text</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#6b7280"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text muted</div>
        <div class="swatch__hex">#6b7280</div>
        <div class="swatch__name">muted gray</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#d1d5db"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Border</div>
        <div class="swatch__hex">#d1d5db</div>
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

  <div class="section"><h2>Shadows</h2><div class="shadow-card" style="box-shadow:0 1px 2px rgba(17,24,39,0.04)">0 1px 2px rgba(17,24,39,0.04)</div></div>

  

  

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
        <td>solid deep navy fill with white text and subtle borderless appearance</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-hover">hover</span></td>
        <td>slightly darker or richer navy fill with preserved white text</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-focus">focus</span></td>
        <td>subtle outer ring in pale blue or gray around the rounded button</td>
      </tr>
      <tr>
        <td>button.secondary</td>
        <td><span class="state-pill state-default">default</span></td>
        <td>white fill with dark text and 1px gray outline</td>
      </tr>
      <tr>
        <td>navigation.link</td>
        <td><span class="state-pill state-hover">hover</span></td>
        <td>text darkens slightly and chevron remains understated</td>
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
            src="/knowledge-refs/auto-saas-2026-05-16-3-airtable.png"
            alt="promo bar"
            style="--ox:50%;--oy:0%;--zoom:3.2;"
            draggable="false"
          />
        </div>
        <figcaption>promo bar</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/auto-saas-2026-05-16-3-airtable.png"
            alt="brand nav"
            style="--ox:0%;--oy:0%;--zoom:2.8;"
            draggable="false"
          />
        </div>
        <figcaption>brand nav</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/auto-saas-2026-05-16-3-airtable.png"
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
            src="/knowledge-refs/auto-saas-2026-05-16-3-airtable.png"
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
            src="/knowledge-refs/auto-saas-2026-05-16-3-airtable.png"
            alt="signup button"
            style="--ox:100%;--oy:0%;--zoom:3.5;"
            draggable="false"
          />
        </div>
        <figcaption>signup button</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/auto-saas-2026-05-16-3-airtable.png"
            alt="logo cloud"
            style="--ox:50%;--oy:100%;--zoom:2.1;"
            draggable="false"
          />
        </div>
        <figcaption>logo cloud</figcaption>
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
        <p class="muted">Surface card on background, 12px radius, using primary as accent.</p>
        <button class="btn btn-primary" style="margin-top:8px;">Action</button>
      </div>
    </div>
  </div>

  <div class="section"><h2>Component Notes</h2>
      <div class="component">
        <div class="component__name">button</div>
        <div class="component__desc">Rounded rectangular CTA buttons with medium corner radius; primary uses dark navy fill and white text, secondary uses white background with thin gray border and dark text.</div>
      </div>
      <div class="component">
        <div class="component__name">navigation</div>
        <div class="component__desc">Top horizontal navigation with left-aligned brand, simple text links with small chevrons for dropdown items, and right-aligned utility actions including outlined and filled buttons plus login link.</div>
      </div>
      <div class="component">
        <div class="component__name">card</div>
        <div class="component__desc">No strong card system is visible; content sits directly on the page with sections separated by whitespace rather than elevated panels.</div>
      </div></div>

  <div class="section"><h2>Layout pattern</h2><p>top promo bar + horizontal header navigation + centered hero + dual CTA row + logo cloud social proof</p></div>
</body>
</html>
```

