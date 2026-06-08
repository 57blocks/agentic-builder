"use client";

import React, { useRef, useState, useCallback } from "react";
import { X, RefreshCw, Image } from "lucide-react";
import { extractPrdPageHints } from "@/lib/requirements/prd-page-hints";
import type { DesignReferenceSummary } from "@/store/pipeline-store";

interface RouteReferenceGridProps {
  prdContent: string;
  references: DesignReferenceSummary[];
  isMatching: boolean;
  onUpload: (files: File[]) => void;
  onFetchUrls: (urls: string[]) => void;
  onFetchRouteUrl: (url: string, pageHint: string) => void;
  onRemove: (referenceId: string) => void;
  onDropToRoute: (referenceId: string, pageHint: string) => void;
}

function isImageFile(file: File): boolean {
  return ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"].includes(
    file.type,
  );
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
}

function RouteCard({
  route,
  reference,
  isMatchingThis,
  onRemove,
  onDropToRoute,
  onFetchRouteUrl,
}: RouteCardProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [routeUrl, setRouteUrl] = useState("");
  const imageUrl = reference
    ? `/api/agents/pipeline/design-references/${reference.id}/file`
    : null;

  const borderColor = reference
    ? reference.matchedBy === "manual"
      ? "border-purple-500"
      : "border-green-500"
    : isMatchingThis
    ? "border-amber-500"
    : isDragOver
    ? "border-indigo-400"
    : "border-slate-700 border-dashed";

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

  return (
    <div
      className={`relative flex flex-col rounded-lg border-2 overflow-hidden bg-slate-900 transition-colors ${borderColor}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Thumbnail area */}
      <div className="relative h-28 bg-slate-800 flex items-center justify-center shrink-0">
        {isMatchingThis && !reference ? (
          <div className="flex flex-col items-center gap-2">
            <RefreshCw size={20} className="text-amber-400 animate-spin" />
            <span className="text-[10px] text-amber-400">Matching…</span>
          </div>
        ) : imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={route.name}
            className="w-full h-full object-cover"
            draggable
            onDragStart={(e) => {
              if (reference) e.dataTransfer.setData("referenceId", reference.id);
            }}
          />
        ) : (
          <Image size={24} className="text-slate-600" />
        )}

        {/* Badges */}
        {reference && (
          <>
            <span
              className={`absolute top-1.5 left-1.5 text-[9px] font-medium px-1.5 py-0.5 rounded ${
                reference.source === "url"
                  ? "bg-teal-700 text-teal-100"
                  : "bg-blue-800 text-blue-200"
              }`}
            >
              {reference.source === "url" ? "URL" : "Upload"}
            </span>
            <span
              className={`absolute top-1.5 right-1.5 text-[9px] font-medium px-1.5 py-0.5 rounded border ${
                reference.cssToken
                  ? "bg-teal-900 border-teal-600 text-teal-300"
                  : "bg-slate-800 border-slate-600 text-slate-500"
              }`}
            >
              {reference.cssToken ? "CSS ✓" : "CSS —"}
            </span>
            {reference.matchedBy === "auto" && reference.matchConfidence && (
              <span className="absolute bottom-1.5 right-1.5 text-[9px] bg-black/60 text-green-400 px-1.5 py-0.5 rounded">
                {reference.matchConfidence}
              </span>
            )}
          </>
        )}
      </div>

      {/* Card body */}
      <div className="p-2 flex flex-col gap-1.5">
        <div
          className={`text-[11px] font-semibold truncate ${
            reference
              ? reference.matchedBy === "manual"
                ? "text-purple-400"
                : "text-green-400"
              : isMatchingThis
              ? "text-amber-400"
              : "text-slate-400"
          }`}
        >
          {route.name}
        </div>

        {reference ? (
          <>
            <div className="text-[9px] text-slate-500 truncate">
              {reference.label || reference.fileName}
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => onRemove(reference.id)}
                className="flex-1 text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-400 rounded py-0.5 transition-colors"
              >
                Replace
              </button>
              <button
                onClick={() => onRemove(reference.id)}
                className="text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-400 rounded py-0.5 px-1.5 transition-colors"
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
              className="flex-1 text-[9px] bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-slate-300 placeholder-slate-600 outline-none focus:border-slate-500"
            />
            <button
              type="submit"
              disabled={!routeUrl.trim()}
              className="text-[9px] bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-300 rounded px-1.5 transition-colors"
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
  onUpload,
  onFetchUrls,
  onFetchRouteUrl,
  onRemove,
  onDropToRoute,
}: RouteReferenceGridProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = useState("");
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const routes: RouteInfo[] = extractPrdPageHints(prdContent).map((p) => ({
    id: p.id,
    name: p.name,
  }));

  const matchedCount = routes.filter((r) =>
    references.some((ref) => ref.pageHint === r.id),
  ).length;

  const cssTokenCount = references.filter(
    (r) => r.cssToken && routes.some((route) => route.id === r.pageHint),
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
    <div className="flex flex-col gap-4">
      {/* Top input zone */}
      <div className="flex gap-3">
        {/* Image drop zone */}
        <div
          className={`flex-1 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-1.5 p-4 cursor-pointer transition-colors min-h-[80px] ${
            isDraggingOver
              ? "border-indigo-400 bg-indigo-950/30"
              : "border-slate-700 hover:border-slate-500"
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingOver(true);
          }}
          onDragLeave={() => setIsDraggingOver(false)}
          onDrop={handleFileDrop}
        >
          <Image size={20} className="text-slate-500" />
          <span className="text-[11px] text-slate-400">Drop images here or click to upload</span>
          <span className="text-[9px] text-slate-600">PNG · JPG · WebP · GIF · ≤6 MB</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={handleFileInput}
          />
        </div>

        {/* URL input */}
        <div className="flex-1 flex flex-col gap-1.5">
          <textarea
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder={
              "Paste URLs, one per line\nhttps://app.example.com/dashboard\nhttps://app.example.com/login"
            }
            rows={3}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg text-[11px] text-slate-300 placeholder-slate-600 p-2 resize-none font-mono outline-none focus:border-slate-500"
          />
          <button
            onClick={handleFetchUrls}
            disabled={!urlInput.trim()}
            className="self-end text-[10px] bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded px-3 py-1 transition-colors"
          >
            Fetch Screenshots →
          </button>
        </div>
      </div>

      {/* Route card grid */}
      {routes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wide text-slate-500">
              Route Mapping{" "}
              <span className="text-slate-600 normal-case tracking-normal">
                · {matchedCount} / {routes.length} matched
                {cssTokenCount > 0 && ` · ${cssTokenCount} with CSS token`}
              </span>
            </span>
            <span className="text-[9px] text-slate-600">Drag an image onto a card to override</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {routes.map((route) => {
              const reference = references.find((r) => r.pageHint === route.id);
              return (
                <RouteCard
                  key={route.id}
                  route={route}
                  reference={reference}
                  isMatchingThis={isMatching && !reference}
                  onRemove={onRemove}
                  onDropToRoute={onDropToRoute}
                  onFetchRouteUrl={onFetchRouteUrl}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
