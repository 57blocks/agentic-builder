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

/** Project-config trigger — matches the project's resolved configuration
 *  (applied scaffold features / declared env keys / runtime flags) rather than
 *  PRD/TRD prose. Deterministic, no LLM. Used by CODEGEN-role skills whose
 *  applicability depends on the build's shape (e.g. which auth scaffold is
 *  applied) — information that lives in `.blueprint/scaffold-applied.json`, not
 *  in the PRD text. A skill fires when ANY of the provided conditions hold. */
export interface ContextTrigger {
  type: "context";
  /** Fires UNCONDITIONALLY. Use for invariants that apply to every project for
   *  this agent (e.g. "backend model fields must match the shared schema"). When
   *  true, the other context conditions are ignored. */
  always?: boolean;
  /** Fires when `appliedOptionalFeatures` contains a feature matching ANY of
   *  these (case-insensitive substring, e.g. "auth-password-rbac"). */
  any_of_features?: string[];
  /** Fires when `declaredEnvKeys` contains ANY of these (exact match). */
  any_of_env_keys?: string[];
  /** Fires when EVERY one of these runtime flags is truthy in `ctx.flags`. */
  all_of_flags?: string[];
}

export type SkillTrigger =
  | RegexTrigger
  | LlmConfirmTrigger
  | CompositeTrigger
  | ContextTrigger;

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

/** Slim, JSON-safe view of a `LoadedSkills` result for persistence into
 *  pipeline step metadata. Drops the full skill bodies (which are 1-3 KB
 *  of Markdown each) and keeps only the identifiers + evidence the UI
 *  and audit script need to render the trace. */
export interface SkillTraceRecord {
  applied: Array<{
    id: string;
    version: string;
    priority: number;
    description?: string;
    /** Verbatim PRD/TRD line that triggered the rule (if captured). */
    evidence?: string;
    /** True when an LLM confirm step actually ran (composite trigger). */
    llmRan?: boolean;
  }>;
  skipped: Array<{
    id: string;
    version: string;
    priority: number;
    reason: string;
  }>;
  costUsd: number;
  durationMs: number;
}

/** Project a `LoadedSkills` result into the slim persistable record. */
export function toSkillTraceRecord(loaded: LoadedSkills): SkillTraceRecord {
  return {
    applied: loaded.applied.map((a) => ({
      id: a.skill.id,
      version: a.skill.version,
      priority: a.skill.priority,
      description: a.skill.description,
      evidence: a.trigger.evidence,
      llmRan: a.trigger.llmRan,
    })),
    skipped: loaded.skipped.map((s) => ({
      id: s.skill.id,
      version: s.skill.version,
      priority: s.skill.priority,
      reason: s.reason,
    })),
    costUsd: loaded.costUsd,
    durationMs: loaded.durationMs,
  };
}

/** Context fed to the loader. */
export interface LoaderContext {
  agent: string;
  /** PRD markdown — usually `steps.prd.content`. May be empty. */
  prdContent: string;
  /** TRD markdown — usually `steps.trd.content`. May be empty. */
  trdContent: string;
  /** Applied scaffold features (from `.blueprint/scaffold-applied.json`), e.g.
   *  `["auth-password-rbac"]`. Read by `context` triggers. */
  appliedOptionalFeatures?: string[];
  /** Declared env keys (from `.blueprint/resource-requirements.json`). Read by
   *  `context` triggers. */
  declaredEnvKeys?: string[];
  /** Resolved runtime flags. Read by `context` triggers. */
  flags?: Record<string, boolean | undefined>;
  /** Skip the LLM confirm step entirely (for offline/test mode). */
  skipLlmConfirm?: boolean;
  /** Optional cache key — if two loads have the same key, the LLM confirm
   *  results may be reused. Defaults to sha256(prd + trd). */
  cacheKey?: string;
}
