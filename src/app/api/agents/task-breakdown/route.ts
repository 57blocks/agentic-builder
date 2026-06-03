import { NextRequest } from "next/server";
import {
  normalizeProjectTier,
  type ProjectTier,
} from "@/lib/agents/project-classifier";
import type { PrdSpec } from "@/lib/requirements/prd-spec-types";
import { buildTaskBreakdownFromDocuments } from "@/lib/pipeline/kickoff-task-breakdown.server";
import { extractPrdInventory } from "@/lib/pipeline/subsystems/inventory";
import { decomposePrdIntoSubsystems } from "@/lib/pipeline/subsystems/decompose";
import { shouldSplitIntoSubsystems } from "@/lib/pipeline/subsystems/split-decision";
import { resolveDomainRequirementIds } from "@/lib/pipeline/subsystems/domain-requirements";
import {
  runDomainScopedBreakdown,
  type BreakdownFn,
} from "@/lib/pipeline/subsystems/domain-breakdown";

// Subsystem mode fans out into decompose + foundation + one breakdown per
// domain (many LLM calls), so allow a long request.
export const maxDuration = 800;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    prd,
    trd,
    sysdesign,
    implguide,
    design,
    prdSpec,
    sessionId,
    tier,
    improvementNotes,
    subsystemMode,
  } = body as {
    prd?: string;
    trd?: string;
    sysdesign?: string;
    implguide?: string;
    design?: string;
    prdSpec?: PrdSpec | null;
    sessionId?: string;
    tier?: string;
    improvementNotes?: string[];
    /** Opt-in: decompose into business-domain subsystems and break down each
     *  domain separately (tasks tagged with `subsystem`). Default off — normal
     *  whole-system breakdown. */
    subsystemMode?: boolean;
  };

  if (!prd || !prd.trim()) {
    return Response.json(
      { error: "PRD content is required for task breakdown" },
      { status: 400 },
    );
  }

  const resolvedTier = normalizeProjectTier(
    ((tier ?? "M").toUpperCase() as ProjectTier) ?? "M",
  );

  // ── Subsystem mode (opt-in) ────────────────────────────────────────────────
  if (subsystemMode) {
    const inventory = extractPrdInventory(prd);
    const decomposed = await decomposePrdIntoSubsystems(prd, { tier: resolvedTier });
    const decision = shouldSplitIntoSubsystems({
      tier: resolvedTier,
      inventory,
      manifest: decomposed.manifest,
      validation: decomposed.validation,
    });

    if (decision.split) {
      const { byDomain } = resolveDomainRequirementIds(prd, decomposed.manifest);
      const breakdownFn: BreakdownFn = async (input) => {
        const r = await buildTaskBreakdownFromDocuments({
          prd: input.prd,
          trd: input.trd,
          sysDesign: input.sysDesign,
          implGuide: input.implGuide,
          designSpec: input.designSpec,
          prdSpec: prdSpec ?? null,
          sessionId: input.sessionId,
          tier: input.tier,
          incremental: input.incremental,
        });
        return { tasks: r.tasks, costUsd: r.costUsd };
      };

      const result = await runDomainScopedBreakdown({
        docs: {
          prd,
          trd: trd || undefined,
          sysDesign: sysdesign || undefined,
          implGuide: implguide || undefined,
          designSpec: design || undefined,
        },
        manifest: decomposed.manifest,
        domainRequirementIds: byDomain,
        buildLayers: decomposed.validation.buildLayers,
        tier: resolvedTier,
        sessionId,
        breakdownFn,
      });

      return Response.json({
        ok: true,
        subsystemMode: true,
        split: true,
        manifest: decomposed.manifest,
        buildLayers: decomposed.validation.buildLayers,
        splitReasons: decision.reasons,
        taskBreakdown: result.allTasks,
        foundationTaskIds: result.foundationTasks.map((t) => t.id),
        costUsd: result.costUsd + decomposed.costUsd,
      });
    }
    // Not big/decomposable enough — fall through to a normal breakdown but tell
    // the caller why it wasn't split.
    const result = await buildTaskBreakdownFromDocuments({
      prd,
      trd: trd || undefined,
      sysDesign: sysdesign || undefined,
      implGuide: implguide || undefined,
      designSpec: design || undefined,
      prdSpec: prdSpec ?? null,
      sessionId,
      tier: resolvedTier,
    });
    return Response.json({
      ok: true,
      subsystemMode: true,
      split: false,
      splitReasons: decision.reasons,
      taskBreakdown: result.tasks,
      taskBreakdownParseFailed: result.parseFailed,
      costUsd: result.costUsd + decomposed.costUsd,
    });
  }

  // ── Normal whole-system breakdown (unchanged default) ──────────────────────
  const result = await buildTaskBreakdownFromDocuments({
    prd,
    trd: trd || undefined,
    sysDesign: sysdesign || undefined,
    implGuide: implguide || undefined,
    designSpec: design || undefined,
    prdSpec: prdSpec ?? null,
    sessionId,
    tier: resolvedTier,
    improvementNotes: Array.isArray(improvementNotes)
      ? improvementNotes.filter((n) => typeof n === "string" && n.trim().length > 0)
      : undefined,
  });

  return Response.json({
    ok: true,
    taskBreakdown: result.tasks,
    taskBreakdownParseFailed: result.parseFailed,
    taskBreakdownParseError: result.parseError,
    taskBreakdownRawOutput: result.rawOutput,
    costUsd: result.costUsd,
    durationMs: result.durationMs,
    model: result.model,
  });
}
