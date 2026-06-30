// src/lib/pipeline/prototype-page-plan.ts
import type { DesignReferenceEntry } from "@/lib/pipeline/design-references";
import type { PrdPageHint } from "@/lib/requirements/prd-page-hints";
import type { PrototypeMarker, PrototypePageSource } from "@/lib/pipeline/prototype-marker";
import { selectPageSource } from "@/lib/pipeline/prototype-page-source";
import { toViewComponentName } from "@/lib/pipeline/prototype-router";

/** Demo-URL gate signal: the project has at least one url-sourced design reference. */
export function projectHasDemoUrl(manifest: DesignReferenceEntry[]): boolean {
  return manifest.some((e) => e.source === "url");
}

export interface PlannedPage {
  pageId: string;
  name: string;
  /** Always set — routeless PRD entries are excluded (a page with no route cannot be mounted/previewed). */
  route: string;
  componentName: string;
  source: PrototypePageSource;
  /** The matched HTML reference for port modes; undefined for design-spec free-gen. */
  entry?: DesignReferenceEntry;
}

/** Component name implied by a marker page's `file` (e.g. `src/views/Dashboard.tsx` → `Dashboard`). */
function componentOfMarkerFile(file: string): string {
  return file.replace(/^.*\//, "").replace(/\.tsx$/, "");
}

/**
 * Build the ordered generation plan. Rules (in order):
 *  - keep only ROUTED pages — a routeless PRD entry (e.g. "Modal 规格", a
 *    "暂无路由 / 原型保留" duplicate) cannot be mounted in the router or previewed;
 *  - DEDUPE by component name — PRDs frequently repeat a page under several ids
 *    (a routed page plus a no-route "prototype-retained" twin). Two planned pages
 *    sharing a component name would emit duplicate `import { X }` lines in
 *    router.tsx (build break) and clobber the same view file. Keep the first;
 *  - RESUME — skip pages already generated in an existing marker, and seed the
 *    dedupe set with their component names so a new id mapping to an existing
 *    component is skipped too (cross-run collision);
 *  - CAP — bound one run; the remainder is reported via `truncated` and picked
 *    up on the next (resume) run.
 */
export function planPrototypePages(
  hints: PrdPageHint[],
  manifest: DesignReferenceEntry[],
  existingMarker: PrototypeMarker | null,
  cap: number,
): { pages: PlannedPage[]; truncated: number } {
  const donePageIds = new Set((existingMarker?.pages ?? []).map((p) => p.pageId));
  const seenComponent = new Set(
    (existingMarker?.pages ?? []).map((p) => componentOfMarkerFile(p.file)),
  );
  const planned: PlannedPage[] = [];
  for (const hint of hints) {
    if (!hint.route) continue;                 // routed pages only (previewable)
    if (donePageIds.has(hint.id)) continue;    // resume: already generated
    const componentName = toViewComponentName(hint.name);
    if (seenComponent.has(componentName)) continue; // dedupe by component name
    seenComponent.add(componentName);
    const sel = selectPageSource(hint, manifest);
    planned.push({
      pageId: hint.id,
      name: hint.name,
      route: hint.route,
      componentName,
      source: sel.source,
      entry: sel.entry,
    });
  }
  const capped = planned.slice(0, Math.max(0, cap));
  return { pages: capped, truncated: planned.length - capped.length };
}
