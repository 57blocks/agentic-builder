"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ThinkingBlock from "./ThinkingBlock";
import ToolCallBlock from "./ToolCallBlock";
import FileDiffBlock from "./FileDiffBlock";
import type { UiMessage } from "./types";

/**
 * Some models stream prose without ever emitting blank lines, so a chain of
 * "Let me check X:" / "Now let me check Y:" turns into a single 600-char
 * wall of text. We normalise that *before* feeding markdown: a colon
 * immediately followed by a capital letter (no whitespace between) almost
 * always means the model glued two narrative steps together.
 */
function normaliseAssistantText(raw: string): string {
  return raw
    // ":Now let me…" → ":\n\nNow let me…"
    .replace(/:(?=[A-Z][a-z])/g, ":\n\n")
    // ".Now let me…" / "?Now let me…" — same idea, sentence-end joined to
    // the next sentence with no space.
    .replace(/([.!?])(?=[A-Z][a-z]{2,})/g, "$1\n\n")
    .trim();
}

interface Props {
  message: UiMessage;
  codeOutputDir: string;
  onReverted: (editId: string) => void;
}

export default function MessageBubble({ message, codeOutputDir, onReverted }: Props) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[88%] rounded-2xl rounded-tr-sm bg-zinc-900 px-3.5 py-2 text-[12.5px] leading-relaxed text-white">
          <div className="whitespace-pre-wrap">{message.text}</div>
          {message.attachedContext && (
            <details className="mt-1.5 border-t border-white/15 pt-1.5">
              <summary className="cursor-pointer text-[10.5px] text-white/60 transition-colors hover:text-white/80">
                Attached context
              </summary>
              <pre className="mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap rounded bg-black/20 px-2 py-1 font-mono text-[10px] text-white/70">
                {message.attachedContext}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="w-full max-w-full text-[12.5px] leading-relaxed text-zinc-800">
        {message.segments.length === 0 && message.status === "streaming" && (
          <div className="flex items-center gap-2 text-[11px] text-zinc-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-400" />
            Working…
          </div>
        )}
        {message.segments.map((seg) => {
          if (seg.kind === "thinking") {
            return <ThinkingBlock key={seg.id} text={seg.text} streaming={!seg.done && message.status === "streaming"} />;
          }
          if (seg.kind === "text") {
            return (
              <div
                key={seg.id}
                className="my-2 space-y-2 text-[12.5px] leading-relaxed text-zinc-800 [&_a]:text-zinc-700 [&_a]:underline [&_a]:underline-offset-2 [&_code]:rounded [&_code]:bg-zinc-100 [&_code]:px-1 [&_code]:py-[1px] [&_code]:font-mono [&_code]:text-[11.5px] [&_code]:text-zinc-700 [&_h1]:text-[13.5px] [&_h1]:font-semibold [&_h2]:text-[13px] [&_h2]:font-semibold [&_h3]:text-[12.5px] [&_h3]:font-semibold [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:border [&_pre]:border-zinc-200 [&_pre]:bg-zinc-50 [&_pre]:p-2 [&_pre]:text-[11px] [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5"
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {normaliseAssistantText(seg.text)}
                </ReactMarkdown>
              </div>
            );
          }
          if (seg.kind === "tool") {
            return (
              <div key={seg.id}>
                <ToolCallBlock name={seg.name} argsPreview={seg.argsPreview} result={seg.result} />
                {seg.fileEdit && (
                  <FileDiffBlock
                    edit={seg.fileEdit}
                    codeOutputDir={codeOutputDir}
                    onReverted={onReverted}
                  />
                )}
              </div>
            );
          }
          return null;
        })}
        {message.status === "error" && (
          <div className="my-1 rounded border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] text-red-700">
            {message.errorText || "Something went wrong."}
          </div>
        )}
      </div>
    </div>
  );
}
