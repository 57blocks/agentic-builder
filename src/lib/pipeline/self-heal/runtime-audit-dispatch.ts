/**
 * Runtime audit dispatcher — closes the loop on `runtime-integration-audit`
 * findings.
 *
 * Why this exists
 * ───────────────
 * `runRuntimeIntegrationAudit` produces high-quality, per-rule findings
 * with stable ids + concrete directives. Until now the supervisor surfaced
 * those findings as free-form text in the verify-fix worker's user prompt
 * and trusted the LLM to address all of them. The 2026-05 stablecoin run
 * exposed two failure modes in that design:
 *
 *   1. **Selective compliance.** When the audit returned N findings the
 *      worker frequently patched ONE and considered the directive block
 *      satisfied. `startScoringWorker` got wired into `server.ts` but the
 *      sibling `startIngestionWorker` finding was silently dropped, so the
 *      shipped project served seed data forever.
 *
 *   2. **No closure check.** Even when the worker did act, nothing re-ran
 *      the audit to confirm the finding was actually gone — the pre-gate
 *      at the end of the run was the only safety net, and a single missed
 *      finding could only fail the gate, never trigger a per-finding
 *      retry.
 *
 * This dispatcher fixes both:
 *
 *   • For rule IDs that are mechanical (e.g. `bg-job-worker-startup`), it
 *     applies a deterministic patcher — no LLM, no token cost, no chance
 *     of selective compliance. The patcher list is intentionally small;
 *     add new entries here as more rules acquire a string→string fix.
 *
 *   • For the remaining findings it persists a structured task artifact
 *     at `.ralph/runtime-audit-tasks.json` — closed list, stable IDs,
 *     per-finding directives — so the verify-fix worker sees concrete
 *     tasks instead of free-form prose.
 *
 *   • Re-runs the audit after deterministic fixes are applied and returns
 *     BOTH the initial and the residual result so callers can diff and
 *     log progress. The supervisor uses the residual result for downstream
 *     blocks + pre-gate decisions.
 */

import path from "path";
import { fsWrite } from "@/lib/langgraph/tools";
import {
  autoWireWorkerStartups,
  type AutoWireWorkerStartupsResult,
} from "@/lib/langgraph/worker-startup-autofix";
import type { RepairEmitter } from "./events";
import {
  runRuntimeIntegrationAudit,
  type RuntimeAuditFinding,
  type RuntimeAuditRuleId,
  type RuntimeIntegrationAuditResult,
} from "./runtime-integration-audit";

const TASK_ARTIFACT_REL = path.join(".ralph", "runtime-audit-tasks.json");

/**
 * Outcome of a single deterministic-fix step.
 */
export interface DeterministicFixOutcome {
  ruleId: RuntimeAuditRuleId;
  appliedAny: boolean;
  /** Stable finding IDs that were closed by this fix step. */
  closedFindingIds: string[];
  /** Free-form human-readable summary, e.g. "wired startIngestionWorker". */
  summary: string;
  /** Raw payload for telemetry / debugging. */
  details?: unknown;
}

/**
 * Per-finding repair task — what we persist to
 * `.ralph/runtime-audit-tasks.json` for the verify-fix worker. Stable IDs
 * mean a worker can dedupe across turns; severity lets the gate decide
 * whether to block on residual findings.
 */
export interface RuntimeAuditRepairTask {
  /** Same id as the source finding so the worker can correlate. */
  id: string;
  ruleId: RuntimeAuditRuleId;
  severity: RuntimeAuditFinding["severity"];
  scope: RuntimeAuditFinding["scope"];
  file: string;
  line: number;
  snippet: string;
  reason: string;
  directive: string;
  /** True when this finding was previously closed by a deterministic fix. */
  resolvedByDeterministicFix: boolean;
}

export interface RuntimeAuditDispatchInput {
  outputDir: string;
  declaredEnvKeys: string[];
  emitter?: RepairEmitter;
  sessionId?: string;
  /**
   * Optional override list of applied optional scaffold features (Privy,
   * Magic Link, etc.). When omitted, the audit auto-loads from
   * `<outputDir>/.blueprint/scaffold-applied.json`.
   */
  appliedOptionalFeatures?: string[];
}

export interface RuntimeAuditDispatchResult {
  /** Audit result BEFORE deterministic fixes — captures the project's
   *  natural state, useful for diffing. Null when the audit threw. */
  initialAudit: RuntimeIntegrationAuditResult | null;
  /** Audit result AFTER deterministic fixes were applied. This is the
   *  canonical result every downstream stage should consult. Null when
   *  the audit threw. */
  residualAudit: RuntimeIntegrationAuditResult | null;
  /** What each deterministic fixer did. */
  deterministicFixes: DeterministicFixOutcome[];
  /** Per-finding repair tasks (closed list) for the verify-fix worker. */
  repairTasks: RuntimeAuditRepairTask[];
}

