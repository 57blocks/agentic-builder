/**
 * Preparation-stage plan gate.
 *
 * Called when a PRD / spec is finalised. If the document conservatively looks
 * like it contains a runnable milestone+acceptance plan, extract it and persist
 * `.blueprint/build-plan.json` — which later arms "goal mode" at the coding
 * stage. Otherwise it does nothing and the project stays on the normal pipeline.
 *
 * Best-effort: any failure (no signals, extraction error, no usable acceptance)
 * simply means "no plan persisted" — never throws into the preparation flow.
 */

import { hasPlanSignals, planHasUsableAcceptance } from "./plan-detection";
import {
  extractBuildPlan,
  type ExtractBuildPlanResult,
} from "./plan-extractor";
import { writeBuildPlan } from "./plan-store";

export interface MaybePersistPlanInput {
  projectRoot: string;
  specMarkdown: string;
  model?: string;
  /** Test seam: inject the extractor. */
  extractImpl?: (
    spec: string,
    opts?: { model?: string },
  ) => Promise<ExtractBuildPlanResult>;
}

export interface MaybePersistPlanResult {
  persisted: boolean;
  reason: string;
  milestones?: number;
}

export async function maybeExtractAndPersistPlan(
  input: MaybePersistPlanInput,
): Promise<MaybePersistPlanResult> {
  const detection = hasPlanSignals(input.specMarkdown);
  if (!detection.detected) {
    return { persisted: false, reason: `no plan signals (${detection.reasons.join("; ")})` };
  }

  const extract = input.extractImpl ?? extractBuildPlan;
  let result: ExtractBuildPlanResult;
  try {
    result = await extract(input.specMarkdown, { model: input.model });
  } catch (err) {
    return {
      persisted: false,
      reason: `extraction failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const plan = result.plan;
  if (plan.milestones.length === 0) {
    return { persisted: false, reason: "extractor produced no milestones" };
  }
  if (!planHasUsableAcceptance(plan)) {
    return { persisted: false, reason: "no usable acceptance commands in extracted plan" };
  }

  await writeBuildPlan(input.projectRoot, {
    ...plan,
    source: "extracted",
    model: result.model,
    createdAt: new Date().toISOString(),
  });
  return {
    persisted: true,
    reason: `plan persisted (${detection.reasons.join("; ")})`,
    milestones: plan.milestones.length,
  };
}
