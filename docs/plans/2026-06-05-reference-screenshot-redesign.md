# Reference Screenshot Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Page Restoration upload UI with a real-time route-card grid where images and URL-fetched screenshots are Vision auto-matched to PRD routes and persisted to disk immediately.

**Architecture:** Three input paths (image upload, bulk URL paste, per-route URL) all feed a single Vision matching queue; matched assets are written to `.blueprint/design-references/manifest.json` immediately with `source`, `matchedBy`, `matchConfidence`, and `cssToken` metadata. The Generate button is simplified to a pure trigger — all assets are already on disk.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Zustand, Tailwind CSS, Vitest, OpenRouter Vision LLM (gpt-4o)

---

## File Map

| Action | Path |
|--------|------|
| Modify | `src/lib/pipeline/design-references.ts` |
| Create | `src/lib/__tests__/design-references.test.ts` |
| Modify | `src/app/api/agents/pipeline/design-references/route.ts` |
| Modify | `src/app/api/agents/pipeline/design-references/[id]/route.ts` |
| Modify | `src/app/api/agents/pipeline/design-references/auto-match/route.ts` |
| Create | `src/app/api/agents/pipeline/design-references/fetch-url/route.ts` |
| Modify | `src/store/pipeline-store.ts` |
| Create | `src/components/RouteReferenceGrid.tsx` |
| Modify | `src/app/(dashboard)/project/[projectId]/_steps/preparation/design-group/design/ui.tsx` |
| Delete | `src/components/PageScreenshotsPanel.tsx` |

---

## Task 1: Extend DesignReferenceEntry data model

**Files:**
- Modify: `src/lib/pipeline/design-references.ts`
- Create: `src/lib/__tests__/design-references.test.ts`

- [ ] **Step 1: Write failing tests for new fields**

Create `src/lib/__tests__/design-references.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";
import {
  addDesignReference,
  updateDesignReference,
  readManifest,
} from "../pipeline/design-references";

let tmpDir: string;
beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "design-refs-test-"));
});
afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

const fakePng = Buffer.from("fake-png");

describe("addDesignReference — new fields", () => {
  it("writes source=upload and matchedBy=auto", async () => {
    const r = await addDesignReference(tmpDir, {
      fileName: "a.png", mime: "image/png", bytes: fakePng,
      source: "upload", matchedBy: "auto",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.entry.source).toBe("upload");
    expect(r.entry.matchedBy).toBe("auto");
    expect(r.entry.matchConfidence).toBeUndefined();
    expect(r.entry.cssToken).toBeUndefined();
  });

  it("writes source=url with cssToken", async () => {
    const r = await addDesignReference(tmpDir, {
      fileName: "shot.png", mime: "image/png", bytes: fakePng,
      source: "url", matchedBy: "manual",
      cssToken: { "--color-primary": "#3b82f6" },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.entry.source).toBe("url");
    expect(r.entry.cssToken).toEqual({ "--color-primary": "#3b82f6" });
  });

  it("defaults source=upload matchedBy=auto when omitted", async () => {
    const r = await addDesignReference(tmpDir, {
      fileName: "b.png", mime: "image/png", bytes: fakePng,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.entry.source).toBe("upload");
    expect(r.entry.matchedBy).toBe("auto");
  });
});

describe("updateDesignReference — new fields", () => {
  it("can set pageHint, matchedBy, matchConfidence together", async () => {
    const add = await addDesignReference(tmpDir, {
      fileName: "c.png", mime: "image/png", bytes: fakePng,
      source: "upload", matchedBy: "auto",
    });
    expect(add.ok).toBe(true);
    if (!add.ok) return;
    const updated = await updateDesignReference(tmpDir, add.entry.id, {
      pageHint: "PAGE-001",
      matchedBy: "auto",
      matchConfidence: "high",
    });
    expect(updated?.pageHint).toBe("PAGE-001");
    expect(updated?.matchedBy).toBe("auto");
    expect(updated?.matchConfidence).toBe("high");
  });

  it("can overwrite matchedBy from auto to manual", async () => {
    const add = await addDesignReference(tmpDir, {
      fileName: "d.png", mime: "image/png", bytes: fakePng,
      source: "upload", matchedBy: "auto",
    });
    expect(add.ok).toBe(true);
    if (!add.ok) return;
    const u1 = await updateDesignReference(tmpDir, add.entry.id, {
      pageHint: "PAGE-001", matchedBy: "auto", matchConfidence: "medium",
    });
    expect(u1?.matchedBy).toBe("auto");
    const u2 = await updateDesignReference(tmpDir, add.entry.id, {
      matchedBy: "manual",
    });
    expect(u2?.matchedBy).toBe("manual");
    expect(u2?.matchConfidence).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd /Users/gavinjohn/Downloads/workspace/agentic-builder
npx vitest run src/lib/__tests__/design-references.test.ts
```

Expected: `TypeError` or `Property 'source' does not exist`.

- [ ] **Step 3: Extend DesignReferenceEntry interface**

In `src/lib/pipeline/design-references.ts`, replace the existing `DesignReferenceEntry` interface (lines 31–55) with:

