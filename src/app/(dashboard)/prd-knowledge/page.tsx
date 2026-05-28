"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";

import type {
  PrdKnowledgeListItem,
  PrdKnowledgeListResponse,
} from "@/app/api/memory/prd/records/route";

type Tab = "pending" | "active" | "deprecated";

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------
function DocumentIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v5h5" />
      <path d="M9 13h6M9 17h6M9 9h2" />
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
function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}
function RestoreIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 12a9 9 0 1 0 9-9" />
      <polyline points="3 4 3 12 11 12" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
const TAB_META: Record<Tab, { label: string; accent: string }> = {
  pending: { label: "Pending", accent: "from-amber-500 to-orange-500" },
  active: { label: "Active", accent: "from-emerald-500 to-teal-500" },
  deprecated: { label: "Deprecated", accent: "from-slate-400 to-slate-500" },
};

export default function PrdKnowledgePage() {
  const [tab, setTab] = useState<Tab>("pending");
  const [records, setRecords] = useState<PrdKnowledgeListItem[]>([]);
  const [allCounts, setAllCounts] = useState<Record<Tab, number>>({ pending: 0, active: 0, deprecated: 0 });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<PrdKnowledgeListItem | null>(null);
  const [filterIndustry, setFilterIndustry] = useState<string>("");
  const [filterProductType, setFilterProductType] = useState<string>("");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ status: tab });
      if (filterIndustry) qs.set("industry", filterIndustry);
      if (filterProductType) qs.set("productType", filterProductType);
      const res = await fetch(`/api/memory/prd/records?${qs.toString()}`);
      const data = (await res.json()) as PrdKnowledgeListResponse;
      setRecords(data.records);

      const all = await fetch(`/api/memory/prd/records?status=all`);
      const allData = (await all.json()) as PrdKnowledgeListResponse;
      const counts: Record<Tab, number> = { pending: 0, active: 0, deprecated: 0 };
      for (const r of allData.records) counts[r.status]++;
      setAllCounts(counts);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [tab, filterIndustry, filterProductType]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setTimeout(() => setRefreshing(false), 300);
  };

  const act = async (id: string, action: "approve" | "reject" | "delete") => {
    try {
      const res = action === "delete"
        ? await fetch(`/api/memory/prd/${id}`, { method: "DELETE" })
        : await fetch(`/api/memory/prd/${id}/${action}`, { method: "POST" });
      if (!res.ok) {
        showToast(`${action} failed`, false);
        return;
      }
      showToast(
        action === "approve" ? "Approved · moved to Active"
        : action === "reject" ? "Marked as Deprecated"
        : "Deleted",
        true,
      );
      setSelected(null);
      await load();
    } catch {
      showToast("Network error", false);
    }
  };

  const industries = useMemo(() => Array.from(new Set(records.map((r) => r.industry))).sort(), [records]);
  const productTypes = useMemo(() => Array.from(new Set(records.map((r) => r.productType))).sort(), [records]);

  return (
    <div className="min-h-screen bg-[#f8f9ff]">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.95 }}
            className={`fixed top-5 right-5 z-[100] flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium ${
              toast.ok ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
            }`}
          >
            {toast.ok ? <CheckIcon /> : <XMarkIcon />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selected && (
          <DetailDrawer record={selected} onClose={() => setSelected(null)} onAct={act} />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="border-b border-[#e2e8f0] bg-white/90 backdrop-blur-sm px-8 py-5 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shrink-0 text-white">
              <DocumentIcon />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#0f172a] leading-tight">PRD Knowledge Base</h1>
              <p className="text-xs text-[#64748b] mt-0.5">
                Auto-distilled PRD cases · {allCounts.active} active · {allCounts.pending} pending · injected into PRD generation
              </p>
            </div>
          </div>
          <button
            onClick={() => void handleRefresh()}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[#e2e8f0] bg-white text-[#475569] hover:bg-slate-50 hover:border-slate-300 transition-colors disabled:opacity-50"
          >
            <RefreshIcon spinning={refreshing} />
            Refresh
          </button>
        </div>
      </div>

      <div className="px-8 py-6 space-y-5">
        {/* Tabs */}
        <div className="flex items-center gap-2">
          {(Object.keys(TAB_META) as Tab[]).map((t) => {
            const meta = TAB_META[t];
            const isActive = tab === t;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`relative px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "text-white shadow-md shadow-indigo-200"
                    : "text-[#475569] bg-white border border-[#e2e8f0] hover:border-slate-300"
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="tab-pill-bg"
                    className={`absolute inset-0 rounded-xl bg-gradient-to-r ${meta.accent}`}
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <span className="relative flex items-center gap-2">
                  {meta.label}
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    isActive ? "bg-white/25" : "bg-slate-100 text-[#64748b]"
                  }`}>
                    {allCounts[t]}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-[#64748b] text-xs">Filter</span>
          <select
            value={filterIndustry}
            onChange={(e) => setFilterIndustry(e.target.value)}
            className="px-2.5 py-1 rounded-lg border border-[#e2e8f0] bg-white text-[#0f172a] text-xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            <option value="">All industries</option>
            {industries.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
          <select
            value={filterProductType}
            onChange={(e) => setFilterProductType(e.target.value)}
            className="px-2.5 py-1 rounded-lg border border-[#e2e8f0] bg-white text-[#0f172a] text-xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            <option value="">All product types</option>
            {productTypes.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          {(filterIndustry || filterProductType) && (
            <button
              onClick={() => { setFilterIndustry(""); setFilterProductType(""); }}
              className="text-[11px] text-[#64748b] hover:text-[#0f172a]"
            >
              Clear
            </button>
          )}
        </div>

        {/* Cards */}
        {loading ? (
          <LoadingGrid />
        ) : records.length === 0 ? (
          <EmptyState tab={tab} />
        ) : (
          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {records.map((r) => (
                <RecordCard key={r.id} record={r} onOpen={() => setSelected(r)} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Record card
// ---------------------------------------------------------------------------
function RecordCard({ record, onOpen }: { record: PrdKnowledgeListItem; onOpen: () => void }) {
  const statusStyle =
    record.status === "active"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : record.status === "pending"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-slate-100 text-slate-500 border-slate-200";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.18 }}
      onClick={onOpen}
      className="group relative bg-white border border-[#e2e8f0] rounded-2xl p-5 cursor-pointer hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-100/50 transition-all"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="industry">{record.industry}</Badge>
          <Badge variant="muted">{record.productType}</Badge>
          <Badge variant="muted">tier {record.tier}</Badge>
        </div>
        <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${statusStyle}`}>
          {record.status}
        </span>
      </div>

      <h3 className="text-[15px] font-semibold text-[#0f172a] leading-snug line-clamp-2 group-hover:text-indigo-700 transition-colors">
        {record.title}
      </h3>

      <p className="text-sm text-[#64748b] line-clamp-3 mt-2 leading-relaxed">
        {record.summary || <span className="italic text-slate-400">No summary extracted</span>}
      </p>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 text-[11px] text-[#94a3b8]">
        <div className="flex items-center gap-3">
          <span title="Times this case was injected into a PRD prompt">
            hits <span className="font-semibold text-[#475569]">{record.hits}</span>
          </span>
          <span title="Recall score">
            score <span className="font-semibold text-[#475569]">{record.score.toFixed(2)}</span>
          </span>
        </div>
        {record.sourceProjectId && (
          <span className="font-mono text-[10px] truncate max-w-[140px]" title={record.sourceProjectId}>
            {record.sourceProjectId.slice(0, 10)}…
          </span>
        )}
      </div>
    </motion.article>
  );
}

// ---------------------------------------------------------------------------
// Detail drawer
// ---------------------------------------------------------------------------
function DetailDrawer({
  record,
  onClose,
  onAct,
}: {
  record: PrdKnowledgeListItem;
  onClose: () => void;
  onAct: (id: string, action: "approve" | "reject" | "delete") => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-end z-50"
      onClick={onClose}
    >
      <motion.aside
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 280, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-5xl h-full bg-white shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="px-7 py-5 border-b border-[#e2e8f0] bg-white sticky top-0 z-10">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                <Badge variant="industry">{record.industry}</Badge>
                <Badge variant="muted">{record.productType}</Badge>
                <Badge variant="muted">tier {record.tier}</Badge>
                <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border bg-slate-50 text-slate-600 border-slate-200">
                  {record.status}
                </span>
              </div>
              <h2 className="text-xl font-bold text-[#0f172a] leading-tight">{record.title}</h2>
              <p className="text-xs text-[#94a3b8] mt-1.5">
                hits {record.hits} · score {record.score.toFixed(2)}
                {record.sourceProjectId ? ` · from ${record.sourceProjectId.slice(0, 10)}…` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {record.status === "pending" && (
                <>
                  <ActionButton variant="primary" onClick={() => onAct(record.id, "approve")}>
                    <CheckIcon /> Approve
                  </ActionButton>
                  <ActionButton variant="ghost-danger" onClick={() => onAct(record.id, "reject")}>
                    <XMarkIcon /> Reject
                  </ActionButton>
                </>
              )}
              {record.status === "active" && (
                <ActionButton variant="ghost-warn" onClick={() => onAct(record.id, "reject")}>
                  Deprecate
                </ActionButton>
              )}
              {record.status === "deprecated" && (
                <>
                  <ActionButton variant="ghost" onClick={() => onAct(record.id, "approve")}>
                    <RestoreIcon /> Restore
                  </ActionButton>
                  <ActionButton variant="danger" onClick={() => onAct(record.id, "delete")}>
                    <TrashIcon /> Delete
                  </ActionButton>
                </>
              )}
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-[#64748b]"
                aria-label="Close"
              >
                <XMarkIcon />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-5 gap-0 min-h-full">
            <div className="col-span-3 px-7 py-6 border-r border-[#e2e8f0] bg-slate-50/40">
              <SectionHeading>Full PRD</SectionHeading>
              <article className="prose prose-sm prose-slate max-w-none prose-headings:font-semibold prose-headings:text-[#0f172a] prose-p:text-[#334155] prose-li:text-[#334155] prose-code:text-indigo-700 prose-code:bg-indigo-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
                <ReactMarkdown>{record.fullPrd || "*No content*"}</ReactMarkdown>
              </article>
            </div>

            <div className="col-span-2 px-7 py-6 bg-white">
              <SectionHeading>Summary</SectionHeading>
              <p className="text-sm text-[#334155] leading-relaxed mb-5">
                {record.summary || <span className="italic text-slate-400">No summary</span>}
              </p>

              <SectionHeading>Extracted Sections</SectionHeading>
              <div className="space-y-2">
                {Object.entries(record.sections).length === 0 && (
                  <p className="text-xs italic text-slate-400">No sections extracted</p>
                )}
                {Object.entries(record.sections).map(([key, val]) => (
                  <details key={key} className="group rounded-lg border border-[#e2e8f0] bg-white open:bg-slate-50/60" open>
                    <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[#475569] flex items-center justify-between">
                      <span>{prettyKey(key)}</span>
                      <ChevronIcon />
                    </summary>
                    <div className="px-3 pb-3 text-sm text-[#334155]">
                      {Array.isArray(val) ? (
                        <ul className="space-y-1.5 mt-1">
                          {val.map((v, i) => (
                            <li key={i} className="pl-3 relative">
                              <span className="absolute left-0 top-2 w-1 h-1 rounded-full bg-indigo-400" />
                              {v}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>{val as string}</p>
                      )}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.aside>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Atoms
// ---------------------------------------------------------------------------
function Badge({ children, variant }: { children: React.ReactNode; variant: "industry" | "muted" }) {
  const cls = variant === "industry"
    ? "bg-indigo-50 text-indigo-700 border-indigo-100"
    : "bg-slate-50 text-slate-600 border-slate-200";
  return (
    <span className={`text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-full border ${cls}`}>
      {children}
    </span>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#94a3b8] mb-3">{children}</h3>
  );
}

type ActionVariant = "primary" | "ghost" | "ghost-danger" | "ghost-warn" | "danger";

function ActionButton({
  children,
  onClick,
  variant,
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant: ActionVariant;
}) {
  const base = "flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-all";
  const styles: Record<ActionVariant, string> = {
    primary: "bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm shadow-emerald-200",
    ghost: "border border-[#e2e8f0] bg-white text-[#475569] hover:bg-slate-50",
    "ghost-danger": "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
    "ghost-warn": "border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100",
    danger: "bg-rose-600 text-white hover:bg-rose-500 shadow-sm shadow-rose-200",
  };
  return (
    <button onClick={onClick} className={`${base} ${styles[variant]}`}>{children}</button>
  );
}

function ChevronIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 transition-transform group-open:rotate-180">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white border border-[#e2e8f0] rounded-2xl p-5 animate-pulse">
          <div className="flex gap-1.5 mb-3">
            <div className="h-4 w-14 bg-slate-100 rounded-full" />
            <div className="h-4 w-16 bg-slate-100 rounded-full" />
          </div>
          <div className="h-4 w-2/3 bg-slate-200 rounded mb-2" />
          <div className="h-3 w-full bg-slate-100 rounded mb-1" />
          <div className="h-3 w-5/6 bg-slate-100 rounded" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  const messages: Record<Tab, { title: string; hint: string }> = {
    pending: {
      title: "No pending PRD cases",
      hint: "Complete a PRD step in any project — it will be auto-distilled into a pending case here within a few seconds.",
    },
    active: {
      title: "No active cases yet",
      hint: "Approve a pending case to make it available as a few-shot example for future PRD generation.",
    },
    deprecated: {
      title: "No deprecated cases",
      hint: "Rejected or aged-out cases will appear here.",
    },
  };
  const m = messages[tab];
  return (
    <div className="bg-white border border-dashed border-[#e2e8f0] rounded-2xl p-12 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mb-4">
        <DocumentIcon />
      </div>
      <h3 className="text-sm font-semibold text-[#0f172a]">{m.title}</h3>
      <p className="text-xs text-[#64748b] mt-1.5 max-w-md mx-auto leading-relaxed">{m.hint}</p>
    </div>
  );
}

function prettyKey(key: string): string {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}
