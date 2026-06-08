/**
 * PRD Flow Tracer agent — PRD quality gate Layer 2 (semantic, LLM), flow-tracing
 * pass.
 *
 * Distinct from the general PRD reviewer: this agent does ONE job — enumerate
 * every end-to-end business flow / user journey the PRD intends, trace each one
 * step by step (trigger → steps → terminal), and report only the steps that are
 * MISSING or underspecified (no page, no API/handler, no rule, or no navigation
 * to the next step). That is the gap a deterministic gate (L0/L1) cannot see:
 * "this whole flow / this middle step was never written", which is the leading
 * cause of a generated feature that works only halfway.
 *
 * It runs alongside the general reviewer (see prd-reviewer-agent) and emits the
 * SAME PrdQualityFinding shape so findings merge into one report. Every finding
 * is forced to the `flow-completeness` dimension so it groups with the L0/L1
 * flow findings under one tag. Parsing is defensive — malformed JSON degrades
 * to an empty trace instead of throwing.
 */

import { chatCompletion, resolveModel, estimateCost } from "@/lib/openrouter";
import type {
  ChatMessage,
  OpenRouterOptions,
  OpenRouterResponse,
} from "@/lib/llm-types";
import { MODEL_CONFIG } from "@/lib/model-config";
import type { PrdSpec } from "@/lib/requirements/prd-spec-types";
import { formatPrdSpecForContext } from "@/lib/requirements/prd-spec-extractor";
import type {
  PrdQualityFinding,
  PrdQualitySeverity,
} from "@/lib/pipeline/gates/prd-quality-gate";

export const PRD_FLOW_TRACER_PROMPT_VERSION = "v1-2026-06-08-flow-trace";

/** One traced flow, kept for transparency / summary (not actionable itself). */
export interface FlowTrace {
  name: string;
  trigger: string;
  steps: string[];
  terminal: string;
  complete: boolean;
}

export interface FlowTraceResult {
  flows: FlowTrace[];
  /** Gaps found while tracing — same shape as the gate, dimension forced to
   *  flow-completeness so they merge + tag with the L0/L1 flow findings. */
  findings: PrdQualityFinding[];
  // Provenance
  model: string;
  promptVersion: string;
  costUsd: number;
  durationMs: number;
}

export interface GenerateFlowTraceOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  /** Findings already known (L1 + reviewer) — tracer is told NOT to repeat. */
  knownFindings?: PrdQualityFinding[];
  /** Test seam: inject a chat-completion impl to keep unit tests hermetic. */
  chatCompletionImpl?: (
    messages: ChatMessage[],
    opts: OpenRouterOptions,
  ) => Promise<OpenRouterResponse>;
}

const SYSTEM_PROMPT = `You are a senior staff engineer TRACING the end-to-end business flows of a Product Requirements Document (PRD) before any code is written.

You receive:
1. The PRD markdown.
2. A structured spec extracted from it (pages, components, entities, workflows, rules).
3. Issues a deterministic linter and a general reviewer already found (do NOT repeat these).

Your ONLY job: enumerate every distinct business flow / user journey the PRD intends, trace each one step by step, and find where it BREAKS or is INCOMPLETE — the kind of gap that makes a generated feature work only halfway.

Identify flows from: user stories / acceptance criteria, entity workflows (state machines), and the primary journeys the pages imply. Example flows: "user places an order", "admin approves a refund", "user resets a forgotten password".

For EACH flow, trace: trigger → each ordered step → terminal outcome. At every step, check the PRD actually provides what the step NEEDS:
- a PAGE/SCREEN or UI control to perform it,
- a BACKEND action / API / handler to execute it,
- any RULE / validation / data it depends on,
- a NAVIGATION path to the next step.

Report a finding ONLY for a step that is MISSING or UNDERSPECIFIED — name the flow, the broken step, and exactly what is absent. Do NOT report flows that are complete. Do NOT restate the structural/semantic issues you were given.

Severity:
- **blocker**: the flow cannot complete as written (a required step has no page/API/rule at all).
- **warn**: the flow completes on the happy path but a needed branch/edge step is missing (the failure / empty / cancel / retry path).
- **info**: minor.
Be sparing with "blocker".

## Output — STRICT JSON, no commentary, no markdown fences

{
  "flows": [
    { "name": "user places an order", "trigger": "what starts it", "steps": ["step 1", "step 2"], "terminal": "the end state", "complete": true }
  ],
  "findings": [
    {
      "flow": "which flow this gap is in",
      "step": "the specific step that breaks",
      "missing": "page | api | rule | navigation",
      "severity": "blocker | warn | info",
      "section": "the PRD heading / page id this is about",
      "problem": "what is missing, in business language",
      "downstreamImpact": "what codegen will build half-way as a result",
      "suggestedFix": "a concrete edit the author can make"
    }
  ]
}

Rules:
- Trace at most 12 flows; report at most 12 findings.
- Every finding MUST tie to a flow + step. No generic advice.
- Output ONLY the JSON object. No backticks, no preface.`;

