/**
 * ③ Per-domain scoped task-breakdown.
 *
 * The whole-system breakdown is domain-unaware (and, empirically, doesn't tag
 * tasks with requirement IDs), so post-hoc assignment is brittle. Instead, once
 * the PRD carries requirement IDs (PRD-ID gate) and the decomposer has resolved
 * each domain's IDs (domain-requirements.ts), we run task-breakdown PER DOMAIN
 * with `requirementsToCover` scoped to that domain — tasks are then born tagged
 * with their `subsystem` and aligned to the domain by construction.
 *
 * Flow:
 *   1. Foundation pass — a full breakdown; keep the SHARED/structural tasks
 *      (scaffold, global data layer, contracts, app shell). These have no single
 *      owning domain and become the Phase-1 foundation.
 *   2. For each domain in topological order — a scoped breakdown
 *      (requirementsToCover = domain ids, existingTasks = everything built so
 *      far) → tag each task with `subsystem = domainId`.
 *
 * The breakdown call is injected (`breakdownFn`) so the assembly/tagging/order
 * logic is unit-tested without the LLM; the default wires the real server fn.
 */

import type { KickoffWorkItem } from "../types";

type ProjectTier = "S" | "M" | "L";
import type { SubsystemManifest } from "./types";

/** Phases whose tasks are shared infrastructure, not owned by one domain. */
export const FOUNDATION_PHASES = new Set([
  "Scaffolding",
  "Data Layer",
  "Integration",
  "Infrastructure",
]);

/** Title hints for the shared frontend foundation task (phase "Frontend"). */
const FOUNDATION_TITLE_RE = /foundation|design tokens|shared ui|app shell|layout shell|router skeleton/i;

export function isFoundationTask(t: KickoffWorkItem): boolean {
  if (FOUNDATION_PHASES.has(t.phase)) return true;
  if (t.phase === "Frontend" && FOUNDATION_TITLE_RE.test(t.title)) return true;
  return false;
}

/** Minimal slice of buildTaskBreakdownFromDocuments we depend on. */
export interface BreakdownInput {
  prd: string;
  trd?: string;
  sysDesign?: string;
  implGuide?: string;
  designSpec?: string;
  tier?: ProjectTier;
  sessionId?: string;
  incremental?: {
    existingTasks: Array<{ id: string; title: string; coversRequirementIds: string[] }>;
    requirementsToCover: string[];
  };
}
export type BreakdownFn = (input: BreakdownInput) => Promise<{ tasks: KickoffWorkItem[]; costUsd: number }>;

export interface DomainBreakdownResult {
  foundationTasks: KickoffWorkItem[];
  byDomain: Map<string, KickoffWorkItem[]>;
  /** foundation + all domain tasks, in build order (foundation first). */
  allTasks: KickoffWorkItem[];
  costUsd: number;
}

function slim(t: KickoffWorkItem): { id: string; title: string; coversRequirementIds: string[] } {
  return { id: t.id, title: t.title, coversRequirementIds: t.coversRequirementIds ?? [] };
}

export async function runDomainScopedBreakdown(args: {
  docs: { prd: string; trd?: string; sysDesign?: string; implGuide?: string; designSpec?: string };
  manifest: SubsystemManifest;
  /** domainId → requirement IDs (from resolveDomainRequirementIds). */
  domainRequirementIds: Map<string, string[]>;
  /** Topological layers of subsystem ids (from validateSubsystemManifest.buildLayers). */
  buildLayers: string[][];
  tier?: ProjectTier;
  sessionId?: string;
  breakdownFn: BreakdownFn;
}): Promise<DomainBreakdownResult> {
  const { docs, domainRequirementIds, buildLayers, tier, sessionId, breakdownFn } = args;
  let costUsd = 0;

  // 1. Foundation: full breakdown, keep only the shared/structural tasks.
  const foundationFull = await breakdownFn({ ...docs, tier, sessionId });
  costUsd += foundationFull.costUsd;
  const foundationTasks = foundationFull.tasks.filter(isFoundationTask);

  // 2. Per-domain scoped passes, in topological order. Domains in the SAME
  //    layer are mutually independent (no dependsOn between them), so they run
  //    CONCURRENTLY; `existingTasks` only needs to accumulate ACROSS layers
  //    (a domain depends only on earlier-layer domains). This cuts wall-clock
  //    from O(#domains) sequential calls to O(#layers) rounds.
  const byDomain = new Map<string, KickoffWorkItem[]>();
  const accumulated: KickoffWorkItem[] = [...foundationTasks];

  for (const layer of buildLayers) {
    const existingTasks = accumulated.map(slim); // snapshot — stable for the whole layer
    const layerResults = await Promise.all(
      layer.map(async (domainId) => {
        const reqs = domainRequirementIds.get(domainId) ?? [];
        if (reqs.length === 0) return { domainId, tagged: [] as KickoffWorkItem[], costUsd: 0 };
        const r = await breakdownFn({
          ...docs,
          tier,
          sessionId,
          incremental: { existingTasks, requirementsToCover: reqs },
        });
        return {
          domainId,
          tagged: r.tasks.map((t) => ({ ...t, subsystem: domainId })),
          costUsd: r.costUsd,
        };
      }),
    );
    // Commit the layer's results after the whole layer completes.
    for (const { domainId, tagged, costUsd: c } of layerResults) {
      byDomain.set(domainId, tagged);
      accumulated.push(...tagged);
      costUsd += c;
    }
  }

  return {
    foundationTasks,
    byDomain,
    allTasks: accumulated,
    costUsd,
  };
}
