import { promises as fs } from "fs";
import path from "path";
import { NextRequest } from "next/server";

import { getSystemMemory } from "@/lib/memory";
import { memoryEnabled } from "@/lib/memory/env";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

const KNOWLEDGE_REFS_DIR = path.join(process.cwd(), "public", "knowledge-refs");

export async function DELETE(_req: NextRequest, ctx: RouteCtx) {
  if (!memoryEnabled()) {
    return Response.json({ ok: false, reason: "memory_disabled" }, { status: 200 });
  }

  const { id } = await ctx.params;
  try {
    const store = getSystemMemory();
    const existing = await store.get(id);
    if (!existing) {
      return Response.json({ error: "not found" }, { status: 404 });
    }
    if (existing.kind !== "design-knowledge" || !isDeletableStyleSpec(existing.tags)) {
      return Response.json(
        { error: "only generated style spec records can be deleted here" },
        { status: 403 },
      );
    }

    await store.delete(id);
    const imageName = existing.tags.find((tag) => tag.startsWith("image:"))?.slice("image:".length);
    if (imageName && isSafeImageName(imageName)) {
      await fs.unlink(path.join(KNOWLEDGE_REFS_DIR, imageName)).catch(() => {});
    }

    return Response.json({ ok: true }, { status: 200 });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}

function isDeletableStyleSpec(tags: string[]): boolean {
  return tags.includes("source:vision-distill") || tags.includes("source:trend-capture");
}

function isSafeImageName(imageName: string): boolean {
  return path.basename(imageName) === imageName && !imageName.includes("..");
}
