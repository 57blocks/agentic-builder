"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { motion } from "motion/react";
import {
  Clock,
  RefreshCw,
  Database,
  Server,
  Monitor,
  Layers,
  ShieldCheck,
  Link2,
  FlaskConical,
  Rocket,
  Wrench,
  Code2,
  type LucideIcon,
} from "lucide-react";
import type { CodingTask, KickoffWorkItem } from "@/lib/pipeline/types";

export type TaskNodeData = {
  task: CodingTask | KickoffWorkItem;
};

// ─── Phase theme registry ─────────────────────────────────────────────────────
// Each entry maps a regex pattern to a visual theme (colors + icon).
// First match wins — ordered from most specific to most generic.

interface PhaseTheme {
  icon: LucideIcon;
  /** Hex for left-border accent, indicator dot, and edge color */
  accent: string;
  /** Tailwind classes: badge bg + text */
  badge: string;
  /** Tailwind classes: icon color */
  iconCls: string;
  /** Tailwind classes: card bg when active */
  activeBg: string;
}

const PHASE_THEMES: Array<{ pattern: RegExp; theme: PhaseTheme }> = [
  // Data / Database
  {
    pattern: /data.?layer|database|db|schema|migrat|model|postgres|mysql|redis|prisma|drizzle|orm|sql/i,
    theme: {
      icon: Database,
      accent: "#06b6d4",
      badge: "bg-cyan-50 text-cyan-700",
      iconCls: "text-cyan-500",
      activeBg: "bg-cyan-50/40",
    },
  },
  // Auth / Security
  {
    pattern: /auth|login|session|jwt|oauth|permission|role|security|privy|clerk/i,
    theme: {
      icon: ShieldCheck,
      accent: "#f97316",
      badge: "bg-orange-50 text-orange-700",
      iconCls: "text-orange-500",
      activeBg: "bg-orange-50/40",
    },
  },
  // Architecture / Scaffold / Setup
  {
    pattern: /architect|scaffold|setup|init|infra|boilerplate|project.?struct|folder|config|env/i,
    theme: {
      icon: Layers,
      accent: "#f59e0b",
      badge: "bg-amber-50 text-amber-700",
      iconCls: "text-amber-500",
      activeBg: "bg-amber-50/40",
    },
  },
  // Backend / API / Server
  {
    pattern: /backend|api|server|service|endpoint|route|controller|handler|rest|graphql|grpc|worker/i,
    theme: {
      icon: Server,
      accent: "#3b82f6",
      badge: "bg-blue-50 text-blue-700",
      iconCls: "text-blue-500",
      activeBg: "bg-blue-50/40",
    },
  },
  // Frontend / UI
  {
    pattern: /frontend|ui|web|client|page|component|view|screen|layout|design|style|css|tailwind/i,
    theme: {
      icon: Monitor,
      accent: "#8b5cf6",
      badge: "bg-violet-50 text-violet-700",
      iconCls: "text-violet-500",
      activeBg: "bg-violet-50/40",
    },
  },
  // Integration
  {
    pattern: /integrat|connect|webhook|third.?party|external|sdk|stripe|payment|email|sms|push/i,
    theme: {
      icon: Link2,
      accent: "#6366f1",
      badge: "bg-indigo-50 text-indigo-700",
      iconCls: "text-indigo-500",
      activeBg: "bg-indigo-50/40",
    },
  },
  // Testing / QA
  {
    pattern: /test|qa|e2e|spec|jest|vitest|cypress|playwright|unit|integrat.?test/i,
    theme: {
      icon: FlaskConical,
      accent: "#22c55e",
      badge: "bg-green-50 text-green-700",
      iconCls: "text-green-500",
      activeBg: "bg-green-50/40",
    },
  },
  // DevOps / Deploy
  {
    pattern: /deploy|devops|ci|cd|docker|kubernetes|production|staging|build|pipeline|infra|cloud/i,
    theme: {
      icon: Rocket,
      accent: "#f43f5e",
      badge: "bg-rose-50 text-rose-700",
      iconCls: "text-rose-500",
      activeBg: "bg-rose-50/40",
    },
  },
  // Utility / Config
  {
    pattern: /util|helper|shared|common|lib|tool|script|seed|fixture|mock|stub/i,
    theme: {
      icon: Wrench,
      accent: "#64748b",
      badge: "bg-slate-100 text-slate-600",
      iconCls: "text-slate-400",
      activeBg: "bg-slate-50",
    },
  },
];

