"use client";

import { useEffect, useState } from "react";

export type ServerLogStream = "stdout" | "stderr" | "system";

export interface ServerLogLine {
  ts: number;
  stream: ServerLogStream;
  text: string;
}

interface ServerSnapshot {
  status: "stopped" | "starting" | "running" | "error";
  port: number | null;
  url: string | null;
  logs: ServerLogLine[];
}

const EMPTY: ServerSnapshot = { status: "stopped", port: null, url: null, logs: [] };

/**
 * Poll /api/agents/preview-server on a steady interval so anything in the page
 * (e.g. the console panel) can render fresh server logs without owning the
 * polling logic itself.
 */
export function usePreviewServerLogs(intervalMs = 1500): ServerSnapshot {
  const [snap, setSnap] = useState<ServerSnapshot>(EMPTY);
  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const resp = await fetch("/api/agents/preview-server", { cache: "no-store" });
        if (!resp.ok) return;
        const data = (await resp.json()) as ServerSnapshot;
        if (!cancelled) setSnap(data);
      } catch {
        /* ignore */
      }
    }
    tick();
    const handle = setInterval(tick, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(handle);
    };
  }, [intervalMs]);
  return snap;
}
