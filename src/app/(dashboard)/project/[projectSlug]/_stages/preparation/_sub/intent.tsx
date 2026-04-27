"use client";

import { useEffect, useRef, useState } from "react";
import { usePipelineStore } from "@/store/pipeline-store";
import { useStageStore } from "@/store/stage-store";
import MarkdownRenderer from "@/components/MarkdownRenderer";

// ── Conversation message types ─────────────────────────────────────────────

type UserConvMsg = { role: "user"; text: string; id: string };
type AiConvMsg = {
  role: "ai";
  content: string;
  classification?: Classification;
  model?: string;
  costUsd?: number;
  durationMs?: number;
  id: string;
};
type ConvMsg = UserConvMsg | AiConvMsg;

// ── Icons ──────────────────────────────────────────────────────────────────

function AgentIcon() {
  return (
    <svg width="14" height="13" viewBox="0 0 14 13" fill="none">
      <path d="M7 0L8.5 4.5H13.5L9.5 7.5L11 12L7 9L3 12L4.5 7.5L0.5 4.5H5.5L7 0Z" fill="white" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <circle cx="5" cy="3" r="2.5" fill="white" />
      <path d="M0 9.5C0 7.567 2.239 6 5 6s5 1.567 5 3.5" stroke="white" strokeWidth="1.2" fill="none" />
    </svg>
  );
}

function SpinnerIcon({ size = 14 }: { size?: number }) {
  return (
    <svg className="animate-spin" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="12" height="11" viewBox="0 0 12 11" fill="none">
      <path d="M11 5.5L1 1l2 4.5L1 10l10-4.5z" fill="white" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M2 5h6M5.5 2.5L8 5l-2.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg width="4" height="16" viewBox="0 0 4 16" fill="currentColor">
      <circle cx="2" cy="2" r="1.5" />
      <circle cx="2" cy="8" r="1.5" />
      <circle cx="2" cy="14" r="1.5" />
    </svg>
  );
}

