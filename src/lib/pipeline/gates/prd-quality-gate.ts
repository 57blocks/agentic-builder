/**
 * PRD quality gate — Layer 1 (deterministic, NO LLM).
 *
 * Runs after the PRD is generated and produces a structured, advisory report:
 * concrete, section-anchored findings about whether the PRD is *buildable* by
 * the downstream task-breakdown / codegen / coverage gates. The whole point is
 * to surface "downstream will guess or fail here" issues at PRD time (cheap to
 * fix) instead of after 130 minutes of coding thrash.
 *
 * Two tiers of pure checks:
 *   - Always: regex requirement-index checks (AC-* / FR-* / IC-* presence).
 *   - When the structured `PrdSpec` is available (LLM-extracted upstream and
 *     passed in): page / user-path / business-flow consistency checks.
 *
 * Advisory only — `passed` is false when there are blocker-severity findings,
 * but callers should surface the report to the user, not hard-fail the pipeline.
 * A Layer-2 LLM reviewer (downstream-buildability judge) is layered on later.
 */

import type {
  GateReportBase,
  PrdSpec,
  PrdPage,
} from "@/lib/requirements/prd-spec-types";
import { extractPrdRequirementIndex } from "@/lib/requirements/extract-prd-spec";

export type PrdQualityDimension =
  | "buildability"
  | "page"
  | "user-path"
  | "business-flow"
  // Deterministic finite-state-machine closure check over PrdWorkflowSpec —
  // every business flow must start somewhere, only reference declared states,
  // be reachable from its initial state, and have a way to end.
  | "flow-completeness"
  // Layer-2 (semantic) dimensions — produced by the LLM PRD reviewer, not by
  // the deterministic gate. Kept in the same union so both layers' findings
  // merge into one report.
  | "completeness"
  | "ambiguity"
  | "contradiction";

export type PrdQualitySeverity = "blocker" | "warn" | "info";

export interface PrdQualityFinding {
  /** Sequential id — PQ-001, PQ-002, … */
  id: string;
  dimension: PrdQualityDimension;
  severity: PrdQualitySeverity;
  /** PRD heading, page id/name, or other locus the user can jump to. */
  section?: string;
  /** What's wrong, in business language. */
  problem: string;
  /** Which downstream gate/phase this will hurt — keeps findings actionable. */
  downstreamImpact: string;
  /** Concrete edit the user can accept and hand to the PRD-patch agent. */
  suggestedFix: string;
}

export interface PrdQualityReport extends GateReportBase {
  findings: PrdQualityFinding[];
  counts: { blocker: number; warn: number; info: number };
  /** 0–100 advisory score (100 = no findings). */
  score: number;
  /** Whether the structured PrdSpec was available (richer checks ran). */
  specAnalyzed: boolean;
}

const SEVERITY_WEIGHT: Record<PrdQualitySeverity, number> = {
  blocker: 20,
  warn: 5,
  info: 1,
};

class FindingCollector {
  private items: PrdQualityFinding[] = [];
  add(f: Omit<PrdQualityFinding, "id">): void {
    this.items.push({
      id: `PQ-${String(this.items.length + 1).padStart(3, "0")}`,
      ...f,
    });
  }
  all(): PrdQualityFinding[] {
    return this.items;
  }
}

function looksDataBound(page: PrdPage): boolean {
  const hay = `${page.name} ${page.layoutRegions.join(" ")} ${page.interactiveComponents
    .map((c) => `${c.name} ${c.type}`)
    .join(" ")} ${page.staticElements.join(" ")}`.toLowerCase();
  return /\b(list|table|grid|card|feed|form|detail|edit|create|history|dashboard|report)\b/.test(
    hay,
  );
}

function looksLikeEntry(page: PrdPage): boolean {
  const route = (page.route ?? "").trim();
  const name = (page.name ?? "").toLowerCase();
  return (
    route === "/" ||
    /^\/(login|auth|home|dashboard|index)\b/.test(route) ||
    /\b(login|sign[ -]?in|home|landing|dashboard)\b/.test(name)
  );
}

// ─── checks ────────────────────────────────────────────────────────────────

