/**
 * TRD Reviewer agent.
 *
 * Cross-vendor critic for TRD output. Reads the PRD + the freshly generated
 * TRD and returns a structured review (score, blockers, improvements). The
 * model is deliberately different from the TRD writer's model so the reviewer
 * doesn't share the writer's blind spots.
 *
 * Outputs strict JSON conforming to {@link TrdReviewResult}. Parsing is
 * defensive — any malformed JSON falls back to a usable shell so the UI
 * can render an "unable to evaluate" state instead of crashing.
 */

import {
  chatCompletion,
  resolveModel,
  estimateCost,
  type ChatMessage,
} from "@/lib/openrouter";
import { MODEL_CONFIG } from "@/lib/model-config";
import type { ProjectTier } from "../shared/project-classifier";

export const TRD_REVIEWER_PROMPT_VERSION = "v1-2026-05-16";

// ─── Output schema (also exported for UI use) ─────────────────────────────

export type TrdReviewSeverity = "high" | "medium" | "low";

export interface TrdReviewBlocker {
  id: string;
  severity: TrdReviewSeverity;
  section: string;
  description: string;
  suggestedFix: string;
}

export interface TrdReviewImprovement {
  id: string;
  priority: TrdReviewSeverity;
  section: string;
  description: string;
  suggestedFix: string;
}

export interface TrdReviewDimension {
  id: string;
  name: string;
  score: number; // 1-10
  evidence: string;
  suggestions: string[];
}

export interface TrdReviewResult {
  overall: { score: number; summary: string };
  dimensions: TrdReviewDimension[];
  blockers: TrdReviewBlocker[];
  improvements: TrdReviewImprovement[];
  // Provenance
  model: string;
  promptVersion: string;
  costUsd: number;
  durationMs: number;
}

// ─── Prompt ───────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a senior staff architect performing a critical review of a Technical Requirements Document (TRD).

You receive THREE inputs:
1. The original PRD (product spec).
2. The TRD generated from that PRD by another agent.
3. The authoritative project tier (S | M | L).

Your job is to grade the TRD across 7 fixed dimensions, surface BLOCKERS that would break codegen, and propose actionable IMPROVEMENTS. Be specific — every observation must reference a concrete section, identifier, or line in the TRD.

## Fixed dimensions (score each 1-10; 10 = excellent)

