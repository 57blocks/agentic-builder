import {
  chatCompletionWithFallback,
  type ChatMessage,
  type OpenRouterOptions,
} from "@/lib/openrouter";

/**
 * Helpers around the OpenRouter chat-completion call that recover from
 * common error patterns (orphan tool messages, context-length exceeded …).
 */

export function isToolSequenceValidationError(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes("messages with role 'tool'") && m.includes("tool_calls");
}

export function countRemovedOrphanToolMessages(
  messages: ChatMessage[],
): number {
  let removed = 0;
  const cleaned: ChatMessage[] = [];
  let pendingToolCallIds = new Set<string>();

  for (const msg of messages) {
    if (msg.role === "assistant" && (msg.tool_calls?.length ?? 0) > 0) {
      pendingToolCallIds = new Set(
        (msg.tool_calls ?? []).map((tc) => tc.id).filter(Boolean),
      );
      cleaned.push(msg);
      continue;
    }

    if (msg.role === "tool") {
      const toolCallId = msg.tool_call_id ?? "";
      if (toolCallId && pendingToolCallIds.has(toolCallId)) {
        cleaned.push(msg);
        pendingToolCallIds.delete(toolCallId);
      } else {
        removed++;
      }
      continue;
    }

    pendingToolCallIds = new Set<string>();
    cleaned.push(msg);
  }

  messages.splice(0, messages.length, ...cleaned);
  return removed;
}

export function isContextLengthError(message: string): boolean {
  return /context(?: length| window)?|maximum context|context_length_exceeded|too many tokens|prompt is too long|token limit/i.test(
    message,
  );
}

export async function callWithOrphanToolRetry(
  label: string,
  messages: ChatMessage[],
  modelChain: string[],
  options: Omit<OpenRouterOptions, "model">,
) {
  try {
    return await chatCompletionWithFallback(messages, modelChain, options);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!isToolSequenceValidationError(msg)) {
      throw e;
    }
    const removed = countRemovedOrphanToolMessages(messages);
    console.warn(
      `${label}: detected tool-call sequence error; cleaned ${removed} orphan tool message(s) and retrying once.`,
    );
    if (removed <= 0) {
      throw e;
    }
    return chatCompletionWithFallback(messages, modelChain, options);
  }
}
