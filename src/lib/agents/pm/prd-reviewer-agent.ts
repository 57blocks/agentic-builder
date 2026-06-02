/**
 * PRD Reviewer agent — PRD quality gate Layer 2 (semantic, LLM).
 *
 * Cross-vendor critic for the PRD. Reads the PRD markdown + the structured
 * PrdSpec and judges whether it is a GOOD, BUILDABLE spec from the downstream
 * code / task-breakdown perspective — the things a deterministic gate (Layer 1)
 * cannot see: ambiguity, contradictions, missing business rules / edge cases,
 * broken user journeys.
 *
 * The model is deliberately different from the PRD writer's (see
 * MODEL_CONFIG.prdReviewer) so the reviewer doesn't share the author's blind
 * spots. Layer-1 findings are passed in and the reviewer is told NOT to repeat
 * them, so the two layers complement rather than duplicate each other.
 *
 * Output is the SAME PrdQualityFinding shape Layer 1 emits, so a caller can
 * merge both into one report (see mergePrdFindings). Parsing is defensive — any
 * malformed JSON degrades to an empty review instead of throwing.
 */

import {
  chatCompletion,
  resolveModel,
  estimateCost,
} from "@/lib/openrouter";
import type {
  ChatMessage,
  OpenRouterOptions,
  OpenRouterResponse,
} from "@/lib/llm-types";
import { MODEL_CONFIG } from "@/lib/model-config";
import type { PrdSpec } from "@/lib/requirements/prd-spec-types";
import { formatPrdSpecForContext } from "@/lib/requirements/prd-spec-extractor";
import type {
  PrdQualityDimension,
  PrdQualityFinding,
  PrdQualitySeverity,
} from "@/lib/pipeline/gates/prd-quality-gate";

export const PRD_REVIEWER_PROMPT_VERSION = "v1-2026-06-02-buildability";

export interface PrdReviewResult {
  overall: { score: number; summary: string }; // score 1-10
  /** Semantic findings, same shape as Layer 1 so reports merge. */
  findings: PrdQualityFinding[];
  // Provenance
  model: string;
  promptVersion: string;
  costUsd: number;
  durationMs: number;
}

export interface GeneratePrdReviewOptions {
  /** Override model id (defaults to MODEL_CONFIG.prdReviewer). */
  model?: string;
  maxTokens?: number;
  temperature?: number;
  /** Layer-1 findings already known — reviewer is told NOT to repeat them. */
  knownFindings?: PrdQualityFinding[];
  /** Test seam: inject a chat-completion impl to keep unit tests hermetic. */
  chatCompletionImpl?: (
    messages: ChatMessage[],
    opts: OpenRouterOptions,
  ) => Promise<OpenRouterResponse>;
}

const SEMANTIC_DIMENSIONS: readonly PrdQualityDimension[] = [
  "completeness",
  "ambiguity",
  "contradiction",
  "business-flow",
  "user-path",
];

