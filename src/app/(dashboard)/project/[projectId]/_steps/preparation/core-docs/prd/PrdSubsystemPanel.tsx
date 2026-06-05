"use client";

import React, { useMemo, useState } from "react";
import {
  Boxes, Loader2, CheckCircle2, AlertTriangle, ChevronRight,
  ChevronDown, FileText,
} from "lucide-react";
import { savePrdReadiness } from "./snapshot";
import { usePipelineStore } from "@/store/pipeline-store";

// ── Types ────────────────────────────────────────────────────────────────────

interface SubsystemView {
  id: string;
  name: string;
  description: string;
  endpoints: number;
  routes: number;
  collections: number;
  modules: string[];
  dependsOn: string[];
  prdSections: string[];
  ownedApiEndpoints: string[];
  ownedRoutes: string[];
  ownedCollections: string[];
}

interface DecomposeResponse {
  ok: boolean;
  didFallback: boolean;
  costUsd: number;
  manifestSaved: boolean;
  domainFilesSaved: boolean;
  manifestPath: string;
  errors: string[];
  warnings: string[];
  buildLayers: string[][];
  notes: string[];
  subsystems: SubsystemView[];
  error?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function looksLarge(prd: string): { lines: number; h2: number } {
  const lines = prd ? prd.split("\n").length : 0;
  const h2 = (prd.match(/^##\s+\S/gm) || []).length;
  return { lines, h2 };
}

function nameOf(id: string, all: SubsystemView[]): string {
  return all.find((s) => s.id === id)?.name ?? id;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function MetricBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
      {children}
    </span>
  );
}

function DepChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] bg-violet-50 text-violet-700 border border-violet-100">
      ↑ {label}
    </span>
  );
}

function SectionBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-violet-100 text-violet-700">
      {label}
    </span>
  );
}

