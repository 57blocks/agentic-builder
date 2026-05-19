"use client";

import { create } from "zustand";
import type {
  AgentLogEntry,
  CodingAgentInstance,
  CodingTask,
  KickoffWorkItem,
} from "@/lib/pipeline/types";

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
  integrationVerify: IntegrationVerifyState | null;
  e2eVerify: E2EVerifyState | null;
  /** Supervisor-level logs (phase verify, fix, install, etc.) */
  supervisorLogs: AgentLogEntry[];
  /** Set when integration_verify_fix is waiting for a human to pick an action. */
  pendingHumanDecision: PendingHumanDecision | null;

  startCoding: (
    runId: string,
    tasks: KickoffWorkItem[],
    codeOutputDir: string,
    projectTier?: string,
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
  submitHumanDecision: (decisionId: string) => Promise<void>;
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

export const useCodingStore = create<CodingState>()((set, get) => ({
  sessionId: null,
  projectId: null,
  status: "idle",
  agents: [],
  tasks: [],
  selectedAgentId: null,
  totalCostUsd: 0,
  error: null,
  integrationVerify: null,
  e2eVerify: null,
  gapAnalysis: null,
  supervisorLogs: [],
  pendingHumanDecision: null,

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
        pendingHumanDecision: null,
      });
      return;
    }
    set({ projectId: id });
  },

  selectAgent: (agentId) => set({ selectedAgentId: agentId }),

  submitHumanDecision: async (decisionId: string) => {
    const { sessionId, pendingHumanDecision } = get();
    if (!sessionId || !pendingHumanDecision) return;
    set({ pendingHumanDecision: null });
    try {
      await fetch("/api/agents/coding/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, decisionId }),
      });
    } catch (err) {
      console.error("[coding-store] submitHumanDecision failed:", err);
    }
  },

  startCoding: (runId, taskItems, codeOutputDir, projectTier, prdContent, stitchMeta) => {
    set({
      status: "running",
      error: null,
      agents: [],
      tasks: [],
      selectedAgentId: null,
      totalCostUsd: 0,
      sessionId: null,
      integrationVerify: null,
      e2eVerify: null,
      supervisorLogs: [],
      pendingHumanDecision: null,
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
      body: JSON.stringify({ runId, tasks: taskItems, codeOutputDir, projectTier, prd: prdContent, stitchMeta }),
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

  retryFailedTasks: (runId, tasks, failedTaskIds, codeOutputDir, projectTier, prdContent, stitchMeta) => {
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
      pendingHumanDecision: null,
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
        prd: prdContent,
        stitchMeta,
        retryFailedTaskIds: failedTaskIds,
      }),
    })
      .then(async (resp) => {
        if (!resp.ok) {
          const errData = await resp.json().catch(() => ({}));
          set({
            status: "failed",
            error: (errData as { error?: string }).error || "Retry failed",
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
      integrationVerify: null,
      e2eVerify: null,
      supervisorLogs: [],
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
        if (t.id !== taskId) return t;
        return {
          ...t,
          assignedAgentId: payload.agentId ?? t.assignedAgentId,
          codingStatus: "in_progress" as const,
          progressStage: "generating" as const,
          fixAttempts: 0,
          verifyErrors: undefined,
          errorPreview: undefined,
        };
      });
    } else {
      tasks = [
        ...existingTasks,
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
    });
    return;
  }

  if (type === "session_complete") {
    set({ status: "completed" });
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

    // Any repair_event that carries a taskId means the backend has activated
    // that task. Promote it from pending → in_progress immediately so the node
    // reflects "active" before agent_task_start arrives (which only fires after
    // the LangGraph pick_next_task node finishes, always later than repair events).
    const repairTaskId = payload.taskId ?? (payload.data?.taskId as string | undefined);
    if (repairTaskId) {
      const current = get().tasks.find((t) => t.id === repairTaskId);
      if (current?.codingStatus === "pending") {
        set({
          tasks: get().tasks.map((t) =>
            t.id === repairTaskId
              ? { ...t, codingStatus: "in_progress" as const, progressStage: "generating" as const }
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
