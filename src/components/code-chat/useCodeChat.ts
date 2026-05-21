"use client";

import { useCallback, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/openrouter";
import type { CodeChatEvent } from "@/lib/agents/code-chat/types";
import type { AssistantMessage, UiMessage, UiSegment } from "./types";

function makeId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

/** Convert UI messages back into the wire-format conversation. */
function toWireMessages(history: UiMessage[]): ChatMessage[] {
  const out: ChatMessage[] = [];
  for (const m of history) {
    if (m.role === "user") {
      out.push({ role: "user", content: m.text });
    } else {
      const text = m.segments
        .filter((s): s is Extract<UiSegment, { kind: "text" }> => s.kind === "text")
        .map((s) => s.text)
        .join("");
      out.push({ role: "assistant", content: text });
    }
  }
  return out;
}

export interface UseCodeChatOptions {
  codeOutputDir: string;
}

export function useCodeChat({ codeOutputDir }: UseCodeChatOptions) {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages([]);
    setStreaming(false);
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const send = useCallback(
    async (text: string, attachedContext?: string) => {
      if (!text.trim() && !attachedContext?.trim()) return;
      const userMsg: UiMessage = {
        role: "user",
        id: makeId("u"),
        text: text.trim(),
        attachedContext,
      };
      const assistantId = makeId("a");
      const assistant: AssistantMessage = {
        role: "assistant",
        id: assistantId,
        segments: [],
        status: "streaming",
      };
      setMessages((prev) => [...prev, userMsg, assistant]);

      const controller = new AbortController();
      abortRef.current = controller;
      setStreaming(true);

      const wire = [
        ...toWireMessages(messages),
        { role: "user" as const, content: text.trim() },
      ];

      const startedAt = Date.now();
      console.log(
        `[code-chat client] POST start  history=${wire.length}  attachedCtx=${attachedContext ? "yes" : "no"}`,
      );

      try {
        const resp = await fetch("/api/agents/code-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: wire,
            codeOutputDir,
            attachedContext,
          }),
          signal: controller.signal,
        });
        if (!resp.ok || !resp.body) {
          const errText = (await resp.text().catch(() => "")) || `HTTP ${resp.status}`;
          console.error(
            `[code-chat client] non-OK response  status=${resp.status}  body=${errText.slice(0, 200)}`,
          );
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId && m.role === "assistant"
                ? { ...m, status: "error", errorText: errText }
                : m,
            ),
          );
          return;
        }
        console.log(
          `[code-chat client] response headers received  status=${resp.status}  elapsed=${Date.now() - startedAt}ms`,
        );
        let stalled = false;
        await consumeSse(
          resp.body,
          (evt) => applyEvent(assistantId, evt),
          controller,
          () => {
            stalled = true;
            console.warn(
              `[code-chat client] stream stalled  elapsed=${Date.now() - startedAt}ms`,
            );
          },
        );
        console.log(
          `[code-chat client] stream finished  stalled=${stalled}  total=${Date.now() - startedAt}ms`,
        );
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== assistantId || m.role !== "assistant") return m;
            if (stalled) {
              return {
                ...m,
                status: "error",
                errorText:
                  "Stream stalled — the model went silent for too long. Try again, or break the request into smaller pieces.",
              };
            }
            if (m.status === "streaming") return { ...m, status: "done" };
            return m;
          }),
        );
      } catch (err) {
        const aborted = (err as { name?: string })?.name === "AbortError";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId && m.role === "assistant"
              ? {
                  ...m,
                  status: aborted ? "done" : "error",
                  errorText: aborted ? undefined : err instanceof Error ? err.message : String(err),
                }
              : m,
          ),
        );
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [codeOutputDir, messages],
  );

  function applyEvent(assistantId: string, evt: CodeChatEvent) {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== assistantId || m.role !== "assistant") return m;
        const segs = [...m.segments];
        switch (evt.kind) {
          case "assistant_delta": {
            const last = segs[segs.length - 1];
            if (last && last.kind === "text") {
              segs[segs.length - 1] = { ...last, text: last.text + evt.delta };
            } else {
              segs.push({ kind: "text", id: makeId("t"), text: evt.delta });
            }
            break;
          }
          case "thinking_delta": {
            const last = segs[segs.length - 1];
            if (last && last.kind === "thinking" && !last.done) {
              segs[segs.length - 1] = { ...last, text: last.text + evt.delta };
            } else {
              segs.push({ kind: "thinking", id: makeId("k"), text: evt.delta, done: false });
            }
            break;
          }
          case "tool_call_start": {
            for (let i = segs.length - 1; i >= 0; i--) {
              const s = segs[i];
              if (s.kind === "thinking" && !s.done) {
                segs[i] = { ...s, done: true };
                break;
              }
            }
            segs.push({
              kind: "tool",
              id: evt.id,
              name: evt.name,
              argsPreview: "",
              argsBuffer: "",
            });
            break;
          }
          case "tool_call_args_delta": {
            const idx = segs.findIndex((s) => s.kind === "tool" && s.id === evt.id);
            if (idx >= 0) {
              const s = segs[idx];
              if (s.kind === "tool") {
                const argsBuffer = s.argsBuffer + evt.delta;
                segs[idx] = {
                  ...s,
                  argsBuffer,
                  argsPreview: argsPreviewFrom(argsBuffer),
                };
              }
            }
            break;
          }
          case "tool_result": {
            const idx = segs.findIndex((s) => s.kind === "tool" && s.id === evt.id);
            if (idx >= 0) {
              const s = segs[idx];
              if (s.kind === "tool") {
                segs[idx] = {
                  ...s,
                  result: { ok: evt.ok, summary: evt.summary, preview: evt.preview },
                  fileEdit: evt.fileEdit,
                };
              }
            }
            break;
          }
          case "error": {
            return {
              ...m,
              status: "error" as const,
              errorText: evt.message,
              segments: segs,
            };
          }
          case "done": {
            return { ...m, status: "done" as const, segments: segs };
          }
          case "ready":
            break;
        }
        return { ...m, segments: segs };
      }),
    );
  }

  const markEditReverted = useCallback((editId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.role !== "assistant") return m;
        let touched = false;
        const segs = m.segments.map((s) => {
          if (s.kind === "tool" && s.fileEdit?.id === editId) {
            touched = true;
            return { ...s, fileEdit: { ...s.fileEdit, reverted: true } };
          }
          return s;
        });
        return touched ? { ...m, segments: segs } : m;
      }),
    );
  }, []);

  return { messages, streaming, send, stop, reset, markEditReverted };
}

