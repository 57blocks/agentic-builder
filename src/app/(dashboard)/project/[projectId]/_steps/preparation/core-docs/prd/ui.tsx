"use client";

import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, History, X, ChevronLeft, ChevronRight, Pencil, Check, ShieldCheck, AlertTriangle } from "lucide-react";
import { useStepStore } from "@/store/step-store";
import { useStepNavigationStore } from "@/store/step-navigation-store";
import { getNextStep } from "@/_config/pipeline-flow";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import StageInputBar from "@/components/StageInputBar";
import {
  stripChangeMarkers,
  hasPrdDiffMarkers,
  parsePrdDiffSegments,
  resolvePrdDiff,
  resolveAllPrdDiff,
} from "@/lib/agents/pm/prd-patch";
import type { StepUIProps } from "../../../_shared/types";
import type { ProjectTier } from "@/_config/pipeline-flow";
import { savePrdVersion, loadPrdVersions } from "./snapshot";
import type { PrdVersion, PrdReadiness } from "./snapshot";
import { PrdReadinessPanel } from "./PrdReadinessPanel";
import { PrdToolDrawer } from "./PrdToolDrawer";
import type { PrdSpec } from "@/lib/requirements/prd-spec-types";
// Pure, client-safe detector (type-only deps) — used to recognise goal-mode
// plans so they can skip the large-PRD Prepare flow.
import { hasPlanSignals } from "@/lib/agentic-build/plan-detection";

// ─── PRD history (populated from persisted versions) ──────────────────────
export interface PrdSnapshot { content: string; savedAt: Date; label: string; }

// ─── Word-level inline diff ────────────────────────────────────────────────
type WordDiff = { type: "equal" | "added" | "removed"; text: string };

function diffWords(oldLine: string, newLine: string): { old: WordDiff[]; new: WordDiff[] } {
  const a = oldLine.split(/(\s+)/); const b = newLine.split(/(\s+)/);
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? 1 + dp[i + 1][j + 1] : Math.max(dp[i + 1][j], dp[i][j + 1]);
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

type DiffLine = { type: "equal"; text: string } | { type: "added"; text: string } | { type: "removed"; text: string };

function diffLines(oldText: string, newText: string): DiffLine[] {
  const a = oldText.split("\n"); const b = newText.split("\n");
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--) { if (a[i] === b[j]) dp[i][j] = 1 + dp[i + 1][j + 1]; else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]); }
  const result: DiffLine[] = []; let i = 0, j = 0;
  while (i < m || j < n) {
    if (i < m && j < n && a[i] === b[j]) { result.push({ type: "equal", text: a[i] }); i++; j++; }
    else if (j < n && (i >= m || dp[i][j + 1] >= dp[i + 1][j])) { result.push({ type: "added", text: b[j] }); j++; }
    else { result.push({ type: "removed", text: a[i] }); i++; }
  }
  return result;
}

// ─── Inline diff hunk (Cursor-style, per-section accept/reject) ──────────────
function DiffRows({ oldBody, newBody }: { oldBody: string; newBody: string }) {
  const diff = diffLines(oldBody, newBody);
  const rows: React.ReactNode[] = [];
  let idx = 0;
  while (idx < diff.length) {
    const cur = diff[idx];
    const next = diff[idx + 1];
    if (cur.type === "removed" && next?.type === "added") {
      const wd = diffWords(cur.text, next.text);
      rows.push(<div key={`r${idx}`} className="flex min-w-0 bg-[#ffebe9]"><span className="select-none shrink-0 w-7 text-center border-r text-red-500 bg-[#ffd7d5] border-[#ffb3af]">−</span><span className="flex-1 px-3 whitespace-pre-wrap break-words text-[#cf222e]"><InlineDiffLine tokens={wd.old} /></span></div>);
      rows.push(<div key={`a${idx}`} className="flex min-w-0 bg-[#e6ffec]"><span className="select-none shrink-0 w-7 text-center border-r text-green-600 bg-[#ccffd8] border-[#b0efbc]">+</span><span className="flex-1 px-3 whitespace-pre-wrap break-words text-[#1a7f37]"><InlineDiffLine tokens={wd.new} /></span></div>);
      idx += 2;
    } else {
      const isA = cur.type === "added";
      const isR = cur.type === "removed";
      rows.push(<div key={idx} className={["flex min-w-0", isA ? "bg-[#e6ffec]" : "", isR ? "bg-[#ffebe9]" : ""].join(" ")}><span className={["select-none shrink-0 w-7 text-center border-r", isA ? "text-green-600 bg-[#ccffd8] border-[#b0efbc]" : "", isR ? "text-red-500 bg-[#ffd7d5] border-[#ffb3af]" : "", !isA && !isR ? "text-slate-300 bg-[#f6f8fa] border-[#d0d7de]" : ""].join(" ")}>{isA ? "+" : isR ? "−" : " "}</span><span className={["flex-1 px-3 whitespace-pre-wrap break-words", isA ? "text-[#1a7f37]" : "", isR ? "text-[#cf222e]" : "", !isA && !isR ? "text-[#24292f]" : ""].join(" ")}>{cur.text || " "}</span></div>);
      idx++;
    }
  }
  return <>{rows}</>;
}

/** Strip any stray PRD-DIFF HTML-comment markers so they don't render as text. */
const DIFF_MARKER_RE = /<!--PRD-DIFF:[^>]*-->/g;
function stripDiffMarkers(text: string) { return text.replace(DIFF_MARKER_RE, ""); }

// ─── Markdown-aware diff view (groups consecutive diff lines, renders as MD) ──
function MarkdownDiffView({ oldBody, newBody }: { oldBody: string; newBody: string }) {
  // Scrub any residual diff markers before diffing so they never appear as text
  const diff = diffLines(stripDiffMarkers(oldBody), stripDiffMarkers(newBody));
  type Group = { type: "equal" | "added" | "removed"; lines: string[] };
  const groups: Group[] = [];
  for (const d of diff) {
    const last = groups[groups.length - 1];
    if (last && last.type === d.type) {
      last.lines.push(d.text);
    } else {
      groups.push({ type: d.type, lines: [d.text] });
    }
  }
  return (
    <div>
      {groups.map((g, idx) => {
        const text = g.lines.join("\n");
        if (g.type === "removed") {
          return (
            <div key={idx} className="border-l-4 border-red-400 bg-red-50/70 px-4 py-2">
              <div className="text-[10px] font-mono text-red-500 mb-1 select-none">− removed</div>
              <div className="text-red-900/80 [&_h1]:text-red-800 [&_h2]:text-red-800 [&_h3]:text-red-800 [&_strong]:text-red-800">
                <MarkdownRenderer content={text} variant="prd" skipMermaid={true} />
              </div>
            </div>
          );
        }
        if (g.type === "added") {
          return (
            <div key={idx} className="border-l-4 border-green-400 bg-green-50/70 px-4 py-2">
              <div className="text-[10px] font-mono text-green-600 mb-1 select-none">+ added</div>
              <div className="text-green-900/80 [&_h1]:text-green-800 [&_h2]:text-green-800 [&_h3]:text-green-800 [&_strong]:text-green-800">
                <MarkdownRenderer content={text} variant="prd" skipMermaid={true} />
              </div>
            </div>
          );
        }
        return (
          <div key={idx} className="px-4 py-1">
            <MarkdownRenderer content={text} variant="prd" skipMermaid={true} />
          </div>
        );
      })}
    </div>
  );
}

