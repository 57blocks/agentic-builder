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

/** Functional / acceptance / component requirement IDs the task-coverage gate
 *  checks (FR-*, AC-*, CMP-*). PAGE-/API- are handled separately via the
 *  route/endpoint maps; the gate does not check API-*. */
const REQ_ID_RE = /\b(?:FR|AC|CMP)-[A-Z0-9]+\b/g;

/** Leading dotted section number from a markdown heading, e.g. "10.2", "26", "15.10". */
function headingSectionNumber(line: string): string | null {
  const m = line.match(/^#{1,6}\s+(\d+(?:\.\d+)*)\b/);
  return m ? m[1] : null;
}

/** Normalize a manifest prdSection ref ("§10.2", " §6 ") to a bare number ("10.2"). */
function normalizeSectionRef(ref: string): string {
  return ref.replace(/§/g, "").trim();
}

/**
 * Map each PRD section number → the FR-/AC-/CMP- requirement IDs that appear in
 * that section's body (until the next heading). A domain that owns "§10.2" then
 * inherits the requirement IDs declared under "### 10.2 …", so its per-domain
 * breakdown covers them and the task-coverage gate is satisfied.
 */
export function buildSectionRequirementIdMap(prd: string): Map<string, Set<string>> {
  const bySection = new Map<string, Set<string>>();
  let current: string | null = null;
  for (const line of prd.split("\n")) {
    const sec = headingSectionNumber(line);
    if (sec) {
      current = sec;
      if (!bySection.has(sec)) bySection.set(sec, new Set());
      continue;
    }
    if (!current) continue;
    const ids = line.match(REQ_ID_RE);
    if (ids) for (const id of ids) bySection.get(current)!.add(id);
  }
  return bySection;
}

/** A domain ref "10.2" owns section key K when K === "10.2" or K starts with "10.2."
 *  (so "§10" sweeps 10, 10.1, 10.2.3; "§10.2" sweeps 10.2 and 10.2.x). */
function sectionRefMatches(ref: string, key: string): boolean {
  return key === ref || key.startsWith(ref + ".");
}

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
  const sectionReqIds = buildSectionRequirementIdMap(prd);
  const sectionKeys = [...sectionReqIds.keys()];
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
    // Inherit the FR-/AC-/CMP- IDs declared in the domain's owned PRD sections,
    // so the per-domain breakdown covers what the task-coverage gate checks
    // (gate: AC-/FR-/PAGE-/CMP-). Without this, only PAGE-/API- were assigned
    // and every FR-/AC- id read as "missing" → an expensive coverage repair.
    for (const ref of s.prdSections ?? []) {
      const norm = normalizeSectionRef(ref);
      if (!norm) continue;
      for (const key of sectionKeys) {
        if (sectionRefMatches(norm, key)) {
          for (const id of sectionReqIds.get(key)!) ids.add(id);
        }
      }
    }
    byDomain.set(s.id, [...ids].sort());
  }

  return { byDomain, unresolved };
}
