"use client";

import { create } from "zustand";
import type {
  AgentLogEntry,
  CodingAgentInstance,
  CodingTask,
  KickoffWorkItem,
} from "@/lib/pipeline/types";
import type { CodingMode } from "@/lib/pipeline/coding-mode";

import type { HumanDecisionOption } from "@/lib/pipeline/human-decision";

/** AbortController for the active coding SSE fetch. Module-level so reset()
 *  can abort the HTTP connection and signal the backend to stop processing. */
let _codingAbortController: AbortController | null = null;

/** Last known codeOutputDir — used by reset() to abort the backend session. */
let _codingOutputDir: string | null = null;

/** Fire-and-forget call to stop any in-flight backend coding session. */
function abortBackendSession(codeOutputDir: string): void {
  fetch("/api/agents/coding/abort", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ codeOutputDir }),
  }).catch(() => {/* best-effort */});
}

import type { SessionCheckpoint } from "@/lib/pipeline/session-checkpoint";

export interface ServerLogEntry {
  level: "log" | "info" | "warn" | "error" | "debug";
  message: string;
  taskId?: string;
  timestamp: string;
}

/** Max server-console lines kept client-side; a multi-hour build can emit a
 *  huge volume, so keep only the most recent N to bound memory. */
const SERVER_LOG_CAP = 2000;

export function appendServerLog(
  logs: ServerLogEntry[],
  entry: ServerLogEntry,
  cap: number = SERVER_LOG_CAP,
): ServerLogEntry[] {
  const next = [...logs, entry];
  return next.length > cap ? next.slice(next.length - cap) : next;
}

export interface IntegrationVerifyState {
  status: "verifying" | "fixing" | "passed" | "failed";
  errors?: string;
  errorCount?: number;
  fixAttempts: number;
  maxFixAttempts: number;
  filesFixed?: number;
}

export interface E2EVerifyState {
  status: "verifying" | "fixing" | "passed" | "failed";
  errors?: string;
  errorCount?: number;
  fixAttempts: number;
  maxFixAttempts: number;
}

export interface PendingHumanDecision {
  sessionId: string;
  context: string;
  options: HumanDecisionOption[];
  /** ISO string — UI shows countdown */
  expiresAt: string;
}

interface CodingState {
  sessionId: string | null;
  projectId: string | null;
  status: "idle" | "running" | "completed" | "failed";
  agents: CodingAgentInstance[];
  tasks: CodingTask[];
  selectedAgentId: string | null;
  totalCostUsd: number;
  error: string | null;
  /** True while the SSE stream dropped but the server-side build is still
   *  running and we're polling orchestration-status to rehydrate (status stays
   *  "running"). Lets the UI show "reconnecting…" instead of a false failure. */
  reconnecting: boolean;
  integrationVerify: IntegrationVerifyState | null;
  e2eVerify: E2EVerifyState | null;
  /** Supervisor-level logs (phase verify, fix, install, etc.) */
  supervisorLogs: AgentLogEntry[];
  /** Raw server-console output streamed via server_log SSE events. */
  serverLogs: ServerLogEntry[];
  /** Per-test TDD RED/GREEN results, tagged with taskId. Merged into the
   *  task's real-time log view in the detail panel. */
  tddLogs: AgentLogEntry[];
  /** Set when integration_verify_fix is waiting for a human to pick an action. */
  pendingHumanDecision: PendingHumanDecision | null;
  codingMode: CodingMode;
  /** Persist the coding speed/cost selection in the store. The coding view's
   *  dropdown used local React state, which reset to the default whenever the
   *  view re-mounted (step navigation / SSE reconnect) — so a user-selected
   *  "cost" silently reverted to "normal" before handleStart ran. */
  setCodingMode: (mode: CodingMode) => void;

  startCoding: (
    runId: string,
    tasks: KickoffWorkItem[],
    codeOutputDir: string,
    projectTier?: string,
    codingMode?: CodingMode,
    prdContent?: string,
    stitchMeta?: { projectId: string; screenId: string; projectUrl: string },
  ) => void;
  /** Set by the project page on mount so the store can persist session state
   *  to the DB keyed by project. */
  setProjectId: (id: string) => void;
  /** Re-run only the tasks that failed in the last session. */
  retryFailedTasks: (
    runId: string,
    tasks: KickoffWorkItem[],
    failedTaskIds: string[],
    codeOutputDir: string,
    projectTier?: string,
    codingMode?: CodingMode,
    prdContent?: string,
    stitchMeta?: { projectId: string; screenId: string; projectUrl: string },
  ) => void;
  /** Tear down the current coding session entirely (regardless of status) and
   *  trigger a fresh full coding pipeline from task #1. Aborts any active SSE,
   *  drops the persisted `coding-session` snapshot, and clears the failure
   *  checkpoint so stale state cannot leak into the new run. Already-generated
   *  files on disk are NOT touched — coding agents will overwrite/modify as
   *  the new task plan dictates. */
  rerunCoding: (
    runId: string,
    tasks: KickoffWorkItem[],
    codeOutputDir: string,
    projectTier?: string,
    codingMode?: CodingMode,
    prdContent?: string,
    stitchMeta?: { projectId: string; screenId: string; projectUrl: string },
  ) => void;
  retryIntegrationVerify: (
    runId: string,
    codeOutputDir: string,
    projectTier?: string,
  ) => void;
  retryE2eVerify: (
    runId: string,
    codeOutputDir: string,
    projectTier?: string,
  ) => void;
  selectAgent: (agentId: string | null) => void;
  /** Called by the decision UI when the user picks an option. */
  submitHumanDecision: (decisionId: string, directive?: string) => Promise<void>;
  /** Rebuild task list and session status from a persisted checkpoint.
   *  Called on page load so the user sees last-session results without waiting
   *  for a re-run. Safe to call when status is "idle" or "failed". */
  hydrateFromCheckpoint: (
    checkpoint: SessionCheckpoint,
    taskItems: KickoffWorkItem[],
  ) => void;
  /** Rebuild task list directly from a DB CodingSessionSnapshot.
   *  Unlike hydrateFromCheckpoint, this correctly includes E2E / extra tasks
   *  that were injected server-side and are not present in kickoffItems.
   *  kickoffItems is used to fill in full metadata for regular tasks. */
  hydrateFromSnapshot: (
    snapshot: CodingSessionSnapshot,
    kickoffItems: KickoffWorkItem[],
  ) => void;
  reset: () => void;
}

