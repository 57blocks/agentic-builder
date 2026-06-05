"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

// ─── Mirror of the engine's public shapes (kept local to avoid importing
//     server-only modules into the client bundle) ──────────────────────────────
interface AcceptanceCommand {
  command: string;
  label?: string;
  optional?: boolean;
  precondition?: string;
  expectOutput?: string;
}
interface Milestone {
  id: string;
  title: string;
  instructions: string;
  acceptance: AcceptanceCommand[];
}
interface BuildPlanDraft {
  projectName: string;
  context?: string;
  milestones: Milestone[];
}

type MilestoneStatus = "pending" | "running" | "passed" | "failed" | "skipped";

interface RunResultLike {
  outcome: "passed" | "failed";
  failedAt?: string;
  costUsd: number;
  durationMs: number;
}

type Sandbox = "local" | "container";

const LANE: Record<MilestoneStatus, { dot: string; text: string; label: string }> = {
  pending: { dot: "bg-slate-300", text: "text-slate-500", label: "Pending" },
  running: { dot: "bg-amber-500 animate-pulse", text: "text-amber-700", label: "Running" },
  passed: { dot: "bg-emerald-500", text: "text-emerald-700", label: "Passed" },
  failed: { dot: "bg-red-500", text: "text-red-700", label: "Failed" },
  skipped: { dot: "bg-slate-300", text: "text-slate-400", label: "Skipped" },
};

