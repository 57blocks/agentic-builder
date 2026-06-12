"use client";

import { useRef, useState, type ChangeEvent } from "react";
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
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [imageCount, setImageCount] = useState(0);
  const [uploadingImages, setUploadingImages] = useState(false);

  async function handleImagesSelected(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = ""; // allow re-selecting the same file
    if (files.length === 0) return;
    setUploadingImages(true);
    try {
      const res = await uploadDesignReferences(files);
      if (res) setImageCount((c) => c + files.length);
    } finally {
      setUploadingImages(false);
    }
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
                <div />
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setPrdDialogOpen(true)} className="text-xs text-[#64748b] h-7 px-2.5"><Paperclip className="size-3" /> PRD</Button>
                    <input ref={imageInputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={handleImagesSelected} />
                    <Button variant="ghost" size="sm" disabled={uploadingImages || isRunning} onClick={() => imageInputRef.current?.click()} className="text-xs text-[#64748b] h-7 px-2.5" title="Attach reference screenshots — the PRD step will summarize requirements from them"><ImagePlus className="size-3" /> {uploadingImages ? "Uploading…" : imageCount > 0 ? `${imageCount} image${imageCount > 1 ? "s" : ""}` : "Images"}</Button>
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
