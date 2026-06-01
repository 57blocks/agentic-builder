import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import fs from "fs/promises";
import path from "path";
import { PipelineEngine } from "@/lib/pipeline/engine";
import { resolveCodeOutputRoot } from "@/lib/pipeline/code-output";
import type { PipelineEvent, PipelineStepId, StepResult } from "@/lib/pipeline/types";
import { wrapPipelineEventHandler } from "@/lib/memory/event-bridge";
import { fetchStitchScreenHtml } from "@/lib/stitch-api";
import {
  classifyProject,
  normalizeProjectTier,
  extractClassificationFromPrd,
} from "@/lib/agents/shared/project-classifier";
import { readKickoffSnapshot } from "@/lib/pipeline/kickoff-snapshot";
import { diffPrdRequirements } from "@/lib/pipeline/incremental-rerun";
import { diffPrdSections } from "@/lib/pipeline/prd-section-diff";
import { extractPrdRequirementIndex } from "@/lib/requirements/extract-prd-spec";
import { stripChangeMarkers } from "@/lib/agents/pm/prd-patch";
import { triggerCodegenPrepReconcile } from "@/lib/memory/distill/codegen-prep-reconcile";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    featureBrief,
    codeOutputDir,
    prd,
    trd,
    sysdesign,
    implguide,
    design,
    pencil,
    sessionId,
    stitchProjectId,
    stitchScreenId,
  } = body as {
    featureBrief: string;
    codeOutputDir?: string;
    prd: string;
    trd?: string;
    sysdesign?: string;
    implguide?: string;
    design?: string;
    pencil?: string;
    /** Stable client-generated id that links memory records from the
     *  originating pipeline run + this kickoff into one logical session. */
    sessionId?: string;
    /** Stitch screen identifiers — when present, the kickoff fetches the
     *  exported HTML and writes it to StitchDesign.html in the output root
     *  so coding workers can read it as a UI design reference. */
    stitchProjectId?: string | null;
    stitchScreenId?: string | null;
  };

  if (!prd) {
    return Response.json({ error: "PRD content is required" }, { status: 400 });
  }

  const outputRoot = resolveCodeOutputRoot(
    process.cwd(),
    typeof codeOutputDir === "string" ? codeOutputDir : undefined,
  );

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: PipelineEvent) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
        );
      }

      const projectRoot = process.cwd();
      // Reconcile prior runs' codegen outcomes back onto the prd-pattern
      // records before this kickoff generates its PRD — pull-based + cursor-
      // idempotent, so aborted/crashed past runs get attributed here from
      // their durable on-disk signals. Fire-and-forget: never blocks kickoff.
      triggerCodegenPrepReconcile({ projectRoot: outputRoot, l1Root: projectRoot });
      const memoryAwareSend = wrapPipelineEventHandler(send, {
        projectRoot,
        codeOutputDir:
          typeof codeOutputDir === "string" ? codeOutputDir : undefined,
        featureBrief: featureBrief || "PRD-driven code generation.",
        kickoffIdOverride:
          typeof sessionId === "string" && sessionId.length > 0
            ? sessionId
            : undefined,
      });
      const engine = new PipelineEngine(memoryAwareSend, projectRoot);
      const run = engine.createRun(featureBrief || "PRD-driven code generation.");

      const now = new Date().toISOString();
      const buildStep = (
        stepId: PipelineStepId,
        content: string | undefined,
      ): StepResult => ({
        stepId,
        status: "completed",
        content: content ?? "",
        timestamp: now,
        costUsd: 0,
        durationMs: 0,
      });

      run.steps.intent = buildStep("intent", featureBrief);

      // Classify the project from the PRD tier badge (zero extra LLM cost) or
      // fall back to classifyProject so that executeKickoffOnly always has the
      // correct tier and needsBackend flag. Without this, executeKickoffOnly
      // defaults to tier "M" which triggers repairMissingBackendPhase for
      // frontend-only projects and causes spurious backend code generation.
      try {
        let classification = extractClassificationFromPrd(prd);
        if (!classification) {
          classification = await classifyProject(featureBrief);
        }
        run.steps.intent = {
          ...run.steps.intent,
          metadata: {
            ...(run.steps.intent?.metadata ?? {}),
            classification: {
              tier: classification.tier,
              type: classification.type,
              needsBackend: classification.needsBackend,
              needsDatabase: classification.needsDatabase,
              reasoning: classification.reasoning,
            },
          },
        };
      } catch (e) {
        console.warn(
          "[KickoffAPI] classification failed (ignored, will default to M-tier):",
          e instanceof Error ? e.message : e,
        );
      }
      run.steps.prd = buildStep("prd", prd);
      run.steps.trd = buildStep("trd", trd);
      run.steps.sysdesign = buildStep("sysdesign", sysdesign);
      run.steps.implguide = buildStep("implguide", implguide);
      run.steps.design = buildStep("design", design);

      const pencilTrimmed = pencil?.trim() ?? "";
      const isPencilReal =
        pencilTrimmed.length > 0 &&
        !pencilTrimmed.includes("step disabled") &&
        !pencilTrimmed.includes("was not selected");
      run.steps.pencil = {
        ...buildStep("pencil", isPencilReal ? pencilTrimmed : ""),
        metadata: { skipped: !isPencilReal },
      };

      run.steps.mockup = buildStep("mockup", "Mockup step disabled.");
      run.steps.qa = buildStep("qa", "");
      run.steps.verify = buildStep("verify", "");

      // Fetch and persist Stitch design HTML if provided. Non-fatal if fetch fails.
      if (stitchProjectId && stitchScreenId) {
        try {
          const html = await fetchStitchScreenHtml(stitchProjectId, stitchScreenId);
          if (html) {
            await fs.writeFile(path.join(outputRoot, "StitchDesign.html"), html, "utf-8");
            console.log("[KickoffAPI] StitchDesign.html written to output root.");
          } else {
            console.warn("[KickoffAPI] Stitch HTML fetch returned empty — skipping StitchDesign.html.");
          }
        } catch (e) {
          console.warn("[KickoffAPI] Failed to fetch/write StitchDesign.html:", e instanceof Error ? e.message : String(e));
        }
      }

      try {
        // Incremental vs full: when a baseline snapshot exists and the new PRD
        // differs from it — either an ID was added/removed OR any markdown
        // section body changed — do an incremental task-breakdown so the UI
        // can badge NEW/RERUN and coding only re-runs affected tasks. Pure
        // prose edits used to fall through to a full breakdown because the
        // ID set was identical; the section-diff check fixes that.
        let useIncremental = false;
        try {
          const prevSnapshot = await readKickoffSnapshot(outputRoot);
          if (prevSnapshot) {
            const canonicalNewPrd = stripChangeMarkers(prd);
            const newIdx = extractPrdRequirementIndex(canonicalNewPrd);
            const idDiff = diffPrdRequirements(
              prevSnapshot.prdRequirementIndex,
              newIdx,
            );
            const idsChanged =
              idDiff.added.length > 0 || idDiff.removed.length > 0;
            const sectionsChanged =
              !idsChanged &&
              diffPrdSections(prevSnapshot.prdContent, canonicalNewPrd).changed
                .length > 0;
            useIncremental = idsChanged || sectionsChanged;
          }
        } catch (e) {
          console.warn(
            "[KickoffAPI] incremental detection failed, using full breakdown:",
            e instanceof Error ? e.message : e,
          );
        }
        const result = useIncremental
          ? await engine.executeIncrementalKickoffOnly(run, outputRoot)
          : await engine.executeKickoffOnly(run, outputRoot);

        // Auto-save pipeline snapshot for debug reuse
        try {
          const snapshotDir = path.resolve(process.cwd(), ".blueprint");
          await fs.mkdir(snapshotDir, { recursive: true });
          const snapshot = {
            savedAt: new Date().toISOString(),
            featureBrief: featureBrief || "",
            codeOutputDir: codeOutputDir || "",
            totalCostUsd: result.totalCostUsd,
            steps: result.steps,
          };
          await fs.writeFile(
            path.join(snapshotDir, "pipeline-snapshot.json"),
            JSON.stringify(snapshot, null, 2),
            "utf-8",
          );
        } catch {
          /* non-critical: skip if write fails */
        }

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "done", run: result })}\n\n`,
          ),
        );
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : "Kick-off failed";
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

// PRD tier-badge extractor now lives in @/lib/agents/shared/project-classifier
// as `extractClassificationFromPrd` (imported above).
