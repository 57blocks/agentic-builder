"use client";

import { useEffect, useRef, useState } from "react";

export type ServerLogStream = "stdout" | "stderr" | "system";

export interface ServerLogLine {
  ts: number;
  stream: ServerLogStream;
  text: string;
}

type ServerStatus = "stopped" | "starting" | "running" | "error";

interface ServerSnapshot {
  status: ServerStatus;
  port: number | null;
  url: string | null;
  logs: ServerLogLine[];
}

const EMPTY: ServerSnapshot = { status: "stopped", port: null, url: null, logs: [] };

/**
 * Per-status polling cadence. Without this the previous implementation
 * fired GET /api/agents/preview-server every 1.5 s 24/7 — even when the
 * dev server was stopped and the panel was off-screen. That's hundreds
 * of useless requests per minute (visible in the user's dev terminal).
 *
 * Picked empirically:
 *  - `starting`: the most interesting window; we want fast log updates
 *    AND a fast "running" transition pickup → keep 1.5s.
 *  - `running`:  logs already cap at 1000 lines server-side and the user
 *    rarely needs sub-second freshness here → 3s.
 *  - `stopped` / `error`: nothing useful changes unless the user clicks
 *    Start (or a background restart happens); 8s is enough to pick up
 *    out-of-band state changes without spamming the route.
 */
const INTERVAL_MS: Record<ServerStatus, number> = {
  starting: 1500,
  running: 3000,
  stopped: 8000,
  error: 8000,
};

/**
 * Polls /api/agents/preview-server adaptively and pauses entirely when
 * the document is hidden. Other components on the same page (e.g. the
 * console panel) can read the latest snapshot without owning their own
 * polling loop.
 */
export function usePreviewServerLogs(): ServerSnapshot {
  const [snap, setSnap] = useState<ServerSnapshot>(EMPTY);

  // We keep the most recently observed status in a ref so the polling
  // scheduler can read it inside an interval without re-running the effect
  // (and tearing down / re-creating the timer) on every snapshot change.
  const statusRef = useRef<ServerStatus>("stopped");

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function tick() {
      // Pause entirely while the tab is hidden. The next visibilitychange
      // re-runs schedule() and we immediately catch up.
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        timer = setTimeout(tick, INTERVAL_MS[statusRef.current]);
        return;
      }
      try {
        const resp = await fetch("/api/agents/preview-server", { cache: "no-store" });
        if (resp.ok) {
          const data = (await resp.json()) as ServerSnapshot;
          if (!cancelled) {
            statusRef.current = data.status;
            setSnap(data);
          }
        }
      } catch {
        /* network blip — keep polling at the current cadence */
      }
      if (cancelled) return;
      timer = setTimeout(tick, INTERVAL_MS[statusRef.current]);
    }

    tick();

    function onVisibility() {
      // When the tab becomes visible again, fire immediately so the user
      // sees fresh state without waiting for the next scheduled tick.
      if (document.visibilityState === "visible") {
        if (timer) clearTimeout(timer);
        tick();
      }
    }
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibility);
    }

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibility);
      }
    };
  }, []);

  return snap;
}
