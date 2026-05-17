/**
 * POST /api/memory/knowledge/analyze-existing
 *
 * One-shot helper that walks `public/knowledge-refs/` and runs the vision
 * analyser on every image that does NOT yet have a `design-knowledge` record
 * (matched by `image:<filename>` tag). Useful after seeding the repo with
 * static screenshots, or after dropping new files directly into the folder.
 *
 * Body (JSON, optional):
 *   { force?: boolean }   // if true, re-analyses even when a record exists
 *
 * Industry is inferred from filename prefix:
 *   ai-*      → ai
 *   f-*, fin* → fintech-web3
 *   s-*       → saas
 *   else      → generic
 */

import path from "path";
import { promises as fs } from "fs";
import { NextResponse } from "next/server";

import { getSystemMemory } from "@/lib/memory";
import { memoryEnabled } from "@/lib/memory/env";
import { analyseImageToStyleSpec } from "@/lib/memory/knowledge/style-spec/vision-analyser";
import {
  composeStyleSpecRecordBody,
  styleSpecRecordId,
} from "@/lib/memory/knowledge/style-spec/compose-body";
import type { StyleSpecIndustry } from "@/lib/memory/knowledge/style-spec/types";

const KNOWLEDGE_REFS_DIR = path.join(process.cwd(), "public", "knowledge-refs");
const KNOWLEDGE_REFS_URL_PREFIX = "/knowledge-refs/";

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

function inferIndustry(filename: string): StyleSpecIndustry {
  const lower = filename.toLowerCase();
  if (lower.startsWith("ai")) return "ai";
  if (lower.startsWith("f1") || lower.startsWith("f2") || lower.startsWith("fin")) {
    return "fintech-web3";
  }
  if (lower.startsWith("s1") || lower.startsWith("s2") || lower.startsWith("saas")) {
    return "saas";
  }
  return "generic";
}

function mimeFromExt(ext: string): string {
  switch (ext.toLowerCase()) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

interface AnalysedResult {
  filename: string;
  status: "analysed" | "skipped" | "failed";
  id?: string;
  industry?: StyleSpecIndustry;
  error?: string;
}

export async function POST(req: Request) {
  if (!memoryEnabled()) {
    return NextResponse.json(
      { ok: false, reason: "memory_disabled" },
      { status: 200 },
    );
  }

  let force = false;
  try {
    const body = (await req.json().catch(() => null)) as { force?: boolean } | null;
    force = body?.force === true;
  } catch {
    // ignore — no body is fine
  }

  let files: string[];
  try {
    files = await fs.readdir(KNOWLEDGE_REFS_DIR);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: `cannot read ${KNOWLEDGE_REFS_DIR}: ${(err as Error).message}` },
      { status: 500 },
    );
  }

  const candidates = files.filter((f) => IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase()));
  const store = getSystemMemory();
  const existing = await store.list({ kind: "design-knowledge" });
  const knownImages = new Set(
    existing
      .flatMap((r) => r.tags)
      .filter((t) => t.startsWith("image:"))
      .map((t) => t.slice("image:".length)),
  );

  const results: AnalysedResult[] = [];

  for (const filename of candidates) {
    if (!force && knownImages.has(filename)) {
      results.push({ filename, status: "skipped" });
      continue;
    }

    try {
      const diskPath = path.join(KNOWLEDGE_REFS_DIR, filename);
      const buf = await fs.readFile(diskPath);
      const mime = mimeFromExt(path.extname(filename));
      const industry = inferIndustry(filename);
      const imagePath = path.posix.join(KNOWLEDGE_REFS_URL_PREFIX, filename);

      const spec = await analyseImageToStyleSpec({
        imagePath,
        imageName: filename,
        industryHint: industry,
        imageBase64DataUrl: `data:${mime};base64,${buf.toString("base64")}`,
      });

      const body = composeStyleSpecRecordBody(spec);
      const id = styleSpecRecordId(filename);

      await store.save({
        id,
        layer: "L1",
        kind: "design-knowledge",
        title: `Style Spec — ${filename}`,
        body,
        tags: [
          `industry:${spec.industry}`,
          `source:vision-distill`,
          `image:${filename}`,
          `manual:approved`,
        ],
        source: "distill",
        refs: {},
        metrics: { score: 0.8, hits: 0 },
      });

      results.push({ filename, status: "analysed", id, industry: spec.industry });
    } catch (err) {
      console.error(`[analyze-existing] ${filename}:`, err);
      results.push({
        filename,
        status: "failed",
        error: (err as Error).message,
      });
    }
  }

  const summary = {
    analysed: results.filter((r) => r.status === "analysed").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    failed: results.filter((r) => r.status === "failed").length,
    total: results.length,
  };

  return NextResponse.json({ ok: true, summary, results });
}
