import { TaskBreakdownAgent } from "@/lib/agents/task-breakdown-agent";
import {
  loadSkillsForAgent,
  formatAppliedSkills,
  toSkillTraceRecord,
  type SkillTraceRecord,
} from "@/lib/agents/skills";
import {
  normalizeProjectTier,
  type ProjectTier,
} from "@/lib/agents/shared/project-classifier";
import { formatPrdSpecForContext } from "@/lib/requirements/prd-spec-extractor";
import type { PrdSpec } from "@/lib/requirements/prd-spec-types";
import {
  listScaffoldTemplateRelativePaths,
  type ScaffoldTier,
} from "@/lib/pipeline/scaffold-copy";
import { buildTaskBreakdownScaffoldBlock } from "@/lib/pipeline/scaffold-spec";
import type { KickoffWorkItem } from "./types";
import { stripTestingPhaseTasks } from "./strip-testing-tasks";
import { inferTaskDependencies } from "./task-dep-inference";
import { splitMultiPageFrontendTasks } from "./split-multipage-tasks";
import { ensureFrontendFoundationTask } from "./frontend-foundation-task";

function isKickoffWorkItem(x: unknown): x is KickoffWorkItem {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  const isStringArray = (v: unknown): v is string[] =>
    Array.isArray(v) && v.every((item) => typeof item === "string");
  const filesOk =
    o.files === undefined ||
    isStringArray(o.files) ||
    (typeof o.files === "object" &&
      o.files !== null &&
      isStringArray((o.files as Record<string, unknown>).creates) &&
      isStringArray((o.files as Record<string, unknown>).modifies) &&
      isStringArray((o.files as Record<string, unknown>).reads));
  const coversOk =
    o.coversRequirementIds === undefined ||
    (Array.isArray(o.coversRequirementIds) &&
      o.coversRequirementIds.every((id) => typeof id === "string"));
  return (
    typeof o.id === "string" &&
    typeof o.title === "string" &&
    typeof o.phase === "string" &&
    typeof o.description === "string" &&
    typeof o.estimatedHours === "number" &&
    (o.executionKind === "ai_autonomous" ||
      o.executionKind === "human_confirm_after") &&
    filesOk &&
    coversOk
  );
}

interface RecoveryResult {
  tasks: KickoffWorkItem[];
  /** Count of `{` we saw but could not close or validate. Approximates
   *  "how many tasks did the LLM start but we lost to truncation/noise." */
  droppedCount: number;
  /** Truncated-at offset in the raw string, if any (useful for continuation prompts). */
  truncationOffset: number | null;
}

/**
 * Walk `raw` character by character to extract every syntactically complete
 * JSON object `{…}` that appears at the top level of the array.
 * Works even when the LLM output is cut off mid-way through the last task.
 *
 * Also reports how many task objects appeared to start but could not be
 * recovered (truncation, malformed JSON, failed validation), so the pipeline
 * can surface an explicit "truncation_detected" telemetry event instead of
 * silently dropping tasks.
 */
function recoverTasksFromTruncatedJson(raw: string): RecoveryResult {
  const tasks: KickoffWorkItem[] = [];
  const start = raw.indexOf("[");
  if (start === -1) {
    return { tasks, droppedCount: 0, truncationOffset: null };
  }

  let i = start + 1;
  let seenOpenBrace = 0;
  let truncationOffset: number | null = null;

  while (i < raw.length) {
    // Skip whitespace, commas, and newlines between objects
    while (i < raw.length && " \n\r\t,".includes(raw[i]!)) i++;
    if (i >= raw.length || raw[i] !== "{") break;

    seenOpenBrace++;

    // Track balanced braces to find the end of the current object
    let depth = 0;
    let j = i;
    let inString = false;
    let escape = false;

    while (j < raw.length) {
      const ch = raw[j]!;
      if (escape) {
        escape = false;
        j++;
        continue;
      }
      if (ch === "\\" && inString) {
        escape = true;
        j++;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        j++;
        continue;
      }
      if (!inString) {
        if (ch === "{") depth++;
        else if (ch === "}") {
          depth--;
          if (depth === 0) {
            j++;
            break;
          }
        }
      }
      j++;
    }

    if (depth !== 0) {
      // Last object was cut off mid-way — record the offset so a continuation
      // prompt can quote the fragment and resume from the last valid task id.
      truncationOffset = i;
      break;
    }

    try {
      const obj: unknown = JSON.parse(raw.slice(i, j));
      if (isKickoffWorkItem(obj)) tasks.push(obj);
    } catch {
      // malformed object — skip it
    }
    i = j;
  }

  return {
    tasks,
    droppedCount: Math.max(0, seenOpenBrace - tasks.length),
    truncationOffset,
  };
}

