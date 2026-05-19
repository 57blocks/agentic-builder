"use client";

import { useState } from "react";

const TOOL_LABEL: Record<string, string> = {
  read_file: "Read",
  list_files: "List",
  grep: "Search",
  edit_file: "Edit",
  write_file: "Write",
};

interface Props {
  name: string;
  argsPreview: string;
  result?: { ok: boolean; summary: string; preview?: string };
}

export default function ToolCallBlock({ name, argsPreview, result }: Props) {
  const [open, setOpen] = useState(false);
  const label = TOOL_LABEL[name] ?? name;
  const inProgress = !result;
  const failed = result && !result.ok;
  return (
    <div
      className={`my-1 rounded border text-[11px] transition-colors ${
        failed
          ? "border-red-200 bg-red-50"
          : inProgress
            ? "border-zinc-200 bg-zinc-50"
            : "border-emerald-200 bg-emerald-50/40"
      }`}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5"
        disabled={!result?.preview}
      >
        <span className="flex min-w-0 items-center gap-2 text-zinc-700">
          {inProgress ? (
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
          ) : failed ? (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-600">
              <circle cx="12" cy="12" r="9" />
              <line x1="9" y1="9" x2="15" y2="15" />
              <line x1="15" y1="9" x2="9" y2="15" />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-600">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
          <span className="font-medium">{label}</span>
          {argsPreview && (
            <span className="truncate font-mono text-[10.5px] text-zinc-500">
              {argsPreview}
            </span>
          )}
        </span>
        {result?.preview && (
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`shrink-0 text-zinc-400 transition-transform ${open ? "rotate-90" : ""}`}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        )}
      </button>
      {open && result?.preview && (
        <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap border-t border-zinc-200 bg-white px-2.5 py-2 font-mono text-[10.5px] text-zinc-600">
          {result.preview}
        </pre>
      )}
      {failed && (
        <div className="border-t border-red-200 px-2.5 py-1.5 text-[10.5px] text-red-700">
          {result?.summary}
        </div>
      )}
    </div>
  );
}