export default function AgenticBuildPage() {
  const [spec, setSpec] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [planJson, setPlanJson] = useState("");
  const [plan, setPlan] = useState<BuildPlanDraft | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);

  const [workspaceDir, setWorkspaceDir] = useState("");
  const [sandbox, setSandbox] = useState<Sandbox>("local");
  const [containerImage, setContainerImage] = useState("");
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [resume, setResume] = useState(true);

  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<Record<string, MilestoneStatus>>({});
  const [activity, setActivity] = useState<Record<string, string>>({});
  const [logLines, setLogLines] = useState<string[]>([]);
  const [result, setResult] = useState<RunResultLike | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const pushLog = useCallback((line: string) => {
    setLogLines((prev) => [...prev.slice(-400), line]);
  }, []);

  // ── Step 1: extract a structured plan from the markdown spec ────────────────
  async function handleExtract() {
    if (!spec.trim() || extracting) return;
    setExtracting(true);
    setError(null);
    try {
      const res = await fetch("/api/agents/agentic-build/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spec }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Extraction failed");
      const draft = data.plan as BuildPlanDraft;
      setPlan(draft);
      setPlanJson(JSON.stringify(draft, null, 2));
      setJsonError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setExtracting(false);
    }
  }

  // Keep the parsed plan in sync with the editable JSON (the "review/edit" step).
  function onPlanJsonChange(value: string) {
    setPlanJson(value);
    try {
      const parsed = JSON.parse(value) as BuildPlanDraft;
      if (!Array.isArray(parsed.milestones)) throw new Error("milestones must be an array");
      setPlan(parsed);
      setJsonError(null);
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : "Invalid JSON");
    }
  }

  const milestones = plan?.milestones ?? [];

  // ── Step 2: run the plan (SSE) ──────────────────────────────────────────────
  async function handleRun() {
    if (!plan || running || jsonError) return;
    setRunning(true);
    setError(null);
    setResult(null);
    setLogLines([]);
    setActivity({});
    setStatus(
      Object.fromEntries(plan.milestones.map((m) => [m.id, "pending" as MilestoneStatus])),
    );

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch("/api/agents/agentic-build/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          workspaceDir: workspaceDir.trim() || undefined,
          sandbox,
          containerImage: containerImage.trim() || undefined,
          maxAttemptsPerMilestone: maxAttempts,
          resume,
        }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `Run failed (HTTP ${res.status})`);
      }
      await consumeSse(res.body, handleSseEvent);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }

  function handleStop() {
    abortRef.current?.abort();
  }

  function handleSseEvent(evt: Record<string, unknown>) {
    const type = evt.type as string;
    if (type === "ready") {
      pushLog(`▶ workspace: ${evt.workspaceDir} (${evt.milestones} milestones)`);
    } else if (type === "orchestrator") {
      const e = evt.event as { type: string; milestoneId?: string; attempt?: number };
      if (e.milestoneId) {
        if (e.type === "milestone_start") setStatusFor(e.milestoneId, "running");
        else if (e.type === "milestone_passed") setStatusFor(e.milestoneId, "passed");
        else if (e.type === "milestone_failed") setStatusFor(e.milestoneId, "failed");
        else if (e.type === "milestone_skipped") setStatusFor(e.milestoneId, "skipped");
        if (e.type === "milestone_attempt") {
          setActivityFor(e.milestoneId, `attempt ${e.attempt}…`);
        }
        pushLog(`• ${e.milestoneId}: ${e.type}${e.attempt ? ` (attempt ${e.attempt})` : ""}`);
      }
    } else if (type === "agent") {
      const milestoneId = evt.milestoneId as string;
      const e = evt.event as { kind: string; name?: string; arg?: string; text?: string };
      if (e.kind === "tool") setActivityFor(milestoneId, `${e.name} ${e.arg ?? ""}`.trim());
      else if (e.kind === "assistant" && e.text) setActivityFor(milestoneId, e.text.slice(0, 80));
    } else if (type === "result") {
      setResult(evt.result as RunResultLike);
    } else if (type === "error") {
      setError(String(evt.message ?? "Unknown error"));
    }
  }

  function setStatusFor(id: string, s: MilestoneStatus) {
    setStatus((prev) => ({ ...prev, [id]: s }));
  }
  function setActivityFor(id: string, a: string) {
    setActivity((prev) => ({ ...prev, [id]: a }));
  }

  const canRun = !!plan && !jsonError && milestones.length > 0 && !running;
  const summary = useMemo(() => {
    const vals = Object.values(status);
    return {
      passed: vals.filter((v) => v === "passed").length,
      failed: vals.filter((v) => v === "failed").length,
      total: milestones.length,
    };
  }, [status, milestones.length]);

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="max-w-5xl mx-auto px-8 py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Agentic Build</h1>
          <p className="text-sm text-slate-600 mt-1">
            No-scaffold, milestone-driven channel. Paste a spec, review the extracted
            milestones &amp; acceptance commands, then run a single agent that builds and
            self-verifies each milestone by exit code.
          </p>
        </header>

        {error && (
          <div className="mb-5 text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {/* Step 1 — Spec → Plan */}
        <section className="mb-6 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900">1 · Spec</h2>
            <button
              type="button"
              onClick={handleExtract}
              disabled={!spec.trim() || extracting}
              className="px-3.5 h-8 rounded-lg bg-slate-900 text-white text-[13px] font-semibold hover:bg-slate-800 disabled:opacity-40 transition-colors inline-flex items-center gap-2"
            >
              {extracting && (
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              )}
              {extracting ? "Extracting…" : "Extract plan"}
            </button>
          </div>
          <textarea
            value={spec}
            onChange={(e) => setSpec(e.target.value)}
            placeholder="Paste the build/spec document (e.g. a TDD M0→M10 plan with per-milestone acceptance commands)…"
            className="w-full h-44 text-[12.5px] font-mono text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 resize-y"
          />
        </section>

        {/* Step 2 — Review/edit plan */}
        {plan && (
          <section className="mb-6 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-900">
                2 · Review &amp; edit plan
                <span className="ml-2 text-[12px] font-normal text-slate-500">
                  {plan.projectName} · {milestones.length} milestones
                </span>
              </h2>
              {jsonError && (
                <span className="text-[12px] text-red-600">JSON: {jsonError}</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <textarea
                value={planJson}
                onChange={(e) => onPlanJsonChange(e.target.value)}
                spellCheck={false}
                className={`w-full h-72 text-[12px] font-mono text-slate-800 bg-slate-50 border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 resize-y ${
                  jsonError
                    ? "border-red-300 focus:border-red-400 focus:ring-red-200"
                    : "border-slate-200 focus:border-indigo-400 focus:ring-indigo-200"
                }`}
              />
              <div className="h-72 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
                {milestones.map((m) => (
                  <div key={m.id} className="bg-white border border-slate-200 rounded-md px-3 py-2">
                    <div className="text-[12.5px] font-semibold text-slate-900">
                      {m.id} · {m.title}
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {m.acceptance.map((a, i) => (
                        <div key={i} className="text-[11px] font-mono text-slate-500 truncate">
                          {a.optional ? "○" : "●"} {a.command}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Step 3 — Run config + execute */}
        {plan && (
          <section className="mb-6 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">3 · Run</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <label className="block">
                <span className="text-[12px] font-medium text-slate-600">Workspace dir (absolute, or blank for default)</span>
                <input
                  value={workspaceDir}
                  onChange={(e) => setWorkspaceDir(e.target.value)}
                  placeholder="/Users/…/my-project"
                  className="mt-1 w-full h-9 text-[12.5px] text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-3 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-[12px] font-medium text-slate-600">Sandbox</span>
                  <select
                    value={sandbox}
                    onChange={(e) => setSandbox(e.target.value as Sandbox)}
                    className="mt-1 w-full h-9 text-[12.5px] text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2 focus:outline-none focus:border-indigo-400"
                  >
                    <option value="local">local</option>
                    <option value="container">container (docker)</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-[12px] font-medium text-slate-600">Max attempts</span>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={maxAttempts}
                    onChange={(e) => setMaxAttempts(Math.max(1, Number(e.target.value) || 1))}
                    className="mt-1 w-full h-9 text-[12.5px] text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-3 focus:outline-none focus:border-indigo-400"
                  />
                </label>
              </div>
            </div>
            {sandbox === "container" && (
              <label className="block mb-4">
                <span className="text-[12px] font-medium text-slate-600">Container image (blank = debian:bookworm-slim)</span>
                <input
                  value={containerImage}
                  onChange={(e) => setContainerImage(e.target.value)}
                  placeholder="python:3.11-bookworm"
                  className="mt-1 w-full h-9 text-[12.5px] text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-3 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
                />
              </label>
            )}
            <div className="flex items-center gap-4">
              <label className="inline-flex items-center gap-2 text-[12.5px] text-slate-600">
                <input type="checkbox" checked={resume} onChange={(e) => setResume(e.target.checked)} />
                Resume (skip already-passed milestones)
              </label>
              <div className="ml-auto flex items-center gap-2">
                {running && (
                  <button
                    type="button"
                    onClick={handleStop}
                    className="px-3.5 h-9 rounded-lg border border-slate-300 text-slate-700 text-[13px] font-semibold hover:bg-slate-100"
                  >
                    Stop
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleRun}
                  disabled={!canRun}
                  className="px-4 h-9 rounded-lg bg-indigo-600 text-white text-[13px] font-semibold hover:bg-indigo-500 disabled:opacity-40 inline-flex items-center gap-2"
                >
                  {running && (
                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  )}
                  {running ? "Building…" : "Run build"}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Progress */}
        {(running || result || Object.keys(status).length > 0) && (
          <section className="mb-6 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-900">Progress</h2>
              <span className="text-[12px] text-slate-500">
                {summary.passed}/{summary.total} passed{summary.failed ? ` · ${summary.failed} failed` : ""}
              </span>
            </div>
            <div className="space-y-2">
              {milestones.map((m) => {
                const s = status[m.id] ?? "pending";
                const lane = LANE[s];
                return (
                  <motion.div
                    key={m.id}
                    layout
                    className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${lane.dot}`} />
                    <span className="text-[12.5px] font-medium text-slate-900 w-44 truncate">
                      {m.id} · {m.title}
                    </span>
                    <span className={`text-[11px] font-semibold ${lane.text} w-16`}>{lane.label}</span>
                    <span className="text-[11px] font-mono text-slate-500 truncate flex-1">
                      {activity[m.id] ?? ""}
                    </span>
                  </motion.div>
                );
              })}
            </div>

            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mt-4 rounded-lg px-4 py-3 text-[13px] font-semibold border ${
                    result.outcome === "passed"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : "bg-red-50 border-red-200 text-red-700"
                  }`}
                >
                  {result.outcome === "passed"
                    ? `Build passed — all milestones green`
                    : `Build failed at ${result.failedAt}`}
                  <span className="ml-2 font-normal text-slate-500">
                    {(result.durationMs / 1000).toFixed(1)}s · ${result.costUsd.toFixed(3)}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {logLines.length > 0 && (
              <details className="mt-4">
                <summary className="text-[12px] text-slate-500 cursor-pointer select-none">
                  Event log ({logLines.length})
                </summary>
                <pre className="mt-2 max-h-56 overflow-y-auto text-[11px] font-mono text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3 whitespace-pre-wrap">
                  {logLines.join("\n")}
                </pre>
              </details>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

// ─── Minimal SSE reader over a fetch body stream ────────────────────────────
async function consumeSse(
  body: ReadableStream<Uint8Array>,
  onEvent: (evt: Record<string, unknown>) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      for (const line of frame.split("\n")) {
        const trimmed = line.trimStart();
        if (!trimmed.startsWith("data:")) continue;
        const json = trimmed.slice(5).trim();
        if (!json) continue;
        try {
          onEvent(JSON.parse(json));
        } catch {
          /* ignore malformed frame */
        }
      }
    }
  }
}
