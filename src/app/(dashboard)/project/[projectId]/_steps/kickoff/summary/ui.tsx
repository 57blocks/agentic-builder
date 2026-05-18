"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Loader2, ChevronLeft, ChevronRight, GitBranch, Zap, User, Rocket, Eye, EyeOff, CheckSquare, Square, Plus, RefreshCw, ExternalLink } from "lucide-react";
import { useStepStore } from "@/store/step-store";
import { getNextStep } from "@/_config/pipeline-flow";
import { parseKickoffTaskBreakdownFromMetadata } from "@/lib/pipeline/kickoff-task-breakdown";
import type { ResourceRequirement } from "@/lib/pipeline/resource-requirements";
import type { StepUIProps } from "../../_shared/types";

const PAGE_SIZE = 8;

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

/** Emoji / text icon per category, shown inside the dark tile on the card */
const CATEGORY_ICON: Record<string, string> = {
  auth: "🔐",
  payment: "💳",
  email: "✉️",
  storage: "☁️",
  ai: "🤖",
  analytics: "📊",
  messaging: "💬",
  maps: "🗺️",
  queue: "⚡",
  logging: "📋",
  other: "🔧",
};

/** Human-readable integration type label per category */
const CATEGORY_INTEGRATION_LABEL: Record<string, string> = {
  auth: "AUTH INTEGRATION",
  payment: "PAYMENT INTEGRATION",
  email: "EMAIL INTEGRATION",
  storage: "STORAGE INTEGRATION",
  ai: "AI / LLM INTEGRATION",
  analytics: "ANALYTICS INTEGRATION",
  messaging: "MESSAGING INTEGRATION",
  maps: "MAPS INTEGRATION",
  queue: "QUEUE INTEGRATION",
  logging: "LOGGING INTEGRATION",
  other: "INTEGRATION",
};

const PHASE_COLORS: Record<string, string> = {
  data:           "bg-blue-100 text-blue-700",
  integration:    "bg-purple-100 text-purple-700",
  backend:        "bg-orange-100 text-orange-700",
  infra:          "bg-green-100 text-green-700",
  infrastructure: "bg-green-100 text-green-700",
  frontend:       "bg-sky-100 text-sky-700",
  security:       "bg-red-100 text-red-700",
  optimization:   "bg-amber-100 text-amber-700",
};

function phaseColor(phase: string) {
  const key = phase.toLowerCase().split(" ")[0];
  return PHASE_COLORS[key] ?? "bg-slate-100 text-slate-600";
}