const DEFAULT_THEME: PhaseTheme = {
  icon: Code2,
  accent: "#94a3b8",
  badge: "bg-slate-100 text-slate-500",
  iconCls: "text-slate-400",
  activeBg: "bg-slate-50",
};

function getPhaseTheme(phase: string): PhaseTheme {
  for (const { pattern, theme } of PHASE_THEMES) {
    if (pattern.test(phase)) return theme;
  }
  return DEFAULT_THEME;
}

// ─── Status config ────────────────────────────────────────────────────────────

type CodingStatus = CodingTask["codingStatus"] | "pending";

function getStatus(task: CodingTask | KickoffWorkItem): CodingStatus {
  if ("codingStatus" in task) return task.codingStatus;
  return "pending";
}

interface StatusCfg {
  label: string;
  badge: string; // overrides phase badge when non-default
  showPhaseColor: boolean;
}

const STATUS_CFG: Record<CodingStatus, StatusCfg> = {
  pending:                 { label: "PENDING",   badge: "",                              showPhaseColor: true },
  queued:                  { label: "QUEUED",    badge: "bg-yellow-50 text-yellow-600",  showPhaseColor: false },
  in_progress:             { label: "ACTIVE",    badge: "bg-violet-100 text-violet-700", showPhaseColor: false },
  completed:               { label: "COMPLETED", badge: "bg-emerald-50 text-emerald-700",showPhaseColor: false },
  completed_with_warnings: { label: "DONE ⚠",   badge: "bg-amber-50 text-amber-700",    showPhaseColor: false },
  failed:                  { label: "FAILED",    badge: "bg-red-50 text-red-700",        showPhaseColor: false },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDuration(task: CodingTask | KickoffWorkItem): string | null {
  if (!("codingStatus" in task)) return null;
  const t = task as CodingTask;
  if (t.startedAt && t.completedAt) {
    const ms = new Date(t.completedAt).getTime() - new Date(t.startedAt).getTime();
    return `${(ms / 1000).toFixed(1)}s`;
  }
  return null;
}

function getTaskNum(id: string): string {
  const n = parseInt(id.replace(/\D/g, ""), 10);
  return isNaN(n) ? "000" : String(n).padStart(3, "0");
}

// ─── Node component ───────────────────────────────────────────────────────────

export const TaskNode = memo(function TaskNode({ data, selected }: NodeProps) {
  const { task } = data as TaskNodeData;
  const status = getStatus(task);
  const phase = getPhaseTheme(task.phase);
  const sCfg = STATUS_CFG[status] ?? STATUS_CFG.pending;
  const Icon = phase.icon;

  const isActive = status === "in_progress";
  const isCompleted = status === "completed" || status === "completed_with_warnings";
  const isFailed = status === "failed";
  const duration = getDuration(task);
  const taskNum = getTaskNum(task.id);

  const progressStage =
    "progressStage" in task ? (task as CodingTask).progressStage : undefined;

  const badgeCls = sCfg.badge || (sCfg.showPhaseColor ? phase.badge : "bg-slate-100 text-slate-500");

  // Card border: active uses all-around colored border for visibility
  const borderStyle = isActive
    ? { borderColor: phase.accent, borderWidth: "2px" }
    : selected
      ? { borderColor: phase.accent }
      : { borderLeftColor: phase.accent };

  const ringCls = selected && !isActive ? "ring-2 ring-offset-1" : "";

  // bg tint — active gets a stronger tint for visibility
  const bgCls = isActive
    ? phase.activeBg.replace("/40", "/70")
    : isCompleted
      ? "bg-white"
      : isFailed
        ? "bg-red-50/20"
        : "bg-white";

  return (
    <div
      className={`
        relative rounded-xl border border-slate-200 border-l-4 shadow-sm
        transition-colors duration-300 cursor-pointer overflow-visible
        ${bgCls} ${ringCls}
        ${isActive ? "shadow-lg" : ""}
        ${isFailed ? "border-red-200" : ""}
      `}
      style={{
        ...borderStyle,
        ...(selected && !isActive ? { ringColor: phase.accent } : {}),
        ...(isActive ? { borderWidth: "2px", borderStyle: "solid" } : { borderLeftWidth: "4px" }),
      }}
    >
      {/* ── Breathing glow ring (active only) ─────────────────────────── */}
      {isActive && (
        <motion.span
          className="pointer-events-none absolute inset-0 rounded-xl"
          animate={{
            boxShadow: [
              `0 0 0 2px ${phase.accent}88, 0 0 16px 6px ${phase.accent}44`,
              `0 0 0 4px ${phase.accent}cc, 0 0 32px 12px ${phase.accent}66`,
              `0 0 0 2px ${phase.accent}88, 0 0 16px 6px ${phase.accent}44`,
            ],
          }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* ── Animated gradient shimmer stripe (active only) ─────────────── */}
      {isActive && (
        <motion.span
          className="pointer-events-none absolute inset-0 rounded-xl overflow-hidden"
          style={{ zIndex: 0 }}
        >
          <motion.span
            className="absolute inset-0"
            style={{
              background: `linear-gradient(105deg, transparent 40%, ${phase.accent}22 50%, transparent 60%)`,
              backgroundSize: "200% 100%",
            }}
            animate={{ backgroundPosition: ["200% center", "-200% center"] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
          />
        </motion.span>
      )}

      {/* ── Top scan line (active only) ────────────────────────────────── */}
      {isActive && (
        <motion.span
          className="pointer-events-none absolute left-0 right-0 h-[2px] rounded-t-xl z-10"
          style={{ top: 0, backgroundColor: phase.accent }}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* ── Breathing corner dot (active only) ────────────────────────── */}
      {isActive && (
        <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 z-10">
          {/* Ping ring */}
          <motion.span
            className="absolute inline-flex h-full w-full rounded-full"
            style={{ backgroundColor: phase.accent }}
            animate={{ scale: [1, 2.2, 1], opacity: [0.7, 0, 0.7] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
          />
          {/* Solid dot */}
          <motion.span
            className="relative inline-flex rounded-full h-3.5 w-3.5 border-2 border-white"
            style={{ backgroundColor: phase.accent }}
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
        </span>
      )}

      {/* ── Completed check mark ──────────────────────────────────────────── */}
      {isCompleted && (
        <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 z-10 items-center justify-center">
          <motion.span
            className="w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
              <path d="M1 3.5L2.8 5.5L6 1.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </motion.span>
        </span>
      )}

      {/* ── Failed X mark ─────────────────────────────────────────────────── */}
      {isFailed && (
        <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 z-10 items-center justify-center">
          <span className="w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-white flex items-center justify-center">
            <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
              <path d="M1.5 1.5L5.5 5.5M5.5 1.5L1.5 5.5" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </span>
        </span>
      )}

      <Handle
        type="target"
        position={Position.Left}
        className="w-2! h-2! bg-slate-300! border-slate-400!"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-2! h-2! bg-slate-300! border-slate-400!"
      />

      <div className="relative z-10 px-3 pt-2.5 pb-2.5">
        {/* ── Top row: badge + task id ──────────────────────────────────── */}
        <div className="flex items-center justify-between mb-2">
          <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${badgeCls}`}>
            {sCfg.label}
          </span>
          <span className="text-[9px] font-mono text-slate-400">
            #{`TASK-${taskNum}`}
          </span>
        </div>

        {/* ── Title ─────────────────────────────────────────────────────── */}
        <p className={`text-[12px] font-semibold leading-snug line-clamp-2 mb-2.5 ${isActive ? "text-slate-900" : "text-slate-800"}`}>
          {task.title}
        </p>

        {/* ── Bottom row: phase icon + duration / stage ─────────────────── */}
        <div className="flex items-center justify-between">
          {/* Phase icon + label */}
          <div className="flex items-center gap-1">
            <Icon size={11} className={phase.iconCls} />
            <span className={`text-[9px] font-semibold uppercase tracking-wide ${phase.iconCls}`}>
              {task.phase.length > 14 ? task.phase.slice(0, 14) + "…" : task.phase}
            </span>
          </div>

          {/* Right side: timing */}
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            {isActive ? (
              <motion.span
                className="font-semibold"
                style={{ color: phase.accent }}
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
              >
                {progressStage === "verifying"
                  ? "Verifying…"
                  : progressStage === "fixing"
                    ? "Fixing…"
                    : "Running…"}
              </motion.span>
            ) : isFailed ? (
              <>
                <RefreshCw size={9} className="text-red-400" />
                <span className="text-red-500 font-medium">Failed</span>
              </>
            ) : duration ? (
              <>
                <Clock size={9} />
                <span>{duration}</span>
              </>
            ) : (
              <>
                <Clock size={9} />
                <span>{task.estimatedHours}h est.</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
