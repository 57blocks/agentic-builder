"use client";

import { useState } from "react";

interface Props {
  onAskAI: (snippet: string) => void;
}

export default function PasteTab({ onAskAI }: Props) {
  const [text, setText] = useState("");

  return (
    <div className="flex flex-1 flex-col gap-2 p-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste a console error, stack trace, or any text you want the AI to look at…"
        className="flex-1 resize-none rounded border border-zinc-800 bg-zinc-950 px-2.5 py-2 font-mono text-[11px] text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1"
      />
      <div className="flex justify-end gap-2">
        <button
          onClick={() => setText("")}
          disabled={!text}
          className="rounded border border-zinc-800 px-2.5 py-1 text-[11px] text-zinc-400 transition-colors hover:bg-zinc-800 disabled:opacity-40"
        >
          Clear
        </button>
        <button
          onClick={() => {
            if (text.trim()) {
              onAskAI(text.trim());
              setText("");
            }
          }}
          disabled={!text.trim()}
          className="rounded bg-zinc-200 px-2.5 py-1 text-[11px] font-medium text-zinc-900 transition-colors hover:bg-white disabled:opacity-40"
        >
          Send to AI
        </button>
      </div>
    </div>
  );
}