export function parseJsonArrayFromLlmOutput(raw: string): {
  tasks: KickoffWorkItem[];
  parseFailed: boolean;
  parseError?: string;
  /** Approximate number of tasks lost to truncation/malformed objects. */
  droppedCount?: number;
  /** Offset in `raw` where the final incomplete object starts (if any). */
  truncationOffset?: number;
} {
  let cleaned = raw.trim();

  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  const bracketStart = cleaned.indexOf("[");
  const bracketEnd = cleaned.lastIndexOf("]");
  if (bracketStart !== -1 && bracketEnd > bracketStart) {
    cleaned = cleaned.slice(bracketStart, bracketEnd + 1);
  }

  // --- Happy path: output is complete and valid JSON ---
  try {
    const parsed: unknown = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) {
      return {
        tasks: [],
        parseFailed: true,
        parseError: "LLM output is not a JSON array.",
      };
    }
    return {
      tasks: (parsed as unknown[]).filter(isKickoffWorkItem),
      parseFailed: false,
    };
  } catch {
    // Output was likely truncated at the token limit.
    // Try to salvage every complete task object from the partial JSON.
    const recovered = recoverTasksFromTruncatedJson(raw);
    if (recovered.tasks.length > 0) {
      console.warn(
        `[TaskBreakdown] JSON truncated — recovered ${recovered.tasks.length} complete tasks; ${recovered.droppedCount} dropped from partial output (${raw.length} chars).`,
      );
      return {
        tasks: recovered.tasks,
        parseFailed: false,
        droppedCount: recovered.droppedCount,
        truncationOffset: recovered.truncationOffset ?? undefined,
      };
    }

    const msg =
      "Truncated or malformed JSON — no complete tasks could be recovered.";
    console.error("[TaskBreakdown] Failed to parse LLM JSON output");
    return {
      tasks: [],
      parseFailed: true,
      parseError: msg,
      droppedCount: recovered.droppedCount,
      truncationOffset: recovered.truncationOffset ?? undefined,
    };
  }
}

function getTaskCreates(task: KickoffWorkItem): string[] {
  if (!task.files) return [];
  if (Array.isArray(task.files)) return task.files;
  return task.files.creates ?? [];
}

async function maybeExpandLTierTasks(opts: {
  tier: ProjectTier;
  tasks: KickoffWorkItem[];
  prd: string;
  agent: TaskBreakdownAgent;
  trd?: string;
  sysDesign?: string;
  implGuide?: string;
  prdSpecText?: string;
  sessionId?: string;
}): Promise<KickoffWorkItem[]> {
  // M-tier: trigger expansion when tasks are few relative to PRD size.
  // A large PRD with only 6 tasks almost always means pages/APIs were merged —
  // the model needs to be prompted to split them.
  const M_EXPANSION_THRESHOLD = 10;
  const M_MIN_PRD_LENGTH = 5000;

  const EXPANSION_THRESHOLD = 20;
  const MIN_PRD_LENGTH = 8000;

  if (opts.tier === "M") {
    if (
      opts.tasks.length < M_EXPANSION_THRESHOLD &&
      opts.prd.length >= M_MIN_PRD_LENGTH
    ) {
      return maybeRunExpansion({
        ...opts,
        tierLabel: "M-tier",
        threshold: M_EXPANSION_THRESHOLD,
      });
    }
    return opts.tasks;
  }

  if (opts.tier !== "L") return opts.tasks;
  if (opts.tasks.length >= EXPANSION_THRESHOLD) return opts.tasks;
  if (opts.prd.length < MIN_PRD_LENGTH) return opts.tasks;

  return maybeRunExpansion({
    ...opts,
    tierLabel: "L-tier",
    threshold: EXPANSION_THRESHOLD,
  });
}

