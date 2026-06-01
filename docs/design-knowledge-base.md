# Design Knowledge Base — Technical Documentation

> Subsystem of **AgenticBuilder** that ingests, curates, and surfaces design
> references to the DesignAgent during HTML Design System generation.
>
> Last updated: 2026-05-28

---

## 1. Overview

AgenticBuilder is an AI code generator that turns a PRD into a runnable
full-stack application. Inside its generation pipeline (TRD → SysDesign →
ImplGuide → **Design** → task-breakdown → coding), the **Design** stage is
responsible for producing a complete HTML *Design System* document that
downstream coding tasks reference as the visual source-of-truth.

The **Design Knowledge Base** is the memory subsystem that backs that stage.
Rather than letting the LLM hallucinate a brand-new design language for every
project, the knowledge base provides three layers of grounded, industry-specific
design references that are injected into the DesignAgent prompt:

1. **57B Design Library** — manually curated, institutionally-approved
   guidelines per industry (AI, FinTech / Web3, SaaS).
2. **Style Specs** — vision-analysed design tokens extracted from user-uploaded
   reference screenshots.
3. **Trend Captures** — auto-discovered references screenshotted from trending
   industry websites, refreshed on demand.

All three sources are unified as records of `kind: design-knowledge` in a single
file-backed memory store, recalled by industry, condensed for token-efficiency,
and injected into the DesignAgent as **authoritative references** that override
the LLM's generic defaults.

---

## 2. Storage Model

### 2.1 Filesystem Layout

```
AgenticBuilder/
├── .memory/
│   ├── .lock-target                       # proper-lockfile sentinel
│   ├── metrics.json                       # per-record hits + lastHitAt (gitignored)
│   └── records/
│       ├── design-knowledge/              # the primary kind
│       │   ├── DK-57b-ai.md
│       │   ├── DK-57b-fintech.md
│       │   ├── DK-57b-saas.md
│       │   ├── DK-vision-<uuid>.md        # user-uploaded Style Specs
│       │   └── DK-auto-<industry>-<date>-<n>-<site>.md
│       └── design-pattern/                # historical design outcomes
│           └── DP-<uuid>.md
├── .blueprint/
│   ├── design-references/                 # per-project copies of selected refs
│   └── skills/design/                     # design skill prompt fragments
├── public/
│   └── knowledge-refs/                    # image binaries for references
└── src/
    └── lib/memory/knowledge/              # ingestion + library code
```

All design knowledge records live in **L1 (cross-project) memory**. They are
never written into L2 (project-scoped) memory; this is intentional so that the
library accumulates across every project the user generates.

### 2.2 Record File Format

Each record is a single `.md` file with a JSON-in-YAML-fence frontmatter and a
Markdown body:

```markdown
---
{"id":"DK-57b-saas","layer":"L1","kind":"design-knowledge",
 "title":"57B Design Guidelines — SaaS/Enterprise Applications",
 "tags":["industry:saas","source:57b-guidelines","manual:approved"],
 "source":"manual","createdAt":1778751820292,"updatedAt":1778751820292,
 "metrics":{"score":0.9,"hits":5,"lastHitAt":1778800000000}}
---

# 57B Design Guidelines — SaaS/Enterprise Applications

## Visual Identity
...
```

The frontmatter is JSON (not classic YAML) so that the read/write path can use a
strict `JSON.parse` without a YAML dependency, while still letting humans browse
records as ordinary Markdown in GitHub or Obsidian.

#### Frontmatter fields

| Field | Type | Notes |
|---|---|---|
| `id` | string | Stable identifier; used in citations (`<memory-cite ids="DK-…" />`). |
| `layer` | `"L1"` | Always L1 for design knowledge. |
| `kind` | `"design-knowledge"` \| `"design-pattern"` | Drives recall routing. |
| `title` | string | Display label in the Knowledge UI. |
| `tags` | string[] | Namespaced tags (see §2.3). |
| `source` | `"manual"` \| `"distill"` \| `"trend-capture"` | Provenance hint. |
| `createdAt` / `updatedAt` | epoch ms | |
| `metrics` | `{ score, hits, lastHitAt }` | Maintained out-of-band in `metrics.json`; mirrored here for recall scoring. |

