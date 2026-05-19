---
{"id":"DK-img-ai-9-draftai","layer":"L1","kind":"design-knowledge","title":"Style Spec — ai-9-draftai.png","tags":["industry:ai","source:vision-distill","image:ai-9-draftai.png","manual:approved"],"source":"distill","refs":{},"createdAt":1778922821033,"updatedAt":1778922821033,"schemaVersion":1}
---

<!-- style-spec:json
{
  "industry": "ai",
  "summary": "A bright, polished AI landing page with soft neutrals, rounded cards, and a vivid electric-blue CTA accent. The design feels minimal and premium, using spacious layout, subtle borders, and gentle shadows to keep the interface lightweight.",
  "vibe": [
    "minimal",
    "clean",
    "premium",
    "soft",
    "modern"
  ],
  "palette": {
    "primary": {
      "hex": "#2f9dfd",
      "label": "electric blue"
    },
    "secondary": {
      "hex": "#111111",
      "label": "near black"
    },
    "accent": {
      "hex": "#eef5ff",
      "label": "pale blue glow"
    },
    "background": {
      "hex": "#f8f7f5",
      "label": "warm off-white"
    },
    "surface": {
      "hex": "#ffffff",
      "label": "white"
    },
    "text": {
      "hex": "#1a1a1a",
      "label": "charcoal"
    },
    "textMuted": {
      "hex": "#7a7a7a",
      "label": "muted gray"
    },
    "border": {
      "hex": "#ece8e3",
      "label": "soft beige gray"
    }
  },
  "typography": {
    "headingFont": "Inter",
    "bodyFont": "Inter",
    "headingWeight": 700,
    "bodyWeight": 400,
    "baseSizePx": 16,
    "notes": [
      "large bold hero heading",
      "clean sans serif throughout",
      "small muted supporting copy"
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
    "0 8px 24px rgba(0,0,0,0.08)",
    "0 8px 20px rgba(47,157,253,0.35)"
  ],
  "components": {
    "button": {
      "description": "Rounded pill buttons; primary CTA uses a bright blue gradient/glow with white text, while secondary buttons are white with subtle border or black filled for newsletter subscribe."
    },
    "card": {
      "description": "Large rounded white cards with very light borders and soft shadow; interior content uses ample whitespace and occasional dotted/patterned background texture."
    },
    "input": {
      "description": "Simple pill-shaped email input with white fill, thin light-gray border, muted placeholder text, and paired button action."
    },
    "navigation": {
      "description": "Top horizontal navigation with left logo, centered rounded nav group, and right-aligned auth actions including a prominent pill CTA."
    }
  },
  "layout": "top navigation + two-column hero with AI chat preview on the left and headline/content panel on the right + newsletter signup and sponsor logo strip",
  "imagePath": "/knowledge-refs/ai-9-draftai.png",
  "imageName": "ai-9-draftai.png",
  "capturedAt": "2026-05-16T09:13:41.032Z",
  "model": "openai/gpt-5.4-20260305"
}
-->

# Style Spec — ai-9-draftai.png

## Style Spec (Markdown)

**Industry**: ai
**Image**: ai-9-draftai.png
**Vibe**: minimal, clean, premium, soft, modern

**Summary**: A bright, polished AI landing page with soft neutrals, rounded cards, and a vivid electric-blue CTA accent. The design feels minimal and premium, using spacious layout, subtle borders, and gentle shadows to keep the interface lightweight.

### Palette
- Primary: `#2f9dfd` — electric blue
- Secondary: `#111111` — near black
- Accent: `#eef5ff` — pale blue glow
- Background: `#f8f7f5` — warm off-white
- Surface: `#ffffff` — white
- Text: `#1a1a1a` — charcoal
- Text muted: `#7a7a7a` — muted gray
- Border: `#ece8e3` — soft beige gray

### Typography
- Heading font: Inter (weight 700)
- Body font: Inter (weight 400)
- Base size: 16px
- Note: large bold hero heading
- Note: clean sans serif throughout
- Note: small muted supporting copy

### Spacing & Radius
- Spacing base: 8px; scale: 4, 8, 12, 16, 24, 32, 48, 64
- Radius: sm 4px, md 8px, lg 16px, pill 999px
- Shadows: 3 variant(s)
  - `0 1px 2px rgba(0,0,0,0.04)`
  - `0 8px 24px rgba(0,0,0,0.08)`
  - `0 8px 20px rgba(47,157,253,0.35)`

### Components
- **button**: Rounded pill buttons; primary CTA uses a bright blue gradient/glow with white text, while secondary buttons are white with subtle border or black filled for newsletter subscribe.
- **card**: Large rounded white cards with very light borders and soft shadow; interior content uses ample whitespace and occasional dotted/patterned background texture.
- **input**: Simple pill-shaped email input with white fill, thin light-gray border, muted placeholder text, and paired button action.
- **navigation**: Top horizontal navigation with left logo, centered rounded nav group, and right-aligned auth actions including a prominent pill CTA.

### Layout
top navigation + two-column hero with AI chat preview on the left and headline/content panel on the right + newsletter signup and sponsor logo strip

## Style Spec (HTML)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Style Spec — ai-9-draftai.png</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
    --color-primary:    #2f9dfd;
    --color-secondary:  #111111;
    --color-accent:     #eef5ff;
    --color-background: #f8f7f5;
    --color-surface:    #ffffff;
    --color-text:       #1a1a1a;
    --color-text-muted: #7a7a7a;
    --color-border:     #ece8e3;
    --color-success:    #22c55e;
    --color-warning:    #f59e0b;
    --color-danger:     #ef4444;
    --font-heading: 'Inter', system-ui, sans-serif;
    --font-body:    'Inter', system-ui, sans-serif;
    --font-mono:    'JetBrains Mono', ui-monospace, monospace;
    --weight-heading: 700;
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
    <img src="/knowledge-refs/ai-9-draftai.png" alt="ai-9-draftai.png">
    <div class="header__body">
      <div class="kicker">ai</div>
      <h1>ai-9-draftai.png</h1>
      <p class="muted">A bright, polished AI landing page with soft neutrals, rounded cards, and a vivid electric-blue CTA accent. The design feels minimal and premium, using spacious layout, subtle borders, and gentle shadows to keep the interface lightweight.</p>
      <div class="tags">
        <span class="tag">minimal</span><span class="tag">clean</span><span class="tag">premium</span><span class="tag">soft</span><span class="tag">modern</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Palette</h2>
    <div class="palette">
    <div class="swatch">
      <div class="swatch__chip" style="background:#2f9dfd"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Primary</div>
        <div class="swatch__hex">#2f9dfd</div>
        <div class="swatch__name">electric blue</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#111111"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Secondary</div>
        <div class="swatch__hex">#111111</div>
        <div class="swatch__name">near black</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#eef5ff"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Accent</div>
        <div class="swatch__hex">#eef5ff</div>
        <div class="swatch__name">pale blue glow</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f8f7f5"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Background</div>
        <div class="swatch__hex">#f8f7f5</div>
        <div class="swatch__name">warm off-white</div>
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
      <div class="swatch__chip" style="background:#1a1a1a"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text</div>
        <div class="swatch__hex">#1a1a1a</div>
        <div class="swatch__name">charcoal</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#7a7a7a"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text muted</div>
        <div class="swatch__hex">#7a7a7a</div>
        <div class="swatch__name">muted gray</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#ece8e3"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Border</div>
        <div class="swatch__hex">#ece8e3</div>
        <div class="swatch__name">soft beige gray</div>
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

  <div class="section"><h2>Shadows</h2><div class="shadow-card" style="box-shadow:0 1px 2px rgba(0,0,0,0.04)">0 1px 2px rgba(0,0,0,0.04)</div><div class="shadow-card" style="box-shadow:0 8px 24px rgba(0,0,0,0.08)">0 8px 24px rgba(0,0,0,0.08)</div><div class="shadow-card" style="box-shadow:0 8px 20px rgba(47,157,253,0.35)">0 8px 20px rgba(47,157,253,0.35)</div></div>

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
        <div class="component__desc">Rounded pill buttons; primary CTA uses a bright blue gradient/glow with white text, while secondary buttons are white with subtle border or black filled for newsletter subscribe.</div>
      </div>
      <div class="component">
        <div class="component__name">card</div>
        <div class="component__desc">Large rounded white cards with very light borders and soft shadow; interior content uses ample whitespace and occasional dotted/patterned background texture.</div>
      </div>
      <div class="component">
        <div class="component__name">input</div>
        <div class="component__desc">Simple pill-shaped email input with white fill, thin light-gray border, muted placeholder text, and paired button action.</div>
      </div>
      <div class="component">
        <div class="component__name">navigation</div>
        <div class="component__desc">Top horizontal navigation with left logo, centered rounded nav group, and right-aligned auth actions including a prominent pill CTA.</div>
      </div></div>

  <div class="section"><h2>Layout pattern</h2><p>top navigation + two-column hero with AI chat preview on the left and headline/content panel on the right + newsletter signup and sponsor logo strip</p></div>
</body>
</html>
```

