/**
 * Ensure an auth decision exists before TRD runs.
 *
 * Phase 0 / kickoff's AuthModeCard is the authoritative UI for picking an
 * auth mode, but it runs AFTER the entire preparation phase (PRD → TRD →
 * SysDesign → ImplGuide → Design → QA). That means TRD historically had to
 * guess the auth mode from PRD text, which causes drift when the user later
 * picks a different mode in Phase 0.
 *
 * This helper closes that gap: right after PRD completes (and before TRD
 * starts), it ensures `.blueprint/auth-decision.json` exists by running
 * `AuthDeciderAgent` against the PRD. The resulting file is a *default*
 * (userOverridden=false), so Phase 0 may still freely change it later — but
 * TRD now has a deterministic auth contract to consume.
 *
 * Lifecycle rules:
 *   - File missing                       → run decider, write result.
 *   - File exists, userOverridden=false  → re-run decider, overwrite (PRD
 *                                          may have changed since last run).
 *   - File exists, userOverridden=true   → leave it alone (the user has
 *                                          chosen; never silently overwrite).
 *   - Decider throws / crashes           → fall back to
 *                                          buildDefaultAuthDecision so TRD
 *                                          still has a usable contract.
 */

import {
  AuthDeciderAgent,
} from "@/lib/agents/architect/auth-decider-agent";
import {
  buildDefaultAuthDecision,
  type AuthDecision,
} from "@/lib/agents/architect/auth-decision-types";
import {
  readAuthDecision,
  writeAuthDecision,
} from "./auth-decision-io";

export type EnsureAuthDecisionSource =
  | "existing-user-override"
  | "decider-llm"
  | "decider-heuristic"
  | "decider-default-on-error";

export interface EnsureAuthDecisionResult {
  decision: AuthDecision;
  source: EnsureAuthDecisionSource;
  /** Set when the LLM call failed and we fell back. Useful for logging. */
  error?: string;
}

export interface EnsureAuthDecisionInput {
  projectRoot: string;
  prdContent: string;
  sessionId?: string;
}

export async function ensureAuthDecisionAfterPrd(
  input: EnsureAuthDecisionInput,
): Promise<EnsureAuthDecisionResult> {
  const { projectRoot, prdContent, sessionId } = input;

  const existing = await readAuthDecision(projectRoot);
  if (existing?.userOverridden) {
    return { decision: existing, source: "existing-user-override" };
  }

  if (!prdContent.trim()) {
    const fallback = await writeAuthDecision(
      projectRoot,
      buildDefaultAuthDecision(
        "ensureAuthDecisionAfterPrd: empty PRD content — using password-rbac default so TRD has a stable auth contract.",
      ),
    );
    return {
      decision: fallback,
      source: "decider-default-on-error",
      error: "empty PRD content",
    };
  }

  const agent = new AuthDeciderAgent();
  try {
    const out = await agent.decide({ prd: prdContent }, sessionId);
    const saved = await writeAuthDecision(projectRoot, out.decision);
    return {
      decision: saved,
      source: out.source === "llm" ? "decider-llm" : "decider-heuristic",
    };
  } catch (err) {
    const fallback = await writeAuthDecision(
      projectRoot,
      buildDefaultAuthDecision(
        `ensureAuthDecisionAfterPrd: decider agent crashed (${
          err instanceof Error ? err.message : "unknown error"
        }); falling back to password-rbac default.`,
      ),
    );
    return {
      decision: fallback,
      source: "decider-default-on-error",
      error: err instanceof Error ? err.message : "unknown decider error",
    };
  }
}
