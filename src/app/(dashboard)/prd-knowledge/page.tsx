"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";

import type {
  PrdKnowledgeListItem,
  PrdKnowledgeListResponse,
} from "@/app/api/memory/prd/records/route";
import { KNOWN_PRD_INDUSTRIES } from "@/lib/memory/knowledge/prd-knowledge/types";

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
function UploadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
function SparkleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
const TAB_META: Record<Tab, { label: string }> = {
  active: { label: "Active" },
  pending: { label: "Pending" },
  deprecated: { label: "Deprecated" },
};

export default function PrdKnowledgePage() {
  const [tab, setTab] = useState<Tab>("active");
  const [records, setRecords] = useState<PrdKnowledgeListItem[]>([]);
  const [allCounts, setAllCounts] = useState<Record<Tab, number>>({ pending: 0, active: 0, deprecated: 0 });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<PrdKnowledgeListItem | null>(null);
  const [filterIndustry, setFilterIndustry] = useState<string>("");
  const [filterProductType, setFilterProductType] = useState<string>("");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

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

  // Industry pills use the predefined enum (always visible).
  // Custom/unknown industries appearing in records are appended after the known ones.
  const industries = useMemo(() => {
    const fromRecords = new Set(records.map((r) => r.industry));
    const known = KNOWN_PRD_INDUSTRIES.filter(() => true) as string[];
    const extra = Array.from(fromRecords).filter((i) => !known.includes(i)).sort();
    return [...known, ...extra];
  }, [records]);
  const industryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of records) counts[r.industry] = (counts[r.industry] ?? 0) + 1;
    return counts;
  }, [records]);
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

      <AnimatePresence>
        {uploadOpen && (
          <UploadModal
            onClose={() => setUploadOpen(false)}
            onUploaded={async () => {
              setUploadOpen(false);
              showToast("Uploaded · moved to Pending", true);
              setTab("pending");
              await load();
            }}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="border-b border-[#e2e8f0] bg-white/90 backdrop-blur-sm px-8 py-4 sticky top-0 z-40">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shrink-0 text-white">
              <DocumentIcon />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-[#0f172a] leading-tight">PRD Knowledge Base</h1>
              <p className="text-xs text-[#64748b] mt-0.5 truncate">
                Auto-distilled PRD cases · injected into PRD generation
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <StatusSegmented value={tab} counts={allCounts} onChange={setTab} />
            <span className="h-5 w-px bg-[#e2e8f0]" aria-hidden />
            <button
              onClick={() => setUploadOpen(true)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors"
            >
              <UploadIcon />
              Upload PRD
            </button>
            <button
              onClick={() => void handleRefresh()}
              disabled={refreshing}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[#e2e8f0] bg-white text-[#475569] hover:bg-slate-50 hover:border-slate-300 transition-colors disabled:opacity-50"
              aria-label="Refresh"
            >
              <RefreshIcon spinning={refreshing} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 space-y-6">
        {/* Filters — primary browse mechanism */}
        <div className="space-y-3">
          <FilterRow
            label="Industry"
            options={industries}
            counts={industryCounts}
            value={filterIndustry}
            onChange={setFilterIndustry}
          />
          <FilterRow
            label="Type"
            options={productTypes}
            value={filterProductType}
            onChange={setFilterProductType}
          />
          {(filterIndustry || filterProductType) && (
            <button
              onClick={() => { setFilterIndustry(""); setFilterProductType(""); }}
              className="text-[11px] text-[#64748b] hover:text-[#0f172a] underline-offset-2 hover:underline"
            >
              Clear all
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

function StatusSegmented({
  value,
  counts,
  onChange,
}: {
  value: Tab;
  counts: Record<Tab, number>;
  onChange: (next: Tab) => void;
}) {
  const order: Tab[] = ["active", "pending", "deprecated"];
  return (
    <div
      role="tablist"
      aria-label="Filter by status"
      className="inline-flex items-center rounded-lg border border-[#e2e8f0] bg-slate-50 p-0.5"
    >
      {order.map((t) => {
        const isActive = value === t;
        const showDot = t === "pending" && counts.pending > 0 && !isActive;
        return (
          <button
            key={t}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t)}
            className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
              isActive
                ? "bg-white text-[#0f172a] shadow-sm"
                : "text-[#64748b] hover:text-[#0f172a]"
            }`}
          >
            {TAB_META[t].label}
            <span className={`text-[10px] font-semibold ${isActive ? "text-[#94a3b8]" : "text-[#cbd5e1]"}`}>
              {counts[t]}
            </span>
            {showDot && (
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-500" aria-hidden />
            )}
          </button>
        );
      })}
    </div>
  );
}

function FilterRow({
  label,
  options,
  counts,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  /** Optional per-option counts. Options with count 0 render muted (but stay clickable). */
  counts?: Record<string, number>;
  value: string;
  onChange: (next: string) => void;
}) {
  if (options.length === 0) return null;

  const pillBase =
    "text-sm leading-none px-3.5 py-2 rounded-full border transition-colors duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-1";

  const allActive = value === "";

  return (
    <div
      role="radiogroup"
      aria-label={`Filter by ${label}`}
      className="flex items-center gap-2 flex-wrap"
    >
      <span className="text-xs font-semibold uppercase tracking-wider text-[#64748b] min-w-[4rem] shrink-0 leading-none">
        {label}
      </span>
      <button
        role="radio"
        aria-checked={allActive}
        onClick={() => onChange("")}
        className={`${pillBase} ${
          allActive
            ? "bg-indigo-50 text-indigo-700 border-indigo-200"
            : "bg-white text-[#475569] border-[#e2e8f0] hover:border-indigo-200 hover:bg-indigo-50/40 hover:text-indigo-700"
        }`}
      >
        All
      </button>
      {options.map((opt) => {
        const active = value === opt;
        const count = counts?.[opt];
        const empty = counts !== undefined && (count ?? 0) === 0 && !active;
        return (
          <button
            key={opt}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(active ? "" : opt)}
            title={empty ? `No records in ${opt}` : undefined}
            className={`${pillBase} ${
              active
                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200"
                : empty
                ? "bg-white text-[#cbd5e1] border-[#eef2f6] hover:border-slate-200 hover:text-slate-400"
                : "bg-white text-[#475569] border-[#e2e8f0] hover:border-indigo-300 hover:bg-indigo-50/40 hover:text-indigo-700"
            }`}
          >
            <span className="flex items-center gap-1.5">
              {opt}
              {count !== undefined && count > 0 && !active && (
                <span className="text-[11px] font-semibold text-[#94a3b8]">{count}</span>
              )}
            </span>
          </button>
        );
      })}
    </div>
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

// ---------------------------------------------------------------------------
// Upload modal
// ---------------------------------------------------------------------------
function UploadModal({
  onClose,
  onUploaded,
}: {
  onClose: () => void;
  onUploaded: () => void | Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const pickFile = (f: File | null) => {
    setError(null);
    if (!f) return;
    if (!/\.(md|markdown)$/i.test(f.name)) {
      setError("Only .md / .markdown files are supported.");
      return;
    }
    if (f.size > 2 * 1024 * 1024) {
      setError("File too large (max 2 MB).");
      return;
    }
    setFile(f);
  };

  const submit = async () => {
    if (!file || uploading) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/memory/prd/upload", { method: "POST", body: fd });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !data?.ok) {
        const err = data?.error ?? "unknown";
        const msg =
          err === "invalid_extension" ? "Only .md / .markdown files are supported."
          : err === "file_too_short" ? "PRD is too short (minimum 200 characters)."
          : err === "file_too_large" ? "File too large (max 2 MB)."
          : err === "extract_failed" ? "LLM extraction failed. Check the file and try again."
          : `Upload failed (${err}).`;
        setError(msg);
        return;
      }
      await onUploaded();
    } catch (err) {
      setError(`Network error: ${(err as Error).message}`);
    } finally {
      setUploading(false);
    }
  };

  const fileSizeKb = file ? Math.max(1, Math.round(file.size / 1024)) : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={() => { if (!uploading) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="px-6 py-5 border-b border-[#e2e8f0] flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#0f172a]">Upload PRD</h2>
          <button
            disabled={uploading}
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-[#64748b] disabled:opacity-40"
            aria-label="Close"
          >
            <XMarkIcon />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              pickFile(e.dataTransfer.files?.[0] ?? null);
            }}
            className={`flex flex-col items-center justify-center text-center px-6 py-10 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
              dragOver ? "border-indigo-400 bg-indigo-50/60" : "border-[#e2e8f0] hover:border-indigo-300 hover:bg-slate-50"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".md,.markdown,text/markdown"
              className="hidden"
              onChange={(e) => {
                pickFile(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
            <UploadIcon />
            {file ? (
              <>
                <p className="mt-3 text-sm font-medium text-[#0f172a]">{file.name}</p>
                <p className="text-xs text-[#64748b] mt-0.5">{fileSizeKb} KB · click to replace</p>
              </>
            ) : (
              <>
                <p className="mt-3 text-sm font-medium text-[#0f172a]">Drop a .md file here</p>
                <p className="text-xs text-[#64748b] mt-0.5">or click to browse</p>
              </>
            )}
          </div>

          <p className="text-[11px] text-[#64748b] leading-relaxed">
            Industry / product type will be auto-extracted by LLM (~2-5s). You can correct them after approval.
          </p>
        </div>

        <div className="px-6 py-4 border-t border-[#e2e8f0] flex items-center justify-end gap-2 bg-slate-50/40">
          <button
            disabled={uploading}
            onClick={onClose}
            className="text-xs px-3 py-2 rounded-lg border border-[#e2e8f0] bg-white text-[#475569] hover:bg-slate-50 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            disabled={!file || uploading}
            onClick={() => void submit()}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm shadow-indigo-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {uploading ? <RefreshIcon spinning /> : <UploadIcon />}
            {uploading ? "Extracting…" : "Upload"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
