/**
 * GET /api/memory/knowledge/records
 *
 * Returns the full body of all design-knowledge records (57B library + daily
 * refresh notes), grouped by industry. Used by the Knowledge Base UI page.
 */

import { NextResponse } from "next/server";

import { getSystemMemory } from "@/lib/memory";
import type { DesignIndustry } from "@/lib/memory/knowledge/57b-library";
import type { StyleSpecIndustry } from "@/lib/memory/knowledge/style-spec/types";

export type KnowledgeIndustry = StyleSpecIndustry | null;

export interface KnowledgeRecordFull {
  id: string;
  industry: KnowledgeIndustry;
  title: string;
  body: string;
  tags: string[];
  source: string;
  createdAt: number;
  updatedAt: number;
  metrics: { score?: number; hits?: number; lastHitAt?: number };
  isLibrary: boolean;
  isRefresh: boolean;
  /** True when this record was produced by the vision analyser (one per image). */
  isStyleSpec: boolean;
  /** True for records produced by the trend-capture pipeline (vs manual upload). */
  isTrendCapture: boolean;
  /** Filename of the reference image when isStyleSpec=true. */
  imageName: string | null;
  /** Public URL of the reference image, e.g. /knowledge-refs/ai-1.png. */
  imagePath: string | null;
  /** Source URL captured (only set for trend-capture records). */
  sourceUrl: string | null;
  /** Hostname of the captured site (only set for trend-capture records). */
  sourceSite: string | null;
}

export interface KnowledgeRecordsResponse {
  records: KnowledgeRecordFull[];
  total: number;
}

function extractIndustry(tags: string[]): KnowledgeIndustry {
  for (const t of tags) {
    if (t === "industry:ai") return "ai";
    if (t === "industry:fintech-web3") return "fintech-web3";
    if (t === "industry:saas") return "saas";
    if (t === "industry:generic") return "generic";
  }
  return null;
}

function extractImageName(tags: string[]): string | null {
  const tag = tags.find((t) => t.startsWith("image:"));
  return tag ? tag.slice("image:".length) : null;
}

function extractTagValue(tags: string[], prefix: string): string | null {
  const tag = tags.find((t) => t.startsWith(prefix));
  return tag ? tag.slice(prefix.length) : null;
}

// Re-export so callers can still import `DesignIndustry` from this route module.
export type { DesignIndustry };

export async function GET() {
  try {
    const store = getSystemMemory();
    const raw = await store.list({ kind: "design-knowledge" });

    const records: KnowledgeRecordFull[] = raw.map((r) => {
      // Both manual uploads (source:vision-distill) and auto trend captures
      // (source:trend-capture) end up as image-backed Style Spec records and
      // render through the same UI card / preview modal.
      const isStyleSpec =
        r.tags.includes("source:vision-distill") ||
        r.tags.includes("source:trend-capture");
      const imageName = extractImageName(r.tags);
      const isTrendCapture = r.tags.includes("source:trend-capture");
      return {
        id: r.id,
        industry: extractIndustry(r.tags),
        title: r.title,
        body: r.body,
        tags: r.tags,
        source: r.source,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        metrics: r.metrics,
        isLibrary: r.tags.includes("source:57b-guidelines"),
        // Legacy `source:daily-refresh` (text-only trend notes generated before
        // the trend-capture pipeline). Kept distinct so the Daily Trend
        // Refreshes section can keep displaying historical entries while new
        // trend-capture records flow into the Style Spec gallery.
        isRefresh: r.tags.includes("source:daily-refresh"),
        isStyleSpec,
        isTrendCapture,
        imageName,
        imagePath: imageName ? `/knowledge-refs/${imageName}` : null,
        sourceUrl: isTrendCapture ? extractTagValue(r.tags, "url:") : null,
        sourceSite: isTrendCapture ? extractTagValue(r.tags, "site:") : null,
      };
    });

    // Sort: library first, then refresh + style specs newest first
    records.sort((a, b) => {
      if (a.isLibrary && !b.isLibrary) return -1;
      if (!a.isLibrary && b.isLibrary) return 1;
      return b.createdAt - a.createdAt;
    });

    return NextResponse.json({ records, total: records.length });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
