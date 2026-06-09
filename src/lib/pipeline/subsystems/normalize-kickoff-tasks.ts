/**
 * Deterministic repair of an already-generated kickoff task list — NO LLM.
 *
 * The per-domain breakdown numbers each pass from T-001 (so IDs COLLIDE across
 * passes), every domain pass re-emits shared tasks (the "frontend foundation"
 * task shows up ~once per pass), and only the per-domain passes tag tasks with
 * `subsystem` (foundation + any whole-system leftovers stay untagged). This
 * normalizer fixes a list in place instead of re-running the expensive
 * breakdown:
 *
 *   1. Dedupe by normalized title — merge the duplicates' file lists and
 *      dependencies into one canonical task.
 *   2. Tag each untagged task with its owning domain by matching its file paths
 *      against the manifest's `ownedModules` path prefixes (deterministic).
 *      Foundation/shared tasks are intentionally left untagged.
 *   3. Re-ID uniquely (T-001…) and best-effort remap dependencies (collisions
 *      that resolve to a foundation task → that task; otherwise dropped).
 */

import type { KickoffWorkItem } from "../types";
import type { SubsystemManifest } from "./types";
import { isFoundationTask } from "./domain-breakdown";

export interface NormalizeTasksReport {
  before: number;
  after: number;
  duplicatesRemoved: number;
  newlyTagged: number;
  alreadyTagged: number;
  foundationShared: number;
  unresolved: string[]; // titles of non-foundation tasks with no domain match
  depsRemapped: number;
  depsDropped: number;
}

function taskPaths(t: KickoffWorkItem): string[] {
  const f = t.files;
  if (!f) return [];
  if (Array.isArray(f)) return f;
  return [...(f.creates ?? []), ...(f.modifies ?? [])];
}

