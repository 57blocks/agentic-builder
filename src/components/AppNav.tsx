"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useSidebarStore } from "@/store/sidebar-store";
import { useProjects } from "@/hooks/useProjects";
import { useStageStore, STAGE_META, type StageId } from "@/store/stage-store";
import { usePipelineStore } from "@/store/pipeline-store";
import type { Project } from "@/types/project";

function FolderIcon() {
  return (
    <svg width="18" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="6" height="4" viewBox="0 0 6 4" fill="none" aria-hidden>
      <path d="M0.5 0.5L3 3L5.5 0.5" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="15" height="12" viewBox="0 0 18 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v5h5" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M5 1v8M1 5h8" />
    </svg>
  );
}

function LogoMark() {
  return (
    <svg width="10.5" height="11.667" viewBox="0 0 12 14" fill="white" aria-hidden>
      <path d="M6 0L12 3.5V10.5L6 14L0 10.5V3.5L6 0Z" />
    </svg>
  );
}

// ── Mock project data (replace with real store / API) ─────────────────────────
// PROJECTS constant removed — now loaded from /api/projects via useProjects()

export default function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    projects,
    loading,
    createProject,
    addLocalProject,
    renameProject,
    deleteProject,
  } = useProjects();
  const resetStage = useStageStore((s) => s.resetStage);
  const setProjectSlugForSync = useStageStore((s) => s.setProjectSlugForSync);
  const setProjectName = useStageStore((s) => s.setProjectName);
  const stageProjectId = useStageStore((s) => s.projectId);
  const activeStage = useStageStore((s) => s.activeStage);
  const resetPipeline = usePipelineStore((s) => s.reset);
  const pipelineSetProjectSlugForSync = usePipelineStore((s) => s.setProjectSlugForSync);

  // Open menu (3-dot) — only one open at a time. Tracked by project id.
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  // Inline rename — id of the project currently being edited, and its draft value.
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  // Delete confirmation modal.
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Click-outside to close any open menu.
  useEffect(() => {
    if (!openMenuId) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest?.("[data-project-menu]")) return;
      setOpenMenuId(null);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [openMenuId]);

  function startRename(project: Project) {
    setOpenMenuId(null);
    setRenamingId(project.id);
    setRenameDraft(project.name);
  }

  async function commitRename(projectId: string) {
    const name = renameDraft.trim();
    setRenamingId(null);
    if (!name) return;
    try {
      await renameProject(projectId, name);
      // If this is the currently active project, also update the stage store so
      // the header label updates immediately.
      if (stageProjectId === projectId) setProjectName(name);
    } catch (err) {
      console.error("[AppNav] rename failed:", err);
    }
  }

  function cancelRename() {
    setRenamingId(null);
    setRenameDraft("");
  }

  function requestDelete(project: Project) {
    setOpenMenuId(null);
    setDeleteError(null);
    setDeleteTarget(project);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    setDeleteError(null);
    const wasActive = pathname?.startsWith(`/project/${deleteTarget.id}`);
    try {
      await deleteProject(deleteTarget.id);
      setDeleteTarget(null);
      // If the deleted project was open, navigate away.
      if (wasActive) {
        resetStage();
        resetPipeline();
        // Send the user home; landing page will pick a next project (or empty state).
        router.push("/");
      }
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete project.",
      );
    } finally {
      setDeleteBusy(false);
    }
  }

  async function handleNewProject() {
    resetStage();
    resetPipeline();
    // Create local project immediately for instant UI feedback
    const localProject = addLocalProject("New Project");
    setProjectSlugForSync(localProject.id);
    pipelineSetProjectSlugForSync(localProject.id);
    setProjectName("New Project");
    router.push(`/project/${localProject.id}`);
    // Try creating on the server in the background; replace local placeholder on success
    try {
      await createProject("New Project", localProject.id);
    } catch (err) {
      console.error("[AppNav] Server project creation failed (will retry on next action):", err);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const dragStyle: React.CSSProperties & { WebkitAppRegion?: string } = { WebkitAppRegion: "drag" };
  const noDragStyle: React.CSSProperties & { WebkitAppRegion?: string } = { WebkitAppRegion: "no-drag" };
  const collapsed = useSidebarStore((s) => s.collapsed);
  const toggleSidebar = useSidebarStore((s) => s.toggle);

  return (
    <aside
      className={`fixed left-0 top-0 h-screen ${collapsed ? "w-16" : "w-60"} bg-white border-r border-slate-200 flex flex-col justify-between z-50 pr-px py-4 transition-all duration-300`}
      style={dragStyle}
    >
      {/* Toggle button */}
      <button
        type="button"
        onClick={toggleSidebar}
        className="absolute -right-3 top-6 z-50 w-6 h-6 rounded-full border border-slate-200 bg-white flex items-center justify-center shadow-sm hover:bg-slate-50 transition-colors"
        style={noDragStyle}
      >
        <ChevronLeft size={12} className={`text-slate-500 transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`} />
      </button>
      {/* Logo & Brand */}
      <div className={`${collapsed ? "px-0 pt-[30px] pb-8 flex justify-center" : "px-6 pb-8 pt-[30px]"}`} style={noDragStyle}>
        <div className={`flex ${collapsed ? "flex-col items-center" : "items-center gap-3"}`}>
          <div className="w-8 h-8 bg-slate-900 rounded-xs flex items-center justify-center shrink-0">
            <svg width="10.5" height="11.667" viewBox="0 0 12 14" fill="white" aria-hidden>
              <path d="M6 0L12 3.5V10.5L6 14L0 10.5V3.5L6 0Z" />
            </svg>
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-[18px] font-bold tracking-[-0.45px] text-slate-900 leading-7">
                Agentic Builder
              </span>
              <span className="text-xs uppercase text-slate-600 leading-3.75 font-space-grotesk">
                V{process.env.NEXT_PUBLIC_APP_VERSION ?? "0.1.0"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 min-h-0 overflow-y-auto ${collapsed ? "px-2" : "px-4"}`} style={noDragStyle}>
        <div className="mb-4">
          {!collapsed && <h3 className="text-[12px] uppercase font-semibold text-slate-600 px-2 mb-3 tracking-wide">Projects</h3>}
          
          {loading && (
            <span className="px-3 py-2 text-[12px] text-slate-600 block">Loading…</span>
          )}
          {!loading && projects.length === 0 && (
            <span className="px-3 py-2 text-[12px] text-slate-600 block">No projects yet</span>
          )}
          
          <div className="flex flex-col gap-2">
            {projects.map((project) => {
              const href = `/project/${project.id}`;
              const isActive = pathname?.startsWith(href);
              const isCurrentStageProject = isActive && stageProjectId === project.id;
              // Use project.name from the API response as the canonical source of truth.
              // This prevents stale localStorage data (from the persist middleware)
              // from showing a different name than what /api/projects returns.
              const displayName = project.name;
              const stageMeta = isCurrentStageProject
                ? STAGE_META[activeStage as StageId]
                : null;

              const isRenaming = renamingId === project.id;
              const isMenuOpen = openMenuId === project.id;
              return (
                <div
                  key={project.id}
                  className={`group relative flex flex-col gap-1.5 ${collapsed ? "p-2 items-center" : "p-3"} rounded-lg border transition-all ${
                    isActive
                      ? "bg-slate-100 border-slate-200 shadow-sm"
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                  }`}
                >
                  {/* Header row — either the Link (default) or an inline rename input */}
                  {isRenaming ? (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 shrink-0"><FileIcon /></span>
                      <input
                        autoFocus
                        value={renameDraft}
                        onChange={(e) => setRenameDraft(e.target.value)}
                        onBlur={() => void commitRename(project.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void commitRename(project.id);
                          } else if (e.key === "Escape") {
                            e.preventDefault();
                            cancelRename();
                          }
                        }}
                        className="flex-1 min-w-0 text-[13px] font-medium text-slate-900 bg-white border border-indigo-300 rounded px-1.5 py-0.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-300"
                      />
                    </div>
                  ) : collapsed ? (
                    <Link
                      href={href}
                      className="flex items-center justify-center"
                      title={displayName}
                    >
                      <span className={`transition-colors shrink-0 ${isActive ? "text-slate-600" : "text-slate-500 group-hover:text-slate-600"}`}>
                        <FileIcon />
                      </span>
                    </Link>
                  ) : (
                    <Link
                      href={href}
                      className="flex items-center gap-2 min-w-0 pr-6"
                    >
                      <span className={`transition-colors shrink-0 ${isActive ? "text-slate-600" : "text-slate-500 group-hover:text-slate-600"}`}>
                        <FileIcon />
                      </span>
                      <span className={`text-[13px] tracking-[-0.3px] truncate transition-colors font-medium ${isActive ? "text-slate-900" : "text-slate-700 group-hover:text-slate-900"}`}>
                        {displayName}
                      </span>
                    </Link>
                  )}

                  {/* Per-project 3-dot menu */}
                  {!collapsed && !isRenaming && (
                    <div
                      data-project-menu
                      className="absolute top-2 right-2"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpenMenuId(isMenuOpen ? null : project.id);
                        }}
                        className={`p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors ${
                          isMenuOpen ? "text-slate-700 bg-slate-200/70" : "opacity-0 group-hover:opacity-100 focus:opacity-100"
                        }`}
                        aria-label={`Open menu for ${displayName}`}
                      >
                        <MoreHorizontal size={14} />
                      </button>
                      {isMenuOpen && (
                        <div
                          role="menu"
                          className="absolute right-0 top-7 z-50 min-w-32 rounded-md border border-slate-200 bg-white shadow-lg py-1 text-[12.5px]"
                        >
                          <button
                            type="button"
                            role="menuitem"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              startRename(project);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2 text-slate-700"
                          >
                            <Pencil size={12} /> Rename
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              requestDelete(project);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-red-50 flex items-center gap-2 text-red-600"
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className={`h-px bg-linear-to-r ${isActive ? "from-slate-400 to-transparent" : "from-slate-300 to-transparent"}`}></div>
                  {!collapsed && stageMeta ? (
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                      <span className="text-[11px] text-slate-700 font-medium">
                        {stageMeta.name}
                      </span>
                      <span className="text-[10px] text-slate-500 truncate">
                        — {stageMeta.desc}
                      </span>
                    </div>
                  ) : !collapsed ? (
                    <span className="text-[11px] text-slate-500">Ready</span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Secondary Nav Links */}
      <div className={`${collapsed ? "px-0 flex flex-col items-center" : "px-6"} pb-4 flex flex-col gap-2`} style={noDragStyle}>
        <Link
          href="/reports"
          className={`text-sm font-medium transition-colors ${
            pathname === "/reports"
              ? "text-slate-900"
              : "text-slate-500 hover:text-slate-900"
          } ${collapsed ? "w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100" : ""}`}
          title={collapsed ? "Reports" : undefined}
        >
          {collapsed ? <span className="text-[13px] font-bold">R</span> : "Reports"}
        </Link>
        <Link
          href="/memory"
          className={`text-sm font-medium transition-colors ${
            pathname === "/memory"
              ? "text-slate-900"
              : "text-slate-500 hover:text-slate-900"
          } ${collapsed ? "w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100" : ""}`}
          title={collapsed ? "Memory" : undefined}
        >
          {collapsed ? <span className="text-[13px] font-bold">M</span> : "Memory"}
        </Link>
        <Link
          href="/knowledge"
          className={`flex items-center text-sm font-medium transition-colors ${
            pathname === "/knowledge"
              ? "text-slate-900"
              : "text-slate-500 hover:text-slate-900"
          } ${collapsed ? "w-8 h-8 justify-center rounded-lg hover:bg-slate-100" : "gap-1.5"}`}
          title={collapsed ? "Knowledge" : undefined}
        >
          {collapsed ? (
            <span className="text-[13px] font-bold">K</span>
          ) : (
            <>
              <span>Knowledge</span>
              <span className="text-[10px] font-bold uppercase tracking-wide bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full leading-none">
                57B
              </span>
            </>
          )}
        </Link>
        <Link
          href="/prd-knowledge"
          className={`flex items-center text-sm font-medium transition-colors ${
            pathname === "/prd-knowledge"
              ? "text-slate-900"
              : "text-slate-500 hover:text-slate-900"
          } ${collapsed ? "w-8 h-8 justify-center rounded-lg hover:bg-slate-100" : ""}`}
          title={collapsed ? "PRD Knowledge" : undefined}
        >
          {collapsed ? <span className="text-[13px] font-bold">P</span> : "PRD Knowledge"}
        </Link>
      </div>

      {/* Bottom: New Project + User Profile */}
      <div className={`flex flex-col gap-6 ${collapsed ? "px-2 items-center" : "px-4"}`} style={noDragStyle}>
        <button
          onClick={handleNewProject}
          className={`flex items-center justify-center ${collapsed ? "w-10 h-10" : "gap-2 w-full py-2.5"} bg-slate-950 text-white text-[14px] font-bold rounded-lg hover:bg-slate-800 hover:shadow-md hover:scale-105 transition-all active:bg-slate-950 active:scale-95`}
          title={collapsed ? "New Project" : undefined}
        >
          <PlusIcon />
          {!collapsed && <span>New Project</span>}
        </button>

        <div className={`border-t border-slate-200 flex items-center ${collapsed ? "justify-center pt-4 px-0" : "gap-3 pt-4.25 pb-2 px-3"}`}>
          <div className="w-8 h-8 rounded-xl bg-slate-200 shrink-0 overflow-hidden">
            <div className="w-full h-full bg-linear-to-br from-slate-400 to-slate-500 flex items-center justify-center text-white text-sm font-bold">
              A
            </div>
          </div>
          {!collapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="text-[12px] font-bold text-slate-900 leading-4 truncate">57Blocks</span>
              <span className="text-xs text-slate-600 leading-3.75 truncate">Senior Architect</span>
            </div>
          )}
          {!collapsed && (
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="ml-auto text-[11px] text-slate-400 hover:text-slate-600 transition-colors"
              title="Sign out"
            >
              Sign out
            </button>
          )}
        </div>
      </div>

      {deleteTarget && (
        <DeleteProjectDialog
          project={deleteTarget}
          busy={deleteBusy}
          error={deleteError}
          onCancel={() => {
            if (deleteBusy) return;
            setDeleteTarget(null);
            setDeleteError(null);
          }}
          onConfirm={() => void confirmDelete()}
        />
      )}
    </aside>
  );
}

// ─── Delete confirmation dialog ────────────────────────────────────────────
function DeleteProjectDialog({
  project,
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  project: Project;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const noDragStyle: React.CSSProperties & { WebkitAppRegion?: string } = {
    WebkitAppRegion: "no-drag",
  };

  // Lock body scroll while open, and listen for Escape to cancel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy, onCancel]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm"
      style={noDragStyle}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-[420px] max-w-[92vw] overflow-hidden">
        <div className="px-6 pt-6 pb-2">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center">
              <Trash2 size={16} className="text-red-600" />
            </div>
            <h3 className="text-[16px] font-semibold text-slate-900">
              Delete this project?
            </h3>
          </div>
          <p className="text-[13px] text-slate-600 leading-5 mb-2">
            <span className="font-medium text-slate-900">{project.name}</span>{" "}
            and all of its preparation docs, pipeline state, and step snapshots
            will be permanently removed.
          </p>
          <p className="text-[12px] text-slate-500">This cannot be undone.</p>
          {error && (
            <p className="mt-3 text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
              {error}
            </p>
          )}
        </div>
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="px-4 h-9 rounded-lg text-slate-600 hover:bg-slate-200 text-sm font-medium disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="px-4 h-9 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-500 disabled:opacity-40"
          >
            {busy ? "Deleting…" : "Delete project"}
          </button>
        </div>
      </div>
    </div>
  );
}
