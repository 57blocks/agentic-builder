import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs/promises";
import type {
  PrdRequirementIndex,
  PrdSpec,
} from "@/lib/requirements/prd-spec-types";
import { extractPrdRequirementIndex } from "@/lib/requirements/extract-prd-spec";
import { extractPrdSpec } from "@/lib/requirements/prd-spec-extractor";
import {
  runPrdSpecGate,
  runQaCoverageGate,
  runTaskCoverageGate,
  runPhaseRequirementGate,
} from "@/lib/pipeline/gates";
import {
  PMAgent,
  TRDAgent,
  SysDesignAgent,
  ImplGuideAgent,
  DesignAgent,
  PencilDesignAgent,
  MockupAgent,
  QAAgent,
  VerifierAgent,
  classifyProject,
  normalizeProjectTier,
} from "@/lib/agents";
import { persistTrdArtifactsFromContent } from "@/lib/agents/architect/persist-trd-artifacts";
import { ensureAuthDecisionAfterPrd } from "./ensure-auth-decision";
import { readAuthDecision } from "./auth-decision-io";
import type { AgentResult } from "@/lib/agents";
import type { ProjectTier, ProjectClassification } from "@/lib/agents";
import type {
  PipelineRun,
  PipelineStepId,
  StepResult,
  PipelineEvent,
  RalphConfig,
} from "./types";
import { DEFAULT_RALPH_CONFIG } from "./types";
import {
  resolveCodeOutputRoot,
  removePreviousDesignDocs,
  writeCodegenFileMap,
  buildGitInitInstructions,
} from "./code-output";
import { runKickoffIntegrations } from "./kickoff-integrations";
import { buildTaskBreakdownFromDocuments } from "./kickoff-task-breakdown.server";
import {
  copyDesignReferencesToOutput,
  formatDesignReferencesPromptBlock,
} from "./design-references";
import {
  createRepairEmitter,
  createJsonlRepairSink,
  consoleRepairSink,
  repairTaskCoverage,
  repairMissingBackendPhase,
  applyTaskBreakdownPatches,
} from "./self-heal";
import type { TaskBreakdownPatchEntry } from "./self-heal";
import { AttemptTracker } from "./self-heal/attempt-tracker";
import { escalateRepairCircuit } from "./self-heal/escalate-repair-circuit";
import { missingIdsScopeKey } from "./self-heal/attempt-tracker";
import {
  runEvidenceGate,
  evidenceFromPrdSpecGate,
  evidenceFromGateReport,
  evidenceFromRulesValidation,
  evidenceFromDagValidation,
  evidenceFromTrdContractValidation,
} from "./gates";
import {
  recallPrdContext,
  recallDesignContext,
} from "@/lib/memory/preparation-recall";
import {
  formatClarificationContext,
  type ClarificationAnswer,
  type IntentResult,
} from "@/lib/agents/intent";
import {
  applyPrdPatches,
  stripChangeMarkers,
  type PrdPatch,
} from "@/lib/agents/pm/prd-patch";
import {
  writeKickoffSnapshot,
  readKickoffSnapshot,
  type KickoffSnapshot,
} from "./kickoff-snapshot";
import { buildRegenerationContext } from "./incremental-rerun";
import { kickoffIncremental } from "./kickoff-incremental";
import {
  writeSessionCheckpoint,
  type TaskCheckpointEntry,
} from "./session-checkpoint";

interface PatchAgentResponse {
  summary?: string;
  fullRewrite?: boolean;
  patches: PrdPatch[];
}

function parsePrdPatchResponse(raw: string): PatchAgentResponse | null {
  if (!raw) return null;
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;
  const patches: PrdPatch[] = Array.isArray(obj.patches)
    ? (obj.patches as unknown[])
        .map((p) => {
          if (!p || typeof p !== "object") return null;
          const o = p as Record<string, unknown>;
          if (typeof o.heading !== "string" || typeof o.newBody !== "string") {
            return null;
          }
          return { heading: o.heading, newBody: o.newBody } satisfies PrdPatch;
        })
        .filter((p): p is PrdPatch => p !== null)
    : [];
  return {
    summary: typeof obj.summary === "string" ? obj.summary : undefined,
    fullRewrite: Boolean(obj.fullRewrite),
    patches,
  };
}
import {
  parseMemoryCites,
  recordMemoryCites,
  stripMemoryCites,
} from "@/lib/memory/cite";

type EventHandler = (event: PipelineEvent) => void;

export interface ExecutePipelineOptions {
  codeOutputDir?: string;
  /**
   * When true: after PRD, skip TRD / SysDesign / ImplGuide / Design / Pencil / Mockup / QA / Verify
   * — go straight to kick-off with PRD.md written from the PRD content.
   */
  fastFromPrd?: boolean;
  /**
   * When true: pause after PRD generation for user review/refinement.
   * Downstream docs (TRD, SysDesign, etc.) will be triggered separately
   * via the parallel-generate API after user confirms the PRD.
   */
  pauseAfterPrd?: boolean;
  /**
   * RALPH loop configuration.
   * When enabled: tasks loop until external verification passes, progress is
   * persisted to .ralph/, and each completed task is git-committed.
   * Defaults to disabled for backward compatibility.
   */
  ralph?: Partial<RalphConfig>;
  /**
   * When set, skip all other steps and only re-run the PRD step using this
   * edit instruction applied to the existing PRD content.
   */
  prdEditInstruction?: string;
  /** The existing PRD markdown to be edited. Required when prdEditInstruction is set. */
  existingPrd?: string;
  /**
   * When true and `prdEditInstruction` is set: after the PRD edit completes,
   * automatically propagate downstream — regenerate TRD/SysDesign/ImplGuide
   * /Design, compute task delta against the previous kickoff snapshot, and
   * inject a session-checkpoint so the next coding run touches only the
   * affected tasks. Requires a prior `.blueprint/last-kickoff-snapshot.json`.
   * If the snapshot is missing, propagation is skipped and the edit-only
   * behavior is preserved (warning logged).
   */
  propagateAfterEdit?: boolean;
  /**
   * User-confirmed product clarifications gathered via the PRD Intent agent
   * before PRD generation. When supplied, these are prepended to the PRD
   * agent's additionalContext as binding requirements.
   *
   * Shape: { result, answers }
   * - `result` is the full IntentResult returned by `/api/agents/prd-intent`
   *   (contains the original questions so the engine can resolve answer
   *   values to labels for readable output).
   * - `answers` is the user's submissions, keyed by `questionId`.
   */
  prdIntent?: {
    result: IntentResult;
    answers: ClarificationAnswer[];
  };
}

/**
 * Determines which preparation steps to run based on the project tier.
 *
 * | Tier | TRD | SystemDesign | ImplGuide | QA | Verify |
 * |------|-----|-------------|-----------|-----|--------|
 * | S    | no  | no          | no        | no  | no     |
 * | M    | no  | no          | no        | yes | yes    |
 * | L    | yes | yes         | yes       | yes | yes    |
 */
function stepsForTier(tier: ProjectTier) {
  return {
    needsTrd: tier === "L",
    needsSysDesign: tier === "L",
    needsImplGuide: tier === "L",
    needsQa: tier !== "S",
    needsVerify: tier !== "S",
  };
}

const STATIC_DESIGN_RELATIVE_PATH = path.join(".blueprint", "DESIGN.html");

const FAST_MODE_DESIGN_FALLBACK = `## Design specification (fast mode)

Implement the product using React 18, TypeScript, and Tailwind CSS only.
Follow the PRD for information architecture, screens, and user flows.
Use a cohesive dark UI (zinc-950 / zinc-900 backgrounds, zinc-100 text, indigo accents).
`;

export class PipelineEngine {
  private trdAgent = new TRDAgent();
  private sysDesignAgent = new SysDesignAgent();
  private implGuideAgent = new ImplGuideAgent();
  private designAgent = new DesignAgent();
  private pencilAgent = new PencilDesignAgent();
  private mockupAgent = new MockupAgent();
  private qaAgent = new QAAgent();
  private verifierAgent = new VerifierAgent();
  private onEvent?: EventHandler;
  private projectRoot: string;

  constructor(onEvent?: EventHandler, projectRoot?: string) {
    this.onEvent = onEvent;
    this.projectRoot = projectRoot ?? process.cwd();
  }