function checkBuildability(prdMarkdown: string, c: FindingCollector): void {
  const index = extractPrdRequirementIndex(prdMarkdown);

  if (index.acceptanceCriteriaIds.length === 0 && index.featureIds.length === 0) {
    c.add({
      dimension: "buildability",
      severity: "blocker",
      section: "Requirements / Acceptance Criteria",
      problem:
        "No labeled AC-* or FR-* requirement IDs detected in the PRD.",
      downstreamImpact:
        "task-coverage-gate and qa-coverage-gate have nothing to anchor tasks/tests to — coverage will be unverifiable.",
      suggestedFix:
        "Add labeled acceptance criteria (AC-001…) and feature IDs (FR-001…) so every page/flow maps to a requirement.",
    });
  }

  if (index.componentIds.length === 0) {
    c.add({
      dimension: "buildability",
      severity: "warn",
      section: "Pages / Interactive Components",
      problem: "No IC-* interactive component IDs detected.",
      downstreamImpact:
        "kick-off task coverage vs components is weak — UI controls may be silently dropped.",
      suggestedFix:
        "Label each interactive control with an IC-* id under its page.",
    });
  }
}

function checkPages(spec: PrdSpec, c: FindingCollector): void {
  const pages = spec.pages ?? [];

  if (pages.length === 0) {
    c.add({
      dimension: "page",
      severity: "blocker",
      section: "Pages",
      problem: "PRD defines no pages/screens.",
      downstreamImpact:
        "Frontend task breakdown has nothing to build; page-coverage-gate is vacuous.",
      suggestedFix:
        "Add a Pages section enumerating each screen with id, name, and route.",
    });
    return;
  }

  const seenRoutes = new Map<string, string>(); // route → first page id
  for (const p of pages) {
    const route = (p.route ?? "").trim();
    const where = `${p.id} ${p.name}`.trim();

    if (!route) {
      c.add({
        dimension: "page",
        severity: "blocker",
        section: where,
        problem: `Page "${p.name}" has no route.`,
        downstreamImpact:
          "router can't register the screen → navigating to it 404s (runtime-smoke / E2E gate failure).",
        suggestedFix: `Give "${p.name}" an explicit route, e.g. /${(p.name || "page")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")}.`,
      });
    } else if (seenRoutes.has(route)) {
      c.add({
        dimension: "page",
        severity: "warn",
        section: where,
        problem: `Route "${route}" is also used by ${seenRoutes.get(route)}.`,
        downstreamImpact:
          "duplicate routes collide in the router — one page becomes unreachable.",
        suggestedFix: `Give "${p.name}" a distinct route.`,
      });
    } else {
      seenRoutes.set(route, p.id);
    }

    const hasUi =
      (p.interactiveComponents?.length ?? 0) > 0 ||
      (p.staticElements?.length ?? 0) > 0;
    if (!hasUi) {
      c.add({
        dimension: "page",
        severity: "warn",
        section: where,
        problem: `Page "${p.name}" has no interactive components or static elements.`,
        downstreamImpact:
          "the codegen agent has to invent the entire UI for this page — low fidelity.",
        suggestedFix: `List the controls and read-only elements "${p.name}" must show.`,
      });
    }

    if ((p.states?.length ?? 0) === 0 && looksDataBound(p)) {
      c.add({
        dimension: "page",
        severity: "info",
        section: where,
        problem: `Data-bound page "${p.name}" defines no UI states (loading / empty / error).`,
        downstreamImpact:
          "agent typically omits loading/empty/error handling → blank screens on slow/failed fetches.",
        suggestedFix: `Add states for "${p.name}": at least loading, empty, error.`,
      });
    }
  }
}

function checkUserPath(spec: PrdSpec, c: FindingCollector): void {
  const pages = spec.pages ?? [];
  if (pages.length === 0) return;
  if (!pages.some(looksLikeEntry)) {
    c.add({
      dimension: "user-path",
      severity: "warn",
      section: "Pages",
      problem:
        "No obvious entry page (root '/', login, home, or dashboard) among the pages.",
      downstreamImpact:
        "the user path has no clear starting point — router default route and post-auth landing are guessed.",
      suggestedFix:
        "Mark one page as the entry (route '/') and define where users land after auth.",
    });
  }
}

