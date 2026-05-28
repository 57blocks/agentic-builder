/**
 * DAG dependency inference for task breakdown.
 *
 * Why this exists:
 *   The task-breakdown LLM regularly emits tasks with empty `dependencies`
 *   arrays — most often the "edge" tasks inserted late under skill guidance
 *   (magic-link callback, waiting states, session timeout, supplementary
 *   admin endpoints, etc.). With no deps the coding orchestrator treats
 *   them as ready-to-run roots, so they can start before the files they
 *   reference (models, API client, app shell) exist.
 *
 *   We fill the gaps via three conservative rules:
 *     1. `files.modifies` lookup — if task X modifies a file in task Y's
 *        `files.creates`, X depends on Y. Mechanical, no heuristic.
 *     2. Foundation deps — tasks touching `backend/**` need the
 *        Sequelize-models task; tasks touching `frontend/**` need the
 *        API-client task and (if they create views/components) the
 *        app-shell task.
 *     3. Route attachment — tasks creating new *.routes.ts files under
 *        `backend/src/api/modules/` need the core-routes task (the one
 *        that wires the module index).
 *
 * What this DOES NOT do:
 *   - Overwrite a non-empty `dependencies` (the LLM's explicit deps win).
 *   - Add transitive deps. If X already depends on Y and Y on Z, we leave
 *     X's deps untouched; the coding orchestrator chases the graph itself.
 *   - Reason about description text. Heuristics are purely file-based so
 *     they survive prompt drift.
 *
 * Cycle safety:
 *   Every inferred edge X→Y is checked: if Y already (transitively) depends
 *   on X, the edge is dropped. We never silently introduce a cycle.
 */

import type { KickoffWorkItem, TaskFilePlan } from "./types";

export interface InferenceTrace {
  /** Task id → list of inferred dep ids and the reason for each. */
  added: Array<{
    taskId: string;
    depId: string;
    reason: string;
  }>;
  /** Foundation tasks the inferrer locked onto (helps debugging). */
  anchors: {
    modelTaskId?: string;
    apiClientTaskId?: string;
    appShellTaskId?: string;
    coreRoutesTaskId?: string;
  };
}

export interface InferenceResult {
  tasks: KickoffWorkItem[];
  trace: InferenceTrace;
}