```typescript
export interface DesignReferenceEntry {
  /** Stable random id used for filenames and API routes. */
  id: string;
  /** Original filename supplied by the uploader (display only). */
  fileName: string;
  /** Filename on disk (`<id>.<ext>`); always lives under the references dir. */
  storedFileName: string;
  /** MIME type, e.g. `image/png` or `text/html`. */
  mime: string;
  bytes: number;
  kind: DesignReferenceKind;
  /** Human-readable label. For URL sources, stores the source URL. */
  label: string;
  /**
   * Hint binding this reference to a page/route, e.g. `/login`, `PAGE-01`.
   * Empty string when unassigned.
   */
  pageHint: string;
  /** ISO timestamp. */
  uploadedAt: string;
  /** Where this asset came from. Defaults to "upload" for legacy entries. */
  source: "upload" | "url";
  /** How pageHint was set. "manual" entries are never overwritten by auto-match. */
  matchedBy: "auto" | "manual";
  /** Present only when matchedBy === "auto". */
  matchConfidence?: "high" | "medium" | "low";
  /** CSS custom-property map extracted from the source page. URL sources only. */
  cssToken?: Record<string, string>;
}
```

- [ ] **Step 4: Extend AddDesignReferenceInput**

Find the existing `AddDesignReferenceInput` interface in `design-references.ts` (search for `AddDesignReferenceInput`). Replace it with:

```typescript
export interface AddDesignReferenceInput {
  fileName: string;
  mime: string;
  bytes: Buffer;
  label?: string;
  pageHint?: string;
  source?: "upload" | "url";
  matchedBy?: "auto" | "manual";
  matchConfidence?: "high" | "medium" | "low";
  cssToken?: Record<string, string>;
}
```

- [ ] **Step 5: Backfill new fields in readManifest for legacy entries**

In `readManifest` (around line 146), find the `.map((x): DesignReferenceEntry => {` block. Add backfill for the new fields at the end of the returned object (after `uploadedAt`):

```typescript
        return {
          id: (x as DesignReferenceEntry).id,
          fileName: (x as DesignReferenceEntry).fileName ?? "",
          storedFileName: (x as DesignReferenceEntry).storedFileName,
          mime,
          bytes: (x as DesignReferenceEntry).bytes ?? 0,
          kind: explicitKind ?? inferredKind,
          label: (x as DesignReferenceEntry).label ?? "",
          pageHint: (x as DesignReferenceEntry).pageHint ?? "",
          uploadedAt:
            (x as DesignReferenceEntry).uploadedAt ?? new Date(0).toISOString(),
          // Backfill new fields for entries written before this feature landed.
          source: (x as DesignReferenceEntry).source ?? "upload",
          matchedBy: (x as DesignReferenceEntry).matchedBy ?? "auto",
          ...((x as DesignReferenceEntry).matchConfidence !== undefined && {
            matchConfidence: (x as DesignReferenceEntry).matchConfidence,
          }),
          ...((x as DesignReferenceEntry).cssToken !== undefined && {
            cssToken: (x as DesignReferenceEntry).cssToken,
          }),
        };
```

- [ ] **Step 6: Update addDesignReference to write new fields**

In `addDesignReference`, find the block that builds the `entry` object (around line 243) and add the new fields:

```typescript
  const entry: DesignReferenceEntry = {
    id,
    fileName: input.fileName.slice(0, 200) || `${id}.${resolved.ext}`,
    storedFileName,
    mime: resolved.mime,
    bytes: input.bytes.byteLength,
    kind: resolved.kind,
    label: (input.label ?? "").trim().slice(0, 200),
    pageHint: (input.pageHint ?? "").trim().slice(0, 80),
    uploadedAt: new Date().toISOString(),
    source: input.source ?? "upload",
    matchedBy: input.matchedBy ?? "auto",
    ...(input.matchConfidence !== undefined && { matchConfidence: input.matchConfidence }),
    ...(input.cssToken !== undefined && { cssToken: input.cssToken }),
  };
```

- [ ] **Step 7: Extend UpdateDesignReferenceInput**

Find `UpdateDesignReferenceInput` and replace it:

```typescript
export interface UpdateDesignReferenceInput {
  label?: string;
  pageHint?: string;
  matchedBy?: "auto" | "manual";
  matchConfidence?: "high" | "medium" | "low" | null;
  cssToken?: Record<string, string>;
}
```

- [ ] **Step 8: Update updateDesignReference to apply new fields**

In `updateDesignReference`, replace the `next` object construction:

```typescript
  const next: DesignReferenceEntry = {
    ...current,
    label:
      typeof input.label === "string"
        ? input.label.trim().slice(0, 200)
        : current.label,
    pageHint:
      typeof input.pageHint === "string"
        ? input.pageHint.trim().slice(0, 80)
        : current.pageHint,
    matchedBy: input.matchedBy ?? current.matchedBy,
    // Clearing matchConfidence when switching to manual (pass null to clear)
    matchConfidence:
      input.matchConfidence === null
        ? undefined
        : input.matchConfidence ?? current.matchConfidence,
    cssToken: input.cssToken !== undefined ? input.cssToken : current.cssToken,
  };
```

- [ ] **Step 9: Run tests — expect pass**

```bash
npx vitest run src/lib/__tests__/design-references.test.ts
```

Expected: all tests pass.

- [ ] **Step 10: Commit**

```bash
git add src/lib/pipeline/design-references.ts src/lib/__tests__/design-references.test.ts
git commit -m "feat(design-refs): extend DesignReferenceEntry with source/matchedBy/confidence/cssToken"
```

