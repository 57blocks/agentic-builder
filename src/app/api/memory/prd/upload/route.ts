import { NextResponse } from "next/server";
import { memoryEnabled } from "@/lib/memory/env";
import {
  persistPrdKnowledge,
  PrdKnowledgeExtractError,
} from "@/lib/memory/knowledge/prd-knowledge/persist";

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MIN_PRD_CHARS = 200;
const ALLOWED_EXTENSIONS = [".md", ".markdown"];

type UploadError =
  | "memory_disabled"
  | "no_file"
  | "invalid_extension"
  | "file_too_large"
  | "file_too_short"
  | "extract_failed"
  | "internal_error";

function fail(status: number, error: UploadError): NextResponse {
  return NextResponse.json({ ok: false, error }, { status });
}

function hasAllowedExtension(name: string): boolean {
  const lower = name.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export async function POST(req: Request): Promise<NextResponse> {
  if (!memoryEnabled()) return fail(503, "memory_disabled");

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail(400, "no_file");
  }

  const file = form.get("file");
  if (!(file instanceof File)) return fail(400, "no_file");

  if (!hasAllowedExtension(file.name)) return fail(400, "invalid_extension");
  if (file.size > MAX_FILE_BYTES) return fail(413, "file_too_large");

  let text: string;
  try {
    text = await file.text();
  } catch {
    return fail(400, "no_file");
  }

  if (text.length < MIN_PRD_CHARS) return fail(400, "file_too_short");

  try {
    const { id, record } = await persistPrdKnowledge({
      finalPrd: text,
      projectType: "uploaded",
      tier: "M",
      source: "manual",
      idempotencyCheck: false,
    });
    return NextResponse.json({
      ok: true,
      id,
      title: record.title,
      industry: record.industry,
      productType: record.productType,
    });
  } catch (err) {
    if (err instanceof PrdKnowledgeExtractError) {
      return fail(400, "extract_failed");
    }
    console.warn("[memory] prd upload failed:", (err as Error).message);
    return fail(500, "internal_error");
  }
}
