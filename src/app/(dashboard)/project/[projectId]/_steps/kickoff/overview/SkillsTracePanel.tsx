"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import type { SkillTraceRecord } from "@/lib/agents/skills";

interface Props {
  trace: SkillTraceRecord | undefined;
}

/**
 * Read-only panel that surfaces which task-breakdown skills the loader
 * applied (and which it skipped) for this run. Goal: at-a-glance "did the
 * waiting-state / magic-link / etc. rule fire?" without having to grep
 * server logs or run debug scripts.
 *
 * Renders nothing when `trace` is missing (e.g. older snapshots produced
 * before the trace was persisted).
 */
export function SkillsTracePanel({ trace }: Props) {
  const [showSkipped, setShowSkipped] = useState(false);
  if (!trace) return null;

  return (
    <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-[#f1f5f9] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-indigo-600" />
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94a3b8]">
            Skills Applied
          </p>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[11px] font-semibold">
            {trace.applied.length}
          </span>
        </div>
        <span className="text-[10px] text-[#94a3b8]">
          {trace.durationMs}ms · ${trace.costUsd.toFixed(4)}
        </span>
      </div>

      {/* Applied list */}
      {trace.applied.length === 0 ? (
        <div className="px-5 py-4 text-[12px] text-[#94a3b8] italic">
          No skills triggered this run.
        </div>
      ) : (
        <ul className="divide-y divide-[#f8fafc]">
          {trace.applied.map((s) => (
            <li key={s.id} className="px-5 py-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <code className="text-[12px] font-semibold text-[#0b1c30]">
                      {s.id}
                    </code>
                    <span className="text-[10px] text-[#94a3b8]">
                      {s.version}
                    </span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold">
                      P{s.priority}
                    </span>
                    {s.llmRan ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-medium">
                        LLM
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-medium">
                        regex
                      </span>
                    )}
                  </div>
                  {s.description && (
                    <p className="text-[11px] text-[#64748b] mt-0.5 truncate">
                      {s.description}
                    </p>
                  )}
                  {s.evidence && (
                    <p
                      className="text-[10px] text-[#94a3b8] mt-1 font-mono truncate"
                      title={s.evidence}
                    >
                      ↳ {s.evidence}
                    </p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Skipped collapsible */}
      {trace.skipped.length > 0 && (
        <div className="border-t border-[#f1f5f9]">
          <button
            type="button"
            onClick={() => setShowSkipped((v) => !v)}
            className="w-full px-5 py-2.5 flex items-center justify-between text-[11px] text-[#64748b] hover:bg-[#fafbff] transition-colors"
          >
            <span className="flex items-center gap-1.5">
              {showSkipped ? (
                <ChevronDown size={12} />
              ) : (
                <ChevronRight size={12} />
              )}
              <span className="font-medium">
                {trace.skipped.length} skipped
              </span>
            </span>
            <span className="text-[10px] text-[#94a3b8]">
              {showSkipped ? "hide" : "show"}
            </span>
          </button>
          {showSkipped && (
            <ul className="px-5 pb-3 space-y-1">
              {trace.skipped.map((s) => (
                <li
                  key={s.id}
                  className="text-[11px] text-[#94a3b8] flex items-baseline gap-2"
                >
                  <code className="text-[#64748b]">{s.id}</code>
                  <span className="italic">— {s.reason}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