/** Snapshot structure persisted to project_step_snapshot (stepId = "coding-session"). */
export interface CodingSessionSnapshot {
  sessionId: string;
  status: "completed" | "failed";
  savedAt: string;
  tasks: Array<{
    id: string;
    title: string;
    phase: string;
    /** Business-domain tag — kept so the topology view can group by domain
     *  after a session is hydrated from this snapshot. */
    subsystem?: string;
    codingStatus: CodingTask["codingStatus"];
    generatedFiles: string[];
    error?: string;
    taskCostUsd?: number;
  }>;
  totalCostUsd: number;
}

/** Persist the current session state to `project_step_snapshot` (stepId "coding-session"). */
function persistSessionSnapshot(
  projectId: string,
  state: Pick<CodingState, "sessionId" | "status" | "tasks" | "totalCostUsd">,
): void {
  if (!projectId || !state.sessionId) return;
  if (state.status !== "completed" && state.status !== "failed") return;

  const snapshot: CodingSessionSnapshot = {
    sessionId: state.sessionId,
    status: state.status,
    savedAt: new Date().toISOString(),
    tasks: state.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      phase: t.phase,
      subsystem: t.subsystem,
      codingStatus: t.codingStatus,
      generatedFiles: t.generatedFiles ?? [],
      error: t.error,
      taskCostUsd: t.taskCostUsd,
    })),
    totalCostUsd: state.totalCostUsd,
  };

  fetch(`/api/projects/${projectId}/project-step-snapshot`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stepId: "coding-session", snapshot }),
  }).catch((e) =>
    console.warn("[coding-store] Failed to persist session snapshot:", e),
  );
}

/**
 * Merge a durable checkpoint into the live task grid DURING reconnect, while
 * status stays "running". Unlike `hydrateFromCheckpoint` (which is for page-load
 * rehydration and bails out while running), this only updates per-task status:
 * terminal results from `taskResults`, plus the advisory `inProgressTaskIds`
 * set (tasks the server is actively generating right now) rendered as
 * "in_progress" so the grid shows live movement instead of an all-PENDING wall.
 * It does not touch agents, logs, or session status.
 */
function applyCheckpointDuringReconnect(
  checkpoint: SessionCheckpoint,
  taskItems: KickoffWorkItem[],
  set: (partial: Partial<CodingState>) => void,
  get: () => CodingState,
): void {
  const statusMap: Record<string, CodingTask["codingStatus"]> = {};
  for (const [id, entry] of Object.entries(checkpoint.taskResults)) {
    statusMap[id] =
      entry.status === "completed" || entry.status === "completed_with_warnings"
        ? entry.status
        : "failed";
  }
  // Advisory in-progress overlay wins over a synthetic "unknown→failed" for a
  // task that has started but not yet reached a terminal result.
  for (const id of checkpoint.inProgressTaskIds ?? []) {
    if (statusMap[id] === undefined || statusMap[id] === "failed") {
      statusMap[id] = "in_progress";
    }
  }

  // Preserve any richer task objects already in the store (e.g. generatedFiles
  // captured live before the drop); fall back to the kickoff item metadata.
  const existingById = new Map(get().tasks.map((t) => [t.id, t]));
  const tasks: CodingTask[] = taskItems.map((item) => {
    const prev = existingById.get(item.id);
    return {
      ...item,
      ...(prev ?? {}),
      assignedAgentId: prev?.assignedAgentId ?? null,
      codingStatus: statusMap[item.id] ?? prev?.codingStatus ?? "pending",
      generatedFiles:
        checkpoint.taskResults[item.id]?.generatedFiles ??
        prev?.generatedFiles ??
        [],
    };
  });
  set({ tasks });
}

/**
 * The SSE stream dropped (idle timeout / navigation / network) but the
 * subsystem build keeps running server-side. Instead of marking the session
 * failed, poll the durable orchestration status + checkpoint to rehydrate task
 * progress and resolve the final outcome without the stream. Falls back to
 * "failed" only when no orchestration is in flight (e.g. a single-pass run with
 * no status file). The loop self-terminates on reset (status → "idle").
 */
async function reconnectAfterDrop(
  taskItems: KickoffWorkItem[],
  set: (partial: Partial<CodingState>) => void,
  get: () => CodingState,
): Promise<void> {
  const POLL_MS = 5000;
  // Whether we've ever seen evidence of an in-flight orchestrated run (a status
  // record or a checkpoint). Once true, a later null/empty poll is treated as a
  // TRANSIENT read miss (the durable file is briefly unwritten) and we keep
  // reconnecting — never flip to ERROR while the backend is still building.
  let sawOrchestration = false;
  // Consecutive "no status at all" polls before we conclude there is genuinely
  // no orchestrated run (single-pass run that legitimately has no durable state).
  let missesWithoutOrchestration = 0;
  const MAX_MISSES = 3;
  for (;;) {
    // A reset()/new session took over — stop polling.
    if (get().status !== "running") return;
    let data:
      | { status?: { state?: string; error?: string } | null; checkpoint?: SessionCheckpoint | null }
      | null = null;
    try {
      const r = await fetch("/api/agents/coding/orchestration-status");
      if (r.ok) data = await r.json();
    } catch {
      /* transient — retry next poll */
    }
    if (get().status !== "running") return;

    if (data?.status || data?.checkpoint) sawOrchestration = true;

    if (data?.checkpoint) {
      try {
        // NB: do NOT call hydrateFromCheckpoint here — it early-returns while
        // status === "running" (which it always is during reconnect) and also
        // wipes agents/logs and rewrites status. Instead merge terminal results
        // and the advisory in-progress set straight into the existing grid,
        // keeping status "running" so the poll loop continues.
        applyCheckpointDuringReconnect(data.checkpoint, taskItems, set, get);
      } catch {
        /* ignore hydrate errors */
      }
    }
    const state = data?.status?.state;
    if (state === "completed") {
      set({ status: "completed", reconnecting: false });
      const s = get();
      persistSessionSnapshot(s.projectId ?? "", s);
      return;
    }
    if (state === "failed") {
      set({
        status: "failed",
        reconnecting: false,
        error: data?.status?.error ?? "Subsystem build failed.",
      });
      const s = get();
      persistSessionSnapshot(s.projectId ?? "", s);
      return;
    }
    if (!data?.status) {
      // No status this poll. For an orchestrated run this is a transient read
      // miss (the durable file is briefly unwritten while the build keeps
      // running) — keep reconnecting rather than falsely failing. Only conclude
      // "connection lost" for a run that has NEVER shown orchestration evidence
      // (a genuine single-pass run) after a few consecutive misses.
      if (!sawOrchestration) {
        missesWithoutOrchestration += 1;
        if (missesWithoutOrchestration >= MAX_MISSES) {
          set({ status: "failed", reconnecting: false, error: "Connection lost." });
          return;
        }
      }
      set({ reconnecting: true });
      await new Promise((res) => setTimeout(res, POLL_MS));
      continue;
    }
    missesWithoutOrchestration = 0;
    // state === "running": keep showing reconnecting and poll again.
    set({ reconnecting: true });
    await new Promise((res) => setTimeout(res, POLL_MS));
  }
}