#### Tag namespaces

Tags are flat strings but follow a `namespace:value` convention:

- `industry:ai` / `industry:fintech-web3` / `industry:saas` / `industry:generic`
- `source:57b-guidelines` / `source:vision-distill` / `source:trend-capture`
- `manual:approved` — bypasses scoring; always injected when its industry matches
- `image:<filename>` — reverse pointer to the binary in `public/knowledge-refs/`
- `site:<hostname>` / `url:<full-url>` — only on trend captures
- `tier:S` / `projectType:<x>` — only on `design-pattern` records

### 2.3 The Two Kinds

| Kind | Role | Lifecycle |
|---|---|---|
| `design-knowledge` | Reference material the DesignAgent consults *before* generating a design. | Persistent; pruned only for trend-captures after 30 d. |
| `design-pattern` | Historical outcomes — what worked / what didn't on prior projects. | Written by the pipeline after a successful generation; recalled as soft hints. |

The current corpus is roughly 48 records, ~30 KB aggregate. Individual records
range from ~300 B (a single 57B guideline section) up to ~25 KB (a full Style
Spec including its HTML preview).

---

## 3. Knowledge Source #1 — The 57B Design Library

### 3.1 What it is

The 57B library is the curated, human-authored baseline. Three records — one
per supported vertical — are seeded into L1 memory at first boot:

- `DK-57b-ai` — AI / ML / LLM / agent-builder products
- `DK-57b-fintech` — Blockchain, DeFi, crypto, trading
- `DK-57b-saas` — SaaS dashboards, enterprise, B2B management tools

The content lives as hard-coded TypeScript in
[src/lib/memory/knowledge/57b-library.ts](src/lib/memory/knowledge/57b-library.ts)
and is re-seeded on demand via `POST /api/memory/knowledge/seed`.

### 3.2 Content shape

Each library record's body is hand-written Markdown organised into:

1. **Visual Identity** — colour palette, brand accent, gradients, dark/light
   mode guidance.
2. **Typography & Layout** — font pairs, heading scale, whitespace rules, grid
   patterns.
3. **Component Aesthetic** — cards, buttons, forms, tables, badges, pricing
   cards.
4. **Reference Screenshot Analysis** — five or six real product examples
   (Collabix, Picktime, Earnify, bullXT, …) with what makes each work.
5. **Copywriting Tone** — CTA framing, headline patterns, brand voice per
   vertical.

A representative excerpt for SaaS:

> - **Primary**: trustworthy blue (`#3B82F6`, `#4F46E5`)
> - **Secondary**: success green (`#10B981`), warning orange (`#F59E0B`)
> - **Background**: white (`#FFFFFF`) + light gray alternates (`#F1F5F9`, `#F8FAFC`)
> - **Typography**: Inter for UI, optional Geist for landing pages
> - **Spacing**: 24 px gutters, 80 – 100 px section gaps minimum
> - **Components**: 4 px radius cards, 44 px form inputs, 3-column pricing grid

### 3.3 Why it is privileged

These records carry the `manual:approved` tag. During recall, that tag bypasses
the scoring system — if its industry matches the project, it is **always**
injected. The library is the floor: even if the user has never uploaded an
image or refreshed trends, the agent has these as references.

---

## 4. Knowledge Source #2 — Style Specs from Reference Images

### 4.1 Ingestion flow