const SYSTEM_PROMPT = `You are a senior staff engineer + product manager performing a critical review of a Product Requirements Document (PRD) BEFORE any code is written.

You receive:
1. The PRD markdown.
2. A structured spec extracted from it (pages, components, entities, workflows, rules).
3. A list of STRUCTURAL issues a deterministic linter already found (do NOT repeat these).

Your job: judge whether this PRD is a GOOD, BUILDABLE spec from the downstream task-breakdown / codegen perspective. Focus ONLY on things a linter cannot see — semantics, not structure:

- **completeness**: a described feature/flow is missing a critical part (e.g. a checkout flow with no payment-failure path; a "refund" feature with no approval rule; a list with no defined sort/filter/pagination behaviour; auth with no session-expiry behaviour).
- **ambiguity**: wording that forces a developer to guess (e.g. "admin can manage users" without saying which fields/actions; "show recent activity" without defining recency or shape).
- **contradiction**: two parts of the PRD disagree (e.g. page A says paginated 20/page, page B implies infinite scroll; a field is required on one screen, optional on another).
- **business-flow**: the domain logic is underspecified or internally inconsistent in a way that would make the generated backend wrong (missing rule inputs, undefined state transitions, entities referenced but never defined).
- **user-path**: a user journey is broken or unreachable (you can reach "edit" but no "save" is described; a role has pages but no way to navigate between them).

For EACH finding, name the concrete PRD section/page and explain what the downstream task-breakdown or codegen would be forced to guess or get wrong. Be specific — no generic advice.

Severity:
- **blocker**: codegen will produce something the user notices is wrong/missing.
- **warn**: buildable but a stronger PRD would specify this.
- **info**: minor / nice-to-have.
Be sparing with "blocker".

## Output — STRICT JSON, no commentary, no markdown fences

{
  "overall": { "score": 1-10, "summary": "one-sentence headline" },
  "findings": [
    {
      "dimension": "completeness | ambiguity | contradiction | business-flow | user-path",
      "severity": "blocker | warn | info",
      "section": "the PRD heading / page id or name this is about",
      "problem": "what is wrong, in business language",
      "downstreamImpact": "what task-breakdown / codegen will guess or get wrong",
      "suggestedFix": "a concrete edit the author can make"
    }
  ]
}

Rules:
- Maximum 12 findings — force prioritisation.
- Do NOT restate the structural issues you were given.
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
    "## Structural issues already found by the linter — DO NOT repeat these",
    "",
    known,
    "",
    "Output the strict JSON review now.",
  ].join("\n");
}

export async function generatePrdReview(
  prdContent: string,
  spec: PrdSpec | null | undefined,
  opts: GeneratePrdReviewOptions = {},
): Promise<PrdReviewResult> {
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
  const parsed = parsePrdReviewResponse(raw);

  return {
    ...parsed,
    model: response.model,
    promptVersion: PRD_REVIEWER_PROMPT_VERSION,
    costUsd,
    durationMs,
  };
}

// ─── Defensive parser (exported for tests) ──────────────────────────────────

type ParsedShell = Pick<PrdReviewResult, "overall" | "findings">;

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function asSeverity(v: unknown): PrdQualitySeverity {
  const s = String(v ?? "warn").toLowerCase();
  if (s === "blocker" || s === "warn" || s === "info") return s;
  return "warn";
}

function asDimension(v: unknown): PrdQualityDimension {
  const s = String(v ?? "").toLowerCase() as PrdQualityDimension;
  return SEMANTIC_DIMENSIONS.includes(s) ? s : "completeness";
}

function clampScore10(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n ?? 0);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(10, Math.round(v)));
}

export function parsePrdReviewResponse(raw: string): ParsedShell {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return emptyShell("parser_no_json");
  let parsed: unknown;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return emptyShell("parser_invalid_json");
  }
  const obj = parsed as Record<string, unknown>;

  const overallRaw = (obj.overall ?? {}) as Record<string, unknown>;
  const overall = {
    score: clampScore10(overallRaw.score),
    summary: asString(overallRaw.summary, "—"),
  };

  const arr = Array.isArray(obj.findings) ? obj.findings : [];
  const findings: PrdQualityFinding[] = [];
  for (const rawF of arr) {
    if (!rawF || typeof rawF !== "object") continue;
    const o = rawF as Record<string, unknown>;
    const problem = asString(o.problem).trim();
    if (!problem) continue;
    findings.push({
      id: `PQ-L2-${String(findings.length + 1).padStart(3, "0")}`,
      dimension: asDimension(o.dimension),
      severity: asSeverity(o.severity),
      section: asString(o.section, "(unspecified)"),
      problem,
      downstreamImpact: asString(o.downstreamImpact),
      suggestedFix: asString(o.suggestedFix),
    });
  }

  return { overall, findings: findings.slice(0, 12) };
}

function emptyShell(reason: string): ParsedShell {
  return {
    overall: {
      score: 0,
      summary: `Reviewer output unparseable (${reason}). Showing empty review.`,
    },
    findings: [],
  };
}

// ─── Merge with Layer-1 ──────────────────────────────────────────────────────

/**
 * Merge Layer-1 (deterministic) and Layer-2 (LLM) findings into one ordered
 * list, dropping near-duplicates (same dimension + normalised problem) and
 * re-sequencing ids PQ-001…. Layer-1 wins on a tie since it is exact.
 */
export function mergePrdFindings(
  layer1: PrdQualityFinding[],
  layer2: PrdQualityFinding[],
): PrdQualityFinding[] {
  const seen = new Set<string>();
  const key = (f: PrdQualityFinding) =>
    `${f.dimension}::${f.problem.toLowerCase().replace(/\s+/g, " ").trim()}`;
  const out: PrdQualityFinding[] = [];
  for (const f of [...layer1, ...layer2]) {
    const k = key(f);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ ...f, id: `PQ-${String(out.length + 1).padStart(3, "0")}` });
  }
  return out;
}
