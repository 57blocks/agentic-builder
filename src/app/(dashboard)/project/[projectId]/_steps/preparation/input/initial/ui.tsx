"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Paperclip, ArrowRight, Info, ImagePlus } from "lucide-react";
import { useStepStore } from "@/store/step-store";
import { usePipelineStore } from "@/store/pipeline-store";
import ImportPrdDialog from "@/components/ImportPrdDialog";
import type { StepUIProps } from "../../../_shared/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function InitialUI(props: StepUIProps) {
  const [prompt, setPrompt] = useState("");
  const [prdDialogOpen, setPrdDialogOpen] = useState(false);

  const setFeatureBrief = useStepStore((s) => s.setFeatureBrief);
  const isRunning       = useStepStore((s) => s.isRunning);

  // Reference screenshots → stored via the shared design-references store, so the
  // PRD intent pass summarizes functional requirements from them (and the Design
  // stage later reuses the same uploads for the visual system — single upload).
  const uploadDesignReferences = usePipelineStore((s) => s.uploadDesignReferences);
  const clearDesignReferences = usePipelineStore((s) => s.clearDesignReferences);
  const setProjectSlugForSync = usePipelineStore((s) => s.setProjectSlugForSync);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [refCount, setRefCount] = useState(0);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imageMsg, setImageMsg] = useState<string | null>(null);

  // Ensure uploads scope to THIS project (the store keys design-references by the
  // current slug; without this, an intake-page upload would fall back to the
  // shared global dir). Then show how many references already exist for it —
  // these feed the PRD vision pass automatically, shared with the Design stage.
  useEffect(() => {
    if (props.projectSlug) setProjectSlugForSync(props.projectSlug);
    const q = props.projectSlug
      ? `?projectId=${encodeURIComponent(props.projectSlug)}`
      : "";
    fetch(`/api/agents/pipeline/design-references${q}`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d?.references)) setRefCount(d.references.length);
      })
      .catch(() => {});
  }, [props.projectSlug, setProjectSlugForSync]);

  async function handleImagesSelected(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = ""; // allow re-selecting the same file
    if (files.length === 0) return;
    setUploadingImages(true);
    setImageMsg(null);
    try {
      const res = await uploadDesignReferences(files);
      if (res && res.added.length > 0) {
        setRefCount((c) => c + res.added.length);
        if (res.skipped.length > 0) {
          setImageMsg(`Skipped ${res.skipped.length}: ${res.skipped[0]?.reason ?? ""}`);
        }
      } else {
        // Surface why nothing was added (e.g. the 24-reference limit) instead of
        // failing silently — the store also records designReferencesError.
        const reason =
          res?.skipped?.[0]?.reason ??
          usePipelineStore.getState().designReferencesError ??
          "Upload failed.";
        setImageMsg(reason);
      }
    } finally {
      setUploadingImages(false);
    }
  }

  async function handleClearImages() {
    if (refCount === 0) return;
    if (!window.confirm(`Remove all ${refCount} reference image(s)? They are shared with the Design stage.`)) return;
    const ok = await clearDesignReferences();
    if (ok) { setRefCount(0); setImageMsg(null); }
  }

  function handleInitialize() { if (!prompt.trim() || isRunning) return; setFeatureBrief(prompt.trim()); props.onNavigate("intent"); }

  function handlePrdImported(content: string) {
    setPrompt(content);
  }

  return (
    <>
      <div className="flex flex-col justify-center items-center flex-1 h-full px-8 pt-8 pb-12 gap-10 overflow-auto">
        <div className="flex flex-col items-center w-full max-w-230 gap-8">
          <div className="flex flex-col items-center gap-3 text-center">
            <h1 className="text-4xl font-bold tracking-tight text-[#0b1c30] leading-tight">Ready to build</h1>
            <p className="text-[15px] text-[#7c839b] max-w-120 leading-7">Describe the objective of your autonomous agent. The pipeline will handle orchestration, coding, and deployment automatically.</p>
          </div>
          <Card className="w-full shadow-[0_10px_40px_-8px_rgba(0,0,0,0.08)] overflow-hidden">
            <CardContent className="p-0">
              <div className="px-6 pt-6 pb-3">
                <Textarea placeholder={"Describe what your agent should do…\ne.g. 'Build a market research agent that scrapes top tech news and summarizes them into a Slack report every morning.'"} value={prompt} onChange={(e) => setPrompt(e.target.value)} disabled={isRunning} className="border-0 focus-visible:ring-0 text-[15px] text-[#0b1c30] placeholder:text-[#94a3b8] leading-6 h-40 max-h-40 overflow-y-auto resize-none px-0 py-0 shadow-none" />
              </div>
              <Separator />
              <div className="flex items-center justify-between bg-[#fafbfc] px-4 py-3">
                <div className="text-xs min-w-0 pr-2 truncate">
                  {imageMsg ? (
                    <span className="text-[#e5484d]">{imageMsg}</span>
                  ) : refCount > 0 ? (
                    <span className="text-[#64748b]">{refCount} reference image{refCount > 1 ? "s" : ""} will inform the PRD</span>
                  ) : null}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setPrdDialogOpen(true)} className="text-xs text-[#64748b] h-7 px-2.5"><Paperclip className="size-3" /> PRD</Button>
                    <input ref={imageInputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={handleImagesSelected} />
                    <Button variant="ghost" size="sm" disabled={uploadingImages || isRunning} onClick={() => imageInputRef.current?.click()} className="text-xs text-[#64748b] h-7 px-2.5" title="Attach reference screenshots — the PRD step will summarize requirements from them"><ImagePlus className="size-3" /> {uploadingImages ? "Uploading…" : refCount > 0 ? `${refCount} image${refCount > 1 ? "s" : ""}` : "Images"}</Button>
                    {refCount > 0 && (
                      <Button variant="ghost" size="sm" disabled={uploadingImages || isRunning} onClick={handleClearImages} className="text-xs text-[#94a3b8] h-7 px-2" title="Remove all reference images (shared with the Design stage)">Clear</Button>
                    )}
                  </div>
                  <Button disabled={!prompt.trim() || isRunning} onClick={handleInitialize} size="sm" className="text-[13px] font-bold px-5 h-9">{isRunning ? "Starting…" : "Start Generation"}<ArrowRight className="size-3" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="max-w-180 w-full shadow-sm bg-white/70">
            <CardContent className="flex items-center gap-3 px-5 py-3">
              <Info className="size-4 text-indigo-600 shrink-0" />
              <p className="text-sm text-[#7c839b] leading-5">Upload existing project docs to accelerate the <strong className="font-semibold text-[#475569]">Preparation</strong> phase.</p>
            </CardContent>
          </Card>
        </div>
      </div>
      <ImportPrdDialog isOpen={prdDialogOpen} onClose={() => setPrdDialogOpen(false)} onPrdImported={handlePrdImported} />
    </>
  );
}
