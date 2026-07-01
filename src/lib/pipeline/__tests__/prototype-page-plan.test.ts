// src/lib/pipeline/__tests__/prototype-page-plan.test.ts
import { describe, it, expect } from "vitest";
import { projectHasDemoUrl, planPrototypePages, keepPagesWithExistingFiles } from "../prototype-page-plan";
import type { DesignReferenceEntry } from "@/lib/pipeline/design-references";
import type { PrdPageHint } from "@/lib/requirements/prd-page-hints";
import type { PrototypeMarker, PrototypeMarkerPage } from "@/lib/pipeline/prototype-marker";

function html(pageHint: string, source: "upload" | "url" = "url"): DesignReferenceEntry {
  return {
    id: pageHint, fileName: "p.html", storedFileName: `${pageHint}.html`, mime: "text/html",
    bytes: 1, kind: "html", label: "", pageHint, uploadedAt: "t", source, matchedBy: "auto",
  };
}

const hints: PrdPageHint[] = [
  { id: "PAGE-001", name: "Auth", route: "/auth" },
  { id: "PAGE-002", name: "Dashboard", route: "/dashboard" },
  { id: "PAGE-003", name: "Settings", route: "/settings" },
];

describe("projectHasDemoUrl", () => {
  it("true when any reference has source:'url'", () => {
    expect(projectHasDemoUrl([html("PAGE-001", "url")])).toBe(true);
  });
  it("false when there are no url-sourced references", () => {
    expect(projectHasDemoUrl([html("PAGE-001", "upload")])).toBe(false);
    expect(projectHasDemoUrl([])).toBe(false);
  });
});

describe("planPrototypePages", () => {
  it("plans every routed PRD page: captured→port, missing→free-gen; assigns component + route", () => {
    const manifest = [html("PAGE-002", "url")]; // only Dashboard captured
    const { pages, truncated } = planPrototypePages(hints, manifest, null, 100);
    expect(pages.map((p) => p.source)).toEqual(["design-spec", "url", "design-spec"]);
    expect(pages[1]).toMatchObject({ componentName: "Dashboard", route: "/dashboard" });
    expect(pages[0].route).toBe("/auth");
    expect(truncated).toBe(0);
  });

  it("caps the page count and reports how many were truncated", () => {
    const { pages, truncated } = planPrototypePages(hints, [], null, 2);
    expect(pages).toHaveLength(2);
    expect(truncated).toBe(1);
  });

  it("skips pages already generated in the marker (resume)", () => {
    const marker: PrototypeMarker = {
      generatedAt: "t", scaffoldTier: "L", scopeTier: "L", baseScaffoldCopied: true,
      pages: [{ pageId: "PAGE-001", route: "/auth", source: "design-spec", file: "src/views/Auth.tsx" }],
      generatedFiles: [],
    };
    const { pages } = planPrototypePages(hints, [], marker, 100);
    expect(pages.map((p) => p.pageId)).toEqual(["PAGE-002", "PAGE-003"]); // PAGE-001 skipped
  });

  it("drops pages that have no PRD route (cannot be previewed)", () => {
    const noRoute: PrdPageHint[] = [{ id: "PAGE-001", name: "Marketing Page" }];
    const { pages } = planPrototypePages(noRoute, [], null, 100);
    expect(pages).toHaveLength(0);
  });

  it("dedupes two routed pages that map to the same component name (keeps the first)", () => {
    const dupes: PrdPageHint[] = [
      { id: "PAGE-007", name: "PrivateEnrollmentPage", route: "/family/courses/private/:id" },
      { id: "PAGE-036", name: "PrivateEnrollmentPage", route: "/private-dup" },
    ];
    const { pages } = planPrototypePages(dupes, [], null, 100);
    expect(pages).toHaveLength(1);
    expect(pages[0].pageId).toBe("PAGE-007");
  });
});

describe("keepPagesWithExistingFiles", () => {
  const mk = (pageId: string, file: string): PrototypeMarkerPage => ({
    pageId, route: `/${pageId}`, source: "url", file,
  });
  it("drops marker pages whose view file no longer exists on disk", () => {
    const pages = [mk("PAGE-1", "src/views/A.tsx"), mk("PAGE-2", "src/views/B.tsx")];
    const present = new Set(["src/views/B.tsx"]);
    const kept = keepPagesWithExistingFiles(pages, (f) => present.has(f));
    expect(kept.map((p) => p.pageId)).toEqual(["PAGE-2"]);
  });
  it("keeps all when every file exists", () => {
    const pages = [mk("PAGE-1", "src/views/A.tsx")];
    expect(keepPagesWithExistingFiles(pages, () => true)).toHaveLength(1);
  });
});
