/**
 * Consumer-side endpoint completeness — deterministic cross-check (Part A).
 *
 * The TRD's `ENDPOINTS` registry is graded by the LLM reviewer for "does §6 cover
 * every endpoint in §3.3". That's the PRODUCER side. It does NOT catch the
 * CONSUMER side: a UI control that needs to FETCH data (an assignee dropdown, a
 * member list, a filter populated from the server) with no backing GET endpoint.
 * The taskflow build shipped exactly this gap — an assignee dropdown (FR-BD-04 /
 * IC-09) needed `GET /users` / `GET /users/team-members`, which the TRD never
 * registered, so the frontend had no contract to call.
 *
 * This module deterministically extracts the DEMAND (data-needing controls from
 * the PRD spec) and the SUPPLY (GET endpoints from the registry), reports gross
 * gaps as findings, and emits a compact demand/supply summary that the LLM
 * reviewer consumes to make a reliable semantic judgement. Pure + side-effect
 * free so it is fully unit-testable.
 */

import type { PrdSpec, PrdInteractiveComponent } from "@/lib/requirements/prd-spec-types";
import {
  parseEndpointsRegistry,
  type RegistryEndpoint,
} from "@/lib/pipeline/endpoints-registry";

/** Control `type`s that inherently render server-provided collections. */
const DATA_CONTROL_TYPES =
  /\b(select|dropdown|combobox|autocomplete|multiselect|picker|selector|list|table|grid|listbox)\b/i;

/**
 * Free-text signals (bilingual) that a control populates itself from the server:
 * it lists, filters, searches, assigns, or selects among server entities.
 */
const DATA_INTENT_TEXT =
  /(下拉|列表|筛选|过滤|搜索|选择器|选择框|成员|负责人|指派|分配|assignee|member|teammate|dropdown|autocomplete|combobox|filter|search|populate|fetch|load options|list of|select (a|an|the)|choose (a|an|the))/i;

/**
 * Small bilingual noun→canonical-resource map so a control labelled "负责人选择器"
 * or "assignee dropdown" maps to the `users` resource. Intentionally tiny and
 * conservative — the LLM reviewer handles the long tail; this only grounds the
 * high-confidence deterministic findings.
 */
const RESOURCE_SYNONYMS: Record<string, string[]> = {
  user: ["user", "users", "成员", "用户", "负责人", "assignee", "assignees", "member", "members", "teammate", "people", "team-member", "team-members", "team member"],
  project: ["project", "projects", "项目"],
  task: ["task", "tasks", "任务", "卡片", "card", "cards"],
  comment: ["comment", "comments", "评论"],
  tag: ["tag", "tags", "标签", "label", "labels"],
  notification: ["notification", "notifications", "通知"],
  column: ["column", "columns", "列", "board column", "看板列"],
};

function controlText(c: PrdInteractiveComponent): string {
  return `${c.name} ${c.type} ${c.interaction} ${c.effect}`.toLowerCase();
}

/** True when this control needs to fetch a server-provided collection. */
export function isDataNeedingControl(c: PrdInteractiveComponent): boolean {
  if (DATA_CONTROL_TYPES.test(c.type)) return true;
  return DATA_INTENT_TEXT.test(controlText(c));
}

/** The canonical resource a control most likely reads, or null if unclear. */
export function inferControlResource(c: PrdInteractiveComponent): string | null {
  const text = controlText(c);
  for (const [canonical, variants] of Object.entries(RESOURCE_SYNONYMS)) {
    if (variants.some((v) => text.includes(v))) return canonical;
  }
  return null;
}

/** Resource tokens served by the GET endpoints (path segments, singularised). */
export function getReadResources(endpoints: RegistryEndpoint[]): Set<string> {
  const out = new Set<string>();
  for (const e of endpoints) {
    if (!/^get$/i.test(e.method)) continue;
    const path = e.endpoint.replace(/^[A-Z]+\s+/i, "");
    for (const seg of path.split("/")) {
      const s = seg.trim().toLowerCase();
      if (!s || s.startsWith(":") || s.startsWith("{")) continue;
      if (["api", "v1", "v2"].includes(s)) continue;
      out.add(s);
      if (s.endsWith("s")) out.add(s.slice(0, -1)); // plural → singular
    }
  }
  return out;
}

