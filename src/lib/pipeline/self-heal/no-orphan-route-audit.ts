/**
 * Orphan-route (reverse-reachability) audit — the missing half of the
 * frontend reachability check.
 *
 * `auditFlowNavigation` (wiring-contract) already checks the FORWARD direction:
 * "a control that declares it navigates to /x — does /x exist as a route?"
 * (no broken links). This audit checks the REVERSE: "every registered route —
 * is there any in-app navigation that reaches it?" A route that is registered
 * in the router but that NOTHING links to is an orphan: the page exists but a
 * user can never get to it. That is exactly the "every page must be reachable"
 * guarantee.
 *
 * Conservative by design (low false-positive):
 *   • Only STATIC routes are flagged. Dynamic routes (`/x/:id`) are exempt —
 *     they're navigated via template literals (`navigate(`/x/${id}`)`) that a
 *     string-literal scan can't see, so flagging them would false-positive.
 *   • A small allowlist of conventional entry / auth routes (`/`, `/login`, …)
 *     is never flagged — those are entered directly or via an auth redirect,
 *     not via an in-app link.
 *   • Findings are `partial` verdicts (like wiring / raw-http audits): they
 *     drive a bounded scoped-frontend repair through the existing dispatch and
 *     NEVER enter hardUncovered — so they never flip `passed` or halt the run.
 *   • Runs ONLY on the full/final build. On a scoped subsystem/domain build the
 *     link that reaches a route may live in a not-yet-built domain, so it would
 *     false-positive — skipped there (mirrors auditFlowNavigation's scopedBuild).
 *
 * Disable with ORPHAN_ROUTE_AUDIT_ENABLED=0.
 */

import fs from "fs/promises";
import path from "path";

import type { PrdSpec } from "@/lib/requirements/prd-spec-types";
import { parseRegisteredRoutes } from "@/lib/requirements/wiring-contract";
import type { AuditEntry } from "./feature-checklist-audit";
import type { RepairEmitter } from "./events";

const SRC_FILE_RE = /\.(tsx|jsx|ts)$/;
const SKIP_DIRS = new Set([
  "node_modules", "dist", "build", ".blueprint", ".ralph", ".git",
  "coverage", "e2e", "__tests__", "test", "tests",
]);

/** Routes conventionally reached directly or via an auth redirect, not via an
 *  in-app nav link — never flagged as orphans. */
const ENTRY_ALLOWLIST = new Set([
  "/", "/login", "/signin", "/sign-in", "/register", "/signup", "/sign-up",
  "/forgot-password", "/reset-password", "/verify-email", "/logout",
  "/404", "/not-found", "/unauthorized", "*",
]);

