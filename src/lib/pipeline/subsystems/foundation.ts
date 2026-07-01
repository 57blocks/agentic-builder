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
  waitForFreshCheckpoint,
  subsystemFetchDispatcher,
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

  // Resume: skip foundation tasks the checkpoint already marks completed. A
  // foundation can be 70+ tasks and take hours; a re-triggered orchestration
  // (e.g. to reach the domain phase that a prior recursion-limit failure never
  // got to) must NOT redo the work already on disk. If every foundation task is
  // already complete, short-circuit straight to the domain phase.
  const priorCheckpoint = await readSessionCheckpoint(projectRoot).catch(
    () => null,
  );
  const completedIds = priorCheckpoint
    ? new Set(
        Object.entries(priorCheckpoint.taskResults)
          .filter(
            ([, r]) =>
              r.status === "completed" ||
              r.status === "completed_with_warnings",
          )
          .map(([id]) => id),
      )
    : new Set<string>();
  const remainingTaskIds = foundationTaskIds.filter(
    (id) => !completedIds.has(id),
  );
  if (remainingTaskIds.length === 0) {
    const generatedFiles = priorCheckpoint
      ? foundationTaskIds.flatMap(
          (id) => priorCheckpoint.taskResults[id]?.generatedFiles ?? [],
        )
      : [];
    return {
      ok: true,
      summary: `foundation: all ${foundationTaskIds.length} shared tasks already complete (resumed, nothing to rebuild).`,
      generatedFiles,
    };
  }
  if (remainingTaskIds.length < foundationTaskIds.length) {
    console.log(
      `[Subsystems] foundation: resuming — ${foundationTaskIds.length - remainingTaskIds.length}/${foundationTaskIds.length} tasks already complete, building the remaining ${remainingTaskIds.length}.`,
    );
  }

  // Scope/contract artifacts live under the code-output root (where the route +
  // gates read them); only the session checkpoint is keyed to projectRoot.
  const outputRoot = resolveCodeOutputRoot(projectRoot, ctx.codeOutputDir);
  // Foundation owns no business endpoints — scope gates to none so the route
  // audit / smoke gate check only boot + health (no contract endpoint exists yet).
  await writeActiveScope(outputRoot, { subsystemId: FOUNDATION_ID, endpoints: [] });
  // Build only the not-yet-completed foundation tasks (full mode over a subset).
  const body = buildFoundationCodingRequest(allTasks, remainingTaskIds, ctx);
  const controller = new AbortController();
  const timer = ctx.timeoutMs ? setTimeout(() => controller.abort(), ctx.timeoutMs) : null;
  const startedAt = Date.now();
  let dropped = false;
  // DIAGNOSTIC (drain-drop root-cause): localise WHERE the drain fails — before
  // response headers (route setup blocked the response), after headers but
  // before any stream bytes (silent setup INSIDE the stream / keepalive not
  // reaching the client), or mid-stream. `since` = seconds from the POST.
  const since = (t: number) => (t ? ((t - startedAt) / 1000).toFixed(1) + "s" : "—");
  let headersAt = 0;
  let firstChunkAt = 0;
  let chunkCount = 0;
  let byteCount = 0;
  try {
    const resp = await fetch(`${ctx.baseUrl}/api/agents/coding`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
      // Node/undici fetch supports `dispatcher`; not in the DOM RequestInit types.
      // @ts-expect-error dispatcher is a Node-fetch extension
      dispatcher: subsystemFetchDispatcher,
    });
    headersAt = Date.now();
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      return { ok: false, summary: `foundation: coding endpoint ${resp.status} ${text.slice(0, 200)}`, generatedFiles: [] };
    }
    console.log(`[Subsystems] foundation: sub-build response headers received at ${since(headersAt)}; draining…`);
    await drainStream(resp.body, (c) => {
      chunkCount += 1;
      byteCount += c.length;
      if (!firstChunkAt) {
        firstChunkAt = Date.now();
        console.log(
          `[Subsystems] foundation: first stream bytes at ${since(firstChunkAt)} (headers→firstByte ${((firstChunkAt - headersAt) / 1000).toFixed(1)}s).`,
        );
      }
      ctx.onProgress?.(FOUNDATION_ID, c);
    });
  } catch (err) {
    // The drain fetch dropped but the foundation build keeps running server-side.
    // Recover via the checkpoint instead of failing + orphaning the build.
    dropped = true;
    const e = err as { name?: string; message?: string; cause?: unknown };
    const cause = (e?.cause ?? null) as { code?: string; message?: string } | null;
    const causeStr = cause ? ` cause=${cause.code ?? cause.message ?? String(cause)}` : "";
    const phase =
      headersAt === 0
        ? "BEFORE response headers (route setup blocked the response, or connection refused/reset pre-headers)"
        : firstChunkAt === 0
          ? "AFTER headers but BEFORE any stream bytes (silent setup inside the stream / keepalive not reaching client)"
          : "MID-STREAM (was actively streaming, then the connection dropped)";
    console.warn(
      `[Subsystems] foundation: drain fetch DROPPED — phase=${phase}; ` +
        `elapsed=${since(Date.now())}, headersAt=${since(headersAt)}, firstByteAt=${since(firstChunkAt)}, ` +
        `chunks=${chunkCount}, bytes=${byteCount}, err=${e?.name ?? ""}:${e?.message ?? String(err)}${causeStr}; ` +
        `recovering verdict from checkpoint…`,
    );
  } finally {
    if (timer) clearTimeout(timer);
  }

  // On a dropped drain, wait for the still-running build to write a fresh
  // checkpoint; otherwise read the checkpoint it just wrote.
  const checkpoint = dropped
    ? await waitForFreshCheckpoint(projectRoot, startedAt)
    : await readSessionCheckpoint(projectRoot);
  if (dropped && !checkpoint) {
    return { ok: false, summary: "foundation: drain dropped and no fresh checkpoint within the wait window.", generatedFiles: [] };
  }
  // The checkpoint is written per-session over THIS run's task set, so when we
  // resumed (ran only `remainingTaskIds`), the already-completed foundation
  // tasks are not in it. Judge the verdict over only what this run built — the
  // skipped ones were proven complete by the checkpoint above. Merge generated
  // files from both so the foundation-file protection list stays complete.
  const verdict = verdictFromCheckpoint(checkpoint, {
    ...step,
    taskIds: remainingTaskIds,
  });
  const priorFiles = foundationTaskIds.flatMap(
    (id) => priorCheckpoint?.taskResults[id]?.generatedFiles ?? [],
  );
  const newFiles = checkpoint
    ? remainingTaskIds.flatMap((id) => checkpoint.taskResults[id]?.generatedFiles ?? [])
    : [];
  const generatedFiles = [...new Set([...priorFiles, ...newFiles])];
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

  // The real precondition for building domains is a COMPLETE frozen API contract
  // (P3.1 below) — NOT a 100%-green foundation. The old hard `!foundation.ok`
  // gate meant a single incidental foundation-task failure (or a recursion-limit
  // abort) silently skipped ALL domains, orphaning every domain-owned task with
  // no failed-marker. We now proceed when the contract is complete; a partial
  // foundation failure is reported (develop.ts folds it into the overall verdict)
  // but no longer blocks domains whose dependencies are otherwise satisfied. The
  // per-layer `stopOnFailure` inside runSubsystemBuilds still protects a
  // dependent domain from building on a broken dependency.
  if (!foundation.ok) {
    console.warn(
      `[Subsystems] foundation not fully green (${foundation.summary}); proceeding to the domain phase gated by the frozen-contract precondition (a partial foundation failure no longer skips all domains).`,
    );
  }

  // P3.1 — fail fast if the foundation didn't freeze a complete API contract:
  // every domain's owned endpoints must be declared before domains build. This
  // is the genuine prerequisite — domains code against these contracts.
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
