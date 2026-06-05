"use client";

import React, { useState } from "react";
import { ShieldCheck, Loader2, AlertTriangle, Info, AlertOctagon, Wand2, Check, Zap } from "lucide-react";
import { savePrdReadiness } from "./snapshot";
import type {
  PrdQualityFinding,
  PrdQualitySeverity,
} from "@/lib/pipeline/gates/prd-quality-gate";
import type { PrdSpec } from "@/lib/requirements/prd-spec-types";

interface QualityResponse {
  findings: PrdQualityFinding[];
  counts: { blocker: number; warn: number; info: number };
  score: number;
  passed: boolean;
  specAnalyzed: boolean;
  layer2: { ran: boolean; summary?: string; model?: string; costUsd?: number; error?: string };
}

const SEV_STYLE: Record<PrdQualitySeverity, { label: string; cls: string; Icon: typeof Info }> = {
  blocker: { label: "Blocker", cls: "bg-red-50 text-red-700 border-red-200", Icon: AlertOctagon },
  warn: { label: "Warn", cls: "bg-amber-50 text-amber-700 border-amber-200", Icon: AlertTriangle },
  info: { label: "Info", cls: "bg-slate-50 text-slate-600 border-slate-200", Icon: Info },
};

const SEV_ORDER: Record<PrdQualitySeverity, number> = { blocker: 0, warn: 1, info: 2 };

type FixState = "idle" | "fixing" | "fixed" | "error";

