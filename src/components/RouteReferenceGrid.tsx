"use client";

import React, { useRef, useState, useCallback } from "react";
import { X, RefreshCw, Image } from "lucide-react";
import { extractPrdPageHints } from "@/lib/requirements/prd-page-hints";
import { pageHintOwnsRoute } from "@/lib/design/page-hint-match";
import type { DesignReferenceSummary } from "@/store/pipeline-store";

interface RouteReferenceGridProps {
  prdContent: string;
  references: DesignReferenceSummary[];
  isMatching: boolean;
  /** Project slug — required so reference file URLs resolve to the per-project store. */
  projectSlug?: string;
  onUpload: (files: File[]) => void;
  onFetchUrls: (urls: string[]) => void;
  onFetchRouteUrl: (url: string, pageHint: string) => void;
  onRemove: (referenceId: string) => void;
  onDropToRoute: (referenceId: string, pageHint: string) => void;
  onUploadToRoute: (file: File, pageHint: string) => void;
  /** When provided, shows the "auto-capture from one entry URL" panel. */
  onAutoCaptureFromEntry?: (entryUrl: string) => void;
}

function isImageFile(file: File): boolean {
  return [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/gif",
  ].includes(file.type);
}

/**
 * Whether a reference's `pageHint` belongs to a given route. Auto-match writes
 * enriched hints like `"PAGE-002 monitor dashboard"` (leading token is the
 * canonical route id), while manual binds store the bare id — match both.
 */
function pageHintMatchesRoute(pageHint: string, routeId: string): boolean {
  if (!pageHint) return false;
  return pageHint === routeId || pageHint.split(/\s+/)[0] === routeId;
}

interface RouteInfo {
  id: string;
  name: string;
}

interface RouteCardProps {
  route: RouteInfo;
  reference: DesignReferenceSummary | undefined;
  isMatchingThis: boolean;
  onRemove: (id: string) => void;
  onDropToRoute: (referenceId: string, pageHint: string) => void;
  onFetchRouteUrl: (url: string, pageHint: string) => void;
  onUploadToRoute: (file: File, pageHint: string) => void;
  projectSlug?: string;
}

