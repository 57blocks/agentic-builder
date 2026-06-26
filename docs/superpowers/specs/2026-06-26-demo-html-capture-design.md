# Demo Page HTML Snapshot Capture

**Date:** 2026-06-26
**Branch:** feature/demo-html-capture
**Status:** Draft (pending user review)

---

## Overview

When a PRD has a matching online demo, the coding phase currently reconstructs
each frontend page from a **screenshot + extracted CSS tokens**. An LLM eyeballing
a screenshot cannot recover exact DOM structure, spacing, class names, or
component hierarchy, so visual fidelity suffers.

This spec covers **capturing each demo page's rendered HTML/CSS as a
self-contained, reusable artifact**, bound to the same PRD page id the screenshot
already binds to. It is the **foundation** for a larger initiative and is
deliberately scoped to *capture + storage only* — it does **not** decide how the
artifact is consumed.

### The larger initiative (context only — NOT this spec)

The end goal is higher frontend fidelity for the "PRD + matching demo" scenario,
decomposed into three sequential sub-projects:

1. **Demo HTML capture (THIS SPEC)** — capture and store each demo page's
   self-contained HTML snapshot as a `kind: "html"` design reference.
2. **Structure-port phase** — a new pipeline step (after `design`/`mockup`,
   before `task-breakdown`) that copies the tier scaffold and uses a dedicated
   LLM agent to port each demo page's HTML into idiomatic components + routes,
   with logic stubbed.
3. **Task-breakdown port-awareness** — frontend tasks become "wire logic into
   the already-created page files" instead of "create the page from scratch".

Sub-projects 2 and 3 get their own specs once this foundation lands and proves
out. Keeping capture independent of consumption means the artifact serves
*either* a structure-port phase *or* on-demand `read_file` reference, without
re-work.

---

## Goals / Non-Goals

**Goals**
- For every demo page captured via the existing "auto-capture from one entry
  URL" flow (and the per-card URL fetch), produce a **self-contained HTML
  snapshot** of the rendered page and persist it as a `kind: "html"` design
  reference bound to that page's `PAGE-id`.
- Reuse the entire existing capture pipeline (route enumeration, role-aware
  session seeding, param-route discovery, role-gate redirect protection,
  per-project storage, kickoff mirroring).
- Keep the existing screenshot capture unchanged; the HTML snapshot is an
  **additional** artifact, not a replacement.

**Non-Goals (explicitly out of scope)**
- The structure-port phase (sub-project 2) and any code generation from the HTML.
- Any `task-breakdown` change (sub-project 3).
- Per-task prompt injection of the HTML, or any change to how
  `formatDesignReferencesPromptBlock` is consumed at coding time.
- "Cleaning / distillation" of the snapshot (stripping framework noise, dropping
  standard Tailwind utility CSS). That is a consumption-time concern owned by
  sub-project 2. **This spec stores the faithful raw self-contained snapshot.**
- A migration/fidelity gate (screenshot-diff). Deferred.

---

## Background — existing mechanisms reused

| Concern | Existing code |
|---|---|
| Render a URL in a hidden window, return screenshot + CSS tokens + same-origin links + finalUrl | `electron/main.js` → `render-reference-url` handler |
| Capture result shape | `ReferenceCaptureResult` in `src/lib/design/format-reference-tokens.ts` |
| Electron API type | `renderReferenceUrl` in `src/types/electron.d.ts` |
| Reference store (supports `kind: "image" | "html"`), per-project layout, kickoff mirror | `src/lib/pipeline/design-references.ts` (`addDesignReference`, `DesignReferenceEntry`, `copyDesignReferencesToOutput`, `MAX_BYTES_HTML`) |
| URL screenshot persistence endpoint | `src/app/api/agents/pipeline/design-references/fetch-url/route.ts` (`urlToFileSlug`) |
| PRD page extraction → `PAGE-id` + optional `route` | `src/lib/requirements/prd-page-hints.ts` (`extractPrdPageHints`) |
| Auto-capture-from-entry crawl + per-card fetch + redirect guard | `src/app/(dashboard)/project/[projectId]/_steps/preparation/design-group/design/ui.tsx` (`handleAutoCaptureFromEntry`, `captureOne`, `isSameRoutePath`, `buildMockupSessionSeed`) |
| Pipeline store URL-reference action | `fetchUrlDesignReference` in `@/store/pipeline-store` |

