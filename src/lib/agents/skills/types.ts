/**
 * Skill system types.
 *
 * A "skill" is a Markdown file with YAML frontmatter that encodes
 * project-pattern-matched guidance for a specific agent. Skills are stored
 * under `.blueprint/skills/<agent>/<skill-id>.md` and loaded at agent
 * runtime — only skills whose trigger matches the current PRD/TRD get
 * injected into the agent's prompt.
 *
 * Goals:
 *   - Keep main agent prompts small and project-agnostic.
 *   - Make rules independently versionable / removable.
 *   - Surface "why" a skill fired (evidence quote from PRD) for traceability.
 *   - Resolve known contradictions explicitly via `excludes`.
 */

/** Where a skill's trigger looks for evidence. */
export type TriggerMatchSource = "prd" | "trd" | "both";

/** Regex pre-filter — cheap, deterministic, runs first. */
export interface RegexTrigger {
  type: "regex";
  match: TriggerMatchSource;
  /** Any of these patterns match → trigger fires. Patterns are case-insensitive
   *  by default and are compiled with the `i` flag. */
  any_of: string[];
}

/** LLM confirm step — runs only when the prefilter matched. Must be
 *  falsifiable (evidence-quote style) to keep results stable. */
export interface LlmConfirmTrigger {
  type: "llm";
  match: TriggerMatchSource;
  /** Prompt template. The runtime appends the PRD / TRD content and asks
   *  the LLM to answer with a strict YES_QUOTE / NO_NOT_FOUND structure. */
  prompt: string;
  /** Optional model override; defaults to MODEL_CONFIG.intent (cheapest). */
  model?: string;
}

/** Composite trigger — regex prefilter + LLM confirm. The skill fires only
 *  when BOTH the prefilter matches AND the LLM confirms. */
export interface CompositeTrigger {
  type: "composite";
  prefilter: RegexTrigger;
  confirm: LlmConfirmTrigger;
}

export type SkillTrigger = RegexTrigger | LlmConfirmTrigger | CompositeTrigger;

/** Parsed skill — frontmatter + Markdown body. */
export interface Skill {
  /** Stable unique id. Matches the filename basename (without .md). */
  id: string;
  /** Filesystem path the skill was loaded from. */
  filePath: string;
  /** Which agent this skill belongs to (must match the directory it lives in). */
  agent: string;
  /** Bump on any content change so traces are useful. */
  version: string;
  /** One-line human description shown in the trace + UI. */
  description?: string;
  /** Higher = injected first in the prompt; soft mutex when two skills overlap. */
  priority: number;
  /** Skill ids that, when this skill applies, should be FORCIBLY removed
   *  from the applied set. Hard mutex for known contradictions. */
  excludes: string[];
  /** How to decide whether this skill applies to the current project. */
  trigger: SkillTrigger;
  /** Full Markdown body (everything after the frontmatter), preserved verbatim
   *  so it injects directly into the agent prompt. */
  body: string;
}

/** Outcome of evaluating one trigger against PRD/TRD content. */
export interface TriggerResult {
  matched: boolean;
  /** When matched=true, the verbatim quote from PRD/TRD that supports it.
   *  Used for trace + LLM confirm output. */
  evidence?: string;
  /** Free-text reason (for debugging when matched=false). */
  reason?: string;
  /** Whether the LLM confirm step ran (and its raw output, if any). */
  llmRan?: boolean;
  llmRaw?: string;
}

/** One applied skill — what to inject + why. */
export interface AppliedSkill {
  skill: Skill;
  trigger: TriggerResult;
}

/** Final result returned by the loader for a single agent run. */
export interface LoadedSkills {
  /** Skills that ARE going to be injected, in priority-descending order. */
  applied: AppliedSkill[];
  /** Skills the loader discovered but did NOT apply, with the reason
   *  (trigger missed, excluded by another skill, etc.). For trace + debug. */
  skipped: Array<{ skill: Skill; reason: string; trigger?: TriggerResult }>;
  /** Total wall-clock + LLM cost spent evaluating triggers. */
  costUsd: number;
  durationMs: number;
}

/** Context fed to the loader. */
export interface LoaderContext {
  agent: string;
  /** PRD markdown — usually `steps.prd.content`. May be empty. */
  prdContent: string;
  /** TRD markdown — usually `steps.trd.content`. May be empty. */
  trdContent: string;
  /** Skip the LLM confirm step entirely (for offline/test mode). */
  skipLlmConfirm?: boolean;
  /** Optional cache key — if two loads have the same key, the LLM confirm
   *  results may be reused. Defaults to sha256(prd + trd). */
  cacheKey?: string;
}
