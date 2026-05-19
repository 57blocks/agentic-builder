---
{"id":"DK-img-ai-3-chat","layer":"L1","kind":"design-knowledge","title":"Style Spec — ai-3-chat.png","tags":["industry:ai","source:vision-distill","image:ai-3-chat.png","manual:approved"],"source":"distill","refs":{},"createdAt":1778922758186,"updatedAt":1778922758186,"schemaVersion":1}
---

<!-- style-spec:json
{
  "industry": "ai",
  "summary": "A soft, premium AI landing page with an airy light background, glowing warm gradients, and elegant dark call-to-action elements. The aesthetic blends minimal typography with fluid abstract wave visuals for a futuristic yet approachable feel.",
  "vibe": [
    "minimal",
    "ethereal",
    "futuristic",
    "premium",
    "soft"
  ],
  "palette": {
    "primary": {
      "hex": "#2f2c2a",
      "label": "charcoal"
    },
    "secondary": {
      "hex": "#f4b25c",
      "label": "warm amber"
    },
    "accent": {
      "hex": "#e9724d",
      "label": "sunset orange"
    },
    "background": {
      "hex": "#f3efee",
      "label": "warm mist"
    },
    "surface": {
      "hex": "#f8f4f1",
      "label": "soft ivory"
    },
    "text": {
      "hex": "#1f1a17",
      "label": "near-black"
    },
    "textMuted": {
      "hex": "#7f6f68",
      "label": "muted taupe"
    },
    "border": {
      "hex": "#d9c8bf",
      "label": "warm beige"
    },
    "warning": {
      "hex": "#f1c96a",
      "label": "golden glow"
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
      "lightweight sans serif navigation",
      "muted supporting copy",
      "italic emphasis in headline"
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
    "0 2px 6px rgba(0,0,0,0.10)",
    "0 12px 30px rgba(0,0,0,0.18)"
  ],
  "components": {
    "button": {
      "description": "Primary buttons use a dark charcoal pill shape with subtle gradient, soft outer shadow, white label text, and a small leading icon; secondary actions appear as low-emphasis text links."
    },
    "card": {
      "description": "No explicit cards are visible; the design relies on open space, soft atmospheric gradients, and layered wave forms instead of boxed containers."
    },
    "navigation": {
      "description": "Top navigation is a minimal centered text nav with small rounded text chips and a dark pill CTA aligned to the top right; brand mark and wordmark sit on the top left."
    }
  },
  "layout": "top navbar + centered hero content + dual CTA row + large abstract wave illustration + trusted-by logo strip",
  "imagePath": "/knowledge-refs/ai-3-chat.png",
  "imageName": "ai-3-chat.png",
  "capturedAt": "2026-05-16T09:12:38.185Z",
  "model": "openai/gpt-5.4-20260305"
}
-->

# Style Spec — ai-3-chat.png

## Style Spec (Markdown)

**Industry**: ai
**Image**: ai-3-chat.png
**Vibe**: minimal, ethereal, futuristic, premium, soft

**Summary**: A soft, premium AI landing page with an airy light background, glowing warm gradients, and elegant dark call-to-action elements. The aesthetic blends minimal typography with fluid abstract wave visuals for a futuristic yet approachable feel.

### Palette
- Primary: `#2f2c2a` — charcoal
- Secondary: `#f4b25c` — warm amber
- Accent: `#e9724d` — sunset orange
- Background: `#f3efee` — warm mist
- Surface: `#f8f4f1` — soft ivory
- Text: `#1f1a17` — near-black
- Text muted: `#7f6f68` — muted taupe
- Border: `#d9c8bf` — warm beige
- Warning: `#f1c96a` — golden glow

### Typography
- Heading font: Inter (weight 500)
- Body font: Inter (weight 400)
- Base size: 16px
- Note: large centered hero heading
- Note: lightweight sans serif navigation
- Note: muted supporting copy
- Note: italic emphasis in headline

### Spacing & Radius
- Spacing base: 8px; scale: 4, 8, 12, 16, 24, 32, 48, 64
- Radius: sm 4px, md 10px, lg 20px, pill 999px
- Shadows: 2 variant(s)
  - `0 2px 6px rgba(0,0,0,0.10)`
  - `0 12px 30px rgba(0,0,0,0.18)`

### Components
- **button**: Primary buttons use a dark charcoal pill shape with subtle gradient, soft outer shadow, white label text, and a small leading icon; secondary actions appear as low-emphasis text links.
- **card**: No explicit cards are visible; the design relies on open space, soft atmospheric gradients, and layered wave forms instead of boxed containers.
- **navigation**: Top navigation is a minimal centered text nav with small rounded text chips and a dark pill CTA aligned to the top right; brand mark and wordmark sit on the top left.

### Layout
top navbar + centered hero content + dual CTA row + large abstract wave illustration + trusted-by logo strip

## Style Spec (HTML)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Style Spec — ai-3-chat.png</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
    --color-primary:    #2f2c2a;
    --color-secondary:  #f4b25c;
    --color-accent:     #e9724d;
    --color-background: #f3efee;
    --color-surface:    #f8f4f1;
    --color-text:       #1f1a17;
    --color-text-muted: #7f6f68;
    --color-border:     #d9c8bf;
    --color-success:    #22c55e;
    --color-warning:    #f1c96a;
    --color-danger:     #ef4444;
    --font-heading: 'Inter', system-ui, sans-serif;
    --font-body:    'Inter', system-ui, sans-serif;
    --font-mono:    'JetBrains Mono', ui-monospace, monospace;
    --weight-heading: 500;
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
    <img src="/knowledge-refs/ai-3-chat.png" alt="ai-3-chat.png">
    <div class="header__body">
      <div class="kicker">ai</div>
      <h1>ai-3-chat.png</h1>
      <p class="muted">A soft, premium AI landing page with an airy light background, glowing warm gradients, and elegant dark call-to-action elements. The aesthetic blends minimal typography with fluid abstract wave visuals for a futuristic yet approachable feel.</p>
      <div class="tags">
        <span class="tag">minimal</span><span class="tag">ethereal</span><span class="tag">futuristic</span><span class="tag">premium</span><span class="tag">soft</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Palette</h2>
    <div class="palette">
    <div class="swatch">
      <div class="swatch__chip" style="background:#2f2c2a"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Primary</div>
        <div class="swatch__hex">#2f2c2a</div>
        <div class="swatch__name">charcoal</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f4b25c"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Secondary</div>
        <div class="swatch__hex">#f4b25c</div>
        <div class="swatch__name">warm amber</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#e9724d"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Accent</div>
        <div class="swatch__hex">#e9724d</div>
        <div class="swatch__name">sunset orange</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f3efee"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Background</div>
        <div class="swatch__hex">#f3efee</div>
        <div class="swatch__name">warm mist</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f8f4f1"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Surface</div>
        <div class="swatch__hex">#f8f4f1</div>
        <div class="swatch__name">soft ivory</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#1f1a17"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text</div>
        <div class="swatch__hex">#1f1a17</div>
        <div class="swatch__name">near-black</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#7f6f68"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text muted</div>
        <div class="swatch__hex">#7f6f68</div>
        <div class="swatch__name">muted taupe</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#d9c8bf"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Border</div>
        <div class="swatch__hex">#d9c8bf</div>
        <div class="swatch__name">warm beige</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f1c96a"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Warning</div>
        <div class="swatch__hex">#f1c96a</div>
        <div class="swatch__name">golden glow</div>
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

  <div class="section"><h2>Shadows</h2><div class="shadow-card" style="box-shadow:0 2px 6px rgba(0,0,0,0.10)">0 2px 6px rgba(0,0,0,0.10)</div><div class="shadow-card" style="box-shadow:0 12px 30px rgba(0,0,0,0.18)">0 12px 30px rgba(0,0,0,0.18)</div></div>

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
        <div class="component__desc">Primary buttons use a dark charcoal pill shape with subtle gradient, soft outer shadow, white label text, and a small leading icon; secondary actions appear as low-emphasis text links.</div>
      </div>
      <div class="component">
        <div class="component__name">card</div>
        <div class="component__desc">No explicit cards are visible; the design relies on open space, soft atmospheric gradients, and layered wave forms instead of boxed containers.</div>
      </div>
      <div class="component">
        <div class="component__name">navigation</div>
        <div class="component__desc">Top navigation is a minimal centered text nav with small rounded text chips and a dark pill CTA aligned to the top right; brand mark and wordmark sit on the top left.</div>
      </div></div>

  <div class="section"><h2>Layout pattern</h2><p>top navbar + centered hero content + dual CTA row + large abstract wave illustration + trusted-by logo strip</p></div>
</body>
</html>
```

