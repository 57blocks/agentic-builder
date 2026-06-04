"use client";

import { Fragment, useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronRight, Upload, Plus, RefreshCw, Bug,
  CheckCircle2, AlertCircle, Clock, Loader2, X,
  FileCode, ChevronDown,
} from "lucide-react";
import { usePipelineStore } from "@/store/pipeline-store";
import type { StepId } from "@/_config/pipeline-flow";
import type { BugReport } from "@/lib/pipeline/bug-fix-session";
import type { BugFixCheckpoint } from "@/lib/pipeline/bug-fix-checkpoint";
import type { BugAnalysisResult } from "@/lib/pipeline/bug-fix-analysis";
import type { BugVerificationResult } from "@/lib/pipeline/bug-fix-verify";
import type { E2eProgressEvent } from "@/lib/pipeline/bug-fix-e2e-verify";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LogEntry { timestamp: string; text: string; kind: "info" | "success" | "error" | "dim" }
interface BugFixResult { fixedBugIds: string[]; failedBugIds: string[]; generatedFiles: string[]; costUsd: number }
type BugStatus = "pending" | "running" | "fixed" | "failed";

interface BugRow extends BugReport {
  status: BugStatus;
  generatedFiles?: string[];
  currentLog?: string;
  logs?: BugLogEntry[];
  costUsd?: number;
  tokens?: { promptTokens: number; completionTokens: number; totalTokens: number };
  validationWarnings?: string[];
  analysis?: BugAnalysisResult;
  analyzing?: boolean;
  verification?: BugVerificationResult;
  verifying?: boolean;
  e2eVerification?: BugVerificationResult;
  e2eTesting?: boolean;
}

interface BugLogEntry {
  kind: "read" | "write" | "info" | "error" | "done";
  text: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function logKindFromEvent(event: string): LogEntry["kind"] {
  if (event === "fix_done" || event === "session_done") return "success";
  if (event === "fix_error" || event === "fix_no_output") return "error";
  return "info";
}

function labelFromEvent(event: string, details: Record<string, unknown>): string {
  switch (event) {
    case "session_start":  return `Starting — ${details.total} bug(s)`;
    case "fix_start":      return `[${details.bugId}] Fixing as ${details.role}…`;
    case "fix_done":       return `[${details.bugId}] Fixed — ${details.filesWritten} file(s) written`;
    case "fix_no_output":  return `[${details.bugId}] No files written`;
    case "fix_error":      return `[${details.bugId}] Error: ${details.error}`;
    case "session_done":   return `Done — fixed: ${details.fixed}, failed: ${details.failed}, $${Number(details.costUsd).toFixed(4)}`;
    default:               return event;
  }
}

const VERDICT_BADGE: Record<BugVerificationResult["verdict"], { label: string; cls: string }> = {
  fixed:     { label: "AI: Fixed",     cls: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  partial:   { label: "AI: Partial",   cls: "bg-amber-50 text-amber-700 border border-amber-200" },
  not_fixed: { label: "AI: Not Fixed", cls: "bg-red-50 text-red-700 border border-red-200" },
  uncertain: { label: "AI: Uncertain", cls: "bg-slate-50 text-slate-500 border border-slate-200" },
};

const ROLE_COLOR: Record<string, string> = {
  frontend: "bg-indigo-50 text-indigo-700",
  backend:  "bg-blue-50 text-blue-700",
};

const STATUS_BADGE: Record<BugStatus, { label: string; cls: string; icon: React.ReactNode }> = {
  pending: { label: "Pending", cls: "bg-amber-50 text-amber-700 border border-amber-200",   icon: <Clock size={10} /> },
  running: { label: "Running", cls: "bg-violet-50 text-violet-700 border border-violet-200", icon: <Loader2 size={10} className="animate-spin" /> },
  fixed:   { label: "Fixed",   cls: "bg-emerald-50 text-emerald-700 border border-emerald-200", icon: <CheckCircle2 size={10} /> },
  failed:  { label: "Failed",  cls: "bg-red-50 text-red-700 border border-red-200",          icon: <AlertCircle size={10} /> },
};

const LOG_COLOR: Record<BugLogEntry["kind"], string> = {
  read:  "text-sky-400",
  write: "text-emerald-400",
  info:  "text-[#94a3b8]",
  error: "text-red-400",
  done:  "text-emerald-300",
};
const LOG_PREFIX: Record<BugLogEntry["kind"], string> = {
  read:  "[read] ",
  write: "[write]",
  info:  "[info] ",
  error: "[error]",
  done:  "[done] ",
};

const FRONTEND_KEYWORDS = /\b(component|button|input|form|css|style|modal|dialog|react|dropdown|sidebar|navbar|animation|tooltip|toast|responsive|mobile)\b/i;

const DESCRIPTION_TEMPLATE = `## Steps to Reproduce
1.

## Actual Result


## Expected Result
`;

function estimateRunCost(
  bugCount: number,
  checkpoint: BugFixCheckpoint | null,
): { minUsd: number; maxUsd: number; fromHistory: boolean } {
  const entries = checkpoint?.entries.filter((e) => (e.costUsd ?? 0) > 0) ?? [];
  const fromHistory = entries.length > 0;
  const avgPerBug = fromHistory
    ? entries.reduce((s, e) => s + (e.costUsd ?? 0), 0) / entries.length
    : 0.08;
  const mid = bugCount * avgPerBug;
  return { minUsd: mid * 0.5, maxUsd: mid * 2, fromHistory };
}

function estimateRunMinutes(bugCount: number, checkpoint: BugFixCheckpoint | null): number {
  const concurrency = Math.min(4, bugCount);
  const batches = Math.ceil(bugCount / concurrency);
  if (checkpoint?.startedAt && checkpoint.savedAt && checkpoint.entries.length > 0) {
    const durationMs = new Date(checkpoint.savedAt).getTime() - new Date(checkpoint.startedAt).getTime();
    const avgMsPerBug = durationMs / checkpoint.entries.length;
    return Math.max(1, Math.round((batches * concurrency * avgMsPerBug) / 60_000));
  }
  return batches * 3;
}

const REQUIRED_SECTIONS = [
  { header: "## Steps to Reproduce", label: "Steps to Reproduce" },
  { header: "## Actual Result",      label: "Actual Result" },
  { header: "## Expected Result",    label: "Expected Result" },
];

function validateBugDescription(description: string): string[] {
  const missing: string[] = [];
  for (const { header, label } of REQUIRED_SECTIONS) {
    const idx = description.indexOf(header);
    if (idx === -1) { missing.push(label); continue; }
    const afterHeader = description.slice(idx + header.length);
    const nextSection = afterHeader.indexOf("\n##");
    const body = (nextSection === -1 ? afterHeader : afterHeader.slice(0, nextSection)).trim();
    if (!body) missing.push(label);
  }
  return missing;
}

// ─── CSV / JSON parsers ───────────────────────────────────────────────────────

function parseCsv(text: string): { bugs: BugReport[]; error?: string } {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return { bugs: [], error: "CSV must have a header row and at least one data row." };
  const rawHeaders = lines[0].replace(/^﻿/, "");
  const headers   = rawHeaders.split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, ""));
  const idIdx     = headers.indexOf("id");
  const descIdx   = headers.findIndex((h) => h === "description" || h === "desc");
  const expectIdx = headers.findIndex((h) => h === "expect" || h === "expected");
  const titleIdx  = headers.indexOf("title");
  if (descIdx === -1 && idIdx === -1) return { bugs: [], error: "CSV must have at least a description or id column." };
  const bugs: BugReport[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols    = lines[i].match(/(".*?"|[^,]+)(?=,|$)/g)?.map((c) => c.replace(/^"|"$/g, "").trim()) ?? [];
    const idColVal = idIdx !== -1 ? (cols[idIdx]?.trim() ?? "") : "";
    const desc     = descIdx !== -1 ? (cols[descIdx]?.trim() ?? "") : "";
    const expect   = expectIdx !== -1 ? (cols[expectIdx]?.trim() ?? "") : "";
    const titleCol = titleIdx !== -1 ? (cols[titleIdx]?.trim() ?? "") : "";
    if (!idColVal && !desc) continue;
    const id    = `BUG-${String(bugs.length + 1).padStart(3, "0")}`;
    const title = titleCol || idColVal || desc.slice(0, 80);
    const description = [desc, expect ? `Expected: ${expect}` : ""].filter(Boolean).join("\n\n");
    bugs.push({ id, title, description });
  }
  return { bugs };
}

