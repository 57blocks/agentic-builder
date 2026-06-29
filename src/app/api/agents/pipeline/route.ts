import { NextRequest } from "next/server";
import { PipelineEngine } from "@/lib/pipeline/engine";
import { savePipelineSnapshot } from "@/lib/pipeline/pipeline-snapshot";
import type { PipelineEvent } from "@/lib/pipeline/types";
import { wrapPipelineEventHandler } from "@/lib/memory/event-bridge";
import type {
  ClarificationAnswer,
  IntentResult,
} from "@/lib/agents/intent";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    featureBrief: featureBriefRaw,
    codeOutputDir,
    fastFromPrd,
    pauseAfterPrd,
    sessionId,
    prdEditInstruction,
    existingPrd,
    propagateAfterEdit,
    prdIntent,
  } = body as {
    featureBrief?: string;
    codeOutputDir?: string;
    fastFromPrd?: boolean;
    pauseAfterPrd?: boolean;
    /** Stable client-generated id linking this pipeline run with a
     *  subsequent kickoff so memory records share the same kickoffId. */
    sessionId?: string;
    prdEditInstruction?: string;
    existingPrd?: string;
    /** When true (alongside prdEditInstruction): after the PRD edit,
     *  regenerate downstream docs and produce an incremental task
     *  delta. See engine.runIncrementalDownstream for details. */
    propagateAfterEdit?: boolean;
    /** User-confirmed answers to PRD intent clarifications. Optional —
     *  when present, the engine prepends them to the PRD agent context. */
    prdIntent?: {
      result?: IntentResult;
      answers?: ClarificationAnswer[];
    };
  };

  const featureBrief =
    typeof featureBriefRaw === "string" && featureBriefRaw.trim()
      ? featureBriefRaw.trim()
      : "PRD-driven code generation.";

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: PipelineEvent) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
        );
      }

      const projectRoot = process.cwd();
      const memoryAwareSend = wrapPipelineEventHandler(send, {
        projectRoot,
        codeOutputDir:
          typeof codeOutputDir === "string" ? codeOutputDir : undefined,
        featureBrief,
        kickoffIdOverride:
          typeof sessionId === "string" && sessionId.length > 0
            ? sessionId
            : undefined,
      });
      const engine = new PipelineEngine(memoryAwareSend, projectRoot);
      const run = engine.createRun(
        featureBrief,
        typeof sessionId === "string" && sessionId.length > 0
          ? sessionId
          : undefined,
      );

      try {
        const result = await engine.executePipeline(run, {
          codeOutputDir:
            typeof codeOutputDir === "string" ? codeOutputDir : undefined,
          fastFromPrd: fastFromPrd === true,
          pauseAfterPrd: pauseAfterPrd === true,
          prdEditInstruction:
            typeof prdEditInstruction === "string" && prdEditInstruction.trim()
              ? prdEditInstruction.trim()
              : undefined,
          existingPrd:
            typeof existingPrd === "string" && existingPrd.trim()
              ? existingPrd.trim()
              : undefined,
          propagateAfterEdit: propagateAfterEdit === true,
          prdIntent:
            prdIntent &&
            prdIntent.result &&
            Array.isArray(prdIntent.answers) &&
            prdIntent.answers.length > 0
              ? {
                  result: prdIntent.result,
                  answers: prdIntent.answers,
                }
              : undefined,
        });

        // Auto-save pipeline snapshot for debug reuse AND into the generated
        // project dir so it can later be re-imported with PRD/TRD/design/tasks.
        if (result.steps.kickoff?.status === "completed") {
          await savePipelineSnapshot({
            savedAt: new Date().toISOString(),
            featureBrief,
            codeOutputDir: codeOutputDir || "",
            totalCostUsd: result.totalCostUsd,
            steps: result.steps,
          });
        }

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "done", run: result })}\n\n`,
          ),
        );
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : "Pipeline execution failed";
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", error: msg })}\n\n`,
          ),
        );
      } finally {
        controller.close();
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
