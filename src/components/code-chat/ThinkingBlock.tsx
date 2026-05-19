"use client";

import { useState } from "react";

interface Props {
  text: string;
  streaming: boolean;
}

export default function ThinkingBlock({ text, streaming }: Props) {
  const [open, setOpen] = useState(false);
  if (!text) return null;
  return (
    <div className="my-1 rounded border border-zinc-200 bg-zinc-50 text-[11px]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-zinc-500 transition-colors hover:bg-zinc-100"
      >
        <span className="flex items-center gap-1.5">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          {streaming ? "Thinking…" : "Thought"}
        </span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`transition-transform ${open ? "rotate-90" : ""}`}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
      {open && (
        <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap border-t border-zinc-200 px-2.5 py-2 font-mono text-[10.5px] text-zinc-500">
          {text}
        </pre>
      )}
    </div>
  );
}
