"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FolderOpenIcon, CheckCircle2Icon, XIcon } from "lucide-react";
import type { ScanResult } from "@/app/api/projects/import/route";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface ImportProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (dirPath: string, name: string, clientId: string) => Promise<void>;
}

type Phase = "pick" | "scanning" | "confirm" | "importing";

const STEP_LABELS: Record<string, string> = {
  intent: "Intent",
  prd: "PRD",
  trd: "TRD",
  sysdesign: "System Design",
  implguide: "Impl Guide",
  design: "Design",
  pencil: "Pencil",
  mockup: "Mockup",
  qa: "QA",
  verify: "Verify",
  kickoff: "Kickoff",
};

export default function ImportProjectDialog({
  isOpen,
  onClose,
  onImport,
}: ImportProjectDialogProps) {
  const [phase, setPhase] = useState<Phase>("pick");
  const [isPicking, setIsPicking] = useState(false);
  const [dirPath, setDirPath] = useState("");
  const [projectName, setProjectName] = useState("");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setPhase("pick");
    setIsPicking(false);
    setDirPath("");
    setProjectName("");
    setScanResult(null);
    setError(null);
  }, [isOpen]);

  useEffect(() => {
    if (phase === "confirm") {
      setTimeout(() => nameInputRef.current?.focus(), 50);
    }
  }, [phase]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isBusy && !isPicking) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isPicking]);

  const scanDirectory = useCallback(async (dir: string) => {
    setPhase("scanning");
    setError(null);
    try {
      const res = await fetch("/api/projects/import?action=scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dirPath: dir }),
      });
      const data = (await res.json()) as ScanResult & { message?: string };
      if (!res.ok) {
        setError(data.message ?? "Failed to scan directory.");
        setPhase("pick");
        return;
      }
      setScanResult(data);
      setProjectName(data.detectedName);
      setPhase("confirm");
    } catch {
      setError("Failed to reach the server.");
      setPhase("pick");
    }
  }, []);

  const handlePickFolder = useCallback(async () => {
    setIsPicking(true);
    let folder: string | null = null;
    try {
      if (window.electronAPI?.selectFolder) {
        folder = await window.electronAPI.selectFolder();
      } else {
        folder = prompt("Enter the absolute path of the existing project directory:");
      }
    } finally {
      setIsPicking(false);
    }
    if (!folder?.trim()) return;
    const trimmed = folder.trim();
    setDirPath(trimmed);
    await scanDirectory(trimmed);
  }, [scanDirectory]);

  const handleImport = useCallback(async () => {
    const trimmedName = projectName.trim();
    if (!trimmedName) {
      setError("Project name is required.");
      return;
    }
    setPhase("importing");
    setError(null);
    try {
      await onImport(dirPath, trimmedName, crypto.randomUUID());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
      setPhase("confirm");
    }
  }, [dirPath, projectName, onImport, onClose]);

  const isBusy = phase === "scanning" || phase === "importing";
  const showDetails = phase === "confirm" || phase === "importing";

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={() => { if (!isBusy && !isPicking) onClose(); }}
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-popover shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Import Project</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Connect an existing code directory to Agentic Builder.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            aria-label="Close"
            className="ml-4 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4 px-5 py-4">
          {/* Directory picker */}
          <div className="flex flex-col gap-1.5">
            <Label>Project Directory</Label>
            <div className="flex gap-2">
              <div className="flex flex-1 min-w-0 items-center gap-2 rounded-lg border border-input bg-muted/30 px-3 py-1.5">
                <FolderOpenIcon className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate font-mono text-xs text-foreground">
                  {dirPath || (
                    <span className="font-sans text-muted-foreground">No folder selected</span>
                  )}
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handlePickFolder()}
                disabled={isBusy}
              >
                {phase === "scanning" ? "Scanning…" : "Choose"}
              </Button>
            </div>
          </div>

          {/* Blueprint state banner */}
          {showDetails && scanResult?.hasBlueprintState && (
            <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3 dark:border-emerald-800 dark:bg-emerald-950/30">
              <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                  Pipeline state detected
                </span>
                <div className="flex flex-wrap items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
                  <Badge variant="secondary">
                    {scanResult.completedStepCount} step{scanResult.completedStepCount !== 1 ? "s" : ""} completed
                  </Badge>
                  {scanResult.lastCompletedStep && (
                    <span>
                      last: <span className="font-medium">{STEP_LABELS[scanResult.lastCompletedStep] ?? scanResult.lastCompletedStep}</span>
                    </span>
                  )}
                  {scanResult.savedAt && (
                    <span>saved {new Date(scanResult.savedAt).toLocaleDateString()}</span>
                  )}
                </div>
                {scanResult.featureBrief && (
                  <p className="line-clamp-2 text-xs text-emerald-600 dark:text-emerald-500">
                    &ldquo;{scanResult.featureBrief}&rdquo;
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Project name input */}
          {showDetails && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="import-project-name">Project Name</Label>
              <Input
                id="import-project-name"
                ref={nameInputRef}
                value={projectName}
                onChange={(e) => {
                  setProjectName(e.target.value);
                  if (error) setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isBusy) void handleImport();
                }}
                disabled={phase === "importing"}
                placeholder="My Project"
              />
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-border bg-muted/30 px-5 py-3">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isBusy}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => void handleImport()}
            disabled={isBusy || phase !== "confirm" || !projectName.trim()}
          >
            {phase === "importing" ? "Importing…" : "Import Project"}
          </Button>
        </div>
      </div>
    </div>
  );
}