async function maybeRunExpansion(opts: {
  tierLabel: string;
  threshold: number;
  tasks: KickoffWorkItem[];
  prd: string;
  agent: TaskBreakdownAgent;
  trd?: string;
  sysDesign?: string;
  implGuide?: string;
  prdSpecText?: string;
  sessionId?: string;
}): Promise<KickoffWorkItem[]> {
  // Find overbroad tasks: those with the most creates, capped at half the list.
  const sorted = [...opts.tasks].sort(
    (a, b) => getTaskCreates(b).length - getTaskCreates(a).length,
  );

  // Prefer tasks with 5+ creates; fall back to top half if none qualify.
  let candidates = sorted.filter((t) => getTaskCreates(t).length >= 5);
  if (candidates.length === 0) {
    candidates = sorted.slice(0, Math.max(1, Math.ceil(opts.tasks.length / 2)));
  }
  // Cap at 8 to keep the re-prompt focused.
  const overbroadTasks = candidates.slice(0, 8);

  const overbroadIds = new Set(overbroadTasks.map((t) => t.id));
  const keptTasks = opts.tasks.filter((t) => !overbroadIds.has(t.id));

  const lastNum = opts.tasks.reduce((max, t) => {
    const m = t.id.match(/(\d+)$/);
    return m ? Math.max(max, parseInt(m[1]!, 10)) : max;
  }, 0);
  const startingTaskId = `task-${String(lastNum + 1).padStart(3, "0")}`;

  console.info(
    `[task-breakdown] ${opts.tierLabel} expansion triggered: ${opts.tasks.length} tasks < ${opts.threshold}. ` +
      `Expanding ${overbroadTasks.length} task(s): ${overbroadTasks.map((t) => t.id).join(", ")}`,
  );

  let expansionResult;
  try {
    expansionResult = await opts.agent.expandOverbroadTasks(
      {
        overbroadTasks: overbroadTasks.map((t) => ({
          id: t.id,
          phase: t.phase,
          title: t.title,
          description: t.description,
          creates: getTaskCreates(t),
        })),
        existingTaskSummary: keptTasks.map((t) => ({
          id: t.id,
          phase: t.phase,
          title: t.title,
          creates: getTaskCreates(t),
        })),
        totalOriginalCount: opts.tasks.length,
        startingTaskId,
        prd: opts.prd,
        trd: opts.trd,
        sysDesign: opts.sysDesign,
        implGuide: opts.implGuide,
        prdSpecText: opts.prdSpecText,
      },
      opts.sessionId,
    );
  } catch (err) {
    console.warn(
      `[task-breakdown] ${opts.tierLabel} expansion failed — keeping original tasks:`,
      err,
    );
    return opts.tasks;
  }

  const expansionParsed = parseJsonArrayFromLlmOutput(expansionResult.content);
  if (expansionParsed.parseFailed || expansionParsed.tasks.length === 0) {
    console.warn(
      `[task-breakdown] ${opts.tierLabel} expansion produced no valid tasks — keeping originals`,
    );
    return opts.tasks;
  }

  const expansionNormalized = normalizeOriginalTaskBreakdown(
    expansionParsed.tasks,
    opts.prd,
  );
  const merged = [...keptTasks, ...expansionNormalized];
  // Idempotent: augments the existing Foundation task (if any) and wires any
  // newly-expanded view/component tasks to read the shared tokens + UI barrel.
  const withFoundation = ensureFrontendFoundationTask(merged);
  const { tasks: withNewDeps } = inferTaskDependencies(withFoundation);
  const withSplit = splitMultiPageFrontendTasks(withNewDeps);

  console.info(
    `[task-breakdown] ${opts.tierLabel} expansion complete: ${opts.tasks.length} → ${withSplit.length} tasks`,
  );

  return withSplit;
}

function extractPrdRequirementIds(prd: string): Set<string> {
  const ids = new Set<string>();
  const re = /\b(?:AC|FR|US|IC)-[A-Z0-9]+(?:-[A-Z0-9]+)?\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(prd)) !== null) ids.add(m[0]);
  return ids;
}

function normalizeDependencyIds(
  task: KickoffWorkItem,
  validTaskIds: Set<string>,
): string[] {
  const deps = Array.isArray(task.dependencies) ? task.dependencies : [];
  return deps.filter((d) => typeof d === "string" && validTaskIds.has(d));
}

function normalizeCoverageIds(
  task: KickoffWorkItem,
  prdIds: Set<string>,
): string[] {
  const raw = Array.isArray(task.coversRequirementIds)
    ? task.coversRequirementIds
    : [];

  const out = new Set<string>();
  for (const idRaw of raw) {
    if (typeof idRaw !== "string") continue;
    const id = idRaw.trim();
    if (!id) continue;

    // Common hallucination/typo fallback: FR-TMxx -> FR-TSxx (Task Management)
    if (/^FR-TM\d+$/i.test(id)) {
      const mapped = id.replace(/^FR-TM/i, "FR-TS");
      if (prdIds.has(mapped)) {
        out.add(mapped);
        continue;
      }
    }

    // Keep AC/FR/US/IC only when they exist in PRD.
    if (/^(AC|FR|US|IC)-/i.test(id)) {
      if (prdIds.has(id)) out.add(id);
      continue;
    }

    // Keep structured IDs from PRD spec context if present.
    if (/^(PAGE|CMP|F)-/i.test(id)) {
      out.add(id);
    }
  }
  return [...out];
}

