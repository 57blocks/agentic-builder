import {
  chatCompletion,
  resolveModel,
  estimateCost,
  type ChatMessage,
} from "@/lib/openrouter";
import { MODEL_CONFIG } from "@/lib/model-config";

import { PRD_DIMENSIONS } from "./gap-checklist";
import type {
  ClarificationQuestion,
  DimensionCoverage,
  IntentResult,
  QuestionType,
} from "./types";

export const PRD_INTENT_PROMPT_VERSION = "v2-2026-05-15";

const SYSTEM_PROMPT = `You are the PRD Intent agent. Your job is to find GAPS in a user's feature brief that the downstream PRD writer needs to know — before any PRD is written.

You run TWO PASSES inside a single response.

═══════════════════════════════════════════════════════════════════════════
## PASS A — Coverage check (cross-cutting dimensions)
═══════════════════════════════════════════════════════════════════════════

You are given a fixed list of COVERAGE DIMENSIONS the codegen pipeline ALWAYS needs answered (users, auth, external data, retention, audit, notifications, admin/config, ops, scale, non-goals).

For each dimension:
- "asked"              — brief does NOT clearly answer this AND it is relevant. Emit ONE cross-cutting question.
- "answered_in_input"  — brief already answers this clearly. Skip.
- "not_applicable"     — genuinely doesn't apply (e.g. static marketing page has no "admin configuration"). Skip with rationale.

═══════════════════════════════════════════════════════════════════════════
## PASS B — Specificity drill-down (CONTENT-GROUNDED)
═══════════════════════════════════════════════════════════════════════════

This is the MOST IMPORTANT part. A PRD is useless to codegen if every named concept in it is a black box.

Scan the brief and identify EVERY NAMED ATOMIC CONCEPT — anything with a label or an ID. Examples:
- Rules / variables / metrics / scoring inputs ("RQ-1", "MC-5", "Reserve Quality Transparency")
- Entities / domain objects ("Stablecoin", "ReserveReview", "Alert")
- Roles / personas ("operator", "admin", "analyst")
- Screens / routes / pages ("/monitor", "Reserve Review Workspace")
- Specific external integrations ("CoinGecko", "X / Twitter", "issuer attestation page")
- Specific KPIs / thresholds ("≥25 points", "7-day window", "60 s polling")
- Workflows / state machines (review approval flow, scoring cycle)

For EACH named concept, check whether the brief specifies these "operational facts":
  • PROVENANCE       — where does its value/data come from? (vendor API, public scrape, manual entry, computed, user upload, fixed config)
  • CREDENTIAL       — if external API, do we need an API key/secret? Does the customer have one or must we provide it?
  • CADENCE          — refresh interval, scheduled vs on-demand, real-time vs batch
  • FORMAT / SCHEMA  — types, units, ranges, JSON shape, file format
  • DEPENDENCIES     — what other concepts must exist before this one is usable
  • VALIDATION       — constraints, allowed values, threshold rules
  • OWNERSHIP        — which role/persona controls or modifies it

If ANY of these is missing for a named concept, EMIT A SPECIFIC QUESTION for it. One concept may legitimately produce multiple questions (e.g. for "MC-1": one about provenance, one about API key).

CRITICAL: do NOT roll many concepts into a single generic question. If the brief mentions 9 variables, you SHOULD emit ~9 provenance questions (one per variable), not 1.

All Pass B questions go into the "extras" array.

═══════════════════════════════════════════════════════════════════════════
## Question quality rules
═══════════════════════════════════════════════════════════════════════════

- Phrase using the SAME DOMAIN WORDS as the brief. If the brief says "stablecoin", use "stablecoin", not "asset". If it says "RQ-1", use "RQ-1" in the question text.
- Prefer single_select / multi_select with 3-5 finite options. Use "text" only when the answer space is truly open (names, URLs, free-form numbers).
- Every *_select / yes_no question MUST include exactly one option flagged "isDefault": true.
- For provenance questions, a strong default option set is: ["Public API (no key)", "Third-party API (needs key)", "Manual operator entry", "Scraped / parsed from document", "Computed from other variables", "Not yet decided"].
- For credential questions: ["Yes — we already have a key", "Yes — customer must supply", "No — public endpoint", "Not yet decided"].
- For cadence questions: ["Real-time / streaming", "Every minute", "Hourly", "Daily", "On-demand only"].
- Avoid an "Other / specify" option — use a "text" question or followUpLabel on an existing option instead.
- "required": true ONLY for genuinely no-default items. Typically: users-and-roles, explicit-non-goals. Default: false.
- "rationale": one sentence shown to the user as helper text — explain why this matters for codegen.
- Provide a "category" string that groups related questions in the UI. For Pass B, use categories like "Variable: MC-1", "Source: CoinGecko", "Role: operator", "Workflow: review approval".

═══════════════════════════════════════════════════════════════════════════
## Budget
═══════════════════════════════════════════════════════════════════════════

- Pass A: up to 10 coverage questions (one per dimension that needs asking).
- Pass B: up to 25 specifics questions across all named concepts.
- Total: ≤ 35. If you'd exceed this, drop the LEAST consequential Pass B questions, never the Pass A coverage ones.

═══════════════════════════════════════════════════════════════════════════
## Output — STRICT JSON, no prose, no markdown fences
═══════════════════════════════════════════════════════════════════════════

{
  "coverage": [
    {
      "dimensionId": "users-and-roles",
      "status": "asked" | "answered_in_input" | "not_applicable",
      "rationale": "short reason",
      "question": { ...ClarificationQuestion, omitted unless status === 'asked' }
    }
  ],
  "extras": [
    {
      "id": "extra-1",
      "category": "Variable: MC-1",
      "question": "Where does MC-1 (Market Cap) data come from?",
      "type": "single_select",
      "options": [
        { "value": "coingecko",       "label": "CoinGecko API" },
        { "value": "messari",         "label": "Messari API" },
        { "value": "cmc",             "label": "CoinMarketCap API" },
        { "value": "manual",          "label": "Manual operator entry" },
        { "value": "undecided",       "label": "Not yet decided", "isDefault": true }
      ],
      "defaultValue": "undecided",
      "required": false,
      "rationale": "Without a chosen source, codegen can't generate the fetcher, env keys, or rate-limit handling for MC-1."
    },
    {
      "id": "extra-2",
      "category": "Variable: MC-1",
      "question": "Does the chosen MC-1 source need an API key?",
      "type": "single_select",
      "options": [
        { "value": "have-key",     "label": "Yes — we already have a key" },
        { "value": "need-key",     "label": "Yes — customer must supply" },
        { "value": "public",       "label": "No — public endpoint" },
        { "value": "undecided",    "label": "Not yet decided", "isDefault": true }
      ],
      "defaultValue": "undecided",
      "required": false,
      "rationale": "Determines what env vars and secret-management code must be generated."
    }
  ]
}

Hard rules:
- Use the dimension ids EXACTLY as given for Pass A; do not invent new ids.
- Omit the "question" field when status is NOT "asked".
- For Pass B specifics, "category" SHOULD start with a concept-type prefix ("Variable:", "Source:", "Role:", "Workflow:", "Screen:") so the UI can group them.
- Output ONLY the JSON object. No commentary, no \`\`\`json fences.`;

