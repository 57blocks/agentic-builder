# Demo HTML Snapshot Capture — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capture each demo page's rendered HTML/CSS as a self-contained `kind:"html"` design reference bound to the same `PAGE-id` the screenshot uses, reusing the existing capture pipeline.

**Architecture:** The Electron `render-reference-url` handler returns raw HTML ingredients alongside the screenshot; a pure TS assembler turns them into one self-contained `.html`; a new `fetch-html` route persists it via the existing `addDesignReference` (which already supports `kind:"html"`); the auto-capture flow posts it after the screenshot, guarded by the same role-gate redirect check.

**Tech Stack:** TypeScript, Next.js (route handlers), Electron (main + preload), Zustand store, Vitest (node env).

**Spec:** `docs/superpowers/specs/2026-06-26-demo-html-capture-design.md`

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `src/app/api/agents/pipeline/design-references/_url-slug.ts` | Shared `urlToFileSlug` helper | Create |
| `src/app/api/agents/pipeline/design-references/fetch-url/route.ts` | Use shared slug helper | Modify |
| `src/lib/design/dom-snapshot.ts` | Pure `buildSelfContainedHtml` assembler | Create |
| `src/lib/design/format-reference-tokens.ts` | Add `htmlCapture` to `ReferenceCaptureResult` | Modify |
| `src/app/api/agents/pipeline/design-references/fetch-html/route.ts` | Persist HTML as `kind:"html"` reference | Create |
| `electron/main.js` | Capture raw HTML ingredients in the same render | Modify |
| `src/store/pipeline-store.ts` | `fetchUrlHtmlReference` store action | Modify |
| `src/app/(dashboard)/project/[projectId]/_steps/preparation/design-group/design/ui.tsx` | Post HTML snapshot in `captureOne` + per-card fetch | Modify |

Test command (single file): `npx vitest run <path-to-test>`
Full suite: `npx vitest run`

---

## Task 1: Extract shared `urlToFileSlug`

**Files:**
- Create: `src/app/api/agents/pipeline/design-references/_url-slug.ts`
- Test: `src/app/api/agents/pipeline/design-references/__tests__/url-slug.test.ts`
- Modify: `src/app/api/agents/pipeline/design-references/fetch-url/route.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/app/api/agents/pipeline/design-references/__tests__/url-slug.test.ts
import { describe, it, expect } from "vitest";
import { urlToFileSlug } from "../_url-slug";

describe("urlToFileSlug", () => {
  it("slugs host + pathname, lowercased", () => {
    expect(urlToFileSlug("https://csma-demo2.vercel.app/family/dashboard"))
      .toBe("csma-demo2-vercel-app-family-dashboard");
  });
  it("same URL → same slug (in-place dedup), distinct URLs differ", () => {
    const a = urlToFileSlug("https://x.app/a");
    expect(urlToFileSlug("https://x.app/a")).toBe(a);
    expect(urlToFileSlug("https://x.app/b")).not.toBe(a);
  });
  it("unparseable input is slugged from the raw string", () => {
    expect(urlToFileSlug("not a url")).toBe("not-a-url");
  });
  it("empty/undefined → 'url-capture'", () => {
    expect(urlToFileSlug("")).toBe("url-capture");
    expect(urlToFileSlug(undefined)).toBe("url-capture");
  });
  it("caps length at 120 chars", () => {
    expect(urlToFileSlug("https://x.app/" + "a".repeat(500)).length).toBeLessThanOrEqual(120);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/agents/pipeline/design-references/__tests__/url-slug.test.ts`
Expected: FAIL — cannot find module `../_url-slug`.

- [ ] **Step 3: Create the shared helper**

