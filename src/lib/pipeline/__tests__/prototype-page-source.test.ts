// src/lib/pipeline/__tests__/prototype-page-source.test.ts
import { describe, it, expect } from "vitest";
import { selectPageSource } from "../prototype-page-source";
import type { DesignReferenceEntry } from "@/lib/pipeline/design-references";
import type { PrdPageHint } from "@/lib/requirements/prd-page-hints";

function entry(over: Partial<DesignReferenceEntry>): DesignReferenceEntry {
  return {
    id: "ref1",
    fileName: "page.html",
    storedFileName: "ref1.html",
    mime: "text/html",
    bytes: 100,
    kind: "html",
    label: "",
    pageHint: "PAGE-001",
    uploadedAt: "2026-06-30T00:00:00.000Z",
    source: "upload",
    matchedBy: "auto",
    ...over,
  };
}

const hint: PrdPageHint = { id: "PAGE-001", name: "Dashboard", route: "/dashboard" };

describe("selectPageSource", () => {
  it("prefers demo-html (captured, non-url) over a user-added url for the same page", () => {
    const manifest = [
      entry({ id: "u", pageHint: "PAGE-001", source: "url" }),
      entry({ id: "d", pageHint: "PAGE-001", source: "upload" }),
    ];
    const sel = selectPageSource(hint, manifest);
    expect(sel.source).toBe("demo-html");
    expect(sel.entry?.id).toBe("d");
  });

  it("falls back to url when only a user-added URL capture exists", () => {
    const manifest = [entry({ id: "u", pageHint: "PAGE-001", source: "url" })];
    const sel = selectPageSource(hint, manifest);
    expect(sel.source).toBe("url");
    expect(sel.entry?.id).toBe("u");
  });

  it("falls back to design-spec when no html source matches the page", () => {
    const manifest = [entry({ id: "x", pageHint: "PAGE-999", source: "upload" })];
    const sel = selectPageSource(hint, manifest);
    expect(sel.source).toBe("design-spec");
    expect(sel.entry).toBeUndefined();
  });

  it("ignores image references (only html ports)", () => {
    const manifest = [entry({ id: "img", kind: "image", mime: "image/png", pageHint: "PAGE-001" })];
    expect(selectPageSource(hint, manifest).source).toBe("design-spec");
  });

  it("matches an enriched pageHint that contains the PAGE-id token", () => {
    const manifest = [entry({ id: "d", pageHint: "PAGE-001 dashboard family", source: "upload" })];
    expect(selectPageSource(hint, manifest).source).toBe("demo-html");
  });
});
