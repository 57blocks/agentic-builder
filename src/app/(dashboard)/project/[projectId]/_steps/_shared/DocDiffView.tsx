"use client";

import React from "react";
import { X } from "lucide-react";

// Word-level inline diff (LCS) — shared by doc steps (TRD / Design) to show
// what a regenerate changed vs the previous version.
type WordDiff = { type: "equal" | "added" | "removed"; text: string };

function diffWords(oldLine: string, newLine: string): { old: WordDiff[]; new: WordDiff[] } {
  const a = oldLine.split(/(\s+)/);
  const b = newLine.split(/(\s+)/);
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--)
    for (let j = n - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? 1 + dp[i + 1][j + 1] : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const oldTokens: WordDiff[] = [], newTokens: WordDiff[] = [];
  let i = 0, j = 0;
  while (i < m || j < n) {
    if (i < m && j < n && a[i] === b[j]) { oldTokens.push({ type: "equal", text: a[i] }); newTokens.push({ type: "equal", text: b[j] }); i++; j++; }
    else if (j < n && (i >= m || dp[i][j + 1] >= dp[i + 1][j])) { newTokens.push({ type: "added", text: b[j] }); j++; }
    else { oldTokens.push({ type: "removed", text: a[i] }); i++; }
  }
  return { old: oldTokens, new: newTokens };
}

function InlineDiffLine({ tokens }: { tokens: WordDiff[] }) {
  return <span>{tokens.map((t, i) => {
    if (t.type === "equal") return <span key={i}>{t.text}</span>;
    if (t.type === "added") return <span key={i} className="bg-[#abf2bc] text-[#1a7f37] rounded-[2px]">{t.text}</span>;
    return <span key={i} className="bg-[#ff818266] text-[#cf222e] rounded-[2px] line-through">{t.text}</span>;
  })}</span>;
}

type DiffLine = { type: "equal" | "added" | "removed"; text: string };

function diffLines(oldText: string, newText: string): DiffLine[] {
  const a = oldText.split("\n"); const b = newText.split("\n");
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--) { dp[i][j] = a[i] === b[j] ? 1 + dp[i + 1][j + 1] : Math.max(dp[i + 1][j], dp[i][j + 1]); }
  const result: DiffLine[] = []; let i = 0, j = 0;
  while (i < m || j < n) {
    if (i < m && j < n && a[i] === b[j]) { result.push({ type: "equal", text: a[i] }); i++; j++; }
    else if (j < n && (i >= m || dp[i][j + 1] >= dp[i + 1][j])) { result.push({ type: "added", text: b[j] }); j++; }
    else { result.push({ type: "removed", text: a[i] }); i++; }
  }
  return result;
}

/**
 * Renders a GitHub-style diff between the previous version (`oldText`) and the
 * current one (`newText`). Used by doc steps to mark what a regenerate changed.
 */
export function DocDiffView({
  oldText,
  newText,
  label,
  onClose,
}: {
  oldText: string;
  newText: string;
  label: string;
  onClose: () => void;
}) {
  const diffResult = diffLines(oldText, newText);
  const added = diffResult.filter((l) => l.type === "added").length;
  const removed = diffResult.filter((l) => l.type === "removed").length;

  return (
    <div className="flex flex-col w-full h-full bg-white border border-[#e2e8f0] rounded-[4px] overflow-hidden">
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-900 text-sm">{label} — changes since last version</span>
          <span className="text-green-600 text-xs font-medium">+{added}</span>
          <span className="text-red-500 text-xs font-medium">−{removed}</span>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-md hover:bg-slate-100 transition-colors"><X size={16} className="text-slate-500" /></button>
      </div>
      <div className="flex-1 overflow-auto bg-white">
        <div className="font-mono text-[12.5px] leading-5">
          {diffResult.length === 0 || (added === 0 && removed === 0) ? (
            <div className="flex items-center justify-center py-16 text-slate-400 text-sm font-sans">No differences from the previous version.</div>
          ) : (() => {
            const rows: React.ReactNode[] = []; let idx = 0;
            while (idx < diffResult.length) {
              const cur = diffResult[idx]; const next = diffResult[idx + 1];
              if (cur.type === "removed" && next?.type === "added") {
                const wd = diffWords(cur.text, next.text);
                rows.push(<div key={`r${idx}`} className="flex min-w-0 bg-[#ffebe9]"><span className="select-none shrink-0 w-8 text-center border-r text-red-500 bg-[#ffd7d5] border-[#ffb3af]">−</span><span className="flex-1 pl-4 pr-4 whitespace-pre-wrap break-words text-[#cf222e]"><InlineDiffLine tokens={wd.old} /></span></div>);
                rows.push(<div key={`a${idx}`} className="flex min-w-0 bg-[#e6ffec]"><span className="select-none shrink-0 w-8 text-center border-r text-green-600 bg-[#ccffd8] border-[#b0efbc]">+</span><span className="flex-1 pl-4 pr-4 whitespace-pre-wrap break-words text-[#1a7f37]"><InlineDiffLine tokens={wd.new} /></span></div>);
                idx += 2;
              } else {
                const isA = cur.type === "added"; const isR = cur.type === "removed";
                rows.push(<div key={idx} className={["flex min-w-0", isA ? "bg-[#e6ffec]" : "", isR ? "bg-[#ffebe9]" : ""].join(" ")}><span className={["select-none shrink-0 w-8 text-center border-r", isA ? "text-green-600 bg-[#ccffd8] border-[#b0efbc]" : "", isR ? "text-red-500 bg-[#ffd7d5] border-[#ffb3af]" : "", !isA && !isR ? "text-slate-300 bg-[#f6f8fa] border-[#d0d7de]" : ""].join(" ")}>{isA ? "+" : isR ? "−" : " "}</span><span className={["flex-1 pl-4 pr-4 whitespace-pre-wrap break-words", isA ? "text-[#1a7f37]" : "", isR ? "text-[#cf222e]" : "", !isA && !isR ? "text-[#24292f]" : ""].join(" ")}>{cur.text || " "}</span></div>);
                idx++;
              }
            }
            return rows;
          })()}
        </div>
      </div>
    </div>
  );
}
