import { streamChatCompletion } from "@/lib/openrouter";
import type { ChatMessage } from "@/lib/openrouter";
import { CODE_CHAT_TOOL_DEFS } from "./tool-defs";
import { dispatchTool, type ToolHandlerContext } from "./tool-handlers";
import { parseSseStream } from "./sse-parser";
import type { CodeChatEvent } from "./types";

const DEFAULT_MODEL = process.env.CODE_CHAT_MODEL || "anthropic/claude-sonnet-4";
const MAX_ITERATIONS = 8;

/**
 * Max consecutive iterations where the model produced text but zero tool
 * calls. If we cross this, surface a clear error to the UI instead of
 * looping silently — the user can then nudge the model, retry, or switch
 * model.
 */
const MAX_EMPTY_TOOL_ITERATIONS = 2;

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

  // Log the resolved model + provider once per turn so the operator can tell
  // from `next dev` output whether OpenRouter or some env-driven direct
  // provider (DeepSeek V4 / Gemini) is actually serving this chat.
  console.log(
    `[code-chat] starting agent loop  model=${model}  forceOpenRouter=true  tools=${CODE_CHAT_TOOL_DEFS.length}  history=${messages.length}`,
  );

  let emptyToolIters = 0;

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    if (signal?.aborted) {
      emit({ kind: "error", message: "Cancelled." });
      return;
    }

    const body = await streamChatCompletion(messages, {
      model,
      tools: CODE_CHAT_TOOL_DEFS,
      // On iterations where the model just narrated without calling tools,
      // upgrade tool_choice to "required" so it's forced to actually invoke
      // a tool on the next turn. Without this, models that prefer prose
      // (e.g. DeepSeek-style chains that have been silently routed in)
      // can monologue indefinitely.
      tool_choice: emptyToolIters > 0 ? "required" : "auto",
      temperature: 0.2,
      max_tokens: 4096,
      reasoning: { enabled: true },
      // Critical: tool-calling protocol differs between providers. The UI
      // assumes OpenAI / Anthropic tool_calls delta shape (which OpenRouter
      // normalises). DeepSeek direct emits a different shape and hangs the
      // chat. Pin this route to OpenRouter regardless of DEEPSEEK_API_KEY.
      forceOpenRouter: true,
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
      // If we got real prose back AND the model decided it was done (finish
      // reason wasn't "tool_calls"), respect that and return — typical
      // happy-path "final reply" termination.
      if (assistantContent.trim() && finishReason && finishReason !== "tool_calls") {
        messages.push({ role: "assistant", content: assistantContent });
        emit({ kind: "done", iterations: iter + 1 });
        return;
      }

      // Otherwise we just got narration with no action — likely the model
      // is monologuing instead of using its tools. Bump the counter, force
      // tools next turn (see tool_choice above), and only bail with a
      // human-readable error if it keeps happening.
      emptyToolIters++;
      messages.push({ role: "assistant", content: assistantContent });
      if (emptyToolIters >= MAX_EMPTY_TOOL_ITERATIONS) {
        emit({
          kind: "error",
          message:
            `Model produced ${emptyToolIters} consecutive replies without using any tool — it can't fix the project without reading or editing files. ` +
            `Try sending a more specific message, or set CODE_CHAT_MODEL to a model with stronger tool-use (e.g. anthropic/claude-sonnet-4, anthropic/claude-opus-4).`,
        });
        emit({ kind: "done", iterations: iter + 1 });
        return;
      }
      // Nudge the model with a tool-use reminder; this is invisible to the
      // user but unblocks looping models on the next iteration.
      messages.push({
        role: "user",
        content:
          "You did not call any tool. Take action by calling read_file / list_files / grep / edit_file / write_file with the necessary arguments now — do not just describe what you would check.",
      });
      continue;
    }

    // Reset the counter once we see real tool activity.
    emptyToolIters = 0;

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
