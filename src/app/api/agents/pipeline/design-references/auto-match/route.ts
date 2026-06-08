import { NextRequest, NextResponse } from "next/server";
import {
  autoMatchReferencesToPages,
  updateDesignReference,
  readManifest,
  type PageCandidate,
} from "@/lib/pipeline/design-references";
import { extractPrdPageHints } from "@/lib/requirements/prd-page-hints";

export const runtime = "nodejs";

function projectRoot() {
  return process.cwd();
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
        matchConfidence: null,
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
}
