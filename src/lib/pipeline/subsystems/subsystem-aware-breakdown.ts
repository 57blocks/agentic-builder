/**
 * Subsystem-aware task breakdown — the engine kickoff step calls THIS instead of
 * `buildTaskBreakdownFromDocuments` directly. It returns the SAME shape (so the
 * engine destructure is unchanged) and, only when a project qualifies, swaps the
 * whole-system breakdown for a per-domain one (tasks tagged with `subsystem`),
 * attaching a `subsystem` extra (manifest + build layers) for persistence.
 *
 * Two-level gate so NON-qualifying projects are completely unaffected — they
 * don't even pay for a decompose call:
 *   1. cheap, no-LLM precheck: tier === "L" AND PRD endpoints ≥ threshold;
 *   2. only then: decompose (1 LLM) + shouldSplitIntoSubsystems (domains/balance).
 * Either gate failing ⇒ verbatim `buildTaskBreakdownFromDocuments` (default flow).
 *
 * Disable entirely with BLUEPRINT_SUBSYSTEM_BREAKDOWN=0.
 */

import { buildTaskBreakdownFromDocuments } from "../kickoff-task-breakdown.server";
import { backfillPrdIds } from "../gates/prd-id-backfill";
import { extractPrdInventory } from "./inventory";
import { decomposePrdIntoSubsystems } from "./decompose";
import { shouldSplitIntoSubsystems, MIN_ENDPOINTS_FOR_SPLIT } from "./split-decision";
import { resolveDomainRequirementIds } from "./domain-requirements";
import { runDomainScopedBreakdown, type BreakdownFn } from "./domain-breakdown";
import type { SubsystemManifest } from "./types";

type BreakdownParams = Parameters<typeof buildTaskBreakdownFromDocuments>[0];
type BreakdownResult = Awaited<ReturnType<typeof buildTaskBreakdownFromDocuments>>;

export interface SubsystemBreakdownExtra {
  manifest: SubsystemManifest;
  buildLayers: string[][];
  foundationTaskIds: string[];
  domainRequirementIds: Record<string, string[]>;
  splitReasons: string[];
}

export type SubsystemAwareBreakdownResult = BreakdownResult & {
  subsystem?: SubsystemBreakdownExtra;
};

/** Cheap, no-LLM gate: is this even a candidate for subsystem mode? */
export function isSubsystemSplitCandidate(prd: string, tier: string): boolean {
  if (process.env.BLUEPRINT_SUBSYSTEM_BREAKDOWN === "0") return false;
  if (tier !== "L") return false;
  return extractPrdInventory(prd).apiEndpoints.length >= MIN_ENDPOINTS_FOR_SPLIT;
}

export async function runSubsystemAwareTaskBreakdown(
  params: BreakdownParams,
): Promise<SubsystemAwareBreakdownResult> {
  const tier = params.tier ?? "M";

  // Gate 1 — cheap precheck. Non-candidates take the unchanged default path.
  if (!isSubsystemSplitCandidate(params.prd, tier)) {
    return buildTaskBreakdownFromDocuments(params);
  }

  // Gate 2 — decompose (the only added LLM cost, and only for genuine candidates).
  const inventory = extractPrdInventory(params.prd);
  const decomposed = await decomposePrdIntoSubsystems(params.prd, {
    tier: tier as "S" | "M" | "L",
  });
  const decision = shouldSplitIntoSubsystems({
    tier: tier as "S" | "M" | "L",
    inventory,
    manifest: decomposed.manifest,
    validation: decomposed.validation,
  });
  if (!decision.split) {
    console.log(`[Subsystems] not splitting: ${decision.reasons.join("; ")}`);
    return buildTaskBreakdownFromDocuments(params);
  }

  console.log(
    `[Subsystems] splitting into ${decomposed.manifest.subsystems.length} domain(s): ${decomposed.manifest.subsystems.map((s) => s.id).join(", ")}`,
  );

  // Resolve each domain's requirement IDs. This needs PAGE-/API- ids ON the PRD.
  // The engine gate backfills the PRD too, but its mutated content may not have
  // reached here — so backfill (idempotent) ourselves and use the id-tagged PRD
  // for the per-domain docs, guaranteeing the domains resolve their ids.
  const filledPrd = backfillPrdIds(params.prd).prd;
  const { byDomain } = resolveDomainRequirementIds(filledPrd, decomposed.manifest);
  const totalResolved = [...byDomain.values()].reduce((n, ids) => n + ids.length, 0);
  console.log(`[Subsystems] resolved ${totalResolved} requirement id(s) across ${byDomain.size} domain(s).`);
  let foundationFull: BreakdownResult | null = null;
  const breakdownFn: BreakdownFn = async (input) => {
    const r = await buildTaskBreakdownFromDocuments({
      prd: input.prd,
      trd: input.trd,
      sysDesign: input.sysDesign,
      implGuide: input.implGuide,
      designSpec: input.designSpec,
      prdSpec: params.prdSpec,
      sessionId: input.sessionId,
      tier: input.tier,
      incremental: input.incremental,
    });
    if (!input.incremental && !foundationFull) foundationFull = r;
    return { tasks: r.tasks, costUsd: r.costUsd };
  };

  const orch = await runDomainScopedBreakdown({
    docs: {
      prd: filledPrd,
      trd: params.trd,
      sysDesign: params.sysDesign,
      implGuide: params.implGuide,
      designSpec: params.designSpec,
    },
    manifest: decomposed.manifest,
    domainRequirementIds: byDomain,
    buildLayers: decomposed.validation.buildLayers,
    tier: tier as "S" | "M" | "L",
    sessionId: params.sessionId,
    breakdownFn,
  });

  // Fallback safety: if somehow no foundation result was captured, use a fresh
  // full breakdown for the metadata envelope.
  const envelope: BreakdownResult = foundationFull ?? (await buildTaskBreakdownFromDocuments(params));

  return {
    ...envelope,
    tasks: orch.allTasks,
    costUsd: envelope.costUsd + orch.costUsd + decomposed.costUsd,
    subsystem: {
      manifest: decomposed.manifest,
      buildLayers: decomposed.validation.buildLayers,
      foundationTaskIds: orch.foundationTasks.map((t) => t.id),
      domainRequirementIds: Object.fromEntries(byDomain),
      splitReasons: decision.reasons,
    },
  };
}
