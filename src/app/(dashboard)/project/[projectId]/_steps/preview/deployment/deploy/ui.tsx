"use client";

import { useStepStore } from "@/store/step-store";
import DeploySection from "@/components/kickoff/DeploySection";
import type { StepUIProps } from "../../../_shared/types";

export function DeployUI(_props: StepUIProps) {
  const codeOutputDir = useStepStore((s) => s.codeOutputDir);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="shrink-0 px-8 pt-8 pb-4 border-b border-[#f1f5f9]">
        <h2 className="text-xl font-bold text-[#0b1c30]">Deploy</h2>
        <p className="text-[13px] text-[#94a3b8] mt-0.5">
          Push code to GitHub and deploy via Dokploy.
        </p>
      </div>
      <div className="flex-1 overflow-auto px-8 py-6">
        <DeploySection codeOutputDir={codeOutputDir} />
      </div>
    </div>
  );
}
