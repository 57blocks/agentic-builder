"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useProjects } from "@/hooks/useProjects";
import { useStageStore } from "@/store/stage-store";
import { usePipelineStore } from "@/store/pipeline-store";
import type { Project } from "@/types/project";

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

/** Stable pastel gradient for cover-less projects, derived from the id. */
function placeholderGradient(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const hue = hash % 360;
  return `linear-gradient(135deg, hsl(${hue} 70% 88%), hsl(${(hue + 40) % 360} 65% 78%))`;
}

function ProjectCard({ project }: { project: Project }) {
  const cover = project.coverImagePath;
  const initial = (project.name.trim()[0] ?? "?").toUpperCase();
  return (
    <Link
      href={`/project/${project.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
      style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={`${project.name} preview`}
            className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{ background: placeholderGradient(project.id) }}
          >
            <span className="text-4xl font-bold text-white/80 drop-shadow-sm">{initial}</span>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-0.5 px-3.5 py-3">
        <span className="truncate text-[13.5px] font-semibold text-[#0b1c30]">{project.name}</span>
        <span className="text-[11.5px] text-[#94a3b8]">
          {new Date(project.createdAt).toLocaleDateString()}
        </span>
      </div>
    </Link>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const { projects, loading, error, addLocalProject, createProject } = useProjects();
  const resetStage = useStageStore((s) => s.resetStage);
  const setProjectSlugForSync = useStageStore((s) => s.setProjectSlugForSync);
  const setProjectName = useStageStore((s) => s.setProjectName);
  const resetPipeline = usePipelineStore((s) => s.reset);
  const pipelineSetProjectSlugForSync = usePipelineStore((s) => s.setProjectSlugForSync);

  async function handleNewProject() {
    resetStage();
    resetPipeline();
    const localProject = addLocalProject("New Project");
    setProjectSlugForSync(localProject.id);
    pipelineSetProjectSlugForSync(localProject.id);
    setProjectName("New Project");
    router.push(`/project/${localProject.id}`);
    try {
      await createProject("New Project", localProject.id);
    } catch (err) {
      console.error("[LandingPage] Server project creation failed:", err);
    }
  }

  const hasProjects = projects.length > 0;

  // Empty state — only show Welcome when the fetch definitely succeeded with no projects.
  if (!loading && !error && !hasProjects) {
    return (
      <div
        className="flex flex-col items-center justify-center flex-1 h-full bg-[#f8f9ff] p-8"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      >
        <div className="flex flex-col items-center gap-8 max-w-lg text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg">
            <LogoMark />
          </div>
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

  // Populated state — a gallery grid of project cards.
  return (
    <div
      className="flex-1 h-full overflow-y-auto bg-[#f8f9ff]"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      <div className="mx-auto w-full max-w-6xl px-8 py-10">
        <div className="mb-7 flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-[#0b1c30]">Your Projects</h1>
            <p className="mt-0.5 text-[13px] text-[#94a3b8]">
              {loading ? "Loading…" : `${projects.length} project${projects.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <button
            onClick={handleNewProject}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0f172a] px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-all hover:bg-[#1e293b] hover:shadow-md active:scale-[0.98]"
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          >
            <PlusIcon />
            New Project
          </button>
        </div>

        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {/* New Project tile */}
          <button
            onClick={handleNewProject}
            className="group flex aspect-[16/10] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white/50 text-slate-400 transition-all hover:border-slate-400 hover:bg-white hover:text-slate-600"
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 transition-colors group-hover:bg-slate-200">
              <PlusIcon />
            </span>
            <span className="text-[12.5px] font-medium">New Project</span>
          </button>

          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </div>
    </div>
  );
}
