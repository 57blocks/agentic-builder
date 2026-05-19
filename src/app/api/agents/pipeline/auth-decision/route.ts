/**
 * Auth Decision API
 *
 *   GET  → return the persisted `.blueprint/auth-decision.json` (null if
 *          none yet). Used by the Wizard to render the current state.
 *   POST → run AuthDeciderAgent on PRD (+ optional TRD), persist result,
 *          return the decision. Used by the Wizard "Suggest" button and
 *          by the pipeline after PRD generation completes.
 *   PUT  → upsert a user-overridden decision (no LLM call). Used when the
 *          user clicks a different radio in the Wizard.
 */

import { NextRequest, NextResponse } from "next/server";

import {
  AuthDeciderAgent,
} from "@/lib/agents/architect/auth-decider-agent";
import {
  authDecisionFileAbs,
  normalizeAuthDecision,
  readAuthDecision,
  writeAuthDecision,
} from "@/lib/pipeline/auth-decision-io";
import {
  buildDefaultAuthDecision,
  type AuthDecision,
} from "@/lib/agents/architect/auth-decision-types";

export const runtime = "nodejs";
export const maxDuration = 60;

function projectRoot() {
  return process.cwd();
}

export async function GET() {
  const existing = await readAuthDecision(projectRoot());
  return NextResponse.json({
    decision: existing,
    filePath: authDecisionFileAbs(projectRoot()),
  });
}

export async function POST(request: NextRequest) {
  let body: { prd?: string; trd?: string; sessionId?: string };
  try {
    body = await request.json();
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? `Invalid JSON body: ${err.message}`
            : "Invalid JSON body.",
      },
      { status: 400 },
    );
  }

  const prd = body.prd?.trim();
  if (!prd) {
    return NextResponse.json(
      { error: "Missing `prd` content." },
      { status: 400 },
    );
  }

  // Don't overwrite a user-overridden decision unless explicitly forced.
  const existing = await readAuthDecision(projectRoot());
  if (existing?.userOverridden) {
    return NextResponse.json({
      decision: existing,
      source: "existing-user-override",
      skipped: true,
    });
  }

  const agent = new AuthDeciderAgent();
  let out;
  try {
    out = await agent.decide({ prd, trd: body.trd }, body.sessionId);
  } catch (err) {
    // Hard failure: persist a default decision so the Wizard still works.
    const fallback = await writeAuthDecision(
      projectRoot(),
      buildDefaultAuthDecision(
        `Decider agent crashed (${
          err instanceof Error ? err.message : "unknown error"
        }); falling back to password+RBAC default.`,
      ),
    );
    return NextResponse.json({
      decision: fallback,
      source: "default-on-error",
      error: err instanceof Error ? err.message : "decider failed",
    });
  }

  const saved = await writeAuthDecision(projectRoot(), out.decision);
  return NextResponse.json({
    decision: saved,
    source: out.source,
    parseError: out.parseError,
    raw: out.raw,
    model: out.model,
    costUsd: out.costUsd,
    durationMs: out.durationMs,
  });
}

export async function PUT(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? `Invalid JSON body: ${err.message}`
            : "Invalid JSON body.",
      },
      { status: 400 },
    );
  }

  const decisionInput =
    typeof body === "object" && body !== null && "decision" in body
      ? (body as { decision: unknown }).decision
      : body;

  // Force the user-override flag on regardless of what the client sends.
  const normalised = normalizeAuthDecision(decisionInput);
  if (!normalised) {
    return NextResponse.json(
      { error: "Decision body invalid; missing `mode` or unrecognised value." },
      { status: 400 },
    );
  }
  const toSave: AuthDecision = { ...normalised, userOverridden: true };

  const saved = await writeAuthDecision(projectRoot(), toSave);
  return NextResponse.json({ decision: saved, source: "user-override" });
}
