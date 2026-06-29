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

import fs from "fs";
import path from "path";
import { buildTaskBreakdownFromDocuments } from "../kickoff-task-breakdown.server";
import { backfillPrdIds } from "../gates/prd-id-backfill";
import { extractPrdInventory } from "./inventory";
import { decomposePrdIntoSubsystems } from "./decompose";
import { validateSubsystemManifest } from "./validate";
import { shouldSplitIntoSubsystems, MIN_ENDPOINTS_FOR_SPLIT, MIN_DOMAINS_FOR_SPLIT } from "./split-decision";
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

/** TEMP diagnostic — dump the subsystem gate decision so we can see at runtime
 *  why a regenerate did (or didn't) split. Safe/no-throw; remove once resolved. */
function dumpSubsystemDecision(info: Record<string, unknown>): void {
  try {
    const dir = path.join(process.cwd(), "generated-code", ".blueprint");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, "subsystem-decision.json"),
      JSON.stringify({ at: new Date().toISOString(), ...info }, null, 2),
    );
  } catch {
    /* diagnostic only */
  }
}

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

  // Gate 1 — cheap precheck. Non-candidates take the unchanged default path,
  // UNLESS the user already persisted a subsystem manifest from the PRD step
  // (they explicitly split the project). In that case we skip to Gate 2 so the
  // manifest is evaluated as a fallback rather than silently discarded.
  const gate1Candidate = isSubsystemSplitCandidate(params.prd, tier);
  if (!gate1Candidate) {
    const endpointCount = extractPrdInventory(params.prd).apiEndpoints.length;
    dumpSubsystemDecision({
      stage: "gate1",
      tier,
      envDisabled: process.env.BLUEPRINT_SUBSYSTEM_BREAKDOWN === "0",
      endpoints: endpointCount,
      minEndpoints: MIN_ENDPOINTS_FOR_SPLIT,
      candidate: false,
      hasFallbackManifest: !!opts?.fallbackManifest,
      prdLen: params.prd?.length ?? 0,
      result: opts?.fallbackManifest
        ? "gate1 failed but has persisted manifest — falling through to gate2 fallback check"
        : "whole-system (gate1 failed)",
    });
    if (!opts?.fallbackManifest) {
      return buildTaskBreakdownFromDocuments(params);
    }
    // User explicitly split the PRD — jump straight to the fallback check below.
    console.log(
      `[Subsystems] Gate 1 failed (${endpointCount} endpoints < ${MIN_ENDPOINTS_FOR_SPLIT}) but persisted manifest found — evaluating fallback.`,
    );
  }

  const inventory = extractPrdInventory(params.prd);

  // When Gate 1 was skipped (user has a persisted manifest), go straight to
  // evaluating the fallback — skip the decompose LLM call entirely.
  if (!gate1Candidate && opts?.fallbackManifest) {
    const fb = opts.fallbackManifest;
    const fbValidation = validateSubsystemManifest(fb);
    dumpSubsystemDecision({
      stage: "gate1-fallback",
      tier,
      endpoints: inventory.apiEndpoints.length,
      fallbackDomains: fb.subsystems.length,
      fallbackValidationOk: fbValidation.ok,
      result: fbValidation.ok
        ? `split using persisted manifest (${fb.subsystems.length} domains, endpoint gate skipped)`
        : `whole-system (persisted manifest is invalid)`,
    });
    // For a user-persisted manifest we trust the explicit split decision and
    // skip the endpoint-count gate (which only applies to auto-detection).
    // Just re-validate structure and domain count.
    const minDomains = Number(process.env.BLUEPRINT_SUBSYSTEM_MIN_DOMAINS) || MIN_DOMAINS_FOR_SPLIT;
    if (!fbValidation.ok || fb.subsystems.length < minDomains) {
      console.log(
        `[Subsystems] persisted manifest invalid or too few domains (${fb.subsystems.length} < ${minDomains}) — falling back to whole-system.`,
      );
      return buildTaskBreakdownFromDocuments(params);
    }
    console.log(
      `[Subsystems] Gate 1 bypassed — using persisted PRD-step manifest (${fb.subsystems.length} domains, skipping endpoint-count gate).`,
    );
    const manifest = fb;
    const buildLayers = fbValidation.buildLayers;
    const splitReasons = ["gate1 bypassed — persisted PRD-step manifest accepted (endpoint gate skipped)", `domains=${fb.subsystems.length} ≥ ${minDomains}`];
    return runDomainBreakdownWithManifest({
      params, inventory, manifest, buildLayers, splitReasons, usedFallbackManifest: true,
    });
  }

  // Gate 2 — decompose (the only added LLM cost, and only for genuine candidates).
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

  dumpSubsystemDecision({
    stage: "gate2",
    tier,
    endpoints: inventory.apiEndpoints.length,
    decomposeDidFallback: decomposed.didFallback,
    decomposeValidationOk: decomposed.validation.ok,
    decomposeDomains: decomposed.manifest.subsystems.length,
    decomposeErrors: decomposed.validation.errors?.slice(0, 6) ?? [],
    liveDecisionSplit: decision.split,
    liveDecisionReasons: decision.reasons,
    hadFallbackManifest: !!opts?.fallbackManifest,
    usedFallbackManifest,
    willSplit,
    result: willSplit
      ? `split into ${manifest.subsystems.length} domains${usedFallbackManifest ? " (fallback)" : ""}`
      : "whole-system (gate2 said no)",
  });

  if (!willSplit) {
    console.log(`[Subsystems] not splitting: ${decision.reasons.join("; ")}`);
    return buildTaskBreakdownFromDocuments(params);
  }

  console.log(
    `[Subsystems] splitting into ${manifest.subsystems.length} domain(s)${usedFallbackManifest ? " [fallback manifest]" : ""}: ${manifest.subsystems.map((s) => s.id).join(", ")}`,
  );

  return runDomainBreakdownWithManifest({
    params, inventory, manifest, buildLayers, splitReasons,
    usedFallbackManifest, extraCostUsd: decomposed.costUsd,
  });
}

