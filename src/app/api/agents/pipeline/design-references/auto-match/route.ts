import { NextRequest, NextResponse } from "next/server";
import {
  autoMatchReferencesToPages,
  updateDesignReference,
  readManifest,
  type PageCandidate,
  type DesignReferenceEntry,
} from "@/lib/pipeline/design-references";
import { extractPrdPageHints } from "@/lib/requirements/prd-page-hints";

export const runtime = "nodejs";

function projectRoot() {
  return process.cwd();
}

/**
 * Build a pageHint string with multiple matching surfaces beyond the bare
 * `PAGE-xxx` id, so the downstream task↔reference matcher
 * (`findTaskDesignReference` in `agent-subgraph.ts`) can hit via either:
 *   (a) the exact PAGE-id when the task carries it, or
 *   (b) any semantic token (page name word, URL slug segment) when it does
 *       not.
 *
 * Output is capped at 80 chars (the manifest's `pageHint` limit). Order is
 * deterministic: PAGE-id first, then page-name tokens, then URL-slug tokens.
 */
const PAGEHINT_STOPWORDS = new Set([
  "page",
  "pages",
  "view",
  "views",
  "screen",
  "screens",
  "main",
  "index",
  "the",
  "and",
  "for",
  "with",
  "from",
  "into",
  "app",
  "web",
]);
const PAGEHINT_MAX_LEN = 80;

function buildEnrichedPageHint(
  pageId: string,
  pageName: string | null | undefined,
  entry: Pick<DesignReferenceEntry, "label" | "source">,
): string {
  const tokens: string[] = [pageId];
  const seen = new Set([pageId.toLowerCase()]);

  const pushToken = (raw: string) => {
    const t = raw.trim().toLowerCase();
    if (t.length < 3 || PAGEHINT_STOPWORDS.has(t)) return;
    if (seen.has(t)) return;
    seen.add(t);
    tokens.push(t);
  };

  for (const w of (pageName ?? "").split(/[^A-Za-z0-9]+/)) {
    if (w) pushToken(w);
  }

  if (entry.source === "url" && entry.label) {
    try {
      const u = new URL(entry.label);
      for (const w of u.pathname.split(/[^A-Za-z0-9]+/)) {
        if (w) pushToken(w);
      }
    } catch {
      // label was not a parseable URL — skip
    }
  }

  let out = tokens.join(" ");
  if (out.length > PAGEHINT_MAX_LEN) {
    out = out.slice(0, PAGEHINT_MAX_LEN).trimEnd();
  }
  return out;
}

function pageHintOwnsId(pageHint: string, pageId: string): boolean {
  const target = pageId.toUpperCase();
  return pageHint
    .split(/[^A-Za-z0-9]+/)
    .some((tok) => tok.toUpperCase() === target);
}

/**
 * Auto-match uploaded image design references to PRD pages using a vision LLM.
 *
 * Body: { prdContent: string, force?: boolean }
 *  - `force` re-matches all images, not just those without a pageHint.
 *
 * Persists each confident match by writing the matched PAGE-xxx id into the
 * reference's `pageHint`, then returns the updated manifest.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    prdContent?: string;
    force?: boolean;
  };

  const prdContent = typeof body.prdContent === "string" ? body.prdContent : "";
  const force = body.force === true;

  const candidates: PageCandidate[] = extractPrdPageHints(prdContent).map(
    (p) => ({ id: p.id, name: p.name }),
  );

  if (candidates.length === 0) {
    const references = await readManifest(projectRoot());
    return NextResponse.json({ matched: 0, skipped: 0, references });
  }

  let results;
  try {
    results = await autoMatchReferencesToPages(projectRoot(), candidates, {
      force,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Auto-match failed.";
    const status = /OPENROUTER_API_KEY/.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }

  // Persist confident matches (pageHint = matched PAGE id, which PageCard
  // resolves back to the page via id/name lookup).
  const confRank: Record<string, number> = { high: 3, medium: 2, low: 1 };
  let matched = 0;

  for (const result of results) {
    if (!result.assignedPageId) continue;

    // Re-read manifest each iteration to get the latest state
    const currentEntries = await readManifest(projectRoot());

    // Never overwrite a manual assignment on this entry itself
    const thisEntry = currentEntries.find((e) => e.id === result.referenceId);
    if (thisEntry?.matchedBy === "manual") continue;

    // Check if another entry already owns this route. Match against the
    // PAGE-id as a TOKEN inside pageHint (not strict equality) so enriched
    // hints like "PAGE-001 family billing" still count as ownership.
    const existingOwner = currentEntries.find(
      (e) =>
        e.id !== result.referenceId &&
        pageHintOwnsId(e.pageHint, result.assignedPageId!),
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
        matchConfidence: null,
      });
    }

    const enrichedHint = buildEnrichedPageHint(
      result.assignedPageId,
      result.assignedPageName,
      { label: thisEntry?.label ?? "", source: thisEntry?.source ?? "upload" },
    );

    await updateDesignReference(projectRoot(), result.referenceId, {
      pageHint: enrichedHint,
      matchedBy: "auto",
      matchConfidence: result.confidence,
    });
    matched += 1;
  }

  const skipped = results.length - matched;
  const references = await readManifest(projectRoot());
  return NextResponse.json({ matched, skipped, references });
}
