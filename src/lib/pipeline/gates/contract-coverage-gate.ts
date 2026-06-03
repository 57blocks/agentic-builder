import type { GateReportBase } from "@/lib/requirements/prd-spec-types";
import type { KickoffWorkItem } from "@/lib/pipeline/types";

/**
 * Minimal shape of an `API_CONTRACTS.json` entry. The full file may carry
 * many more fields (audience, prdJustification, etc.) but the gate only
 * needs `method` + `endpoint` to check coverage.
 */
export interface ContractEntryLike {
  method?: string;
  endpoint?: string;
  /** Set by the baseline-endpoint injector for scaffold-provided routes
   *  (auth, health). These are already implemented and do NOT need a task. */
  scaffoldProvided?: boolean;
}

/**
 * Build a tolerant regex that matches a contract endpoint inside free-form
 * task prose. Path parameters (`:id`, `{id}`) are replaced with wildcards
 * so a task can mention either the canonical contract form or a concrete
 * example URL. Regex specials in the literal path segments are escaped.
 *
 * Examples (`endpoint = "/api/v1/feedback/:id"`):
 *   ✅ "PATCH /api/v1/feedback/:id"   (verbatim)
 *   ✅ "PATCH /api/v1/feedback/abc"   (concrete id)
 *   ✅ "patch the /api/v1/feedback/{id} endpoint"
 *   ❌ "GET /api/v1/feedback"          (different shape)
 */
function endpointToRegex(method: string, endpoint: string): RegExp {
  const WILDCARD = "@@PATH_PARAM@@";
  let pattern = endpoint
    .replace(/:[A-Za-z_$][\w$]*/g, WILDCARD)
    .replace(/\{[A-Za-z_$][\w$]*\}/g, WILDCARD);
  pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  pattern = pattern.replace(new RegExp(WILDCARD, "g"), "[^/\\s\"'`]+");
  // Method prefix is optional — a task is allowed to discuss "/api/v1/foo"
  // without spelling out the method when the surrounding context makes it
  // unambiguous (e.g. a list of endpoints under a "Frontend page" subStep).
  return new RegExp(`(?:${method.toUpperCase()}\\s+)?${pattern}`, "i");
}

function collectTaskText(task: KickoffWorkItem): string {
  const parts: string[] = [];
  parts.push(task.title ?? "");
  parts.push(task.description ?? "");
  if (Array.isArray(task.subSteps)) {
    for (const s of task.subSteps) {
      if (s.action) parts.push(s.action);
      if (s.detail) parts.push(s.detail);
    }
  }
  if (Array.isArray(task.acceptanceCriteria)) {
    for (const ac of task.acceptanceCriteria) parts.push(ac);
  }
  return parts.join("\n");
}

function endpointKey(method: string, endpoint: string): string {
  return `${method.toUpperCase()} ${endpoint}`;
}

/**
 * Checks whether every API_CONTRACTS endpoint is referenced by at least one
 * kick-off task (in title / description / subSteps / acceptanceCriteria).
 *
 * Why this exists: today the contract-vs-code consistency audit runs
 * post-codegen (`auditApiRouteRegistration`), at which point a missing
 * endpoint is already baked in. By the time the report says "API-37 is
 * declared but not implemented", coding budget for that endpoint is gone
 * and self-heal has to redo work. This gate catches the same drift at the
 * cheaper place — right after contract generation, BEFORE coding starts —
 * so the supplementary-task pathway can inject coverage.
 *
 * Returns `missingIds` as `"METHOD /path"` strings (not PRD requirement IDs).
 * Downstream repair code passes these directly to
 * `TaskBreakdownAgent.generateSupplementaryTasks` — the agent treats them
 * opaquely and writes tasks that reference each endpoint back.
 */
export function runContractCoverageGate(
  contracts: ContractEntryLike[],
  tasks: KickoffWorkItem[],
): GateReportBase {
  // Build the canonical endpoint list (method + path). Drop entries that
  // are missing either field — those are malformed and the contract
  // completeness audit will catch them separately.
  const canonical: Array<{ method: string; endpoint: string; key: string }> =
    [];
  const seenKeys = new Set<string>();
  for (const c of contracts) {
    if (!c.method || !c.endpoint) continue;
    // Scaffold-provided endpoints (auth, health) are pre-implemented by the
    // scaffold and do not need a task. Skip them in the coverage check so the
    // repair loop doesn't waste LLM budget trying to add auth tasks to projects
    // that intentionally have no auth (e.g. a Text Diff Tool using M scaffold).
    if (c.scaffoldProvided) continue;
    const key = endpointKey(c.method, c.endpoint);
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    canonical.push({
      method: c.method.toUpperCase(),
      endpoint: c.endpoint,
      key,
    });
  }

  if (canonical.length === 0) {
    return {
      gateId: "task-contract-coverage",
      passed: true,
      warnings: [
        "API_CONTRACTS.json is empty — skipped contract coverage check.",
      ],
      missingIds: [],
    };
  }

  // Concatenated text per task. Cheaper than running every regex against
  // every field individually.
  const taskTexts = tasks.map(collectTaskText);

  const missing: string[] = [];
  for (const c of canonical) {
    const re = endpointToRegex(c.method, c.endpoint);
    const covered = taskTexts.some((text) => re.test(text));
    if (!covered) missing.push(c.key);
  }

  const warnings: string[] = [];
  if (missing.length > 0) {
    warnings.push(
      `No kick-off task references the following contract endpoint(s): ${missing.join(", ")}. ` +
        `These will be silently skipped by the coding agents unless a supplementary ` +
        `task is generated.`,
    );
  }

  return {
    gateId: "task-contract-coverage",
    passed: missing.length === 0,
    warnings,
    missingIds: missing,
  };
}