function checkBusinessFlow(spec: PrdSpec, c: FindingCollector): void {
  const domain = spec.domain;
  const pages = spec.pages ?? [];

  // Pages clearly show/edit data but the PRD declares no entities to back them.
  const dataBound = pages.filter(looksDataBound);
  const entityCount = domain?.entities?.length ?? 0;
  if (dataBound.length > 0 && entityCount === 0) {
    c.add({
      dimension: "business-flow",
      severity: "info",
      section: "Domain / Entities",
      problem: `${dataBound.length} page(s) display or edit data but the PRD declares no entities.`,
      downstreamImpact:
        "data models and CRUD APIs are underspecified — contract-coverage and migrations are guessed.",
      suggestedFix:
        "Add an entities/data-model section naming each entity and its key fields.",
    });
  }

  // Rule inputs must reference a declared variable (deterministic cross-ref).
  const variableIds = new Set((domain?.variables ?? []).map((v) => v.id));
  for (const rule of domain?.rules ?? []) {
    if (rule.inputVariableId && !variableIds.has(rule.inputVariableId)) {
      c.add({
        dimension: "business-flow",
        severity: "warn",
        section: `Rule ${rule.id} (${rule.name})`,
        problem: `Rule input "${rule.inputVariableId}" is not a declared variable.`,
        downstreamImpact:
          "the rule engine can't resolve its input → the computation can't be generated correctly.",
        suggestedFix: `Declare variable "${rule.inputVariableId}" (or fix the rule's inputVariableId).`,
      });
    }
  }
}

/**
 * Deterministic FSM-closure check over each PrdWorkflowSpec — the cheapest way
 * to catch a "business flow that breaks midway": an entity that starts in an
 * undefined state, a transition into a state that was never declared, a state
 * nothing leads to, or a lifecycle that never ends. Every one of these makes
 * the downstream state-machine codegen generate a half-wired flow.
 */