export const useCodingStore = create<CodingState>()((set, get) => ({
  sessionId: null,
  projectId: null,
  status: "idle",
  agents: [],
  tasks: [],
  selectedAgentId: null,
  totalCostUsd: 0,
  error: null,
  reconnecting: false,
  integrationVerify: null,
  e2eVerify: null,
  gapAnalysis: null,
  supervisorLogs: [],
  serverLogs: [],
  tddLogs: [],
  pendingHumanDecision: null,
  codingMode: "cost",

  setProjectId: (id) => {
    const current = get();
    if (current.projectId && current.projectId !== id) {
      _codingAbortController?.abort();
      _codingAbortController = null;
      set({
        sessionId: null,
        projectId: id,
        status: "idle",
        agents: [],
        tasks: [],
        selectedAgentId: null,
        totalCostUsd: 0,
        error: null,
        integrationVerify: null,
        e2eVerify: null,
        supervisorLogs: [],
        serverLogs: [],
        tddLogs: [],
        pendingHumanDecision: null,
        codingMode: "cost",
      });
      return;
    }
    set({ projectId: id });
  },

  selectAgent: (agentId) => set({ selectedAgentId: agentId }),

  setCodingMode: (mode) => set({ codingMode: mode }),

  submitHumanDecision: async (decisionId: string, directive?: string) => {
    const { sessionId, pendingHumanDecision } = get();
    if (!sessionId || !pendingHumanDecision) return;
    set({ pendingHumanDecision: null });
    try {
      await fetch("/api/agents/coding/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, decisionId, directive }),
      });
    } catch (err) {
      console.error("[coding-store] submitHumanDecision failed:", err);
    }
  },

  startCoding: (
    runId,
    taskItems,
    codeOutputDir,
    projectTier,
    codingMode = "cost",
    prdContent,
    stitchMeta,
  ) => {
    set({
      status: "running",
      error: null,
      reconnecting: false,
      agents: [],
      tasks: [],
      selectedAgentId: null,
      totalCostUsd: 0,
      sessionId: null,
      integrationVerify: null,
      e2eVerify: null,
      supervisorLogs: [],
      serverLogs: [],
      tddLogs: [],
      pendingHumanDecision: null,
      codingMode,
    });

    // Clear the last-session checkpoint so the "Retry Failed Tasks" button
    // doesn't show stale data while a fresh full run is in progress.
    fetch("/api/agents/coding/checkpoint", { method: "DELETE" }).catch(() => {});

    // Abort any previous coding session (client-side SSE + backend process).
    // The backend call is needed for the page-refresh case where the previous
    // SSE connection was silently dropped and the backend is still running.
    _codingAbortController?.abort();
    abortBackendSession(codeOutputDir);
    _codingOutputDir = codeOutputDir;

    const controller = new AbortController();
    _codingAbortController = controller;

    fetch("/api/agents/coding", {
      signal: controller.signal,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        runId,
        tasks: taskItems,
        codeOutputDir,
        projectTier,
        codingMode,
        prd: prdContent,
        stitchMeta,
        // Project slug — isolates per-project design references for mirroring.
        projectId: get().projectId ?? undefined,
      }),
    })
      .then(async (resp) => {
        if (!resp.ok) {
          const errData = await resp.json().catch(() => ({}));
          set({
            status: "failed",
            error:
              (errData as { error?: string }).error || "Coding request failed",
          });
          return;
        }

        const reader = resp.body?.getReader();
        if (!reader) {
          set({ status: "failed", error: "No response body" });
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const payload = JSON.parse(line.slice(6));
              handleCodingEvent(payload, set, get);
            } catch {
              /* skip */
            }
          }
        }

        if (buffer.startsWith("data: ")) {
          try {
            handleCodingEvent(JSON.parse(buffer.slice(6)), set, get);
          } catch {
            /* skip */
          }
        }

        const state = get();
        if (state.status === "running") {
          // Stream ended but no session_complete arrived → the SSE dropped while
          // the server-side build keeps running. Reconnect + poll instead of
          // falsely marking it completed.
          void reconnectAfterDrop(taskItems, set, get);
          return;
        }
        const finalState = get();
        persistSessionSnapshot(finalState.projectId ?? "", finalState);
      })
      .catch((err) => {
        // Ignore intentional abort from reset() — state is already idle.
        if (err instanceof DOMException && err.name === "AbortError") return;
        // The stream errored (drop). The build keeps running server-side, so try
        // to reconnect + poll orchestration-status rather than failing outright.
        if (get().status === "running") {
          set({ reconnecting: true });
          void reconnectAfterDrop(taskItems, set, get);
          return;
        }
        set({
          status: "failed",
          error: err instanceof Error ? err.message : "Unknown error",
        });
        const s = get();
        persistSessionSnapshot(s.projectId ?? "", s);
      });
  },

  rerunCoding: (
    runId,
    tasks,
    codeOutputDir,
    projectTier,
    codingMode = "cost",
    prdContent,
    stitchMeta,
  ) => {
    const { projectId } = get();

    // 1. Abort any active SSE connection. The backend coding pipeline reads
    //    the close signal and stops scheduling further workers.
    _codingAbortController?.abort();
    _codingAbortController = null;

    // 2. Drop the persisted coding-session snapshot. Without this, a future
    //    page-mount would `hydrateFromSnapshot` the stale completed/failed
    //    run and the UI would briefly flash the old result before the new
    //    SSE stream takes over.
    if (projectId) {
      fetch(
        `/api/projects/${encodeURIComponent(projectId)}/project-step-snapshot?stepId=coding-session`,
        { method: "DELETE" },
      ).catch((e) =>
        console.warn(
          "[coding-store] failed to delete coding-session snapshot:",
          e,
        ),
      );
    }

    // 3. Clear the failure-task checkpoint that the retry button consults.
    fetch("/api/agents/coding/checkpoint", { method: "DELETE" }).catch(() => {});

    // 4. Fully reset in-memory state to idle, then delegate to startCoding
    //    which performs the actual POST + SSE wiring. We do not inline the
    //    body of startCoding here on purpose — it stays the single source of
    //    truth for "kick off a fresh coding run".
    set({
      sessionId: null,
      status: "idle",
      agents: [],
      tasks: [],
      selectedAgentId: null,
      totalCostUsd: 0,
      error: null,
      reconnecting: false,
      integrationVerify: null,
      e2eVerify: null,
      supervisorLogs: [],
      serverLogs: [],
      tddLogs: [],
      pendingHumanDecision: null,
      codingMode,
    });

    get().startCoding(
      runId,
      tasks,
      codeOutputDir,
      projectTier,
      codingMode,
      prdContent,
      stitchMeta,
    );
  },

  retryFailedTasks: (
    runId,
    tasks,
    failedTaskIds,
    codeOutputDir,
    projectTier,
    codingMode = "cost",
    prdContent,
    stitchMeta,
  ) => {
    const retrySet = new Set(failedTaskIds);
    const existingTasks = get().tasks;

    // Preserve already-completed tasks; only reset the tasks being retried to
    // "pending" so the progress bar stays accurate and the user can see which
    // tasks are being re-run vs. which already succeeded.
    const initialTasks: CodingTask[] =
      existingTasks.length > 0
        ? existingTasks.map((t) =>
            retrySet.has(t.id)
              ? {
                  ...t,
                  codingStatus: "pending" as const,
                  error: undefined,
                  errorPreview: undefined,
                  verifyErrors: undefined,
                  startedAt: undefined,
                  completedAt: undefined,
                  generatedFiles: [],
                }
              : t,
          )
        : tasks.map((t) => ({
            ...t,
            assignedAgentId: null,
            codingStatus: retrySet.has(t.id)
              ? ("pending" as const)
              : ("completed" as const),
            generatedFiles: [],
          }));

    set({
      status: "running",
      error: null,
      agents: [],
      tasks: initialTasks,
      selectedAgentId: null,
      totalCostUsd: 0,
      sessionId: null,
      integrationVerify: null,
      e2eVerify: null,
      supervisorLogs: [],
      serverLogs: [],
      tddLogs: [],
      pendingHumanDecision: null,
      codingMode,
    });

    // Abort any previous coding session before starting retry.
    _codingAbortController?.abort();
    abortBackendSession(codeOutputDir);
    _codingOutputDir = codeOutputDir;

    const controller = new AbortController();
    _codingAbortController = controller;

    fetch("/api/agents/coding", {
      signal: controller.signal,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        runId,
        tasks,
        codeOutputDir,
        projectTier,
        codingMode,
        prd: prdContent,
        stitchMeta,
        retryFailedTaskIds: failedTaskIds,
        // Project slug — isolates per-project design references for mirroring.
        projectId: get().projectId ?? undefined,
      }),
    })
      .then(async (resp) => {
        if (!resp.ok) {
          const errData = await resp.json().catch(() => ({}));
          // Roll back the optimistic `pending` reset so the picker doesn't
          // leave a "ghost pending" row when the API rejects the retry (e.g.
          // returns 400). For each task we forced to pending above, restore
          // its prior status from the snapshot taken before the optimistic
          // update.
          const prevById = new Map(existingTasks.map((t) => [t.id, t]));
          const rolledBack = get().tasks.map((t) =>
            retrySet.has(t.id) && prevById.has(t.id) ? prevById.get(t.id)! : t,
          );
          set({
            status: "failed",
            error: (errData as { error?: string }).error || "Retry failed",
            tasks: rolledBack,
          });
          return;
        }

        const reader = resp.body?.getReader();
        if (!reader) {
          set({ status: "failed", error: "No response body" });
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const payload = JSON.parse(line.slice(6));
              handleCodingEvent(payload, set, get);
            } catch {
              /* skip */
            }
          }
        }

        if (buffer.startsWith("data: ")) {
          try {
            handleCodingEvent(JSON.parse(buffer.slice(6)), set, get);
          } catch {
            /* skip */
          }
        }

        const state = get();
        if (state.status === "running") set({ status: "completed" });
        const finalState = get();
        persistSessionSnapshot(finalState.projectId ?? "", finalState);
      })
      .catch((err) => {
        // Ignore intentional abort from reset() — state is already idle.
        if (err instanceof DOMException && err.name === "AbortError") return;
        set({
          status: "failed",
          error: err instanceof Error ? err.message : "Unknown error",
        });
        const s = get();
        persistSessionSnapshot(s.projectId ?? "", s);
      });
  },

  retryIntegrationVerify: (runId, codeOutputDir, projectTier) => {
    const current = get();
    if (current.status === "running") return;

    set({
      status: "running",
      error: null,
      integrationVerify: {
        status: "verifying",
        fixAttempts: 0,
        maxFixAttempts: current.integrationVerify?.maxFixAttempts ?? 3,
      },
      e2eVerify: null,
    });

    fetch("/api/agents/coding/retry-integration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        runId,
        tasks: current.tasks,
        codeOutputDir,
        projectTier,
        codingMode: current.codingMode,
      }),
    })
      .then(async (resp) => {
        if (!resp.ok) {
          const errData = await resp.json().catch(() => ({}));
          set({
            status: "failed",
            error:
              (errData as { error?: string }).error ||
              "Integration retry request failed",
          });
          return;
        }

        const reader = resp.body?.getReader();
        if (!reader) {
          set({ status: "failed", error: "No response body" });
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const payload = JSON.parse(line.slice(6));
              handleCodingEvent(payload, set, get);
            } catch {
              /* skip */
            }
          }
        }

        if (buffer.startsWith("data: ")) {
          try {
            handleCodingEvent(JSON.parse(buffer.slice(6)), set, get);
          } catch {
            /* skip */
          }
        }

        const state = get();
        if (state.status === "running") set({ status: "completed" });
      })
      .catch((err) => {
        set({
          status: "failed",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      });
  },

  retryE2eVerify: (runId, codeOutputDir, projectTier) => {
    const current = get();
    if (current.status === "running") return;

    set({
      status: "running",
      error: null,
      e2eVerify: {
        status: "verifying",
        fixAttempts: 0,
        maxFixAttempts: current.e2eVerify?.maxFixAttempts ?? 3,
      },
    });

    fetch("/api/agents/coding/retry-e2e", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        runId,
        tasks: current.tasks,
        codeOutputDir,
        projectTier,
        codingMode: current.codingMode,
      }),
    })
      .then(async (resp) => {
        if (!resp.ok) {
          const errData = await resp.json().catch(() => ({}));
          set({
            status: "failed",
            error:
              (errData as { error?: string }).error ||
              "E2E retry request failed",
          });
          return;
        }

        const reader = resp.body?.getReader();
        if (!reader) {
          set({ status: "failed", error: "No response body" });
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const payload = JSON.parse(line.slice(6));
              handleCodingEvent(payload, set, get);
            } catch {
              /* skip */
            }
          }
        }

        if (buffer.startsWith("data: ")) {
          try {
            handleCodingEvent(JSON.parse(buffer.slice(6)), set, get);
          } catch {
            /* skip */
          }
        }

        const state = get();
        if (state.status === "running") set({ status: "completed" });
      })
      .catch((err) => {
        set({
          status: "failed",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      });
  },

  hydrateFromCheckpoint: (checkpoint, taskItems) => {
    // Only hydrate if we're not currently running a session.
    if (get().status === "running") return;

    const statusMap: Record<string, CodingTask["codingStatus"]> = {};
    for (const [id, entry] of Object.entries(checkpoint.taskResults)) {
      if (entry.status === "completed" || entry.status === "completed_with_warnings") {
        statusMap[id] = entry.status;
      } else {
        statusMap[id] = "failed";
      }
    }

    const tasks: CodingTask[] = taskItems.map((item) => ({
      ...item,
      assignedAgentId: null,
      codingStatus: statusMap[item.id] ?? "pending",
      generatedFiles: checkpoint.taskResults[item.id]?.generatedFiles ?? [],
    }));

    const allDone = tasks.every(
      (t) =>
        t.codingStatus === "completed" ||
        t.codingStatus === "completed_with_warnings",
    );
    const hasFailed = tasks.some((t) => t.codingStatus === "failed");

    set({
      sessionId: checkpoint.sessionId,
      status: allDone ? "completed" : hasFailed ? "failed" : "completed",
      tasks,
      agents: [],
      error: null,
      integrationVerify: null,
      e2eVerify: null,
      supervisorLogs: [],
      serverLogs: [],
      pendingHumanDecision: null,
    });
  },

  hydrateFromSnapshot: (snapshot, kickoffItems) => {
    if (get().status === "running") return;

    // Build a lookup map for full metadata from kickoff tasks
    const kickoffMap = new Map(kickoffItems.map((k) => [k.id, k]));

    // Rebuild all tasks from snapshot (including E2E / server-injected extra tasks)
    const tasks: CodingTask[] = snapshot.tasks.map((t) => {
      const kickoff = kickoffMap.get(t.id);
      return {
        id: t.id,
        title: t.title,
        phase: t.phase,
        subsystem: kickoff?.subsystem ?? t.subsystem,
        description: kickoff?.description ?? "",
        estimatedHours: kickoff?.estimatedHours ?? 0,
        executionKind: kickoff?.executionKind ?? "ai_autonomous",
        files: kickoff?.files,
        dependencies: kickoff?.dependencies,
        priority: kickoff?.priority,
        subSteps: kickoff?.subSteps,
        tokenEstimate: kickoff?.tokenEstimate,
        acceptanceCriteria: kickoff?.acceptanceCriteria,
        coversRequirementIds: kickoff?.coversRequirementIds,
        tddPlan: kickoff?.tddPlan,
        assignedAgentId: null,
        codingStatus: t.codingStatus,
        generatedFiles: t.generatedFiles,
        error: t.error,
      };
    });

    const allDone = tasks.every(
      (t) =>
        t.codingStatus === "completed" ||
        t.codingStatus === "completed_with_warnings",
    );
    const hasFailed = tasks.some((t) => t.codingStatus === "failed");

    set({
      sessionId: snapshot.sessionId,
      status: allDone ? "completed" : hasFailed ? "failed" : "completed",
      tasks,
      totalCostUsd: snapshot.totalCostUsd,
      agents: [],
      error: null,
      integrationVerify: null,
      e2eVerify: null,
      supervisorLogs: [],
      serverLogs: [],
      pendingHumanDecision: null,
    });
  },

  reset: () => {
    // Abort the backend coding session so it stops processing tasks.
    // Client-side abort propagates via request.signal → sessionAbortController.
    // Also call the abort endpoint directly for immediate effect.
    _codingAbortController?.abort();
    _codingAbortController = null;
    if (_codingOutputDir) {
      abortBackendSession(_codingOutputDir);
      _codingOutputDir = null;
    }
    set({
      sessionId: null,
      status: "idle",
      agents: [],
      tasks: [],
      selectedAgentId: null,
      totalCostUsd: 0,
      error: null,
      reconnecting: false,
      integrationVerify: null,
      e2eVerify: null,
      supervisorLogs: [],
      serverLogs: [],
      pendingHumanDecision: null,
    });
  },
}));

