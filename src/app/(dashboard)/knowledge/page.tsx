"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";

import type {
  KnowledgeRecordFull,
  KnowledgeRecordsResponse,
} from "@/app/api/memory/knowledge/records/route";
import type { DesignIndustry } from "@/lib/memory/knowledge/57b-library";

// ---------------------------------------------------------------------------
// Reference image data per industry
// ---------------------------------------------------------------------------
interface RefImage {
  src: string;
  label: string;
  desc: string;
  avoid?: boolean;
}

const INDUSTRY_REFS: Record<DesignIndustry, RefImage[]> = {
  ai: [
    { src: "/knowledge-refs/ai-1-lumina.png",    label: "LuminaAI",    desc: "Fluid warm gradient hero, clean white nav, bold serif headline" },
    { src: "/knowledge-refs/ai-5-kodu.png",       label: "Kodu",        desc: "Deep purple-to-black gradient, oversized white type, glow effects" },
    { src: "/knowledge-refs/ai-2-aipatrn.png",    label: "AIPatrn",     desc: "Dark mesh background, bright purple accents, tight card grid" },
    { src: "/knowledge-refs/ai-7-seto.png",       label: "SETO",        desc: "Frosted glass sidebar, purple star branding, chat history panel" },
    { src: "/knowledge-refs/ai-8-nuro.png",       label: "NuroAI",      desc: "Light SaaS layout, blue CTA, floating dashboard cards" },
    { src: "/knowledge-refs/ai-8-nuro-full.png",  label: "NuroAI Full", desc: "Full-page view with features grid, testimonials, FAQ sections" },
    { src: "/knowledge-refs/ai-9-draftai.png",    label: "DraftAI",     desc: "Light gray base, chat-like left panel, minimalist branding" },
    { src: "/knowledge-refs/ai-3-chat.png",       label: "Chat AI",     desc: "Clean greeting interface with AI prompt suggestions" },
    { src: "/knowledge-refs/ai-4-avoid.png",      label: "Avoid — Playex", desc: "Overly dense layout, weak visual hierarchy — use as counter-example", avoid: true },
  ],
  "fintech-web3": [
    { src: "/knowledge-refs/f1-solvance.png",    label: "Solvance Finance", desc: "Clean white FinTech, forest-green brand, phone product hero shot" },
    { src: "/knowledge-refs/f2-blocksphere.png", label: "BlockSphere",      desc: "Deep navy, white serif headline, purple CTA, enterprise feel" },
    { src: "/knowledge-refs/f3-bullxt.png",      label: "bullXT",           desc: "Pure dark base, neon purple-pink gradient, live crypto price cards" },
    { src: "/knowledge-refs/f5-nebula.png",      label: "Nebula Core",      desc: "Purple-to-black deep gradient, large 3D holographic cube hero" },
    { src: "/knowledge-refs/f4-videosnap.png",   label: "VideoSnap",        desc: "Gray texture hero, strong CTA placement, metric highlight bar" },
  ],
  saas: [
    { src: "/knowledge-refs/s1-saas.png", label: "Collabix",   desc: "Warm beige accent banner, white card grid, task progress bars" },
    { src: "/knowledge-refs/s2-saas.png", label: "Picktime",   desc: "White with blue primary, scheduling card UI, simple two-column pricing" },
    { src: "/knowledge-refs/s3-saas.png", label: "Earnify",    desc: "Orange brand accent, dark sidebar mock, large KPI numbers, chart social proof" },
    { src: "/knowledge-refs/s4-saas.png", label: "Appvia",     desc: "Purple-lavender tinted sections, calendar widget, feature checklist" },
    { src: "/knowledge-refs/s5-saas.png", label: "Untitled UI",desc: "Very clean white SaaS, gray scale hierarchy, large dashboard screenshot hero" },
    { src: "/knowledge-refs/s6-saas.png", label: "DraftAI",    desc: "Light layout, AI tool positioning, inspiration grid, minimal branding" },
  ],
};

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------
function SparkleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2z" />
    </svg>
  );
}