```
user upload                           pipeline-driven refresh
     │                                          │
     ▼                                          ▼
POST /api/memory/knowledge/upload    POST /api/memory/knowledge/refresh
     │                                          │
     │  save binary → public/knowledge-refs/   discoverTrendUrls()
     │                                          │  captureScreenshot()
     └──────────┬───────────────────────────────┘
                ▼
       vision-analyser.ts → analyseImageToStyleSpec(image)
                │
                │   model: openai/gpt-5.4   temp: 0.3   max_tokens: 3072
                ▼
       StyleSpec JSON (industry, palette, typography, spacing, …)
                │
                ▼
       compose-body.ts → composeStyleSpecRecordBody(spec)
                │
                ▼
       file-store.put({ kind: "design-knowledge", tags: […], body: md })
```

### 4.2 The StyleSpec JSON schema

Defined in `style-spec/types.ts`. The full schema:

```ts
interface StyleSpec {
  industry: "ai" | "fintech-web3" | "saas" | "generic";
  imagePath: string;          // e.g. "/knowledge-refs/ai-1.png"
  imageName: string;          // e.g. "ai-1.png"
  summary: string;            // 1–2 sentence description
  vibe: string[];             // 3–6 adjectives, e.g. ["minimal", "dark"]

  palette: {
    primary: string; secondary: string; accent: string;
    background: string; surface: string;
    text: string; textMuted: string; border: string;
    success: string; warning: string; danger: string;
  };

  typography: {
    headingFont: string;      // real Google or system font
    bodyFont: string;
    monoFont: string;
    headingWeight: number;    // e.g. 600
    bodyWeight: number;       // e.g. 400
    baseSizePx: number;       // e.g. 16
    notes: string[];          // e.g. ["tabular nums in KPIs"]
  };

  spacing: { basePx: number; scalePx: number[] };  // e.g. [4,8,12,16,24,32,48,64]
  radius:  { smPx: number; mdPx: number; lgPx: number; pillPx: number };
  shadows: string[];          // raw CSS box-shadow strings

  gradients: Array<{
    id: string;
    type: "linear" | "radial" | "conic";
    angleDeg: number;
    stops: Array<{ color: string; positionPct: number; opacity: number }>;
    usage: string;            // human description, e.g. "main hero background"
  }>;

  surfaceEffects: Array<{
    name: string;             // e.g. "glassmorphism"
    description: string;
    cssHints: string[];       // e.g. ["backdrop-filter: blur(12px)"]
  }>;

  stateTokens: Array<{
    component: string;        // e.g. "button.primary"
    state: "default" | "hover" | "focus" | "disabled" | "active";
    treatment: string;        // visual description
  }>;

  components: {               // free-form per-component blocks
    button?: object; card?: object; input?: object; table?: object; …
  };

  layout: string;             // one-line layout summary, e.g.
                              //   "fixed left sidebar + hero + KPI grid + alert feed"

  visualElements: Array<{
    name: string;             // e.g. "hero headline"
    col: 1 | 2 | 3;           // position in a 3×3 grid
    row: 1 | 2 | 3;
    zoom: number;             // crop magnification, e.g. 2.5
  }>;                         // max 5 entries
}
```

#### Validation

After the vision model returns, the JSON is validated and normalised before it
is persisted:

- All colours forced to lowercase 6-digit hex (`#rrggbb`).
- Font names checked against a whitelist of real Google Fonts + system fonts.
- Spacing / radius values must be numeric `px`.
- `stateTokens` must use a known `component.variant` and a known `state`.
- `visualElements` is clamped to at most 5; out-of-range `col`/`row` rejected.

### 4.3 The record body format

`composeStyleSpecRecordBody` produces a Markdown document with three sections:

```markdown
<!-- style-spec:json
{ … full StyleSpec JSON, pretty-printed … }
-->

# Style Spec — ai-1.png

## Style Spec (Markdown)
### Palette
- Primary: brand purple (#8B5CF6)
- Secondary: cyan accent (#06B6D4)
- Background: deep dark (#0A0A0F)
### Typography
- Heading: Inter 600 …
### Spacing
- Base 8 px, scale 4/8/12/16/24/32/48/64
…

## Style Spec (HTML)
```html
<!DOCTYPE html>
<html>… full self-contained preview document …</html>
```
```

