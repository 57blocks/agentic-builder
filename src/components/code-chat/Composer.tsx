"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  pendingContext: string;
  onClearContext: () => void;
  onSend: (text: string, context?: string) => void;
  onStop: () => void;
  streaming: boolean;
}

export default function Composer({
  pendingContext,
  onClearContext,
  onSend,
  onStop,
  streaming,
}: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (pendingContext) textareaRef.current?.focus();
  }, [pendingContext]);

  function submit() {
    if (streaming) return;
    if (!value.trim() && !pendingContext) return;
    onSend(value.trim() || "Look at this and tell me what's wrong, then fix it.", pendingContext || undefined);
    setValue("");
    onClearContext();
  }

  return (
    <div className="border-t border-zinc-200 bg-white p-2">
      {pendingContext && (
        <div className="mb-2 flex items-start gap-2 rounded border border-zinc-200 bg-zinc-50 px-2.5 py-1.5">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              Attached context
            </div>
            <pre className="mt-0.5 max-h-20 overflow-y-auto whitespace-pre-wrap font-mono text-[10.5px] text-zinc-600">
              {pendingContext.slice(0, 600)}
              {pendingContext.length > 600 ? "…" : ""}
            </pre>
          </div>
          <button
            onClick={onClearContext}
            className="shrink-0 text-zinc-400 transition-colors hover:text-zinc-700"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
          rows={2}
          placeholder={pendingContext ? "Add a question or hit Send…" : "Ask the agent to fix the project…"}
          className="min-h-[44px] flex-1 resize-none rounded border border-zinc-200 bg-white px-2.5 py-1.5 text-[12px] text-zinc-800 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none"
        />
        {streaming ? (
          <button
            onClick={onStop}
            className="rounded bg-zinc-100 px-3 py-2 text-[11px] font-medium text-zinc-700 transition-colors hover:bg-zinc-200"
          >
            Stop
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={!value.trim() && !pendingContext}
            className="rounded bg-zinc-900 px-3 py-2 text-[11px] font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-40"
          >
            Send
          </button>
        )}
      </div>
      <div className="mt-1 text-right text-[10px] text-zinc-400">⌘/Ctrl + Enter to send</div>
    </div>
  );
}
