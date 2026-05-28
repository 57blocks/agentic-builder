import { NextResponse } from "next/server";
import { getSystemMemory } from "@/lib/memory";
import { memoryEnabled } from "@/lib/memory/env";
import {
  buildPrdKnowledgeTags,
  type PrdKnowledgeRecord,
} from "@/lib/memory/knowledge/prd-knowledge/types";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  if (!memoryEnabled()) return NextResponse.json({ ok: false }, { status: 503 });
  const { id } = await params;
  const memory = getSystemMemory();
  const rec = await memory.get(id);
  if (!rec || rec.kind !== "prd-knowledge") {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  await memory.delete(id);
  return NextResponse.json({ ok: true });
}

interface PatchBody {
  industry?: string;
  productType?: string;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  if (!memoryEnabled()) return NextResponse.json({ ok: false }, { status: 503 });
  const { id } = await params;
  const memory = getSystemMemory();
  const rec = await memory.get(id);
  if (!rec || rec.kind !== "prd-knowledge") {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  let patch: PatchBody;
  try {
    patch = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  let parsed: PrdKnowledgeRecord;
  try {
    parsed = JSON.parse(rec.body) as PrdKnowledgeRecord;
  } catch {
    return NextResponse.json({ ok: false, error: "corrupt_body" }, { status: 500 });
  }
  if (patch.industry) parsed.industry = patch.industry;
  if (patch.productType) parsed.productType = patch.productType;
  await memory.update(id, {
    body: JSON.stringify(parsed),
    tags: buildPrdKnowledgeTags({
      industry: parsed.industry,
      productType: parsed.productType,
      tier: parsed.tier,
      status: parsed.status,
    }),
  });
  return NextResponse.json({ ok: true });
}
