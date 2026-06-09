/**
 * M3 — shared-foundation build (Phase 1).
 *
 * Before any subsystem is built, the cross-cutting foundation is built ONCE:
 * scaffold, the GLOBAL data layer (all models/migrations/shared-schema for the
 * whole system), the frozen API contracts, app shell, api client, and the
 * module-registry skeleton. Subsystems then build on top, read-only against
 * this shared layer.
 *
 * The foundation task set is exactly the planner's `unassignedTaskIds` — tasks
 * owned by no subsystem (they didn't match any subsystem's ownedModules).
 *
 * Reuse trick (no coding-route change): the foundation is a coding call whose
 * `tasks` list is ONLY the foundation tasks and which OMITS `retryFailedTaskIds`
 * → the route runs in FULL mode (scaffold copy + cleanup + builds them). Each
 * later subsystem is a retry-mode call (subset + skip cleanup) that preserves
 * the foundation on disk.
 */

import type { KickoffWorkItem } from "../types";
import { readSessionCheckpoint } from "../session-checkpoint";
import { writeActiveScope } from "./active-scope";
import { resolveCodeOutputRoot } from "../code-output";
import type { SubsystemManifest } from "./types";
import {
  assertContractCoversManifest,
  type ContractPreconditionResult,
} from "./contract-precondition";
import {
  drainStream,
  verdictFromCheckpoint,
  type SubsystemCodingContext,
} from "./coding-runner";
import {
  closeOverDependencies,
  runSubsystemBuilds,
  type SubsystemBuildPlan,
  type SubsystemBuildStep,
  type SubsystemCodingRunner,
  type SubsystemRunResult,
} from "./orchestrate";

/** Synthetic step id for the foundation (not a real subsystem). */
export const FOUNDATION_ID = "__foundation__";

/** Pure: the foundation task ids = unassigned tasks, closed over their deps. */
export function selectFoundationTaskIds(
  plan: SubsystemBuildPlan,
  allTasks: KickoffWorkItem[],
): string[] {
  const order = new Map(allTasks.map((t, i) => [t.id, i]));
  return closeOverDependencies(plan.unassignedTaskIds, allTasks).sort(
    (a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0),
  );
}

export interface FoundationCodingRequest {
  runId: string;
  /** ONLY the foundation tasks — makes the route build just these in full mode. */
  tasks: KickoffWorkItem[];
  codeOutputDir?: string;
  projectTier?: "S" | "M" | "L";
  // NOTE: intentionally NO retryFailedTaskIds → full (scaffold) mode.
  /** Marks this as a scoped sub-call from the orchestrator so the coding route
   *  does NOT re-enter subsystem-orchestration mode (prevents infinite recursion). */
  scopedSubsystemBuild: true;
}

/** Pure: the full-mode coding request that builds the foundation. */
export function buildFoundationCodingRequest(
  allTasks: KickoffWorkItem[],
  foundationTaskIds: string[],
  ctx: SubsystemCodingContext,
): FoundationCodingRequest {
  const idSet = new Set(foundationTaskIds);
  return {
    runId: ctx.runId,
    tasks: allTasks.filter((t) => idSet.has(t.id)),
    codeOutputDir: ctx.codeOutputDir,
    projectTier: ctx.projectTier,
    scopedSubsystemBuild: true,
  };
}

export interface FoundationBuildResult {
  ok: boolean;
  summary: string;
  /** Files the foundation created — to protect on subsequent subsystem builds. */
  generatedFiles: string[];
}

/**
 * Live: run the foundation build (full mode), then read the checkpoint for the
 * verdict + the files it produced. The generated files are returned so the
 * caller can keep subsystems from overwriting the shared layer.
 */