// ── Shared domain breakdown helper ──────────────────────────────────────────

async function runDomainBreakdownWithManifest({
  params,
  inventory,
  manifest,
  buildLayers,
  splitReasons,
  usedFallbackManifest,
  extraCostUsd = 0,
}: {
  params: BreakdownParams;
  inventory: ReturnType<typeof extractPrdInventory>;
  manifest: SubsystemManifest;
  buildLayers: string[][];
  splitReasons: string[];
  usedFallbackManifest: boolean;
  extraCostUsd?: number;
}): Promise<SubsystemAwareBreakdownResult> {
  void inventory; // used for logging context elsewhere; kept for symmetry

  console.log(
    `[Subsystems] splitting into ${manifest.subsystems.length} domain(s)${usedFallbackManifest ? " [persisted manifest]" : ""}: ${manifest.subsystems.map((s) => s.id).join(", ")}`,
  );

  // Resolve each domain's requirement IDs. This needs PAGE-/API- ids ON the PRD.
  // The engine gate backfills the PRD too, but its mutated content may not have
  // reached here — so backfill (idempotent) ourselves and use the id-tagged PRD
  // for the per-domain docs, guaranteeing the domains resolve their ids.
  const filledPrd = backfillPrdIds(params.prd).prd;
  const resolution = resolveDomainRequirementIds(filledPrd, manifest);
  const { byDomain } = resolution;
  const totalResolved = [...byDomain.values()].reduce((n, ids) => n + ids.length, 0);
  console.log(`[Subsystems] resolved ${totalResolved} requirement id(s) across ${byDomain.size} domain(s).`);

  // Coverage safety net: any requirement id no subsystem claimed (via route,
  // endpoint, or owned section) reaches no per-domain breakdown and is silently
  // dropped from the build — the root cause of large "uncovered AC" gate
  // failures. Orphans are rescued into the nearest domain so they still get a
  // task; truly unplaceable ids fail the breakdown now rather than post-gen.
  if (resolution.orphanRequirementIds.length > 0) {
    console.warn(
      `[Subsystems] rescued ${resolution.orphanRequirementIds.length} orphan requirement id(s) ` +
        `unclaimed by any subsystem section → routed to nearest domain so they get tasks: ` +
        resolution.orphanRequirementIds.join(", "),
    );
  }
  if (resolution.unrescuableRequirementIds.length > 0) {
    throw new Error(
      `Task breakdown coverage gate failed: ${resolution.unrescuableRequirementIds.length} ` +
        `requirement id(s) could not be assigned to any subsystem: ` +
        resolution.unrescuableRequirementIds.join(", "),
    );
  }

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
    tier: (params.tier ?? "M") as "S" | "M" | "L",
    sessionId: params.sessionId,
    breakdownFn,
  });

  // Fallback safety: if somehow no foundation result was captured, use a fresh
  // full breakdown for the metadata envelope.
  const envelope: BreakdownResult = foundationFull ?? (await buildTaskBreakdownFromDocuments(params));

  return {
    ...envelope,
    tasks: orch.allTasks,
    costUsd: envelope.costUsd + orch.costUsd + extraCostUsd,
    subsystem: {
      manifest,
      buildLayers,
      foundationTaskIds: orch.foundationTasks.map((t) => t.id),
      domainRequirementIds: Object.fromEntries(byDomain),
      splitReasons,
    },
  };
}
