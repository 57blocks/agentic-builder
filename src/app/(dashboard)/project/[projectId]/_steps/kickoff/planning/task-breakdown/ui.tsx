"use client";

import { Fragment, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronRight, Download, FileCode, FilePlus, FilePen, GitBranch, ListChecks, Loader2, RefreshCw, Settings, Zap, User } from "lucide-react";
import { useStepStore } from "@/store/step-store";
import { getNextStep, getPrevStep } from "@/_config/pipeline-flow";
import { parseKickoffTaskBreakdownFromMetadata } from "@/lib/pipeline/kickoff-task-breakdown";
import type { ResourceRequirement } from "@/lib/pipeline/resource-requirements";
import type { StepUIProps } from "../../../_shared/types";
import type { KickoffWorkItem, TaskFilePlan } from "@/lib/pipeline/types";

const CATEGORY_COLOR: Record<string, string> = {
  auth: "bg-violet-100 text-violet-700",
  payment: "bg-emerald-100 text-emerald-700",
  email: "bg-amber-100 text-amber-700",
  storage: "bg-sky-100 text-sky-700",
  ai: "bg-indigo-100 text-indigo-700",
  analytics: "bg-pink-100 text-pink-700",
  messaging: "bg-orange-100 text-orange-700",
  maps: "bg-teal-100 text-teal-700",
  queue: "bg-cyan-100 text-cyan-700",
  logging: "bg-slate-100 text-slate-600",
  other: "bg-zinc-100 text-zinc-600",
};

const CATEGORY_LABEL: Record<string, string> = {
  auth: "Auth",
  payment: "Payment",
  email: "Email",
  storage: "Storage",
  ai: "AI / LLM",
  analytics: "Analytics",
  messaging: "Messaging",
  maps: "Maps",
  queue: "Queue",
  logging: "Logging",
  other: "Other",
};

const PHASE_COLORS: Record<string, string> = {
  backend: "bg-blue-50 text-blue-700",
  frontend: "bg-indigo-50 text-indigo-700",
  infra: "bg-slate-100 text-slate-600",
  data: "bg-emerald-50 text-emerald-700",
  integration: "bg-violet-50 text-violet-700",
  design: "bg-pink-50 text-pink-700",
};

function phaseColor(phase: string): string {
  const key = phase.toLowerCase();
  for (const [k, v] of Object.entries(PHASE_COLORS)) {
    if (key.includes(k)) return v;
  }
  return "bg-slate-100 text-slate-600";
}

const PRIORITY_STYLE: Record<string, string> = {
  P0: "bg-red-50 text-red-700 border border-red-200",
  P1: "bg-amber-50 text-amber-700 border border-amber-200",
  P2: "bg-sky-50 text-sky-700 border border-sky-200",
  critical: "bg-red-50 text-red-700 border border-red-200",
  high: "bg-amber-50 text-amber-700 border border-amber-200",
  medium: "bg-sky-50 text-sky-700 border border-sky-200",
  low: "bg-slate-50 text-slate-500 border border-slate-200",
};

function priorityStyle(p?: string): string {
  if (!p) return "bg-slate-50 text-slate-500 border border-slate-200";
  return PRIORITY_STYLE[p] ?? PRIORITY_STYLE[p.toLowerCase()] ?? "bg-slate-50 text-slate-500 border border-slate-200";
}

function priorityLabel(p?: string): string {
  if (!p) return "—";
  const map: Record<string, string> = { P0: "CRITICAL", P1: "HIGH", P2: "MEDIUM", critical: "CRITICAL", high: "HIGH", medium: "MEDIUM", low: "LOW" };
  return map[p] ?? p.toUpperCase();
}

