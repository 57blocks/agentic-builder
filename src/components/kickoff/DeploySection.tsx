"use client";

import { useEffect, useRef, useState } from "react";
import type { StepResult } from "@/lib/deploy/types";
import { usePipelineStore } from "@/store/pipeline-store";

const STEP_LABELS: Record<string, string> = {
  "verify-repo": "Verify GitHub repo",
  "git-push": "Push code",
  "create-database": "Create database",
  "create-dokploy": "Create Dokploy project",
  "trigger-deploy": "Deploy",
};

const ALL_STEPS = ["verify-repo", "git-push", "create-database", "create-dokploy", "trigger-deploy"] as const;

function StepRow({ step, result }: { step: string; result?: StepResult }) {
  const status = result?.status ?? "pending";
  const label = STEP_LABELS[step] ?? step;

  const icon =
    status === "done" ? "✓"
    : status === "running" ? "⟳"
    : status === "error" ? "✗"
    : "○";

  const color =
    status === "done" ? "text-green-600"
    : status === "running" ? "text-blue-600"
    : status === "error" ? "text-red-500"
    : "text-zinc-400";

  return (
    <div className="flex items-center gap-2 py-1 text-[13px]">
      <span className={`w-4 text-center font-bold ${color}`}>{icon}</span>
      <span className={status === "error" ? "text-red-600" : "text-zinc-700"}>{label}</span>
      {result?.message && status !== "done" && (
        <span className="text-zinc-400 text-[11px] truncate max-w-[200px]">{result.message}</span>
      )}
    </div>
  );
}

export default function DeploySection({ codeOutputDir }: { codeOutputDir: string }) {
  const featureBrief = usePipelineStore((s) => s.featureBrief);
  const [steps, setSteps] = useState<StepResult[]>([]);
  const [finalStatus, setFinalStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [deployUrl, setDeployUrl] = useState<string | null>(null);
  const [repoUrl, setRepoUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const sourceRef = useRef<EventSource | null>(null);

  const appName = featureBrief
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "generated-app";

  const handleDeploy = async () => {
    setFinalStatus("running");
    setSteps([]);
    setDeployUrl(null);
    setRepoUrl(null);
    setErrorMsg(null);

    const res = await fetch("/api/deploy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appName, generatedCodePath: codeOutputDir }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: string };
      setErrorMsg(data.error ?? "Failed to start deployment");
      setFinalStatus("error");
      return;
    }

    const { jobId: id } = await res.json() as { jobId: string };
    setJobId(id);

    const es = new EventSource(`/api/deploy/${id}/stream`);
    sourceRef.current = es;

    es.onmessage = (e) => {
      const step = JSON.parse(e.data as string) as StepResult;
      setSteps((prev) => {
        const idx = prev.findIndex((s) => s.step === step.step);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = step;
          return next;
        }
        return [...prev, step];
      });
      if (step.step === "trigger-deploy" && step.status === "done") {
        if (step.url) setDeployUrl(step.url);
        setFinalStatus("done");
        es.close();
      }
      if (step.status === "error") {
        setFinalStatus("error");
        es.close();
      }
    };

    es.onerror = () => {
      es.close();
      void fetch(`/api/deploy/${id}`)
        .then((r) => r.json())
        .then((data: { status: string; url?: string; repoUrl?: string }) => {
          setFinalStatus(data.status === "done" ? "done" : "error");
          if (data.url) setDeployUrl(data.url);
          if (data.repoUrl) setRepoUrl(data.repoUrl);
        });
    };
  };

  useEffect(() => {
    return () => sourceRef.current?.close();
  }, []);

  const stepMap = new Map(steps.map((s) => [s.step, s]));

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06)]">
      <p className="text-[15px] font-semibold text-zinc-900">Deploy to Dokploy</p>
      <p className="mt-1 text-[12px] text-zinc-500">
        Pushes code to GitHub, creates a database, and deploys via Docker Compose.
      </p>

      {finalStatus === "idle" && (
        <button
          type="button"
          onClick={() => void handleDeploy()}
          className="mt-3 rounded-lg bg-[#712ae2] hover:bg-[#5f24c2] px-4 py-2 text-xs font-semibold text-white transition-colors"
        >
          Deploy {appName}
        </button>
      )}

      {finalStatus !== "idle" && (
        <div className="mt-3">
          {ALL_STEPS.map((step) => (
            <StepRow key={step} step={step} result={stepMap.get(step)} />
          ))}
        </div>
      )}

      {errorMsg && (
        <p className="mt-2 text-[12px] text-red-600">{errorMsg}</p>
      )}

      {finalStatus === "done" && (
        <div className="mt-3 flex flex-wrap gap-3 text-[12px]">
          {deployUrl && (
            <a href={deployUrl} target="_blank" rel="noreferrer" className="text-indigo-600 underline">
              Open app ↗
            </a>
          )}
          {repoUrl && (
            <a href={repoUrl} target="_blank" rel="noreferrer" className="text-zinc-500 underline">
              GitHub repo ↗
            </a>
          )}
          <button
            type="button"
            onClick={() => { setFinalStatus("idle"); setJobId(null); }}
            className="text-zinc-400 hover:text-zinc-600"
          >
            Deploy again
          </button>
        </div>
      )}

      {/* suppress unused warning — jobId used for future retry logic */}
      {jobId && null}
    </div>
  );
}
