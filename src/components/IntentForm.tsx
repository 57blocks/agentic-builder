"use client";

import React, { useMemo, useState } from "react";
import { Check, Sparkles, ChevronRight, ChevronDown } from "lucide-react";
import type {
  ClarificationAnswer,
  ClarificationQuestion,
  IntentResult,
} from "@/lib/agents/intent/types";
import { collectQuestions } from "@/lib/agents/intent/types";

interface IntentFormProps {
  result: IntentResult;
  /** Submit answers and continue. */
  onSubmit: (answers: ClarificationAnswer[]) => void;
  /** Skip clarifications and continue with defaults (or none). */
  onSkip: () => void;
  /** Re-fetch a fresh set of questions. */
  onRegenerate?: () => void;
  /** Disable inputs/buttons while parent is doing work. */
  busy?: boolean;
}

interface DraftAnswer {
  value: string | string[];
  followUp?: string;
  usedDefault: boolean;
}

function initialDraft(q: ClarificationQuestion): DraftAnswer {
  const def = q.defaultValue;
  if (q.type === "multi_select") {
    return {
      value: Array.isArray(def) ? def : def ? [def] : [],
      usedDefault: true,
    };
  }
  if (q.type === "text") {
    return {
      value: typeof def === "string" ? def : "",
      usedDefault: true,
    };
  }
  // single_select / yes_no
  const fallback =
    q.options?.find((o) => o.isDefault)?.value ?? q.options?.[0]?.value ?? "";
  return {
    value: typeof def === "string" ? def : fallback,
    usedDefault: true,
  };
}

function isAnswered(q: ClarificationQuestion, draft: DraftAnswer): boolean {
  if (q.type === "multi_select") {
    return Array.isArray(draft.value) && draft.value.length > 0;
  }
  if (q.type === "text") {
    return typeof draft.value === "string" && draft.value.trim().length > 0;
  }
  return typeof draft.value === "string" && draft.value.length > 0;
}

function getFollowUpLabel(
  q: ClarificationQuestion,
  draft: DraftAnswer,
): string | undefined {
  if (!q.options) return undefined;
  if (Array.isArray(draft.value)) {
    for (const v of draft.value) {
      const opt = q.options.find((o) => o.value === v);
      if (opt?.followUpLabel) return opt.followUpLabel;
    }
    return undefined;
  }
  const opt = q.options.find((o) => o.value === draft.value);
  return opt?.followUpLabel;
}