function checkWorkflowClosure(spec: PrdSpec, c: FindingCollector): void {
  const workflows = spec.domain?.workflows ?? [];

  for (const w of workflows) {
    const where = `Workflow ${w.id} (${w.entity})`;
    const states = w.states ?? [];
    const transitions = w.transitions ?? [];
    const stateSet = new Set(states);

    // No states → the FSM is undefined; nothing else is checkable.
    if (states.length === 0) {
      c.add({
        dimension: "flow-completeness",
        severity: "blocker",
        section: where,
        problem: `Workflow "${w.id}" for entity "${w.entity}" declares no states.`,
        downstreamImpact:
          "the state-machine codegen has nothing to generate — the entity's lifecycle is left to guesswork.",
        suggestedFix: `Enumerate the lifecycle states for "${w.entity}" (e.g. initial → … → terminal).`,
      });
      continue;
    }

    // Initial state must be one of the declared states.
    if (!w.initial || !stateSet.has(w.initial)) {
      c.add({
        dimension: "flow-completeness",
        severity: "blocker",
        section: where,
        problem: w.initial
          ? `Initial state "${w.initial}" is not among the declared states [${states.join(", ")}].`
          : `Workflow "${w.id}" has no initial state.`,
        downstreamImpact:
          "newly created records land in an undefined state and the flow has no defined starting point.",
        suggestedFix: w.initial
          ? `Add "${w.initial}" to the states list, or point initial at one of [${states.join(", ")}].`
          : `Declare the starting state (e.g. initial: "${states[0]}").`,
      });
    }

    // Every transition endpoint must be a declared state (no dangling edges),
    // and every transition must name an action that drives it.
    for (const t of transitions) {
      const edge = `${t.from || "?"} → ${t.to || "?"}`;
      if (!t.from || !stateSet.has(t.from)) {
        c.add({
          dimension: "flow-completeness",
          severity: "blocker",
          section: where,
          problem: `Transition ${edge} starts from undeclared state "${t.from || "(empty)"}".`,
          downstreamImpact:
            "the generated state machine references a state that doesn't exist → the transition is unreachable or throws at runtime.",
          suggestedFix: `Add "${t.from}" to the states list, or correct the transition's "from".`,
        });
      }
      if (!t.to || !stateSet.has(t.to)) {
        c.add({
          dimension: "flow-completeness",
          severity: "blocker",
          section: where,
          problem: `Transition ${edge} targets undeclared state "${t.to || "(empty)"}".`,
          downstreamImpact:
            "the entity moves into a state with no definition → it gets stuck with no further actions and no UI for that state.",
          suggestedFix: `Add "${t.to}" to the states list, or correct the transition's "to".`,
        });
      }
      if (!t.action || !t.action.trim()) {
        c.add({
          dimension: "flow-completeness",
          severity: "warn",
          section: where,
          problem: `Transition ${edge} has no action/trigger.`,
          downstreamImpact:
            "there's no event or control to fire this transition → the flow can advance only by manual DB edits.",
          suggestedFix: `Name the action that drives ${edge} (e.g. a button, API call, or scheduled job).`,
        });
      }
    }

    // Reachability + termination only make sense once initial is valid.
    if (w.initial && stateSet.has(w.initial)) {
      const adj = new Map<string, string[]>();
      for (const t of transitions) {
        if (stateSet.has(t.from) && stateSet.has(t.to)) {
          const list = adj.get(t.from) ?? [];
          list.push(t.to);
          adj.set(t.from, list);
        }
      }

      const reached = new Set<string>([w.initial]);
      const queue: string[] = [w.initial];
      while (queue.length) {
        const s = queue.shift()!;
        for (const next of adj.get(s) ?? []) {
          if (!reached.has(next)) {
            reached.add(next);
            queue.push(next);
          }
        }
      }
      const unreachable = states.filter((s) => !reached.has(s));
      if (unreachable.length > 0) {
        c.add({
          dimension: "flow-completeness",
          severity: "warn",
          section: where,
          problem: `State(s) [${unreachable.join(", ")}] can't be reached from the initial state "${w.initial}".`,
          downstreamImpact:
            "dead states are generated but never entered → their UI/handlers are built yet unused, and the flow they belong to is broken.",
          suggestedFix: `Add a transition leading into [${unreachable.join(", ")}], or remove the unused state(s).`,
        });
      }

      // Every state has an outgoing edge → the lifecycle never ends.
      const hasOutgoing = new Set(
        transitions.filter((t) => stateSet.has(t.from)).map((t) => t.from),
      );
      const terminals = states.filter((s) => !hasOutgoing.has(s));
      if (terminals.length === 0) {
        c.add({
          dimension: "flow-completeness",
          severity: "warn",
          section: where,
          problem: `Workflow "${w.id}" has no terminal state — every state has an outgoing transition.`,
          downstreamImpact:
            "the lifecycle never completes (no done/closed/archived state) → records loop indefinitely and 'finished' is undefined.",
          suggestedFix:
            "Mark at least one end state (e.g. completed / closed / archived) with no outgoing transition.",
        });
      }
    }
  }
}

/**
 * Page-navigation reachability — a deterministic, heuristic graph check over
 * the pages and their interactive components. Two failure modes it catches:
 *
 *   1. Dead control: a component whose effect clearly *navigates* ("go to …",
 *      "redirect to …") but names no page/route that exists — the classic
 *      "button placed but never wired to a screen".
 *   2. Orphan page: a screen no described navigation ever reaches from an entry
 *      page — built but unreachable.
 *
 * Navigation edges are inferred from free text, so this is intentionally
 * conservative: never a blocker, and orphan detection only runs once the PRD
 * actually describes navigation (≥1 resolved edge) — otherwise the inferred
 * graph is too sparse to judge and we stay silent rather than cry wolf.
 */
const NAV_INTENT =
  /\b(navigat\w*|redirect\w*|go(?:es)? to|takes? (?:the )?user to|jump to|route to|leads? to|proceed to|continue to|back to|return to|link to)\b|跳转|进入|前往|返回|打开/i;

