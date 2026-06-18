/**
 * Trigger evaluator.
 *
 * Given a skill's trigger spec and the current PRD/TRD content, decide
 * whether the skill applies — and, if so, capture the evidence quote so
 * the loader can show "applied because PRD line X says ..." in trace.
 *
 * Composite triggers run the regex prefilter first (free, deterministic).
 * If it matches, an LLM confirm step is invoked. The confirm is wired to
 * be falsifiable: the model must answer with a strict YES_QUOTE / NO_NONE
 * format and quote the source verbatim, so flaky responses degrade to
 * NO instead of leaking through.
 */

import {
  chatCompletion,
  resolveModel,
  estimateCost,
  type ChatMessage,
} from "@/lib/openrouter";
import { MODEL_CONFIG } from "@/lib/model-config";
import type {
  SkillTrigger,
  ContextTrigger,
  TriggerResult,
  TriggerMatchSource,
  LoaderContext,
} from "./types";

export interface TriggerEvalOptions {
  /** When false, never call the LLM; treat composite triggers as their
   *  prefilter alone (used for offline / tests). */
  enableLlmConfirm: boolean;
}

export interface TriggerEvalSummary {
  result: TriggerResult;
  costUsd: number;
  durationMs: number;
}

export async function evaluateTrigger(
  trigger: SkillTrigger,
  ctx: LoaderContext,
  opts: TriggerEvalOptions,
): Promise<TriggerEvalSummary> {
  const t0 = Date.now();
  let totalCost = 0;

  if (trigger.type === "regex") {
    const { matched, evidence } = evaluateRegex(trigger.any_of, trigger.match, ctx);
    return {
      result: { matched, evidence, reason: matched ? undefined : "regex did not match" },
      costUsd: 0,
      durationMs: Date.now() - t0,
    };
  }

  if (trigger.type === "context") {
    const { matched, evidence } = evaluateContext(trigger, ctx);
    return {
      result: {
        matched,
        evidence,
        reason: matched ? undefined : "project config did not match",
      },
      costUsd: 0,
      durationMs: Date.now() - t0,
    };
  }

  if (trigger.type === "llm") {
    if (!opts.enableLlmConfirm) {
      return {
        result: { matched: false, reason: "llm confirm disabled, treating as no-match" },
        costUsd: 0,
        durationMs: Date.now() - t0,
      };
    }
    const out = await evaluateLlmConfirm(trigger.prompt, trigger.match, ctx, trigger.model);
    totalCost += out.costUsd;
    return {
      result: { matched: out.matched, evidence: out.evidence, llmRan: true, llmRaw: out.raw, reason: out.matched ? undefined : "llm answered NO" },
      costUsd: totalCost,
      durationMs: Date.now() - t0,
    };
  }

  // Composite.
  const pre = evaluateRegex(trigger.prefilter.any_of, trigger.prefilter.match, ctx);
  if (!pre.matched) {
    return {
      result: { matched: false, reason: "composite prefilter did not match" },
      costUsd: 0,
      durationMs: Date.now() - t0,
    };
  }
  if (!opts.enableLlmConfirm) {
    // Without confirm we degrade to prefilter-only result, but flag it.
    return {
      result: {
        matched: pre.matched,
        evidence: pre.evidence,
        reason: "composite prefilter matched, llm confirm skipped",
        llmRan: false,
      },
      costUsd: 0,
      durationMs: Date.now() - t0,
    };
  }
  // Pass the prefilter's evidence as a HINT to the LLM confirm. Without
  // this, the LLM has to scan the full 12 KB capped haystack to find the
  // signal — and when the prefilter hit is buried in a long paragraph
  // (e.g. PRD executive-summary mentions "access requests" in passing),
  // the LLM may answer NO because the paragraph itself isn't a clear
  // statement of the skill's condition. Quoting the hint up front
  // anchors the model to the matched location.
  const llm = await evaluateLlmConfirm(
    trigger.confirm.prompt,
    trigger.confirm.match,
    ctx,
    trigger.confirm.model,
    pre.evidence,
  );
  totalCost += llm.costUsd;
  return {
    result: {
      matched: llm.matched,
      evidence: llm.matched ? (llm.evidence ?? pre.evidence) : undefined,
      reason: llm.matched ? undefined : "composite confirm answered NO",
      llmRan: true,
      llmRaw: llm.raw,
    },
    costUsd: totalCost,
    durationMs: Date.now() - t0,
  };
}

// ─── Regex eval ────────────────────────────────────────────────────────────

function evaluateRegex(
  patterns: string[],
  match: TriggerMatchSource,
  ctx: LoaderContext,
): { matched: boolean; evidence?: string } {
  const haystack = haystackFor(match, ctx);
  for (const p of patterns) {
    let re: RegExp;
    try {
      re = new RegExp(p, "i");
    } catch {
      continue; // Skip malformed patterns silently — author should catch via test.
    }
    const m = re.exec(haystack);
    if (m) {
      const evidence = extractLineAround(haystack, m.index, 200);
      return { matched: true, evidence };
    }
  }
  return { matched: false };
}

// ─── Context (project-config) eval ──────────────────────────────────────────

