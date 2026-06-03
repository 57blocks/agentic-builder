"use client";

import React, { useMemo, useState } from "react";
import { Boxes, Loader2, FileText, AlertTriangle } from "lucide-react";

interface SplitFile { id: string; name: string; file: string; lines: number; sections: number; }
interface SplitResponse {
  split: boolean;
  reason?: string;
  model?: string;
  notes?: string;
  outputDir?: string;
  unassigned?: string[];
  files?: SplitFile[];
}

/** Heuristic: a PRD worth offering to split. */
function looksLarge(prd: string): { large: boolean; h2: number; lines: number } {
  const lines = prd ? prd.split("\n").length : 0;
  const h2 = (prd.match(/^##\s+\S/gm) || []).length;
  return { large: lines >= 1500 || h2 >= 8, h2, lines };
}

export function PrdSubsystemSplitPanel(props: { prd: string }) {
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<SplitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const size = useMemo(() => looksLarge(props.prd), [props.prd]);

  if (!size.large) return null; // only surface for large / multi-domain PRDs

  async function run() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/agents/pipeline/prd-subsystem-split", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prd: props.prd }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      setResp((await res.json()) as SplitResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border border-amber-200 rounded-[6px] bg-amber-50/40 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-amber-100">
        <div className="flex items-center gap-2">
          <Boxes size={16} className="text-amber-600" />
          <span className="font-semibold text-slate-900 text-sm">子系统拆分</span>
          <span className="text-xs text-slate-500">
            检测到大型 PRD（{size.lines} 行 · {size.h2} 个章节）—— 建议拆成「共享契约 + 各领域」分步生成
          </span>
        </div>
        <button
          onClick={run}
          disabled={loading || !props.prd?.trim()}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-[4px] bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Boxes size={13} />}
          {loading ? "拆分中…" : "拆分子系统"}
        </button>
      </div>

      <div className="px-4 py-3">
        {error && <div className="text-xs text-red-600">拆分失败:{error}</div>}

        {!resp && !error && (
          <div className="text-xs text-slate-500">
            按领域(角色/界限上下文)把 PRD 切成 <code>shared</code>(唯一契约源)+ 每个子系统一份(引用共享契约)。写入 <code>subsystems/</code>,不改动原 PRD。
          </div>
        )}

        {resp && !resp.split && (
          <div className="text-xs text-slate-600">无需拆分:{resp.reason}</div>
        )}

        {resp?.split && (
          <div className="flex flex-col gap-2">
            {resp.notes && <div className="text-xs text-slate-600 italic">{resp.notes}</div>}
            <div className="text-[11px] text-slate-400">
              模型 {resp.model} · 写入 <code>{resp.outputDir}</code>
            </div>
            <div className="flex flex-col gap-1.5">
              {resp.files?.map((f) => (
                <div key={f.id} className="flex items-center gap-2 text-[12px] border border-slate-200 rounded-[4px] px-3 py-1.5 bg-white">
                  <FileText size={13} className={f.id === "shared" ? "text-indigo-600" : "text-slate-500"} />
                  <code className="font-mono text-slate-700">{f.file}</code>
                  <span className="text-slate-500">{f.name}</span>
                  <span className="ml-auto text-[10px] text-slate-400">
                    {f.lines} 行{f.id !== "shared" ? ` · ${f.sections} 专属章节` : ` · ${f.sections} 共享章节`}
                  </span>
                </div>
              ))}
            </div>
            {resp.unassigned && resp.unassigned.length > 0 && (
              <div className="flex items-start gap-1.5 text-[11px] text-amber-700 mt-1">
                <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                <span>未归类章节已并入 shared,请核对:{resp.unassigned.join(" / ")}</span>
              </div>
            )}
            <div className="text-[11px] text-slate-500 mt-1">
              下一步:先用 <code>shared.md</code> 跑一遍(产出契约/模型),再分别用各子系统切片生成。
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
