import { NextRequest } from "next/server";
import { resolveCodeOutputRoot } from "@/lib/pipeline/code-output";
import { activeCodingSessions } from "../session-registry";

/**
 * Abort any in-flight coding session for the given output directory.
 * Called by the frontend before starting a new session so stale backend
 * processes do not continue writing files in the background.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as { codeOutputDir?: string };
  const outputRoot = resolveCodeOutputRoot(process.cwd(), body.codeOutputDir);

  const controller = activeCodingSessions.get(outputRoot);
  if (controller && !controller.signal.aborted) {
    controller.abort();
    activeCodingSessions.delete(outputRoot);
    console.log(`[CodingAbort] Aborted active session for ${outputRoot}`);
    return Response.json({ aborted: true });
  }

  return Response.json({ aborted: false });
}
