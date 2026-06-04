"use client";

import { useRouter } from "next/navigation";
import { useProjects } from "@/hooks/useProjects";
import { useStageStore } from "@/store/stage-store";
import { usePipelineStore } from "@/store/pipeline-store";
import { useStepStore } from "@/store/step-store";

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M7 1v12M1 7h12" />
    </svg>
  );
}

function LogoMark() {
  return (
    <svg width="28" height="32" viewBox="0 0 12 14" fill="currentColor" aria-hidden>
      <path d="M6 0L12 3.5V10.5L6 14L0 10.5V3.5L6 0Z" />
    </svg>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const { addLocalProject, createProject } = useProjects();
  const resetStage = useStageStore((s) => s.resetStage);
  const setProjectSlugForSync = useStageStore((s) => s.setProjectSlugForSync);
  const setProjectName = useStageStore((s) => s.setProjectName);
  const resetPipeline = usePipelineStore((s) => s.reset);
  const pipelineSetProjectSlugForSync = usePipelineStore((s) => s.setProjectSlugForSync);

  async function handleNewProject() {
    resetStage();
    resetPipeline();

    // Prompt user to select a directory first (mandatory)
    let folder: string | null = null;
    if (window.electronAPI?.selectFolder) {
      folder = await window.electronAPI.selectFolder();
    } else {
      folder = prompt("Enter the absolute path for this project's code output directory:");
    }
    if (!folder || !folder.trim()) return; // user cancelled or gave empty input

    const localProject = addLocalProject("New Project");
    setProjectSlugForSync(localProject.id);
    pipelineSetProjectSlugForSync(localProject.id);
    setProjectName("New Project");
    // Set codeOutputDir immediately so generated code goes to the right place
    // even before createProject completes and the DB is queryable.
    useStepStore.getState().setCodeOutputDir(folder);
    router.push(`/project/${localProject.id}`);
    try {
      await createProject("New Project", folder, localProject.id);
    } catch (err) {
      console.error("[LandingPage] Server project creation failed:", err);
    }
  }

  return (
    <div
      className="flex flex-col items-center justify-center flex-1 h-full bg-[#f8f9ff] p-8"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      <div className="flex flex-col items-center gap-8 max-w-lg text-center">
        {/* Logo */}
        <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg">
          <LogoMark />
        </div>

        {/* Title & description */}
        <div className="flex flex-col items-center gap-3">
          <h1 className="text-[28px] font-bold tracking-tight text-[#0b1c30] leading-tight">
            Welcome to Agentic Builder
          </h1>
          <p className="text-[15px] text-[#64748b] leading-6 max-w-md">
            Automate your product development lifecycle — from intent to PRD to
            design to code. Describe your idea and let AI agents orchestrate the
            rest.
          </p>
        </div>

        {/* New Project button */}
        <button
          onClick={handleNewProject}
          className="inline-flex items-center gap-2.5 rounded-xl bg-[#0f172a] px-8 py-4 text-[15px] font-semibold text-white shadow-sm transition-all hover:bg-[#1e293b] hover:shadow-md active:scale-[0.98]"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        >
          <PlusIcon />
          New Project
        </button>
      </div>
    </div>
  );
}
