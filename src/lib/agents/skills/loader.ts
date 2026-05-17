/**
 * Skill loader orchestrator.
 *
 * Scans the directory for an agent's skill files, evaluates each skill's
 * trigger against the current PRD/TRD, applies priority + excludes mutex,
 * and returns the ordered set of skills to inject — along with a complete
 * trace (what was skipped and why).
 *
 * Trigger evaluation runs in PARALLEL for speed since each call is
 * potentially an LLM round-trip. Use `Promise.all` not `Promise.race` —
 * we need every skill's verdict to apply mutex correctly.
 */

import fs from "node:fs";
import path from "node:path";
import { parseSkillFile } from "./parser";
import { evaluateTrigger } from "./trigger";
import type {
  Skill,
  LoadedSkills,
  AppliedSkill,
  LoaderContext,
} from "./types";

const DEFAULT_SKILLS_ROOT = path.join(process.cwd(), ".blueprint", "skills");

export interface LoaderOptions {
  /** Override the directory we discover skills in. Defaults to
   *  `<cwd>/.blueprint/skills/<agent>/`. */
  skillsRoot?: string;
  /** When false, composite triggers degrade to prefilter-only. Useful for
   *  tests / offline runs / scripted regressions. */
  enableLlmConfirm?: boolean;
}

/**
 * Discover + load + filter skills for an agent.
 *
 * @returns Applied skills (in priority-desc order, ready to inject) plus
 *          trace info about skipped skills.
 */
export async function loadSkillsForAgent(
  ctx: LoaderContext,
  opts: LoaderOptions = {},
): Promise<LoadedSkills> {
  const t0 = Date.now();
  const skillsRoot = opts.skillsRoot ?? DEFAULT_SKILLS_ROOT;
  const agentDir = path.join(skillsRoot, ctx.agent);

  if (!fs.existsSync(agentDir)) {
    return { applied: [], skipped: [], costUsd: 0, durationMs: Date.now() - t0 };
  }

  // ── 1. Discover skill files ───────────────────────────────────────────
  const skills: Skill[] = [];
  for (const entry of fs.readdirSync(agentDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith(".md")) continue;
    if (entry.name.toLowerCase() === "readme.md") continue;
    try {
      const skill = parseSkillFile(path.join(agentDir, entry.name));
      // Defensive: the file's `agent` frontmatter must align with the directory.
      if (skill.agent !== ctx.agent) {
        console.warn(
          `[skills] ${skill.id} declares agent="${skill.agent}" but lives in ${ctx.agent}/ — skipping`,
        );
        continue;
      }
      skills.push(skill);
    } catch (err) {
      console.warn(
        `[skills] failed to parse ${entry.name}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  // ── 2. Evaluate triggers in parallel ──────────────────────────────────
  const evalOpts = { enableLlmConfirm: opts.enableLlmConfirm !== false };
  const evaluations = await Promise.all(
    skills.map(async (skill) => ({
      skill,
      evaluation: await evaluateTrigger(skill.trigger, ctx, evalOpts),
    })),
  );

  // ── 3. Separate matches from skips ────────────────────────────────────
  const matched: AppliedSkill[] = [];
  const skipped: LoadedSkills["skipped"] = [];
  let totalCost = 0;
  for (const { skill, evaluation } of evaluations) {
    totalCost += evaluation.costUsd;
    if (evaluation.result.matched) {
      matched.push({ skill, trigger: evaluation.result });
    } else {
      skipped.push({
        skill,
        reason: evaluation.result.reason ?? "trigger did not match",
        trigger: evaluation.result,
      });
    }
  }

  // ── 4. Apply priority + excludes mutex ────────────────────────────────
  //
  // Two-step:
  //   (a) sort matched skills by priority descending; on tie use id alpha.
  //   (b) walk in order, building the "applied" list. When skill X is
  //       admitted, remove any skill in X.excludes from the matched set
  //       (skip them if not yet visited).
  matched.sort((a, b) => {
    if (a.skill.priority !== b.skill.priority) return b.skill.priority - a.skill.priority;
    return a.skill.id.localeCompare(b.skill.id);
  });

  const applied: AppliedSkill[] = [];
  const excludedIds = new Set<string>();
  for (const candidate of matched) {
    if (excludedIds.has(candidate.skill.id)) {
      skipped.push({
        skill: candidate.skill,
        reason: `excluded by a higher-priority skill in its excludes list`,
        trigger: candidate.trigger,
      });
      continue;
    }
    applied.push(candidate);
    for (const ex of candidate.skill.excludes) excludedIds.add(ex);
  }

  return {
    applied,
    skipped,
    costUsd: totalCost,
    durationMs: Date.now() - t0,
  };
}

// ─── Injection formatter ─────────────────────────────────────────────────

/**
 * Render the applied skills as a single Markdown block to splice into an
 * agent's system prompt. The block carries:
 *   - a header explaining "these are auto-applied because of project shape"
 *   - per-skill: priority badge, "applied because <evidence>", skill body
 *
 * The LLM consuming this block can also see WHY each skill is here, which
 * helps it resolve conflicts (higher priority wins) and gives the user
 * traceability when debugging.
 *
 * Returns an empty string when no skills applied — caller should treat this
 * as "no skill section to inject".
 */
export function formatAppliedSkills(loaded: LoadedSkills): string {
  if (loaded.applied.length === 0) return "";

  const blocks: string[] = [];
  blocks.push("## Skills auto-applied to this project");
  blocks.push("");
  blocks.push(
    `These ${loaded.applied.length} skills are applied because of patterns detected in the project's PRD / TRD. Higher-priority skills are listed first; if two contradict, the earlier one wins.`,
  );
  blocks.push("");

  for (const { skill, trigger } of loaded.applied) {
    blocks.push(
      `### [Priority ${skill.priority}] Skill: ${skill.id} (${skill.version})`,
    );
    if (trigger.evidence) {
      blocks.push(`> _Applied because:_ \`${escapeBackticks(trigger.evidence)}\``);
    } else {
      blocks.push(`> _Applied because:_ trigger matched (no evidence captured)`);
    }
    blocks.push("");
    // Strip a leading top-level heading from the body if present — the body's
    // own `# Skill: ...` header would conflict with our `###` here. Otherwise
    // leave the body verbatim.
    const cleaned = skill.body.replace(/^#\s+[^\n]+\n/, "").trim();
    blocks.push(cleaned);
    blocks.push("");
    blocks.push("---");
    blocks.push("");
  }
  return blocks.join("\n").trim();
}

function escapeBackticks(s: string): string {
  return s.replace(/`/g, "\\`");
}
