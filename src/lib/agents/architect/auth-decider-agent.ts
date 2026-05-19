/**
 * Auth Decider Agent — reads the PRD (and optionally TRD) and picks ONE of
 * the three supported auth modes, returning an AuthDecision the Wizard can
 * pre-fill and the user can override.
 *
 * Modes:
 *   - "password-rbac"  (default fallback; multi-role, internal tools, ambiguous PRDs)
 *   - "magic-link"     (single-role consumer apps, "email-only sign-in", passwordless)
 *   - "privy"          (multi social providers, Web3 / wallet, PRD names Privy)
 *
 * Output is JSON (model is asked to emit a strict shape); parser is
 * defensive — any failure falls back to the keyword heuristic, which in
 * turn falls back to the default mode.
 */

import { BaseAgent } from "../shared/base-agent";
import { MODEL_CONFIG, resolveModelChain } from "@/lib/model-config";
import { chatCompletionWithFallback, resolveModel } from "@/lib/openrouter";

import {
  type AuthDecision,
  type AuthMode,
  type AuthConfidence,
  AUTH_MODES,
  DEFAULT_AUTH_MODE,
  DEFAULT_RBAC_ROLES,
  DEFAULT_SEED_ACCOUNTS,
  REQUIRED_ENV_KEYS_BY_MODE,
  SCAFFOLD_FOR_MODE,
  isAuthMode,
} from "./auth-decision-types";

const SYSTEM_PROMPT = `You are an Auth Strategy Decider Agent.

## Your Job
Read the product description (PRD, optionally TRD) and pick exactly ONE of three authentication modes for the generated codebase:

1. **password-rbac** — Email + password login with role-based access control (admin / operator / viewer). Use this when:
   - The PRD describes multi-role usage (admin, operator, manager, staff, internal users, etc.)
   - The product is an internal back-office, observability dashboard, or B2B tool
   - The PRD is silent or vague about authentication (this is the SAFE DEFAULT)
   - The PRD explicitly says "email + password" / "username + password" / "login form"

2. **magic-link** — Passwordless email magic-link. Use this when:
   - The PRD explicitly mentions "passwordless", "magic link", "email-only sign-in"
   - It is a single-role consumer app (notes, todos, journal, personal SaaS) with no role differentiation
   - PRD emphasises "frictionless onboarding" without mentioning OAuth providers

3. **privy** — Privy OAuth (Google / Email OTP / Twitter / Wallet). Use this when:
   - The PRD names multiple social providers ("Sign in with Google AND GitHub AND ...")
   - The PRD mentions Web3 / wallet login / crypto / blockchain authentication
   - The PRD explicitly names Privy

## Output Format — STRICT JSON ONLY

\`\`\`json
{
  "mode": "password-rbac" | "magic-link" | "privy",
  "rationale": "One short sentence citing concrete PRD evidence (e.g. role names, provider names, key phrases).",
  "confidence": "high" | "medium" | "low"
}
\`\`\`

## Rules
- Output ONLY the JSON object. No prose, no markdown code fence, no comments.
- \`confidence: "high"\` when the PRD explicitly names roles / providers / mode keywords.
- \`confidence: "medium"\` when you inferred from context (e.g. "B2B observability tool" → password-rbac, "consumer journal" → magic-link).
- \`confidence: "low"\` when the PRD is silent on auth — pick \`password-rbac\` as the safe default and explain why in rationale.
- Tie-breaker: prefer **password-rbac** when in doubt. It works offline, needs no third-party signup, and degrades gracefully.
- Never pick a mode the PRD contradicts (e.g. don't pick \`privy\` if the PRD says "no third-party services").`;

export interface AuthDeciderInput {
  prd: string;
  trd?: string;
}

export interface AuthDeciderOutput {
  decision: AuthDecision;
  /** Raw LLM output for debugging. Empty when heuristic fallback was used. */
  raw: string;
  /** Set when the LLM output failed to parse. Falls back to heuristic. */
  parseError?: string;
  /** Source of the final decision so callers can show "heuristic" badges. */
  source: "llm" | "heuristic" | "default";
  model: string;
  costUsd: number;
  durationMs: number;
}

export class AuthDeciderAgent extends BaseAgent {
  constructor() {
    const modelChain = resolveModelChain(
      MODEL_CONFIG.taskBreakdown,
      resolveModel,
    );
    super({
      name: "Auth Strategy Decider",
      role: "Auth Architect",
      systemPrompt: SYSTEM_PROMPT,
      defaultModel: MODEL_CONFIG.taskBreakdown,
      temperature: 0.1,
      maxTokens: 1024,
      customChatCompletion: async (messages, opts) => {
        const { model: _ignored, ...rest } = opts;
        return chatCompletionWithFallback(messages, modelChain, rest);
      },
    });
  }

