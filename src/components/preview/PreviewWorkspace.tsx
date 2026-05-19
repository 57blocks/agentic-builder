"use client";

import { useRef } from "react";
import PreviewPanel from "@/components/PreviewPanel";
import ConsolePanel from "./console/ConsolePanel";
import { useIframeConsole } from "./console/useIframeConsole";
import { usePreviewServerLogs } from "./usePreviewServerLogs";
import CodeChatPanel, { type CodeChatPanelHandle } from "@/components/code-chat/CodeChatPanel";

interface Props {
  codeOutputDir: string;
}

export default function PreviewWorkspace({ codeOutputDir }: Props) {
  const { entries, clear } = useIframeConsole();
  const { logs } = usePreviewServerLogs();
  const chatRef = useRef<CodeChatPanelHandle>(null);

  const handleAskAI = (snippet: string) => {
    chatRef.current?.attachContext(snippet);
  };

  return (
    <div className="flex h-full w-full overflow-hidden">
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1">
          <PreviewPanel codeOutputDir={codeOutputDir} />
        </div>
        <div className="h-[260px] shrink-0">
          <ConsolePanel
            browserEntries={entries}
            onClearBrowser={clear}
            serverLogs={logs}
            onAskAI={handleAskAI}
          />
        </div>
      </div>
      <div style={{ flex: '0 0 380px', minWidth: 0 }} className="border-l border-zinc-200">
        <CodeChatPanel ref={chatRef} codeOutputDir={codeOutputDir} />
      </div>
    </div>
  );
}
