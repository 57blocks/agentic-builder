import { NextRequest } from "next/server";
import {
  normalizeProjectTier,
  type ProjectTier,
} from "@/lib/agents/project-classifier";
import type { PrdSpec } from "@/lib/requirements/prd-spec-types";
import { buildTaskBreakdownFromDocuments } from "@/lib/pipeline/kickoff-task-breakdown.server";
import { buildBreakdownDesignReferencesBlock } from "@/lib/pipeline/design-references";
import { extractPrdInventory } from "@/lib/pipeline/subsystems/inventory";
import { decomposePrdIntoSubsystems } from "@/lib/pipeline/subsystems/decompose";
import { shouldSplitIntoSubsystems } from "@/lib/pipeline/subsystems/split-decision";
import { resolveDomainRequirementIds } from "@/lib/pipeline/subsystems/domain-requirements";
import {
  runDomainScopedBreakdown,
  type BreakdownFn,
} from "@/lib/pipeline/subsystems/domain-breakdown";
import { hasPlanSignals } from "@/lib/agentic-build";

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
    projectId,
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
    /** Per-project design-reference isolation key. Lets the breakdown read THIS
     *  project's uploaded screenshots (`.blueprint/projects/<id>/...`) rather
     *  than the legacy global location. */
    projectId?: string;
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

  // Goal-mode short-circuit: if the PRD conservatively looks like a runnable
  // milestone+acceptance plan, skip task decomposition entirely. The coding
  // stage detects the persisted build plan and runs the agentic acceptance
  // loop instead. Detection is a cheap regex, so ordinary PRDs are untouched.
  if (hasPlanSignals(prd).detected) {
    return Response.json({
      ok: true,
      goalMode: true,
      taskBreakdown: [],
      costUsd: 0,
    });
  }

  const resolvedTier = normalizeProjectTier(
    ((tier ?? "M").toUpperCase() as ProjectTier) ?? "M",
  );

  // Per-page design digests (image-derived, cached, text-only) so the
  // standalone regenerate path decomposes against the REAL designs instead of
  // inventing dashboard/summary/table components from PRD prose. "" when there
  // are no uploaded references — no behavioural change. Shared cache with the
  // coding stage; each screenshot is parsed at most once.
  const designReferencesBlock =
    (await buildBreakdownDesignReferencesBlock(process.cwd(), projectId)) ||
    undefined;

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
      const resolution = resolveDomainRequirementIds(prd, decomposed.manifest);
      const { byDomain } = resolution;

      // Coverage visibility + gate. Orphans are requirement ids no subsystem
      // claimed; they were rescued into the nearest domain so they still get a
      // task (previously they were silently dropped → "uncovered AC" at the end).
      if (resolution.orphanRequirementIds.length > 0) {
        console.warn(
          `[task-breakdown] rescued ${resolution.orphanRequirementIds.length} orphan requirement id(s) ` +
            `unclaimed by any subsystem section — routed to nearest domain so they get tasks: ` +
            resolution.orphanRequirementIds.join(", "),
        );
      }
      if (resolution.unrescuableRequirementIds.length > 0) {
        // A requirement that reaches no domain breakdown is dropped from the
        // build. Fail loudly at planning time instead of discovering it
        // post-generation as an uncovered acceptance criterion.
        return Response.json(
          {
            error:
              `Task breakdown coverage gate failed: ` +
              `${resolution.unrescuableRequirementIds.length} requirement id(s) could not be ` +
              `assigned to any subsystem: ${resolution.unrescuableRequirementIds.join(", ")}`,
          },
          { status: 422 },
        );
      }
      const breakdownFn: BreakdownFn = async (input) => {
        const r = await buildTaskBreakdownFromDocuments({
          prd: input.prd,
          trd: input.trd,
          sysDesign: input.sysDesign,
          implGuide: input.implGuide,
          designSpec: input.designSpec,
          designReferencesBlock,
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
      designReferencesBlock,
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
    designReferencesBlock,
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
