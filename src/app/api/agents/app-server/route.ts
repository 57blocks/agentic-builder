import { NextRequest } from "next/server";
import {
  startAppServer,
  stopAppServer,
  getAppServerStatus,
  checkAppHealth,
} from "@/lib/pipeline/app-server-manager";

export const maxDuration = 120;

/** GET — return current status + health check */
export async function GET(req: NextRequest) {
  const baseUrl = req.nextUrl.searchParams.get("baseUrl") ?? "http://localhost:5173";
  const status = getAppServerStatus();
  const healthy = await checkAppHealth(baseUrl);
  return Response.json({ ...status, healthy });
}

/** POST — start the dev server (SSE stream for startup logs) */
export async function POST(req: NextRequest) {
  const { outputDir, port = 5173 } = await req.json() as { outputDir: string; port?: number };

  if (!outputDir) {
    return Response.json({ error: "outputDir is required" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  let clientAborted = false;

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: unknown) {
        if (clientAborted) return;
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)); }
        catch { clientAborted = true; }
      }

      req.signal.addEventListener("abort", () => { clientAborted = true; });

      try {
        send({ type: "status", status: "starting" });
        await startAppServer(outputDir, port, (line) => send({ type: "log", line }));
        const s = getAppServerStatus();
        send({ type: "status", status: s.status, error: s.error });
      } catch (err) {
        send({ type: "error", error: err instanceof Error ? err.message : String(err) });
      } finally {
        try { controller.close(); } catch { /* ignore */ }
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}

/** DELETE — stop the dev server */
export async function DELETE() {
  await stopAppServer();
  return Response.json({ ok: true });
}
