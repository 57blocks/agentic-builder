import { NextResponse } from "next/server";
import { getSystemMemory } from "@/lib/memory";
import { memoryEnabled } from "@/lib/memory/env";
import {
  parsePrdKnowledgeBody,
  type PrdKnowledgeStatus,
  type PrdKnowledgeRecord,
} from "@/lib/memory/knowledge/prd-knowledge";

export interface PrdKnowledgeListItem {
  id: string;
  title: string;
  industry: string;
  productType: string;
  tier: string;
  status: PrdKnowledgeStatus;
  summary: string;
  hits: number;
  lastHitAt?: number;
  score: number;
  sourceProjectId?: string;
  fullPrd: string;
  sections: PrdKnowledgeRecord["sections"];
  updatedAt: number;
}

export interface PrdKnowledgeListResponse {
  records: PrdKnowledgeListItem[];
}

export async function GET(req: Request): Promise<NextResponse<PrdKnowledgeListResponse>> {
  if (!memoryEnabled()) return NextResponse.json({ records: [] });

  const url = new URL(req.url);
  const status = url.searchParams.get("status") as PrdKnowledgeStatus | "all" | null;
  const industry = url.searchParams.get("industry");
  const productType = url.searchParams.get("productType");

  const memory = getSystemMemory();
  const all = await memory.list({ layer: "L1", kind: "prd-knowledge", limit: 500 });

  const records: PrdKnowledgeListItem[] = [];
  for (const rec of all) {
    const parsed = parsePrdKnowledgeBody(rec);
    if (!parsed) continue;
    if (status && status !== "all" && parsed.status !== status) continue;
    if (industry && parsed.industry !== industry) continue;
    if (productType && parsed.productType !== productType) continue;
    records.push({
      id: rec.id,
      title: parsed.title,
      industry: parsed.industry,
      productType: parsed.productType,
      tier: parsed.tier,
      status: parsed.status,
      summary: parsed.summary,
      hits: rec.metrics.hits ?? 0,
      lastHitAt: rec.metrics.lastHitAt,
      score: rec.metrics.score ?? 0,
      sourceProjectId: parsed.sourceProjectId,
      fullPrd: parsed.fullPrd,
      sections: parsed.sections,
      updatedAt: rec.updatedAt,
    });
  }
  return NextResponse.json({ records });
}
