/**
 * Conservative "does this spec contain a runnable build PLAN?" detector.
 *
 * Goal mode (the agentic milestone + acceptance-command loop) must only engage
 * when the source document GENUINELY contains a milestone/acceptance plan — like
 * a TDD "M0→M10 with per-step shell checks" doc. For an ordinary PRD (pages,
 * features, no acceptance commands) this returns false, so the project stays on
 * the normal scaffolded pipeline. Being conservative here is the whole point:
 * a false positive would route a normal PRD into goal mode with hallucinated
 * acceptance commands.
 *
 * Rule: a plan is detected only when BOTH are present —
 *   (1) a milestone signal (the word milestone/里程碑, or ≥2 distinct M<n> ids), and
 *   (2) an acceptance signal (acceptance/验收, exit code/退出码, "exit 0",
 *       machine-verifiable, or a shell command fence paired with a check verb).
 */

import type { BuildPlanDraft } from "./plan-extractor";

export interface PlanDetectionResult {
  detected: boolean;
  reasons: string[];
}

const MILESTONE_WORD = /\bmilestones?\b|里程碑/i;
const ACCEPTANCE_WORD =
  /\bacceptance\b|验收|\bexit[\s-]*code\b|退出码|\bexit\s+0\b|machine[-\s]*verif|可机器验[证收]/i;

/** Distinct M<n> milestone ids like M0, M1 … M12 (word-bounded). */
function distinctMilestoneIds(text: string): string[] {
  const ids = new Set<string>();
  const re = /\bM(\d{1,2})\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) ids.add(`M${m[1]}`);
  return [...ids];
}

export function hasPlanSignals(specMarkdown: string): PlanDetectionResult {
  const text = specMarkdown ?? "";
  const reasons: string[] = [];

  const ids = distinctMilestoneIds(text);
  const milestoneWord = MILESTONE_WORD.test(text);
  const hasMilestone = milestoneWord || ids.length >= 2;
  if (milestoneWord) reasons.push("milestone keyword present");
  if (ids.length >= 2) reasons.push(`milestone ids: ${ids.slice(0, 8).join(", ")}`);

  const acceptance = ACCEPTANCE_WORD.test(text);
  if (acceptance) reasons.push("acceptance / exit-code signal present");

  const detected = hasMilestone && acceptance;
  if (!detected) {
    if (!hasMilestone) reasons.push("no milestone structure");
    if (!acceptance) reasons.push("no acceptance / exit-code signal");
  }
  return { detected, reasons };
}

/**
 * A persisted plan is only "usable" for goal mode if at least one milestone
 * carries a real acceptance command. An extracted plan with no acceptance
 * commands cannot gate anything → fall back to the normal pipeline.
 */
export function planHasUsableAcceptance(plan: BuildPlanDraft): boolean {
  return plan.milestones.some(
    (m) => m.acceptance.some((a) => a.command && a.command.trim().length > 0),
  );
}