Key fact: the demo (`csma-demo2.vercel.app`) is a **Vite + React + Tailwind** SPA
with a single same-origin CSS bundle (~63KB) and clean semantic CSS tokens.
Same-origin stylesheets are readable via `cssRules`; the rendered DOM carries
Tailwind utility classes directly portable to the target (also Tailwind v4).

---

## Design

### 1. Electron — collect raw HTML pieces (`electron/main.js`)

In the **same render pass** that produces the screenshot, after the existing
`TOKEN_EXTRACT_SCRIPT` run, execute one more in-page script that returns the raw
ingredients for a snapshot (not the assembled file — assembly is pure TS, see §2):

```js
// HTML_CAPTURE_SCRIPT — runs in the rendered reference page.
// Returns { outerHTML, stylesheets, baseUrl }.
//  - outerHTML: document.documentElement.outerHTML (hydrated DOM, classes intact)
//  - stylesheets: cssText of every SAME-ORIGIN stylesheet (cross-origin sheets
//    throw on cssRules access — skipped, mirroring TOKEN_EXTRACT_SCRIPT)
//  - baseUrl: location.href (for absolutising relative asset URLs in TS)
```

Add the result to the handler's return value as a new field. `ReferenceCaptureResult`
(in `format-reference-tokens.ts`) gains:

```ts
/** Raw ingredients for a self-contained HTML snapshot (best-effort; null on failure). */
htmlCapture?: {
  outerHTML: string;
  /** cssText of same-origin stylesheets, in document order. */
  stylesheets: string[];
  baseUrl: string;
} | null;
```

Same best-effort discipline as `tokens`: a failure leaves `htmlCapture: null` and
never blocks the screenshot. `src/types/electron.d.ts` needs no change (it
references `ReferenceCaptureResult`).

### 2. Pure assembler (`src/lib/design/dom-snapshot.ts`, NEW)

A single pure, dependency-free, unit-testable function — assembly lives in TS, not
Electron JS, so it is testable and not duplicated:

```ts
export function buildSelfContainedHtml(capture: {
  outerHTML: string;
  stylesheets: string[];
  baseUrl: string;
}): string;
```

Responsibilities:
1. Parse/operate on `outerHTML` as a string (regex/string ops — no DOM dependency
   so it runs in Node tests).
2. **Strip all `<script>...</script>` blocks** (snapshot is a design spec, never
   runtime code).
3. **Inline the stylesheets** into a single `<style>` injected into `<head>`
   (concatenate `stylesheets` in order).
4. **Absolutise relative asset URLs** in `src`/`href` attributes against `baseUrl`
   (so images/fonts resolve when the file is opened standalone). CSS `url(...)`
   absolutisation is **best-effort** in v1 (documented limitation).
5. Return the assembled HTML string.

### 3. Persist as a `kind: "html"` reference

New route `src/app/api/agents/pipeline/design-references/fetch-html/route.ts`
(mirrors `fetch-url/route.ts`):

- Body: `{ url, html, pageHint?, projectId? }`.
- `fileName = urlToFileSlug(url) + ".html"` (reuse the slug helper — re-capturing
  the same URL replaces the entry in place, distinct URLs stay distinct).
- Calls `addDesignReference(projectRoot(), { fileName, mime: "text/html", bytes,
  label: url, pageHint, source: "url", matchedBy: "manual", projectId })`.
  `addDesignReference` already resolves `kind: "html"` from the `text/html` mime.
- `pageHint` is the bare `PAGE-id` (manual bind) — same key the screenshot uses,
  so both artifacts land on the same Route-Mapping card.