function evaluateContext(
  trigger: ContextTrigger,
  ctx: LoaderContext,
): { matched: boolean; evidence?: string } {
  if (trigger.always) {
    return { matched: true, evidence: "always-on (unconditional)" };
  }

  const features = ctx.appliedOptionalFeatures ?? [];
  const envKeys = ctx.declaredEnvKeys ?? [];
  const flags = ctx.flags ?? {};

  if (trigger.any_of_features?.length) {
    for (const want of trigger.any_of_features) {
      const w = want.toLowerCase();
      const hit = features.find((f) => f.toLowerCase().includes(w));
      if (hit) return { matched: true, evidence: `feature: ${hit}` };
    }
  }
  if (trigger.any_of_env_keys?.length) {
    const hit = trigger.any_of_env_keys.find((k) => envKeys.includes(k));
    if (hit) return { matched: true, evidence: `env: ${hit}` };
  }
  if (trigger.all_of_flags?.length) {
    const allSet = trigger.all_of_flags.every((f) => flags[f] === true);
    if (allSet)
      return { matched: true, evidence: `flags: ${trigger.all_of_flags.join(", ")}` };
  }
  return { matched: false };
}

function haystackFor(match: TriggerMatchSource, ctx: LoaderContext): string {
  if (match === "prd") return ctx.prdContent;
  if (match === "trd") return ctx.trdContent;
  return `${ctx.prdContent}\n\n${ctx.trdContent}`;
}

function extractLineAround(text: string, idx: number, maxLen: number): string {
  // Return the matched line plus a little context. Single line is preferable
  // to a window because lines tend to be meaningful units in markdown.
  const lineStart = text.lastIndexOf("\n", idx) + 1;
  const lineEnd = text.indexOf("\n", idx);
  const line = text.slice(lineStart, lineEnd === -1 ? undefined : lineEnd).trim();
  return line.length > maxLen ? line.slice(0, maxLen) + "…" : line;
}

// ─── LLM confirm eval ──────────────────────────────────────────────────────

interface LlmEvalResult {
  matched: boolean;
  evidence?: string;
  raw: string;
  costUsd: number;
}

const SYSTEM_PROMPT = `You are a strict trigger evaluator. You will be shown a project document and asked whether a specific condition holds.

OUTPUT FORMAT (mandatory):
  YES <quote>     — if the condition holds, paste a verbatim sentence or line from the document that supports it (<200 chars).
  NO              — if the condition does not hold or cannot be confirmed from the document.

DO NOT output anything else. No explanation. No markdown. No leading/trailing whitespace beyond what's required.

If you would write "It depends" or "Possibly", that is a NO. Only YES when you can quote concrete supporting text.`;

async function evaluateLlmConfirm(
  promptTemplate: string,
  match: TriggerMatchSource,
  ctx: LoaderContext,
  modelOverride?: string,
  prefilterEvidence?: string,
): Promise<LlmEvalResult> {
  const haystack = haystackFor(match, ctx);

  // Cap haystack to keep the eval cheap. 12 KB is plenty for a single skill's
  // worth of context — and triggers should be matchable from the high-level
  // document headers anyway.
  const MAX_CHARS = 12_000;
  const trimmed = haystack.length > MAX_CHARS ? haystack.slice(0, MAX_CHARS) : haystack;

  const hint = prefilterEvidence
    ? `\n\n## Prefilter hit\n\nA regex prefilter already matched the document at: "${prefilterEvidence.slice(0, 300)}"\n\nThis tells you WHERE in the doc to start looking, but it does NOT prove the condition holds — you must still find direct supporting evidence per the question below.\n`
    : "";

  const userMsg = `${promptTemplate.trim()}${hint}\n\n## Document\n\n${trimmed}`;

  const model = resolveModel(modelOverride ?? MODEL_CONFIG.skillTrigger);
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userMsg },
  ];

  let raw = "";
  let costUsd = 0;
  try {
    const response = await chatCompletion(messages, {
      model,
      temperature: 0,
      max_tokens: 200, // YES <quote> is always short
    });
    raw = response.choices[0]?.message?.content?.trim() ?? "";
    costUsd = estimateCost(response.model, response.usage);
  } catch (err) {
    // Network / model failure — degrade to NO; loader will skip this skill.
    return {
      matched: false,
      raw: `LLM error: ${err instanceof Error ? err.message : "unknown"}`,
      costUsd: 0,
    };
  }

  return parseLlmAnswer(raw, costUsd);
}

function parseLlmAnswer(raw: string, costUsd: number): LlmEvalResult {
  const cleaned = raw.trim();
  if (cleaned.toUpperCase().startsWith("YES")) {
    // Extract whatever follows "YES" (and an optional space/newline) as evidence.
    const evidence = cleaned.replace(/^YES[\s:,-]*/i, "").trim() || undefined;
    return { matched: true, evidence, raw: cleaned, costUsd };
  }
  if (cleaned.toUpperCase().startsWith("NO")) {
    return { matched: false, raw: cleaned, costUsd };
  }
  // Any other shape → treat as NO. Strict format protects us from "It depends".
  return { matched: false, raw: cleaned, costUsd };
}