The three sections each serve a distinct consumer:

| Section | Consumer | Reason |
|---|---|---|
| `<!-- style-spec:json … -->` HTML comment | Programmatic readers (`extractStyleSpecJson()`) | Round-trip the structured spec without parsing Markdown. |
| `## Style Spec (Markdown)` | DesignAgent prompt injection | Token-efficient; ~2 KB per record. |
| `## Style Spec (HTML)` | Knowledge UI iframe preview | Visual fidelity for the user, never sent to the LLM. |

---

## 5. Knowledge Source #3 — Trend Captures

### 5.1 The pipeline

`trend-capture/pipeline.ts` orchestrates auto-discovery:

1. **Discover** — call `discoverTrendUrls(industry, year)` against
   `openai/gpt-4o` (default). The prompt asks for *"recent flagship products,
   SaaS dashboards, or landing pages in the given vertical"*. Expected
   response: `{ sites: [{ name, url }] }`.
2. **Screenshot** — for each URL, hit the Microlink API to render a full-page
   screenshot. Save to `public/knowledge-refs/auto-<industry>-<date>-<idx>-<site>.png`.
3. **Analyse** — feed the screenshot through the same vision analyser used for
   manual uploads.
4. **Persist** — write a `design-knowledge` record with tags
   `source:trend-capture`, `industry:<x>`, `site:<host>`, `url:<full>`.
5. **Prune** — delete any existing trend-capture records older than 30 days
   (matched by tag + `createdAt`).

### 5.2 Trigger surface

`POST /api/memory/knowledge/refresh` with optional query string:

| Param | Default | Notes |
|---|---|---|
| `industry` | (all three) | One of `ai`, `fintech-web3`, `saas`. Omit to refresh every vertical. |
| `count` | `5` | Number of sites per industry (1 – 10). |

The endpoint is fire-and-forget from the UI; progress is reported via the
records list refreshing once the pipeline completes per-industry.

### 5.3 Why prune to 30 days

Trend captures are explicitly ephemeral. The point is *current* market visual
language — last week's landing-page hero treatments, not last year's. A 30-day
floor is a deliberate trade-off: long enough for a project that spans a sprint
to see stable references, short enough to keep the recall surface fresh.

If a particular trend capture is exceptionally good, the user can rebrand it as
a manual upload (effectively moving it under `source:vision-distill`, which is
exempt from auto-prune).

---

## 6. LLM-Driven Analysis

### 6.1 Vision analysis (Style Spec extraction)

| Setting | Value |
|---|---|
| Model | `openai/gpt-5.4` (vision-capable) |
| Temperature | `0.3` |
| Max tokens | `3072` |
| System prompt | `vision-analyser.ts` (~110 lines) |

The system prompt instructs the model to:

- Classify the image into one of four industry buckets.
- Return strict JSON conforming to `StyleSpec` (no prose, no fences).
- Use real font names (Google Fonts or system).
- Provide numeric px values for spacing and radius (no `rem`, no `em`).
- Identify up to five UI regions in a 3×3 grid (`visualElements`) for later
  crop-zoom previewing.
- Prefer surfacing gradients, surface effects (e.g. glassmorphism), and state
  tokens when visible.

### 6.2 Trend URL discovery

| Setting | Value |
|---|---|
| Model | `openai/gpt-4o` (configurable) |
| Task | Given `industry` + current year, return N trending website URLs. |
| Response | `{ sites: [{ name: string, url: string }] }` |

The prompt nudges the model toward flagship products and live, accessible URLs.
A small validator checks URLs parse correctly and have a resolvable hostname
before they enter the screenshot step.

---

## 7. Recall and Injection into the DesignAgent

### 7.1 Industry detection

