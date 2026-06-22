"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronsUp,
  ChevronsDown,
  Copy,
  Trash2,
  Terminal,
  StopCircle,
} from "lucide-react";
import { motion } from "motion/react";
import type { ServerLogEntry } from "@/store/coding-store";

const LEVEL_COLOR: Record<ServerLogEntry["level"], string> = {
  log: "text-slate-300",
  info: "text-sky-300",
  debug: "text-slate-500",
  warn: "text-amber-300",
  error: "text-red-400",
};

interface ServerConsolePanelProps {
  logs: ServerLogEntry[];
  /** Clears the client-side buffer. */
  onClear: () => void;
  // ── System status (merged from the former StatusBar) ──────────────────────
  isRunning: boolean;
  isCompleted: boolean;
  isFailed: boolean;
  isReturnVisit?: boolean;
  /** Abort the running session — shown only while running. */
  onAbort?: () => void;
}

/**
 * Bottom bar combining the run's system status with the live server console.
 * The header row (light) always shows SYSTEM STATUS + the console toggle + the
 * Abort action; expanding drops a dark terminal-style log area below it.
 */
export function ServerConsolePanel({
  logs,
  onClear,
  isRunning,
  isCompleted,
  isFailed,
  isReturnVisit,
  onAbort,
}: ServerConsolePanelProps) {
  const [open, setOpen] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Depend on the `logs` array reference (a new array on every append) rather
  // than its length — once the ring buffer hits its cap, length stays constant
  // while content still changes, and a length-only dep would stall autoscroll.
  useEffect(() => {
    if (open && autoScroll) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs, open, autoScroll]);

  const copyAll = () => {
    void navigator.clipboard?.writeText(
      logs.map((l) => `[${l.timestamp}] ${l.level.toUpperCase()} ${l.message}`).join("\n"),
    );
  };

  const systemStatus = isFailed
    ? "ERROR"
    : isCompleted
      ? "COMPLETE"
      : isRunning
        ? "RUNNING"
        : "IDLE";

  const dotColor = isFailed
    ? "bg-red-500"
    : isCompleted
      ? "bg-green-500"
      : isRunning
        ? "bg-violet-500"
        : "bg-slate-300";

  const labelColor = isFailed
    ? "text-red-600"
    : isCompleted
      ? "text-green-600"
      : isRunning
        ? "text-violet-600"
        : "text-slate-500";

  return (
    <div className="shrink-0 border-t border-slate-200 bg-white">
      {/* Header: system status (left) + console toggle / controls / abort (right) */}
      <div className="flex items-center justify-between px-6 py-2.5">
        {/* System status */}
        <div className="flex items-center gap-2">
          {isRunning ? (
            <motion.span
              className={`w-2 h-2 rounded-full ${dotColor}`}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
          ) : (
            <span className={`w-2 h-2 rounded-full ${dotColor}`} />
          )}
          <span className="text-[11px] font-semibold text-slate-600 tracking-wide">
            SYSTEM STATUS: <span className={labelColor}>{systemStatus}</span>
          </span>
          {isRunning && isReturnVisit && (
            <span className="ml-2 text-[10px] font-medium text-violet-400 italic">
              — reconnected to live session
            </span>
          )}
        </div>

        {/* console label + (when open) controls + (when running) abort + fold toggle (far right) */}
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <Terminal size={13} />
            Server Console
            <span className="text-slate-400">({logs.length})</span>
          </span>
          {open && (
            <>
              <label className="flex items-center gap-1 text-[10px] text-slate-400">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                />
                auto-scroll
              </label>
              <button onClick={copyAll} title="Copy all" className="text-slate-400 hover:text-slate-600">
                <Copy size={13} />
              </button>
              <button onClick={onClear} title="Clear" className="text-slate-400 hover:text-slate-600">
                <Trash2 size={13} />
              </button>
            </>
          )}
          {isRunning && onAbort && (
            <button
              onClick={onAbort}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
            >
              <StopCircle size={12} />
              Abort Process
            </button>
          )}
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center justify-center w-7 h-7 rounded-md border border-slate-300 bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors"
            title={open ? "Collapse server console" : "Expand server console"}
            aria-label={open ? "Collapse server console" : "Expand server console"}
          >
            {open ? <ChevronsDown size={15} /> : <ChevronsUp size={15} />}
          </button>
        </div>
      </div>

      {/* Log area (dark terminal) */}
      {open && (
        <div className="min-h-[500px] max-h-[640px] overflow-auto px-3 pb-2 pt-2 font-mono text-[11px] leading-relaxed bg-slate-900 border-t border-slate-200">
          <p className="mb-1 text-[10px] italic text-slate-500">
            Raw server logs (dev debugging; may contain sensitive data)
          </p>
          {logs.length === 0 ? (
            <p className="text-slate-500">No server logs yet…</p>
          ) : (
            logs.map((l, i) => (
              <div key={i} className={`whitespace-pre-wrap break-all ${LEVEL_COLOR[l.level]}`}>
                <span className="text-slate-600">{l.timestamp.slice(11, 19)} </span>
                {l.message}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