function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9/ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function checkPageReachability(spec: PrdSpec, c: FindingCollector): void {
  const pages = spec.pages ?? [];
  if (pages.length < 2) return; // single screen: nothing to navigate between

  const targets = pages.map((p) => ({
    page: p,
    route: (p.route ?? "").trim().toLowerCase(),
    name: normalizeForMatch(p.name ?? ""),
  }));

  const edges = new Map<string, Set<string>>(); // fromPageId → set<toPageId>
  let navEdgeCount = 0;

  for (const p of pages) {
    for (const cmp of p.interactiveComponents ?? []) {
      const text = `${cmp.name} ${cmp.interaction} ${cmp.effect}`;
      const isNavType = /\b(link|tab)\b/i.test(cmp.type);
      if (!NAV_INTENT.test(text) && !isNavType) continue;

      const hay = normalizeForMatch(text);
      const dest = targets.find(
        (t) =>
          t.page.id !== p.id &&
          ((t.route.length > 1 && hay.includes(t.route)) ||
            (t.name.length >= 3 && hay.includes(t.name))),
      );

      if (dest) {
        const set = edges.get(p.id) ?? new Set<string>();
        set.add(dest.page.id);
        edges.set(p.id, set);
        navEdgeCount++;
      } else if (NAV_INTENT.test(text) && !/https?:\/\//i.test(text)) {
        // Explicit in-app navigation intent, but no destination page resolves.
        c.add({
          dimension: "user-path",
          severity: "warn",
          section: `${p.id} ${p.name} › ${cmp.name}`,
          problem: `"${cmp.name}" appears to navigate ("${cmp.effect || cmp.interaction}") but no matching page/route was found.`,
          downstreamImpact:
            "the control gets built with no destination wired → clicking it dead-ends (the half-implemented-button case).",
          suggestedFix: `Name the destination page/route for "${cmp.name}", or add the missing page it should open.`,
        });
      }
    }
  }

  if (navEdgeCount === 0) return; // PRD describes no navigation — don't guess.

  const entryIds = pages.filter(looksLikeEntry).map((p) => p.id);
  const roots = entryIds.length > 0 ? entryIds : [pages[0].id];
  const reached = new Set<string>(roots);
  const queue = [...roots];
  while (queue.length) {
    const id = queue.shift()!;
    for (const to of edges.get(id) ?? []) {
      if (!reached.has(to)) {
        reached.add(to);
        queue.push(to);
      }
    }
  }

  const orphans = pages.filter((p) => !reached.has(p.id));
  if (orphans.length > 0) {
    c.add({
      dimension: "user-path",
      severity: "info",
      section: "Pages",
      problem: `No described navigation reaches page(s): ${orphans
        .map((p) => `${p.id} (${p.name})`)
        .join(", ")}.`,
      downstreamImpact:
        "these screens are built but no flow links to them → users can't get there (orphan pages).",
      suggestedFix:
        "Add a navigation control (link/button/menu) from a reachable page, or confirm they're deep-link-only.",
    });
  }
}

// ─── entry point ─────────────────────────────────────────────────────────────

export function runPrdQualityGate(input: {
  prdMarkdown: string;
  spec?: PrdSpec | null;
}): PrdQualityReport {
  const c = new FindingCollector();

  checkBuildability(input.prdMarkdown, c);

  const specAnalyzed = !!input.spec;
  if (input.spec) {
    checkPages(input.spec, c);
    checkUserPath(input.spec, c);
    checkBusinessFlow(input.spec, c);
    checkWorkflowClosure(input.spec, c);
    checkPageReachability(input.spec, c);
  }

  const findings = c.all();
  const counts = {
    blocker: findings.filter((f) => f.severity === "blocker").length,
    warn: findings.filter((f) => f.severity === "warn").length,
    info: findings.filter((f) => f.severity === "info").length,
  };
  const penalty = findings.reduce(
    (sum, f) => sum + SEVERITY_WEIGHT[f.severity],
    0,
  );
  const score = Math.max(0, 100 - penalty);

  return {
    gateId: "prd-quality",
    passed: counts.blocker === 0,
    warnings: findings
      .filter((f) => f.severity !== "info")
      .map((f) => `[${f.dimension}] ${f.problem}`),
    missingIds: [],
    findings,
    counts,
    score,
    specAnalyzed,
  };
}