function RefreshIcon({ spinning }: { spinning?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={spinning ? "animate-spin" : ""}>
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

function SeedIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 22V12" />
      <path d="M5 12H2a10 10 0 0 0 20 0h-3" />
      <circle cx="12" cy="5" r="3" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function XMarkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Industry config
// ---------------------------------------------------------------------------
const INDUSTRIES: { id: DesignIndustry; label: string; emoji: string }[] = [
  { id: "ai",           label: "AI / ML",           emoji: "🤖" },
  { id: "fintech-web3", label: "FinTech / Web3",     emoji: "⛓" },
  { id: "saas",         label: "SaaS / Enterprise",  emoji: "📊" },
];

const INDUSTRY_TAB_ACTIVE: Record<DesignIndustry, string> = {
  ai:           "bg-indigo-600 text-white shadow-sm",
  "fintech-web3": "bg-violet-600 text-white shadow-sm",
  saas:         "bg-sky-600 text-white shadow-sm",
};

const INDUSTRY_ACCENT: Record<DesignIndustry, string> = {
  ai:           "bg-indigo-50 text-indigo-700 border-indigo-200",
  "fintech-web3": "bg-violet-50 text-violet-700 border-violet-200",
  saas:         "bg-sky-50 text-sky-700 border-sky-200",
};

const INDUSTRY_KW: Record<DesignIndustry, string> = {
  ai:           "AI · LLM · GPT · ML · neural · NLP · agentic",
  "fintech-web3": "Web3 · blockchain · DeFi · crypto · stablecoin · wallet · token",
  saas:         "SaaS · dashboard · analytics · enterprise · B2B · admin panel",
};

// ---------------------------------------------------------------------------
// Lightbox
// ---------------------------------------------------------------------------
function Lightbox({ image, onClose }: { image: RefImage; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="relative max-w-4xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 z-10 w-7 h-7 rounded-full bg-white shadow-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <XMarkIcon />
        </button>
        <div className="rounded-2xl overflow-hidden shadow-2xl bg-slate-900">
          <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
            <Image
              src={image.src}
              alt={image.label}
              fill
              className="object-contain"
              sizes="(max-width: 1200px) 90vw, 1000px"
              unoptimized
            />
          </div>
          <div className={`px-5 py-3 border-t border-slate-700 ${image.avoid ? "bg-rose-950" : "bg-slate-800"}`}>
            <div className="flex items-center gap-2">
              {image.avoid && (
                <span className="text-[11px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-rose-600 text-white">
                  Avoid
                </span>
              )}
              <span className="text-sm font-semibold text-white">{image.label}</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{image.desc}</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Reference gallery card
// ---------------------------------------------------------------------------
function RefGalleryCard({ image, onClick }: { image: RefImage; onClick: () => void }) {
  return (
    <motion.button
      whileHover={{ y: -3, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`group relative rounded-xl overflow-hidden border text-left shadow-sm transition-shadow hover:shadow-md ${
        image.avoid
          ? "border-rose-200 ring-1 ring-rose-200"
          : "border-slate-200"
      }`}
    >
      {/* Screenshot */}
      <div className="relative w-full bg-slate-100" style={{ aspectRatio: "16/10" }}>
        <Image
          src={image.src}
          alt={image.label}
          fill
          className="object-cover object-top"
          sizes="(max-width: 768px) 50vw, 25vw"
          unoptimized
        />
        {/* Hover overlay with expand icon */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-lg p-1.5">
            <ExpandIcon />
          </div>
        </div>
        {/* Avoid badge */}
        {image.avoid && (
          <div className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-rose-600 text-white shadow">
            Avoid
          </div>
        )}
      </div>
      {/* Caption */}
      <div className={`px-3 py-2 ${image.avoid ? "bg-rose-50" : "bg-white"}`}>
        <div className="text-[12px] font-semibold text-slate-800 truncate">{image.label}</div>
        <div className="text-[11px] text-slate-500 leading-snug mt-0.5 line-clamp-2">{image.desc}</div>
      </div>
    </motion.button>
  );
}

// ---------------------------------------------------------------------------
// Knowledge style guide section (formatted markdown)
// ---------------------------------------------------------------------------
function StyleGuideSection({ record }: { record: KnowledgeRecordFull }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
            57B Library
          </span>
          <span className="text-sm font-semibold text-slate-800">{record.title}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">
            {record.metrics.hits ?? 0} hits · score {(record.metrics.score ?? 0).toFixed(2)}
          </span>
          <motion.svg
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            aria-hidden
          >
            <polyline points="6 9 12 15 18 9" />
          </motion.svg>
        </div>
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-slate-100">
              <div className="prose prose-sm prose-slate max-w-none mt-4 text-[13px] leading-relaxed [&_h3]:text-[13px] [&_h3]:font-semibold [&_h3]:text-slate-700 [&_h3]:mt-4 [&_h3]:mb-1.5 [&_ul]:mt-1 [&_li]:text-slate-600 [&_strong]:text-slate-800 [&_code]:text-[11px] [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:rounded">
                <ReactMarkdown>{record.body}</ReactMarkdown>
              </div>
              <div className="flex flex-wrap gap-1 mt-4 pt-3 border-t border-slate-100">
                {record.tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function KnowledgePage() {
  const [records, setRecords] = useState<KnowledgeRecordFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndustry, setActiveIndustry] = useState<DesignIndustry>("ai");
  const [refreshing, setRefreshing] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [lightbox, setLightbox] = useState<RefImage | null>(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/memory/knowledge/records");
      const data = (await res.json()) as KnowledgeRecordsResponse;
      setRecords(data.records ?? []);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchRecords(); }, [fetchRecords]);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/memory/knowledge/refresh?industry=${activeIndustry}`, { method: "POST" });
      const data = await res.json() as { ok: boolean };
      if (data.ok) { showToast(`Trend refresh complete for ${activeIndustry}`, true); await fetchRecords(); }
      else showToast("Refresh failed — check server logs", false);
    } catch { showToast("Network error during refresh", false); }
    finally { setRefreshing(false); }
  }

  async function handleReseed() {
    setSeeding(true);
    try {
      const res = await fetch("/api/memory/knowledge/seed", { method: "POST" });
      const data = await res.json() as { ok: boolean; summary?: { created: number; skipped: number } };
      if (data.ok) {
        const { created = 0, skipped = 0 } = data.summary ?? {};
        showToast(`Seed: ${created} created, ${skipped} skipped`, true);
        await fetchRecords();
      } else showToast("Seed failed — check server logs", false);
    } catch { showToast("Network error during seed", false); }
    finally { setSeeding(false); }
  }

  const industryRecords = records.filter((r) => r.industry === activeIndustry);
  const libraryRecord = industryRecords.find((r) => r.isLibrary);
  const refreshRecords = industryRecords.filter((r) => r.isRefresh);
  const refs = INDUSTRY_REFS[activeIndustry];
  const activeInfo = INDUSTRIES.find((i) => i.id === activeIndustry)!;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.95 }}
            className={`fixed top-5 right-5 z-[100] flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium ${toast.ok ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}`}
          >
            {toast.ok ? <CheckIcon /> : <XMarkIcon />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && <Lightbox image={lightbox} onClose={() => setLightbox(null)} />}
      </AnimatePresence>

      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-8 py-5 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
              <SparkleIcon />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">Design Knowledge Base</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                57B company style library · {records.length} knowledge records · auto-injected into DesignAgent
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => void handleReseed()} disabled={seeding} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all">
              <SeedIcon />{seeding ? "Seeding…" : "Re-seed Library"}
            </button>
            <button onClick={() => void handleRefresh()} disabled={refreshing} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-700 disabled:opacity-50 transition-all">
              <RefreshIcon spinning={refreshing} />{refreshing ? "Refreshing…" : `Refresh ${activeInfo.label} Trends`}
            </button>
          </div>
        </div>

        {/* Industry tabs */}
        <div className="flex items-center gap-2 mt-4">
          {INDUSTRIES.map((ind) => {
            const count = records.filter((r) => r.industry === ind.id).length;
            const isActive = ind.id === activeIndustry;
            return (
              <button key={ind.id} onClick={() => setActiveIndustry(ind.id)} className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${isActive ? INDUSTRY_TAB_ACTIVE[ind.id] : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"}`}>
                <span>{ind.emoji}</span>
                <span>{ind.label}</span>
                <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${isActive ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="px-8 py-6 max-w-7xl">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-3 text-slate-500">
              <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-6.219-8.56" strokeLinecap="round" /></svg>
              <span className="text-sm">Loading knowledge records…</span>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={activeIndustry} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.18 }} className="space-y-8">

              {/* Trigger keywords banner */}
              <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${INDUSTRY_ACCENT[activeIndustry]}`}>
                <SparkleIcon />
                <div>
                  <span className="font-semibold">Auto-inject trigger keywords: </span>
                  <span className="opacity-80">{INDUSTRY_KW[activeIndustry]}</span>
                  <span className="ml-2 opacity-60 text-xs">— detected from PRD content, then these guidelines are injected into the DesignAgent.</span>
                </div>
              </div>

              {/* Reference Screenshots */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-bold text-slate-800">
                      {activeInfo.emoji} Reference Screenshots
                      <span className="ml-2 text-slate-400 font-normal text-xs">({refs.length} examples)</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Representative visual styles for this industry — the DesignAgent references these aesthetics.
                      Click any image to expand.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {refs.map((img) => (
                    <RefGalleryCard key={img.src} image={img} onClick={() => setLightbox(img)} />
                  ))}
                </div>
              </div>

              {/* Style Guide */}
              <div>
                <h2 className="text-sm font-bold text-slate-800 mb-3">
                  📋 Style Guide
                  <span className="ml-2 text-slate-400 font-normal text-xs">— injected verbatim into DesignAgent prompt</span>
                </h2>
                {libraryRecord ? (
                  <StyleGuideSection record={libraryRecord} />
                ) : (
                  <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-8 text-center">
                    <p className="text-sm text-slate-500 mb-3">No 57B library record found for this industry.</p>
                    <button onClick={() => void handleReseed()} disabled={seeding} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-all">
                      <SeedIcon />{seeding ? "Seeding…" : "Seed 57B Library"}
                    </button>
                  </div>
                )}
              </div>

              {/* Daily Trend Refreshes */}
              {refreshRecords.length > 0 && (
                <div>
                  <h2 className="text-sm font-bold text-slate-800 mb-3">
                    🔄 Daily Trend Refreshes
                    <span className="ml-2 text-slate-400 font-normal text-xs">({refreshRecords.length} records, last 30 days)</span>
                  </h2>
                  <div className="space-y-3">
                    {refreshRecords.map((r) => {
                      const date = r.tags.find((t) => t.startsWith("refreshed:"))?.replace("refreshed:", "");
                      return (
                        <div key={r.id} className="bg-white rounded-xl border border-dashed border-slate-300 p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Trend Refresh</span>
                            {date && <span className="text-[11px] text-slate-400">{date}</span>}
                            <span className="ml-auto text-xs text-emerald-600 font-medium">score {(r.metrics.score ?? 0).toFixed(2)}</span>
                          </div>
                          <div className="prose prose-sm prose-slate max-w-none text-[13px] [&_h3]:text-[13px] [&_h3]:font-semibold [&_h3]:text-slate-700 [&_h3]:mt-3 [&_h3]:mb-1 [&_ul]:mt-1 [&_li]:text-slate-600 [&_strong]:text-slate-800">
                            <ReactMarkdown>{r.body}</ReactMarkdown>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {refreshRecords.length === 0 && libraryRecord && (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center">
                  <p className="text-sm text-slate-500 mb-1">No daily refresh records yet.</p>
                  <p className="text-xs text-slate-400 mb-3">Click <strong>Refresh {activeInfo.label} Trends</strong> above to generate LLM-powered design trend notes for {new Date().getFullYear()}.</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
