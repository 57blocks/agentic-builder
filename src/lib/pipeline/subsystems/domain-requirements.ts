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

/** Leading top-level section number as an int, e.g. "10.2.3" → 10. Used to route
 *  orphaned requirements to the numerically-nearest domain (PRDs cluster related
 *  features by section number). Unparseable keys sort last. */
function topLevelSection(key: string): number {
  const n = Number.parseInt(key.split(".")[0] ?? "", 10);
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
}

/** Every FR-/AC-/CMP- id that appears under any numbered PRD section. */
function allSectionRequirementIds(
  sectionReqIds: Map<string, Set<string>>,
): Set<string> {
  const all = new Set<string>();
  for (const ids of sectionReqIds.values()) for (const id of ids) all.add(id);
  return all;
}

/**
 * Choose the domain that should absorb an orphaned requirement id (one no domain
 * claimed via route/endpoint/section). Picks the domain whose owned PRD sections
 * are numerically nearest the orphan's own section(s). Deterministic tie-break:
 * nearer wins → more owned sections wins → smallest id wins. Returns null only
 * when the manifest has no subsystems at all.
 */
function pickRescueDomain(
  id: string,
  idSections: Map<string, string[]>,
  manifest: SubsystemManifest,
  domainTopSections: Map<string, number[]>,
): string | null {
  const orphanTops = (idSections.get(id) ?? []).map(topLevelSection);
  let best: { id: string; dist: number; owned: number } | null = null;
  for (const s of manifest.subsystems) {
    const tops = domainTopSections.get(s.id) ?? [];
    let dist = Number.MAX_SAFE_INTEGER;
    if (orphanTops.length && tops.length) {
      for (const a of orphanTops)
        for (const b of tops) dist = Math.min(dist, Math.abs(a - b));
    }
    const cand = { id: s.id, dist, owned: tops.length };
    if (
      !best ||
      cand.dist < best.dist ||
      (cand.dist === best.dist && cand.owned > best.owned) ||
      (cand.dist === best.dist && cand.owned === best.owned && cand.id < best.id)
    ) {
      best = cand;
    }
  }
  return best ? best.id : null;
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
  /** Every FR-/AC-/CMP- id found under a numbered PRD section — the universe the
   *  task breakdown must cover. */
  allRequirementIds: string[];
  /** IDs no domain claimed via routes/endpoints/sections. Each was rescued into
   *  the nearest domain (see byDomain) so it still produces a task; this list is
   *  the audit trail of what would otherwise have been silently dropped. */
  orphanRequirementIds: string[];
  /** Orphans that could not be placed at all (only when the manifest has zero
   *  subsystems). A non-empty list must fail the breakdown coverage gate. */
  unrescuableRequirementIds: string[];
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

  // ── Orphan rescue ──────────────────────────────────────────────────────────
  // Requirement assignment above is driven by what each domain claims (routes,
  // endpoints, sections). Any FR-/AC-/CMP- id sitting in a PRD section that NO
  // domain claims reaches no per-domain breakdown — so the coding stage never
  // receives it and the feature is silently dropped (the root cause of large
  // "uncovered AC" gate failures: secondary UI states, secondary modals, and
  // whole secondary pages live in unclaimed subsections). Rescue every such
  // orphan into the numerically-nearest domain so a real task is generated.
  const allReqIds = allSectionRequirementIds(sectionReqIds);
  const assigned = new Set<string>();
  for (const list of byDomain.values()) for (const id of list) assigned.add(id);

  // id → section keys it appears in (for proximity routing).
  const idSections = new Map<string, string[]>();
  for (const [key, ids] of sectionReqIds) {
    for (const id of ids) {
      const arr = idSections.get(id);
      if (arr) arr.push(key);
      else idSections.set(id, [key]);
    }
  }

  // Each domain's claimed top-level section numbers (computed once).
  const domainTopSections = new Map<string, number[]>();
  for (const s of manifest.subsystems) {
    const tops: number[] = [];
    for (const ref of s.prdSections ?? []) {
      const norm = normalizeSectionRef(ref);
      if (norm) tops.push(topLevelSection(norm));
    }
    domainTopSections.set(s.id, tops);
  }

  const orphanRequirementIds: string[] = [];
  const unrescuableRequirementIds: string[] = [];
  for (const id of allReqIds) {
    if (assigned.has(id)) continue;
    orphanRequirementIds.push(id);
    const home = pickRescueDomain(id, idSections, manifest, domainTopSections);
    if (home) {
      const list = byDomain.get(home)!;
      list.push(id);
      list.sort();
      assigned.add(id);
    } else {
      unrescuableRequirementIds.push(id);
    }
  }

  return {
    byDomain,
    unresolved,
    allRequirementIds: [...allReqIds].sort(),
    orphanRequirementIds: orphanRequirementIds.sort(),
    unrescuableRequirementIds: unrescuableRequirementIds.sort(),
  };
}