interface ParsedIntent {
  coverage: DimensionCoverage[];
  extras: ClarificationQuestion[];
}

export interface GeneratePrdIntentOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export async function generatePrdIntent(
  featureBrief: string,
  opts: GeneratePrdIntentOptions = {},
): Promise<IntentResult> {
  const model = resolveModel(opts.model ?? MODEL_CONFIG.intent);
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: buildUserMessage(featureBrief) },
  ];

  const startMs = Date.now();
  const response = await chatCompletion(messages, {
    model,
    temperature: opts.temperature ?? 0.2,
    // Larger budget — v2 prompt emits 25+ per-concept drill-down questions
    // in addition to the coverage pass, so headroom matters.
    max_tokens: opts.maxTokens ?? 16384,
    response_format: { type: "json_object" },
  });
  const durationMs = Date.now() - startMs;

  const raw = response.choices[0]?.message?.content ?? "";
  const costUsd = estimateCost(response.model, response.usage);

  const parsed = parseIntentResponse(raw);

  return {
    stage: "prd",
    coverage: parsed.coverage,
    extras: parsed.extras,
    costUsd,
    durationMs,
    model: response.model,
    promptVersion: PRD_INTENT_PROMPT_VERSION,
  };
}

function buildUserMessage(featureBrief: string): string {
  const dimList = PRD_DIMENSIONS.map(
    (d) => `- ${d.id} (${d.category} → ${d.title}): ${d.llmHint}`,
  ).join("\n");

  return `## Feature brief

${featureBrief.trim()}

## Coverage dimensions to evaluate (use these exact ids in "dimensionId")

${dimList}

Output the strict JSON now.`;
}

function parseIntentResponse(raw: string): ParsedIntent {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { coverage: [], extras: [] };

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return { coverage: [], extras: [] };
  }

  const obj = parsed as { coverage?: unknown; extras?: unknown };

  const coverage: DimensionCoverage[] = Array.isArray(obj.coverage)
    ? (obj.coverage as unknown[])
        .map(normalizeCoverage)
        .filter((c): c is DimensionCoverage => c !== null)
    : [];

  const extras: ClarificationQuestion[] = Array.isArray(obj.extras)
    ? (obj.extras as unknown[])
        .map((q, i) => normalizeQuestion(q, `extra-${i + 1}`, undefined))
        .filter((q): q is ClarificationQuestion => q !== null)
    : [];

  return { coverage, extras };
}

