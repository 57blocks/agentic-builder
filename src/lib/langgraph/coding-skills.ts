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

/** A skill that matched and was injected, for traceability / A/B logging. */
export interface AppliedSkillRef {
  /** Skill id (filename basename). */
  id: string;
  /** Path relative to repo root, e.g. ".blueprint/skills/backend/auth.md". */
  filePath: string;
  /** Skill version, e.g. "v1". */
  version: string;
}

export interface CodingSkillsResult {
  /** Rendered Markdown block ready to inject as a system message, or "". */
  block: string;
  /** Metadata for the skills that matched (empty when none / disabled). */
  applied: AppliedSkillRef[];
}

/**
 * Cache the matched result per (outputDir, role, skillsRoot, enableLlmConfirm).
 * Trigger evaluation may make LLM round-trips, so we must NOT re-run it for
 * every worker task — the PRD/TRD are written once at kickoff and do not
 * mutate during a coding run. Unbounded but bounded in practice by a run;
 * callers clear between runs via clearCodingSkillsCache().
 */
const resultCache = new Map<string, CodingSkillsResult>();

export function clearCodingSkillsCache(): void {
  resultCache.clear();
}

async function readIfExists(p: string): Promise<string> {
  try {
    return await fs.readFile(p, "utf-8");
  } catch {
    return "";
  }
}

/**
 * Load + match + render the Engineering skills (Mechanism B) for a coding
 * worker role against the project's PRD/TRD. Returns the injectable block AND
 * the applied-skill metadata for logging. Cached.
 */
export async function loadCodingSkills(
  role: CodingAgentRole,
  outputDir: string,
  opts: CodingSkillsOptions = {},
): Promise<CodingSkillsResult> {
  if (!outputDir) return { block: "", applied: [] };
  const cacheKey = `${outputDir}::${role}::${opts.skillsRoot ?? "default"}::${opts.enableLlmConfirm ?? "default"}`;
  const cached = resultCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const [prd, trd] = await Promise.all([
    readIfExists(path.join(outputDir, "PRD.md")),
    readIfExists(path.join(outputDir, "TRD.md")),
  ]);

  const loaded = await loadSkillsForAgent(
    { agent: role, prdContent: prd, trdContent: trd },
    { skillsRoot: opts.skillsRoot, enableLlmConfirm: opts.enableLlmConfirm },
  );
  const block = formatAppliedSkills(loaded);
  const applied: AppliedSkillRef[] = loaded.applied.map((a) => ({
    id: a.skill.id,
    filePath: path.relative(process.cwd(), a.skill.filePath),
    version: a.skill.version,
  }));

  if (applied.length > 0) {
    const ids = applied.map((s) => `${s.id} v${s.version}`).join(", ");
    console.info(
      `[coding-skills] role=${role} applied ${applied.length} skill(s): ${ids} ` +
        `(cost $${loaded.costUsd.toFixed(4)}, ${loaded.durationMs}ms)`,
    );
  }

  const result: CodingSkillsResult = { block, applied };
  resultCache.set(cacheKey, result);
  return result;
}

/**
 * Back-compat wrapper: returns only the injectable block. Existing callers
 * (worker prompt assembly) keep working unchanged.
 */
export async function loadCodingSkillsBlock(
  role: CodingAgentRole,
  outputDir: string,
  opts: CodingSkillsOptions = {},
): Promise<string> {
  const { block } = await loadCodingSkills(role, outputDir, opts);
  return block;
}
