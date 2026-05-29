import { NextResponse } from "next/server";
import { getSystemMemory } from "@/lib/memory";
import { memoryEnabled } from "@/lib/memory/env";
import {
  buildPrdKnowledgeTags,
  type PrdKnowledgeRecord,
} from "@/lib/memory/knowledge/prd-knowledge/types";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  if (!memoryEnabled()) {
    return NextResponse.json({ ok: false, error: "memory_disabled" }, { status: 503 });
  }
  const { id } = await params;
  const memory = getSystemMemory();
  const rec = await memory.get(id);
  if (!rec || rec.kind !== "prd-knowledge") {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  let parsed: PrdKnowledgeRecord;
  try {
    parsed = JSON.parse(rec.body) as PrdKnowledgeRecord;
  } catch {
    return NextResponse.json({ ok: false, error: "corrupt_body" }, { status: 500 });
  }
  parsed.status = "active";
  const newTags = buildPrdKnowledgeTags({
    industry: parsed.industry,
    productType: parsed.productType,
    tier: parsed.tier,
    status: "active",
  });
  await memory.update(id, {
    body: JSON.stringify(parsed),
    tags: newTags,
    metrics: { score: 0.4 },
  });
  return NextResponse.json({ ok: true });
}
