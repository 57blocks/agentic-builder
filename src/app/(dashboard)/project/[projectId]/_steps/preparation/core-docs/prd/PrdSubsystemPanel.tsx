"use client";

import React, { useMemo, useState } from "react";
import { Boxes, Loader2, CheckCircle2, AlertTriangle, GitBranch, ChevronRight } from "lucide-react";
import { savePrdReadiness } from "./snapshot";
import { usePipelineStore } from "@/store/pipeline-store";

interface SubsystemView {
  id: string; name: string; description: string;
  endpoints: number; routes: number; collections: number;
  modules: string[]; dependsOn: string[]; prdSections: string[];
  ownedApiEndpoints: string[]; ownedRoutes: string[]; ownedCollections: string[];
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

export function PrdSubsystemPanel(props: {
  prd: string;
  onResult?: () => void;
  /** Persist Step-2 result here so it survives reload (project-scoped DB). */
  projectSlug?: string;
  /** Hydrated prior result (from prd step metadata) to re-render on revisit. */
  initialResult?: DecomposeResponse | null;
}) {
  const codeOutputDir = usePipelineStore((s) => s.codeOutputDir);
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<DecomposeResponse | null>(props.initialResult ?? null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const size = useMemo(() => looksLarge(props.prd), [props.prd]);
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  async function run() {
    if (loading) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/agents/pipeline/prd-subsystem-decompose", {
        method: "POST", headers: { "Content-Type": "application/json" },
        // Write the manifest to the SAME output root the kickoff will read,
        // so the engine's fallback (.blueprint/subsystems.json) finds it.
        body: JSON.stringify({ prd: props.prd, codeOutputDir: codeOutputDir || undefined }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      setResp(j as DecomposeResponse);
      // Persist the split result to the project (survives reload; downstream
      // also reads the .blueprint/subsystems.json the route just wrote).
      if (props.projectSlug) {
        savePrdReadiness(props.projectSlug, {
          subsystemResult: j,
          subsystemDone: true,
          qualityDone: true,
        }).catch(() => {});
      }
      props.onResult?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  const nameOf = (id: string) => resp?.subsystems.find((s) => s.id === id)?.name ?? id;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <span className="text-xs text-slate-500">{size.lines} lines · {size.h2} sections</span>
        <button onClick={run} disabled={loading || !props.prd?.trim()}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-[4px] bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50">
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Boxes size={13} />}
          {loading ? "Decomposing…" : "Decompose Subsystems"}
        </button>
      </div>

      <div>
        {error && <div className="text-xs text-red-600">Decompose failed: {error}</div>}

        {resp && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs">
              {resp.ok
                ? <span className="flex items-center gap-1 text-green-700"><CheckCircle2 size={13} /> Validated · {resp.subsystems.length} domains</span>
                : <span className="flex items-center gap-1 text-red-600"><AlertTriangle size={13} /> Validation failed</span>}
              {resp.manifestSaved && <span className="text-slate-400">saved to <code>{resp.manifestPath}</code></span>}
              <span className="ml-auto text-slate-400">${resp.costUsd.toFixed(3)}{resp.didFallback ? " · ⚠ fallback" : ""}</span>
            </div>

            {resp.errors?.length > 0 && (
              <div className="text-[11px] text-red-600">{resp.errors.map((e, i) => <div key={i}>• {e}</div>)}</div>
            )}

            {resp.buildLayers?.length > 0 && (
              <div className="text-[12px]">
                <div className="flex items-center gap-1 text-slate-600 mb-1"><GitBranch size={12} /> Build order (layers; parallel within a layer):</div>
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
              {resp.subsystems.map((s) => {
                const open = expanded.has(s.id);
                return (
                <div key={s.id} className="border border-slate-200 rounded-[4px] bg-white">
                  <button
                    type="button"
                    onClick={() => toggle(s.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50"
                  >
                    <ChevronRight size={13} className={`text-slate-400 transition-transform ${open ? "rotate-90" : ""}`} />
                    <span className="font-medium text-[13px] text-slate-800">{s.name}</span>
                    <code className="text-[10px] text-slate-400">{s.id}</code>
                    <span className="ml-auto text-[10px] text-slate-400">
                      {s.endpoints} endpoints · {s.routes} routes · {s.collections} collections
                    </span>
                  </button>
                  {open && (
                    <div className="px-3 pb-3 pt-1 border-t border-slate-100 flex flex-col gap-2 text-[11px]">
                      {s.description && <div className="text-slate-600">{s.description}</div>}
                      {s.dependsOn.length > 0 && (
                        <div className="text-violet-700">depends on: {s.dependsOn.map(nameOf).join(", ")}</div>
                      )}
                      {s.prdSections.length > 0 && (
                        <div><span className="text-slate-400">PRD sections:</span> {s.prdSections.join(", ")}</div>
                      )}
                      {s.ownedApiEndpoints.length > 0 && (
                        <div>
                          <span className="text-slate-400">Endpoints ({s.ownedApiEndpoints.length}):</span>
                          <ul className="mt-0.5 ml-3 list-disc font-mono text-[10.5px] text-slate-600">
                            {s.ownedApiEndpoints.map((e) => <li key={e}>{e}</li>)}
                          </ul>
                        </div>
                      )}
                      {s.ownedRoutes.length > 0 && (
                        <div><span className="text-slate-400">Routes:</span> <span className="font-mono text-[10.5px] text-slate-600">{s.ownedRoutes.join(" · ")}</span></div>
                      )}
                      {s.ownedCollections.length > 0 && (
                        <div><span className="text-slate-400">Collections:</span> <span className="font-mono text-[10.5px] text-slate-600">{s.ownedCollections.join(", ")}</span></div>
                      )}
                      {s.modules.length > 0 && (
                        <div><span className="text-slate-400">Modules:</span> <span className="font-mono text-[10.5px] text-slate-600">{s.modules.join(", ")}</span></div>
                      )}
                    </div>
                  )}
                </div>
                );
              })}
            </div>

            {resp.notes?.length > 0 && (
              <div className="text-[11px] text-slate-500">{resp.notes.map((n, i) => <div key={i}>Note: {n}</div>)}</div>
            )}
            <div className="text-[11px] text-slate-500">
              Next: build in subsystem mode at kickoff — the shared foundation first, then each domain in the layer order above.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
