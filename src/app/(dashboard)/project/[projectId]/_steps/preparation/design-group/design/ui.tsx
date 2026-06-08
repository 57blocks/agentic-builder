"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, X, Link, Loader2, RefreshCw, GitCompare } from "lucide-react";
import { useStepStore } from "@/store/step-store";
import { usePipelineStore } from "@/store/pipeline-store";
import { useStepNavigationStore } from "@/store/step-navigation-store";
import type { StepId } from "@/_config/pipeline-flow";
import { getNextStep } from "@/_config/pipeline-flow";
import StageInputBar from "@/components/StageInputBar";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import Loading from "@/components/Loading";
import { RouteReferenceGrid } from "@/components/RouteReferenceGrid";
import type { StepUIProps } from "../../../_shared/types";
import { DocDiffView } from "../../../_shared/DocDiffView";
import {
  setDesignContext,
  generateDesignStyles,
  runStitchGenerate,
  type DesignStyle,
  type StitchGenerateResult,
} from "./agent";

/**
 * Build the `designDirectionPrompt` fragment for a fetched reference URL.
 * Prefers the Electron-extracted token block; falls back to the raw HTML
 * returned by the non-Electron server fetch.
 */

interface KbRecord {
  id: string;
  body: string;
  isStyleSpec: boolean;
  imageName?: string | null;
  imagePath?: string | null;
}
interface KbStyleSpec {
  summary: string;
  vibe?: string[];
  imageName: string;
  palette: { primary: { hex: string }; accent?: { hex: string }; secondary?: { hex: string }; surface: { hex: string }; background: { hex: string } };
  typography: { headingFont: string; bodyFont: string; monoFont?: string; baseSizePx: number };
  spacing: { basePx: number };
}
function extractKbStyleSpec(body: string): KbStyleSpec | null {
  const marker = "<!-- style-spec:json";
  const openIdx = body.indexOf(marker);
  if (openIdx < 0) return null;
  const startIdx = openIdx + marker.length;
  const closeIdx = body.indexOf("-->", startIdx);
  if (closeIdx < 0) return null;
  try { return JSON.parse(body.slice(startIdx, closeIdx).trim()) as KbStyleSpec; } catch { return null; }
}
function kbSpecToDesignStyle(spec: KbStyleSpec, recordId: string, imageName?: string | null): DesignStyle {
  const name = (imageName ?? spec.imageName).replace(/\.\w+$/, "").replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    id: `kb-${recordId}`,
    name,
    description: spec.summary,
    colors: {
      primary: spec.palette.primary.hex,
      secondary: spec.palette.accent?.hex ?? spec.palette.secondary?.hex ?? spec.palette.primary.hex,
      tertiary: spec.palette.surface.hex,
      neutral: spec.palette.background.hex,
    },
    typography: {
      headlineFont: spec.typography.headingFont,
      bodyFont: spec.typography.bodyFont,
      labelFont: spec.typography.monoFont ?? spec.typography.bodyFont,
    },
    fontSizes: { h1: 36, h2: 28, h3: 22, body: spec.typography.baseSizePx, label: 12 },
    spacing: { xs: spec.spacing.basePx, sm: spec.spacing.basePx * 2, md: spec.spacing.basePx * 4, lg: spec.spacing.basePx * 6, xl: spec.spacing.basePx * 8 },
  };
}

// ─── Style Carousel ──────────────────────────────────────────────────────────

const SLOTS: Record<number, { x: string; scale: number; opacity: number; z: number }> = {
  [-2]: { x: "-148%", scale: 0.62, opacity: 0.28, z: 0 },
  [-1]: { x: "-88%", scale: 0.78, opacity: 0.58, z: 1 },
  [0]: { x: "0%", scale: 1.0, opacity: 1.0, z: 3 },
  [1]: { x: "88%", scale: 0.78, opacity: 0.58, z: 1 },
  [2]: { x: "148%", scale: 0.62, opacity: 0.28, z: 0 },
};

function circOffset(idx: number, active: number, total: number) {
  let d = idx - active;
  if (d > total / 2) d -= total;
  if (d < -total / 2) d += total;
  return d;
}