The entry point is `recallDesignContext()` in
`src/lib/agents/preparation/preparation-recall.ts`. It begins with a
keyword-based industry detector against the PRD content:

```ts
function detectIndustry(prdContent: string): Industry | null {
  const lc = prdContent.toLowerCase();
  if (matches(lc, ["ai", "llm", "gpt", "ml", "neural", "agent-builder", …]))
    return "ai";
  if (matches(lc, ["web3", "blockchain", "defi", "crypto", "wallet", "smart-contract", …]))
    return "fintech-web3";
  if (matches(lc, ["saas", "dashboard", "analytics", "enterprise", "b2b", "crm", "billing", …]))
    return "saas";
  return null;
}
```

A `null` return means *fall back to generic*, not *fail*.

### 7.2 Two-phase recall

```ts
// Phase 1 — design patterns (historical outcomes, soft hints)
const patterns = await getSystemMemory().recall({
  layer: "L1",
  kinds: ["design-pattern"],
  tags: { any: [`tier:${tier}`, `projectType:${projectType}`] },
  limit: 3,
});

// Phase 2 — design knowledge (the reference library)
const primaryTags = industry
  ? { any: [`industry:${industry}`] }
  : { any: ["source:57b-guidelines", "industry:generic"] };

let knowledge = await getSystemMemory().recall({
  layer: "L1",
  kinds: ["design-knowledge"],
  tags: primaryTags,
  limit: 6,
});

// Widening fallback when the primary tag yields too little
if (knowledge.length < 2) {
  knowledge = await getSystemMemory().recall({
    layer: "L1",
    kinds: ["design-knowledge"],
    limit: 6,
  });
}
```

The fallback exists because a brand-new project with an unusual PRD can fail
both the industry detector and the per-industry recall; rather than ship the
agent with no references, the system widens to "any design knowledge we've got".

### 7.3 Scoring

Recall scoring weights live in `recall-config.ts`:

- **Recency** — exponential decay with a 7-day half-life.
- **Hits** — frequency boost from `metrics.hits`.
- **Tag relevance** — exact industry match dominates; `manual:approved`
  short-circuits to maximum score.
- **Manual override** — `manual:approved` records always win their slot.

`metrics.json` is updated on every successful recall (incrementing `hits` and
overwriting `lastHitAt`). It is *not* recomputed on a schedule — it is purely
event-driven.

### 7.4 Condensing for token-efficiency

A raw Style Spec record is ~25 KB because of its HTML preview block. Six of
those would blow through any reasonable injection budget. Before injection,
each record is rewritten by `condenseStyleSpecForRecall()`:

1. Drop the `## Style Spec (HTML)` section entirely.
2. Keep the `## Style Spec (Markdown)` section (palette, typography, spacing,
   components — narrative form).
3. Extract a synthesised `:root { … }` CSS variables block (concrete tokens
   the agent can paste verbatim).

Result: ~2 KB per record, so six records fit comfortably inside the **4 000-token
budget** for the design knowledge block (the design-pattern block has its own
~1 500-token budget; combined design context lands around 5 500 tokens).

### 7.5 Prompt injection

Condensed records are wrapped in an explanatory header before they enter the
prompt:

```
## Design Knowledge Base (matched industry: ai)

The following records come from the 57B design knowledge library and from
AI-analysed reference screenshots (Style Specs). Each Style Spec includes a
colour palette, typography, spacing, radius, CSS variables and named UI
element regions derived from a real product screenshot.

When generating the Design System Spec:
- Use the palette hex values, font names and spacing scale from the
  closest-matching Style Spec as primary design tokens.
- Apply the component descriptions and layout patterns as structural
  guidance.
- The CSS variables block (`:root { … }`) can be used verbatim in
  generated CSS.
- Treat these records as **authoritative references** — override generic
  LLM defaults with the concrete values found here.

[…rendered records…]
```

This wrapped block is added to the DesignAgent's user message as
`additionalContext`, **above** the PRD and design task instructions. The
position matters: putting the knowledge first means the model sees concrete
tokens before it encounters anything that could trigger generic-design defaults.

