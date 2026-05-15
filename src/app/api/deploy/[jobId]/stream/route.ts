import { NextRequest } from "next/server";
import { getJob } from "@/lib/deploy/job-manager";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const job = getJob(jobId);

  if (!job) {
    return new Response("Job not found", { status: 404 });
  }

  const encoder = new TextEncoder();

  let savedController: ReadableStreamDefaultController<Uint8Array> | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // Send all steps so far (catch-up for reconnecting clients)
      for (const step of job.steps) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(step)}\n\n`));
      }

      if (job.status !== "running") {
        controller.close();
        return;
      }

      savedController = controller;
      job.subscribers.add(controller);
    },
    cancel() {
      if (savedController) job.subscribers.delete(savedController);
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
