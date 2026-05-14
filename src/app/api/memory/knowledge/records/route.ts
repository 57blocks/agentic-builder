/**
 * GET /api/memory/knowledge/records
 *
 * Returns the full body of all design-knowledge records (57B library + daily
 * refresh notes), grouped by industry. Used by the Knowledge Base UI page.
 */

import { NextResponse } from "next/server";

import { getSystemMemory } from "@/lib/memory";
import type { DesignIndustry } from "@/lib/memory/knowledge/57b-library";

export interface KnowledgeRecordFull {
  id: string;
  industry: DesignIndustry | null;
  title: string;
  body: string;
  tags: string[];
  source: string;
  createdAt: number;
  updatedAt: number;
  metrics: { score?: number; hits?: number; lastHitAt?: number };
  isLibrary: boolean;
  isRefresh: boolean;
}

export interface KnowledgeRecordsResponse {
  records: KnowledgeRecordFull[];
  total: number;
}

function extractIndustry(tags: string[]): DesignIndustry | null {
  for (const t of tags) {
    if (t === "industry:ai") return "ai";
    if (t === "industry:fintech-web3") return "fintech-web3";
    if (t === "industry:saas") return "saas";
  }
  return null;
}

export async function GET() {
  try {
    const store = getSystemMemory();
    const raw = await store.list({ kind: "design-knowledge" });

    const records: KnowledgeRecordFull[] = raw.map((r) => ({
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
      isRefresh: r.tags.includes("source:daily-refresh"),
    }));

    // Sort: library first, then refresh records newest first
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
