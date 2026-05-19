"use client";

import { useState } from "react";
import BrowserConsoleTab from "./BrowserConsoleTab";
import DevServerLogsTab from "./DevServerLogsTab";
import PasteTab from "./PasteTab";
import type { BrowserConsoleEntry } from "./types";
import type { ServerLogLine } from "../usePreviewServerLogs";

type Tab = "browser" | "server" | "paste";

interface Props {
  browserEntries: BrowserConsoleEntry[];
  onClearBrowser: () => void;
  serverLogs: ServerLogLine[];
  onAskAI: (snippet: string) => void;
}

export default function ConsolePanel({
  browserEntries,
  onClearBrowser,
  serverLogs,
  onAskAI,
}: Props) {
  const [tab, setTab] = useState<Tab>("browser");
  const browserErrorCount = browserEntries.filter((e) => e.level === "error").length;
  const serverErrorCount = serverLogs.filter((l) => l.stream === "stderr").length;
  const tabs: Array<{ key: Tab; label: string; badge?: number }> = [
    { key: "browser", label: "Browser", badge: browserErrorCount || undefined },
    { key: "server", label: "Dev Server", badge: serverErrorCount || undefined },
    { key: "paste", label: "Paste" },
  ];

  return (
    <div className="flex h-full flex-col border-t border-zinc-200 bg-zinc-950">
      <div className="flex h-9 shrink-0 items-center gap-0.5 border-b border-zinc-800 bg-zinc-900 px-1">
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
                active
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300"
              }`}
            >
              {t.label}
              {t.badge ? (
                <span
                  className={`rounded px-1 text-[9px] font-semibold ${
                    t.key === "server"
                      ? "bg-amber-500/20 text-amber-300"
                      : "bg-red-500/20 text-red-300"
                  }`}
                >
                  {t.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="flex flex-1 overflow-hidden">
        {tab === "browser" && (
          <BrowserConsoleTab
            entries={browserEntries}
            onAskAI={onAskAI}
            onClear={onClearBrowser}
          />
        )}
        {tab === "server" && <DevServerLogsTab logs={serverLogs} onAskAI={onAskAI} />}
        {tab === "paste" && <PasteTab onAskAI={onAskAI} />}
      </div>
    </div>
  );
}