export interface EndpointCompletenessFinding {
  /** The PRD page + component that needs data. */
  pageId: string;
  componentId: string;
  componentName: string;
  /** The canonical resource it reads (e.g. "user"). */
  resource: string;
  /** Human-readable gap message. */
  message: string;
}

export interface EndpointCompletenessReport {
  /** True when the registry was present and parseable (else we can't judge). */
  hasRegistry: boolean;
  /** High-confidence missing-read-endpoint findings. */
  findings: EndpointCompletenessFinding[];
  /** Compact "control → needs resource" demand list (for the LLM reviewer). */
  demand: { id: string; name: string; resource: string | null }[];
  /** GET endpoints registered (for the LLM reviewer). */
  supply: string[];
}

/**
 * Cross-check the PRD's data-needing controls against the TRD's GET endpoints.
 * `schemaSrc` is the TRD's shared-schema.ts (carrying the ENDPOINTS registry).
 */
export function auditEndpointCompleteness(
  prdSpec: PrdSpec | null | undefined,
  schemaSrc: string,
): EndpointCompletenessReport {
  const endpoints = parseEndpointsRegistry(schemaSrc);
  const empty: EndpointCompletenessReport = {
    hasRegistry: endpoints !== null,
    findings: [],
    demand: [],
    supply: [],
  };
  if (!prdSpec || endpoints === null) return empty;

  const readResources = getReadResources(endpoints);
  const supply = endpoints
    .filter((e) => /^get$/i.test(e.method))
    .map((e) => e.endpoint);

  const findings: EndpointCompletenessFinding[] = [];
  const demand: EndpointCompletenessReport["demand"] = [];
  const seen = new Set<string>();

  for (const page of prdSpec.pages ?? []) {
    for (const c of page.interactiveComponents ?? []) {
      if (!isDataNeedingControl(c)) continue;
      const resource = inferControlResource(c);
      demand.push({ id: c.id, name: c.name, resource });
      if (!resource) continue; // unclear → leave to the LLM reviewer

      // Covered if any GET endpoint serves this resource (by token or synonym).
      const variants = RESOURCE_SYNONYMS[resource] ?? [resource];
      const covered =
        readResources.has(resource) ||
        variants.some((v) => readResources.has(v.toLowerCase()));
      if (covered) continue;

      const key = `${resource}`;
      if (seen.has(key)) continue; // one finding per missing resource
      seen.add(key);
      findings.push({
        pageId: page.id,
        componentId: c.id,
        componentName: c.name,
        resource,
        message:
          `Control "${c.name}" (${c.id} on ${page.id}) needs to read \`${resource}\` ` +
          `data, but the ENDPOINTS registry has no GET endpoint serving it. Add a ` +
          `read endpoint (e.g. \`GET /${resource}s\`) with a list Response type to §6/§3.3.`,
      });
    }
  }

  return { hasRegistry: true, findings, demand, supply };
}

/** Render the report as a compact block to inject into the LLM reviewer prompt. */
export function formatCompletenessForReviewer(
  report: EndpointCompletenessReport,
): string {
  if (!report.hasRegistry) return "";
  const lines: string[] = [
    "## Consumer-side endpoint demand/supply (deterministic cross-check)",
    "GET endpoints registered (SUPPLY):",
    report.supply.length
      ? report.supply.map((s) => `  - ${s}`).join("\n")
      : "  (none)",
    "",
    "Data-needing UI controls (DEMAND) — each must have a backing read endpoint:",
  ];
  if (report.demand.length === 0) {
    lines.push("  (none detected)");
  } else {
    for (const d of report.demand) {
      lines.push(`  - ${d.id} "${d.name}" → reads ${d.resource ?? "(resource unclear)"}`);
    }
  }
  if (report.findings.length > 0) {
    lines.push("", "Deterministic GAPS (read endpoint missing):");
    for (const f of report.findings) {
      lines.push(`  - ${f.message}`);
    }
  }
  return lines.join("\n");
}
