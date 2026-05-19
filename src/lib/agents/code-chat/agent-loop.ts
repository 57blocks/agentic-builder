import { streamChatCompletion } from "@/lib/openrouter";
import type { ChatMessage } from "@/lib/openrouter";
import { CODE_CHAT_TOOL_DEFS } from "./tool-defs";
import { dispatchTool, type ToolHandlerContext } from "./tool-handlers";
import { parseSseStream } from "./sse-parser";
import type { CodeChatEvent } from "./types";

const DEFAULT_MODEL = process.env.CODE_CHAT_MODEL || "anthropic/claude-sonnet-4";
const MAX_ITERATIONS = 8;

interface PartialToolCall {
  id: string;
  name: string;
  argsBuffer: string;
}

export interface RunCodeChatOptions {
  messages: ChatMessage[];
  ctx: ToolHandlerContext;
  emit: (event: CodeChatEvent) => void;
  model?: string;
  /** Receives an AbortSignal so the caller can cancel ongoing fetches. */
  signal?: AbortSignal;
}

/**
 * Stream a single chat turn, executing tool calls until the model produces a
 * final assistant message (no tool calls) or the iteration cap is reached.
 *
 * Mutates `messages` in place with assistant / tool messages so callers can
 * inspect the final transcript.
 */
export async function runCodeChat(opts: RunCodeChatOptions): Promise<void> {
  const { ctx, emit, signal } = opts;
  const messages = opts.messages;
  const model = opts.model || DEFAULT_MODEL;

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    if (signal?.aborted) {
      emit({ kind: "error", message: "Cancelled." });
      return;
    }

    const body = await streamChatCompletion(messages, {
      model,
      tools: CODE_CHAT_TOOL_DEFS,
      tool_choice: "auto",
      temperature: 0.2,
      max_tokens: 4096,
      reasoning: { enabled: true },
    });

    let assistantContent = "";
    const toolCalls = new Map<number, PartialToolCall>();
    let finishReason: string | null = null;

    for await (const evt of parseSseStream(body as ReadableStream<Uint8Array>)) {
      if (signal?.aborted) {
        emit({ kind: "error", message: "Cancelled." });
        return;
      }
      const choice = (evt as { choices?: Array<{ delta?: Record<string, unknown>; finish_reason?: string | null }> }).choices?.[0];
      if (!choice) continue;
      const delta = choice.delta ?? {};
      if (choice.finish_reason) finishReason = choice.finish_reason;

      const contentDelta = delta.content;
      if (typeof contentDelta === "string" && contentDelta) {
        assistantContent += contentDelta;
        emit({ kind: "assistant_delta", delta: contentDelta });
      }

      const reasoning = delta.reasoning;
      let thinkingDelta: string | null = null;
      if (typeof reasoning === "string") {
        thinkingDelta = reasoning;
      } else if (reasoning && typeof reasoning === "object") {
        const r = reasoning as Record<string, unknown>;
        if (typeof r.content === "string") thinkingDelta = r.content;
        else if (typeof r.text === "string") thinkingDelta = r.text;
      } else if (typeof delta.reasoning_content === "string") {
        thinkingDelta = delta.reasoning_content;
      }
      if (thinkingDelta) emit({ kind: "thinking_delta", delta: thinkingDelta });

      const deltaToolCalls = delta.tool_calls;
      if (Array.isArray(deltaToolCalls)) {
        for (const tc of deltaToolCalls) {
          const t = tc as {
            index?: number;
            id?: string;
            function?: { name?: string; arguments?: string };
          };
          const idx = t.index ?? 0;
          let entry = toolCalls.get(idx);
          if (!entry) {
            entry = {
              id: t.id || `call_${idx}_${Date.now().toString(36)}`,
              name: t.function?.name || "",
              argsBuffer: "",
            };
            toolCalls.set(idx, entry);
          }
          if (t.id && !entry.id.startsWith("call_")) entry.id = t.id;
          if (t.id) entry.id = t.id;
          if (t.function?.name && !entry.name) {
            entry.name = t.function.name;
            emit({ kind: "tool_call_start", id: entry.id, name: entry.name });
          }
          const argDelta = t.function?.arguments;
          if (typeof argDelta === "string" && argDelta) {
            entry.argsBuffer += argDelta;
            emit({ kind: "tool_call_args_delta", id: entry.id, delta: argDelta });
          }
        }
      }
    }

    if (toolCalls.size === 0) {
      messages.push({ role: "assistant", content: assistantContent });
      emit({ kind: "done", iterations: iter + 1 });
      return;
    }

    const orderedCalls = [...toolCalls.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, v]) => v);

    messages.push({
      role: "assistant",
      content: assistantContent,
      tool_calls: orderedCalls.map((c) => ({
        id: c.id,
        type: "function",
        function: { name: c.name, arguments: c.argsBuffer || "{}" },
      })),
    });

    for (const call of orderedCalls) {
      let parsedArgs: unknown = {};
      try {
        parsedArgs = call.argsBuffer ? JSON.parse(call.argsBuffer) : {};
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        emit({
          kind: "tool_result",
          id: call.id,
          name: call.name,
          ok: false,
          summary: `${call.name}: invalid JSON args (${message})`,
        });
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: `Error: tool arguments were not valid JSON: ${message}`,
        });
        continue;
      }

      const result = await dispatchTool(call.name, parsedArgs, ctx);
      emit({
        kind: "tool_result",
        id: call.id,
        name: call.name,
        ok: result.ok,
        summary: result.summary,
        fileEdit: result.fileEdit,
        preview: result.preview,
      });
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: result.modelContent,
      });
    }

    if (finishReason && finishReason !== "tool_calls") {
      emit({ kind: "done", iterations: iter + 1 });
      return;
    }
  }

  emit({ kind: "error", message: `Hit iteration cap (${MAX_ITERATIONS}) without producing a final reply.` });
  emit({ kind: "done", iterations: MAX_ITERATIONS });
}
