import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { generatePrdIntent, type PrdIntentImage } from "@/lib/agents/intent";
import { readManifest } from "@/lib/pipeline/design-references";

// v2 prompt emits ~30 questions worst case; allow generous room for slow models.
export const maxDuration = 180;

/** Max reference screenshots fed to the vision pass (keeps the payload sane). */
const MAX_INTENT_IMAGES = 8;

/**
 * Load uploaded design-reference IMAGES (shared with the Design stage) as
 * vision-ready data URLs so the PRD intent pass can summarize functional
 * requirements from them. Best-effort: returns [] on any failure.
 */
async function loadUploadedImages(): Promise<PrdIntentImage[]> {
  try {
    const refs = await readManifest(process.cwd());
    const imageRefs = refs.filter((r) => r.kind === "image").slice(0, MAX_INTENT_IMAGES);
    const out: PrdIntentImage[] = [];
    for (const ref of imageRefs) {
      try {
        const bytes = await fs.readFile(
          path.join(process.cwd(), ".blueprint", "design-references", ref.storedFileName),
        );
        out.push({
          dataUrl: `data:${ref.mime};base64,${bytes.toString("base64")}`,
          label: ref.label || ref.fileName,
          pageHint: ref.pageHint || undefined,
        });
      } catch {
        // skip unreadable file
      }
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * POST /api/agents/prd-intent
 *
 * Body: { featureBrief: string }
 *
 * Returns: { result: IntentResult }
 *
 * Generates a structured set of clarifying questions covering the 10 fixed
 * PRD coverage dimensions. Phrasing is contextual to the brief — the
 * dimension list guarantees coverage, the model writes the actual questions.
 *
 * The client renders the result as a form, collects answers, then forwards
 * them via `prdIntent` in the body of `/api/agents/pipeline`.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const featureBriefRaw =
    body && typeof body === "object" && "featureBrief" in body
      ? (body as { featureBrief?: unknown }).featureBrief
      : undefined;
  const featureBrief =
    typeof featureBriefRaw === "string" ? featureBriefRaw.trim() : "";

  if (!featureBrief) {
    return NextResponse.json(
      { error: "featureBrief is required" },
      { status: 400 },
    );
  }

  // Opt-out flag; default ON so uploaded reference screenshots enrich the PRD.
  const useUploadedImages =
    !body ||
    typeof body !== "object" ||
    !("useUploadedImages" in body) ||
    (body as { useUploadedImages?: unknown }).useUploadedImages !== false;

  try {
    const images = useUploadedImages ? await loadUploadedImages() : [];
    if (images.length > 0) {
      console.log(`[prd-intent] vision pass with ${images.length} reference screenshot(s).`);
    }
    const result = await generatePrdIntent(featureBrief, { images });
    return NextResponse.json({ result, imagesUsed: images.length });
  } catch (err) {
    const msg =
      err instanceof Error
        ? err.message
        : "PRD intent generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
