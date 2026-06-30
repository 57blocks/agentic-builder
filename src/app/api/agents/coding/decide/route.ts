import { NextResponse } from "next/server";
import { resolveHumanDecision } from "@/lib/pipeline/human-decision";

/**
 * POST /api/agents/coding/decide
 *
 * Resolves a pending human-in-the-loop decision for an active
 * integration_verify_fix session.
 *
 * Body: { sessionId: string; decisionId: string; directive?: string }
 * - sessionId: the coding session that is waiting for input
 * - decisionId: one of the option ids for the pending decision
 * - directive: optional free-text correction the human typed. For options with
 *   `requiresDirective`, this is the authoritative guidance fed back into the
 *   next fix attempt (e.g. "the test is wrong: expected status is 'paid'").
 *
 * Returns 200 { ok: true } on success, 404 when no pending decision exists
 * (e.g. already timed out or the session ended).
 */
export async function POST(req: Request) {
  let body: { sessionId?: string; decisionId?: string; directive?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { sessionId, decisionId, directive } = body;

  if (!sessionId || typeof sessionId !== "string") {
    return NextResponse.json(
      { error: "sessionId is required" },
      { status: 400 },
    );
  }
  if (!decisionId || typeof decisionId !== "string") {
    return NextResponse.json(
      { error: "decisionId is required" },
      { status: 400 },
    );
  }
  if (directive !== undefined && typeof directive !== "string") {
    return NextResponse.json(
      { error: "directive must be a string" },
      { status: 400 },
    );
  }

  const resolved = resolveHumanDecision(sessionId, decisionId, directive);
  if (!resolved) {
    return NextResponse.json(
      {
        error:
          "No pending decision found for this session. It may have already timed out or the session has ended.",
      },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}
