/**
 * Validate a subsystem manifest and derive the build order.
 *
 * Hard checks (any failure → ok=false, must be fixed before development):
 *   1. Unique subsystem ids.
 *   2. Every `dependsOn` references an existing subsystem.
 *   3. The dependency graph is acyclic (so a build order exists).
 *   4. Each subsystem is non-empty (owns ≥1 route / endpoint / module).
 *   5. EXCLUSIVE ownership: no route / endpoint / collection is owned by 2+
 *      subsystems.
 *
 * Optional coverage check (when the caller passes the PRD inventory): every
 * expected route / endpoint / collection is owned by exactly one subsystem
 * (missing → error; owned-but-unknown → warning).
 *
 * On success, `buildLayers` is the topological layering: each layer is a set of
 * subsystem ids with no inter-dependency, so all members of a layer can be
 * developed in parallel; layers are processed in order.
 */

import type { Subsystem, SubsystemManifest } from "./types";

export interface ManifestValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  /** Topological layers of subsystem ids; [] when the graph is cyclic. */
  buildLayers: string[][];
}

export interface ManifestCoverageExpectation {
  routes?: string[];
  apiEndpoints?: string[];
  collections?: string[];
}

function findDuplicateOwners(
  subsystems: Subsystem[],
  pick: (s: Subsystem) => string[],
  label: string,
  errors: string[],
): void {
  const owners = new Map<string, string[]>();
  for (const s of subsystems) {
    for (const item of pick(s)) {
      const key = item.trim();
      if (!key) continue;
      const list = owners.get(key) ?? [];
      list.push(s.id);
      owners.set(key, list);
    }
  }
  for (const [item, ids] of owners) {
    if (ids.length > 1) {
      errors.push(
        `${label} "${item}" is owned by multiple subsystems: ${[...new Set(ids)].sort().join(", ")} (ownership must be exclusive).`,
      );
    }
  }
}

function checkCoverage(
  subsystems: Subsystem[],
  expected: string[] | undefined,
  pick: (s: Subsystem) => string[],
  label: string,
  errors: string[],
  warnings: string[],
): void {
  if (!expected || expected.length === 0) return;
  const owned = new Set<string>();
  for (const s of subsystems) for (const item of pick(s)) owned.add(item.trim());
  const expectedSet = new Set(expected.map((e) => e.trim()));
  for (const want of expectedSet) {
    if (!owned.has(want)) errors.push(`${label} "${want}" is not owned by any subsystem (coverage gap).`);
  }
  for (const have of owned) {
    if (!expectedSet.has(have)) warnings.push(`${label} "${have}" is owned but not in the PRD inventory (possibly stale).`);
  }
}

/**
 * Kahn's algorithm. Returns topological layers, or null if a cycle exists.
 * Within each layer, ids are sorted for deterministic output.
 */
function topoLayers(subsystems: Subsystem[]): string[][] | null {
  const ids = new Set(subsystems.map((s) => s.id));
  const deps = new Map<string, Set<string>>();
  for (const s of subsystems) {
    deps.set(s.id, new Set(s.dependsOn.filter((d) => ids.has(d))));
  }
  const layers: string[][] = [];
  const resolved = new Set<string>();
  while (resolved.size < ids.size) {
    const layer = [...ids]
      .filter((id) => !resolved.has(id))
      .filter((id) => [...(deps.get(id) ?? [])].every((d) => resolved.has(d)))
      .sort();
    if (layer.length === 0) return null; // remaining nodes form a cycle
    for (const id of layer) resolved.add(id);
    layers.push(layer);
  }
  return layers;
}

export function validateSubsystemManifest(
  manifest: SubsystemManifest,
  expected?: ManifestCoverageExpectation,
): ManifestValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const subsystems = manifest.subsystems ?? [];

  if (subsystems.length === 0) {
    return { ok: false, errors: ["Manifest has no subsystems."], warnings, buildLayers: [] };
  }

  // 1. Unique ids.
  const seen = new Set<string>();
  for (const s of subsystems) {
    if (seen.has(s.id)) errors.push(`Duplicate subsystem id "${s.id}".`);
    seen.add(s.id);
  }

  // 2. dependsOn references resolve.
  for (const s of subsystems) {
    for (const dep of s.dependsOn) {
      if (!seen.has(dep)) errors.push(`Subsystem "${s.id}" dependsOn unknown subsystem "${dep}".`);
      if (dep === s.id) errors.push(`Subsystem "${s.id}" dependsOn itself.`);
    }
  }

  // 4. Non-empty.
  for (const s of subsystems) {
    const size = s.ownedRoutes.length + s.ownedApiEndpoints.length + s.ownedModules.length;
    if (size === 0) {
      errors.push(`Subsystem "${s.id}" owns no routes, endpoints, or modules (empty subsystem).`);
    }
  }

  // 5. Exclusive ownership.
  findDuplicateOwners(subsystems, (s) => s.ownedRoutes, "Route", errors);
  findDuplicateOwners(subsystems, (s) => s.ownedApiEndpoints, "Endpoint", errors);
  findDuplicateOwners(subsystems, (s) => s.ownedCollections, "Collection", errors);

  // Optional coverage vs PRD inventory.
  checkCoverage(subsystems, expected?.routes, (s) => s.ownedRoutes, "Route", errors, warnings);
  checkCoverage(subsystems, expected?.apiEndpoints, (s) => s.ownedApiEndpoints, "Endpoint", errors, warnings);
  checkCoverage(subsystems, expected?.collections, (s) => s.ownedCollections, "Collection", errors, warnings);

  // 3. Acyclic → build order.
  const layers = topoLayers(subsystems);
  if (layers === null) {
    const ids = subsystems.map((s) => s.id).sort();
    errors.push(
      `Dependency graph has a cycle — no build order exists. Inspect dependsOn among: ${ids.join(", ")}.`,
    );
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    buildLayers: layers ?? [],
  };
}
