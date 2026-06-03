"use client";

import React, { useState } from "react";
import { ShieldCheck, Loader2, AlertTriangle, Info, AlertOctagon, Wand2 } from "lucide-react";
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

export function PrdQualityReportPanel(props: {
  prd: string;
  spec?: PrdSpec | null;
  /** Pre-fills the edit bar with a fix instruction the user can review + submit. */
  onApplyFix: (instruction: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [includeAI, setIncludeAI] = useState(true);
  const [report, setReport] = useState<QualityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [appliedId, setAppliedId] = useState<string | null>(null);

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
      setReport((await res.json()) as QualityResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const findings = (report?.findings ?? [])
    .slice()
    .sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);

  return (
    <div className="border border-[#e2e8f0] rounded-[6px] bg-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-indigo-600" />
          <span className="font-semibold text-slate-900 text-sm">PRD 质量校验</span>
          {report && (
            <span className="text-xs text-slate-500">
              得分 {report.score}/100 · {report.counts.blocker} blocker · {report.counts.warn} warn · {report.counts.info} info
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-slate-600 select-none cursor-pointer">
            <input type="checkbox" checked={includeAI} onChange={(e) => setIncludeAI(e.target.checked)} />
            含 AI 语义评审
          </label>
          <button
            onClick={runCheck}
            disabled={loading || !props.prd?.trim()}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-[4px] bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
            {loading ? "校验中…" : "校验 PRD"}
          </button>
        </div>
      </div>

      <div className="px-4 py-3">
        {error && <div className="text-xs text-red-600">校验失败:{error}</div>}

        {!report && !error && (
          <div className="text-xs text-slate-400 py-2">
            点击「校验 PRD」检查业务流程、用户路径、页面与下游可建性。Layer 1 确定性检查 + 可选 AI 语义评审。
          </div>
        )}

        {report?.layer2?.error && (
          <div className="text-xs text-amber-600 mb-2">AI 评审跳过:{report.layer2.error}(仅显示确定性检查)</div>
        )}
        {report?.layer2?.ran && report.layer2.summary && (
          <div className="text-xs text-slate-600 mb-2 italic">AI 评审:{report.layer2.summary}</div>
        )}

        {report && findings.length === 0 && (
          <div className="text-xs text-green-600 py-2">未发现问题 — PRD 看起来可建。</div>
        )}

        <div className="flex flex-col gap-2">
          {findings.map((f) => {
            const sev = SEV_STYLE[f.severity];
            return (
              <div key={f.id} className="border border-slate-200 rounded-[4px] p-3">
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
                  <div className="text-[11px] text-slate-500 mt-1">下游影响:{f.downstreamImpact}</div>
                )}
                {f.suggestedFix && (
                  <div className="flex items-start gap-2 mt-2">
                    <div className="flex-1 text-[11px] text-slate-600">建议:{f.suggestedFix}</div>
                    <button
                      onClick={() => {
                        props.onApplyFix(
                          `Per PRD quality review (${f.section}): ${f.suggestedFix}`,
                        );
                        setAppliedId(f.id);
                      }}
                      className={`flex items-center gap-1 shrink-0 text-[11px] font-medium px-2 py-1 rounded-[4px] border ${
                        appliedId === f.id
                          ? "border-green-300 text-green-700 bg-green-50"
                          : "border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                      }`}
                      title="把建议填入下方编辑框,确认后点输入框右侧提交即可应用"
                    >
                      <Wand2 size={11} /> {appliedId === f.id ? "✓ 已填入编辑框" : "应用此修改"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