export function TaskBreakdownUI({ onNavigate }: StepUIProps) {
  const summaryResult = useStepStore((s) => s.steps.summary);
  const taskBreakdownResult = useStepStore((s) => s.steps["task-breakdown"]);
  const tier = useStepStore((s) => s.tier);
  const nextStep = getNextStep("task-breakdown", tier);
  const prevStep = getPrevStep("task-breakdown", tier);

  // Stores used to feed the kickoff regenerate request.
  const featureBrief = useStepStore((s) => s.featureBrief);
  const codeOutputDir = useStepStore((s) => s.codeOutputDir);
  const steps = useStepStore((s) => s.steps);
  const setStepResult = useStepStore((s) => s.setStepResult);
  const setStepFailed = useStepStore((s) => s.setStepFailed);

  const [requirements, setRequirements] = useState<ResourceRequirement[]>([]);
  const [repoUrl, setRepoUrl] = useState<string | null>(null);
  const [repoLoading, setRepoLoading] = useState(true);

  // Regenerate state — drives the spinner + disables nav while running.
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);

  const handleRegenerate = async () => {
    if (regenerating) return;
    const ok = window.confirm(
      "Regenerate the task breakdown?\n\nThis re-runs the kickoff agent against the latest PRD / TRD / SysDesign / ImplGuide / Design / Pencil and replaces the current 19 tasks. Existing .env, SETUP.md, and any generated code stay untouched.",
    );
    if (!ok) return;
    setRegenerating(true);
    setRegenError(null);

    try {
      const resp = await fetch("/api/agents/kickoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          featureBrief,
          codeOutputDir,
          prd: steps.prd?.content ?? "",
          trd: steps.trd?.content ?? "",
          sysdesign: steps.sysdesign?.content ?? "",
          implguide: steps.implguide?.content ?? "",
          design: steps.design?.content ?? "",
          pencil: steps.pencil?.content ?? "",
          sessionId: useStepStore.getState().kickoffSessionId ?? "",
        }),
      });
      if (!resp.ok) throw new Error(`Kickoff returned HTTP ${resp.status}`);

      const reader = resp.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let kickoffContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "step_stream") {
              kickoffContent += event.data?.chunk ?? "";
            } else if (event.type === "step_complete") {
              kickoffContent = event.data?.content ?? kickoffContent;
            } else if (event.type === "done") {
              const meta = event.run?.steps?.kickoff ?? {};
              const metadata = meta.metadata ?? {};
              const now = new Date().toISOString();
              // Mirror the env-setup UI's persistence path so the breakdown
              // panel below this row picks up the new metadata instantly.
              setStepResult("env-setup", {
                stepId: "env-setup",
                status: "completed",
                content: kickoffContent,
                costUsd: meta.costUsd ?? 0,
                durationMs: meta.durationMs ?? 0,
                metadata,
                timestamp: now,
              });
              setStepResult("summary", {
                stepId: "summary",
                status: "completed",
                content: kickoffContent,
                costUsd: meta.costUsd ?? 0,
                durationMs: meta.durationMs ?? 0,
                metadata,
                timestamp: now,
              });
              setStepResult("task-breakdown", {
                stepId: "task-breakdown",
                status: "completed",
                content: kickoffContent,
                costUsd: 0,
                durationMs: 0,
                metadata,
                timestamp: now,
              });
            }
          } catch { /* skip malformed SSE */ }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Regenerate failed";
      setRegenError(msg);
      setStepFailed("task-breakdown", msg);
    } finally {
      setRegenerating(false);
    }
  };

  useEffect(() => {
    fetch("/api/agents/pipeline/resource-requirements")
      .then((r) => r.json())
      .then((data: { requirements?: ResourceRequirement[] }) => {
        if (Array.isArray(data.requirements)) setRequirements(data.requirements);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/agents/push-generated-code")
      .then((r) => r.json())
      .then((data: { repo?: { htmlUrl?: string } }) => {
        if (data.repo?.htmlUrl) setRepoUrl(data.repo.htmlUrl);
      })
      .catch(() => {})
      .finally(() => setRepoLoading(false));
  }, []);

  const metadata = taskBreakdownResult?.metadata ?? summaryResult?.metadata;
  const tasks = parseKickoffTaskBreakdownFromMetadata(metadata);
  const isCompleted = summaryResult?.status === "completed";
  const pendingCount = tasks.filter((t) => t.executionKind === "ai_autonomous").length;

  // Track which task row is expanded — single-expand for a cleaner UI.
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const toggleExpand = (id: string) =>
    setExpandedTaskId((prev) => (prev === id ? null : id));

  const artifacts = [
    { name: "PRD.md", lines: 412, type: "doc" },
    { name: "Architecture.pdf", lines: 38, type: "pdf" },
  ];

  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden bg-[#f8fafc]">
      {/* Header */}
      <div className="shrink-0 px-8 pt-6 pb-4 bg-white border-b border-[#f1f5f9]">
        <h2 className="text-xl font-bold text-[#0b1c30]">Pre-flight Checklist</h2>
        <p className="text-[13px] text-[#94a3b8] mt-0.5">
          Review all tasks and artifacts before starting the coding run
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">
        {/* PROJECT TASKS */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-[#f1f5f9] flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94a3b8]">Project Tasks</p>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#f1f5f9] text-[#64748b]">
                {pendingCount} PENDING STEPS
              </span>
              <button
                onClick={handleRegenerate}
                disabled={regenerating}
                className="flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-semibold text-[#712ae2] bg-[rgba(113,42,226,0.08)] hover:bg-[rgba(113,42,226,0.16)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Re-run the kickoff agent against the latest PRD/TRD and replace the current task breakdown"
              >
                {regenerating ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <RefreshCw size={11} />
                )}
                {regenerating ? "Regenerating…" : "Regenerate"}
              </button>
            </div>
          </div>
          {regenError && (
            <div className="px-5 py-2 bg-red-50 border-b border-red-100 text-[11px] text-red-700">
              ⚠ {regenError}
            </div>
          )}

          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3 text-slate-400">
              <ListChecks size={28} className="text-slate-300" />
              <p className="text-[13px]">
                {isCompleted ? "No tasks found in metadata." : "Run the kick-off in the Summary step first."}
              </p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#f8fafc] border-b border-[#f1f5f9]">
                  {["", "TASK NAME", "PHASE", "ESTIMATE", "PRIORITY", "STATUS"].map((h, idx) => (
                    <th key={idx} className="px-4 py-2.5 text-[10px] font-bold tracking-widest text-[#94a3b8] uppercase">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tasks.map((task, i) => {
                  const taskId = task.id ?? String(i);
                  const isExpanded = expandedTaskId === taskId;
                  return (
                    <Fragment key={taskId}>
                      <tr
                        className="border-b border-[#f8fafc] hover:bg-[#fafbfc] transition-colors last:border-0 cursor-pointer"
                        onClick={() => toggleExpand(taskId)}
                      >
                        <td className="px-4 py-3 whitespace-nowrap w-8">
                          <ChevronRight
                            size={14}
                            className={`text-[#94a3b8] transition-transform duration-150 ${isExpanded ? "rotate-90" : ""}`}
                          />
                        </td>
                        <td className="px-4 py-3 max-w-70">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] text-[#94a3b8]">{task.id ?? `T-${String(i + 1).padStart(3, "0")}`}</span>
                            <p className="text-[13px] font-semibold text-[#1e293b] truncate">{task.title}</p>
                          </div>
                          {task.description && !isExpanded && (
                            <p className="text-[11px] text-[#94a3b8] mt-0.5 line-clamp-1 ml-12">{task.description}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${phaseColor(task.phase)}`}>
                            {task.phase}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-[13px] font-medium text-[#475569]">
                          {task.estimatedHours}h
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${priorityStyle(task.priority)}`}>
                            {priorityLabel(task.priority)}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {task.executionKind === "ai_autonomous" ? (
                            <span className="flex items-center gap-1 text-[11px] font-medium text-violet-600">
                              <Zap size={12} /> AI Auto
                            </span>
                          ) : task.executionKind === "human_confirm_after" ? (
                            <span className="flex items-center gap-1 text-[11px] font-medium text-amber-600">
                              <User size={12} /> Review
                            </span>
                          ) : (
                            <CheckCircle2 size={16} className="text-emerald-500" />
                          )}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-[#fafbfc] border-b border-[#f1f5f9]">
                          <td colSpan={6} className="px-6 py-4">
                            <TaskDetailBody task={task} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* GENERATED ARTIFACTS */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-[#f1f5f9]">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94a3b8]">Generated Artifacts</p>
          </div>
          <div className="px-5 py-4 grid grid-cols-2 gap-3">
            {artifacts.map((a) => (
              <div key={a.name} className="flex items-center justify-between p-3 rounded-lg border border-[#f1f5f9] bg-[#f8fafc]">
                <div>
                  <p className="text-[13px] font-semibold text-[#334155]">{a.name}</p>
                  <p className="text-[11px] text-[#94a3b8] mt-0.5">{a.lines} {a.type === "pdf" ? "pages" : "lines"}</p>
                </div>
                <button className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors text-[#94a3b8] hover:text-[#334155]">
                  <Download size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom row: Abilities + Project Links */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-[#f1f5f9] flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94a3b8]">Abilities</p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                {requirements.filter((r) => (r.value ?? "").trim()).length} Configured
              </span>
            </div>
            <div className="px-5 py-4 space-y-3">
              {requirements.length === 0 ? (
                <p className="text-[12px] text-[#94a3b8]">No external resources configured.</p>
              ) : (
                requirements.map((req) => (
                  <div key={req.envKey} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shrink-0 ${CATEGORY_COLOR[req.category] ?? CATEGORY_COLOR.other}`}>
                        {CATEGORY_LABEL[req.category] ?? "Other"}
                      </span>
                      <span className="text-[12px] font-mono font-medium text-[#334155] truncate">{req.envKey}</span>
                    </div>
                    <span className={`text-[10px] font-semibold shrink-0 ${(req.value ?? "").trim() ? "text-emerald-600" : "text-amber-600"}`}>
                      {(req.value ?? "").trim() ? "Configured" : "Missing"}
                    </span>
                  </div>
                ))
              )}
              <button onClick={() => onNavigate("summary")}
                className="w-full mt-2 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-[#712ae2] bg-violet-50 px-3 py-2 rounded-lg hover:bg-violet-100 transition-colors">
                <Settings size={12} /> Manage in Summary
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-[#f1f5f9]">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94a3b8]">Project Links</p>
            </div>
            <div className="px-5 py-4 space-y-3">
              {repoLoading ? (
                <p className="text-[12px] text-[#94a3b8]">Loading…</p>
              ) : repoUrl ? (
                <a href={repoUrl} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2.5 text-[13px] font-medium text-[#334155] hover:text-[#712ae2] transition-colors">
                  <GitBranch size={15} className="shrink-0 text-[#334155]" /> GitHub Repository
                </a>
              ) : (
                <p className="text-[12px] text-[#94a3b8]">
                  No repository created yet. Configure deployment to create one.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom navigation */}
      {/* (renders below — kept outside flex container) */}
      <div className="shrink-0 border-t border-[#e2e8f0] bg-white px-8 py-3 flex items-center justify-between">
        <button
          onClick={() => prevStep && onNavigate(prevStep)}
          className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft size={14} /> Previous
        </button>
        <button
          onClick={() => nextStep && onNavigate(nextStep)}
          disabled={!isCompleted || regenerating}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#712ae2] text-white text-[13px] font-semibold rounded-lg hover:bg-[#6b24da] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Confirm &amp; Start Coding <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Expanded task detail body ────────────────────────────────────────────
function TaskDetailBody({ task }: { task: KickoffWorkItem }) {
  const filePlan = normaliseFiles(task.files);
  const subSteps = task.subSteps ?? [];
  const acceptance = task.acceptanceCriteria ?? [];
  const covers = task.coversRequirementIds ?? [];

  return (
    <div className="flex flex-col gap-4">
      {task.description && (
        <p className="text-[12.5px] leading-[1.6] text-[#475569]">{task.description}</p>
      )}

      {/* PRD requirement coverage */}
      {covers.length > 0 && (
        <Section icon={<ListChecks size={11} />} title="Covers PRD requirements">
          <div className="flex flex-wrap gap-1.5">
            {covers.map((req) => (
              <span
                key={req}
                className="text-[10px] font-mono font-semibold text-[#712ae2] bg-[rgba(113,42,226,0.08)] px-1.5 py-0.5 rounded"
              >
                {req}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Sub-steps (implementation plan) */}
      {subSteps.length > 0 && (
        <Section
          icon={<ChevronRight size={11} />}
          title={`Implementation steps (${subSteps.length})`}
        >
          <ol className="flex flex-col gap-1.5 rounded-md border border-[#e2e8f0] bg-white overflow-hidden">
            {subSteps.map((ss) => (
              <li
                key={ss.step}
                className="flex items-start gap-3 px-3 py-2 border-b border-[#f1f5f9] last:border-0"
              >
                <span className="shrink-0 size-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center">
                  {ss.step}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-semibold text-[#1e293b]">{ss.action}</p>
                  {ss.detail && (
                    <p className="text-[11.5px] text-[#64748b] mt-0.5 leading-[1.5]">
                      {ss.detail}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {/* Acceptance criteria */}
      {acceptance.length > 0 && (
        <Section icon={<CheckCircle2 size={11} />} title={`Acceptance criteria (${acceptance.length})`}>
          <ul className="flex flex-col gap-1">
            {acceptance.map((ac, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-[12px] text-[#475569] leading-[1.5]"
              >
                <CheckCircle2 size={11} className="text-emerald-500 shrink-0 mt-[3px]" />
                <span>{ac}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Files */}
      {(filePlan.creates.length > 0 || filePlan.modifies.length > 0 || filePlan.reads.length > 0) && (
        <Section icon={<FileCode size={11} />} title="Files">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {filePlan.creates.length > 0 && (
              <FileList
                label={`Creates (${filePlan.creates.length})`}
                icon={<FilePlus size={11} className="text-emerald-600" />}
                files={filePlan.creates}
              />
            )}
            {filePlan.modifies.length > 0 && (
              <FileList
                label={`Modifies (${filePlan.modifies.length})`}
                icon={<FilePen size={11} className="text-amber-600" />}
                files={filePlan.modifies}
              />
            )}
            {filePlan.reads.length > 0 && (
              <FileList
                label={`Reads (${filePlan.reads.length})`}
                icon={<FileCode size={11} className="text-[#94a3b8]" />}
                files={filePlan.reads}
              />
            )}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">
        {icon}
        <span>{title}</span>
      </div>
      {children}
    </div>
  );
}

function FileList({ label, icon, files }: { label: string; icon: React.ReactNode; files: string[] }) {
  return (
    <div className="bg-white rounded-md border border-[#e2e8f0] p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#475569] mb-1.5">
        {icon}
        <span>{label}</span>
      </div>
      <ul className="flex flex-col gap-0.5">
        {files.map((f) => (
          <li
            key={f}
            className="text-[11px] font-mono text-[#475569] break-all"
            title={f}
          >
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

function normaliseFiles(files: KickoffWorkItem["files"]): TaskFilePlan {
  if (!files) return { creates: [], modifies: [], reads: [] };
  if (Array.isArray(files)) {
    // Legacy shape: flat string[] — best-effort treat as creates.
    return { creates: files, modifies: [], reads: [] };
  }
  return {
    creates: files.creates ?? [],
    modifies: files.modifies ?? [],
    reads: files.reads ?? [],
  };
}