"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type NodeMouseHandler,
  ReactFlowProvider,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { Play, Clock, RotateCcw, AlertTriangle, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { useCodingStore } from "@/store/coding-store";
import type { CodingSessionSnapshot } from "@/store/coding-store";
import { useStepStore } from "@/store/step-store";
import { useStageStore } from "@/store/stage-store";
import { parseKickoffTaskBreakdownFromMetadata } from "@/lib/pipeline/kickoff-task-breakdown";
import type { StepUIProps } from "../../_shared/types";
import type { CodingAgentRole, CodingTask, KickoffWorkItem } from "@/lib/pipeline/types";
import type { CodingMode } from "@/lib/pipeline/coding-mode";
import { inferRole } from "@/lib/langgraph/supervisor/role-mapping";

import { TaskNode, type TaskNodeData } from "./components/TaskNode";
import { TaskDetailPanel } from "./components/TaskDetailPanel";
import { AgentBubbles } from "./components/AgentBubbles";
import { StatusBar } from "./components/StatusBar";
import { useElapsedTimer } from "./use-elapsed-timer";

// ─── React Flow node type registry ───────────────────────────────────────────

/** Background dashed box that visually groups one domain's task nodes. */
function DomainBoxNode({ data }: { data: { label: string } }) {
  return (
    <div className="pointer-events-none relative h-full w-full rounded-2xl border border-dashed border-violet-300/80 bg-violet-50/20">
      <span className="absolute left-3 top-2 rounded bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700">
        {data.label}
      </span>
    </div>
  );
}

const nodeTypes = { taskNode: TaskNode, domainBox: DomainBoxNode };

// ─── DAG layout: assign each node a level = max(dep levels) + 1 ──────────────
// Produces a left-to-right flow: level 0 at x=0, level 1 at x=COL_GAP, etc.

const NODE_W = 240;
const NODE_H = 120;
const COL_GAP = 310;
const ROW_GAP = 148;

function computeTopoLevels(
  tasks: (KickoffWorkItem | CodingTask)[],
): Map<string, number> {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const memo = new Map<string, number>();

  function getLevel(id: string, visiting: Set<string>): number {
    if (memo.has(id)) return memo.get(id)!;
    if (visiting.has(id)) return 0; // cycle guard
    const next = new Set(visiting);
    next.add(id);
    const deps = (taskMap.get(id)?.dependencies ?? []).filter((d) =>
      taskMap.has(d),
    );
    const level =
      deps.length === 0
        ? 0
        : Math.max(...deps.map((d) => getLevel(d, next))) + 1;
    memo.set(id, level);
    return level;
  }

  for (const t of tasks) getLevel(t.id, new Set());
  return memo;
}

function buildFlowGraph(
  tasks: (KickoffWorkItem | CodingTask)[],
  selectedId: string | null,
): { nodes: Node[]; edges: Edge[] } {
  if (tasks.length === 0) return { nodes: [], edges: [] };

  const levels = computeTopoLevels(tasks);
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const maxLevel = Math.max(0, ...[...levels.values()]);

  // Group tasks into domain SWIMLANES. Lane membership is purely visual — the
  // topological level (x) and the dependency edges are unchanged; tasks of the
  // same subsystem just share a horizontal band so we can draw one dashed box
  // around them. Untagged / foundation tasks share the first lane.
  const SHARED = "__shared__";
  const laneIds = new Map<string, string[]>();
  let hasShared = false;
  for (const t of tasks) {
    const d = (t as KickoffWorkItem).subsystem || SHARED;
    if (d === SHARED) hasShared = true;
    if (!laneIds.has(d)) laneIds.set(d, []);
    laneIds.get(d)!.push(t.id);
  }
  const laneOrder = [
    ...(hasShared ? [SHARED] : []),
    ...[...laneIds.keys()].filter((d) => d !== SHARED).sort(),
  ];

  const LABEL_H = 30;
  const LANE_PAD = 18;
  const LANE_GAP = 28;
  const boxW = maxLevel * COL_GAP + NODE_W + LANE_PAD * 2;

  const nodes: Node[] = [];
  const posMap = new Map<string, { x: number; y: number }>();
  let laneTop = 0;

  for (const domain of laneOrder) {
    const ids = laneIds.get(domain) ?? [];
    // Stack the lane's tasks per topo level (x = global level → columns align).
    const byLevel = new Map<number, string[]>();
    for (const id of ids) {
      const lvl = levels.get(id) ?? 0;
      if (!byLevel.has(lvl)) byLevel.set(lvl, []);
      byLevel.get(lvl)!.push(id);
    }
    const laneRows = Math.max(1, ...[...byLevel.values()].map((a) => a.length));
    const laneBodyH = laneRows * ROW_GAP;
    const contentTop = laneTop + LABEL_H;

    // Dashed domain box (behind its tasks — pushed first within the lane).
    nodes.push({
      id: `lane-${domain}`,
      type: "domainBox",
      position: { x: -LANE_PAD, y: laneTop },
      data: { label: domain === SHARED ? "Shared / Foundation" : domain },
      style: { width: boxW, height: LABEL_H + laneBodyH + LANE_PAD },
      selectable: false,
      draggable: false,
    });

    for (const [lvl, levelIds] of byLevel) {
      levelIds.forEach((id, rowIdx) => {
        const x = lvl * COL_GAP;
        const y = contentTop + rowIdx * ROW_GAP;
        posMap.set(id, { x, y });
        nodes.push({
          id,
          type: "taskNode",
          position: { x, y },
          selected: id === selectedId,
          data: { task: taskMap.get(id)! } satisfies TaskNodeData,
          style: { width: NODE_W, height: NODE_H },
        });
      });
    }

    laneTop += LABEL_H + laneBodyH + LANE_PAD + LANE_GAP;
  }

  // Collect active task ids so edges leading INTO them can be animated
  const activeIds = new Set(
    tasks
      .filter(
        (t) =>
          "codingStatus" in t &&
          (t as CodingTask).codingStatus === "in_progress",
      )
      .map((t) => t.id),
  );

  // Build edges from dependency graph — iterate unique tasks only to avoid
  // duplicate edge IDs when the tasks array contains repeated task IDs.
  const seenEdgeIds = new Set<string>();
  const edges: Edge[] = [];
  const uniqueTasks = [...new Map(tasks.map((t) => [t.id, t])).values()];
  for (const task of uniqueTasks) {
    const uniqueDeps = [...new Set(task.dependencies ?? [])];
    for (const depId of uniqueDeps) {
      if (!posMap.has(depId) || !posMap.has(task.id)) continue;
      const edgeId = `e-${depId}-${task.id}`;
      if (seenEdgeIds.has(edgeId)) continue;
      seenEdgeIds.add(edgeId);

      // Animate the edge when the TARGET node is actively running
      // (i.e. data is flowing from the completed dep into the active task)
      const flowing = activeIds.has(task.id);

      // Get the phase accent color of the target task for the flowing edge
      const targetTask = taskMap.get(task.id);
      const edgeColor = flowing && targetTask
        ? "#8b5cf6"
        : "#94a3b8";

      edges.push({
        id: edgeId,
        source: depId,
        target: task.id,
        // "default" = cubic bezier in React Flow
        type: "default",
        animated: flowing,
        style: {
          stroke: edgeColor,
          strokeWidth: flowing ? 2 : 1.5,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: edgeColor,
          width: 12,
          height: 12,
        },
      });
    }
  }

  return { nodes, edges };
}

function calcProgress(tasks: CodingTask[]): number {
  if (tasks.length === 0) return 0;
  let score = 0;
  for (const t of tasks) {
    if (t.codingStatus === "completed" || t.codingStatus === "completed_with_warnings") {
      score += 1;
    } else if (t.codingStatus === "in_progress") {
      score += 0.5;
    }
  }
  return Math.round((score / tasks.length) * 100);
}

function useMergedTasks(
  kickoffTasks: KickoffWorkItem[],
  codingTasks: CodingTask[],
): (KickoffWorkItem | CodingTask)[] {
  return useMemo(() => {
    if (codingTasks.length === 0) return kickoffTasks;
    const codingMap = new Map(codingTasks.map((t) => [t.id, t]));
    const kickoffIds = new Set(kickoffTasks.map((t) => t.id));
    // Merge kickoff tasks with live coding status. Live status wins, but keep
    // the kickoff task's `subsystem` tag — the live CodingTask from the coding
    // SSE doesn't carry it, and the topology view groups domains by it.
    const merged = kickoffTasks.map((t) => {
      const live = codingMap.get(t.id);
      if (!live) return t;
      const subsystem =
        (live as KickoffWorkItem).subsystem ?? (t as KickoffWorkItem).subsystem;
      return subsystem ? { ...live, subsystem } : live;
    });
    // Append extra tasks injected server-side (e.g. E2E scaffold tasks)
    // that are not part of the original kickoff breakdown
    const extra = codingTasks.filter((t) => !kickoffIds.has(t.id));
    return [...merged, ...extra];
  }, [kickoffTasks, codingTasks]);
}

// ─── Inner component (needs to be inside ReactFlowProvider) ──────────────────

function AgentsFlowInner({ onNavigate }: StepUIProps) {
  const steps = useStepStore((s) => s.steps);
  const codeOutputDir = useStepStore((s) => s.codeOutputDir);
  const setStepResult = useStepStore((s) => s.setStepResult);

  const codingState = useCodingStore();
  const { startCoding, retryFailedTasks, rerunCoding, hydrateFromSnapshot } =
    useCodingStore();
  const projectId = useStageStore((s) => s.projectId);

  // Track whether this mount is a "return visit" (component unmounted and remounted)
  // so we can show a "session still in progress" banner instead of a blank start state.
  const [isReturnVisit, setIsReturnVisit] = useState(false);
  // Drive the mode off the store (not local useState) so the selection survives
  // view re-mounts and is what handleStart actually sends. Local state silently
  // reset to "normal" on re-mount → cost-saving runs ran as normal.
  const codingMode = codingState.codingMode;
  const setCodingMode = codingState.setCodingMode;
  useEffect(() => {
    // On first mount: if there's already an active/completed session in the store,
    // this is a return visit (user navigated away and came back).
    if (codingState.status !== "idle") {
      setIsReturnVisit(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [isRerunning, setIsRerunning] = useState(false);

  // Clear rerunning state once the new session actually starts
  useEffect(() => {
    if (codingState.status === "running") setIsRerunning(false);
  }, [codingState.status]);

  const isIdle = codingState.status === "idle" && !isRerunning;
  const isRunning = codingState.status === "running";
  const isDone = codingState.status === "completed";
  const isFailed = codingState.status === "failed";
  const hasStarted = !isIdle;

  // ── Data from step-store (pre-hydrated by parent page) ─────────────────────
  const prdContent = steps.prd?.content ?? "";

  const designMeta = steps.design?.metadata as Record<string, unknown> | undefined;
  const stitchMeta = designMeta?.stitchResult as
    | { projectId: string; screenId: string; projectUrl: string; screenshotUrl?: string | null; htmlDownloadUrl?: string | null }
    | null
    | undefined;

  const taskMeta = useMemo(
    () =>
      (steps["task-breakdown"]?.metadata ??
        steps.summary?.metadata) as Record<string, unknown> | undefined,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [steps["task-breakdown"]?.metadata, steps.summary?.metadata],
  );

  const kickoffTasks = useMemo(
    () => parseKickoffTaskBreakdownFromMetadata(taskMeta),
    [taskMeta],
  );

  const placeholderRoles = useMemo<CodingAgentRole[]>(() => {
    const seen = new Set<CodingAgentRole>();
    for (const task of kickoffTasks) seen.add(inferRole(task));
    return Array.from(seen);
  }, [kickoffTasks]);

  const runId =
    typeof taskMeta?.runId === "string"
      ? taskMeta.runId
      : `coding-${Date.now()}`;

  const intentMeta = steps.intent?.metadata as
    | { classification?: { tier?: string } }
    | undefined;
  const projectTier = intentMeta?.classification?.tier;

  // ── Hydrate coding state from DB when the page opens in idle state ─────────
  useEffect(() => {
    if (!projectId || codingState.status !== "idle" || kickoffTasks.length === 0) return;

    const load = async () => {
      try {
        const res = await fetch(
          `/api/projects/${projectId}/project-step-snapshot?stepId=coding-session`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const data = (await res.json()) as { snapshot: CodingSessionSnapshot | null };
        if (!data.snapshot?.sessionId) return;

        const snap = data.snapshot;
        // hydrateFromSnapshot correctly includes E2E / server-injected extra
        // tasks that live in the DB snapshot but are absent from kickoffTasks.
        hydrateFromSnapshot(snap, kickoffTasks);
      } catch {
        // silently ignore — user can still start fresh
      }
    };
    load();
  // Run once when kickoffTasks become available and we're still idle
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, kickoffTasks.length]);

  // ── Failed task IDs (for "Retry Failed" bar button) ────────────────────────
  const failedTaskIds = useMemo(
    () =>
      codingState.tasks
        .filter((t) => t.codingStatus === "failed")
        .map((t) => t.id),
    [codingState.tasks],
  );

  // ── Retry a single task ────────────────────────────────────────────────────
  const handleRetryTask = useCallback(
    (taskId: string) => {
      retryFailedTasks(
        runId,
        kickoffTasks,
        [taskId],
        codeOutputDir,
        projectTier,
        codingMode,
        prdContent,
      );
    },
    [
      retryFailedTasks,
      runId,
      kickoffTasks,
      codeOutputDir,
      projectTier,
      codingMode,
      prdContent,
    ],
  );

  // ── Retry all failed tasks ─────────────────────────────────────────────────
  const handleRetryAllFailed = useCallback(() => {
    if (failedTaskIds.length === 0) return;
    retryFailedTasks(
      runId,
      kickoffTasks,
      failedTaskIds,
      codeOutputDir,
      projectTier,
      codingMode,
      prdContent,
    );
  }, [
    retryFailedTasks,
    runId,
    kickoffTasks,
    failedTaskIds,
    codeOutputDir,
    projectTier,
    codingMode,
    prdContent,
  ]);

  // ── Rerun the entire coding session from scratch ──────────────────────────
  // Used when the user wants to discard the current results (regardless of
  // success/failure / in-progress) and re-trigger the full coding pipeline
  // against the latest task breakdown. Always behind a confirm prompt because
  // it aborts any active SSE and overwrites generated files.
  const handleRerun = useCallback(() => {
    if (kickoffTasks.length === 0) return;
    const completedCount = codingState.tasks.filter(
      (t) => t.codingStatus === "completed",
    ).length;
    const summary =
      codingState.tasks.length > 0
        ? `${completedCount}/${codingState.tasks.length} tasks completed in the current session.\n\n`
        : "";
    const ok = window.confirm(
      `Rerun the entire coding pipeline from task #1?\n\n` +
        summary +
        `This will:\n` +
        `  • Abort the current run (if any)\n` +
        `  • Reset every task back to pending and start a fresh session\n` +
        `  • Overwrite previously generated files as the new run produces them\n\n` +
        `Already-saved kickoff artifacts (PRD / TRD / task breakdown / env / auth decision) are NOT touched.`,
    );
    if (!ok) return;
    setIsRerunning(true);
    rerunCoding(
      runId,
      kickoffTasks,
      codeOutputDir,
      projectTier,
      codingMode,
      prdContent,
      stitchMeta ?? undefined,
    );
  }, [
    codingState.tasks,
    kickoffTasks,
    rerunCoding,
    runId,
    codeOutputDir,
    projectTier,
    codingMode,
    prdContent,
    stitchMeta,
  ]);

  // ── Merge kickoff + live coding tasks ──────────────────────────────────────
  const mergedTasks = useMergedTasks(kickoffTasks, codingState.tasks);

  // ── Selected task ──────────────────────────────────────────────────────────
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const selectedTask = useMemo(
    () => mergedTasks.find((t) => t.id === selectedTaskId) ?? null,
    [mergedTasks, selectedTaskId],
  );

  // ── React Flow state ───────────────────────────────────────────────────────
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    const { nodes: n, edges: e } = buildFlowGraph(mergedTasks, selectedTaskId);
    setNodes(n);
    setEdges(e);
  }, [mergedTasks, selectedTaskId, setNodes, setEdges]);

  // ── Timer (seed from earliest startedAt on return visits) ──────────────────
  const initialElapsed = useMemo(() => {
    if (!isReturnVisit) return 0;
    const startedAt = codingState.tasks
      .map((t) => t.startedAt)
      .filter(Boolean)
      .sort()
      .at(0);
    return startedAt
      ? Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
      : 0;
  }, []); // Run once on mount — depends on isReturnVisit which is stable
  const { formatted: elapsed } = useElapsedTimer(isRunning, initialElapsed);

  // ── Progress ───────────────────────────────────────────────────────────────
  const progress = calcProgress(codingState.tasks);
  const completedCount = mergedTasks.filter(
    (t) =>
      "codingStatus" in t &&
      (t.codingStatus === "completed" ||
        t.codingStatus === "completed_with_warnings"),
  ).length;
  const totalCount = mergedTasks.length;

  // ── Persist result when done ───────────────────────────────────────────────
  useEffect(() => {
    if (!isDone && !isFailed) return;
    setStepResult("agents", {
      stepId: "agents",
      status: isDone ? "completed" : "failed",
      content: JSON.stringify({
        agentsCompleted: codingState.agents.filter(
          (a) => a.status === "completed",
        ).length,
        totalCostUsd: codingState.totalCostUsd,
        tasksCompleted: codingState.tasks.filter(
          (t) => t.codingStatus === "completed",
        ).length,
        totalTasks: codingState.tasks.length,
      }),
      costUsd: codingState.totalCostUsd,
      error: codingState.error ?? undefined,
      metadata: {
        agentCount: codingState.agents.length,
        taskCount: codingState.tasks.length,
      },
      timestamp: new Date().toISOString(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDone, isFailed]);

  // ── Agent logs (flat, all agents) + TDD per-test logs, ordered by time ──────
  const allAgentLogs = useMemo(
    () =>
      [...codingState.agents.flatMap((a) => a.logs), ...codingState.tddLogs].sort(
        (a, b) => a.timestamp.localeCompare(b.timestamp),
      ),
    [codingState.agents, codingState.tddLogs],
  );

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleNodeClick: NodeMouseHandler = useCallback((_evt, node) => {
    setSelectedTaskId((prev) => (prev === node.id ? null : node.id));
  }, []);

  // Programmatic focus — used by the DEPENDENCIES tab in the detail panel so
  // clicking a dep chip both selects the corresponding node and pans the
  // canvas to centre it. NODE_W/NODE_H offsets are added so the camera lands
  // on the card's centre, not its top-left corner.
  const reactFlow = useReactFlow();
  const focusTask = useCallback(
    (taskId: string) => {
      const node = reactFlow.getNode(taskId);
      if (!node) return;
      setSelectedTaskId(taskId);
      const cx = node.position.x + NODE_W / 2;
      const cy = node.position.y + NODE_H / 2;
      reactFlow.setCenter(cx, cy, { zoom: 1, duration: 350 });
    },
    [reactFlow],
  );

  const handleStart = useCallback(() => {
    if (!isIdle || kickoffTasks.length === 0) return;
    startCoding(
      runId,
      kickoffTasks,
      codeOutputDir,
      projectTier,
      codingMode,
      prdContent,
      stitchMeta ?? undefined,
    );
  }, [
    isIdle,
    kickoffTasks,
    runId,
    codeOutputDir,
    projectTier,
    codingMode,
    prdContent,
    stitchMeta,
    startCoding,
  ]);

  // ── Empty state ────────────────────────────────────────────────────────────
  if (isIdle && kickoffTasks.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center bg-white">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-4 text-center max-w-sm"
        >
          <div className="w-12 h-12 rounded-full border-2 border-slate-200 flex items-center justify-center">
            <Clock size={18} className="text-slate-300" />
          </div>
          <p className="text-[14px] text-slate-400 leading-relaxed">
            Complete the Kick-off stage first to generate the task breakdown
            before starting coding.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#f8fafc]">
      {/* ─── Top bar ────────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-6 px-6 py-3 bg-white border-b border-slate-200">
        {/* Overall progress */}
        <div className="flex items-center gap-3 min-w-45">
          <div className="flex-1">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              OVERALL PROGRESS
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-violet-500 rounded-full"
                  animate={{ width: `${hasStarted ? progress : 0}%` }}
                  transition={{ duration: 0.6 }}
                />
              </div>
              <span className="text-[12px] font-bold text-slate-700 w-8 text-right">
                {hasStarted ? `${progress}%` : "—"}
              </span>
            </div>
            <p className="text-[10px] font-medium text-slate-500 mt-1">
              {completedCount} / {totalCount} tasks completed
            </p>
          </div>
        </div>

        {/* Time elapsed */}
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
            TIME ELAPSED
          </p>
          <span className="text-[14px] font-mono font-bold text-slate-700">
            {isRunning || isDone || isFailed ? elapsed : "00:00:00"}
          </span>
        </div>

        {/* Active agents */}
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
            ACTIVE AGENTS
          </p>
          <AgentBubbles agents={codingState.agents} placeholderRoles={placeholderRoles} />
        </div>

        {/* Cost */}
        {codingState.totalCostUsd > 0 && (
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              COST
            </p>
            <span className="text-[12px] font-mono font-bold text-slate-600">
              ${codingState.totalCostUsd.toFixed(4)}
            </span>
          </div>
        )}

        <div className="flex-1" />

        {/* CTA buttons */}
        {isIdle && kickoffTasks.length > 0 && (
          <div className="flex items-center gap-2">
            <select
              value={codingMode}
              onChange={(e) => setCodingMode(e.target.value as CodingMode)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-700 outline-none focus:border-violet-300"
              title="Coding mode"
            >
              <option value="fast">Fast mode</option>
              <option value="normal">Normal mode</option>
              <option value="cost">Cost-saving mode</option>
            </select>
            <button
              onClick={handleStart}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[12px] font-bold rounded-lg transition-colors shadow-sm"
            >
              <Play size={13} />
              Start Coding
            </button>
          </div>
        )}

        {/* Mode label when session is active/done */}
        {hasStarted && (
          <span className="px-2 py-1 text-[11px] font-medium text-slate-500 bg-slate-100 rounded">
            {codingMode === "fast" ? "Fast" : codingMode === "cost" ? "Cost" : "Normal"} mode
          </span>
        )}

        {/* Running: live indicator */}
        {isRunning && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-violet-200 bg-violet-50">
            <motion.span
              className="w-2 h-2 rounded-full bg-violet-500"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
            <span className="text-[12px] font-semibold text-violet-700">
              {isReturnVisit ? "Session in progress — reconnected" : "Coding in progress…"}
            </span>
          </div>
        )}

        {(isDone || isFailed) && failedTaskIds.length > 0 && (
          <button
            onClick={handleRetryAllFailed}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[12px] font-bold rounded-lg transition-colors shadow-sm"
          >
            <RotateCcw size={13} />
            Retry Failed ({failedTaskIds.length})
          </button>
        )}

        {/* Rerun — always available once the user has triggered at least one
            coding run, regardless of success / failure / in-flight. Confirm
            dialog inside handleRerun prevents accidental clicks. */}
        {hasStarted && kickoffTasks.length > 0 && (
          <button
            onClick={handleRerun}
            title="Rerun the entire coding pipeline from task #1"
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-[12px] font-semibold rounded-lg transition-colors"
          >
            <RefreshCw size={13} />
            {isRunning ? "Abort & Rerun" : "Rerun"}
          </button>
        )}

        {isDone && failedTaskIds.length === 0 && (
          <button
            onClick={() => onNavigate("serve")}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[12px] font-bold rounded-lg transition-colors shadow-sm"
          >
            Continue to Preview →
          </button>
        )}
      </div>

      {/* ─── Main: flow canvas + detail panel ───────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* React Flow canvas */}
        <div className="flex-1 relative overflow-hidden">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.3, maxZoom: 1.2 }}
            minZoom={0.3}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
            className="bg-[#f8fafc]"
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="#e2e8f0"
            />
            <Controls
              showInteractive={false}
              className="border-slate-200! shadow-sm!"
            />
          </ReactFlow>
        </div>

        {/* Task detail panel — slides in from right */}
        <AnimatePresence>
          {selectedTask && (
            <motion.div
              key="detail-panel"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 380, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="shrink-0 overflow-hidden border-l border-slate-200 bg-white"
            >
              <div className="w-95 h-full">
                <TaskDetailPanel
                  task={selectedTask}
                  allAgentLogs={allAgentLogs}
                  allTasks={mergedTasks}
                  onClose={() => setSelectedTaskId(null)}
                  onRetry={!isRunning ? handleRetryTask : undefined}
                  onSelectTask={focusTask}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Bottom status bar ──────────────────────────────────────────────── */}
      <StatusBar
        isRunning={isRunning}
        isCompleted={isDone}
        isFailed={isFailed}
        isReturnVisit={isReturnVisit}
        onAbort={() => codingState.reset()}
      />
    </div>
  );
}

// ─── Exported wrapper (provides ReactFlow context) ────────────────────────────

export function AgentsUI(props: StepUIProps) {
  return (
    <ReactFlowProvider>
      <AgentsFlowInner {...props} />
    </ReactFlowProvider>
  );
}
