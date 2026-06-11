"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { FileText, FilePlus, ChevronDown, ChevronRight, Eye, Edit3 } from "lucide-react";
import type { TaskFileActivity } from "@/lib/pipeline/types";

interface FileActivityPanelProps {
  activities: TaskFileActivity[];
  isActive: boolean;
}

interface GroupedActivities {
  writes: TaskFileActivity[];
  reads: TaskFileActivity[];
}

function groupActivities(activities: TaskFileActivity[]): GroupedActivities {
  const writes: TaskFileActivity[] = [];
  const reads: TaskFileActivity[] = [];

  // Deduplicate reads by path — keep only the last occurrence
  const seenReads = new Map<string, TaskFileActivity>();
  // Deduplicate writes by path — keep all but show last content
  const latestWriteByPath = new Map<string, TaskFileActivity>();

  for (const a of activities) {
    if (a.operation === "write") {
      latestWriteByPath.set(a.path, a);
    } else {
      seenReads.set(a.path, a);
    }
  }

  for (const a of latestWriteByPath.values()) writes.push(a);
  for (const a of seenReads.values()) {
    // Skip reads that were also written (they're new files, not just reads)
    if (!latestWriteByPath.has(a.path)) reads.push(a);
  }

  return { writes, reads };
}

function formatContentPreview(preview: string): string[] {
  return preview
    .split("\n")
    .slice(0, 18)
    .map((line) => line.slice(0, 120));
}

interface WriteEntryProps {
  activity: TaskFileActivity;
}

function WriteEntry({ activity }: WriteEntryProps) {
  const [expanded, setExpanded] = useState(false);
  const lines = activity.contentPreview
    ? formatContentPreview(activity.contentPreview)
    : [];
  const fileName = activity.path.split("/").pop() ?? activity.path;
  const dirPath = activity.path.includes("/")
    ? activity.path.slice(0, activity.path.lastIndexOf("/"))
    : "";

  return (
    <div className="rounded-md overflow-hidden border border-[#30363d] bg-[#0d1117]">
      {/* File header row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#161b22] transition-colors text-left"
      >
        <span className="shrink-0 text-emerald-400">
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </span>
        <FilePlus size={12} className="shrink-0 text-emerald-400" />
        <span className="flex-1 min-w-0 flex items-baseline gap-1 overflow-hidden">
          <span className="shrink-0 text-[11px] font-semibold text-emerald-300 font-mono">
            {fileName}
          </span>
          {dirPath && (
            <span
              className="min-w-0 truncate text-[10px] text-slate-500 font-mono"
              title={`${dirPath}/`}
              dir="rtl"
            >
              {dirPath}/
            </span>
          )}
        </span>
        {activity.contentLength !== undefined && (
          <span className="shrink-0 text-[9px] text-slate-500 font-mono">
            {activity.contentLength.toLocaleString()} chars
          </span>
        )}
      </button>

      {/* Content preview */}
      <AnimatePresence initial={false}>
        {expanded && lines.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-[#21262d] overflow-x-auto">
              {lines.map((line, i) => (
                <div key={i} className="flex items-start group">
                  <span className="shrink-0 w-7 text-right pr-2 text-[9px] font-mono text-slate-600 select-none pt-px">
                    {i + 1}
                  </span>
                  <span className="text-emerald-400 text-[9px] shrink-0 pt-px font-mono">+</span>
                  <span className="text-[10px] font-mono text-[#e6edf3] whitespace-pre pl-1 py-px leading-5">
                    {line || " "}
                  </span>
                </div>
              ))}
              {activity.contentPreview &&
                activity.contentPreview.split("\n").length > 18 && (
                  <div className="px-3 py-1 text-[9px] text-slate-500 italic border-t border-[#21262d]">
                    … {activity.contentPreview.split("\n").length - 18} more lines
                  </div>
                )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface ReadEntryProps {
  path: string;
}

function ReadEntry({ path }: ReadEntryProps) {
  const fileName = path.split("/").pop() ?? path;
  const dirPath = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";

  return (
    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-[#0d1117] border border-[#21262d] min-w-0 overflow-hidden">
      <Eye size={11} className="shrink-0 text-sky-400" />
      <span className="shrink-0 text-[11px] font-mono text-sky-300">{fileName}</span>
      {dirPath && (
        <span
          className="min-w-0 flex-1 truncate text-[10px] font-mono text-slate-600"
          title={`${dirPath}/`}
          dir="rtl"
        >
          {dirPath}/
        </span>
      )}
    </div>
  );
}

export function FileActivityPanel({ activities, isActive }: FileActivityPanelProps) {
  const { writes, reads } = groupActivities(activities);
  const isEmpty = writes.length === 0 && reads.length === 0;

  return (
    <div className="flex flex-col gap-3">
      {/* Written files */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Edit3 size={10} className="text-emerald-400" />
          <span className="text-[9px] font-semibold uppercase tracking-wider text-emerald-400">
            Written ({writes.length})
          </span>
          {isActive && writes.length === 0 && (
            <motion.span
              className="text-[9px] text-slate-500 italic"
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.4, repeat: Infinity }}
            >
              waiting…
            </motion.span>
          )}
        </div>
        <div className="space-y-1.5">
          {writes.map((a, i) => (
            <motion.div
              key={`${a.path}-${i}`}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <WriteEntry activity={a} />
            </motion.div>
          ))}
          {writes.length === 0 && !isActive && (
            <p className="text-[10px] text-slate-600 italic">No files written.</p>
          )}
        </div>
      </div>

      {/* Read files */}
      {(reads.length > 0 || isActive) && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <FileText size={10} className="text-sky-400" />
            <span className="text-[9px] font-semibold uppercase tracking-wider text-sky-400">
              Read ({reads.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {reads.map((a, i) => (
              <motion.div
                key={`${a.path}-${i}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.15 }}
              >
                <ReadEntry path={a.path} />
              </motion.div>
            ))}
            {reads.length === 0 && (
              <p className="text-[10px] text-slate-600 italic">None yet.</p>
            )}
          </div>
        </div>
      )}

      {isEmpty && !isActive && (
        <p className="text-[10px] text-slate-600 italic">
          File activity will appear here during task execution.
        </p>
      )}
    </div>
  );
}
