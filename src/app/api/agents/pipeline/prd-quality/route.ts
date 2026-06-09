import { NextRequest, NextResponse } from "next/server";

import {
  runPrdQualityGate,
  type PrdQualityFinding,
} from "@/lib/pipeline/gates/prd-quality-gate";
import {
  generatePrdReview,
  mergePrdFindings,
} from "@/lib/agents/pm/prd-reviewer-agent";
import { generateFlowTrace } from "@/lib/agents/pm/prd-flow-tracer-agent";
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
    flowsTraced?: number;
    error?: string;
  } = { ran: false };
  let findings = l1.findings;

  if (body.runLayer2) {
    // Run the general reviewer and the flow tracer concurrently — they answer
    // different questions (semantic quality vs. broken/missing flows) and
    // together feed one merged report. Each is independently best-effort.
    const [reviewRes, flowRes] = await Promise.allSettled([
      generatePrdReview(prd, spec, {
        knownFindings: l1.findings,
        model: body.model,
      }),
      generateFlowTrace(prd, spec, {
        knownFindings: l1.findings,
        model: body.model,
      }),
    ]);

    const review = reviewRes.status === "fulfilled" ? reviewRes.value : null;
    const flow = flowRes.status === "fulfilled" ? flowRes.value : null;

    if (review || flow) {
      // Flow tracer is told the reviewer's findings too, but they run in
      // parallel so we dedupe here at merge time.
      const semantic = [...(review?.findings ?? []), ...(flow?.findings ?? [])];
      findings = mergePrdFindings(l1.findings, semantic);
      const costUsd = (review?.costUsd ?? 0) + (flow?.costUsd ?? 0);
      const tracedNote =
        flow && flow.flows.length
          ? ` · traced ${flow.flows.length} flow(s)`
          : "";
      layer2 = {
        ran: true,
        summary: (review?.overall.summary ?? "Flow trace complete") + tracedNote,
        score: review?.overall.score,
        model: review?.model ?? flow?.model,
        costUsd,
        flowsTraced: flow?.flows.length ?? 0,
      };
    } else {
      // Both passes failed — degrade to the L1-only report with a note.
      const err =
        reviewRes.status === "rejected" ? reviewRes.reason : flowRes.status === "rejected" ? flowRes.reason : null;
      layer2 = {
        ran: false,
        error: err instanceof Error ? err.message : String(err ?? "Layer 2 failed"),
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
