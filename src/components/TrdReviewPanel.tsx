"use client";

import React, { useMemo, useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import type {
  TrdReviewResult,
  TrdReviewBlocker,
  TrdReviewImprovement,
  TrdReviewDimension,
  TrdReviewSeverity,
} from "@/lib/agents/architect/trd-reviewer-agent";

interface Props {
  result: TrdReviewResult | null;
  loading: boolean;
  error: string | null;
  onRerunReview: () => void;
}

export default function TrdReviewPanel({
  result,
  loading,
  error,
  onRerunReview,
}: Props) {
  // ── Loading & error states ───────────────────────────────────────────
  if (loading) {
    return (
      <Shell>
        <div className="flex items-center gap-2 text-[13px] text-[#712ae2]">
          <RefreshCw size={14} className="animate-spin" /> Reviewing TRD against
          PRD…
        </div>
      </Shell>
    );
  }
  if (error) {
    return (
      <Shell>
        <div className="flex items-center justify-between gap-3 text-[13px]">
          <span className="text-red-600">
            <AlertTriangle size={14} className="inline mr-1.5" />
            Review failed: {error}
          </span>
          <button
            onClick={onRerunReview}
            className="text-[12px] text-[#712ae2] hover:underline font-medium"
          >
            Retry
          </button>
        </div>
      </Shell>
    );
  }
  // ── Idle state ────────────────────────────────────────────────────
  // No review run yet. Render an empty-state card with a single CTA so the
  // user discovers the feature and explicitly opts in. Auto-trigger is OFF
  // by design — review costs ~$0.02-0.10 per run, so we don't fire it
  // implicitly on every TRD page load.
  if (!result) {
    return (
      <Shell>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Sparkles size={14} className="text-[#712ae2] shrink-0" />
            <div className="flex flex-col">
              <span className="text-[13px] font-semibold text-slate-900">
                Cross-vendor TRD review
              </span>
              <span className="text-[11px] text-slate-500">
                Runs the TRD through a different model (Claude Sonnet) for an
                independent score, blockers, and improvement suggestions.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onRerunReview}
            className="flex items-center gap-1.5 px-3 h-9 rounded-md bg-[#712ae2] text-white text-[12px] font-semibold hover:bg-[#5a1fc4] shadow-sm hover:shadow-md transition-all shrink-0"
          >
            <RefreshCw size={12} />
            Run review
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <ReviewBody result={result} onRerunReview={onRerunReview} />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 bg-white border border-[#e2e8f0] rounded-[4px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] overflow-hidden">
      <div className="px-6 py-4">{children}</div>
    </div>
  );
}

// ─── Body ────────────────────────────────────────────────────────────────

function ReviewBody({
  result,
  onRerunReview,
}: {
  result: TrdReviewResult;
  onRerunReview: () => void;
}) {
  const overall = result.overall.score;
  const tone =
    overall >= 8 ? "good" : overall >= 5 ? "warn" : "bad";

  const [showDimensions, setShowDimensions] = useState(true);
  const [showImprovements, setShowImprovements] = useState(
    result.improvements.length > 0,
  );

  const highBlockers = useMemo(
    () => result.blockers.filter((b) => b.severity === "high").length,
    [result.blockers],
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Header — overall score + meta */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <ScoreBadge score={overall} tone={tone} />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <Sparkles size={13} className="text-[#712ae2]" />
              <span className="text-[13px] font-semibold text-slate-900">
                TRD Review
              </span>
              <span className="text-[11px] text-slate-400">
                · {shortModel(result.model)}
              </span>
            </div>
            <span className="text-[12px] text-slate-600 leading-[18px]">
              {result.overall.summary}
            </span>
          </div>
        </div>
        <button
          onClick={onRerunReview}
          className="flex items-center gap-1.5 text-[12px] text-[#712ae2] hover:underline font-medium shrink-0"
        >
          <RefreshCw size={12} /> Re-review
        </button>
      </div>

      {/* Blockers */}
      {result.blockers.length > 0 && (
        <section className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-[12px] font-semibold text-red-700">
            <ShieldAlert size={13} />
            {result.blockers.length} blocker
            {result.blockers.length === 1 ? "" : "s"}
            {highBlockers > 0 && (
              <span className="text-[10px] font-bold text-red-700 bg-red-100 px-1.5 py-[1px] rounded-full">
                {highBlockers} HIGH
              </span>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            {result.blockers.map((b) => (
              <IssueRow
                key={b.id}
                kind="blocker"
                id={b.id}
                severity={b.severity}
                section={b.section}
                description={b.description}
                suggestedFix={b.suggestedFix}
              />
            ))}
          </div>
        </section>
      )}

      {/* Dimensions */}
      <section className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => setShowDimensions((v) => !v)}
          className="flex items-center gap-1 text-[11px] font-semibold tracking-wider text-slate-500 uppercase hover:text-slate-700"
        >
          {showDimensions ? (
            <ChevronDown size={12} />
          ) : (
            <ChevronRight size={12} />
          )}
          7 dimensions
        </button>
        {showDimensions && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 mt-1">
            {result.dimensions.map((d) => (
              <DimensionRow key={d.id} d={d} />
            ))}
          </div>
        )}
      </section>

      {/* Improvements */}
      {result.improvements.length > 0 && (
        <section className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setShowImprovements((v) => !v)}
            className="flex items-center gap-1 text-[12px] font-semibold text-slate-700 hover:text-slate-900"
          >
            {showImprovements ? (
              <ChevronDown size={13} />
            ) : (
              <ChevronRight size={13} />
            )}
            {result.improvements.length} improvement
            {result.improvements.length === 1 ? "" : "s"} suggested
          </button>
          {showImprovements && (
            <div className="flex flex-col gap-1.5">
              {result.improvements.map((i) => (
                <IssueRow
                  key={i.id}
                  kind="improvement"
                  id={i.id}
                  severity={i.priority}
                  section={i.section}
                  description={i.description}
                  suggestedFix={i.suggestedFix}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Footer cost + duration */}
      <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100">
        Review by {result.model} · {(result.durationMs / 1000).toFixed(1)}s ·
        ${result.costUsd.toFixed(4)}
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────

function ScoreBadge({
  score,
  tone,
}: {
  score: number;
  tone: "good" | "warn" | "bad";
}) {
  const bg =
    tone === "good"
      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
      : tone === "warn"
        ? "bg-amber-50 border-amber-200 text-amber-700"
        : "bg-red-50 border-red-200 text-red-700";
  const Icon = tone === "good" ? ShieldCheck : ShieldAlert;
  return (
    <div
      className={`flex flex-col items-center justify-center w-14 h-14 rounded-lg border ${bg}`}
    >
      <Icon size={14} className="mb-0.5" />
      <span className="font-mono font-bold text-[14px] leading-none">
        {score}/10
      </span>
    </div>
  );
}

function DimensionRow({ d }: { d: TrdReviewDimension }) {
  const tone =
    d.score >= 8 ? "bg-emerald-400" : d.score >= 5 ? "bg-amber-400" : "bg-red-400";
  const widthPct = Math.max(4, d.score * 10);
  return (
    <div
      className="flex items-center gap-3 text-[12px] py-1"
      title={d.evidence}
    >
      <span className="flex-1 truncate text-slate-700">{d.name}</span>
      <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${tone}`} style={{ width: `${widthPct}%` }} />
      </div>
      <span className="w-8 text-right font-mono text-[11px] tabular-nums text-slate-600">
        {d.score}/10
      </span>
    </div>
  );
}

function severityColors(severity: TrdReviewSeverity) {
  if (severity === "high") {
    return "border-red-200 bg-red-50";
  }
  if (severity === "medium") {
    return "border-amber-200 bg-amber-50";
  }
  return "border-slate-200 bg-slate-50";
}

function severityTextColor(severity: TrdReviewSeverity) {
  if (severity === "high") return "text-red-700";
  if (severity === "medium") return "text-amber-700";
  return "text-slate-600";
}

function IssueRow({
  kind,
  id,
  severity,
  section,
  description,
  suggestedFix,
}: {
  kind: "blocker" | "improvement";
  id: string;
  severity: TrdReviewSeverity;
  section: string;
  description: string;
  suggestedFix: string;
}) {
  const [open, setOpen] = useState(kind === "blocker" && severity === "high");
  return (
    <div className={`border rounded-md ${severityColors(severity)} px-3 py-2`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start gap-2 text-left"
      >
        <span className="shrink-0 mt-[2px]">
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </span>
        <span
          className={`text-[10px] font-bold uppercase tracking-wider shrink-0 mt-[2px] ${severityTextColor(severity)}`}
        >
          {severity}
        </span>
        <span className="text-[11px] font-mono text-slate-500 shrink-0 mt-[2px]">
          {id}
        </span>
        <span className="text-[10px] font-medium text-slate-500 shrink-0 mt-[2px]">
          {section}
        </span>
        <span className="text-[12.5px] text-slate-800 leading-[18px]">
          {description}
        </span>
      </button>
      {open && suggestedFix && (
        <div className="mt-1.5 ml-7 text-[12px] text-slate-700 leading-[18px] flex items-start gap-1.5">
          <CheckCircle2
            size={12}
            className="text-[#712ae2] shrink-0 mt-[3px]"
          />
          <span>
            <span className="font-medium text-slate-900">Fix:</span>{" "}
            {suggestedFix}
          </span>
        </div>
      )}
    </div>
  );
}

function shortModel(model: string): string {
  // "anthropic/claude-sonnet-4" → "claude-sonnet-4"
  const idx = model.indexOf("/");
  return idx >= 0 ? model.slice(idx + 1) : model;
}
