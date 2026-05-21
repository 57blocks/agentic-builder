"use client";

import { useMemo, useState } from "react";
import type { ServerLogLine } from "../usePreviewServerLogs";

interface Props {
  logs: ServerLogLine[];
  onAskAI: (snippet: string) => void;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  const ms = String(d.getMilliseconds()).padStart(3, "0");
  return `${hh}:${mm}:${ss}.${ms}`;
}

// Vite / tsx / esbuild error frames look like ` 12 | <code>` or `       | ^^^`.
// Highlight them so multi-line stack traces become scannable instead of
// blending into the regular log stream.
function isSourceFrame(text: string): boolean {
  return /^\s*\d+\s*\|/.test(text) || /^\s*\|\s*\^+/.test(text);
}

// Same idea for `at <fn> (path/to/file.ts:12:34)` style stack lines and the
// "at file://..." variants tsx emits on uncaught rejections.
function isStackLine(text: string): boolean {
  return /^\s*at\s+/.test(text);
}

function classifyLine(line: ServerLogLine): string {
  const t = line.text;
  if (line.stream === "stderr") {
    if (isSourceFrame(t)) return "text-red-200/80";
    if (isStackLine(t)) return "text-red-300/70";
    return "text-red-300";
  }
  if (t.startsWith("[preview]")) return "text-emerald-400";
  if (isSourceFrame(t)) return "text-amber-300/80";
  if (isStackLine(t)) return "text-zinc-500";
  // Lower priority warnings — Vite prefixes them with "✓" or "warn".
  if (/\b(error|failed|cannot|not found|exception)\b/i.test(t))
    return "text-red-300";
  if (/\bwarn(ing)?\b/i.test(t)) return "text-amber-300";
  return "text-zinc-300";
}

export default function DevServerLogsTab({ logs, onAskAI }: Props) {
  const [showTs, setShowTs] = useState(true);
  const [filter, setFilter] = useState<"all" | "stderr">("all");

  const visible = useMemo(
    () => (filter === "stderr" ? logs.filter((l) => l.stream === "stderr") : logs),
    [logs, filter],
  );

  const allText = useMemo(
    () =>
      logs
        .map(
          (l) =>
            `${formatTime(l.ts)} ${l.stream === "stderr" ? "[stderr]" : l.stream === "system" ? "[system]" : "       "} ${l.text}`,
        )
        .join("\n"),
    [logs],
  );

  if (logs.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-[11px] text-zinc-500">
        No dev-server output yet.
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex h-7 items-center justify-between gap-2 border-b border-zinc-800 px-2 text-[10px] text-zinc-500">
        <div className="flex items-center gap-2">
          <span className="text-zinc-500">
            {logs.length} line{logs.length === 1 ? "" : "s"}
          </span>
          <button
            onClick={() => setFilter(filter === "all" ? "stderr" : "all")}
            className={`rounded border px-1.5 py-[1px] transition-colors ${
              filter === "stderr"
                ? "border-red-500/40 bg-red-500/15 text-red-200"
                : "border-zinc-700 text-zinc-400 hover:text-zinc-200"
            }`}
            title="Toggle stderr-only filter"
          >
            stderr only
          </button>
          <button
            onClick={() => setShowTs((v) => !v)}
            className={`rounded border px-1.5 py-[1px] transition-colors ${
              showTs
                ? "border-zinc-600 bg-zinc-800 text-zinc-200"
                : "border-zinc-800 text-zinc-500 hover:text-zinc-300"
            }`}
            title="Toggle timestamp column"
          >
            time
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (typeof navigator !== "undefined" && navigator.clipboard) {
                void navigator.clipboard.writeText(allText);
              }
            }}
            className="text-zinc-500 transition-colors hover:text-zinc-300"
            title="Copy all log lines"
          >
            Copy all
          </button>
        </div>
      </div>
      <ol className="flex-1 overflow-y-auto font-mono text-[11px] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1">
        {visible.map((line, i) => {
          const cls = classifyLine(line);
          const isStderr = line.stream === "stderr";
          return (
            <li
              key={i}
              className="group flex items-start gap-2 border-b border-zinc-900/80 px-2.5 py-1 transition-colors hover:bg-zinc-800/40"
            >
              {showTs && (
                <span className="shrink-0 select-none text-[10px] text-zinc-600 tabular-nums">
                  {formatTime(line.ts)}
                </span>
              )}
              {isStderr ? (
                <span className="shrink-0 select-none rounded bg-red-500/15 px-1 text-[9px] font-semibold text-red-300">
                  ERR
                </span>
              ) : line.stream === "system" ? (
                <span className="shrink-0 select-none rounded bg-emerald-500/10 px-1 text-[9px] font-semibold text-emerald-300">
                  SYS
                </span>
              ) : (
                <span className="shrink-0 select-none rounded bg-zinc-800 px-1 text-[9px] font-semibold text-zinc-500">
                  OUT
                </span>
              )}
              <span
                className={`min-w-0 flex-1 whitespace-pre-wrap break-words ${cls}`}
              >
                {line.text}
              </span>
              <button
                onClick={() => onAskAI(`${formatTime(line.ts)} ${line.stream} ${line.text}`)}
                className="opacity-0 transition-opacity group-hover:opacity-100 rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-300 hover:border-zinc-500 hover:bg-zinc-800"
              >
                Ask AI
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
