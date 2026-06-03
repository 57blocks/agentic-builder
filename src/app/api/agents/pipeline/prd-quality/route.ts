import { NextRequest, NextResponse } from "next/server";

import {
  runPrdQualityGate,
  type PrdQualityFinding,
} from "@/lib/pipeline/gates/prd-quality-gate";
import {
  generatePrdReview,
  mergePrdFindings,
} from "@/lib/agents/pm/prd-reviewer-agent";
import type { PrdSpec } from "@/lib/requirements/prd-spec-types";

/**
 * On-demand PRD quality check. Runs Layer 1 (deterministic gate) always, and
 * Layer 2 (LLM semantic reviewer) when `runLayer2` is set, then merges +
 * dedups into one report. Advisory — never mutates anything.
 *
 * POST body: { prd: string, spec?: PrdSpec | null, runLayer2?: boolean, model?: string }
 */

const SEVERITY_WEIGHT = { blocker: 20, warn: 5, info: 1 } as const;

function summarise(findings: PrdQualityFinding[]) {
  const counts = {
    blocker: findings.filter((f) => f.severity === "blocker").length,
    warn: findings.filter((f) => f.severity === "warn").length,
    info: findings.filter((f) => f.severity === "info").length,
  };
  const penalty = findings.reduce(
    (s, f) => s + SEVERITY_WEIGHT[f.severity],
    0,
  );
  return { counts, score: Math.max(0, 100 - penalty), passed: counts.blocker === 0 };
}

export async function POST(req: NextRequest) {
  let body: {
    prd?: string;
    spec?: PrdSpec | null;
    runLayer2?: boolean;
    model?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const prd = (body.prd ?? "").trim();
  if (!prd) {
    return NextResponse.json({ error: "`prd` is required" }, { status: 400 });
  }
  const spec = body.spec ?? null;

  // ── Layer 1 (deterministic, always) ──────────────────────────────────────
  const l1 = runPrdQualityGate({ prdMarkdown: prd, spec });

  // ── Layer 2 (LLM, optional) ───────────────────────────────────────────────
  let layer2: {
    ran: boolean;
    summary?: string;
    score?: number;
    model?: string;
    costUsd?: number;
    error?: string;
  } = { ran: false };
  let findings = l1.findings;

  if (body.runLayer2) {
    try {
      const review = await generatePrdReview(prd, spec, {
        knownFindings: l1.findings,
        model: body.model,
      });
      findings = mergePrdFindings(l1.findings, review.findings);
      layer2 = {
        ran: true,
        summary: review.overall.summary,
        score: review.overall.score,
        model: review.model,
        costUsd: review.costUsd,
      };
    } catch (e) {
      // L2 is best-effort — degrade to the L1-only report with a note.
      layer2 = {
        ran: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  const { counts, score, passed } = summarise(findings);

  return NextResponse.json({
    findings,
    counts,
    score,
    passed,
    specAnalyzed: l1.specAnalyzed,
    layer2,
  });
}
