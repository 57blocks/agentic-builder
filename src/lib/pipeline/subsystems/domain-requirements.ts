/**
 * Resolve each subsystem domain to the requirement IDs it owns, by joining the
 * (backfilled) PRD's PAGE-/API- ids onto the manifest's owned routes/endpoints.
 *
 * Precondition: the PRD has passed the strict PRD-ID gate (every route row has a
 * PAGE-NNN, every §26 endpoint heading an API-NNN). Then a domain's
 * requirementIds = the PAGE-ids of its ownedRoutes + the API-ids of its
 * ownedApiEndpoints. Those IDs feed the per-domain task breakdown's
 * `requirementsToCover`, so tasks are generated scoped + tagged per domain.
 *
 * Pure (no IO / no LLM).
 */

import { endpointMatchKey } from "./active-scope";
import type { SubsystemManifest } from "./types";

const PAGE_ID_RE = /\bPAGE-\d+\b/;
const API_ID_RE = /\bAPI-\d+\b/;
const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

/** route path → PAGE-id, parsed from backfilled §7.1 route-table rows. */
export function buildRouteIdMap(prd: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of prd.split("\n")) {
    const m = line.match(/^\|\s*`(\/[^`]+)`\s*\|/);
    if (!m || m[1].startsWith("/api/")) continue;
    const id = line.match(PAGE_ID_RE);
    if (id) map.set(m[1].trim(), id[0]);
  }
  return map;
}

/** endpoint match-key → API-id, parsed from backfilled §26 endpoint headings. */
export function buildEndpointIdMap(prd: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of prd.split("\n")) {
    const m = line.match(/^#{2,4}\s+([A-Z/\s]+?)\s+`([^`]+)`/);
    if (!m) continue;
    const path = m[2].trim();
    if (!path.startsWith("/api/")) continue;
    const methods = m[1]
      .split(/[/\s]+/)
      .map((s) => s.trim().toUpperCase())
      .filter((s) => HTTP_METHODS.includes(s));
    const id = line.match(API_ID_RE);
    if (!id) continue;
    for (const method of methods) map.set(endpointMatchKey(method, path), id[0]);
  }
  return map;
}

export interface DomainRequirementResolution {
  byDomain: Map<string, string[]>;
  /** owned routes/endpoints that had no id in the PRD (PRD-ID gate should prevent this). */
  unresolved: string[];
}

export function resolveDomainRequirementIds(
  prd: string,
  manifest: SubsystemManifest,
): DomainRequirementResolution {
  const routeIds = buildRouteIdMap(prd);
  const endpointIds = buildEndpointIdMap(prd);
  const byDomain = new Map<string, string[]>();
  const unresolved: string[] = [];

  for (const s of manifest.subsystems) {
    const ids = new Set<string>();
    for (const route of s.ownedRoutes) {
      const id = routeIds.get(route.trim());
      if (id) ids.add(id);
      else unresolved.push(`route ${route} (${s.id})`);
    }
    for (const ep of s.ownedApiEndpoints) {
      const parsed = ep.trim().match(/^([A-Za-z]+)\s+(\S+)$/);
      if (!parsed) continue;
      const id = endpointIds.get(endpointMatchKey(parsed[1], parsed[2]));
      if (id) ids.add(id);
      else unresolved.push(`endpoint ${ep} (${s.id})`);
    }
    byDomain.set(s.id, [...ids].sort());
  }

  return { byDomain, unresolved };
}