// String-literal navigation targets. Template-literal / expression targets
// (`to={...}`, `navigate(`/x/${id}`)`) are intentionally NOT matched — they
// point at dynamic routes, which we exempt from flagging anyway.
const NAV_ATTR_RE = /\b(?:to|href)\s*=\s*["'`](\/[^"'`{}$\s]*)/g;
const NAV_CALL_RE = /\b(?:navigate|redirect|push|replace)\s*\(\s*["'`](\/[^"'`{}$\s]*)/g;

function enabled(): boolean {
  return process.env.ORPHAN_ROUTE_AUDIT_ENABLED !== "0";
}

function normalizePath(p: string): string {
  const t = p.replace(/\/+$/, "");
  return t === "" ? "/" : t;
}

/** Recursively collect frontend source files under `root`. Bounded, skips
 *  vendored / build / test dirs. Returns [] when root doesn't exist. */
async function walkSource(root: string): Promise<string[]> {
  const out: string[] = [];
  async function rec(dir: string): Promise<void> {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const name = String(e.name);
      if (e.isDirectory()) {
        if (!SKIP_DIRS.has(name)) await rec(path.join(dir, name));
      } else if (SRC_FILE_RE.test(name)) {
        out.push(path.join(dir, name));
      }
    }
  }
  await rec(root);
  return out;
}

/** Pure: all internal (leading-slash, non-/api) nav targets referenced in a
 *  source string, normalized. */
export function extractReferencedRoutes(source: string): string[] {
  const out = new Set<string>();
  for (const re of [NAV_ATTR_RE, NAV_CALL_RE]) {
    re.lastIndex = 0;
    for (const m of source.matchAll(re)) {
      const raw = m[1];
      if (raw && raw !== "/api" && !raw.startsWith("/api/")) out.add(normalizePath(raw));
    }
  }
  return [...out];
}

/** Pure: registered static routes with no inbound reference = orphans. Dynamic
 *  (`:param` / `*`) and allowlisted entry routes are exempt. */
export function computeOrphanRoutes(
  registered: string[],
  referenced: Set<string>,
): string[] {
  const orphans: string[] = [];
  for (const r of registered) {
    const norm = normalizePath(r);
    if (r.includes(":") || r.includes("*")) continue; // dynamic — exempt
    if (ENTRY_ALLOWLIST.has(norm)) continue;
    if (referenced.has(norm)) continue;
    orphans.push(norm);
  }
  return [...new Set(orphans)];
}

export interface OrphanRouteAuditInput {
  prdSpec: PrdSpec | null | undefined;
  outputDir: string;
  emitter?: RepairEmitter;
  /** Skip on a scoped/partial (subsystem/domain) build — the inbound link may
   *  live in a domain not yet built. Runs only on the full/final build. */
  scopedBuild?: boolean;
}

/** The PAGE id owning a route (for routing the finding to a frontend repair). */
function pageIdForRoute(route: string, prdSpec: PrdSpec): string {
  const hit = prdSpec.pages?.find((p) => normalizePath(p.route ?? "") === route);
  if (hit) return hit.id;
  const slug = route.replace(/^\//, "").replace(/[^A-Za-z0-9]+/g, "-") || "root";
  return `PAGE-orphan-${slug}`;
}

/**
 * Returns `partial` AuditEntry findings — one per orphan route — for routes that
 * are registered but that no in-app navigation reaches. Empty when disabled, on
 * a scoped build, with no prdSpec, or when the router has no parseable routes.
 */
export async function auditOrphanRoutes(
  input: OrphanRouteAuditInput,
): Promise<AuditEntry[]> {
  if (!enabled() || input.scopedBuild || !input.prdSpec) return [];

  // Locate the router + frontend source root (L/M use frontend/, S uses src/).
  const roots = ["frontend/src", "src"];
  let registered: string[] = [];
  let srcRoot = "";
  for (const rel of roots) {
    for (const routerName of ["router.tsx", "router.ts"]) {
      try {
        const src = await fs.readFile(
          path.join(input.outputDir, rel, routerName),
          "utf-8",
        );
        const routes = parseRegisteredRoutes(src);
        if (routes.length > 0) {
          registered = routes;
          srcRoot = path.join(input.outputDir, rel);
          break;
        }
      } catch {
        /* try next */
      }
    }
    if (registered.length > 0) break;
  }
  if (registered.length === 0 || !srcRoot) return []; // no parseable router

  // Build the global set of referenced routes across ALL frontend source.
  const referenced = new Set<string>();
  for (const file of await walkSource(srcRoot)) {
    try {
      const src = await fs.readFile(file, "utf-8");
      for (const t of extractReferencedRoutes(src)) referenced.add(t);
    } catch {
      /* skip unreadable */
    }
  }

  const orphans = computeOrphanRoutes(registered, referenced);
  const seen = new Set<string>();
  const out: AuditEntry[] = [];
  for (const route of orphans) {
    const id = pageIdForRoute(route, input.prdSpec);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      verdict: "partial",
      layer: "l2",
      reason:
        `Route \`${route}\` is registered in the router but NO in-app navigation ` +
        `links to it — the page is unreachable (a user can never get there). ` +
        `Add a real navigation path TO \`${route}\` from where the user would ` +
        `expect it (a nav-menu entry, a list-row link, or a button handler that ` +
        `calls \`navigate("${route}")\`). If it is an entry/redirect target, wire ` +
        `it as an index route or a \`<Navigate>\` from a reachable route instead.`,
      coveringTaskIds: [],
      evidence: [`router registers "${route}"; 0 inbound <Link>/navigate() found`],
      category: "wiring",
    });
  }

  if (out.length > 0) {
    input.emitter?.({
      stage: "post-gen-audit",
      event: "orphan_route_audit_findings",
      missingIds: out.map((e) => e.id),
      details: { count: out.length, routes: orphans.slice(0, 20) },
    });
  }

  return out;
}
