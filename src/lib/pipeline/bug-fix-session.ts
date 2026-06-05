/**
 * Bug Fix Session
 *
 * Accepts human QA bug reports and drives the existing worker subgraph to
 * produce targeted, minimal fixes. Each bug gets its own isolated worker
 * invocation so failures are contained and file-write conflicts are avoided.
 */

import { createWorkerSubGraph } from "@/lib/langgraph/agent-subgraph";
import type { GeneratedFile, ApiContract, WorkerState } from "@/lib/langgraph/state";
import type { CodingTask, RalphConfig, CodingAgentRole } from "@/lib/pipeline/types";
import { DEFAULT_RALPH_CONFIG } from "@/lib/pipeline/types";
import type { RepairEmitter } from "@/lib/pipeline/self-heal/events";
import { writeBugFixCheckpoint, type BugFixCheckpointEntry } from "@/lib/pipeline/bug-fix-checkpoint";
import type { BugAnalysisResult } from "@/lib/pipeline/bug-fix-analysis";
import { verifyBugFix } from "@/lib/pipeline/bug-fix-verify";

// ─── Public types ─────────────────────────────────────────────────────────────

export interface BugReport {
  /** Unique identifier from the QA tracker, e.g. "BUG-001" */
  id: string;
  /** One-line title */
  title: string;
  /** Reproduction steps + actual vs expected behaviour */
  description: string;
  /** Pre-analysis result from the analysis step, if available */
  analysis?: BugAnalysisResult;
}

export interface BugFixSessionInput {
  bugs: BugReport[];
  outputDir: string;
  projectContext: string;
  fileRegistrySnapshot?: GeneratedFile[];
  apiContractsSnapshot?: ApiContract[];
  scaffoldProtectedPaths?: string[];
  ralphConfig?: RalphConfig;
  sessionId?: string;
  emitter: RepairEmitter;
  abortSignal?: AbortSignal;
}

export interface BugFixSessionResult {
  fixedBugIds: string[];
  failedBugIds: string[];
  generatedFiles: string[];
  repairTasks: CodingTask[];
  costUsd: number;
}

// ─── Role detection ────────────────────────────────────────────────────────────

const FRONTEND_KEYWORDS =
  /\b(component|button|input|form|css|style|modal|dialog|frontend|react|dropdown|sidebar|navbar|animation|tooltip|toast|responsive|mobile)\b/i;

function detectBugRole(bug: BugReport): CodingAgentRole {
  const text = `${bug.title} ${bug.description}`;
  return FRONTEND_KEYWORDS.test(text) ? "frontend" : "backend";
}

// ─── Task builder ──────────────────────────────────────────────────────────────

function buildBugFixTask(bug: BugReport): CodingTask {
  const description = [
    `A QA tester reported the following bug. Produce a MINIMAL, targeted fix.`,
    ``,
    `## Bug: ${bug.title}`,
    ``,
    bug.description,
    ``,
    `## Strategy`,
    `1. Use \`grep\` to search for the relevant function/component name before reading files.`,
    `2. Use \`read_file\` to understand the full context of each relevant file.`,
    `3. Make the smallest change that fixes the bug. Do NOT refactor unrelated code.`,
    `4. CRITICAL: When writing to an existing file, you MUST write the COMPLETE file content — the full original content with your fix merged in. Never write only your new additions; this would destroy the rest of the file.`,
    `5. Do NOT delete or rewrite code that implements other features.`,
    `6. After writing, verify your change is consistent with imported types and existing contracts.`,
  ].join("\n");

  return {
    id: `T-BUGFIX-${bug.id}`,
    phase: "Frontend",
    title: `Fix: ${bug.title}`,
    description,
    estimatedHours: 1,
    executionKind: "ai_autonomous",
    files: { creates: [], modifies: [], reads: [] },
    dependencies: [],
    priority: "P0",
    coversRequirementIds: [bug.id],
    assignedAgentId: null,
    codingStatus: "pending",
  };
}

// ─── File collection helper ────────────────────────────────────────────────────

function collectFiles(ws: WorkerState): string[] {
  const out = new Set<string>();
  for (const tr of ws.taskResults ?? []) {
    for (const f of tr.generatedFiles ?? []) out.add(f);
  }
  for (const f of ws.generatedFiles ?? []) out.add(f.path);
  return [...out];
}

// ─── Main entry point ──────────────────────────────────────────────────────────