---

## Task 2: Update autoMatchReferencesToPages — skip manual entries

**Files:**
- Modify: `src/lib/pipeline/design-references.ts`

- [ ] **Step 1: Update the imageEntries filter to skip manual entries**

In `autoMatchReferencesToPages` (around line 620), find:

```typescript
  const imageEntries = entries.filter(
    (e) =>
      e.kind === "image" &&
      (options?.force || !e.pageHint.trim()),
  );
```

Replace with:

```typescript
  const imageEntries = entries.filter(
    (e) =>
      e.kind === "image" &&
      e.matchedBy !== "manual" &&
      (options?.force || !e.pageHint.trim()),
  );
```

- [ ] **Step 2: Add a test for the manual-skip behavior**

Append to `src/lib/__tests__/design-references.test.ts`:

```typescript
import {
  addDesignReference,
  updateDesignReference,
  readManifest,
  autoMatchReferencesToPages,
} from "../pipeline/design-references";

// ... (existing imports and setup stay the same)

describe("autoMatchReferencesToPages — manual skip", () => {
  it("does not include manual entries in match candidates", async () => {
    const r = await addDesignReference(tmpDir, {
      fileName: "manual.png", mime: "image/png", bytes: fakePng,
      source: "upload", matchedBy: "manual", pageHint: "PAGE-001",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    // autoMatchReferencesToPages should return empty — nothing to match
    const results = await autoMatchReferencesToPages(
      tmpDir,
      [{ id: "PAGE-001", name: "Dashboard" }],
      { force: true },
    ).catch(() => [] as Awaited<ReturnType<typeof autoMatchReferencesToPages>>);

    const manualEntry = results.find((res) => res.referenceId === r.entry.id);
    expect(manualEntry).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run tests — expect pass**

```bash
npx vitest run src/lib/__tests__/design-references.test.ts
```

Expected: all tests pass. The manual-skip test passes without needing the API key because the filter returns 0 entries and the function exits early.

- [ ] **Step 4: Commit**

```bash
git add src/lib/pipeline/design-references.ts src/lib/__tests__/design-references.test.ts
git commit -m "feat(design-refs): skip manual entries in autoMatchReferencesToPages"
```

---

## Task 3: Update POST /design-references — accept new fields

**Files:**
- Modify: `src/app/api/agents/pipeline/design-references/route.ts`

- [ ] **Step 1: Accept source, matchedBy, cssToken in POST handler**

In `route.ts`, find the form-parsing block (around line 45) where `labels` and `pageHints` are extracted. Add extraction of the three new fields and pass them to `addDesignReference`:

```typescript
  const labels = form.getAll("label").map((v) => (typeof v === "string" ? v : ""));
  const pageHints = form
    .getAll("pageHint")
    .map((v) => (typeof v === "string" ? v : ""));
  const sources = form
    .getAll("source")
    .map((v) => (v === "url" ? "url" : "upload")) as Array<"upload" | "url">;
  const matchedBys = form
    .getAll("matchedBy")
    .map((v) => (v === "manual" ? "manual" : "auto")) as Array<"auto" | "manual">;
  const cssTokensRaw = form
    .getAll("cssToken")
    .map((v) => {
      if (typeof v !== "string" || !v) return undefined;
      try { return JSON.parse(v) as Record<string, string>; } catch { return undefined; }
    });
```

Then in the `addDesignReference` call:

```typescript
    const result = await addDesignReference(projectRoot(), {
      fileName,
      mime,
      bytes: buffer,
      label: labels[i] ?? "",
      pageHint: pageHints[i] ?? "",
      source: sources[i] ?? "upload",
      matchedBy: matchedBys[i] ?? "auto",
      cssToken: cssTokensRaw[i],
    });
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/agents/pipeline/design-references/route.ts
git commit -m "feat(api): pass source/matchedBy/cssToken fields through upload endpoint"
```

---

## Task 4: Update PATCH /design-references/[id] — accept matchedBy

**Files:**
- Modify: `src/app/api/agents/pipeline/design-references/[id]/route.ts`

- [ ] **Step 1: Widen the PATCH body type and pass new fields**

Replace the existing PATCH handler:

```typescript
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  let body: {
    label?: string;
    pageHint?: string;
    matchedBy?: "auto" | "manual";
    matchConfidence?: "high" | "medium" | "low" | null;
    cssToken?: Record<string, string>;
  } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 },
    );
  }
  const updated = await updateDesignReference(projectRoot(), id, {
    label: body.label,
    pageHint: body.pageHint,
    matchedBy: body.matchedBy,
    matchConfidence: body.matchConfidence ?? undefined,
    cssToken: body.cssToken,
  });
  if (!updated) {
    return NextResponse.json(
      { error: `No reference found with id "${id}".` },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true, reference: updated });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/agents/pipeline/design-references/[id]/route.ts