export function PrdQualityReportPanel(props: {
  prd: string;
  spec?: PrdSpec | null;
  /** Directly triggers a PRD fix without pre-filling the edit bar. */
  onDirectFix: (instruction: string) => Promise<void>;
  /** Called once a report has been produced (used to unlock Next Step). */
  onResult?: () => void;
  /** Persist Step-1 findings here so they survive reload (project-scoped DB). */
  projectSlug?: string;
  /** Hydrated prior report (from prd step metadata) to re-render on revisit. */
  initialReport?: QualityResponse | null;
}) {
  const [loading, setLoading] = useState(false);
  const [includeAI, setIncludeAI] = useState(true);
  const [report, setReport] = useState<QualityResponse | null>(props.initialReport ?? null);
  const [error, setError] = useState<string | null>(null);
  // Per-finding fix state
  const [fixStates, setFixStates] = useState<Record<string, FixState>>({});
  // Multi-select for batch fix
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBatchFixing, setIsBatchFixing] = useState(false);

  async function runCheck() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/agents/pipeline/prd-quality", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prd: props.prd, spec: props.spec ?? null, runLayer2: includeAI }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      const j = (await res.json()) as QualityResponse;
      setReport(j);
      setFixStates({});
      setSelectedIds(new Set());
      if (props.projectSlug) {
        savePrdReadiness(props.projectSlug, {
          qualityDone: true,
          qualityResult: j,
        }).catch(() => {});
      }
      props.onResult?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function applyFix(f: PrdQualityFinding) {
    if (!f.suggestedFix) return;
    setFixStates((prev) => ({ ...prev, [f.id]: "fixing" }));
    try {
      await props.onDirectFix(`Per PRD quality review (${f.section}): ${f.suggestedFix}`);
      setFixStates((prev) => ({ ...prev, [f.id]: "fixed" }));
      // Remove from selection once fixed
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(f.id); return next; });
    } catch {
      setFixStates((prev) => ({ ...prev, [f.id]: "error" }));
    }
  }

  async function fixSelected() {
    if (isBatchFixing || selectedIds.size === 0) return;
    setIsBatchFixing(true);
    const toFix = findings.filter(
      (f) => f.suggestedFix && selectedIds.has(f.id) && fixStates[f.id] !== "fixed" && fixStates[f.id] !== "fixing",
    );
    for (const f of toFix) {
      await applyFix(f);
    }
    setIsBatchFixing(false);
  }

  const findings = (report?.findings ?? [])
    .slice()
    .sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);

  // Fixable = has a suggested fix and not already fixed
  const fixableFindings = findings.filter(
    (f) => f.suggestedFix && fixStates[f.id] !== "fixed",
  );
  const anyFixing = Object.values(fixStates).some((s) => s === "fixing") || isBatchFixing;

  // Select-all state for the header checkbox
  const selectableIds = fixableFindings
    .filter((f) => fixStates[f.id] !== "fixing")
    .map((f) => f.id);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));
  const someSelected = selectableIds.some((id) => selectedIds.has(id));

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableIds));
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedFixable = [...selectedIds].filter(
    (id) => fixStates[id] !== "fixed" && fixStates[id] !== "fixing",
  );

  return (
    <div>
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          {report && (
            <span className="text-xs text-slate-500">
              Score {report.score}/100 · {report.counts.blocker} blocker · {report.counts.warn} warn · {report.counts.info} info
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Fix Selected — visible only when ≥1 fixable finding exists */}
          {fixableFindings.length > 0 && (
            <button
              onClick={() => void fixSelected()}
              disabled={anyFixing || selectedFixable.length === 0}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-[4px] bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
              title={selectedFixable.length === 0 ? "Select findings below to fix together" : undefined}
            >
              {isBatchFixing ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
              {isBatchFixing
                ? "Fixing…"
                : selectedFixable.length > 0
                  ? `Fix Selected (${selectedFixable.length})`
                  : "Fix Selected"}
            </button>
          )}
          <label className="flex items-center gap-1.5 text-xs text-slate-600 select-none cursor-pointer">
            <input type="checkbox" checked={includeAI} onChange={(e) => setIncludeAI(e.target.checked)} />
            Include AI review
          </label>
          <button
            onClick={runCheck}
            disabled={loading || !props.prd?.trim()}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-[4px] bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
            {loading ? "Checking…" : "Validate PRD"}
          </button>
        </div>
      </div>

      <div className="px-4 py-3">
        {error && <div className="text-xs text-red-600">Check failed: {error}</div>}

        {report?.layer2?.error && (
          <div className="text-xs text-amber-600 mb-2">
            AI review skipped: {report.layer2.error} (showing deterministic checks only)
          </div>
        )}
        {report?.layer2?.ran && report.layer2.summary && (
          <div className="text-xs text-slate-600 mb-2 italic">AI review: {report.layer2.summary}</div>
        )}

        {report && findings.length === 0 && (
          <div className="text-xs text-green-600 py-2">No issues found — the PRD looks buildable.</div>
        )}

        {/* ── Select-all row — only when there are multiple fixable findings ── */}
        {selectableIds.length > 1 && (
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
              onChange={toggleSelectAll}
              disabled={anyFixing}
              className="accent-indigo-600 cursor-pointer disabled:cursor-not-allowed"
            />
            <span className="text-[11px] text-slate-500 select-none">
              {allSelected ? "Deselect all" : `Select all fixable (${selectableIds.length})`}
            </span>
            {someSelected && !allSelected && (
              <span className="text-[11px] text-indigo-600 ml-1">
                {selectedFixable.length} selected
              </span>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2">
          {findings.map((f) => {
            const sev = SEV_STYLE[f.severity];
            const fixState = fixStates[f.id] ?? "idle";
            const isSelectable = !!f.suggestedFix && fixState !== "fixed" && fixState !== "fixing";
            const isSelected = selectedIds.has(f.id);

            return (
              <div
                key={f.id}
                className={`border rounded-[4px] p-3 transition-colors ${
                  isSelected ? "border-indigo-300 bg-indigo-50/40" : "border-slate-200"
                }`}
              >
                <div className="flex items-start gap-2">
                  {/* Checkbox column — placeholder div keeps layout stable for non-fixable rows */}
                  {isSelectable ? (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(f.id)}
                      disabled={anyFixing}
                      className="mt-[3px] accent-indigo-600 shrink-0 cursor-pointer disabled:cursor-not-allowed"
                    />
                  ) : (
                    <div className="w-[13px] shrink-0" />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${sev.cls}`}>
                        <sev.Icon size={11} /> {sev.label}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">{f.dimension}</span>
                      <span className="text-[11px] text-slate-500 truncate">@ {f.section}</span>
                      <span className="ml-auto text-[10px] font-mono text-slate-300">{f.id}</span>
                    </div>
                    <div className="text-[13px] text-slate-800">{f.problem}</div>
                    {f.downstreamImpact && (
                      <div className="text-[11px] text-slate-500 mt-1">
                        Downstream impact: {f.downstreamImpact}
                      </div>
                    )}
                    {f.suggestedFix && (
                      <div className="flex items-start gap-2 mt-2">
                        <div className="flex-1 text-[11px] text-slate-600">
                          Suggestion: {f.suggestedFix}
                        </div>
                        <button
                          onClick={() => void applyFix(f)}
                          disabled={fixState === "fixing" || fixState === "fixed" || anyFixing}
                          className={`flex items-center gap-1 shrink-0 text-[11px] font-medium px-2 py-1 rounded-[4px] border transition-colors ${
                            fixState === "fixed"
                              ? "border-green-300 text-green-700 bg-green-50 cursor-default"
                              : fixState === "fixing"
                                ? "border-indigo-200 text-indigo-600 bg-indigo-50 cursor-wait"
                                : fixState === "error"
                                  ? "border-red-200 text-red-600 bg-red-50 hover:bg-red-100"
                                  : "border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                          } disabled:opacity-60`}
                        >
                          {fixState === "fixing" ? (
                            <><Loader2 size={11} className="animate-spin" /> Fixing</>
                          ) : fixState === "fixed" ? (
                            <><Check size={11} /> Fixed</>
                          ) : fixState === "error" ? (
                            <><Wand2 size={11} /> Retry Fix</>
                          ) : (
                            <><Wand2 size={11} /> Apply Fix</>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