```ts
// src/app/api/agents/pipeline/design-references/_url-slug.ts
/**
 * Stable, filesystem-safe slug from a capture URL (host + path). Distinct URLs
 * → distinct fileNames; the SAME URL re-captured → same fileName so
 * `addDesignReference` replaces it in place. Falls back to "url-capture".
 */
export function urlToFileSlug(url: string | undefined): string {
  const raw = (url ?? "").trim();
  let base = raw;
  try {
    const u = new URL(raw);
    base = `${u.host}${u.pathname}`;
  } catch {
    // not a parseable URL — slug the raw string
  }
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return slug || "url-capture";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/api/agents/pipeline/design-references/__tests__/url-slug.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Replace the local copy in `fetch-url/route.ts`**

In `src/app/api/agents/pipeline/design-references/fetch-url/route.ts`: delete the local `function urlToFileSlug(...) {...}` definition and add the import near the top:

```ts
import { urlToFileSlug } from "../_url-slug";
```

- [ ] **Step 6: Verify nothing else broke**

Run: `npx vitest run` and `npx tsc --noEmit`
Expected: PASS / no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/agents/pipeline/design-references/_url-slug.ts \
        src/app/api/agents/pipeline/design-references/__tests__/url-slug.test.ts \
        src/app/api/agents/pipeline/design-references/fetch-url/route.ts
git commit -m "refactor(design-refs): extract shared urlToFileSlug helper"
```

---

## Task 2: `buildSelfContainedHtml` pure assembler

**Files:**
- Create: `src/lib/design/dom-snapshot.ts`
- Test: `src/lib/design/__tests__/dom-snapshot.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/design/__tests__/dom-snapshot.test.ts
import { describe, it, expect } from "vitest";
import { buildSelfContainedHtml } from "../dom-snapshot";

const base = "https://demo.app/family/dashboard";

describe("buildSelfContainedHtml", () => {
  it("strips inline and external <script> tags", () => {
    const out = buildSelfContainedHtml({
      outerHTML: `<html><head></head><body><script>alert(1)</script><script src="/a.js"></script><p>hi</p></body></html>`,
      stylesheets: [],
      baseUrl: base,
    });
    expect(out).not.toContain("<script");
    expect(out).toContain("<p>hi</p>");
  });

  it("inlines stylesheets into a single <style> before </head>", () => {
    const out = buildSelfContainedHtml({
      outerHTML: `<html><head><title>t</title></head><body></body></html>`,
      stylesheets: [":root{--a:1}", ".x{color:red}"],
      baseUrl: base,
    });
    expect(out).toMatch(/<style[^>]*>[\s\S]*:root\{--a:1\}[\s\S]*\.x\{color:red\}[\s\S]*<\/style>\s*<\/head>/);
  });

  it("absolutises relative src/href, leaves absolute and data: intact", () => {
    const out = buildSelfContainedHtml({
      outerHTML: `<img src="/img/a.png"><a href="../x">x</a><img src="https://cdn.app/b.png"><img src="data:image/png;base64,AA">`,
      stylesheets: [],
      baseUrl: base,
    });
    expect(out).toContain(`src="https://demo.app/img/a.png"`);
    expect(out).toContain(`href="https://demo.app/family/x"`);
    expect(out).toContain(`src="https://cdn.app/b.png"`);
    expect(out).toContain(`src="data:image/png;base64,AA"`);
  });

  it("emits no <style> tag when there are no stylesheets", () => {
    const out = buildSelfContainedHtml({
      outerHTML: `<html><head></head><body></body></html>`,
      stylesheets: [],
      baseUrl: base,
    });
    expect(out).not.toContain("<style");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/design/__tests__/dom-snapshot.test.ts`
Expected: FAIL — cannot find module `../dom-snapshot`.

- [ ] **Step 3: Create the assembler**

