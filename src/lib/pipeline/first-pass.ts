/**
 * Derives First-Pass Success metrics from existing repair-log + taskResults.
 * A task is "first-pass" iff its status is `completed` AND no `worker_codefix`
 * stage events reference it in the repair log.
 */
import type { AuditTaskSummary } from "@/lib/pipeline/self-heal";

export interface FirstPassMetrics {
  tasksTotal: number;
  firstPassCount: number;
  avgFixIterations: number;
  perTaskFixIterations: Record<string, number>;
}

export interface DeriveFirstPassInput {
  taskResults: AuditTaskSummary[];
  codefixCountsByTask: Record<string, number>;
}

export function deriveFirstPass(input: DeriveFirstPassInput): FirstPassMetrics {
  const tasksTotal = input.taskResults.length;
  if (tasksTotal === 0) {
    return { tasksTotal: 0, firstPassCount: 0, avgFixIterations: 0, perTaskFixIterations: {} };
  }
  let firstPassCount = 0;
  let fixSum = 0;
  for (const t of input.taskResults) {
    const fixes = input.codefixCountsByTask[t.id] ?? 0;
    fixSum += fixes;
    if (t.status === "completed" && fixes === 0) firstPassCount += 1;
  }
  return {
    tasksTotal,
    firstPassCount,
    avgFixIterations: fixSum / tasksTotal,
    perTaskFixIterations: input.codefixCountsByTask,
  };
}

interface RepairEntry { stage?: string; taskId?: string; event?: string }

export function extractCodefixCounts(entries: RepairEntry[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const e of entries) {
    if (!e.taskId) continue;
    if (!e.stage) continue;
    const stage = e.stage.toLowerCase();
    if (!stage.startsWith("worker_codefix") && !stage.startsWith("worker-codefix")) continue;
    counts[e.taskId] = (counts[e.taskId] ?? 0) + 1;
  }
  return counts;
}
