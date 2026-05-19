import { NextRequest } from "next/server";
import path from "path";
import fs from "fs/promises";
import { resolveCodeOutputRoot } from "@/lib/pipeline/code-output";
import { runCodeChat } from "@/lib/agents/code-chat/agent-loop";
import { CODE_CHAT_SYSTEM_PROMPT } from "@/lib/agents/code-chat/system-prompt";
import type { ChatMessage } from "@/lib/openrouter";
import type { CodeChatEvent, CodeChatTurnRequest } from "@/lib/agents/code-chat/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FRONTEND_SUBDIR_CANDIDATES = [
  "frontend",
  "apps/web",
  "apps/frontend",
  "web",
  "app",
  "client",
];

async function resolveAppDir(outputRoot: string): Promise<string | null> {
  const tryAt = async (dir: string) =>
    fs.access(path.join(dir, "package.json")).then(() => true).catch(() => false);
  if (await tryAt(outputRoot)) return outputRoot;
  for (const sub of FRONTEND_SUBDIR_CANDIDATES) {
    const candidate = path.join(outputRoot, sub);
    if (await tryAt(candidate)) return candidate;
  }
  return null;
}

function sseEncode(event: CodeChatEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/**
 * Heartbeat interval — emit an SSE comment line on this cadence to keep
 * intermediate proxies (and the browser's idle-stream detector) from
 * tearing down the connection while we're waiting on a slow upstream LLM
 * token. The comment is invisible to the client app logic but counts as
 * "activity" for the watchdog in useCodeChat.
 */
const HEARTBEAT_MS = 15_000;

export async function POST(request: NextRequest) {
  let body: CodeChatTurnRequest;
  try {
    body = (await request.json()) as CodeChatTurnRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body?.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    return Response.json({ error: "messages is required" }, { status: 400 });
  }

  const outputRoot = resolveCodeOutputRoot(process.cwd(), body.codeOutputDir);
  const appDir = await resolveAppDir(outputRoot);
  if (!appDir) {
    return Response.json(
      { error: `No package.json found in ${outputRoot} (also checked ${FRONTEND_SUBDIR_CANDIDATES.join(", ")})` },
      { status: 400 },
    );
  }

  const conversation: ChatMessage[] = [];
  if (!body.messages.some((m) => m.role === "system")) {
    conversation.push({ role: "system", content: CODE_CHAT_SYSTEM_PROMPT });
  }
  for (const m of body.messages) conversation.push(m);

  if (body.attachedContext?.trim()) {
    const last = conversation[conversation.length - 1];
    if (last?.role === "user") {
      last.content = `${last.content}\n\n---\nAttached context:\n${body.attachedContext.trim()}`;
    }
  }

  const encoder = new TextEncoder();
  const controller = new AbortController();
  request.signal.addEventListener("abort", () => controller.abort());

  const stream = new ReadableStream<Uint8Array>({
    async start(streamCtrl) {
      const emit = (event: CodeChatEvent) => {
        try {
          streamCtrl.enqueue(encoder.encode(sseEncode(event)));
        } catch {
          /* stream already closed */
        }
      };
      const enqueueRaw = (line: string) => {
        try {
          streamCtrl.enqueue(encoder.encode(line));
        } catch {
          /* stream already closed */
        }
      };

      // Heartbeat: send a single SSE comment every HEARTBEAT_MS so the
      // client's idle watchdog sees activity even while we're blocked on
      // the upstream LLM. SSE comments are lines beginning with ":" and
      // are ignored by EventSource / consumeSse alike.
      const heartbeat = setInterval(() => {
        enqueueRaw(`: keepalive ${Date.now()}\n\n`);
      }, HEARTBEAT_MS);

      emit({ kind: "ready", appDir: path.relative(outputRoot, appDir) || "." });

      try {
        await runCodeChat({
          messages: conversation,
          ctx: { appDir },
          emit,
          model: body.model,
          signal: controller.signal,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        // Surface the failure server-side too so it's visible in `next dev`
        // logs — otherwise an upstream 5xx silently looks like "no output".
        console.error("[code-chat] run failed:", message);
        emit({ kind: "error", message });
        emit({ kind: "done", iterations: 0 });
      } finally {
        clearInterval(heartbeat);
        streamCtrl.close();
      }
    },
    cancel() {
      controller.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
