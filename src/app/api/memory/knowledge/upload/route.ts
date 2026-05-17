/**
 * POST /api/memory/knowledge/upload
 *
 * Accepts a `multipart/form-data` request with:
 *   - file:     the reference image (image/png, image/jpeg, image/webp)
 *   - industry: "ai" | "fintech-web3" | "saas" | "generic" (optional, default "generic")
 *
 * Behaviour:
 *   1. Saves the file to `public/knowledge-refs/<industry>-<sanitised-name>`.
 *   2. Calls the vision analyser → produces a structured StyleSpec.
 *   3. Persists the spec as a `design-knowledge` memory record whose body
 *      contains both the Markdown summary and a full HTML visualisation
 *      document (see compose-body.ts).
 *
 * Returns the saved record id, the public image path, and the parsed spec.
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

const ALLOWED_INDUSTRIES: ReadonlyArray<StyleSpecIndustry> = [
  "ai",
  "fintech-web3",
  "saas",
  "generic",
];

const KNOWLEDGE_REFS_DIR = path.join(process.cwd(), "public", "knowledge-refs");
const KNOWLEDGE_REFS_URL_PREFIX = "/knowledge-refs/";

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB

function sanitiseFilename(raw: string): string {
  const base = path.basename(raw).toLowerCase();
  return base.replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-");
}

function pickIndustry(value: FormDataEntryValue | null): StyleSpecIndustry {
  const v = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (ALLOWED_INDUSTRIES.includes(v as StyleSpecIndustry)) {
    return v as StyleSpecIndustry;
  }
  return "generic";
}

function bytesToDataUrl(bytes: Buffer, mime: string): string {
  return `data:${mime};base64,${bytes.toString("base64")}`;
}

export async function POST(req: Request) {
  if (!memoryEnabled()) {
    return NextResponse.json(
      { ok: false, reason: "memory_disabled" },
      { status: 200 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: `invalid multipart: ${(err as Error).message}` },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, error: "file field is required" },
      { status: 400 },
    );
  }
  if (file.size === 0) {
    return NextResponse.json(
      { ok: false, error: "file is empty" },
      { status: 400 },
    );
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { ok: false, error: `file exceeds ${MAX_FILE_BYTES} bytes` },
      { status: 400 },
    );
  }
  const mime = file.type || "image/png";
  if (!mime.startsWith("image/")) {
    return NextResponse.json(
      { ok: false, error: `unsupported content-type: ${mime}` },
      { status: 400 },
    );
  }

  const industry = pickIndustry(form.get("industry"));
  const originalName = sanitiseFilename(file.name || "upload.png");
  const finalName = originalName.startsWith(`${industry}-`)
    ? originalName
    : `${industry}-${originalName}`;
  const imagePath = path.posix.join(KNOWLEDGE_REFS_URL_PREFIX, finalName);
  const diskPath = path.join(KNOWLEDGE_REFS_DIR, finalName);

  // ── 1. Persist to disk ────────────────────────────────────────────────────
  try {
    await fs.mkdir(KNOWLEDGE_REFS_DIR, { recursive: true });
    const buf = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(diskPath, buf);

    // ── 2. Vision analysis ──────────────────────────────────────────────────
    const spec = await analyseImageToStyleSpec({
      imagePath,
      imageName: finalName,
      industryHint: industry,
      imageBase64DataUrl: bytesToDataUrl(buf, mime),
    });

    // ── 3. Persist memory record ────────────────────────────────────────────
    const store = getSystemMemory();
    const body = composeStyleSpecRecordBody(spec);
    const id = styleSpecRecordId(finalName);

    const saved = await store.save({
      id,
      layer: "L1",
      kind: "design-knowledge",
      title: `Style Spec — ${finalName}`,
      body,
      tags: [
        `industry:${spec.industry}`,
        `source:vision-distill`,
        `image:${finalName}`,
        `manual:approved`,
      ],
      source: "distill",
      refs: {},
      metrics: { score: 0.8, hits: 0 },
    });

    return NextResponse.json({
      ok: true,
      record: { id: saved.id, title: saved.title, imagePath },
      spec,
    });
  } catch (err) {
    console.error("[memory/knowledge/upload] failed:", err);
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}
