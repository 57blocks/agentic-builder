"use client";

import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";
import type { UiMessage } from "./types";

interface Props {
  messages: UiMessage[];
  codeOutputDir: string;
  onReverted: (editId: string) => void;
}

export default function MessageList({ messages, codeOutputDir, onReverted }: Props) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 text-center text-[12px] text-zinc-400">
        <div>
          <p className="font-medium text-zinc-500">Ask AI to fix this project</p>
          <p className="mt-1 text-zinc-400">
            Paste a console error from the panel below, or describe what&apos;s broken. The
            agent will read the code, edit files, and show diffs here.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-3 py-3 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-300 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1">
      {messages.map((m) => (
        <MessageBubble
          key={m.id}
          message={m}
          codeOutputDir={codeOutputDir}
          onReverted={onReverted}
        />
      ))}
      <div ref={endRef} />
    </div>
  );
}