`urlToFileSlug` is currently module-private in `fetch-url/route.ts`. Extract it to
a tiny shared helper (e.g. `src/app/api/agents/pipeline/design-references/_url-slug.ts`)
and import from both routes. No behavior change.

### 4. Wire into the capture flow (`design/ui.tsx`)

In `captureOne` (inside `handleAutoCaptureFromEntry`), after the existing
screenshot post:

1. If `result.htmlCapture` is present **and** the page was not a role-gate
   redirect (reuse the existing `isSameRoutePath(url, finalUrl)` guard — do **not**
   bind a wrong-role page's HTML, exactly as screenshots are guarded today):
2. `const html = buildSelfContainedHtml(result.htmlCapture);`
3. Post via a new pipeline-store action `fetchUrlHtmlReference(url, html, pageHint)`
   (sibling to `fetchUrlDesignReference`) → POSTs to `fetch-html`.

Apply the same addition to the per-card URL fetch path (`onFetchRouteUrl` /
`handleFetchRouteUrl`) so a single-page manual capture also produces HTML.

### 5. Storage & mirroring (no change)

The new entry is an ordinary manifest row, so it is stored under
`.blueprint/projects/<id>/design-references/` and mirrored into
`<output>/.design-references/` by `copyDesignReferencesToOutput` at kickoff with
no change. Each captured page yields **two** manifest entries (one `image`, one
`html`) sharing one `PAGE-id`.

---

## Error handling & edge cases

- **Cross-origin stylesheets**: unreadable via `cssRules` → skipped (same as token
  extraction). A snapshot may miss externally-hosted CSS; for the self-hosted Vite
  demo this is effectively none. Logged, non-fatal.
- **Scripts**: always stripped by `buildSelfContainedHtml`.
- **Role-gate redirect / needsAuth / no render**: no `htmlCapture` is bound; the
  existing redirect guard prevents binding a wrong page. Screenshot behavior
  unchanged.
- **Snapshot exceeds `MAX_BYTES_HTML` (8MB)**: `addDesignReference` rejects with a
  4xx; the client logs and skips the HTML — the screenshot binding still succeeds.
- **Re-capture**: `urlToFileSlug` dedup replaces the prior `.html` in place; the
  `image` and `html` entries never collide (different extensions).
- **CSS `url(...)` relative paths**: best-effort only in v1 — documented; assets
  referenced from inlined CSS may 404 when the file is opened standalone. Does not
  affect structure/class fidelity.

---

## Testing

**Unit — `dom-snapshot.ts` (`buildSelfContainedHtml`)**
- Strips every `<script>` block (inline + `src`).
- Inlines N stylesheets into a single `<head><style>` in order.
- Absolutises relative `src`/`href` against `baseUrl`; leaves absolute URLs intact.
- Empty `stylesheets` → valid HTML, no empty `<style>` noise.
- Large input within bounds returns assembled string (no throw).

**Unit — `fetch-html` route**
- Valid body → one `kind: "html"` manifest entry, correct `pageHint`, `source:"url"`,
  `matchedBy:"manual"`.
- Same URL twice → single entry replaced in place (slug dedup).
- Missing `html` → 400.

**Unit — shared `urlToFileSlug`**
- Behavior identical after extraction (port existing expectations).

**Manual / integration acceptance**
- Run auto-capture-from-entry against `https://csma-demo2.vercel.app/auth`.
- Verify each PRD page card shows a bound screenshot **and** that the manifest has
  a sibling `html` entry with the matching `PAGE-id`.
- Open a stored `.html` from `.blueprint/projects/<id>/design-references/` in a
  browser and confirm it renders close to the live demo page (structure + styling
  intact, scripts inert).

---

## Open questions (deferred to sub-project 2)

- **Consumption path**: structure-port phase vs on-demand `read_file` reference.
  Capture is intentionally agnostic; this decision does not affect this spec.
- **Cleaning/distillation** of the snapshot for prompt economy is a
  consumption-time transform owned by sub-project 2; the raw faithful snapshot
  stored here is the input to whatever cleaning is chosen later.
