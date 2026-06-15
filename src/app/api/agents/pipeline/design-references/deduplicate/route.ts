import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import {
  readManifest,
  designReferenceDirAbs,
  type DesignReferenceEntry,
} from "@/lib/pipeline/design-references";

export const runtime = "nodejs";

function projectRoot() {
  return process.cwd();
}

async function writeManifest(
  root: string,
  entries: DesignReferenceEntry[],
  projectId?: string,
) {
  const dir = designReferenceDirAbs(root, projectId);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, "manifest.json"),
    JSON.stringify(entries, null, 2),
    "utf-8",
  );
}

/**
 * POST /api/agents/pipeline/design-references/deduplicate
 *
 * Removes duplicate entries that share the same fileName, keeping only the
 * most recently uploaded one per name. Also deletes the orphaned stored files.
 */
export async function POST(request: NextRequest) {
  const projectId =
    new URL(request.url).searchParams.get("projectId") || undefined;
  const root = projectRoot();
  const all = await readManifest(root, projectId);

  // Group by fileName, keep the latest (highest uploadedAt) per name.
  const byName = new Map<string, DesignReferenceEntry>();
  for (const entry of all) {
    const key = entry.fileName || entry.id;
    const existing = byName.get(key);
    if (!existing || entry.uploadedAt > existing.uploadedAt) {
      byName.set(key, entry);
    }
  }

  const kept = [...byName.values()];
  const keptIds = new Set(kept.map((e) => e.id));
  const removed = all.filter((e) => !keptIds.has(e.id));

  // Delete orphaned files.
  const dir = designReferenceDirAbs(root, projectId);
  for (const entry of removed) {
    try {
      await fs.unlink(path.join(dir, entry.storedFileName));
    } catch { /* best-effort */ }
  }

  await writeManifest(root, kept, projectId);

  return NextResponse.json({
    ok: true,
    removedCount: removed.length,
    keptCount: kept.length,
    references: kept,
  });
}
