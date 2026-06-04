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