export async function runBugFixSession(
  input: BugFixSessionInput,
): Promise<BugFixSessionResult> {
  const {
    bugs,
    outputDir,
    projectContext,
    fileRegistrySnapshot,
    apiContractsSnapshot,
    scaffoldProtectedPaths,
    sessionId,
    emitter,
    abortSignal,
  } = input;

  const ralphConfig = input.ralphConfig ?? { ...DEFAULT_RALPH_CONFIG };
  const CONCURRENCY = Math.min(4, bugs.length);
  const sessionStartedAt = new Date().toISOString();

  // Per-bug tracking — files, cost, tokens, verification — for checkpoint entries.
  const bugFilesMap  = new Map<string, string[]>();
  const bugCostMap   = new Map<string, number>();
  const bugTokenMap  = new Map<string, { promptTokens: number; completionTokens: number; totalTokens: number }>();
  const bugVerifyMap     = new Map<string, import("./bug-fix-verify").BugVerificationResult>();
  const bugVerifyPromises: Promise<void>[] = [];

  const result: BugFixSessionResult = {
    fixedBugIds: [],
    failedBugIds: [],
    generatedFiles: [],
    repairTasks: [],
    costUsd: 0,
  };

  emitter({
    stage: "bug-fix",
    event: "session_start",
    sessionId,
    details: { total: bugs.length, concurrency: CONCURRENCY },
  });

  // Worker function for a single bug — runs in its own graph instance.
  async function fixOneBug(bug: BugReport): Promise<void> {
    const task = buildBugFixTask(bug);
    result.repairTasks.push(task);

    const role: CodingAgentRole = bug.analysis?.role ?? detectBugRole(bug);

    emitter({
      stage: "bug-fix",
      event: "fix_start",
      sessionId,
      details: { bugId: bug.id, taskId: task.id, role },
    });

    try {
      if (bug.analysis?.likelyFiles.length && task.files && !Array.isArray(task.files)) {
        task.files.reads = bug.analysis.likelyFiles;
      }

      const workerGraph = createWorkerSubGraph();
      const workerInput: Partial<WorkerState> = {
        role,
        codingMode: "cost",
        workerLabel: `Bug Fix (${bug.id})`,
        tasks: [task],
        outputDir,
        projectContext,
        fileRegistrySnapshot: fileRegistrySnapshot ?? [],
        apiContractsSnapshot: apiContractsSnapshot ?? [],
        scaffoldProtectedPaths: scaffoldProtectedPaths ?? [],
        currentTaskIndex: 0,
        ralphConfig,
        sessionId: sessionId ?? "",
      };

      const res = await workerGraph.invoke(workerInput, { recursionLimit: 80 });
      const ws = res as WorkerState;
      const files   = collectFiles(ws);
      const costUsd = ws.workerCostUsd ?? 0;
      const tokens  = ws.currentTaskTokenUsage ?? { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
      bugFilesMap.set(bug.id, files);
      bugCostMap.set(bug.id, costUsd);
      bugTokenMap.set(bug.id, tokens);

      result.generatedFiles.push(...files);
      result.costUsd += costUsd;

      if (files.length > 0) {
        result.fixedBugIds.push(bug.id);
        emitter({
          stage: "bug-fix",
          event: "fix_done",
          sessionId,
          details: { bugId: bug.id, filesWritten: files.length, files, costUsd, tokens },
        });
        // Emit fix_verified after verification completes; awaited via bugVerifyPromises below
        bugVerifyPromises.push(
          verifyBugFix(bug, files, outputDir).then((verification) => {
            bugVerifyMap.set(bug.id, verification);
            emitter({
              stage: "bug-fix",
              event: "fix_verified",
              sessionId,
              details: { bugId: bug.id, verdict: verification.verdict, confidence: verification.confidence },
            });
          }).catch(() => {}),
        );
      } else {
        result.failedBugIds.push(bug.id);
        emitter({
          stage: "bug-fix",
          event: "fix_no_output",
          sessionId,
          details: { bugId: bug.id },
        });
      }
    } catch (err) {
      result.failedBugIds.push(bug.id);
      emitter({
        stage: "bug-fix",
        event: "fix_error",
        sessionId,
        details: {
          bugId: bug.id,
          error: err instanceof Error ? err.message : String(err),
        },
      });
    }
  }

  // Run bugs concurrently with a semaphore (max CONCURRENCY at a time).
  const queue = [...bugs];
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length > 0) {
      if (abortSignal?.aborted) break;
      const bug = queue.shift();
      if (bug) await fixOneBug(bug);
    }
  });
  await Promise.all(workers);
  // Wait for all verification calls (non-blocking per-bug, but must finish before checkpoint)
  await Promise.allSettled(bugVerifyPromises);

  // Persist to .blueprint/bug-fix-session.json
  const checkpointEntries: BugFixCheckpointEntry[] = bugs.map((bug) => {
    const fixed = result.fixedBugIds.includes(bug.id);
    const failed = result.failedBugIds.includes(bug.id);
    return {
      bug,
      status: fixed ? "fixed" : failed ? "failed" : "pending",
      generatedFiles: fixed ? (bugFilesMap.get(bug.id) ?? []) : [],
      costUsd: bugCostMap.get(bug.id),
      tokens: bugTokenMap.get(bug.id),
      fixedAt: fixed ? new Date().toISOString() : undefined,
      verification: bugVerifyMap.get(bug.id),
    };
  });
  await writeBugFixCheckpoint(outputDir, sessionId ?? "unknown", checkpointEntries, result.costUsd, sessionStartedAt);

  emitter({
    stage: "bug-fix",
    event: "session_done",
    sessionId,
    details: {
      fixed: result.fixedBugIds.length,
      failed: result.failedBugIds.length,
      totalFiles: result.generatedFiles.length,
      costUsd: result.costUsd,
    },
  });

  return result;
}