type IncomingPayload = {
  type: string;
  sessionId?: string;
  agentId?: string;
  taskId?: string;
  data?: Record<string, unknown>;
  session?: { tasks: CodingTask[]; totalCostUsd: number };
};

/**
 * Collapse any worker still marked "working" down to "completed".
 *
 * Worker completion is inferred per-task (agent_task_complete) and per-phase
 * (agent_completed); neither is guaranteed for every instance, so a missed
 * end signal can orphan an agent in "working". Call this on terminal events
 * to keep the ACTIVE AGENTS badge from showing phantom active workers after
 * the run has finished. Returns the same array reference when nothing changed
 * so callers don't trigger needless re-renders.
 */
function sweepWorkingAgents(
  agents: CodingAgentInstance[],
): CodingAgentInstance[] {
  if (!agents.some((a) => a.status === "working")) return agents;
  return agents.map((a) =>
    a.status === "working"
      ? { ...a, status: "completed" as const, currentTaskId: null }
      : a,
  );
}

function handleCodingEvent(
  payload: IncomingPayload,
  set: (s: Partial<CodingState>) => void,
  get: () => CodingState,
) {
  const { type } = payload;

  if (type === "session_start") {
    const incomingTasks = (payload.data?.tasks as CodingTask[] | undefined) ?? [];
    const existingTasks = get().tasks;

    if (existingTasks.length > 0) {
      // Retry mode: tasks were already initialised by retryFailedTasks() with
      // preserved completed statuses. Only update sessionId; overwriting tasks
      // here would reset completed tasks back to pending and kill the progress bar.
      set({ sessionId: payload.sessionId });
    } else {
      // Fresh session: populate tasks from the server's session_start payload.
      set({ sessionId: payload.sessionId, tasks: incomingTasks });
    }
    return;
  }

  if (type === "tasks_assigned") {
    const assignments = payload.data?.assignments as
      | { agentId: string; taskIds: string[] }[]
      | undefined;
    if (assignments) {
      const tasks = get().tasks.map((t) => {
        const match = assignments.find((a) => a.taskIds.includes(t.id));
        if (match) return { ...t, assignedAgentId: match.agentId };
        return t;
      });
      set({ tasks });
    }
    return;
  }

  if (type === "agent_created") {
    const agents = [...get().agents];
    agents.push({
      id: payload.agentId!,
      role: payload.data?.role as CodingAgentInstance["role"],
      label: payload.data?.label as string,
      status: "idle",
      currentTaskId: null,
      completedTaskIds: [],
      failedTaskIds: [],
      logs: [],
      totalCostUsd: 0,
    });
    set({ agents });
    return;
  }

  if (type === "agent_task_start") {
    const taskId = payload.taskId;
    const previousTaskId =
      get().agents.find((a) => a.id === payload.agentId)?.currentTaskId ?? null;
    const agents = get().agents.map((a) => {
      if (a.id !== payload.agentId) return a;
      return {
        ...a,
        status: "working" as const,
        currentTaskId: taskId ?? null,
        logs: [
          ...a.logs,
          {
            timestamp: new Date().toISOString(),
            type: "task_start" as const,
            taskId,
            message: `Starting: ${payload.data?.title}`,
          },
        ],
      };
    });
    const existingTasks = get().tasks;
    if (!taskId) {
      set({ agents, tasks: existingTasks });
      return;
    }
    const taskExists = existingTasks.some((t) => t.id === taskId);
    let tasks: CodingTask[];
    if (taskExists) {
      tasks = existingTasks.map((t) => {
        if (t.id === previousTaskId && previousTaskId !== taskId && t.codingStatus === "in_progress") {
          return {
            ...t,
            codingStatus: "completed_with_warnings" as const,
            progressStage: undefined,
            verifyErrors:
              t.verifyErrors ??
              "Task was auto-closed because the same worker started a new task before a completion event arrived.",
            errorPreview:
              t.errorPreview ??
              "Auto-closed after worker advanced to the next task.",
          };
        }
        if (t.id !== taskId) return t;
        return {
          ...t,
          assignedAgentId: payload.agentId ?? t.assignedAgentId,
          codingStatus: "in_progress" as const,
          progressStage: "generating" as const,
          startedAt: t.startedAt ?? new Date().toISOString(),
          fixAttempts: 0,
          verifyErrors: undefined,
          errorPreview: undefined,
        };
      });
    } else {
      tasks = [
        ...existingTasks.map((t) =>
          t.id === previousTaskId && previousTaskId !== taskId && t.codingStatus === "in_progress"
            ? {
                ...t,
                codingStatus: "completed_with_warnings" as const,
                progressStage: undefined,
                startedAt: undefined,
                completedAt: new Date().toISOString(),
                verifyErrors:
                  t.verifyErrors ??
                  "Task was auto-closed because the same worker started a new task before a completion event arrived.",
                errorPreview:
                  t.errorPreview ??
                  "Auto-closed after worker advanced to the next task.",
              }
            : t,
        ),
        {
          id: taskId,
          phase: (payload.data?.phase as string) ?? "Dynamic",
          title: (payload.data?.title as string) ?? taskId,
          description: (payload.data?.description as string) ?? "",
          estimatedHours: 0,
          executionKind: "ai_autonomous" as const,
          files: [],
          dependencies: [],
          priority: "P1" as const,
          assignedAgentId: payload.agentId ?? null,
          codingStatus: "in_progress" as const,
          progressStage: "generating" as const,
          startedAt: new Date().toISOString(),
          fixAttempts: 0,
        },
      ];
    }
    set({ agents, tasks });
    return;
  }

  if (type === "agent_task_progress") {
    const taskId = payload.taskId;
    if (!taskId) return;

    const stage = payload.data?.stage as CodingTask["progressStage"] | undefined;
    const fixAttempt = payload.data?.fixAttempt as number | undefined;
    const verifyErrors = payload.data?.verifyErrors as string | undefined;
    const errorPreview = payload.data?.errorPreview as string | undefined;

    const tasks = get().tasks.map((t) => {
      if (t.id !== taskId) return t;
      return {
        ...t,
        progressStage: stage ?? t.progressStage,
        fixAttempts: fixAttempt ?? t.fixAttempts,
        verifyErrors: verifyErrors ?? t.verifyErrors,
        errorPreview: errorPreview ?? t.errorPreview,
      };
    });

    set({ tasks });
    return;
  }

  if (type === "agent_task_complete") {
    const agents = get().agents.map((a) => {
      if (a.id !== payload.agentId) return a;
      const costUsd = (payload.data?.costUsd as number) ?? 0;
      const completedStatus =
        (payload.data?.status as CodingTask["codingStatus"] | undefined) ??
        "completed";
      const tokenUsage = payload.data?.tokenUsage as
        | { totalTokens?: number }
        | undefined;
      const totalTokens = tokenUsage?.totalTokens ?? 0;
      return {
        ...a,
        status: "idle" as const,
        currentTaskId: null,
        completedTaskIds: [...a.completedTaskIds, payload.taskId!],
        totalCostUsd: a.totalCostUsd + costUsd,
        logs: [
          ...a.logs,
          {
            timestamp: new Date().toISOString(),
            type: "task_complete" as const,
            taskId: payload.taskId,
            details: [
              typeof payload.data?.verifyErrors === "string"
                ? (payload.data.verifyErrors as string)
                : "",
              ((payload.data?.modifiedFiles as string[]) ??
                (payload.data?.filesGenerated as string[]) ??
                [])
                .map((f) => `- ${f}`)
                .join("\n"),
            ]
              .filter(Boolean)
              .join("\n\n"),
            message:
              completedStatus === "completed_with_warnings"
                ? `Completed with warnings (${((payload.data?.filesGenerated as string[]) ?? []).length} files, ${totalTokens.toLocaleString()} tokens, $${costUsd.toFixed(4)})`
                : `Completed (${((payload.data?.filesGenerated as string[]) ?? []).length} files, ${totalTokens.toLocaleString()} tokens, $${costUsd.toFixed(4)})`,
          },
        ],
      };
    });
    const existingTasks = get().tasks;
    const taskExists = existingTasks.some((t) => t.id === payload.taskId);
    const filesGenerated = (payload.data?.filesGenerated as string[]) ?? [];
    const modifiedFiles = (payload.data?.modifiedFiles as string[]) ?? filesGenerated;
    const tokenUsage = payload.data?.tokenUsage as
      | {
          promptTokens: number;
          completionTokens: number;
          totalTokens: number;
        }
      | undefined;
    let tasks: CodingTask[];
    if (taskExists) {
      tasks = existingTasks.map((t) => {
        if (t.id !== payload.taskId) return t;
        return {
          ...t,
          assignedAgentId: payload.agentId ?? t.assignedAgentId,
          codingStatus:
            (payload.data?.status as CodingTask["codingStatus"] | undefined) ??
            ("completed" as const),
          generatedFiles: filesGenerated,
          modifiedFiles,
          tokenUsage: tokenUsage ?? t.tokenUsage,
          taskCostUsd: (payload.data?.costUsd as number | undefined) ?? t.taskCostUsd,
          progressStage: undefined,
          completedAt: new Date().toISOString(),
          fixAttempts:
            (payload.data?.fixCycles as number | undefined) ?? t.fixAttempts,
          verifyErrors:
            (payload.data?.verifyErrors as string | undefined) ??
            t.verifyErrors,
          errorPreview:
            (payload.data?.verifyErrors as string | undefined)?.slice(0, 200) ??
            t.errorPreview,
        };
      });
    } else {
      tasks = [
        ...existingTasks,
        {
          id: payload.taskId!,
          phase: (payload.data?.phase as string) ?? "Dynamic",
          title: (payload.data?.title as string) ?? payload.taskId!,
          description: "",
          estimatedHours: 0,
          executionKind: "ai_autonomous" as const,
          files: [],
          dependencies: [],
          priority: "P1" as const,
          assignedAgentId: payload.agentId ?? null,
          codingStatus:
            (payload.data?.status as CodingTask["codingStatus"] | undefined) ??
            ("completed" as const),
          generatedFiles: filesGenerated,
          modifiedFiles,
          tokenUsage,
          taskCostUsd: payload.data?.costUsd as number | undefined,
          fixAttempts: payload.data?.fixCycles as number | undefined,
          verifyErrors: payload.data?.verifyErrors as string | undefined,
          errorPreview: (payload.data?.verifyErrors as string | undefined)?.slice(
            0,
            200,
          ),
          completedAt: new Date().toISOString(),
        },
      ];
    }
    const totalCostUsd =
      get().totalCostUsd + ((payload.data?.costUsd as number) ?? 0);
    set({ agents, tasks, totalCostUsd });
    return;
  }

  if (type === "agent_task_error") {
    const agents = get().agents.map((a) => {
      if (a.id !== payload.agentId) return a;
      return {
        ...a,
        // Mirror agent_task_complete: a failed task ends the worker's active
        // window. Without this the worker stays "working" and keeps counting
        // toward the ACTIVE AGENTS badge until the phase happens to finish.
        status: "idle" as const,
        currentTaskId: null,
        failedTaskIds: [...a.failedTaskIds, payload.taskId!],
        logs: [
          ...a.logs,
          {
            timestamp: new Date().toISOString(),
            type: "task_error" as const,
            taskId: payload.taskId,
            details: payload.data?.error as string | undefined,
            message: `Failed: ${payload.data?.error}`,
          },
        ],
      };
    });
    const tasks = get().tasks.map((t) => {
      if (t.id !== payload.taskId) return t;
      return {
        ...t,
        codingStatus: "failed" as const,
        error: payload.data?.error as string,
        progressStage: undefined,
        completedAt: new Date().toISOString(),
      };
    });
    set({ agents, tasks });
    return;
  }

  if (type === "agent_log") {
    const agents = get().agents.map((a) => {
      if (a.id !== payload.agentId) return a;
      return {
        ...a,
        logs: [
          ...a.logs,
          {
            timestamp: new Date().toISOString(),
            type:
              ((payload.data?.logType as AgentLogEntry["type"] | undefined) ??
                "info") as AgentLogEntry["type"],
            taskId: payload.taskId,
            message: (payload.data?.message as string) ?? "",
            details: payload.data?.details as string | undefined,
          },
        ],
      };
    });
    set({ agents });
    return;
  }

  if (type === "agent_task_substeps") {
    const taskId = payload.taskId;
    if (!taskId || !payload.data?.subSteps) return;
    const subSteps = payload.data.subSteps as CodingTask["subSteps"];
    const tasks = get().tasks.map((t) => {
      if (t.id !== taskId) return t;
      return { ...t, subSteps };
    });
    set({ tasks });
    return;
  }

  if (type === "agent_completed") {
    const agents = get().agents.map((a) => {
      if (a.id !== payload.agentId) return a;
      return {
        ...a,
        status: (payload.data?.status as CodingAgentInstance["status"]) ?? "completed",
      };
    });
    set({ agents });
    return;
  }

  if (type === "done" && payload.session) {
    const session = payload.session;
    set({
      status: "completed",
      tasks: session.tasks ?? get().tasks,
      totalCostUsd: session.totalCostUsd ?? get().totalCostUsd,
      // Terminal sweep: completion is otherwise inferred per-phase, so any
      // worker instance that never received its task/phase end signal would
      // stay "working" and keep inflating the ACTIVE AGENTS badge after the
      // run is over. The run succeeded, so collapse them to "completed".
      agents: sweepWorkingAgents(get().agents),
    });
    return;
  }

  if (type === "session_complete") {
    set({ status: "completed", agents: sweepWorkingAgents(get().agents) });
    return;
  }

  if (type === "session_error") {
    const errorCategory = (payload.data?.errorCategory as string) ?? "unknown";
    const currentTasks = get().tasks;
    const currentAgents = get().agents;

    const cleanedTasks = currentTasks.map((t) =>
      t.codingStatus === "in_progress"
        ? { ...t, codingStatus: "failed" as const }
        : t,
    );

    const cleanedAgents = currentAgents.map((a) =>
      a.status === "working"
        ? { ...a, status: "idle" as const, currentTaskId: null }
        : a,
    );

    set({
      status: "failed",
      error: (payload.data?.error as string) ?? "Session failed",
      tasks: cleanedTasks,
      agents: cleanedAgents,
    });

    console.warn(
      `[CodingStore] session_error (${errorCategory}): ` +
      `marked ${cleanedTasks.filter((_, i) => currentTasks[i].codingStatus === "in_progress").length} task(s) failed, ` +
      `reset ${cleanedAgents.filter((_, i) => currentAgents[i].status === "working").length} agent(s) to idle`,
    );
    return;
  }

  if (type === "integration_verify_start") {
    set({
      integrationVerify: {
        status: "verifying",
        fixAttempts: 0,
        maxFixAttempts: 3,
      },
    });
    return;
  }

  if (type === "integration_verify_result") {
    const passed = payload.data?.passed as boolean;
    const errors = payload.data?.errors as string | undefined;
    const errorCount = payload.data?.errorCount as number | undefined;
    const fixAttempts = (payload.data?.fixAttempts as number) ?? 0;
    const maxFixAttempts = (payload.data?.maxFixAttempts as number) ?? 3;

    if (passed) {
      set({
        integrationVerify: {
          status: "passed",
          fixAttempts,
          maxFixAttempts,
        },
      });
    } else {
      const atMax = fixAttempts >= maxFixAttempts;
      set({
        integrationVerify: {
          status: atMax ? "failed" : "fixing",
          errors,
          errorCount,
          fixAttempts,
          maxFixAttempts,
        },
      });
    }
    return;
  }

  if (type === "supervisor_log") {
    const entry: AgentLogEntry = {
      timestamp: new Date().toISOString(),
      type: "info",
      message: (payload.data?.message as string) ?? "",
    };
    set({ supervisorLogs: [...get().supervisorLogs, entry] });
    return;
  }

  if (type === "server_log") {
    const d = payload.data ?? {};
    const entry: ServerLogEntry = {
      level: (d.level as ServerLogEntry["level"]) ?? "log",
      message: (d.message as string) ?? "",
      taskId: d.taskId as string | undefined,
      timestamp: (d.timestamp as string) ?? new Date().toISOString(),
    };
    set({ serverLogs: appendServerLog(get().serverLogs, entry) });
    return;
  }

  if (type === "integration_fix_result") {
    const attempt = (payload.data?.attempt as number) ?? 0;
    const filesFixed = payload.data?.filesFixed as number | undefined;
    const prev = get().integrationVerify;
    set({
      integrationVerify: {
        status: "verifying",
        fixAttempts: attempt,
        maxFixAttempts: prev?.maxFixAttempts ?? 3,
        filesFixed,
        errors: undefined,
        errorCount: undefined,
      },
    });
    return;
  }

  if (type === "e2e_verify_start") {
    set({
      e2eVerify: {
        status: "verifying",
        fixAttempts: 0,
        maxFixAttempts: 3,
      },
    });
    return;
  }

  if (type === "e2e_verify_result") {
    const passed = payload.data?.passed as boolean;
    const errors = payload.data?.errors as string | undefined;
    const errorCount = payload.data?.errorCount as number | undefined;
    const fixAttempts = (payload.data?.fixAttempts as number) ?? 0;
    const maxFixAttempts = (payload.data?.maxFixAttempts as number) ?? 3;

    if (passed) {
      set({
        e2eVerify: {
          status: "passed",
          fixAttempts,
          maxFixAttempts,
        },
      });
      return;
    }

    const atMax = fixAttempts >= maxFixAttempts;
    set({
      e2eVerify: {
        status: atMax ? "failed" : "fixing",
        errors,
        errorCount,
        fixAttempts,
        maxFixAttempts,
      },
    });
    return;
  }

  // Handle repair_event from the supervisor's self-heal channel.
  if (type === "repair_event") {
    const repairEvent = payload.data?.event as string | undefined;

    // Promote pending → in_progress on repair events EXCEPT those from
    // phase-level stages that emit task IDs for bookkeeping before/after
    // any worker actually runs (which would flash unrelated tasks "active").
    // Blacklist is safer than whitelist: new worker-side stages get the
    // activation for free without code changes.
    const repairTaskId = payload.taskId ?? (payload.data?.taskId as string | undefined);
    const repairStage = payload.data?.stage as string | undefined;
    const PHASE_LEVEL_STAGES = new Set([
      "prd-spec",
      "coverage-gate",
      "phase-gate",
      "task-breakdown",
      "architect-triage",
      "post-gen-audit",
      "integration-gate",
      "e2e-triage",
      "preflight-convention-fix",
      "preflight-route-audit",
      "preflight-deps",
      "preflight-contract-completeness",
      "preflight-task-contract-coverage",
      "preflight-stub-generation",
      "generate_api_contracts",
      "tdd-test-writer",
      "tdd-review",
      "tdd-runtime",
    ]);
    if (repairTaskId && !(repairStage && PHASE_LEVEL_STAGES.has(repairStage))) {
      const current = get().tasks.find((t) => t.id === repairTaskId);
      if (current?.codingStatus === "pending") {
        set({
          tasks: get().tasks.map((t) =>
            t.id === repairTaskId
              ? { ...t, codingStatus: "in_progress" as const, progressStage: "generating" as const, startedAt: t.startedAt ?? new Date().toISOString() }
              : t,
          ),
        });
      }
    }

    // Real-time file read/write activity — append to the task's fileActivities.
    if (repairEvent === "file_activity") {
      const taskId = repairTaskId;
      const details = payload.data?.details as Record<string, unknown> | undefined;
      if (taskId && details) {
        const entry = {
          operation: details.operation as "read" | "write",
          path: String(details.path ?? ""),
          contentPreview: details.contentPreview as string | undefined,
          contentLength: details.contentLength as number | undefined,
          timestamp: new Date().toISOString(),
        };
        set({
          tasks: get().tasks.map((t) =>
            t.id === taskId
              ? { ...t, fileActivities: [...(t.fileActivities ?? []), entry] }
              : t,
          ),
        });
      }
      return;
    }

    // Per-test TDD RED/GREEN result — append to the task's real-time log.
    if (repairEvent === "tdd_test_result") {
      const taskId = repairTaskId;
      const d = payload.data?.details as Record<string, unknown> | undefined;
      if (taskId && d) {
        const phase = d.phase === "green" ? "green" : "red";
        const status = String(d.status ?? "");
        const type = String(d.type ?? "test");
        const reqs = Array.isArray(d.requirementIds)
          ? (d.requirementIds as string[]).join(", ")
          : "";
        // "good" = the test did what this phase expects (RED → fails as
        // expected; GREEN → passes). Drives the ✓/✗ icon and excerpt display.
        const good =
          phase === "green" ? status === "pass" : status === "expected_fail";
        const icon = status === "skipped" ? "–" : good ? "✓" : "✗";
        const label = [type, reqs].filter(Boolean).join(" ");
        const message = `${icon} ${label} — ${status}`;
        const failureExcerpt = d.failureExcerpt as string | undefined;
        // Only attach the excerpt for genuinely-bad outcomes (collapsible).
        const details =
          !good && status !== "skipped" ? failureExcerpt : undefined;
        set({
          tddLogs: [
            ...get().tddLogs,
            {
              timestamp: new Date().toISOString(),
              type: phase === "green" ? "tdd_green" : "tdd_red",
              taskId,
              message,
              details,
            },
          ],
        });
      }
      return;
    }

    if (repairEvent === "human_decision_needed") {
      const details = payload.data?.details as Record<string, unknown> | undefined;
      const sessionId = payload.sessionId ?? get().sessionId;
      if (sessionId) {
        set({
          pendingHumanDecision: {
            sessionId,
            context: (details?.context as string) ?? "",
            options: (details?.options as HumanDecisionOption[]) ?? [],
            expiresAt: new Date(
              Date.now() + ((details?.timeoutMs as number) ?? 5 * 60 * 1000),
            ).toISOString(),
          },
        });
      }
    }
    if (repairEvent === "human_decision_received") {
      set({ pendingHumanDecision: null });
    }
    return;
  }
}