  createRun(featureBrief: string, sessionId?: string): PipelineRun {
    const now = new Date().toISOString();
    return {
      id: uuidv4(),
      // Honor a caller-supplied sessionId so a PRD-edit propagation run reuses
      // the original kickoff's id. This keeps the snapshot/checkpoint (and the
      // memory kickoffId, which the route already overrides with the same id)
      // on one stable session across edits. Falls back to a fresh uuid.
      sessionId:
        typeof sessionId === "string" && sessionId.length > 0
          ? sessionId
          : uuidv4(),
      featureBrief,
      status: "idle",
      currentStep: null,
      steps: {
        intent: null,
        prd: null,
        trd: null,
        sysdesign: null,
        implguide: null,
        design: null,
        pencil: null,
        mockup: null,
        qa: null,
        verify: null,
        kickoff: null,
      },
      totalCostUsd: 0,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Full pipeline:
   * 1. Classify project → tier S/M/L
   * 2. Preparation: Intent → PRD(tier-aware) → [TRD] → [SysDesign] → [ImplGuide] → Design → Pencil → Mockup → [QA] → [Verify]
   * 3. Kick-off
   *
   * Steps in [] are conditionally skipped based on project tier.
   */
  async executePipeline(
    run: PipelineRun,
    options: ExecutePipelineOptions = {},
  ): Promise<PipelineRun> {
    run.status = "running";
    run.updatedAt = new Date().toISOString();
    const fast = options.fastFromPrd === true;
    const outputRoot = resolveCodeOutputRoot(
      this.projectRoot,
      options.codeOutputDir,
    );

    // ── Intent ──
    run.steps.intent = this.buildStepResult("intent", "completed", {
      content: run.featureBrief,
    });

    // Stash PRD intent clarifications (questions + user answers gathered via
    // /api/agents/prd-intent) onto the intent step metadata so the UI and
    // downstream introspection can see what was confirmed before PRD writing.
    const prdIntentPayload = options.prdIntent;
    if (prdIntentPayload) {
      run.steps.intent = {
        ...run.steps.intent,
        metadata: {
          ...(run.steps.intent.metadata ?? {}),
          prdIntent: {
            result: prdIntentPayload.result,
            answers: prdIntentPayload.answers,
          },
        },
      };
    }

    // ── Classify project complexity (lightweight LLM call, ~200 tokens) ──
    // When a PRD already exists in this run (e.g. resume after pauseAfterPrd
    // or imported PRD), pass it so the classifier honors any explicit
    // `**Project Tier: X**` badge instead of re-classifying the brief alone.
    let classification: ProjectClassification | null = null;
    let tier: ProjectTier = "M";
    try {
      const existingPrd = run.steps.prd?.content ?? options.existingPrd ?? null;
      classification = await classifyProject(run.featureBrief, existingPrd);
      tier = normalizeProjectTier(classification.tier);
      run.totalCostUsd += classification.costUsd;

      // Persist classification into the intent step metadata so it is
      // accessible downstream (e.g. runKickoffStep → phase-requirement gate).
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

      this.emit({
        type: "step_complete",
        runId: run.id,
        stepId: "intent",
        data: { ...run.steps.intent },
      });
    } catch {
      tier = normalizeProjectTier("M");
    }

    const plan = stepsForTier(tier);

    // ── PRD (tier-aware prompt) ──
    const pmAgent = new PMAgent(tier);

    // ── Edit / propagate modes ───────────────────────────────────────────
    //  (a) instruction-driven edit: prdEditInstruction + existingPrd → the PM
    //      agent re-applies the instruction to produce the edited PRD.
    //  (b) manual-edit propagate: existingPrd + propagateAfterEdit but NO
    //      instruction → the caller already hand-edited the PRD; take it
    //      as-is (skip the patch agent) and propagate the diff downstream.
    const isInstructionEdit = !!(
      options.prdEditInstruction && options.existingPrd
    );
    const isManualPropagate = !!(
      options.propagateAfterEdit &&
      options.existingPrd &&
      !options.prdEditInstruction
    );
    if (isInstructionEdit || isManualPropagate) {
      const existingPrd = options.existingPrd as string;

      if (isInstructionEdit) {
        const editInstruction = options.prdEditInstruction as string;
        run = await this.executeStep(run, "prd", () =>
          this.runPrdEdit(run, pmAgent, existingPrd, editInstruction),
        );
      } else {
        // Manual-edit propagate: the PRD is already final. Record it verbatim
        // as the PRD step output (no LLM patch) so the diff baseline is the
        // user's hand-edited document.
        const manualPrd = stripChangeMarkers(existingPrd);
        run = await this.executeStep(run, "prd", async () => ({
          content: manualPrd,
          model: "manual-edit",
          costUsd: 0,
          durationMs: 0,
          usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        }));
      }
      if (run.status === "failed") return run;

      run = this.attachPrdSpecGateToPrdStep(run);

      // ── Propagation branch: continue downstream from the edited PRD ──
      if (options.propagateAfterEdit) {
        run = await this.runIncrementalDownstream(run, outputRoot, tier);
        if (run.status === "failed") return run;
        this.emit({
          type: "pipeline_complete",
          runId: run.id,
          stepId: "kickoff",
          data: {
            status: "completed",
            metadata: { propagatedFromEdit: true },
          },
        });
        run.status = "completed";
        run.currentStep = null;
        run.updatedAt = new Date().toISOString();
        return run;
      }

      // Edit-only mode (no propagation) — pause as before
      this.emit({
        type: "pipeline_complete",
        runId: run.id,
        stepId: "prd",
        data: { status: "completed", metadata: { pausedAfterPrd: true } },
      });
      run.status = "completed";
      run.currentStep = null;
      run.updatedAt = new Date().toISOString();
      return run;
    }

    // ── Imported PRD shortcut ────────────────────────────────────────────
    // The PRD-import API writes `.blueprint/PRD.md` directly. When that
    // file exists with non-empty content, use it as the PRD step's output
    // and skip the LLM call entirely — otherwise the PM agent would
    // hallucinate a fresh PRD that overrides the user's upload. The
    // structured spec extractor still runs against the imported content,
    // so downstream domain.rules wiring keeps working.
    const importedPrdContent = await this.readImportedPrd(outputRoot);
    if (importedPrdContent) {
      run = await this.executeStep(run, "prd", async () => ({
        content: importedPrdContent,
        model: "imported",
        costUsd: 0,
        durationMs: 0,
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      }));
      if (run.status === "failed") return run;
      const prdStep = run.steps.prd;
      if (prdStep) {
        run.steps.prd = {
          ...prdStep,
          metadata: {
            ...(prdStep.metadata ?? {}),
            source: "imported",
            importedFrom: ".blueprint/PRD.md",
          },
        };
      }
    } else {
      // Recall PRD-pattern memory (L1, cross-project) and inject as
      // additionalContext. When MEMORY_PRD_INJECT is off the recall still
      // runs (trace-only) but contextChunk is empty.
      const prdRecall = await recallPrdContext({
        sessionId: run.sessionId,
        featureBrief: run.featureBrief,
        tier,
        projectType: classification?.type,
      });

      // Format user-confirmed intent clarifications. These are treated as
      // binding requirements and placed FIRST so the model sees them before
      // any retrieved memory context.
      const intentContext = prdIntentPayload
        ? formatClarificationContext(
            prdIntentPayload.result,
            prdIntentPayload.answers,
            { stage: "prd" },
          )
        : "";

      const prdAdditionalContext =
        [intentContext, prdRecall.contextChunk]
          .filter((s) => s && s.trim())
          .join("\n\n") || undefined;

      run = await this.executeStep(run, "prd", () =>
        pmAgent.generatePRDStreaming(
          run.featureBrief,
          (chunk, chunkType) => {
            this.emit({
              type: "step_stream",
              runId: run.id,
              stepId: "prd",
              data: { chunk, chunkType },
            });
          },
          prdAdditionalContext,
          run.sessionId,
        ),
      );
      if (run.status === "failed") return run;

      // Parse & log cites; strip the `<memory-cite />` tag from the
      // persisted PRD content so it never leaks into downstream agents
      // or the user-visible document.
      const prdContent = run.steps.prd?.content ?? "";
      if (prdRecall.active.length > 0 && prdContent) {
        const cited = parseMemoryCites(prdContent);
        if (cited.length > 0) {
          await recordMemoryCites({
            traceRoot: process.cwd(),
            agent: "pm",
            kickoffId: run.sessionId,
            citedIds: cited,
            injectedIds: prdRecall.active.map((r) => r.id),
          });
        }
        const stripped = stripMemoryCites(prdContent);
        if (stripped !== prdContent && run.steps.prd) {
          run.steps.prd = { ...run.steps.prd, content: stripped };
        }
      }

      run = this.attachPrdSpecGateToPrdStep(run);
      run = await this.attachPrdStructuredSpec(run);
      this.emitPrdStepCompleteRefresh(run);
    }
    run = this.attachPrdSpecGateToPrdStep(run);

    // Pause after PRD — emit done immediately, skip async spec extraction
    if (options.pauseAfterPrd) {
      this.emit({
        type: "pipeline_complete",
        runId: run.id,
        stepId: "prd",
        data: {
          status: "completed",
          metadata: {
            pausedAfterPrd: true,
            tier,
            classification: classification
              ? {
                  tier: classification.tier,
                  type: classification.type,
                  reasoning: classification.reasoning,
                }
              : undefined,
          },
        },
      });
      run.status = "completed";
      run.currentStep = null;
      run.updatedAt = new Date().toISOString();
      return run;
    }

    // Full pipeline: extract structured spec before continuing
    run = await this.attachPrdStructuredSpec(run);
    this.emitPrdStepCompleteRefresh(run);

    const prdContent = run.steps.prd?.content ?? "";

    // Lock in an auth decision before TRD runs so the architect prompt has
    // an authoritative auth contract instead of guessing from PRD text. The
    // helper respects userOverridden=true (Phase 0 wins), and falls back to
    // password-rbac on any decider error.
    try {
      await ensureAuthDecisionAfterPrd({
        projectRoot: process.cwd(),
        prdContent,
        sessionId: run.sessionId,
      });
    } catch (err) {
      console.warn(
        "[Pipeline] ensureAuthDecisionAfterPrd failed (continuing without auth contract):",
        err instanceof Error ? err.message : err,
      );
    }

    if (fast) {
      const existingDocs = await this.readExistingDocsFromOutput(outputRoot);

      if (plan.needsTrd) {
        run = this.emitStubCompleted(
          run,
          "trd",
          existingDocs.trd || "TRD skipped in quick start.",
          {
            skipped: !existingDocs.trd,
            ...(existingDocs.trd ? { source: "file:TRD.md" } : {}),
          },
        );
      } else {
        run = this.emitStubCompleted(
          run,
          "trd",
          `TRD not required for Tier ${tier} project (${classification?.type ?? "app"}).`,
          { skipped: true, reason: "tier_skip", tier },
        );
      }

      if (plan.needsSysDesign) {
        run = this.emitStubCompleted(
          run,
          "sysdesign",
          existingDocs.sysDesign || "System Design skipped in quick start.",
          {
            skipped: !existingDocs.sysDesign,
            ...(existingDocs.sysDesign
              ? { source: "file:SystemDesign.md" }
              : {}),
          },
        );
      } else {
        run = this.emitStubCompleted(
          run,
          "sysdesign",
          `System Design not required for Tier ${tier} project.`,
          { skipped: true, reason: "tier_skip", tier },
        );
      }

      if (plan.needsImplGuide) {
        run = this.emitStubCompleted(
          run,
          "implguide",
          existingDocs.implGuide ||
            "Implementation Guide skipped in quick start.",
          {
            skipped: !existingDocs.implGuide,
            ...(existingDocs.implGuide
              ? { source: "file:ImpelementGuide.md" }
              : {}),
          },
        );
      } else {
        run = this.emitStubCompleted(
          run,
          "implguide",
          `Implementation Guide not required for Tier ${tier} project.`,
          { skipped: true, reason: "tier_skip", tier },
        );
      }

      const designBody =
        existingDocs.designSpec || (await this.readStaticDesign());
      run = this.emitStubCompleted(run, "design", designBody, {
        skipped: !existingDocs.designSpec,
        source: existingDocs.designSpec
          ? "file:DesignSpec.md"
          : designBody.startsWith("## Design specification (fast mode)")
            ? "fallback-stub"
            : "file:.blueprint/DESIGN.md",
      });
      // Pencil: stubbed in fast mode (step disabled for now)
      run = this.emitStubCompleted(run, "pencil", "Pencil step disabled.", {
        skipped: true,
      });
      // Mockup: stubbed in fast mode (step disabled for now)
      run = this.emitStubCompleted(run, "mockup", "Mockup step disabled.", {
        skipped: true,
      });
    } else {
      if (plan.needsTrd) {
        // Prior PRD step may have attached a structured PrdSpec with an
        // optional `domain` section. Forward it so TRDAgent can inject
        // PRD-provided rules as authoritative source for §7.
        const prdMetadata = run.steps.prd?.metadata as
          | { prdSpec?: PrdSpec }
          | undefined;
        const prdSpec = prdMetadata?.prdSpec ?? null;
        // Load the auth decision written by ensureAuthDecisionAfterPrd (or
        // a prior Phase 0 override) so the TRD prompt has an authoritative
        // mode/roles/seedAccounts/env-keys block to honor.
        const authDecision = await readAuthDecision(process.cwd());
        run = await this.executeStep(run, "trd", () =>
          this.trdAgent.generateTRD(
            prdContent,
            tier,
            undefined,
            run.sessionId,
            prdSpec,
            undefined,
            authDecision,
          ),
        );
        if (run.status === "failed") return run;
        await this.persistTrdArtifacts(run);
      } else {
        run = this.emitStubCompleted(
          run,
          "trd",
          `TRD not required — Tier ${tier} project does not need a separate technical requirements document.`,
          { skipped: true, reason: "tier_skip", tier },
        );
      }

      const trdContent = run.steps.trd?.content ?? "";

      if (plan.needsSysDesign) {
        run = await this.executeStep(run, "sysdesign", () =>
          this.sysDesignAgent.generateSysDesign(
            prdContent,
            trdContent,
            run.sessionId,
          ),
        );
        if (run.status === "failed") return run;
      } else {
        run = this.emitStubCompleted(
          run,
          "sysdesign",
          `System Design not required — Tier ${tier} project uses a straightforward architecture.`,
          { skipped: true, reason: "tier_skip", tier },
        );
      }

      const sysDesignContent = run.steps.sysdesign?.content ?? "";

      if (plan.needsImplGuide) {
        run = await this.executeStep(run, "implguide", () =>
          this.implGuideAgent.generateImplGuide(
            prdContent,
            trdContent,
            sysDesignContent,
            run.sessionId,
          ),
        );
        if (run.status === "failed") return run;
      } else {
        run = this.emitStubCompleted(
          run,
          "implguide",
          `Implementation Guide not required — Tier ${tier} project can be implemented directly from PRD.`,
          { skipped: true, reason: "tier_skip", tier },
        );
      }

      // ── Design Spec (always run) ──
      const designRecall = await recallDesignContext({
        sessionId: run.sessionId,
        featureBrief: run.featureBrief,
        tier,
        projectType: classification?.type,
        prdContent,
      });
      const designAdditionalContext = designRecall.contextChunk || undefined;

      run = await this.executeStep(run, "design", () =>
        this.designAgent.generateDesign(
          prdContent,
          designAdditionalContext,
          run.sessionId,
        ),
      );
      if (run.status === "failed") return run;

      // Parse cite tags emitted by the design agent (best-effort)
      const designContent = run.steps.design?.content ?? "";
      if (designRecall.active.length > 0 && designContent) {
        const cited = parseMemoryCites(designContent);
        if (cited.length > 0) {
          await recordMemoryCites({
            traceRoot: process.cwd(),
            agent: "design",
            kickoffId: run.sessionId,
            citedIds: cited,
            injectedIds: designRecall.active.map((r) => r.id),
          });
        }
        const stripped = stripMemoryCites(designContent);
        if (stripped !== designContent && run.steps.design) {
          run.steps.design = { ...run.steps.design, content: stripped };
        }
      }

      // ── Pencil (disabled — preserved for future re-enable) ──
      // const designContent = run.steps.design?.content ?? "";
      // run = await this.executeStep(run, "pencil", () =>
      //   this.pencilAgent.generateDesign(
      //     prdContent,
      //     designContent,
      //     this.projectRoot,
      //     run.sessionId,
      //   ),
      // );
      // if (run.status === "failed") return run;
      run = this.emitStubCompleted(run, "pencil", "Pencil step disabled.", {
        skipped: true,
      });
    }

    // ── Mockup (disabled — preserved for future re-enable) ──
    // const designContent = run.steps.design?.content ?? "";
    // const pencilOutput = run.steps.pencil?.content ?? "";
    // if (!fast) {
    //   run = await this.executeStep(run, "mockup", () =>
    //     this.mockupAgent.generateMockup(
    //       designContent,
    //       prdContent,
    //       pencilOutput,
    //       run.sessionId,
    //     ),
    //   );
    //   if (run.status === "failed") return run;
    //   const mockupContent = run.steps.mockup?.content ?? "";
    //   fileMap = MockupAgent.parseFileMap(mockupContent);
    //   if (run.steps.mockup) {
    //     run.steps.mockup.metadata = { fileMap, fileCount: Object.keys(fileMap).length };
    //   }
    // }
    let fileMap: Record<string, string>;
    if (fast) {
      fileMap = this.buildPrdOnlyKickoffFileMap(prdContent);
    } else {
      fileMap = {};
      if (prdContent) fileMap["PRD.md"] = prdContent;
      if (run.steps.trd?.content && !run.steps.trd.metadata?.skipped)
        fileMap["TRD.md"] = run.steps.trd.content;
      if (
        run.steps.sysdesign?.content &&
        !run.steps.sysdesign.metadata?.skipped
      )
        fileMap["SystemDesign.md"] = run.steps.sysdesign.content;
      if (
        run.steps.implguide?.content &&
        !run.steps.implguide.metadata?.skipped
      )
        fileMap["ImplementationGuide.md"] = run.steps.implguide.content;
      if (run.steps.design?.content && !run.steps.design.metadata?.skipped)
        fileMap["DesignSpec.md"] = run.steps.design.content;
      if (Object.keys(fileMap).length === 0) fileMap["PRD.md"] = "(empty)";
    }
    run = this.emitStubCompleted(run, "mockup", "Mockup step disabled.", {
      skipped: true,
      fileMap,
      fileCount: Object.keys(fileMap).length,
    });

    const designSpecContent = run.steps.design?.content ?? "";

    // ── QA ──
    if (!plan.needsQa) {
      run = this.emitStubCompleted(
        run,
        "qa",
        `QA not required for Tier ${tier} project.`,
        { skipped: true, reason: "tier_skip", tier },
      );
    } else {
      run = await this.executeStep(run, "qa", () =>
        this.qaAgent.generateAudit(
          prdContent,
          designSpecContent,
          run.sessionId,
        ),
      );
      if (run.status === "failed") return run;
      run = this.attachQaCoverageGate(run, prdContent);
    }

    // ── Verify ──
    if (!plan.needsVerify) {
      run = this.emitStubCompleted(
        run,
        "verify",
        `Verification not required for Tier ${tier} project.`,
        { skipped: true, reason: "tier_skip", tier },
      );
    } else {
      run = await this.executeStep(run, "verify", () =>
        this.verifierAgent.verifyAlignment(
          prdContent,
          designSpecContent,
          run.sessionId,
        ),
      );
      if (run.status === "failed") return run;
    }

    if (run.status === "failed") return run;

    // ── Kick-off ──
    run = await this.runKickoffStep(run, fileMap, outputRoot, tier);

    if (run.status !== "failed") {
      run.status = "completed";
      run.currentStep = null;
      run.updatedAt = new Date().toISOString();
      this.emit({
        type: "pipeline_complete",
        runId: run.id,
        stepId: "kickoff",
        data: { status: "completed" },
      });
    }

    return run;
  }

  /**
   * Run only the kick-off step with pre-populated steps.
   * Used when parallel generation has already produced the docs.
   */
  async executeKickoffOnly(
    run: PipelineRun,
    outputRoot: string,
  ): Promise<PipelineRun> {
    run.status = "running";
    run.updatedAt = new Date().toISOString();

    const fileMap: Record<string, string> = {};
    if (run.steps.trd?.content && !run.steps.trd.metadata?.skipped)
      fileMap["TRD.md"] = run.steps.trd.content;
    if (run.steps.sysdesign?.content && !run.steps.sysdesign.metadata?.skipped)
      fileMap["SystemDesign.md"] = run.steps.sysdesign.content;
    if (run.steps.implguide?.content && !run.steps.implguide.metadata?.skipped)
      fileMap["ImplementationGuide.md"] = run.steps.implguide.content;
    if (run.steps.design?.content && !run.steps.design.metadata?.skipped)
      fileMap["DesignSpec.md"] = run.steps.design.content;
    if (run.steps.pencil?.content && !run.steps.pencil.metadata?.skipped)
      fileMap["PencilDesign.md"] = run.steps.pencil.content;

    if (Object.keys(fileMap).length === 0) {
      fileMap["README.md"] =
        "# Generated Project\n\nAuto-generated by Agentic Builder.";
    }

    const tierFromMeta = normalizeProjectTier(
      (
        run.steps.intent?.metadata?.classification as
          | { tier?: ProjectTier }
          | undefined
      )?.tier ?? "M",
    );

    run = await this.runKickoffStep(run, fileMap, outputRoot, tierFromMeta);

    if (run.status !== "failed") {
      run.status = "completed";
      run.currentStep = null;
      run.updatedAt = new Date().toISOString();
      this.emit({
        type: "pipeline_complete",
        runId: run.id,
        stepId: "kickoff",
        data: { status: "completed" },
      });
    }

    return run;
  }

  /**
   * Incremental task-breakdown for a step-level "Regenerate" after a PRD edit.
   * Unlike {@link executeKickoffOnly} (a full re-breakdown), this diffs the
   * current PRD's requirement index against the last kickoff snapshot, keeps
   * surviving tasks unchanged, and only generates tasks for newly-added /
   * changed requirements. It writes a fresh snapshot plus a coding checkpoint
   * that flags the rerun set as "failed" so the next coding run only re-runs
   * the affected tasks. Falls back to a full breakdown when there is no
   * baseline snapshot to diff against.
   */
  async executeIncrementalKickoffOnly(
    run: PipelineRun,
    outputRoot: string,
  ): Promise<PipelineRun> {
    run.status = "running";
    run.updatedAt = new Date().toISOString();

    const previousSnapshot = await readKickoffSnapshot(outputRoot);
    if (!previousSnapshot) {
      console.warn(
        "[engine] executeIncrementalKickoffOnly: no baseline snapshot; falling back to full kickoff.",
      );
      return this.executeKickoffOnly(run, outputRoot);
    }

    const tier = normalizeProjectTier(
      (
        run.steps.intent?.metadata?.classification as
          | { tier?: ProjectTier }
          | undefined
      )?.tier ?? "M",
    );

    const canonicalPrd = stripChangeMarkers(run.steps.prd?.content ?? "");
    const newRequirementIndex = extractPrdRequirementIndex(canonicalPrd);
    const regenCtx = buildRegenerationContext({
      previousSnapshot,
      newRequirementIndex,
      newPrdContent: canonicalPrd,
    });
    console.info(
      `[engine] incremental kickoff diff: +${regenCtx.prdDiff.added.length} ` +
        `-${regenCtx.prdDiff.removed.length} ~${regenCtx.prdDiff.modified.length} ` +
        `requirements; sections=${regenCtx.changedSectionHeadings.length}; ` +
        `obsolete=${regenCtx.taskDelta.obsoleteTaskIds.length}, ` +
        `rerun=${regenCtx.taskDelta.taskIdsToRerun.length}, ` +
        `needs-new=${regenCtx.taskDelta.requirementsNeedingNewTasks.length}.`,
    );

    const trdContent = run.steps.trd?.content || previousSnapshot.docs.trd || "";
    const sysDesignContent =
      run.steps.sysdesign?.content || previousSnapshot.docs.sysdesign || "";
    const implGuideContent =
      run.steps.implguide?.content || previousSnapshot.docs.implguide || "";
    const designContent =
      run.steps.design?.content || previousSnapshot.docs.design || "";
    const prdSpec =
      ((run.steps.prd?.metadata as { prdSpec?: PrdSpec } | undefined)
        ?.prdSpec) ??
      previousSnapshot.prdSpec ??
      null;

    const incremental = await kickoffIncremental({
      regenCtx,
      newDocs: {
        prd: canonicalPrd,
        trd: trdContent || undefined,
        sysDesign: sysDesignContent || undefined,
        implGuide: implGuideContent || undefined,
        designSpec: designContent || undefined,
      },
      prdSpec,
      tier,
      sessionId: run.sessionId,
    });
    console.info(
      `[engine] kickoffIncremental: dropped=${incremental.droppedTaskIds.length}, ` +
        `new=${incremental.newTaskIds.length}, rerun=${incremental.tasksToRerunIds.length}, ` +
        `total=${incremental.tasks.length}.`,
    );

    // Coding checkpoint: flag the rerun set as "failed" so the next coding run's
    // existing retry-failed flow only re-runs those tasks. Written to
    // this.projectRoot to match where the coding route reads/writes it.
    const rerunSet = new Set(incremental.tasksToRerunIds);
    const checkpointMap = new Map<string, TaskCheckpointEntry>();
    for (const task of incremental.tasks) {
      checkpointMap.set(
        task.id,
        rerunSet.has(task.id)
          ? { status: "failed", generatedFiles: [] }
          : { status: "completed", generatedFiles: [] },
      );
    }
    await writeSessionCheckpoint(
      this.projectRoot,
      run.sessionId,
      checkpointMap,
      incremental.tasks.map((t) => t.id),
    );

    await writeKickoffSnapshot(outputRoot, {
      sessionId: run.sessionId,
      runId: run.id,
      savedAt: new Date().toISOString(),
      prdContent: canonicalPrd,
      prdRequirementIndex: newRequirementIndex,
      prdSpec: prdSpec ?? undefined,
      tasks: incremental.tasks,
      docs: {
        prd: canonicalPrd,
        trd: trdContent || undefined,
        sysdesign: sysDesignContent || undefined,
        implguide: implGuideContent || undefined,
        design: designContent || undefined,
      },
    });

    // Write CHANGES.md into the generated project so the DELIVERABLE itself
    // marks what this increment touched (new tasks + the files they create /
    // modify) — visible without the UI.
    try {
      type Task = (typeof incremental.tasks)[number];
      const filesOf = (t: Task) => {
        const f = t.files;
        return {
          creates: Array.isArray(f) ? f : f?.creates ?? [],
          modifies: Array.isArray(f) ? [] : f?.modifies ?? [],
        };
      };
      const byId = new Map(incremental.tasks.map((t) => [t.id, t]));
      const newSet = new Set(incremental.newTaskIds);
      const rerunOnly = incremental.tasksToRerunIds.filter((id) => !newSet.has(id));
      const fileLine = (id: string): string => {
        const t = byId.get(id);
        if (!t) return `- ${id}`;
        const { creates, modifies } = filesOf(t);
        const parts: string[] = [];
        if (creates.length)
          parts.push(`creates: ${creates.map((p) => "`" + p + "`").join(", ")}`);
        if (modifies.length)
          parts.push(`modifies: ${modifies.map((p) => "`" + p + "`").join(", ")}`);
        return `- **${t.id}** ${t.title}` + (parts.length ? `\n  - ${parts.join("\n  - ")}` : "");
      };
      const touched = new Set<string>();
      for (const id of incremental.tasksToRerunIds) {
        const t = byId.get(id);
        if (!t) continue;
        const { creates, modifies } = filesOf(t);
        for (const p of [...creates, ...modifies]) touched.add(p);
      }
      const changes = [
        "# Incremental Changes",
        "",
        `_Updated ${new Date().toISOString()} from a PRD edit. This increment adds / re-runs the tasks below; unaffected code is left unchanged._`,
        "",
        `## New tasks (${incremental.newTaskIds.length})`,
        ...(incremental.newTaskIds.length ? incremental.newTaskIds.map(fileLine) : ["_none_"]),
        "",
        `## Tasks to re-run (${rerunOnly.length})`,
        ...(rerunOnly.length ? rerunOnly.map(fileLine) : ["_none_"]),
        "",
        `## Obsolete tasks dropped (${incremental.droppedTaskIds.length})`,
        ...(incremental.droppedTaskIds.length ? incremental.droppedTaskIds.map((id) => `- ${id}`) : ["_none_"]),
        "",
        `## Files this increment touches (${touched.size})`,
        ...([...touched].sort().map((p) => `- \`${p}\``)),
        "",
      ].join("\n");
      await fs.writeFile(path.join(outputRoot, "CHANGES.md"), changes, "utf-8");
    } catch (e) {
      console.warn(
        "[engine] failed to write CHANGES.md (ignored):",
        e instanceof Error ? e.message : e,
      );
    }

    const summary = [
      "## Incremental task breakdown (updated from PRD edit)",
      "",
      `- New tasks: ${incremental.newTaskIds.length}`,
      `- Tasks to rerun: ${incremental.tasksToRerunIds.length}`,
      `- Obsolete tasks dropped: ${incremental.droppedTaskIds.length}`,
      `- Total tasks: ${incremental.tasks.length}`,
    ].join("\n");

    run.steps.kickoff = this.buildStepResult("kickoff", "completed", {
      content: summary,
      model: "incremental",
      costUsd: incremental.diagnostics.costUsd,
      durationMs: incremental.diagnostics.durationMs,
      metadata: {
        incrementalFromEdit: true,
        prdDiff: regenCtx.prdDiff,
        taskDelta: regenCtx.taskDelta,
        newTaskIds: incremental.newTaskIds,
        tasksToRerunIds: incremental.tasksToRerunIds,
        droppedTaskIds: incremental.droppedTaskIds,
        diagnostics: incremental.diagnostics,
        taskBreakdown: incremental.tasks,
      },
    });
    run.totalCostUsd += incremental.diagnostics.costUsd;
    run.status = "completed";
    run.currentStep = null;
    run.updatedAt = new Date().toISOString();
    this.emit({
      type: "step_complete",
      runId: run.id,
      stepId: "kickoff",
      data: run.steps.kickoff,
    });
    return run;
  }

  // ── Kick-off step ──

  private async runKickoffStep(
    run: PipelineRun,
    fileMap: Record<string, string>,
    outputRoot: string,
    tier: ProjectTier = "M",
  ): Promise<PipelineRun> {
    run.currentStep = "kickoff";
    this.emit({
      type: "step_start",
      runId: run.id,
      stepId: "kickoff",
      data: { status: "running" },
    });

    const keys = Object.keys(fileMap);
    if (keys.length === 0) {
      const err =
        "No files to write (empty PRD or missing mockup output) — nothing to write.";
      run.steps.kickoff = this.buildStepResult("kickoff", "failed", {
        error: err,
      });
      run.status = "failed";
      run.updatedAt = new Date().toISOString();
      this.emit({
        type: "step_error",
        runId: run.id,
        stepId: "kickoff",
        data: { error: err, status: "failed" },
      });
      return run;
    }

    try {
      await removePreviousDesignDocs(outputRoot);
      const { written, errors } = await writeCodegenFileMap(
        outputRoot,
        fileMap,
      );

      const prdBody = run.steps.prd?.content ?? "";
      const trdBody = run.steps.trd?.content ?? "";
      const sysDesignBody = run.steps.sysdesign?.content ?? "";
      const implGuideBody = run.steps.implguide?.content ?? "";
      const designSpecBody = run.steps.design?.content ?? "";

      const prdSpec =
        (run.steps.prd?.metadata?.prdSpec as PrdSpec | undefined) ?? null;

      // Persist the structured PRD spec to a sidecar so the coding API (a
      // separate HTTP request) can pick it up and forward it to the frontend
      // worker. Without this, PAGE-*/CMP-* context never reaches code-gen.
      if (prdSpec) {
        try {
          const blueprintDir = path.join(outputRoot, ".blueprint");
          await fs.mkdir(blueprintDir, { recursive: true });
          await fs.writeFile(
            path.join(blueprintDir, "PRD_SPEC.json"),
            JSON.stringify(prdSpec, null, 2),
            "utf-8",
          );
        } catch (e) {
          console.warn(
            `[Engine] Failed to persist .blueprint/PRD_SPEC.json (ignored):`,
            e instanceof Error ? e.message : e,
          );
        }
      }

      // Mirror user-uploaded design references into the output tree so coding
      // workers (and downstream tooling / manual inspection) can consult the
      // files from inside the generated project. Safe no-op when no uploads.
      let designReferenceEntries: Awaited<
        ReturnType<typeof copyDesignReferencesToOutput>
      > = [];
      try {
        designReferenceEntries = await copyDesignReferencesToOutput(
          process.cwd(),
          outputRoot,
        );
        if (designReferenceEntries.length > 0) {
          console.log(
            `[Engine] Copied ${designReferenceEntries.length} design reference(s) to <output>/.design-references/`,
          );
        }
      } catch (e) {
        console.warn(
          "[Engine] Failed to copy design references (ignored):",
          e instanceof Error ? e.message : e,
        );
      }
      const designReferencesBlock = formatDesignReferencesPromptBlock(
        designReferenceEntries,
      );

      const {
        tasks: taskBreakdown,
        costUsd: tbCost,
        durationMs: tbDuration,
        model: tbModel,
        parseFailed: taskBreakdownParseFailed,
        parseError: taskBreakdownParseError,
        rawOutput: taskBreakdownRawOutput,
        droppedFromTruncation: taskBreakdownDroppedFromTruncation,
        skillsTrace: taskBreakdownSkillsTrace,
      } = await buildTaskBreakdownFromDocuments({
        prd: prdBody,
        trd: trdBody || undefined,
        sysDesign: sysDesignBody || undefined,
        implGuide: implGuideBody || undefined,
        designSpec: designSpecBody || undefined,
        prdSpec,
        sessionId: run.sessionId,
        tier,
        designReferencesBlock: designReferencesBlock || undefined,
      });

      const { markdown: integrationMd, metadata: integrationMeta } =
        await runKickoffIntegrations({
          runId: run.id,
          sessionId: run.sessionId,
          featureBrief: run.featureBrief,
          codeOutputRoot: outputRoot,
          writtenFiles: written,
          prdExcerpt: prdBody,
        });

      const prdIndexForTasks =
        (run.steps.prd?.metadata?.prdRequirementIndex as
          | PrdRequirementIndex
          | undefined) ?? extractPrdRequirementIndex(prdBody);
      let taskCoverageGate = runTaskCoverageGate(
        prdIndexForTasks,
        taskBreakdown,
      );

      // P0 self-heal: if the gate failed, try to synthesise supplementary
      // tasks that cover the missing PRD requirement IDs. Non-fatal on
      // exhaustion; the UI still shows a warning, but the pipeline proceeds.
      const coverageRepairEmitter = createRepairEmitter([
        createJsonlRepairSink(outputRoot),
        consoleRepairSink,
      ]);
      const repairAttemptTracker = new AttemptTracker({
        outputDir: outputRoot,
      });
      await repairAttemptTracker.load();

      // Surface task-breakdown truncation honestly. The Coverage Gate
      // self-heal below will still try to cover the missing PRD ids with
      // supplementary tasks, but the telemetry here tells us the root cause
      // so we can tune token limits / model choice.
      if (
        typeof taskBreakdownDroppedFromTruncation === "number" &&
        taskBreakdownDroppedFromTruncation > 0
      ) {
        coverageRepairEmitter({
          stage: "task-breakdown",
          event: "truncation_detected",
          details: {
            recovered: taskBreakdown.length,
            dropped: taskBreakdownDroppedFromTruncation,
            rawLength: taskBreakdownRawOutput?.length ?? 0,
          },
        });
      }
      let coverageRepairSummary: {
        attempts: number;
        added: number;
        finalMissing: string[];
        costUsd: number;
      } | null = null;
      let finalTaskBreakdown = taskBreakdown;

      if (!taskCoverageGate.passed && taskCoverageGate.missingIds.length > 0) {
        try {
          const repairResult = await repairTaskCoverage({
            missingIds: taskCoverageGate.missingIds,
            existingTasks: taskBreakdown,
            prd: prdBody,
            trd: trdBody || undefined,
            sysDesign: sysDesignBody || undefined,
            implGuide: implGuideBody || undefined,
            prdSpec,
            tier,
            sessionId: run.sessionId,
            emitter: coverageRepairEmitter,
            attemptTracker: repairAttemptTracker,
          });
          finalTaskBreakdown = repairResult.tasks;
          taskCoverageGate = runTaskCoverageGate(
            prdIndexForTasks,
            finalTaskBreakdown,
          );
          coverageRepairSummary = {
            attempts: repairResult.attempts,
            added: repairResult.added.length,
            finalMissing: repairResult.finalMissing,
            costUsd: repairResult.costUsd,
          };
          if (repairResult.circuitOpen) {
            await escalateRepairCircuit({
              scope: {
                stage: "coverage-gate",
                scopeKey: missingIdsScopeKey(taskCoverageGate.missingIds),
              },
              tracker: repairAttemptTracker,
              outputDir: outputRoot,
              emitter: coverageRepairEmitter,
              sessionId: run.sessionId,
              reason:
                "Task-coverage repair circuit opened — the same missing-id set has been retried 3+ times without progress.",
            });
          }
        } catch (repairErr) {
          console.warn(
            `[Engine] Coverage Gate self-heal threw:`,
            repairErr instanceof Error ? repairErr.message : repairErr,
          );
          coverageRepairEmitter({
            stage: "coverage-gate",
            event: "repair_loop_error",
            details: {
              error:
                repairErr instanceof Error
                  ? repairErr.message
                  : String(repairErr),
            },
          });
        }
      }

      let coverageWarningBlock = "";
      if (!taskCoverageGate.passed && taskCoverageGate.missingIds.length > 0) {
        const missingList = taskCoverageGate.missingIds
          .slice(0, 10)
          .map((id) => `- \`${id}\``)
          .join("\n");
        const moreCount =
          taskCoverageGate.missingIds.length > 10
            ? `\n- ...and ${taskCoverageGate.missingIds.length - 10} more`
            : "";
        const repairLine = coverageRepairSummary
          ? `_Self-heal ran ${coverageRepairSummary.attempts} attempt(s), added ${coverageRepairSummary.added} task(s); ${coverageRepairSummary.finalMissing.length} id(s) remain._`
          : "";
        coverageWarningBlock = [
          "",
          "### Coverage Gate Warning",
          "",
          `**${taskCoverageGate.missingIds.length}** PRD requirement(s) not referenced by any task:`,
          "",
          missingList + moreCount,
          "",
          repairLine,
          "",
          "These requirements may not be implemented. Consider adding tasks that reference these IDs,",
          "or verify the task breakdown covers them implicitly.",
        ]
          .filter(Boolean)
          .join("\n");
      } else if (coverageRepairSummary && coverageRepairSummary.added > 0) {
        coverageWarningBlock = [
          "",
          "### Coverage Gate self-heal",
          "",
          `Added **${coverageRepairSummary.added}** supplementary task(s) across ${coverageRepairSummary.attempts} attempt(s) — all PRD requirement IDs now referenced.`,
        ].join("\n");
      }

      // P0 phase requirement gate + self-heal. Guarantees that a full-stack
      // project has at least one Backend Services-class task. Without this,
      // PRDs that depend on APIs / data layer silently ship with zero backend
      // code generated. Non-fatal: worst case we insert a synthetic task.
      let phaseGateReport = runPhaseRequirementGate({
        tier,
        tasks: finalTaskBreakdown,
        needsBackend: (
          run.steps.intent?.metadata?.classification as
            | { needsBackend?: boolean }
            | undefined
        )?.needsBackend,
      });
      let phaseRepairSummary: {
        addedByLlm: number;
        synthetic: boolean;
        costUsd: number;
      } | null = null;
      if (!phaseGateReport.passed) {
        try {
          const phaseResult = await repairMissingBackendPhase({
            existingTasks: finalTaskBreakdown,
            prd: prdBody,
            trd: trdBody || undefined,
            sysDesign: sysDesignBody || undefined,
            implGuide: implGuideBody || undefined,
            prdSpec,
            tier,
            uncoveredIds: taskCoverageGate.missingIds,
            sessionId: run.sessionId,
            emitter: coverageRepairEmitter,
            attemptTracker: repairAttemptTracker,
          });
          finalTaskBreakdown = phaseResult.tasks;
          phaseGateReport = runPhaseRequirementGate({
            tier,
            tasks: finalTaskBreakdown,
            needsBackend: (
              run.steps.intent?.metadata?.classification as
                | { needsBackend?: boolean }
                | undefined
            )?.needsBackend,
          });
          phaseRepairSummary = {
            addedByLlm: phaseResult.addedByLlm.length,
            synthetic: phaseResult.synthetic !== null,
            costUsd: phaseResult.costUsd,
          };
          if (phaseResult.circuitOpen) {
            await escalateRepairCircuit({
              scope: { stage: "phase-gate", scopeKey: "backend" },
              tracker: repairAttemptTracker,
              outputDir: outputRoot,
              emitter: coverageRepairEmitter,
              sessionId: run.sessionId,
              reason:
                "Backend phase repair circuit opened — synthesised tasks did not actually close the backend gap.",
            });
          }
          // After phase-repair we may have covered new ids too — refresh the
          // coverage gate so the warning block reflects reality.
          taskCoverageGate = runTaskCoverageGate(
            prdIndexForTasks,
            finalTaskBreakdown,
          );
        } catch (phaseErr) {
          console.warn(
            `[Engine] Phase gate self-heal threw:`,
            phaseErr instanceof Error ? phaseErr.message : phaseErr,
          );
          coverageRepairEmitter({
            stage: "phase-gate",
            event: "repair_loop_error",
            details: {
              error:
                phaseErr instanceof Error ? phaseErr.message : String(phaseErr),
            },
          });
        }
      }

      // Deterministic post-processing patches. Closes 3 common gaps the
      // coverage-repair loop cannot fix on its own:
      //   1. server.ts wiring for the start*Worker boot contract,
      //   2. injecting workers for cron pipelines declared in
      //      `.blueprint/pipeline-dag.yaml` that have no matching worker file,
      //   3. merging coverage-repair-produced placeholder tasks (empty
      //      creates+modifies) into a real sibling so coding workers never
      //      pick up a task with no file plan.
      let taskBreakdownPatches: TaskBreakdownPatchEntry[] = [];
      try {
        let pipelineDagYaml: string | undefined;
        try {
          pipelineDagYaml = await fs.readFile(
            path.join(this.projectRoot, ".blueprint", "pipeline-dag.yaml"),
            "utf-8",
          );
        } catch {
          pipelineDagYaml = undefined;
        }
        const patchResult = applyTaskBreakdownPatches({
          tasks: finalTaskBreakdown,
          trd: trdBody || undefined,
          pipelineDagYaml,
          tier,
          emitter: coverageRepairEmitter,
        });
        finalTaskBreakdown = patchResult.tasks;
        taskBreakdownPatches = patchResult.patches;
        if (patchResult.patches.length > 0) {
          // Re-evaluate gates since Rule C may remove fileless orphans (their
          // coversRequirementIds get folded into the surviving parent, so
          // coverage should not regress, but defence-in-depth is cheap).
          taskCoverageGate = runTaskCoverageGate(
            prdIndexForTasks,
            finalTaskBreakdown,
          );
          phaseGateReport = runPhaseRequirementGate({
            tier,
            tasks: finalTaskBreakdown,
            needsBackend: (
              run.steps.intent?.metadata?.classification as
                | { needsBackend?: boolean }
                | undefined
            )?.needsBackend,
          });
        }
      } catch (patchErr) {
        console.warn(
          `[Engine] Task-breakdown patch rules threw (non-fatal):`,
          patchErr instanceof Error ? patchErr.message : patchErr,
        );
        coverageRepairEmitter({
          stage: "task-breakdown",
          event: "patch_rules_error",
          details: {
            error:
              patchErr instanceof Error ? patchErr.message : String(patchErr),
          },
        });
      }

      // Evidence-gate evaluation for task-breakdown — telemetry only during
      // Phase B rollout. The pipeline does NOT block on this verdict yet;
      // the existing coverage-warning block continues to drive UX.
      try {
        const taskBreakdownEvidence = [
          evidenceFromGateReport(taskCoverageGate),
          evidenceFromGateReport(phaseGateReport),
        ];
        const tbEvidenceReport = runEvidenceGate(
          "task-breakdown",
          taskBreakdownEvidence,
        );
        coverageRepairEmitter({
          stage: "task-breakdown",
          event: "evidence_gate_evaluated",
          details: {
            passed: tbEvidenceReport.passed,
            missingRequirements: tbEvidenceReport.missingRequirements,
            evidenceCount: taskBreakdownEvidence.length,
          },
        });
      } catch (evidenceErr) {
        console.warn(
          `[Engine] task-breakdown evidence gate threw (non-fatal):`,
          evidenceErr instanceof Error ? evidenceErr.message : evidenceErr,
        );
      }

      const tbSummary =
        finalTaskBreakdown.length > 0
          ? `Task breakdown generated: **${finalTaskBreakdown.length}** coding tasks (see sub-tab).`
          : taskBreakdownParseFailed
            ? "Task breakdown generation returned non-JSON output and could not be parsed."
            : "Task breakdown could not be generated from documents.";
      const tbParseWarning = taskBreakdownParseFailed
        ? [
            "",
            "### Task Breakdown Parse Warning",
            "",
            "- The model output was not valid JSON for task breakdown.",
            "- You can retry **kick-off only** from the Kick-off panel without changing previous preparation artifacts.",
            taskBreakdownParseError
              ? `- Parse error: \`${taskBreakdownParseError}\``
              : "",
          ]
            .filter(Boolean)
            .join("\n")
        : "";
      const summary = [
        "## Project kick-off",
        "",
        `Scaffold written to disk. ${tbSummary}`,
        "",
        `### Output\n\n**${written.length}** file(s) → \`${outputRoot}\``,
        "",
        written.length
          ? `#### Files\n\n${written.map((w) => `- \`${w}\``).join("\n")}`
          : "",
        errors.length
          ? `#### Path warnings\n\n${errors.map((e) => `- ${e}`).join("\n")}`
          : "",
        tbParseWarning,
        integrationMd,
        coverageWarningBlock,
      ]
        .filter(Boolean)
        .join("\n\n");

      const stepResult = this.buildStepResult("kickoff", "completed", {
        content: summary,
        model: tbModel || "kickoff",
        costUsd: tbCost,
        durationMs: tbDuration,
        tokenUsage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        },
        metadata: {
          runId: run.id,
          outputRoot,
          written,
          errors,
          fileCount: written.length,
          integrations: integrationMeta,
          taskBreakdown: finalTaskBreakdown,
          taskBreakdownParseFailed,
          ...(taskBreakdownRawOutput ? { taskBreakdownRawOutput } : {}),
          ...(taskBreakdownParseError ? { taskBreakdownParseError } : {}),
          taskBreakdownSimulated: false,
          taskBreakdownConfirmed: finalTaskBreakdown.length === 0,
          taskCoverageGate,
          ...(coverageRepairSummary
            ? { coverageRepair: coverageRepairSummary }
            : {}),
          phaseRequirementGate: phaseGateReport,
          ...(phaseRepairSummary ? { phaseRepair: phaseRepairSummary } : {}),
          ...(taskBreakdownPatches.length > 0 ? { taskBreakdownPatches } : {}),
          taskBreakdownSkillsTrace,
        },
      });

      run.steps.kickoff = stepResult;
      run.updatedAt = new Date().toISOString();

      // Persist a kickoff snapshot so a later "PRD edit → propagate downstream"
      // flow can diff requirements and compute task deltas. Failure is logged
      // and swallowed inside writeKickoffSnapshot — never blocks the pipeline.
      const canonicalPrd = stripChangeMarkers(prdBody);
      await writeKickoffSnapshot(outputRoot, {
        sessionId: run.sessionId,
        runId: run.id,
        savedAt: new Date().toISOString(),
        prdContent: canonicalPrd,
        prdRequirementIndex: extractPrdRequirementIndex(canonicalPrd),
        prdSpec: prdSpec ?? undefined,
        tasks: finalTaskBreakdown,
        docs: {
          prd: canonicalPrd,
          trd: trdBody || undefined,
          sysdesign: sysDesignBody || undefined,
          implguide: implGuideBody || undefined,
          design: designSpecBody || undefined,
        },
      });

      this.emit({
        type: "step_complete",
        runId: run.id,
        stepId: "kickoff",
        data: stepResult,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      run.steps.kickoff = this.buildStepResult("kickoff", "failed", {
        error: msg,
      });
      run.status = "failed";
      run.updatedAt = new Date().toISOString();
      this.emit({
        type: "step_error",
        runId: run.id,
        stepId: "kickoff",
        data: { error: msg, status: "failed" },
      });
    }

    return run;
  }

  // ── Helpers ──

  /** Appends PRD requirement index + gate report to the PRD step (does not add a new pipeline step). */
  private attachPrdSpecGateToPrdStep(run: PipelineRun): PipelineRun {
    const prd = run.steps.prd;
    if (!prd?.content || prd.status !== "completed") return run;
    const gate = runPrdSpecGate(prd.content);
    const prdEvidence = [evidenceFromPrdSpecGate(gate)];
    const prdEvidenceReport = runEvidenceGate("prd", prdEvidence);
    run.steps.prd = {
      ...prd,
      metadata: {
        ...prd.metadata,
        prdRequirementIndex: gate.index,
        prdSpecGate: { passed: gate.passed, warnings: gate.warnings },
        evidenceGate: {
          passed: prdEvidenceReport.passed,
          missingRequirements: prdEvidenceReport.missingRequirements,
        },
      },
    };
    return run;
  }

  /**
   * LLM-based structured PRD extraction. Attaches `prdSpec` to `steps.prd.metadata`.
   * Non-blocking — errors are logged but never fail the pipeline.
   */
  /**
   * After TRD generation succeeds, parse the response for fenced code
   * blocks emitted under §6 / §7 and persist them. Delegates the I/O to
   * persistTrdArtifactsFromContent (shared with the parallel-generate
   * route) and just enriches step.metadata so the UI can surface the
   * outcome.
   *
   * Best-effort: a missing/malformed block degrades to "no shared schema"
   * (downstream codegen falls back to per-worker types) rather than
   * failing the step.
   */
  private async persistTrdArtifacts(run: PipelineRun): Promise<void> {
    const trd = run.steps.trd;
    if (!trd?.content || trd.status !== "completed") return;
    if (trd.metadata?.skipped) return;

    const blueprintDir = path.resolve(process.cwd(), ".blueprint");

    let result;
    try {
      result = await persistTrdArtifactsFromContent(trd.content, blueprintDir);
    } catch (err) {
      console.warn(
        "[Pipeline] TRD artifact persistence failed:",
        err instanceof Error ? err.message : err,
      );
      return;
    }

    const writtenRel: {
      schemaTs?: string;
      rulesYaml?: string;
      pipelineDagYaml?: string;
    } = {};
    if (result.written.schemaTs) {
      writtenRel.schemaTs = path.relative(
        process.cwd(),
        result.written.schemaTs,
      );
    }
    if (result.written.rulesYaml) {
      writtenRel.rulesYaml = path.relative(
        process.cwd(),
        result.written.rulesYaml,
      );
    }
    if (result.written.pipelineDagYaml) {
      writtenRel.pipelineDagYaml = path.relative(
        process.cwd(),
        result.written.pipelineDagYaml,
      );
    }

    if (result.rulesValidation && !result.rulesValidation.ok) {
      console.warn(
        `[Pipeline] business-rules.dsl.yaml has ${result.rulesValidation.warnings.length} warning(s):`,
        result.rulesValidation.warnings
          .map((w) => `${w.code}: ${w.message}`)
          .join("; "),
      );
    }
    if (result.dagValidation && !result.dagValidation.ok) {
      console.warn(
        `[Pipeline] pipeline-dag.yaml has ${result.dagValidation.warnings.length} warning(s):`,
        result.dagValidation.warnings
          .map((w) => `${w.code}: ${w.message}`)
          .join("; "),
      );
    }
    if (!result.contractValidation.ok) {
      console.warn(
        `[Pipeline] TRD runtime/data contract validation has ${result.contractValidation.warnings.length} blocker(s):`,
        result.contractValidation.warnings
          .map((w) => `${w.code}: ${w.message}`)
          .join("; "),
      );
    }

    // Evidence-gate for TRD — mandatory runtime/data contracts plus optional
    // artifact validators when the corresponding blocks were emitted.
    // during Phase B rollout; the metadata block lets the UI surface the
    // verdict without altering pipeline flow.
    let trdEvidenceVerdict:
      | { passed: boolean; missingRequirements: string[] }
      | undefined;
    const evidence = [
      evidenceFromTrdContractValidation(result.contractValidation),
      ...(result.rulesValidation
        ? [evidenceFromRulesValidation(result.rulesValidation)]
        : []),
      ...(result.dagValidation
        ? [evidenceFromDagValidation(result.dagValidation)]
        : []),
    ];
    const report = runEvidenceGate("trd", evidence);
    trdEvidenceVerdict = {
      passed: report.passed,
      missingRequirements: report.missingRequirements,
    };

    run.steps.trd = {
      ...trd,
      metadata: {
        ...trd.metadata,
        artifacts: {
          ...writtenRel,
          unknownPaths: result.artifacts.unknown.map((u) => u.path),
          malformed: result.artifacts.malformed,
          ...(result.rulesValidation
            ? { rulesValidation: result.rulesValidation }
            : {}),
          ...(result.dagValidation
            ? { dagValidation: result.dagValidation }
            : {}),
          contractValidation: result.contractValidation,
        },
        ...(trdEvidenceVerdict ? { evidenceGate: trdEvidenceVerdict } : {}),
      },
    };
  }

  private async attachPrdStructuredSpec(
    run: PipelineRun,
  ): Promise<PipelineRun> {
    const prd = run.steps.prd;
    if (!prd?.content || prd.status !== "completed") return run;

    let prdSpec: PrdSpec | null = null;
    try {
      prdSpec = await extractPrdSpec(prd.content, run.sessionId);
    } catch (e) {
      console.warn(
        "[Pipeline] PrdSpec extraction failed:",
        e instanceof Error ? e.message : e,
      );
    }

    if (!prdSpec) return run;

    run.steps.prd = {
      ...prd,
      metadata: {
        ...prd.metadata,
        prdSpec,
        wireframes: [],
      },
    };
    return run;
  }

  /**
   * Re-emits `step_complete` for PRD so clients receive `prdSpec` and gate metadata
   * (the initial emit happens before async extraction completes).
   */
  private emitPrdStepCompleteRefresh(run: PipelineRun): void {
    const prd = run.steps.prd;
    if (!prd || prd.status !== "completed") return;
    this.emit({
      type: "step_complete",
      runId: run.id,
      stepId: "prd",
      data: prd,
    });
  }

  /** QA coverage gate: compares QA audit text against PRD AC ids (metadata only). */
  private attachQaCoverageGate(
    run: PipelineRun,
    prdContent: string,
  ): PipelineRun {
    const qa = run.steps.qa;
    if (!qa?.content || qa.status !== "completed") return run;
    const prdIndex =
      (run.steps.prd?.metadata?.prdRequirementIndex as
        | PrdRequirementIndex
        | undefined) ?? extractPrdRequirementIndex(prdContent);
    const gate = runQaCoverageGate(prdIndex, qa.content);
    // QA evidence is currently single-validator (qa-ac-coverage); the
    // verifier-agent evidence is captured elsewhere when it runs.
    const qaEvidence = [evidenceFromGateReport(gate)];
    const qaEvidenceReport = runEvidenceGate("qa", qaEvidence);
    run.steps.qa = {
      ...qa,
      metadata: {
        ...qa.metadata,
        qaCoverageGate: gate,
        evidenceGate: {
          passed: qaEvidenceReport.passed,
          missingRequirements: qaEvidenceReport.missingRequirements,
        },
      },
    };
    return run;
  }

  private buildPrdOnlyKickoffFileMap(
    prdContent: string,
  ): Record<string, string> {
    const readme = [
      "# Scaffold",
      "",
      "Generated via Agentic Builder quick path (PRD → kick-off only).",
      "Implement the product from the generated project.",
      "",
    ].join("\n");
    return {
      "README.md": readme,
    };
  }

  private emitStubCompleted(
    run: PipelineRun,
    stepId: PipelineStepId,
    content: string,
    metadata?: Record<string, unknown>,
  ): PipelineRun {
    run.currentStep = stepId;
    this.emit({
      type: "step_start",
      runId: run.id,
      stepId,
      data: { status: "running" },
    });

    const isFromFile =
      metadata?.source &&
      typeof metadata.source === "string" &&
      metadata.source.startsWith("file:");
    const stepResult = this.buildStepResult(stepId, "completed", {
      content,
      model: isFromFile
        ? `static:${(metadata!.source as string).replace("file:", "")}`
        : "skipped:quick-start",
      costUsd: 0,
      durationMs: 0,
      tokenUsage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
      metadata,
    });

    run.steps[stepId] = stepResult;
    run.updatedAt = new Date().toISOString();

    this.emit({
      type: "step_complete",
      runId: run.id,
      stepId,
      data: stepResult,
    });

    return run;
  }

  /**
   * Run a PRD edit. Tries section-level patches first (fast, surgical,
   * highlights only what changed); falls back to a full regenerate-and-stream
   * if the patch agent's JSON can't be parsed, no headings match, or the
   * agent reports `fullRewrite: true`.
   */
  private async runPrdEdit(
    run: PipelineRun,
    pmAgent: PMAgent,
    existingPrd: string,
    editInstruction: string,
  ): Promise<AgentResult> {
    // ── 1. Try patch path ───────────────────────────────────────────────
    let patchResult: AgentResult | null = null;
    try {
      patchResult = await pmAgent.generatePRDPatchStreaming(
        existingPrd,
        editInstruction,
        // Swallow chunks — JSON tokens are not useful to display.
        () => {},
        run.sessionId,
      );
    } catch (err) {
      console.warn(
        "[engine] PRD patch agent failed, falling back to full regenerate:",
        err instanceof Error ? err.message : err,
      );
    }

    if (patchResult?.content) {
      const parsed = parsePrdPatchResponse(patchResult.content);
      if (parsed && !parsed.fullRewrite && parsed.patches.length > 0) {
        const applied = applyPrdPatches(existingPrd, parsed.patches);
        // Successful patch: at least one heading matched and the changed
        // footprint is below the "may as well full-rewrite" threshold.
        const overhalf =
          applied.originalLineCount > 0 &&
          applied.changedLineCount / applied.originalLineCount > 0.5;
        if (applied.applied.length > 0 && !overhalf) {
          // Emit the final content as a single stream chunk so the UI's
          // streamingContent matches step.content when complete.
          this.emit({
            type: "step_stream",
            runId: run.id,
            stepId: "prd",
            data: { chunk: applied.content, chunkType: "content" },
          });

          return {
            ...patchResult,
            content: applied.content,
          };
        }
        // Fall through to full rewrite.
        console.info(
          "[engine] PRD patch did not apply cleanly (applied=%d, skipped=%d, overhalf=%s) — falling back",
          applied.applied.length,
          applied.skipped.length,
          overhalf,
        );
      } else if (parsed?.fullRewrite) {
        console.info(
          "[engine] PRD patch agent reported fullRewrite=true — using full regenerate path",
        );
      }
    }

    // ── 2. Fall back to full streaming regenerate ──────────────────────
    return pmAgent.generatePRDEditStreaming(
      existingPrd,
      editInstruction,
      (chunk, chunkType) => {
        this.emit({
          type: "step_stream",
          runId: run.id,
          stepId: "prd",
          data: { chunk, chunkType },
        });
      },
      run.sessionId,
    );
  }

  /**
   * Propagate a PRD edit downstream: regenerate dependent docs, compute task
   * delta against the previous kickoff snapshot, and inject a session
   * checkpoint so coding re-runs only the affected tasks.
   *
   * Soft-fails: if no prior snapshot exists, logs a warning and returns the
   * run unchanged (caller will fall back to edit-only pause behavior).
   */
  private async runIncrementalDownstream(
    run: PipelineRun,
    outputRoot: string,
    tier: ProjectTier,
  ): Promise<PipelineRun> {
    const prdContent = run.steps.prd?.content ?? "";
    if (!prdContent) {
      console.warn("[engine] propagateAfterEdit: PRD content empty, skipping.");
      return run;
    }

    // 1. Load the previous snapshot — required as the diff baseline.
    const previousSnapshot: KickoffSnapshot | null =
      await readKickoffSnapshot(outputRoot);
    if (!previousSnapshot) {
      console.warn(
        "[engine] propagateAfterEdit: no last-kickoff-snapshot.json found; skipping propagation. Run a full pipeline first.",
      );
      return run;
    }

    // 2. Build regeneration context (PRD diff + task delta).
    const canonicalPrd = stripChangeMarkers(prdContent);
    const newRequirementIndex = extractPrdRequirementIndex(canonicalPrd);
    const regenCtx = buildRegenerationContext({
      previousSnapshot,
      newRequirementIndex,
      newPrdContent: canonicalPrd,
    });
    console.info(
      `[engine] propagate diff: +${regenCtx.prdDiff.added.length} ` +
        `-${regenCtx.prdDiff.removed.length} ~${regenCtx.prdDiff.modified.length} ` +
        `requirements; sections=${regenCtx.changedSectionHeadings.length}; ` +
        `taskDelta obsolete=${regenCtx.taskDelta.obsoleteTaskIds.length}, ` +
        `rerun=${regenCtx.taskDelta.taskIdsToRerun.length}, ` +
        `needs-new=${regenCtx.taskDelta.requirementsNeedingNewTasks.length}.`,
    );

    const plan = stepsForTier(tier);

    // 3. Re-run dependent docs (full regenerate; Phase B will patch).
    if (plan.needsTrd) {
      const prdMetadata = run.steps.prd?.metadata as
        | { prdSpec?: PrdSpec }
        | undefined;
      const prdSpec = prdMetadata?.prdSpec ?? null;
      const authDecision = await readAuthDecision(process.cwd());
      run = await this.executeStep(run, "trd", () =>
        this.trdAgent.generateTRD(
          canonicalPrd,
          tier,
          undefined,
          run.sessionId,
          prdSpec,
          undefined,
          authDecision,
        ),
      );
      if (run.status === "failed") return run;
      await this.persistTrdArtifacts(run);
    }

    const trdContent = run.steps.trd?.content ?? previousSnapshot.docs.trd ?? "";

    if (plan.needsSysDesign) {
      run = await this.executeStep(run, "sysdesign", () =>
        this.sysDesignAgent.generateSysDesign(
          canonicalPrd,
          trdContent,
          run.sessionId,
        ),
      );
      if (run.status === "failed") return run;
    }
    const sysDesignContent =
      run.steps.sysdesign?.content ?? previousSnapshot.docs.sysdesign ?? "";

    if (plan.needsImplGuide) {
      run = await this.executeStep(run, "implguide", () =>
        this.implGuideAgent.generateImplGuide(
          canonicalPrd,
          trdContent,
          sysDesignContent,
          run.sessionId,
        ),
      );
      if (run.status === "failed") return run;
    }
    const implGuideContent =
      run.steps.implguide?.content ?? previousSnapshot.docs.implguide ?? "";

    // Design Spec — always run (no tier gating in original pipeline either).
    run = await this.executeStep(run, "design", () =>
      this.designAgent.generateDesign(canonicalPrd, undefined, run.sessionId),
    );
    if (run.status === "failed") return run;
    const designContent =
      run.steps.design?.content ?? previousSnapshot.docs.design ?? "";

    // 3b. Re-run QA + Verify against the updated PRD/design so their audits
    //     reflect the change. The full pipeline runs these before kickoff;
    //     propagation previously skipped them, leaving stale QA/verify. Same
    //     tier gating as the full run (needsQa/needsVerify = tier !== "S").
    if (plan.needsQa) {
      run = await this.executeStep(run, "qa", () =>
        this.qaAgent.generateAudit(canonicalPrd, designContent, run.sessionId),
      );
      if (run.status === "failed") return run;
      run = this.attachQaCoverageGate(run, canonicalPrd);
    }
    if (plan.needsVerify) {
      run = await this.executeStep(run, "verify", () =>
        this.verifierAgent.verifyAlignment(
          canonicalPrd,
          designContent,
          run.sessionId,
        ),
      );
      if (run.status === "failed") return run;
    }

    // 4. Extract a fresh structured PRD spec from the EDITED PRD so the
    //    B-phase page/component diff sees the post-edit spec, not the stale
    //    baseline. The edit branch skips attachPrdStructuredSpec, so without
    //    this the snapshot/sidecar would carry only the previous spec (or
    //    null). Best-effort: fall back to step metadata → previous snapshot.
    let freshPrdSpec: PrdSpec | null = null;
    try {
      freshPrdSpec = await extractPrdSpec(canonicalPrd, run.sessionId);
    } catch (e) {
      console.warn(
        "[engine] propagate: prdSpec extraction failed (using fallback):",
        e instanceof Error ? e.message : e,
      );
    }
    const prdSpec =
      freshPrdSpec ??
      ((run.steps.prd?.metadata as { prdSpec?: PrdSpec } | undefined)
        ?.prdSpec) ??
      previousSnapshot.prdSpec ??
      null;
    if (freshPrdSpec && run.steps.prd) {
      run.steps.prd = {
        ...run.steps.prd,
        metadata: { ...run.steps.prd.metadata, prdSpec: freshPrdSpec },
      };
    }

    const incremental = await kickoffIncremental({
      regenCtx,
      newDocs: {
        prd: canonicalPrd,
        trd: trdContent || undefined,
        sysDesign: sysDesignContent || undefined,
        implGuide: implGuideContent || undefined,
        designSpec: designContent || undefined,
      },
      prdSpec,
      tier,
      sessionId: run.sessionId,
    });
    console.info(
      `[engine] kickoffIncremental: dropped=${incremental.droppedTaskIds.length}, ` +
        `new=${incremental.newTaskIds.length}, rerun=${incremental.tasksToRerunIds.length}, ` +
        `total=${incremental.tasks.length}.`,
    );

    // 5. Write a session-checkpoint that flags the rerun set as "failed" so
    //    the next coding run's existing retry-failed-tasks flow picks them up
    //    without any coding-side code changes.
    const rerunSet = new Set(incremental.tasksToRerunIds);
    const checkpointMap = new Map<string, TaskCheckpointEntry>();
    for (const task of incremental.tasks) {
      checkpointMap.set(
        task.id,
        rerunSet.has(task.id)
          ? { status: "failed", generatedFiles: [] }
          : { status: "completed", generatedFiles: [] },
      );
    }
    // Write the checkpoint where the coding flow reads/writes it
    // (coding/route.ts and coding/checkpoint GET both use process.cwd() ===
    // this.projectRoot), NOT outputRoot — otherwise the "retry failed tasks"
    // lookup never sees the rerun set and the propagate→coding loop breaks.
    await writeSessionCheckpoint(
      this.projectRoot,
      run.sessionId,
      checkpointMap,
      incremental.tasks.map((t) => t.id),
    );

    // 6. Persist a fresh kickoff snapshot reflecting the new state.
    await writeKickoffSnapshot(outputRoot, {
      sessionId: run.sessionId,
      runId: run.id,
      savedAt: new Date().toISOString(),
      prdContent: canonicalPrd,
      prdRequirementIndex: newRequirementIndex,
      prdSpec: prdSpec ?? undefined,
      tasks: incremental.tasks,
      docs: {
        prd: canonicalPrd,
        trd: trdContent || undefined,
        sysdesign: sysDesignContent || undefined,
        implguide: implGuideContent || undefined,
        design: designContent || undefined,
      },
    });

    // 6b. Persist the structured-spec sidecar so the coding API (a separate
    //     HTTP request) and B-phase tooling pick up the post-edit spec.
    //     Mirrors the full-kickoff write in runKickoffStep.
    if (prdSpec) {
      try {
        const blueprintDir = path.join(outputRoot, ".blueprint");
        await fs.mkdir(blueprintDir, { recursive: true });
        await fs.writeFile(
          path.join(blueprintDir, "PRD_SPEC.json"),
          JSON.stringify(prdSpec, null, 2),
          "utf-8",
        );
      } catch (e) {
        console.warn(
          "[engine] propagate: failed to persist .blueprint/PRD_SPEC.json (ignored):",
          e instanceof Error ? e.message : e,
        );
      }
    }

    // 7. Surface a kickoff step result for the UI so the existing step
    //    timeline picks up the propagation outcome.
    const summary = [
      "## Incremental kickoff (propagated from PRD edit)",
      "",
      `- New tasks: ${incremental.newTaskIds.length}`,
      `- Tasks to rerun: ${incremental.tasksToRerunIds.length}`,
      `- Obsolete tasks dropped: ${incremental.droppedTaskIds.length}`,
      `- Total tasks: ${incremental.tasks.length}`,
      "",
      `Coverage: requested=${incremental.diagnostics.requirementsRequested.length}, ` +
        `covered=${incremental.diagnostics.requirementsActuallyCovered.length}, ` +
        `still uncovered=${incremental.diagnostics.requirementsStillUncovered.length}.`,
    ].join("\n");

    run.steps.kickoff = this.buildStepResult("kickoff", "completed", {
      content: summary,
      model: "incremental",
      costUsd: incremental.diagnostics.costUsd,
      durationMs: incremental.diagnostics.durationMs,
      tokenUsage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
      metadata: {
        propagatedFromEdit: true,
        prdDiff: regenCtx.prdDiff,
        taskDelta: regenCtx.taskDelta,
        newTaskIds: incremental.newTaskIds,
        tasksToRerunIds: incremental.tasksToRerunIds,
        droppedTaskIds: incremental.droppedTaskIds,
        diagnostics: incremental.diagnostics,
        taskBreakdown: incremental.tasks,
      },
    });
    run.totalCostUsd += incremental.diagnostics.costUsd;
    run.updatedAt = new Date().toISOString();
    this.emit({
      type: "step_complete",
      runId: run.id,
      stepId: "kickoff",
      data: run.steps.kickoff,
    });

    return run;
  }

  private async executeStep(
    run: PipelineRun,
    stepId: PipelineStepId,
    executor: () => Promise<AgentResult>,
  ): Promise<PipelineRun> {
    run.currentStep = stepId;

    this.emit({
      type: "step_start",
      runId: run.id,
      stepId,
      data: { status: "running" },
    });

    try {
      const result = await executor();
      const processTrace = this.buildStepProcessTrace(result.content, result);

      const stepResult = this.buildStepResult(stepId, "completed", {
        content: result.content,
        model: result.model,
        costUsd: result.costUsd,
        durationMs: result.durationMs,
        tokenUsage: {
          promptTokens: result.usage.prompt_tokens,
          completionTokens: result.usage.completion_tokens,
          totalTokens: result.usage.total_tokens,
        },
        traceId: result.traceId,
        metadata: {
          processTrace,
        },
      });

      run.steps[stepId] = stepResult;
      run.totalCostUsd += result.costUsd;
      run.updatedAt = new Date().toISOString();

      this.emit({
        type: "step_complete",
        runId: run.id,
        stepId,
        data: stepResult,
      });

      return run;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";

      run.steps[stepId] = this.buildStepResult(stepId, "failed", {
        error: errorMsg,
      });
      run.status = "failed";
      run.updatedAt = new Date().toISOString();

      this.emit({
        type: "step_error",
        runId: run.id,
        stepId,
        data: { error: errorMsg, status: "failed" },
      });

      return run;
    }
  }

  private buildStepResult(
    stepId: PipelineStepId,
    status: StepResult["status"],
    partial: Partial<StepResult> = {},
  ): StepResult {
    return {
      stepId,
      status,
      timestamp: new Date().toISOString(),
      ...partial,
    };
  }

  /**
   * Safe process summary for users.
   * Does not expose hidden chain-of-thought; only observable generation facts.
   */
  private buildStepProcessTrace(
    content: string,
    result: AgentResult,
  ): {
    outline: string[];
    model: string;
    durationMs: number;
    costUsd: number;
    tokenUsage?: AgentResult["usage"];
  } {
    const headingMatches = [...content.matchAll(/^#{1,4}\s+(.+)$/gm)]
      .map((m) => (m[1] ?? "").trim())
      .filter(Boolean)
      .slice(0, 8);
    const outline =
      headingMatches.length > 0
        ? headingMatches
        : content
            .split("\n")
            .map((l) => l.trim())
            .filter((l) => l.length > 0)
            .slice(0, 5);
    return {
      outline,
      model: result.model,
      durationMs: result.durationMs,
      costUsd: result.costUsd,
      tokenUsage: result.usage,
    };
  }

  private emit(event: PipelineEvent) {
    this.onEvent?.(event);
  }

  private async readStaticDesign(): Promise<string> {
    const abs = path.join(this.projectRoot, STATIC_DESIGN_RELATIVE_PATH);
    try {
      const raw = await fs.readFile(abs, "utf-8");
      if (raw.trim().length > 0) return raw;
    } catch {
      /* use fallback */
    }
    return FAST_MODE_DESIGN_FALLBACK;
  }

  /**
   * In fast mode, try to read existing document files from the code output directory.
   * Supports common filename variations.
   */
  /**
   * Read the user-uploaded PRD written by `/api/agents/pipeline/prd-import`.
   * Checks the project-scoped path first (`<outputRoot>/.blueprint/PRD.md`),
   * then falls back to the legacy global path (`<projectRoot>/.blueprint/PRD.md`)
   * for backward compatibility.
   * Returns null when absent or whitespace-only.
   */
  private async readImportedPrd(outputRoot?: string): Promise<string | null> {
    const candidates: string[] = [];
    if (outputRoot) {
      candidates.push(path.join(outputRoot, ".blueprint", "PRD.md"));
    }
    candidates.push(path.join(this.projectRoot, ".blueprint", "PRD.md"));

    for (const filePath of candidates) {
      try {
        const raw = await fs.readFile(filePath, "utf-8");
        if (raw.trim().length > 0) return raw;
      } catch {
        /* try next candidate */
      }
    }
    return null;
  }

  private async readExistingDocsFromOutput(outputRoot: string): Promise<{
    prd: string | null;
    trd: string | null;
    sysDesign: string | null;
    implGuide: string | null;
    designSpec: string | null;
  }> {
    const tryRead = async (names: string[]): Promise<string | null> => {
      for (const name of names) {
        try {
          const raw = await fs.readFile(path.join(outputRoot, name), "utf-8");
          if (raw.trim().length > 0) return raw;
        } catch {
          /* try next */
        }
      }
      return null;
    };

    const [prd, trd, sysDesign, implGuide, designSpec] = await Promise.all([
      tryRead(["PRD.md", "prd.md"]),
      tryRead(["TRD.md", "trd.md"]),
      tryRead([
        "SystemDesign.md",
        "system-design.md",
        "SysDesign.md",
        "SYSTEM_DESIGN.md",
      ]),
      tryRead([
        "ImpelementGuide.md",
        "ImplementGuide.md",
        "ImplementationGuide.md",
        "impl-guide.md",
        "IMPLEMENTATION_GUIDE.md",
      ]),
      tryRead(["DesignSpec.md", "design-spec.md", "DESIGN.md", "Design.md"]),
    ]);

    return { prd, trd, sysDesign, implGuide, designSpec };
  }
}
