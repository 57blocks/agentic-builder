/**
 * P3.4 — subsystem build observability.
 *
 * Pure summariser: given the manifest + which subsystems have completed +
 * which (if any) is currently building, return a structured status (build
 * layers + per-domain state) for logs / UI. No IO — callers feed in the data
 * read from manifest-io / progress-io / active-scope.
 */

import type { SubsystemManifest } from "./types";
import { validateSubsystemManifest } from "./validate";

export type DomainState = "completed" | "active" | "pending";

export interface DomainStatus {
  id: string;
  name: string;
  /** Topological layer index (-1 if the manifest is invalid / unlayered). */
  layer: number;
  state: DomainState;
  dependsOn: string[];
}

export interface SubsystemStatus {
  total: number;
  completed: number;
  pending: number;
  activeId: string | null;
  /** Topological build order; layers run in sequence, members in parallel. */
  layers: string[][];
  domains: DomainStatus[];
}

export function summarizeSubsystemStatus(
  manifest: SubsystemManifest,
  completedIds: Iterable<string> = [],
  activeId: string | null = null,
): SubsystemStatus {
  const done = new Set(completedIds);
  const layers = validateSubsystemManifest(manifest).buildLayers ?? [];
  const layerOf = new Map<string, number>();
  layers.forEach((layer, i) => layer.forEach((id) => layerOf.set(id, i)));

  const domains: DomainStatus[] = manifest.subsystems.map((s) => ({
    id: s.id,
    name: s.name,
    layer: layerOf.get(s.id) ?? -1,
    state: done.has(s.id) ? "completed" : s.id === activeId ? "active" : "pending",
    dependsOn: s.dependsOn,
  }));

  const completed = domains.filter((d) => d.state === "completed").length;
  return {
    total: domains.length,
    completed,
    pending: domains.length - completed,
    activeId: activeId && domains.some((d) => d.id === activeId) ? activeId : null,
    layers,
    domains,
  };
}

/** One-line, log-friendly rendering: "build order: L0[a,b] → L1[c] · 1/3 done". */
export function formatSubsystemStatusLine(status: SubsystemStatus): string {
  const order = status.layers
    .map((layer, i) => `L${i}[${layer.join(",")}]`)
    .join(" → ");
  return `build order: ${order || "(none)"} · ${status.completed}/${status.total} done${status.activeId ? ` · active=${status.activeId}` : ""}`;
}
