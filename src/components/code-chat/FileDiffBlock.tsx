"use client";

import { useMemo, useState } from "react";
import { compactDiff, diffLines } from "./diff-util";
import type { FileEditRecord } from "@/lib/agents/code-chat/types";

interface Props {
  edit: FileEditRecord & { reverted?: boolean };
  codeOutputDir: string;
  onReverted: (editId: string) => void;
}

export default function FileDiffBlock({ edit, codeOutputDir, onReverted }: Props) {
  const [open, setOpen] = useState(true);
  const [busy, setBusy] = useState(false);
  const diff = useMemo(
    () => compactDiff(diffLines(edit.before ?? "", edit.after), 2),
    [edit.before, edit.after],
  );
  const { adds, dels } = useMemo(() => {
    let adds = 0;
    let dels = 0;
    for (const l of diff) {
      if (l.kind === "add") adds++;
      else if (l.kind === "del") dels++;
    }
    return { adds, dels };
  }, [diff]);

  async function revert() {
    setBusy(true);
    try {
      const resp = await fetch("/api/agents/code-chat/revert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: edit.path, before: edit.before, codeOutputDir }),
      });
      if (resp.ok) onReverted(edit.id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="my-1 overflow-hidden rounded border border-zinc-200 bg-white text-[11px]">
      <div className="flex items-center justify-between gap-2 border-b border-zinc-200 bg-zinc-50 px-2.5 py-1.5">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
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
          <span
            className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
              edit.op === "create" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
            }`}
          >
            {edit.op}
          </span>
          <span className="truncate font-mono text-zinc-700">{edit.path}</span>
          <span className="shrink-0 text-[10px] text-emerald-600">+{adds}</span>
          <span className="shrink-0 text-[10px] text-red-600">−{dels}</span>
        </button>
        {edit.reverted ? (
          <span className="shrink-0 text-[10px] font-medium text-zinc-500">Reverted</span>
        ) : (
          <button
            onClick={revert}
            disabled={busy}
            className="shrink-0 rounded border border-zinc-200 px-2 py-0.5 text-[10px] text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-40"
          >
            {busy ? "Reverting…" : "Revert"}
          </button>
        )}
      </div>
      {open && (
        <div className="max-h-64 overflow-auto font-mono text-[10.5px] leading-snug">
          {diff.map((line, i) => {
            if (line.kind === "hunk-gap") {
              return (
                <div key={i} className="border-y border-zinc-100 bg-zinc-50 px-2 py-0.5 text-zinc-400">
                  ⋯
                </div>
              );
            }
            const bg =
              line.kind === "add"
                ? "bg-emerald-50"
                : line.kind === "del"
                  ? "bg-red-50"
                  : "";
            const sign = line.kind === "add" ? "+" : line.kind === "del" ? "−" : " ";
            const lineNo =
              line.kind === "add"
                ? `   ${line.after}`
                : line.kind === "del"
                  ? `${line.before}   `
                  : `${line.before} ${line.after}`;
            return (
              <div key={i} className={`flex gap-2 px-2 ${bg}`}>
                <span className="shrink-0 select-none text-[9.5px] text-zinc-400">{lineNo}</span>
                <span className="shrink-0 select-none text-zinc-500">{sign}</span>
                <span className="whitespace-pre-wrap break-all text-zinc-800">{line.text}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
