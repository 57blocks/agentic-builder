/**
 * Plan extractor — turns a free-form markdown spec (like a TDD "M0→M10 with
 * per-step acceptance commands" plan) into a structured BuildPlan the
 * orchestrator can run.
 *
 * This is the "hybrid" step: the LLM proposes the structured plan, the user
 * reviews/edits it (in the UI), and only then is it run. Parsing is defensive —
 * malformed output yields an empty milestone list rather than throwing.
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
import type { AcceptanceCommand, BuildPlan, Milestone } from "./types";

export const PLAN_EXTRACTOR_PROMPT_VERSION = "v1-2026-06-05";

/** A BuildPlan minus the workspace dir, which the caller assigns. */
export type BuildPlanDraft = Omit<BuildPlan, "workspaceDir">;

export interface ExtractBuildPlanResult {
  plan: BuildPlanDraft;
  model: string;
  promptVersion: string;
  costUsd: number;
  durationMs: number;
}

export interface ExtractBuildPlanOptions {
  model?: string;
  maxTokens?: number;
  chatCompletionImpl?: (
    messages: ChatMessage[],
    opts: OpenRouterOptions,
  ) => Promise<OpenRouterResponse>;
}

const SYSTEM_PROMPT = `You convert a software build/spec document into a STRUCTURED, MACHINE-RUNNABLE build plan made of ordered milestones, each with shell ACCEPTANCE COMMANDS whose exit codes prove the milestone is done.

The plan will be executed by an autonomous agent that has bash/read/write/list tools in a fresh, empty workspace (no scaffold). It builds each milestone, then a gate runs that milestone's acceptance commands; exit 0 = pass.

Extract:
- projectName: short slug.
- context: the cross-cutting "why" + HARD constraints that apply to every milestone (e.g. "coordinator has zero torch", "do not import poc/", required cwd). Keep it tight.
- milestones[]: in execution order. For each:
  - id: e.g. "M0", "M1" (preserve the document's ids/order when present).
  - title: short.
  - instructions: what to BUILD in this milestone, concrete and self-contained (the agent only sees this + context).
  - acceptance[]: the exact shell commands that verify it. For each command:
      - command: the shell command (cwd = workspace root). Preserve the document's commands verbatim when given.
      - label: short human label (optional).
      - optional: true ONLY if the document says the check is conditional / may be skipped.
      - precondition: a guard shell command that must exit 0 for this check to run (use when the document says "only if X exists", e.g. "test -f ./checkpoints/v16.ckpt"). Omit otherwise.
      - expectOutput: a regex the output must match, ONLY if the document requires a specific string (e.g. "E2E PASS"). Omit otherwise.

Rules:
- Preserve the document's milestone ids, ordering, and exact acceptance commands. Do NOT invent checks the document doesn't imply.
- Every milestone MUST have at least one acceptance command. If the document gives none, derive the most direct check it implies.
- Output STRICT JSON only, no markdown fences, matching:

{
  "projectName": "string",
  "context": "string",
  "milestones": [
    {
      "id": "M0",
      "title": "string",
      "instructions": "string",
      "acceptance": [
        { "command": "string", "label": "string", "optional": false, "precondition": "string", "expectOutput": "string" }
      ]
    }
  ]
}`;

export async function extractBuildPlan(
  specMarkdown: string,
  opts: ExtractBuildPlanOptions = {},
): Promise<ExtractBuildPlanResult> {
  const modelId = opts.model ?? MODEL_CONFIG.agenticBuildPlan;
  const model = resolveModel(modelId);
  const complete = opts.chatCompletionImpl ?? chatCompletion;

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Convert this document into the strict JSON build plan:\n\n${specMarkdown.trim()}`,
    },
  ];
  const callOpts: OpenRouterOptions = {
    model,
    temperature: 0.1,
    max_tokens: opts.maxTokens ?? 12000,
    response_format: { type: "json_object" },
  };

  const startMs = Date.now();
  const response = await complete(messages, callOpts);
  const durationMs = Date.now() - startMs;
  const costUsd = estimateCost(response.model, response.usage);
  const raw = response.choices[0]?.message?.content ?? "";

  return {
    plan: parseBuildPlanDraft(raw),
    model: response.model,
    promptVersion: PLAN_EXTRACTOR_PROMPT_VERSION,
    costUsd,
    durationMs,
  };
}

// ─── Defensive parser (exported for tests) ──────────────────────────────────

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function asBool(v: unknown): boolean {
  return v === true || v === "true";
}

function parseAcceptance(v: unknown): AcceptanceCommand[] {
  if (!Array.isArray(v)) return [];
  const out: AcceptanceCommand[] = [];
  for (const raw of v) {
    if (!raw || typeof raw !== "object") continue;
    const o = raw as Record<string, unknown>;
    const command = asString(o.command).trim();
    if (!command) continue;
    const cmd: AcceptanceCommand = { command };
    const label = asString(o.label).trim();
    if (label) cmd.label = label;
    if (asBool(o.optional)) cmd.optional = true;
    const pre = asString(o.precondition).trim();
    if (pre) cmd.precondition = pre;
    const expect = asString(o.expectOutput).trim();
    if (expect) cmd.expectOutput = expect;
    if (Array.isArray(o.passExitCodes)) {
      const codes = o.passExitCodes
        .map((c) => Number(c))
        .filter((n) => Number.isFinite(n));
      if (codes.length > 0) cmd.passExitCodes = codes;
    }
    out.push(cmd);
  }
  return out;
}

export function parseBuildPlanDraft(raw: string): BuildPlanDraft {
  const empty: BuildPlanDraft = { projectName: "untitled", context: "", milestones: [] };
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return empty;
  let parsed: unknown;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return empty;
  }
  const obj = parsed as Record<string, unknown>;
  const milestones: Milestone[] = [];
  const arr = Array.isArray(obj.milestones) ? obj.milestones : [];
  for (let i = 0; i < arr.length; i++) {
    const m = arr[i];
    if (!m || typeof m !== "object") continue;
    const o = m as Record<string, unknown>;
    const acceptance = parseAcceptance(o.acceptance);
    const id = asString(o.id).trim() || `M${i}`;
    const title = asString(o.title).trim() || id;
    const instructions = asString(o.instructions).trim();
    if (!instructions && acceptance.length === 0) continue;
    milestones.push({ id, title, instructions, acceptance });
  }
  return {
    projectName: asString(obj.projectName, "untitled").trim() || "untitled",
    context: asString(obj.context).trim(),
    milestones,
  };
}