export function inferTaskDependencies(
  tasksIn: KickoffWorkItem[],
): InferenceResult {
  const tasks = tasksIn.map((t) => ({ ...t }));
  const trace: InferenceTrace = { added: [], anchors: {} };

  // ── 1. Build file → taskId index ───────────────────────────────────────
  const creatorOf = new Map<string, string>();
  for (const t of tasks) {
    for (const f of getCreates(t)) {
      // First writer wins. Skill-inserted tasks sometimes re-list a file
      // that the original task already creates; we trust the earlier
      // (lower sequence) task as the canonical creator.
      if (!creatorOf.has(f)) creatorOf.set(f, t.id);
    }
  }

  // ── 2. Identify foundation anchor tasks ────────────────────────────────
  const modelTask = tasks.find((t) =>
    getCreates(t).some((f) =>
      /^backend\/src\/models\/[A-Z][A-Za-z0-9]+\.ts$/.test(f),
    ),
  );
  const apiClientTask = tasks.find((t) =>
    getCreates(t).some((f) =>
      /^frontend\/src\/api\/(client|types|index)\.ts$/.test(f),
    ),
  );
  const appShellTask = tasks.find((t) =>
    getCreates(t).some((f) =>
      /(AuthContext|AppLayout|AppRouter|RootLayout)\.tsx?$|\/router\.tsx?$|\/main\.tsx?$/.test(
        f,
      ),
    ),
  );
  // The "core routes" task is the one that creates the API module index
  // (or the largest cluster of *.routes.ts files). Either signal alone is
  // brittle; prefer the index, fall back to the densest cluster.
  const coreRoutesTask =
    tasks.find((t) =>
      getCreates(t).some(
        (f) => /^backend\/src\/api\/modules\/index\.ts$/.test(f),
      ),
    ) ??
    tasks
      .map((t) => ({
        task: t,
        count: getCreates(t).filter((f) =>
          /^backend\/src\/api\/modules\/[^/]+\/[^/]+\.routes\.ts$/.test(f),
        ).length,
      }))
      .sort((a, b) => b.count - a.count)
      .find((x) => x.count >= 2)?.task;

  trace.anchors.modelTaskId = modelTask?.id;
  trace.anchors.apiClientTaskId = apiClientTask?.id;
  trace.anchors.appShellTaskId = appShellTask?.id;
  trace.anchors.coreRoutesTaskId = coreRoutesTask?.id;

  // ── 3. Pass: only fill tasks with empty deps ───────────────────────────
  for (const t of tasks) {
    const existing = Array.isArray(t.dependencies) ? t.dependencies : [];
    if (existing.length > 0) continue;

    const creates = getCreates(t);
    const modifies = getModifies(t);
    const candidate = new Set<string>();
    const reasons = new Map<string, string>();

    // (a) Modifies-based — strict, file-driven.
    for (const m of modifies) {
      const owner = creatorOf.get(m);
      if (owner && owner !== t.id) {
        candidate.add(owner);
        reasons.set(owner, `modifies ${m} (created by ${owner})`);
      }
    }

    // (b) Foundation: backend → model task.
    const touchesBackend = creates.some((f) => f.startsWith("backend/"));
    if (touchesBackend && modelTask && modelTask.id !== t.id) {
      // Skip if the task IS the model task (already filtered) or if it
      // only writes things that don't read from models (deployment files).
      const onlyOps = creates.every((f) =>
        /(docker|nginx|Dockerfile|^\.env|^docker-compose)/i.test(f),
      );
      if (!onlyOps) {
        candidate.add(modelTask.id);
        if (!reasons.has(modelTask.id)) {
          reasons.set(modelTask.id, "backend code depends on Sequelize models");
        }
      }
    }

    // (c) Foundation: frontend → API client task.
    const touchesFrontend = creates.some((f) => f.startsWith("frontend/"));
    if (touchesFrontend && apiClientTask && apiClientTask.id !== t.id) {
      candidate.add(apiClientTask.id);
      if (!reasons.has(apiClientTask.id)) {
        reasons.set(
          apiClientTask.id,
          "frontend code depends on API client/types",
        );
      }
    }

    // (d) Frontend views/components → app shell task (routing, auth ctx).
    const touchesView = creates.some((f) =>
      /^frontend\/src\/(views|components|pages)\//.test(f),
    );
    if (touchesView && appShellTask && appShellTask.id !== t.id) {
      candidate.add(appShellTask.id);
      if (!reasons.has(appShellTask.id)) {
        reasons.set(appShellTask.id, "view/component depends on app shell");
      }
    }

    // (e) Tasks adding more *.routes.ts → core routes task (module index).
    const addsRoutes = creates.some((f) =>
      /^backend\/src\/api\/modules\/[^/]+\/[^/]+\.routes\.ts$/.test(f),
    );
    if (addsRoutes && coreRoutesTask && coreRoutesTask.id !== t.id) {
      candidate.add(coreRoutesTask.id);
      if (!reasons.has(coreRoutesTask.id)) {
        reasons.set(
          coreRoutesTask.id,
          "new routes attach to the core module index",
        );
      }
    }

    if (candidate.size === 0) continue;

    // ── 4. Cycle check ───────────────────────────────────────────────────
    // For each candidate dep, refuse the edge if it would create a cycle
    // (i.e. the candidate already transitively depends on `t`).
    const accepted: string[] = [];
    for (const depId of candidate) {
      if (wouldCreateCycle(tasks, depId, t.id)) {
        // Silently skip — cycles are usually a sign that the task is
        // actually a peer/predecessor, not a dependent.
        continue;
      }
      accepted.push(depId);
      trace.added.push({
        taskId: t.id,
        depId,
        reason: reasons.get(depId) ?? "inferred",
      });
    }

    if (accepted.length > 0) {
      t.dependencies = accepted.sort();
    }
  }

  // ── 5. Fix serial same-phase chains ────────────────────────────────────
  // When the LLM emits T-005 → ["T-004"] where both share the same phase
  // (e.g. Backend Services), it creates a fully serial chain.  Replace the
  // same-phase dep with the appropriate foundation dep so same-phase tasks
  // fan out in parallel.
  //
  // Only the same-phase portion of the dep list is replaced; cross-phase
  // deps (e.g. a frontend task that legitimately depends on a backend task)
  // are kept unchanged.  A cycle-safety check prevents regressions.
  const phaseOf = new Map(tasks.map((t) => [t.id, t.phase]));

  for (const t of tasks) {
    const deps = Array.isArray(t.dependencies) ? [...t.dependencies] : [];
    if (deps.length === 0) continue;

    const kept: string[] = [];
    let needsFoundation = false;

    for (const depId of deps) {
      if (phaseOf.get(depId) === t.phase) {
        // Same-phase dep → mark for replacement with foundation dep.
        needsFoundation = true;
      } else {
        kept.push(depId);
      }
    }

    if (!needsFoundation) continue;

    // Determine the foundation dep for this task's phase.
    let foundation: string | undefined;
    if (t.phase === "Backend Services" || t.phase === "Auth & Gateway") {
      foundation = modelTask?.id ?? apiClientTask?.id;
    } else if (t.phase === "Frontend") {
      foundation = appShellTask?.id ?? apiClientTask?.id;
    }

    if (foundation && foundation !== t.id && !kept.includes(foundation)) {
      if (!wouldCreateCycle(tasks, foundation, t.id)) {
        kept.push(foundation);
        trace.added.push({
          taskId: t.id,
          depId: foundation,
          reason: `replaced serial same-phase dep with foundation ${foundation}`,
        });
      }
    }

    // Deduplicate and write back only if something actually changed.
    const next = [...new Set(kept)].sort();
    const prev = [...deps].sort();
    if (next.join(",") !== prev.join(",")) {
      t.dependencies = next;
    }
  }

  return { tasks, trace };
}