git commit -m "feat(api): PATCH /design-references/[id] accepts matchedBy and matchConfidence"
```

---

## Task 5: Update auto-match endpoint — confidence-wins before persisting

**Files:**
- Modify: `src/app/api/agents/pipeline/design-references/auto-match/route.ts`

- [ ] **Step 1: Replace the persist loop with confidence-wins logic**

Replace the entire persist block (after `results` is returned from `autoMatchReferencesToPages`) with:

```typescript
  const confRank: Record<string, number> = { high: 3, medium: 2, low: 1 };
  let matched = 0;

  for (const result of results) {
    if (!result.assignedPageId) continue;

    // Re-read manifest each iteration to get the latest state
    const currentEntries = await readManifest(projectRoot());

    // Never overwrite a manual assignment on this entry itself
    const thisEntry = currentEntries.find((e) => e.id === result.referenceId);
    if (thisEntry?.matchedBy === "manual") continue;

    // Check if another entry already owns this route
    const existingOwner = currentEntries.find(
      (e) => e.pageHint === result.assignedPageId && e.id !== result.referenceId,
    );

    if (existingOwner) {
      // Never displace a manual owner
      if (existingOwner.matchedBy === "manual") continue;
      // Only displace if new match has strictly higher confidence
      const existingRank = confRank[existingOwner.matchConfidence ?? "low"] ?? 1;
      const newRank = confRank[result.confidence] ?? 1;
      if (newRank <= existingRank) continue;
      // Clear the old owner's pageHint
      await updateDesignReference(projectRoot(), existingOwner.id, {
        pageHint: "",
        matchConfidence: undefined,
      });
    }

    await updateDesignReference(projectRoot(), result.referenceId, {
      pageHint: result.assignedPageId,
      matchedBy: "auto",
      matchConfidence: result.confidence,
    });
    matched += 1;
  }

  const skipped = results.length - matched;
  const references = await readManifest(projectRoot());
  return NextResponse.json({ matched, skipped, references });
```

Also add `readManifest` to the imports at the top:

```typescript
import {
  autoMatchReferencesToPages,
  updateDesignReference,
  readManifest,
  type PageCandidate,
} from "@/lib/pipeline/design-references";
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/agents/pipeline/design-references/auto-match/route.ts
git commit -m "feat(api): auto-match uses confidence-wins; manual assignments are sticky"
```

---

## Task 6: New POST /design-references/fetch-url endpoint

**Files:**
- Create: `src/app/api/agents/pipeline/design-references/fetch-url/route.ts`

This endpoint accepts a screenshot (base64 data URL) + CSS tokens from the client (who captured them via Electron or any other mechanism) and persists them to disk immediately.

- [ ] **Step 1: Create the route file**

Create `src/app/api/agents/pipeline/design-references/fetch-url/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { addDesignReference } from "@/lib/pipeline/design-references";

export const runtime = "nodejs";

function projectRoot() {
  return process.cwd();
}

/**
 * Persists a URL-captured screenshot to .blueprint/design-references/ immediately.
 *
 * The client captures the screenshot (via Electron renderReferenceUrl or similar),
 * then POSTs here so the asset is on disk before auto-match runs.
 *
 * Body:
 *   url              – original source URL (stored as label)
 *   screenshotDataUrl – base64 data: URL of the screenshot (required)
 *   cssToken?        – CSS custom-property map from the page
 *   pageHint?        – if provided, binds directly as manual (skips Vision match)
 */
export async function POST(request: NextRequest) {
  let body: {
    url?: string;
    screenshotDataUrl?: string;
    cssToken?: Record<string, string>;
    pageHint?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { url, screenshotDataUrl, cssToken, pageHint } = body;

  if (!screenshotDataUrl || typeof screenshotDataUrl !== "string") {
    return NextResponse.json(
      { error: "screenshotDataUrl is required." },
      { status: 400 },
    );
  }

  // Parse data URL: data:<mime>;base64,<data>
  const dataUrlMatch = screenshotDataUrl.match(
    /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/,
  );
  if (!dataUrlMatch) {
    return NextResponse.json(
      { error: "screenshotDataUrl must be a base64 PNG, JPEG, or WebP data URL." },
      { status: 400 },
    );
  }

  const mime = dataUrlMatch[1]!;
  const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  const buffer = Buffer.from(dataUrlMatch[2]!, "base64");
  const fileName = `url-capture.${ext}`;
  const isManual = typeof pageHint === "string" && pageHint.trim().length > 0;

  const result = await addDesignReference(projectRoot(), {
    fileName,
    mime,
    bytes: buffer,
    label: typeof url === "string" ? url.trim().slice(0, 200) : "",
    pageHint: isManual ? pageHint!.trim() : "",
    source: "url",
    matchedBy: isManual ? "manual" : "auto",
    cssToken: cssToken && typeof cssToken === "object" ? cssToken : undefined,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    referenceId: result.entry.id,
    pageHint: result.entry.pageHint || null,
    hasCssToken: result.entry.cssToken !== undefined,
    references: result.manifest,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/agents/pipeline/design-references/fetch-url/route.ts
git commit -m "feat(api): add POST /design-references/fetch-url to persist URL screenshots immediately"
```

---

## Task 7: Update pipeline-store.ts — new type fields + fetchUrlDesignReference action

**Files:**
- Modify: `src/store/pipeline-store.ts`

- [ ] **Step 1: Extend DesignReferenceSummary type**

Find `DesignReferenceSummary` (around line 114) and add the new fields:

```typescript
export interface DesignReferenceSummary {
  id: string;
  fileName: string;
  storedFileName: string;
  mime: string;
  bytes: number;
  kind: "image" | "html";
  label: string;
  pageHint: string;
  uploadedAt: string;
  source: "upload" | "url";
  matchedBy: "auto" | "manual";
  matchConfidence?: "high" | "medium" | "low";
  cssToken?: Record<string, string>;
}
```

- [ ] **Step 2: Add fetchUrlDesignReference to the store interface**

Find the store's action interface (search for `uploadDesignReferences:`) and add after `uploadDesignReferences`:

```typescript
  /**
   * Persists a URL-captured screenshot to disk immediately via the fetch-url endpoint.
   * Call autoMatchDesignReferences afterwards to Vision-match unmatched entries.
   *
   * @param url         The source URL (stored as label)
   * @param screenshotDataUrl  Base64 data URL of the captured screenshot
   * @param cssToken    Optional CSS custom-property map from the page
   * @param pageHint    If provided, binds directly as manual (no Vision needed)
   */
  fetchUrlDesignReference: (
    url: string,
    screenshotDataUrl: string,
    cssToken?: Record<string, string>,
    pageHint?: string,
  ) => Promise<{ referenceId: string; pageHint: string | null } | null>;
```

- [ ] **Step 3: Implement fetchUrlDesignReference action**

Inside the `create(...)` call, right after the existing `uploadDesignReferences` implementation, add:

```typescript
      fetchUrlDesignReference: async (url, screenshotDataUrl, cssToken, pageHint) => {
        set({ designReferencesLoading: "uploading", designReferencesError: null });
        try {
          const resp = await fetch(
            "/api/agents/pipeline/design-references/fetch-url",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url, screenshotDataUrl, cssToken, pageHint }),
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
              designReferencesError: data.error || "Failed to persist URL screenshot.",
            });
            return null;
          }
          if (Array.isArray(data.references)) {
            set({ designReferences: data.references, designReferencesLoading: "idle" });
          } else {
            set({ designReferencesLoading: "idle" });
          }
          return {
            referenceId: data.referenceId ?? "",
            pageHint: data.pageHint ?? null,
          };
        } catch (err) {
          set({
            designReferencesLoading: "idle",
            designReferencesError: err instanceof Error ? err.message : "Network error.",
          });
          return null;
        }
      },
