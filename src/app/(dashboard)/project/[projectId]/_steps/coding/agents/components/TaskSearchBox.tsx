"use client";

import { useMemo, useRef, useState, useCallback } from "react";
import { Search, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { CodingTask, KickoffWorkItem } from "@/lib/pipeline/types";

type AnyTask = CodingTask | KickoffWorkItem;

/** Mirror of TaskNode's id → "001" formatting so the search label matches the
 *  number printed on each node card. */
function getTaskNum(id: string): string {
  const n = parseInt(id.replace(/\D/g, ""), 10);
  return Number.isNaN(n) ? "000" : String(n).padStart(3, "0");
}

const MAX_RESULTS = 50;

interface TaskSearchBoxProps {
  tasks: AnyTask[];
  /** Selects + pans the canvas to the matching node (see ui.tsx `focusTask`). */
  onLocate: (taskId: string) => void;
}

/**
 * Floating search overlay pinned to the top-left of the React Flow canvas.
 * Fuzzy-matches by task number ("1" → TASK-001 / TASK-010 / TASK-011 …) or by
 * task title; clicking a result locates the corresponding node.
 */
export function TaskSearchBox({ tasks, onLocate }: TaskSearchBoxProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const matched = tasks
      .map((t) => ({ task: t, num: getTaskNum(t.id), label: `task-${getTaskNum(t.id)}` }))
      .filter(({ task, num, label }) => {
        return (
          label.includes(q) || // matches "task-001", "task-0", "00"…
          num.includes(q) || // bare number, e.g. "1" → "001"
          task.title.toLowerCase().includes(q) ||
          task.id.toLowerCase().includes(q)
        );
      });
    // Stable ascending order by task number so the list is predictable.
    matched.sort((a, b) => Number(a.num) - Number(b.num));
    return matched.slice(0, MAX_RESULTS);
  }, [query, tasks]);

  const select = useCallback(
    (taskId: string) => {
      onLocate(taskId);
      setOpen(false);
      inputRef.current?.blur();
    },
    [onLocate],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        setQuery("");
        setOpen(false);
        inputRef.current?.blur();
        return;
      }
      if (!results.length) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => (i + 1) % results.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => (i - 1 + results.length) % results.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const hit = results[Math.min(activeIdx, results.length - 1)];
        if (hit) select(hit.task.id);
      }
    },
    [results, activeIdx, select],
  );

  const showDropdown = open && query.trim().length > 0;

  return (
    <div className="absolute top-3 left-3 z-20 w-72">
      {/* ── Input ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white/95 px-2.5 py-2 shadow-md backdrop-blur-sm focus-within:border-violet-300">
        <Search size={14} className="shrink-0 text-slate-400" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIdx(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search task by # or name…"
          className="min-w-0 flex-1 bg-transparent text-[12px] text-slate-700 placeholder:text-slate-400 outline-none"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setOpen(false);
              inputRef.current?.focus();
            }}
            className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            title="Clear"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* ── Results dropdown ───────────────────────────────────────────── */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="mt-1.5 max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg"
          >
            {results.length === 0 ? (
              <p className="px-3 py-2.5 text-[11px] text-slate-400">No matching task.</p>
            ) : (
              results.map(({ task, num }, i) => (
                <button
                  key={task.id}
                  // onMouseDown (not onClick) so it fires before the input's blur.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    select(task.id);
                  }}
                  onMouseEnter={() => setActiveIdx(i)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left transition-colors ${
                    i === activeIdx ? "bg-violet-50" : "hover:bg-slate-50"
                  }`}
                >
                  <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-500">
                    TASK-{num}
                  </span>
                  <span className="truncate text-[12px] text-slate-700">{task.title}</span>
                </button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