export function SummaryUI({ onNavigate }: StepUIProps) {
  const featureBrief = useStepStore((s) => s.featureBrief);
  const codeOutputDir = useStepStore((s) => s.codeOutputDir);
  const steps = useStepStore((s) => s.steps);
  const setStepResult = useStepStore((s) => s.setStepResult);
  const isRunning = useStepStore((s) => s.isRunning);
  const currentStep = useStepStore((s) => s.currentStep);
  const streamingContent = useStepStore((s) => s.streamingContent);
  const tier = useStepStore((s) => s.tier);
  const nextStep = getNextStep("summary", tier);

  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [repoUrl, setRepoUrl] = useState<string | null>(null);
  const [repoLoading, setRepoLoading] = useState(true);
  // ── Abilities config state ──
  const [abilities, setAbilities] = useState<ResourceRequirement[]>([]);
  const [abilitiesLoading, setAbilitiesLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [enabledKeys, setEnabledKeys] = useState<Set<string>>(new Set());

  // ── Project Links token config (GitHub + Jira) ──
  type ProjectLinkConfig = {
    githubToken: string;
    githubOrg: string;
    jiraHost: string;
    jiraEmail: string;
    jiraToken: string;
    jiraProject: string;
  };
  const LS_KEY = "agentic_project_links";
  const [linkConfig, setLinkConfig] = useState<ProjectLinkConfig>(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null;
      return raw ? (JSON.parse(raw) as ProjectLinkConfig) : { githubToken: "", githubOrg: "", jiraHost: "", jiraEmail: "", jiraToken: "", jiraProject: "" };
    } catch { return { githubToken: "", githubOrg: "", jiraHost: "", jiraEmail: "", jiraToken: "", jiraProject: "" }; }
  });
  const [showLinkSecrets, setShowLinkSecrets] = useState<Record<string, boolean>>({});
  const [githubExpanded, setGithubExpanded] = useState(false);
  const [jiraExpanded, setJiraExpanded] = useState(false);

  const updateLinkConfig = (patch: Partial<ProjectLinkConfig>) => {
    setLinkConfig((prev) => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  // Load saved abilities on mount, then auto-detect if empty
  useEffect(() => {
    fetch("/api/agents/pipeline/resource-requirements")
      .then((r) => r.json())
      .then((data: { requirements?: ResourceRequirement[] }) => {
        const items = Array.isArray(data.requirements) ? data.requirements : [];
        setAbilities(items);
        setEnabledKeys(new Set(items.filter((i) => i.required || (i.value ?? "").trim()).map((i) => i.envKey)));
        // Auto-detect if no saved items and PRD is available
        if (items.length === 0 && steps.prd?.content?.trim()) {
          void handleDetectAbilities();
        }
      })
      .catch(() => {})
      .finally(() => setAbilitiesLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistAbilities = useCallback(async (next: ResourceRequirement[]) => {
    try {
      await fetch("/api/agents/pipeline/resource-requirements", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requirements: next }),
      });
    } catch { /* silent */ }
  }, []);

  const handleDetectAbilities = useCallback(async () => {
    if (detecting || !steps.prd?.content?.trim()) return;
    setDetectError(null);
    setDetecting(true);
    try {
      const resp = await fetch("/api/agents/pipeline/resource-requirements/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prd: steps.prd?.content ?? "",
          trd: steps.trd?.content,
          sysdesign: steps.sysdesign?.content,
          implguide: steps.implguide?.content,
        }),
      });
      const data = (await resp.json()) as { requirements?: ResourceRequirement[]; error?: string };
      if (!resp.ok) throw new Error(data.error || "Detection failed");
      const items = Array.isArray(data.requirements) ? data.requirements : [];
      setAbilities(items);
      setEnabledKeys(new Set(items.filter((i) => i.required).map((i) => i.envKey)));
      void persistAbilities(items);
    } catch (e) {
      setDetectError(e instanceof Error ? e.message : "Detection failed");
    } finally {
      setDetecting(false);
    }
  }, [detecting, steps.prd?.content, steps.trd?.content, steps.sysdesign?.content, steps.implguide?.content, persistAbilities]);

  const handleAbilityValueChange = (envKey: string, value: string) => {
    setAbilities((prev) => {
      const next = prev.map((it) => it.envKey === envKey ? { ...it, value } : it);
      void persistAbilities(next);
      return next;
    });
  };

  const toggleAbility = (envKey: string) => {
    setEnabledKeys((prev) => {
      const next = new Set(prev);
      if (next.has(envKey)) next.delete(envKey); else next.add(envKey);
      return next;
    });
  };

  const abilitiesConfigured = useMemo(
    () => abilities.filter((a) => enabledKeys.has(a.envKey) && (a.value ?? "").trim()).length,
    [abilities, enabledKeys],
  );

  const summaryResult = steps.summary;
  const isThisRunning = isRunning && currentStep === "summary";
  const isCompleted = summaryResult?.status === "completed";
  const metadata = summaryResult?.metadata;
  const tasks = parseKickoffTaskBreakdownFromMetadata(metadata);
  const hasRunKickoff = isCompleted || isThisRunning;

  useEffect(() => {
    fetch("/api/agents/push-generated-code")
      .then((r) => r.json())
      .then((data: { repo?: { htmlUrl?: string } }) => {
        if (data.repo?.htmlUrl) setRepoUrl(data.repo.htmlUrl);
      })
      .catch(() => {})
      .finally(() => setRepoLoading(false));
  }, []);

  const runKickoff = async () => {
    setError(null);
    useStepStore.setState((s) => ({
      isRunning: true,
      currentStep: "summary",
      error: null,
      streamingContent: "",
      streamingThinking: "",
      steps: {
        ...s.steps,
        summary: { stepId: "summary", status: "running", timestamp: new Date().toISOString() },
      },
    }));
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
          qa: steps.qa?.content ?? "",
          sessionId: useStepStore.getState().kickoffSessionId ?? "",
        }),
      });
      if (!resp.ok) throw new Error("Kickoff request failed");
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
              const chunk = event.data?.chunk ?? event.chunk ?? "";
              kickoffContent += chunk;
              useStepStore.setState((s) => ({ streamingContent: s.streamingContent + chunk }));
            } else if (event.type === "step_complete") {
              kickoffContent = event.data?.content ?? kickoffContent;
            } else if (event.type === "done") {
              const kickoffMeta = event.run?.steps?.kickoff;
              const costUsd = kickoffMeta?.costUsd ?? 0;
              const durationMs = kickoffMeta?.durationMs ?? 0;
              const kickoffMetadata = kickoffMeta?.metadata ?? {};
              const now = new Date().toISOString();
              setStepResult("summary", { stepId: "summary", status: "completed", content: kickoffContent, costUsd, durationMs, metadata: kickoffMetadata, timestamp: now });
              setStepResult("task-breakdown", { stepId: "task-breakdown", status: "completed", content: kickoffContent, costUsd: 0, durationMs: 0, metadata: kickoffMetadata, timestamp: now });
              useStepStore.setState({ isRunning: false, currentStep: null, streamingContent: "" });
            }
          } catch { /* skip */ }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Kickoff failed";
      setError(msg);
      useStepStore.setState({ isRunning: false, currentStep: null, streamingContent: "" });
    }
  };

  const totalHours = tasks.reduce((s, t) => s + t.estimatedHours, 0);
  const aiTasks = tasks.filter((t) => t.executionKind === "ai_autonomous");
  const humanTasks = tasks.filter((t) => t.executionKind === "human_confirm_after");
  const aiHours = aiTasks.reduce((s, t) => s + t.estimatedHours, 0);
  const humanHours = humanTasks.reduce((s, t) => s + t.estimatedHours, 0);
  const efficiencyPct = tasks.length > 0 ? Math.round((aiTasks.length / tasks.length) * 100) : 0;
  const estimatedCost = (totalHours * 8.5).toFixed(0);
  const totalPages = Math.ceil(tasks.length / PAGE_SIZE);
  const pageTasks = tasks.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // ── Token computation ──
  const totalInputTokens = tasks.reduce((s, t) => s + (t.tokenEstimate?.inputTokens ?? 0), 0);
  const totalOutputTokens = tasks.reduce((s, t) => s + (t.tokenEstimate?.outputTokens ?? 0), 0);
  const totalTokens = tasks.reduce((s, t) => s + (t.tokenEstimate?.totalTokens ?? 0), 0);
  const tokenCost = tasks.reduce((s, t) => s + (t.tokenEstimate?.estimatedCostUsd ?? 0), 0);
  const hasTokenData = totalTokens > 0;

  function formatTokens(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  }

  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto bg-[#f8f9ff]">
        <div className="max-w-5xl mx-auto px-8 py-7 space-y-5">

          {/* ── Header (always shows Sprint Kick-off Summary) ── */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-[22px] font-bold text-[#0b1c30] leading-tight">
                Sprint Kick-off Summary
              </h1>
              <p className="text-[13px] text-[#94a3b8] mt-0.5">
                {isCompleted
                  ? "AI-generated task plan based on your PRD, TRD and Design Spec"
                  : "Review the project plan and configure integrations before generating the task plan"}
              </p>
            </div>
            {isCompleted && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            )}
          </div>

          {/* ── Run Kick-off (shown when not yet run) ── */}
          {!hasRunKickoff && (
            <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
              <div className="px-6 py-8 flex flex-col items-center justify-center gap-4 text-center">
                <div className="w-14 h-14 rounded-full bg-[#712ae2]/10 flex items-center justify-center">
                  <Rocket size={28} className="text-[#712ae2]" />
                </div>
                <div>
                  <p className="text-[15px] font-bold text-[#0b1c30]">Ready to generate the task plan</p>
                  <p className="text-[12px] text-[#94a3b8] mt-1 max-w-md">
                    Configure integrations below or click the button to generate the kick-off plan from your PRD, TRD and Design Spec.
                  </p>
                </div>
                <button
                  onClick={runKickoff}
                  disabled={isRunning}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#712ae2] px-8 py-3.5 text-[14px] font-semibold text-white shadow-sm transition-all hover:bg-[#6b24da] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isRunning ? (
                    <><Loader2 size={16} className="animate-spin" /> Generating…</>
                  ) : (
                    <><Rocket size={16} /> Run Kick-off</>
                  )}
                </button>
                {error && (
                  <p className="text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2 max-w-md">{error}</p>
                )}
              </div>
            </div>
          )}

          {/* ── Generating banner ── */}
          {isThisRunning && (
            <div className="rounded-xl border border-violet-200 bg-white px-5 py-4 flex items-center gap-3 shadow-sm">
              <Loader2 size={15} className="text-[#712ae2] animate-spin shrink-0" />
              <div>
                <p className="text-[13px] font-semibold text-violet-900">Generating Kick-off Plan…</p>
                {streamingContent && <p className="text-[11px] text-violet-500 mt-0.5 line-clamp-1">{streamingContent.slice(-120)}</p>}
              </div>
            </div>
          )}

          {/* ── Error during generation ── */}
          {error && isThisRunning && (
            <div className="rounded-xl border border-red-200 bg-white px-5 py-4 shadow-sm">
              <p className="text-[13px] font-semibold text-red-700">Kick-off failed</p>
              <p className="text-[12px] text-red-500 mt-1">{error}</p>
              <button onClick={runKickoff}
                className="mt-3 px-4 py-1.5 text-[12px] font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">
                Retry
              </button>
            </div>
          )}

          {/* ── Stats + Tasks (after completion) ── */}
          {isCompleted && tasks.length > 0 && (
            <>
              {/* Stats bar */}
              <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-[#f1f5f9]">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94a3b8]">Project Stats</p>
                </div>
                <div className="grid grid-cols-6 divide-x divide-[#f1f5f9]">
                  {[
                    { label: "TOTAL TASKS", value: String(tasks.length) },
                    { label: "AI ESTIMATE", value: `${aiHours}h` },
                    { label: "HUMAN ESTIMATE", value: `${humanHours}h` },
                    { label: "TOTAL HOURS", value: `${totalHours}h` },
                    { label: "EFFICIENCY", value: `${efficiencyPct}%`, highlight: true },
                    { label: "EST. COST", value: `$${estimatedCost}` },
                  ].map(({ label, value, highlight }) => (
                    <div key={label} className="px-4 py-3 text-center">
                      <p className={`text-[17px] font-bold ${highlight ? "text-[#712ae2]" : "text-[#0b1c30]"}`}>{value}</p>
                      <p className="text-[10px] text-[#94a3b8] mt-0.5 font-medium">{label}</p>
                    </div>
                  ))}
                </div>
                {hasTokenData && (
                  <div className="border-t border-[#f1f5f9] bg-[#fafbff]">
                    <div className="px-5 py-2 border-b border-[#f1f5f9]">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#712ae2]">Token Usage</p>
                    </div>
                    <div className="grid grid-cols-4 divide-x divide-[#f1f5f9]">
                      {[
                        { label: "INPUT TOKENS", value: formatTokens(totalInputTokens) },
                        { label: "OUTPUT TOKENS", value: formatTokens(totalOutputTokens) },
                        { label: "TOTAL TOKENS", value: formatTokens(totalTokens), highlight: true },
                        { label: "TOKEN COST", value: `$${tokenCost.toFixed(2)}` },
                      ].map(({ label, value, highlight }) => (
                        <div key={label} className="px-4 py-3 text-center">
                          <p className={`text-[15px] font-bold ${highlight ? "text-[#712ae2]" : "text-[#0b1c30]"}`}>{value}</p>
                          <p className="text-[9px] text-[#94a3b8] mt-0.5 font-medium">{label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Task table */}
              <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#f1f5f9] flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94a3b8]">Project Tasks</p>
                  <span className="text-[11px] text-[#94a3b8]">Showing {Math.min((page + 1) * PAGE_SIZE, tasks.length)} of {tasks.length} tasks</span>
                </div>
                <div className="grid grid-cols-[2fr_1fr_72px_1fr_1fr_72px_96px] gap-4 px-5 py-2.5 bg-[#fafbfc] border-b border-[#f1f5f9]">
                  {["TASK DESCRIPTION", "PHASE", "TOKENS", "AI EST.", "HUMAN EST.", "PRIORITY", "TYPE"].map((h) => (
                    <span key={h} className="text-[10px] font-semibold uppercase tracking-wider text-[#94a3b8]">{h}</span>
                  ))}
                </div>
                {pageTasks.map((task, i) => (
                  <div key={task.id} className={`grid grid-cols-[2fr_1fr_72px_1fr_1fr_72px_96px] gap-4 items-center px-5 py-3.5 ${i < pageTasks.length - 1 ? "border-b border-[#f8fafc]" : ""} hover:bg-[#fafbff] transition-colors`}>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[#1e293b] truncate">{task.title}</p>
                      <p className="text-[11px] text-[#94a3b8] truncate mt-0.5">{task.description}</p>
                    </div>
                    <div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${phaseColor(task.phase)}`}>{task.phase}</span>
                    </div>
                    <div className="text-[12px] font-medium text-[#334155]">
                      {task.tokenEstimate?.totalTokens ? formatTokens(task.tokenEstimate.totalTokens) : <span className="text-slate-300">—</span>}
                    </div>
                    <div className="text-[13px] font-medium text-[#334155]">{task.estimatedHours}h</div>
                    <div className="text-[13px] font-medium text-[#334155]">
                      {task.executionKind === "human_confirm_after" ? <span>{task.estimatedHours}h</span> : <span className="text-slate-300">—</span>}
                    </div>
                    <div>
                      {task.priority ? (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          task.priority === "P0" ? "bg-red-100 text-red-700" :
                          task.priority === "P1" ? "bg-orange-100 text-orange-700" :
                          "bg-slate-100 text-slate-600"
                        }`}>{task.priority}</span>
                      ) : <span className="text-[11px] text-slate-300">—</span>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {task.executionKind === "ai_autonomous" ? (
                        <span className="flex items-center gap-1 text-[11px] font-medium text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full">
                          <Zap size={10} className="shrink-0" /> Autonomous
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                          <User size={10} className="shrink-0" /> Manual Review
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {totalPages > 1 && (
                  <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#f1f5f9] bg-[#fafbfc]">
                    <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                      className="flex items-center gap-1 px-3 py-1.5 text-[12px] font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                      <ChevronLeft size={13} /> Previous
                    </button>
                    <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                      className="flex items-center gap-1 px-3 py-1.5 text-[12px] font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                      Next <ChevronRight size={13} />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── Abilities + Project Links (side by side) ── */}
          <div className="grid grid-cols-2 gap-4 items-start">
          <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#f1f5f9] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-[16px] font-bold text-[#0b1c30]">Abilities</p>
                {abilitiesConfigured > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-semibold">
                    {abilitiesConfigured} Configured
                  </span>
                )}
              </div>
              <button
                onClick={handleDetectAbilities}
                disabled={detecting || abilitiesLoading}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#712ae2] bg-violet-50 px-2.5 py-1 rounded-full hover:bg-violet-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {detecting
                  ? <><Loader2 size={11} className="animate-spin" /> Analyzing…</>
                  : <><RefreshCw size={11} /> {abilities.length === 0 ? "Detect from PRD" : "Re-detect"}</>
                }
              </button>
            </div>

            <div className="px-5 py-4 space-y-3">
              {detectError && (
                <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{detectError}</p>
              )}

              {abilitiesLoading ? (
                <p className="text-[12px] text-[#94a3b8]">Loading…</p>
              ) : abilities.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[#e2e8f0] bg-[#fafbff] p-4 text-center">
                  <p className="text-[13px] font-medium text-[#334155]">No integrations detected yet</p>
                  <p className="text-[12px] text-[#94a3b8] mt-1">
                    Click <span className="font-semibold text-[#712ae2]">Detect from PRD</span> to auto-detect third-party dependencies from your PRD, or skip if your app has no external services.
                  </p>
                </div>
              ) : (
                abilities.map((item) => {
                  const enabled = enabledKeys.has(item.envKey);
                  return (
                    <div
                      key={item.envKey}
                      className={`rounded-xl border transition-colors ${enabled ? "border-[#e2e8f0] bg-[#f8f9ff]" : "border-[#f1f5f9] bg-white opacity-60"}`}
                    >
                      <div className="flex items-center gap-3 px-4 py-3">
                        <div className="w-9 h-9 rounded-lg bg-[#1a1a2e] flex items-center justify-center text-[18px] shrink-0 shadow-sm">
                          {CATEGORY_ICON[item.category] ?? "🔧"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-bold text-[#0b1c30] leading-tight truncate">{item.label}</p>
                          <p className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wider mt-0.5">
                            {CATEGORY_INTEGRATION_LABEL[item.category] ?? "INTEGRATION"}
                          </p>
                        </div>
                        <button
                          onClick={() => toggleAbility(item.envKey)}
                          className="shrink-0 ml-2"
                          title={enabled ? "Disable" : "Enable"}
                        >
                          {enabled
                            ? <CheckSquare size={20} className="text-[#712ae2]" />
                            : <Square size={20} className="text-[#cbd5e1]" />
                          }
                        </button>
                      </div>

                      {enabled && (
                        <div className="px-4 pb-3 pt-0.5 border-t border-[#f1f5f9]">
                          <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest mb-1.5">
                            {item.envKey.replace(/_/g, " ")}
                          </p>
                          <div className="relative">
                            <input
                              type={showSecrets[item.envKey] ? "text" : "password"}
                              value={item.value ?? ""}
                              onChange={(e) => handleAbilityValueChange(item.envKey, e.target.value)}
                              placeholder={item.example ?? "Paste value here…"}
                              autoComplete="off" spellCheck={false}
                              className="w-full rounded-lg border border-[#e2e8f0] bg-white px-3 py-2.5 pr-10 font-mono text-[12px] text-[#334155] placeholder:text-[#cbd5e1] focus:border-[#712ae2] focus:outline-none focus:ring-1 focus:ring-[#712ae2]"
                            />
                            <button
                              type="button"
                              onClick={() => setShowSecrets((p) => ({ ...p, [item.envKey]: !p[item.envKey] }))}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#334155] transition-colors"
                            >
                              {showSecrets[item.envKey] ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                          </div>
                          {item.description && item.description !== item.label && (
                            <p className="text-[11px] text-[#94a3b8] mt-1.5 leading-relaxed">{item.description}</p>
                          )}
                          {item.docsUrl && (
                            <a href={item.docsUrl} target="_blank" rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-[#712ae2] hover:underline mt-1">
                              <ExternalLink size={10} /> Where to get this key →
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              <button
                onClick={() => {
                  const key = prompt("Enter env variable name (UPPER_SNAKE_CASE):");
                  if (!key) return;
                  const cleaned = key.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
                  if (!cleaned || abilities.some((a) => a.envKey === cleaned)) return;
                  const next: ResourceRequirement[] = [...abilities, {
                    envKey: cleaned, label: cleaned, description: "Manually added.",
                    category: "other", required: false, value: "",
                  }];
                  setAbilities(next);
                  setEnabledKeys((p) => new Set([...p, cleaned]));
                  void persistAbilities(next);
                }}
                className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#712ae2] hover:text-[#6b24da] transition-colors pt-1"
              >
                <Plus size={13} /> Add API key manually
              </button>
            </div>
          </div>

          {/* ── Project Links (editable, always visible at bottom) ── */}
          <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#f1f5f9]">
              <p className="text-[16px] font-bold text-[#0b1c30]">Project Links</p>
              <p className="text-[11px] text-[#94a3b8] mt-0.5">Connect your repositories and project boards</p>
            </div>
            <div className="px-5 py-4 space-y-3">

              {/* ── GitHub ── */}
              <div className={`rounded-xl border transition-colors ${
                linkConfig.githubToken ? "border-[#e2e8f0] bg-[#f8f9ff]" : "border-[#f1f5f9] bg-white"
              }`}>
                <button
                  onClick={() => setGithubExpanded((v) => !v)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#1a1a2e] flex items-center justify-center shrink-0 shadow-sm">
                    <GitBranch size={16} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-[#0b1c30] leading-tight">GitHub Repository</p>
                    <p className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wider mt-0.5">GIT INTEGRATION</p>
                  </div>
                  {linkConfig.githubToken ? (
                    <span className="shrink-0 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">Connected</span>
                  ) : (
                    <span className="shrink-0 text-[10px] font-bold text-[#94a3b8] bg-[#f1f5f9] px-2 py-0.5 rounded-full">Not configured</span>
                  )}
                  <CheckSquare size={18} className={`shrink-0 ml-1 ${githubExpanded ? "text-[#712ae2]" : "text-[#cbd5e1]"}`} />
                </button>

                {githubExpanded && (
                  <div className="px-4 pb-4 pt-0.5 border-t border-[#f1f5f9] space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest mb-1.5">
                        GITHUB TOKEN <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showLinkSecrets["githubToken"] ? "text" : "password"}
                          value={linkConfig.githubToken}
                          onChange={(e) => updateLinkConfig({ githubToken: e.target.value })}
                          placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                          autoComplete="off" spellCheck={false}
                          className="w-full rounded-lg border border-[#e2e8f0] bg-white px-3 py-2.5 pr-10 font-mono text-[12px] text-[#334155] placeholder:text-[#cbd5e1] focus:border-[#712ae2] focus:outline-none focus:ring-1 focus:ring-[#712ae2]"
                        />
                        <button type="button" onClick={() => setShowLinkSecrets((p) => ({ ...p, githubToken: !p["githubToken"] }))}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#334155]">
                          {showLinkSecrets["githubToken"] ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                      <p className="text-[11px] text-[#94a3b8] mt-1">Personal access token with <code className="bg-[#f1f5f9] px-1 rounded text-[10px]">repo</code> scope. Used to create and push the generated repository.</p>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest mb-1.5">GITHUB ORG / USER <span className="text-[#cbd5e1]">(optional)</span></label>
                      <input
                        type="text"
                        value={linkConfig.githubOrg}
                        onChange={(e) => updateLinkConfig({ githubOrg: e.target.value })}
                        placeholder="my-org or my-username"
                        className="w-full rounded-lg border border-[#e2e8f0] bg-white px-3 py-2.5 font-mono text-[12px] text-[#334155] placeholder:text-[#cbd5e1] focus:border-[#712ae2] focus:outline-none focus:ring-1 focus:ring-[#712ae2]"
                      />
                    </div>
                    {repoUrl && (
                      <a href={repoUrl} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#712ae2] hover:underline">
                        <ExternalLink size={11} /> View Repository →
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* ── Jira ── */}
              <div className={`rounded-xl border transition-colors ${
                linkConfig.jiraToken ? "border-[#e2e8f0] bg-[#f8f9ff]" : "border-[#f1f5f9] bg-white"
              }`}>
                <button
                  onClick={() => setJiraExpanded((v) => !v)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#0052cc] flex items-center justify-center shrink-0 shadow-sm">
                    <Plus size={16} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-[#0b1c30] leading-tight">Jira Board</p>
                    <p className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wider mt-0.5">PROJECT MANAGEMENT</p>
                  </div>
                  {linkConfig.jiraToken ? (
                    <span className="shrink-0 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">Connected</span>
                  ) : (
                    <span className="shrink-0 text-[10px] font-bold text-[#94a3b8] bg-[#f1f5f9] px-2 py-0.5 rounded-full">Not configured</span>
                  )}
                  <CheckSquare size={18} className={`shrink-0 ml-1 ${jiraExpanded ? "text-[#712ae2]" : "text-[#cbd5e1]"}`} />
                </button>

                {jiraExpanded && (
                  <div className="px-4 pb-4 pt-0.5 border-t border-[#f1f5f9] space-y-3">
                    {[
                      { key: "jiraHost" as const, label: "JIRA HOST", placeholder: "https://yourteam.atlassian.net", required: true, secret: false },
                      { key: "jiraEmail" as const, label: "JIRA EMAIL", placeholder: "your@email.com", required: true, secret: false },
                      { key: "jiraToken" as const, label: "JIRA API TOKEN", placeholder: "API token from Atlassian account settings", required: true, secret: true },
                      { key: "jiraProject" as const, label: "PROJECT KEY", placeholder: "PROJ", required: true, secret: false },
                    ].map(({ key, label, placeholder, required, secret }) => (
                      <div key={key}>
                        <label className="block text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest mb-1.5">
                          {label} {required && <span className="text-red-500">*</span>}
                        </label>
                        <div className="relative">
                          <input
                            type={secret && !showLinkSecrets[key] ? "password" : "text"}
                            value={linkConfig[key]}
                            onChange={(e) => updateLinkConfig({ [key]: e.target.value })}
                            placeholder={placeholder}
                            autoComplete="off" spellCheck={false}
                            className="w-full rounded-lg border border-[#e2e8f0] bg-white px-3 py-2.5 pr-10 font-mono text-[12px] text-[#334155] placeholder:text-[#cbd5e1] focus:border-[#712ae2] focus:outline-none focus:ring-1 focus:ring-[#712ae2]"
                          />
                          {secret && (
                            <button type="button" onClick={() => setShowLinkSecrets((p) => ({ ...p, [key]: !p[key] }))}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#334155]">
                              {showLinkSecrets[key] ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-[#712ae2] hover:underline">
                      <ExternalLink size={10} /> Get your Atlassian API token →
                    </a>
                  </div>
                )}
              </div>

            </div>
          </div>
          </div>

        </div>
      </div>

      {/* Bottom nav */}
      <div className="shrink-0 border-t border-[#e2e8f0] bg-white px-8 py-3 flex items-center justify-end">
        <button
          onClick={() => nextStep && onNavigate(nextStep)}
          disabled={!isCompleted}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#712ae2] text-white text-[13px] font-semibold rounded-lg hover:bg-[#6b24da] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Task Breakdown <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
