"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";

import type {
  KnowledgeRecordFull,
  KnowledgeRecordsResponse,
} from "@/app/api/memory/knowledge/records/route";
import type { DesignIndustry } from "@/lib/memory/knowledge/57b-library";

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
    <svg
      width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden
      className={spinning ? "animate-spin" : ""}
    >
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
const INDUSTRIES: { id: DesignIndustry; label: string; emoji: string; color: string }[] = [
  { id: "ai", label: "AI / ML", emoji: "🤖", color: "indigo" },
  { id: "fintech-web3", label: "FinTech / Web3", emoji: "⛓", color: "violet" },
  { id: "saas", label: "SaaS / Enterprise", emoji: "📊", color: "sky" },
];

const INDUSTRY_ACCENT: Record<DesignIndustry, string> = {
  ai: "bg-indigo-50 text-indigo-700 border-indigo-200",
  "fintech-web3": "bg-violet-50 text-violet-700 border-violet-200",
  saas: "bg-sky-50 text-sky-700 border-sky-200",
};

const INDUSTRY_TAB_ACTIVE: Record<DesignIndustry, string> = {
  ai: "bg-indigo-600 text-white shadow-sm",
  "fintech-web3": "bg-violet-600 text-white shadow-sm",
  saas: "bg-sky-600 text-white shadow-sm",
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function Tag({ text, industry }: { text: string; industry: DesignIndustry | null }) {
  const colorClass = industry ? INDUSTRY_ACCENT[industry] : "bg-slate-100 text-slate-600 border-slate-200";
  const isSpecial = text.includes("manual:approved") || text.includes("source:57b");
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${isSpecial ? colorClass : "bg-slate-50 text-slate-500 border-slate-200"}`}>
      {text}
    </span>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-xs font-medium text-slate-700">{value}</span>
    </div>
  );
}

function RecordCard({ record, isRefresh }: { record: KnowledgeRecordFull; isRefresh: boolean }) {
  const refreshDate = record.tags.find((t) => t.startsWith("refreshed:"))?.replace("refreshed:", "");

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-4 ${isRefresh ? "border-dashed border-slate-300 bg-slate-50" : "border-slate-200 bg-white shadow-sm"}`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${isRefresh ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
            {isRefresh ? "Trend Refresh" : "57B Library"}
          </span>
          {refreshDate && (
            <span className="text-[11px] text-slate-400">{refreshDate}</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-400 shrink-0">
          {record.metrics.hits != null && (
            <span>{record.metrics.hits} hits</span>
          )}
          {record.metrics.score != null && (
            <span className="text-emerald-600 font-medium">
              score {record.metrics.score.toFixed(2)}
            </span>
          )}
        </div>
      </div>
      <h4 className="text-sm font-semibold text-slate-800 mb-3">{record.title}</h4>
      <div className="prose prose-sm prose-slate max-w-none text-[13px] leading-relaxed [&_h3]:text-[13px] [&_h3]:font-semibold [&_h3]:text-slate-700 [&_h3]:mt-4 [&_h3]:mb-1.5 [&_ul]:mt-1 [&_li]:text-slate-600 [&_strong]:text-slate-800 [&_li]:marker:text-slate-400">
        <ReactMarkdown>{record.body}</ReactMarkdown>
      </div>
      <div className="flex flex-wrap gap-1 mt-4 pt-3 border-t border-slate-100">
        {record.tags.map((tag) => (
          <Tag key={tag} text={tag} industry={record.industry} />
        ))}
      </div>
    </motion.div>
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

  useEffect(() => {
    void fetchRecords();
  }, [fetchRecords]);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const res = await fetch(
        `/api/memory/knowledge/refresh?industry=${activeIndustry}`,
        { method: "POST" },
      );
      const data = await res.json() as { ok: boolean; results?: Array<{ status: string }> };
      if (data.ok) {
        showToast(`Trend refresh complete for ${activeIndustry}`, true);
        await fetchRecords();
      } else {
        showToast("Refresh failed — check server logs", false);
      }
    } catch {
      showToast("Network error during refresh", false);
    } finally {
      setRefreshing(false);
    }
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
      } else {
        showToast("Seed failed — check server logs", false);
      }
    } catch {
      showToast("Network error during seed", false);
    } finally {
      setSeeding(false);
    }
  }

  const industryRecords = records.filter((r) => r.industry === activeIndustry);
  const libraryRecord = industryRecords.find((r) => r.isLibrary);
  const refreshRecords = industryRecords.filter((r) => r.isRefresh);

  const totalRefreshRecords = records.filter((r) => r.isRefresh).length;

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
            className={`fixed top-5 right-5 z-[100] flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium ${
              toast.ok
                ? "bg-emerald-600 text-white"
                : "bg-rose-600 text-white"
            }`}
          >
            <CheckIcon />
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-8 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
              <SparkleIcon />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">Design Knowledge Base</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                57B company style library · {records.length} records · {totalRefreshRecords} daily refreshes
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void handleReseed()}
              disabled={seeding}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 transition-all"
            >
              <SeedIcon />
              {seeding ? "Seeding…" : "Re-seed Library"}
            </button>
            <button
              onClick={() => void handleRefresh()}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-700 disabled:opacity-50 transition-all"
            >
              <RefreshIcon spinning={refreshing} />
              {refreshing ? "Refreshing…" : `Refresh ${activeInfo.label} Trends`}
            </button>
          </div>
        </div>

        {/* Industry tabs */}
        <div className="flex items-center gap-2 mt-4">
          {INDUSTRIES.map((ind) => {
            const count = records.filter((r) => r.industry === ind.id).length;
            const isActive = ind.id === activeIndustry;
            return (
              <button
                key={ind.id}
                onClick={() => setActiveIndustry(ind.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                  isActive
                    ? INDUSTRY_TAB_ACTIVE[ind.id]
                    : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span>{ind.emoji}</span>
                <span>{ind.label}</span>
                <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${isActive ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-3 text-slate-500">
              <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 11-6.219-8.56" strokeLinecap="round" />
              </svg>
              <span className="text-sm">Loading knowledge records…</span>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndustry}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.18 }}
              className="space-y-5"
            >
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="text-2xl font-bold text-slate-900">{libraryRecord ? 1 : 0}</div>
                  <div className="text-xs text-slate-500 mt-0.5">57B Library Record</div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="text-2xl font-bold text-slate-900">{refreshRecords.length}</div>
                  <div className="text-xs text-slate-500 mt-0.5">Daily Refresh Records</div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="text-2xl font-bold text-slate-900">
                    {industryRecords.reduce((sum, r) => sum + (r.metrics.hits ?? 0), 0)}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">Total Injection Hits</div>
                </div>
              </div>

              {/* Info banner */}
              <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${INDUSTRY_ACCENT[activeIndustry]}`}>
                <SparkleIcon />
                <div>
                  <span className="font-semibold">{activeInfo.emoji} {activeInfo.label}</span>
                  {" — "}
                  These guidelines are automatically injected into the DesignAgent when the PRD contains{" "}
                  {activeIndustry === "ai" && "AI/LLM/ML keywords."}
                  {activeIndustry === "fintech-web3" && "Web3/blockchain/DeFi/crypto keywords."}
                  {activeIndustry === "saas" && "SaaS/dashboard/B2B/enterprise keywords."}
                  {" "}Records tagged{" "}
                  <code className="text-[11px] bg-white/60 px-1 rounded">manual:approved</code>{" "}
                  bypass the score threshold and are always injected.
                </div>
              </div>

              {/* 57B Library record */}
              {libraryRecord ? (
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
                    57B Style Library
                  </h2>
                  <RecordCard record={libraryRecord} isRefresh={false} />
                </div>
              ) : (
                <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-8 text-center">
                  <p className="text-sm text-slate-500 mb-3">No 57B library record found for this industry.</p>
                  <button
                    onClick={() => void handleReseed()}
                    disabled={seeding}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-all"
                  >
                    <SeedIcon />
                    {seeding ? "Seeding…" : "Seed 57B Library"}
                  </button>
                </div>
              )}

              {/* Daily refresh records */}
              {refreshRecords.length > 0 && (
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
                    Daily Trend Refreshes ({refreshRecords.length})
                  </h2>
                  <div className="space-y-4">
                    {refreshRecords.map((r) => (
                      <RecordCard key={r.id} record={r} isRefresh />
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state for refresh */}
              {refreshRecords.length === 0 && libraryRecord && (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center">
                  <p className="text-sm text-slate-500 mb-1">No daily refresh records yet for {activeInfo.label}.</p>
                  <p className="text-xs text-slate-400 mb-3">
                    Click <strong>Refresh Trends</strong> above to generate LLM-powered design trend notes for {new Date().getFullYear()}.
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
