"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";

import type {
  KnowledgeRecordFull,
  KnowledgeRecordsResponse,
} from "@/app/api/memory/knowledge/records/route";
import type { DesignIndustry } from "@/lib/memory/knowledge/57b-library";
import type { StyleSpecIndustry } from "@/lib/memory/knowledge/style-spec/types";
import { extractStyleSpecHtml } from "@/lib/memory/knowledge/style-spec/compose-body";
import { resolveStyleSpecPreviewHtml } from "@/lib/memory/knowledge/style-spec/resolve-preview-html";
import { extractTrendRefreshMarkdown } from "@/lib/memory/knowledge/trend-refresh";
import { DeleteStyleSpecDialog } from "./DeleteStyleSpecDialog";

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

function UploadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function MagicWandIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M15 9h0M17.8 6.2 19 5M3 21l9-9M12.2 6.2 11 5" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
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
// Style Spec preview modal — MD / HTML tabs
// ---------------------------------------------------------------------------
function StyleSpecModal({ record, onClose }: { record: KnowledgeRecordFull; onClose: () => void }) {
  const [tab, setTab] = useState<"html" | "markdown" | "raw">("html");
  const html = resolveStyleSpecPreviewHtml(record.body);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-8"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 8 }}
        transition={{ type: "spring", stiffness: 360, damping: 28 }}
        className="relative bg-white rounded-[4px] shadow-2xl w-full max-w-6xl h-[88vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e8f0]">
          <div className="flex items-center gap-3 min-w-0">
            {record.imagePath && (
              <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-[#e2e8f0] shrink-0 bg-slate-100">
                <Image src={record.imagePath} alt={record.imageName ?? ""} fill className="object-cover" unoptimized />
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 truncate">{record.title}</h2>
              <p className="text-xs text-slate-500 truncate">
                {record.id} · industry {record.industry ?? "n/a"} · score {(record.metrics.score ?? 0).toFixed(2)}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors">
            <XMarkIcon />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-6 py-2 border-b border-[#f1f5f9] bg-slate-50">
          {(["html", "markdown", "raw"] as const).map((id) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                tab === id
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-white"
              }`}
            >
              {id === "html" ? "HTML Preview" : id === "markdown" ? "Markdown" : "Raw record"}
            </button>
          ))}
          {tab === "html" && html && (
            <button
              onClick={() => {
                const blob = new Blob([html], { type: "text/html" });
                const url = URL.createObjectURL(blob);
                window.open(url, "_blank");
                setTimeout(() => URL.revokeObjectURL(url), 5000);
              }}
              className="ml-auto px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-white transition-colors"
            >
              Open in tab ↗
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto bg-white">
          {tab === "html" ? (
            html ? (
              <iframe
                srcDoc={html}
                sandbox="allow-scripts allow-same-origin"
                className="w-full h-full border-0"
                title="Style Spec Preview"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-slate-400">
                No HTML preview available for this record.
              </div>
            )
          ) : tab === "markdown" ? (
            <div className="p-8 max-w-3xl mx-auto prose prose-sm prose-slate">
              <ReactMarkdown>{record.body}</ReactMarkdown>
            </div>
          ) : (
            <pre className="p-6 text-[11px] font-mono whitespace-pre-wrap break-all text-slate-700 leading-relaxed">
              {record.body}
            </pre>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Style Spec card — one per analysed image
// ---------------------------------------------------------------------------
function StyleSpecCard({
  record,
  onOpen,
  onDelete,
  highlighted,
  deleting,
}: {
  record: KnowledgeRecordFull;
  onOpen: () => void;
  onDelete: () => void;
  highlighted?: boolean;
  deleting?: boolean;
}) {
  const isCapture = record.isTrendCapture;
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen();
    }
  };

  return (
    <motion.div
      id={`kb-record-${record.id}`}
      role="button"
      tabIndex={0}
      whileHover={{ y: -3, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      animate={highlighted ? { scale: [1, 1.04, 1] } : {}}
      transition={highlighted ? { duration: 0.5, repeat: 2 } : {}}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
      className={`group relative rounded-xl overflow-hidden border bg-white text-left shadow-sm transition-shadow hover:shadow-md ${
        highlighted
          ? isCapture
            ? "border-amber-400 ring-2 ring-amber-300 ring-offset-1 shadow-amber-100 shadow-md"
            : "border-violet-400 ring-2 ring-violet-300 ring-offset-1 shadow-violet-100 shadow-md"
          : isCapture
          ? "border-amber-200"
          : "border-violet-200"
      }`}
    >
      <button
        type="button"
        aria-label={`Delete ${record.imageName ?? record.title}`}
        disabled={deleting}
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
        }}
        className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-white/70 bg-slate-950/70 text-white opacity-0 shadow-sm backdrop-blur transition-all hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60 group-hover:opacity-100 focus:opacity-100"
      >
        {deleting ? (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        ) : (
          <TrashIcon />
        )}
      </button>
      <div className="relative w-full bg-slate-100" style={{ aspectRatio: "16/10" }}>
        {record.imagePath ? (
          <Image src={record.imagePath} alt={record.imageName ?? ""} fill className="object-cover object-top" sizes="(max-width:768px) 50vw, 25vw" unoptimized />
        ) : null}
        <div className={`absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded shadow flex items-center gap-1 text-white ${
          isCapture ? "bg-amber-600" : "bg-violet-600"
        }`}>
          <MagicWandIcon /> {isCapture ? "Trend Capture" : "Style Spec"}
        </div>
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 rounded-lg p-1.5 flex items-center gap-1 text-[11px] font-medium text-slate-700">
            <EyeIcon /> View Spec
          </div>
        </div>
      </div>
      <div className="px-3 py-2">
        <div className="text-[12px] font-semibold text-slate-800 truncate">{record.imageName ?? record.title}</div>
        {isCapture && record.sourceSite ? (
          <div className="text-[11px] text-amber-700 leading-snug mt-0.5 truncate">
            ↗ {record.sourceSite}
          </div>
        ) : (
          <div className="text-[11px] text-slate-500 leading-snug mt-0.5 line-clamp-2">{record.title}</div>
        )}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Knowledge style guide section (formatted markdown)
// ---------------------------------------------------------------------------
function StyleGuideSection({ record }: { record: KnowledgeRecordFull }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-white rounded-[4px] border border-[#e2e8f0] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
            57B Library
          </span>
          <span className="text-sm font-semibold text-[#0f172a]">{record.title}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#64748b]">
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
  const [uploading, setUploading] = useState(false);
  const [batchAnalysing, setBatchAnalysing] = useState(false);
  const [specModal, setSpecModal] = useState<KnowledgeRecordFull | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeRecordFull | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Read ?highlight=DK-xxx from URL and switch to the matching industry tab
  const searchParams = useSearchParams();
  useEffect(() => {
    const id = searchParams.get("highlight");
    if (!id) return;
    setHighlightId(id);
    // Detect industry from the ID prefix and switch tab
    if (id.startsWith("DK-57b-ai") || id.startsWith("DK-img-ai") || id.startsWith("DK-img-auto-ai")) {
      setActiveIndustry("ai");
    } else if (id.startsWith("DK-57b-fintech") || id.startsWith("DK-img-f") || id.startsWith("DK-img-auto-fintech")) {
      setActiveIndustry("fintech-web3");
    } else if (id.startsWith("DK-57b-saas") || id.startsWith("DK-img-s") || id.startsWith("DK-img-auto-saas")) {
      setActiveIndustry("saas");
    }
    // Clear highlight after 4 s
    const t = setTimeout(() => setHighlightId(null), 4000);
    return () => clearTimeout(t);
  }, [searchParams]);

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

  // Scroll to and highlight the target record after records are loaded
  useEffect(() => {
    if (!highlightId || loading) return;
    const el = document.getElementById(`kb-record-${highlightId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightId, loading, activeIndustry]);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/memory/knowledge/refresh?industry=${activeIndustry}`, { method: "POST" });
      const data = await res.json() as {
        ok: boolean;
        summary?: { captured: number; failed: number; pruned: number };
      };
      if (data.ok && data.summary) {
        const { captured, failed, pruned } = data.summary;
        showToast(
          `Trend capture for ${activeIndustry}: ${captured} captured, ${failed} failed, ${pruned} pruned`,
          true,
        );
        await fetchRecords();
      } else {
        showToast("Trend capture failed — check server logs", false);
      }
    } catch { showToast("Network error during capture", false); }
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

  async function handleUpload(file: File, industry: StyleSpecIndustry) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("industry", industry);
      const res = await fetch("/api/memory/knowledge/upload", { method: "POST", body: fd });
      const data = await res.json() as { ok: boolean; error?: string; record?: { id: string } };
      if (data.ok) {
        showToast(`Analysed ${file.name} → ${data.record?.id}`, true);
        await fetchRecords();
      } else {
        showToast(`Upload failed: ${data.error ?? "unknown"}`, false);
      }
    } catch (err) {
      showToast(`Upload error: ${(err as Error).message}`, false);
    } finally {
      setUploading(false);
    }
  }

  async function handleBatchAnalyse() {
    setBatchAnalysing(true);
    try {
      const res = await fetch("/api/memory/knowledge/analyze-existing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      const data = await res.json() as {
        ok: boolean;
        error?: string;
        summary?: { analysed: number; skipped: number; failed: number; total: number };
      };
      if (data.ok && data.summary) {
        const { analysed, skipped, failed, total } = data.summary;
        showToast(`Batch: ${analysed} analysed, ${skipped} skipped, ${failed} failed (of ${total})`, failed === 0);
        await fetchRecords();
      } else {
        showToast(`Batch failed: ${data.error ?? "unknown"}`, false);
      }
    } catch (err) {
      showToast(`Batch error: ${(err as Error).message}`, false);
    } finally {
      setBatchAnalysing(false);
    }
  }

  async function deleteStyleSpec(record: KnowledgeRecordFull) {
    const label = record.imageName ?? record.title;
    setDeletingIds((prev) => new Set(prev).add(record.id));
    try {
      const res = await fetch(`/api/memory/knowledge/records/${encodeURIComponent(record.id)}`, {
        method: "DELETE",
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || data?.ok === false) {
        showToast(`Delete failed: ${data?.error ?? res.statusText}`, false);
        return;
      }

      setRecords((prev) => prev.filter((item) => item.id !== record.id));
      setSpecModal((prev) => (prev?.id === record.id ? null : prev));
      setDeleteTarget(null);
      showToast(`Deleted ${label}`, true);
    } catch (err) {
      showToast(`Delete error: ${(err as Error).message}`, false);
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(record.id);
        return next;
      });
    }
  }

  function handleDeleteStyleSpec(record: KnowledgeRecordFull) {
    setDeleteTarget(record);
  }

  const industryRecords = records.filter((r) => r.industry === activeIndustry);
  const libraryRecord = industryRecords.find((r) => r.isLibrary);
  const refreshRecords = industryRecords.filter((r) => r.isRefresh);
  // Generic-bucket style specs are also visible from any industry tab so users
  // can browse all custom uploads regardless of bucketing.
  const styleSpecRecords = records.filter(
    (r) => r.isStyleSpec && (r.industry === activeIndustry || r.industry === "generic"),
  );
  const activeInfo = INDUSTRIES.find((i) => i.id === activeIndustry)!;

  return (
    <div className="min-h-screen bg-[#f8f9ff]">
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

      {/* Style Spec modal */}
      <AnimatePresence>
        {specModal && <StyleSpecModal record={specModal} onClose={() => setSpecModal(null)} />}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTarget && (
          <DeleteStyleSpecDialog
            record={deleteTarget}
            deleting={deletingIds.has(deleteTarget.id)}
            onCancel={() => {
              if (!deletingIds.has(deleteTarget.id)) setDeleteTarget(null);
            }}
            onConfirm={() => void deleteStyleSpec(deleteTarget)}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="border-b border-[#e2e8f0] bg-white/90 backdrop-blur-sm px-8 py-5 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
              <SparkleIcon />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#0f172a] leading-tight">Design Knowledge Base</h1>
              <p className="text-xs text-[#64748b] mt-0.5">
                57B company style library · {records.length} knowledge records · auto-injected into DesignAgent
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleUpload(f, activeIndustry as StyleSpecIndustry);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e2e8f0] bg-white text-xs font-medium text-[#64748b] hover:bg-slate-50 disabled:opacity-50 transition-all"
            >
              <UploadIcon />{uploading ? "Analysing…" : `Upload to ${activeInfo.label}`}
            </button>
            <button
              onClick={() => void handleBatchAnalyse()}
              disabled={batchAnalysing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e2e8f0] bg-white text-xs font-medium text-[#64748b] hover:bg-slate-50 disabled:opacity-50 transition-all"
            >
              <MagicWandIcon />{batchAnalysing ? "Analysing…" : "Analyse All Images"}
            </button>
            <button onClick={() => void handleReseed()} disabled={seeding} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e2e8f0] bg-white text-xs font-medium text-[#64748b] hover:bg-slate-50 disabled:opacity-50 transition-all">
              <SeedIcon />{seeding ? "Seeding…" : "Re-seed Library"}
            </button>
            <button onClick={() => void handleRefresh()} disabled={refreshing} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#712ae2] text-white text-xs font-medium hover:bg-[#6b24da] disabled:opacity-50 transition-all">
              <RefreshIcon spinning={refreshing} />{refreshing ? "Capturing…" : `Capture ${activeInfo.label} Trends`}
            </button>
          </div>
        </div>

        {/* Industry tabs */}
        <div className="flex items-center gap-2 mt-4">
          {INDUSTRIES.map((ind) => {
            const count = records.filter((r) => r.industry === ind.id).length;
            const isActive = ind.id === activeIndustry;
            return (
              <button key={ind.id} onClick={() => setActiveIndustry(ind.id)} className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${isActive ? INDUSTRY_TAB_ACTIVE[ind.id] : "bg-white text-[#64748b] border border-[#e2e8f0] hover:bg-slate-50"}`}>
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
              <div className={`flex items-start gap-3 rounded-[4px] border px-4 py-3 text-sm ${INDUSTRY_ACCENT[activeIndustry]}`}>
                <SparkleIcon />
                <div>
                  <span className="font-semibold">Auto-inject trigger keywords: </span>
                  <span className="opacity-80">{INDUSTRY_KW[activeIndustry]}</span>
                  <span className="ml-2 opacity-60 text-xs">— detected from PRD content, then these guidelines are injected into the DesignAgent.</span>
                </div>
              </div>

              {/* Generated Style Specs (per uploaded image) */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-bold text-[#0f172a]">
                      ✨ Generated Style Specs
                      <span className="ml-2 text-[#94a3b8] font-normal text-xs">
                        ({styleSpecRecords.length} spec{styleSpecRecords.length === 1 ? "" : "s"})
                      </span>
                    </h2>
                    <p className="text-xs text-[#64748b] mt-0.5">
                      Each uploaded image OR captured trend site is analysed by a vision LLM → produces a Markdown summary + a full HTML visualisation document.
                      Both are recalled into DesignAgent when the project matches this industry.
                    </p>
                  </div>
                </div>
                {styleSpecRecords.length === 0 ? (
                  <div className="rounded-[4px] border-2 border-dashed border-[#e2e8f0] bg-white p-8 text-center">
                    <p className="text-sm text-slate-500 mb-1">No Style Specs yet for this bucket.</p>
                    <p className="text-xs text-slate-400 mb-3">
                      Click <strong>Capture {activeInfo.label} Trends</strong> above to auto-discover and screenshot trending sites,{" "}
                      <strong>Upload to {activeInfo.label}</strong> to add your own image, or{" "}
                      <strong>Analyse All Images</strong> to process the static references in <code>public/knowledge-refs/</code>.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {styleSpecRecords.map((r) => (
                      <StyleSpecCard
                        key={r.id}
                        record={r}
                        onOpen={() => setSpecModal(r)}
                        onDelete={() => void handleDeleteStyleSpec(r)}
                        highlighted={highlightId === r.id}
                        deleting={deletingIds.has(r.id)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Style Guide */}
              <div>
                <h2 className="text-sm font-bold text-slate-800 mb-3">
                  📋 Style Guide
                  <span className="ml-2 text-slate-400 font-normal text-xs">— injected verbatim into DesignAgent prompt</span>
                </h2>
                {libraryRecord ? (
                  <div id={`kb-record-${libraryRecord.id}`} className={`transition-all duration-500 rounded-xl ${highlightId === libraryRecord.id ? "ring-2 ring-violet-400 ring-offset-2 shadow-lg shadow-violet-100" : ""}`}>
                    <StyleGuideSection record={libraryRecord} />
                  </div>
                ) : (
                  <div className="rounded-[4px] border-2 border-dashed border-[#e2e8f0] bg-white p-8 text-center">
                    <p className="text-sm text-slate-500 mb-3">No 57B library record found for this industry.</p>
                    <button onClick={() => void handleReseed()} disabled={seeding} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#712ae2] text-white text-sm font-medium hover:bg-[#6b24da] disabled:opacity-50 transition-all">
                      <SeedIcon />{seeding ? "Seeding…" : "Seed 57B Library"}
                    </button>
                  </div>
                )}
              </div>

              {/* Daily Trend Refreshes — legacy text-only trend notes (kept
                  visible while historical records remain; new refreshes now
                  go through the trend-capture pipeline above). */}
              {refreshRecords.length > 0 && (
                <div>
                  <h2 className="text-sm font-bold text-slate-800 mb-3">
                    🔄 Daily Trend Refreshes
                    <span className="ml-2 text-slate-400 font-normal text-xs">({refreshRecords.length} legacy text records)</span>
                  </h2>
                  <div className="space-y-3">
                    {refreshRecords.map((r) => {
                      const date = r.tags.find((t) => t.startsWith("refreshed:"))?.replace("refreshed:", "");
                      // Newly-generated trend records embed both Markdown and HTML
                      // sections — display only the Markdown for the inline summary
                      // and reveal the HTML doc through the preview modal. Legacy
                      // records (Markdown-only body) fall back to rendering the
                      // entire body verbatim.
                      const markdown = extractTrendRefreshMarkdown(r.body) ?? r.body;
                      const hasHtml = Boolean(extractStyleSpecHtml(r.body));
                      return (
                        <div key={r.id} className="bg-white rounded-[4px] border border-dashed border-[#e2e8f0] p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Trend Refresh</span>
                            {date && <span className="text-[11px] text-slate-400">{date}</span>}
                            <span className="ml-auto text-xs text-emerald-600 font-medium">score {(r.metrics.score ?? 0).toFixed(2)}</span>
                            {hasHtml && (
                              <button
                                onClick={() => setSpecModal(r)}
                                className="flex items-center gap-1 text-[11px] font-medium text-violet-700 hover:text-violet-900 px-2 py-1 rounded-md hover:bg-violet-50 transition-colors"
                              >
                                <EyeIcon /> Open HTML preview
                              </button>
                            )}
                          </div>
                          <div className="prose prose-sm prose-slate max-w-none text-[13px] [&_h3]:text-[13px] [&_h3]:font-semibold [&_h3]:text-slate-700 [&_h3]:mt-3 [&_h3]:mb-1 [&_ul]:mt-1 [&_li]:text-slate-600 [&_strong]:text-slate-800">
                            <ReactMarkdown>{markdown}</ReactMarkdown>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