/**
 * Registry of deterministic fixers, keyed by rule id. Each fixer receives
 * the outputDir + the findings for its rule and returns a closure
 * descriptor. Add new entries as more rules acquire a mechanical fix.
 *
 * **Adding a fixer here is preferred over upgrading severity.** Severity
 * decides whether the gate blocks; a fixer decides whether the LLM has to
 * touch the issue at all.
 */
type DeterministicFixer = (input: {
  outputDir: string;
  findings: RuntimeAuditFinding[];
}) => Promise<DeterministicFixOutcome>;

const DETERMINISTIC_FIXERS: Partial<Record<RuntimeAuditRuleId, DeterministicFixer>> = {
  "bg-job-worker-startup": async ({ outputDir, findings }) => {
    const r: AutoWireWorkerStartupsResult = await autoWireWorkerStartups(
      outputDir,
    );
    // A worker is closed when its export name appears in the wired list.
    // The audit finding id is `bg-job-worker-startup|<file>|<line>` — we
    // match by file basename or by export name when the file is too coarse.
    // The cleanest heuristic is: if `appliedAny`, every finding in this
    // rule's bucket got addressed (the patcher scans ALL workers in one
    // pass and writes a single server.ts), so we close them all.
    const closedFindingIds = r.appliedAny ? findings.map((f) => f.id) : [];
    return {
      ruleId: "bg-job-worker-startup",
      appliedAny: r.appliedAny,
      closedFindingIds,
      summary: r.appliedAny
        ? `wired ${r.wired.join(", ")} into backend/src/server.ts`
        : r.skipped.length > 0
          ? `skipped: ${r.skipped.map((s) => `${s.exportName} (${s.reason})`).join("; ")}`
          : "no missing worker startup calls",
      details: r,
    };
  },
};

function findingToRepairTask(
  finding: RuntimeAuditFinding,
  closedIds: Set<string>,
): RuntimeAuditRepairTask {
  return {
    id: finding.id,
    ruleId: finding.ruleId,
    severity: finding.severity,
    scope: finding.scope,
    file: finding.file,
    line: finding.line,
    snippet: finding.snippet,
    reason: finding.reason,
    directive: finding.directive,
    resolvedByDeterministicFix: closedIds.has(finding.id),
  };
}

/**
 * Run the runtime-integration-audit, apply deterministic fixes for the
 * rule IDs that have a registered patcher, re-run the audit to confirm
 * closure, and persist a per-finding task list for the verify-fix worker.
 *
 * Returns both the initial and residual audit results plus the
 * deterministic-fix outcomes; callers should use `residualAudit` for any
 * gating / prompt-block decisions.
 */