function DomainCard({
  s,
  all,
}: {
  s: SubsystemView;
  all: SubsystemView[];
}) {
  const [open, setOpen] = useState(false);
  const hasResources = s.endpoints > 0 || s.routes > 0 || s.collections > 0;

  return (
    <div className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm">
      {/* ── Card header (always visible) ── */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left p-3 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-start justify-between gap-2 mb-1">
          <span className="font-semibold text-[13px] text-slate-800 leading-snug">
            {s.name}
          </span>
          <ChevronRight
            size={13}
            className={`shrink-0 mt-0.5 text-slate-400 transition-transform duration-150 ${open ? "rotate-90" : ""}`}
          />
        </div>
        {s.description && (
          <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2 mb-2">
            {s.description}
          </p>
        )}
        <div className="flex flex-wrap gap-1">
          {hasResources ? (
            <>
              {s.endpoints > 0 && <MetricBadge>{s.endpoints} EP</MetricBadge>}
              {s.routes > 0 && <MetricBadge>{s.routes} RT</MetricBadge>}
              {s.collections > 0 && <MetricBadge>{s.collections} Col</MetricBadge>}
            </>
          ) : (
            <span className="text-[10px] text-slate-400">no resources</span>
          )}
          {s.dependsOn.map((dep) => (
            <DepChip key={dep} label={nameOf(dep, all)} />
          ))}
        </div>
      </button>

      {/* ── Expanded detail ── */}
      {open && (
        <div className="border-t border-slate-100 px-3 pb-3 pt-2 space-y-3 text-[11px]">
          {s.ownedApiEndpoints.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                API Endpoints ({s.ownedApiEndpoints.length})
              </div>
              <ul className="font-mono text-slate-600 space-y-0.5">
                {s.ownedApiEndpoints.map((ep) => (
                  <li key={ep} className="truncate">{ep}</li>
                ))}
              </ul>
            </div>
          )}
          {s.ownedRoutes.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                Routes ({s.ownedRoutes.length})
              </div>
              <div className="font-mono text-slate-600 flex flex-wrap gap-x-2 gap-y-0.5">
                {s.ownedRoutes.map((r) => <span key={r}>{r}</span>)}
              </div>
            </div>
          )}
          {s.ownedCollections.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                Collections ({s.ownedCollections.length})
              </div>
              <div className="font-mono text-slate-600 flex flex-wrap gap-x-2 gap-y-0.5">
                {s.ownedCollections.map((c) => <span key={c}>{c}</span>)}
              </div>
            </div>
          )}
          {s.modules.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                Modules
              </div>
              <ul className="font-mono text-slate-600 space-y-0.5">
                {s.modules.map((m) => <li key={m} className="truncate">{m}</li>)}
              </ul>
            </div>
          )}
          {s.prdSections.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                PRD Sections
              </div>
              <div className="flex flex-wrap gap-1">
                {s.prdSections.map((sec) => (
                  <SectionBadge key={sec} label={sec} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function PrdSubsystemPanel(props: {
  prd: string;
  onResult?: () => void;
  projectSlug?: string;
  initialResult?: DecomposeResponse | null;
}) {
  const codeOutputDir = usePipelineStore((s) => s.codeOutputDir);
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<DecomposeResponse | null>(props.initialResult ?? null);
  const [error, setError] = useState<string | null>(null);
  const size = useMemo(() => looksLarge(props.prd), [props.prd]);

  async function run() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/agents/pipeline/prd-subsystem-decompose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prd: props.prd, codeOutputDir: codeOutputDir || undefined }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      setResp(j as DecomposeResponse);
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
    } finally {
      setLoading(false);
    }
  }

  // Aggregate totals for stats bar
  const totals = useMemo(() => {
    if (!resp) return null;
    return {
      domains: resp.subsystems.length,
      layers: resp.buildLayers.length,
      endpoints: resp.subsystems.reduce((a, s) => a + s.endpoints, 0),
      routes: resp.subsystems.reduce((a, s) => a + s.routes, 0),
      collections: resp.subsystems.reduce((a, s) => a + s.collections, 0),
    };
  }, [resp]);

  // Group subsystems by build layer
  const layeredGroups = useMemo(() => {
    if (!resp) return [];
    const grouped = resp.buildLayers.map((layerIds, idx) => ({
      layerIndex: idx,
      label: idx === 0 ? "LAYER 0 · Foundation" : `LAYER ${idx}`,
      subsystems: layerIds
        .map((id) => resp.subsystems.find((s) => s.id === id))
        .filter((s): s is SubsystemView => Boolean(s)),
    }));
    // Ungrouped fallback
    const groupedIds = new Set(resp.buildLayers.flat());
    const ungrouped = resp.subsystems.filter((s) => !groupedIds.has(s.id));
    if (ungrouped.length > 0) {
      grouped.push({ layerIndex: -1, label: "UNGROUPED", subsystems: ungrouped });
    }
    return grouped;
  }, [resp]);

  return (
    <div className="flex flex-col gap-3">
      {/* ── Stats / toolbar bar ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-xs text-slate-500 min-w-0 flex-wrap">
          {totals ? (
            <>
              <CheckCircle2 size={13} className="text-green-600 shrink-0" />
              <span className="font-medium text-slate-700">{totals.domains} domains</span>
              <span>·</span>
              <span>{totals.layers} layers</span>
              <span>·</span>
              <span>{totals.endpoints} endpoints</span>
              <span>·</span>
              <span>{totals.routes} routes</span>
              <span>·</span>
              <span>{totals.collections} collections</span>
              {resp?.domainFilesSaved && (
                <span className="flex items-center gap-0.5 text-green-700 font-medium">
                  <FileText size={11} />
                  domain files saved
                </span>
              )}
              {resp?.didFallback && (
                <span className="text-amber-600">⚠ fallback</span>
              )}
              {resp?.costUsd != null && (
                <span className="text-slate-400 ml-1">${resp.costUsd.toFixed(3)}</span>
              )}
            </>
          ) : (
            <span>{size.lines} lines · {size.h2} sections</span>
          )}
        </div>
        <button
          onClick={run}
          disabled={loading || !props.prd?.trim()}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-[4px] bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 shrink-0"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Boxes size={13} />}
          {loading ? "Decomposing…" : resp ? "Re-decompose" : "Decompose Subsystems"}
        </button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="text-xs text-red-600 flex items-center gap-1">
          <AlertTriangle size={12} /> {error}
        </div>
      )}

      {/* ── Validation errors / warnings ── */}
      {resp && resp.errors?.length > 0 && (
        <div className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded p-2 space-y-0.5">
          {resp.errors.map((e, i) => <div key={i}>• {e}</div>)}
        </div>
      )}

      {/* ── Layer-grouped domain cards ── */}
      {layeredGroups.length > 0 && (
        <div className="flex flex-col gap-2">
          {layeredGroups.map((group, gi) => (
            <React.Fragment key={group.layerIndex}>
              {/* Layer group block */}
              <div className="rounded-lg border border-violet-100 bg-violet-50/40 overflow-hidden">
                {/* Layer header */}
                <div className="flex items-center gap-2 px-3 py-2 bg-violet-100/60 border-b border-violet-100">
                  <span className="text-[11px] font-semibold text-violet-700 tracking-wide uppercase">
                    {group.label}
                  </span>
                  <span className="text-[10px] text-violet-500">
                    {group.subsystems.length} {group.subsystems.length === 1 ? "domain" : "domains"}
                  </span>
                </div>
                {/* Domain cards — 2-column grid */}
                <div className="grid grid-cols-2 gap-2 p-2">
                  {group.subsystems.map((s) => (
                    <DomainCard key={s.id} s={s} all={resp?.subsystems ?? []} />
                  ))}
                </div>
              </div>

              {/* Separator arrow between layers */}
              {gi < layeredGroups.length - 1 && (
                <div className="flex justify-center">
                  <ChevronDown size={16} className="text-slate-300" />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* ── Notes ── */}
      {resp?.notes && resp.notes.length > 0 && (
        <div className="text-[11px] text-slate-500 space-y-0.5">
          {resp.notes.map((n, i) => <div key={i}>Note: {n}</div>)}
        </div>
      )}

      {/* ── Next step hint ── */}
      {resp && (
        <div className="text-[11px] text-slate-500">
          Next: build in subsystem mode at kickoff — Layer 0 (foundation) first, then each layer in order.
        </div>
      )}
    </div>
  );
}
