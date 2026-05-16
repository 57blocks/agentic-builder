import { NextRequest, NextResponse } from "next/server";
import { generatePrdIntent } from "@/lib/agents/intent";

// v2 prompt emits ~30 questions worst case; allow generous room for slow models.
export const maxDuration = 180;

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

  try {
    const result = await generatePrdIntent(featureBrief);
    return NextResponse.json({ result });
  } catch (err) {
    const msg =
      err instanceof Error
        ? err.message
        : "PRD intent generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