---

## 8. The DesignAgent

### 8.1 Where it lives

`src/lib/agents/design/design-agent.ts` defines `class DesignAgent extends
BaseAgent`. The system prompt (~60 lines) constrains the output strictly:

> Produce a **single complete HTML Design System document**. No markdown
> fences. No separate files. The document must be a self-contained
> `<!DOCTYPE html> … </html>` with inlined CSS.

### 8.2 Required document structure

The system prompt enumerates required sections, in order:

1. Left TOC sidebar — 220 px fixed.
2. Hero section — product name, one-line description, style badges.
3. Color System — `:root` swatch table + palette grid.
4. Typography — font pairs + scale table.
5. Spacing — visual bar scale.
6. Radius + Shadows.
7. Components — buttons, badges, inputs, tabs, cards, KPI grid, data table,
   alert feed.
8. Page Patterns — sidebar nav, top-bar, domain-specific patterns.
9. CSS Token Quick Reference — the `:root { … }` block as code.

### 8.3 Model configuration

| Provider | Model | Temperature | Max tokens |
|---|---|---|---|
| OpenRouter (default) | `openai/gpt-5.4` | 0.7 | 32 000 |
| DeepSeek direct (opt-in) | `deepseek-v4-pro` | 0.7 | 96 000 |

The provider switch is governed by either `LLM_PROVIDER=openrouter` or
`USE_OPENROUTER=1`; DeepSeek direct is selected when neither is set and
DeepSeek credentials are present.

### 8.4 Citation contract

When the agent uses a knowledge record, it is asked to emit:

```html
<memory-cite ids="DK-57b-ai,DK-vision-9f12e0" />
```

Inside the generated HTML. The post-processor strips these tags before the
document is shown to the user but records the citation against
`metrics.json` so future recall can up-weight the cited records.

---