export async function runFoundationBuild(
  allTasks: KickoffWorkItem[],
  plan: SubsystemBuildPlan,
  ctx: SubsystemCodingContext,
): Promise<FoundationBuildResult> {
  const foundationTaskIds = selectFoundationTaskIds(plan, allTasks);
  const step: SubsystemBuildStep = {
    layer: -1,
    subsystemId: FOUNDATION_ID,
    taskIds: foundationTaskIds,
    dependsOn: [],
    scopeEndpoints: [], // foundation has no business endpoints (boot/health only)
  };
  if (foundationTaskIds.length === 0) {
    return { ok: true, summary: "foundation: no shared tasks (nothing to build).", generatedFiles: [] };
  }

  const projectRoot = ctx.projectRoot ?? process.cwd();
  // Scope/contract artifacts live under the code-output root (where the route +
  // gates read them); only the session checkpoint is keyed to projectRoot.
  const outputRoot = resolveCodeOutputRoot(projectRoot, ctx.codeOutputDir);
  // Foundation owns no business endpoints — scope gates to none so the route
  // audit / smoke gate check only boot + health (no contract endpoint exists yet).
  await writeActiveScope(outputRoot, { subsystemId: FOUNDATION_ID, endpoints: [] });
  const body = buildFoundationCodingRequest(allTasks, foundationTaskIds, ctx);
  const controller = new AbortController();
  const timer = ctx.timeoutMs ? setTimeout(() => controller.abort(), ctx.timeoutMs) : null;
  try {
    const resp = await fetch(`${ctx.baseUrl}/api/agents/coding`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      return { ok: false, summary: `foundation: coding endpoint ${resp.status} ${text.slice(0, 200)}`, generatedFiles: [] };
    }
    await drainStream(resp.body, ctx.onProgress ? (c) => ctx.onProgress!(FOUNDATION_ID, c) : undefined);
  } catch (err) {
    return { ok: false, summary: `foundation: request failed — ${err instanceof Error ? err.message : String(err)}`, generatedFiles: [] };
  } finally {
    if (timer) clearTimeout(timer);
  }

  const checkpoint = await readSessionCheckpoint(projectRoot);
  const verdict = verdictFromCheckpoint(checkpoint, step);
  const generatedFiles = checkpoint
    ? foundationTaskIds.flatMap((id) => checkpoint.taskResults[id]?.generatedFiles ?? [])
    : [];
  return { ok: verdict.ok, summary: verdict.summary.replace(FOUNDATION_ID, "foundation"), generatedFiles };
}

/**
 * Live: the full Phase-1 + Phase-2 pipeline — build the shared foundation, then
 * (only if it succeeded) build the subsystem layers via the injected runner.
 * Returns the foundation result plus per-subsystem results.
 */
export async function runSubsystemPipeline(
  allTasks: KickoffWorkItem[],
  plan: SubsystemBuildPlan,
  ctx: SubsystemCodingContext,
  subsystemRunner: SubsystemCodingRunner,
  opts?: {
    alreadyDone?: Set<string>;
    onStepDone?: (r: SubsystemRunResult) => Promise<void> | void;
    /** When provided, the frozen-contract precondition (P3.1) is enforced after
     *  the foundation build and before any domain build. */
    manifest?: SubsystemManifest;
  },
): Promise<{
  foundation: FoundationBuildResult;
  subsystems: SubsystemRunResult[];
  contractCheck?: ContractPreconditionResult;
}> {
  const foundation = await runFoundationBuild(allTasks, plan, ctx);
  if (!foundation.ok) {
    return { foundation, subsystems: [] };
  }

  // P3.1 — fail fast if the foundation didn't freeze a complete API contract:
  // every domain's owned endpoints must be declared before domains build.
  if (opts?.manifest) {
    const outputRoot = resolveCodeOutputRoot(ctx.projectRoot ?? process.cwd(), ctx.codeOutputDir);
    const contractCheck = await assertContractCoversManifest(outputRoot, opts.manifest);
    if (!contractCheck.ok) {
      return { foundation, subsystems: [], contractCheck };
    }
  }

  const subsystems = await runSubsystemBuilds(plan, subsystemRunner, {
    alreadyDone: opts?.alreadyDone,
    onStepDone: opts?.onStepDone,
    stopOnFailure: true,
  });
  return { foundation, subsystems };
}
