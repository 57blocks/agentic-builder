# Reference Screenshot Redesign

**Date:** 2026-06-05  
**Branch:** `feat/reference-screenshot-redesign`  
**Scope:** Design step — Page Restoration mode only. Style Reference tab is unchanged.

---

## Overview

Redesign the Reference Screenshot section of the Design step to support a unified, incremental input model where uploaded images and URL-fetched screenshots are both Vision-matched to PRD routes in real time. The final output is a route → {image, cssToken} mapping consumed by the design agent.

---

## Goals

- Accept two input sources (image uploads + reference URLs) that feed the same Vision auto-match pipeline
- Persist all assets to disk immediately on arrival (not deferred to Generate click)
- Display matching results as a route-card grid; cards update live as matches come in
- Allow users to manually override any match at any time
- Empty route cards expose a per-route URL input for targeted fetching
- Generate button triggers the design agent using the completed mapping

---

## Data Model

### Manifest Entry Changes

Add three fields to `DesignReferenceEntry` in `src/lib/pipeline/design-references.ts`:

```typescript
interface DesignReferenceEntry {
  // Existing fields — unchanged
  id: string
  fileName: string
  storedFileName: string
  mime: string
  bytes: number
  kind: "image" | "html"
  label: string            // repurposed: stores sourceUrl for URL entries
  pageHint: string         // bound route (PAGE-001, /login, etc.)
  uploadedAt: string

  // New fields
  source: "upload" | "url"                      // origin of this asset
  matchedBy: "auto" | "manual"                  // how pageHint was set
  matchConfidence?: "high" | "medium" | "low"   // present only for auto matches
  cssToken?: Record<string, string>             // present only for URL source entries
}
```

---

## Data Flow

Three input paths, all feeding the same matching engine:

```
[Upload images]  ──────────────────────────────────────────┐
                                                            ▼
[Paste URL list] → URL Fetcher (screenshot + cssToken) → Vision Auto-Match → Route Mapping
                                                            ▲              (manifest.json)
[Click empty route → enter URL] ───────────────────────────┘ (skip Vision, write pageHint directly)
```

### Matching Rules

- Vision confidence must be ≥ `medium` to write a `pageHint`
- If a route already has a match, incoming match replaces it only if `newConfidence > existingConfidence`
- Entries with `matchedBy: "manual"` are never replaced by auto-match, regardless of confidence
- Per-route URL input sets `matchedBy: "manual"` and bypasses Vision entirely

### cssToken Availability

- `source: "upload"` entries have no `cssToken` (image only)
- `source: "url"` entries carry the cssToken extracted from the fetched page
- UI must clearly indicate which routes have CSS token and which do not

---

## UI Design

### Approach: Route Cards as Primary View

Layout: vertical stack — input zone at top, route card grid below, Generate button at bottom.

#### Top Input Zone

Two side-by-side panels:
- **Left:** Image drop zone. Accepts PNG / JPG / WebP / GIF, ≤ 6 MB each, ≤ 24 total. On drop: save to disk immediately, trigger Vision auto-match.
- **Right:** Multi-line URL textarea + "Fetch Screenshots" button. On click: fetch each URL (screenshot + cssToken), save to disk immediately, trigger Vision auto-match.

Both panels can receive new input at any time. Adding new assets after initial match is fully supported.

#### Route Card Grid

One card per PRD route, derived from `extractPrdPageHints(prdContent)`.

**Card states:**

| State | Border | Description |
|-------|--------|-------------|
| Auto-matched | green solid | Vision matched, shows source badge + confidence + CSS token indicator |
| Manual | purple solid | User-specified via drag or per-route URL input |
| Matching | amber solid | Vision match in progress |
| Unmatched | grey dashed | No match yet; shows URL input field inline |

**Matched card anatomy:**
- Thumbnail (top area)
- Source badge top-left: `URL` (teal) or `Upload` (blue)
- CSS token badge top-right: `CSS ✓` (teal) or `CSS —` (grey)
- Confidence badge bottom-right: `high` / `medium` (auto only)
- `Replace` and `✕` buttons at bottom

