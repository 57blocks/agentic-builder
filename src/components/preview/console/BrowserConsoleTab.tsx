"use client";

import { useMemo, useState } from "react";
import type { BrowserConsoleEntry, CallerLocation } from "./types";

interface Props {
  entries: BrowserConsoleEntry[];
  onAskAI: (snippet: string) => void;
  onClear: () => void;
}

const LEVEL_STYLES: Record<string, { dot: string; text: string }> = {
  log: { dot: "bg-zinc-400", text: "text-zinc-200" },
  info: { dot: "bg-sky-400", text: "text-sky-200" },
  debug: { dot: "bg-zinc-500", text: "text-zinc-400" },
  warn: { dot: "bg-amber-400", text: "text-amber-200" },
  error: { dot: "bg-red-500", text: "text-red-200" },
};

const TYPE_BADGE: Record<BrowserConsoleEntry["type"], string> = {
  console: "bg-zinc-800 text-zinc-400",
  error: "bg-red-500/20 text-red-300",
  unhandledrejection: "bg-red-500/20 text-red-300",
  bridge_ready: "bg-emerald-500/15 text-emerald-300",
};

const TYPE_LABEL: Record<BrowserConsoleEntry["type"], string> = {
  console: "log",
  error: "error",
  unhandledrejection: "reject",
  bridge_ready: "bridge",
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  const ms = String(d.getMilliseconds()).padStart(3, "0");
  return `${hh}:${mm}:${ss}.${ms}`;
}

function shortUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    // Drop the protocol + host; the route+hash is what matters at-a-glance.
    return `${u.pathname}${u.search}${u.hash}` || "/";
  } catch {
    return url.length > 60 ? url.slice(0, 60) + "…" : url;
  }
}

/**
 * Render a caller location the way Chrome devtools does: just the basename
 * of the module + line number. We hide the query string Vite appends and
 * the full origin so the chip stays scannable. The complete file URL is
 * surfaced via `title` so hover still works for copy-paste.
 */
function shortCaller(caller: CallerLocation): string {
  let file = caller.file;
  // Drop Vite's hot-reload query (?t=…&type=…) — they make every chip unique
  // but the path is what the operator actually cares about.
  const q = file.indexOf("?");
  if (q !== -1) file = file.slice(0, q);
  try {
    const u = new URL(file);
    file = u.pathname;
  } catch {
    /* not a full URL — leave as is */
  }
  const segments = file.split("/").filter(Boolean);
  const basename = segments[segments.length - 1] || file;
  return `${basename}:${caller.line}`;
}

function fullCallerHref(caller: CallerLocation): string {
  return `${caller.file}:${caller.line}:${caller.col}`;
}

function detailLabel(entry: BrowserConsoleEntry): string {
  if (entry.type === "error" || entry.type === "unhandledrejection") return "stack";
  // The detail for `console.log(obj)` is the full pretty-printed JSON.
  return "details";
}

export default function BrowserConsoleTab({ entries, onAskAI, onClear }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showTs, setShowTs] = useState(true);
  const [filter, setFilter] = useState<"all" | "error">("all");

  const visible = useMemo(
    () =>
      filter === "error"
        ? entries.filter((e) => e.level === "error")
        : entries,
    [entries, filter],
  );

  if (entries.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-[11px] text-zinc-500">
        Waiting for browser console output… open the preview to start capturing.
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex h-7 items-center justify-between gap-2 border-b border-zinc-800 px-2 text-[10px] text-zinc-500">
        <div className="flex items-center gap-2">
          <span>
            {entries.length} entr{entries.length === 1 ? "y" : "ies"}
          </span>
          <button
            onClick={() => setFilter(filter === "all" ? "error" : "all")}
            className={`rounded border px-1.5 py-[1px] transition-colors ${
              filter === "error"
                ? "border-red-500/40 bg-red-500/15 text-red-200"
                : "border-zinc-700 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            errors only
          </button>
          <button
            onClick={() => setShowTs((v) => !v)}
            className={`rounded border px-1.5 py-[1px] transition-colors ${
              showTs
                ? "border-zinc-600 bg-zinc-800 text-zinc-200"
                : "border-zinc-800 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            time
          </button>
        </div>
        <button
          onClick={onClear}
          className="text-zinc-500 transition-colors hover:text-zinc-300"
        >
          Clear
        </button>
      </div>
      <ol className="flex-1 overflow-y-auto font-mono text-[11px] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1">
        {visible.map((entry) => {
          const styles = LEVEL_STYLES[entry.level] ?? LEVEL_STYLES.log;
          const isOpen = !!expanded[entry.id];
          const url = shortUrl(entry.url);
          const isErrorLike =
            entry.type === "error" || entry.type === "unhandledrejection";
          return (
            <li
              key={entry.id}
              className={`group border-b border-zinc-900/80 px-2.5 py-1.5 transition-colors hover:bg-zinc-800/40 ${
                isErrorLike ? "bg-red-500/[0.04]" : ""
              }`}
            >
              <div className="flex items-start gap-2">
                <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${styles.dot}`} />
                {showTs && (
                  <span className="mt-[1px] shrink-0 select-none text-[10px] text-zinc-600 tabular-nums">
                    {formatTime(entry.ts)}
                  </span>
                )}
                <span
                  className={`mt-[1px] shrink-0 select-none rounded px-1 text-[9px] font-semibold uppercase ${TYPE_BADGE[entry.type]}`}
                  title={entry.type}
                >
                  {TYPE_LABEL[entry.type]}
                </span>
                <div className={`flex-1 min-w-0 break-words ${styles.text}`}>
                  <span className="whitespace-pre-wrap">{entry.text}</span>
                  {entry.detail && (
                    <button
                      onClick={() => setExpanded((p) => ({ ...p, [entry.id]: !isOpen }))}
                      className="ml-2 text-[10px] text-zinc-500 underline transition-colors hover:text-zinc-300"
                    >
                      {isOpen ? "hide" : detailLabel(entry)}
                    </button>
                  )}
                  {entry.caller && (
                    <span
                      className="ml-2 select-text rounded bg-zinc-800/60 px-1 text-[10px] text-zinc-400 hover:text-zinc-200"
                      title={fullCallerHref(entry.caller)}
                    >
                      {shortCaller(entry.caller)}
                    </span>
                  )}
                  {url && (
                    <span
                      className="ml-2 select-text text-[10px] text-zinc-600"
                      title={entry.url}
                    >
                      {url}
                    </span>
                  )}
                  {isOpen && entry.detail && (
                    <pre className="mt-1 whitespace-pre-wrap rounded bg-zinc-900 px-2 py-1.5 text-[10px] text-zinc-400 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1">
                      {entry.detail}
                    </pre>
                  )}
                </div>
                <button
                  onClick={() =>
                    onAskAI(
                      [
                        entry.text,
                        entry.caller
                          ? `(call site: ${fullCallerHref(entry.caller)})`
                          : null,
                        entry.detail ? entry.detail : null,
                        entry.url ? `(at ${entry.url})` : null,
                      ]
                        .filter(Boolean)
                        .join("\n\n")
                        .trim(),
                    )
                  }
                  className="opacity-0 transition-opacity group-hover:opacity-100 rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-300 hover:border-zinc-500 hover:bg-zinc-800"
                  title="Send this entry to AI chat"
                >
                  Ask AI
                </button>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
