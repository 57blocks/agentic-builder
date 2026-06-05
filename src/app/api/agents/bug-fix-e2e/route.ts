import { NextRequest } from "next/server";
import {
  e2eVerifyBugFix,
  type E2eProgressEvent,
} from "@/lib/pipeline/bug-fix-e2e-verify";
import type { BugReport } from "@/lib/pipeline/bug-fix-session";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    bug: BugReport;
    baseUrl?: string;
  };

  const { bug, baseUrl = "http://localhost:5173" } = body;

  if (!bug?.id || !bug?.title) {
    return Response.json({ error: "bug.id and bug.title are required" }, { status: 400 });
  }

  const encoder = new TextEncoder();
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

      req.signal.addEventListener("abort", () => { clientAborted = true; });

      const onProgress = (event: E2eProgressEvent) => {
        send({ type: "progress", event });
      };

      try {
        const result = await e2eVerifyBugFix(bug, baseUrl, onProgress);
        send({ type: "done", result });
      } catch (err) {
        send({
          type: "error",
          error: err instanceof Error ? err.message : String(err),
        });
      } finally {
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
