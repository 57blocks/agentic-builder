import { NextRequest } from "next/server";
import { extractBuildPlan } from "@/lib/agentic-build";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ExtractRequest {
  /** The free-form markdown spec / plan document. */
  spec: string;
  model?: string;
}

/**
 * Step 1 of the Agentic Build flow (hybrid extraction): turn a markdown spec
 * into a structured BuildPlan draft for the user to review/edit before running.
 * Returns JSON (not SSE) — it's a single LLM call.
 */
export async function POST(request: NextRequest) {
  let body: ExtractRequest;
  try {
    body = (await request.json()) as ExtractRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body?.spec || typeof body.spec !== "string" || !body.spec.trim()) {
    return Response.json({ error: "spec is required" }, { status: 400 });
  }

  try {
    const result = await extractBuildPlan(body.spec, { model: body.model });
    return Response.json({
      plan: result.plan,
      model: result.model,
      promptVersion: result.promptVersion,
      costUsd: result.costUsd,
      durationMs: result.durationMs,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[agentic-build/extract] failed:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
