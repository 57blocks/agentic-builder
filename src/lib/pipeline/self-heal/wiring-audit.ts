/**
 * Frontend interaction-wiring audit (Phase 3a).
 *
 * Complements feature-checklist-audit (which proves a requirement id is
 * *present*) by proving interactive controls are actually *wired*: it reads
 * each frontend task's generated files and runs the conservative regex
 * detector in wiring-contract.ts. Dangling interactions (empty handlers, or an
 * interactive page with no handlers at all) become `AuditEntry`s keyed by the
 * offending PAGE- / CMP- id, so they flow through the existing audit-repair
 * dispatch (which routes those prefixes to a scoped frontend repair worker).
 *
 * Heuristic + conservative by design: findings are `partial` verdicts that
 * drive a repair but do NOT flip the audit's `passed` (they never enter
 * hardUncovered), so a false positive costs at most one bounded repair pass,
 * never a blocked run. Disable with WIRING_AUDIT_ENABLED=0.
 */

import fs from "fs/promises";
import path from "path";

import type { PrdSpec } from "@/lib/requirements/prd-spec-types";
import type { CodingTask } from "@/lib/pipeline/types";
import {
  deriveWiringObligations,
  auditWiringInSource,
} from "@/lib/requirements/wiring-contract";
import type { AuditEntry, AuditTaskSummary } from "./feature-checklist-audit";
import type { RepairEmitter } from "./events";

const FRONTEND_SOURCE_RE = /\.(tsx|jsx)$/;

function enabled(): boolean {
  return process.env.WIRING_AUDIT_ENABLED !== "0";
}

export interface WiringAuditInput {
  tasks: CodingTask[];
  taskResults: AuditTaskSummary[];
  prdSpec: PrdSpec | null | undefined;
  outputDir: string;
  emitter?: RepairEmitter;
}

/**
 * Returns `partial` AuditEntry findings for dangling interactions, one per
 * offending id (deduped across tasks). Empty when disabled, no spec, or
 * nothing dangling.
 */
export async function auditFrontendWiring(
  input: WiringAuditInput,
): Promise<AuditEntry[]> {
  if (!enabled() || !input.prdSpec) return [];

  const resultsById = new Map(input.taskResults.map((r) => [r.id, r]));
  const out: AuditEntry[] = [];
  const seen = new Set<string>();

  for (const task of input.tasks) {
    const obligations = deriveWiringObligations(task, input.prdSpec);
    if (obligations.length === 0) continue;

    const tr = resultsById.get(task.id);
    const files = (tr?.generatedFiles ?? []).filter((f) =>
      FRONTEND_SOURCE_RE.test(f),
    );
    if (files.length === 0) continue;

    let joined = "";
    for (const rel of files) {
      try {
        joined += "\n" + (await fs.readFile(path.join(input.outputDir, rel), "utf-8"));
      } catch {
        /* file not on disk — skip */
      }
    }
    if (!joined.trim()) continue;

    for (const finding of auditWiringInSource(joined, obligations)) {
      if (seen.has(finding.id)) continue;
      seen.add(finding.id);
      out.push({
        id: finding.id,
        verdict: "partial",
        layer: "l2",
        reason: `Interaction wiring incomplete — ${finding.message}`,
        coveringTaskIds: [task.id],
        evidence: [],
        category: "wiring",
      });
    }
  }

  if (out.length > 0) {
    input.emitter?.({
      stage: "post-gen-audit",
      event: "wiring_audit_findings",
      missingIds: out.map((e) => e.id),
      details: { count: out.length },
    });
  }

  return out;
}
