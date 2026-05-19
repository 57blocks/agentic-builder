---
{"id":"DK-img-auto-ai-2026-05-16-1-chatgpt","layer":"L1","kind":"design-knowledge","title":"Trend Capture — ChatGPT (ai)","tags":["industry:ai","source:trend-capture","image:auto-ai-2026-05-16-1-chatgpt.png","site:openai.com","url:https://www.openai.com/chatgpt","captured:2026-05-16","manual:approved"],"source":"distill","refs":{},"createdAt":1778926016077,"updatedAt":1778926016077,"schemaVersion":1}
---

<!-- style-spec:json
{
  "industry": "ai",
  "summary": "A clean, highly minimal AI chat interface with a bright neutral canvas, soft outlines, and restrained monochrome styling. The layout emphasizes spaciousness, rounded controls, and a centered conversational input experience.",
  "vibe": [
    "minimal",
    "clean",
    "airy",
    "neutral",
    "friendly"
  ],
  "palette": {
    "primary": {
      "hex": "#1f1f1f",
      "label": "charcoal"
    },
    "secondary": {
      "hex": "#ececec",
      "label": "light gray"
    },
    "background": {
      "hex": "#ffffff",
      "label": "white"
    },
    "surface": {
      "hex": "#f9f9f9",
      "label": "off-white"
    },
    "text": {
      "hex": "#1f1f1f",
      "label": "near-black"
    },
    "textMuted": {
      "hex": "#8f8f8f",
      "label": "muted gray"
    },
    "border": {
      "hex": "#d9d9d9",
      "label": "soft gray"
    }
  },
  "typography": {
    "headingFont": "Inter",
    "bodyFont": "Inter",
    "headingWeight": 500,
    "bodyWeight": 400,
    "baseSizePx": 16,
    "notes": [
      "large centered prompt headline",
      "lightweight UI labels",
      "minimal typographic hierarchy"
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
    "0 4px 16px rgba(0,0,0,0.06)"
  ],
  "components": {
    "button": {
      "description": "Rounded pill buttons with thin gray borders or solid dark fill; minimal labels and generous horizontal padding."
    },
    "card": {
      "description": "Sidebar panels and highlighted nav rows use very subtle tonal fills with little to no visible shadow, relying on spacing and borders for separation."
    },
    "input": {
      "description": "Large centered pill-shaped chat input with soft gray outline, muted placeholder text, leading add icon, and embedded rounded action chips on the right."
    },
    "navigation": {
      "description": "Fixed left sidebar with icon-plus-label navigation, soft active state background, utility links at the bottom, and a simple top bar brand/title area."
    }
  },
  "layout": "fixed left sidebar + top header + centered hero prompt + large pill input + footer legal text",
  "visualElements": [
    {
      "name": "sidebar nav",
      "col": 1,
      "row": 1,
      "zoom": 2.5
    },
    {
      "name": "brand header",
      "col": 2,
      "row": 1,
      "zoom": 3
    },
    {
      "name": "auth buttons",
      "col": 3,
      "row": 1,
      "zoom": 3.5
    },
    {
      "name": "hero headline",
      "col": 2,
      "row": 2,
      "zoom": 2.5
    },
    {
      "name": "chat input",
      "col": 2,
      "row": 2,
      "zoom": 2
    },
    {
      "name": "footer note",
      "col": 2,
      "row": 3,
      "zoom": 3.5
    }
  ],
  "imagePath": "/knowledge-refs/auto-ai-2026-05-16-1-chatgpt.png",
  "imageName": "auto-ai-2026-05-16-1-chatgpt.png",
  "capturedAt": "2026-05-16T10:06:56.075Z",
  "model": "openai/gpt-5.4-20260305"
}
-->

# Style Spec — auto-ai-2026-05-16-1-chatgpt.png

## Style Spec (Markdown)

**Industry**: ai
**Image**: auto-ai-2026-05-16-1-chatgpt.png
**Vibe**: minimal, clean, airy, neutral, friendly

**Summary**: A clean, highly minimal AI chat interface with a bright neutral canvas, soft outlines, and restrained monochrome styling. The layout emphasizes spaciousness, rounded controls, and a centered conversational input experience.

### Palette
- Primary: `#1f1f1f` — charcoal
- Secondary: `#ececec` — light gray
- Background: `#ffffff` — white
- Surface: `#f9f9f9` — off-white
- Text: `#1f1f1f` — near-black
- Text muted: `#8f8f8f` — muted gray
- Border: `#d9d9d9` — soft gray

### Typography
- Heading font: Inter (weight 500)
- Body font: Inter (weight 400)
- Base size: 16px
- Note: large centered prompt headline
- Note: lightweight UI labels
- Note: minimal typographic hierarchy

### Spacing & Radius
- Spacing base: 8px; scale: 4, 8, 12, 16, 24, 32, 48, 64
- Radius: sm 4px, md 8px, lg 16px, pill 999px
- Shadows: 2 variant(s)
  - `0 1px 2px rgba(0,0,0,0.04)`
  - `0 4px 16px rgba(0,0,0,0.06)`

### Components
- **button**: Rounded pill buttons with thin gray borders or solid dark fill; minimal labels and generous horizontal padding.
- **card**: Sidebar panels and highlighted nav rows use very subtle tonal fills with little to no visible shadow, relying on spacing and borders for separation.
- **input**: Large centered pill-shaped chat input with soft gray outline, muted placeholder text, leading add icon, and embedded rounded action chips on the right.
- **navigation**: Fixed left sidebar with icon-plus-label navigation, soft active state background, utility links at the bottom, and a simple top bar brand/title area.

### Layout
fixed left sidebar + top header + centered hero prompt + large pill input + footer legal text

### UI Elements
Named UI regions identified in the reference screenshot (col/row = 3×3 grid):
- **sidebar nav** — col 1, row 1, zoom 2.5×
- **brand header** — col 2, row 1, zoom 3×
- **auth buttons** — col 3, row 1, zoom 3.5×
- **hero headline** — col 2, row 2, zoom 2.5×
- **chat input** — col 2, row 2, zoom 2×
- **footer note** — col 2, row 3, zoom 3.5×

## Style Spec (HTML)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Style Spec — auto-ai-2026-05-16-1-chatgpt.png</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
    --color-primary:    #1f1f1f;
    --color-secondary:  #ececec;
    --color-accent:     #1f1f1f;
    --color-background: #ffffff;
    --color-surface:    #f9f9f9;
    --color-text:       #1f1f1f;
    --color-text-muted: #8f8f8f;
    --color-border:     #d9d9d9;
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
    <img src="/knowledge-refs/auto-ai-2026-05-16-1-chatgpt.png" alt="auto-ai-2026-05-16-1-chatgpt.png">
    <div class="header__body">
      <div class="kicker">ai</div>
      <h1>auto-ai-2026-05-16-1-chatgpt.png</h1>
      <p class="muted">A clean, highly minimal AI chat interface with a bright neutral canvas, soft outlines, and restrained monochrome styling. The layout emphasizes spaciousness, rounded controls, and a centered conversational input experience.</p>
      <div class="tags">
        <span class="tag">minimal</span><span class="tag">clean</span><span class="tag">airy</span><span class="tag">neutral</span><span class="tag">friendly</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Palette</h2>
    <div class="palette">
    <div class="swatch">
      <div class="swatch__chip" style="background:#1f1f1f"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Primary</div>
        <div class="swatch__hex">#1f1f1f</div>
        <div class="swatch__name">charcoal</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#ececec"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Secondary</div>
        <div class="swatch__hex">#ececec</div>
        <div class="swatch__name">light gray</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#ffffff"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Background</div>
        <div class="swatch__hex">#ffffff</div>
        <div class="swatch__name">white</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f9f9f9"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Surface</div>
        <div class="swatch__hex">#f9f9f9</div>
        <div class="swatch__name">off-white</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#1f1f1f"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text</div>
        <div class="swatch__hex">#1f1f1f</div>
        <div class="swatch__name">near-black</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#8f8f8f"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text muted</div>
        <div class="swatch__hex">#8f8f8f</div>
        <div class="swatch__name">muted gray</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#d9d9d9"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Border</div>
        <div class="swatch__hex">#d9d9d9</div>
        <div class="swatch__name">soft gray</div>
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

  <div class="section"><h2>Shadows</h2><div class="shadow-card" style="box-shadow:0 1px 2px rgba(0,0,0,0.04)">0 1px 2px rgba(0,0,0,0.04)</div><div class="shadow-card" style="box-shadow:0 4px 16px rgba(0,0,0,0.06)">0 4px 16px rgba(0,0,0,0.06)</div></div>

  <div class="section">
    <h2>UI Element Details</h2>
    <p class="muted" style="margin-top:-4px;font-size:13px;">CSS-zoomed crops of the reference screenshot — each tile zooms into an identified element region.</p>
    <div class="crop-grid">
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/auto-ai-2026-05-16-1-chatgpt.png"
            alt="sidebar nav"
            style="--ox:0%;--oy:0%;--zoom:2.5;"
            draggable="false"
          />
        </div>
        <figcaption>sidebar nav</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/auto-ai-2026-05-16-1-chatgpt.png"
            alt="brand header"
            style="--ox:50%;--oy:0%;--zoom:3;"
            draggable="false"
          />
        </div>
        <figcaption>brand header</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/auto-ai-2026-05-16-1-chatgpt.png"
            alt="auth buttons"
            style="--ox:100%;--oy:0%;--zoom:3.5;"
            draggable="false"
          />
        </div>
        <figcaption>auth buttons</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/auto-ai-2026-05-16-1-chatgpt.png"
            alt="hero headline"
            style="--ox:50%;--oy:50%;--zoom:2.5;"
            draggable="false"
          />
        </div>
        <figcaption>hero headline</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/auto-ai-2026-05-16-1-chatgpt.png"
            alt="chat input"
            style="--ox:50%;--oy:50%;--zoom:2;"
            draggable="false"
          />
        </div>
        <figcaption>chat input</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/auto-ai-2026-05-16-1-chatgpt.png"
            alt="footer note"
            style="--ox:50%;--oy:100%;--zoom:3.5;"
            draggable="false"
          />
        </div>
        <figcaption>footer note</figcaption>
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
        <div class="component__desc">Rounded pill buttons with thin gray borders or solid dark fill; minimal labels and generous horizontal padding.</div>
      </div>
      <div class="component">
        <div class="component__name">card</div>
        <div class="component__desc">Sidebar panels and highlighted nav rows use very subtle tonal fills with little to no visible shadow, relying on spacing and borders for separation.</div>
      </div>
      <div class="component">
        <div class="component__name">input</div>
        <div class="component__desc">Large centered pill-shaped chat input with soft gray outline, muted placeholder text, leading add icon, and embedded rounded action chips on the right.</div>
      </div>
      <div class="component">
        <div class="component__name">navigation</div>
        <div class="component__desc">Fixed left sidebar with icon-plus-label navigation, soft active state background, utility links at the bottom, and a simple top bar brand/title area.</div>
      </div></div>

  <div class="section"><h2>Layout pattern</h2><p>fixed left sidebar + top header + centered hero prompt + large pill input + footer legal text</p></div>
</body>
</html>
```

