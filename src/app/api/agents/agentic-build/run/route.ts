import { NextRequest } from "next/server";
import {
  LocalBuildExecutor,
  ContainerBuildExecutor,
  runBuildPlan,
  resolveWorkspaceDir,
  type BuildExecutor,
  type BuildPlan,
  type BuildPlanDraft,
} from "@/lib/agentic-build";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

console.log("[agentic-build/run route] module loaded");

interface RunRequest {
  /** The (reviewed/edited) plan. workspaceDir is optional — resolved here. */
  plan: BuildPlanDraft & { workspaceDir?: string };
  /** Absolute target dir, or relative slug under agentic-builds/. Overrides
   *  plan.workspaceDir when set. */
  workspaceDir?: string;
  maxAttemptsPerMilestone?: number;
  maxStepsPerAttempt?: number;
  model?: string;
  resume?: boolean;
  /** Where commands execute. Defaults to "local". */
  sandbox?: "local" | "container";
  /** Container image (sandbox=container only). */
  containerImage?: string;
}

/** SSE-tagged event union the browser consumes. */
type SseEvent =
  | { type: "ready"; workspaceDir: string; milestones: number }
  | { type: "orchestrator"; event: unknown }
  | { type: "agent"; milestoneId: string; event: unknown }
  | { type: "result"; result: unknown }
  | { type: "error"; message: string };

const HEARTBEAT_MS = 15_000;

function sse(event: SseEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(request: NextRequest) {
  console.log("[agentic-build/run route] POST received");

  let body: RunRequest;
  try {
    body = (await request.json()) as RunRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const draft = body?.plan;
  if (!draft || !Array.isArray(draft.milestones) || draft.milestones.length === 0) {
    return Response.json(
      { error: "plan.milestones is required and must be non-empty" },
      { status: 400 },
    );
  }

  const workspaceDir = await resolveWorkspaceDir(
    draft.projectName,
    body.workspaceDir ?? draft.workspaceDir,
  );
  const plan: BuildPlan = {
    projectName: draft.projectName,
    workspaceDir,
    context: draft.context,
    milestones: draft.milestones,
  };

  const encoder = new TextEncoder();
  const controller = new AbortController();
  request.signal.addEventListener("abort", () => controller.abort());

  const stream = new ReadableStream<Uint8Array>({
    async start(streamCtrl) {
      const emit = (event: SseEvent) => {
        try {
          streamCtrl.enqueue(encoder.encode(sse(event)));
        } catch {
          /* stream closed */
        }
      };
      const enqueueRaw = (line: string) => {
        try {
          streamCtrl.enqueue(encoder.encode(line));
        } catch {
          /* stream closed */
        }
      };
      const heartbeat = setInterval(() => {
        enqueueRaw(`: keepalive ${Date.now()}\n\n`);
      }, HEARTBEAT_MS);

      emit({ type: "ready", workspaceDir, milestones: plan.milestones.length });

      const useContainer = body.sandbox === "container";
      let container: ContainerBuildExecutor | null = null;
      try {
        let executor: BuildExecutor;
        if (useContainer) {
          container = new ContainerBuildExecutor({
            workspaceDir,
            image: body.containerImage,
          });
          await container.start();
          executor = container;
        } else {
          executor = new LocalBuildExecutor(workspaceDir);
        }

        const result = await runBuildPlan({
          plan,
          executor,
          maxAttemptsPerMilestone: body.maxAttemptsPerMilestone,
          maxStepsPerAttempt: body.maxStepsPerAttempt,
          model: body.model,
          resume: body.resume,
          emit: (event) => emit({ type: "orchestrator", event }),
          onAgentEvent: (milestoneId, event) =>
            emit({ type: "agent", milestoneId, event }),
        });
        emit({ type: "result", result });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[agentic-build/run] failed:", message);
        emit({ type: "error", message });
      } finally {
        if (container) await container.stop();
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
