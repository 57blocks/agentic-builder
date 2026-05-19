---
{"id":"DK-57b-fintech-web3","layer":"L1","kind":"design-knowledge","title":"57B Design Guidelines — FinTech/Web3/Blockchain","tags":["industry:fintech-web3","source:57b-guidelines","manual:approved"],"source":"manual","refs":{},"createdAt":1778751820291,"updatedAt":1778751820291,"schemaVersion":1}
---

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
