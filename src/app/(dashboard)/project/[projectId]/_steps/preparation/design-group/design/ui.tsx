"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useStepStore } from "@/store/step-store";
import { useStepNavigationStore } from "@/store/step-navigation-store";
import { usePipelineStore } from "@/store/pipeline-store";
import { getNextStep } from "@/_config/pipeline-flow";
import type { StepId } from "@/_config/pipeline-flow";
import StageInputBar from "@/components/StageInputBar";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import Loading from "@/components/Loading";
import type { StepUIProps } from "../../../_shared/types";

// ─── Style Carousel ──────────────────────────────────────────────────────────

import type { DesignStyle } from "@/components/DesignStyleCard";

const SLOTS: Record<number, { x: string; scale: number; opacity: number; z: number }> = {
  [-2]: { x: "-148%", scale: 0.62, opacity: 0.28, z: 0 },
  [-1]: { x: "-88%", scale: 0.78, opacity: 0.58, z: 1 },
  [0]:  { x: "0%", scale: 1.0, opacity: 1.0, z: 3 },
  [1]:  { x: "88%", scale: 0.78, opacity: 0.58, z: 1 },
  [2]:  { x: "148%", scale: 0.62, opacity: 0.28, z: 0 },
};

function circOffset(idx: number, active: number, total: number) {
  let d = idx - active;
  if (d > total / 2) d -= total;
  if (d < -total / 2) d += total;
  return d;
}