function buildUserMessage(
  prdContent: string,
  spec: PrdSpec | null | undefined,
  knownFindings: PrdQualityFinding[],
): string {
  const known = knownFindings.length
    ? knownFindings
        .map((f) => `- [${f.dimension}/${f.severity}] ${f.section}: ${f.problem}`)
        .join("\n")
    : "(none)";
  return [
    "## PRD",
    "",
    prdContent.trim(),
    "",
    "## Structured spec (extracted)",
    "",
    spec ? formatPrdSpecForContext(spec) : "(structured spec unavailable)",
    "",
    "## Issues already found — DO NOT repeat these",
    "",
    known,
    "",
    "Trace the flows and output the strict JSON now.",
  ].join("\n");
}

export async function generateFlowTrace(
  prdContent: string,
  spec: PrdSpec | null | undefined,
  opts: GenerateFlowTraceOptions = {},
): Promise<FlowTraceResult> {
  const modelId = opts.model ?? MODEL_CONFIG.prdReviewer;
  const model = resolveModel(modelId);

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: buildUserMessage(prdContent, spec, opts.knownFindings ?? []),
    },
  ];

  const callOpts: OpenRouterOptions = {
    model,
    temperature: opts.temperature ?? 0.2,
    max_tokens: opts.maxTokens ?? 6000,
    response_format: { type: "json_object" },
  };

  const startMs = Date.now();
  const complete = opts.chatCompletionImpl ?? chatCompletion;
  const response = await complete(messages, callOpts);
  const durationMs = Date.now() - startMs;
  const costUsd = estimateCost(response.model, response.usage);

  const raw = response.choices[0]?.message?.content ?? "";
  const parsed = parseFlowTraceResponse(raw);

  return {
    ...parsed,
    model: response.model,
    promptVersion: PRD_FLOW_TRACER_PROMPT_VERSION,
    costUsd,
    durationMs,
  };
}

// ─── Defensive parser (exported for tests) ──────────────────────────────────

type ParsedShell = Pick<FlowTraceResult, "flows" | "findings">;

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function asSeverity(v: unknown): PrdQualitySeverity {
  const s = String(v ?? "warn").toLowerCase();
  if (s === "blocker" || s === "warn" || s === "info") return s;
  return "warn";
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => asString(x).trim()).filter(Boolean);
}

export function parseFlowTraceResponse(raw: string): ParsedShell {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return { flows: [], findings: [] };
  let parsed: unknown;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return { flows: [], findings: [] };
  }
  const obj = parsed as Record<string, unknown>;

  const flows: FlowTrace[] = [];
  for (const rawF of Array.isArray(obj.flows) ? obj.flows : []) {
    if (!rawF || typeof rawF !== "object") continue;
    const o = rawF as Record<string, unknown>;
    const name = asString(o.name).trim();
    if (!name) continue;
    flows.push({
      name,
      trigger: asString(o.trigger),
      steps: asStringArray(o.steps),
      terminal: asString(o.terminal),
      complete: o.complete !== false,
    });
  }

  const findings: PrdQualityFinding[] = [];
  for (const rawF of Array.isArray(obj.findings) ? obj.findings : []) {
    if (!rawF || typeof rawF !== "object") continue;
    const o = rawF as Record<string, unknown>;
    const problem = asString(o.problem).trim();
    if (!problem) continue;
    const flow = asString(o.flow).trim();
    const step = asString(o.step).trim();
    // Prefer a flow › step anchor; fall back to the model's section.
    const section =
      flow || step
        ? `Flow "${flow || "?"}"${step ? ` › ${step}` : ""}`
        : asString(o.section, "(unspecified)");
    findings.push({
      id: `PQ-L2F-${String(findings.length + 1).padStart(3, "0")}`,
      // Every gap a flow trace finds is, by definition, a flow-completeness gap.
      dimension: "flow-completeness",
      severity: asSeverity(o.severity),
      section,
      problem,
      downstreamImpact: asString(o.downstreamImpact),
      suggestedFix: asString(o.suggestedFix),
    });
  }

  return { flows: flows.slice(0, 12), findings: findings.slice(0, 12) };
}