export async function dispatchRuntimeAudit(
  input: RuntimeAuditDispatchInput,
): Promise<RuntimeAuditDispatchResult> {
  const { outputDir, declaredEnvKeys, emitter, sessionId, appliedOptionalFeatures } =
    input;

  // ── Phase 1: initial audit ───────────────────────────────────────────
  let initialAudit: RuntimeIntegrationAuditResult | null = null;
  try {
    initialAudit = await runRuntimeIntegrationAudit({
      outputDir,
      declaredEnvKeys,
      appliedOptionalFeatures,
      emitter,
      sessionId,
    });
  } catch (err) {
    console.warn(
      `[runtime-audit-dispatch] initial audit threw — ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!initialAudit) {
    return {
      initialAudit: null,
      residualAudit: null,
      deterministicFixes: [],
      repairTasks: [],
    };
  }

  // ── Phase 2: deterministic fixes ─────────────────────────────────────
  const findingsByRule = new Map<RuntimeAuditRuleId, RuntimeAuditFinding[]>();
  for (const f of initialAudit.findings) {
    const bucket = findingsByRule.get(f.ruleId) ?? [];
    bucket.push(f);
    findingsByRule.set(f.ruleId, bucket);
  }

  const deterministicFixes: DeterministicFixOutcome[] = [];
  const closedFindingIds = new Set<string>();
  for (const [ruleId, fixer] of Object.entries(DETERMINISTIC_FIXERS) as Array<
    [RuntimeAuditRuleId, DeterministicFixer]
  >) {
    const ruleFindings = findingsByRule.get(ruleId) ?? [];
    if (ruleFindings.length === 0) continue;
    try {
      const outcome = await fixer({ outputDir, findings: ruleFindings });
      deterministicFixes.push(outcome);
      for (const id of outcome.closedFindingIds) closedFindingIds.add(id);
      if (emitter) {
        emitter({
          stage: "preflight-route-audit",
          sessionId,
          event: "runtime_audit_deterministic_fix",
          details: {
            ruleId,
            appliedAny: outcome.appliedAny,
            closedCount: outcome.closedFindingIds.length,
            summary: outcome.summary,
          },
        });
      }
    } catch (err) {
      console.warn(
        `[runtime-audit-dispatch] deterministic fixer for ${ruleId} threw — ${err instanceof Error ? err.message : String(err)}`,
      );
      deterministicFixes.push({
        ruleId,
        appliedAny: false,
        closedFindingIds: [],
        summary: `fixer threw: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  // ── Phase 3: residual audit (closure check) ──────────────────────────
  // If no deterministic fix actually changed disk, we can skip the
  // second audit — the result would be identical.
  const anyFixApplied = deterministicFixes.some((o) => o.appliedAny);
  let residualAudit: RuntimeIntegrationAuditResult | null = null;
  if (anyFixApplied) {
    try {
      residualAudit = await runRuntimeIntegrationAudit({
        outputDir,
        declaredEnvKeys,
        appliedOptionalFeatures,
        emitter,
        sessionId,
      });
    } catch (err) {
      console.warn(
        `[runtime-audit-dispatch] residual audit threw — ${err instanceof Error ? err.message : String(err)}`,
      );
      residualAudit = initialAudit;
    }
  } else {
    residualAudit = initialAudit;
  }

  // ── Phase 4: per-finding task list ───────────────────────────────────
  // We persist the RESIDUAL findings (post-fix). Deterministic fixes
  // already closed their items so they don't appear here. Anything left
  // is either a non-mechanical issue or a finding the patcher couldn't
  // close (skipped).
  const residualFindings = residualAudit?.findings ?? [];
  const repairTasks = residualFindings.map((f) =>
    findingToRepairTask(f, closedFindingIds),
  );

  try {
    const persistRel = TASK_ARTIFACT_REL.split(path.sep).join("/");
    const writeRes = await fsWrite(
      persistRel,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          sessionId,
          initialFindingCount: initialAudit.findings.length,
          residualFindingCount: residualFindings.length,
          deterministicFixes: deterministicFixes.map((o) => ({
            ruleId: o.ruleId,
            appliedAny: o.appliedAny,
            closedCount: o.closedFindingIds.length,
            summary: o.summary,
          })),
          tasks: repairTasks,
        },
        null,
        2,
      ),
      outputDir,
    );
    if (
      typeof writeRes === "string" &&
      (writeRes.startsWith("REJECTED") || writeRes.startsWith("SKIPPED_PROTECTED"))
    ) {
      console.warn(
        `[runtime-audit-dispatch] failed to persist task artifact: ${writeRes}`,
      );
    }
  } catch (err) {
    console.warn(
      `[runtime-audit-dispatch] failed to persist task artifact: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (emitter) {
    emitter({
      stage: "preflight-route-audit",
      sessionId,
      event: "runtime_audit_dispatch_summary",
      details: {
        initialFindingCount: initialAudit.findings.length,
        residualFindingCount: residualFindings.length,
        residualErrorCount:
          residualFindings.filter((f) => f.severity === "error").length,
        deterministicFixesApplied: deterministicFixes.filter((o) => o.appliedAny)
          .length,
        closedFindingCount: closedFindingIds.size,
      },
    });
  }

  return {
    initialAudit,
    residualAudit,
    deterministicFixes,
    repairTasks,
  };
}

/**
 * Render the per-finding task list as a markdown block the verify-fix
 * worker can consume directly. Empty / null tasks produce an empty
 * string so the supervisor can interpolate unconditionally.
 *
 * The output is a closed numbered list, NOT free-form prose — every
 * remaining finding gets one line with its stable id, file:line, and
 * imperative directive.
 */
export function formatRuntimeAuditTasksBlock(
  result: RuntimeAuditDispatchResult,
): string {
  const tasks = result.repairTasks.filter(
    (t) => !t.resolvedByDeterministicFix,
  );
  if (tasks.length === 0) return "";

  const lines: string[] = [];
  lines.push("## Runtime integration audit — residual tasks");
  lines.push("");
  if (result.deterministicFixes.length > 0) {
    const applied = result.deterministicFixes
      .filter((o) => o.appliedAny)
      .map((o) => `${o.ruleId} (${o.summary})`);
    if (applied.length > 0) {
      lines.push(
        `Deterministic fixes already applied this turn: ${applied.join("; ")}.`,
      );
    }
  }
  lines.push(
    "Address every remaining task below. Each task is keyed by a stable id; the audit will re-run and the gate will block the run until every error-severity task is closed.",
  );
  lines.push("");
  tasks.forEach((t, idx) => {
    lines.push(`### ${idx + 1}. [${t.severity.toUpperCase()}] \`${t.ruleId}\` — \`${t.file}:${t.line}\``);
    lines.push(`- Task id: \`${t.id}\``);
    lines.push(`- Why: ${t.reason}`);
    lines.push(`- Action: ${t.directive}`);
    lines.push("");
  });
  return lines.join("\n").trim();
}
