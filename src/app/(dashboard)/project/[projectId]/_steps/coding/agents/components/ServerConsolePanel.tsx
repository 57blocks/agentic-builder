"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Copy, Trash2, Terminal } from "lucide-react";
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
}

export function ServerConsolePanel({ logs, onClear }: ServerConsolePanelProps) {
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

  return (
    <div className="border-t border-slate-200 bg-slate-900">
      <div className="flex items-center justify-between px-3 py-1.5">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-300"
        >
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          <Terminal size={13} />
          Server Console
          <span className="ml-1 text-slate-500">({logs.length})</span>
        </button>
        {open && (
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1 text-[10px] text-slate-400">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
              />
              auto-scroll
            </label>
            <button onClick={copyAll} title="Copy all" className="text-slate-400 hover:text-slate-200">
              <Copy size={13} />
            </button>
            <button onClick={onClear} title="Clear" className="text-slate-400 hover:text-slate-200">
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>
      {open && (
        <div className="min-h-[500px] max-h-[640px] overflow-auto px-3 pb-2 font-mono text-[11px] leading-relaxed">
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
