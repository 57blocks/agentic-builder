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