function StyleCarousel({
  styles, selectedId, onSelect,
}: { styles: DesignStyle[]; selectedId: string | null; onSelect: (id: string) => void }) {
  const total = styles.length;
  const initIdx = Math.max(0, styles.findIndex((s) => s.id === selectedId));
  const [active, setActive] = useState(initIdx);

  useEffect(() => {
    const idx = styles.findIndex((s) => s.id === selectedId);
    if (idx >= 0 && idx !== active) setActive(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const goTo = useCallback((idx: number) => { setActive(idx); onSelect(styles[idx].id); }, [styles, onSelect]);
  const prev = () => goTo((active - 1 + total) % total);
  const next = () => goTo((active + 1) % total);

  if (total === 0) return null;

  return (
    <div className="flex flex-col items-center gap-4 select-none">
      <div className="relative w-full flex items-center justify-center" style={{ height: 290 }}>
        <button onClick={prev} className="absolute left-2 z-20 flex items-center justify-center w-8 h-8 rounded-full bg-white border border-slate-200 shadow-md hover:bg-slate-50 hover:border-[#712ae2] transition-all">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <div className="relative w-44" style={{ height: 290 }}>
          {styles.map((style, idx) => {
            const offset = circOffset(idx, active, total);
            const slot = SLOTS[offset];
            const isCenter = offset === 0;
            const x = slot ? slot.x : offset < 0 ? "-260%" : "260%";
            const scale = slot ? slot.scale : 0.5;
            const opacity = slot ? slot.opacity : 0;
            const z = slot ? slot.z : 0;
            return (
              <div key={idx} onClick={() => { if (!isCenter && slot) goTo(idx); }}
                style={{ position: "absolute", inset: 0, transform: `translateX(${x}) scale(${scale})`, opacity, zIndex: z, transition: "transform 0.36s cubic-bezier(0.4,0,0.2,1), opacity 0.36s ease", cursor: isCenter ? "default" : slot ? "pointer" : "default", transformOrigin: "center center", pointerEvents: slot ? "auto" : "none" }}>
                <div className="flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden w-full h-full shadow-sm">
                  <div className="flex h-14 shrink-0">
                    {(["primary", "secondary", "tertiary", "neutral"] as const).map((key) => (
                      <div key={key} className="flex-1" style={{ backgroundColor: style.colors[key] }} />
                    ))}
                  </div>
                  <div className="p-2.5 flex flex-col gap-1.5 flex-1 min-h-0">
                    <div className="flex items-center justify-between gap-1">
                      <h3 className="text-[12px] font-bold text-slate-900 truncate">{style.name}</h3>
                      {isCenter && <span className="text-[8px] font-bold text-[#712ae2] bg-[rgba(113,42,226,0.08)] px-1.5 py-0.5 rounded-full shrink-0">Selected</span>}
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-2">{style.description}</p>
                    <div className="flex items-center gap-2 pt-1.5 border-t border-slate-100 mt-auto">
                      <span className="text-[22px] font-bold leading-none shrink-0" style={{ color: style.colors.primary, fontFamily: style.typography.headlineFont }}>Aa</span>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-[9px] text-slate-500 truncate">{style.typography.headlineFont}</span>
                        <span className="text-[9px] text-slate-400 truncate">{style.typography.bodyFont}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="text-[9px] font-semibold text-white px-1.5 py-0.5 rounded" style={{ backgroundColor: style.colors.primary }}>Primary</div>
                      <div className="text-[9px] font-semibold px-1.5 py-0.5 rounded border" style={{ color: style.colors.secondary, borderColor: style.colors.secondary }}>Outlined</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <button onClick={next} className="absolute right-2 z-20 flex items-center justify-center w-8 h-8 rounded-full bg-white border border-slate-200 shadow-md hover:bg-slate-50 hover:border-[#712ae2] transition-all">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      </div>
      <div className="flex items-center gap-2">
        {styles.map((s, i) => (
          <button key={s.id} onClick={() => goTo(i)} className={`rounded-full transition-all duration-300 ${i === active ? "w-5 h-2 bg-[#712ae2]" : "w-2 h-2 bg-slate-300 hover:bg-slate-400"}`} aria-label={s.name} />
        ))}
      </div>
    </div>
  );
}

// ─── Screenshot Carousel ─────────────────────────────────────────────────────

interface ScreenshotItem { screenId: string; title: string; screenshotUrl: string; }

function ScreenshotCarousel({
  screenshots, activeIdx, onPrev, onNext, onDot, projectUrl, projectId,
}: { screenshots: ScreenshotItem[]; activeIdx: number; onPrev: () => void; onNext: () => void; onDot: (i: number) => void; projectUrl: string; projectId: string; }) {
  const [zoom, setZoom] = useState(1);
  const [htmlDownloading, setHtmlDownloading] = useState(false);
  useEffect(() => { setZoom(1); }, [activeIdx]);

  const handleDownloadHtml = async () => {
    if (!cur?.screenId || htmlDownloading) return;
    setHtmlDownloading(true);
    try {
      const res = await fetch(`/api/stitch-html?projectId=${encodeURIComponent(projectId)}&screenId=${encodeURIComponent(cur.screenId)}`);
      if (!res.ok) throw new Error(await res.text());
      const html = await res.text();
      const blob = new Blob([html], { type: "text/html" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${cur.title || "screen"}.html`; a.click();
      URL.revokeObjectURL(a.href);
    } catch { /* ignore */ } finally { setHtmlDownloading(false); }
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ x: number; y: number; scrollX: number; scrollY: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const el = scrollRef.current; if (!el) return;
    dragState.current = { x: e.clientX, y: e.clientY, scrollX: el.scrollLeft, scrollY: el.scrollTop };
    setIsDragging(true);
  };
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragState.current || !scrollRef.current) return;
      const dx = e.clientX - dragState.current.x; const dy = e.clientY - dragState.current.y;
      scrollRef.current.scrollLeft = dragState.current.scrollX - dx;
      scrollRef.current.scrollTop = dragState.current.scrollY - dy;
    };
    const onUp = () => { dragState.current = null; setIsDragging(false); };
    window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  const handleWheel = (e: React.WheelEvent) => { e.preventDefault(); setZoom((z) => Math.min(4, Math.max(0.25, z - e.deltaY * 0.001))); };
  const cur = screenshots[activeIdx];
  const cursor = isDragging ? "grabbing" : zoom > 1 ? "grab" : "zoom-in";

  return (
    <div className="relative w-full h-full">
      <div ref={scrollRef} className="w-full h-full overflow-auto flex items-start justify-center p-6" onWheel={handleWheel} onMouseDown={handleMouseDown} style={{ cursor, userSelect: "none" }}>
        <img key={cur?.screenshotUrl} src={cur?.screenshotUrl} alt={cur?.title} draggable={false} className="rounded-xl shadow-2xl transition-transform duration-100" style={{ transform: `scale(${zoom})`, transformOrigin: "top center", maxWidth: "100%" }} />
      </div>
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
        {cur?.screenId && (<>
          <a href={`/api/stitch-html?projectId=${encodeURIComponent(projectId)}&screenId=${encodeURIComponent(cur.screenId)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2 py-1 rounded-md bg-black/50 hover:bg-black/75 backdrop-blur-sm text-white text-[11px] font-medium transition-colors">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
            预览
          </a>
          <button onClick={handleDownloadHtml} disabled={htmlDownloading} className="flex items-center gap-1 px-2 py-1 rounded-md bg-black/50 hover:bg-black/75 backdrop-blur-sm text-white text-[11px] font-medium transition-colors disabled:opacity-50">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            {htmlDownloading ? "下载中…" : "下载 HTML"}
          </button>
        </>)}
      </div>
      {zoom !== 1 && (
        <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white text-[11px] font-medium select-none">
          {Math.round(zoom * 100)}%
          <button onClick={() => setZoom(1)} className="ml-1 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}
      {screenshots.length > 1 && (<button onClick={onPrev} className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-sm text-white transition-all shadow-lg"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg></button>)}
      {screenshots.length > 1 && (<button onClick={onNext} className="absolute right-4 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-sm text-white transition-all shadow-lg"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg></button>)}
      {screenshots.length > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 px-4 py-2 rounded-full bg-black/50 backdrop-blur-sm">
          <div className="flex items-center gap-1.5">
            {screenshots.map((s, i) => (<button key={s.screenId} onClick={() => onDot(i)} title={s.title} className={`rounded-full transition-all duration-200 ${i === activeIdx ? "w-5 h-2 bg-white" : "w-2 h-2 bg-white/40 hover:bg-white/70"}`} />))}
          </div>
          <span className="text-[11px] text-white/70 font-medium whitespace-nowrap">{activeIdx + 1} / {screenshots.length}</span>
        </div>
      )}
    </div>
  );
}

// ─── Phase type ───────────────────────────────────────────────────────────────

type DesignPhase = "style" | "spec" | "stitch";

// ─── Main Component ───────────────────────────────────────────────────────────

export function DesignUI(props: StepUIProps) {
  const steps = useStepStore((s) => s.steps);
  const streamingContent = useStepStore((s) => s.streamingContent);
  const currentStep = useStepStore((s) => s.currentStep);
  const isRunning = useStepStore((s) => s.isRunning);
  const executeStep = useStepStore((s) => s.executeStep);
  const tier = useStepNavigationStore((s) => s.tier);
  const nextStep = getNextStep("design", tier);

  // ── Design styles state (from pipeline-store) ──
  const designStyles = usePipelineStore((s) => s.designStyles);
  const designStylesLoading = usePipelineStore((s) => s.designStylesLoading);
  const selectedDesignStyleId = usePipelineStore((s) => s.selectedDesignStyleId);

  // ── Stitch state (from pipeline-store) ──
  const stitchResult = usePipelineStore((s) => s.stitchResult);
  const stitchGenerating = usePipelineStore((s) => s.stitchGenerating);
  const stitchError = usePipelineStore((s) => s.stitchError);

  // ── Derived step state ──
  const isDesignRunning = isRunning && currentStep === "design";
  const designContent = isDesignRunning ? streamingContent : (steps.design?.content ?? "");
  const isDesignDone = steps.design?.status === "completed";

  // ── Phase navigation (replaces tabs) ──
  const [phase, setPhase] = useState<DesignPhase>("style");

  // Advance to spec when design doc completes
  const prevDesignRunning = useRef(isDesignRunning);
  useEffect(() => {
    if (prevDesignRunning.current && !isDesignRunning && isDesignDone) setPhase("spec");
    prevDesignRunning.current = isDesignRunning;
  }, [isDesignRunning, isDesignDone]);

  // Jump to spec if design content already exists on entry (e.g., from snapshot)
  useEffect(() => {
    if (steps.design?.content && !isDesignRunning) setPhase("spec");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Stitch screenshots ──
  const [promptCopied, setPromptCopied] = useState(false);
  const [stitchScreenshots, setStitchScreenshots] = useState<ScreenshotItem[]>([]);
  const [stitchScreensLoading, setStitchScreensLoading] = useState(false);
  const [screenshotIdx, setScreenshotIdx] = useState(0);

  useEffect(() => {
    if (!stitchResult?.projectId) { setStitchScreenshots([]); setScreenshotIdx(0); return; }
    setStitchScreensLoading(true); setStitchScreenshots([]); setScreenshotIdx(0);
    fetch(`/api/stitch-screens?projectId=${encodeURIComponent(stitchResult.projectId)}`)
      .then((r) => r.ok ? r.json() : Promise.reject(r.statusText))
      .then((data) => {
        const list = (data.screenshots ?? []) as ScreenshotItem[];
        setStitchScreenshots(list.length === 0 && stitchResult.screenshotUrl
          ? [{ screenId: stitchResult.screenId, title: "Screen 1", screenshotUrl: stitchResult.screenshotUrl }] : list);
      })
      .catch(() => {
        if (stitchResult.screenshotUrl) setStitchScreenshots([{ screenId: stitchResult.screenId, title: "Screen 1", screenshotUrl: stitchResult.screenshotUrl }]);
      })
      .finally(() => setStitchScreensLoading(false));
  }, [stitchResult?.projectId]);

  const hasStitchContent = !!(stitchResult || stitchError || stitchGenerating);

  // ── Input state ──
  const [specInput, setSpecInput] = useState("");
  const [stitchInput, setStitchInput] = useState("");

  // ── Actions ──
  const handleGenerateDesignDoc = () => { void executeStep("design"); setPhase("spec"); };
  const handleGenerateWithStitch = (instruction?: string) => {
    if (!selectedDesignStyleId) return;
    usePipelineStore.getState().runStitchGenerate(instruction);
    setPhase("stitch");
  };

  // ── Auto-generate design styles once PRD content is available ──
  const designStylesPrdHash = usePipelineStore((s) => s.designStylesPrdHash);
  const designStylesError = usePipelineStore((s) => s.designStylesError);

  useEffect(() => {
    const prdContent = steps.prd?.content ?? "";
    const hasPrd = !!prdContent.trim();

    console.log("[design-ui] auto-styles check", {
      hasPrd,
      designStylesLoading,
      designStylesIsNull: designStyles === null,
      designStylesIsArray: Array.isArray(designStyles),
      designStylesLen: Array.isArray(designStyles) ? designStyles.length : 0,
      designStylesPrdHash,
      designStylesError,
    });

    if (!hasPrd) return;
    if (designStylesLoading) return;
    if (Array.isArray(designStyles) && designStyles.length > 0 && designStylesPrdHash === `${prdContent.length}:${prdContent.slice(0, 100)}`) return;
    if (designStyles === null && !designStylesError) {
      // Sync PRD content to pipeline-store so generateDesignStyles can read it
      const pipelineSteps = usePipelineStore.getState().steps;
      if (!pipelineSteps.prd?.content) {
        console.log("[design-ui] ↻ syncing PRD content to pipeline-store");
        usePipelineStore.setState({
          steps: { ...pipelineSteps, prd: steps.prd },
        });
      }
      console.log("[design-ui] ✓ triggering generateDesignStyles()");
      usePipelineStore.getState().generateDesignStyles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps.prd?.content, designStyles, designStylesPrdHash, designStylesLoading, designStylesError]);

  // Detect interrupted PRD: status is "running" but no content
  const prdInterrupted = steps.prd?.status === "running" && !steps.prd?.content;

  // ── External nav to other steps ──
  const goToTab = (tab: string) => {
    if (tab === "prd") props.onNavigate("prd" as StepId);
    else if (tab === "trd") props.onNavigate("trd" as StepId);
    else if (tab === "qa") props.onNavigate("qa" as StepId);
  };

  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden">

      {/* ── Phase indicator ── */}
      <div className="shrink-0 bg-slate-50 border-b border-[#e2e8f0] flex items-center px-8 py-3 gap-2 text-[13px] text-slate-500">
        <span className={phase === "style" ? "text-[#712ae2] font-semibold" : ""}>Style</span>
        <span className="text-slate-300">→</span>
        <span className={phase === "spec" ? "text-[#712ae2] font-semibold" : ""}>Design Spec</span>
        <span className="text-slate-300">→</span>
        <span className={phase === "stitch" ? "text-[#712ae2] font-semibold" : ""}>Stitch Design</span>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 overflow-y-auto">
        {/* ══ Phase 1: Style Selection ══ */}
        {phase === "style" && (
          <>
            {designStylesLoading && (
              <div className="flex items-center justify-center h-full"><Loading size="lg" text="Analyzing PRD and generating design styles…" /></div>
            )}
            {!designStylesLoading && designStyles && (
              <div className="p-8 flex flex-col gap-8">
                <div>
                  <h2 className="text-[22px] font-bold text-slate-900 mb-1">Choose a Design Style</h2>
                  <p className="text-slate-500 text-[13px]">Select the style that best fits your product vision.</p>
                </div>
                <StyleCarousel styles={designStyles} selectedId={selectedDesignStyleId} onSelect={(id) => usePipelineStore.getState().selectDesignStyle(id)} />
              </div>
            )}
            {!designStylesLoading && !designStyles && (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
                {prdInterrupted ? (
                  <>
                    <p className="text-sm">PRD generation was interrupted. Go back to PRD to complete it.</p>
                    <button onClick={() => props.onNavigate("prd" as StepId)}
                      className="px-4 py-2 text-[13px] font-medium text-white bg-[#712ae2] rounded-lg hover:bg-[#6b24da] transition-colors">
                      Go to PRD
                    </button>
                  </>
                ) : (
                  <p className="text-sm">Waiting for PRD to generate styles…</p>
                )}
              </div>
            )}
          </>
        )}

        {/* ══ Phase 2: Design Spec ══ */}
        {phase === "spec" && (
          <>
            {isDesignRunning ? (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <Loading size="lg" text="Generating Design System Spec…" />
                <p className="text-[12px] text-slate-400">Building your HTML design system document…</p>
              </div>
            ) : designContent ? (
              (() => {
                const trimmed = designContent.trimStart();
                const isHtml = trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html") || trimmed.startsWith("<!");
                if (isHtml) {
                  return (
                    <div className="relative h-full">
                      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
                        <button onClick={() => { const blob = new Blob([designContent], { type: "text/html" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "design-system.html"; a.click(); URL.revokeObjectURL(a.href); }} className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-white bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-md transition-all"><DownloadIcon /> Download HTML</button>
                        <button onClick={() => { const blob = new Blob([designContent], { type: "text/html" }); const url = URL.createObjectURL(blob); window.open(url, "_blank"); setTimeout(() => URL.revokeObjectURL(url), 5000); }} className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-white bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-md transition-all"><OpenIcon /> Open in Tab</button>
                      </div>
                      <iframe srcDoc={designContent} sandbox="allow-scripts allow-same-origin" className="w-full h-full border-0" title="Design System Spec" />
                    </div>
                  );
                }
                return (<div className="p-6 max-w-4xl mx-auto"><MarkdownRenderer content={designContent} /></div>);
              })()
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400"><p className="text-sm">Waiting for design spec to generate…</p></div>
            )}
          </>
        )}

        {/* ══ Phase 3: Stitch Design ══ */}
        {phase === "stitch" && (
          <>
            {stitchGenerating && (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <Loading size="lg" text="Generating with Stitch…" />
                <p className="text-[12px] text-slate-400">This may take a minute.</p>
              </div>
            )}
            {!stitchGenerating && stitchError && (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                <div className="text-center max-w-sm"><p className="text-[13px] font-semibold text-red-600">Stitch generation failed</p><p className="text-[12px] text-slate-500 mt-1 break-all">{stitchError}</p></div>
                <button onClick={() => handleGenerateWithStitch()} disabled={!selectedDesignStyleId} className="mt-2 px-4 py-2 text-[12px] font-medium text-white bg-[#712ae2] rounded-lg hover:bg-[#6b24da] transition-colors disabled:opacity-40">Retry</button>
              </div>
            )}
            {!stitchGenerating && stitchResult && (
              <div className="flex flex-col h-full">
                <div className="shrink-0 flex items-center gap-3 px-5 py-3 bg-violet-50 border-b border-violet-100">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                  <div className="flex-1 min-w-0"><p className="text-[12px] font-semibold text-violet-700">Stitch Design Generated</p><p className="text-[11px] text-violet-500 font-mono truncate">{stitchResult.projectUrl}</p></div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => { navigator.clipboard.writeText(stitchResult.projectUrl).then(() => { setPromptCopied(true); setTimeout(() => setPromptCopied(false), 2000); }); }} className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-violet-700 bg-white border border-violet-200 rounded-md hover:bg-violet-50 transition-colors">{promptCopied ? "Copied!" : "Copy URL"}</button>
                    <a href={stitchResult.projectUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-white bg-violet-600 rounded-md hover:bg-violet-700 transition-colors">Open in Stitch</a>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden bg-slate-950 relative">
                  {stitchScreensLoading && (<div className="flex items-center justify-center h-full"><Loading size="lg" text="Loading design screenshots…" /></div>)}
                  {!stitchScreensLoading && stitchScreenshots.length > 0 && (
                    <ScreenshotCarousel screenshots={stitchScreenshots} activeIdx={screenshotIdx} onPrev={() => setScreenshotIdx((i) => (i - 1 + stitchScreenshots.length) % stitchScreenshots.length)} onNext={() => setScreenshotIdx((i) => (i + 1) % stitchScreenshots.length)} onDot={setScreenshotIdx} projectUrl={stitchResult.projectUrl} projectId={stitchResult.projectId} />
                  )}
                  {!stitchScreensLoading && stitchScreenshots.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-violet-100 flex items-center justify-center"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg></div>
                      <div className="text-center"><p className="text-[14px] font-semibold text-slate-700">设计已生成</p><p className="text-[12px] text-slate-400 mt-1">截图暂时不可用，请在 Stitch 中查看</p></div>
                      <a href={stitchResult.projectUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-[13px] font-medium transition-colors">在 Stitch 中打开</a>
                    </div>
                  )}
                </div>
              </div>
            )}
            {!stitchGenerating && !stitchResult && !stitchError && (
              <div className="flex items-center justify-center h-full text-slate-400"><p className="text-sm">Waiting for design to generate…</p></div>
            )}
          </>
        )}
      </div>

      {/* ── Bottom navigation bar ── */}
      <div className="shrink-0 border-t border-[#e2e8f0] bg-white px-8 py-3 flex items-center justify-between">
        <div>
          {phase !== "style" && (
            <button onClick={() => setPhase(phase === "spec" ? "style" : "spec")} className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              <ArrowLeft size={14} /> Previous
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {phase === "style" && (
            <button onClick={handleGenerateDesignDoc} disabled={!selectedDesignStyleId || isDesignRunning}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#712ae2] text-white text-[13px] font-semibold rounded-lg hover:bg-[#6b24da] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              {!selectedDesignStyleId ? "Select a style to continue" : isDesignRunning ? <><Loading size="sm" /> Generating…</> : <>Generate Design Spec <ArrowRight size={14} /></>}
            </button>
          )}
          {phase === "spec" && (
            <>
              <StageInputBar
                value={specInput} onChange={setSpecInput}
                onSubmit={() => { const i = specInput.trim(); if (!i || isDesignRunning) return; setSpecInput(""); void executeStep("design", i); }}
                placeholder="Edit the design spec…"
                disabled={isDesignRunning}
                actions={
                  <button onClick={() => { setSpecInput(""); handleGenerateWithStitch(specInput.trim() || undefined); }}
                    disabled={!selectedDesignStyleId || !steps.design?.content || isRunning}
                    className="flex items-center gap-2 shrink-0 px-4 py-2 bg-[#712ae2] text-white text-[13px] font-semibold rounded-full hover:bg-[#6b24da] transition-colors disabled:opacity-40">
                    Generate with Stitch
                  </button>
                }
              />
            </>
          )}
          {phase === "stitch" && (
            <StageInputBar
              value={stitchInput} onChange={setStitchInput}
              onSubmit={() => { const i = stitchInput.trim(); if (!i || isRunning) return; setStitchInput(""); handleGenerateWithStitch(i); }}
              placeholder="Describe changes…"
              disabled={isRunning}
              actions={
                <button onClick={() => { if (nextStep) props.onNavigate(nextStep); }} disabled={isRunning}
                  className="flex items-center gap-2 shrink-0 px-4 py-2.5 bg-[#712ae2] text-white text-[13px] font-semibold rounded-full hover:bg-[#6b24da] transition-colors disabled:opacity-40">
                  Next Step <ArrowRight size={14} />
                </button>
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Inline SVG icons ────────────────────────────────────────────────────────

function DownloadIcon() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>;
}

function OpenIcon() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>;
}