const ALLOWED_DIMENSION_IDS = new Set(PRD_DIMENSIONS.map((d) => d.id));

function normalizeCoverage(input: unknown): DimensionCoverage | null {
  if (!input || typeof input !== "object") return null;
  const obj = input as Record<string, unknown>;

  const dimensionId = typeof obj.dimensionId === "string" ? obj.dimensionId.trim() : "";
  if (!dimensionId || !ALLOWED_DIMENSION_IDS.has(dimensionId)) return null;

  const rawStatus = String(obj.status ?? "");
  const status: DimensionCoverage["status"] =
    rawStatus === "asked" || rawStatus === "not_applicable"
      ? rawStatus
      : "answered_in_input";

  const result: DimensionCoverage = {
    dimensionId,
    status,
    rationale: typeof obj.rationale === "string" ? obj.rationale : undefined,
  };

  if (status === "asked") {
    const q = normalizeQuestion(obj.question, dimensionId, dimensionId);
    if (q) {
      result.question = q;
    } else {
      // Malformed question for an "asked" item — demote rather than emit a broken entry.
      result.status = "answered_in_input";
      result.rationale =
        result.rationale ??
        "Question omitted: model marked dimension as asked but did not return a usable question.";
    }
  }

  return result;
}

const ALLOWED_QUESTION_TYPES: QuestionType[] = [
  "single_select",
  "multi_select",
  "text",
  "yes_no",
];

function normalizeQuestion(
  input: unknown,
  fallbackId: string,
  dimensionId: string | undefined,
): ClarificationQuestion | null {
  if (!input || typeof input !== "object") return null;
  const obj = input as Record<string, unknown>;

  const questionText =
    typeof obj.question === "string" ? obj.question.trim() : "";
  if (!questionText) return null;

  const rawType = String(obj.type ?? "single_select");
  const type: QuestionType = (
    ALLOWED_QUESTION_TYPES as readonly string[]
  ).includes(rawType)
    ? (rawType as QuestionType)
    : "single_select";

  const options = Array.isArray(obj.options)
    ? (obj.options as unknown[])
        .map((o) => normalizeOption(o))
        .filter((o): o is NonNullable<typeof o> => o !== null)
    : undefined;

  // Selection-typed questions need at least 2 options to be useful.
  if ((type === "single_select" || type === "multi_select") && (!options || options.length < 2)) {
    return null;
  }

  // Ensure exactly one default for single/yes-no questions when options exist.
  if (options && options.length > 0 && (type === "single_select" || type === "yes_no")) {
    const defaultCount = options.filter((o) => o.isDefault).length;
    if (defaultCount === 0) {
      options[0].isDefault = true;
    } else if (defaultCount > 1) {
      let kept = false;
      for (const opt of options) {
        if (opt.isDefault && !kept) {
          kept = true;
        } else if (opt.isDefault) {
          opt.isDefault = false;
        }
      }
    }
  }

  const defaultValue =
    typeof obj.defaultValue === "string" || Array.isArray(obj.defaultValue)
      ? (obj.defaultValue as string | string[])
      : inferDefaultValue(options, type);

  const id =
    typeof obj.id === "string" && obj.id.trim() ? obj.id.trim() : fallbackId;

  return {
    id,
    dimensionId,
    category: typeof obj.category === "string" ? obj.category : "General",
    question: questionText,
    type,
    options,
    defaultValue,
    required: Boolean(obj.required),
    rationale: typeof obj.rationale === "string" ? obj.rationale : undefined,
  };
}

function normalizeOption(input: unknown) {
  if (!input || typeof input !== "object") return null;
  const obj = input as Record<string, unknown>;
  const value = typeof obj.value === "string" ? obj.value : "";
  if (!value) return null;
  const label = typeof obj.label === "string" ? obj.label : value;
  return {
    value,
    label,
    isDefault: Boolean(obj.isDefault),
    followUpLabel:
      typeof obj.followUpLabel === "string" ? obj.followUpLabel : undefined,
  };
}

function inferDefaultValue(
  options: ReturnType<typeof normalizeOption>[] | undefined,
  type: QuestionType,
): string | string[] | undefined {
  if (!options || options.length === 0) return type === "text" ? "" : undefined;
  const def = options.find((o) => o?.isDefault);
  if (!def) return undefined;
  return type === "multi_select" ? [def.value] : def.value;
}