1. **tier-consistency** — Are the TRD's stack, services, NFRs, and ambitions aligned with the declared tier? A Tier-L PRD must not get a Tier-M stack and vice versa. Check for "Tier-M constraint" or similar contradictory phrases when tier is L.
2. **per-source-granularity** — When the PRD enumerates external sources with different cadences (e.g. "market every 30min, news weekly"), does the TRD §8 DAG emit one pipeline per source class, or did it collapse them under a single shared cron? Collapsing is a high-severity bug.
3. **deployment-artifacts** — Does the TRD §5 list CONCRETE file paths (root \`Dockerfile\`, \`docker/nginx.conf\`, \`docker/supervisord.conf\`, \`deploy.sh\`, \`restore-db.sh\`, etc.) — or did it stop at "single deployable artifact"? Codegen needs filenames.
4. **schema-completeness** — Does §6 shared-schema.ts cover every entity in §3.2 AND every endpoint in §3.3 with Request/Response interfaces? Look for missing types or \`any\`.
5. **normalization-formulas** — When the PRD enumerates named atomic variables/metrics (e.g. MC-1, RQ-1, OC-7), does the TRD provide a per-variable normalization rule (even a placeholder)? A missing §9 / normalization table for a metrics-heavy product is a high-severity gap.
6. **identifier-consistency** — Every identifier in the TRD (variable IDs, env keys, vendor names, FR-* refs, file paths) must either appear verbatim in the PRD OR be marked \`[TRD-NEW]\`. Flag silent inventions or rename drift.
7. **stack-appropriateness** — Are the chosen libraries/services right for the PRD's scale and constraints? Flag obvious over- or under-engineering (e.g. K8s for a 4-coin PoC; cron + setInterval for a 10k-coin real-time platform).

## Blocker vs Improvement

- **Blocker** = if codegen runs against this TRD AS-IS, the resulting code will be wrong in a way the user will notice (wrong tier, wrong vendor, wrong scheduler, missing critical files).
- **Improvement** = the TRD is functionally usable but a stronger TRD would do X.

Be sparing with "high" severity. Reserve it for genuine correctness issues.

## Output — STRICT JSON, no commentary, no markdown fences

{
  "overall": {
    "score": 1-10,
    "summary": "one sentence — what's the headline?"
  },
  "dimensions": [
    {
      "id": "tier-consistency",
      "name": "Tier consistency",
      "score": 2,
      "evidence": "TRD §1 row 7 says 'Matches the Tier-M constraint' but the declared tier is L.",
      "suggestions": [
        "Replace Tier-M references with Tier-L in §1 rationale column.",
        "Re-evaluate stack rows that were sized for M — e.g. consider multi-service deployment."
      ]
    }
    // … one entry per dimension above, in the same order
  ],
  "blockers": [
    {
      "id": "B1",
      "severity": "high",
      "section": "§8 DAG",
      "description": "Reserve attestation, market data, sentiment, on-chain all share a single 5-minute cron despite PRD specifying 30min / 15min / 10min / weekly cadences.",
      "suggestedFix": "Split into 4 pipelines (one per source class) each with its own schedule.cron."
    }
  ],
  "improvements": [
    {
      "id": "I1",
      "priority": "medium",
      "section": "§5 Deployment Artifacts",
      "description": "TRD says 'Docker Compose + Docker image with supervisord' but does not list specific file paths.",
      "suggestedFix": "Add explicit checklist: root Dockerfile, docker/nginx.conf, docker/supervisord.conf, deploy.sh, restore-db.sh."
    }
  ]
}

Hard rules:
- Always emit ALL 7 dimensions in the order listed (tier-consistency, per-source-granularity, deployment-artifacts, schema-completeness, normalization-formulas, identifier-consistency, stack-appropriateness).
- If a dimension is genuinely not applicable (e.g. tier-S has no per-source DAG), give it a score of 10 with evidence "Not applicable for Tier S".
- Maximum 8 blockers and 12 improvements (force prioritization).
- Output ONLY the JSON object. No backticks, no preface, no postface.`;

// ─── Public API ───────────────────────────────────────────────────────────

export interface GenerateTrdReviewOptions {
  /** Override model id — useful for A/B testing reviewers. */
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export async function generateTrdReview(
  prdContent: string,
  trdContent: string,
  tier: ProjectTier,
  opts: GenerateTrdReviewOptions = {},
): Promise<TrdReviewResult> {
  const modelId = opts.model ?? MODEL_CONFIG.trdReviewer;
  const model = resolveModel(modelId);

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: buildUserMessage(prdContent, trdContent, tier),
    },
  ];

  const startMs = Date.now();
  const response = await chatCompletion(messages, {
    model,
    temperature: opts.temperature ?? 0.2,
    max_tokens: opts.maxTokens ?? 8192,
    response_format: { type: "json_object" },
  });
  const durationMs = Date.now() - startMs;
  const costUsd = estimateCost(response.model, response.usage);

  const raw = response.choices[0]?.message?.content ?? "";
  const parsed = parseReviewResponse(raw);

  return {
    ...parsed,
    model: response.model,
    promptVersion: TRD_REVIEWER_PROMPT_VERSION,
    costUsd,
    durationMs,
  };
}

function buildUserMessage(
  prdContent: string,
  trdContent: string,
  tier: ProjectTier,
): string {
  return [
    `## Declared project tier`,
    `Project Tier: ${tier}`,
    "",
    `## PRD`,
    "",
    prdContent.trim(),
    "",
    `## TRD (under review)`,
    "",
    trdContent.trim(),
    "",
    "Output the strict JSON review now.",
  ].join("\n");
}

// ─── Defensive parser ─────────────────────────────────────────────────────

const REQUIRED_DIMENSION_IDS = [
  "tier-consistency",
  "per-source-granularity",
  "deployment-artifacts",
  "schema-completeness",
  "normalization-formulas",
  "identifier-consistency",
  "stack-appropriateness",
];

