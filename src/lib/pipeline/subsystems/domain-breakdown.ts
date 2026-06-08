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
import {
  buildDomainMd,
  extractPrdSections,
  collectSharedSectionAnchors,
} from "./domain-files";

/** Phases whose tasks are shared infrastructure, not owned by one domain. */
export const FOUNDATION_PHASES = new Set([
  "Scaffolding",
  "Data Layer",
  "Integration",
  "Infrastructure",
]);

/** Title hints for the shared frontend foundation task (phase "Frontend"). */
const FOUNDATION_TITLE_RE = /foundation|design tokens|shared ui|app shell|layout shell|router skeleton/i;

/** Shared frontend foundation FILES (P3.3): a task that creates any of these
 *  owns the cross-cutting design system / shell / router every domain reuses,
 *  so it belongs to the Phase-1 foundation regardless of its title/phase. More
 *  robust than the title regex, which depends on the generated wording. */
const FOUNDATION_FILE_RE =
  /^frontend\/src\/(styles\/tokens\.css|router\.tsx|components\/(ui|layout)\/)/;

function taskCreates(t: KickoffWorkItem): string[] {
  if (!t.files) return [];
  if (Array.isArray(t.files)) return t.files;
  return t.files.creates ?? [];
}

export function isFoundationTask(t: KickoffWorkItem): boolean {
  if (FOUNDATION_PHASES.has(t.phase)) return true;
  if (t.phase === "Frontend" && FOUNDATION_TITLE_RE.test(t.title)) return true;
  // Robust fallback: owns shared frontend-foundation files (tokens/ui/layout/router).
  if (taskCreates(t).some((f) => FOUNDATION_FILE_RE.test(f))) return true;
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
  const { docs, manifest, domainRequirementIds, buildLayers, tier, sessionId, breakdownFn } = args;
  let costUsd = 0;

  // 1. Foundation: full breakdown, keep only the shared/structural tasks.
  const foundationFull = await breakdownFn({ ...docs, tier, sessionId });
  costUsd += foundationFull.costUsd;
  const foundationTasks = foundationFull.tasks.filter(isFoundationTask);

  // Per-domain passes feed a SCOPED PRD (the domain's own sections + shared
  // global specs + dependency contracts — the same slice as domain-{id}.md)
  // instead of the full mega-PRD. The full PRD was being re-sent on every
  // domain pass (N× a ~200KB doc); the slice is a fraction of that and carries
  // exactly what the domain needs. Shared anchors are project-wide → once.
  const sharedAnchors = collectSharedSectionAnchors(docs.prd);
  const subsystemById = new Map(manifest.subsystems.map((s) => [s.id, s]));
  const scopedPrdFor = (domainId: string): string => {
    const s = subsystemById.get(domainId);
    if (!s) return docs.prd;
    const prdSlice = extractPrdSections(docs.prd, s.prdSections);
    if (!prdSlice.trim()) return docs.prd; // no anchored sections → don't starve it
    const ownedAnchors = new Set(
      s.prdSections.map((r) => r.replace(/^§/, "").trim()),
    );
    const sharedForThis = sharedAnchors.filter(
      (a) => !ownedAnchors.has(a.replace(/^§/, "").trim()),
    );
    const sharedContent = extractPrdSections(docs.prd, sharedForThis);
    const layerIdx = buildLayers.findIndex((l) => l.includes(domainId));
    return buildDomainMd(s, manifest.subsystems, layerIdx, prdSlice, sharedContent);
  };

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
          prd: scopedPrdFor(domainId),
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
