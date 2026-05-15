/**
 * 57B Design Knowledge Library
 *
 * Three authoritative style-guide records — one per industry vertical.
 * Seeded into L1 memory as `design-knowledge` records tagged `manual:approved`
 * so they bypass the score threshold and are always injected into the
 * DesignAgent's additionalContext regardless of session history.
 *
 * Content is distilled from:
 *   - generated-code/57B 网站知识库.md (57B design principles)
 *   - Visual analysis of reference screenshots per industry
 */

export type DesignIndustry = "ai" | "fintech-web3" | "saas";

export interface KnowledgeRecord {
  industry: DesignIndustry;
  title: string;
  body: string;
  tags: string[];
}

// ---------------------------------------------------------------------------
// AI Industry
// ---------------------------------------------------------------------------
const AI_BODY = `
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
`.trim();

// ---------------------------------------------------------------------------
// FinTech / Web3 / Blockchain
// ---------------------------------------------------------------------------
const FINTECH_BODY = `
## 57B Design Guidelines — FinTech / Web3 / Blockchain

### Visual Identity
- **Background**: Dark themes dominant (#0A0B0F, #06060E); alternatively clean white for compliance/regulated products (audit dashboards, KYC flows)
- **Primary accent**: Vivid blue (#3B82F6, #00D4FF) for trust and precision; electric green (#22C55E, #10B981) for positive transactions and yield; bright purple/magenta for DeFi and NFT products
- **Gradient usage**: Bold neon gradients (blue-to-purple, blue-to-cyan, or holographic) on dark backgrounds; used on hero illustrations, token cards, and animated chart lines
- **Texture**: Subtle grid/dot overlays on dark backgrounds, glowing particle effects for hero; circuit-board or abstract polygon meshes
- **Light-mode FinTech**: Clean white base, blue primary, green success indicators, strict information density for compliance/enterprise contexts

### Typography & Layout
- **Font pair**: Inter (UI) + SF Mono or Fira Code (wallet addresses, transaction hashes, numeric amounts)
- **Hero headline**: Bold, oversized, often split across two lines; numbers and dollar amounts displayed with high-contrast accent color
- **Layout**: Data-dense dashboards with compact row spacing (8–12px row gap); wallet/transaction views require fixed-width numeric columns
- **Mobile-first**: Crypto card UIs must be fully responsive; large tap targets for transaction approval buttons
- **Trust signals**: Security badges, audit firm logos, compliance certifications — display prominently near CTA

### Component Aesthetic
- **Cards**: Dark surface (#111827 / #1F2937), thin glowing border (1px rgba(99,102,241,0.3)), elevated shadow with purple/blue tint
- **Buttons**: CTA = gradient fill (blue-to-purple or blue-to-cyan) with subtle glow shadow; avoid flat mono-color for primary actions
- **Transaction rows**: Two-line compact layout (amount + type top, address + timestamp bottom), green/red delta indicators
- **Charts**: Dark canvas, neon line color, area fill with 20% opacity gradient; grid lines very subtle (#1F2937)
- **Wallet addresses**: Monospace font, truncated (first 6 + last 4 chars), copy icon on hover
- **Status indicators**: Large colored ring/circle for live network status; pulsing animation for active transactions

### Reference Screenshots Analysis
- **Solvance Finance**: Clean white FinTech, forest-green brand, large phone product shot, glassmorphism stats cards, trust-badge partner logos
- **BlockSphere**: Deep navy/dark background, white serif headline, purple CTA, partner logo bar, professional enterprise feel
- **bullXT (Web3)**: Pure dark (#070514), neon purple-pink gradient branding, large crypto price cards with live data, scrolling text ticker
- **Nebula Core (Web3)**: Purple-to-black deep gradient, large 3D holographic cube hero, minimal nav, NFT/DeFi positioning

### Copywriting Tone (FinTech/Web3)
- Headlines: sovereignty + speed + security — "Build the Future with Blockchain Technology", "Ship your L1/L2 protocol with zero failure risk"
- Subheadlines: technical credibility with ROI framing — "Automate crypto payroll, track multi-chain holdings"
- CTAs: Decisive — "Book a Demo", "Start Earning Now", "Apply for Partnership"
- Tone: authoritative, B2B-first; avoid casual language; legal/compliance framing where relevant
`.trim();

