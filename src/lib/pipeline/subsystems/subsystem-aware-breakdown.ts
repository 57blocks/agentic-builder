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
import { validateSubsystemManifest } from "./validate";
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
  opts?: {
    /** A manifest already split & persisted by the PRD step
     *  (.blueprint/subsystems.json). Used as a SAFETY NET only when this run's
     *  live decompose fails the split gate (e.g. an LLM hiccup) — so a one-off
     *  decompose failure doesn't silently drop a qualified project back to
     *  whole-system mode after the user explicitly split in the UI. */
    fallbackManifest?: SubsystemManifest | null;
  },
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

  // The manifest/layers we actually build from — the live decompose, or (when
  // that fails the gate) the persisted PRD-step manifest as a safety net.
  let manifest = decomposed.manifest;
  let buildLayers = decomposed.validation.buildLayers;
  let splitReasons = decision.reasons;
  let usedFallbackManifest = false;
  let willSplit = decision.split;

  if (!willSplit && opts?.fallbackManifest) {
    const fb = opts.fallbackManifest;
    const fbValidation = validateSubsystemManifest(fb);
    const fbDecision = shouldSplitIntoSubsystems({
      tier: tier as "S" | "M" | "L",
      inventory,
      manifest: fb,
      validation: fbValidation,
    });
    if (fbDecision.split) {
      manifest = fb;
      buildLayers = fbValidation.buildLayers;
      splitReasons = [
        `live decompose unusable (${decision.reasons.join("; ")}) — reused persisted PRD-step manifest`,
        ...fbDecision.reasons,
      ];
      willSplit = true;
      usedFallbackManifest = true;
      console.log(
        `[Subsystems] live decompose failed the gate; reusing persisted PRD-step manifest (${fb.subsystems.length} domains).`,
      );
    } else {
      console.log(
        `[Subsystems] persisted PRD-step manifest also fails the gate: ${fbDecision.reasons.join("; ")}`,
      );
    }
  }

  if (!willSplit) {
    console.log(`[Subsystems] not splitting: ${decision.reasons.join("; ")}`);
    return buildTaskBreakdownFromDocuments(params);
  }

  console.log(
    `[Subsystems] splitting into ${manifest.subsystems.length} domain(s)${usedFallbackManifest ? " [fallback manifest]" : ""}: ${manifest.subsystems.map((s) => s.id).join(", ")}`,
  );

  // Resolve each domain's requirement IDs. This needs PAGE-/API- ids ON the PRD.
  // The engine gate backfills the PRD too, but its mutated content may not have
  // reached here — so backfill (idempotent) ourselves and use the id-tagged PRD
  // for the per-domain docs, guaranteeing the domains resolve their ids.
  const filledPrd = backfillPrdIds(params.prd).prd;
  const { byDomain } = resolveDomainRequirementIds(filledPrd, manifest);
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
    manifest,
    domainRequirementIds: byDomain,
    buildLayers,
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
      manifest,
      buildLayers,
      foundationTaskIds: orch.foundationTasks.map((t) => t.id),
      domainRequirementIds: Object.fromEntries(byDomain),
      splitReasons,
    },
  };
}
