/**
 * Deterministic post-processing patches applied to the task-breakdown AFTER
 * `repairTaskCoverage` + `repairMissingBackendPhase` have completed.
 *
 * These rules close common gaps that the LLM and the coverage-repair loop
 * leave behind, before the breakdown is persisted and handed to coding:
 *
 *   • Rule A (`worker-startup-wiring`) — when any task creates
 *     `backend/src/workers/*Worker.ts` files but no task touches
 *     `backend/src/server.ts`, attach a `modifies` entry + an explicit
 *     "wire start*Worker() calls before app.listen" substep to the task
 *     that owns the most worker files. Even though the `worker-startup-autofix`
 *     supervisor pass would eventually patch server.ts at codegen time, this
 *     keeps the task list and the runtime contract aligned so reviewers (and
 *     downstream skill validators) can see the wiring is owned by a real
 *     coding task.
 *
 *   • Rule B (`pipeline-dag-worker-coverage`) — when `.blueprint/pipeline-dag.yaml`
 *     declares a cron-scheduled pipeline that no worker file in any task's
 *     `creates` covers (e.g. `scoring-cycle` with no `scoringWorker.ts`),
 *     inject the missing worker file path into the task that already creates
 *     the service of the same subject (e.g. `scoringService.ts`), plus a
 *     substep stating it must schedule the pipeline's runCycle.
 *
 *   • Rule C (`coverage-repair-orphan-merge`) — coverage-repair tasks that
 *     came back with empty `files.creates` AND empty `files.modifies` are
 *     placeholder shells. Merge each into the closest sibling task that has a
 *     real file plan (same phase + best keyword overlap), folding the orphan's
 *     coversRequirementIds, acceptanceCriteria and description into the
 *     parent as an additional substep — then drop the orphan. This prevents
 *     the coding worker from picking up an empty task with no files to write.
 */

import path from "node:path";
import type {
  KickoffWorkItem,
  TaskFilePlan,
  TaskSubStep,
} from "@/lib/pipeline/types";
import type { ProjectTier } from "@/lib/agents/shared/project-classifier";
import type { RepairEmitter } from "./events";
import { noopRepairEmitter } from "./events";

export type TaskBreakdownPatchRuleId =
  | "worker-startup-wiring"
  | "pipeline-dag-worker-coverage"
  | "coverage-repair-orphan-merge";

export interface TaskBreakdownPatchEntry {
  ruleId: TaskBreakdownPatchRuleId;
  /** Task that was modified (or, for Rule C, the parent that absorbed the orphan). */
  taskId: string;
  /** Short, human-readable summary suitable for log/UI display. */
  summary: string;
  /** Optional structured detail (e.g. orphan id, injected file path). */
  details?: Record<string, unknown>;
}

export interface ApplyTaskBreakdownPatchesInput {
  tasks: KickoffWorkItem[];
  /** Raw TRD body. Used to extract `pipeline-dag` blocks for Rule B. */
  trd?: string;
  /** Inline contents of `.blueprint/pipeline-dag.yaml` if the engine already
   *  has it. When omitted, Rule B falls back to scanning the TRD body. */
  pipelineDagYaml?: string;
  tier?: ProjectTier;
  emitter?: RepairEmitter;
}

export interface ApplyTaskBreakdownPatchesResult {
  tasks: KickoffWorkItem[];
  patches: TaskBreakdownPatchEntry[];
}

export function applyTaskBreakdownPatches(
  input: ApplyTaskBreakdownPatchesInput,
): ApplyTaskBreakdownPatchesResult {
  const emitter = input.emitter ?? noopRepairEmitter;
  const patches: TaskBreakdownPatchEntry[] = [];

  let tasks = input.tasks.map(cloneTask);

  tasks = ruleWorkerStartupWiring(tasks, patches);
  tasks = rulePipelineDagWorkerCoverage(
    tasks,
    extractPipelineDagYaml(input),
    patches,
  );
  tasks = ruleCoverageRepairOrphanMerge(tasks, patches);

  for (const p of patches) {
    emitter({
      stage: "task-breakdown",
      event: `patch_applied:${p.ruleId}`,
      taskId: p.taskId,
      details: {
        summary: p.summary,
        ...(p.details ?? {}),
      },
    });
  }

  return { tasks, patches };
}