// ---------------------------------------------------------------------------
// SaaS / Enterprise
// ---------------------------------------------------------------------------
const SAAS_BODY = `
## 57B Design Guidelines — SaaS / Enterprise Applications

### Visual Identity
- **Background**: White (#FFFFFF) base, light gray (#F1F5F9 / #F8FAFC) section alternates, subtle off-white panels for cards
- **Primary accent**: Trustworthy blue (#3B82F6, #4F46E5 / #6366F1); secondary accent green (#10B981) for success states, orange (#F59E0B) for warnings
- **Color blocks**: Feature sections use soft pastel tinted backgrounds (blue-50, purple-50, green-50) for visual rhythm
- **Iconography**: Line-style icons with 1.5–2px stroke, matching brand color; avoid filled icons in data-dense UIs
- **Professional over flashy**: SaaS interfaces should never distract from data; color serves function (status, hierarchy, CTA)

### Typography & Layout
- **Font pair**: Inter (all UI text); optionally Geist or Plus Jakarta Sans for landing pages
- **Heading scale**: 48–56px for hero, 32–40px for section titles, 20–24px for feature subheadings, 14–16px for body/labels
- **Layout**: Top navigation bar (64px height) + content area with 1200px max-width; sidebar-based for app dashboards (240px fixed)
- **Grid**: 12-column with 24px gutters for landing pages; 4–6 column feature grids for product sections
- **Whitespace**: Very generous — SaaS landing pages signal premium quality through restraint; 80–100px section gaps minimum

### Component Aesthetic
- **Cards**: White fill, 1px #E2E8F0 border, 4px radius, subtle shadow (0 1px 3px rgba(0,0,0,0.08)); hover lifts shadow slightly
- **Buttons**: Primary = solid brand blue, rounded (radius-sm 8px), medium weight label; secondary = outline or ghost; use size sm/md/lg variants
- **Data tables**: Clean white, column headers in gray-50, compact row height (44px), right-aligned numerics, status badge in each row
- **Forms**: Large input fields (44px height), clear focus ring (2px brand blue), error state in red with helper text
- **Pricing cards**: Three-column with middle "recommended" card elevated (brand color border top, subtle shadow boost)
- **Testimonials**: Avatar + name + company, quote in larger text, star rating; 3-column grid on desktop

### Reference Screenshots Analysis
- **Collabix (Project Mgmt)**: Warm beige/yellow accent banner, white card grids, task progress bars, clean sans-serif typography
- **Picktime (Scheduling)**: White base with blue primary, meeting card UI screenshot, feature grid with icons, simple two-column pricing
- **Earnify (Analytics)**: Orange accent brand, dark sidebar mockup, large KPI numbers, chart screenshots as social proof
- **Appvia (Booking)**: Purple/lavender tinted sections, calendar widget screenshot, feature list with checkmarks, testimonial grid
- **Untitled UI (Dashboard)**: Very clean white SaaS, gray scale hierarchy, large dashboard screenshot hero, subtle shadows throughout
- **DraftAI (Design Tool)**: Light gray background, chat-like left panel, inspiration grid right side, minimal branding

### Copywriting Tone (SaaS/Enterprise)
- Headlines: outcome + efficiency — "Streamline your workflow, track your success", "Manage your Team, Tasks & Projects in one place"
- Subheadlines: problem-solution framing — "Ditch manual entry; our platform reconciles all corporate spending instantly"
- CTAs: Low-commitment starts — "Start Your 14-Day Free Trial", "Get Started for Free", "Request a Demo"
- Tone: professional but warm; ROI-quantified where possible; customer-proof heavy (logos, testimonials, star ratings)
`.trim();

// ---------------------------------------------------------------------------
// Exported library
// ---------------------------------------------------------------------------
export const LIBRARY_57B: KnowledgeRecord[] = [
  {
    industry: "ai",
    title: "57B Design Guidelines — AI Industry",
    body: AI_BODY,
    tags: ["industry:ai", "source:57b-guidelines", "manual:approved"],
  },
  {
    industry: "fintech-web3",
    title: "57B Design Guidelines — FinTech/Web3/Blockchain",
    body: FINTECH_BODY,
    tags: ["industry:fintech-web3", "source:57b-guidelines", "manual:approved"],
  },
  {
    industry: "saas",
    title: "57B Design Guidelines — SaaS/Enterprise Applications",
    body: SAAS_BODY,
    tags: ["industry:saas", "source:57b-guidelines", "manual:approved"],
  },
];

/** All industry identifiers used in the library. */
export const ALL_INDUSTRIES: DesignIndustry[] = ["ai", "fintech-web3", "saas"];
