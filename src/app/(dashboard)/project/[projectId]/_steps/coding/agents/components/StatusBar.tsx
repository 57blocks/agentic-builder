"use client";

import { StopCircle } from "lucide-react";
import { motion } from "motion/react";

interface StatusBarProps {
  isRunning: boolean;
  isCompleted: boolean;
  isFailed: boolean;
  isReturnVisit?: boolean;
  onAbort?: () => void;
}

export function StatusBar({
  isRunning,
  isCompleted,
  isFailed,
  isReturnVisit,
  onAbort,
}: StatusBarProps) {
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
    <div className="shrink-0 flex items-center justify-between px-6 py-2.5 bg-white border-t border-slate-200">
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
          SYSTEM STATUS:{" "}
          <span className={labelColor}>{systemStatus}</span>
        </span>
        {isRunning && isReturnVisit && (
          <span className="ml-2 text-[10px] font-medium text-violet-400 italic">
            — reconnected to live session
          </span>
        )}
      </div>

      {/* Actions */}
      {isRunning && (
        <div className="flex items-center gap-2">
          {onAbort && (
            <button
              onClick={onAbort}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
            >
              <StopCircle size={12} />
              Abort Process
            </button>
          )}
        </div>
      )}
    </div>
  );
}