```ts
// src/lib/design/dom-snapshot.ts
/**
 * Pure, DOM-free assembler that turns the raw HTML ingredients captured by
 * Electron's `render-reference-url` into one self-contained HTML document:
 *   1. strips <script> blocks (the snapshot is a design spec, never runtime code)
 *   2. absolutises relative src/href so assets resolve when opened standalone
 *   3. inlines all captured stylesheet cssText into a single <style>
 *
 * Kept free of any Electron / DOM dependency so it is unit-testable in Node.
 */
export interface RawHtmlCapture {
  /** document.documentElement.outerHTML from the rendered page. */
  outerHTML: string;
  /** cssText of same-origin stylesheets, in document order. */
  stylesheets: string[];
  /** location.href of the captured page, used to absolutise relative URLs. */
  baseUrl: string;
}

function absolutiseUrls(html: string, baseUrl: string): string {
  return html.replace(
    /\b(src|href)=("|')(.*?)\2/gi,
    (match, attr: string, quote: string, value: string) => {
      if (!value || /^(https?:|data:|mailto:|tel:|#|javascript:)/i.test(value)) {
        return match;
      }
      try {
        const abs = new URL(value, baseUrl).href;
        return `${attr}=${quote}${abs}${quote}`;
      } catch {
        return match;
      }
    },
  );
}

export function buildSelfContainedHtml(capture: RawHtmlCapture): string {
  const { outerHTML, stylesheets, baseUrl } = capture;

  let html = outerHTML
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<script\b[^>]*\/>/gi, "");

  html = absolutiseUrls(html, baseUrl);

  const css = stylesheets.filter((s) => s && s.trim().length > 0).join("\n");
  if (css) {
    const styleBlock = `<style data-reference-inlined>\n${css}\n</style>`;
    html = /<\/head>/i.test(html)
      ? html.replace(/<\/head>/i, `${styleBlock}\n</head>`)
      : `${styleBlock}\n${html}`;
  }

  return html;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/design/__tests__/dom-snapshot.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/design/dom-snapshot.ts src/lib/design/__tests__/dom-snapshot.test.ts
git commit -m "feat(design): pure buildSelfContainedHtml snapshot assembler"
```

---

## Task 3: Extend `ReferenceCaptureResult` with `htmlCapture`

**Files:**
- Modify: `src/lib/design/format-reference-tokens.ts`

- [ ] **Step 1: Add the field**

In `src/lib/design/format-reference-tokens.ts`, inside `export interface ReferenceCaptureResult { ... }`, add after the `links?` field:

```ts
  /**
   * Raw ingredients for a self-contained HTML snapshot (best-effort; null when
   * extraction failed). Assembled into a single .html by
   * `buildSelfContainedHtml` (see dom-snapshot.ts) before persistence.
   */
  htmlCapture?: {
    outerHTML: string;
    /** cssText of same-origin stylesheets, in document order. */
    stylesheets: string[];
    baseUrl: string;
  } | null;
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/design/format-reference-tokens.ts
git commit -m "feat(design): add htmlCapture field to ReferenceCaptureResult"
```

---

## Task 4: `fetch-html` route — persist HTML as a `kind:"html"` reference

**Files:**
- Create: `src/app/api/agents/pipeline/design-references/fetch-html/route.ts`
- Test: `src/app/api/agents/pipeline/design-references/__tests__/fetch-html.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/app/api/agents/pipeline/design-references/__tests__/fetch-html.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const addDesignReference = vi.fn();
vi.mock("@/lib/pipeline/design-references", () => ({ addDesignReference }));

import { POST } from "../fetch-html/route";

function req(body: unknown, projectId?: string) {
  const url = `http://localhost/api/agents/pipeline/design-references/fetch-html${projectId ? `?projectId=${projectId}` : ""}`;
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  addDesignReference.mockReset();
  addDesignReference.mockResolvedValue({
    ok: true,
    entry: { id: "ref_1", pageHint: "PAGE-003" },
    manifest: [{ id: "ref_1" }],
  });
});