// ─── Rule A: worker startup wiring ────────────────────────────────────────

const WORKER_PATH_RE = /(^|\/)workers\/[A-Za-z0-9_-]+Worker\.ts$/;
const SERVER_TS_RE = /(^|\/)backend\/src\/server\.ts$/;

function ruleWorkerStartupWiring(
  tasks: KickoffWorkItem[],
  patches: TaskBreakdownPatchEntry[],
): KickoffWorkItem[] {
  const workerOwners = new Map<string, number>();
  let serverAlreadyTouched = false;

  for (const t of tasks) {
    const plan = ensurePlan(t);
    for (const f of plan.creates) {
      if (WORKER_PATH_RE.test(f)) {
        workerOwners.set(t.id, (workerOwners.get(t.id) ?? 0) + 1);
      }
      if (SERVER_TS_RE.test(f)) serverAlreadyTouched = true;
    }
    for (const f of [...plan.modifies, ...plan.reads]) {
      if (SERVER_TS_RE.test(f)) serverAlreadyTouched = true;
    }
  }

  if (workerOwners.size === 0 || serverAlreadyTouched) {
    return tasks;
  }

  const [ownerId] = [...workerOwners.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return a[0].localeCompare(b[0]);
  })[0];

  const allWorkerFiles = collectWorkerFiles(tasks);

  return tasks.map((t) => {
    if (t.id !== ownerId) return t;
    const plan = ensurePlan(t);
    if (!plan.modifies.includes("backend/src/server.ts")) {
      plan.modifies = [...plan.modifies, "backend/src/server.ts"];
    }
    const substep: TaskSubStep = {
      step: nextSubStepNumber(t),
      action: "Wire start*Worker() calls in backend/src/server.ts",
      detail: `MODIFY existing backend/src/server.ts: after database initialisation (db.authenticate / sync) and BEFORE app.listen(...), import each start*Worker() exported by the worker files (${allWorkerFiles
        .map((p) => path.basename(p))
        .join(
          ", ",
        )}) and invoke them with awaited error handling. This guarantees all background ingestion / scoring / notification workers boot at server start.`,
    };
    const next: KickoffWorkItem = {
      ...t,
      files: plan,
      subSteps: [...(t.subSteps ?? []), substep],
    };
    patches.push({
      ruleId: "worker-startup-wiring",
      taskId: t.id,
      summary: `Added backend/src/server.ts to modifies + wired ${allWorkerFiles.length} start*Worker() call(s).`,
      details: {
        workerFiles: allWorkerFiles,
      },
    });
    return next;
  });
}

function collectWorkerFiles(tasks: KickoffWorkItem[]): string[] {
  const out = new Set<string>();
  for (const t of tasks) {
    const plan = ensurePlan(t);
    for (const f of plan.creates) if (WORKER_PATH_RE.test(f)) out.add(f);
  }
  return [...out].sort();
}

// ─── Rule B: pipeline-dag worker coverage ─────────────────────────────────

interface ScheduledPipeline {
  id: string;
  /** Lowercased subject token derived from the first dash-separated segment
   *  (e.g. "scoring-cycle" → "scoring", "market-data-ingestion" → "market"). */
  subject: string;
}