```

- [ ] **Step 4: Extend updateDesignReferenceMeta to accept matchedBy**

Find where the store calls `PATCH /design-references/${id}` and update the body type to include `matchedBy`:

```typescript
      updateDesignReferenceMeta: async (id, patch) => {
```

Update the method signature in the interface to:

```typescript
  updateDesignReferenceMeta: (
    id: string,
    patch: {
      label?: string;
      pageHint?: string;
      matchedBy?: "auto" | "manual";
      matchConfidence?: "high" | "medium" | "low" | null;
    },
  ) => Promise<boolean>;
```

The implementation body already passes `patch` directly to `JSON.stringify(patch)`, so no body change needed there.

- [ ] **Step 5: Commit**

```bash
git add src/store/pipeline-store.ts
git commit -m "feat(store): add fetchUrlDesignReference action; extend DesignReferenceSummary type"
```

---

## Task 8: New RouteReferenceGrid component

**Files:**
- Create: `src/components/RouteReferenceGrid.tsx`

This component replaces `PageScreenshotsPanel`. It renders one card per PRD route extracted from `prdContent`, showing match state and allowing drag-and-drop override.

- [ ] **Step 1: Create the component**

Create `src/components/RouteReferenceGrid.tsx`:

```tsx
"use client";

import React, { useRef, useState, useCallback } from "react";
import { ArrowRight, X, RefreshCw, Image } from "lucide-react";
import { extractPrdPageHints } from "@/lib/requirements/prd-page-hints";
import type { DesignReferenceSummary } from "@/store/pipeline-store";

interface RouteReferenceGridProps {
  prdContent: string;
  references: DesignReferenceSummary[];
  isMatching: boolean;
  onUpload: (files: File[]) => void;
  onFetchUrls: (urls: string[]) => void;
  onFetchRouteUrl: (url: string, pageHint: string) => void;
  onRemove: (referenceId: string) => void;
  onDropToRoute: (referenceId: string, pageHint: string) => void;
}

function isImageFile(file: File): boolean {
  return ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"].includes(
    file.type,
  );
}

interface RouteInfo {
  id: string;
  name: string;
}

interface RouteCardProps {
  route: RouteInfo;
  reference: DesignReferenceSummary | undefined;
  isMatchingThis: boolean;
  onRemove: (id: string) => void;
  onDropToRoute: (referenceId: string, pageHint: string) => void;
  onFetchRouteUrl: (url: string, pageHint: string) => void;
}

