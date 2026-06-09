"use client";

import { useCallback, useEffect, useState } from "react";

export interface InfraServiceMeta {
  kind: "postgres" | "redis" | "s3";
  appName: string;
  externalPort: number;
  publicUrl: string;
}

export interface InfraMeta {
  ok?: boolean;
  error?: string;
  skipped?: boolean;
  reason?: string;
  dokployProjectId?: string;
  appName?: string;
  services?: InfraServiceMeta[];
}

interface Props {
  infra: InfraMeta;
  dokployBaseUrl?: string;
}

const KIND_ICON: Record<InfraServiceMeta["kind"], string> = {
  postgres: "🐘",
  redis: "🟥",
  s3: "🪣",
};

const KIND_LABEL: Record<InfraServiceMeta["kind"], string> = {
  postgres: "Postgres",
  redis: "Redis",
  s3: "S3",
};

type PingStatus =
  | { state: "pending" }
  | { state: "ok"; latencyMs: number }
  | { state: "fail"; error: string };

async function pingUrl(url: string): Promise<PingStatus> {
  try {
    const res = await fetch("/api/kickoff/infra-ping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = (await res.json()) as {
      ok: boolean;
      latencyMs?: number;
      error?: string;
    };
    if (data.ok) return { state: "ok", latencyMs: data.latencyMs ?? 0 };
    return { state: "fail", error: data.error ?? "unknown" };
  } catch (e) {
    return {
      state: "fail",
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export default function InfraSection({ infra, dokployBaseUrl }: Props) {
  const [copied, setCopied] = useState<string | null>(null);
  const services = infra.services ?? [];
  const [pings, setPings] = useState<Record<string, PingStatus>>({});

  const runPing = useCallback(async (key: string, url: string) => {
    setPings((p) => ({ ...p, [key]: { state: "pending" } }));
    const result = await pingUrl(url);
    setPings((p) => ({ ...p, [key]: result }));
  }, []);

  // Initial probe — fires once per service when the panel mounts. S3 is an
  // external bucket reached over HTTPS with credentials, not a pingable TCP
  // endpoint, so we skip the reachability probe for it.
  useEffect(() => {
    for (const svc of services) {
      if (svc.kind === "s3") continue;
      const key = `${svc.kind}-${svc.appName}`;
      runPing(key, svc.publicUrl);
    }
    // intentional: we want to fire ping ONCE per render of the services list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [services.length]);

  if (infra.skipped) {
    return (
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h3 className="text-[14px] font-semibold text-zinc-900">
          Infrastructure
        </h3>
        <p className="mt-2 text-[13px] text-zinc-500">
          Skipped — {infra.reason ?? "no condition met"}.
        </p>
      </section>
    );
  }

  const projectUrl =
    dokployBaseUrl && infra.dokployProjectId
      ? `${dokployBaseUrl.replace(/\/$/, "")}/dashboard/project/${infra.dokployProjectId}`
      : null;

  const copy = async (url: string, key: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-[14px] font-semibold text-zinc-900">
            Infrastructure
          </h3>
          <p className="mt-1 text-[12px] text-zinc-500">
            Provisioned via Dokploy{infra.appName ? ` · project ${infra.appName}` : ""}
          </p>
        </div>
        {projectUrl && (
          <a
            href={projectUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-100"
          >
            Open in Dokploy ↗
          </a>
        )}
      </div>

      {infra.error && (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-[12px] text-red-800">
          {infra.error}
        </div>
      )}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {services.map((svc) => {
          const key = `${svc.kind}-${svc.appName}`;
          const ping = pings[key];
          return (
            <div
              key={key}
              className="rounded-xl border border-zinc-200 bg-zinc-50/40 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[16px]" aria-hidden>
                    {KIND_ICON[svc.kind]}
                  </span>
                  <span className="text-[13px] font-semibold text-zinc-900">
                    {KIND_LABEL[svc.kind]}
                  </span>
                  {svc.kind !== "s3" && (
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px] text-zinc-700">
                      :{svc.externalPort}
                    </span>
                  )}
                  {svc.kind !== "s3" && (
                    <PingBadge
                      status={ping}
                      onRetry={() => runPing(key, svc.publicUrl)}
                    />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => copy(svc.publicUrl, key)}
                  className="rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-[11px] font-medium text-zinc-700 hover:bg-zinc-100"
                >
                  {copied === key ? "Copied ✓" : "Copy URL"}
                </button>
              </div>
              <div className="mt-1 truncate font-mono text-[11px] text-zinc-500">
                {svc.appName}
              </div>
              <div className="mt-2 break-all rounded-md bg-white px-2 py-1.5 font-mono text-[11px] text-zinc-700 ring-1 ring-zinc-200">
                {svc.publicUrl}
              </div>
            </div>
          );
        })}
        {services.length === 0 && !infra.error && (
          <p className="col-span-full text-[12px] text-zinc-500">
            No services were provisioned.
          </p>
        )}
      </div>
    </section>
  );
}

function PingBadge({
  status,
  onRetry,
}: {
  status: PingStatus | undefined;
  onRetry: () => void;
}) {
  if (!status || status.state === "pending") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600">
        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-400" />
        Checking…
      </span>
    );
  }
  if (status.state === "ok") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800"
        title={`TCP connect succeeded in ${status.latencyMs}ms`}
      >
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Reachable
        <span className="text-emerald-700/70">· {status.latencyMs}ms</span>
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onRetry}
      className="inline-flex items-center gap-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-800 hover:bg-red-200"
      title={`Click to retry. Last error: ${status.error}`}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
      Unreachable
      <span className="text-red-700/70">· retry</span>
    </button>
  );
}