export default function IntentForm({
  result,
  onSubmit,
  onSkip,
  onRegenerate,
  busy,
}: IntentFormProps) {
  const questions = useMemo(() => collectQuestions(result), [result]);

  const [drafts, setDrafts] = useState<Record<string, DraftAnswer>>(() => {
    const initial: Record<string, DraftAnswer> = {};
    for (const q of questions) initial[q.id] = initialDraft(q);
    return initial;
  });

  const grouped = useMemo(() => {
    const byCat = new Map<string, ClarificationQuestion[]>();
    for (const q of questions) {
      const key = q.category || "General";
      if (!byCat.has(key)) byCat.set(key, []);
      byCat.get(key)!.push(q);
    }
    return Array.from(byCat.entries());
  }, [questions]);

  // Categories that look like "Variable: MC-1" / "Source: CoinGecko" / etc are
  // per-concept drill-downs — collapsed by default to keep the form scannable.
  // Cross-cutting coverage categories (Users, Scope, Operations, ...) stay open.
  const isDrillDownCategory = (cat: string) => /^[A-Z][a-zA-Z ]+:\s/.test(cat);

  const [openCats, setOpenCats] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const [cat] of grouped) init[cat] = !isDrillDownCategory(cat);
    return init;
  });

  const drillDownCount = grouped.filter(([cat]) => isDrillDownCategory(cat)).length;
  const allDrillDownsOpen = grouped
    .filter(([cat]) => isDrillDownCategory(cat))
    .every(([cat]) => openCats[cat]);

  const toggleAllDrillDowns = () => {
    setOpenCats((prev) => {
      const next = { ...prev };
      const target = !allDrillDownsOpen;
      for (const [cat] of grouped) {
        if (isDrillDownCategory(cat)) next[cat] = target;
      }
      return next;
    });
  };

  const requiredUnanswered = useMemo(
    () =>
      questions.filter(
        (q) => q.required && !isAnswered(q, drafts[q.id] ?? initialDraft(q)),
      ),
    [questions, drafts],
  );

  const updateDraft = (id: string, patch: Partial<DraftAnswer>) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] ?? { value: "", usedDefault: false }),
        ...patch,
        usedDefault: false,
      },
    }));
  };

  const handleSubmit = () => {
    if (busy || requiredUnanswered.length > 0) return;
    const answers: ClarificationAnswer[] = questions
      .map<ClarificationAnswer | null>((q) => {
        const draft = drafts[q.id] ?? initialDraft(q);
        if (!isAnswered(q, draft)) return null;
        return {
          questionId: q.id,
          value: draft.value,
          followUp: draft.followUp?.trim() || undefined,
          usedDefault: draft.usedDefault,
        };
      })
      .filter((a): a is ClarificationAnswer => a !== null);
    onSubmit(answers);
  };

  if (questions.length === 0) {
    return (
      <div className="bg-white border border-[#e2e8f0] rounded-[4px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] p-8">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles size={18} className="text-[#712ae2]" />
          <h3 className="text-[16px] font-semibold text-[#0f172a]">
            No clarifications needed
          </h3>
        </div>
        <p className="text-[13px] text-[#64748b] mb-6">
          Your brief already covers everything the PRD writer needs. You can
          proceed straight to PRD generation.
        </p>
        <button
          onClick={onSkip}
          disabled={busy}
          className="flex items-center gap-2 px-4 h-10 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 disabled:opacity-40"
        >
          Continue to PRD <ChevronRight size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#e2e8f0] rounded-[4px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] overflow-hidden">
      <div className="bg-[rgba(248,250,252,0.5)] border-b border-[#f1f5f9] px-8 pt-8 pb-6 flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-[rgba(113,42,226,0.1)] text-[#712ae2] text-[12px] font-normal px-2 py-[2px] rounded-[2px] font-['Space_Grotesk',sans-serif]">
              CLARIFICATIONS
            </span>
            <span className="text-[#94a3b8] text-[12px]">
              {questions.length} question{questions.length === 1 ? "" : "s"}
              {result.model ? ` · ${result.model}` : ""}
            </span>
          </div>
          <h2 className="text-[24px] font-semibold text-[#0f172a] tracking-[-0.3px] leading-[30px]">
            Before we draft the PRD
          </h2>
          <p className="text-[13px] text-[#64748b] leading-[20px] max-w-2xl">
            We checked your brief against the dimensions codegen needs and
            found gaps. Your answers will be treated as binding requirements
            when writing the PRD.
          </p>
        </div>
        {onRegenerate && (
          <button
            onClick={onRegenerate}
            disabled={busy}
            className="text-[12px] text-[#712ae2] hover:underline disabled:opacity-40"
          >
            Regenerate questions
          </button>
        )}
      </div>

      {drillDownCount > 1 && (
        <div className="px-8 py-2 border-b border-[#f1f5f9] bg-white flex items-center justify-between text-[12px] text-[#64748b]">
          <span>
            {drillDownCount} concept-specific section
            {drillDownCount === 1 ? "" : "s"} below — collapsed by default
          </span>
          <button
            onClick={toggleAllDrillDowns}
            className="text-[#712ae2] hover:underline font-medium"
          >
            {allDrillDownsOpen ? "Collapse all" : "Expand all"}
          </button>
        </div>
      )}

      <div className="px-8 py-6 flex flex-col gap-6">
        {grouped.map(([category, qs]) => {
          const collapsible = isDrillDownCategory(category);
          const open = openCats[category] ?? true;
          const answeredCount = qs.filter((q) =>
            isAnswered(q, drafts[q.id] ?? initialDraft(q)),
          ).length;
          return (
            <section key={category} className="flex flex-col gap-4">
              <button
                type="button"
                onClick={() =>
                  collapsible &&
                  setOpenCats((p) => ({ ...p, [category]: !open }))
                }
                disabled={!collapsible}
                className={[
                  "flex items-center gap-2 text-[11px] font-semibold tracking-wider text-[#94a3b8] uppercase",
                  collapsible ? "hover:text-[#712ae2] cursor-pointer" : "cursor-default",
                ].join(" ")}
              >
                {collapsible && (
                  <span className="text-[#94a3b8]">
                    {open ? (
                      <ChevronDown size={12} />
                    ) : (
                      <ChevronRight size={12} />
                    )}
                  </span>
                )}
                <span>{category}</span>
                <span className="text-[10px] text-[#cbd5e1] font-normal normal-case tracking-normal">
                  {answeredCount}/{qs.length}
                </span>
              </button>
              {open && qs.map((q) => {
              const draft = drafts[q.id] ?? initialDraft(q);
              const followUpLabel = getFollowUpLabel(q, draft);
              return (
                <div key={q.id} className="flex flex-col gap-2">
                  <div className="flex items-baseline gap-2">
                    <label className="text-[14px] font-medium text-[#0f172a] leading-[20px]">
                      {q.question}
                    </label>
                    {q.required && (
                      <span className="text-[10px] font-semibold text-[#dc2626] bg-red-50 px-1.5 py-[1px] rounded">
                        REQUIRED
                      </span>
                    )}
                  </div>
                  {q.rationale && (
                    <p className="text-[12px] text-[#64748b] leading-[18px] -mt-1">
                      {q.rationale}
                    </p>
                  )}

                  <QuestionInput
                    q={q}
                    draft={draft}
                    onChange={(patch) => updateDraft(q.id, patch)}
                    disabled={busy}
                  />

                  {followUpLabel && (
                    <input
                      type="text"
                      placeholder={followUpLabel}
                      value={draft.followUp ?? ""}
                      disabled={busy}
                      onChange={(e) =>
                        updateDraft(q.id, { followUp: e.target.value })
                      }
                      className="mt-1 px-3 h-9 rounded-md border border-[#e2e8f0] bg-white text-[13px] text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#712ae2] focus:ring-1 focus:ring-[#712ae2]"
                    />
                  )}
                </div>
              );
            })}
            </section>
          );
        })}
      </div>

      <div className="border-t border-[#f1f5f9] bg-[rgba(248,250,252,0.5)] px-8 py-4 flex items-center justify-between gap-4">
        <div className="text-[12px] text-[#64748b]">
          {requiredUnanswered.length > 0 ? (
            <span className="text-[#dc2626]">
              {requiredUnanswered.length} required question
              {requiredUnanswered.length === 1 ? "" : "s"} unanswered
            </span>
          ) : (
            <span>Defaults are pre-selected — change anything you disagree with.</span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onSkip}
            disabled={busy}
            className="px-4 h-10 rounded-lg text-[#475569] hover:bg-slate-100 text-sm font-medium disabled:opacity-40"
          >
            Skip — use defaults
          </button>
          <button
            onClick={handleSubmit}
            disabled={busy || requiredUnanswered.length > 0}
            className="flex items-center gap-2 px-4 h-10 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 shadow-md hover:shadow-indigo-200 hover:shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 disabled:active:scale-100"
          >
            <Check size={16} />
            Confirm & generate PRD
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Per-question inputs ──────────────────────────────────────────────────

interface InputProps {
  q: ClarificationQuestion;
  draft: DraftAnswer;
  onChange: (patch: Partial<DraftAnswer>) => void;
  disabled?: boolean;
}

function QuestionInput({ q, draft, onChange, disabled }: InputProps) {
  if (q.type === "text") {
    return (
      <textarea
        value={typeof draft.value === "string" ? draft.value : ""}
        disabled={disabled}
        rows={2}
        placeholder={
          typeof q.defaultValue === "string" && q.defaultValue
            ? `e.g. ${q.defaultValue}`
            : "Type your answer…"
        }
        onChange={(e) => onChange({ value: e.target.value })}
        className="px-3 py-2 rounded-md border border-[#e2e8f0] bg-white text-[13px] text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#712ae2] focus:ring-1 focus:ring-[#712ae2] resize-y"
      />
    );
  }

  const options = q.options ?? [];

  if (q.type === "multi_select") {
    const current = Array.isArray(draft.value) ? draft.value : [];
    return (
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const selected = current.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              onClick={() => {
                const next = selected
                  ? current.filter((v) => v !== opt.value)
                  : [...current, opt.value];
                onChange({ value: next });
              }}
              className={[
                "flex items-center gap-1.5 px-3 h-8 rounded-full text-[12px] font-medium border transition-colors",
                selected
                  ? "bg-[#712ae2] text-white border-[#712ae2]"
                  : "bg-white text-[#475569] border-[#e2e8f0] hover:border-[#712ae2] hover:text-[#712ae2]",
                disabled && "opacity-50 cursor-not-allowed",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {selected && <Check size={12} />}
              {opt.label}
            </button>
          );
        })}
      </div>
    );
  }

  // single_select / yes_no — render as radio chips
  const current = typeof draft.value === "string" ? draft.value : "";
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const selected = current === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange({ value: opt.value })}
            className={[
              "flex items-center gap-1.5 px-3 h-8 rounded-full text-[12px] font-medium border transition-colors",
              selected
                ? "bg-[#712ae2] text-white border-[#712ae2]"
                : "bg-white text-[#475569] border-[#e2e8f0] hover:border-[#712ae2] hover:text-[#712ae2]",
              opt.isDefault && !selected && "ring-1 ring-[#712ae2]/20",
              disabled && "opacity-50 cursor-not-allowed",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {selected && <Check size={12} />}
            {opt.label}
            {opt.isDefault && !selected && (
              <span className="text-[10px] text-[#94a3b8]">default</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
