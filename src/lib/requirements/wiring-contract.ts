/**
 * Wiring contract — make a feature's interaction chain a first-class object.
 *
 * The PRD spec already carries each page's interactive components with an
 * `interaction → effect` description (PrdInteractiveComponent). This module:
 *
 *   1. deriveWiringObligations(task, spec)  — turn the PRD components a task
 *      owns into explicit obligations ("Button X click → effect Y").
 *   2. auditWiringInSource(source, obligations) — a cheap, regex-based static
 *      check that flags the canonical "placed a button but never wired it"
 *      failure: empty/stub event handlers, or an interactive page that ships
 *      with no event handlers at all.
 *
 * Both are pure (no I/O) so they're unit-testable. The disk-reading
 * orchestration lives in the audit caller (coding route), which feeds the
 * findings into the existing feature-audit repair dispatch.
 *
 * Design note: the detector is deliberately CONSERVATIVE. It only fires on
 * unambiguous signals (empty handler bodies, or zero handlers on an
 * interactive page). It does NOT try to prove each component calls the exact
 * right API — that would over-flag and trigger repair churn that slows the
 * run. High signal, low noise is the priority for a first pass.
 */

import type {
  PrdSpec,
  PrdPage,
  PrdInteractiveComponent,
} from "@/lib/requirements/prd-spec-types";
import type { CodingTask } from "@/lib/pipeline/types";

export interface WiringObligation {
  /** CMP-* id of the interactive component. */
  componentId: string;
  name: string;
  type: string;
  interaction: string;
  effect: string;
  /** Owning page. */
  pageId: string;
  pageName: string;
  route: string;
}

export interface WiringFinding {
  /** Id to key the repair on. A CMP-* (component-level) or PAGE-* (page-level
   *  stub) id so it routes through the existing frontend repair dispatch. */
  id: string;
  /** Component this finding is about, when component-scoped. */
  componentId?: string;
  /** Human-readable, repair-actionable description. */
  message: string;
}

/** Interactions that imply an event handler must exist. */
const ACTIONABLE_INTERACTION_RE =
  /click|submit|toggle|change|select|drag|drop|press|tap|type|hover|focus|blur|swipe|scroll/i;

/** An event-handler binding: onClick={…}, onSubmit={…}, onChange={…}, … */
const ANY_HANDLER_RE = /\bon[A-Z]\w*\s*=\s*\{/;

/** Empty / stub handler bodies that render a control inert:
 *    onClick={() => {}}      onClick={()=>{}}     onSubmit={() => {}}
 *    onClick={undefined}     onClick={null}
 *  (whitespace-tolerant). */
const EMPTY_HANDLER_RES: RegExp[] = [
  /\bon[A-Z]\w*\s*=\s*\{\s*\(\s*[^)]*\)\s*=>\s*\{\s*\}\s*\}/g,
  /\bon[A-Z]\w*\s*=\s*\{\s*(?:undefined|null)\s*\}/g,
];

function isActionable(interaction: string): boolean {
  return ACTIONABLE_INTERACTION_RE.test(interaction);
}

/**
 * Derive the wiring obligations a task owns from the structured PRD spec.
 * Mirrors pickPrdSpecEntriesForTask's page/component selection so the prompt
 * and the audit agree on what "this task should wire".
 */
export function deriveWiringObligations(
  task: Pick<CodingTask, "coversRequirementIds">,
  spec: PrdSpec | null | undefined,
): WiringObligation[] {
  if (!spec || !Array.isArray(spec.pages) || spec.pages.length === 0) return [];

  const coveredIds = new Set(
    (task.coversRequirementIds ?? []).map((id) => id.toUpperCase()),
  );
  const pageIds = new Set<string>();
  const componentIds = new Set<string>();
  for (const id of coveredIds) {
    if (id.startsWith("PAGE-")) pageIds.add(id);
    else if (id.startsWith("CMP-")) componentIds.add(id);
  }
  if (pageIds.size === 0 && componentIds.size === 0) return [];

  const obligations: WiringObligation[] = [];
  const pushFor = (page: PrdPage, c: PrdInteractiveComponent) => {
    obligations.push({
      componentId: c.id,
      name: c.name,
      type: c.type,
      interaction: c.interaction,
      effect: c.effect,
      pageId: page.id,
      pageName: page.name,
      route: page.route,
    });
  };

  for (const page of spec.pages) {
    const pageHit = pageIds.has(page.id.toUpperCase());
    const components = page.interactiveComponents ?? [];
    for (const c of components) {
      const cmpHit = componentIds.has(c.id.toUpperCase());
      if (pageHit || cmpHit) pushFor(page, c);
    }
  }
  return obligations;
}

/**
 * Static wiring audit over a task's joined frontend source. `source` should be
 * the concatenation of the task's generated frontend files. Returns findings
 * for dangling interactions. Empty array = no unambiguous wiring problem.
 */
