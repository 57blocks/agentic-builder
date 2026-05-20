---
{"id":"DK-img-auto-ai-2026-05-16-2-claude-ai","layer":"L1","kind":"design-knowledge","title":"Style Spec — auto-ai-2026-05-16-2-claude-ai.png","tags":["industry:ai","source:vision-distill","image:auto-ai-2026-05-16-2-claude-ai.png","manual:approved"],"source":"distill","refs":{},"createdAt":1778926042687,"updatedAt":1779236031795,"schemaVersion":1}
---

<!-- style-spec:json
{
  "industry": "ai",
  "summary": "A calm, editorial landing page with generous whitespace, soft neutrals, and restrained product UI framing. The aesthetic balances premium serif typography with minimal form controls and subtle utility-card surfaces.",
  "vibe": [
    "minimal",
    "editorial",
    "soft",
    "premium",
    "clean"
  ],
  "palette": {
    "primary": {
      "hex": "#d06f47",
      "label": "warm brand orange"
    },
    "secondary": {
      "hex": "#1a73e8",
      "label": "google blue"
    },
    "accent": {
      "hex": "#111111",
      "label": "near-black CTA"
    },
    "background": {
      "hex": "#f7f5f2",
      "label": "warm off-white"
    },
    "surface": {
      "hex": "#fcfbf9",
      "label": "light panel"
    },
    "text": {
      "hex": "#1f1a17",
      "label": "deep charcoal"
    },
    "textMuted": {
      "hex": "#6f6963",
      "label": "muted taupe gray"
    },
    "border": {
      "hex": "#d9d3cb",
      "label": "soft warm border"
    }
  },
  "typography": {
    "headingFont": "Georgia",
    "bodyFont": "Inter",
    "headingWeight": 400,
    "bodyWeight": 400,
    "baseSizePx": 16,
    "notes": [
      "large serif hero headline",
      "lightweight sans-serif UI copy",
      "mixed editorial and product typography"
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
    "lgPx": 24,
    "pillPx": 999
  },
  "shadows": [
    "0 1px 2px rgba(31,26,23,0.04)",
    "0 4px 16px rgba(31,26,23,0.08)"
  ],
  "surfaceEffects": [
    {
      "name": "soft card elevation",
      "description": "panels use warm white fills, faint outlines, and subtle shadow for a low-contrast premium look",
      "cssHints": [
        "background: #fcfbf9",
        "border: 1px solid #d9d3cb",
        "box-shadow: 0 4px 16px rgba(31,26,23,0.08)"
      ]
    },
    {
      "name": "grid canvas",
      "description": "the right-side product preview sits on a faint square grid over the page background",
      "cssHints": [
        "background-color: #f7f5f2",
        "background-image: linear-gradient(rgba(31,26,23,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(31,26,23,0.06) 1px, transparent 1px)",
        "background-size: 31px 31px"
      ]
    }
  ],
  "stateTokens": [
    {
      "component": "button.primary",
      "state": "default",
      "treatment": "solid near-black fill with white text and rounded medium corners"
    },
    {
      "component": "button.primary",
      "state": "hover",
      "treatment": "slightly lighter black fill with stronger shadow and preserved white text"
    },
    {
      "component": "button.primary",
      "state": "focus",
      "treatment": "thin dark focus ring or outer outline around the button"
    },
    {
      "component": "input",
      "state": "focus",
      "treatment": "light surface field gains darker border for subtle emphasis"
    }
  ],
  "components": {
    "button": {
      "description": "Buttons are simple rounded rectangles with thin borders or solid fills; primary actions use near-black or warm orange fills with white text, while secondary actions are light surfaces with muted borders."
    },
    "card": {
      "description": "Cards are large, softly rounded white panels with warm gray outlines, light shadows, and generous internal padding."
    },
    "input": {
      "description": "Inputs are full-width rounded fields with pale fill, thin warm-gray border, muted placeholder text, and low visual noise."
    },
    "navigation": {
      "description": "Top navigation is a minimal horizontal bar with small sans-serif links, subtle dropdown chevrons, and a left-aligned wordmark."
    }
  },
  "layout": "top navigation with left editorial hero and sign-in form, paired with a right-side product preview canvas and floating auth modal",
  "visualElements": [
    {
      "name": "brand wordmark",
      "col": 1,
      "row": 1,
      "zoom": 4
    },
    {
      "name": "top navigation",
      "col": 2,
      "row": 1,
      "zoom": 3
    },
    {
      "name": "hero headline",
      "col": 1,
      "row": 1,
      "zoom": 2.4
    },
    {
      "name": "sign-in card",
      "col": 1,
      "row": 2,
      "zoom": 2.2
    },
    {
      "name": "product canvas",
      "col": 3,
      "row": 2,
      "zoom": 2.1
    },
    {
      "name": "google modal",
      "col": 3,
      "row": 1,
      "zoom": 2.8
    }
  ],
  "imagePath": "/knowledge-refs/auto-ai-2026-05-16-2-claude-ai.png",
  "imageName": "auto-ai-2026-05-16-2-claude-ai.png",
  "capturedAt": "2026-05-20T00:13:51.794Z",
  "model": "openai/gpt-5.4-20260305"
}
-->

# Style Spec — auto-ai-2026-05-16-2-claude-ai.png

## Style Spec (Markdown)

**Industry**: ai
**Image**: auto-ai-2026-05-16-2-claude-ai.png
**Vibe**: minimal, editorial, soft, premium, clean

**Summary**: A calm, editorial landing page with generous whitespace, soft neutrals, and restrained product UI framing. The aesthetic balances premium serif typography with minimal form controls and subtle utility-card surfaces.

### Palette
- Primary: `#d06f47` — warm brand orange
- Secondary: `#1a73e8` — google blue
- Accent: `#111111` — near-black CTA
- Background: `#f7f5f2` — warm off-white
- Surface: `#fcfbf9` — light panel
- Text: `#1f1a17` — deep charcoal
- Text muted: `#6f6963` — muted taupe gray
- Border: `#d9d3cb` — soft warm border

### Typography
- Heading font: Georgia (weight 400)
- Body font: Inter (weight 400)
- Base size: 16px
- Note: large serif hero headline
- Note: lightweight sans-serif UI copy
- Note: mixed editorial and product typography

### Spacing & Radius
- Spacing base: 8px; scale: 4, 8, 12, 16, 24, 32, 48, 64
- Radius: sm 6px, md 12px, lg 24px, pill 999px
- Shadows: 2 variant(s)
  - `0 1px 2px rgba(31,26,23,0.04)`
  - `0 4px 16px rgba(31,26,23,0.08)`

### Surface Effects
- **soft card elevation**: panels use warm white fills, faint outlines, and subtle shadow for a low-contrast premium look
  - `background: #fcfbf9`
  - `border: 1px solid #d9d3cb`
  - `box-shadow: 0 4px 16px rgba(31,26,23,0.08)`
- **grid canvas**: the right-side product preview sits on a faint square grid over the page background
  - `background-color: #f7f5f2`
  - `background-image: linear-gradient(rgba(31,26,23,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(31,26,23,0.06) 1px, transparent 1px)`
  - `background-size: 31px 31px`

### Interaction State Tokens
- **button.primary.default**: solid near-black fill with white text and rounded medium corners
- **button.primary.hover**: slightly lighter black fill with stronger shadow and preserved white text
- **button.primary.focus**: thin dark focus ring or outer outline around the button
- **input.focus**: light surface field gains darker border for subtle emphasis

### Components
- **button**: Buttons are simple rounded rectangles with thin borders or solid fills; primary actions use near-black or warm orange fills with white text, while secondary actions are light surfaces with muted borders.
- **card**: Cards are large, softly rounded white panels with warm gray outlines, light shadows, and generous internal padding.
- **input**: Inputs are full-width rounded fields with pale fill, thin warm-gray border, muted placeholder text, and low visual noise.
- **navigation**: Top navigation is a minimal horizontal bar with small sans-serif links, subtle dropdown chevrons, and a left-aligned wordmark.

### Layout
top navigation with left editorial hero and sign-in form, paired with a right-side product preview canvas and floating auth modal

### UI Elements
Named UI regions identified in the reference screenshot (col/row = 3×3 grid):
- **brand wordmark** — col 1, row 1, zoom 4×
- **top navigation** — col 2, row 1, zoom 3×
- **hero headline** — col 1, row 1, zoom 2.4×
- **sign-in card** — col 1, row 2, zoom 2.2×
- **product canvas** — col 3, row 2, zoom 2.1×
- **google modal** — col 3, row 1, zoom 2.8×

## Style Spec (HTML)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Style Spec — auto-ai-2026-05-16-2-claude-ai.png</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Georgia:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
    --color-primary:    #d06f47;
    --color-secondary:  #1a73e8;
    --color-accent:     #111111;
    --color-background: #f7f5f2;
    --color-surface:    #fcfbf9;
    --color-text:       #1f1a17;
    --color-text-muted: #6f6963;
    --color-border:     #d9d3cb;
    --color-success:    #22c55e;
    --color-warning:    #f59e0b;
    --color-danger:     #ef4444;
    --font-heading: 'Georgia', system-ui, sans-serif;
    --font-body:    'Inter', system-ui, sans-serif;
    --font-mono:    'JetBrains Mono', ui-monospace, monospace;
    --weight-heading: 400;
    --weight-body:    400;
    --size-base:      16px;
    --radius-sm: 6px;
    --radius-md: 12px;
    --radius-lg: 24px;
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
    <img src="/knowledge-refs/auto-ai-2026-05-16-2-claude-ai.png" alt="auto-ai-2026-05-16-2-claude-ai.png">
    <div class="header__body">
      <div class="kicker">ai</div>
      <h1>auto-ai-2026-05-16-2-claude-ai.png</h1>
      <p class="muted">A calm, editorial landing page with generous whitespace, soft neutrals, and restrained product UI framing. The aesthetic balances premium serif typography with minimal form controls and subtle utility-card surfaces.</p>
      <div class="tags">
        <span class="tag">minimal</span><span class="tag">editorial</span><span class="tag">soft</span><span class="tag">premium</span><span class="tag">clean</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Palette</h2>
    <div class="palette">
    <div class="swatch">
      <div class="swatch__chip" style="background:#d06f47"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Primary</div>
        <div class="swatch__hex">#d06f47</div>
        <div class="swatch__name">warm brand orange</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#1a73e8"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Secondary</div>
        <div class="swatch__hex">#1a73e8</div>
        <div class="swatch__name">google blue</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#111111"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Accent</div>
        <div class="swatch__hex">#111111</div>
        <div class="swatch__name">near-black CTA</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f7f5f2"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Background</div>
        <div class="swatch__hex">#f7f5f2</div>
        <div class="swatch__name">warm off-white</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#fcfbf9"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Surface</div>
        <div class="swatch__hex">#fcfbf9</div>
        <div class="swatch__name">light panel</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#1f1a17"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text</div>
        <div class="swatch__hex">#1f1a17</div>
        <div class="swatch__name">deep charcoal</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#6f6963"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text muted</div>
        <div class="swatch__hex">#6f6963</div>
        <div class="swatch__name">muted taupe gray</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#d9d3cb"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Border</div>
        <div class="swatch__hex">#d9d3cb</div>
        <div class="swatch__name">soft warm border</div>
      </div>
    </div></div>
  </div>

  <div class="section grid-2">
    <div>
      <h2>Typography</h2>
      <div class="type-stack">
        <h3 style="font-size: 2rem;">Heading — Georgia 400</h3>
        <h3 style="font-size: 1.4rem;">Subhead — Georgia 400</h3>
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

  <div class="section"><h2>Shadows</h2><div class="shadow-card" style="box-shadow:0 1px 2px rgba(31,26,23,0.04)">0 1px 2px rgba(31,26,23,0.04)</div><div class="shadow-card" style="box-shadow:0 4px 16px rgba(31,26,23,0.08)">0 4px 16px rgba(31,26,23,0.08)</div></div>

  

  <div class="section">
    <h2>Surface Effects</h2>
    <div class="signal-grid">
      <article class="signal-card">
        <div class="signal-title">soft card elevation</div>
        <div class="signal-meta">panels use warm white fills, faint outlines, and subtle shadow for a low-contrast premium look</div>
        <div class="signal-code">background: #fcfbf9<br/>border: 1px solid #d9d3cb<br/>box-shadow: 0 4px 16px rgba(31,26,23,0.08)</div>
      </article>
      <article class="signal-card">
        <div class="signal-title">grid canvas</div>
        <div class="signal-meta">the right-side product preview sits on a faint square grid over the page background</div>
        <div class="signal-code">background-color: #f7f5f2<br/>background-image: linear-gradient(rgba(31,26,23,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(31,26,23,0.06) 1px, transparent 1px)<br/>background-size: 31px 31px</div>
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
        <td>solid near-black fill with white text and rounded medium corners</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-hover">hover</span></td>
        <td>slightly lighter black fill with stronger shadow and preserved white text</td>
      </tr>
      <tr>
        <td>button.primary</td>
        <td><span class="state-pill state-focus">focus</span></td>
        <td>thin dark focus ring or outer outline around the button</td>
      </tr>
      <tr>
        <td>input</td>
        <td><span class="state-pill state-focus">focus</span></td>
        <td>light surface field gains darker border for subtle emphasis</td>
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
            src="/knowledge-refs/auto-ai-2026-05-16-2-claude-ai.png"
            alt="brand wordmark"
            style="--ox:0%;--oy:0%;--zoom:4;"
            draggable="false"
          />
        </div>
        <figcaption>brand wordmark</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/auto-ai-2026-05-16-2-claude-ai.png"
            alt="top navigation"
            style="--ox:50%;--oy:0%;--zoom:3;"
            draggable="false"
          />
        </div>
        <figcaption>top navigation</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/auto-ai-2026-05-16-2-claude-ai.png"
            alt="hero headline"
            style="--ox:0%;--oy:0%;--zoom:2.4;"
            draggable="false"
          />
        </div>
        <figcaption>hero headline</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/auto-ai-2026-05-16-2-claude-ai.png"
            alt="sign-in card"
            style="--ox:0%;--oy:50%;--zoom:2.2;"
            draggable="false"
          />
        </div>
        <figcaption>sign-in card</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/auto-ai-2026-05-16-2-claude-ai.png"
            alt="product canvas"
            style="--ox:100%;--oy:50%;--zoom:2.1;"
            draggable="false"
          />
        </div>
        <figcaption>product canvas</figcaption>
      </figure>
      <figure class="crop-tile">
        <div class="crop-tile__viewport">
          <img
            src="/knowledge-refs/auto-ai-2026-05-16-2-claude-ai.png"
            alt="google modal"
            style="--ox:100%;--oy:0%;--zoom:2.8;"
            draggable="false"
          />
        </div>
        <figcaption>google modal</figcaption>
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
        <p class="muted">Surface card on background, 24px radius, using primary as accent.</p>
        <button class="btn btn-primary" style="margin-top:8px;">Action</button>
      </div>
    </div>
  </div>

  <div class="section"><h2>Component Notes</h2>
      <div class="component">
        <div class="component__name">button</div>
        <div class="component__desc">Buttons are simple rounded rectangles with thin borders or solid fills; primary actions use near-black or warm orange fills with white text, while secondary actions are light surfaces with muted borders.</div>
      </div>
      <div class="component">
        <div class="component__name">card</div>
        <div class="component__desc">Cards are large, softly rounded white panels with warm gray outlines, light shadows, and generous internal padding.</div>
      </div>
      <div class="component">
        <div class="component__name">input</div>
        <div class="component__desc">Inputs are full-width rounded fields with pale fill, thin warm-gray border, muted placeholder text, and low visual noise.</div>
      </div>
      <div class="component">
        <div class="component__name">navigation</div>
        <div class="component__desc">Top navigation is a minimal horizontal bar with small sans-serif links, subtle dropdown chevrons, and a left-aligned wordmark.</div>
      </div></div>

  <div class="section"><h2>Layout pattern</h2><p>top navigation with left editorial hero and sign-in form, paired with a right-side product preview canvas and floating auth modal</p></div>
</body>
</html>
```