type ParsedShell = Omit<
  TrdReviewResult,
  "model" | "promptVersion" | "costUsd" | "durationMs"
>;

function parseReviewResponse(raw: string): ParsedShell {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return emptyShell("parser_no_json");

  let parsed: unknown;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return emptyShell("parser_invalid_json");
  }

  const obj = parsed as Record<string, unknown>;

  const overall = normaliseOverall(obj.overall);
  const dimensions = normaliseDimensions(obj.dimensions);
  const blockers = normaliseBlockers(obj.blockers);
  const improvements = normaliseImprovements(obj.improvements);

  return { overall, dimensions, blockers, improvements };
}

function emptyShell(reason: string): ParsedShell {
  return {
    overall: {
      score: 0,
      summary: `Reviewer output unparseable (${reason}). Showing empty review.`,
    },
    dimensions: REQUIRED_DIMENSION_IDS.map((id) => ({
      id,
      name: titleFromId(id),
      score: 0,
      evidence: "n/a — reviewer output unparseable",
      suggestions: [],
    })),
    blockers: [],
    improvements: [],
  };
}

function titleFromId(id: string): string {
  return id
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

function clampScore(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n ?? 0);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(10, Math.round(v)));
}

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function asSeverity(v: unknown): TrdReviewSeverity {
  const s = String(v ?? "medium").toLowerCase();
  if (s === "high" || s === "medium" || s === "low") return s;
  return "medium";
}

function normaliseOverall(
  input: unknown,
): TrdReviewResult["overall"] {
  if (!input || typeof input !== "object") {
    return { score: 0, summary: "No overall score returned." };
  }
  const obj = input as Record<string, unknown>;
  return {
    score: clampScore(obj.score),
    summary: asString(obj.summary, "—"),
  };
}

function normaliseDimensions(input: unknown): TrdReviewDimension[] {
  const arr = Array.isArray(input) ? input : [];
  const byId = new Map<string, TrdReviewDimension>();
  for (const raw of arr) {
    if (!raw || typeof raw !== "object") continue;
    const o = raw as Record<string, unknown>;
    const id = asString(o.id).trim();
    if (!id) continue;
    byId.set(id, {
      id,
      name: asString(o.name, titleFromId(id)),
      score: clampScore(o.score),
      evidence: asString(o.evidence),
      suggestions: Array.isArray(o.suggestions)
        ? (o.suggestions as unknown[])
            .map((s) => asString(s))
            .filter((s) => s.length > 0)
        : [],
    });
  }
  // Ensure all required dimensions are present (in order).
  return REQUIRED_DIMENSION_IDS.map(
    (id) =>
      byId.get(id) ?? {
        id,
        name: titleFromId(id),
        score: 0,
        evidence: "Reviewer did not return an entry for this dimension.",
        suggestions: [],
      },
  );
}

function normaliseBlockers(input: unknown): TrdReviewBlocker[] {
  const arr = Array.isArray(input) ? input : [];
  return arr
    .map((raw, i) => {
      if (!raw || typeof raw !== "object") return null;
      const o = raw as Record<string, unknown>;
      const description = asString(o.description).trim();
      if (!description) return null;
      return {
        id: asString(o.id, `B${i + 1}`),
        severity: asSeverity(o.severity),
        section: asString(o.section, "(unspecified)"),
        description,
        suggestedFix: asString(o.suggestedFix),
      };
    })
    .filter((b): b is TrdReviewBlocker => b !== null)
    .slice(0, 8);
}

function normaliseImprovements(input: unknown): TrdReviewImprovement[] {
  const arr = Array.isArray(input) ? input : [];
  return arr
    .map((raw, i) => {
      if (!raw || typeof raw !== "object") return null;
      const o = raw as Record<string, unknown>;
      const description = asString(o.description).trim();
      if (!description) return null;
      return {
        id: asString(o.id, `I${i + 1}`),
        priority: asSeverity(o.priority),
        section: asString(o.section, "(unspecified)"),
        description,
        suggestedFix: asString(o.suggestedFix),
      };
    })
    .filter((b): b is TrdReviewImprovement => b !== null)
    .slice(0, 12);
}
