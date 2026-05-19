---
{"id":"DK-57b-ai","layer":"L1","kind":"design-knowledge","title":"57B Design Guidelines — AI Industry","tags":["industry:ai","source:57b-guidelines","manual:approved"],"source":"manual","refs":{},"createdAt":1778751820289,"updatedAt":1778751820289,"schemaVersion":1}
---

## 57B Design Guidelines — AI Industry

### Visual Identity
- **Background**: White (#FFFFFF) or light-gray (#F8F9FA) for standard light mode; deep dark (#0A0A0F or #0D0D1A) for data-dense AI dashboards and agent builders
- **Primary accent**: Electric blue (#3B82F6 / #2563EB) communicates trust and technical authority; purple (#8B5CF6 / #7C3AED) adds innovation and future-tech feel
- **Gradient usage**: Subtle blue-to-purple gradients on hero sections, CTA buttons, and feature highlights; avoid full-screen gradients on data pages
- **Avoid**: Oversaturated palettes, rainbow color schemes, loud backgrounds that compete with content
- **Dark mode tone**: Use #0A0A0F base, #1A1A2E surface cards, with glowing blue/purple accent lines (1–2px borders on active cards)

### Typography & Layout
- **Font pair**: Inter (UI text, weights 300–700) + Fira Code (data values, metrics, code snippets)
- **Hero headline**: 56–72px bold, tight line-height (1.05–1.15), high contrast against background
- **Spacing**: Wide margins (5–10% page padding), generous section gaps (80–120px), breathing room between components
- **Layout patterns**: Left sidebar (240px) for dashboards; centered single-column for landing pages; 12-col grid for feature sections
- **Information hierarchy**: Bold large metric → muted label → subtle description; never more than 3 visual weight levels per section

### Component Aesthetic
- **Cards**: Subtle border (1px #E2E8F0 light / #1E293B dark), low shadow (0 1px 4px rgba(0,0,0,0.06)), rounded corners (radius-md 12px)
- **Buttons**: Primary = solid blue or purple fill, rounded-full pill shape; secondary = ghost with border; hover lifts with shadow
- **Navigation**: Clean top nav with transparent/white background, or fixed left sidebar with icon+label; no heavy drop-shadows on nav
- **Data tables**: Striped rows (#F8F9FA alternating), sticky header, sortable columns; monospace font for numeric cells
- **Badges/Tags**: Pill-shaped, small (text-xs), soft color fill matching status (blue for info, green for success, amber for warning)
- **Glassmorphism**: Acceptable for hero UI mock overlays and feature callout cards — use backdrop-blur-sm with 10–15% white opacity fill

### Reference Screenshots Analysis
- **LuminaAI**: Warm cream-to-orange fluid gradient hero, clean white nav, large serif-adjacent bold headline, soft wave SVG background; calm and inviting
- **AIPatrn**: Dark header with abstract mesh/dot patterns, bright purple highlights, tight two-column grid for feature cards
- **Kodu**: Deep purple-to-black radial gradient hero, oversized bold white headline, glowing orb effects, minimal nav with CTA button
- **NuroAI (light)**: White SaaS-style layout, blue primary CTA, floating dashboard screenshot cards as social proof, FAQ accordion
- **SETO (AI chat)**: Frosted glass sidebar, purple star icon branding, chat history panel on right, generous card spacing

### Copywriting Tone (AI)
- Headlines: capability-forward, transformation verbs — "Build the future with a prompt", "Intelligence That Flows With You"
- Subheadlines: specific outcomes + speed — "Go from raw data to deployed model in under a week"
- CTAs: Action-oriented — "Start Building", "Get Started Free", "Watch a Live Demo"
- Tone: technically credible but approachable; avoid jargon overload; quantify value when possible