function RouteCard({
  route,
  reference,
  isMatchingThis,
  onRemove,
  onDropToRoute,
  onFetchRouteUrl,
}: RouteCardProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [routeUrl, setRouteUrl] = useState("");
  const imageUrl = reference
    ? `/api/agents/pipeline/design-references/${reference.id}/file`
    : null;

  const borderColor = reference
    ? reference.matchedBy === "manual"
      ? "border-purple-500"
      : "border-green-500"
    : isMatchingThis
    ? "border-amber-500"
    : isDragOver
    ? "border-indigo-400"
    : "border-slate-700 border-dashed";

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const refId = e.dataTransfer.getData("referenceId");
    if (refId) onDropToRoute(refId, route.id);
  };

  const handleRouteUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = routeUrl.trim();
    if (!trimmed) return;
    onFetchRouteUrl(trimmed, route.id);
    setRouteUrl("");
  };

  return (
    <div
      className={`relative flex flex-col rounded-lg border-2 overflow-hidden bg-slate-900 transition-colors ${borderColor}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Thumbnail area */}
      <div className="relative h-28 bg-slate-800 flex items-center justify-center shrink-0">
        {isMatchingThis && !reference ? (
          <div className="flex flex-col items-center gap-2">
            <RefreshCw size={20} className="text-amber-400 animate-spin" />
            <span className="text-[10px] text-amber-400">Matching…</span>
          </div>
        ) : imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={route.name}
            className="w-full h-full object-cover"
            draggable
            onDragStart={(e) => {
              if (reference) e.dataTransfer.setData("referenceId", reference.id);
            }}
          />
        ) : (
          <Image size={24} className="text-slate-600" />
        )}

        {/* Badges */}
        {reference && (
          <>
            <span
              className={`absolute top-1.5 left-1.5 text-[9px] font-medium px-1.5 py-0.5 rounded ${
                reference.source === "url"
                  ? "bg-teal-700 text-teal-100"
                  : "bg-blue-800 text-blue-200"
              }`}
            >
              {reference.source === "url" ? "URL" : "Upload"}
            </span>
            <span
              className={`absolute top-1.5 right-1.5 text-[9px] font-medium px-1.5 py-0.5 rounded border ${
                reference.cssToken
                  ? "bg-teal-900 border-teal-600 text-teal-300"
                  : "bg-slate-800 border-slate-600 text-slate-500"
              }`}
            >
              {reference.cssToken ? "CSS ✓" : "CSS —"}
            </span>
            {reference.matchedBy === "auto" && reference.matchConfidence && (
              <span className="absolute bottom-1.5 right-1.5 text-[9px] bg-black/60 text-green-400 px-1.5 py-0.5 rounded">
                {reference.matchConfidence}
              </span>
            )}
          </>
        )}
      </div>

      {/* Card body */}
      <div className="p-2 flex flex-col gap-1.5">
        <div
          className={`text-[11px] font-semibold truncate ${
            reference
              ? reference.matchedBy === "manual"
                ? "text-purple-400"
                : "text-green-400"
              : isMatchingThis
              ? "text-amber-400"
              : "text-slate-400"
          }`}
        >
          {route.name}
        </div>

        {reference ? (
          <>
            <div className="text-[9px] text-slate-500 truncate">
              {reference.label || reference.fileName}
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => onRemove(reference.id)}
                className="flex-1 text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-400 rounded py-0.5 transition-colors"
              >
                Replace
              </button>
              <button
                onClick={() => onRemove(reference.id)}
                className="text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-400 rounded py-0.5 px-1.5 transition-colors"
                title="Remove"
              >
                <X size={10} />
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleRouteUrlSubmit} className="flex gap-1">
            <input
              type="url"
              value={routeUrl}
              onChange={(e) => setRouteUrl(e.target.value)}
              placeholder="Enter URL to fetch screenshot…"
              className="flex-1 text-[9px] bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-slate-300 placeholder-slate-600 outline-none focus:border-slate-500"
            />
            <button
              type="submit"
              disabled={!routeUrl.trim()}
              className="text-[9px] bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-300 rounded px-1.5 transition-colors"
            >
              ↵
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export function RouteReferenceGrid({
  prdContent,
  references,
  isMatching,
  onUpload,
  onFetchUrls,
  onFetchRouteUrl,
  onRemove,
  onDropToRoute,
}: RouteReferenceGridProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = useState("");
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const routes: RouteInfo[] = extractPrdPageHints(prdContent).map((p) => ({
    id: p.id,
    name: p.name,
  }));

  const matchedCount = routes.filter((r) =>
    references.some((ref) => ref.pageHint === r.id),
  ).length;

  const cssTokenCount = references.filter(
    (r) => r.cssToken && routes.some((route) => route.id === r.pageHint),
  ).length;

  const handleFileDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingOver(false);
      const files = Array.from(e.dataTransfer.files).filter(isImageFile);
      if (files.length > 0) onUpload(files);
    },
    [onUpload],
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter(isImageFile);
    if (files.length > 0) onUpload(files);
    e.target.value = "";
  };

  const handleFetchUrls = () => {
    const urls = urlInput
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean);
    if (urls.length === 0) return;
    onFetchUrls(urls);
    setUrlInput("");
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Top input zone */}
      <div className="flex gap-3">
        {/* Image drop zone */}
        <div
          className={`flex-1 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-1.5 p-4 cursor-pointer transition-colors min-h-[80px] ${
            isDraggingOver
              ? "border-indigo-400 bg-indigo-950/30"
              : "border-slate-700 hover:border-slate-500"
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
          onDragLeave={() => setIsDraggingOver(false)}
          onDrop={handleFileDrop}
        >
          <Image size={20} className="text-slate-500" />
          <span className="text-[11px] text-slate-400">Drop images here or click to upload</span>
          <span className="text-[9px] text-slate-600">PNG · JPG · WebP · GIF · ≤6 MB</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={handleFileInput}
          />
        </div>

        {/* URL input */}
        <div className="flex-1 flex flex-col gap-1.5">
          <textarea
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder={"Paste URLs, one per line\nhttps://app.example.com/dashboard\nhttps://app.example.com/login"}
            rows={3}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg text-[11px] text-slate-300 placeholder-slate-600 p-2 resize-none font-mono outline-none focus:border-slate-500"
          />
          <button
            onClick={handleFetchUrls}
            disabled={!urlInput.trim()}
            className="self-end text-[10px] bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded px-3 py-1 transition-colors"
          >
            Fetch Screenshots →
          </button>
        </div>
      </div>

      {/* Route card grid */}
      {routes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wide text-slate-500">
              Route Mapping{" "}
              <span className="text-slate-600 normal-case tracking-normal">
                · {matchedCount} / {routes.length} matched
                {cssTokenCount > 0 && ` · ${cssTokenCount} with CSS token`}
              </span>
            </span>
            <span className="text-[9px] text-slate-600">Drag an image onto a card to override</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {routes.map((route) => {
              const reference = references.find((r) => r.pageHint === route.id);
              return (
                <RouteCard
                  key={route.id}
                  route={route}
                  reference={reference}
                  isMatchingThis={isMatching && !reference}
                  onRemove={onRemove}
                  onDropToRoute={onDropToRoute}
                  onFetchRouteUrl={onFetchRouteUrl}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/RouteReferenceGrid.tsx
git commit -m "feat(ui): add RouteReferenceGrid component for route-card-first reference UI"
```

---

## Task 9: Update ui.tsx — wire RouteReferenceGrid into Page Restoration mode

**Files:**
- Modify: `src/app/(dashboard)/project/[projectId]/_steps/preparation/design-group/design/ui.tsx`

This task replaces the existing Page Restoration section (the `<PageScreenshotsPanel>` call) and the URL fetch logic in the restoration path.

- [ ] **Step 1: Add RouteReferenceGrid import**

Near the top of `ui.tsx`, find the existing import for `PageScreenshotsPanel`:

```typescript
import PageScreenshotsPanel from "@/components/PageScreenshotsPanel";
```

Replace it with:

```typescript
import { RouteReferenceGrid } from "@/components/RouteReferenceGrid";
```

- [ ] **Step 2: Add store action destructuring**

Find where `uploadDesignReferences`, `autoMatchDesignReferences` etc. are destructured from the pipeline store. Add `fetchUrlDesignReference`:

```typescript
const {
  uploadDesignReferences,
  updateDesignReferenceMeta,
  deleteDesignReference,
  autoMatchDesignReferences,
  refreshDesignReferences,
  fetchUrlDesignReference,
} = usePipelineStore.getState();
```

(Search for the block that destructures these — it's typically inside handlers. If the actions are called directly on the store, just ensure `fetchUrlDesignReference` is available via `usePipelineStore.getState().fetchUrlDesignReference`.)

- [ ] **Step 3: Add isMatching state**

In the state declarations section (around line 629 where `urlFetching` is defined), add:

```typescript
const [isMatching, setIsMatching] = useState(false);
```

- [ ] **Step 4: Implement handleUploadToGrid handler**

Add this handler in the component body (near other handlers like `handleGenerateDesignDoc`):

```typescript
  const handleUploadToGrid = useCallback(
    async (files: File[]) => {
      const result = await usePipelineStore
        .getState()
        .uploadDesignReferences(
          files,
          files.map(() => ""),
          files.map(() => ""),
        );
      if (result && prdContent) {
        setIsMatching(true);
        await usePipelineStore.getState().autoMatchDesignReferences(prdContent);
        setIsMatching(false);
      }
    },
    [prdContent],
  );
```

- [ ] **Step 5: Implement handleFetchUrlsToGrid handler**

```typescript
  const handleFetchUrlsToGrid = useCallback(
    async (urls: string[]) => {
      setIsMatching(true);
      // Fetch all URLs in parallel
      await Promise.all(
        urls.map(async (url) => {
          let screenshotDataUrl: string | undefined;
          let cssToken: Record<string, string> | undefined;

          if (typeof window !== "undefined" && (window as any).electronAPI?.renderReferenceUrl) {
            try {
              const result = await (window as any).electronAPI.renderReferenceUrl(url);
              screenshotDataUrl = result?.screenshot ?? result?.screenshotDataUrl;
              cssToken = result?.cssTokens ?? result?.cssToken;
            } catch {
              // fallback — no screenshot
            }
          }

          if (!screenshotDataUrl) {
            // Non-Electron: skip — no screenshot available
            return;
          }

          await usePipelineStore
            .getState()
            .fetchUrlDesignReference(url, screenshotDataUrl, cssToken);
        }),
      );
      if (prdContent) {
        await usePipelineStore.getState().autoMatchDesignReferences(prdContent);
      }
      setIsMatching(false);
    },
    [prdContent],
  );
```

- [ ] **Step 6: Implement handleFetchRouteUrl handler**

```typescript
  const handleFetchRouteUrl = useCallback(
    async (url: string, pageHint: string) => {
      let screenshotDataUrl: string | undefined;
      let cssToken: Record<string, string> | undefined;

      if (typeof window !== "undefined" && (window as any).electronAPI?.renderReferenceUrl) {
        try {
          const result = await (window as any).electronAPI.renderReferenceUrl(url);
          screenshotDataUrl = result?.screenshot ?? result?.screenshotDataUrl;
          cssToken = result?.cssTokens ?? result?.cssToken;
        } catch {
          // no screenshot
        }
      }

      if (!screenshotDataUrl) return;

      await usePipelineStore
        .getState()
        .fetchUrlDesignReference(url, screenshotDataUrl, cssToken, pageHint);
    },
    [],
  );
```

- [ ] **Step 7: Implement handleDropToRoute handler**

```typescript
  const handleDropToRoute = useCallback(
    async (referenceId: string, pageHint: string) => {
      // First clear the old owner of this pageHint if any
      const currentRefs = usePipelineStore.getState().designReferences;
      const existingOwner = currentRefs.find(
        (r) => r.pageHint === pageHint && r.id !== referenceId,
      );
      if (existingOwner) {
        await usePipelineStore
          .getState()
          .updateDesignReferenceMeta(existingOwner.id, { pageHint: "" });
      }
      await usePipelineStore
        .getState()
        .updateDesignReferenceMeta(referenceId, {
          pageHint,
          matchedBy: "manual",
          matchConfidence: null,
        });
    },
    [],
  );
```

- [ ] **Step 8: Replace PageScreenshotsPanel with RouteReferenceGrid in the JSX**

Find the Page Restoration section in the JSX. It currently renders:

```tsx
<PageScreenshotsPanel prdContent={prdContent} />
```

Replace the entire Page Restoration tab content block with:

```tsx
<RouteReferenceGrid
  prdContent={prdContent}
  references={designReferences}
  isMatching={isMatching}
  onUpload={handleUploadToGrid}
  onFetchUrls={handleFetchUrlsToGrid}
  onFetchRouteUrl={handleFetchRouteUrl}
  onRemove={async (id) => {
    await usePipelineStore.getState().deleteDesignReference(id);
  }}
  onDropToRoute={handleDropToRoute}
/>
```

- [ ] **Step 9: Simplify the Generate handler for restoration mode**

In `handleGenerateDesignDoc`, find the restoration mode `else` branch (currently lines 958–982). Remove the `for (const page of urlFetchedPages)` loop that persists URL screenshots. The new block should be:

```typescript
    } else {
      // Page restoration mode: assets are already on disk (persisted immediately on upload/fetch).
      setDesignContext({
        designStyleId: null,
        styleReferenceImageBase64: null,
        styleReferenceImages: undefined,
        designDirectionPrompt: null,
        useUploadedDesignReferences: true,
      });
    }
```

- [ ] **Step 10: Update the Generate button disable condition**

Find the `disabled` prop of the Generate button (around line 1569). Update the restoration mode condition:

```typescript
                  disabled={
                    (designSourceMode === "ai" && !selectedStyleId) ||
                    (designSourceMode === "custom" &&
                      referenceMode === "style" &&
                      styleRefImages.filter((r) => r.dataUrl).length === 0) ||
                    (designSourceMode === "custom" &&
                      referenceMode === "restoration" &&
                      designReferences.filter((r) => r.kind === "image").length === 0) ||
                    isMatching ||
                    isDesignRunning
                  }
```

(Removes the `urlFetchedPages.length === 0` check from the restoration branch, and replaces `urlFetching` with `isMatching`.)

- [ ] **Step 11: Commit**

```bash
git add src/app/\(dashboard\)/project/\[projectId\]/_steps/preparation/design-group/design/ui.tsx
git commit -m "feat(design): wire RouteReferenceGrid; simplify Generate handler for restoration mode"
```

---

## Task 10: Clean up — delete PageScreenshotsPanel

**Files:**
- Delete: `src/components/PageScreenshotsPanel.tsx`

- [ ] **Step 1: Verify no remaining imports**

```bash
grep -r "PageScreenshotsPanel" /Users/gavinjohn/Downloads/workspace/agentic-builder/src/
```

Expected: no output (only the file itself should match, which we just removed from ui.tsx in Task 9).

- [ ] **Step 2: Delete the file**

```bash
rm src/components/PageScreenshotsPanel.tsx
```

- [ ] **Step 3: Run type-check to confirm no broken imports**

```bash
npx tsc --noEmit
```

Expected: no errors related to PageScreenshotsPanel or the new fields.

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/lib/__tests__/design-references.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: delete PageScreenshotsPanel (replaced by RouteReferenceGrid)"
```

---

## Verification Checklist

After all tasks are complete, manually test:

- [ ] Upload an image → card appears in matching state → Vision match fires → card turns green with source badge `Upload` and `CSS —`
- [ ] Paste 2 URLs + click Fetch → both cards populate with `URL` badge and `CSS ✓` (Electron) or nothing (browser)
- [ ] Upload a second image that matches the same route as the first → lower-confidence one is displaced
- [ ] Drag an image from one card to another → card turns purple with `Manual` badge; subsequent auto-match does not displace it
- [ ] Click empty card URL input → enter URL → card populates with `Manual` badge
- [ ] Click `✕` on a matched card → card returns to unmatched state
- [ ] Click `Generate based on screenshots` → design agent runs; no console errors about urlFetchedPages
- [ ] TypeScript build passes: `npx tsc --noEmit`