**Unmatched card:**
- Drop target — dragging any reference image (uploaded or URL-fetched) onto the card sets `matchedBy: "manual"`
- Inline URL input field — enter URL, press Enter → fetch screenshot + cssToken → bind to this route with `matchedBy: "manual"`

#### Generate Button

Matches existing style: `bg-indigo-600 rounded-lg px-6 py-2.5 font-semibold`, centered, with right-arrow icon.

Label: `Generate based on screenshots`

Disabled when: 0 routes matched (same disable condition as today).

Above the button: summary line — `N of M routes matched · K routes with CSS token`.

**On click (simplified from current logic):**
- All assets are already on disk at this point (no deferred persistence)
- Set `useUploadedDesignReferences: true`
- Call `executeStep("design")`

---

## API Changes

### Modified Endpoints

**`POST /api/agents/pipeline/design-references`**
- Accept new body fields: `source`, `matchedBy`, `cssToken`
- Write all three to manifest entry on creation

**`POST /api/agents/pipeline/design-references/auto-match`**
- Return `confidence` per matched entry
- Before writing `pageHint`, compare against existing entry's `matchConfidence`
- Skip entries where `matchedBy === "manual"`

### New Endpoint

**`POST /api/agents/pipeline/design-references/fetch-url`**

Request:
```typescript
{
  url: string
  pageHint?: string   // if provided: skip Vision, write directly as manual
}
```

Response:
```typescript
{
  referenceId: string
  pageHint: string | null
  confidence: "high" | "medium" | "low" | null
  hasCssToken: boolean
}
```

Behavior:
1. Fetch URL via existing URL fetcher (screenshot + cssToken)
2. Save screenshot to `.blueprint/design-references/` with `source: "url"`
3. If `pageHint` provided: write directly, `matchedBy: "manual"`, return
4. Otherwise: trigger auto-match against PRD routes, write best match if confidence ≥ medium

This endpoint is used by both the bulk URL input and the per-route card URL input. When the bulk URL textarea submits multiple URLs, the client calls this endpoint for each URL in parallel (not serially) to avoid compounding latency.

---

## Component Changes

| Component | Action |
|-----------|--------|
| `PageScreenshotsPanel.tsx` | Delete — replaced by `RouteReferenceGrid` |
| `ui.tsx` Page Restoration section | Rewrite to Route Cards layout |
| `ui.tsx` Style Reference tab | No change |
| `ui.tsx` Generate button handler | Remove `urlFetchedPages` persistence loop; rest unchanged |
| `design-references.ts` | Add new fields to `DesignReferenceEntry`; add `fetch-url` handler logic |

### New Component: `RouteReferenceGrid`

**Props:**
```typescript
interface RouteReferenceGridProps {
  prdContent: string                        // used to extract route list
  references: DesignReferenceSummary[]      // from pipeline store
  onUpload: (files: File[]) => void
  onFetchUrl: (url: string, pageHint?: string) => void
  onReplace: (routeId: string) => void
  onRemove: (referenceId: string) => void
  onDrop: (referenceId: string, pageHint: string) => void  // drag override
}
```

**Internal behavior:**
- Derives route list from `extractPrdPageHints(prdContent)`
- Joins routes with `references` by `pageHint`
- Renders one card per route in current card state
- Handles drag-and-drop between cards

---

## Behavioral Changes Summary

| Aspect | Before | After |
|--------|--------|-------|
| URL screenshot persistence | Deferred to Generate click | Immediate on fetch |
| Auto-match trigger | Bulk upload only | Every upload / URL fetch |
| Conflict resolution | Last write wins | Higher confidence wins; manual is sticky |
| `urlFetchedPages` state | Primary state for URL screenshots | Removed |
| Per-route URL input | Not available | Inline in each unmatched card |
| cssToken storage | Not persisted per-route | Stored in manifest, per URL-source entry |

---

## Out of Scope

- Style Reference tab (unchanged)
- Existing auto-match Vision LLM provider (OpenRouter GPT-4o, unchanged)
- Downstream coding agent consumption of design references (unchanged)
- Max file limits (24 images, 6 MB — unchanged)