function StyleCarousel({
  styles,
  selectedId,
  onSelect,
}: {
  styles: DesignStyle[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const total = styles.length;
  const initIdx = Math.max(0, styles.findIndex((s) => s.id === selectedId));
  const [active, setActive] = useState(initIdx);

  useEffect(() => {
    const idx = styles.findIndex((s) => s.id === selectedId);
    if (idx >= 0 && idx !== active) setActive(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const goTo = useCallback(
    (idx: number) => {
      setActive(idx);
      onSelect(styles[idx].id);
    },
    [styles, onSelect],
  );
  const prev = () => goTo((active - 1 + total) % total);
  const next = () => goTo((active + 1) % total);

  if (total === 0) return null;

  return (
    <div className="flex flex-col items-center gap-4 select-none">
      <div
        className="relative w-full flex items-center justify-center"
        style={{ height: 220 }}
      >
        <button
          onClick={prev}
          className="absolute left-2 z-20 flex items-center justify-center w-8 h-8 rounded-full bg-white border border-slate-200 shadow-md hover:bg-slate-50 hover:border-indigo-600 transition-all"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="relative w-44" style={{ height: 220 }}>
          {styles.map((style, idx) => {
            const offset = circOffset(idx, active, total);
            const slot = SLOTS[offset];
            const isCenter = offset === 0;
            const x = slot ? slot.x : offset < 0 ? "-260%" : "260%";
            const scale = slot ? slot.scale : 0.5;
            const opacity = slot ? slot.opacity : 0;
            const z = slot ? slot.z : 0;
            return (
              <div
                key={idx}
                onClick={() => {
                  if (!isCenter && slot) goTo(idx);
                }}
                style={{
                  position: "absolute",
                  inset: 0,
                  transform: `translateX(${x}) scale(${scale})`,
                  opacity,
                  zIndex: z,
                  transition:
                    "transform 0.36s cubic-bezier(0.4,0,0.2,1), opacity 0.36s ease",
                  cursor: isCenter ? "default" : slot ? "pointer" : "default",
                  transformOrigin: "center center",
                  pointerEvents: slot ? "auto" : "none",
                }}
              >
                <div className="flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden w-full h-full shadow-sm">
                  <div className="flex h-10 shrink-0">
                    {(
                      ["primary", "secondary", "tertiary", "neutral"] as const
                    ).map((key) => (
                      <div
                        key={key}
                        className="flex-1"
                        style={{ backgroundColor: style.colors[key] }}
                      />
                    ))}
                  </div>
                  <div className="p-2 flex flex-col gap-1 flex-1 min-h-0">
                    {style.id.startsWith("kb-") && (
                      <div className="flex items-center gap-1 mb-0.5">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                        <span className="text-[7px] font-bold uppercase tracking-wider text-amber-600">From 57 Knowledge Base</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-1">
                      <h3 className="text-[11px] font-bold text-slate-900 truncate">
                        {style.name}
                      </h3>
                      {isCenter && (
                        <span className="text-[8px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full shrink-0">
                          Selected
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-2">
                      {style.description}
                    </p>
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100 mt-auto">
                      <span
                        className="text-[18px] font-bold leading-none shrink-0"
                        style={{
                          color: style.colors.primary,
                          fontFamily: style.typography.headlineFont,
                        }}
                      >
                        Aa
                      </span>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-[9px] text-slate-500 truncate">
                          {style.typography.headlineFont}
                        </span>
                        <span className="text-[9px] text-slate-400 truncate">
                          {style.typography.bodyFont}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <div
                        className="text-[8px] font-semibold text-white px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: style.colors.primary }}
                      >
                        Primary
                      </div>
                      <div
                        className="text-[8px] font-semibold px-1.5 py-0.5 rounded border"
                        style={{
                          color: style.colors.secondary,
                          borderColor: style.colors.secondary,
                        }}
                      >
                        Outlined
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <button
          onClick={next}
          className="absolute right-2 z-20 flex items-center justify-center w-8 h-8 rounded-full bg-white border border-slate-200 shadow-md hover:bg-slate-50 hover:border-indigo-600 transition-all"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
      <div className="flex items-center gap-2">
        {styles.map((s, i) => (
          <button
            key={s.id}
            onClick={() => goTo(i)}
            className={`rounded-full transition-all duration-300 ${
              i === active
                ? "w-5 h-2 bg-indigo-600"
                : "w-2 h-2 bg-slate-300 hover:bg-slate-400"
            }`}
            aria-label={s.name}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Screenshot Carousel ─────────────────────────────────────────────────────

interface ScreenshotItem {
  screenId: string;
  title: string;
  screenshotUrl: string;
}

function ScreenshotCarousel({
  screenshots,
  activeIdx,
  onPrev,
  onNext,
  onDot,
  projectId,
}: {
  screenshots: ScreenshotItem[];
  activeIdx: number;
  onPrev: () => void;
  onNext: () => void;
  onDot: (i: number) => void;
  projectId: string;
}) {
  const [zoom, setZoom] = useState(1);
  const [htmlDownloading, setHtmlDownloading] = useState(false);
  const [imgLoadAttempts, setImgLoadAttempts] = useState<Record<string, number>>({});
  useEffect(() => {
    setZoom(1);
  }, [activeIdx]);

  const handleDownloadHtml = async () => {
    const cur = screenshots[activeIdx];
    if (!cur?.screenId || htmlDownloading) return;
    setHtmlDownloading(true);
    try {
      const res = await fetch(
        `/api/stitch-html?projectId=${encodeURIComponent(projectId)}&screenId=${encodeURIComponent(cur.screenId)}`,
      );
      if (!res.ok) throw new Error(await res.text());
      const html = await res.text();
      const blob = new Blob([html], { type: "text/html" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${cur.title || "screen"}.html`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      /* ignore */
    } finally {
      setHtmlDownloading(false);
    }
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{
    x: number;
    y: number;
    scrollX: number;
    scrollY: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const el = scrollRef.current;
    if (!el) return;
    dragState.current = {
      x: e.clientX,
      y: e.clientY,
      scrollX: el.scrollLeft,
      scrollY: el.scrollTop,
    };
    setIsDragging(true);
  };
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragState.current || !scrollRef.current) return;
      const dx = e.clientX - dragState.current.x;
      const dy = e.clientY - dragState.current.y;
      scrollRef.current.scrollLeft = dragState.current.scrollX - dx;
      scrollRef.current.scrollTop = dragState.current.scrollY - dy;
    };
    const onUp = () => {
      dragState.current = null;
      setIsDragging(false);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.min(4, Math.max(0.25, z - e.deltaY * 0.001)));
  };
  const cur = screenshots[activeIdx];
  const cursor = isDragging ? "grabbing" : zoom > 1 ? "grab" : "zoom-in";

  return (
    <div className="relative w-full h-full">
      <div
        ref={scrollRef}
        className="w-full h-full overflow-auto flex items-start justify-center p-6"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        style={{ cursor, userSelect: "none" }}
      >
        <img
          key={`${cur?.screenshotUrl}::${imgLoadAttempts[cur?.screenshotUrl ?? ""] ?? 0}`}
          src={cur?.screenshotUrl}
          alt={cur?.title}
          draggable={false}
          className="rounded-xl shadow-2xl transition-transform duration-100"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "top center",
            maxWidth: "100%",
          }}
          onError={() => {
            const url = cur?.screenshotUrl;
            if (!url) return;
            const attempts = imgLoadAttempts[url] ?? 0;
            if (attempts < 3) {
              setImgLoadAttempts((m) => ({ ...m, [url]: attempts + 1 }));
            }
          }}
        />
      </div>
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
        {cur?.screenId && (
          <>
            <a
              href={`/api/stitch-html?projectId=${encodeURIComponent(projectId)}&screenId=${encodeURIComponent(cur.screenId)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-black/50 hover:bg-black/75 backdrop-blur-sm text-white text-[11px] font-medium transition-colors"
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              Preview
            </a>
            <button
              onClick={handleDownloadHtml}
              disabled={htmlDownloading}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-black/50 hover:bg-black/75 backdrop-blur-sm text-white text-[11px] font-medium transition-colors disabled:opacity-50"
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {htmlDownloading ? "Downloading…" : "Download HTML"}
            </button>
          </>
        )}
      </div>
      {zoom !== 1 && (
        <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white text-[11px] font-medium select-none">
          {Math.round(zoom * 100)}%
          <button
            onClick={() => setZoom(1)}
            className="ml-1 opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}
      {screenshots.length > 1 && (
        <button
          onClick={onPrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-sm text-white transition-all shadow-lg"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}
      {screenshots.length > 1 && (
        <button
          onClick={onNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-sm text-white transition-all shadow-lg"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}
      {screenshots.length > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 px-4 py-2 rounded-full bg-black/50 backdrop-blur-sm">
          <div className="flex items-center gap-1.5">
            {screenshots.map((s, i) => (
              <button
                key={s.screenId}
                onClick={() => onDot(i)}
                title={s.title}
                className={`rounded-full transition-all duration-200 ${
                  i === activeIdx
                    ? "w-5 h-2 bg-white"
                    : "w-2 h-2 bg-white/40 hover:bg-white/70"
                }`}
              />
            ))}
          </div>
          <span className="text-[11px] text-white/70 font-medium whitespace-nowrap">
            {activeIdx + 1} / {screenshots.length}
          </span>
        </div>
      )}
    </div>
  );
}


// ─── Phase type ───────────────────────────────────────────────────────────────

type DesignPhase = "style" | "spec" | "stitch";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makePrdHash(prdContent: string): string {
  return `${prdContent.length}:${prdContent.slice(0, 100)}`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DesignUI(props: StepUIProps) {
  // ── Step-store state (single source of truth, like PRD) ──
  const steps = useStepStore((s) => s.steps);
  const streamingContent = useStepStore((s) => s.streamingContent);
  const currentStep = useStepStore((s) => s.currentStep);
  const isRunning = useStepStore((s) => s.isRunning);
  const executeStep = useStepStore((s) => s.executeStep);
  const patchStepMeta = useStepStore((s) => s.patchStepMeta);
  const kickoffSessionId = useStepStore((s) => s.kickoffSessionId);
  const intentMeta = useStepStore((s) => s.steps.intent?.metadata as { classification?: { type?: string } } | undefined);
  const tier = useStepNavigationStore((s) => s.tier);

  // Track the original AI-generated design spec for memory capture
  const originalDesignRef = useRef<string>("");

  // ── Read persisted metadata from step-store (survives navigation) ──
  const designMeta = (steps.design?.metadata ?? {}) as {
    selectedStyleId?: string | null;
    designStyles?: DesignStyle[] | null;
    designSourceMode?: "ai" | "custom";
    stitchResult?: StitchGenerateResult | null;
    prdHash?: string | null;
    recalledKnowledgeIds?: string[] | null;
  };

  // ── Local design state ──────────────────────────────────────────────────
  const [phase, setPhase] = useState<DesignPhase>("style");
  // Previous design spec captured right before a Regenerate, so the user can
  // see what the regenerate changed. Session-scoped (not persisted).
  const [prevDesignContent, setPrevDesignContent] = useState<string | null>(null);
  const [showDesignChanges, setShowDesignChanges] = useState(false);

  // Style selection — initialized from persisted metadata
  const [designStyles, setDesignStyles] = useState<DesignStyle[] | null>(() => designMeta.designStyles ?? null);
  const [designStylesLoading, setDesignStylesLoading] = useState(false);
  const [designStylesError, setDesignStylesError] = useState<string | null>(null);
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(() => designMeta.selectedStyleId ?? null);
  // Knowledge-base style specs — fetched from memory and merged into the carousel
  const [kbStyles, setKbStyles] = useState<DesignStyle[]>([]);
  const [kbStylesLoading, setKbStylesLoading] = useState(false);
  // Combined carousel styles: AI-generated + KB
  const carouselStyles = useMemo(() => {
    if (!designStyles) return kbStyles.length > 0 ? kbStyles : null;
    return [...designStyles, ...kbStyles];
  }, [designStyles, kbStyles]);
  // Track which styles came from KB for designDirectionPrompt
  const kbStyleIds = useMemo(() => new Set(kbStyles.map((s) => s.id)), [kbStyles]);

  // Source mode — initialized from persisted metadata
  const [designSourceMode, setDesignSourceMode] = useState<"ai" | "custom">(() => designMeta.designSourceMode ?? "ai");

  // Reference sub-mode: style-only (local, not persisted) vs page restoration (persisted, used in coding)

  // Style-reference images (local React state — not stored to .blueprint/)

  // Design references from pipeline store (uploaded screenshots for page restoration)
  const designReferences = usePipelineStore((s) => s.designReferences);
  const uploadDesignReferences = usePipelineStore((s) => s.uploadDesignReferences);

  // Custom URL reference
  const [isMatching, setIsMatching] = useState(false);
  // `html` is set by the non-Electron fallback fetch; `screenshotDataUrl` +
  // `tokensText` are set by the Electron render-capture path.

  // Stitch — initialized from persisted metadata
  const [stitchResult, setStitchResult] = useState<StitchGenerateResult | null>(() => designMeta.stitchResult ?? null);
  const [stitchGenerating, setStitchGenerating] = useState(false);
  const [stitchError, setStitchError] = useState<string | null>(null);

  // Inputs
  const [specInput, setSpecInput] = useState("");
  const [stitchInput, setStitchInput] = useState("");

  // Stitch screenshots
  const [promptCopied, setPromptCopied] = useState(false);
  const [stitchScreenshots, setStitchScreenshots] = useState<ScreenshotItem[]>([]);
  const [stitchScreensLoading, setStitchScreensLoading] = useState(false);
  const [screenshotIdx, setScreenshotIdx] = useState(0);
  const [phaseMenuOpen, setPhaseMenuOpen] = useState(false);
  const phaseMenuRef = useRef<HTMLDivElement>(null);

  // ── Fetch Knowledge Base style specs ────────────────────────────────────
  useEffect(() => {
    setKbStylesLoading(true);
    fetch("/api/memory/knowledge/records", { cache: "no-store" })
      .then((r) => r.json() as Promise<{ records?: KbRecord[] }>)
      .then((data) => {
        const specs = (data.records ?? [])
          .filter((r) => r.isStyleSpec)
          .slice(0, 5)
          .map((r) => {
            const spec = extractKbStyleSpec(r.body);
            return spec ? kbSpecToDesignStyle(spec, r.id, r.imageName) : null;
          })
          .filter((s): s is DesignStyle => s !== null);
        setKbStyles(specs);
      })
      .catch(() => { /* silent — KB may not be available */ })
      .finally(() => setKbStylesLoading(false));
  }, []);

  // ── Derived step state ──────────────────────────────────────────────────
  const isDesignRunning = isRunning && currentStep === "design";
  const designContent = isDesignRunning
    ? streamingContent
    : (steps.design?.content ?? "");
  const isDesignDone = steps.design?.status === "completed";

  // ── PRD content + hash ───────────────────────────────────────────────────
  const prdContent = steps.prd?.content ?? "";
  const prdHash = prdContent.trim() ? makePrdHash(prdContent) : null;

  // ── Persist design metadata to step-store whenever it changes ────────────
  useEffect(() => {
    patchStepMeta("design", {
      prdHash,
      designStyles,
      selectedStyleId,
      designSourceMode,
      stitchResult,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prdHash, designStyles, selectedStyleId, designSourceMode, stitchResult]);

  // ── Auto-generate design styles once PRD content is available ────────────
  const autoGenRef = useRef(false);

  // ── iframe streaming refs ──────────────────────────────────────────────────
  // We use imperative document.write() instead of updating srcDoc on every
  // chunk to avoid full iframe reloads that cause visible flickering.
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeWrittenRef = useRef(0);
  const iframeDocOpenRef = useRef(false);
  // True after a stream has been written to the iframe; prevents srcDoc from
  // overwriting the already-complete streamed content.
  const iframeStreamedRef = useRef(false);

  // Reset iframe state when a new streaming run begins.
  useEffect(() => {
    if (isDesignRunning) {
      iframeWrittenRef.current = 0;
      iframeDocOpenRef.current = false;
      iframeStreamedRef.current = false;
    }
  }, [isDesignRunning]);

  // Write incremental chunks to the iframe document during streaming.
  useEffect(() => {
    if (!isDesignRunning || !streamingContent) return;
    const trimmed = streamingContent.trimStart();
    const looksLikeHtml =
      trimmed.startsWith("<!DOCTYPE") ||
      trimmed.startsWith("<html") ||
      trimmed.startsWith("<!");
    if (!looksLikeHtml) return;

    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (!doc) return;

    if (!iframeDocOpenRef.current) {
      doc.open();
      iframeDocOpenRef.current = true;
    }
    const delta = streamingContent.slice(iframeWrittenRef.current);
    if (delta) {
      doc.write(delta);
      iframeWrittenRef.current = streamingContent.length;
      iframeStreamedRef.current = true;
    }
  }, [streamingContent, isDesignRunning]);

  // Close the document when streaming finishes.
  useEffect(() => {
    if (!isDesignRunning && iframeDocOpenRef.current) {
      const doc = iframeRef.current?.contentDocument ?? iframeRef.current?.contentWindow?.document;
      doc?.close();
      iframeDocOpenRef.current = false;
    }
  }, [isDesignRunning]);

  // ── Auto-advance to spec when design completes ──────────────────────────
  const prevDesignRunning = useRef(isDesignRunning);
  useEffect(() => {
    if (prevDesignRunning.current && !isDesignRunning && isDesignDone) {
      // Record the first AI-generated design spec for memory capture comparison
      if (!originalDesignRef.current) {
        originalDesignRef.current = steps.design?.content ?? "";
      }
      setPhase("spec");
    }
    prevDesignRunning.current = isDesignRunning;
  }, [isDesignRunning, isDesignDone]);

  // Jump to spec if design content already exists on entry
  useEffect(() => {
    if (steps.design?.content && !isDesignRunning) setPhase("spec");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-generate styles effect ──────────────────────────────────────────
  // Reads designStyles from the store reactively so snapshot-restored data
  // is available even if the local useState hasn't been primed yet.
  const storedDesignStyles = useStepStore((s) => {
    const meta = s.steps.design?.metadata as Record<string, unknown> | undefined;
    return (meta?.designStyles as DesignStyle[] | undefined) ?? null;
  });

  useEffect(() => {
    if (!prdContent.trim()) return;
    if (designStylesLoading) return;
    if (autoGenRef.current) return;

    // Check BOTH local state and store — snapshot-restored data lives in the
    // store but may not have flowed into the local useState yet on first render.
    const hasStyles = Array.isArray(designStyles) && designStyles.length > 0;
    const hasStoredStyles = Array.isArray(storedDesignStyles) && storedDesignStyles.length > 0;
    if (hasStyles || hasStoredStyles) {
      autoGenRef.current = true;
      // Sync local state from store if it was restored but not yet in useState
      if (!hasStyles && hasStoredStyles) {
        setDesignStyles(storedDesignStyles);
      }
      return;
    }
    // Trigger generation
    autoGenRef.current = true;
    setDesignStylesLoading(true);
    setDesignStylesError(null);
    generateDesignStyles(prdContent).then((result) => {
      setDesignStylesLoading(false);
      if (result.error) {
        setDesignStylesError(result.error);
      } else {
        setDesignStyles(result.styles);
        setSelectedStyleId(result.styles?.[0]?.id ?? null);
        // Persist snapshot immediately with the styles result (don't rely on
        // setTimeout + useCallback closure — local state hasn't re-rendered yet).
        fetch(`/api/projects/${props.projectSlug}/project-step-snapshot`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stepId: "design",
            snapshot: {
              content: null,
              metadata: {
                designStyles: result.styles,
                selectedStyleId: result.styles?.[0]?.id ?? null,
                designSourceMode,
                stitchResult: null,
                prdHash,
              },
              status: "pending",
            },
          }),
        }).catch((err) => console.error("[DesignUI] style snapshot error:", err));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prdContent]);

  // ── Stitch screenshots ──────────────────────────────────────────────────
  useEffect(() => {
    if (!stitchResult?.projectId) {
      setStitchScreenshots([]);
      setScreenshotIdx(0);
      return;
    }
    setStitchScreensLoading(true);
    setStitchScreenshots([]);
    setScreenshotIdx(0);
    fetch(
      `/api/stitch-screens?projectId=${encodeURIComponent(stitchResult.projectId)}`,
    )
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then((data) => {
        const list = (data.screenshots ?? []) as ScreenshotItem[];
        setStitchScreenshots(
          list.length === 0 && stitchResult.screenshotUrl
            ? [
                {
                  screenId: stitchResult.screenId,
                  title: "Screen 1",
                  screenshotUrl: stitchResult.screenshotUrl,
                },
              ]
            : list,
        );
      })
      .catch(() => {
        if (stitchResult.screenshotUrl)
          setStitchScreenshots([
            {
              screenId: stitchResult.screenId,
              title: "Screen 1",
              screenshotUrl: stitchResult.screenshotUrl,
            },
          ]);
      })
      .finally(() => setStitchScreensLoading(false));
  }, [stitchResult?.projectId]);


  const handleUploadToGrid = useCallback(
    async (files: File[]) => {
      const result = await usePipelineStore
        .getState()
        .uploadDesignReferences(
          files,
          files.map(() => ""),
          files.map(() => ""),
        );
      if (result && prdContent) {
        setIsMatching(true);
        try {
          await usePipelineStore.getState().autoMatchDesignReferences(prdContent);
        } finally {
          setIsMatching(false);
        }
      }
    },
    [prdContent],
  );

  const handleFetchUrlsToGrid = useCallback(
    async (urls: string[]) => {
      setIsMatching(true);
      try {
        await Promise.allSettled(
          urls.map(async (url) => {
            let screenshotDataUrl: string | undefined;
            let cssToken: Record<string, string> | undefined;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (typeof window !== "undefined" && (window as any).electronAPI?.renderReferenceUrl) {
              try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const result = await (window as any).electronAPI.renderReferenceUrl(url);
                screenshotDataUrl = result?.screenshot ?? result?.screenshotDataUrl;
                cssToken = result?.cssTokens ?? result?.cssToken;
              } catch {
                // no screenshot available in Electron
              }
            }

            if (!screenshotDataUrl) return; // Non-Electron: skip — no screenshot available

            await usePipelineStore
              .getState()
              .fetchUrlDesignReference(url, screenshotDataUrl, cssToken);
          }),
        );
        if (prdContent) {
          await usePipelineStore.getState().autoMatchDesignReferences(prdContent);
        }
      } finally {
        setIsMatching(false);
      }
    },
    [prdContent],
  );

  const handleFetchRouteUrl = useCallback(
    async (url: string, pageHint: string) => {
      let screenshotDataUrl: string | undefined;
      let cssToken: Record<string, string> | undefined;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (typeof window !== "undefined" && (window as any).electronAPI?.renderReferenceUrl) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const result = await (window as any).electronAPI.renderReferenceUrl(url);
          screenshotDataUrl = result?.screenshot ?? result?.screenshotDataUrl;
          cssToken = result?.cssTokens ?? result?.cssToken;
        } catch {
          // no screenshot
        }
      }

      if (!screenshotDataUrl) return;

      await usePipelineStore
        .getState()
        .fetchUrlDesignReference(url, screenshotDataUrl, cssToken, pageHint);
    },
    [],
  );

  const handleDropToRoute = useCallback(
    async (referenceId: string, pageHint: string) => {
      const currentRefs = usePipelineStore.getState().designReferences;
      const existingOwner = currentRefs.find(
        (r) => r.pageHint === pageHint && r.id !== referenceId,
      );
      if (existingOwner) {
        await usePipelineStore
          .getState()
          .updateDesignReferenceMeta(existingOwner.id, { pageHint: "" });
      }
      await usePipelineStore
        .getState()
        .updateDesignReferenceMeta(referenceId, {
          pageHint,
          matchedBy: "manual",
          matchConfidence: null,
        });
    },
    [],
  );

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleGenerateDesignDoc = async () => {
    // Set design context before executing the step
    if (designSourceMode === "ai") {
      const selectedStyle = carouselStyles?.find((s) => s.id === selectedStyleId) ?? null;
      let designDirectionPrompt: string | null = null;
      if (selectedStyle) {
        designDirectionPrompt = [
          `## Selected visual style: ${selectedStyle.name}`,
          `${selectedStyle.description}`,
          `### Colors`,
          `- Primary: ${selectedStyle.colors.primary}`,
          `- Secondary: ${selectedStyle.colors.secondary}`,
          `- Tertiary: ${selectedStyle.colors.tertiary}`,
          `- Neutral/Background: ${selectedStyle.colors.neutral}`,
          `### Typography`,
          `- Headline font: ${selectedStyle.typography.headlineFont}`,
          `- Body font: ${selectedStyle.typography.bodyFont}`,
          `- Label font: ${selectedStyle.typography.labelFont}`,
        ].join("\n");
      }
      setDesignContext({
        designStyleId: kbStyleIds.has(selectedStyleId ?? "") ? undefined : selectedStyleId,
        styleReferenceImageBase64: null,
        designDirectionPrompt,
        useUploadedDesignReferences: false,
      });
    } else {
      // Custom reference mode: assets are already on disk (persisted immediately on upload/fetch).
      setDesignContext({
        designStyleId: null,
        styleReferenceImageBase64: null,
        styleReferenceImages: undefined,
        designDirectionPrompt: null,
        useUploadedDesignReferences: true,
      });
    }
    const p = executeStep("design");
    setPhase("spec");
    p.then(() => {
      const s = useStepStore.getState();
      const stepData = s.steps.design;
      fetch(`/api/projects/${props.projectSlug}/project-step-snapshot`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stepId: "design",
          snapshot: {
            content: stepData?.content ?? null,
            metadata: {
              designStyles,
              selectedStyleId,
              designSourceMode,
              stitchResult: null,
              prdHash,
            },
            status: stepData?.status ?? "completed",
          },
        }),
      }).catch((err) => console.error("[DesignUI] spec snapshot error:", err));
    }).catch((e) => console.error("[DesignUI] executeStep failed:", e));
  };

  // Regenerate the design spec against the latest PRD/TRD, keeping the current
  // style selection. Mirrors the TRD step's Regenerate; the per-step "edit PRD
  // then regenerate each step" flow relies on this.
  const handleRegenerateDesign = () => {
    if (isDesignRunning) return;
    const ok = window.confirm(
      "Regenerate the design spec?\n\nThis re-runs the design agent against the latest PRD/TRD using the current style selection and replaces the current design spec.",
    );
    if (!ok) return;
    // Snapshot the current spec so the user can diff what the regenerate changed.
    setPrevDesignContent(steps.design?.content ?? null);
    setShowDesignChanges(false);
    handleGenerateDesignDoc();
  };

  const handleGenerateWithStitch = (instruction?: string) => {
    if (!prdContent.trim()) return;
    setStitchGenerating(true);
    setStitchError(null);
    setStitchResult(null);
    runStitchGenerate({
      prdContent,
      designStyleId: designSourceMode === "ai" ? selectedStyleId : null,
      designSpecContent: steps.design?.content ?? "",
      editInstruction: instruction,
    }).then((outcome) => {
      setStitchGenerating(false);
      if (outcome.error) {
        setStitchError(outcome.error);
      } else {
        setStitchResult(outcome.result);
      }
      // Save snapshot with fresh outcome data (avoid stale closure on stitchResult)
      const s = useStepStore.getState();
      const stepData = s.steps.design;
      fetch(`/api/projects/${props.projectSlug}/project-step-snapshot`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stepId: "design",
          snapshot: {
            content: stepData?.content ?? null,
            metadata: {
              designStyles,
              selectedStyleId,
              designSourceMode,
              stitchResult: outcome.result,
              prdHash,
            },
            status: stepData?.status ?? "pending",
          },
        }),
      }).catch((err) => console.error("[DesignUI] stitch snapshot error:", err));
    });
    setPhase("stitch");
  };


  // Detect interrupted PRD
  const prdInterrupted =
    steps.prd?.status === "running" && !steps.prd?.content;

  // ── Phase navigation helpers ──────────────────────────────────────────────
  const goToPrevPhase = useCallback(() => {
    if (phase === "style") props.onNavigate("prd" as StepId);
    else if (phase === "spec") setPhase("style");
    else setPhase("spec");
  }, [phase, props]);

  const goToNextPhase = useCallback(() => {
    if (phase === "style") {
      setPhase("spec");
    } else if (phase === "spec") {
      setPhase("stitch");
    }
  }, [phase]);

  const hasDesignSpec = !!steps.design?.content;
  const hasStitchResult = !!stitchResult;
  const showLeftArrow = phase !== "style";
  const showRightArrow =
    (phase === "style" && hasDesignSpec) ||
    (phase === "spec" && hasStitchResult);

  // ── Close phase menu on outside click ──
  useEffect(() => {
    if (!phaseMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (phaseMenuRef.current && !phaseMenuRef.current.contains(e.target as Node)) {
        setPhaseMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [phaseMenuOpen]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden">
      {/* ── Top center step navigation ── */}
      <div className="shrink-0 relative flex items-center justify-center gap-4 py-3 border-b border-[#e2e8f0] bg-white">
        {phase === "spec" && hasDesignSpec && (
          <div className="absolute right-4 flex items-center gap-2">
            {prevDesignContent != null && !isDesignRunning && (
              <button
                onClick={() => setShowDesignChanges((v) => !v)}
                title="Show what the last regenerate changed"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${showDesignChanges ? "text-white bg-[#712ae2]" : "text-[#712ae2] bg-[rgba(113,42,226,0.07)] hover:bg-[rgba(113,42,226,0.13)]"}`}
              >
                <GitCompare size={12} />
                {showDesignChanges ? "Hide changes" : "Changes"}
              </button>
            )}
            <button
              onClick={handleRegenerateDesign}
              disabled={isDesignRunning}
              title="Regenerate the design spec against the latest PRD/TRD"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium text-[#712ae2] bg-[rgba(113,42,226,0.07)] hover:bg-[rgba(113,42,226,0.13)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RefreshCw size={12} className={isDesignRunning ? "animate-spin" : ""} />
              {isDesignRunning ? "Regenerating…" : "Regenerate"}
            </button>
          </div>
        )}
        {showLeftArrow && (
          <button
            onClick={goToPrevPhase}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm hover:bg-slate-50 hover:border-indigo-600 transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
        )}
        <div className="relative" ref={phaseMenuRef}>
          <button
            onClick={() => { setPhaseMenuOpen((v) => !v); }}
            className="text-[13px] font-semibold text-slate-600 min-w-[100px] text-center select-none hover:text-indigo-600 transition-colors"
          >
            {phase === "style" ? "Style" : phase === "spec" ? "Design Spec" : "Stitch Design"}
          </button>
          {phaseMenuOpen && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-30 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[140px]">
              {(["style", "spec", "stitch"] as const).map((p) => {
                const isActive = phase === p;
                const canJump =
                  p === "style" ||
                  (p === "spec" && hasDesignSpec) ||
                  (p === "stitch" && hasStitchResult);
                return (
                  <button
                    key={p}
                    disabled={!canJump}
                    onClick={() => { setPhase(p); setPhaseMenuOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-[12px] font-medium transition-colors ${
                      isActive
                        ? "text-indigo-600 bg-indigo-50"
                        : canJump
                          ? "text-slate-700 hover:bg-slate-50"
                          : "text-slate-300 cursor-not-allowed"
                    }`}
                  >
                    {p === "style" ? "Style" : p === "spec" ? "Design Spec" : "Stitch Design"}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {showRightArrow && (
          <button
            onClick={goToNextPhase}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm hover:bg-slate-50 hover:border-indigo-600 transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        )}
      </div>

      {/* ── Main Content ── */}
      <div className={
        phase === "spec" || phase === "stitch"
          ? "relative flex-1 min-h-0 flex flex-col overflow-hidden"
          : "relative flex-1 overflow-y-auto px-16"
      }>
        {/* Diff overlay: what the last regenerate changed vs the previous spec. */}
        {phase === "spec" && showDesignChanges && prevDesignContent != null && (
          <div className="absolute inset-0 z-20 bg-white p-6">
            <DocDiffView
              oldText={prevDesignContent}
              newText={steps.design?.content ?? ""}
              label="DesignSpec.md"
              onClose={() => setShowDesignChanges(false)}
            />
          </div>
        )}
        {/* ══ Phase 1: Style Selection ══ */}
        {phase === "style" && (
          <>
            <div className="py-8 px-6 flex flex-col gap-6">
              {/* ── Tab bar ── */}
              <div className="flex border-b border-slate-200">
                <button
                  onClick={() => setDesignSourceMode("ai")}
                  className={`px-5 py-2.5 text-[13px] font-semibold border-b-2 -mb-px transition-colors ${
                    designSourceMode === "ai"
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Recommended
                </button>
                <button
                  onClick={() => setDesignSourceMode("custom")}
                  className={`px-5 py-2.5 text-[13px] font-semibold border-b-2 -mb-px transition-colors ${
                    designSourceMode === "custom"
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Reference Screenshots
                </button>
              </div>

              {/* ── Tab: Recommended ── */}
              {designSourceMode === "ai" && (
                <div className="flex flex-col gap-4">
                  {(designStylesLoading || kbStylesLoading) && (
                    <div className="flex items-center justify-center py-10">
                      <Loading size="md" text="Generating design styles…" />
                    </div>
                  )}
                  {!designStylesLoading && carouselStyles && carouselStyles.length > 0 && (
                    <StyleCarousel
                      styles={carouselStyles}
                      selectedId={selectedStyleId}
                      onSelect={setSelectedStyleId}
                    />
                  )}
                  {!designStylesLoading && !kbStylesLoading && !carouselStyles?.length && (
                    <div className="flex flex-col items-center justify-center py-10 gap-3 text-slate-400">
                      {designStylesError ? (
                        <>
                          <p className="text-sm text-red-500">Failed to generate design styles: {designStylesError}</p>
                          <button
                            onClick={() => {
                              setDesignStylesLoading(true);
                              setDesignStylesError(null);
                              generateDesignStyles(prdContent).then((result) => {
                                setDesignStylesLoading(false);
                                if (result.error) {
                                  setDesignStylesError(result.error);
                                } else {
                                  setDesignStyles(result.styles);
                                  setSelectedStyleId(result.styles?.[0]?.id ?? null);
                                  fetch(`/api/projects/${props.projectSlug}/project-step-snapshot`, {
                                    method: "PUT",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      stepId: "design",
                                      snapshot: {
                                        content: null,
                                        metadata: {
                                          designStyles: result.styles,
                                          selectedStyleId: result.styles?.[0]?.id ?? null,
                                          designSourceMode,
                                          stitchResult: null,
                                          prdHash,
                                        },
                                        status: "pending",
                                      },
                                    }),
                                  }).catch((err) => console.error("[DesignUI] style snapshot error:", err));
                                }
                              });
                            }}
                            className="px-4 py-2 text-[13px] font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors"
                          >
                            Retry
                          </button>
                        </>
                      ) : prdInterrupted ? (
                        <>
                          <p className="text-sm">PRD generation was interrupted. Go back to PRD to complete it.</p>
                          <button
                            onClick={() => props.onNavigate("prd" as StepId)}
                            className="px-4 py-2 text-[13px] font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors"
                          >
                            Go to PRD
                          </button>
                        </>
                      ) : (
                        <p className="text-sm">Waiting for PRD to generate styles…</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── Tab: Reference Screenshots ── */}
              {designSourceMode === "custom" && (
                <RouteReferenceGrid
                  prdContent={prdContent}
                  references={designReferences}
                  isMatching={isMatching}
                  onUpload={handleUploadToGrid}
                  onFetchUrls={handleFetchUrlsToGrid}
                  onFetchRouteUrl={handleFetchRouteUrl}
                  onRemove={async (id) => {
                    await usePipelineStore.getState().deleteDesignReference(id);
                  }}
                  onDropToRoute={handleDropToRoute}
                />

              )}

              {/* ── Bottom center next button ── */}
              <div className="flex justify-center">
                <button
                  onClick={handleGenerateDesignDoc}
                  disabled={
                    (designSourceMode === "ai" && !selectedStyleId) ||
                    (designSourceMode === "custom" && designReferences.filter((r) => r.kind === "image").length === 0) ||
                    isMatching ||
                    isDesignRunning
                  }
                  className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-[14px] font-semibold rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                >
                  {designSourceMode === "ai" ? "Generate based on this style" : "Generate based on screenshots"}
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}

        {/* ══ Phase 2: Design Spec ══ */}
        {phase === "spec" && (
          <div className="flex flex-col h-full min-h-0">
            {/* ── Recalled knowledge badge strip ── */}
            {(designMeta.recalledKnowledgeIds?.length ?? 0) > 0 && (
              <div className="shrink-0 mx-4 mt-2.5 flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-slate-400 font-medium mr-0.5">Knowledge applied:</span>
                {(designMeta.recalledKnowledgeIds ?? []).map((id) => (
                  <a
                    key={id}
                    href={`/knowledge?highlight=${encodeURIComponent(id)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`View ${id} in Knowledge Base`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-violet-200 bg-violet-50 text-violet-600 text-[10px] font-mono hover:bg-violet-100 hover:border-violet-300 transition-colors"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                    {id}
                  </a>
                ))}
                <a
                  href="/knowledge"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 text-[10px] text-slate-400 hover:text-violet-500 transition-colors"
                >
                  Open KB →
                </a>
              </div>
            )}
            {(() => {
              // Determine rendering mode: streaming HTML → live iframe preview
              const streamTrimmed = streamingContent.trimStart();
              const isStreamingHtml =
                isDesignRunning &&
                (streamTrimmed.startsWith("<!DOCTYPE") ||
                  streamTrimmed.startsWith("<html") ||
                  streamTrimmed.startsWith("<!"));
              const finalTrimmed = designContent.trimStart();
              const isFinalHtml =
                !isDesignRunning &&
                (finalTrimmed.startsWith("<!DOCTYPE") ||
                  finalTrimmed.startsWith("<html") ||
                  finalTrimmed.startsWith("<!"));

              if (isStreamingHtml || isFinalHtml || iframeStreamedRef.current) {
                return (
                  <div className="relative flex-1 min-h-0 mt-2 flex flex-col">
                    {isDesignRunning && (
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-2.5 py-1 bg-black/60 backdrop-blur-sm rounded-full text-white text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Generating…
                      </div>
                    )}
                    {!isDesignRunning && (
                      <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            const blob = new Blob([designContent], { type: "text/html" });
                            const a = document.createElement("a");
                            a.href = URL.createObjectURL(blob);
                            a.download = "design-system.html";
                            a.click();
                            URL.revokeObjectURL(a.href);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-white bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-md transition-all"
                        >
                          <DownloadIcon /> Download HTML
                        </button>
                        <button
                          onClick={() => {
                            const blob = new Blob([designContent], { type: "text/html" });
                            const url = URL.createObjectURL(blob);
                            window.open(url, "_blank");
                            setTimeout(() => URL.revokeObjectURL(url), 5000);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-white bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-md transition-all"
                        >
                          <OpenIcon /> Open in Tab
                        </button>
                      </div>
                    )}
                    <iframe
                      ref={iframeRef}
                      // Only set srcDoc for DB-loaded content (not after streaming)
                      srcDoc={!iframeStreamedRef.current && !isDesignRunning ? designContent : undefined}
                      sandbox="allow-scripts allow-same-origin"
                      className="w-full flex-1 border-0"
                      title="Design System Spec"
                    />
                  </div>
                );
              }

              if (isDesignRunning) {
                return (
                  <div className="flex flex-col items-center justify-center h-full gap-4">
                    <Loading size="lg" text="Generating Design System Spec…" />
                    <p className="text-[12px] text-slate-400">Building your HTML design system document…</p>
                  </div>
                );
              }

              if (designContent) {
                return (
                  <div className="p-6 max-w-4xl mx-auto overflow-auto flex-1 min-h-0">
                    <MarkdownRenderer content={designContent} />
                  </div>
                );
              }

              return (
                <div className="flex items-center justify-center h-full text-slate-400">
                  <p className="text-sm">Waiting for design spec to generate…</p>
                </div>
              );
            })()}
          </div>
        )}

        {/* ══ Phase 3: Stitch Design ══ */}
        {phase === "stitch" && (
          <div className="flex flex-col flex-1 min-h-0 h-full">
            {stitchGenerating && (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <Loading size="lg" text="Generating with Stitch…" />
                <p className="text-[12px] text-slate-400">
                  This may take a minute.
                </p>
              </div>
            )}
            {!stitchGenerating && stitchError && (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="1.5"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <div className="text-center max-w-sm">
                  <p className="text-[13px] font-semibold text-red-600">
                    Stitch generation failed
                  </p>
                  <p className="text-[12px] text-slate-500 mt-1 break-all">
                    {stitchError}
                  </p>
                </div>
                <button
                  onClick={() => handleGenerateWithStitch()}
                  className="mt-2 px-4 py-2 text-[12px] font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors"
                >
                  Retry
                </button>
              </div>
            )}
            {!stitchGenerating && stitchResult && (
              <div className="flex flex-col h-full">
                <div className="shrink-0 flex items-center gap-3 px-5 py-3 bg-violet-50 border-b border-violet-100">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#7c3aed"
                    strokeWidth="2"
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-violet-700">
                      Stitch Design Generated
                    </p>
                    <p className="text-[11px] text-violet-500 font-mono truncate">
                      {stitchResult.projectUrl}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        navigator.clipboard
                          .writeText(stitchResult.projectUrl)
                          .then(() => {
                            setPromptCopied(true);
                            setTimeout(() => setPromptCopied(false), 2000);
                          });
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-indigo-700 bg-white border border-indigo-200 rounded-md hover:bg-indigo-50 transition-colors"
                    >
                      {promptCopied ? "Copied!" : "Copy URL"}
                    </button>
                    <a
                      href={stitchResult.projectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-500 transition-colors"
                    >
                      Open in Stitch
                    </a>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden bg-slate-950 relative">
                  {stitchScreensLoading && (
                    <div className="flex items-center justify-center h-full">
                      <Loading
                        size="lg"
                        text="Loading design screenshots…"
                      />
                    </div>
                  )}
                  {!stitchScreensLoading &&
                    stitchScreenshots.length > 0 && (
                      <ScreenshotCarousel
                        screenshots={stitchScreenshots}
                        activeIdx={screenshotIdx}
                        onPrev={() =>
                          setScreenshotIdx(
                            (i) =>
                              (i - 1 + stitchScreenshots.length) %
                              stitchScreenshots.length,
                          )
                        }
                        onNext={() =>
                          setScreenshotIdx(
                            (i) => (i + 1) % stitchScreenshots.length,
                          )
                        }
                        onDot={setScreenshotIdx}
                        projectId={stitchResult.projectId}
                      />
                    )}
                  {!stitchScreensLoading &&
                    stitchScreenshots.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-full gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-violet-100 flex items-center justify-center">
                          <svg
                            width="28"
                            height="28"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#7c3aed"
                            strokeWidth="1.5"
                          >
                            <rect
                              x="3"
                              y="3"
                              width="18"
                              height="18"
                              rx="2"
                            />
                            <path d="M3 9h18M9 21V9" />
                          </svg>
                        </div>
                        <div className="text-center">
                          <p className="text-[14px] font-semibold text-slate-700">
                            Design Generated
                          </p>
                          <p className="text-[12px] text-slate-400 mt-1">
                            Screenshots not yet available — view in Stitch
                          </p>
                        </div>
                        <a
                          href={stitchResult.projectUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[13px] font-medium transition-colors"
                        >
                          Open in Stitch
                        </a>
                      </div>
                    )}
                </div>
              </div>
            )}
            {!stitchGenerating && !stitchResult && !stitchError && (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <p className="text-[13px] text-slate-400">Design Spec is ready. Generate Stitch mockups below.</p>
                <button
                  onClick={() => handleGenerateWithStitch()}
                  disabled={!steps.design?.content || isRunning}
                  className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-[13px] font-semibold rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Generate with Stitch
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Bottom navigation bar ── */}
      <div className="shrink-0 border-t border-[#e2e8f0] bg-white flex items-center gap-3">

          {phase === "spec" && (
            <StageInputBar
              value={specInput}
              onChange={setSpecInput}
              onSubmit={() => {
                const i = specInput.trim();
                if (!i || isDesignRunning) return;
                setSpecInput("");
                {
                  setDesignContext({
                    designStyleId: designSourceMode === "ai" ? selectedStyleId : undefined,
                    styleReferenceImageBase64: null,
                    styleReferenceImages: undefined,
                    designDirectionPrompt: null,
                    useUploadedDesignReferences: designSourceMode === "custom",
                  });
                }
                void executeStep("design", i);
              }}
              placeholder="Edit the design spec…"
              disabled={isDesignRunning}
              className="flex-1"
              actions={
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      const next = getNextStep("design", tier);
                      if (next) props.onNavigate(next);
                    }}
                    disabled={isRunning}
                    className="flex items-center gap-2 shrink-0 px-4 py-2 text-[13px] font-semibold text-slate-600 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors disabled:opacity-40"
                  >
                    Skip to Next <ArrowRight size={14} />
                  </button>
                  <button
                    onClick={() => {
                      setSpecInput("");
                      handleGenerateWithStitch(
                        specInput.trim() || undefined,
                      );
                    }}
                    disabled={!steps.design?.content || isRunning}
                    className="flex items-center gap-2 shrink-0 px-4 py-2 bg-indigo-600 text-white text-[13px] font-semibold rounded-full hover:bg-indigo-500 transition-colors disabled:opacity-40"
                  >
                    Generate with Stitch
                  </button>
                </div>
              }
            />
          )}

          {phase === "stitch" && (
            <div className="flex items-center justify-end w-full px-8 py-3">
                <button
                  onClick={async () => {
                    // Await memory capture BEFORE navigating so the fetch is never
                    // interrupted by handleStepChange's store reset + snapshot reload.
                    const finalDesign = steps.design?.content ?? "";
                    if (finalDesign) {
                      const captureSessionId = kickoffSessionId ?? `design-cap-${Date.now()}`;
                      const originalDesign = originalDesignRef.current || finalDesign;
                      try {
                        const res = await fetch("/api/memory/design/capture", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            sessionId: captureSessionId,
                            originalDesign,
                            finalDesign,
                            tier,
                            projectType: intentMeta?.classification?.type ?? "unknown",
                          }),
                        });
                        const data = await res.json().catch(() => ({}));
                        if (data?.skipped) console.warn("[DesignUI] memory capture skipped:", data.reason ?? data.error);
                        else console.log("[DesignUI] memory capture ok:", data?.outcome, data?.recordId);
                      } catch (err) {
                        console.warn("[DesignUI] memory capture fetch error:", err);
                      }
                    }
                    const next = getNextStep("design", tier);
                    if (next) props.onNavigate(next);
                  }}
                  disabled={isRunning}
                  className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-[14px] font-semibold rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-40 shadow-md hover:shadow-lg"
                >
                  Next Step <ArrowRight size={16} />
                </button>
            </div>
          )}
        </div>
    </div>
  );
}

// ─── Inline SVG icons ────────────────────────────────────────────────────────

function DownloadIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function OpenIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}
