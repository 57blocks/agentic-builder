"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePipelineStore } from "@/store/pipeline-store";
import { extractPrdPageHints } from "@/lib/requirements/prd-page-hints";
import type { PrdPageHint } from "@/lib/requirements/prd-page-hints";
import type { DesignReferenceSummary } from "@/store/pipeline-store";

const ACCEPTED_MIMES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
const ACCEPTED_EXTS = [".png", ".jpg", ".jpeg", ".webp", ".gif"];
const MAX_BYTES = 6 * 1024 * 1024;

interface PageScreenshotsPanelProps {
  prdContent: string;
}

function isImageFile(file: File): boolean {
  const mime = file.type.toLowerCase();
  if (ACCEPTED_MIMES.includes(mime)) return true;
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTS.some((ext) => name.endsWith(ext));
}

// ─── PageCard ─────────────────────────────────────────────────────────────────

function PageCard({
  page,
  reference,
  onUpload,
  onDelete,
  uploading,
}: {
  page: PrdPageHint;
  reference: DesignReferenceSummary | null;
  onUpload: (page: PrdPageHint, file: File) => void;
  onDelete: (id: string) => void;
  uploading: boolean;
}) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) onUpload(page, file);
  };

  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-slate-200 bg-white p-2.5 min-w-0">
      {/* Page name */}
      <div className="flex items-center justify-between gap-1 min-w-0">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-slate-700 truncate leading-tight">{page.name}</p>
          <p className="text-[9.5px] text-slate-400 font-mono">{page.id}</p>
        </div>
        {reference && (
          <button
            type="button"
            onClick={() => onDelete(reference.id)}
            disabled={uploading}
            className="shrink-0 p-0.5 rounded text-slate-300 hover:text-red-500 transition-colors disabled:opacity-40"
            title="Remove screenshot"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Thumbnail / upload slot */}
      {reference ? (
        <div className="relative w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100" style={{ paddingBottom: "60%" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/agents/pipeline/design-references/${reference.id}/file`}
            alt={reference.label || reference.fileName}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <label className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/30 transition-colors cursor-pointer group">
            <span className="text-[10px] font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded px-1.5 py-0.5">Replace</span>
            <input
              type="file"
              accept={[...ACCEPTED_MIMES, ...ACCEPTED_EXTS].join(",")}
              onChange={handleFileChange}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>
      ) : (
        <label
          className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed transition-colors cursor-pointer ${
            uploading
              ? "border-slate-200 bg-slate-50 cursor-not-allowed"
              : "border-slate-300 bg-slate-50 hover:border-[#712ae2] hover:bg-[rgba(113,42,226,0.03)]"
          }`}
          style={{ paddingBottom: "60%", position: "relative" }}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
            {uploading ? (
              <svg className="animate-spin text-slate-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-400">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            )}
            <span className="text-[9.5px] text-slate-400">{uploading ? "Uploading…" : "Add screenshot"}</span>
          </div>
          <input
            type="file"
            accept={[...ACCEPTED_MIMES, ...ACCEPTED_EXTS].join(",")}
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
          />
        </label>
      )}
    </div>
  );
}

// ─── Main panel ──────────────────────────────────────────────────────────────