function argsPreviewFrom(buffer: string): string {
  try {
    const parsed = JSON.parse(buffer);
    if (parsed && typeof parsed === "object") {
      const obj = parsed as Record<string, unknown>;
      if (typeof obj.path === "string") return obj.path;
      if (typeof obj.dir === "string") return obj.dir;
      if (typeof obj.pattern === "string") return obj.pattern;
    }
  } catch {
    /* args still streaming */
  }
  const m = buffer.match(/"path"\s*:\s*"([^"]*)/);
  if (m) return m[1];
  const d = buffer.match(/"dir"\s*:\s*"([^"]*)/);
  if (d) return d[1];
  const p = buffer.match(/"pattern"\s*:\s*"([^"]*)/);
  if (p) return p[1];
  return "";
}

/** Abort the underlying fetch if no SSE event arrives within this window. */
const IDLE_TIMEOUT_MS = 45_000;

/**
 * Reads SSE events from `body`. If the connection sits idle longer than
 * IDLE_TIMEOUT_MS without producing a payload (data or heartbeat comment),
 * we treat the stream as stalled, call `onStall()` so the caller can mark
 * the message as errored, and abort via the supplied controller. Without
 * this, an upstream hang would leave the UI in a permanent "streaming…"
 * state with no way for the user to know what happened beyond hitting Stop.
 */
async function consumeSse(
  body: ReadableStream<Uint8Array>,
  onEvent: (evt: CodeChatEvent) => void,
  controller: AbortController,
  onStall: () => void,
) {
  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  let stallTimer: ReturnType<typeof setTimeout> | null = null;
  const resetStallTimer = () => {
    if (stallTimer) clearTimeout(stallTimer);
    stallTimer = setTimeout(() => {
      onStall();
      controller.abort();
    }, IDLE_TIMEOUT_MS);
  };
  resetStallTimer();

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      resetStallTimer();
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf("\n\n")) >= 0) {
        const chunk = buffer.slice(0, nl);
        buffer = buffer.slice(nl + 2);
        const line = chunk.trim();
        // SSE comments (used as heartbeats) start with ":" — ignore them but
        // *do* count them as activity so the stall timer keeps resetting.
        if (line.startsWith(":")) continue;
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload) continue;
        try {
          onEvent(JSON.parse(payload) as CodeChatEvent);
        } catch {
          /* malformed */
        }
      }
    }
  } finally {
    if (stallTimer) clearTimeout(stallTimer);
  }
}
