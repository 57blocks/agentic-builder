import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import {
  createRepairEmitter,
  consoleRepairSink,
  registerRepairEmitter,
  unregisterRepairEmitter,
  type RepairEvent,
} from "@/lib/pipeline/self-heal/events";
import { createJsonlRepairSink } from "@/lib/pipeline/self-heal/jsonl-sink";
import path from "path";
import {
  runBugFixSession,
  type BugReport,
} from "@/lib/pipeline/bug-fix-session";

export const maxDuration = 600;

// ── Session registry — allows the /abort endpoint to cancel in-flight sessions ──
const activeSessions = new Map<string, AbortController>();

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    bugs,
    outputDir: rawOutputDir,
    projectContext,
    fileRegistrySnapshot,
    apiContractsSnapshot,
    scaffoldProtectedPaths,
  } = body as {
    bugs: BugReport[];
    outputDir?: string;
    projectContext: string;
    fileRegistrySnapshot?: unknown[];
    apiContractsSnapshot?: unknown[];
    scaffoldProtectedPaths?: string[];
  };

  if (!bugs || !Array.isArray(bugs) || bugs.length === 0) {
    return new Response(JSON.stringify({ error: "bugs array is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (projectContext === undefined || projectContext === null) {
    return new Response(JSON.stringify({ error: "projectContext is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const sessionId = uuidv4();
  const outputDir = rawOutputDir ?? path.resolve(process.cwd(), "generated-code");
  const encoder = new TextEncoder();
  const abortController = new AbortController();

  // Abort any existing session for the same outputDir
  for (const [sid, ctrl] of activeSessions) {
    if (sid.startsWith(outputDir)) ctrl.abort();
  }
  activeSessions.set(`${outputDir}:${sessionId}`, abortController);

  let clientAborted = false;

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: unknown) {
        if (clientAborted) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          clientAborted = true;
        }
      }

      // Propagate client disconnect → abort signal
      req.signal.addEventListener("abort", () => {
        clientAborted = true;
        abortController.abort();
      });

      const sseSink = (event: Omit<RepairEvent, "timestamp"> & { timestamp?: string }) =>
        send({ type: "repair_event", event });

      const emitter = createRepairEmitter([
        sseSink,
        consoleRepairSink,
        createJsonlRepairSink(outputDir),
      ]);

      registerRepairEmitter(sessionId, emitter);

      try {
        send({ type: "session_id", sessionId });

        const result = await runBugFixSession({
          bugs,
          outputDir,
          projectContext,
          fileRegistrySnapshot: (fileRegistrySnapshot as never[]) ?? [],
          apiContractsSnapshot: (apiContractsSnapshot as never[]) ?? [],
          scaffoldProtectedPaths: scaffoldProtectedPaths ?? [],
          sessionId,
          emitter,
          abortSignal: abortController.signal,

        });

        send({ type: "done", result });
      } catch (err) {
        const isAbort = err instanceof Error && err.name === "AbortError";
        send({
          type: isAbort ? "aborted" : "error",
          error: isAbort ? "Session aborted" : (err instanceof Error ? err.message : String(err)),
        });
      } finally {
        activeSessions.delete(`${outputDir}:${sessionId}`);
        unregisterRepairEmitter(sessionId);
        try { controller.close(); } catch { /* already closed */ }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// ── DELETE /api/agents/bug-fix?sessionId=xxx  →  abort a running session ──────
export async function DELETE(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) return Response.json({ error: "sessionId required" }, { status: 400 });

  for (const [key, ctrl] of activeSessions) {
    if (key.endsWith(`:${sessionId}`)) {
      ctrl.abort();
      activeSessions.delete(key);
      return Response.json({ ok: true });
    }
  }
  return Response.json({ ok: false, error: "Session not found" });
}
