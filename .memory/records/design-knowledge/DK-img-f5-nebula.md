---
{"id":"DK-img-f5-nebula","layer":"L1","kind":"design-knowledge","title":"Style Spec — f5-nebula.png","tags":["industry:fintech-web3","source:vision-distill","image:f5-nebula.png","manual:approved"],"source":"distill","refs":{},"createdAt":1778922863691,"updatedAt":1778922863691,"schemaVersion":1}
---

<!-- style-spec:json
{
  "industry": "fintech-web3",
  "summary": "A dark blockchain landing page with a premium futuristic feel, combining deep navy surfaces, subtle glowing UI panels, and vivid purple call-to-action accents. The composition is spacious and centered, with a strong hero message, minimal top navigation, and a trust-logo strip at the bottom.",
  "vibe": [
    "dark",
    "futuristic",
    "premium",
    "minimal",
    "glowing"
  ],
  "palette": {
    "primary": {
      "hex": "#8f46ff",
      "label": "electric purple"
    },
    "accent": {
      "hex": "#b86cff",
      "label": "soft violet"
    },
    "background": {
      "hex": "#0d0a1f",
      "label": "deep midnight navy"
    },
    "surface": {
      "hex": "#17132b",
      "label": "dark indigo panel"
    },
    "text": {
      "hex": "#f3f1f8",
      "label": "soft white"
    },
    "textMuted": {
      "hex": "#a7a2b8",
      "label": "muted lavender gray"
    },
    "border": {
      "hex": "#2a2344",
      "label": "dim purple border"
    },
    "success": {
      "hex": "#4cc38a",
      "label": "mint green"
    }
  },
  "typography": {
    "headingFont": "Inter",
    "bodyFont": "Inter",
    "headingWeight": 600,
    "bodyWeight": 400,
    "baseSizePx": 16,
    "notes": [
      "large centered hero heading",
      "italic serif-style emphasis on one keyword",
      "small muted navigation text",
      "clean sans-serif body copy"
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
    "0 8px 24px rgba(0,0,0,0.35)",
    "0 0 24px rgba(143,70,255,0.18)"
  ],
  "components": {
    "button": {
      "description": "Primary CTA uses a rounded pill shape with a bright purple gradient fill, white text, compact height, and subtle glow; secondary top-right button is a dark ghost style with thin border and rounded corners."
    },
    "card": {
      "description": "Floating data cards use dark translucent surfaces with soft borders, small white titles, muted labels, and green positive-value highlights; central feature panel appears glassy with faint internal glow and thin outlined compartments."
    },
    "navigation": {
      "description": "Top navigation is a slim horizontal bar with logo on the left, centered text links, and authentication/demo actions on the right; overall treatment is low-contrast and minimal."
    }
  },
  "layout": "centered top navigation + large hero headline and CTA + layered device mockup with floating stat cards + bottom trust-logo strip",
  "imagePath": "/knowledge-refs/f5-nebula.png",
  "imageName": "f5-nebula.png",
  "capturedAt": "2026-05-16T09:14:23.690Z",
  "model": "openai/gpt-5.4-20260305"
}
-->

# Style Spec — f5-nebula.png

## Style Spec (Markdown)

**Industry**: fintech-web3
**Image**: f5-nebula.png
**Vibe**: dark, futuristic, premium, minimal, glowing

**Summary**: A dark blockchain landing page with a premium futuristic feel, combining deep navy surfaces, subtle glowing UI panels, and vivid purple call-to-action accents. The composition is spacious and centered, with a strong hero message, minimal top navigation, and a trust-logo strip at the bottom.

### Palette
- Primary: `#8f46ff` — electric purple
- Accent: `#b86cff` — soft violet
- Background: `#0d0a1f` — deep midnight navy
- Surface: `#17132b` — dark indigo panel
- Text: `#f3f1f8` — soft white
- Text muted: `#a7a2b8` — muted lavender gray
- Border: `#2a2344` — dim purple border
- Success: `#4cc38a` — mint green

### Typography
- Heading font: Inter (weight 600)
- Body font: Inter (weight 400)
- Base size: 16px
- Note: large centered hero heading
- Note: italic serif-style emphasis on one keyword
- Note: small muted navigation text
- Note: clean sans-serif body copy

### Spacing & Radius
- Spacing base: 8px; scale: 4, 8, 12, 16, 24, 32, 48, 64
- Radius: sm 4px, md 8px, lg 16px, pill 999px
- Shadows: 2 variant(s)
  - `0 8px 24px rgba(0,0,0,0.35)`
  - `0 0 24px rgba(143,70,255,0.18)`

### Components
- **button**: Primary CTA uses a rounded pill shape with a bright purple gradient fill, white text, compact height, and subtle glow; secondary top-right button is a dark ghost style with thin border and rounded corners.
- **card**: Floating data cards use dark translucent surfaces with soft borders, small white titles, muted labels, and green positive-value highlights; central feature panel appears glassy with faint internal glow and thin outlined compartments.
- **navigation**: Top navigation is a slim horizontal bar with logo on the left, centered text links, and authentication/demo actions on the right; overall treatment is low-contrast and minimal.

### Layout
centered top navigation + large hero headline and CTA + layered device mockup with floating stat cards + bottom trust-logo strip

## Style Spec (HTML)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Style Spec — f5-nebula.png</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
    --color-primary:    #8f46ff;
    --color-secondary:  #8f46ff;
    --color-accent:     #b86cff;
    --color-background: #0d0a1f;
    --color-surface:    #17132b;
    --color-text:       #f3f1f8;
    --color-text-muted: #a7a2b8;
    --color-border:     #2a2344;
    --color-success:    #4cc38a;
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
</style>
</head>
<body>
  <div class="header">
    <img src="/knowledge-refs/f5-nebula.png" alt="f5-nebula.png">
    <div class="header__body">
      <div class="kicker">fintech-web3</div>
      <h1>f5-nebula.png</h1>
      <p class="muted">A dark blockchain landing page with a premium futuristic feel, combining deep navy surfaces, subtle glowing UI panels, and vivid purple call-to-action accents. The composition is spacious and centered, with a strong hero message, minimal top navigation, and a trust-logo strip at the bottom.</p>
      <div class="tags">
        <span class="tag">dark</span><span class="tag">futuristic</span><span class="tag">premium</span><span class="tag">minimal</span><span class="tag">glowing</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Palette</h2>
    <div class="palette">
    <div class="swatch">
      <div class="swatch__chip" style="background:#8f46ff"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Primary</div>
        <div class="swatch__hex">#8f46ff</div>
        <div class="swatch__name">electric purple</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#b86cff"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Accent</div>
        <div class="swatch__hex">#b86cff</div>
        <div class="swatch__name">soft violet</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#0d0a1f"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Background</div>
        <div class="swatch__hex">#0d0a1f</div>
        <div class="swatch__name">deep midnight navy</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#17132b"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Surface</div>
        <div class="swatch__hex">#17132b</div>
        <div class="swatch__name">dark indigo panel</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f3f1f8"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text</div>
        <div class="swatch__hex">#f3f1f8</div>
        <div class="swatch__name">soft white</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#a7a2b8"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text muted</div>
        <div class="swatch__hex">#a7a2b8</div>
        <div class="swatch__name">muted lavender gray</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#2a2344"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Border</div>
        <div class="swatch__hex">#2a2344</div>
        <div class="swatch__name">dim purple border</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#4cc38a"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Success</div>
        <div class="swatch__hex">#4cc38a</div>
        <div class="swatch__name">mint green</div>
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

  <div class="section"><h2>Shadows</h2><div class="shadow-card" style="box-shadow:0 8px 24px rgba(0,0,0,0.35)">0 8px 24px rgba(0,0,0,0.35)</div><div class="shadow-card" style="box-shadow:0 0 24px rgba(143,70,255,0.18)">0 0 24px rgba(143,70,255,0.18)</div></div>

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
        <div class="component__desc">Primary CTA uses a rounded pill shape with a bright purple gradient fill, white text, compact height, and subtle glow; secondary top-right button is a dark ghost style with thin border and rounded corners.</div>
      </div>
      <div class="component">
        <div class="component__name">card</div>
        <div class="component__desc">Floating data cards use dark translucent surfaces with soft borders, small white titles, muted labels, and green positive-value highlights; central feature panel appears glassy with faint internal glow and thin outlined compartments.</div>
      </div>
      <div class="component">
        <div class="component__name">navigation</div>
        <div class="component__desc">Top navigation is a slim horizontal bar with logo on the left, centered text links, and authentication/demo actions on the right; overall treatment is low-contrast and minimal.</div>
      </div></div>

  <div class="section"><h2>Layout pattern</h2><p>centered top navigation + large hero headline and CTA + layered device mockup with floating stat cards + bottom trust-logo strip</p></div>
</body>
</html>
```

