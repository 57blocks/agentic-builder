"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePipelineStore } from "@/store/pipeline-store";
import { useStageStore } from "@/store/stage-store";
import StageInputBar from "@/components/StageInputBar";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import DesignStyleCard from "@/components/DesignStyleCard";

type DocTab = "prd" | "design" | "trd" | "qa";

const DOC_TABS: { id: DocTab; label: string }[] = [
  { id: "prd", label: "PRD" },
  { id: "design", label: "Design Document" },
  { id: "trd", label: "Technical Specs" },
  { id: "qa", label: "QA Plan" },
];

function CheckCircleIcon({ size = 15 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DesignSubStage() {
  const steps = usePipelineStore((s) => s.steps);
  const streamingContent = usePipelineStore((s) => s.streamingContent);
  const currentStep = usePipelineStore((s) => s.currentStep);
  const isRunning = usePipelineStore((s) => s.isRunning);
  const runDesignDoc = usePipelineStore((s) => s.runDesignDoc);
  const generateDesignStyles = usePipelineStore((s) => s.generateDesignStyles);
  const selectDesignStyle = usePipelineStore((s) => s.selectDesignStyle);
  const designStyles = usePipelineStore((s) => s.designStyles);
  const designStylesLoading = usePipelineStore((s) => s.designStylesLoading);
  const selectedDesignStyleId = usePipelineStore(
    (s) => s.selectedDesignStyleId,
  );
  const saveSubStageSnapshot = usePipelineStore((s) => s.saveSubStageSnapshotForSubStage);
  const goToSubStage = useStageStore((s) => s.goToSubStage);
  const isStageHydrated = useStageStore((s) => s.isStageHydrated);

  const prdContent = steps.prd?.content ?? "";
  const isDesignRunning = isRunning && currentStep === "design";

  // On first mount (after hydration + PRD restored), eagerly save a snapshot
  // for "preparation/design" so a refresh while on this substage can restore
  // the full steps state without needing to fall back to a previous substage.
  const didEagerSave = useRef(false);
  useEffect(() => {
    if (!isStageHydrated) return;
    if (didEagerSave.current) return;
    if (!prdContent.trim()) return;
    didEagerSave.current = true;
    saveSubStageSnapshot("preparation", "design");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStageHydrated, prdContent]);
  const designContent = isDesignRunning
    ? streamingContent
    : (steps.design?.content ?? "");
  const isDesignDone = steps.design?.status === "completed";

  const stylesGeneratedRef = useRef(false);
  const [editInput, setEditInput] = useState("");
  const [designDocStarted, setDesignDocStarted] = useState(false);

  const handleTabChange = (tab: DocTab) => {
    if (tab !== "design") {
      goToSubStage(tab, "preparation");
    }
  };

  const handleGenerateDesignDoc = () => {
    setDesignDocStarted(true);
    runDesignDoc();
  };

  // Auto-generate design styles once PRD is available
  useEffect(() => {
    const prdStep = steps.prd;
    const prdContent = prdStep?.content ?? "";

    console.log("[DesignSubStage] useEffect check:", {
      stylesGeneratedRef: stylesGeneratedRef.current,
      prdStatus: prdStep?.status,
      prdContentLength: prdContent.length,
      designStyles,
      designStylesLoading,
    });

    if (stylesGeneratedRef.current) {
      console.log("[DesignSubStage] Already generated, returning");
      return;
    }

    // Check if PRD has content (either completed or restored from snapshot)
    if (!prdContent.trim()) {
      console.log("[DesignSubStage] No PRD content, returning");
      return;
    }

    if (designStyles !== null) {
      console.log("[DesignSubStage] designStyles already set, returning");
      return;
    }

    if (designStylesLoading) {
      console.log("[DesignSubStage] Already loading styles, returning");
      return;
    }

    console.log("[DesignSubStage] Triggering generateDesignStyles");
    stylesGeneratedRef.current = true;
    generateDesignStyles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps.prd?.content, designStyles, designStylesLoading]);

  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden">
      {/* ── Secondary Document Tab Bar ── */}
      <div className="shrink-0 bg-white border-b border-[#e2e8f0] flex items-center justify-between px-8">
        {/* Tabs */}
        <div className="flex gap-8">
          {DOC_TABS.map((tab) => {
            const isActive = tab.id === "design";
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={[
                  "relative flex items-center gap-2 py-4.25 text-[14px] font-semibold transition-colors",
                  isActive
                    ? "text-[#712ae2] border-b-2 border-[#712ae2]"
                    : "text-[#94a3b8] hover:text-[#64748b]",
                ].join(" ")}
              >
                <span>{tab.label}</span>
                {/* show checkmark for done tabs */}
                {tab.id === "design" && isDesignDone && (
                  <span className="text-[#712ae2]">
                    <CheckCircleIcon size={15} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Header with refresh button - only show when style is selected */}
      <div className="flex items-center justify-end px-4 py-2 border-b border-slate-100 shrink-0">
        <button
          onClick={() => generateDesignStyles()}
          disabled={designStylesLoading}
          title="Regenerate Design Styles"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 hover:text-slate-900 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={designStylesLoading ? "animate-spin" : ""}
            aria-hidden
          >
            <path d="M21 2v6h-6" />
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
            <path d="M3 22v-6h6" />
            <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
          </svg>
          {designStylesLoading ? "Regenerating…" : "Regenerate Styles"}
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        {/* Loading Design Styles */}
        {designStylesLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center flex flex-col items-center gap-3">
              <svg
                className="animate-spin"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
              <p className="text-slate-600 font-medium">
                Analyzing PRD and generating design styles…
              </p>
            </div>
          </div>
        )}

        {/* Design Styles Selection Grid */}
        {!selectedDesignStyleId && designStyles && !designStylesLoading && (
          <div className="p-8">
            <div className="mb-6">
              <h2 className="text-[24px] font-bold text-slate-900 mb-2">
                Choose a Design Style
              </h2>
              <p className="text-slate-600 text-[14px]">
                Select a design style that best matches your product vision.
                Each style includes a color palette, typography, and spacing
                system.
              </p>
            </div>
            <div className="flex gap-6 overflow-x-auto pb-4">
              {designStyles.map((style) => (
                <div key={style.id} className="shrink-0 w-48">
                  <DesignStyleCard
                    style={style}
                    isSelected={selectedDesignStyleId === style.id}
                    onSelect={selectDesignStyle}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generate Design Doc Button & Design Doc Content */}
        {selectedDesignStyleId && !designDocStarted && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <p className="text-slate-600 text-[14px]">
              Ready to generate design document based on the selected style?
            </p>
            <button
              onClick={handleGenerateDesignDoc}
              className="flex items-center gap-2 px-6 py-3 bg-[#712ae2] text-white text-[14px] font-bold rounded-lg hover:bg-[#6b24da] transition-colors"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              Generate Design Doc
            </button>
          </div>
        )}

        {/* Design Doc Content */}
        {selectedDesignStyleId && designDocStarted && (
          <div className="border-b border-slate-100">
            {designContent ? (
              <div className="p-6 max-w-4xl mx-auto">
                <MarkdownRenderer content={designContent} />
              </div>
            ) : isDesignRunning ? (
              <div className="flex items-center justify-center py-20 gap-2 text-[#712ae2] text-[13px]">
                <svg
                  className="animate-spin"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                Generating Design Document…
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">
                <p className="text-sm">Waiting for design doc to generate…</p>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedDesignStyleId && designDocStarted && (
        <StageInputBar
          value={editInput}
          onChange={setEditInput}
          onSubmit={() => {
            const instruction = editInput.trim();
            if (!instruction || isDesignRunning) return;
            setEditInput("");
            runDesignDoc(instruction);
          }}
          placeholder="Ask AgenticBuilder to generate or revise the design spec…"
          disabled={isDesignRunning}
        />
      )}
    </div>
  );
}
