"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Search, Play, X, CheckSquare, Square } from "lucide-react";

import type { CodingTask, KickoffWorkItem } from "@/lib/pipeline/types";
import type { CodingTaskStatus } from "@/lib/pipeline/types";

type MergedTask = KickoffWorkItem | CodingTask;

function statusOf(t: MergedTask): CodingTaskStatus {
  return (t as CodingTask).codingStatus ?? "pending";
}

/** Visual treatment per status. "pending" also covers never-run kickoff tasks. */
const STATUS_META: Record<
  CodingTaskStatus,
  { dot: string; label: string }
> = {
  pending: { dot: "bg-slate-300", label: "Pending" },
  queued: { dot: "bg-slate-300", label: "Queued" },
  in_progress: { dot: "bg-violet-500", label: "Running" },
  completed: { dot: "bg-emerald-500", label: "Completed" },
  completed_with_warnings: { dot: "bg-amber-500", label: "Warnings" },
  failed: { dot: "bg-rose-500", label: "Failed" },
};

type StatusFilter = "all" | "incomplete" | "failed" | "completed";

/** A task is "incomplete" if it has not finished cleanly — i.e. anything that
 *  the user would plausibly want to (re-)run: never-run, queued, running or
 *  failed. Completed / completed-with-warnings are excluded. */
function isIncomplete(s: CodingTaskStatus): boolean {
  return s !== "completed" && s !== "completed_with_warnings";
}

export function TaskRerunPicker({
  tasks,
  onRun,
  onClose,
}: {
  tasks: MergedTask[];
  onRun: (taskIds: string[]) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("incomplete");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks.filter((t) => {
      const s = statusOf(t);
      if (filter === "incomplete" && !isIncomplete(s)) return false;
      if (filter === "failed" && s !== "failed") return false;
      if (
        filter === "completed" &&
        s !== "completed" &&
        s !== "completed_with_warnings"
      )
        return false;
      if (!q) return true;
      return (
        t.id.toLowerCase().includes(q) ||
        (t.title ?? "").toLowerCase().includes(q) ||
        ((t as KickoffWorkItem).subsystem ?? "").toLowerCase().includes(q)
      );
    });
  }, [tasks, query, filter]);

  const visibleIds = useMemo(() => visible.map((t) => t.id), [visible]);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAllVisible = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });

  const counts = useMemo(() => {
    let failed = 0;
    let incomplete = 0;
    for (const t of tasks) {
      const s = statusOf(t);
      if (s === "failed") failed += 1;
      if (isIncomplete(s)) incomplete += 1;
    }
    return { failed, incomplete, total: tasks.length };
  }, [tasks]);

  const FILTER_TABS: { key: StatusFilter; label: string }[] = [
    { key: "incomplete", label: `未完成 (${counts.incomplete})` },
    { key: "failed", label: `失败 (${counts.failed})` },
    { key: "completed", label: "已完成" },
    { key: "all", label: `全部 (${counts.total})` },
  ];

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        className="flex h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <div>
            <h3 className="text-[14px] font-bold text-slate-800">
              选择任务重跑
            </h3>
            <p className="text-[11px] text-slate-500">
              勾选要重新执行的任务，已完成的依赖会被自动跳过。
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-2.5 border-b border-slate-100 px-5 py-3">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="按 ID / 标题 / 域 搜索…"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-[12px] text-slate-700 outline-none focus:border-violet-300"
            />
          </div>
          <div className="flex items-center gap-1.5">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
                  filter === tab.key
                    ? "bg-violet-100 text-violet-700"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
            <div className="flex-1" />
            <button
              onClick={toggleAllVisible}
              disabled={visibleIds.length === 0}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
            >
              {allVisibleSelected ? (
                <CheckSquare size={13} />
              ) : (
                <Square size={13} />
              )}
              {allVisibleSelected ? "取消全选" : `全选当前 (${visibleIds.length})`}
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-2.5 py-2">
          {visible.length === 0 ? (
            <div className="flex h-full items-center justify-center text-[12px] text-slate-400">
              没有匹配的任务
            </div>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {visible.map((t) => {
                const s = statusOf(t);
                const meta = STATUS_META[s];
                const checked = selected.has(t.id);
                const subsystem = (t as KickoffWorkItem).subsystem;
                return (
                  <li key={t.id}>
                    <button
                      onClick={() => toggle(t.id)}
                      className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors ${
                        checked ? "bg-violet-50" : "hover:bg-slate-50"
                      }`}
                    >
                      {checked ? (
                        <CheckSquare
                          size={15}
                          className="shrink-0 text-violet-600"
                        />
                      ) : (
                        <Square size={15} className="shrink-0 text-slate-300" />
                      )}
                      <span className="shrink-0 font-mono text-[11px] font-semibold text-slate-400">
                        {t.id}
                      </span>
                      <span className="flex-1 truncate text-[12px] text-slate-700">
                        {t.title}
                      </span>
                      {subsystem && (
                        <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                          {subsystem}
                        </span>
                      )}
                      <span className="flex shrink-0 items-center gap-1.5">
                        <span
                          className={`h-2 w-2 rounded-full ${meta.dot}`}
                        />
                        <span className="w-16 text-[10px] font-medium text-slate-400">
                          {meta.label}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
          <span className="text-[12px] text-slate-500">
            已选 <span className="font-bold text-slate-700">{selected.size}</span> 个任务
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"
            >
              取消
            </button>
            <button
              onClick={() => onRun([...selected])}
              disabled={selected.size === 0}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-[12px] font-bold text-white shadow-sm transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Play size={13} />
              运行选中 ({selected.size})
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