function getCreates(t: KickoffWorkItem): string[] {
  if (!t.files) return [];
  if (Array.isArray(t.files)) return t.files; // legacy string[] shape
  return (t.files as TaskFilePlan).creates ?? [];
}

function getModifies(t: KickoffWorkItem): string[] {
  if (!t.files || Array.isArray(t.files)) return [];
  return (t.files as TaskFilePlan).modifies ?? [];
}

/**
 * Returns true if adding `from → to` would create a cycle — i.e. if `to`
 * (or any of its existing transitive deps) already reaches `from`.
 *
 * We're checking: does `from` already depend (transitively) on `to`?
 * If so, adding `to → from` would close a loop. Note the parameter order:
 *   edge being proposed:   `to` depends on `from`
 *   cycle exists iff:      `from` already reachable from `to` via existing
 *                          dep edges — meaning `to` already depends on it.
 *
 * The graph as stored: task.dependencies = list of predecessors. So
 * "X depends on Y" is edge X → Y. To check cycle when adding `to → from`
 * we ask: is there a path `from → … → to` following existing edges? If
 * yes, the new edge closes a cycle.
 */
function wouldCreateCycle(
  tasks: KickoffWorkItem[],
  from: string,
  to: string,
): boolean {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const visited = new Set<string>();
  const stack = [from];
  while (stack.length > 0) {
    const cur = stack.pop()!;
    if (cur === to) return true;
    if (visited.has(cur)) continue;
    visited.add(cur);
    const t = byId.get(cur);
    if (!t) continue;
    for (const d of t.dependencies ?? []) stack.push(d);
  }
  return false;
}