function PrdDiffHunk({ id, oldBody, newBody, onAccept, onReject }: {
  id: string;
  oldBody: string;
  newBody: string;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}) {
  return (
    <div className="my-3 rounded-md border border-indigo-200 overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-3 py-1.5 bg-indigo-50 border-b border-indigo-100">
        <span className="text-[11px] font-semibold text-indigo-700">Suggested Changes</span>
        <div className="flex items-center gap-1.5">
          <button onClick={() => onReject(id)} className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded text-red-600 bg-white border border-red-200 hover:bg-red-50 transition-colors">✗ Reject</button>
          <button onClick={() => onAccept(id)} className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded text-green-700 bg-white border border-green-200 hover:bg-green-50 transition-colors">✓ Accept</button>
        </div>
      </div>
      <div className="bg-white">
        <MarkdownDiffView oldBody={oldBody} newBody={newBody} />
      </div>
    </div>
  );
}

// ─── DiffPanel ─────────────────────────────────────────────────────────────
function DiffPanel({ history, currentContent, onClose }: { history: PrdSnapshot[]; currentContent: string; onClose: () => void }) {
  const allVersions: PrdSnapshot[] = [...history, { content: currentContent, savedAt: new Date(), label: `v${history.length + 1} · Current` }];
  const [leftIdx, setLeftIdx] = useState(Math.max(0, allVersions.length - 2));
  const [rightIdx, setRightIdx] = useState(allVersions.length - 1);
  const leftContent = allVersions[leftIdx]?.content ?? "";
  const rightContent = allVersions[rightIdx]?.content ?? "";
  const diffResult = diffLines(leftContent, rightContent);
  const added = diffResult.filter((l) => l.type === "added").length;
  const removed = diffResult.filter((l) => l.type === "removed").length;

  return (
    <div className="flex flex-col w-full h-full bg-white border border-[#e2e8f0] rounded-[4px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-3"><History size={16} className="text-indigo-600" /><span className="font-semibold text-slate-900 text-sm">PRD Version Diff</span><span className="text-xs text-slate-500">{allVersions.length} versions</span></div>
        <button onClick={onClose} className="p-1.5 rounded-md hover:bg-slate-100 transition-colors"><X size={16} className="text-slate-500" /></button>
      </div>
      <div className="flex items-center gap-6 px-6 py-3 border-b border-slate-100 bg-slate-50 shrink-0 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-400 shrink-0" /><span className="text-slate-500 mr-1">Base:</span>
          <button disabled={leftIdx === 0} onClick={() => setLeftIdx((v) => Math.max(0, v - 1))} className="p-0.5 rounded hover:bg-slate-200 disabled:opacity-30"><ChevronLeft size={14} /></button>
          <span className="bg-red-50 border border-red-200 text-red-700 px-2 py-0.5 rounded font-medium min-w-28 text-center">{allVersions[leftIdx]?.label}</span>
          <button disabled={leftIdx >= rightIdx - 1} onClick={() => setLeftIdx((v) => Math.min(rightIdx - 1, v + 1))} className="p-0.5 rounded hover:bg-slate-200 disabled:opacity-30"><ChevronRight size={14} /></button>
        </div>
        <ChevronRight size={14} className="text-slate-400" />
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-400 shrink-0" /><span className="text-slate-500 mr-1">Compare:</span>
          <button disabled={rightIdx <= leftIdx + 1} onClick={() => setRightIdx((v) => Math.max(leftIdx + 1, v - 1))} className="p-0.5 rounded hover:bg-slate-200 disabled:opacity-30"><ChevronLeft size={14} /></button>
          <span className="bg-green-50 border border-green-200 text-green-700 px-2 py-0.5 rounded font-medium min-w-28 text-center">{allVersions[rightIdx]?.label}</span>
          <button disabled={rightIdx >= allVersions.length - 1} onClick={() => setRightIdx((v) => Math.min(allVersions.length - 1, v + 1))} className="p-0.5 rounded hover:bg-slate-200 disabled:opacity-30"><ChevronRight size={14} /></button>
        </div>
        <div className="ml-auto flex items-center gap-3"><span className="text-green-600 font-medium">+{added}</span><span className="text-red-500 font-medium">−{removed}</span></div>
      </div>
      <div className="flex-1 overflow-auto bg-white">
        <div className="sticky top-0 z-10 flex items-center gap-2 px-4 py-2 bg-[#f6f8fa] border-b border-[#d0d7de] text-xs font-mono text-[#57606a]">
          <span className="font-semibold text-[#24292f]">PRD.md</span><span className="ml-auto text-green-600">+{added}</span><span className="text-red-500">−{removed}</span>
          <div className="flex h-2 w-20 rounded-sm overflow-hidden bg-slate-200">{added + removed > 0 && <><div className="bg-green-500 h-full" style={{ width: `${Math.round((added / (added + removed)) * 100)}%` }} /><div className="bg-red-400 h-full" style={{ width: `${Math.round((removed / (added + removed)) * 100)}%` }} /></>}</div>
        </div>
        <div className="font-mono text-[12.5px] leading-5">
          {diffResult.length === 0 ? <div className="flex items-center justify-center py-16 text-slate-400 text-sm font-sans">No differences between these versions.</div> : (() => {
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
                rows.push(<div key={idx} className={["flex min-w-0", isA ? "bg-[#e6ffec]" : "", isR ? "bg-[#ffebe9]" : ""].join(" ")}><span className={["select-none shrink-0 w-8 text-center border-r", isA ? "text-green-600 bg-[#ccffd8] border-[#b0efbc]" : "", isR ? "text-red-500 bg-[#ffd7d5] border-[#ffb3af]" : "", !isA && !isR ? "text-slate-300 bg-[#f6f8fa] border-[#d0d7de]" : ""].join(" ")}>{isA ? "+" : isR ? "−" : " "}</span><span className={["flex-1 pl-4 pr-4 whitespace-pre-wrap break-words", isA ? "text-[#1a7f37]" : "", isR ? "text-[#cf222e]" : "", !isA && !isR ? "text-[#24292f]" : ""].join(" ")}>{cur.text || "\u00a0"}</span></div>);
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

// ─── Icons ─────────────────────────────────────────────────────────────────
function SpinnerIcon() { return <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>; }
function CheckCircleIcon({ size = 15 }: { size?: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="9 12 11 14 15 10" /></svg>; }
function DownloadIcon() { return <svg width="11.667" height="11.667" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>; }

type DocTab = "prd" | "design" | "trd" | "qa";
const DOC_TABS: { id: DocTab; label: string }[] = [
  { id: "prd", label: "PRD" }, { id: "design", label: "Design Document" }, { id: "trd", label: "Technical Specs" }, { id: "qa", label: "QA Plan" },
];

const TIER_FULL: Record<ProjectTier, string> = {
  S: "Simple Frontend / single-page",
  M: "Full-Stack Application",
  L: "Enterprise / Complex Platform",
};

/** Replace (or insert) the `> **Project Tier: X**` badge line. The badge is
 *  authoritative downstream (the classifier reads it), so a manual tier change
 *  must rewrite it in the PRD content. */
function setTierBadge(content: string, t: ProjectTier): string {
  const line = `> **Project Tier: ${t}** — ${TIER_FULL[t]}`;
  if (/\*\*Project Tier:\s*[SML]\*\*/i.test(content)) {
    return content.replace(/^>?[ \t]*\*\*Project Tier:\s*[SML]\*\*.*$/im, line);
  }
  // No badge yet — insert right after the first H1 heading.
  return content.replace(/^(#\s+.*)$/m, `$1\n\n${line}`);
}

// ─── Main Component ────────────────────────────────────────────────────────
export function PrdUI(props: StepUIProps) {
  // All state from step-store (single source of truth)
  const step = useStepStore((s) => s.steps.prd);
  const streamingContent = useStepStore((s) => s.streamingContent);
  const currentStep = useStepStore((s) => s.currentStep);
  const isRunning = useStepStore((s) => s.isRunning);
  const featureBrief = useStepStore((s) => s.featureBrief);
  const isHydrated = useStepStore((s) => s.isHydrated);
  const executeStep = useStepStore((s) => s.executeStep);
  const kickoffSessionId = useStepStore((s) => s.kickoffSessionId);
  const intentMeta = useStepStore((s) => s.steps.intent?.metadata as { classification?: { type?: string } } | undefined);
  const setStepContent = useStepStore((s) => s.setStepContent);
  // Navigation
  const tier = useStepNavigationStore((s) => s.tier);
  const nextStep = getNextStep("prd", tier);

  const [editInput, setEditInput] = useState("");
  // ── Selection-to-edit: text the user highlighted in the rendered PRD,
  //    brought in as the target ("modify this part"). ───────────────────
  const [selectionTarget, setSelectionTarget] = useState("");
  const [prepOpen, setPrepOpen] = useState(false);
  const [qualityRan, setQualityRan] = useState(false);
  const [subsystemRan, setSubsystemRan] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isSavingDoc, setIsSavingDoc] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  // ── Manual edit mode (raw markdown textarea) ──────────────────────────
  const [isManualEditing, setIsManualEditing] = useState(false);
  const [manualDraft, setManualDraft] = useState("");
  const [manualSaving, setManualSaving] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);
  const manualTextareaRef = useRef<HTMLTextAreaElement>(null);

  const prdHistoryRef = useRef<PrdSnapshot[]>([]);
  const prevIsDoneRef = useRef(false);
  const autoStartedRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  // ── 8s confirm cooldown after SSE completes ──────────────────────────
  const [confirmCooldown, setConfirmCooldown] = useState(false);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  // ── Fix mode: direct fix from quality panel (no edit-bar pre-fill) ───
  const [isFixMode, setIsFixMode] = useState(false);
  const isFixModeRef = useRef(false);
  isFixModeRef.current = isFixMode;
  // Captures PRD content at the moment a fix starts so it stays visible
  // while the new generation streams in the background.
  const preFixContentRef = useRef("");
  // Resolves/rejects the Promise returned by directFix() on completion.
  const fixResolveRef = useRef<{ resolve: () => void; reject: (e: Error) => void } | null>(null);

  useEffect(() => {
    if (!isHydrated) return;
    if (autoStartedRef.current) return;
    if (isRunning) return;
    if (step?.content) return;
    if (!featureBrief.trim()) return;
    autoStartedRef.current = true;
    void executeStep("prd");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated, featureBrief, step?.content]);

  // ── Load persisted version history on hydration ─────────────────────
  useEffect(() => {
    if (!isHydrated || !props.projectSlug) return;
    loadPrdVersions(props.projectSlug).then((versions) => {
      prdHistoryRef.current = versions.map((v: PrdVersion) => ({
        content: v.content,
        savedAt: new Date(v.timestamp),
        label: v.label,
      }));
    }).catch(() => {/* ignore */});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated]);

  // ── Restore persisted PRD-readiness (Validate / Split) on hydration ──
  const readinessHydratedRef = useRef(false);
  useEffect(() => {
    if (!isHydrated || readinessHydratedRef.current) return;
    const r = (useStepStore.getState().steps.prd?.metadata as
      | { prdReadiness?: PrdReadiness }
      | undefined)?.prdReadiness;
    if (r) {
      // Step 2 only unlocks after Step 1, so a persisted split implies both ran.
      if (r.qualityDone || r.subsystemDone) setQualityRan(true);
      if (r.subsystemDone) setSubsystemRan(true);
    }
    readinessHydratedRef.current = true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated]);

  const isThisRunning = isRunning && currentStep === "prd";
  // Keep a stable content ref to bridge the gap between streamingContent cleared
  // (step_complete SSE) and step.content updated (agent return).
  const lastContentRef = useRef("");
  if (streamingContent && !isFixModeRef.current) lastContentRef.current = streamingContent;
  if (step?.content && !isThisRunning) lastContentRef.current = step.content;
  // Clear ref when re-gen starts, but NOT in fix mode (we want old content to stay)
  if (isThisRunning && !streamingContent && !isFixModeRef.current) lastContentRef.current = "";
  // In fix mode: show captured pre-fix content so the page doesn't blank out
  const content = (isFixModeRef.current && isThisRunning)
    ? preFixContentRef.current
    : (streamingContent || (!isThisRunning ? step?.content : "") || lastContentRef.current);
  // A large / multi-domain PRD: recommend running Validation + Subsystem Split
  // before continuing (and gate Next Step until both have run).
  const isLargePrd =
    !!content &&
    (content.split("\n").length >= 1500 ||
      (content.match(/^##\s+\S/gm)?.length ?? 0) >= 8);
  // Goal-mode plan (milestones + acceptance commands): coding routes to the
  // single-agent acceptance loop and skips task breakdown / subsystem split,
  // so the large-PRD "Prepare PRD" (Validate + Split) prerequisite is moot.
  const isGoalModePlan = !!content && hasPlanSignals(content).detected;
  const isDone = step?.status === "completed" && Boolean(step?.content?.trim());
  const error = step?.status === "failed" ? step.error : null;
  // Derive version count from step metadata (reactive via zustand)
  const prdVersions = (step?.metadata as { prdVersions?: PrdVersion[] } | undefined)?.prdVersions ?? [];
  const versionCount = prdVersions.length;

  // On hydration, if PRD already exists, sync tier to nav store in case it was
  // never persisted (e.g. projects created before this fix was deployed).
  useEffect(() => {
    if (!isHydrated || !isDone || isThisRunning) return;
    const existing = step?.content ?? "";
    if (!existing) return;
    const tierMatch = existing.match(/\*\*Project Tier:\s*([SML])\*\*/i);
    if (!tierMatch) return;
    const parsedTier = tierMatch[1].toUpperCase() as ProjectTier;
    const navStore = useStepNavigationStore.getState();
    if (navStore.tier !== parsedTier) {
      navStore.setTier(parsedTier);
      const slug = props.projectSlug;
      if (slug) {
        fetch(`/api/projects/${slug}/step-navigation`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tier: parsedTier }),
        }).catch((err) => console.error("[PrdUI] hydration tier persist error:", err));
      }
    }
    // Also keep step-store.tier in sync so executeStep's ctx.tier reflects
    // the PRD-declared tier (defense in depth — engine also derives ctx.tier
    // from PRD content directly).
    const stepStore = useStepStore.getState();
    if (stepStore.tier !== parsedTier) stepStore.setTier(parsedTier);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated, isDone]);

  // Track whether this session freshly executed the step (vs restored from hydration)
  const wasRunningRef = useRef(false);
  if (isThisRunning) wasRunningRef.current = true;

  // Detect fix completion and resolve/reject the directFix() Promise.
  useEffect(() => {
    if (!isThisRunning && fixResolveRef.current) {
      if (step?.status === "failed") {
        fixResolveRef.current.reject(new Error(step.error ?? "Fix failed"));
      } else {
        fixResolveRef.current.resolve();
      }
      fixResolveRef.current = null;
      setIsFixMode(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isThisRunning]);

  // Auto-scroll to bottom during SSE streaming, but not while fixing
  // (the page should stay at the user's current scroll position during a fix)
  useEffect(() => {
    if (isThisRunning && content && !isFixModeRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [content, isThisRunning]);

  useEffect(() => {
    const justCompleted = isDone && !prevIsDoneRef.current;
    if (justCompleted) {
      // Strip the patch-highlight markers before persisting to history so
      // the version diff stays clean.
      const finalContent = stripChangeMarkers(step?.content ?? "");
      // Skip persistence while a patch edit is awaiting inline accept/reject —
      // the diff-marked content is a transient proposal, not the final PRD.
      // persistPrd() finalises once the user resolves the last hunk.
      if (finalContent && !hasPrdDiffMarkers(step?.content ?? "")) {
        const versionNum = prdHistoryRef.current.length + 1;
        const label = versionNum === 1 ? "Initial" : "Edited";
        prdHistoryRef.current = [...prdHistoryRef.current, { content: finalContent, savedAt: new Date(), label: `v${versionNum} · ${label}` }];
        // Persist version to DB
        if (props.projectSlug) {
          savePrdVersion(props.projectSlug, finalContent, label).catch(() => {});
        }

        // Parse Project Tier badge from PRD content and sync to navigation store + DB.
        // The PRD may contain "**Project Tier: S**" or "**Project Tier: M**" etc.
        const tierMatch = finalContent.match(/\*\*Project Tier:\s*([SML])\*\*/i);
        if (tierMatch) {
          const parsedTier = tierMatch[1].toUpperCase() as ProjectTier;
          const navStore = useStepNavigationStore.getState();
          // Keep step-store.tier in sync too — every executeStep call reads
          // ctx.tier from there.
          const stepStore = useStepStore.getState();
          if (stepStore.tier !== parsedTier) stepStore.setTier(parsedTier);
          if (navStore.tier !== parsedTier) {
            navStore.setTier(parsedTier);
            // Persist to DB so the tier survives page refresh
            const slug = props.projectSlug;
            if (slug) {
              fetch(`/api/projects/${slug}/step-navigation`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tier: parsedTier }),
              }).catch((err) => console.error("[PrdUI] tier persist error:", err));
            }
          }
        }
      }
    }
    prevIsDoneRef.current = isDone;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDone]);

  // ── 8-second confirm cooldown after fresh SSE completion ─────────────
  useEffect(() => {
    const justCompleted = isDone && !prevIsDoneRef.current;
    if (justCompleted && wasRunningRef.current) {
      setConfirmCooldown(true);
      cooldownTimerRef.current = setTimeout(() => setConfirmCooldown(false), 8000);
    }
    return () => {
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDone]);

  // ── Persist PRD.md to disk immediately on completion ──────────────────
  useEffect(() => {
    if (!isDone || !step?.content) return;
    // Only save when this session actually ran the step (not on mount with old data)
    if (!wasRunningRef.current) {
      return;
    }
    // Don't write to disk while a patch edit awaits inline accept/reject — the
    // diff-marked content is transient. persistPrd() saves once resolved.
    if (hasPrdDiffMarkers(step.content)) return;
    setIsSavingDoc(true);
    const codeOutputDir = useStepStore.getState().codeOutputDir;
    fetch("/api/agents/save-doc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Strip the patch-highlight wrapper from the file written to disk —
      // the markers are UI-only.
      body: JSON.stringify({
        docId: "prd",
        content: stripChangeMarkers(step.content),
        codeOutputDir,
      }),
    })
      .then((res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .catch((err) => { console.error("[PrdUI] Failed to save PRD.md", err); })
      .finally(() => {
        setIsSavingDoc(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDone]);

  // ── Manual edit handlers ────────────────────────────────────────────
  const startManualEdit = () => {
    if (!isDone || isThisRunning || isSavingDoc) return;
    // Strip change-highlight markers so the user edits clean markdown.
    setManualDraft(stripChangeMarkers(step?.content ?? ""));
    setManualError(null);
    setShowDiff(false);
    setIsManualEditing(true);
    // Focus + scroll the textarea into view on next paint.
    requestAnimationFrame(() => {
      manualTextareaRef.current?.focus();
      manualTextareaRef.current?.scrollIntoView({ block: "start", behavior: "instant" as ScrollBehavior });
    });
  };

  const cancelManualEdit = () => {
    if (manualSaving) return;
    if (manualDraft !== stripChangeMarkers(step?.content ?? "")) {
      const ok = window.confirm("Discard your unsaved changes?");
      if (!ok) return;
    }
    setIsManualEditing(false);
    setManualDraft("");
    setManualError(null);
  };

  const commitManualEdit = async () => {
    const draft = manualDraft;
    if (!draft.trim()) {
      setManualError("PRD content cannot be empty.");
      return;
    }
    setManualSaving(true);
    setManualError(null);
    try {
      // 1. Update in-memory store immediately so the renderer reflects edits.
      setStepContent("prd", draft);

      // 2. Persist to disk (.blueprint/PRD.md or codeOutputDir).
      const codeOutputDir = useStepStore.getState().codeOutputDir;
      const res = await fetch("/api/agents/save-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docId: "prd", content: draft, codeOutputDir }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // 3. Push a manual-edit snapshot into version history.
      const versionNum = prdHistoryRef.current.length + 1;
      prdHistoryRef.current = [
        ...prdHistoryRef.current,
        { content: draft, savedAt: new Date(), label: `v${versionNum} · Manual edit` },
      ];
      if (props.projectSlug) {
        savePrdVersion(props.projectSlug, draft, "Manual edit").catch(() => {});
      }

      // 4. Sync tier badge if the user added/changed it.
      const tierMatch = draft.match(/\*\*Project Tier:\s*([SML])\*\*/i);
      if (tierMatch) {
        const parsedTier = tierMatch[1].toUpperCase() as ProjectTier;
        const navStore = useStepNavigationStore.getState();
        const stepStore = useStepStore.getState();
        if (stepStore.tier !== parsedTier) stepStore.setTier(parsedTier);
        if (navStore.tier !== parsedTier) {
          navStore.setTier(parsedTier);
          const slug = props.projectSlug;
          if (slug) {
            fetch(`/api/projects/${slug}/step-navigation`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tier: parsedTier }),
            }).catch(() => {});
          }
        }
      }

      setIsManualEditing(false);
      setManualDraft("");
    } catch (err) {
      setManualError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setManualSaving(false);
    }
  };

  // Warn before navigating away with unsaved edits.
  useEffect(() => {
    if (!isManualEditing) return;
    const dirty = manualDraft !== stripChangeMarkers(step?.content ?? "");
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isManualEditing, manualDraft, step?.content]);

  const handleDownloadPdf = () => {
    if (!content || isPrinting || !contentRef.current) return;
    setIsPrinting(true);
    Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]).then(async ([html2canvasMod, { jsPDF }]) => {
      const html2canvas = html2canvasMod.default;
      // Extract the rendered HTML content and re-render in a clean iframe
      // to avoid html2canvas choking on lab() colors in the page's stylesheets.
      const sourceHtml = contentRef.current!.innerHTML.replace(/<!--PRD-DIFF:[^>]*-->/g, "");
      const iframe = document.createElement("iframe");
      iframe.style.cssText = "position:fixed;left:0;top:0;z-index:-1;pointer-events:none;width:800px;height:1200px;border:none";
      document.body.appendChild(iframe);
      const doc = iframe.contentDocument!;
      doc.open();
      doc.write(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#1f2328;background:#fff;padding:40px}
        h1{font-size:1.8em;font-weight:600;border-bottom:1px solid #d0d7de;padding-bottom:.3em;margin:1em 0 .5em}
        h2{font-size:1.5em;font-weight:600;border-bottom:1px solid #d0d7de;padding-bottom:.3em;margin:1em 0 .5em}
        h3{font-size:1.25em;font-weight:600;margin:1em 0 .5em}
        h4{font-size:1em;font-weight:600;margin:1em 0 .4em}
        p{margin:0 0 .8em}
        ul,ol{padding-left:1.8em;margin:0 0 .8em}
        li+li{margin-top:.2em}
        code{font-family:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,monospace;font-size:.85em;background:#f6f8fa;border:1px solid rgba(175,184,193,.2);border-radius:6px;padding:.2em .4em}
        pre{background:#f6f8fa;border:1px solid #d0d7de;border-radius:6px;padding:16px;overflow-x:auto;margin:0 0 .8em}
        pre code{background:none;border:none;padding:0;font-size:13px}
        table{border-collapse:collapse;width:100%;margin:0 0 .8em}
        th,td{border:1px solid #d0d7de;padding:8px 12px;text-align:left}
        th{background:#f6f8fa}
        blockquote{border-left:4px solid #d0d7de;color:#57606a;margin:0 0 .8em;padding:0 1em}
        img{max-width:100%}
        hr{border:none;border-top:1px solid #d0d7de;margin:1.5em 0}
      </style></head><body>${sourceHtml}</body></html>`);
      doc.close();
      // Wait for iframe content to render
      await new Promise((r) => setTimeout(r, 150));
      const canvas = await html2canvas(doc.body, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });
      document.body.removeChild(iframe);
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const usableW = pdfW - margin * 2;
      const usableH = pdfH - margin * 2;
      const ratio = usableW / canvas.width;
      const imgH = canvas.height * ratio;
      let remainingH = imgH;
      let srcY = 0;
      let page = 0;
      while (remainingH > 0) {
        if (page > 0) pdf.addPage();
        const pageH = Math.min(remainingH, usableH);
        const canvasPageH = pageH / ratio;
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = canvasPageH;
        const ctx = pageCanvas.getContext("2d")!;
        ctx.drawImage(canvas, 0, srcY, canvas.width, canvasPageH, 0, 0, canvas.width, canvasPageH);
        pdf.addImage(pageCanvas.toDataURL("image/png"), "PNG", margin, margin, usableW, pageH);
        srcY += canvasPageH;
        remainingH -= pageH;
        page++;
      }
      pdf.save(`PRD-${new Date().toISOString().slice(0, 10)}.pdf`);
    }).catch((err) => { console.error("[PrdUI] PDF failed", err); })
      .finally(() => setIsPrinting(false));
  };

  const handleTabChange = (tab: DocTab) => { if (tab !== "prd") props.onNavigate(tab); };

  // ── Manual tier override ────────────────────────────────────────────
  // Set S/M/L explicitly. Syncs the nav + step stores and the DB, and
  // rewrites the PRD's `**Project Tier**` badge (authoritative downstream) so
  // gating for TRD / SysDesign / DDD subsystem-split updates immediately.
  const changeTier = (t: ProjectTier) => {
    if (t === tier || isThisRunning) return;
    useStepNavigationStore.getState().setTier(t);
    useStepStore.getState().setTier(t);
    if (props.projectSlug) {
      fetch(`/api/projects/${props.projectSlug}/step-navigation`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: t }),
      }).catch(() => {});
    }
    const cur = step?.content ?? "";
    if (cur) {
      const updated = setTierBadge(cur, t);
      if (updated !== cur) {
        setStepContent("prd", updated);
        const codeOutputDir = useStepStore.getState().codeOutputDir;
        fetch("/api/agents/save-doc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            docId: "prd",
            content: stripChangeMarkers(updated),
            codeOutputDir,
          }),
        }).catch(() => {});
      }
    }
  };

  // Regenerate the whole PRD at the currently selected tier (the classifier
  // honors the badge we just wrote). Overwrites the current PRD.
  const regenerateAtTier = () => {
    if (isThisRunning || confirmCooldown) return;
    const ok = window.confirm(
      `Regenerate PRD at tier ${tier}? Current PRD content will be overwritten.`,
    );
    if (!ok) return;
    setShowDiff(false);
    void executeStep("prd");
  };

  // ── Selection → edit target ─────────────────────────────────────────
  // When the user highlights text inside the rendered PRD, capture it as the
  // edit target. They then type WHAT to change in the input; the selection
  // tells the agent WHERE (which span/section) to confine the patch.
  const handlePrdMouseUp = () => {
    if (isManualEditing || isThisRunning) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const text = sel.toString().trim();
    if (text.length < 3) return;
    if (!sel.anchorNode || !contentRef.current?.contains(sel.anchorNode)) return;
    setSelectionTarget(text);
  };

  // Compose the edit instruction sent to the agent. When a selection is
  // present, demarcate it so the patch prompt anchors on that exact span.
  const buildEditInstruction = (instruction: string, selection: string): string =>
    selection
      ? `【selected excerpt — modify ONLY this part, leave the rest of its section intact】\n"""\n${selection}\n"""\n\n【change requested】\n${instruction}`
      : instruction;

  // Directly triggers a PRD fix without pre-filling the edit bar.
  // Returns a Promise that resolves when the fix generation completes.
  const directFix = (instruction: string): Promise<void> => {
    // Strip pending diff markers so they don't render as raw text while the fix runs
    preFixContentRef.current = stripChangeMarkers(step?.content ?? lastContentRef.current ?? "");
    setIsFixMode(true);
    setPrepOpen(false);
    const full = buildEditInstruction(instruction, "");
    return new Promise<void>((resolve, reject) => {
      fixResolveRef.current = { resolve, reject };
      void executeStep("prd", full);
    });
  };

  const submitEdit = () => {
    const instruction = editInput.trim();
    if (!instruction || isThisRunning || confirmCooldown) return;
    const full = buildEditInstruction(instruction, selectionTarget.trim());
    setEditInput("");
    setSelectionTarget("");
    setShowDiff(false);
    void executeStep("prd", full);
  };

  // ── Inline diff review: per-hunk accept/reject ──────────────────────
  // Finalise once the last hunk is resolved: write to disk + push a version.
  const persistResolvedPrd = (finalContent: string) => {
    const versionNum = prdHistoryRef.current.length + 1;
    prdHistoryRef.current = [
      ...prdHistoryRef.current,
      { content: finalContent, savedAt: new Date(), label: `v${versionNum} · Edited` },
    ];
    if (props.projectSlug) {
      savePrdVersion(props.projectSlug, finalContent, "Edited").catch(() => {});
    }
    const codeOutputDir = useStepStore.getState().codeOutputDir;
    fetch("/api/agents/save-doc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ docId: "prd", content: finalContent, codeOutputDir }),
    }).catch((err) => console.error("[PrdUI] Failed to save PRD.md", err));
    // Keep tier badge in sync if the edit touched it.
    const tierMatch = finalContent.match(/\*\*Project Tier:\s*([SML])\*\*/i);
    if (tierMatch) {
      const parsedTier = tierMatch[1].toUpperCase() as ProjectTier;
      const stepStore = useStepStore.getState();
      if (stepStore.tier !== parsedTier) stepStore.setTier(parsedTier);
    }
  };

  const applyDiffResolution = (resolved: string) => {
    // When no complete diff blocks remain, any leftover <!--PRD-DIFF:...--> markers
    // are orphans (from nested-diff edge cases where the lazy regex matched the wrong
    // SEP/END boundary). Strip them so they don't render as visible text.
    const next = hasPrdDiffMarkers(resolved)
      ? resolved
      : resolved.replace(/<!--PRD-DIFF:[^>]*-->/g, "");
    setStepContent("prd", next);
    // When no diff blocks remain, the proposal is fully resolved → finalise.
    if (!hasPrdDiffMarkers(next)) {
      persistResolvedPrd(stripChangeMarkers(next));
    }
  };
  const onAcceptHunk = (id: string) =>
    applyDiffResolution(resolvePrdDiff(step?.content ?? "", id, "accept"));
  const onRejectHunk = (id: string) =>
    applyDiffResolution(resolvePrdDiff(step?.content ?? "", id, "reject"));
  const onAcceptAll = () =>
    applyDiffResolution(resolveAllPrdDiff(step?.content ?? "", "accept"));
  const onRejectAll = () =>
    applyDiffResolution(resolveAllPrdDiff(step?.content ?? "", "reject"));

  const pendingDiff = !isThisRunning && hasPrdDiffMarkers(content);

  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden">
      {/* Floating "Fixing…" toast — visible while directFix() runs */}
      {isFixMode && isThisRunning && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-full shadow-lg text-[13px] font-medium pointer-events-none select-none">
          <SpinnerIcon /> Fixing…
        </div>
      )}
      {!isManualEditing && isGoalModePlan && (
        <div className="flex items-center gap-3 px-8 py-3 border-b border-indigo-200 bg-indigo-50 shrink-0">
          <ShieldCheck size={16} className="text-indigo-600 shrink-0" />
          <span className="text-[13px] text-indigo-800">
            Goal-mode plan detected (milestones + acceptance commands) — coding runs the agentic acceptance loop. <b>Prepare PRD</b> (validate / split) is not required.
          </span>
        </div>
      )}
      {!isManualEditing && isLargePrd && !isGoalModePlan && (
        <div className="flex items-center gap-3 px-8 py-3 border-b border-amber-200 bg-amber-50 shrink-0">
          <AlertTriangle size={16} className="text-amber-600 shrink-0" />
          <span className="text-[13px] text-amber-800">
            This PRD is large — running the 2-step <b>Prepare PRD</b> flow (validate, then split into subsystems) is recommended, but optional. You can proceed without it.
          </span>
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-slate-500">
              {qualityRan ? "✓" : "○"} Validate · {subsystemRan ? "✓" : "○"} Split
            </span>
            <button
              type="button"
              onClick={() => setPrepOpen(true)}
              className={`flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-semibold border ${
                qualityRan && subsystemRan
                  ? "border-green-300 text-green-700 bg-green-50"
                  : "border-amber-400 text-white bg-amber-500 hover:bg-amber-600"
              }`}
            >
              <ShieldCheck size={15} /> {qualityRan && subsystemRan ? "Prepared ✓" : "Prepare PRD"}
            </button>
          </div>
        </div>
      )}
      <div className="flex-1 overflow-auto px-8 py-8">
        <div className="w-full h-full">
          {showDiff ? (
            <DiffPanel history={prdHistoryRef.current.slice(0, -1)} currentContent={prdHistoryRef.current[prdHistoryRef.current.length - 1]?.content ?? content} onClose={() => setShowDiff(false)} />
          ) : (
          <div className="bg-white border border-[#e2e8f0] rounded-[4px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="bg-[rgba(248,250,252,0.5)] border-b border-[#f1f5f9] px-8 pt-8 pb-[33px] flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-indigo-50 text-indigo-600 text-[12px] font-normal px-2 py-[2px] rounded-[2px] font-['Space_Grotesk',sans-serif]">{isThisRunning ? "GENERATING…" : isDone ? "DRAFT V1.0" : "PENDING"}</span>
                  {isDone && (
                    <div
                      className="flex items-center gap-1"
                      title="Project tier. Tier L generates TRD / system design and enables DDD subsystem split. Change tier then click Regenerate to rewrite the PRD at that level."
                    >
                      <span className="text-[10px] text-slate-400 mr-0.5">TIER</span>
                      {(["S", "M", "L"] as ProjectTier[]).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => changeTier(t)}
                          disabled={isThisRunning}
                          className={`text-[11px] font-semibold px-2 py-[2px] rounded-[3px] border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                            tier === t
                              ? t === "S"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                : t === "M"
                                  ? "bg-blue-50 text-blue-700 border-blue-300"
                                  : "bg-orange-50 text-orange-700 border-orange-300"
                              : "bg-white text-slate-400 border-slate-200 hover:bg-slate-50 hover:text-slate-600"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={regenerateAtTier}
                        disabled={isThisRunning || confirmCooldown}
                        className="ml-1 text-[11px] font-medium px-2 py-[2px] rounded-[3px] text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Regenerate the full PRD at the current tier (overwrites current content)"
                      >
                        Regenerate
                      </button>
                    </div>
                  )}
                  {isDone && <span className="text-[#94a3b8] text-[12px]">{step?.durationMs != null ? `Generated in ${(step.durationMs / 1000).toFixed(1)}s` : "Just now"}</span>}
                </div>
                <h2 className="text-[30px] font-semibold text-[#0f172a] tracking-[-0.3px] leading-[36px]">Product Requirements Document</h2>
                <p className="text-[14px] text-[#64748b] leading-[21px]">{step?.model ? <>Generated by <span className="font-medium">{step.model}</span></> : "Full PRD — user stories, acceptance criteria, and scope"}</p>
                {isDone && <div className="flex items-center gap-4 mt-1">{step?.costUsd != null && <span className="text-[11px] text-[#94a3b8]">Cost: <span className="font-medium text-[#64748b]">${step.costUsd.toFixed(4)}</span></span>}</div>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {versionCount > 1 && <button onClick={() => setShowDiff(true)} disabled={isManualEditing} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors mr-1 disabled:opacity-40" title="View version history & diff"><History size={13} />{versionCount} versions</button>}
                {!isManualEditing && (
                  <button
                    onClick={startManualEdit}
                    disabled={!isDone || isThisRunning || isSavingDoc}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Edit raw markdown"
                  >
                    <Pencil size={12} /> Edit
                  </button>
                )}
                <button onClick={handleDownloadPdf} disabled={!isDone || isPrinting || isManualEditing} className="flex items-center justify-center p-1.5 rounded-md text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed" title="Download PDF">{isPrinting ? <SpinnerIcon /> : <DownloadIcon />}</button>
              </div>
            </div>
            <div className="p-8" ref={contentRef} onMouseUp={handlePrdMouseUp}>
              {isManualEditing ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between text-[12px] text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <Pencil size={12} className="text-indigo-600" />
                      Editing raw markdown — changes are saved to <code className="px-1 py-[1px] rounded bg-slate-100 text-slate-700">PRD.md</code> on Save.
                    </span>
                    <span className="text-[11px] text-slate-400">{manualDraft.length.toLocaleString()} chars</span>
                  </div>
                  <textarea
                    ref={manualTextareaRef}
                    value={manualDraft}
                    onChange={(e) => setManualDraft(e.target.value)}
                    spellCheck={false}
                    disabled={manualSaving}
                    className="w-full min-h-[60vh] resize-y font-mono text-[13px] leading-[1.6] text-[#1f2328] bg-white border border-slate-200 rounded-md p-4 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 disabled:bg-slate-50"
                  />
                  {manualError && (
                    <div className="text-[12px] text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
                      {manualError}
                    </div>
                  )}
                </div>
              ) : error ? <div className="flex flex-col items-center justify-center py-20 gap-3 text-red-500"><span className="text-[13px]">{error}</span></div>
              : !content && !isThisRunning ? <div className="flex flex-col items-center justify-center py-20 gap-3 text-[#94a3b8]"><span className="text-[13px]">Waiting for pipeline to start…</span></div>
              : isThisRunning && !content && !isFixMode ? <div className="flex items-center gap-2 text-indigo-600 text-[13px]"><SpinnerIcon /> Generating PRD…</div>
              : pendingDiff ? (
                <div>
                  {/* Inline-diff review bar — original doc stays visible; each
                      change is reviewed in place (Cursor-style). */}
                  <div className="sticky top-0 z-10 mb-3 flex items-center gap-3 px-3 py-2 bg-indigo-50/95 backdrop-blur border border-indigo-100 rounded-md">
                    <span className="text-[12px] font-medium text-indigo-700">Pending changes — accept ✓ / reject ✗ each, or:</span>
                    <div className="ml-auto flex items-center gap-2">
                      <button onClick={onRejectAll} className="text-[12px] font-medium px-2.5 py-1 rounded text-red-600 bg-white border border-red-200 hover:bg-red-50 transition-colors">Reject All</button>
                      <button onClick={onAcceptAll} className="text-[12px] font-medium px-2.5 py-1 rounded text-white bg-green-600 hover:bg-green-500 transition-colors">Accept All</button>
                    </div>
                  </div>
                  {parsePrdDiffSegments(content).map((seg, i) =>
                    seg.type === "md"
                      ? <MarkdownRenderer key={i} content={stripDiffMarkers(seg.text)} variant="prd" skipMermaid={true} />
                      : <PrdDiffHunk key={i} id={seg.id} oldBody={seg.oldBody} newBody={seg.newBody} onAccept={onAcceptHunk} onReject={onRejectHunk} />,
                  )}
                </div>
              )
              : <MarkdownRenderer content={stripDiffMarkers(content)} variant="prd" skipMermaid={true} />}
            <div ref={bottomRef} />
            </div>
          </div>
          )}
        </div>
      </div>

      {!isManualEditing && content?.trim() && (
        <PrdToolDrawer
          open={prepOpen}
          onClose={() => setPrepOpen(false)}
          title="Prepare PRD"
          icon={<ShieldCheck size={16} className="text-indigo-600" />}
        >
          <PrdReadinessPanel
            prd={stripChangeMarkers(content)}
            spec={(step?.metadata as { prdSpec?: PrdSpec } | undefined)?.prdSpec ?? null}
            projectSlug={props.projectSlug}
            initialReadiness={
              (step?.metadata as { prdReadiness?: PrdReadiness } | undefined)
                ?.prdReadiness ?? null
            }
            onQualityResult={() => setQualityRan(true)}
            onSubsystemResult={() => setSubsystemRan(true)}
            onDirectFix={directFix}
          />
        </PrdToolDrawer>
      )}

      {isManualEditing ? (
        <div className="flex items-center justify-end gap-3 px-8 py-4 border-t border-slate-200 bg-white">
          <span className="text-[12px] text-slate-500 mr-auto">
            {manualSaving ? "Saving…" : manualDraft !== stripChangeMarkers(step?.content ?? "") ? "Unsaved changes" : "No changes"}
          </span>
          <button
            type="button"
            onClick={cancelManualEdit}
            disabled={manualSaving}
            className="px-4 h-10 rounded-lg text-[#475569] hover:bg-slate-100 text-sm font-medium disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void commitManualEdit()}
            disabled={manualSaving || !manualDraft.trim() || manualDraft === stripChangeMarkers(step?.content ?? "")}
            className="flex items-center gap-2 px-4 h-10 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 shadow-md hover:shadow-indigo-200 hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Check size={14} />
            {manualSaving ? "Saving…" : "Save"}
          </button>
        </div>
      ) : (
      <div className="flex flex-col">
        {selectionTarget && (
          <div className="flex items-start gap-2 px-8 pt-3 pb-1 bg-white border-t border-slate-100">
            <span className="shrink-0 mt-1 text-[11px] font-semibold text-indigo-600">Editing selection</span>
            <span
              className="flex-1 min-w-0 text-[12px] text-slate-600 bg-indigo-50/60 border border-indigo-100 rounded px-2 py-1 line-clamp-2 break-words"
              title={selectionTarget}
            >
              “{selectionTarget.length > 160 ? selectionTarget.slice(0, 160) + "…" : selectionTarget}”
            </span>
            <button
              type="button"
              onClick={() => setSelectionTarget("")}
              className="shrink-0 mt-0.5 p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              title="Clear selection"
            >
              <X size={13} />
            </button>
          </div>
        )}
      <StageInputBar
        value={editInput} onChange={setEditInput}
        onSubmit={submitEdit}
        placeholder={selectionTarget ? "Describe the changes to make to the selected text…" : "Ask AgenticBuilder to edit this PRD…"} disabled={isThisRunning || confirmCooldown}
        actions={<div className="flex items-center gap-3 shrink-0">
          {error && !isThisRunning && (
            <span className="text-[12px] text-red-600 max-w-[220px] truncate" title={error}>{error}</span>
          )}
          <button title={pendingDiff ? "Accept or reject pending changes first" : undefined} disabled={isThisRunning || isSavingDoc || confirmCooldown || pendingDiff} onClick={async () => {
          // Await memory capture BEFORE navigating so the fetch is never
          // interrupted by handleStepChange's store reset + snapshot reload.
          const finalContent = stripChangeMarkers(step?.content ?? "");
          const captureSessionId =
            kickoffSessionId ?? props.projectSlug ?? `prd-cap-${Date.now()}`;
          if (finalContent) {
            const originalContent = prdHistoryRef.current[0]?.content ?? finalContent;
            try {
              const res = await fetch("/api/memory/prd/capture", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  sessionId: captureSessionId,
                  originalPrd: originalContent,
                  finalPrd: finalContent,
                  tier,
                  projectType: intentMeta?.classification?.type ?? "unknown",
                }),
              });
              const data = await res.json().catch(() => ({}));
              if (data?.skipped) console.warn("[PrdUI] memory capture skipped:", data.reason ?? data.error);
              else console.log("[PrdUI] memory capture ok:", data?.outcome, data?.recordId);
            } catch (err) {
              console.warn("[PrdUI] memory capture fetch error:", err);
            }
          }
          if (nextStep) props.onNavigate(nextStep);
        }} className="flex items-center gap-2 text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg h-10 px-4 shrink-0 text-sm font-semibold shadow-md hover:shadow-indigo-200 hover:shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100">{isSavingDoc ? "Saving PRD…" : confirmCooldown ? "Reviewing…" : "Next Step"}{!isSavingDoc && !confirmCooldown && <ArrowRight size={16} color="white" />}</button></div>}
      />
      </div>
      )}
    </div>
  );
}