## 9. API Surface

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/memory/knowledge/records` | `GET` | List all design-knowledge records grouped by industry; library entries first, then newest first. Powers the Knowledge UI. |
| `/api/memory/knowledge/seed` | `POST` | (Re-)write the three 57B library records. Idempotent. |
| `/api/memory/knowledge/upload` | `POST` | Multipart upload: saves the image to `public/knowledge-refs/`, runs the vision analyser, persists a `design-knowledge` record. |
| `/api/memory/knowledge/refresh` | `POST` | Run the trend-capture pipeline. Query params: `industry`, `count`. |
| `/api/memory/knowledge/records/[id]` | `DELETE` | Delete a custom Style Spec or trend capture. 57B library records are protected. |
| `/api/memory/design/*` | various | Project-scoped helpers: read the current project's design selection, persist style choice from the design-group UI step. |
| `/api/agents/generate-design-styles` | `POST` | Lightweight pre-design step: takes the PRD and returns five candidate *style options* (label + short rationale + palette swatch). Used in the design-group UI to let the user pick a direction before the DesignAgent runs. **Distinct from the knowledge base.** |
| `/api/agents/pipeline/design-references` | `POST` | Pipeline-internal: snapshots the records that will be injected for a given project into `.blueprint/design-references/` so the run is reproducible. |

---

## 10. The User-Facing Knowledge UI

`src/app/(dashboard)/knowledge/page.tsx` is the management surface.

**Layout** — tabbed by industry (AI / FinTech / SaaS), with three stacked
sections inside each tab:

1. **Library** — the 57B guidelines (read-only).
2. **Generated Style Specs** — vision-analysed user uploads.
3. **Daily Trend Refreshes** — auto-discovered references (with a relative
   timestamp; older than 30 days are no longer present because they were
   pruned by the refresh pipeline).

**Per-record actions:**

- **Preview** — opens a modal with three tabs:
  - *HTML*: the full Style Spec document rendered in an iframe.
  - *Markdown*: the condensed `## Style Spec (Markdown)` section.
  - *Raw*: the JSON style spec, for advanced inspection.
- **Delete** — only available for non-library records.

**Global actions:**

- **Upload reference** — file picker; triggers `/upload`.
- **Refresh trends** — per-industry or all; triggers `/refresh`.
- **Re-seed 57B library** — re-writes the three baseline records (used
  primarily when the library code itself has been updated).

---

## 11. Per-Project Snapshotting

The `.blueprint/design-references/` directory is the per-project snapshot of
exactly which records were used for that project's design generation. This
sidesteps a subtle reproducibility problem: design knowledge is a *living*
library — trend captures get pruned, new uploads land, scores shift — so two
re-runs of "the same" project could see different references.

When a project's design step starts, the pipeline copies the recalled-and-
condensed records into `.blueprint/design-references/<project-id>/` along with
a manifest. If the user later re-runs the design step (see
[[incremental-rerun-initiative]]), the manifest is honoured so the same
references are re-injected.

---

## 12. Memory Store Mechanics

### 12.1 FileStore backend

`src/lib/memory/file-store.ts` provides the persistence layer:

- **Read** — `getById(id)`, `recall(query)`. Recall does an in-memory pass
  over every record file in the kind directory; the corpus is small enough
  (< 50 records, < 100 KB) that this is fine — no index is maintained.
- **Write** — `put(record)`, `delete(id)`. Writes go through an in-process
  Promise chain to serialise per-store; cross-process safety is provided by
  `proper-lockfile` on `.memory/.lock-target`.
- **Metrics** — kept in a separate `.memory/metrics.json` rather than mutating
  record files on every recall (otherwise every read would touch every file's
  mtime, which would break diff-friendly review of the corpus). The
  `metrics` field on the record frontmatter is a *cache* of the metrics file,
  flushed when the record is otherwise written.

### 12.2 Recall query shape

```ts
type RecallQuery = {
  layer: "L1" | "L2";
  kinds: string[];                          // OR over kinds
  tags?: { any?: string[]; all?: string[] };
  limit?: number;
  minScore?: number;
};
```

Tag semantics:

- `any` — record matches if *any* tag is present (OR).
- `all` — record matches only if *every* tag is present (AND).
- Combined — both must be satisfied if both are supplied.

---

## 13. Configuration Reference

| Setting | Default | Where | Notes |
|---|---|---|---|
| DesignAgent model | `openai/gpt-5.4` | `model-config.ts:73` | DeepSeek direct overrides if env present. |
| DesignAgent temperature | `0.7` | `model-config.ts` | |
| DesignAgent max tokens | `32 000` / `96 000` | `model-config.ts` | OpenRouter / DeepSeek-direct. |
| Vision analysis model | `openai/gpt-5.4` | `vision-analyser.ts:26` | |
| Vision analysis temperature | `0.3` | `vision-analyser.ts` | |
| Vision analysis max tokens | `3 072` | `vision-analyser.ts` | |
| Trend discovery model | `openai/gpt-4o` | `trend-capture/discover.ts` | |
| Design knowledge recall limit | `6` | `preparation-recall.ts` | |
| Design pattern recall limit | `3` | `preparation-recall.ts` | |
| Design knowledge token budget | `4 000` | `preparation-recall.ts` | Post-condensation. |
| Design pattern token budget | `1 500` | `preparation-recall.ts` | |
| Trend-capture TTL | `30 days` | `trend-capture/pipeline.ts` | |
| Image directory | `public/knowledge-refs/` | | URL prefix `/knowledge-refs/`. |
| `MEMORY_DESIGN_INJECT` | `true` | env | Disable to A/B the agent without knowledge injection. |
| `LLM_PROVIDER` / `USE_OPENROUTER` | unset | env | Switch DesignAgent to OpenRouter. |

---

## 14. End-to-End Data Flow

```
                ┌───────────────────────────────────────────┐
   user PRD  ──▶│  detectIndustry(prd) → ai|fintech|saas|—  │
                └───────────────────────────────────────────┘
                                  │
                                  ▼
              ┌─────────────────────────────────────────────────────────┐
              │           recallDesignContext({ prd, industry })        │
              │                                                         │
              │  1. recall design-pattern (tier / projectType)          │
              │  2. recall design-knowledge:                            │
              │       primary: any:[industry:<x>]               limit 6 │
              │       fallback: any:[source:57b, industry:generic]      │
              │       widen: kinds-only                                 │
              │  3. condense Style Specs (drop HTML; keep MD + :root)   │
              │  4. wrap in header + injection instructions             │
              └─────────────────────────────────────────────────────────┘
                                  │
                                  ▼
              ┌─────────────────────────────────────────────────────────┐
              │            DesignAgent(additionalContext + PRD)         │
              │   model gpt-5.4   temp 0.7   max 32 000 tokens          │
              │   output: <!DOCTYPE html> … </html>                     │
              │           + <memory-cite ids="DK-…" /> tags             │
              └─────────────────────────────────────────────────────────┘
                                  │
                                  ▼
              ┌─────────────────────────────────────────────────────────┐
              │   post-process: strip cite tags → bump metrics.hits     │
              │   snapshot recalled records into                        │
              │      .blueprint/design-references/<projectId>/          │
              └─────────────────────────────────────────────────────────┘
                                  │
                                  ▼
                       Design System HTML (committed to project)
```

---

## 15. Known Limitations and Future Work

**Today's limitations**

- Recall is tag-based only — no vector / semantic similarity over StyleSpecs.
  Two records about "dark futuristic dashboards" don't reinforce each other
  unless they share an industry tag.
- The vision analyser is single-model (`gpt-5.4`); if it fails or returns
  malformed JSON, the upload fails outright rather than falling back.
- Industry detection is keyword-based and English-only. Non-English PRDs land
  in `industry:null` and rely on the widening fallback.
- Trend captures auto-delete after 30 days, even ones with high hit counts;
  there is no "promote to permanent" path other than re-uploading manually.
- The `visualElements` 3×3 grid is fixed; richer references with more than
  five interesting regions are truncated.

**Plausible next steps**

- Add an embedding index over the condensed Markdown body so recall can do
  semantic ranking within an industry slice.
- Persist a "promote to permanent" flag on trend captures that the user finds
  particularly compelling.
- Add a multilingual industry detector (or move detection from keywords to a
  cheap classifier call).
- Multi-model vision with consensus / fallback for robustness.
- Component-level extraction — pull individual buttons, cards, forms out of a
  captured screenshot into their own browseable sub-library.
- Outcome feedback loop: when a generated design is shipped, write a
  `design-pattern` record citing which `design-knowledge` records influenced
  it and what worked.

---

## 16. Quick Reference for Implementers

**I want to add a new industry**

1. Add the bucket to the `Industry` union in `style-spec/types.ts`.
2. Add a hand-written library record to `57b-library.ts`.
3. Extend `detectIndustry()` with the relevant keywords.
4. The recall, condense, and inject paths are industry-agnostic — no changes
   required.

**I want to inject more / fewer references**

- Tune `limit` in the `recall` calls inside `preparation-recall.ts`.
- If you raise the limit, also raise the 4 000-token budget or improve the
  condenser.

**I want to disable design knowledge injection for an experiment**

- Set `MEMORY_DESIGN_INJECT=false`. The DesignAgent will run with PRD only.

**I want to inspect what was injected for a past project**

- Read `.blueprint/design-references/<projectId>/manifest.json` and the
  sibling record files. They are the exact bytes that went into the
  `additionalContext` block.

**I want to re-analyse an already-uploaded image**

- Currently: delete the record via `/records/[id]`, then re-upload. There is
  no in-place re-analyse endpoint yet.

---

*Document end.*
