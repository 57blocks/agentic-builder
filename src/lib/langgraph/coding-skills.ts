import fs from "node:fs/promises";
import path from "node:path";
import { loadSkillsForAgent, formatAppliedSkills } from "@/lib/agents/skills";
import type { CodingAgentRole } from "@/lib/pipeline/types";

export interface CodingSkillsOptions {
  /** Override the skills root (default: <cwd>/.blueprint/skills). For tests. */
  skillsRoot?: string;
  /** Disable the LLM confirm step (composite → prefilter-only). For tests. */
  enableLlmConfirm?: boolean;
}

/**
 * Cache the rendered skill block per (outputDir, role). Trigger evaluation may
 * make LLM round-trips, so we must NOT re-run it for every worker task — the
 * PRD/TRD are written once at kickoff and do not mutate during a coding run.
 * One entry per (outputDir, role, skillsRoot, enableLlmConfirm) key; unbounded
 * but bounded in practice by a coding run; callers clear between runs via
 * clearCodingSkillsCache().
 */
const blockCache = new Map<string, string>();

export function clearCodingSkillsCache(): void {
  blockCache.clear();
}

async function readIfExists(p: string): Promise<string> {
  try {
    return await fs.readFile(p, "utf-8");
  } catch {
    return "";
  }
}

/**
 * Load + match + render the skills for a coding worker role against the
 * project's PRD/TRD. Returns a Markdown block ready to inject as a system
 * message, or "" when no skill applies.
 */
export async function loadCodingSkillsBlock(
  role: CodingAgentRole,
  outputDir: string,
  opts: CodingSkillsOptions = {},
): Promise<string> {
  if (!outputDir) return "";
  const cacheKey = `${outputDir}::${role}::${opts.skillsRoot ?? "default"}::${opts.enableLlmConfirm ?? "default"}`;
  const cached = blockCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const [prd, trd] = await Promise.all([
    readIfExists(path.join(outputDir, "PRD.md")),
    readIfExists(path.join(outputDir, "TRD.md")),
  ]);

  const loaded = await loadSkillsForAgent(
    { agent: role, prdContent: prd, trdContent: trd },
    {
      skillsRoot: opts.skillsRoot,
      enableLlmConfirm: opts.enableLlmConfirm,
    },
  );
  const block = formatAppliedSkills(loaded);

  if (loaded.applied.length > 0) {
    const ids = loaded.applied.map((s) => `${s.skill.id} v${s.skill.version}`).join(", ");
    console.info(
      `[coding-skills] role=${role} applied ${loaded.applied.length} skill(s): ${ids} ` +
        `(cost $${loaded.costUsd.toFixed(4)}, ${loaded.durationMs}ms)`,
    );
  }

  blockCache.set(cacheKey, block);
  return block;
}