function parseJson(text: string): { bugs: BugReport[]; error?: string } {
  try {
    const raw = JSON.parse(text);
    const arr: unknown[] = Array.isArray(raw) ? raw : Array.isArray(raw?.bugs) ? raw.bugs : null;
    if (!arr) return { bugs: [], error: "JSON must be an array or { bugs: [] }." };
    const bugs: BugReport[] = arr
      .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
      .map((item, i) => {
        const originalId = item.id != null ? String(item.id) : "";
        const id    = `BUG-${String(i + 1).padStart(3, "0")}`;
        const desc  = String(item.description ?? item.desc ?? "");
        const expect = String(item.expect ?? item.expected ?? "");
        const title = String(item.title ?? "") || originalId || desc.slice(0, 80);
        const description = [desc, expect ? `Expected: ${expect}` : ""].filter(Boolean).join("\n\n");
        return { id, title, description };
      })
      .filter((b) => b.title || b.description);
    if (bugs.length === 0) return { bugs: [], error: "No valid bug entries found." };
    return { bugs };
  } catch {
    return { bugs: [], error: "Invalid JSON." };
  }
}

// ─── Import Dialog ────────────────────────────────────────────────────────────

function ImportDialog({ onImport, onClose }: { onImport: (bugs: BugReport[]) => void; onClose: () => void }) {
  const [tab, setTab] = useState<"json" | "csv">("json");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleParse = () => {
    setError(null);
    const { bugs, error: err } = tab === "json" ? parseJson(text) : parseCsv(text);
    if (err) { setError(err); return; }
    onImport(bugs);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="rounded-xl border border-[#e2e8f0] bg-white shadow-xl" style={{ width: "700px", maxWidth: "95vw" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[#f1f5f9] px-5 py-4">
          <p className="text-[13px] font-semibold text-[#0b1c30]">Bulk Import Bugs</p>
          <button onClick={onClose} className="text-[#94a3b8] hover:text-[#475569]"><X size={14} /></button>
        </div>
        <div className="flex gap-1 border-b border-[#f1f5f9] px-5 pt-3">
          {(["json", "csv"] as const).map((t) => (
            <button key={t} onClick={() => { setTab(t); setText(""); setError(null); }}
              className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-t transition-colors ${tab === t ? "bg-indigo-600 text-white" : "text-[#94a3b8] hover:text-[#475569]"}`}>
              {t}
            </button>
          ))}
        </div>
        <div className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <button onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-md border border-[#e2e8f0] px-3 py-1.5 text-[11px] font-semibold text-[#475569] hover:bg-[#f8fafc] transition-colors">
              <Upload size={11} /> Upload .{tab}
            </button>
            <input ref={fileInputRef} type="file" accept={`.${tab}`} className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const reader = new FileReader();
                reader.onload = (ev) => setText(ev.target?.result as string ?? "");
                reader.readAsText(f);
              }} />
          </div>
          <textarea value={text} onChange={(e) => { setText(e.target.value); setError(null); }} rows={10}
            placeholder={tab === "json"
              ? `[\n  {\n    "id": "BUG-001",\n    "title": "Login button does nothing",\n    "description": "## Steps to Reproduce\\n1. Go to /login\\n2. Click Login\\n\\n## Actual Result\\nNothing happens\\n\\n## Expected Result\\nRedirects to /dashboard"\n  }\n]`
              : `id,title,description\nBUG-001,Login button does nothing,"## Steps to Reproduce\n1. Go to /login\n\n## Actual Result\nNothing happens\n\n## Expected Result\nRedirects to /dashboard"`}
            className="w-full resize-none rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2.5 font-mono text-[11px] text-[#334155] placeholder:text-[#cbd5e1] focus:outline-none focus:ring-1 focus:ring-indigo-400" />
          {error && <p className="text-[11px] text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-[12px] text-[#64748b] hover:bg-[#f8fafc] rounded-md">Cancel</button>
            <button onClick={handleParse} disabled={!text.trim()}
              className="rounded-md bg-indigo-600 px-4 py-1.5 text-[12px] font-semibold text-white hover:bg-indigo-500 disabled:opacity-40 transition-colors">
              Import
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Bug Detail Panel (right side, like TaskDetailPanel in coding stage) ──────

function BugDetailPanel({ row, onClose, onUpdate, outputDir, onRun, running }: {
  row: BugRow;
  onClose: () => void;
  onUpdate: (patch: Partial<BugRow>) => void;
  outputDir: string;
  onRun: () => void;
  running: boolean;
}) {
  const logEndRef = useRef<HTMLDivElement>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [tab, setTab] = useState<"logs" | "files" | "e2e">("logs");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<{ text: string; mode: "diff" | "content" } | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyMsg, setApplyMsg] = useState<string | null>(null);
  const [e2eLogs, setE2eLogs] = useState<BugLogEntry[]>([]);
  const e2eLogEndRef = useRef<HTMLDivElement>(null);

  const applyDiff = useCallback(async (file: string) => {
    setApplying(true);
    setApplyMsg(null);
    try {
      const res = await fetch("/api/agents/bug-fix-apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outputDir, file }),
      });
      const data = await res.json() as { ok: boolean; message?: string; lines?: number; error?: string };
      if (data.ok) {
        setApplyMsg(`✓ Applied — ${data.lines} lines written`);
        // Reload the file content to show the fixed version
        await loadFile(file);
      } else {
        setApplyMsg(data.message ?? data.error ?? "Failed");
      }
    } catch {
      setApplyMsg("Network error");
    } finally {
      setApplying(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outputDir]);

  const loadFile = useCallback(async (file: string) => {
    setSelectedFile(file);
    setFileLoading(true);
    setFileContent(null);
    try {
      const res = await fetch(
        `/api/agents/bug-fix-diff?outputDir=${encodeURIComponent(outputDir)}&file=${encodeURIComponent(file)}`,
      );
      const data = await res.json() as { diff?: string; content?: string; mode?: "diff" | "content"; error?: string };
      if (data.diff) setFileContent({ text: data.diff, mode: "diff" });
      else if (data.content) setFileContent({ text: data.content, mode: "content" });
      else setFileContent({ text: data.error ?? "No content available.", mode: "content" });
    } catch {
      setFileContent({ text: "Failed to load file.", mode: "content" });
    } finally {
      setFileLoading(false);
    }
  }, [outputDir]);

  const runE2eTest = useCallback(async () => {
    onUpdate({ e2eTesting: true, e2eVerification: undefined });
    setE2eLogs([]);
    setTab("e2e");
    const addE2eLog = (entry: BugLogEntry) => {
      setE2eLogs((p) => [...p, entry]);
      setTimeout(() => e2eLogEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    };
    try {
      const res = await fetch("/api/agents/bug-fix-e2e", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bug: { id: row.id, title: row.title, description: row.description } }),
      });
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          const msg = JSON.parse(part.slice(6)) as { type: string; event?: E2eProgressEvent; result?: unknown; error?: string };
          if (msg.type === "progress" && msg.event) {
            const ev = msg.event;
            if (ev.type === "start")       addE2eLog({ kind: "info",  text: ev.message });
            else if (ev.type === "tool_call")   addE2eLog({ kind: "read",  text: `${ev.toolName}  ${JSON.stringify(ev.args).slice(0, 80)}` });
            else if (ev.type === "tool_result") addE2eLog({ kind: ev.ok ? "write" : "error", text: `${ev.toolName}: ${ev.text.slice(0, 200)}` });
            else if (ev.type === "error")       addE2eLog({ kind: "error", text: ev.message });
            else if (ev.type === "verdict")     addE2eLog({ kind: "done",  text: `Verdict: ${ev.verdict.verdict} (${Math.round(ev.verdict.confidence * 100)}%) — ${ev.verdict.reasoning}` });
          } else if (msg.type === "done") {
            onUpdate({ e2eTesting: false, e2eVerification: msg.result as BugVerificationResult });
            addE2eLog({ kind: "done", text: "E2E test complete." });
          } else if (msg.type === "error") {
            addE2eLog({ kind: "error", text: `Fatal: ${msg.error ?? "unknown"}` });
            onUpdate({ e2eTesting: false });
          }
        }
      }
    } catch (err) {
      addE2eLog({ kind: "error", text: err instanceof Error ? err.message : String(err) });
    } finally {
      onUpdate({ e2eTesting: false });
    }
  }, [row.id, row.title, row.description, onUpdate]);

  const logs = row.logs ?? [];
  const badge = STATUS_BADGE[row.status];

  useEffect(() => {
    if (autoScroll) logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs.length, autoScroll]);

  // Switch to logs tab and enable auto-scroll when bug starts running
  useEffect(() => {
    if (row.status === "running") { setTab("logs"); setAutoScroll(true); }
  }, [row.status]);

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-start justify-between px-5 pt-5 pb-4 border-b border-slate-100">
        <div className="flex items-start gap-3 min-w-0">
          <div className="mt-0.5 shrink-0 w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center">
            <Bug size={16} className="text-indigo-500" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">{row.id}</p>
            <h3 className="text-[14px] font-bold text-slate-900 leading-tight line-clamp-2">{row.title || "Untitled"}</h3>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 transition-colors shrink-0 ml-2">
          <X size={14} />
        </button>
      </div>

      {/* Status */}
      <div className="shrink-0 px-5 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ${badge.cls}`}>
            {badge.icon}{badge.label}
          </span>
          {row.costUsd !== undefined && (
            <span className="text-[11px] font-mono text-slate-500">${row.costUsd.toFixed(4)}</span>
          )}
          {row.tokens && (
            <span className="text-[11px] font-mono text-slate-400" title={`Prompt: ${row.tokens.promptTokens.toLocaleString()} / Completion: ${row.tokens.completionTokens.toLocaleString()}`}>
              {row.tokens.totalTokens.toLocaleString()} tokens
            </span>
          )}
        </div>
        {row.analyzing && (
          <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-400">
            <Loader2 size={10} className="animate-spin" /> Analyzing…
          </p>
        )}
        {!row.analyzing && row.analysis && row.analysis.likelyFiles.length > 0 && (
          <div className="mt-1.5">
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-0.5">
              {row.analysis.likelyFiles.length} file{row.analysis.likelyFiles.length > 1 ? "s" : ""} identified · {row.analysis.role}
            </p>
            {row.analysis.likelyFiles.map((f) => (
              <p key={f} className="font-mono text-[10px] text-indigo-500 truncate">{f}</p>
            ))}
          </div>
        )}
        {row.verifying && (
          <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-400">
            <Loader2 size={10} className="animate-spin" /> AI reviewing fix…
          </p>
        )}
        {!row.verifying && row.verification && (
          <div className="mt-1.5 flex items-start gap-2">
            <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full ${VERDICT_BADGE[row.verification.verdict].cls}`}>
              {VERDICT_BADGE[row.verification.verdict].label} · {Math.round(row.verification.confidence * 100)}%
            </span>
            {row.verification.reasoning && (
              <p className="text-[11px] text-slate-400 leading-tight">{row.verification.reasoning}</p>
            )}
          </div>
        )}
        {/* E2E Test button + verdict badge */}
        {row.status === "fixed" && (
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <button
              onClick={runE2eTest}
              disabled={row.e2eTesting}
              className="flex items-center gap-1.5 rounded-md border border-indigo-200 px-2.5 py-1 text-[10px] font-semibold text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 transition-colors"
            >
              {row.e2eTesting ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
              {row.e2eTesting ? "Running…" : "Run E2E Test"}
            </button>
            {row.e2eVerification && (
              <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full ${VERDICT_BADGE[row.e2eVerification.verdict].cls}`}>
                E2E: {VERDICT_BADGE[row.e2eVerification.verdict].label.replace("AI: ", "")} · {Math.round(row.e2eVerification.confidence * 100)}%
              </span>
            )}
          </div>
        )}
        {row.currentLog && row.status === "running" && (
          <p className="mt-1.5 text-[11px] text-slate-400 font-mono truncate">{row.currentLog}</p>
        )}
      </div>

      {/* Edit: title + description */}
      <div className="shrink-0 px-5 py-3 border-b border-slate-100 space-y-2">
        <input value={row.title} onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Bug title"
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[13px] font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-300" />
        <textarea value={row.description} onChange={(e) => onUpdate({ description: e.target.value })} rows={3}
          placeholder="Steps to reproduce…"
          className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-[11px] text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-300" />
      </div>

      {/* Tabs */}
      <div className="shrink-0 flex border-b border-slate-100">
        {([
          { id: "logs",  label: `Real-time Logs${logs.length > 0 ? ` (${logs.length})` : ""}` },
          { id: "files", label: `Files${row.generatedFiles?.length ? ` (${row.generatedFiles.length})` : ""}` },
          ...(e2eLogs.length > 0 || row.e2eTesting ? [{ id: "e2e", label: `E2E${e2eLogs.length > 0 ? ` (${e2eLogs.length})` : ""}` }] : []),
        ] as { id: "logs" | "files" | "e2e"; label: string }[]).map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`relative text-[10px] font-semibold uppercase tracking-wider px-3 py-2 transition-colors ${tab === t.id ? "text-slate-800" : "text-slate-400 hover:text-slate-600"}`}>
            {t.label}
            {tab === t.id && (
              <motion.span layoutId="bug-panel-tab" className="absolute bottom-0 left-0 right-0 h-[2px] bg-indigo-500 rounded-t" />
            )}
          </button>
        ))}
      </div>

      {/* Log terminal */}
      {tab === "logs" && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div
            ref={logContainerRef}
            className="flex-1 bg-[#0d1117] overflow-y-auto p-3 font-mono text-[11px] leading-5 space-y-0.5"
            onScroll={(e) => {
              const el = e.currentTarget;
              setAutoScroll(el.scrollHeight - el.scrollTop - el.clientHeight < 20);
            }}
          >
            {logs.length === 0 ? (
              <span className="text-slate-600 italic">
                {row.status === "pending" ? "Waiting to start…" : "No logs yet…"}
              </span>
            ) : (
              logs.map((l, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className="shrink-0 text-slate-600 w-5 text-right select-none">{String(i + 1).padStart(2, "0")}</span>
                  <span className={`shrink-0 w-14 ${LOG_COLOR[l.kind]}`}>{LOG_PREFIX[l.kind]}</span>
                  <span className={`flex-1 break-all ${LOG_COLOR[l.kind]}`}>{l.text}</span>
                </div>
              ))
            )}
            <div ref={logEndRef} />
          </div>
          <div className="flex items-center justify-between pt-1.5 shrink-0">
            <span className="text-[9px] text-slate-400 uppercase">Auto-scroll {autoScroll ? "ON" : "PAUSED"}</span>
            {row.status === "running" && (
              <span className="text-[9px] font-semibold text-emerald-500">● LIVE</span>
            )}
          </div>
        </div>
      )}

      {/* Files tab */}
      {tab === "files" && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {!row.generatedFiles?.length ? (
            <div className="flex-1 flex items-center justify-center bg-[#0a0d12]">
              <p className="text-[12px] text-slate-600 italic">No files written yet.</p>
            </div>
          ) : (
            <>
              {/* File list */}
              <div className="shrink-0 bg-[#0a0d12] border-b border-slate-800 px-4 py-2 space-y-0.5">
                {row.generatedFiles.map((f) => (
                  <button key={f}
                    onClick={() => loadFile(f)}
                    className={`w-full flex items-center gap-2 px-2 py-1 rounded text-left transition-colors ${selectedFile === f ? "bg-slate-700" : "hover:bg-slate-800"}`}>
                    <FileCode size={11} className="text-emerald-500 shrink-0" />
                    <p className="font-mono text-[11px] text-emerald-300 truncate">{f}</p>
                  </button>
                ))}
              </div>
              {/* File content / diff viewer */}
              <div className="flex-1 overflow-y-auto bg-[#0d1117] px-4 py-3">
                {!selectedFile ? (
                  <p className="text-[11px] text-slate-600 italic">Click a file to view its content.</p>
                ) : fileLoading ? (
                  <p className="text-[11px] text-slate-500 font-mono">Loading…</p>
                ) : fileContent ? (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                        {fileContent.mode === "diff" ? "Git Diff" : "File Content"}
                      </p>
                      {/* Detect if file content is raw diff format (written by mistake) */}
                      {fileContent.mode === "content" &&
                        fileContent.text.includes("@@") &&
                        (fileContent.text.includes("\n+") || fileContent.text.includes("\n-")) && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-amber-400">⚠ File contains raw diff</span>
                          <button
                            onClick={() => applyDiff(selectedFile!)}
                            disabled={applying}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-white disabled:opacity-50 transition-colors"
                          >
                            {applying ? "Applying…" : "Apply Diff"}
                          </button>
                        </div>
                      )}
                    </div>
                    {applyMsg && (
                      <p className={`text-[10px] font-mono mb-2 ${applyMsg.startsWith("✓") ? "text-emerald-400" : "text-red-400"}`}>
                        {applyMsg}
                      </p>
                    )}
                    <pre className="font-mono text-[11px] leading-5 whitespace-pre-wrap break-all">
                      {fileContent.text.split("\n").map((line, i) => (
                        <span key={i} className={`block ${
                          fileContent.mode === "diff"
                            ? line.startsWith("+") && !line.startsWith("+++") ? "text-emerald-400 bg-emerald-950/30"
                            : line.startsWith("-") && !line.startsWith("---") ? "text-red-400 bg-red-950/30"
                            : line.startsWith("@@") ? "text-sky-400"
                            : line.startsWith("diff ") || line.startsWith("index ") ? "text-slate-500"
                            : "text-slate-400"
                            : "text-slate-300"
                        }`}>{line || " "}</span>
                      ))}
                    </pre>
                  </>
                ) : null}
              </div>
            </>
          )}
        </div>
      )}

      {/* E2E log terminal */}
      {tab === "e2e" && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 bg-[#0d1117] overflow-y-auto p-3 font-mono text-[11px] leading-5 space-y-0.5">
            {e2eLogs.length === 0 ? (
              <span className="text-slate-600 italic">No E2E logs yet…</span>
            ) : (
              e2eLogs.map((l, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className="shrink-0 text-slate-600 w-5 text-right select-none">{String(i + 1).padStart(2, "0")}</span>
                  <span className={`shrink-0 w-14 ${LOG_COLOR[l.kind]}`}>{LOG_PREFIX[l.kind]}</span>
                  <span className={`flex-1 break-all ${LOG_COLOR[l.kind]}`}>{l.text}</span>
                </div>
              ))
            )}
            <div ref={e2eLogEndRef} />
          </div>
          {row.e2eTesting && (
            <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-[#0d1117] border-t border-slate-800">
              <Loader2 size={10} className="animate-spin text-indigo-400" />
              <span className="text-[9px] font-semibold text-indigo-400 uppercase">Live</span>
            </div>
          )}
        </div>
      )}

      {/* Run button */}
      {row.status !== "running" && (
        <div className="shrink-0 px-5 py-3 border-t border-slate-100">
          <button
            onClick={onRun}
            disabled={running || !row.description.trim()}
            className="w-full flex items-center justify-center gap-2 py-2 bg-indigo-600 text-white text-[12px] font-semibold rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Bug size={13} />
            {row.status === "fixed" ? "Re-run Fix" : "Run Fix"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function BugFixPanel({ onNavigate }: { onNavigate?: (stepId: StepId) => void }) {
  const featureBrief  = usePipelineStore((s) => s.featureBrief);
  const steps         = usePipelineStore((s) => s.steps);
  const codeOutputDir = usePipelineStore((s) => s.codeOutputDir);
  const addCostUsd    = usePipelineStore((s) => s.addCostUsd);

  const [rows, setRows]             = useState<BugRow[]>([]);
  const [running, setRunning]       = useState(false);
  const [logs, setLogs]             = useState<LogEntry[]>([]);
  const [result, setResult]         = useState<BugFixResult | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checkpoint, setCheckpoint] = useState<BugFixCheckpoint | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [e2eAllRunning, setE2eAllRunning] = useState(false);
  const [e2eAllProgress, setE2eAllProgress] = useState<{ current: number; total: number } | null>(null);
  const [appStatus, setAppStatus] = useState<"unknown" | "running" | "stopped" | "starting">("unknown");
  const [appStarting, setAppStarting] = useState(false);
  const [appLogs, setAppLogs] = useState<string[]>([]);
  const [appError, setAppError] = useState<string | null>(null);
  const [showAppLogs, setShowAppLogs] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  // ── App health polling ────────────────────────────────────────────────────────
  useEffect(() => {
    const e2eBaseUrl = process.env.NEXT_PUBLIC_E2E_BASE_URL ?? "http://localhost:5173";
    const poll = async () => {
      try {
        const res = await fetch(`/api/agents/app-server?baseUrl=${encodeURIComponent(e2eBaseUrl)}`);
        const data = await res.json() as { healthy: boolean; status: string };
        setAppStatus(data.healthy ? "running" : (data.status === "starting" ? "starting" : "stopped"));
      } catch { setAppStatus("unknown"); }
    };
    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, []);

  const handleStartApp = async () => {
    if (!codeOutputDir || appStarting) return;
    setAppStarting(true);
    setAppStatus("starting");
    setAppLogs([]);
    setAppError(null);
    setShowAppLogs(true);
    try {
      const res = await fetch("/api/agents/app-server", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outputDir: codeOutputDir }),
      });
      const reader = res.body?.getReader();
      if (!reader) return;
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n"); buf = parts.pop() ?? "";
        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          const msg = JSON.parse(part.slice(6)) as { type: string; status?: string; line?: string; error?: string };
          if (msg.type === "log" && msg.line) {
            setAppLogs((p) => [...p.slice(-99), msg.line!]);
          } else if (msg.type === "status") {
            const s = msg.status === "running" ? "running" : msg.status === "error" ? "stopped" : "starting";
            setAppStatus(s);
            if (msg.error) setAppError(msg.error);
          } else if (msg.type === "error") {
            setAppError(msg.error ?? "Unknown error");
            setAppStatus("stopped");
          }
        }
      }
    } finally { setAppStarting(false); }
  };

  const handleStopApp = async () => {
    await fetch("/api/agents/app-server", { method: "DELETE" });
    setAppStatus("stopped");
  };

  // ── Auto-save on change ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!codeOutputDir) return;
    const valid = rows.filter((r) => r.id.trim() && r.title.trim());
    if (valid.length === 0) return;
    const timer = setTimeout(() => {
      const entries = valid.map((r) => ({
        bug: r,
        status: r.status === "fixed" ? "fixed" as const : r.status === "failed" ? "failed" as const : "pending" as const,
        generatedFiles: r.generatedFiles ?? [],
      }));
      fetch("/api/agents/bug-fix-checkpoint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outputDir: codeOutputDir, entries }),
      }).catch(() => {});
    }, 800);
    return () => clearTimeout(timer);
  }, [rows, codeOutputDir]);

  // ── Load checkpoint on mount ─────────────────────────────────────────────────
  useEffect(() => {
    if (!codeOutputDir) return;
    fetch(`/api/agents/bug-fix-checkpoint?outputDir=${encodeURIComponent(codeOutputDir)}`)
      .then((r) => r.json())
      .then((data: { checkpoint: BugFixCheckpoint | null }) => {
        if (!data.checkpoint) return;
        setCheckpoint(data.checkpoint);
        const restored: BugRow[] = data.checkpoint.entries
          .filter((e) => e.bug.title.trim() || (e.bug.description.trim() && e.bug.description.trim() !== DESCRIPTION_TEMPLATE.trim()))
          .map((e) => ({
            ...e.bug, status: e.status as BugStatus, generatedFiles: e.generatedFiles, costUsd: e.costUsd, tokens: e.tokens, verification: e.verification, e2eVerification: e.e2eVerification,
          }));
        if (restored.length > 0) setRows(restored);
      })
      .catch(() => {});
  }, [codeOutputDir]);

  const addLog = useCallback((text: string, kind: LogEntry["kind"] = "info") => {
    setLogs((prev) => [...prev, { timestamp: new Date().toISOString(), text, kind }]);
    setTimeout(() => logEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, []);

  const appendBugLog = useCallback((bugId: string, entry: BugLogEntry) => {
    setRows((prev) => prev.map((r) => r.id === bugId
      ? { ...r, currentLog: entry.text, logs: [...(r.logs ?? []), entry] } : r));
  }, []);

  const triggerAnalysis = useCallback(async (bugId: string, bug: BugReport) => {
    if (!codeOutputDir || !bug.title.trim()) return;
    setRows((prev) => prev.map((r) => r.id === bugId ? { ...r, analyzing: true } : r));
    try {
      const res = await fetch("/api/agents/bug-fix-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bug, outputDir: codeOutputDir }),
      });
      if (res.ok) {
        const analysis = await res.json() as BugAnalysisResult;
        setRows((prev) => prev.map((r) => r.id === bugId ? { ...r, analysis, analyzing: false } : r));
      } else {
        setRows((prev) => prev.map((r) => r.id === bugId ? { ...r, analyzing: false } : r));
      }
    } catch {
      setRows((prev) => prev.map((r) => r.id === bugId ? { ...r, analyzing: false } : r));
    }
  }, [codeOutputDir]);

  const addRow = () => {
    const newBug: BugRow = { id: `BUG-${String(rows.length + 1).padStart(3, "0")}`, title: "", description: DESCRIPTION_TEMPLATE, status: "pending" };
    setRows((prev) => [...prev, newBug]);
  };
  const removeRow  = (id: string) => { setRows((prev) => prev.filter((r) => r.id !== id)); if (selectedId === id) setSelectedId(null); setCheckedIds((prev) => { const next = new Set(prev); next.delete(id); return next; }); };
  const updateRow  = (id: string, patch: Partial<BugRow>) => setRows((prev) => prev.map((r) => {
    if (r.id !== id) return r;
    const updated = { ...r, ...patch };
    return { ...updated, validationWarnings: validateBugDescription(updated.description) };
  }));

  const toggleCheck = (id: string) => setCheckedIds((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const checkableRows = rows.filter((r) => r.status !== "running");
  const allChecked = checkableRows.length > 0 && checkableRows.every((r) => checkedIds.has(r.id));
  const someChecked = checkedIds.size > 0;

  const toggleCheckAll = () => {
    if (allChecked) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(checkableRows.map((r) => r.id)));
    }
  };

  const handleBulkRun = () => {
    const targets = rows.filter((r) => checkedIds.has(r.id) && r.status !== "fixed" && r.status !== "running");
    if (targets.length === 0) return;
    setCheckedIds(new Set());
    runBugs(targets);
  };

  const handleBulkDelete = () => {
    setRows((prev) => prev.filter((r) => !checkedIds.has(r.id)));
    if (selectedId && checkedIds.has(selectedId)) setSelectedId(null);
    setCheckedIds(new Set());
  };

  const handleImport = (bugs: BugReport[]) => {
    const newRows = bugs.map((b) => ({ ...b, status: "pending" as const }));
    setRows((prev) => {
      const base = prev.filter((r) => r.title.trim() || r.description.trim());
      return [...base, ...newRows];
    });
    // auto-analyze imported bugs
    newRows.forEach((r) => triggerAnalysis(r.id, r));
  };

  const handleRunSingle = (bugId: string) => {
    const row = rows.find((r) => r.id === bugId);
    if (!row) return;
    runBugs([row]);
  };

  const handleRun = () => {
    const valid = rows.filter((r) => r.id.trim() && r.description.trim() && r.status !== "fixed");
    if (valid.length === 0) return;
    runBugs(valid);
  };

  const runBugs = async (bugsToRun: BugRow[]) => {
    const valid = bugsToRun.filter((r) => r.id.trim() && r.description.trim());
    if (valid.length === 0) return;
    const incomplete = valid.filter((r) => validateBugDescription(r.description).length > 0);
    if (incomplete.length > 0) {
      const names = incomplete.map((r) => r.title || r.id).join(", ");
      const ok = window.confirm(`${incomplete.length} bug(s) 信息不完整（缺少 Steps / Actual / Expected）：${names}\n\n仍要继续修复？`);
      if (!ok) return;
    }
    setRunning(true);
    setLogs([]);
    setResult(null);
    const projectContext = steps.prd?.content || steps.intent?.content || featureBrief || "";
    try {
      const resp = await fetch("/api/agents/bug-fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bugs: valid, outputDir: codeOutputDir, projectContext }),
      });
      if (!resp.ok || !resp.body) { addLog(`Request failed: ${resp.status}`, "error"); return; }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const msg = JSON.parse(line.slice(6));
            if (msg.type === "repair_event") {
              const ev = msg.event as { event: string; stage?: string; taskId?: string; details?: Record<string, unknown> };
              const bugIdFromTask = ev.taskId?.startsWith("T-BUGFIX-") ? ev.taskId.replace("T-BUGFIX-", "") : null;

              if (ev.stage === "worker-codegen" && ev.event === "worker_action" && bugIdFromTask) {
                // Rich AI activity log: what tool the AI called and what it did
                const msg = String(ev.details?.message ?? "");
                const tool = String(ev.details?.tool ?? "");
                const kind: BugLogEntry["kind"] =
                  tool === "write_file" || tool === "apply_patch" ? "write"
                  : tool === "read_file" || tool === "read_many_files" ? "read"
                  : tool === "grep" || tool === "list_files" ? "info"
                  : msg.includes("rejected") ? "error"
                  : "info";
                appendBugLog(bugIdFromTask, { kind, text: msg });
              } else if (ev.stage === "worker-codegen" && ev.event === "file_activity") {
                // still handled but no longer primary — worker_action gives richer info
              } else {
                addLog(labelFromEvent(ev.event, ev.details ?? {}), logKindFromEvent(ev.event));
              }

              if (ev.event === "fix_start") {
                const bugId = ev.details?.bugId as string;
                setRows((prev) => prev.map((r) => r.id === bugId
                  ? { ...r, status: "running", currentLog: "Starting…", logs: [{ kind: "info", text: "Starting…" }] } : r));
                setSelectedId(bugId);
              } else if (ev.event === "fix_done") {
                const bugId = ev.details?.bugId as string;
                const costUsd = ev.details?.costUsd as number | undefined;
                const tokens  = ev.details?.tokens as BugRow["tokens"] | undefined;
                const msg = `Done — ${ev.details?.filesWritten ?? 0} file(s) written${costUsd ? ` · $${costUsd.toFixed(4)}` : ""}`;
                setRows((prev) => prev.map((r) => r.id === bugId
                  ? { ...r, status: "fixed", verifying: true, currentLog: msg, logs: [...(r.logs ?? []), { kind: "done", text: msg }], generatedFiles: ev.details?.files as string[] ?? [], costUsd, tokens } : r));
              } else if (ev.event === "fix_error") {
                const bugId = ev.details?.bugId as string;
                const errMsg = String(ev.details?.error ?? "Error");
                setRows((prev) => prev.map((r) => r.id === bugId
                  ? { ...r, status: "failed", currentLog: errMsg, logs: [...(r.logs ?? []), { kind: "error", text: errMsg }] } : r));
              } else if (ev.event === "fix_no_output") {
                const bugId = ev.details?.bugId as string;
                setRows((prev) => prev.map((r) => r.id === bugId
                  ? { ...r, status: "failed", currentLog: "No files written", logs: [...(r.logs ?? []), { kind: "error", text: "No files written" }] } : r));
              } else if (ev.event === "fix_verified") {
                const bugId     = ev.details?.bugId as string;
                const verdict   = ev.details?.verdict as BugVerificationResult["verdict"];
                const confidence = ev.details?.confidence as number;
                const pct = Math.round(confidence * 100);
                setRows((prev) => prev.map((r) => r.id === bugId
                  ? { ...r, verifying: false, verification: { verdict, confidence, reasoning: "" },
                      logs: [...(r.logs ?? []), { kind: verdict === "fixed" ? "done" : "info", text: `AI review: ${verdict} (${pct}%)` }] } : r));
              }
            } else if (msg.type === "session_id") {
              setActiveSessionId(msg.sessionId as string);
            } else if (msg.type === "done") {
              const doneResult = msg.result as BugFixResult;
              setResult(doneResult);
              if (doneResult.costUsd > 0) addCostUsd(doneResult.costUsd);
              setActiveSessionId(null);
            } else if (msg.type === "aborted") {
              addLog("Session aborted.", "dim");
              setActiveSessionId(null);
            } else if (msg.type === "error") {
              addLog(`Fatal error: ${msg.error}`, "error");
              setActiveSessionId(null);
            }
          } catch { /* skip */ }
        }
      }
    } catch (err) {
      addLog(`Network error: ${err instanceof Error ? err.message : String(err)}`, "error");
    } finally {
      setRunning(false);
      setActiveSessionId(null);
    }
  };

  const handleAbort = async () => {
    if (!activeSessionId) return;
    await fetch(`/api/agents/bug-fix?sessionId=${activeSessionId}`, { method: "DELETE" }).catch(() => {});
    setRunning(false);
    setActiveSessionId(null);
    setRows((prev) => prev.map((r) => r.status === "running" ? { ...r, status: "failed", currentLog: "Aborted" } : r));
  };

  const handleRunAllE2e = async () => {
    const fixedBugs = rows.filter((r) => r.status === "fixed");
    if (!fixedBugs.length || e2eAllRunning) return;
    setE2eAllRunning(true);
    setE2eAllProgress({ current: 0, total: fixedBugs.length });

    for (let i = 0; i < fixedBugs.length; i++) {
      const bug = fixedBugs[i];
      setE2eAllProgress({ current: i + 1, total: fixedBugs.length });
      setRows((prev) => prev.map((r) => r.id === bug.id ? { ...r, e2eTesting: true, e2eVerification: undefined } : r));
      try {
        const res = await fetch("/api/agents/bug-fix-e2e", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bug: { id: bug.id, title: bug.title, description: bug.description } }),
        });
        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");
        const dec = new TextDecoder();
        let buf = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const parts = buf.split("\n\n");
          buf = parts.pop() ?? "";
          for (const part of parts) {
            if (!part.startsWith("data: ")) continue;
            const msg = JSON.parse(part.slice(6)) as { type: string; result?: unknown };
            if (msg.type === "done") {
              setRows((prev) => prev.map((r) => r.id === bug.id
                ? { ...r, e2eTesting: false, e2eVerification: msg.result as BugVerificationResult }
                : r));
            }
          }
        }
      } catch { /* non-fatal */ }
      finally {
        setRows((prev) => prev.map((r) => r.id === bug.id && r.e2eTesting ? { ...r, e2eTesting: false } : r));
      }
    }

    setE2eAllRunning(false);
    setE2eAllProgress(null);
  };

  const pendingCount    = rows.filter((r) => r.status === "pending" || r.status === "failed").length;
  const fixedCount      = rows.filter((r) => r.status === "fixed").length;
  const analyzingCount  = rows.filter((r) => r.analyzing).length;
  const analyzedCount   = rows.filter((r) => !r.analyzing && r.analysis).length;
  const validToRun      = rows.filter((r) => r.id.trim() && r.description.trim() && r.status !== "fixed");
  const selectedRow     = rows.find((r) => r.id === selectedId) ?? null;

  return (
    <>
      {showImport && <ImportDialog onImport={handleImport} onClose={() => setShowImport(false)} />}

      <div className="flex flex-1 flex-col h-full overflow-hidden bg-[#f8fafc]">
        {/* Header */}
        <div className="shrink-0 px-8 pt-6 pb-4 bg-white border-b border-[#f1f5f9]">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#0b1c30]">Bug Fix</h2>
            {analyzingCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                <Loader2 size={11} className="animate-spin" />
                Analyzing {analyzingCount} bug{analyzingCount > 1 ? "s" : ""}…
              </span>
            )}
            {analyzingCount === 0 && analyzedCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                <CheckCircle2 size={11} />
                {analyzedCount} analyzed
              </span>
            )}
          </div>
          <p className="text-[13px] text-[#94a3b8] mt-0.5">Submit QA-reported bugs and let the AI apply targeted fixes.</p>
          {checkpoint && (
            <p className="text-[11px] text-[#94a3b8] mt-1">
              Last session:&nbsp;
              <span className="text-emerald-600 font-semibold">{fixedCount} fixed</span>
              {rows.filter((r) => r.status === "failed").length > 0 && (
                <span className="text-red-500 font-semibold ml-1">· {rows.filter((r) => r.status === "failed").length} failed</span>
              )}
            </p>
          )}
        </div>

        {/* Main: table + detail panel */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: table */}
          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">
            {pendingCount > 0 && !running && (() => {
              const pendingRows = rows.filter((r) => r.status === "pending" || r.status === "failed");
              const analyzedRows = pendingRows.filter((r) => r.analysis);
              const fromAnalysis = analyzedRows.length > 0;
              let totalMins: number;
              let minUsd: number;
              let maxUsd: number;
              if (fromAnalysis) {
                const scale = pendingCount / analyzedRows.length;
                const sumMins = analyzedRows.reduce((s, r) => s + r.analysis!.estimatedMinutes, 0);
                const sumCost = analyzedRows.reduce((s, r) => s + r.analysis!.estimatedCostUsd, 0);
                totalMins = Math.round(sumMins * scale);
                minUsd = sumCost * scale * 0.5;
                maxUsd = sumCost * scale * 2;
              } else {
                const est = estimateRunCost(pendingCount, checkpoint);
                minUsd = est.minUsd; maxUsd = est.maxUsd;
                totalMins = estimateRunMinutes(pendingCount, checkpoint);
              }
              const source = fromAnalysis
                ? `基于分析（${analyzedRows.length}/${pendingCount} 已分析）`
                : "默认估算";
              return (
                <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                      <Clock size={14} className="text-indigo-500" />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-[#1e293b]">{pendingCount} 个 bug 待修复</p>
                      <p className="text-[11px] text-[#94a3b8] mt-0.5">{source}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-5 text-right">
                    <div>
                      <p className="text-[11px] text-[#94a3b8] uppercase tracking-wider">预估费用</p>
                      <p className="text-[13px] font-mono font-semibold text-[#1e293b]">
                        ${minUsd.toFixed(3)} – ${maxUsd.toFixed(3)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-[#94a3b8] uppercase tracking-wider">预估时间</p>
                      <p className="text-[13px] font-mono font-semibold text-[#1e293b]">约 {totalMins} 分钟</p>
                    </div>
                  </div>
                </div>
              );
            })()}
            <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-[#f1f5f9] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94a3b8]">Issues</p>
                </div>
                <div className="flex items-center gap-2">
                  {pendingCount > 0 && (
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#f1f5f9] text-[#64748b]">{pendingCount} PENDING</span>
                  )}
                  {fixedCount > 0 && (
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">{fixedCount} FIXED</span>
                  )}
                  <button onClick={() => setShowImport(true)} disabled={running}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors disabled:opacity-50">
                    <Upload size={11} /> Bulk import
                  </button>
                </div>
              </div>

              {rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 gap-3 text-[#94a3b8]">
                  <Bug size={28} className="text-[#cbd5e1]" />
                  <p className="text-[13px]">No bugs added yet.</p>
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-[#f8fafc] border-b border-[#f1f5f9]">
                      <th className="pl-4 pr-2 py-2.5 w-8">
                        <input type="checkbox" checked={allChecked} onChange={toggleCheckAll}
                          className="w-3.5 h-3.5 rounded border-slate-300 accent-indigo-600 cursor-pointer" />
                      </th>
                      {["", "BUG ID / TITLE", "ROLE", "STATUS", ""].map((h, i) => (
                        <th key={i} className="px-4 py-2.5 text-[10px] font-bold tracking-widest text-[#94a3b8] uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const isExpanded = expandedId === row.id;
                      const isSelected = selectedId === row.id;
                      const badge = STATUS_BADGE[row.status];
                      const role = row.analysis?.role ?? (FRONTEND_KEYWORDS.test(`${row.title} ${row.description}`) ? "frontend" : "backend");
                      return (
                        <Fragment key={row.id}>
                          <tr
                            className={`border-b border-[#f8fafc] transition-colors last:border-0 cursor-pointer ${checkedIds.has(row.id) ? "bg-indigo-50/40" : isSelected ? "bg-indigo-50/60" : "hover:bg-[#fafbfc]"}`}
                            onClick={() => setSelectedId((prev) => prev === row.id ? null : row.id)}
                          >
                            <td className="pl-4 pr-2 py-3 w-8" onClick={(e) => e.stopPropagation()}>
                              <input type="checkbox"
                                checked={checkedIds.has(row.id)}
                                onChange={() => toggleCheck(row.id)}
                                disabled={row.status === "running"}
                                className="w-3.5 h-3.5 rounded border-slate-300 accent-indigo-600 cursor-pointer disabled:opacity-40" />
                            </td>
                            <td className="px-4 py-3 w-8">
                              <button
                                onClick={(e) => { e.stopPropagation(); setExpandedId((prev) => prev === row.id ? null : row.id); }}
                                className="text-[#94a3b8] hover:text-[#475569] transition-colors"
                              >
                                <ChevronDown size={14} className={`transition-transform duration-150 ${isExpanded ? "rotate-180" : ""}`} />
                              </button>
                            </td>
                            <td className="px-4 py-3 w-0 min-w-0" style={{ maxWidth: "480px" }}>
                              <div className="overflow-hidden">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[11px] text-[#94a3b8] shrink-0">{row.id}</span>
                                  <p className="text-[13px] font-semibold text-[#1e293b] truncate">
                                    {row.title || row.description.split("\n")[0] || <span className="text-[#cbd5e1] font-normal">Untitled</span>}
                                  </p>
                                </div>
                                {row.currentLog && (
                                  <p className="text-[11px] text-[#94a3b8] truncate mt-0.5 ml-14">{row.currentLog}</p>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${ROLE_COLOR[role]}`}>{role}</span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${badge.cls}`}>
                                  {badge.icon}{badge.label}
                                </span>
                                {row.analyzing && (
                                  <span title="Analyzing…" className="text-indigo-400">
                                    <Loader2 size={12} className="animate-spin" />
                                  </span>
                                )}
                                {!row.analyzing && row.analysis && row.analysis.likelyFiles.length > 0 && (
                                  <span
                                    title={`Analyzed · ${row.analysis.likelyFiles.length} file(s) identified`}
                                    className="text-emerald-500 cursor-help"
                                  >
                                    <CheckCircle2 size={12} />
                                  </span>
                                )}
                                {row.status === "pending" && (row.validationWarnings ?? validateBugDescription(row.description)).length > 0 && (
                                  <span
                                    title={`缺少：${(row.validationWarnings ?? validateBugDescription(row.description)).join("、")}`}
                                    className="text-amber-400 cursor-help"
                                  >
                                    <AlertCircle size={12} />
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-2">
                                {row.status !== "running" && row.status !== "fixed" && (
                                  <button
                                    onClick={() => handleRunSingle(row.id)}
                                    disabled={running}
                                    className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100 disabled:opacity-40 transition-colors"
                                    title="Run this bug only"
                                  >
                                    Run
                                  </button>
                                )}
                                {row.status !== "fixed" && (
                                  <button onClick={() => removeRow(row.id)} className="text-[#cbd5e1] hover:text-red-400 transition-colors" title="Remove">
                                    <X size={13} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-[#fafbfc] border-b border-[#f1f5f9]">
                              <td colSpan={6} className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                <div className="space-y-3">
                                  <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] mb-1">Title</p>
                                    <input value={row.title} onChange={(e) => updateRow(row.id, { title: e.target.value })}
                                      placeholder="Bug title"
                                      className="w-full rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-[13px] font-semibold text-[#1e293b] focus:outline-none focus:ring-1 focus:ring-indigo-300" />
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] mb-1">Description</p>
                                    <textarea value={row.description} onChange={(e) => updateRow(row.id, { description: e.target.value })} rows={4}
                                      placeholder="Steps to reproduce..."
                                      className="w-full resize-y rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 font-mono text-[12px] text-[#334155] focus:outline-none focus:ring-1 focus:ring-indigo-300" />
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              )}

              <div className="px-5 py-3 border-t border-[#f1f5f9]">
                <button onClick={addRow} disabled={running}
                  className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-40 transition-colors">
                  <Plus size={12} /> Add bug
                </button>
              </div>
            </div>

            {/* Session log */}
            {logs.length > 0 && (
              <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-[#f1f5f9]">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94a3b8]">Session Log</p>
                </div>
                <div className="max-h-40 overflow-y-auto px-5 py-3 space-y-0.5">
                  {logs.map((entry, i) => {
                    const time = new Date(entry.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
                    const cls = entry.kind === "success" ? "text-emerald-600" : entry.kind === "error" ? "text-red-500" : "text-[#64748b]";
                    return (
                      <p key={i} className="font-mono text-[11px]">
                        <span className="text-[#94a3b8]">[{time}]</span>{" "}<span className={cls}>{entry.text}</span>
                      </p>
                    );
                  })}
                  <div ref={logEndRef} />
                </div>
              </div>
            )}

            {/* Result */}
            {result && (
              <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-[#f1f5f9]">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94a3b8]">Session Result</p>
                </div>
                <div className="px-5 py-4 space-y-4">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    {[
                      { label: "Fixed",         value: result.fixedBugIds.length,    cls: "text-emerald-600" },
                      { label: "Failed",        value: result.failedBugIds.length,   cls: "text-red-500" },
                      { label: "Files changed", value: result.generatedFiles.length, cls: "text-[#475569]" },
                    ].map((s) => (
                      <div key={s.label} className="rounded-lg border border-[#f1f5f9] bg-[#f8fafc] py-3">
                        <p className={`text-2xl font-bold ${s.cls}`}>{s.value}</p>
                        <p className="text-[11px] text-[#94a3b8] mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-[11px] text-[#94a3b8]">cost: ${result.costUsd.toFixed(4)}</p>
                    {result.fixedBugIds.length > 0 && onNavigate && (
                      <button
                        onClick={() => onNavigate("serve")}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-[12px] font-semibold rounded-lg hover:bg-indigo-500 transition-colors"
                      >
                        <ChevronRight size={13} /> Preview
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: detail panel */}
          <AnimatePresence>
            {selectedRow && (
              <motion.div
                key="bug-detail"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 380, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="shrink-0 overflow-hidden border-l border-slate-200 bg-white"
              >
                <div className="w-[380px] h-full">
                  <BugDetailPanel
                    row={selectedRow}
                    onClose={() => setSelectedId(null)}
                    onUpdate={(patch) => updateRow(selectedRow.id, patch)}
                    outputDir={codeOutputDir ?? ""}
                    onRun={() => handleRunSingle(selectedRow.id)}
                    running={running}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* App startup logs */}
        {showAppLogs && (appLogs.length > 0 || appError) && (
          <div className="shrink-0 border-t border-slate-200 bg-[#0d1117] max-h-36 overflow-y-auto px-4 py-2">
            {appError && <p className="text-[11px] text-red-400 font-semibold mb-1">Error: {appError}</p>}
            {appLogs.map((l, i) => (
              <p key={i} className="font-mono text-[10px] text-slate-400 leading-5">{l}</p>
            ))}
          </div>
        )}

        {/* Bottom nav */}
        <div className="shrink-0 border-t border-[#e2e8f0] bg-white px-8 py-3 flex items-center justify-between">
          {someChecked ? (
            <div className="flex items-center gap-3">
              <span className="text-[12px] font-semibold text-indigo-600">{checkedIds.size} selected</span>
              <button onClick={handleBulkRun} disabled={running}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-[12px] font-semibold rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-40">
                <Bug size={12} /> Run Selected
              </button>
              <button onClick={handleBulkDelete} disabled={running}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-600 text-[12px] font-semibold rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40">
                <X size={12} /> Delete Selected
              </button>
              <button onClick={() => setCheckedIds(new Set())}
                className="text-[12px] text-[#94a3b8] hover:text-[#475569] transition-colors">
                Clear
              </button>
            </div>
          ) : (
            <p className="text-[12px] text-[#94a3b8]">
              {validToRun.length} bug{validToRun.length !== 1 ? "s" : ""} ready to fix
            </p>
          )}
          <div className="flex items-center gap-2">
            {/* App server status + start/stop */}
            <div className="flex items-center gap-2">
              <span className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                appStatus === "running"  ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                appStatus === "starting" ? "bg-amber-50 text-amber-700 border-amber-200" :
                                           "bg-slate-50 text-slate-500 border-slate-200"
              }`}>
                {appStatus === "running"  ? <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> App Running</> :
                 appStatus === "starting" ? <><Loader2 size={10} className="animate-spin" /> Starting…</> :
                                            <><span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" /> App Stopped</>}
              </span>
              {appStatus !== "running" && appStatus !== "starting" && codeOutputDir && (
                <button onClick={handleStartApp} disabled={appStarting}
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40 transition-colors">
                  Start App
                </button>
              )}
              {appStatus === "running" && (
                <button onClick={handleStopApp}
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
                  Stop
                </button>
              )}
              {(appLogs.length > 0 || appError) && (
                <button onClick={() => setShowAppLogs((v) => !v)}
                  className="text-[10px] text-slate-400 hover:text-slate-600 underline">
                  {showAppLogs ? "Hide logs" : "Show logs"}
                </button>
              )}
            </div>
            {fixedCount > 0 && (
              <button onClick={handleRunAllE2e} disabled={e2eAllRunning || running || appStatus !== "running"}
                title={appStatus !== "running" ? "Start the app first" : undefined}
                className="flex items-center gap-1.5 px-4 py-2.5 border border-indigo-200 text-indigo-600 text-[13px] font-semibold rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {e2eAllRunning
                  ? <><Loader2 size={14} className="animate-spin" /> E2E {e2eAllProgress?.current}/{e2eAllProgress?.total}</>
                  : <><RefreshCw size={14} /> Run All E2E Tests</>}
              </button>
            )}
            {running && (
              <button onClick={handleAbort}
                className="flex items-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 text-[13px] font-semibold rounded-lg hover:bg-red-50 transition-colors">
                Abort
              </button>
            )}
            <button onClick={handleRun} disabled={running || validToRun.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-[13px] font-semibold rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              {running ? <><RefreshCw size={14} className="animate-spin" /> Fixing…</> : <><Bug size={14} /> Run Bug Fix</>}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
