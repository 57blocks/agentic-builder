import { NextRequest, NextResponse } from "next/server";
import {
  generateTrdReview,
  type TrdReviewResult,
} from "@/lib/agents/architect/trd-reviewer-agent";
import type { ProjectTier } from "@/lib/agents";

// Reviewer can take a while when running against large TRDs.
export const maxDuration = 180;

/**
 * POST /api/agents/trd-review
 *
 * Body: { prd: string, trd: string, tier: "S" | "M" | "L" }
 *
 * Returns: { result: TrdReviewResult }
 *
 * Cross-vendor review of a freshly generated TRD. Uses a different model
 * from the TRD writer (default Claude Sonnet) to catch hallucinations the
 * writer would self-rationalise.
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

  const obj =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const prd = typeof obj.prd === "string" ? obj.prd.trim() : "";
  const trd = typeof obj.trd === "string" ? obj.trd.trim() : "";
  const rawTier = typeof obj.tier === "string" ? obj.tier.toUpperCase() : "";

  if (!prd) {
    return NextResponse.json({ error: "prd is required" }, { status: 400 });
  }
  if (!trd) {
    return NextResponse.json({ error: "trd is required" }, { status: 400 });
  }

  const tier: ProjectTier =
    rawTier === "S" || rawTier === "M" || rawTier === "L"
      ? (rawTier as ProjectTier)
      : "M";

  try {
    const result: TrdReviewResult = await generateTrdReview(prd, trd, tier);
    return NextResponse.json({ result });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "TRD review failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