function rulePipelineDagWorkerCoverage(
  tasks: KickoffWorkItem[],
  pipelineDagYaml: string | null,
  patches: TaskBreakdownPatchEntry[],
): KickoffWorkItem[] {
  if (!pipelineDagYaml) return tasks;

  const scheduled = extractScheduledPipelines(pipelineDagYaml);
  if (scheduled.length === 0) return tasks;

  const workerSubjects = new Set<string>();
  for (const f of collectWorkerFiles(tasks)) {
    workerSubjects.add(workerFileSubject(f));
  }

  const uncovered = scheduled.filter(
    (p) => !workerSubjectMatches(p, workerSubjects),
  );
  if (uncovered.length === 0) return tasks;

  let working = tasks;
  for (const pipeline of uncovered) {
    const workerPath = `backend/src/workers/${pipeline.subject}Worker.ts`;
    const ownerId = pickPipelineWorkerOwner(working, pipeline.subject);
    if (!ownerId) continue;

    working = working.map((t) => {
      if (t.id !== ownerId) return t;
      const plan = ensurePlan(t);
      if (plan.creates.includes(workerPath)) return t;
      plan.creates = [...plan.creates, workerPath];
      const substep: TaskSubStep = {
        step: nextSubStepNumber(t),
        action: `Create ${path.basename(workerPath)} for the ${pipeline.id} pipeline`,
        detail:
          `CREATE new file ${workerPath} — register a scheduled worker matching pipeline-dag.yaml \`${pipeline.id}\`. ` +
          `It MUST: (a) export \`start${capitaliseFirst(pipeline.subject)}Worker()\` so server.ts can boot it, ` +
          `(b) invoke the corresponding service entry point (e.g. \`${pipeline.subject}Service.runCycle()\`), ` +
          `(c) honour the cron schedule declared in pipeline-dag.yaml, ` +
          `(d) emit IngestionRun rows with status (pending/running/succeeded/failed) so the source-health view stays truthful.`,
      };
      patches.push({
        ruleId: "pipeline-dag-worker-coverage",
        taskId: t.id,
        summary: `Injected ${workerPath} to cover pipeline-dag \`${pipeline.id}\`.`,
        details: {
          pipelineId: pipeline.id,
          workerFile: workerPath,
        },
      });
      return {
        ...t,
        files: plan,
        subSteps: [...(t.subSteps ?? []), substep],
      };
    });
  }

  return working;
}

function extractPipelineDagYaml(
  input: ApplyTaskBreakdownPatchesInput,
): string | null {
  if (input.pipelineDagYaml && input.pipelineDagYaml.trim().length > 0) {
    return input.pipelineDagYaml;
  }
  const trd = input.trd ?? "";
  const m = trd.match(
    /```(?:ya?ml|pipeline-dag(?:\.ya?ml)?)?\s*\n([\s\S]*?\b(?:pipelines\s*:|cron\s*:)[\s\S]*?)```/i,
  );
  return m ? m[1] : null;
}