function normTitle(s: string): string {
  return (s ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

function uniq<T>(xs: T[]): T[] {
  return [...new Set(xs)];
}

/** Generic path / persona / structural words that carry no domain signal. */
const GENERIC_TOKENS = new Set([
  "frontend", "backend", "src", "pages", "page", "api", "modules", "module",
  "components", "component", "views", "view", "hooks", "hook", "utils", "util",
  "styles", "style", "lib", "context", "store", "stores", "services", "service",
  "family", "teacher", "admin", "app", "index", "tsx", "ts", "css", "json",
  "implement", "create", "add", "build", "page", "modal", "form", "ui",
  "id", "new", "edit", "list", "detail", "panel", "tab", "flow", "state", "states",
]);

/** Split a string into lowercased tokens — on non-alphanumerics AND camelCase
 *  boundaries (FamilyDashboard → family, dashboard), dropping generic words. */
function tokenize(s: string): string[] {
  return (s ?? "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .map((w) => w.toLowerCase())
    .filter((w) => w.length >= 3 && !GENERIC_TOKENS.has(w) && !/^\d+$/.test(w));
}

/** Build the set of tokens that belong to EXACTLY ONE domain (derived from each
 *  domain's id, owned-module path tails, and owned-route segments). Tokens
 *  shared by multiple domains are dropped so a match is never ambiguous. */
export function buildUniqueTokenIndex(
  manifest: SubsystemManifest,
): Map<string, string> {
  const tokenToDomains = new Map<string, Set<string>>();
  const add = (token: string, domainId: string) => {
    const set = tokenToDomains.get(token) ?? new Set<string>();
    set.add(domainId);
    tokenToDomains.set(token, set);
  };
  for (const s of manifest.subsystems) {
    s.id.split(/[-_]/).forEach((tok) => {
      if (tok.length >= 3 && !GENERIC_TOKENS.has(tok)) add(tok.toLowerCase(), s.id);
    });
    const sources = [...s.ownedModules, ...s.ownedRoutes];
    for (const src of sources) {
      for (const seg of src.split(/[/]/)) {
        if (seg.startsWith(":")) continue; // route param
        for (const tok of tokenize(seg)) add(tok, s.id);
      }
    }
  }
  const unique = new Map<string, string>();
  for (const [tok, domains] of tokenToDomains) {
    if (domains.size === 1) unique.set(tok, [...domains][0]);
  }
  return unique;
}

/**
 * Resolve a task's owning domain. Tier 1: precise — a file path starts with a
 * domain's owned-module prefix. Tier 2: deterministic token match — the task's
 * title + file tokens hit tokens unique to one domain. Ties / no signal →
 * undefined (left shared rather than mis-assigned).
 */
function owningDomain(
  t: KickoffWorkItem,
  manifest: SubsystemManifest,
  uniqueTokens: Map<string, string>,
): string | undefined {
  const paths = taskPaths(t);

  // Tier 1: owned-module prefix (highest confidence).
  let best: { id: string; score: number } | null = null;
  for (const s of manifest.subsystems) {
    let score = 0;
    for (const p of paths) {
      for (const mod of s.ownedModules) {
        if (mod && p.startsWith(mod)) score++;
      }
    }
    if (score > 0 && (!best || score > best.score)) best = { id: s.id, score };
  }
  if (best) return best.id;

  // Tier 2: unique-token match over title + file paths.
  const tokens = [t.title, ...paths].flatMap(tokenize);
  const hits = new Map<string, number>();
  for (const tok of tokens) {
    const dom = uniqueTokens.get(tok);
    if (dom) hits.set(dom, (hits.get(dom) ?? 0) + 1);
  }
  if (hits.size === 0) return undefined;
  const ranked = [...hits.entries()].sort((a, b) => b[1] - a[1]);
  if (ranked.length > 1 && ranked[0][1] === ranked[1][1]) return undefined; // tie
  return ranked[0][0];
}

function mergeFiles(group: KickoffWorkItem[]): KickoffWorkItem["files"] {
  const creates: string[] = [];
  const modifies: string[] = [];
  const reads: string[] = [];
  let sawObject = false;
  for (const t of group) {
    const f = t.files;
    if (!f) continue;
    if (Array.isArray(f)) {
      creates.push(...f);
    } else {
      sawObject = true;
      creates.push(...(f.creates ?? []));
      modifies.push(...(f.modifies ?? []));
      reads.push(...(f.reads ?? []));
    }
  }
  if (!sawObject && creates.length === 0) return group[0]?.files;
  if (!sawObject) return uniq(creates);
  return { creates: uniq(creates), modifies: uniq(modifies), reads: uniq(reads) };
}

export function normalizeKickoffTasks(
  tasks: KickoffWorkItem[],
  manifest: SubsystemManifest,
): { tasks: KickoffWorkItem[]; report: NormalizeTasksReport } {
  // ── 1. Dedupe by normalized title (insertion order preserved) ──────────────
  const groups = new Map<string, KickoffWorkItem[]>();
  for (const t of tasks) {
    const k = normTitle(t.title);
    const g = groups.get(k) ?? [];
    g.push(t);
    groups.set(k, g);
  }

  let duplicatesRemoved = 0;
  // Each merged task remembers the original IDs it absorbed (for dep remap).
  const merged: Array<{ task: KickoffWorkItem; oldIds: string[] }> = [];
  for (const group of groups.values()) {
    const base: KickoffWorkItem = { ...group[0] };
    base.files = mergeFiles(group);
    base.dependencies = uniq(group.flatMap((g) => g.dependencies ?? []));
    merged.push({ task: base, oldIds: uniq(group.map((g) => g.id)) });
    duplicatesRemoved += group.length - 1;
  }

  // ── 2. Tag domains by file-path → ownedModules prefix, then unique tokens ──
  const uniqueTokens = buildUniqueTokenIndex(manifest);
  let newlyTagged = 0;
  let alreadyTagged = 0;
  let foundationShared = 0;
  const unresolved: string[] = [];
  for (const { task } of merged) {
    if (task.subsystem) {
      alreadyTagged++;
      continue;
    }
    if (isFoundationTask(task)) {
      foundationShared++;
      continue; // shared infra — intentionally no single owner
    }
    const domain = owningDomain(task, manifest, uniqueTokens);
    if (domain) {
      task.subsystem = domain;
      newlyTagged++;
    } else {
      unresolved.push(task.title);
    }
  }

  // ── 3. Re-ID uniquely + best-effort dependency remap ───────────────────────
  // Assign new ids in order.
  merged.forEach((m, i) => {
    m.task.id = `T-${String(i + 1).padStart(3, "0")}`;
  });
  // oldId → candidate merged entries (collisions yield multiple).
  const byOldId = new Map<string, typeof merged>();
  for (const m of merged) {
    for (const oid of m.oldIds) {
      const list = byOldId.get(oid) ?? [];
      list.push(m);
      byOldId.set(oid, list);
    }
  }
  let depsRemapped = 0;
  let depsDropped = 0;
  for (const { task } of merged) {
    const newDeps: string[] = [];
    for (const dep of task.dependencies ?? []) {
      const candidates = byOldId.get(dep);
      if (!candidates || candidates.length === 0) {
        depsDropped++;
        continue;
      }
      // Unique → remap. Ambiguous (collision) → prefer a foundation task
      // (the overwhelmingly common meaning of a low colliding id), else drop.
      let target = candidates.length === 1 ? candidates[0] : null;
      if (!target) {
        target = candidates.find((c) => isFoundationTask(c.task)) ?? null;
      }
      if (target && target.task.id !== task.id) {
        newDeps.push(target.task.id);
        depsRemapped++;
      } else if (!target) {
        depsDropped++;
      }
    }
    task.dependencies = uniq(newDeps);
  }

  return {
    tasks: merged.map((m) => m.task),
    report: {
      before: tasks.length,
      after: merged.length,
      duplicatesRemoved,
      newlyTagged,
      alreadyTagged,
      foundationShared,
      unresolved,
      depsRemapped,
      depsDropped,
    },
  };
}