export function auditWiringInSource(
  source: string,
  obligations: WiringObligation[],
): WiringFinding[] {
  if (!source.trim() || obligations.length === 0) return [];

  const findings: WiringFinding[] = [];
  const actionable = obligations.filter((o) => isActionable(o.interaction));
  if (actionable.length === 0) return [];

  // 1) Empty / stub handlers — a rendered control whose handler does nothing.
  let emptyCount = 0;
  for (const re of EMPTY_HANDLER_RES) {
    const matches = source.match(re);
    if (matches) emptyCount += matches.length;
  }
  if (emptyCount > 0) {
    const pageId = actionable[0].pageId;
    findings.push({
      id: pageId,
      message:
        `Found ${emptyCount} empty/stub event handler(s) (e.g. \`onClick={() => {}}\`) on page ` +
        `${pageId} (${actionable[0].pageName}). Wire each handler to its declared effect — ` +
        `call the API client method, navigate, or update state. An inert control is incomplete.`,
    });
  }

  // 2) Interactive page with ZERO handlers at all — every actionable component
  //    is dangling. Only fires when the page has no on*={ } bindings, so a page
  //    that wired *some* handlers is never flagged here (avoids false positives).
  if (!ANY_HANDLER_RE.test(source)) {
    for (const o of actionable) {
      findings.push({
        id: o.componentId,
        componentId: o.componentId,
        message:
          `\`${o.componentId}\` ${o.name} (${o.type}) on ${o.pageId} is interactive ` +
          `(${o.interaction} → ${o.effect}) but the generated page has no event handler wired. ` +
          `Implement a non-empty handler that performs the declared effect.`,
      });
    }
  }

  return findings;
}

// ─── Flow-navigation coherence (Phase 5, safe slice) ────────────────────────
//
// The canonical "flow breaks in the middle" failure: a control's effect says it
// navigates to a route, but that route doesn't exist in the router — so the
// flow dead-ends. We check the PRD-declared nav target against the registered
// routes. Pure + conservative: only concrete (param-free) targets are checked,
// and nothing is flagged if the router couldn't be parsed.

/** A path token immediately following a navigation verb in an effect string. */
const NAV_TARGET_RE =
  /(?:navigat\w*|redirect\w*|go(?:es)?\s+to|route\s+to|lands?\s+on|takes?\s+\w+\s+to|push\w*|send\w*\s+\w+\s+to)\s+(?:to\s+)?["'`]?(\/[A-Za-z0-9\-_/:]*)/gi;

/** `path="..."` / `path: "..."` route declarations in a router source file. */
const ROUTE_DECL_RE = /\bpath\s*[:=]\s*["'`]([^"'`]+)["'`]/g;

/**
 * Extract concrete navigation route targets named in an effect string, e.g.
 * "navigates to /confirmation" → ["/confirmation"]. Ignores API paths
 * (mentioned as call targets, not nav) by only capturing the token right after
 * a navigation verb.
 */
export function extractNavRouteTargets(effect: string): string[] {
  if (!effect) return [];
  const out = new Set<string>();
  for (const m of effect.matchAll(NAV_TARGET_RE)) {
    const raw = m[1];
    if (raw && raw !== "/api" && !raw.startsWith("/api/")) out.add(raw);
  }
  return [...out];
}

/** Parse registered route paths from a router source file. */
export function parseRegisteredRoutes(routerSource: string): string[] {
  if (!routerSource) return [];
  const out = new Set<string>();
  for (const m of routerSource.matchAll(ROUTE_DECL_RE)) {
    if (m[1]) out.add(m[1]);
  }
  return [...out];
}

function normalizePath(p: string): string {
  const trimmed = p.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

/** Does `target` match a registered route, treating `:param` as a wildcard? */
function routeIsRegistered(target: string, registered: string[]): boolean {
  const t = normalizePath(target).split("/");
  for (const r of registered) {
    const rs = normalizePath(r).split("/");
    if (rs.length !== t.length) continue;
    let ok = true;
    for (let i = 0; i < rs.length; i++) {
      const seg = rs[i];
      if (seg.startsWith(":") || seg === "*") continue; // wildcard
      if (seg !== t[i]) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  return false;
}

/**
 * Flag obligations whose effect navigates to a concrete route that isn't
 * registered in the router → the flow dead-ends. Conservative: skips targets
 * that contain params (can't verify reliably) and returns nothing when the
 * router has no parseable routes.
 */
export function auditFlowNavigation(
  obligations: WiringObligation[],
  registeredRoutes: string[],
): WiringFinding[] {
  if (registeredRoutes.length === 0 || obligations.length === 0) return [];
  const findings: WiringFinding[] = [];
  const flagged = new Set<string>();

  for (const o of obligations) {
    for (const target of extractNavRouteTargets(o.effect)) {
      if (target.includes(":")) continue; // dynamic target — skip
      if (routeIsRegistered(target, registeredRoutes)) continue;
      const key = `${o.componentId}:${target}`;
      if (flagged.has(key)) continue;
      flagged.add(key);
      findings.push({
        id: o.componentId,
        componentId: o.componentId,
        message:
          `\`${o.componentId}\` ${o.name} on ${o.pageId} is meant to navigate to \`${target}\` ` +
          `(${o.interaction} → ${o.effect}), but \`${target}\` is not a registered route in ` +
          `\`frontend/src/router.tsx\` — the flow dead-ends. Either wire navigation to the ` +
          `correct existing route or register the missing route + its page.`,
      });
    }
  }
  return findings;
}