  async decide(
    input: AuthDeciderInput,
    sessionId?: string,
  ): Promise<AuthDeciderOutput> {
    const sections: string[] = [];
    sections.push("## PRD\n\n" + input.prd);
    if (input.trd) sections.push("## TRD\n\n" + input.trd);

    const userMessage =
      "Read the documents below and emit the JSON object describing the chosen auth mode.\n\n" +
      sections.join("\n\n---\n\n");

    let raw = "";
    let model = "";
    let costUsd = 0;
    let durationMs = 0;
    let llmError: string | undefined;

    try {
      const result = await this.run(
        userMessage,
        undefined,
        "step-auth-decider",
        sessionId,
      );
      raw = result.content;
      model = result.model;
      costUsd = result.costUsd;
      durationMs = result.durationMs;
    } catch (err) {
      llmError = err instanceof Error ? err.message : "LLM call failed";
    }

    const llmDecision = raw ? parseDeciderJson(raw) : null;
    if (llmDecision) {
      return {
        decision: hydrateDecision(llmDecision.mode, {
          rationale: llmDecision.rationale,
          confidence: llmDecision.confidence,
        }),
        raw,
        model,
        costUsd,
        durationMs,
        source: "llm",
      };
    }

    // LLM unavailable or unparseable → keyword heuristic on PRD text.
    const heuristic = heuristicMode(input.prd, input.trd);
    return {
      decision: hydrateDecision(heuristic.mode, {
        rationale: heuristic.rationale,
        confidence: heuristic.confidence,
      }),
      raw,
      parseError: llmError ?? (raw ? "JSON parse failed" : "no LLM output"),
      model,
      costUsd,
      durationMs,
      source: raw ? "heuristic" : "default",
    };
  }
}

/** Build a full AuthDecision from a mode pick + the agent's free-text fields.
 *  All other fields (seedAccounts, rbacRoles, requiredEnvKeys, scaffold) are
 *  derived deterministically from the mode so we never trust the LLM with
 *  account-level details. */
function hydrateDecision(
  mode: AuthMode,
  parts: { rationale: string; confidence: AuthConfidence },
): AuthDecision {
  return {
    mode,
    scaffold: SCAFFOLD_FOR_MODE[mode],
    rationale: parts.rationale,
    confidence: parts.confidence,
    seedAccounts: DEFAULT_SEED_ACCOUNTS.map((s) => ({ ...s })),
    rbacRoles: [...DEFAULT_RBAC_ROLES],
    requiredEnvKeys: [...REQUIRED_ENV_KEYS_BY_MODE[mode]],
    userOverridden: false,
    updatedAt: new Date().toISOString(),
  };
}

interface ParsedDeciderJson {
  mode: AuthMode;
  rationale: string;
  confidence: AuthConfidence;
}

function parseDeciderJson(raw: string): ParsedDeciderJson | null {
  const trimmed = stripCodeFence(raw.trim());
  if (!trimmed) return null;
  try {
    const json = JSON.parse(trimmed);
    if (typeof json !== "object" || json === null) return null;
    const o = json as Record<string, unknown>;
    if (!isAuthMode(o.mode)) return null;
    const rationale =
      typeof o.rationale === "string" && o.rationale.trim()
        ? o.rationale.trim()
        : "(model produced no rationale)";
    const confidence: AuthConfidence =
      o.confidence === "high" || o.confidence === "medium" || o.confidence === "low"
        ? o.confidence
        : "medium";
    return { mode: o.mode, rationale, confidence };
  } catch {
    return null;
  }
}

function stripCodeFence(s: string): string {
  if (s.startsWith("```")) {
    const lines = s.split("\n");
    if (lines[0]?.startsWith("```")) lines.shift();
    if (lines[lines.length - 1]?.trim() === "```") lines.pop();
    return lines.join("\n").trim();
  }
  // Extract first {...} block if the model wrapped JSON in prose.
  const match = s.match(/\{[\s\S]*\}/);
  return match ? match[0] : s;
}

/** Last-ditch keyword heuristic when the LLM is unreachable. Mirrors the
 *  decision table in the system prompt so behaviour is consistent. */
function heuristicMode(prd: string, trd?: string): ParsedDeciderJson {
  const corpus = (prd + "\n" + (trd ?? "")).toLowerCase();

  const mentionsPrivy = /\bprivy\b/.test(corpus);
  const mentionsWallet =
    /\b(wallet|web3|metamask|wagmi|rainbow ?kit|crypto sign[- ]?in)\b/.test(
      corpus,
    );
  const mentionsMultipleSocial =
    /\bgoogle\b.*\bgithub\b|\bgithub\b.*\bgoogle\b|\bsign in with .* and .*/.test(
      corpus,
    );

  if (mentionsPrivy || mentionsWallet || mentionsMultipleSocial) {
    return {
      mode: "privy",
      rationale:
        "Heuristic match: PRD mentions Privy / wallet / multiple social providers.",
      confidence: "medium",
    };
  }

  const mentionsMagicLink =
    /\bmagic[- ]?link|passwordless|email[- ]?otp|one[- ]?time login link\b/.test(
      corpus,
    );
  if (mentionsMagicLink) {
    return {
      mode: "magic-link",
      rationale:
        "Heuristic match: PRD mentions magic-link / passwordless / email-OTP.",
      confidence: "medium",
    };
  }

  const mentionsRoles =
    /\b(admin|operator|viewer|moderator|manager|back[- ]?office|rbac|role[- ]?based)\b/.test(
      corpus,
    );
  if (mentionsRoles) {
    return {
      mode: "password-rbac",
      rationale:
        "Heuristic match: PRD describes multi-role usage (admin / operator / viewer) → password+RBAC.",
      confidence: "medium",
    };
  }

  return {
    mode: DEFAULT_AUTH_MODE,
    rationale:
      "Heuristic fallback: PRD is silent on authentication; defaulting to password+RBAC for offline-demoable seed accounts.",
    confidence: "low",
  };
}

/** Re-exported helpers so route handlers can build a fully-typed
 *  default decision without importing the types module directly. */
export {
  AUTH_MODES,
  DEFAULT_AUTH_MODE,
  REQUIRED_ENV_KEYS_BY_MODE,
  SCAFFOLD_FOR_MODE,
};
