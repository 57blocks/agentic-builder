// src/lib/pipeline/prototype-page-source.ts
import type { DesignReferenceEntry } from "@/lib/pipeline/design-references";
import type { PrdPageHint } from "@/lib/requirements/prd-page-hints";
import { pageHintOwnsRoute } from "@/lib/design/page-hint-match";
import type { PrototypePageSource } from "@/lib/pipeline/prototype-marker";

export interface SelectedPageSource {
  source: PrototypePageSource;
  /** The matched HTML reference for `demo-html` | `url`; undefined for `design-spec`. */
  entry?: DesignReferenceEntry;
}

/** Does an HTML reference's pageHint bind to this PRD page (by PAGE-id, then by route)? */
function referenceMatchesHint(entry: DesignReferenceEntry, hint: PrdPageHint): boolean {
  if (pageHintOwnsRoute(entry.pageHint, hint.id)) return true;
  if (hint.route && pageHintOwnsRoute(entry.pageHint, hint.route)) return true;
  return false;
}

/**
 * Pick the generation source for a PRD page, encoding the locked precedence:
 *   demo-html (captured) > url (user-added) > design-spec (free-gen).
 * Both captured-demo and user-added-URL produce `kind:"html"` references; the
 * distinction is `entry.source` ("url" => user-added).
 */
export function selectPageSource(
  hint: PrdPageHint,
  manifest: DesignReferenceEntry[],
): SelectedPageSource {
  const htmlMatches = manifest.filter(
    (e) => e.kind === "html" && referenceMatchesHint(e, hint),
  );
  if (htmlMatches.length > 0) {
    // Tie-break: when multiple captured (non-url) html refs match the same page,
    // first-in-manifest wins (manifest order = capture/upload order).
    const demo = htmlMatches.find((e) => e.source !== "url");
    if (demo) return { source: "demo-html", entry: demo };
    return { source: "url", entry: htmlMatches[0] };
  }
  return { source: "design-spec" };
}
