"use client";

import React, { useMemo, useState } from "react";
import { Boxes, Loader2, CheckCircle2, AlertTriangle, GitBranch } from "lucide-react";

interface SubsystemView {
  id: string; name: string; description: string;
  endpoints: number; routes: number; collections: number;
  modules: string[]; dependsOn: string[]; prdSections: string[];
}
interface DecomposeResponse {
  ok: boolean;
  didFallback: boolean;
  costUsd: number;
  manifestSaved: boolean;
  manifestPath: string;
  errors: string[];
  warnings: string[];
  buildLayers: string[][];
  notes: string[];
  subsystems: SubsystemView[];
  error?: string;
}

function looksLarge(prd: string): { large: boolean; h2: number; lines: number } {
  const lines = prd ? prd.split("\n").length : 0;
  const h2 = (prd.match(/^##\s+\S/gm) || []).length;
  return { large: lines >= 1500 || h2 >= 8, h2, lines };
}

export function PrdSubsystemPanel(props: { prd: string }) {
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<DecomposeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const size = useMemo(() => looksLarge(props.prd), [props.prd]);

  async function run() {
    if (loading) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/agents/pipeline/prd-subsystem-decompose", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prd: props.prd }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      setResp(j as DecomposeResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  const nameOf = (id: string) => resp?.subsystems.find((s) => s.id === id)?.name ?? id;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <span className="text-xs text-slate-500">{size.lines} 行 · {size.h2} 章节 —— 按业务域拆分,共享地基先行、分层构建</span>
        <button onClick={run} disabled={loading || !props.prd?.trim()}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-[4px] bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50">
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Boxes size={13} />}
          {loading ? "分解中…" : "分解子系统"}
        </button>
      </div>

      <div>
        {error && <div className="text-xs text-red-600">分解失败:{error}</div>}
        {!resp && !error && (
          <div className="text-xs text-slate-500">
            按 DDD 业务域(auth / enrollment / billing / approvals …)分解 PRD 的路由/端点/集合,产出领域 manifest + 依赖 DAG,写入 <code>.blueprint/subsystems.json</code>。不改 PRD、不跑 codegen。
          </div>
        )}

        {resp && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs">
              {resp.ok
                ? <span className="flex items-center gap-1 text-green-700"><CheckCircle2 size={13} /> 校验通过 · {resp.subsystems.length} 个域</span>
                : <span className="flex items-center gap-1 text-red-600"><AlertTriangle size={13} /> 校验未过</span>}
              {resp.manifestSaved && <span className="text-slate-400">已写入 <code>{resp.manifestPath}</code></span>}
              <span className="ml-auto text-slate-400">${resp.costUsd.toFixed(3)}{resp.didFallback ? " · ⚠ fallback" : ""}</span>
            </div>

            {resp.errors?.length > 0 && (
              <div className="text-[11px] text-red-600">{resp.errors.map((e, i) => <div key={i}>• {e}</div>)}</div>
            )}

            {resp.buildLayers?.length > 0 && (
              <div className="text-[12px]">
                <div className="flex items-center gap-1 text-slate-600 mb-1"><GitBranch size={12} /> 构建顺序(分层,层内并行):</div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {resp.buildLayers.map((layer, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <span className="text-slate-300">→</span>}
                      <span className="px-2 py-0.5 rounded bg-white border border-slate-200">
                        L{i}: {layer.map(nameOf).join(", ")}
                      </span>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              {resp.subsystems.map((s) => (
                <div key={s.id} className="border border-slate-200 rounded-[4px] px-3 py-2 bg-white">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[13px] text-slate-800">{s.name}</span>
                    <code className="text-[10px] text-slate-400">{s.id}</code>
                    <span className="ml-auto text-[10px] text-slate-400">
                      {s.endpoints} 端点 · {s.routes} 路由 · {s.collections} 集合
                    </span>
                  </div>
                  {s.description && <div className="text-[11px] text-slate-500 mt-0.5">{s.description}</div>}
                  {s.dependsOn.length > 0 && (
                    <div className="text-[11px] text-violet-700 mt-0.5">依赖:{s.dependsOn.map(nameOf).join(", ")}</div>
                  )}
                </div>
              ))}
            </div>

            {resp.notes?.length > 0 && (
              <div className="text-[11px] text-slate-500">{resp.notes.map((n, i) => <div key={i}>注:{n}</div>)}</div>
            )}
            <div className="text-[11px] text-slate-500">
              下一步:在 kickoff 用 subsystem 模式构建——先建共享地基,再按上面的分层顺序逐域生成。
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
