// src/app/(dashboard)/project/[projectId]/_steps/preparation/prototype/ui.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Wand2, FileWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStepStore } from "@/store/step-store";
import { usePipelineStore } from "@/store/pipeline-store";
import { useStepNavigationStore } from "@/store/step-navigation-store";
import PreviewWorkspace from "@/components/preview/PreviewWorkspace";
import type { StepUIProps } from "../../_shared/types";

interface PageRow {
  pageId: string;
  name: string;
  source: string;
  status: "pending" | "running" | "done" | "error";
}

export function PrototypeUI(props: StepUIProps) {
  const codeOutputDir = useStepStore((s) => s.codeOutputDir);
  const prdContent = useStepStore((s) => s.steps.prd?.content ?? "");
  const tier = useStepNavigationStore((s) => s.tier);
  const designReferences = usePipelineStore((s) => s.designReferences);
  const refreshDesignReferences = usePipelineStore((s) => s.refreshDesignReferences);

  const hasDemoUrl = useMemo(
    () => (designReferences ?? []).some((r) => r.source === "url"),
    [designReferences],
  );

  const [running, setRunning] = useState(false);
  const [rows, setRows] = useState<Record<string, PageRow>>({});
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [deferred, setDeferred] = useState(0);

  // Make sure the demo-URL signal is loaded.
  useEffect(() => { void refreshDesignReferences?.(); }, [refreshDesignReferences]);

  async function generate(force = false) {
    setRunning(true); setError(null); setSummary(null); setRows({}); setDone(false);
    try {
      const resp = await fetch("/api/agents/prototype", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prdContent,
          projectId: props.projectSlug,
          codeOutputDir,
          tier,
          force, // true = wipe marker + regenerate all; false = resume (skip already-generated)
        }),
      });
      const reader = resp.body?.getReader();
      if (!reader) throw new Error("No response stream");
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done: rd, value } = await reader.read();
        if (rd) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data:")) continue;
          const ev = JSON.parse(line.slice(5).trim()) as Record<string, unknown>;
          const t = ev.type as string;
          if (t === "prototype_skipped") { setSummary("Skipped — no demo URL on record."); }
          else if (t === "page_start") {
            const id = ev.pageId as string;
            setRows((r) => ({ ...r, [id]: { pageId: id, name: ev.name as string, source: ev.source as string, status: "running" } }));
          } else if (t === "page_complete") {
            const id = ev.pageId as string;
            setRows((r) => ({ ...r, [id]: { ...r[id], status: "done" } }));
          } else if (t === "page_error") {
            const id = ev.pageId as string;
            setRows((r) => ({ ...r, [id]: { ...r[id], status: "error" } }));
          } else if (t === "prototype_complete") {
            setSummary(`Generated ${ev.generated} page(s), ${ev.failed} failed, ${ev.truncated} deferred (total ${ev.totalPages}).`);
            setDeferred(Number(ev.truncated) || 0);
            setDone(true);
          } else if (t === "error") { setError(ev.error as string); }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setRunning(false);
    }
  }

  // Inert "skipped" state — no demo URL on record.
  if (!hasDemoUrl) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
        <FileWarning className="text-[#94a3b8]" size={28} />
        <h2 className="text-lg font-bold text-[#0b1c30]">Prototype skipped</h2>
        <p className="max-w-md text-[13px] text-[#94a3b8]">
          No demo URL is on record for this project. The prototype step only runs when a demo
          was captured in the Design step. Downstream stages proceed normally.
        </p>
        <Button variant="outline" onClick={() => props.onNavigate("qa")}>Continue</Button>
      </div>
    );
  }

  const rowList = Object.values(rows);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="shrink-0 px-8 pt-8 pb-4 border-b border-[#f1f5f9]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#0b1c30]">Prototype</h2>
            <p className="text-[13px] text-[#94a3b8] mt-0.5">
              Generate static frontend code for every PRD page (port captured demo HTML, free-gen the rest) and preview it.
            </p>
          </div>
          <Button onClick={() => generate(done && deferred === 0)} disabled={running} className="gap-2">
            <Wand2 size={14} />{" "}
            {running
              ? "Generating…"
              : deferred > 0
                ? `Generate remaining (${deferred})`
                : done
                  ? "Re-generate"
                  : "Generate prototype"}
          </Button>
        </div>
        {summary && <p className="mt-2 text-[13px] text-emerald-600">{summary}</p>}
        {error && <p className="mt-2 text-[13px] text-red-600">{error}</p>}
      </div>

      {rowList.length > 0 && !done && (
        <div className="max-h-48 overflow-auto px-8 py-3 text-[12px] border-b border-[#f1f5f9]">
          {rowList.map((r) => (
            <div key={r.pageId} className="flex items-center gap-2 py-0.5">
              <span className={
                r.status === "done" ? "text-emerald-600" :
                r.status === "error" ? "text-red-600" :
                r.status === "running" ? "text-indigo-600" : "text-[#94a3b8]"
              }>●</span>
              <span className="text-[#0b1c30]">{r.name}</span>
              <span className="text-[#94a3b8]">({r.source})</span>
              <span className="ml-auto text-[#94a3b8]">{r.status}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {done
          ? <PreviewWorkspace codeOutputDir={codeOutputDir} />
          : (
            <div className="flex h-full items-center justify-center text-[13px] text-[#94a3b8]">
              {running ? "Generating prototype pages…" : "Click “Generate prototype” to build and preview the pages."}
            </div>
          )}
      </div>
    </div>
  );
}