export function normalizeOriginalTaskBreakdown(
  tasks: KickoffWorkItem[],
  prd: string,
): KickoffWorkItem[] {
  const validTaskIds = new Set(tasks.map((t) => t.id));
  const prdIds = extractPrdRequirementIds(prd);

  return tasks.map((t) => ({
    ...t,
    dependencies: normalizeDependencyIds(t, validTaskIds),
    coversRequirementIds: normalizeCoverageIds(t, prdIds),
    // For EVERY task, estimate human hours (5-10x AI time). If LLM didn't provide,
    // default to estimatedHours * 5 so human estimate is always meaningful.
    humanReviewHours:
      t.humanReviewHours != null && t.humanReviewHours > 0
        ? t.humanReviewHours
        : Math.round(t.estimatedHours * 5 * 10) / 10,
  }));
}

/**
 * Use the LLM to analyze all pipeline documents and produce a real coding task breakdown.
 * Falls back to an empty list if the LLM output cannot be parsed.
 */
export async function buildTaskBreakdownFromDocuments(params: {
  prd: string;
  trd?: string;
  sysDesign?: string;
  implGuide?: string;
  designSpec?: string;
  /** Structured PRD spec (pages + component IDs) produced by prd-spec-extractor. */
  prdSpec?: PrdSpec | null;
  sessionId?: string;
  tier?: ProjectTier;
  /** Optional user-selected guidance for improving a previously generated breakdown. */
  improvementNotes?: string[];
  /**
   * Pre-formatted markdown block describing user-uploaded design references.
   * Produced by `formatDesignReferencesPromptBlock`. Empty string / undefined
   * when no references were uploaded.
   */
  designReferencesBlock?: string;
  /**
   * INCREMENTAL mode (PRD edit → propagate downstream). When present, the
   * breakdown agent generates ONLY tasks for `requirementsToCover`, treating
   * `existingTasks` as already done — instead of re-breaking-down the whole
   * PRD. Absent → full breakdown, identical to before.
   */
  incremental?: {
    existingTasks: Array<{
      id: string;
      title: string;
      coversRequirementIds: string[];
    }>;
    requirementsToCover: string[];
  };
}): Promise<{
  tasks: KickoffWorkItem[];
  costUsd: number;
  durationMs: number;
  model: string;
  parseFailed: boolean;
  parseError?: string;
  rawOutput: string;
  droppedFromTruncation?: number;
  truncationOffset?: number;
  /** Slim trace of which skills the loader applied/skipped this run.
   *  Persisted on the kickoff step metadata so the UI + audit script can
   *  show "which rules fired this run" without re-running the loader. */
  skillsTrace: SkillTraceRecord;
  /** Pre-formatted scaffold contract block injected into the primary
   *  task-breakdown system prompt. Surfaced so coverage-gate / phase-gate
   *  self-heal can reuse the exact same context when they spawn their
   *  own TaskBreakdownAgent instances. */
  scaffoldBlock: string;
  /** Pre-formatted applied-skills block injected into the primary
   *  task-breakdown system prompt. Surfaced for the same reason as
   *  `scaffoldBlock` above — without it, self-heal LLM calls would
   *  bypass hard rules like `scaffold-owned-files` and freely re-create
   *  canonical paths (User.ts, Session.ts, modules/admin/*). */
  skillsBlock: string;
}> {
  const tier = normalizeProjectTier(params.tier ?? "M");
  const scaffoldTier = tier as ScaffoldTier;
  const templatePaths = await listScaffoldTemplateRelativePaths(scaffoldTier);
  const scaffoldBlock = buildTaskBreakdownScaffoldBlock(
    scaffoldTier,
    templatePaths,
  );

  // Load auto-applied skills for this project. Triggers (regex + LLM
  // confirm) run against PRD + TRD and only matched skills get injected
  // into the agent's system prompt — keeping the prompt focused on the
  // patterns this specific project actually exhibits.
  const skillsLoaded = await loadSkillsForAgent({
    agent: "task-breakdown",
    prdContent: params.prd ?? "",
    trdContent: params.trd ?? "",
  });
  const skillsBlock = formatAppliedSkills(skillsLoaded);
  if (skillsLoaded.applied.length > 0) {
    const ids = skillsLoaded.applied
      .map((s) => `${s.skill.id} v${s.skill.version}`)
      .join(", ");
    console.info(
      `[task-breakdown] applied ${skillsLoaded.applied.length} skill(s): ${ids} (cost $${skillsLoaded.costUsd.toFixed(4)}, ${skillsLoaded.durationMs}ms)`,
    );
  }
  if (skillsLoaded.skipped.length > 0) {
    console.debug(
      `[task-breakdown] skipped ${skillsLoaded.skipped.length} skill(s):`,
      skillsLoaded.skipped.map((s) => ({
        id: s.skill.id,
        reason: s.reason,
      })),
    );
  }

  const agent = new TaskBreakdownAgent(tier, scaffoldBlock, skillsBlock);

  const prdSpecText = params.prdSpec
    ? formatPrdSpecForContext(params.prdSpec)
    : undefined;

  const result = await agent.generateTaskBreakdown(
    {
      prd: params.prd,
      trd: params.trd,
      sysDesign: params.sysDesign,
      implGuide: params.implGuide,
      designSpec: params.designSpec,
      prdSpecText,
      improvementNotes: params.improvementNotes,
      designReferencesBlock: params.designReferencesBlock,
      incremental: params.incremental,
    },
    params.sessionId,
  );

  const parsed = parseJsonArrayFromLlmOutput(result.content);
  const normalized = normalizeOriginalTaskBreakdown(parsed.tasks, params.prd);

  // Guarantee a Frontend Foundation task (semantic design tokens + shared UI
  // primitives + layout shell + router skeleton) so page agents reuse ONE
  // design system instead of each re-deriving styling from DesignSpec.md (which
  // causes cross-page colour drift and re-invented components). Runs before
  // dependency inference so the inferrer wires every view/component task to it.
  const withFoundation = ensureFrontendFoundationTask(normalized);

  // Skill-driven late-inserted tasks frequently land with `dependencies: []`.
  // Without a DAG edge they look ready-to-run to the coding orchestrator and
  // can start before the files they reference (models, API client, app shell)
  // are created. Infer missing edges from `files.modifies` and a small set of
  // foundation rules; the LLM's explicit deps are never overwritten.
  const { tasks: withDeps, trace: depTrace } =
    inferTaskDependencies(withFoundation);
  if (depTrace.added.length > 0) {
    console.info(
      `[task-breakdown] inferred ${depTrace.added.length} missing dependency edge(s):`,
      depTrace.added.map((e) => `${e.taskId}→${e.depId} (${e.reason})`),
    );
  }

  // Deterministically split any frontend task that creates 2+ view files.
  // This catches pages the LLM merged despite prompt rules (e.g. "lecture and
  // camp enrollment pages" → two separate page tasks).
  const splitTasks = splitMultiPageFrontendTasks(withDeps);

  // L-tier self-heal: when too few tasks for the PRD size, expand overbroad ones.
  const expandedTasks = await maybeExpandLTierTasks({
    tier,
    tasks: splitTasks,
    prd: params.prd,
    agent,
    trd: params.trd,
    sysDesign: params.sysDesign,
    implGuide: params.implGuide,
    prdSpecText,
    sessionId: params.sessionId,
  });

  return {
    tasks: stripTestingPhaseTasks(expandedTasks),
    costUsd: result.costUsd,
    durationMs: result.durationMs,
    model: result.model,
    parseFailed: parsed.parseFailed,
    parseError: parsed.parseError,
    rawOutput: result.content,
    droppedFromTruncation: parsed.droppedCount,
    truncationOffset: parsed.truncationOffset,
    skillsTrace: toSkillTraceRecord(skillsLoaded),
    // Surface scaffold + skills system-prompt blocks so coverage-gate /
    // phase-gate self-heal can reuse them when spawning their own
    // TaskBreakdownAgent instances. Without these, self-heal LLM calls
    // get a stripped-down prompt and happily re-create scaffold-owned
    // files (e.g. backend/src/models/User.ts) or invent parallel module
    // trees (e.g. backend/src/api/modules/admin/*.ts) instead of
    // honouring the canonical scaffold-owned-files contract.
    scaffoldBlock,
    skillsBlock,
  };
}