describe("POST /design-references/fetch-html", () => {
  it("persists html as a kind:html reference bound to the pageHint", async () => {
    const res = await POST(req({ url: "https://demo.app/family/dashboard", html: "<html></html>", pageHint: "PAGE-003" }, "proj1") as never);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toMatchObject({ ok: true, referenceId: "ref_1", pageHint: "PAGE-003" });
    expect(addDesignReference).toHaveBeenCalledTimes(1);
    const [, input] = addDesignReference.mock.calls[0];
    expect(input).toMatchObject({
      mime: "text/html",
      label: "https://demo.app/family/dashboard",
      pageHint: "PAGE-003",
      source: "url",
      matchedBy: "manual",
      projectId: "proj1",
    });
    expect(input.fileName).toBe("demo-app-family-dashboard.html");
    expect(Buffer.isBuffer(input.bytes)).toBe(true);
  });

  it("rejects when html is missing", async () => {
    const res = await POST(req({ url: "https://demo.app/x" }) as never);
    expect(res.status).toBe(400);
    expect(addDesignReference).not.toHaveBeenCalled();
  });

  it("surfaces addDesignReference failures", async () => {
    addDesignReference.mockResolvedValue({ ok: false, error: "too big", status: 413 });
    const res = await POST(req({ url: "https://demo.app/x", html: "<html></html>", pageHint: "PAGE-1" }) as never);
    expect(res.status).toBe(413);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/agents/pipeline/design-references/__tests__/fetch-html.test.ts`
Expected: FAIL — cannot find module `../fetch-html/route`.

- [ ] **Step 3: Create the route**

```ts
// src/app/api/agents/pipeline/design-references/fetch-html/route.ts
import { NextRequest, NextResponse } from "next/server";
import { addDesignReference } from "@/lib/pipeline/design-references";
import { urlToFileSlug } from "../_url-slug";

export const runtime = "nodejs";

function projectRoot() {
  return process.cwd();
}

/**
 * Persists a captured self-contained HTML snapshot to the design-reference
 * store as a `kind:"html"` entry, bound to the page's PAGE-id (manual). Sibling
 * to `fetch-url` (which stores the screenshot). Both share one PAGE-id, so they
 * land on the same Route-Mapping card.
 *
 * Body: { url, html, pageHint?, projectId? }
 */
export async function POST(request: NextRequest) {
  let body: { url?: string; html?: string; pageHint?: string; projectId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { url, html, pageHint } = body;
  const projectId =
    new URL(request.url).searchParams.get("projectId") ||
    (typeof body.projectId === "string" && body.projectId ? body.projectId : undefined);

  if (!html || typeof html !== "string" || html.trim().length === 0) {
    return NextResponse.json({ error: "html is required." }, { status: 400 });
  }

  const buffer = Buffer.from(html, "utf-8");
  const fileName = `${urlToFileSlug(url)}.html`;
  const isManual = typeof pageHint === "string" && pageHint.trim().length > 0;

  const result = await addDesignReference(projectRoot(), {
    fileName,
    mime: "text/html",
    bytes: buffer,
    label: typeof url === "string" ? url.trim().slice(0, 200) : "",
    pageHint: isManual ? pageHint!.trim() : "",
    source: "url",
    matchedBy: isManual ? "manual" : "auto",
    projectId,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    referenceId: result.entry.id,
    pageHint: result.entry.pageHint || null,
    references: result.manifest,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/api/agents/pipeline/design-references/__tests__/fetch-html.test.ts`
Expected: PASS (3 tests). If `new Request(...)` typing trips the handler signature, the `as never` cast in the test already absorbs it.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/agents/pipeline/design-references/fetch-html/route.ts \
        src/app/api/agents/pipeline/design-references/__tests__/fetch-html.test.ts
git commit -m "feat(design-refs): fetch-html route persists kind:html reference"
```

---

## Task 5: Electron — capture raw HTML ingredients in the same render

**Files:**
- Modify: `electron/main.js`

> Not unit-testable (Electron runtime). Verified manually in Task 8.

- [ ] **Step 1: Add the capture script constant**

In `electron/main.js`, next to `TOKEN_EXTRACT_SCRIPT`, add:

```js
// HTML_CAPTURE_SCRIPT — runs in the rendered reference page. Returns the raw
// ingredients for a self-contained snapshot: the hydrated outerHTML (Tailwind
// classes intact), the cssText of every SAME-ORIGIN stylesheet (cross-origin
// sheets throw on cssRules access — skipped, mirroring TOKEN_EXTRACT_SCRIPT),
// and the page URL for absolutising relative asset URLs (done in TS).
const HTML_CAPTURE_SCRIPT = `(() => {
  const stylesheets = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let rules;
    try { rules = sheet.cssRules; } catch (e) { continue; } // cross-origin: skip
    if (!rules) continue;
    let css = "";
    for (const rule of Array.from(rules)) css += rule.cssText + "\\n";
    if (css) stylesheets.push(css);
  }
  return JSON.stringify({
    outerHTML: document.documentElement.outerHTML,
    stylesheets,
    baseUrl: location.href,
  });
})()`;
```

- [ ] **Step 2: Run the script during capture and add it to the return value**

In the `render-reference-url` handler, after the existing token-extraction block (the `let tokens = null; try { ... TOKEN_EXTRACT_SCRIPT ... }` block) and before the link-discovery block, add:

```js
    // Best-effort HTML snapshot ingredients (independent of screenshot success).
    let htmlCapture = null;
    try {
      const json = await win.webContents.executeJavaScript(HTML_CAPTURE_SCRIPT, true);
      htmlCapture = JSON.parse(json);
    } catch {
      /* htmlCapture stays null; screenshot + tokens are still returned */
    }
```

Then add `htmlCapture` to the success `return { ... }` object:

```js
    return {
      ok: true,
      screenshotDataUrl: `data:image/jpeg;base64,${data}`,
      tokens,
      links,
      finalUrl: win.webContents.getURL() || url,
      htmlCapture,
    };
```

- [ ] **Step 3: Verify Electron still builds**

Run: `npx tsc --noEmit` (TS types only; `electron/main.js` is plain JS and is not type-checked, so this just confirms the rest of the tree is clean).
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add electron/main.js
git commit -m "feat(electron): render-reference-url returns raw htmlCapture ingredients"
```

---

## Task 6: Pipeline store — `fetchUrlHtmlReference` action

**Files:**
- Modify: `src/store/pipeline-store.ts`

> Mirrors `fetchUrlDesignReference`; verified via the capture flow in Task 8.

- [ ] **Step 1: Add the interface method**

In `src/store/pipeline-store.ts`, immediately after the `fetchUrlDesignReference: (...) => Promise<...>;` declaration in the `PipelineState` interface, add:

```ts
  /** Persist a captured self-contained HTML snapshot as a kind:html reference
   *  bound to the page's PAGE-id (manual). Sibling to fetchUrlDesignReference. */
  fetchUrlHtmlReference: (
    url: string,
    html: string,
    pageHint?: string,
  ) => Promise<{ referenceId: string; pageHint: string | null } | null>;
```

- [ ] **Step 2: Add the implementation**

Immediately after the `fetchUrlDesignReference: async (...) => { ... },` implementation block, add:

```ts
      fetchUrlHtmlReference: async (url, html, pageHint) => {
        set({ designReferencesLoading: "uploading", designReferencesError: null });
        try {
          const pid = designReferenceProjectIdParam();
          const resp = await fetch(
            `/api/agents/pipeline/design-references/fetch-html${pid ? `?${pid}` : ""}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url, html, pageHint }),
            },
          );
          const data = (await resp.json().catch(() => ({}))) as {
            error?: string;
            referenceId?: string;
            pageHint?: string | null;
            references?: DesignReferenceSummary[];
          };
          if (!resp.ok) {
            set({
              designReferencesLoading: "idle",
              designReferencesError: data.error || "Failed to persist HTML snapshot.",
            });
            return null;
          }
          if (Array.isArray(data.references)) {
            set({ designReferences: data.references, designReferencesLoading: "idle", designReferencesError: null });
          } else {
            set({ designReferencesLoading: "idle", designReferencesError: null });
          }
          return { referenceId: data.referenceId ?? "", pageHint: data.pageHint ?? null };
        } catch (err) {
          set({
            designReferencesLoading: "idle",
            designReferencesError: err instanceof Error ? err.message : "Network error.",
          });
          return null;
        }
      },
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/store/pipeline-store.ts
git commit -m "feat(store): fetchUrlHtmlReference posts snapshot to fetch-html"
```

---

## Task 7: Wire HTML capture into the auto-capture flow

**Files:**
- Modify: `src/app/(dashboard)/project/[projectId]/_steps/preparation/design-group/design/ui.tsx`

> Verified via the capture flow in Task 8.

- [ ] **Step 1: Import the assembler**

Near the existing design imports in `ui.tsx`, add:

```ts
import { buildSelfContainedHtml } from "@/lib/design/dom-snapshot";
```

- [ ] **Step 2: Post the HTML snapshot inside `captureOne`**

In `handleAutoCaptureFromEntry`, locate the `captureOne` body where the screenshot is persisted:

```ts
            await usePipelineStore
              .getState()
              .fetchUrlDesignReference(url, shot, cssToken, pageHint);
            return links;
```

Replace with (adds the HTML post, guarded by the SAME redirect check already applied above for the screenshot — note `finalUrl`/`isSameRoutePath` are already in scope in this function):

```ts
            await usePipelineStore
              .getState()
              .fetchUrlDesignReference(url, shot, cssToken, pageHint);

            // Additional artifact: self-contained HTML snapshot bound to the same
            // PAGE-id. Only when the page rendered itself (not a role-gate
            // redirect — already checked above) and ingredients were captured.
            const htmlCapture = result?.htmlCapture;
            if (htmlCapture && htmlCapture.outerHTML) {
              try {
                const snapshot = buildSelfContainedHtml(htmlCapture);
                await usePipelineStore
                  .getState()
                  .fetchUrlHtmlReference(url, snapshot, pageHint);
              } catch (e) {
                console.warn(
                  `[DesignUI] html snapshot persist failed for ${url}: ${e instanceof Error ? e.message : String(e)}`,
                );
              }
            }
            return links;
```

- [ ] **Step 3: Apply the same addition to the per-card URL fetch path**

In `handleFetchRouteUrl` (the per-card `onFetchRouteUrl` handler, around the second `renderReferenceUrl` call site near line 1087–1094), after its `fetchUrlDesignReference(...)` call, add the identical guarded block:

```ts
              const htmlCapture = result?.htmlCapture;
              if (htmlCapture && htmlCapture.outerHTML) {
                try {
                  const snapshot = buildSelfContainedHtml(htmlCapture);
                  await usePipelineStore
                    .getState()
                    .fetchUrlHtmlReference(url, snapshot, pageHint);
                } catch (e) {
                  console.warn(
                    `[DesignUI] html snapshot persist failed for ${url}: ${e instanceof Error ? e.message : String(e)}`,
                  );
                }
              }
```

(Use the `url`/`pageHint`/`result` names as they appear in that handler; if the per-card handler names the hint `route.id`, pass that as `pageHint`.)

- [ ] **Step 4: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(dashboard)/project/[projectId]/_steps/preparation/design-group/design/ui.tsx"
git commit -m "feat(design-ui): persist HTML snapshot alongside screenshot in capture"
```

---

## Task 8: Manual integration acceptance

**Files:** none (verification only)

- [ ] **Step 1: Build & launch the desktop app**

Run the project's Electron dev launch (per the project README / `run` skill). Open a project that has a demo URL and a PRD with page routes.

- [ ] **Step 2: Run auto-capture from the entry URL**

In the Design step's Route-Mapping panel, run "auto-capture from one entry URL" against `https://csma-demo2.vercel.app/auth`.

- [ ] **Step 3: Verify both artifacts per page**

Inspect `.blueprint/projects/<projectId>/design-references/manifest.json`. Expected: for each captured PRD page, **two** entries sharing one `pageHint` (`PAGE-xxx`) — one `kind:"image"` (`*.jpg/png`) and one `kind:"html"` (`*.html`).

- [ ] **Step 4: Verify the snapshot renders**

Open one stored `*.html` from the design-references dir in a browser. Expected: it renders close to the live demo page (layout + styling intact via the inlined `<style>`), scripts inert, no console-fatal asset errors that break layout.

- [ ] **Step 5: Verify isolation**

Confirm a project with **no** demo URL captures nothing new and the existing screenshot-only behavior is unchanged.

- [ ] **Step 6: Commit any notes**

If acceptance surfaces fixes, capture them as follow-up tasks; otherwise no commit.

---

## Self-Review

- **Spec coverage:** §1 Electron capture → Task 5; §2 assembler → Task 2; §3 type → Task 3; §3 persist route → Task 4 (+ shared slug Task 1); §4 wiring → Tasks 6–7; storage/mirror = no change (covered by existing `addDesignReference`/`copyDesignReferencesToOutput`, verified Task 8); PRD-anchored binding invariant = inherent (no code), verified by capture set in Task 8; acceptance → Task 8. ✓
- **Placeholder scan:** none — every code step carries full code.
- **Type consistency:** `htmlCapture: { outerHTML; stylesheets; baseUrl }` identical in `ReferenceCaptureResult` (Task 3), `RawHtmlCapture` (Task 2), and `HTML_CAPTURE_SCRIPT` JSON (Task 5). `fetchUrlHtmlReference(url, html, pageHint)` identical in interface (Task 6 Step 1) and impl (Step 2) and call sites (Task 7). `fetch-html` body `{ url, html, pageHint }` identical in store (Task 6) and route (Task 4). ✓