export default function PageScreenshotsPanel({ prdContent }: PageScreenshotsPanelProps) {
  const references = usePipelineStore((s) => s.designReferences);
  const loading = usePipelineStore((s) => s.designReferencesLoading);
  const refreshReferences = usePipelineStore((s) => s.refreshDesignReferences);
  const uploadReferences = usePipelineStore((s) => s.uploadDesignReferences);
  const deleteReference = usePipelineStore((s) => s.deleteDesignReference);
  const autoMatch = usePipelineStore((s) => s.autoMatchDesignReferences);

  const [uploadingPage, setUploadingPage] = useState<string | null>(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [autoMatching, setAutoMatching] = useState(false);
  const [autoMatchResult, setAutoMatchResult] = useState<{ matched: number; skipped: number } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bulkInputRef = useRef<HTMLInputElement>(null);

  const pages = useMemo(() => extractPrdPageHints(prdContent), [prdContent]);

  useEffect(() => {
    void refreshReferences();
  }, [refreshReferences]);

  const refByHint = useMemo(() => {
    const map = new Map<string, DesignReferenceSummary>();
    for (const ref of references) {
      if (ref.pageHint) {
        map.set(ref.pageHint.toLowerCase(), ref);
      }
    }
    return map;
  }, [references]);

  const getRefForPage = useCallback(
    (page: PrdPageHint): DesignReferenceSummary | null =>
      refByHint.get(page.id.toLowerCase()) ??
      refByHint.get(page.name.toLowerCase()) ??
      null,
    [refByHint],
  );

  const handleUploadForPage = useCallback(
    async (page: PrdPageHint, file: File) => {
      setError(null);
      if (!isImageFile(file)) {
        setError(`Unsupported file type: ${file.type || "unknown"}`);
        return;
      }
      if (file.size > MAX_BYTES) {
        setError("File too large (max 6 MB)");
        return;
      }
      const existing = getRefForPage(page);
      if (existing) {
        await deleteReference(existing.id);
      }
      setUploadingPage(page.id);
      try {
        await uploadReferences([file], [page.name], [page.id]);
      } finally {
        setUploadingPage(null);
      }
    },
    [getRefForPage, deleteReference, uploadReferences],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      setError(null);
      setAutoMatchResult(null);
      await deleteReference(id);
    },
    [deleteReference],
  );

  /** Upload multiple files without page assignment, then auto-match */
  const handleBulkUpload = useCallback(
    async (files: File[]) => {
      const valid = files.filter(isImageFile);
      if (valid.length === 0) return;
      const oversized = valid.filter((f) => f.size > MAX_BYTES);
      if (oversized.length > 0) {
        setError(`Some files are too large (max 6 MB): ${oversized.map((f) => f.name).join(", ")}`);
        return;
      }
      setError(null);
      setAutoMatchResult(null);
      setBulkUploading(true);
      try {
        // Upload without pageHint — will be auto-matched next
        await uploadReferences(
          valid,
          valid.map((f) => f.name.replace(/\.[^.]+$/, "")), // use filename as label
          valid.map(() => ""),
        );
      } finally {
        setBulkUploading(false);
      }

      // Auto-match the newly uploaded (unmatched) references
      setAutoMatching(true);
      try {
        const result = await autoMatch(prdContent);
        if (result) setAutoMatchResult(result);
      } finally {
        setAutoMatching(false);
      }
    },
    [uploadReferences, autoMatch, prdContent],
  );

  /** Re-run auto-match on all unmatched image references */
  const handleAutoMatch = useCallback(async () => {
    setError(null);
    setAutoMatchResult(null);
    setAutoMatching(true);
    try {
      const result = await autoMatch(prdContent);
      if (result) {
        setAutoMatchResult(result);
      } else {
        setError("Auto-match failed. Check that OPENROUTER_API_KEY is set.");
      }
    } finally {
      setAutoMatching(false);
    }
  }, [autoMatch, prdContent]);

  if (pages.length === 0) return null;

  const uploadedCount = pages.filter((p) => getRefForPage(p) !== null).length;
  const isBusy = loading === "uploading" || loading === "updating" || bulkUploading || autoMatching;

  // Count references without a matching page (unmatched)
  const unmatchedRefs = references.filter(
    (r) => r.kind === "image" && !r.pageHint.trim(),
  );

  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="flex items-center justify-between gap-2 group"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 group-hover:text-slate-700 transition-colors shrink-0">
            Page Screenshots
          </span>
          {uploadedCount > 0 && (
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-[rgba(113,42,226,0.1)] text-[#712ae2] shrink-0">
              {uploadedCount}/{pages.length}
            </span>
          )}
          <span className="text-[10px] text-slate-400 truncate">
            — upload per-page screenshots to guide code generation
          </span>
        </div>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`shrink-0 text-slate-400 transition-transform ${collapsed ? "" : "rotate-180"}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {!collapsed && (
        <>
          {/* ── Bulk upload / auto-match zone ── */}
          <div
            onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              const files = Array.from(e.dataTransfer.files ?? []);
              if (files.length > 0) void handleBulkUpload(files);
            }}
            className={`flex items-center justify-between gap-3 rounded-lg border border-dashed px-3 py-2.5 transition-colors ${
              dragActive
                ? "border-[#712ae2] bg-[rgba(113,42,226,0.04)]"
                : "border-slate-200 bg-slate-50/60"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={`shrink-0 ${dragActive ? "text-[#712ae2]" : "text-slate-400"}`}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span className="text-[11px] text-slate-500 truncate">
                Drop all screenshots here — AI will auto-match them to pages
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <label className={`cursor-pointer rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-100 ${isBusy ? "opacity-50 pointer-events-none" : ""}`}>
                Browse
                <input
                  ref={bulkInputRef}
                  type="file"
                  accept={[...ACCEPTED_MIMES, ...ACCEPTED_EXTS].join(",")}
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    e.target.value = "";
                    if (files.length > 0) void handleBulkUpload(files);
                  }}
                  className="hidden"
                />
              </label>
              {unmatchedRefs.length > 0 && (
                <button
                  type="button"
                  onClick={() => void handleAutoMatch()}
                  disabled={isBusy}
                  className="flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-700 transition-colors hover:bg-indigo-100 disabled:opacity-50"
                  title={`Auto-match ${unmatchedRefs.length} unmatched image(s) to pages`}
                >
                  {autoMatching ? (
                    <svg className="animate-spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                  ) : (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  )}
                  {autoMatching ? "Matching…" : `Auto-match (${unmatchedRefs.length})`}
                </button>
              )}
            </div>
          </div>

          {/* Status messages */}
          {(bulkUploading || autoMatching) && (
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <svg className="animate-spin shrink-0" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
              {bulkUploading ? "Uploading…" : "Analyzing screenshots with AI…"}
            </div>
          )}

          {autoMatchResult && !autoMatching && (
            <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] text-emerald-800">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-emerald-600">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>
                Matched <strong>{autoMatchResult.matched}</strong> screenshot{autoMatchResult.matched !== 1 ? "s" : ""} to pages
                {autoMatchResult.skipped > 0 && ` · ${autoMatchResult.skipped} could not be matched`}
              </span>
            </div>
          )}

          {error && (
            <p className="text-[11px] text-red-600">{error}</p>
          )}

          {/* ── Per-page grid ── */}
          {loading === "loading" && references.length === 0 ? (
            <div className="text-[11px] text-slate-400">Loading…</div>
          ) : (
            <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}>
              {pages.map((page) => (
                <PageCard
                  key={page.id}
                  page={page}
                  reference={getRefForPage(page)}
                  onUpload={handleUploadForPage}
                  onDelete={handleDelete}
                  uploading={uploadingPage === page.id}
                />
              ))}
            </div>
          )}

          {uploadedCount > 0 && !autoMatching && (
            <p className="text-[10px] text-slate-400">
              {uploadedCount} of {pages.length} pages have screenshots — these will guide code generation.
            </p>
          )}
        </>
      )}
    </div>
  );
}