function AttachIcon() {
  return (
    <svg width="13" height="20" viewBox="0 0 13 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11.5 8v5.5a5 5 0 0 1-10 0V5.5a3.5 3.5 0 0 1 7 0V13a2 2 0 0 1-4 0V7" />
    </svg>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function UserMessage({ text }: { text: string }) {
  return (
    <div className="flex gap-4 items-start justify-end">
      <div className="bg-black text-white rounded-tl-2xl rounded-br-2xl rounded-bl-2xl px-4 py-4 max-w-[calc(100%-56px)] shadow-sm">
        <p className="text-[16px] leading-6 whitespace-pre-wrap">{text}</p>
      </div>
      <div className="shrink-0 w-8 h-8 rounded-sm bg-[#131b2e] flex items-center justify-center">
        <UserIcon />
      </div>
    </div>
  );
}

function AIMessage({
  content,
  isStreaming,
  classification,
}: {
  content: string;
  isStreaming?: boolean;
  classification?: Classification;
}) {
  return (
    <div className="flex gap-4 items-start">
      <div className="shrink-0 w-8 h-8 rounded-sm bg-[#712ae2] flex items-center justify-center">
        <AgentIcon />
      </div>
      <div className="flex-1 min-w-0 bg-[#f8fafc] border border-[#e2e8f0] rounded-tr-2xl rounded-br-2xl rounded-bl-2xl p-4 shadow-sm">
        {isStreaming ? (
          <div className="flex items-center gap-2 text-[#94a3b8] text-sm">
            <SpinnerIcon size={13} />
            <span>Analyzing project intent…</span>
          </div>
        ) : classification ? (
          <ClassificationCard cls={classification} />
        ) : content ? (
          <div className="prose prose-sm max-w-none text-[#0b1c30]">
            <MarkdownRenderer content={content} />
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[#94a3b8] text-sm">
            <SpinnerIcon size={13} />
            <span>Processing…</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Classification card ──────────────────────────────────────────────────

type Classification = {
  tier: string;
  type: string;
  needsBackend: boolean;
  needsDatabase: boolean;
  reasoning: string;
};

const TIER_LABEL: Record<string, string> = { S: "Simple", M: "Standard", L: "Enterprise" };
const TIER_COLOR: Record<string, string> = {
  S: "bg-emerald-50 text-emerald-700 border-emerald-200",
  M: "bg-amber-50 text-amber-700 border-amber-200",
  L: "bg-zinc-100 text-zinc-700 border-zinc-300",
};

function ClassificationCard({ cls }: { cls: Classification }) {
  const tierStyle = TIER_COLOR[cls.tier] ?? TIER_COLOR.M;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[12px] font-semibold ${tierStyle}`}>
          Tier {cls.tier} · {TIER_LABEL[cls.tier] ?? cls.tier}
        </span>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full border border-[#e2e8f0] bg-white text-[12px] text-[#475569]">
          {cls.type}
        </span>
        {cls.needsBackend && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full border border-blue-200 bg-blue-50 text-[12px] text-blue-700">
            Backend
          </span>
        )}
        {cls.needsDatabase && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full border border-violet-200 bg-violet-50 text-[12px] text-violet-700">
            Database
          </span>
        )}
      </div>
      <p className="text-[14px] text-[#374151] leading-6">{cls.reasoning}</p>
    </div>
  );
}

function MetaBadge({ step }: { step: { model?: string; costUsd?: number; durationMs?: number } }) {
  return (
    <div className="flex items-center gap-4 pl-12 mt-1">
      {step.model && (
        <span className="text-[11px] text-[#94a3b8]">
          Model: <span className="font-medium text-[#64748b]">{step.model}</span>
        </span>
      )}
      {step.costUsd != null && (
        <span className="text-[11px] text-[#94a3b8]">
          Cost: <span className="font-medium text-[#64748b]">${step.costUsd.toFixed(4)}</span>
        </span>
      )}
      {step.durationMs != null && (
        <span className="text-[11px] text-[#94a3b8]">
          Time: <span className="font-medium text-[#64748b]">{(step.durationMs / 1000).toFixed(1)}s</span>
        </span>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function IntentSubStage() {
  const step             = usePipelineStore((s) => s.steps.intent);
  const streamingContent = usePipelineStore((s) => s.streamingContent);
  const currentStep      = usePipelineStore((s) => s.currentStep);
  const isRunning        = usePipelineStore((s) => s.isRunning);
  const featureBrief     = usePipelineStore((s) => s.featureBrief);
  const startPipeline    = usePipelineStore((s) => s.startPipeline);
  const goToSubStage     = useStageStore((s) => s.goToSubStage);

  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages]     = useState<ConvMsg[]>([]);
  const bottomRef    = useRef<HTMLDivElement>(null);
  const isDoneRef    = useRef(false);
  const initialised  = useRef(false);

  const isThisRunning = isRunning && currentStep === "intent";
  const isDone        = step?.status === "completed";

  const classification = (step?.metadata as Record<string, unknown> | undefined)
    ?.classification as Classification | undefined;

  // ── Initialise conversation from existing store state (e.g. after HMR / tab switch) ──
  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;
    const init: ConvMsg[] = [];
    if (featureBrief) {
      init.push({ role: "user", text: featureBrief, id: "init-user" });
    }
    if (step?.status === "completed" && step.content) {
      const cls = (step.metadata as Record<string, unknown> | undefined)
        ?.classification as Classification | undefined;
      init.push({
        role: "ai",
        content: step.content,
        classification: cls,
        model: step.model,
        costUsd: step.costUsd,
        durationMs: step.durationMs,
        id: "init-ai",
      });
      isDoneRef.current = true;
    }
    if (init.length) setMessages(init);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Append AI message when intent step completes ──
  useEffect(() => {
    if (isDone && !isDoneRef.current) {
      isDoneRef.current = true;
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: step?.content ?? "",
          classification,
          model: step?.model,
          costUsd: step?.costUsd,
          durationMs: step?.durationMs,
          id: `ai-${Date.now()}`,
        } satisfies AiConvMsg,
      ]);
    }
    if (!isDone) {
      isDoneRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDone]);

  // ── Auto-scroll ──
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent, isThisRunning]);

  function handleSend() {
    const val = inputValue.trim();
    if (!val || isThisRunning) return;
    setInputValue("");
    setMessages((prev) => [
      ...prev,
      { role: "user", text: val, id: `user-${Date.now()}` } satisfies UserConvMsg,
    ]);
    startPipeline(val);
  }

  const isEmpty = messages.length === 0 && !isThisRunning;

  return (
    <div className="flex flex-col w-full flex-1 min-h-0 bg-white border border-[#e2e8f0] rounded-lg p-5 shadow-sm overflow-hidden">

      {/* ── Header ── */}
      <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-[#f1f5f9] bg-white/80 backdrop-blur-sm">
        <div>
          <h2 className="text-[16px] font-semibold text-[#0b1c30] leading-6">Intent Refinement</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className={`w-2 h-2 rounded-full ${isThisRunning ? "bg-[#f59e0b] animate-pulse" : isDone ? "bg-[#10b981]" : "bg-[#cbd5e1]"}`}
            />
            <span className="text-[14px] text-[#45464d]">
              {isThisRunning
                ? "Agent active: analyzing intent…"
                : isDone
                ? "Agent active: Project Architect v2.4"
                : "Waiting to start"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <button className="p-2 rounded hover:bg-[#f1f5f9] text-[#64748b] transition-colors" title="Refresh">
            <RefreshIcon />
          </button>
          <button className="p-2 rounded hover:bg-[#f1f5f9] text-[#64748b] transition-colors" title="More">
            <MoreIcon />
          </button>
        </div>
      </div>

      {/* ── Chat History ── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6 space-y-6">

        {/* Empty state */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-[#94a3b8]">
            <div className="w-12 h-12 rounded-full bg-[#f8fafc] border border-[#e2e8f0] flex items-center justify-center">
              <AgentIcon />
            </div>
            <p className="text-[13px]">Describe your project idea to get started…</p>
          </div>
        )}

        {/* Conversation history */}
        {messages.map((msg) =>
          msg.role === "user" ? (
            <UserMessage key={msg.id} text={msg.text} />
          ) : (
            <div key={msg.id} className="space-y-1">
              <AIMessage
                content={msg.content}
                classification={(msg as AiConvMsg).classification}
              />
              <MetaBadge step={msg as AiConvMsg} />
            </div>
          )
        )}

        {/* Streaming AI message (while intent step runs) */}
        {isThisRunning && (
          <AIMessage
            content={streamingContent}
            isStreaming={!streamingContent}
          />
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input Area ── */}
      <div className="shrink-0 border-t border-[#f1f5f9] bg-white px-6 py-5">
        <div className="flex items-center gap-4 border border-[#e2e8f0] rounded-lg bg-[#f8fafc] px-2.5 py-2.5">
          {/* Attach button */}
          <button className="p-2 rounded text-[#94a3b8] hover:text-[#64748b] hover:bg-[#f1f5f9] transition-colors shrink-0">
            <AttachIcon />
          </button>

          {/* Text input */}
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={isThisRunning ? "Analyzing intent…" : "Describe or refine your project idea…"}
            className="flex-1 bg-transparent text-[16px] text-[#0b1c30] placeholder:text-[#6b7280] outline-none min-w-0 px-3 py-2"
            disabled={isThisRunning}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />

          {/* Send button */}
          <button
            onClick={handleSend}
            className="flex items-center gap-2 px-4 py-2 bg-[#07c160] text-white text-[16px] font-semibold rounded shrink-0 hover:bg-[#06a050] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!inputValue.trim() || isThisRunning}
          >
            <span>Send</span>
            <SendIcon />
          </button>

          {/* Next Step button */}
          <button
            onClick={() => goToSubStage("prd", "preparation")}
            disabled={!isDone}
            className="flex items-center gap-2 px-4 py-2 bg-[#4f46e5] text-white text-[16px] font-semibold rounded shrink-0 shadow-sm hover:bg-[#4338ca] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>Next Step</span>
            <ArrowRightIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
