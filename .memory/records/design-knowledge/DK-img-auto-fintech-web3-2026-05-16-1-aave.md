---
{"id":"DK-img-auto-fintech-web3-2026-05-16-1-aave","layer":"L1","kind":"design-knowledge","title":"Trend Capture — Aave (fintech-web3)","tags":["industry:fintech-web3","source:trend-capture","image:auto-fintech-web3-2026-05-16-1-aave.png","site:aave.com","url:https://aave.com","captured:2026-05-16","manual:approved"],"source":"distill","refs":{},"createdAt":1778925551522,"updatedAt":1778925551522,"schemaVersion":1}
---

<!-- style-spec:json
{
  "industry": "fintech-web3",
  "summary": "A clean fintech landing page with a soft premium feel, combining spacious white layouts, muted lavender gradients, and polished mobile product imagery. The aesthetic is minimal and trust-oriented, with gentle purple accents that add a subtle web3 sensibility.",
  "vibe": [
    "minimal",
    "premium",
    "soft",
    "clean",
    "trustworthy"
  ],
  "palette": {
    "primary": {
      "hex": "#8f85f7",
      "label": "soft violet"
    },
    "secondary": {
      "hex": "#dcd9ff",
      "label": "pale lavender"
    },
    "accent": {
      "hex": "#3b82f6",
      "label": "link blue"
    },
    "background": {
      "hex": "#fcfcff",
      "label": "near-white"
    },
    "surface": {
      "hex": "#f3f1ff",
      "label": "mist lavender"
    },
    "text": {
      "hex": "#231f20",
      "label": "charcoal"
    },
    "textMuted": {
      "hex": "#8d8a93",
      "label": "cool gray"
    },
    "border": {
      "hex": "#e8e5f4",
      "label": "soft lilac border"
    },
    "success": {
      "hex": "#2ecc71",
      "label": "bright green"
    }
  },
  "typography": {
    "headingFont": "Inter",
    "bodyFont": "Inter",
    "headingWeight": 700,
    "bodyWeight": 400,
    "baseSizePx": 16,
    "notes": [
      "oversized hero headline",
      "rounded geometric sans",
      "medium-weight navigation",
      "large numeric balances"
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
    "0 8px 24px rgba(143,133,247,0.12)",
    "0 24px 60px rgba(35,31,32,0.10)"
  ],
  "components": {
    "button": {
      "description": "Large pill-shaped CTA buttons; primary uses solid soft-violet fill with white text and icon, secondary uses very light lavender fill with violet text."
    },
    "card": {
      "description": "In-device UI cards use white rounded panels with subtle borders/shadows, floating stat chips, and soft color-coded highlights for balances and earnings."
    },
    "navigation": {
      "description": "Minimal top navigation with wordmark on the left, evenly spaced text links centered/right, and a dark pill CTA button for the primary action."
    }
  },
  "layout": "centered top navigation + large hero headline and subcopy + dual CTA row + overlapping mobile mockups on a soft gradient field",
  "imageMotifs": [
    "mobile finance app",
    "soft gradient glow",
    "premium smartphone mockup",
    "minimal workspace",
    "future banking"
  ],
  "imagePath": "/knowledge-refs/auto-fintech-web3-2026-05-16-1-aave.png",
  "imageName": "auto-fintech-web3-2026-05-16-1-aave.png",
  "capturedAt": "2026-05-16T09:59:11.519Z",
  "model": "openai/gpt-5.4-20260305"
}
-->

# Style Spec — auto-fintech-web3-2026-05-16-1-aave.png

## Style Spec (Markdown)

**Industry**: fintech-web3
**Image**: auto-fintech-web3-2026-05-16-1-aave.png
**Vibe**: minimal, premium, soft, clean, trustworthy

**Summary**: A clean fintech landing page with a soft premium feel, combining spacious white layouts, muted lavender gradients, and polished mobile product imagery. The aesthetic is minimal and trust-oriented, with gentle purple accents that add a subtle web3 sensibility.

### Palette
- Primary: `#8f85f7` — soft violet
- Secondary: `#dcd9ff` — pale lavender
- Accent: `#3b82f6` — link blue
- Background: `#fcfcff` — near-white
- Surface: `#f3f1ff` — mist lavender
- Text: `#231f20` — charcoal
- Text muted: `#8d8a93` — cool gray
- Border: `#e8e5f4` — soft lilac border
- Success: `#2ecc71` — bright green

### Typography
- Heading font: Inter (weight 700)
- Body font: Inter (weight 400)
- Base size: 16px
- Note: oversized hero headline
- Note: rounded geometric sans
- Note: medium-weight navigation
- Note: large numeric balances

### Spacing & Radius
- Spacing base: 8px; scale: 4, 8, 12, 16, 24, 32, 48, 64
- Radius: sm 4px, md 8px, lg 16px, pill 999px
- Shadows: 2 variant(s)
  - `0 8px 24px rgba(143,133,247,0.12)`
  - `0 24px 60px rgba(35,31,32,0.10)`

### Components
- **button**: Large pill-shaped CTA buttons; primary uses solid soft-violet fill with white text and icon, secondary uses very light lavender fill with violet text.
- **card**: In-device UI cards use white rounded panels with subtle borders/shadows, floating stat chips, and soft color-coded highlights for balances and earnings.
- **navigation**: Minimal top navigation with wordmark on the left, evenly spaced text links centered/right, and a dark pill CTA button for the primary action.

### Layout
centered top navigation + large hero headline and subcopy + dual CTA row + overlapping mobile mockups on a soft gradient field

### Imagery & Motifs
On-theme photography subjects that pair well with this style:
- mobile finance app
- soft gradient glow
- premium smartphone mockup
- minimal workspace
- future banking

## Style Spec (HTML)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Style Spec — auto-fintech-web3-2026-05-16-1-aave.png</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
    --color-primary:    #8f85f7;
    --color-secondary:  #dcd9ff;
    --color-accent:     #3b82f6;
    --color-background: #fcfcff;
    --color-surface:    #f3f1ff;
    --color-text:       #231f20;
    --color-text-muted: #8d8a93;
    --color-border:     #e8e5f4;
    --color-success:    #2ecc71;
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
    <img src="/knowledge-refs/auto-fintech-web3-2026-05-16-1-aave.png" alt="auto-fintech-web3-2026-05-16-1-aave.png">
    <div class="header__body">
      <div class="kicker">fintech-web3</div>
      <h1>auto-fintech-web3-2026-05-16-1-aave.png</h1>
      <p class="muted">A clean fintech landing page with a soft premium feel, combining spacious white layouts, muted lavender gradients, and polished mobile product imagery. The aesthetic is minimal and trust-oriented, with gentle purple accents that add a subtle web3 sensibility.</p>
      <div class="tags">
        <span class="tag">minimal</span><span class="tag">premium</span><span class="tag">soft</span><span class="tag">clean</span><span class="tag">trustworthy</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Palette</h2>
    <div class="palette">
    <div class="swatch">
      <div class="swatch__chip" style="background:#8f85f7"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Primary</div>
        <div class="swatch__hex">#8f85f7</div>
        <div class="swatch__name">soft violet</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#dcd9ff"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Secondary</div>
        <div class="swatch__hex">#dcd9ff</div>
        <div class="swatch__name">pale lavender</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#3b82f6"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Accent</div>
        <div class="swatch__hex">#3b82f6</div>
        <div class="swatch__name">link blue</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#fcfcff"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Background</div>
        <div class="swatch__hex">#fcfcff</div>
        <div class="swatch__name">near-white</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#f3f1ff"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Surface</div>
        <div class="swatch__hex">#f3f1ff</div>
        <div class="swatch__name">mist lavender</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#231f20"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text</div>
        <div class="swatch__hex">#231f20</div>
        <div class="swatch__name">charcoal</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#8d8a93"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Text muted</div>
        <div class="swatch__hex">#8d8a93</div>
        <div class="swatch__name">cool gray</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#e8e5f4"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Border</div>
        <div class="swatch__hex">#e8e5f4</div>
        <div class="swatch__name">soft lilac border</div>
      </div>
    </div>

    <div class="swatch">
      <div class="swatch__chip" style="background:#2ecc71"></div>
      <div class="swatch__meta">
        <div class="swatch__label">Success</div>
        <div class="swatch__hex">#2ecc71</div>
        <div class="swatch__name">bright green</div>
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

  <div class="section"><h2>Shadows</h2><div class="shadow-card" style="box-shadow:0 8px 24px rgba(143,133,247,0.12)">0 8px 24px rgba(143,133,247,0.12)</div><div class="shadow-card" style="box-shadow:0 24px 60px rgba(35,31,32,0.10)">0 24px 60px rgba(35,31,32,0.10)</div></div>

  <div class="section">
    <h2>Imagery &amp; Motifs</h2>
    <p class="muted" style="margin-top:-4px;">On-theme photography suggested for this style — keywords feed Unsplash (live) with picsum as fallback so the slots always render.</p>
    <div class="motif-grid">
      <figure class="motif">
        <img
          src="https://source.unsplash.com/600x400/?mobile%20finance%20app"
          data-fallback="https://picsum.photos/seed/auto-fintech-web3-2026-05-16-1-a-1/600/400"
          alt="mobile finance app"
          loading="lazy"
          referrerpolicy="no-referrer"
          onerror="if(this.dataset.fallback&&this.src!==this.dataset.fallback){this.src=this.dataset.fallback;}"
        />
        <figcaption>mobile finance app</figcaption>
      </figure>
      <figure class="motif">
        <img
          src="https://source.unsplash.com/600x400/?soft%20gradient%20glow"
          data-fallback="https://picsum.photos/seed/auto-fintech-web3-2026-05-16-1-a-2/600/400"
          alt="soft gradient glow"
          loading="lazy"
          referrerpolicy="no-referrer"
          onerror="if(this.dataset.fallback&&this.src!==this.dataset.fallback){this.src=this.dataset.fallback;}"
        />
        <figcaption>soft gradient glow</figcaption>
      </figure>
      <figure class="motif">
        <img
          src="https://source.unsplash.com/600x400/?premium%20smartphone%20mockup"
          data-fallback="https://picsum.photos/seed/auto-fintech-web3-2026-05-16-1-a-3/600/400"
          alt="premium smartphone mockup"
          loading="lazy"
          referrerpolicy="no-referrer"
          onerror="if(this.dataset.fallback&&this.src!==this.dataset.fallback){this.src=this.dataset.fallback;}"
        />
        <figcaption>premium smartphone mockup</figcaption>
      </figure>
      <figure class="motif">
        <img
          src="https://source.unsplash.com/600x400/?minimal%20workspace"
          data-fallback="https://picsum.photos/seed/auto-fintech-web3-2026-05-16-1-a-4/600/400"
          alt="minimal workspace"
          loading="lazy"
          referrerpolicy="no-referrer"
          onerror="if(this.dataset.fallback&&this.src!==this.dataset.fallback){this.src=this.dataset.fallback;}"
        />
        <figcaption>minimal workspace</figcaption>
      </figure>
      <figure class="motif">
        <img
          src="https://source.unsplash.com/600x400/?future%20banking"
          data-fallback="https://picsum.photos/seed/auto-fintech-web3-2026-05-16-1-a-5/600/400"
          alt="future banking"
          loading="lazy"
          referrerpolicy="no-referrer"
          onerror="if(this.dataset.fallback&&this.src!==this.dataset.fallback){this.src=this.dataset.fallback;}"
        />
        <figcaption>future banking</figcaption>
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
        <div class="component__desc">Large pill-shaped CTA buttons; primary uses solid soft-violet fill with white text and icon, secondary uses very light lavender fill with violet text.</div>
      </div>
      <div class="component">
        <div class="component__name">card</div>
        <div class="component__desc">In-device UI cards use white rounded panels with subtle borders/shadows, floating stat chips, and soft color-coded highlights for balances and earnings.</div>
      </div>
      <div class="component">
        <div class="component__name">navigation</div>
        <div class="component__desc">Minimal top navigation with wordmark on the left, evenly spaced text links centered/right, and a dark pill CTA button for the primary action.</div>
      </div></div>

  <div class="section"><h2>Layout pattern</h2><p>centered top navigation + large hero headline and subcopy + dual CTA row + overlapping mobile mockups on a soft gradient field</p></div>
</body>
</html>
```