function RouteCard({
  route,
  reference,
  isMatchingThis,
  onRemove,
  onDropToRoute,
  onFetchRouteUrl,
  onUploadToRoute,
  projectSlug,
}: RouteCardProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [routeUrl, setRouteUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Reference files live under the per-project store, so the file URL must
  // carry `projectId` — otherwise the route falls back to the global store
  // and 404s. `uploadedAt` is appended as a cache-buster so a Replace shows
  // the new image instead of the stale cached one.
  const imageUrl = reference
    ? `/api/agents/pipeline/design-references/${reference.id}/file` +
      `?v=${encodeURIComponent(reference.uploadedAt)}` +
      (projectSlug ? `&projectId=${encodeURIComponent(projectSlug)}` : "")
    : null;

  // Border + background per state
  const cardClass = reference
    ? reference.matchedBy === "manual"
      ? "border-violet-400 bg-violet-50"
      : "border-emerald-400 bg-emerald-50"
    : isMatchingThis
      ? "border-amber-400 bg-amber-50"
      : isDragOver
        ? "border-indigo-400 bg-indigo-50"
        : "border-slate-200 border-dashed bg-white";

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const refId = e.dataTransfer.getData("referenceId");
    if (refId) onDropToRoute(refId, route.id);
  };

  const handleRouteUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = routeUrl.trim();
    if (!trimmed) return;
    onFetchRouteUrl(trimmed, route.id);
    setRouteUrl("");
  };

  const handleUploadClick = () => fileInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && isImageFile(file)) onUploadToRoute(file, route.id);
    e.target.value = "";
  };

  return (
    <div
      className={`relative flex flex-col rounded-xl border-2 overflow-hidden transition-colors ${cardClass}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Thumbnail area — click to upload/replace a screenshot for this route */}
      <div
        className="group relative h-28 bg-slate-100 flex items-center justify-center shrink-0 cursor-pointer"
        onClick={handleUploadClick}
        title={
          reference
            ? "Click to replace screenshot"
            : "Click to upload screenshot"
        }
      >
        {isMatchingThis && !reference ? (
          <div className="flex flex-col items-center gap-2">
            <RefreshCw size={18} className="text-amber-500 animate-spin" />
            <span className="text-[10px] text-amber-600">Matching…</span>
          </div>
        ) : imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={route.name}
            className="w-full h-full object-cover"
            draggable
            onDragStart={(e) => {
              if (reference)
                e.dataTransfer.setData("referenceId", reference.id);
            }}
          />
        ) : (
          <div className="flex flex-col items-center gap-1">
            <Image
              size={22}
              className="text-slate-300 group-hover:text-indigo-400 transition-colors"
            />
            <span className="text-[9px] text-slate-400 group-hover:text-indigo-500 transition-colors">
              Click to upload
            </span>
          </div>
        )}

        {/* Hover overlay on an already-matched image */}
        {imageUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 opacity-0 group-hover:opacity-100 transition-all pointer-events-none">
            <span className="text-[10px] font-medium text-white">
              Click to replace
            </span>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Badges — only shown on matched cards */}
        {reference && (
          <>
            <span
              className={`absolute top-1.5 left-1.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-md ${
                reference.source === "url"
                  ? "bg-teal-100 text-teal-700"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              {reference.source === "url" ? "URL" : "Upload"}
            </span>
            <span
              className={`absolute top-1.5 right-1.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-md border ${
                reference.cssToken
                  ? "bg-teal-50 border-teal-200 text-teal-700"
                  : "bg-slate-100 border-slate-200 text-slate-400"
              }`}
            >
              {reference.cssToken ? "CSS ✓" : "CSS —"}
            </span>
            {reference.matchedBy === "auto" && reference.matchConfidence && (
              <span className="absolute bottom-1.5 right-1.5 text-[9px] bg-white/80 text-emerald-600 font-medium px-1.5 py-0.5 rounded-md shadow-sm">
                {reference.matchConfidence}
              </span>
            )}
          </>
        )}
      </div>

      {/* Card body */}
      <div className="p-2.5 flex flex-col gap-1.5">
        <div
          className={`text-[11px] font-semibold truncate ${
            reference
              ? reference.matchedBy === "manual"
                ? "text-violet-700"
                : "text-emerald-700"
              : isMatchingThis
                ? "text-amber-600"
                : "text-slate-500"
          }`}
        >
          {route.name}
        </div>

        {reference ? (
          <>
            <div className="text-[9px] text-slate-400 truncate">
              {reference.label || reference.fileName}
            </div>
            <div className="flex gap-1">
              <button
                onClick={handleUploadClick}
                className="flex-1 text-[9px] bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 rounded-md py-0.5 transition-colors"
              >
                Replace
              </button>
              <button
                onClick={() => onRemove(reference.id)}
                className="text-[9px] bg-white hover:bg-slate-50 border border-slate-200 text-slate-400 rounded-md py-0.5 px-1.5 transition-colors"
                title="Remove"
              >
                <X size={10} />
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleRouteUrlSubmit} className="flex gap-1">
            <input
              type="url"
              value={routeUrl}
              onChange={(e) => setRouteUrl(e.target.value)}
              placeholder="Enter URL to fetch screenshot…"
              className="flex-1 text-[9px] bg-white border border-slate-200 rounded-md px-1.5 py-1 text-slate-600 placeholder-slate-400 outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200"
            />
            <button
              type="submit"
              disabled={!routeUrl.trim()}
              className="text-[9px] bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-600 rounded-md px-1.5 transition-colors"
            >
              ↵
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export function RouteReferenceGrid({
  prdContent,
  references,
  isMatching,
  projectSlug,
  onUpload,
  onFetchUrls,
  onFetchRouteUrl,
  onRemove,
  onDropToRoute,
  onUploadToRoute,
  onAutoCaptureFromEntry,
}: RouteReferenceGridProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = useState("");
  const [entryUrl, setEntryUrl] = useState("");
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleAutoCapture = () => {
    const trimmed = entryUrl.trim();
    if (!trimmed || !onAutoCaptureFromEntry) return;
    onAutoCaptureFromEntry(trimmed);
  };

  const routes: RouteInfo[] = extractPrdPageHints(prdContent).map((p) => ({
    id: p.id,
    name: p.name,
  }));

  const matchedCount = routes.filter((r) =>
    references.some((ref) => pageHintMatchesRoute(ref.pageHint, r.id)),
  ).length;

  const cssTokenCount = references.filter(
    (r) =>
      r.cssToken &&
      routes.some((route) => pageHintMatchesRoute(r.pageHint, route.id)),
  ).length;

  const handleFileDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingOver(false);
      const files = Array.from(e.dataTransfer.files).filter(isImageFile);
      if (files.length > 0) onUpload(files);
    },
    [onUpload],
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter(isImageFile);
    if (files.length > 0) onUpload(files);
    e.target.value = "";
  };

  const handleFetchUrls = () => {
    const urls = urlInput
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean);
    if (urls.length === 0) return;
    onFetchUrls(urls);
    setUrlInput("");
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Auto-capture from one entry URL — captures every PRD page automatically */}
      {onAutoCaptureFromEntry && (
        <div className="flex flex-col gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/50 p-3">
          <div className="flex items-center gap-2">
            <input
              type="url"
              value={entryUrl}
              onChange={(e) => setEntryUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAutoCapture();
              }}
              placeholder="Entry URL — e.g. https://your-app.com"
              disabled={isMatching}
              className="flex-1 text-[12px] bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 placeholder-slate-400 outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200 disabled:opacity-50"
            />
            <button
              onClick={handleAutoCapture}
              disabled={!entryUrl.trim() || isMatching}
              className="shrink-0 text-[12px] font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg px-3.5 py-2 transition-colors inline-flex items-center gap-1.5"
            >
              {isMatching && <RefreshCw size={13} className="animate-spin" />}
              Auto-capture all pages
            </button>
          </div>
          <span className="text-[10px] text-slate-500">
            Captures every PRD page (entry origin + each route) and binds each
            screenshot to its card. Pages behind login prompt a one-time
            sign-in.
          </span>
        </div>
      )}

      {/* Top input zone */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-3">
          {/* Image drop zone */}
          <div
            className={`flex-1 h-[96px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-1.5 p-4 cursor-pointer transition-colors ${
              isDraggingOver
                ? "border-indigo-400 bg-indigo-50"
                : "border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-white"
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingOver(true);
            }}
            onDragLeave={() => setIsDraggingOver(false)}
            onDrop={handleFileDrop}
          >
            <Image
              size={20}
              className={isDraggingOver ? "text-indigo-400" : "text-slate-400"}
            />
            <span className="text-[11px] text-slate-500 font-medium">
              Drop images here or click to upload
            </span>
            <span className="text-[10px] text-slate-400">
              PNG · JPG · WebP · GIF · ≤6 MB
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              multiple
              className="hidden"
              onChange={handleFileInput}
            />
          </div>

          {/* URL textarea */}
          <textarea
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder={
              "Paste URLs, one per line\nhttps://app.example.com/dashboard\nhttps://app.example.com/login"
            }
            className="flex-1 h-[96px] bg-white border border-slate-200 rounded-xl text-[11px] text-slate-700 placeholder-slate-400 p-2.5 resize-none font-mono outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-100 leading-relaxed"
          />
        </div>

        {/* Fetch button — right-aligned below the textarea */}
        <div className="flex justify-end">
          <button
            onClick={handleFetchUrls}
            disabled={!urlInput.trim()}
            className="text-[11px] font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg px-3 py-1.5 transition-colors"
          >
            Fetch Screenshots →
          </button>
        </div>
      </div>

      {/* Route card grid */}
      {routes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Route Mapping{" "}
              <span className="text-slate-400 normal-case tracking-normal font-normal">
                · {matchedCount} / {routes.length} matched
                {cssTokenCount > 0 && ` · ${cssTokenCount} with CSS token`}
              </span>
            </span>
            <span className="text-[10px] text-slate-400">
              Click a card to upload · or drag an image onto it
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {routes.map((route) => {
              const reference = references.find((r) =>
                pageHintMatchesRoute(r.pageHint, route.id),
              );
              return (
                <RouteCard
                  key={route.id}
                  route={route}
                  reference={reference}
                  isMatchingThis={isMatching && !reference}
                  onRemove={onRemove}
                  onDropToRoute={onDropToRoute}
                  onFetchRouteUrl={onFetchRouteUrl}
                  onUploadToRoute={onUploadToRoute}
                  projectSlug={projectSlug}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