function extractScheduledPipelines(yaml: string): ScheduledPipeline[] {
  const out: ScheduledPipeline[] = [];
  const lines = yaml.split(/\r?\n/);
  let currentId: string | null = null;
  let sawSchedule = false;

  for (const line of lines) {
    const idMatch = line.match(/^\s*-\s*id\s*:\s*['"]?([A-Za-z0-9_.-]+)['"]?/);
    if (idMatch) {
      if (currentId && sawSchedule) {
        out.push({ id: currentId, subject: subjectFromPipelineId(currentId) });
      }
      currentId = idMatch[1];
      sawSchedule = false;
      continue;
    }
    if (/\b(?:cron|schedule|interval|every)\b/i.test(line)) {
      sawSchedule = true;
    }
  }
  if (currentId && sawSchedule) {
    out.push({ id: currentId, subject: subjectFromPipelineId(currentId) });
  }
  return out;
}

function subjectFromPipelineId(id: string): string {
  const first = id.split(/[-_]/).filter(Boolean)[0] ?? id;
  return first.toLowerCase();
}

function workerFileSubject(file: string): string {
  const base = path
    .basename(file)
    .replace(/\.ts$/i, "")
    .replace(/Worker$/i, "");
  return base.toLowerCase();
}

function workerSubjectMatches(
  pipeline: ScheduledPipeline,
  workerSubjects: Set<string>,
): boolean {
  for (const ws of workerSubjects) {
    if (!ws) continue;
    if (ws === pipeline.subject) return true;
    if (ws.startsWith(pipeline.subject)) return true;
    if (pipeline.subject.startsWith(ws) && ws.length >= 4) return true;
  }
  return false;
}

function pickPipelineWorkerOwner(
  tasks: KickoffWorkItem[],
  subject: string,
): string | null {
  const serviceRe = new RegExp(
    `(^|/)backend/src/services/${escapeRegex(subject)}Service\\.ts$`,
    "i",
  );
  for (const t of tasks) {
    const plan = ensurePlan(t);
    if (plan.creates.some((f) => serviceRe.test(f))) return t.id;
  }
  for (const t of tasks) {
    const desc = `${t.title} ${t.description}`.toLowerCase();
    if (desc.includes(subject) && hasFiles(t)) return t.id;
  }
  for (const t of tasks) {
    if (t.phase?.toLowerCase().includes("backend") && hasFiles(t)) return t.id;
  }
  return null;
}

// ─── Rule C: coverage-repair orphan merge ─────────────────────────────────

function ruleCoverageRepairOrphanMerge(
  tasks: KickoffWorkItem[],
  patches: TaskBreakdownPatchEntry[],
): KickoffWorkItem[] {
  const orphans = tasks.filter(isFilelessOrphan);
  if (orphans.length === 0) return tasks;

  const survivors: KickoffWorkItem[] = [];
  const removed = new Set<string>();
  const parentUpdates = new Map<string, KickoffWorkItem>();

  const taskById = new Map(tasks.map((t) => [t.id, t]));

  for (const orphan of orphans) {
    const parentId = pickMergeParent(orphan, tasks);
    if (!parentId) continue;
    const parent =
      parentUpdates.get(parentId) ?? cloneTask(taskById.get(parentId)!);
    mergeOrphanIntoParent(parent, orphan);
    parentUpdates.set(parentId, parent);
    removed.add(orphan.id);
    patches.push({
      ruleId: "coverage-repair-orphan-merge",
      taskId: parent.id,
      summary: `Merged empty task ${orphan.id} (${joinIds(orphan.coversRequirementIds)}) into ${parent.id}.`,
      details: {
        orphanId: orphan.id,
        orphanTitle: orphan.title,
        orphanCoverIds: orphan.coversRequirementIds ?? [],
      },
    });
  }

  for (const t of tasks) {
    if (removed.has(t.id)) continue;
    const updated = parentUpdates.get(t.id);
    survivors.push(updated ?? t);
  }

  if (removed.size > 0) {
    const validIds = new Set(survivors.map((t) => t.id));
    for (let i = 0; i < survivors.length; i++) {
      const deps = survivors[i].dependencies ?? [];
      const filtered = deps.filter((d) => validIds.has(d));
      if (filtered.length !== deps.length) {
        survivors[i] = { ...survivors[i], dependencies: filtered };
      }
    }
  }

  return survivors;
}

function isFilelessOrphan(t: KickoffWorkItem): boolean {
  const plan = ensurePlan(t);
  if (plan.creates.length > 0 || plan.modifies.length > 0) return false;
  return (t.coversRequirementIds?.length ?? 0) > 0;
}

function pickMergeParent(
  orphan: KickoffWorkItem,
  tasks: KickoffWorkItem[],
): string | null {
  const candidates = tasks.filter(
    (t) =>
      t.id !== orphan.id &&
      hasFiles(t) &&
      (t.phase ?? "") === (orphan.phase ?? ""),
  );
  if (candidates.length === 0) {
    const anyCandidate = tasks.find((t) => t.id !== orphan.id && hasFiles(t));
    return anyCandidate?.id ?? null;
  }
  const orphanTokens = tokenise(`${orphan.title} ${orphan.description}`);
  let best: { id: string; score: number } | null = null;
  for (const c of candidates) {
    const plan = ensurePlan(c);
    const candTokens = tokenise(
      `${c.title} ${c.description} ${plan.creates.join(" ")}`,
    );
    const score = overlap(orphanTokens, candTokens);
    const beforeOrphan = compareTaskIds(c.id, orphan.id) < 0 ? 1 : 0;
    const adjusted = score * 10 + beforeOrphan;
    if (!best || adjusted > best.score) {
      best = { id: c.id, score: adjusted };
    }
  }
  return best?.id ?? candidates[0]?.id ?? null;
}

function mergeOrphanIntoParent(
  parent: KickoffWorkItem,
  orphan: KickoffWorkItem,
): void {
  const parentCovers = new Set(parent.coversRequirementIds ?? []);
  for (const id of orphan.coversRequirementIds ?? []) parentCovers.add(id);
  parent.coversRequirementIds = [...parentCovers];

  const parentAcs = new Set(parent.acceptanceCriteria ?? []);
  for (const ac of orphan.acceptanceCriteria ?? []) parentAcs.add(ac);
  parent.acceptanceCriteria = [...parentAcs];

  const idsLabel = joinIds(orphan.coversRequirementIds);
  const substep: TaskSubStep = {
    step: nextSubStepNumber(parent),
    action: `Additionally cover ${idsLabel} (merged from ${orphan.id})`,
    detail:
      `${orphan.description.trim()} ` +
      `Ensure this work is fully implemented within the files this task already owns; ` +
      `do NOT introduce a separate file unless absolutely necessary.`,
  };
  parent.subSteps = [...(parent.subSteps ?? []), substep];
}

// ─── shared helpers ───────────────────────────────────────────────────────

function ensurePlan(t: KickoffWorkItem): TaskFilePlan {
  const f = t.files;
  if (!f) {
    return { creates: [], modifies: [], reads: [] };
  }
  if (Array.isArray(f)) {
    return { creates: [...f], modifies: [], reads: [] };
  }
  return {
    creates: [...(f.creates ?? [])],
    modifies: [...(f.modifies ?? [])],
    reads: [...(f.reads ?? [])],
  };
}

function hasFiles(t: KickoffWorkItem): boolean {
  const plan = ensurePlan(t);
  return plan.creates.length > 0 || plan.modifies.length > 0;
}

function cloneTask(t: KickoffWorkItem): KickoffWorkItem {
  return {
    ...t,
    files: ensurePlan(t),
    subSteps: t.subSteps ? t.subSteps.map((s) => ({ ...s })) : undefined,
    coversRequirementIds: t.coversRequirementIds
      ? [...t.coversRequirementIds]
      : undefined,
    acceptanceCriteria: t.acceptanceCriteria
      ? [...t.acceptanceCriteria]
      : undefined,
    dependencies: t.dependencies ? [...t.dependencies] : undefined,
  };
}

function nextSubStepNumber(t: KickoffWorkItem): number {
  const steps = t.subSteps ?? [];
  if (steps.length === 0) return 1;
  const max = steps.reduce(
    (acc, s) => (typeof s.step === "number" && s.step > acc ? s.step : acc),
    0,
  );
  return max + 1;
}

function tokenise(input: string): Set<string> {
  const camelSplit = input.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  const out = new Set<string>();
  for (const w of camelSplit.toLowerCase().split(/[^a-z0-9]+/)) {
    if (w.length >= 3) out.add(w);
  }
  return out;
}

function overlap(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const w of a) if (b.has(w)) n++;
  return n;
}

function compareTaskIds(a: string, b: string): number {
  const ai = parseTaskId(a);
  const bi = parseTaskId(b);
  if (ai !== null && bi !== null) return ai - bi;
  return a.localeCompare(b);
}

function parseTaskId(id: string): number | null {
  const m = /^T-(\d+)$/.exec(id);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) ? n : null;
}

function joinIds(ids?: string[]): string {
  if (!ids || ids.length === 0) return "(no ids)";
  if (ids.length <= 3) return ids.join(", ");
  return `${ids.slice(0, 3).join(", ")} +${ids.length - 3} more`;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function capitaliseFirst(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
