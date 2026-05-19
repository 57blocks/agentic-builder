"use client";

import { useImperativeHandle, useState, forwardRef } from "react";
import MessageList from "./MessageList";
import Composer from "./Composer";
import { useCodeChat } from "./useCodeChat";

export interface CodeChatPanelHandle {
  /** Attach a snippet (e.g. a console error) to the composer's pending context. */
  attachContext: (text: string) => void;
}

interface Props {
  codeOutputDir: string;
}

const CodeChatPanel = forwardRef<CodeChatPanelHandle, Props>(function CodeChatPanel(
  { codeOutputDir },
  ref,
) {
  const { messages, streaming, send, stop, reset, markEditReverted } = useCodeChat({ codeOutputDir });
  const [pendingContext, setPendingContext] = useState("");

  useImperativeHandle(
    ref,
    () => ({
      attachContext: (text: string) => {
        setPendingContext((prev) =>
          prev ? `${prev}\n\n---\n${text}`.slice(0, 8000) : text.slice(0, 8000),
        );
      },
    }),
    [],
  );

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-zinc-200 bg-zinc-50/60 px-3">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-500">
            <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
          </svg>
          <span className="text-xs font-medium text-zinc-700">AI Chat</span>
        </div>
        <button
          onClick={reset}
          disabled={messages.length === 0 || streaming}
          className="text-[10px] text-zinc-500 transition-colors hover:text-zinc-700 disabled:opacity-40"
        >
          New chat
        </button>
      </div>
      <MessageList
        messages={messages}
        codeOutputDir={codeOutputDir}
        onReverted={markEditReverted}
      />
      <Composer
        pendingContext={pendingContext}
        onClearContext={() => setPendingContext("")}
        onSend={send}
        onStop={stop}
        streaming={streaming}
      />
    </div>
  );
});

export default CodeChatPanel;
