import path from "path";
import fs from "fs/promises";
import { StateGraph, START, END, Send } from "@langchain/langgraph";
import {
  SupervisorStateAnnotation,
  type SupervisorState,
  type WorkerState,
  type PhaseResult,
  type GeneratedFile,
  type ApiContract,
  type TaskResult,
} from "./state";
import { getWorkerChunkSink } from "./worker-event-bridge";
import {
  createWorkerSubGraph,
  classifyTscErrors,
  installMissingDeps,
  extractMissingPackages,
  extractErrorFiles,
  inferRelatedConfigFiles,
  hasConfigErrors,
  findBestTsconfigForFiles,
  buildVersionConstraints,
  WORKER_LOCAL_TDD_FAIL_PREFIX,
} from "./agent-subgraph";
import {
  formatGeneratedCodeDotEnv,
  resolveBlueprintGeneratedDatabaseUrl,
} from "@/lib/pipeline/generated-code-env";
import {
  shellExec,
  execPrismaGenerate,
  fsWrite,
  fsRead,
  listFiles,
  detectPackageManager,
  buildInstallCommand,
  buildAddCommand,
  isAutoInstallableNpmPackageName,
  type FsWriteOptions,
} from "./tools";
import {
  injectBaselineEndpoints,
  detectContractPrefix,
  type ApiContractEntry,
} from "./baseline-endpoints";
import {
  wireRegistrationsIntoIndex,
  computeRelativeImportPath,
} from "./route-audit-autofix";
import { repairFrontendRouterWiring } from "./frontend-router-autofix";
import { computeStagnationReplan } from "@/lib/pipeline/self-heal";
import {
  chatCompletionWithFallback,
  resolveModel,
  estimateCost,
  type ChatMessage,
} from "@/lib/openrouter";
import {
  chatCompletionsDeepSeekV4,
  DEEPSEEK_V4_DEFAULT_BASE,
  DEEPSEEK_V4_DEFAULT_MODEL,
  isDeepSeekV4Provider,
} from "@/lib/providers/deepseek-v4";
import type { OpenRouterOptions, OpenRouterResponse } from "@/lib/llm-types";
import { resolveModelChain } from "@/lib/model-config";
import type { CodingAgentRole, CodingTask } from "@/lib/pipeline/types";
import type { CodingMode } from "@/lib/pipeline/coding-mode";
import {
  resolveCodingModelConfigValue,
  shouldForceOpenRouterForCodingMode,
} from "@/lib/pipeline/coding-model-selection";
import { stripTestingPhaseTasks } from "@/lib/pipeline/strip-testing-tasks";
import { triagePrebuiltArchitectTasks } from "./architect-triage";
import {
  getRepairEmitter,
  dispatchAuditRepair,
  type AuditEntry,
  runContractUsageCoverage,
  runRuntimeIntegrationAudit,
  formatRuntimeAuditBlock,
  dispatchRuntimeAudit,
  formatRuntimeAuditTasksBlock,
  type RuntimeAuditFinding,
  runRuntimeSmokeGate,
  prepareTestSchema,
  seedTestSchema,
  teardownTestSchema,
  type PreparedTestSchema,
  type SeedResult,
  runTscDiagnosticsAsTasks,
  runAdminRouteCoverageRepair,
  formatAdminRouteCoverageBlock,
  repairContractCoverage,
  repairPageCoverage,
  generateMissingRouteStubs,
  formatMissingRouteStubBlock,
  type GenerateMissingRouteStubsResult,
  syncClientApiBase,
} from "@/lib/pipeline/self-heal";
import {
  runContractCoverageGate,
  runPageCoverageGate,
  type ContractEntryLike,
} from "@/lib/pipeline/gates";
import {
  normalizeProjectTier,
  type ProjectTier,
} from "@/lib/agents/shared/project-classifier";
import {
  requestHumanDecision,
  INTEGRATION_DECISION_OPTIONS,
} from "@/lib/pipeline/human-decision";
import {
  readResourceRequirements,
  formatUnfilledKeysForE2EPrompt,
} from "@/lib/pipeline/resource-requirements";
import { runTddRuntimePhase } from "@/lib/pipeline/tdd-runtime-executor";
import { runTddTestWriter } from "@/lib/pipeline/tdd-test-writer";
import { reviewTddTests } from "@/lib/pipeline/tdd-reviewer";
import { formatTddRepairBlock } from "@/lib/pipeline/tdd-diagnostics-block";
import { formatRuntimeSmokeBlock } from "@/lib/pipeline/runtime-smoke-block";
import {
  BUILD_FAILED_MARKER_REL,
  isInfraDominatedFailure,
} from "@/lib/pipeline/build-quarantine";
import {
  runBackendTscGate,
  decideBackendReadinessRoute,
} from "@/lib/pipeline/backend-readiness-gate";
import { recordUnresolvedProblem } from "@/lib/pipeline/unresolved-problems";
import { distributeSharedSchema } from "@/lib/pipeline/shared-schema-distributor";
import {
  parseEndpointsRegistry,
  serviceFromEndpoint,
} from "@/lib/pipeline/endpoints-registry";
import {
  readSchemaChangeRequests,
  readSchemaChangeDecisions,
  appendSchemaChangeDecision,
  pendingRequests,
  staleTaskIds,
  acceptedChangedTypes,
  type SchemaChangeRequest,
  type SchemaChangeDecision,
} from "@/lib/pipeline/schema-change-request";
import { evaluateTddHardGate } from "@/lib/pipeline/tdd-evidence";
import { pickRelevantSections } from "./doc-section-picker";
import {
  parsePrdE2eSpec,
  planE2eTestFiles,
  formatScenarioForGeneration,
} from "@/lib/e2e/prd-e2e-spec";
import {
  triageE2eFailures,
  hasInfraSignal,
  type FailedTestRecord,
} from "./e2e-triage";
import { compactChatMessagesSemantically } from "./conversation-semantic-compact";
import {
  STRUCTURED_SUPERVISOR_TOOLS,
  executeStructuredSupervisorTool,
} from "./structured-verify-tools";
import {
  ENABLE_PHASE_INCREMENTAL_CONTEXT_SYNC,
  ENABLE_PARALLEL_CODING_WORKERS,
  ENABLE_PARALLEL_FOUNDATION,
  ENABLE_PARALLEL_FE_BE,
  ENABLE_SCHEMA_RECONCILE,
  ENABLE_FE_ROUTE_CONSOLIDATION,
  frontendPageWorkerCount,
  parsedWorkerLimit,
  workersForRole,
  MAX_E2E_VERIFY_FIX_ATTEMPTS,
  scaledIntegrationVerifyFixTotalBudget,
  remainingIntegrationVerifyBudget,
  INTEGRATION_FIX_MODE,
} from "./supervisor/config";
import {
  splitFrontendTasks,
  detectViewExport,
  viewImportSpecifier,
  validateConsolidatedRouter,
  type ViewModule,
} from "./supervisor/frontend-phase-split";
import { recordSupervisorLlmUsage } from "./supervisor/usage-tracking";
import {
  PHASE_TO_ROLE,
  inferRole,
  isFrontendOnly,
} from "./supervisor/role-mapping";
import {
  hasOverlap,
  chunkTasks,
  collectTaskFiles,
  chunkTasksByFileConflict,
} from "./supervisor/shared/task-chunking";
import {
  isToolSequenceValidationError,
  countRemovedOrphanToolMessages,
  isContextLengthError,
  callWithOrphanToolRetry,
} from "./supervisor/shared/llm-call";
import {
  formatTaskBreakdownMarkdown,
  writeTaskBreakdownMarkdown,
} from "./supervisor/shared/task-breakdown";
import {
  routeAfterIntegrationVerify,
  routeAfterTddGreenVerify,
  routeAfterTddGreenVerifyRetry,
  routeAfterE2eVerify,
} from "./supervisor/routing";
import {
  lastTestNameSegment,
  errorContextMatchesAny,
  writeTriageReport,
} from "./supervisor/e2e/triage-helpers";
import { pathExistsUnderOutput } from "./supervisor/shared/output-fs";
import {
  auditApiRouteRegistration,
  autoRepairRouteRegistration,
  auditContractCompleteness,
  autoAppendMissingScopedEndpoints,
} from "./supervisor/audits/route-registration";
import { SUPERVISOR_VERIFY_TOOLS } from "./supervisor/verify-tools/definitions";
import {
  isSuccessfulSupervisorToolResult,
  extractScopedValidationIssueMetrics,
  isValidationIssueMetricsImproved,
  countRouteAuditIssues,
  countContractCompletenessIssues,
  type ScopedValidationKind,
  type ScopedValidationIssueMetrics,
} from "./supervisor/verify-tools/scoped-validation";
import {
  isMutatingSupervisorBashCommand,
  detectScopedValidationKind,
  detectScopedValidationKinds,
  isValidationLikeBashCommand,
  buildIntegrationReasoningOptions,
} from "./supervisor/verify-tools/command-classifier";
import { executeSupervisorTool } from "./supervisor/verify-tools/executor";
import { openIntegrationVerifyAndFix } from "./open-integration-verify-fix";
import {
  normalizeFrontendHookSignatures,
  normalizeFrontendJsxElementAnnotations,
  normalizeFrontendReactComponentTemplates,
  normalizeFrontendAuthDtoAliases,
  normalizeFrontendUseFormHook,
  normalizeFrontendDuplicateApiClient,
  normalizeFrontendErrorWithCause,
  auditFrontendApiClientUniqueness,
  detectFrontendConvergenceClusters,
} from "./supervisor/normalizers/frontend";
import {
  normalizeBackendMiddlewareFolder,
  normalizeBackendGetValidateBody,
} from "./supervisor/normalizers/backend";
import {
  detectDbDependencies,
  handlePrismaSetup,
  normalizeWorkspaceImports,
} from "./supervisor/db-setup/prisma";
import { buildComponentInterfaceReference } from "./supervisor/shared/component-interface";
import {
  syncDeps,
  tddTestWriterAndRed,
  tddGreenVerifyAndReview,
  tddGreenVerifyPassthrough,
} from "./supervisor/nodes/tdd";

// ─── Nodes ───

function resolveCodingChain(
  mode: CodingMode,
  variant: "codeFix" | "phaseVerifyFix" | "e2eGen" | "taskBreakdown",
  fallback: string,
): string[] {
  const configValue = resolveCodingModelConfigValue(mode, variant);
  const safe = configValue ?? fallback;
  return resolveModelChain(safe, resolveModel);
}

function forceOpenRouterForMode(mode: CodingMode): boolean {
  return shouldForceOpenRouterForCodingMode(mode);
}

/**
 * Stable topological sort within a bucket of tasks. Tasks are emitted in
 * dependency order (parents before children); within the same dependency
 * level, the original array order is preserved.
 *
 * Cross-role dependencies are ignored — only deps that point at another task
 * in the SAME bucket constrain the order. A cycle within the bucket
 * degenerates gracefully into the original order (no infinite loop).
 *
 * Without this sort, workers execute tasks in raw kickoff array order while
 * the UI renders them by topological level — leading to visible disagreements
 * like "root task done → last task starts → intermediate tasks last".
 */
function topoSortBucket(bucket: CodingTask[]): CodingTask[] {
  if (bucket.length <= 1) return bucket;
  const idToIndex = new Map(bucket.map((t, i) => [t.id, i] as const));
  const indegree = new Array<number>(bucket.length).fill(0);
  const children: number[][] = bucket.map(() => []);

  bucket.forEach((t, i) => {
    for (const dep of t.dependencies ?? []) {
      const j = idToIndex.get(dep);
      if (j === undefined) continue; // cross-role / unknown dep — ignore
      children[j].push(i);
      indegree[i] += 1;
    }
  });

  // Kahn's algorithm with stable tie-breaking by original index.
  const queue: number[] = [];
  for (let i = 0; i < bucket.length; i++) if (indegree[i] === 0) queue.push(i);
  const ordered: CodingTask[] = [];
  const visited = new Set<number>();
  while (queue.length > 0) {
    const i = queue.shift()!;
    if (visited.has(i)) continue;
    visited.add(i);
    ordered.push(bucket[i]);
    for (const c of children[i]) {
      indegree[c] -= 1;
      if (indegree[c] === 0) {
        // Insert in original-index order to keep within-level order stable.
        let lo = 0,
          hi = queue.length;
        while (lo < hi) {
          const mid = (lo + hi) >>> 1;
          if (queue[mid] < c) lo = mid + 1;
          else hi = mid;
        }
        queue.splice(lo, 0, c);
      }
    }
  }
  // Fall back to original order for any task still left (cycle in bucket).
  if (ordered.length < bucket.length) {
    for (let i = 0; i < bucket.length; i++) {
      if (!visited.has(i)) ordered.push(bucket[i]);
    }
  }
  return ordered;
}

async function classifyTasks(state: SupervisorState) {
  const tasks = stripTestingPhaseTasks(state.tasks);
  const byRole: Record<CodingAgentRole, CodingTask[]> = {
    architect: [],
    backend: [],
    frontend: [],
    test: [],
    fullstack: [],
  };
  for (const task of tasks) {
    const role = inferRole(task);
    byRole[role].push(task);
  }
  // Reorder each role's bucket topologically so execution order matches the
  // UI's level-based render. This is a no-op when the kickoff already produced
  // a topologically-ordered list.
  for (const role of Object.keys(byRole) as CodingAgentRole[]) {
    byRole[role] = topoSortBucket(byRole[role]);
  }

  const frontendOnly = byRole.backend.length === 0;
  if (frontendOnly) {
    console.log(
      "[Supervisor] Detected frontend-only project (no backend tasks).",
    );
  }
  console.log(
    `[Supervisor] Task classification: architect=${byRole.architect.length}, backend=${byRole.backend.length}, frontend=${byRole.frontend.length}, test=${byRole.test.length} (all parallel after scaffold)`,
  );

  let projectContext = state.projectContext;
  if (frontendOnly) {
    projectContext =
      `## PROJECT TYPE: FRONTEND-ONLY\nThis is a frontend-only project. Use React + Vite + TypeScript + Tailwind CSS.\nDo NOT use Next.js, Express, Prisma, or any server-side technology.\n\n` +
      projectContext;
  }

  const originalTaskDoc = formatTaskBreakdownMarkdown(
    "Task Breakdown (Original)",
    tasks,
    byRole,
  );
  await writeTaskBreakdownMarkdown(
    state.outputDir,
    "TASK_BREAKDOWN_ORIGINAL.md",
    originalTaskDoc,
  );

  return {
    tasks,
    architectTasks: byRole.architect,
    backendTasks: byRole.backend,
    frontendTasks: byRole.frontend,
    fullstackTasks: byRole.fullstack,
    testTasks: byRole.test,
    projectContext,
  };
}

const workerGraph = createWorkerSubGraph();

function scaffoldWriteOpts(
  state: SupervisorState,
  forceOverwrite: boolean,
): FsWriteOptions | undefined {
  const paths = state.scaffoldProtectedPaths;
  if (!paths || paths.length === 0) return undefined;
  return {
    scaffoldProtectedPaths: paths,
    forceProtectedOverwrite: forceOverwrite,
  };
}

const PREBUILT_REGISTRY_MAX_FILES = 500;

const PREBUILT_SKIP_PATH_SEGMENTS = new Set([
  "node_modules",
  ".git",
  "dist",
  ".next",
]);

function shouldIncludeInPrebuiltRegistry(rel: string): boolean {
  const norm = rel.replace(/\\/g, "/");
  const parts = norm.split("/");
  for (const p of parts) {
    if (PREBUILT_SKIP_PATH_SEGMENTS.has(p)) return false;
  }
  if (norm.endsWith(".DS_Store") || norm.endsWith(".swp")) return false;
  if (/(^|\/)\.env($|\..+)/.test(norm)) return false;
  return true;
}

/**
 * Register scaffold files + write ARCHITECTURE_SCAFFOLD.md (no LLM).
 */
async function buildPrebuiltScaffoldRegistryAndDoc(
  outputDir: string,
): Promise<GeneratedFile[]> {
  const all = await listFiles(".", outputDir);
  const filtered = all.filter(shouldIncludeInPrebuiltRegistry).sort();
  const capped = filtered.slice(0, PREBUILT_REGISTRY_MAX_FILES);
  const registry: GeneratedFile[] = capped.map((p) => ({
    path: p,
    role: "architect",
    summary: "Prebuilt tier scaffold",
  }));

  let scriptsSection = "(no root package.json or scripts)";
  const pkgRaw = await fsRead("package.json", outputDir);
  if (!pkgRaw.startsWith("FILE_NOT_FOUND") && !pkgRaw.startsWith("REJECTED")) {
    try {
      const j = JSON.parse(pkgRaw) as { scripts?: Record<string, string> };
      if (j.scripts && Object.keys(j.scripts).length > 0) {
        scriptsSection = Object.entries(j.scripts)
          .map(([k, v]) => `- \`${k}\`: \`${String(v)}\``)
          .join("\n");
      }
    } catch {
      scriptsSection = "(could not parse package.json)";
    }
  }

  const listCap = 400;
  const listLines = filtered.slice(0, listCap);
  const moreLine =
    filtered.length > listCap
      ? `... and ${filtered.length - listCap} more path(s)`
      : null;

  const doc = [
    "# Architecture (prebuilt scaffold)",
    "",
    "This directory was bootstrapped from the **tier scaffold** at coding session start.",
    "See **SCAFFOLD_SPEC.md** for layout conventions, commands, and where to add code.",
    "Architect kickoff tasks were **not** run with an LLM; implement features in backend, frontend, and test phases.",
    "",
    "## Root `package.json` scripts",
    "",
    scriptsSection,
    "",
    "## Source paths (excludes node_modules, dist, .next, .git)",
    "",
    "```text",
    ...listLines,
    ...(moreLine ? [moreLine] : []),
    "```",
    "",
  ].join("\n");

  await fsWrite("ARCHITECTURE_SCAFFOLD.md", doc, outputDir);

  const docEntry: GeneratedFile = {
    path: "ARCHITECTURE_SCAFFOLD.md",
    role: "architect",
    summary: "Prebuilt scaffold index (auto-generated)",
  };

  return [...registry, docEntry];
}

/**
 * Run the architect/foundation tasks. Serial by default (single worker invoke);
 * when CODEGEN_PARALLEL_FOUNDATION is on, `workersForRole("architect")` allows
 * >1 and we fan out via `chunkTasksByFileConflict` — file-coupled or
 * dependency-ordered tasks collapse into one chunk (stay serial), only
 * file-disjoint foundation tasks (docker / models / api-contracts / e2e harness)
 * run concurrently. The Promise.all is a barrier: every chunk completes before
 * this returns, so the shared contract/schema is whole before the contract-freeze
 * + domain phases read it. Results merge as if one worker ran them all.
 */
async function invokeArchitectWorkers(
  input: Parameters<typeof workerGraph.invoke>[0],
): Promise<{
  taskResults: TaskResult[];
  generatedFiles: GeneratedFile[];
  workerCostUsd: number;
}> {
  const tasks = ((input as { tasks?: CodingTask[] }).tasks ??
    []) as CodingTask[];
  const merge = (rs: WorkerState[]) => ({
    taskResults: rs.flatMap((r) => r.taskResults ?? []),
    generatedFiles: rs.flatMap((r) => r.generatedFiles ?? []),
    workerCostUsd: rs.reduce((s, r) => s + (r.workerCostUsd ?? 0), 0),
  });

  const count = workersForRole("architect", tasks.length);
  if (count <= 1 || tasks.length <= 1) {
    const r = (await workerGraph.invoke(input, {
      recursionLimit: workerRecursionLimit(tasks.length),
    })) as WorkerState;
    return merge([r]);
  }

  const chunks = chunkTasksByFileConflict(tasks, count);
  logChunkPlan(
    `Architect/foundation phase (${ENABLE_PARALLEL_FOUNDATION ? "parallel" : "serial"})`,
    chunks,
  );
  if (chunks.length <= 1) {
    const r = (await workerGraph.invoke(input, {
      recursionLimit: workerRecursionLimit(tasks.length),
    })) as WorkerState;
    return merge([r]);
  }
  const results = (await Promise.all(
    chunks.map((chunk, i) =>
      workerGraph.invoke(
        {
          ...input,
          tasks: chunk,
          currentTaskIndex: 0,
          workerLabel: `Architect #${i + 1}`,
        },
        { recursionLimit: workerRecursionLimit(chunk.length) },
      ),
    ),
  )) as WorkerState[];
  return merge(results);
}

async function runArchitectPhase(state: SupervisorState) {
  if (state.architectTasks.length === 0) {
    console.log("[Supervisor] Architect phase: no tasks, skipping.");
    return {};
  }

  if (state.prebuiltScaffold) {
    // P0-A: prebuiltScaffold no longer implies "skip every architect task".
    // Triage each task: scaffold-only tasks can legitimately no-op, but any
    // task touching files outside the scaffold (migrations, domain models,
    // infra glue, etc.) must still run through the LLM — otherwise PRD
    // requirements routed to Data Layer / Infrastructure silently vanish.
    const triaged = triagePrebuiltArchitectTasks(
      state.architectTasks,
      state.scaffoldProtectedPaths ?? [],
    );
    const noopTasks = triaged.filter((t) => t.decision === "noop");
    const mustRunTasks = triaged.filter((t) => t.decision === "must_run_llm");

    console.log(
      `[Supervisor] Architect phase: prebuiltScaffold=true — triaged ${state.architectTasks.length} task(s): ${noopTasks.length} scaffold-only (no-op), ${mustRunTasks.length} must run LLM.`,
    );

    const emitter = getRepairEmitter(state.sessionId);
    for (const t of mustRunTasks) {
      emitter({
        stage: "architect-triage",
        event: "task_forced_to_llm",
        taskId: t.task.id,
        files: t.outsideFiles,
        details: { reason: t.reason, title: t.task.title, phase: t.task.phase },
      });
    }
    for (const t of noopTasks) {
      emitter({
        stage: "architect-triage",
        event: "task_noop_scaffold_only",
        taskId: t.task.id,
        details: { reason: t.reason, title: t.task.title, phase: t.task.phase },
      });
    }

    // Always build the scaffold doc + registry; both branches rely on it.
    const registry = await buildPrebuiltScaffoldRegistryAndDoc(state.outputDir);

    const noopResults: TaskResult[] = noopTasks.map(({ task, reason }) => ({
      taskId: task.id,
      status: "completed",
      generatedFiles: [],
      costUsd: 0,
      durationMs: 0,
      verifyPassed: true,
      fixCycles: 0,
      warnings: [
        `Completed via prebuilt tier scaffold (no LLM). ${reason} See ARCHITECTURE_SCAFFOLD.md.`,
      ],
    }));

    if (mustRunTasks.length === 0) {
      const phaseResult: PhaseResult = {
        role: "architect",
        workerLabel: "Architect",
        taskResults: noopResults,
        totalCostUsd: 0,
      };
      return {
        phaseResults: [phaseResult],
        fileRegistry: registry,
        totalCostUsd: 0,
      };
    }

    console.log(
      `[Supervisor] Architect phase: running LLM for ${mustRunTasks.length} non-scaffold task(s)...`,
    );
    const archOut = await invokeArchitectWorkers({
      role: "architect" as CodingAgentRole,
      workerLabel: "Architect",
      tasks: mustRunTasks.map((t) => t.task),
      outputDir: state.outputDir,
      projectContext: state.projectContext,
      codingMode: state.codingMode,
      fileRegistrySnapshot: registry,
      apiContractsSnapshot: state.apiContracts,
      scaffoldProtectedPaths: state.scaffoldProtectedPaths ?? [],
      currentTaskIndex: 0,
      ralphConfig: state.ralphConfig,
      sessionId: state.sessionId,
    });

    const combinedTaskResults = [...noopResults, ...archOut.taskResults];
    const phaseResult: PhaseResult = {
      role: "architect",
      workerLabel: "Architect",
      taskResults: combinedTaskResults,
      totalCostUsd: archOut.workerCostUsd,
    };
    return {
      phaseResults: [phaseResult],
      fileRegistry: [...registry, ...archOut.generatedFiles],
      totalCostUsd: archOut.workerCostUsd,
    };
  }

  console.log(
    `[Supervisor] Architect phase: starting ${state.architectTasks.length} tasks...`,
  );
  const archOut = await invokeArchitectWorkers({
    role: "architect" as CodingAgentRole,
    workerLabel: "Architect",
    tasks: state.architectTasks,
    outputDir: state.outputDir,
    projectContext: state.projectContext,
    codingMode: state.codingMode,
    fileRegistrySnapshot: state.fileRegistry,
    apiContractsSnapshot: state.apiContracts,
    scaffoldProtectedPaths: state.scaffoldProtectedPaths ?? [],
    currentTaskIndex: 0,
    ralphConfig: state.ralphConfig,
    sessionId: state.sessionId,
    prdSpec: state.prdSpec,
  });

  const phaseResult: PhaseResult = {
    role: "architect",
    workerLabel: "Architect",
    taskResults: archOut.taskResults,
    totalCostUsd: archOut.workerCostUsd,
  };

  console.log(
    `[Supervisor] Architect phase done: ${archOut.taskResults.length} task results, ${archOut.generatedFiles.length} files.`,
  );

  return {
    phaseResults: [phaseResult],
    fileRegistry: archOut.generatedFiles,
    totalCostUsd: archOut.workerCostUsd,
  };
}

// ─── Scaffold handoff (install/build deferred to integration verify) ───

const MAX_SCAFFOLD_FIX_ATTEMPTS = 2;
const VERIFY_NPM_INSTALL_TIMEOUT_MS = 180_000;

async function scaffoldVerify(state: SupervisorState) {
  if (state.prebuiltScaffold) {
    console.log(
      "[Supervisor] Scaffold verify: prebuilt scaffold — skipping tsc (template already validated).",
    );
    return { scaffoldErrors: "" };
  }

  if (state.fileRegistry.length === 0) {
    console.log("[Supervisor] Scaffold verify: no architect files to check.");
    return { scaffoldErrors: "" };
  }

  const archFiles = state.fileRegistry
    .filter((f) => f.role === "architect" && /\.(ts|tsx)$/.test(f.path))
    .map((f) => f.path)
    .slice(0, 10);

  if (archFiles.length === 0) {
    console.log("[Supervisor] Scaffold verify: no TS files from architect.");
    return { scaffoldErrors: "" };
  }

  console.log(
    `[Supervisor] Scaffold verify: tsc check on ${archFiles.length} architect file(s)...`,
  );

  const { stdout, stderr, exitCode } = await shellExec(
    `npx tsc --noEmit --pretty false --skipLibCheck 2>&1`,
    state.outputDir,
    { timeout: 60_000 },
  );

  const rawOutput = (stderr || stdout || "").trim();
  const output = rawOutput.split("\n").slice(0, 40).join("\n");
  const hasErrors =
    (exitCode !== 0 || rawOutput.includes("error TS")) &&
    output.includes("error TS");

  if (!hasErrors) {
    console.log("[Supervisor] Scaffold verify: tsc PASSED.");
    return { scaffoldErrors: "" };
  }

  console.log(
    `[Supervisor] Scaffold verify: tsc errors found.\n${output.slice(0, 300)}`,
  );
  return { scaffoldErrors: output.slice(0, 2000) };
}

function hasNpmWorkspaces(pkg: { workspaces?: unknown }): boolean {
  const w = pkg.workspaces;
  if (w == null) return false;
  if (Array.isArray(w)) return w.length > 0;
  if (typeof w === "object" && w !== null) {
    const packages = (w as { packages?: unknown }).packages;
    return Array.isArray(packages) && packages.length > 0;
  }
  return false;
}

async function findPackageJsonRelativeDirs(
  outputDir: string,
): Promise<string[]> {
  const files = await listFiles(".", outputDir);
  const dirs = new Set<string>();
  for (const f of files) {
    const norm = f.replace(/\\/g, "/");
    if (norm.split("/").includes("node_modules")) continue;
    if (!norm.endsWith("/package.json") && norm !== "package.json") continue;
    const dir =
      norm === "package.json" ? "." : norm.slice(0, -"/package.json".length);
    dirs.add(dir);
  }
  return [...dirs].sort((a, b) => a.split("/").length - b.split("/").length);
}

type PackageManager = "pnpm" | "yarn" | "npm";

async function readDeclaredPackageManager(
  relDir: string,
  outputDir: string,
): Promise<PackageManager | null> {
  const relPkg = relDir === "." ? "package.json" : `${relDir}/package.json`;
  const raw = await fsRead(relPkg, outputDir);
  if (raw.startsWith("FILE_NOT_FOUND") || raw.startsWith("REJECTED")) {
    return null;
  }
  try {
    const pkg = JSON.parse(raw) as { packageManager?: string };
    const pm = (pkg.packageManager ?? "").toLowerCase();
    if (pm.startsWith("pnpm@")) return "pnpm";
    if (pm.startsWith("yarn@")) return "yarn";
    if (pm.startsWith("npm@")) return "npm";
  } catch {
    // ignore malformed package.json
  }
  return null;
}

async function inferRepoPackageManager(
  outputDir: string,
): Promise<PackageManager | null> {
  const dirs = await findPackageJsonRelativeDirs(outputDir);
  const declared = new Set<PackageManager>();
  for (const rel of dirs) {
    const pm = await readDeclaredPackageManager(rel, outputDir);
    if (pm) declared.add(pm);
  }
  return declared.size === 1 ? [...declared][0] : null;
}

async function resolvePackageManagerForDir(
  relDir: string,
  outputDir: string,
  repoFallback: PackageManager | null,
): Promise<PackageManager> {
  const declared = await readDeclaredPackageManager(relDir, outputDir);
  if (declared) return declared;
  const cwd = relDir === "." ? outputDir : path.join(outputDir, relDir);
  const detected = await detectPackageManager(cwd);
  if (detected !== "npm") return detected;
  return repoFallback ?? detected;
}

/** Run install at repo root (workspaces) or at each package root (no workspaces). */
async function runNpmInstallAllRoots(outputDir: string): Promise<void> {
  const pm = await detectPackageManager(outputDir);
  const repoFallbackPm = await inferRepoPackageManager(outputDir);

  // pnpm workspace: always install from root only
  if (pm === "pnpm") {
    console.log(
      "[Supervisor] Integration verify: pnpm workspace — pnpm install at repo root.",
    );
    const r = await shellExec(buildInstallCommand("pnpm"), outputDir, {
      timeout: VERIFY_NPM_INSTALL_TIMEOUT_MS,
    });
    if (r.exitCode !== 0) {
      console.warn(
        `[Supervisor] Integration verify: root pnpm install exit ${r.exitCode}: ${(r.stderr || r.stdout).slice(0, 400)}`,
      );
    }
    return;
  }

  const rootPkgRaw = await fsRead("package.json", outputDir);
  if (!rootPkgRaw.startsWith("FILE_NOT_FOUND")) {
    try {
      const pkg = JSON.parse(rootPkgRaw) as { workspaces?: unknown };
      if (hasNpmWorkspaces(pkg)) {
        console.log(
          `[Supervisor] Integration verify: ${pm} workspaces — install at repo root only.`,
        );
        const r = await shellExec(buildInstallCommand(pm), outputDir, {
          timeout: VERIFY_NPM_INSTALL_TIMEOUT_MS,
        });
        if (r.exitCode !== 0) {
          console.warn(
            `[Supervisor] Integration verify: root install exit ${r.exitCode}: ${(r.stderr || r.stdout).slice(0, 400)}`,
          );
        }
        return;
      }
    } catch {
      // fall through to per-package installs
    }
  }

  const dirs = await findPackageJsonRelativeDirs(outputDir);
  if (dirs.length === 0) {
    console.log("[Supervisor] Integration verify: no package.json found.");
    return;
  }
  for (const rel of dirs) {
    const cwd = rel === "." ? outputDir : path.join(outputDir, rel);
    const relPm = await resolvePackageManagerForDir(
      rel,
      outputDir,
      repoFallbackPm,
    );
    console.log(
      `[Supervisor] Integration verify: ${relPm} install in "${rel === "." ? "." : rel}"`,
    );
    const r = await shellExec(buildInstallCommand(relPm), cwd, {
      timeout: VERIFY_NPM_INSTALL_TIMEOUT_MS,
    });
    if (r.exitCode !== 0) {
      console.warn(
        `[Supervisor] Integration verify: install in "${rel}" exit ${r.exitCode}: ${(r.stderr || r.stdout).slice(0, 400)}`,
      );
    }
  }
}

function shouldFixScaffoldOrContinue(state: SupervisorState): string {
  if (!state.scaffoldErrors) return "dispatch";
  if (state.scaffoldFixAttempts >= MAX_SCAFFOLD_FIX_ATTEMPTS) {
    console.log(
      `[Supervisor] Scaffold fix: max attempts (${MAX_SCAFFOLD_FIX_ATTEMPTS}) reached, proceeding anyway.`,
    );
    return "dispatch";
  }
  return "scaffold_fix";
}

function parseFileOutput(raw: string): Record<string, string> {
  const files: Record<string, string> = {};
  const regex = /```file:([^\n]+)\n([\s\S]*?)```/g;
  let match;
  while ((match = regex.exec(raw)) !== null) {
    const filePath = match[1].trim();
    const content = match[2];
    if (filePath && content) files[filePath] = content;
  }
  return files;
}

type PackageRootKey = "root" | "web" | "api" | "shared";

interface DependencyPlanItem {
  pkg: string;
  reason: string;
}

interface DependencyWorkspacePlan {
  relPath: string;
  suggested: DependencyPlanItem[];
  alreadyDeclared: string[];
  missing: DependencyPlanItem[];
}

async function readPackageDeps(
  relPath: string,
  outputDir: string,
): Promise<Set<string>> {
  const raw = await fsRead(relPath, outputDir);
  if (raw.startsWith("FILE_NOT_FOUND") || raw.startsWith("REJECTED")) {
    return new Set();
  }
  try {
    const j = JSON.parse(raw) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    return new Set([
      ...Object.keys(j.dependencies ?? {}),
      ...Object.keys(j.devDependencies ?? {}),
    ]);
  } catch {
    return new Set();
  }
}

function collectDependencySuggestions(
  state: SupervisorState,
): Record<PackageRootKey, DependencyPlanItem[]> {
  const text = [
    state.projectContext,
    ...state.tasks.map((t) => `${t.phase} ${t.title} ${t.description}`),
  ]
    .join("\n")
    .toLowerCase();

  const root: DependencyPlanItem[] = [];
  const web: DependencyPlanItem[] = [];
  const api: DependencyPlanItem[] = [];
  const shared: DependencyPlanItem[] = [];
  const hasSharedPackage =
    /packages\/shared|@project\/shared|workspace:\*/.test(text);

  // Baseline monorepo internal linkage when a shared package actually exists.
  if (hasSharedPackage) {
    web.push({
      pkg: "@project/shared",
      reason: "Frontend imports shared contracts/types/schemas.",
    });
    api.push({
      pkg: "@project/shared",
      reason: "Backend imports shared contracts/types/schemas.",
    });
    shared.push({
      pkg: "zod",
      reason: "Shared runtime validation schemas.",
    });
  }

  if (/query|server state|cache|invalidate/.test(text)) {
    web.push({
      pkg: "@tanstack/react-query",
      reason: "Server-state caching and request lifecycle.",
    });
  }
  if (/axios|http client|api client/.test(text)) {
    web.push({ pkg: "axios", reason: "HTTP client for API calls." });
  }
  if (/store|zustand|global state/.test(text)) {
    web.push({ pkg: "zustand", reason: "Client-side state management." });
  }
  if (/form|validation|register|login/.test(text)) {
    web.push({ pkg: "zod", reason: "Form and API payload validation." });
  }
  if (
    /chart|charts|graph|statistics|analytics|trend|recharts|line\s*chart|bar\s*chart|pie\s*chart/.test(
      text,
    )
  ) {
    web.push({
      pkg: "recharts",
      reason: "Data visualization components for statistics/analytics UI.",
    });
  }

  if (/express/.test(text)) {
    api.push({ pkg: "express", reason: "HTTP server runtime." });
  }
  if (/fastify/.test(text)) {
    api.push({ pkg: "fastify", reason: "HTTP server runtime." });
  }
  if (/auth|jwt|token|session/.test(text)) {
    api.push({ pkg: "jose", reason: "JWT/session token primitives." });
  }
  if (/security|helmet/.test(text)) {
    api.push({ pkg: "helmet", reason: "Secure HTTP headers defaults." });
  }
  if (/cors/.test(text)) {
    api.push({ pkg: "cors", reason: "Cross-origin API access control." });
  }
  if (
    /database|schema|prisma|model|sequelize|mongoose|drizzle|knex|sqlite|redis/.test(
      text,
    )
  ) {
    api.push({
      pkg: "zod",
      reason: "Runtime input validation near handlers/services.",
    });
  }
  // Prisma is intentionally NOT suggested. This generator standardises on
  // Sequelize for M-tier SQL workloads to avoid Prisma's binary footprint and
  // migration-runner complexity in generated projects. If "prisma" appears in
  // the task text (e.g. PRD copy-paste), we redirect to Sequelize instead.
  if (/prisma|sequelize/.test(text)) {
    api.push({
      pkg: "sequelize",
      reason: "SQL ORM for Node.js (Sequelize is the standard for this tier).",
    });
    api.push({
      pkg: "sequelize-cli",
      reason: "Sequelize migrations / model scaffolding CLI.",
    });
  }
  if (/sqlite|better.sqlite/.test(text)) {
    api.push({
      pkg: "better-sqlite3",
      reason: "SQLite embedded database driver.",
    });
  }
  if (/postgres|postgresql/.test(text)) {
    api.push({ pkg: "pg", reason: "PostgreSQL client for Node.js." });
  }
  if (/mongoose|mongodb/.test(text)) {
    api.push({ pkg: "mongoose", reason: "MongoDB ODM for Node.js." });
  }
  if (/drizzle/.test(text)) {
    api.push({ pkg: "drizzle-orm", reason: "TypeScript-first SQL ORM." });
  }
  if (/\bknex\b/.test(text)) {
    api.push({ pkg: "knex", reason: "SQL query builder for Node.js." });
  }
  if (/redis/.test(text)) {
    api.push({ pkg: "ioredis", reason: "Redis client for Node.js." });
  }

  if (/test|vitest|integration/.test(text)) {
    root.push({
      pkg: "vitest",
      reason: "Unit/integration test runner across workspaces.",
    });
  }
  if (/e2e|playwright/.test(text)) {
    root.push({ pkg: "playwright", reason: "End-to-end browser tests." });
  }

  const dedupe = (items: DependencyPlanItem[]): DependencyPlanItem[] => {
    const map = new Map<string, DependencyPlanItem>();
    for (const item of items) {
      if (!map.has(item.pkg)) {
        map.set(item.pkg, item);
      }
    }
    return [...map.values()];
  };

  return {
    root: dedupe(root),
    web: dedupe(web),
    api: dedupe(api),
    shared: dedupe(shared),
  };
}

async function buildDependencyBaselinePlans(
  state: SupervisorState,
): Promise<DependencyWorkspacePlan[]> {
  const suggestions = collectDependencySuggestions(state);
  const workspaceMap: Array<{ key: PackageRootKey; relPath: string }> = [
    { key: "root", relPath: "package.json" },
    { key: "web", relPath: "frontend/package.json" },
    { key: "api", relPath: "backend/package.json" },
    { key: "web", relPath: "apps/web/package.json" },
    { key: "api", relPath: "apps/api/package.json" },
    { key: "shared", relPath: "packages/shared/package.json" },
  ];

  const plans: DependencyWorkspacePlan[] = [];
  for (const ws of workspaceMap) {
    const declared = await readPackageDeps(ws.relPath, state.outputDir);
    if (declared.size === 0) continue;
    const suggested = suggestions[ws.key];
    const missing = suggested.filter((s) => !declared.has(s.pkg));
    plans.push({
      relPath: ws.relPath,
      suggested,
      alreadyDeclared: suggested
        .map((s) => s.pkg)
        .filter((pkg) => declared.has(pkg))
        .sort(),
      missing,
    });
  }
  return plans;
}

function renderDependencyPlanMarkdown(
  plans: DependencyWorkspacePlan[],
): string {
  const body = plans
    .map((p) => {
      const suggested = p.suggested.length
        ? p.suggested.map((s) => `- \`${s.pkg}\` — ${s.reason}`).join("\n")
        : "- (none)";
      const declared = p.alreadyDeclared.length
        ? p.alreadyDeclared.map((d) => `- \`${d}\``).join("\n")
        : "- (none matched yet)";
      const missing = p.missing.length
        ? p.missing.map((m) => `- \`${m.pkg}\` — ${m.reason}`).join("\n")
        : "- (none)";
      return [
        `### ${p.relPath}`,
        "",
        "**Suggested for this project**",
        suggested,
        "",
        "**Already declared (matched)**",
        declared,
        "",
        "**Missing (to be added by coding/integration if used)**",
        missing,
      ].join("\n");
    })
    .join("\n\n");

  return [
    "# Dependency baseline",
    "",
    "This plan is generated **before feature coding** to align package usage with PRD + task breakdown.",
    "Coding agents should prefer these packages and avoid introducing parallel alternatives.",
    "",
    body || "(no workspace package.json found)",
    "",
  ].join("\n");
}

async function dependencyBaseline(
  state: SupervisorState,
): Promise<Partial<SupervisorState>> {
  console.log(
    "[Supervisor] dependency_baseline: planning dependencies before coding...",
  );
  const plans = await buildDependencyBaselinePlans(state);
  const md = renderDependencyPlanMarkdown(plans);
  await fsWrite("DEPENDENCY_PLAN.md", md, state.outputDir);

  const summaryLines = plans
    .map((p) => {
      const missing = p.missing.map((m) => m.pkg).join(", ") || "(none)";
      return `- ${p.relPath}: missing ${missing}`;
    })
    .join("\n");
  const contextPatch = [
    "## Dependency baseline (pre-coding)",
    "Use these package decisions as the source of truth unless a task explicitly requires otherwise.",
    summaryLines || "- (no package roots found)",
    "Full details: DEPENDENCY_PLAN.md",
  ].join("\n");

  return {
    projectContext: state.projectContext
      ? `${state.projectContext}\n\n---\n\n${contextPatch}`
      : contextPatch,
    fileRegistry: [
      {
        path: "DEPENDENCY_PLAN.md",
        role: "architect",
        summary: "Pre-coding dependency baseline (workspace-aware)",
      },
    ],
  };
}

async function scaffoldFix(state: SupervisorState) {
  const attempt = state.scaffoldFixAttempts + 1;
  console.log(
    `[Supervisor] Scaffold fix: attempt ${attempt}/${MAX_SCAFFOLD_FIX_ATTEMPTS}...`,
  );

  const errorFiles = extractBuildErrorFiles(state.scaffoldErrors);
  const fileContents: string[] = [];
  for (const ef of errorFiles.slice(0, 5)) {
    const content = await fsRead(ef, state.outputDir);
    if (!content.startsWith("FILE_NOT_FOUND")) {
      fileContents.push(`### ${ef}\n\`\`\`\n${content.slice(0, 2000)}\n\`\`\``);
    }
  }

  const configFiles = [
    "package.json",
    "vite.config.ts",
    "tsconfig.json",
    "index.html",
    "next.config.mjs",
    "next.config.ts",
  ];
  for (const cf of configFiles) {
    if (errorFiles.includes(cf)) continue;
    const content = await fsRead(cf, state.outputDir);
    if (!content.startsWith("FILE_NOT_FOUND")) {
      fileContents.push(`### ${cf}\n\`\`\`\n${content.slice(0, 1500)}\n\`\`\``);
    }
  }

  const codeFixChain = resolveCodingChain(
    state.codingMode,
    "codeFix",
    "gpt-4o",
  );
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `You are a Senior Software Architect. Fix the build errors below so that the project package manager's install + build commands succeed.
Rules:
- NEVER use create-react-app or react-scripts.
- Use the package manager declared by package.json/lockfile (pnpm for pnpm-lock.yaml, yarn for yarn.lock, npm only for npm/package-lock projects). Do not run npm install in a pnpm project.
- For M-tier and L-tier projects (same stack): frontend is Vite + React in frontend/, backend is Koa + TypeScript in backend/. NEVER introduce Next.js or Fastify. L-tier additionally ships backend/src/workers/, backend/src/queue/inProcessQueue.ts, pino logger, requestLogger + rateLimit middlewares.
- For Vite projects: index.html must be in the project root, src/main.tsx is the entry point.
- Output ONLY corrected/new files using \`\`\`file:<relative-path>\n<contents>\n\`\`\` format.
- Output ALL files that need changes, not just the ones with errors.`,
    },
    {
      role: "user",
      content: [
        "## Build Errors",
        "```",
        state.scaffoldErrors,
        "```",
        "",
        fileContents.length > 0
          ? `## Current Files\n${fileContents.join("\n\n")}`
          : "",
        "",
        "Fix all errors so the detected package manager's install + build commands pass. Output corrected files.",
      ].join("\n"),
    },
  ];

  const response = await chatCompletionWithFallback(messages, codeFixChain, {
    temperature: 0.2,
    max_tokens: 65536,
    forceOpenRouter: forceOpenRouterForMode(state.codingMode),
  });

  const content = response.choices[0]?.message?.content ?? "";
  const costUsd = estimateCost(response.model, response.usage);
  recordSupervisorLlmUsage({
    sessionId: state.sessionId,
    stage: "scaffold_fix",
    model: response.model,
    usage: response.usage,
    costUsd,
  });
  const fixes = parseFileOutput(content);

  const fixedFiles: GeneratedFile[] = [];
  const fixOpts = scaffoldWriteOpts(state, true);
  for (const [fp, fc] of Object.entries(fixes)) {
    await fsWrite(fp, fc, state.outputDir, fixOpts);
    fixedFiles.push({
      path: fp,
      role: "architect",
      summary: `Scaffold fix attempt ${attempt}`,
    });
  }

  console.log(
    `[Supervisor] Scaffold fix: wrote ${fixedFiles.length} file(s) (model=${response.model}, cost: $${costUsd.toFixed(4)})`,
  );

  return {
    scaffoldFixAttempts: attempt,
    scaffoldErrors: "",
    fileRegistry: fixedFiles,
    totalCostUsd: costUsd,
  };
}

function extractBuildErrorFiles(errors: string): string[] {
  const fileSet = new Set<string>();
  const patterns = [
    /([^\s:(]+\.(?:tsx?|jsx?|json|mjs|cjs|html))/g,
    /Could not resolve "([^"]+)"/g,
    /Cannot find module '([^']+)'/g,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(errors)) !== null) {
      const f = match[1].replace(/^\.\//, "");
      if (!f.includes("node_modules")) fileSet.add(f);
    }
  }
  const conventionPattern = /\[CONVENTION\]\s+([^\s:]+):/g;
  let cm: RegExpExecArray | null;
  while ((cm = conventionPattern.exec(errors)) !== null) {
    const f = cm[1].replace(/^\.\//, "");
    if (f && !f.includes("node_modules")) fileSet.add(f);
  }
  return [...fileSet];
}

function appendConventionFileHints(errors: string, files: string[]): string {
  if (files.length === 0) return errors;
  const hintLines = files.map((f) => `- ${f}`).join("\n");
  return [errors, "", "CONVENTION_TARGET_FILES:", hintLines].join("\n");
}

async function collectConventionViolations(
  outputDir: string,
): Promise<{ errorsText: string; files: string[] }> {
  const files = await listFiles(".", outputDir);
  const sourceFiles = files.filter(
    (f) =>
      /\.(ts|tsx|js|jsx)$/.test(f) &&
      !f.includes("node_modules") &&
      !f.startsWith("dist/") &&
      !f.startsWith(".next/"),
  );

  const violations: string[] = [];
  const touchedFiles = new Set<string>();
  const scaffoldSpec = await fsRead("SCAFFOLD_SPEC.md", outputDir);
  const isMTier = /scaffold specification \(tier m\)/i.test(scaffoldSpec);
  const hasSplitMTierFrontend = !(
    await fsRead("frontend/package.json", outputDir)
  ).startsWith("FILE_NOT_FOUND");

  for (const rel of sourceFiles) {
    const content = await fsRead(rel, outputDir);
    if (
      content.startsWith("FILE_NOT_FOUND") ||
      content.startsWith("REJECTED")
    ) {
      continue;
    }

    if (/(?:from\s+["']@shared\/|import\s+["']@shared\/)/.test(content)) {
      violations.push(
        `[CONVENTION] ${rel}: Use "@project/shared/..." imports; "@shared/..." is forbidden unless explicitly configured.`,
      );
      touchedFiles.add(rel);
    }

    // ── Vite alias enforcement ────────────────────────────────────────────────
    // Flag cross-directory relative imports in Vite frontend source files.
    // The scaffold configures `@` → `./src` in both vite.config.ts and tsconfig,
    // so `from '../...'` should always be written as `from '@/...'`.
    const isViteFrontendSource =
      /\.(ts|tsx)$/.test(rel) &&
      (rel.startsWith("src/") ||
        rel.startsWith("frontend/src/") ||
        rel.startsWith("apps/web/src/") ||
        rel.startsWith("web/src/")) &&
      !rel.includes("/test/") &&
      !rel.includes(".test.") &&
      !rel.includes(".spec.");

    if (isViteFrontendSource) {
      // Match any `from '../` (one or more levels up) — these should use @/ alias.
      const relativeUpImport = /from\s+["'](\.\.[/\\][^"']+)["']/g;
      let rm: RegExpExecArray | null;
      while ((rm = relativeUpImport.exec(content)) !== null) {
        const importedPath = rm[1];
        // Convert ../foo/bar → @/foo/bar suggestion (best-effort)
        const normalized = importedPath
          .replace(/^(\.\.[/\\])+/, "")
          .replace(/\\/g, "/");
        violations.push(
          `[CONVENTION] ${rel}: Replace relative import \`${importedPath}\` with Vite alias \`@/${normalized}\`. ` +
            `The project configures \`@\` → \`./src\` in vite.config.ts and tsconfig paths.`,
        );
        touchedFiles.add(rel);
      }
    }

    const isWebUiSource =
      (rel.startsWith("frontend/src/") || rel.startsWith("apps/web/src/")) &&
      /\.(tsx|jsx)$/.test(rel);
    if (isWebUiSource) {
      if (/<a\b[^>]*href=["'](?:#|)["'][^>]*>/g.test(content)) {
        violations.push(
          `[CONVENTION] ${rel}: Avoid dead links. Replace href "#" / "" with React Router navigation (Link/useNavigate) or a real route.`,
        );
        touchedFiles.add(rel);
      }
      if (
        /<button\b(?![^>]*\bonClick=)(?![^>]*\btype=["']submit["'])[^>]*>/g.test(
          content,
        )
      ) {
        violations.push(
          `[CONVENTION] ${rel}: Button elements must have onClick or be explicit submit buttons inside forms.`,
        );
        touchedFiles.add(rel);
      }
      if (/<form\b(?![^>]*\bonSubmit=)[^>]*>/g.test(content)) {
        violations.push(
          `[CONVENTION] ${rel}: Forms must provide onSubmit handlers.`,
        );
        touchedFiles.add(rel);
      }
    }

    if (rel.startsWith("packages/shared/schemas/")) {
      const schemaTypePattern = /export\s+type\s+([A-Z]\w*Schema)\b/g;
      let tm: RegExpExecArray | null;
      while ((tm = schemaTypePattern.exec(content)) !== null) {
        violations.push(
          `[CONVENTION] ${rel}: Replace type "${tm[1]}" with "*Input" (or "*Dto") to avoid schema/type naming collisions.`,
        );
        touchedFiles.add(rel);
      }
    }

    const importSchemaValuePattern =
      /import\s+\{[^}]*\b([A-Z]\w*Schema)\b[^}]*\}\s+from\s+["']@project\/shared\/schemas\//g;
    let im: RegExpExecArray | null;
    while ((im = importSchemaValuePattern.exec(content)) !== null) {
      const importBlockStart = Math.max(0, im.index - 40);
      const importSnippet = content.slice(importBlockStart, im.index + 140);
      if (!/import\s+type\s+\{/.test(importSnippet)) {
        violations.push(
          `[CONVENTION] ${rel}: "${im[1]}" looks like a type. Import runtime schema values as camelCase (e.g. registerSchema) and use "import type" for types.`,
        );
        touchedFiles.add(rel);
      }
    }

    if (isMTier && hasSplitMTierFrontend) {
      const isForbiddenAppDirFile =
        rel.startsWith("frontend/app/") || rel.startsWith("frontend/src/app/");
      if (isForbiddenAppDirFile) {
        violations.push(
          `[CONVENTION] ${rel}: Split M-tier keeps frontend routes in "frontend/src/router.tsx" and page-level screens under "frontend/src/views" (or nearby React source), not under "frontend/app" or "frontend/src/app".`,
        );
        touchedFiles.add(rel);
      }
      const isForbiddenPagesDir = rel.startsWith("frontend/src/pages/");
      if (isForbiddenPagesDir) {
        violations.push(
          `[CONVENTION] ${rel}: M-tier uses "frontend/src/views" for page-level screens, NOT "frontend/src/pages" (that is a Next.js convention). Move this file to "frontend/src/views/${rel.split("/").pop() ?? rel}".`,
        );
        touchedFiles.add(rel);
      }
    }
  }

  if (isMTier && hasSplitMTierFrontend) {
    const routerPath = "frontend/src/router.tsx";
    const routerContent = await fsRead(routerPath, outputDir);
    const routerExists =
      !routerContent.startsWith("FILE_NOT_FOUND") &&
      !routerContent.startsWith("REJECTED");

    if (!routerExists) {
      violations.push(
        `[CONVENTION] ${routerPath}: Split M-tier frontend must keep a dedicated React Router registry in frontend/src/router.tsx.`,
      );
      touchedFiles.add(routerPath);
    } else {
      const hasRouterRegistry =
        /\bBrowserRouter\b/.test(routerContent) ||
        /\bRoutes\b/.test(routerContent) ||
        /\bRouterProvider\b/.test(routerContent);
      if (!hasRouterRegistry) {
        violations.push(
          `[CONVENTION] ${routerPath}: Route registry must define React Router wiring (BrowserRouter, Routes/Route, or RouterProvider).`,
        );
        touchedFiles.add(routerPath);
      }
    }

    const viewFiles = sourceFiles.filter(
      (f) => f.startsWith("frontend/src/views/") && /\.tsx?$/.test(f),
    );
    if (viewFiles.length > 0 && routerExists) {
      const hasViewImport = /from\s+["'](?:\.\/views\/|\.{2}\/views\/)/.test(
        routerContent,
      );
      if (!hasViewImport) {
        violations.push(
          `[CONVENTION] ${routerPath}: Views exist under frontend/src/views but the route registry does not import them. Register those screens explicitly.`,
        );
        touchedFiles.add(routerPath);
      }

      // Detect placeholder antd <Result> used in lieu of real view components.
      // Each view file that exists under views/ must be rendered directly in the route, not wrapped by a Result placeholder.
      const resultPlaceholderInRouter = /<Result\b[^>]*status\s*=/.test(
        routerContent,
      );
      if (resultPlaceholderInRouter) {
        violations.push(
          `[CONVENTION] ${routerPath}: Route registry uses antd <Result> as placeholder for real routes. ` +
            `Import and render the actual view component for every route — placeholder <Result> elements are forbidden in production routing.`,
        );
        touchedFiles.add(routerPath);
      }

      // Also check App.tsx when it doubles as the route registry.
      const appPath = "frontend/src/App.tsx";
      const appContent = await fsRead(appPath, outputDir);
      if (
        !appContent.startsWith("FILE_NOT_FOUND") &&
        !appContent.startsWith("REJECTED")
      ) {
        const resultPlaceholderInApp = /<Result\b[^>]*status\s*=/.test(
          appContent,
        );
        if (resultPlaceholderInApp && viewFiles.length > 0) {
          violations.push(
            `[CONVENTION] ${appPath}: Route registry uses antd <Result> as placeholder for real routes. ` +
              `Import and render the actual view components from frontend/src/views/ for every route.`,
          );
          touchedFiles.add(appPath);
        }
      }
    }

    const homeEntryCandidates = [
      "frontend/src/router.tsx",
      "frontend/src/App.tsx",
      "frontend/src/views/Home.tsx",
      "frontend/src/views/LandingPage.tsx",
    ];
    let hasHomeNavigationEntry = false;
    for (const candidate of homeEntryCandidates) {
      const content = await fsRead(candidate, outputDir);
      if (
        content.startsWith("FILE_NOT_FOUND") ||
        content.startsWith("REJECTED")
      ) {
        continue;
      }
      if (/\b(Link|NavLink|useNavigate)\b/.test(content)) {
        hasHomeNavigationEntry = true;
        break;
      }
    }
    if (!hasHomeNavigationEntry) {
      violations.push(
        `[CONVENTION] ${routerPath}: Home/landing entry must provide visible route entry points (Link/NavLink or button using useNavigate) so users can navigate to primary pages.`,
      );
      touchedFiles.add(routerPath);
    }
  } else if (isMTier) {
    const appEntryPath = "apps/web/src/App.tsx";
    const appEntryContent = await fsRead(appEntryPath, outputDir);
    const appExists =
      !appEntryContent.startsWith("FILE_NOT_FOUND") &&
      !appEntryContent.startsWith("REJECTED");

    if (!appExists) {
      violations.push(
        `[CONVENTION] ${appEntryPath}: M-tier frontend must keep App.tsx as the web entry and route registry owner (directly or by importing src/routes.tsx).`,
      );
      touchedFiles.add(appEntryPath);
    } else {
      const hasRouterRegistry =
        /\bRoutes\b/.test(appEntryContent) ||
        /\bRouterProvider\b/.test(appEntryContent) ||
        /from\s+["']\.\/routes["']/.test(appEntryContent) ||
        /from\s+["']@\/routes["']/.test(appEntryContent);
      if (!hasRouterRegistry) {
        violations.push(
          `[CONVENTION] ${appEntryPath}: App entry must register React Router routes (Routes/Route) or import a dedicated src/routes.tsx registry.`,
        );
        touchedFiles.add(appEntryPath);
      }
    }
  }

  // Check backend db.ts for unsafe unconditional CREATE EXTENSION timescaledb.
  // TimescaleDB is not available on standard Postgres installs; the call must be
  // guarded by an env var or wrapped in a try/catch with a soft fallback.
  if (isMTier) {
    const dbCandidates = [
      "backend/src/db.ts",
      "backend/src/config/database.ts",
      "backend/src/database/connection.ts",
    ];
    for (const dbPath of dbCandidates) {
      const dbContent = await fsRead(dbPath, outputDir);
      if (
        dbContent.startsWith("FILE_NOT_FOUND") ||
        dbContent.startsWith("REJECTED")
      ) {
        continue;
      }
      const hasHardTimescale =
        /CREATE\s+EXTENSION\s+(?:IF\s+NOT\s+EXISTS\s+)?timescaledb/i.test(
          dbContent,
        ) && !/TIMESCALE_DISABLED|process\.env\.TIMESCALE/i.test(dbContent);
      if (hasHardTimescale) {
        violations.push(
          `[CONVENTION] ${dbPath}: Unconditional "CREATE EXTENSION timescaledb" will crash on standard PostgreSQL installs. ` +
            `Wrap the call in a try/catch with a console.warn fallback, or guard it with an env flag (e.g. TIMESCALE_DISABLED). ` +
            `Do NOT throw on extension unavailability — the server must start without TimescaleDB.`,
        );
        touchedFiles.add(dbPath);
      }
      break;
    }
  }

  return {
    errorsText: violations.join("\n"),
    files: [...touchedFiles],
  };
}

/**
 * When `true` (the default) a failed e2e run is re-executed once before any
 * LLM fix attempt. The two runs are compared to classify every failing
 * test as deterministic / flaky / infra, and only deterministic failures
 * are sent to auto-repair. Set env `E2E_TRIAGE_ENABLED=0` to revert to the
 * legacy "feed everything to the LLM" behaviour.
 */
const E2E_TRIAGE_ENABLED = (() => {
  const raw = (process.env.E2E_TRIAGE_ENABLED ?? "1").trim().toLowerCase();
  return raw !== "0" && raw !== "false" && raw !== "off";
})();

function parseFileBlocksFromContent(
  raw: string,
): { filePath: string; fileContent: string }[] {
  const files: { filePath: string; fileContent: string }[] = [];
  const regex = /```file:([^\n]+)\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(raw)) !== null) {
    const filePath = match[1]?.trim();
    const fileContent = match[2] ?? "";
    if (filePath && fileContent) {
      files.push({ filePath, fileContent });
    }
  }
  return files;
}

function summarizeE2eTaskContext(tasks: CodingTask[]): string {
  if (tasks.length === 0) return "No explicit test tasks were generated.";
  return tasks
    .slice(0, 20)
    .map((t) => `- [${t.id}] ${t.title}: ${t.description}`)
    .join("\n");
}

/**
 * The canonical `webServer` block for M-tier projects — must start BOTH the
 * backend (on :4000, health-probed at /api/health) and the frontend (on :5173).
 * The Vite dev server proxies `/api/*` to the backend, so the backend MUST be
 * running before any API-driven Playwright test executes.
 * Only used when backend/package.json exists (M-tier layout).
 */
const PLAYWRIGHT_CONFIG_CANONICAL = `import { defineConfig, devices } from "@playwright/test";

// Auto-repaired by supervisor: the previous \`webServer\` field collapsed to a
// single object (frontend-only), which left the backend offline and caused
// every API-driven e2e test to fail with ECONNREFUSED through the Vite proxy.
//
// DO NOT collapse the array back to a single object. The supervisor will
// rewrite it again on the next run. If you need extra services, append to
// the array; do not remove the backend entry.
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "line",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "cd ../backend && pnpm dev",
      url: "http://localhost:4000/api/v1/health",
      reuseExistingServer: true,
      timeout: 120_000,
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      command: "pnpm dev",
      url: "http://localhost:5173",
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
`;

/**
 * Audit (and auto-repair) the frontend `playwright.config.ts` so its
 * `webServer` field always starts BOTH the backend and the frontend in
 * M-tier projects (those that have a `backend/` directory). The single most
 * common cause of last-mile e2e `infra` failures is a worker collapsing the
 * `webServer` array back to a single object, which leaves the backend offline
 * and every API-touching test fails with ECONNREFUSED through the Vite proxy.
 * For S-tier projects (no backend/package.json), this is a no-op.
 */
async function ensurePlaywrightConfigStartsBackend(
  outputDir: string,
): Promise<
  | { action: "no-config" }
  | { action: "frontend-only-project" }
  | { action: "ok" }
  | { action: "rewritten"; reason: string }
  | { action: "failed"; reason: string }
> {
  const cfgRel = "frontend/playwright.config.ts";
  const cfgRaw = await fsRead(cfgRel, outputDir);
  if (cfgRaw.startsWith("FILE_NOT_FOUND") || cfgRaw.startsWith("REJECTED")) {
    return { action: "no-config" };
  }

  // Only enforce on m-tier (frontend + backend) projects. A frontend-only
  // project legitimately has a single `webServer` entry.
  const backendPkgRaw = await fsRead("backend/package.json", outputDir);
  if (
    backendPkgRaw.startsWith("FILE_NOT_FOUND") ||
    backendPkgRaw.startsWith("REJECTED")
  ) {
    return { action: "frontend-only-project" };
  }

  // Detect a backend-launching webServer entry. Accepts any of:
  //   - localhost:4000 (health probe URL)
  //   - "cd ../backend ..." (canonical command)
  //   - "pnpm -C ../backend ..." / "pnpm --dir ../backend ..." (alternates)
  //   - "../backend && pnpm dev" (other shells)
  // Must appear inside the `webServer` array.
  const webServerMatch = cfgRaw.match(/webServer\s*:\s*\[[\s\S]*?\]/);
  const startsBackend =
    !!webServerMatch &&
    /(localhost:4000|cd\s+\.\.\/backend|pnpm\s+(?:-C|--dir)\s+\.\.\/backend|\.\.\/backend\s*&&\s*pnpm)/.test(
      webServerMatch[0],
    );
  if (startsBackend) return { action: "ok" };

  // Need to rewrite. Force-overwrite via raw fs.writeFile so the protected
  // path / scaffold-merge logic does not interfere.
  const cfgAbs = path.resolve(path.join(outputDir, cfgRel));
  try {
    await fs.mkdir(path.dirname(cfgAbs), { recursive: true });
    await fs.writeFile(cfgAbs, PLAYWRIGHT_CONFIG_CANONICAL, "utf-8");
  } catch (err) {
    return {
      action: "failed",
      reason: err instanceof Error ? err.message : String(err),
    };
  }
  return {
    action: "rewritten",
    reason: webServerMatch
      ? "webServer field did not start the backend on :4000"
      : "no webServer field found",
  };
}

/**
 * Verify the backend has a registered `/api/health` route. The Playwright
 * `webServer` health probe relies on it; if the worker deleted the health
 * module or forgot to re-register it, the probe will hang for 120s and the
 * whole e2e gate becomes unrecoverable.
 *
 * Returns `null` if the route looks registered, or a string describing the
 * problem (which the supervisor will surface as an audit warning).
 */
async function auditBackendHealthRoute(
  outputDir: string,
): Promise<string | null> {
  const backendPkgRaw = await fsRead("backend/package.json", outputDir);
  if (
    backendPkgRaw.startsWith("FILE_NOT_FOUND") ||
    backendPkgRaw.startsWith("REJECTED")
  ) {
    return null;
  }
  const apiIndex = await fsRead("backend/src/api/modules/index.ts", outputDir);
  if (
    apiIndex.startsWith("FILE_NOT_FOUND") ||
    apiIndex.startsWith("REJECTED")
  ) {
    return "backend/src/api/modules/index.ts is missing — the e2e webServer health probe at /api/v1/health will fail.";
  }
  if (!/registerHealthRoutes\s*\(/.test(apiIndex)) {
    return "backend/src/api/modules/index.ts no longer calls registerHealthRoutes(...) — the /api/health probe used by the Playwright webServer will fail.";
  }
  const healthRoutes = await fsRead(
    "backend/src/api/modules/health/health.routes.ts",
    outputDir,
  );
  if (
    healthRoutes.startsWith("FILE_NOT_FOUND") ||
    healthRoutes.startsWith("REJECTED")
  ) {
    return "backend/src/api/modules/health/health.routes.ts is missing — the /api/health probe used by the Playwright webServer will fail.";
  }
  if (!/router\.get\(\s*['"`]\/health['"`]/.test(healthRoutes)) {
    return "backend/src/api/modules/health/health.routes.ts no longer exposes GET /health — the /api/health probe used by the Playwright webServer will fail.";
  }
  return null;
}

async function detectE2eCommand(
  outputDir: string,
): Promise<{ command: string; cwd: string; label: string } | null> {
  const frontendPkgRaw = await fsRead("frontend/package.json", outputDir);
  if (
    frontendPkgRaw.startsWith("FILE_NOT_FOUND") ||
    frontendPkgRaw.startsWith("REJECTED")
  ) {
    return null;
  }
  let scripts: Record<string, string> = {};
  try {
    scripts =
      (JSON.parse(frontendPkgRaw) as { scripts?: Record<string, string> })
        .scripts ?? {};
  } catch {
    scripts = {};
  }

  const frontendDir = path.join(outputDir, "frontend");
  const pm = await detectPackageManager(frontendDir);
  // Playwright browser binaries are NOT guaranteed present in the run env, and
  // a missing browser fails EVERY test at launch with
  // "browserType.launch: Executable doesn't exist" — an environment gap the
  // e2e auto-fix can't repair, so the session stalls at e2e forever. Always
  // install first. `playwright install` (no browser arg) is idempotent and
  // covers ALL browsers the config's `projects` may use (chromium/firefox/
  // webkit) — the scaffold's own `e2e` script only installs chromium, so a
  // config that also runs firefox still fails without this.
  const installBrowsers = "npx playwright install";
  if (scripts.e2e) {
    const runE2e =
      pm === "pnpm"
        ? "pnpm run e2e"
        : pm === "yarn"
          ? "yarn run e2e"
          : "npm run e2e";
    return {
      command: `${installBrowsers} && ${runE2e} 2>&1`,
      cwd: frontendDir,
      label: "frontend:e2e-script",
    };
  }

  const hasPlaywrightConfig = !(
    await fsRead("frontend/playwright.config.ts", outputDir)
  ).startsWith("FILE_NOT_FOUND");
  if (hasPlaywrightConfig) {
    return {
      command: `${installBrowsers} && npx playwright test 2>&1`,
      cwd: frontendDir,
      label: "frontend:playwright",
    };
  }
  return null;
}

/**
 * Extract Playwright's "N skipped" summary from raw test output, plus any
 * skip-reason lines like `Skipped: foo` or `test.skip annotation: ...`.
 * Returns a human-readable one-liner, or null if nothing was skipped.
 *
 * Used to amplify deliberate `test.skip(!process.env.X, ...)` guards so the
 * user sees which features were de-scoped from validation due to missing
 * env keys — instead of those skips being lost in the noise.
 */
function summarizeSkippedTests(output: string): string | null {
  const m = output.match(/(\d+)\s+skipped/);
  if (!m || Number(m[1]) === 0) return null;
  const count = Number(m[1]);
  // Pull up to 5 distinct skip reasons (anything matching the playwright
  // skip annotation lines). Skipped tests typically print their reason
  // alongside; the patterns vary by reporter so we keep this permissive.
  const reasonSet = new Set<string>();
  const reasonRe =
    /(?:^|\n)\s*(?:[-•]\s*)?(?:skipped:\s*|test\.skip[^:]*:\s*|reason:\s*)([^\n]{4,120})/gi;
  let rm: RegExpExecArray | null;
  while ((rm = reasonRe.exec(output)) !== null && reasonSet.size < 5) {
    reasonSet.add(rm[1]!.trim());
  }
  const reasons = [...reasonSet];
  if (reasons.length === 0) {
    return `${count} test(s) skipped (likely due to missing env keys — check playwright output above).`;
  }
  return `${count} test(s) skipped due to missing env keys: ${reasons.slice(0, 3).join("; ")}${reasons.length > 3 ? ` (+${reasons.length - 3} more)` : ""}`;
}

async function e2eVerifyAndFix(
  state: SupervisorState,
): Promise<Partial<SupervisorState>> {
  const attempt = state.e2eVerifyAttempts + 1;
  console.log(
    `[Supervisor] e2eVerify: attempt ${attempt}/${MAX_E2E_VERIFY_FIX_ATTEMPTS + 1}...`,
  );

  // Audit + auto-repair the Playwright `webServer` config BEFORE running.
  // The previous round's flagship failure mode was a frontend-only
  // `webServer` (missing the backend), causing every API-driven test to
  // fail with ECONNREFUSED and the run to be classified as `infra`.
  try {
    const cfgAudit = await ensurePlaywrightConfigStartsBackend(state.outputDir);
    if (cfgAudit.action === "rewritten") {
      console.warn(
        `[Supervisor] e2eVerify: rewrote frontend/playwright.config.ts — ${cfgAudit.reason}.`,
      );
    } else if (cfgAudit.action === "failed") {
      console.error(
        `[Supervisor] e2eVerify: failed to repair playwright.config.ts — ${cfgAudit.reason}`,
      );
    } else if (cfgAudit.action === "ok") {
      console.log(
        "[Supervisor] e2eVerify: playwright.config.ts already starts backend + frontend.",
      );
    }
    const healthAudit = await auditBackendHealthRoute(state.outputDir);
    if (healthAudit) {
      console.warn(`[Supervisor] e2eVerify: ${healthAudit}`);
    }
  } catch (err) {
    console.warn(
      `[Supervisor] e2eVerify: pre-run config audit threw: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const e2eSpecDoc = await fsRead("PRD_E2E_SPEC.md", state.outputDir);
  const e2eCoverageDoc = await fsRead("E2E_COVERAGE.md", state.outputDir);
  const hasE2eSpecDoc =
    !e2eSpecDoc.startsWith("FILE_NOT_FOUND") &&
    !e2eSpecDoc.startsWith("REJECTED");
  const hasE2eCoverageDoc =
    !e2eCoverageDoc.startsWith("FILE_NOT_FOUND") &&
    !e2eCoverageDoc.startsWith("REJECTED");

  const plan = await detectE2eCommand(state.outputDir);
  if (!plan) {
    return {
      e2eVerifyAttempts: attempt,
      e2eVerifyErrors: hasE2eSpecDoc
        ? "No executable E2E command found. PRD_E2E_SPEC.md exists, but the project is still missing a runnable frontend e2e script or Playwright config."
        : "No executable E2E command found. Expected frontend package script `e2e` or playwright config.",
    };
  }

  // On the very first attempt: if only the scaffold smoke test exists and
  // PRD_E2E_SPEC.md is present, generate PRD-based test scripts before running.
  if (attempt === 1 && hasE2eSpecDoc) {
    const existingTestFiles = (
      await listFiles("frontend", state.outputDir)
    ).filter((f) => /\.(spec|test)\.(ts|tsx|js|jsx)$/.test(f));
    const onlySmoke =
      existingTestFiles.length === 0 ||
      existingTestFiles.every((f) => /smoke\.spec\.(ts|tsx|js|jsx)$/.test(f));

    if (onlySmoke) {
      console.log(
        "[Supervisor] e2eVerify: no PRD-based test scripts found — generating from PRD_E2E_SPEC.md...",
      );
      // Surface declared-but-unfilled env keys to the generator so it can
      // wrap dependent tests in `test.skip(!process.env.X, ...)` instead of
      // letting them fail at runtime and chew through the fix-loop budget.
      // Tests for features whose creds aren't configured will then show up
      // as visible "skipped" warnings in the playwright report.
      let unfilledKeysBlock = "";
      try {
        const declaredResources = await readResourceRequirements(process.cwd());
        unfilledKeysBlock = formatUnfilledKeysForE2EPrompt(declaredResources);
        if (unfilledKeysBlock) {
          console.log(
            `[Supervisor] e2eVerify: injecting ${declaredResources.filter((r) => r.required && !(r.value ?? "").trim()).length} unfilled-key skip-guard hint(s) into generator prompt`,
          );
        }
      } catch (resErr) {
        console.warn(
          `[Supervisor] e2eVerify: failed to read resource requirements (continuing without skip-guards): ${resErr instanceof Error ? resErr.message : String(resErr)}`,
        );
      }
      try {
        const genModelChain = resolveCodingChain(
          state.codingMode,
          "e2eGen",
          "gpt-4o",
        );
        const E2E_GEN_SYSTEM = [
          "You are an expert Playwright E2E test author.",
          "Generate complete Playwright TypeScript test files for the scenarios you are given.",
          "",
          "## Structure requirements",
          "- Use `test.describe` blocks; each `test()` maps 1-to-1 with one scenario's step sequence.",
          "- Use `page.goto()`, `page.locator()`, `page.fill()`, `page.click()`, `expect()` from @playwright/test.",
          "- Do NOT import anything outside @playwright/test.",
          "- Output ONLY the file blocks using ```file:frontend/e2e/<name>.spec.ts``` syntax.",
          "- The base URL is http://localhost:5173 (already configured in playwright.config.ts).",
          "- Do not re-generate smoke.spec.ts.",
          "",
          "## Skip tests for features with missing env keys",
          "- If the user message contains a `## Env keys NOT configured` block,",
          "  every test whose flow depends on one of those keys MUST start with",
          "  `test.skip(!process.env.<KEY>, '<feature> requires <KEY>');`.",
          "- This keeps the suite green when external creds (SMTP, vendor APIs) are",
          "  absent and surfaces the gap as a Playwright 'skipped' line rather than",
          "  a hard failure the fix-loop has to keep chewing.",
          "",
          "## Playwright locator best practices (CRITICAL — violations cause strict mode errors)",
          "- NEVER use `page.getByRole('heading')` or any role-based locator without a unique qualifier.",
          "  Always add `{ level: N }` or `{ name: 'exact text' }` so only ONE element matches.",
          "  Example: `page.getByRole('heading', { level: 1 })` or `page.getByRole('heading', { name: 'Welcome' })`.",
          "- NEVER use `page.getByRole('button')` alone — always add `{ name: '...' }`.",
          "- NEVER use `page.getByText('...')` without `.first()` when the text may appear more than once.",
          "- NEVER use `page.locator('text=...')` in `expect(...).toBeVisible()` without `.first()` unless the selector is guaranteed unique.",
          "- Prefer `page.getByRole(...)` with unique qualifiers > `page.getByTestId(...)` > `page.locator('text=...')` > CSS selectors.",
          "- When using `page.locator(css)` that could match multiple elements, always append `.first()` or `.nth(N)` before assertions.",
          "- Text in selectors must match the EXACT case rendered in the DOM.",
          "  If the UI shows 'SIGN UP' (uppercase), use `page.getByRole('link', { name: 'SIGN UP' })` — not 'Sign Up'.",
          "- Avoid deprecated `page.click('text=...')` — use `page.locator('text=...').click()` or `page.getByRole(...).click()`.",
          "- For form inputs always prefer `page.getByLabel('...')` or `page.getByPlaceholder('...')`.",
        ].join("\n");

        const writeBlocks = async (content: string): Promise<string[]> => {
          const blocks = parseFileBlocksFromContent(content);
          for (const file of blocks) {
            await fsWrite(file.filePath, file.fileContent, state.outputDir, {
              scaffoldProtectedPaths: state.scaffoldProtectedPaths ?? [],
            });
          }
          return blocks.map((b) => b.filePath);
        };

        // Prefer PER-FLOW generation from the STRUCTURED spec (PRD_E2E_SPEC.json):
        // group scenarios by route and emit ONE focused spec file per group, so
        // coverage scales with the app instead of being capped by a single
        // 16k-token response (the old one-shot under-covered large apps).
        const specJsonRaw = await fsRead("PRD_E2E_SPEC.json", state.outputDir);
        const structuredSpec =
          !specJsonRaw.startsWith("FILE_NOT_FOUND") &&
          !specJsonRaw.startsWith("REJECTED")
            ? parsePrdE2eSpec(specJsonRaw)
            : null;

        if (structuredSpec && structuredSpec.scenarios.length > 0) {
          const groups = planE2eTestFiles(structuredSpec);
          console.log(
            `[Supervisor] e2eVerify: per-flow generation — ${structuredSpec.scenarios.length} scenario(s) → ${groups.length} spec file(s).`,
          );
          const written: string[] = [];
          for (const group of groups) {
            const scenarioBlock = group.scenarios
              .map((s) => formatScenarioForGeneration(s))
              .join("\n\n");
            const groupMessages: ChatMessage[] = [
              { role: "system", content: E2E_GEN_SYSTEM },
              {
                role: "user",
                content: [
                  `Project output dir: ${state.outputDir}`,
                  `Generate EXACTLY ONE spec file at \`${group.fileName}\` covering ONLY the scenarios below — one \`test()\` per scenario, inside a single \`test.describe('${group.label}', …)\`.`,
                  "",
                  "## Scenarios to cover",
                  scenarioBlock,
                  "",
                  unfilledKeysBlock,
                  state.projectContext
                    ? `## Project context\n${state.projectContext.slice(0, 4000)}`
                    : "",
                ]
                  .filter(Boolean)
                  .join("\n"),
              },
            ];
            try {
              const groupResp = await chatCompletionWithFallback(
                groupMessages,
                genModelChain,
                {
                  temperature: 0.1,
                  max_tokens: 8000,
                  forceOpenRouter: forceOpenRouterForMode(state.codingMode),
                },
              );
              recordSupervisorLlmUsage({
                sessionId: state.sessionId,
                stage: "e2e_generate_tests",
                model: groupResp.model,
                usage: groupResp.usage,
                costUsd: estimateCost(groupResp.model, groupResp.usage),
              });
              const paths = await writeBlocks(
                groupResp.choices[0]?.message?.content ?? "",
              );
              written.push(...paths);
              console.log(
                `[Supervisor] e2eVerify: ${group.fileName} ← ${group.scenarios.length} scenario(s), wrote ${paths.length} file block(s).`,
              );
            } catch (groupErr) {
              console.warn(
                `[Supervisor] e2eVerify: generation for ${group.fileName} failed: ${groupErr instanceof Error ? groupErr.message : String(groupErr)}`,
              );
            }
          }
          console.log(
            `[Supervisor] e2eVerify: per-flow generation wrote ${written.length} spec file(s) across ${groups.length} flow group(s).`,
          );
        } else {
          // Fallback: no structured spec on disk — one-shot from the markdown.
          const genMessages: ChatMessage[] = [
            { role: "system", content: E2E_GEN_SYSTEM },
            {
              role: "user",
              content: [
                `Project output dir: ${state.outputDir}`,
                "Generate one spec file per PRD section/route group (e.g. frontend/e2e/auth.spec.ts).",
                "",
                "## PRD E2E Specification",
                // Inject the full E2E spec — truncating it dropped later
                // scenarios from the one-shot fallback path.
                e2eSpecDoc,
                "",
                unfilledKeysBlock,
                state.projectContext
                  ? `## Project context\n${state.projectContext.slice(0, 4000)}`
                  : "",
              ]
                .filter(Boolean)
                .join("\n"),
            },
          ];
          const genResponse = await chatCompletionWithFallback(
            genMessages,
            genModelChain,
            {
              temperature: 0.1,
              max_tokens: 32000,
              forceOpenRouter: forceOpenRouterForMode(state.codingMode),
            },
          );
          recordSupervisorLlmUsage({
            sessionId: state.sessionId,
            stage: "e2e_generate_tests",
            model: genResponse.model,
            usage: genResponse.usage,
            costUsd: estimateCost(genResponse.model, genResponse.usage),
          });
          const paths = await writeBlocks(
            genResponse.choices[0]?.message?.content ?? "",
          );
          if (paths.length > 0) {
            console.log(
              `[Supervisor] e2eVerify: generated ${paths.length} PRD-based test file(s) (one-shot fallback): ${paths.join(", ")}`,
            );
          } else {
            console.warn(
              "[Supervisor] e2eVerify: LLM returned no test file blocks during generation.",
            );
          }
        }
      } catch (genErr) {
        console.warn(
          `[Supervisor] e2eVerify: test generation failed: ${genErr instanceof Error ? genErr.message : String(genErr)}`,
        );
      }
    }
  }

  const runResult = await shellExec(plan.command, plan.cwd, {
    timeout: 180_000,
  });
  const output = `${runResult.stdout}${runResult.stderr}`.trim();
  if (runResult.exitCode === 0) {
    // Surface "X skipped" tests prominently so the user sees gaps from
    // missing env keys (e.g. SMTP_HOST) that we deliberately skipped via
    // `test.skip(!process.env.X, ...)` guards. Playwright already prints
    // these — we just amplify them so they don't get lost in the log.
    const skippedSummary = summarizeSkippedTests(output);
    if (skippedSummary) {
      console.warn(`[Supervisor] e2eVerify: ${skippedSummary}`);
    }
    return {
      e2eVerifyAttempts: attempt,
      e2eVerifyErrors: "",
    };
  }

  const failureSummary = output.slice(-12_000);
  console.log(
    `[Supervisor] e2eVerify: command="${plan.command}" cwd="${plan.cwd}" exitCode=${runResult.exitCode}`,
  );
  console.log(
    `[Supervisor] e2eVerify: output (last 800 chars):\n${output.slice(-800)}`,
  );
  if (attempt > MAX_E2E_VERIFY_FIX_ATTEMPTS) {
    console.warn(
      "[Supervisor] e2eVerify: max attempts reached with DETERMINISTIC failures still unresolved — this hard-fails the session.",
    );
    return {
      e2eVerifyAttempts: attempt,
      e2eVerifyErrors: failureSummary,
      // The loop only ever continues on deterministic failures (flaky/infra exit
      // immediately), so reaching the cap means a real, unfixed code bug remains.
      e2eDeterministicUnresolved: true,
    };
  }

  // ── Triage before auto-repair ────────────────────────────────────────────
  // 1. Re-run the same command once, under the same conditions, so the
  //    triage classifier can tell a real deterministic bug apart from a
  //    flake (timing / mock race) or an infrastructure problem (port
  //    clash, backend not up, DNS error).
  // 2. Feed only the deterministic failures to the LLM. For flaky / infra
  //    cases we write a report and exit the loop — rewriting code on a
  //    flake or infra error is how we corrupt previously-correct files.
  const emitter = getRepairEmitter(state.sessionId);
  let deterministicTestNames: Set<string> | null = null;
  let triageSummaryText = "";

  if (E2E_TRIAGE_ENABLED) {
    // Short-circuit for obvious infra — don't even pay the second run.
    if (hasInfraSignal(output)) {
      console.warn(
        "[Supervisor] e2eVerify: infra signal detected in first run (ECONNREFUSED / EADDRINUSE / etc.) — skipping auto-repair.",
      );
      const triage = triageE2eFailures({
        firstRunOutput: output,
        firstRunExitCode: runResult.exitCode,
      });
      await writeTriageReport(state.outputDir, attempt, triage.report);
      emitter({
        stage: "e2e-triage",
        event: "infra_detected",
        details: {
          attempt,
          summary: triage.summary,
          infraCount: triage.infra.length,
        },
      });
      return {
        // Bump past the limit so routeAfterE2eVerify exits the loop.
        e2eVerifyAttempts: MAX_E2E_VERIFY_FIX_ATTEMPTS + 1,
        e2eVerifyErrors: [
          "E2E failed with infrastructure signal — not a code bug.",
          triage.summary,
          "See .ralph/e2e-triage.md for the full report.",
          "",
          failureSummary.slice(-2000),
        ].join("\n\n"),
      };
    }

    console.log(
      "[Supervisor] e2eVerify: first run failed — executing retry pass for flake detection...",
    );
    const retryResult = await shellExec(plan.command, plan.cwd, {
      timeout: 180_000,
    });
    const retryOutput = `${retryResult.stdout}${retryResult.stderr}`.trim();

    const triage = triageE2eFailures({
      firstRunOutput: output,
      firstRunExitCode: runResult.exitCode,
      secondRunOutput: retryOutput,
      secondRunExitCode: retryResult.exitCode,
    });
    triageSummaryText = triage.summary;
    await writeTriageReport(state.outputDir, attempt, triage.report);

    console.log(`[Supervisor] e2eVerify: ${triage.summary}`);

    emitter({
      stage: "e2e-triage",
      event: "triage_complete",
      details: {
        attempt,
        deterministic: triage.deterministic.length,
        flaky: triage.flaky.length,
        infra: triage.infra.length,
        selfHealed: triage.selfHealed.length,
        retryExitCode: retryResult.exitCode,
      },
    });

    // Retry passed cleanly → treat as success; the original failure was a flake.
    if (retryResult.exitCode === 0 && triage.deterministic.length === 0) {
      console.log(
        "[Supervisor] e2eVerify: retry run passed — original failure was a flake, no auto-repair needed.",
      );
      emitter({
        stage: "e2e-triage",
        event: "flake_self_healed",
        details: { attempt, selfHealed: triage.selfHealed.length },
      });
      return {
        e2eVerifyAttempts: attempt,
        e2eVerifyErrors: "",
      };
    }

    // Retry still fails but none of the failures are deterministic (all
    // flake / infra) — auto-repair would chase noise. Exit the loop.
    if (triage.deterministic.length === 0) {
      console.warn(
        `[Supervisor] e2eVerify: retry still failed but no deterministic failures (${triage.summary}) — skipping auto-repair.`,
      );
      emitter({
        stage: "e2e-triage",
        event: "no_deterministic_failures",
        details: {
          attempt,
          flaky: triage.flaky.length,
          infra: triage.infra.length,
          selfHealed: triage.selfHealed.length,
        },
      });
      return {
        e2eVerifyAttempts: MAX_E2E_VERIFY_FIX_ATTEMPTS + 1,
        e2eVerifyErrors: [
          "E2E has failures but none are deterministic — auto-repair skipped.",
          triage.summary,
          "See .ralph/e2e-triage.md for the full report.",
          "",
          failureSummary.slice(-2000),
        ].join("\n\n"),
      };
    }

    deterministicTestNames = new Set(triage.deterministic.map((r) => r.name));
    emitter({
      stage: "e2e-triage",
      event: "repair_dispatch",
      details: {
        attempt,
        deterministicCount: triage.deterministic.length,
        skippedFlaky: triage.flaky.length,
        skippedInfra: triage.infra.length,
      },
    });
  }

  const e2eModelChain = resolveCodingChain(
    state.codingMode,
    "e2eGen",
    "gpt-4o",
  );
  const testTaskContext = summarizeE2eTaskContext(state.testTasks);
  const testFiles = (await listFiles("frontend", state.outputDir))
    .filter((f) => /\.(spec|test)\.(ts|tsx|js|jsx)$/.test(f))
    .slice(0, 6);
  const testFileContents: string[] = [];
  for (const tf of testFiles) {
    const c = await fsRead(tf, state.outputDir);
    if (!c.startsWith("FILE_NOT_FOUND") && !c.startsWith("REJECTED")) {
      testFileContents.push(`### ${tf}\n\`\`\`\n${c.slice(0, 2500)}\n\`\`\``);
    }
  }

  // Read per-test error-context.md files from test-results — these contain
  // the page snapshot, exact failing line, and DOM structure the LLM needs
  // to understand WHY each test failed and what source code must change.
  //
  // When triage produced a `deterministicTestNames` set, we filter to only
  // the matching contexts — the LLM is explicitly instructed below to fix
  // ONLY those, so feeding it extra flaky/infra contexts would invite it
  // to rewrite otherwise-correct code.
  const errorContextContents: string[] = [];
  const errorContextFiles = (
    await listFiles("frontend/test-results", state.outputDir)
  ).filter((f) => f.endsWith("error-context.md"));
  for (const ecf of errorContextFiles) {
    const md = await fsRead(ecf, state.outputDir);
    if (md.startsWith("FILE_NOT_FOUND") || md.startsWith("REJECTED")) continue;
    if (
      deterministicTestNames &&
      !errorContextMatchesAny(md, deterministicTestNames)
    ) {
      continue;
    }
    const folderName = ecf.split("/").slice(-2, -1)[0] ?? ecf;
    errorContextContents.push(`### ${folderName}\n${md.slice(0, 3000)}`);
  }

  // Statically analyse test files to extract waitForResponse URL patterns.
  // Each pattern represents a network request the application MUST make, or
  // the test will block until timeout. Surface these as explicit constraints.
  const waitForResponseConstraints: string[] = [];
  for (const tf of testFiles) {
    const c = await fsRead(tf, state.outputDir);
    if (c.startsWith("FILE_NOT_FOUND") || c.startsWith("REJECTED")) continue;
    const wfrMatches = [
      ...c.matchAll(
        /waitForResponse\s*\(\s*(?:response\s*=>\s*)?[^)]*?['"](\/[^'"]+)['"]/g,
      ),
    ];
    for (const m of wfrMatches) {
      waitForResponseConstraints.push(
        `- File ${tf}: waitForResponse expects a real HTTP request to a URL containing "${m[1]}"`,
      );
    }
    // Also catch arrow-function form: response => response.url().includes('/sessions')
    const includesMatches = [
      ...c.matchAll(
        /waitForResponse[^)]*?\.url\(\)\.includes\(['"](\/[^'"]+)['"]\)/g,
      ),
    ];
    for (const m of includesMatches) {
      const url = m[1];
      if (!waitForResponseConstraints.some((l) => l.includes(url))) {
        waitForResponseConstraints.push(
          `- File ${tf}: waitForResponse expects a real HTTP request to a URL containing "${url}"`,
        );
      }
    }
    // Detect timer-completion tests: expect(modal).toBeVisible({ timeout: N }) after clicking Start
    if (
      c.includes("toBeVisible") &&
      c.includes("timeout") &&
      c.includes("Start") &&
      c.includes("modal")
    ) {
      waitForResponseConstraints.push(
        `- File ${tf}: timer completion test — workDuration in defaultSettings MUST be ≤ 0.25 minutes (15 seconds) so the timer completes within the 30-second test timeout`,
      );
    }
  }

  // Collect key source files for repair context (pages, router, auth, api client).
  const allSrcFiles = (await listFiles("frontend/src", state.outputDir)).filter(
    (f) => /\.(ts|tsx)$/.test(f) && !/\.(spec|test)\.(ts|tsx)$/.test(f),
  );
  const SOURCE_PRIORITY = [
    /router\.(ts|tsx)$/,
    /App\.(ts|tsx)$/,
    /main\.(ts|tsx)$/,
    /pages\//,
    /views\//,
    /context\//,
    /lib\/auth/,
    /api\/client/,
    /api\/auth/,
    /utils\/authStorage/,
    /lib\/storage/,
  ];
  const sortedSrcFiles = [...allSrcFiles].sort((a, b) => {
    const ai = SOURCE_PRIORITY.findIndex((r) => r.test(a));
    const bi = SOURCE_PRIORITY.findIndex((r) => r.test(b));
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
  const srcFileContents: string[] = [];
  let srcBudget = 14000;
  for (const sf of sortedSrcFiles) {
    if (srcBudget <= 0) break;
    const c = await fsRead(sf, state.outputDir);
    if (!c.startsWith("FILE_NOT_FOUND") && !c.startsWith("REJECTED")) {
      const snippet = c.slice(0, Math.min(2000, srcBudget));
      srcFileContents.push(`### ${sf}\n\`\`\`\n${snippet}\n\`\`\``);
      srcBudget -= snippet.length;
    }
  }

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: [
        "You are an E2E source-code repair specialist.",
        "",
        "## Your job",
        "The Playwright E2E test files are derived directly from the PRD and represent the REQUIRED behaviour.",
        "They are the specification — do NOT modify them.",
        "Your job is to fix the APPLICATION SOURCE CODE so that all E2E tests pass.",
        "",
        "## Rules",
        "- NEVER modify any file that matches *.spec.ts, *.spec.tsx, *.test.ts, *.test.tsx.",
        "- NEVER modify `frontend/playwright.config.ts`'s `webServer` field for M-tier projects (projects that have a `backend/` directory). For those projects it MUST stay an ARRAY that starts BOTH the backend (`cd ../backend && pnpm dev`, health probe `http://localhost:4000/api/v1/health`) AND the frontend (`pnpm dev`). Collapsing it into a single object is the #1 cause of `infra: ECONNREFUSED` failures and the supervisor will rewrite it back. For S-tier projects (no `backend/` directory), the `webServer` field SHOULD be a single frontend-only object — do NOT add a backend entry.",
        "- NEVER delete `backend/src/api/modules/health/health.routes.ts` or remove the `registerHealthRoutes(...)` call in `backend/src/api/modules/index.ts` in M-tier projects. The Playwright `webServer` health probe at `/api/v1/health` depends on it.",
        "- Treat every locator, URL, button label, and aria-label in the test files as the ground truth for what the UI must render.",
        "- When a test expects a button named 'Go Home', the source component MUST render a button with that exact accessible name.",
        "- When a test navigates to /dashboard or /settings, those routes MUST exist and render the correct page.",
        "- When a test logs in with seeded credentials (e.g. owner@example.com / Password123!), the auth layer MUST accept them without a real backend.",
        "- Prefer localStorage-based mock auth (lib/auth.ts pattern) over real API calls when no backend is available.",
        "- Fix routing gaps: if a route is missing from the router, add it with the correct page component.",
        "- Fix label mismatches: if a test uses getByLabel('Sound Notifications') the input must have aria-label='Sound Notifications'.",
        "- Fix navigation: if a test clicks a Settings link in the nav, the nav must contain that link.",
        "",
        "## Critical Playwright mechanics you MUST understand before diagnosing",
        "- The page snapshot in error-context.md is captured AT THE MOMENT THE TEST FAILS, which can be",
        "  30 seconds into test execution after many actions have already occurred.",
        "  DO NOT assume the snapshot shows the initial page state — it shows the state at failure time.",
        "- `page.waitForResponse(url)` creates a promise that resolves only when the application makes",
        "  an actual HTTP request whose URL matches. If the application code does NOT fetch that URL,",
        "  `waitForResponse` blocks until test timeout. This is the #1 cause of 'Test timeout exceeded'",
        "  with no specific assertion error. Fix: add a fetch/axios call in the application code for",
        "  every URL pattern the test listens for (e.g. reset, pause, complete actions).",
        "- When a test error says only 'Test timeout of 30000ms exceeded' (no assertion line shown),",
        "  it almost always means an `await` is blocked on a promise that never resolved.",
        "  Look for `page.waitForResponse`, `page.waitForNavigation`, or similar in the test code.",
        "- `expect(locator).toBeVisible({ timeout: 90000 })` means the test will wait UP TO 90s for",
        "  the element — but the overall TEST timeout is 30s. If the UI state change (e.g. timer",
        "  completing and showing a modal) takes longer than 30s, the test will timeout regardless.",
        "  Fix: shorten the underlying timer/animation duration so the state change happens in < 20s.",
        "- Output ONLY modified source files using ```file:path``` blocks. No explanations.",
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        `Project root: ${state.outputDir}`,
        `E2E command: ${plan.command}`,
        `Attempt: ${attempt}`,
        triageSummaryText ? `Triage: ${triageSummaryText}` : "",
        deterministicTestNames && deterministicTestNames.size > 0
          ? [
              "",
              "## Triage-filtered scope",
              "The e2e command was executed twice. Only the tests listed below failed",
              "deterministically on BOTH runs — fix ONLY these, do not speculate about",
              "flaky or infrastructure-related failures (they are intentionally omitted",
              "from this prompt):",
              ...[...deterministicTestNames].map((n) => `- ${n}`),
            ].join("\n")
          : "",
        "",
        errorContextContents.length > 0
          ? `## Per-test failure details (page snapshots, exact failing lines, DOM state)\n${errorContextContents.join("\n\n---\n\n")}`
          : "",
        "",
        waitForResponseConstraints.length > 0
          ? [
              "## MANDATORY constraints derived from test code (fix ALL of these or tests will keep timing out)",
              ...waitForResponseConstraints,
            ].join("\n")
          : "",
        "",
        "## E2E failure summary",
        "```",
        failureSummary.slice(-4000),
        "```",
        "",
        testFileContents.length > 0
          ? `## E2E test files (DO NOT MODIFY — treat as specification)\n${testFileContents.join("\n\n")}`
          : "",
        "",
        srcFileContents.length > 0
          ? `## Application source files (these are what you should fix)\n${srcFileContents.join("\n\n")}`
          : "",
        "",
        "## PRD context",
        state.projectContext.slice(0, 4000),
      ]
        .filter(Boolean)
        .join("\n"),
    },
  ];

  try {
    const response = await chatCompletionWithFallback(messages, e2eModelChain, {
      temperature: 0.1,
      max_tokens: 12000,
      forceOpenRouter: forceOpenRouterForMode(state.codingMode),
    });
    const content = response.choices[0]?.message?.content ?? "";
    recordSupervisorLlmUsage({
      sessionId: state.sessionId,
      stage: "e2e_source_repair",
      model: response.model,
      usage: response.usage,
      costUsd: estimateCost(response.model, response.usage),
    });
    const fileBlocks = parseFileBlocksFromContent(content);
    if (fileBlocks.length === 0) {
      console.warn(
        "[Supervisor] e2eVerify: model returned no file blocks, keeping failure for next retry.",
      );
      return {
        e2eVerifyAttempts: attempt,
        e2eVerifyErrors: failureSummary,
      };
    }

    for (const file of fileBlocks) {
      await fsWrite(file.filePath, file.fileContent, state.outputDir, {
        scaffoldProtectedPaths: state.scaffoldProtectedPaths ?? [],
      });
    }
    console.log(
      `[Supervisor] e2eVerify: wrote ${fileBlocks.length} file(s), will re-verify next iteration.`,
    );
  } catch (e) {
    console.warn(
      `[Supervisor] e2eVerify: auto-fix call failed: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  return {
    e2eVerifyAttempts: attempt,
    e2eVerifyErrors: failureSummary,
  };
}

// ─── API Contract generation ───

async function generateApiContracts(state: SupervisorState) {
  if (state.backendTasks.length === 0) {
    console.log(
      "[Supervisor] generateApiContracts: no backend tasks, skipping.",
    );
    return {};
  }

  console.log(
    "[Supervisor] generateApiContracts: deriving API contract from the TRD shared-schema ENDPOINTS registry (single source of truth — no PRD re-read, no LLM authoring)...",
  );

  // The TRD shared schema is the SOURCE OF TRUTH. Its `ENDPOINTS` registry
  // (authored once in §6) is the single map of "METHOD /path" → request/response
  // type names that API_CONTRACTS.json, the FE client and the BE handlers all
  // derive from. See docs/contract-single-source-of-truth.md.
  const canonicalSchema = await fsRead(
    ".blueprint/shared-schema.ts",
    state.outputDir,
  );

  // Parse the registry + run the HARD GATE *before* the try below: that try
  // soft-swallows errors ("continuing without contracts"), but under option A a
  // missing registry is fatal and must propagate. `parseEndpointsRegistry`
  // returns `null` when there is no `export const ENDPOINTS` block at all
  // (a defective TRD) and `[]` when the block exists but declares no endpoints
  // (a legitimate API-less backend).
  const registry =
    !canonicalSchema.startsWith("FILE_NOT_FOUND") && canonicalSchema.trim()
      ? parseEndpointsRegistry(canonicalSchema)
      : null;
  if (registry == null) {
    // We already passed the "no backend tasks → skip" guard above, so backend
    // endpoints are expected. There is no single source to derive the contract
    // from, and we deliberately do NOT re-author shapes from the PRD (the
    // removed fallback) because that silently reintroduces FE↔BE drift.
    getRepairEmitter(state.sessionId)({
      stage: "generate_api_contracts",
      event: "endpoints_registry_missing",
      details: {
        schemaPresent: !canonicalSchema.startsWith("FILE_NOT_FOUND"),
      },
    });
    throw new Error(
      "generateApiContracts: the TRD shared-schema (.blueprint/shared-schema.ts) has no " +
        "`ENDPOINTS` registry, so API_CONTRACTS cannot be derived from a single source. " +
        "The PRD fallback was removed (option A) to prevent contract drift. Regenerate the " +
        "TRD so its §6 schema authors `export const ENDPOINTS = {...} as const`.",
    );
  }

  type ParsedContract = {
    service: string;
    endpoint: string;
    method: string;
    requestSchema?: string;
    responseSchema?: string;
    /** P1②: named shared-schema types (the single source of truth for shapes). */
    requestType?: string;
    responseType?: string;
    auth?: string;
    description?: string;
    prdJustification?: string;
    audience?: string;
  };

  try {
    const costUsd = 0;
    const modelLabel = "trd-endpoints-registry";

    // ── DERIVE from the schema's ENDPOINTS registry (the only path) ──────────
    // Shapes live in schema.ts; the contract carries the type NAMES. An empty
    // registry (`[]`) is valid — an API-less backend — and yields no derived
    // contracts (baseline injection below may still add implicit auth routes).
    console.log(
      `[Supervisor] generateApiContracts: DERIVING ${registry.length} contract(s) from the TRD ENDPOINTS registry (single source of truth — no LLM authoring).`,
    );
    const normAuth = (a: string | null): string => {
      const v = (a ?? "").trim().toLowerCase();
      if (!v || v === "public" || v === "none") return "none";
      return v; // "bearer", "admin", etc. preserved
    };
    let parsed: ParsedContract[] = registry.map((e) => ({
      service: serviceFromEndpoint(e.endpoint),
      endpoint: e.endpoint,
      method: e.method,
      // Inline shape strings stay EMPTY — the named type is the contract; its
      // shape is resolved from schema.ts (verify-time + worker context).
      requestType: e.request ?? undefined,
      responseType: e.response ?? undefined,
      auth: normAuth(e.auth),
      prdJustification:
        "Declared in the TRD shared-schema ENDPOINTS registry (authored source of truth).",
    }));
    getRepairEmitter(state.sessionId)({
      stage: "generate_api_contracts",
      event: "contracts_derived_from_schema",
      details: { count: parsed.length },
    });

    // ── v2 scope-rule telemetry ────────────────────────────────────────────
    // CODEGEN_HARDENING_PLAN.md §7.1 requires every emitted endpoint to carry
    // a non-empty `prdJustification` and an `audience` value. We log how the
    // model is doing on these so the contract-usage-coverage audit (T1.2) can
    // make decisions and so the report's retrofit suggestions can detect drift.
    const normalisedAudience = (raw: string | undefined): "user" | "admin" => {
      const v = (raw ?? "").trim().toLowerCase();
      return v === "admin" ? "admin" : "user";
    };
    const missingJustification = parsed.filter(
      (p) => !(p.prdJustification ?? "").trim(),
    );
    if (missingJustification.length > 0) {
      console.warn(
        `[Supervisor] generateApiContracts: ${missingJustification.length}/${parsed.length} endpoint(s) emitted with empty prdJustification — these are at risk of being pruned by the contract-usage-coverage audit.`,
      );
      getRepairEmitter(state.sessionId)({
        stage: "generate_api_contracts",
        event: "contract_scope_rule_violation",
        details: {
          totalEndpoints: parsed.length,
          missingJustification: missingJustification.length,
          sample: missingJustification
            .slice(0, 5)
            .map((p) => `${p.method} ${p.endpoint}`),
        },
      });
    }

    // ── Baseline endpoint injection ───────────────────────────────────────
    // The contract LLM is told "when in doubt, OMIT" so it doesn't emit
    // speculative CRUD. The downside: implicit baselines like
    // POST /auth/login that the PRD assumes (the way it assumes TCP/IP
    // works) get dropped too. Backfill them deterministically here from
    // a curated whitelist that ALWAYS applies to any backend project.
    // Detection: contracts mention `service: "auth"` OR the scaffold
    // ships `auth.routes.ts`. Endpoints already emitted by the LLM are
    // de-duped by `METHOD <path>` so we never double-emit.
    const authRoutesContent = await fsRead(
      "backend/src/api/modules/auth/auth.routes.ts",
      state.outputDir,
    );
    const hasAuthRoutes =
      !authRoutesContent.startsWith("FILE_NOT_FOUND") &&
      !authRoutesContent.startsWith("REJECTED");
    const baselineResult = injectBaselineEndpoints({
      contracts: parsed as ApiContractEntry[],
      hasAuthRoutes,
    });
    if (baselineResult.added.length > 0) {
      console.log(
        `[Supervisor] generateApiContracts: baseline-injected ${baselineResult.added.length} implicit endpoint(s): ${baselineResult.added.join(", ")}`,
      );
      getRepairEmitter(state.sessionId)({
        stage: "generate_api_contracts",
        event: "baseline_endpoints_injected",
        details: {
          added: baselineResult.added,
          skipped: baselineResult.skipped,
        },
      });
    }
    parsed = baselineResult.contracts;

    const contracts: ApiContract[] = parsed.map((item) => ({
      service: item.service ?? "unknown",
      endpoint: item.endpoint ?? "/",
      method: (item.method ?? "GET").toUpperCase(),
      // Prefer the inline shape string (legacy); else show the named type so the
      // FE API-reference block still points at the contract (shape is in schema.ts).
      requestFields: item.requestSchema ?? item.requestType ?? undefined,
      responseFields: item.responseSchema ?? item.responseType ?? undefined,
      authType: item.auth ?? "none",
      description: item.description ?? undefined,
      schema: [
        item.requestSchema || item.requestType
          ? `request: ${item.requestSchema ?? item.requestType}`
          : "",
        item.responseSchema || item.responseType
          ? `response: ${item.responseSchema ?? item.responseType}`
          : "",
      ]
        .filter(Boolean)
        .join(" | "),
      generatedBy: "api_contract_phase",
      prdJustification: item.prdJustification ?? undefined,
      audience: normalisedAudience(item.audience),
    }));

    const contractJson = JSON.stringify(
      parsed.map((item, i) => ({
        ...item,
        id: `API-${String(i + 1).padStart(3, "0")}`,
        prdJustification: (item.prdJustification ?? "").trim(),
        audience: normalisedAudience(item.audience),
      })),
      null,
      2,
    );
    await fsWrite("API_CONTRACTS.json", contractJson, state.outputDir);

    console.log(
      `[Supervisor] generateApiContracts: generated ${contracts.length} contracts (${contracts.length - missingJustification.length} with PRD justification), written to API_CONTRACTS.json (source=${modelLabel}, cost: $${costUsd.toFixed(4)})`,
    );

    // ── Contract-vs-models completeness audit + auto-append ────────────────
    // Run immediately after writing so the downstream worker phases generate
    // against a complete contract instead of silently skipping endpoints the
    // ORM relationships obviously require. Auto-append is safe-by-default: it
    // only synthesises entries whose plural segments were already resolved by
    // the audit, and never overwrites existing contract entries.
    try {
      const completeness = await auditContractCompleteness(state.outputDir);
      if (completeness.missingScopedEndpoints.length > 0) {
        console.warn(
          `[Supervisor] generateApiContracts: contract completeness audit found ${completeness.missingScopedEndpoints.length} missing scoped endpoint(s): ${completeness.missingScopedEndpoints
            .map((m) => m.expectedPath)
            .join(", ")}`,
        );
      }
      getRepairEmitter(state.sessionId)({
        stage: "generate_api_contracts",
        event: "contract_completeness_snapshot",
        details: {
          when: "post-generate",
          inferredRelationshipCount: completeness.inferredRelationships.length,
          missingScopedEndpoints: completeness.missingScopedEndpoints,
        },
      });
      if (completeness.missingScopedEndpoints.length > 0) {
        const appendResult = await autoAppendMissingScopedEndpoints(
          state.outputDir,
          completeness.missingScopedEndpoints,
        );
        if (appendResult.added.length > 0) {
          console.log(
            `[Supervisor] generateApiContracts: auto-appended ${appendResult.added.length} scoped endpoint(s) to API_CONTRACTS.json: ${appendResult.added.join(", ")}`,
          );
        }
        getRepairEmitter(state.sessionId)({
          stage: "generate_api_contracts",
          event: "contract_completeness_autorepaired",
          details: {
            when: "post-generate",
            added: appendResult.added,
            skipped: appendResult.skipped,
          },
        });
      }
    } catch (err) {
      console.warn(
        `[Supervisor] generateApiContracts: contract completeness audit skipped — ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    // ── Contract usage coverage (post-contract phase) ──────────────────────
    // Prune endpoints with no PRD justification BEFORE downstream task
    // breakdown / worker codegen sees them. This is the single most effective
    // fix for the "speculative CRUD wedge" failure mode that produced
    // session 52851b86's 45 missing-impl errors and the verify-fix stagnation.
    // See CODEGEN_HARDENING_PLAN.md §7.1.
    let prunedCount = 0;
    try {
      const coverage = await runContractUsageCoverage({
        outputDir: state.outputDir,
        emitter: getRepairEmitter(state.sessionId),
        sessionId: state.sessionId,
        phase: "post-contract",
      });
      prunedCount = coverage.pruned.length;
      if (coverage.pruned.length > 0) {
        console.log(
          `[Supervisor] generateApiContracts: contract-usage-coverage pruned ${coverage.pruned.length} surplus endpoint(s) lacking PRD justification: ${coverage.pruned
            .slice(0, 6)
            .map((p) => `${p.method} ${p.endpoint}`)
            .join(", ")}${coverage.pruned.length > 6 ? ", …" : ""}.`,
        );
      }
    } catch (err) {
      console.warn(
        `[Supervisor] generateApiContracts: contract-usage-coverage skipped — ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    // If we pruned, reload the (now-shrunk) contract from disk and rebuild
    // the in-memory ApiContract[] so downstream nodes don't see ghost entries.
    let finalContracts = contracts;
    if (prunedCount > 0) {
      try {
        const reloaded = await fsRead("API_CONTRACTS.json", state.outputDir);
        if (
          !reloaded.startsWith("FILE_NOT_FOUND") &&
          !reloaded.startsWith("REJECTED")
        ) {
          const reparsed = JSON.parse(reloaded) as Array<{
            service?: string;
            endpoint?: string;
            method?: string;
            requestSchema?: string;
            responseSchema?: string;
            auth?: string;
            description?: string;
            prdJustification?: string;
            audience?: string;
          }>;
          if (Array.isArray(reparsed)) {
            finalContracts = reparsed.map((item) => ({
              service: item.service ?? "unknown",
              endpoint: item.endpoint ?? "/",
              method: (item.method ?? "GET").toUpperCase(),
              requestFields: item.requestSchema ?? undefined,
              responseFields: item.responseSchema ?? undefined,
              authType: item.auth ?? "none",
              description: item.description ?? undefined,
              schema: [
                item.requestSchema ? `request: ${item.requestSchema}` : "",
                item.responseSchema ? `response: ${item.responseSchema}` : "",
              ]
                .filter(Boolean)
                .join(" | "),
              generatedBy: "api_contract_phase",
              prdJustification: item.prdJustification ?? undefined,
              audience: normalisedAudience(item.audience),
            }));
          }
        }
      } catch (err) {
        console.warn(
          `[Supervisor] generateApiContracts: failed to reload pruned contract — ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    return {
      apiContracts: finalContracts,
      totalCostUsd: costUsd,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(
      `[Supervisor] generateApiContracts: error — ${msg}. Continuing without contracts.`,
    );
    return {};
  }
}

/**
 * Task ↔ contract coverage gate + repair.
 *
 * Runs immediately after `generateApiContracts` so that any endpoint
 * declared in `API_CONTRACTS.json` that NO existing kick-off task
 * references gets a synthetic supplementary task injected here —
 * BEFORE backend/frontend coding nodes start consuming the task list.
 *
 * Failure mode this guards against (per the session-report analysis):
 *   • `generate_api_contracts` adds baseline endpoints (auth/refresh,
 *     auth/me, auth/sso/callback) that PRD prose never enumerated, so
 *     `task-breakdown-agent` (which runs BEFORE contracts and only
 *     reads PRD/TRD) cannot have planned tasks for them.
 *   • Same PRD line interpreted differently by contract-gen vs
 *     task-breakdown (e.g. `/admin/score-cycles/:symbol/force` vs
 *     `/jobs/force-scoring`) results in contract entries with no
 *     matching task either.
 *
 * Without this node, the gap is only observable post-codegen via the
 * route audit's `missingContractEndpoints`, at which point coding
 * budget for those endpoints is already spent on unrelated work and
 * self-heal has to iterate. Injecting tasks here closes the loop
 * before any coding agent runs.
 */
async function contractTaskCoverage(
  state: SupervisorState,
): Promise<Partial<SupervisorState>> {
  const label = "[Supervisor] ContractTaskCoverage";
  const emit = getRepairEmitter(state.sessionId);

  // Retry mode: the user asked to re-run a specific subset of tasks. Injecting
  // supplementary backend tasks here would silently balloon the run scope —
  // skip the whole gate. Whole-system contract coverage stays the
  // responsibility of the next full build.
  if (state.retryMode) {
    console.log(
      `${label}: retry mode — skipping coverage gate (user re-ran a task subset).`,
    );
    return {};
  }

  // ── 1. Load contracts ─────────────────────────────────────────────────
  const contractsRaw = await fsRead("API_CONTRACTS.json", state.outputDir);
  if (
    contractsRaw.startsWith("FILE_NOT_FOUND") ||
    contractsRaw.startsWith("REJECTED")
  ) {
    return {};
  }
  let contracts: ContractEntryLike[] = [];
  try {
    const parsed = JSON.parse(contractsRaw);
    if (Array.isArray(parsed)) contracts = parsed as ContractEntryLike[];
  } catch {
    return {};
  }
  if (contracts.length === 0 || state.tasks.length === 0) return {};

  // ── 2. Run gate ───────────────────────────────────────────────────────
  const initialGate = runContractCoverageGate(contracts, state.tasks);
  emit({
    stage: "preflight-task-contract-coverage",
    event: "task_contract_coverage_snapshot",
    details: {
      when: "post-contract-gen",
      passed: initialGate.passed,
      missingEndpoints: initialGate.missingIds,
      contractTotal: contracts.length,
      taskCount: state.tasks.length,
    },
  });

  if (initialGate.passed || initialGate.missingIds.length === 0) {
    return {};
  }

  console.warn(
    `${label}: ${initialGate.missingIds.length} contract endpoint(s) have no referencing task; attempting supplementary task injection.`,
  );

  // ── 3. Gather PRD / TRD / SCAFFOLD context ────────────────────────────
  const [prdRaw, trdRaw, sysDesignRaw, implGuideRaw, scaffoldSpecRaw] =
    await Promise.all([
      fsRead("PRD.md", state.outputDir),
      fsRead("TRD.md", state.outputDir),
      fsRead("SystemDesign.md", state.outputDir),
      fsRead("ImplementationGuide.md", state.outputDir),
      fsRead("SCAFFOLD_SPEC.md", state.outputDir),
    ]);
  const readable = (s: string): string | undefined =>
    s.startsWith("FILE_NOT_FOUND") || s.startsWith("REJECTED") ? undefined : s;
  const prd = readable(prdRaw) ?? "";
  if (!prd) {
    console.warn(
      `${label}: PRD.md not found; cannot generate supplementary tasks. Skipping repair.`,
    );
    return {};
  }
  const tierMatch = readable(scaffoldSpecRaw)?.match(/tier\s+([SML])/i) ?? null;
  const tier: ProjectTier = normalizeProjectTier(tierMatch?.[1]);

  // ── 4. Repair ─────────────────────────────────────────────────────────
  let repaired;
  try {
    repaired = await repairContractCoverage({
      contracts,
      existingTasks: state.tasks,
      prd,
      trd: readable(trdRaw),
      sysDesign: readable(sysDesignRaw),
      implGuide: readable(implGuideRaw),
      tier,
      sessionId: state.sessionId,
      emitter: emit,
    });
  } catch (err) {
    console.warn(
      `${label}: repair threw — ${err instanceof Error ? err.message : String(err)}. Proceeding with original task list.`,
    );
    return {};
  }

  if (repaired.added.length === 0) {
    console.log(
      `${label}: no supplementary tasks produced (LLM declined or repair budget exhausted). ${repaired.finalMissingEndpoints.length} endpoint(s) remain uncovered.`,
    );
    return {};
  }

  // ── 5. Re-classify the merged task list so role buckets reflect the
  //      newly-added supplementary tasks. The downstream nodes read
  //      `backendTasks` / `frontendTasks` etc., not the flat `tasks`.
  const allTasks: CodingTask[] = repaired.tasks.map((t) => {
    // KickoffWorkItem → CodingTask via default runtime fields. Existing
    // CodingTask entries (already in state.tasks) flow through unchanged
    // because the spread preserves their pre-set `assignedAgentId` /
    // `codingStatus`.
    const asCoding = t as CodingTask;
    return {
      ...asCoding,
      assignedAgentId: asCoding.assignedAgentId ?? null,
      codingStatus: asCoding.codingStatus ?? "pending",
    };
  });
  const byRole: Record<CodingAgentRole, CodingTask[]> = {
    architect: [],
    backend: [],
    frontend: [],
    test: [],
    fullstack: [],
  };
  for (const task of allTasks) {
    const role = inferRole(task);
    byRole[role].push(task);
  }
  for (const role of Object.keys(byRole) as CodingAgentRole[]) {
    byRole[role] = topoSortBucket(byRole[role]);
  }

  console.log(
    `${label}: injected ${repaired.added.length} supplementary task(s); re-classified into architect=${byRole.architect.length}, backend=${byRole.backend.length}, frontend=${byRole.frontend.length}, test=${byRole.test.length}.`,
  );

  return {
    tasks: allTasks,
    architectTasks: byRole.architect,
    backendTasks: byRole.backend,
    frontendTasks: byRole.frontend,
    fullstackTasks: byRole.fullstack,
    testTasks: byRole.test,
  };
}

/**
 * Page-coverage gate: inject supplementary frontend tasks for any PRD page
 * that has no corresponding task after the contract-task-coverage pass.
 *
 * Mirrors contractTaskCoverage but operates on prdSpec.pages rather than
 * API_CONTRACTS.json entries. Runs immediately after contract_task_coverage
 * so both checks are resolved before any coding agent starts.
 *
 * Only fires when prdSpec has at least one page — skips silently for
 * backend-only or API-only PRDs.
 */
async function pageTaskCoverage(
  state: SupervisorState,
): Promise<Partial<SupervisorState>> {
  const label = "[Supervisor] PageTaskCoverage";
  const emit = getRepairEmitter(state.sessionId);

  // Retry mode: same rationale as contractTaskCoverage — re-running a task
  // subset must not silently inject extra frontend tasks for unrelated pages.
  if (state.retryMode) {
    console.log(
      `${label}: retry mode — skipping coverage gate (user re-ran a task subset).`,
    );
    return {};
  }

  const pages = state.prdSpec?.pages ?? [];
  if (pages.length === 0 || state.tasks.length === 0) return {};

  // Quick early exit: if all pages are already covered, skip the LLM call.
  const initialGate = runPageCoverageGate(pages, state.tasks);
  if (initialGate.passed) {
    console.log(
      `${label}: all ${pages.length} PRD page(s) already have a frontend task — skipping.`,
    );
    return {};
  }

  console.warn(
    `${label}: ${initialGate.missingPageIds.length} page(s) have no frontend task: ${initialGate.missingPageNames.join(", ")}. Injecting supplementary tasks.`,
  );

  const [prdRaw, trdRaw, sysDesignRaw, implGuideRaw, scaffoldSpecRaw] =
    await Promise.all([
      fsRead("PRD.md", state.outputDir),
      fsRead("TRD.md", state.outputDir),
      fsRead("SystemDesign.md", state.outputDir),
      fsRead("ImplementationGuide.md", state.outputDir),
      fsRead("SCAFFOLD_SPEC.md", state.outputDir),
    ]);

  const readable = (s: string): string | undefined =>
    s.startsWith("FILE_NOT_FOUND") || s.startsWith("REJECTED") ? undefined : s;

  const prd = readable(prdRaw) ?? "";
  if (!prd) {
    console.warn(`${label}: PRD.md not found — cannot inject page tasks.`);
    return {};
  }

  const tierMatch = readable(scaffoldSpecRaw)?.match(/tier\s+([SML])/i) ?? null;
  const tier: ProjectTier = normalizeProjectTier(tierMatch?.[1]);

  let repaired;
  try {
    repaired = await repairPageCoverage({
      pages,
      existingTasks: state.tasks,
      prd,
      trd: readable(trdRaw),
      sysDesign: readable(sysDesignRaw),
      implGuide: readable(implGuideRaw),
      tier,
      sessionId: state.sessionId,
      emitter: emit,
    });
  } catch (err) {
    console.warn(
      `${label}: repair threw — ${err instanceof Error ? err.message : String(err)}. Proceeding with original task list.`,
    );
    return {};
  }

  if (repaired.added.length === 0) {
    console.log(
      `${label}: no supplementary page tasks produced; ${repaired.finalMissingPageIds.length} page(s) still uncovered.`,
    );
    return {};
  }

  // Re-classify added tasks into role buckets and merge into state.
  const allTasks = repaired.tasks.map((t) => {
    const asCoding = t as unknown as CodingTask;
    return {
      ...asCoding,
      assignedAgentId: asCoding.assignedAgentId ?? null,
      codingStatus: asCoding.codingStatus ?? "pending",
    };
  });

  const byRole: Record<CodingAgentRole, CodingTask[]> = {
    architect: [],
    backend: [],
    frontend: [],
    test: [],
    fullstack: [],
  };
  for (const task of allTasks) {
    byRole[inferRole(task)].push(task);
  }
  for (const role of Object.keys(byRole) as CodingAgentRole[]) {
    byRole[role] = topoSortBucket(byRole[role]);
  }

  console.log(
    `${label}: injected ${repaired.added.length} supplementary page task(s); frontend total: ${byRole.frontend.length}.`,
  );

  return {
    tasks: allTasks,
    architectTasks: byRole.architect,
    backendTasks: byRole.backend,
    frontendTasks: byRole.frontend,
    fullstackTasks: byRole.fullstack,
    testTasks: byRole.test,
  };
}

/**
 * Bootstrap shared schemas/types/contracts BEFORE backend/frontend workers.
 * This makes downstream imports stable and reduces naming drift.
 */
async function bootstrapSharedContracts(
  state: SupervisorState,
): Promise<Partial<SupervisorState>> {
  const sharedPkg = await fsRead(
    "packages/shared/package.json",
    state.outputDir,
  );
  if (
    sharedPkg.startsWith("FILE_NOT_FOUND") ||
    sharedPkg.startsWith("REJECTED")
  ) {
    console.log(
      "[Supervisor] bootstrapSharedContracts: packages/shared not found, skipping.",
    );
    return {};
  }

  console.log(
    "[Supervisor] bootstrapSharedContracts: generating shared schemas/types/contracts...",
  );

  const taskText = state.tasks
    .map((t) => `- [${t.phase}] ${t.title}: ${t.description}`)
    .join("\n");
  const apiText =
    state.apiContracts.length > 0
      ? state.apiContracts
          .map((c) => `- ${c.method} ${c.endpoint} (${c.service}) ${c.schema}`)
          .join("\n")
      : "- (none)";

  const existingShared = state.fileRegistry
    .filter((f) => f.path.startsWith("packages/shared/"))
    .slice(0, 20)
    .map((f) => `- ${f.path} (${f.summary})`)
    .join("\n");

  const chain = resolveCodingChain(state.codingMode, "codeFix", "gpt-4o");
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `You are a Senior TypeScript API Contract Architect.
Generate/repair ONLY shared package files for a monorepo:
- packages/shared/schemas/*.ts
- packages/shared/types/*.ts
- packages/shared/src/contracts/*.ts
- packages/shared/src/index.ts (optional update if needed)

Critical rules:
- Import path convention in consumers: @project/shared/types/... and @project/shared/schemas/...
- Zod naming: runtime values are camelCase schema objects (e.g. loginSchema, registerSchema).
- Inferred types MUST use *Input / *Dto names (e.g. LoginInput, RegisterInput). Do NOT export type names like LoginSchema/RegisterSchema.
- Keep exports consistent and explicit.
- Output ONLY file blocks: \`\`\`file:<relative-path>\n<contents>\n\`\`\``,
    },
    {
      role: "user",
      content: [
        "## Tasks",
        taskText || "- (none)",
        "",
        "## API contracts",
        apiText,
        "",
        "## Existing shared files (registry)",
        existingShared || "- (none)",
        "",
        "Generate a coherent shared contract baseline now.",
      ].join("\n"),
    },
  ];

  try {
    const response = await chatCompletionWithFallback(messages, chain, {
      temperature: 0.1,
      max_tokens: 65536,
      forceOpenRouter: forceOpenRouterForMode(state.codingMode),
    });
    const content = response.choices[0]?.message?.content ?? "";
    const costUsd = estimateCost(response.model, response.usage);
    recordSupervisorLlmUsage({
      sessionId: state.sessionId,
      stage: "bootstrap_shared_contracts",
      model: response.model,
      usage: response.usage,
      costUsd,
    });
    const files = parseFileOutput(content);

    const skOpts = scaffoldWriteOpts(state, true);
    const newEntries: GeneratedFile[] = [];
    for (const [fp, fc] of Object.entries(files)) {
      const norm = fp.replace(/\\/g, "/");
      if (
        !norm.startsWith("packages/shared/schemas/") &&
        !norm.startsWith("packages/shared/types/") &&
        !norm.startsWith("packages/shared/src/contracts/") &&
        norm !== "packages/shared/src/index.ts"
      ) {
        continue;
      }
      await fsWrite(norm, fc, state.outputDir, skOpts);
      newEntries.push({
        path: norm,
        role: "architect",
        summary: "Shared contracts baseline (schemas/types/contracts)",
        exports: extractExports(fc),
      });
    }

    console.log(
      `[Supervisor] bootstrapSharedContracts: wrote ${newEntries.length} file(s) (model=${response.model}, cost: $${costUsd.toFixed(4)})`,
    );

    return {
      fileRegistry: newEntries,
      totalCostUsd: costUsd,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(
      `[Supervisor] bootstrapSharedContracts: error — ${msg}. Continuing without bootstrap.`,
    );
    return {};
  }
}

/* generateServiceSkeletons — REMOVED.
 * Skeleton files (throw new Error("Not implemented")) caused more harm than
 * good: controllers / routes / middleware were generated as stubs and often
 * not replaced by workers. API contracts + task-breakdown + architect phase
 * already provide enough cross-file context for workers. */

function extractExports(source: string): string[] {
  const exports = new Set<string>();

  const namedPattern =
    /^export\s+(?:const|function|class|type|interface|enum|async\s+function)\s+(\w+)/gm;
  const bracePattern = /export\s*\{([^}]+)\}/g;
  const defaultPattern = /^export\s+default\s+(?:function|class)\s+(\w+)/gm;

  let m: RegExpExecArray | null;

  while ((m = namedPattern.exec(source)) !== null) {
    if (m[1]) exports.add(m[1]);
  }

  while ((m = bracePattern.exec(source)) !== null) {
    m[1].split(",").forEach((name) => {
      const trimmed = name.trim().split(" as ")[0].trim();
      if (trimmed) exports.add(trimmed);
    });
  }

  while ((m = defaultPattern.exec(source)) !== null) {
    if (m[1]) exports.add(m[1]);
  }

  return [...exports];
}

// ─── Phased dispatch (BE first, then FE) ───

/**
 * Logs the parallelism plan for a phase: how many workers will run concurrently,
 * and which tasks each worker runs serially. Tasks land in the same worker when
 * they share a dependency edge or a file (`chunkTasksByFileConflict`) — i.e.
 * "same path → serial within a worker; different path → parallel workers".
 */
function logChunkPlan(label: string, chunks: CodingTask[][]): void {
  const taskCount = chunks.reduce((n, c) => n + c.length, 0);
  console.log(
    `[Supervisor] ${label}: ${taskCount} task(s) → ${chunks.length} parallel worker(s) ` +
      `(file/dependency-coupled tasks serialized within a worker).`,
  );
  chunks.forEach((c, i) => {
    const serial = c
      .map((t) => `${t.id ?? "?"}:${(t.title ?? "").slice(0, 40)}`)
      .join("  →  ");
    console.log(
      `[Supervisor]   worker #${i + 1} — ${c.length} task(s) serial: ${serial}`,
    );
  });
}

/**
 * Phase 1 dispatch: only Backend and Test Workers.
 * Frontend waits for BE to complete so it can see BE's real output.
 */
export function dispatchBackendAndTestWorkers(state: SupervisorState): Send[] {
  const sends: Send[] = [];

  const beCount = workersForRole("backend", state.backendTasks.length);
  const beChunks = ENABLE_PARALLEL_CODING_WORKERS
    ? chunkTasksByFileConflict(state.backendTasks, beCount)
    : chunkTasks(state.backendTasks, beCount);
  logChunkPlan(
    `Backend dispatch (${ENABLE_PARALLEL_CODING_WORKERS ? "parallel" : "serial"})`,
    beChunks,
  );
  if (state.testTasks.length > 0) {
    console.log(
      `[Supervisor]   + Test Engineer worker (${state.testTasks.length} task(s)) runs in parallel with the ${beChunks.length} backend worker(s).`,
    );
  }
  beChunks.forEach((tasks, i) => {
    sends.push(
      new Send("be_worker", {
        role: "backend" as CodingAgentRole,
        workerLabel: beCount > 1 ? `Backend Dev #${i + 1}` : "Backend Dev",
        tasks,
        outputDir: state.outputDir,
        projectContext: state.projectContext,
        codingMode: state.codingMode,
        fileRegistrySnapshot: state.fileRegistry,
        apiContractsSnapshot: state.apiContracts,
        scaffoldProtectedPaths: state.scaffoldProtectedPaths ?? [],
        currentTaskIndex: 0,
        ralphConfig: state.ralphConfig,
        sessionId: state.sessionId,
        prdSpec: state.prdSpec,
      }),
    );
  });

  if (state.testTasks.length > 0) {
    sends.push(
      new Send("be_worker", {
        role: "test" as CodingAgentRole,
        workerLabel: "Test Engineer",
        tasks: state.testTasks,
        outputDir: state.outputDir,
        projectContext: state.projectContext,
        codingMode: state.codingMode,
        fileRegistrySnapshot: state.fileRegistry,
        apiContractsSnapshot: state.apiContracts,
        scaffoldProtectedPaths: state.scaffoldProtectedPaths ?? [],
        currentTaskIndex: 0,
        ralphConfig: state.ralphConfig,
        sessionId: state.sessionId,
        prdSpec: state.prdSpec,
      }),
    );
  }

  // ── Vertical-slice (flag-gated) fullstack dispatch ──
  // Feature slices own their endpoints AND their UI end-to-end. We dispatch
  // them in the BACKEND phase (not the FE phase) so the endpoints they write
  // are visible to `extract_real_contracts` (which runs AFTER be_worker) and
  // are covered by be_phase_verify + integration_verify that same cycle. Their
  // frontend files are still picked up later by the directory-scan frontend
  // normalizations and fe_phase_verify (both scan frontend/ regardless of which
  // worker wrote a file). Empty by default (flag off ⇒ no Feature tasks ⇒ no
  // fullstack Sends ⇒ byte-identical dispatch).
  if (state.fullstackTasks.length > 0) {
    const fsCount = workersForRole("fullstack", state.fullstackTasks.length);
    const fsChunks = ENABLE_PARALLEL_CODING_WORKERS
      ? chunkTasksByFileConflict(state.fullstackTasks, fsCount)
      : chunkTasks(state.fullstackTasks, fsCount);
    logChunkPlan(
      `Fullstack dispatch (${ENABLE_PARALLEL_CODING_WORKERS ? "parallel" : "serial"}, BE phase)`,
      fsChunks,
    );
    fsChunks.forEach((tasks, i) => {
      sends.push(
        new Send("be_worker", {
          role: "fullstack" as CodingAgentRole,
          workerLabel:
            fsChunks.length > 1 ? `Fullstack Dev #${i + 1}` : "Fullstack Dev",
          tasks,
          outputDir: state.outputDir,
          projectContext: state.projectContext,
          codingMode: state.codingMode,
          fileRegistrySnapshot: state.fileRegistry,
          apiContractsSnapshot: state.apiContracts,
          scaffoldProtectedPaths: state.scaffoldProtectedPaths ?? [],
          currentTaskIndex: 0,
          ralphConfig: state.ralphConfig,
          sessionId: state.sessionId,
          prdSpec: state.prdSpec,
        }),
      );
    });
  }

  if (sends.length === 0) {
    sends.push(
      new Send("be_worker", {
        role: "backend" as CodingAgentRole,
        workerLabel: "No-op",
        tasks: [],
        outputDir: state.outputDir,
        projectContext: "",
        codingMode: state.codingMode,
        fileRegistrySnapshot: [],
        apiContractsSnapshot: [],
        scaffoldProtectedPaths: state.scaffoldProtectedPaths ?? [],
        currentTaskIndex: 0,
        ralphConfig: state.ralphConfig,
        sessionId: state.sessionId,
        prdSpec: state.prdSpec,
      }),
    );
  }

  return sends;
}

/**
 * Phase 2 dispatch: Frontend Workers run after BE completes.
 * fileRegistry now contains BE's real output; apiContracts contains real endpoints.
 */
export function dispatchFrontendWorkers(state: SupervisorState): Send[] {
  // Fullstack Feature tasks are dispatched in the BACKEND phase (see
  // dispatchBackendAndTestWorkers) so their endpoints are contract-extracted
  // and backend-verified. This gate stays frontend-only.
  console.log(
    `[Supervisor] dispatchFrontendWorkers called — frontendTasks=${state.frontendTasks.length}`,
  );
  if (state.frontendTasks.length === 0) {
    return [
      new Send("fe_worker", {
        role: "frontend" as CodingAgentRole,
        workerLabel: "No-op",
        tasks: [],
        outputDir: state.outputDir,
        projectContext: "",
        codingMode: state.codingMode,
        fileRegistrySnapshot: [],
        apiContractsSnapshot: [],
        scaffoldProtectedPaths: state.scaffoldProtectedPaths ?? [],
        currentTaskIndex: 0,
        ralphConfig: state.ralphConfig,
        sessionId: state.sessionId,
        prdSpec: state.prdSpec,
      }),
    ];
  }

  // Route-consolidation flow: the foundation already ran in `fe_foundation`, so
  // here we fan out ONLY the page/view tasks. With routing removed from their
  // responsibility (consolidated later in `fe_route_consolidation`), pages are
  // file-disjoint and dependency-satisfied, so they parallelize freely —
  // independent of the BLUEPRINT_PARALLEL_CODING_WORKERS gate.
  let dispatchTasks = state.frontendTasks;
  let feChunks: CodingTask[][];
  if (ENABLE_FE_ROUTE_CONSOLIDATION) {
    dispatchTasks = splitFrontendTasks(state.frontendTasks).pages;
    if (dispatchTasks.length === 0) {
      // Nothing but foundation — emit a single no-op so the barrier resolves.
      dispatchTasks = [];
    }
    const pageCount = frontendPageWorkerCount(dispatchTasks.length);
    feChunks = chunkTasksByFileConflict(dispatchTasks, pageCount);
    logChunkPlan(
      "Frontend dispatch (consolidation — foundation already ran)",
      feChunks,
    );
  } else {
    const feCount = workersForRole("frontend", state.frontendTasks.length);
    feChunks = ENABLE_PARALLEL_CODING_WORKERS
      ? chunkTasksByFileConflict(state.frontendTasks, feCount)
      : chunkTasks(state.frontendTasks, feCount);
    logChunkPlan(
      `Frontend dispatch (${ENABLE_PARALLEL_CODING_WORKERS ? "parallel" : "serial"})`,
      feChunks,
    );
  }
  // No page tasks (foundation-only project) — single no-op Send to resolve the barrier.
  if (ENABLE_FE_ROUTE_CONSOLIDATION && feChunks.length === 0) {
    return [
      new Send("fe_worker", {
        role: "frontend" as CodingAgentRole,
        workerLabel: "No-op",
        tasks: [],
        outputDir: state.outputDir,
        projectContext: "",
        codingMode: state.codingMode,
        fileRegistrySnapshot: [],
        apiContractsSnapshot: [],
        scaffoldProtectedPaths: state.scaffoldProtectedPaths ?? [],
        currentTaskIndex: 0,
        ralphConfig: state.ralphConfig,
        sessionId: state.sessionId,
        prdSpec: state.prdSpec,
      }),
    ];
  }

  // state.apiContracts is the append-merged union of:
  //   1. generate_api_contracts (PRD-inferred, speculative — feeds BE as spec)
  //   2. extract_real_contracts_manifest (BE self-declared in _meta/routes/*)
  //   3. extract_real_contracts_llm (read from BE's actual route files)
  //   4. extract_real_contracts_regex (pattern-matched from BE's actual files)
  // FE must only see (2)-(4) — what BE actually wrote — otherwise it'll call
  // endpoints that exist only in TRD's imagination. Dedupe by method+endpoint,
  // preferring manifest > LLM > regex (more field info upstream).
  const sourcePriority = (c: ApiContract): number => {
    switch (c.generatedBy) {
      case "extract_real_contracts_manifest":
        return 3;
      case "extract_real_contracts_llm":
        return 2;
      case "extract_real_contracts_regex":
        return 1;
      default:
        return 0;
    }
  };
  const realByKey = new Map<string, ApiContract>();
  for (const c of state.apiContracts) {
    if (sourcePriority(c) === 0) continue;
    const key = `${(c.method ?? "GET").toUpperCase()} ${c.endpoint}`;
    const existing = realByKey.get(key);
    if (!existing || sourcePriority(c) > sourcePriority(existing)) {
      realByKey.set(key, c);
    }
  }
  const realContracts = Array.from(realByKey.values());

  // Fallback: if extraction yielded nothing (LLM error AND no regex hits),
  // fall back to the full set so FE isn't completely blind. Log this — it
  // means BE's route shape didn't match either extractor and likely needs
  // attention.
  // Contract source for the FE prompt:
  //  - Parallel mode (CODEGEN_PARALLEL_FE_BE): the backend hasn't been extracted
  //    yet (it runs concurrently), so FE binds the AUTHORITATIVE upfront ENDPOINTS
  //    contract (option-A guarantees BE implements it). Drift is caught post-join
  //    by extract_real_contracts + integration tests, not by FE-waits-for-BE.
  //  - Sequential mode: prefer the BE-extracted contracts (what BE actually
  //    wrote); fall back to the upfront set if extraction yielded nothing.
  const feContracts = ENABLE_PARALLEL_FE_BE
    ? state.apiContracts
    : realContracts.length > 0
      ? realContracts
      : state.apiContracts;
  if (
    !ENABLE_PARALLEL_FE_BE &&
    realContracts.length === 0 &&
    state.apiContracts.length > 0
  ) {
    console.warn(
      `[Supervisor] dispatchFrontendWorkers: no BE-extracted contracts available; falling back to ${state.apiContracts.length} TRD-derived contracts for FE prompt.`,
    );
  }
  if (ENABLE_PARALLEL_FE_BE) {
    console.log(
      `[Supervisor] dispatchFrontendWorkers: parallel mode — FE binds ${state.apiContracts.length} authoritative upfront ENDPOINTS contracts.`,
    );
  }

  // Build a rich API reference block from the BE-extracted contracts.
  // This is injected into projectContext so LLM cannot miss it.
  let apiReferenceBlock = "";
  if (feContracts.length > 0) {
    const contractLines = feContracts.map((c) => {
      const lines = [
        `### ${c.method} ${c.endpoint}`,
        `- **Service**: ${c.service}`,
        `- **Auth**: ${c.authType ?? "none"}`,
      ];
      if (c.description) lines.push(`- **Description**: ${c.description}`);
      if (c.requestFields && c.requestFields !== "none") {
        lines.push(`- **Request body**: \`${c.requestFields}\``);
      }
      if (c.responseFields && c.responseFields !== "none") {
        lines.push(`- **Response**: \`${c.responseFields}\``);
      }
      return lines.join("\n");
    });
    apiReferenceBlock = [
      "\n\n---\n\n## REAL Backend API Reference (use these EXACT paths and field names)",
      "⚠️  ALL frontend API calls MUST use these endpoints. DO NOT invent endpoints or use mock data.",
      "⚠️  For auth-required endpoints, read the token from localStorage key `pomotrack_token`.",
      "",
      contractLines.join("\n\n"),
    ].join("\n");
  }

  const feContext = [
    state.frontendDesignContext
      ? `${state.projectContext}\n\n---\n\n${state.frontendDesignContext}`
      : state.projectContext,
    apiReferenceBlock,
  ]
    .filter(Boolean)
    .join("");

  const _fePreview = feContext.slice(0, 50).replace(/\n/g, "↵");
  console.log(
    `[Supervisor] feContext (${feContext.length} chars): "${_fePreview}…" — writing to /tmp/fe-context-debug.txt`,
  );
  try {
    require("fs").writeFileSync(
      "/tmp/fe-context-debug.txt",
      feContext,
      "utf-8",
    );
  } catch (e) {
    console.warn("[Supervisor] feContext write failed:", e);
  }

  const feWorkerCount = feChunks.length;
  const sends: Send[] = feChunks.map(
    (tasks, i) =>
      new Send("fe_worker", {
        role: "frontend" as CodingAgentRole,
        workerLabel:
          feWorkerCount > 1 ? `Frontend Dev #${i + 1}` : "Frontend Dev",
        tasks,
        outputDir: state.outputDir,
        projectContext: feContext,
        codingMode: state.codingMode,
        fileRegistrySnapshot: state.fileRegistry,
        apiContractsSnapshot: feContracts,
        scaffoldProtectedPaths: state.scaffoldProtectedPaths ?? [],
        currentTaskIndex: 0,
        ralphConfig: state.ralphConfig,
        sessionId: state.sessionId,
        prdSpec: state.prdSpec,
      }),
  );

  return sends;
}

/**
 * BE workers self-declare their endpoints in `_meta/routes/<slug>.json`.
 * This is the cheapest and most accurate source of truth: BE knows its own
 * TypeScript types and route mount paths, no need to reverse-engineer.
 *
 * Returns null if no manifest dir exists or all files are unparseable —
 * caller should fall back to LLM/regex extraction.
 */
async function readRoutesManifest(
  outputDir: string,
): Promise<ApiContract[] | null> {
  const dir = path.join(outputDir, "_meta", "routes");
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return null;
  }
  const jsonFiles = entries.filter((f) => f.toLowerCase().endsWith(".json"));
  if (jsonFiles.length === 0) return null;

  const contracts: ApiContract[] = [];
  const seen = new Set<string>();
  let parsedFiles = 0;

  for (const fname of jsonFiles) {
    const raw = await fsRead(path.join("_meta", "routes", fname), outputDir);
    if (raw.startsWith("FILE_NOT_FOUND") || raw.startsWith("REJECTED")) {
      continue;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.warn(
        `[Supervisor] readRoutesManifest: ${fname} not valid JSON, skipping`,
      );
      continue;
    }
    if (!Array.isArray(parsed)) {
      console.warn(
        `[Supervisor] readRoutesManifest: ${fname} root is not an array, skipping`,
      );
      continue;
    }
    parsedFiles++;

    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const r = item as Record<string, unknown>;
      const method =
        typeof r.method === "string" ? r.method.toUpperCase().trim() : "";
      const endpoint = typeof r.endpoint === "string" ? r.endpoint.trim() : "";
      if (!method || !endpoint) continue;
      const key = `${method} ${endpoint}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const reqRaw = typeof r.requestFields === "string" ? r.requestFields : "";
      const resRaw =
        typeof r.responseFields === "string" ? r.responseFields : "";
      const reqFields = reqRaw && reqRaw !== "none" ? reqRaw : undefined;
      const resFields = resRaw && resRaw !== "none" ? resRaw : undefined;

      contracts.push({
        service:
          typeof r.service === "string" && r.service.length > 0
            ? r.service
            : fname.replace(/\.json$/i, ""),
        method,
        endpoint,
        requestFields: reqFields,
        responseFields: resFields,
        authType: typeof r.authType === "string" ? r.authType : "none",
        description:
          typeof r.description === "string" ? r.description : undefined,
        schema: [
          reqFields ? `request: ${reqFields}` : "",
          resFields ? `response: ${resFields}` : "",
        ]
          .filter(Boolean)
          .join(" | "),
        generatedBy: "extract_real_contracts_manifest",
      });
    }
  }

  if (parsedFiles === 0 || contracts.length === 0) return null;

  console.log(
    `[Supervisor] readRoutesManifest: loaded ${contracts.length} endpoint(s) from ${parsedFiles} manifest file(s) in _meta/routes/`,
  );
  return contracts;
}

/**
 * Cheap sanity check: for each manifest entry, confirm the HTTP verb literal
 * appears in some BE source file. Catches BE declaring endpoints it never
 * wired up (hallucinated manifest). Field-level accuracy is NOT checked —
 * trust BE's self-report there.
 *
 * Returns the verified subset and a list of dropped entries for logging.
 */
async function verifyManifestAgainstSource(
  manifest: ApiContract[],
  state: SupervisorState,
): Promise<{ verified: ApiContract[]; dropped: ApiContract[] }> {
  const beFiles = state.fileRegistry.filter(
    (f) =>
      (f.role === "backend" ||
        (f.role === "fullstack" && f.path.startsWith("backend/"))) &&
      /\.(ts|js)$/.test(f.path),
  );
  const haystackParts: string[] = [];
  for (const f of beFiles) {
    const content = await fsRead(f.path, state.outputDir);
    if (!content.startsWith("FILE_NOT_FOUND")) haystackParts.push(content);
  }
  const haystack = haystackParts.join("\n");
  if (haystack.length === 0) {
    return { verified: manifest, dropped: [] };
  }

  const verified: ApiContract[] = [];
  const dropped: ApiContract[] = [];
  for (const c of manifest) {
    // Look for either `.get(`/`.post(` etc. OR decorator-style `@Get(`/`@Post(`.
    const verbRe = new RegExp(`(?:\\.|@)${c.method.toLowerCase()}\\s*\\(`, "i");
    if (verbRe.test(haystack)) {
      verified.push(c);
    } else {
      dropped.push(c);
    }
  }
  return { verified, dropped };
}

/**
 * After BE Workers complete, extract real routes from generated files
 * to supplement/correct the api_contract_phase contracts.
 *
 * Resolution order:
 *   1. `_meta/routes/*.json` manifest (BE self-declared, has real TS types).
 *   2. LLM extraction from BE route files (~$0.01-0.05/run).
 *   3. Regex fallback (path-only, no field info).
 */
/**
 * Schema-change arbiter (CODEGEN_HARDENING — P2).
 *
 * Runs at the backend→frontend boundary. Backend workers that found the shared
 * schema genuinely wrong don't edit it (that's what desyncs front/back); they
 * append a structured request to `.ralph/schema-change-requests.jsonl`. Here we
 * batch-review those PENDING requests against the PRD, apply the accepted ones
 * to the SINGLE canonical `.blueprint/shared-schema.ts`, re-distribute the copies
 * (so FE/BE stay byte-identical), and record which producer/consumer tasks the
 * change makes stale so the verify loop re-checks them.
 *
 * No pending requests ⇒ instant no-op (the overwhelmingly common case — zero LLM
 * cost). Any failure degrades to a logged warning + recorded unresolved problem;
 * it never blocks the pipeline.
 */
const SCHEMA_ARBITER_SYSTEM_PROMPT = `You are the contract-owner arbiter for a code-generation pipeline. The shared TypeScript \`schema.ts\` is the SINGLE source of truth for every type that crosses the API boundary. Backend workers have filed schema-change-requests claiming the schema is wrong for the PRD.

For EACH request, decide accept or reject, grounded ONLY in the PRD:
- ACCEPT only when the PRD genuinely requires the change AND the current schema cannot express it. Prefer the smallest edit (add a field / add a type), never gratuitous renames.
- REJECT when the worker can satisfy the PRD with the schema AS-IS, when the request contradicts the PRD, or when it's speculative.

If you accept ANY request, return the COMPLETE updated schema.ts (the full file, with accepted edits applied and everything else byte-for-byte unchanged). If you accept none, return updatedSchema=null.

Output STRICT JSON only (no markdown):
{
  "decisions": [
    { "taskId": "...", "typeName": "...", "field": "..."|null, "decision": "accepted"|"rejected", "rationale": "PRD-grounded reason", "changedTypes": ["TypeName", ...] }
  ],
  "updatedSchema": "<full schema.ts source>" | null
}
"changedTypes" lists every exported type whose DEFINITION you altered for that request (empty for rejected).`;

interface ArbiterDecisionRaw {
  taskId?: string;
  typeName?: string;
  field?: string | null;
  decision?: string;
  rationale?: string;
  changedTypes?: string[];
}

async function schemaArbiter(
  state: SupervisorState,
): Promise<Partial<SupervisorState>> {
  let pending: SchemaChangeRequest[];
  try {
    const [requests, decisions] = await Promise.all([
      readSchemaChangeRequests(state.outputDir),
      readSchemaChangeDecisions(state.outputDir),
    ]);
    pending = pendingRequests(requests, decisions);
  } catch {
    return {};
  }
  if (pending.length === 0) return {};

  console.log(
    `[Supervisor] schemaArbiter: ${pending.length} pending schema-change-request(s) — reviewing against PRD.`,
  );

  const canonical = await fsRead(
    ".blueprint/shared-schema.ts",
    state.outputDir,
  );
  if (canonical.startsWith("FILE_NOT_FOUND") || !canonical.trim()) {
    // No canonical schema to amend — record and move on.
    await recordUnresolvedProblem(state.outputDir, {
      sessionId: state.sessionId,
      gate: "schema-arbiter",
      phase: "backend",
      category: "contract-coverage",
      summary: `${pending.length} schema-change-request(s) filed but no .blueprint/shared-schema.ts exists to amend`,
      evidence: pending.map((p) => `${p.taskId}: ${p.typeName} — ${p.reason}`),
    }).catch(() => {});
    return {};
  }

  const prdContext = state.prdSpec
    ? JSON.stringify(state.prdSpec).slice(0, 12000)
    : state.projectContext.slice(0, 8000);

  const requestsBlock = pending
    .map(
      (p, i) =>
        `${i + 1}. taskId=${p.taskId} type=${p.typeName}${p.field ? ` field=${p.field}` : ""} kind=${p.kind} endpoint=${p.endpoint ?? "(n/a)"}\n   reason: ${p.reason}\n   proposedChange: ${p.proposedChange}`,
    )
    .join("\n");

  const messages: ChatMessage[] = [
    { role: "system", content: SCHEMA_ARBITER_SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        "## PRD (authority for every decision)",
        prdContext,
        "",
        "## Current shared schema.ts (the single source of truth)",
        "```typescript",
        canonical.slice(0, 16000),
        "```",
        "",
        "## Pending schema-change-requests",
        requestsBlock,
        "",
        "Review each request and return the STRICT JSON described.",
      ].join("\n"),
    },
  ];

  const chain = resolveCodingChain(state.codingMode, "taskBreakdown", "gpt-4o");
  let parsed: {
    decisions?: ArbiterDecisionRaw[];
    updatedSchema?: string | null;
  };
  try {
    const response = await chatCompletionWithFallback(messages, chain, {
      temperature: 0.1,
      max_tokens: 65536,
      forceOpenRouter: forceOpenRouterForMode(state.codingMode),
    });
    recordSupervisorLlmUsage({
      sessionId: state.sessionId,
      stage: "schema_arbiter",
      model: response.model,
      usage: response.usage,
      costUsd: estimateCost(response.model, response.usage),
    });
    const raw = (response.choices[0]?.message?.content ?? "").trim();
    const jsonStr = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    parsed = JSON.parse(jsonStr);
  } catch (err) {
    console.warn(
      `[Supervisor] schemaArbiter: review failed (continuing without schema change): ${err instanceof Error ? err.message : String(err)}`,
    );
    await recordUnresolvedProblem(state.outputDir, {
      sessionId: state.sessionId,
      gate: "schema-arbiter",
      phase: "backend",
      category: "contract-coverage",
      summary: `schema arbiter could not review ${pending.length} schema-change-request(s)`,
      evidence: pending.map((p) => `${p.taskId}: ${p.typeName} — ${p.reason}`),
    }).catch(() => {});
    return {};
  }

  const decisionsRaw = Array.isArray(parsed.decisions) ? parsed.decisions : [];
  const byKey = new Map<string, SchemaChangeRequest>();
  for (const p of pending)
    byKey.set(`${p.taskId}::${p.typeName}::${p.field ?? ""}`, p);

  const accepted: SchemaChangeDecision[] = [];
  const all: SchemaChangeDecision[] = [];
  const decidedAt = new Date().toISOString();
  for (const d of decisionsRaw) {
    const key = `${d.taskId ?? ""}::${d.typeName ?? ""}::${d.field ?? ""}`;
    const req =
      byKey.get(key) ??
      pending.find((p) => p.taskId === d.taskId && p.typeName === d.typeName);
    if (!req) continue;
    const decision: SchemaChangeDecision = {
      request: req,
      decision: d.decision === "accepted" ? "accepted" : "rejected",
      rationale: typeof d.rationale === "string" ? d.rationale : "",
      changedTypes: Array.isArray(d.changedTypes)
        ? d.changedTypes.filter((t): t is string => typeof t === "string")
        : [],
      decidedAt,
    };
    all.push(decision);
    if (decision.decision === "accepted") accepted.push(decision);
  }

  // Apply the updated schema only when something was accepted and the model
  // returned a non-trivial replacement.
  const updated =
    typeof parsed.updatedSchema === "string" ? parsed.updatedSchema.trim() : "";
  if (accepted.length > 0 && updated && updated !== canonical.trim()) {
    await fsWrite(".blueprint/shared-schema.ts", updated, state.outputDir);
    // Re-distribute from the just-amended canonical (explicit sourceDir so it
    // reads THIS project's blueprint, not the agentic-builder cwd's).
    const tier: "S" | "M" | "L" = (await fsRead(
      "backend/package.json",
      state.outputDir,
    ).then((c) => !c.startsWith("FILE_NOT_FOUND")))
      ? "M"
      : "S";
    try {
      const dist = await distributeSharedSchema(tier, state.outputDir, {
        sourceDir: state.outputDir,
      });
      console.log(
        `[Supervisor] schemaArbiter: applied ${accepted.length} change(s); re-distributed schema to ${dist.written.join(", ") || "(no targets)"}.`,
      );
    } catch (e) {
      console.warn(
        `[Supervisor] schemaArbiter: re-distribute failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  } else if (accepted.length > 0) {
    console.warn(
      "[Supervisor] schemaArbiter: accepted changes but no usable updatedSchema returned — leaving schema unchanged.",
    );
  }

  // Persist every decision to the ledger (idempotent dedupe handled by pending()).
  for (const d of all) {
    await appendSchemaChangeDecision(state.outputDir, d).catch(() => {});
  }

  // Compute + record stale producer/consumer tasks so the verify loop re-checks them.
  const changedTypes = acceptedChangedTypes(accepted);
  if (changedTypes.length > 0) {
    const stale = staleTaskIds(
      changedTypes,
      state.tasks.map((t) => ({
        id: t.id,
        text: `${t.title} ${t.description}`,
      })),
    );
    if (stale.length > 0) {
      await recordUnresolvedProblem(state.outputDir, {
        sessionId: state.sessionId,
        gate: "schema-arbiter",
        phase: "backend",
        category: "contract-coverage",
        summary: `schema changed (${changedTypes.join(", ")}); ${stale.length} task(s) now reference an amended type and should be re-verified`,
        evidence: [
          `Changed types: ${changedTypes.join(", ")}`,
          `Stale tasks: ${stale.join(", ")}`,
        ],
      }).catch(() => {});
      console.log(
        `[Supervisor] schemaArbiter: ${stale.length} task(s) flagged stale by schema change: ${stale.join(", ")}`,
      );
    }
  }

  return {};
}

async function extractRealContracts(
  state: SupervisorState,
): Promise<Partial<SupervisorState>> {
  // Single-source the API prefix BEFORE any frontend worker runs: align the
  // frontend client's API_BASE default to the backend's ACTUAL mount prefix
  // (`new Router({ prefix })`). This makes "base + business-path == backend
  // route" hold by construction, so frontend workers only ever pass the
  // business path and can't split/double the `/api` or `/v1` segments.
  try {
    const sync = await syncClientApiBase({
      outputDir: state.outputDir,
      emitter: getRepairEmitter(state.sessionId),
    });
    if (sync.applied) {
      console.log(`[Supervisor] extractRealContracts: ${sync.reason}`);
    }
  } catch (e) {
    console.warn(
      `[Supervisor] extractRealContracts: client API_BASE sync skipped (${e instanceof Error ? e.message : String(e)})`,
    );
  }

  // 1. Prefer BE-declared manifest when present.
  const manifest = await readRoutesManifest(state.outputDir);
  if (manifest && manifest.length > 0) {
    const { verified, dropped } = await verifyManifestAgainstSource(
      manifest,
      state,
    );
    if (dropped.length > 0) {
      console.warn(
        `[Supervisor] extractRealContracts: dropped ${dropped.length} manifest entry(s) that don't appear in BE source: ${dropped
          .map((d) => `${d.method} ${d.endpoint}`)
          .join(", ")}`,
      );
    }
    if (verified.length > 0) {
      console.log(
        `[Supervisor] extractRealContracts: using ${verified.length} contract(s) from BE manifest (skipping LLM extraction)`,
      );
      return { apiContracts: verified };
    }
    // Manifest existed but nothing verified — fall through to LLM/regex.
    console.warn(
      "[Supervisor] extractRealContracts: manifest had entries but none verified against source; falling back to extraction.",
    );
  }

  // 2. Legacy: LLM + regex extraction.
  // Collect backend route/controller files and shared type files
  // Fullstack workers span backend/ AND frontend/; only their backend/ files
  // are routes. Constrain fullstack inclusion to backend/ so a fullstack
  // frontend api-client file (frontend/src/api/...) isn't mistaken for a route.
  const isBackendRouteFile = (f: (typeof state.fileRegistry)[number]) =>
    (f.role === "backend" ||
      (f.role === "fullstack" && f.path.startsWith("backend/"))) &&
    (f.path.includes("route") ||
      f.path.includes("controller") ||
      f.path.includes("handler") ||
      f.path.includes("api")) &&
    /\.(ts|js)$/.test(f.path);
  const beFiles = state.fileRegistry.filter(isBackendRouteFile);

  const typeFiles = state.fileRegistry
    .filter(
      (f) =>
        (f.role === "architect" ||
          f.role === "backend" ||
          (f.role === "fullstack" && f.path.startsWith("backend/"))) &&
        (f.path.includes("type") ||
          f.path.includes("interface") ||
          f.path.includes("schema") ||
          f.path.includes("model")) &&
        /\.(ts|js)$/.test(f.path),
    )
    .slice(0, 6);

  if (beFiles.length === 0) {
    console.log("[Supervisor] extractRealContracts: no BE route files found.");
    return {};
  }

  console.log(
    `[Supervisor] extractRealContracts: scanning ${beFiles.length} BE file(s) with LLM...`,
  );

  // Build file content context for LLM
  const fileParts: string[] = [];
  for (const file of [...beFiles.slice(0, 8), ...typeFiles]) {
    const content = await fsRead(file.path, state.outputDir);
    if (!content.startsWith("FILE_NOT_FOUND")) {
      fileParts.push(
        `### ${file.path}\n\`\`\`typescript\n${content.slice(0, 3000)}\n\`\`\``,
      );
    }
  }

  if (fileParts.length === 0) return {};

  const extractModelChain = resolveCodingChain(
    state.codingMode,
    "codeFix",
    "gpt-4o",
  );

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `You are a backend API analyst. Read the provided source files and extract every HTTP endpoint.
Output a JSON array only — no markdown, no explanation.
Each element:
{
  "service": "string (module/folder name, e.g. auth, sessions, users)",
  "endpoint": "string (full path with prefix, e.g. /api/auth/login)",
  "method": "GET|POST|PUT|PATCH|DELETE",
  "requestFields": "TypeScript type literal for request body, e.g. { email: string; password: string } or 'none'",
  "responseFields": "TypeScript type literal for success response, e.g. { success: boolean; data: { token: string; user: User } }",
  "auth": "none|bearer|session",
  "description": "one sentence"
}
Rules:
- Reconstruct the full path by combining router prefix + route prefix + route path.
- For request/response schemas, look at the TypeScript interfaces/types actually used by the handler.
- If a route uses auth middleware, set auth to "bearer".
- Be precise about field names and types — the frontend will use these to write its API calls.`,
    },
    {
      role: "user",
      content: [
        "Extract all API endpoints from the following backend source files.",
        "",
        ...fileParts,
        "",
        "Output a JSON array only.",
      ].join("\n"),
    },
  ];

  try {
    const response = await chatCompletionWithFallback(
      messages,
      extractModelChain,
      {
        temperature: 0.1,
        max_tokens: 4096,
        forceOpenRouter: forceOpenRouterForMode(state.codingMode),
      },
    );
    const raw = (response.choices[0]?.message?.content ?? "").trim();
    const costUsd = estimateCost(response.model, response.usage);
    recordSupervisorLlmUsage({
      sessionId: state.sessionId,
      stage: "extract_real_contracts",
      model: response.model,
      usage: response.usage,
      costUsd,
    });

    let parsed: Array<{
      service?: string;
      endpoint?: string;
      method?: string;
      requestFields?: string;
      responseFields?: string;
      auth?: string;
      description?: string;
    }> = [];

    try {
      const cleaned = raw
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();
      parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) parsed = [];
    } catch {
      console.warn(
        "[Supervisor] extractRealContracts: failed to parse LLM output, falling back to regex.",
      );
    }

    // Regex fallback for any route the LLM missed
    const regexContracts: ApiContract[] = [];
    for (const file of beFiles.slice(0, 8)) {
      const content = await fsRead(file.path, state.outputDir);
      if (content.startsWith("FILE_NOT_FOUND")) continue;
      const routePattern =
        /\.(get|post|put|patch|delete)\s*\(\s*["'`]([^"'`]+)["'`]/gi;
      let match;
      while ((match = routePattern.exec(content)) !== null) {
        const method = match[1].toUpperCase();
        const endpoint = match[2].startsWith("/") ? match[2] : `/${match[2]}`;
        const alreadyCovered = parsed.some(
          (p) => p.method?.toUpperCase() === method && p.endpoint === endpoint,
        );
        if (
          !alreadyCovered &&
          !regexContracts.some(
            (c) => c.method === method && c.endpoint === endpoint,
          )
        ) {
          regexContracts.push({
            service: file.path.split("/").slice(-2, -1)[0] ?? "api",
            endpoint,
            method,
            authType: "bearer",
            schema: "extracted by regex",
            generatedBy: "extract_real_contracts_regex",
          });
        }
      }
    }

    const llmContracts: ApiContract[] = parsed.map((item) => ({
      service: item.service ?? "api",
      endpoint: item.endpoint ?? "/",
      method: (item.method ?? "GET").toUpperCase(),
      requestFields:
        item.requestFields !== "none" ? item.requestFields : undefined,
      responseFields:
        item.responseFields !== "none" ? item.responseFields : undefined,
      authType: item.auth ?? "none",
      description: item.description,
      schema: [
        item.requestFields && item.requestFields !== "none"
          ? `request: ${item.requestFields}`
          : "",
        item.responseFields && item.responseFields !== "none"
          ? `response: ${item.responseFields}`
          : "",
      ]
        .filter(Boolean)
        .join(" | "),
      generatedBy: "extract_real_contracts_llm",
    }));

    const allContracts = [...llmContracts, ...regexContracts];

    console.log(
      `[Supervisor] extractRealContracts: extracted ${allContracts.length} real route(s) (${llmContracts.length} via LLM, ${regexContracts.length} via regex, cost: $${costUsd.toFixed(4)})`,
    );

    return { apiContracts: allContracts, totalCostUsd: costUsd };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(
      `[Supervisor] extractRealContracts: LLM error — ${msg}. Falling back to regex only.`,
    );

    // Pure regex fallback
    const fallbackContracts: ApiContract[] = [];
    for (const file of beFiles.slice(0, 8)) {
      const content = await fsRead(file.path, state.outputDir);
      if (content.startsWith("FILE_NOT_FOUND")) continue;
      const routePattern =
        /\.(get|post|put|patch|delete)\s*\(\s*["'`]([^"'`]+)["'`]/gi;
      let match;
      while ((match = routePattern.exec(content)) !== null) {
        const method = match[1].toUpperCase();
        const endpoint = match[2].startsWith("/") ? match[2] : `/${match[2]}`;
        if (
          !fallbackContracts.some(
            (c) => c.method === method && c.endpoint === endpoint,
          )
        ) {
          fallbackContracts.push({
            service: file.path.split("/").slice(-2, -1)[0] ?? "api",
            endpoint,
            method,
            authType: "bearer",
            schema: "extracted by regex",
            generatedBy: "extract_real_contracts_regex",
          });
        }
      }
    }
    return { apiContracts: fallbackContracts };
  }
}

// ─── Build gate ───

/**
 * Run pnpm/npm build for web and api packages. Returns error text if build
 * fails, empty string if it passes or no build script exists.
 */
async function runBuildGate(outputDir: string): Promise<string> {
  console.log("[Supervisor] Build gate: attempting pnpm run build...");

  const pkgRaw = await fsRead("package.json", outputDir);
  const frontendPkgRaw = await fsRead("frontend/package.json", outputDir);
  const backendPkgRaw = await fsRead("backend/package.json", outputDir);

  if (
    pkgRaw.startsWith("FILE_NOT_FOUND") &&
    frontendPkgRaw.startsWith("FILE_NOT_FOUND") &&
    backendPkgRaw.startsWith("FILE_NOT_FOUND")
  ) {
    return "";
  }

  if (
    pkgRaw.startsWith("FILE_NOT_FOUND") &&
    (!frontendPkgRaw.startsWith("FILE_NOT_FOUND") ||
      !backendPkgRaw.startsWith("FILE_NOT_FOUND"))
  ) {
    const targets = [
      !frontendPkgRaw.startsWith("FILE_NOT_FOUND")
        ? { name: "frontend", cwd: "frontend" }
        : null,
      !backendPkgRaw.startsWith("FILE_NOT_FOUND")
        ? { name: "backend", cwd: "backend" }
        : null,
    ].filter((v): v is { name: string; cwd: string } => Boolean(v));

    const failures: string[] = [];
    for (const target of targets) {
      try {
        const result = await shellExec(
          "pnpm run build 2>&1",
          path.join(outputDir, target.cwd),
          {
            timeout: 120_000,
          },
        );
        const out = (result.stderr || result.stdout || "").trim();
        if (
          result.exitCode !== 0 &&
          !/Missing script|ENOENT|not found/.test(out)
        ) {
          failures.push(
            `### ${target.name}\n\`\`\`\n${out.split("\n").slice(-40).join("\n")}\n\`\`\``,
          );
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!/Missing script|ENOENT|not found/.test(msg)) {
          failures.push(`### ${target.name}\n${msg.slice(0, 500)}`);
        }
      }
    }

    if (failures.length === 0) {
      console.log("[Supervisor] Build gate: PASSED for split M-tier targets.");
      return "";
    }

    console.log("[Supervisor] Build gate: FAILED for split M-tier targets.");
    return `## Build failed\n${failures.join("\n\n")}`;
  }

  let usesPnpm = false;
  try {
    const files = await listFiles(".", outputDir);
    usesPnpm = files.some(
      (f) => f.includes("pnpm-workspace.yaml") || f.includes("pnpm-lock.yaml"),
    );
  } catch {
    // ignore
  }

  const buildCmd = usesPnpm ? "pnpm run build 2>&1" : "npm run build 2>&1";

  try {
    const result = await shellExec(buildCmd, outputDir, { timeout: 120_000 });
    const out = (result.stderr || result.stdout || "").trim();

    if (result.exitCode === 0) {
      console.log("[Supervisor] Build gate: PASSED.");
      return "";
    }

    if (/Missing script|ENOENT|not found/.test(out)) {
      console.log("[Supervisor] Build gate: no build script found, skipping.");
      return "";
    }

    const lastLines = out.split("\n").slice(-40).join("\n");
    console.log(`[Supervisor] Build gate: FAILED.\n${lastLines.slice(0, 300)}`);
    return `## Build failed\n\`\`\`\n${lastLines}\n\`\`\``;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/Missing script|ENOENT|not found/.test(msg)) return "";
    return `## Build error\n${msg.slice(0, 500)}`;
  }
}

// ─── Phase-level verify + fix (agentic loop) ───

/**
 * RALPH Phase 2 — External Judge.
 * Runs `npm test` (or `npm run test`) and returns a trimmed error string when
 * tests fail, or an empty string when they pass.
 * Only called when `ralphConfig.enableTestVerification` is true.
 */
async function runTestVerification(outputDir: string): Promise<string> {
  console.log("[Supervisor] RALPH: running npm test as external judge...");
  try {
    const result = await shellExec(
      "npm run test -- --run 2>&1 | tail -40",
      outputDir,
      { timeout: 120_000 },
    );
    const out = (result.stdout || result.stderr || "").trim();
    if (result.exitCode !== 0) {
      const failedLines = out
        .split("\n")
        .filter((l) => /fail|error|✗|✕|FAIL|ERROR|AssertionError/i.test(l))
        .slice(0, 20)
        .join("\n");
      const summary = failedLines || out.slice(0, 1000);
      console.log(
        `[Supervisor] RALPH: npm test FAILED:\n${summary.slice(0, 200)}`,
      );
      return `## Test failures (RALPH external judge)\n${summary}`;
    }
    console.log("[Supervisor] RALPH: npm test PASSED.");
    return "";
  } catch (e) {
    // If no test script exists, silently skip.
    const msg = e instanceof Error ? e.message : String(e);
    if (/Missing script|ENOENT|not found/.test(msg)) return "";
    return `## Test runner error\n${msg.slice(0, 500)}`;
  }
}

function formatWorkerTscWarningsForRoles(
  phaseResults: PhaseResult[],
  roles: CodingAgentRole[],
): string {
  const roleSet = new Set(roles);
  const chunks: string[] = [];
  for (const pr of phaseResults) {
    if (!roleSet.has(pr.role)) continue;
    for (const tr of pr.taskResults) {
      if (tr.status !== "completed_with_warnings" || !tr.warnings?.length) {
        continue;
      }
      // Best-effort local-TDD failures are NOT re-driven here — they are handed
      // to the integration TDD stage (formatTddRepairBlock). Drop any warning
      // entry that is a local-TDD failure so phase-verify only sees tsc/file-plan
      // issues it actually owns.
      const text = tr.warnings
        .filter((w) => !w.trimStart().startsWith(WORKER_LOCAL_TDD_FAIL_PREFIX))
        .join("\n")
        .trim();
      if (!text) continue;
      chunks.push(
        `### ${tr.taskId} (${pr.workerLabel})\n${text.slice(0, 6000)}`,
      );
    }
  }
  if (chunks.length === 0) return "";
  return [
    "",
    "## Worker task verify warnings (from per-task checks — fix all issues)",
    "",
    ...chunks,
    "",
  ].join("\n");
}

type PhaseVerifyAndFixOptions = {
  /** Which worker phase results to surface as initial hints (e.g. BE+test vs FE). */
  workerHintRoles?: CodingAgentRole[];
};

type VerifyFixLlmOptions = Omit<OpenRouterOptions, "model"> & {
  temperature: number;
  max_tokens: number;
};

function shouldUseDeepSeekDirectForVerifyFix(): boolean {
  return process.env.VERIFY_FIX_PROVIDER?.trim().toLowerCase() === "deepseek";
}

async function callVerifyFixLlm(
  label: string,
  messages: ChatMessage[],
  modelChain: string[],
  options: VerifyFixLlmOptions,
): Promise<OpenRouterResponse> {
  if (shouldUseDeepSeekDirectForVerifyFix() && isDeepSeekV4Provider()) {
    const dsModel =
      process.env.DEEPSEEK_V4_MODEL?.trim() || DEEPSEEK_V4_DEFAULT_MODEL;
    const dsBase =
      process.env.DEEPSEEK_V4_BASE_URL?.trim() || DEEPSEEK_V4_DEFAULT_BASE;
    console.log(
      `[LLM] provider=deepseek-v4-direct  stage=phase_verify_fix  model=${dsModel}  base=${dsBase}`,
    );
    try {
      return await chatCompletionsDeepSeekV4(messages, options);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (isToolSequenceValidationError(msg)) {
        const removed = countRemovedOrphanToolMessages(messages);
        console.warn(
          `${label}: DeepSeek detected tool-call sequence error; cleaned ${removed} orphan tool message(s) and retrying once.`,
        );
        if (removed > 0) {
          try {
            return await chatCompletionsDeepSeekV4(messages, options);
          } catch (retryErr) {
            const retryMsg =
              retryErr instanceof Error ? retryErr.message : String(retryErr);
            console.warn(
              `${label}: DeepSeek retry failed (${retryMsg.slice(0, 200)}). Falling back to OpenRouter chain.`,
            );
          }
        }
      } else {
        console.warn(
          `${label}: DeepSeek direct failed (${msg.slice(0, 200)}). Falling back to OpenRouter chain.`,
        );
      }
    }
  } else if (shouldUseDeepSeekDirectForVerifyFix()) {
    console.warn(
      `${label}: VERIFY_FIX_PROVIDER=deepseek but DEEPSEEK_API_KEY is not configured; falling back to OpenRouter chain.`,
    );
  }

  return callWithOrphanToolRetry(label, messages, modelChain, options);
}

/**
 * Deterministic auto-fix for well-known convention violations.
 *
 * Runs before the LLM-driven phase so mechanical fixes don't burn LLM tokens
 * and don't risk the LLM "creatively" inventing inconsistent fixes.
 *
 * Covers:
 *  1. `@shared/...` import alias → `@project/shared/...` (Vite/tsconfig canonical).
 *  2. Residual-only canonical/residual pairs (e.g. `backend/src/middlewares/` when
 *     `backend/src/middleware/` is absent): rename residual → canonical on disk
 *     and rewrite imports that reference the residual segment.
 *
 * When BOTH canonical and residual exist the merge decision is genuinely
 * ambiguous (file contents may diverge) — we leave that to the LLM and surface
 * the conflict as an `unfixable` note so the system prompt can call it out.
 */
async function autoApplyConventionFixes(outputDir: string): Promise<{
  fixedFiles: string[];
  notes: string[];
  unfixable: string[];
}> {
  const fixedFiles = new Set<string>();
  const notes: string[] = [];
  const unfixable: string[] = [];

  const allFiles = await listFiles(".", outputDir);
  const sourceFiles = allFiles.filter(
    (f) =>
      /\.(ts|tsx|js|jsx|mts|cts)$/.test(f) &&
      !f.includes("node_modules") &&
      !f.startsWith("dist/") &&
      !f.startsWith(".next/") &&
      !f.startsWith("build/"),
  );

  // ── Rule 1: @shared/ import alias rewrite ───────────────────────────────
  let sharedAliasHits = 0;
  for (const rel of sourceFiles) {
    const content = await fsRead(rel, outputDir);
    if (
      content.startsWith("FILE_NOT_FOUND") ||
      content.startsWith("REJECTED")
    ) {
      continue;
    }
    if (!/@shared\//.test(content)) continue;
    const rewritten = content
      .replace(/(from\s+["'])@shared\//g, "$1@project/shared/")
      .replace(/(import\s+["'])@shared\//g, "$1@project/shared/")
      .replace(/(require\(\s*["'])@shared\//g, "$1@project/shared/");
    if (rewritten !== content) {
      await fsWrite(rel, rewritten, outputDir);
      fixedFiles.add(rel);
      sharedAliasHits += 1;
    }
  }
  if (sharedAliasHits > 0) {
    notes.push(
      `Rewrote "@shared/..." → "@project/shared/..." imports in ${sharedAliasHits} file(s).`,
    );
  }

  // ── Rule 2: canonical/residual relocation ──────────────────────────────
  // Each pair: { canonical, residual, importSegmentBefore, importSegmentAfter }
  // `importSegment*` are substrings we can safely swap inside import specifiers
  // to keep references consistent after a rename. They are chosen narrow enough
  // to avoid collateral rewrites.
  const pairs: Array<{
    canonical: string;
    residual: string;
    kind: "file" | "directory";
    importSegmentBefore: string;
    importSegmentAfter: string;
  }> = [
    {
      canonical: "frontend/src/contexts/AuthContext.tsx",
      residual: "frontend/src/context/AuthContext.tsx",
      kind: "file",
      importSegmentBefore: "/context/AuthContext",
      importSegmentAfter: "/contexts/AuthContext",
    },
    {
      // PLURAL is canonical: the M-tier / L-tier scaffolds ship
      // `backend/src/middlewares/` (and so do all _optional/auth-*
      // overlays). role-prompts.ts:438, scaffold-spec.ts:148/188 and
      // task-breakdown-agent.ts:116 all repeat the plural convention.
      // This rule was previously inverted, which caused every run to
      // rename the correct scaffold dir into singular and rewrite ~26
      // import paths — pure churn with no upside.
      canonical: "backend/src/middlewares/",
      residual: "backend/src/middleware/",
      kind: "directory",
      importSegmentBefore: "/middleware/",
      importSegmentAfter: "/middlewares/",
    },
    {
      canonical: "backend/src/db.ts",
      residual: "backend/src/database/connection.ts",
      kind: "file",
      importSegmentBefore: "/database/connection",
      importSegmentAfter: "/db",
    },
    {
      canonical: "backend/src/db.ts",
      residual: "backend/src/config/database.ts",
      kind: "file",
      importSegmentBefore: "/config/database",
      importSegmentAfter: "/db",
    },
    {
      canonical: "frontend/src/views/NotFoundPage.tsx",
      residual: "frontend/src/views/NotFound.tsx",
      kind: "file",
      importSegmentBefore: "/views/NotFound",
      importSegmentAfter: "/views/NotFoundPage",
    },
  ];

  for (const pair of pairs) {
    const canonicalAbs = path.join(outputDir, pair.canonical);
    const residualAbs = path.join(outputDir, pair.residual);
    const canonicalExists = await pathExistsUnderOutput(
      outputDir,
      pair.canonical,
    );
    const residualExists = await pathExistsUnderOutput(
      outputDir,
      pair.residual,
    );

    if (!residualExists) continue;

    if (canonicalExists) {
      unfixable.push(
        `Both "${pair.canonical}" and "${pair.residual}" exist — cannot auto-merge safely. Keep the canonical and delete or merge the residual.`,
      );
      continue;
    }

    // Only residual exists → relocate to canonical path + rewrite imports.
    try {
      await fs.mkdir(path.dirname(canonicalAbs), { recursive: true });
      await fs.rename(residualAbs, canonicalAbs);
      notes.push(
        `Renamed residual ${pair.kind} "${pair.residual}" → canonical "${pair.canonical}".`,
      );

      // Rewrite imports that reference the residual segment.
      let rewriteHits = 0;
      for (const rel of sourceFiles) {
        // The moved file itself may now live at the canonical path — still
        // re-read by the original rel is fine (it has been moved, read will
        // return FILE_NOT_FOUND).
        const content = await fsRead(rel, outputDir);
        if (
          content.startsWith("FILE_NOT_FOUND") ||
          content.startsWith("REJECTED")
        ) {
          continue;
        }
        if (!content.includes(pair.importSegmentBefore)) continue;

        // Guard: only rewrite occurrences inside import/require string
        // specifiers; a bare substring in a comment could also match but that
        // is low risk and such rewrites are harmless.
        const importSpecifierRe = new RegExp(
          `((?:from|import|require\\(\\s*)\\s*["'][^"']*?)${escapeRegExp(
            pair.importSegmentBefore,
          )}`,
          "g",
        );
        const rewritten = content.replace(
          importSpecifierRe,
          (_m, prefix) => `${prefix}${pair.importSegmentAfter}`,
        );
        if (rewritten !== content) {
          await fsWrite(rel, rewritten, outputDir);
          fixedFiles.add(rel);
          rewriteHits += 1;
        }
      }
      if (rewriteHits > 0) {
        notes.push(
          `  ↳ rewrote import paths in ${rewriteHits} file(s) to track the rename.`,
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      unfixable.push(
        `Failed to rename "${pair.residual}" → "${pair.canonical}": ${msg}. LLM must relocate manually.`,
      );
    }
  }

  return {
    fixedFiles: [...fixedFiles],
    notes,
    unfixable,
  };
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Merged phase verify + fix as a single agentic loop.
 *
 * The LLM is given bash, read_file, write_file, list_files, and grep tools.
 * It installs deps, runs `prisma generate`, runs `tsc`, reads error files,
 * writes fixes, and keeps iterating until it calls `report_done` or the model
 * stops making callable progress.
 *
 * Returns { scaffoldErrors: "" } on success, { scaffoldErrors: <errors> } on failure.
 * Replaces the old separate phaseVerify + phaseFix nodes and their graph loop.
 */
async function phaseVerifyAndFix(
  state: SupervisorState,
  options?: PhaseVerifyAndFixOptions,
): Promise<Partial<SupervisorState>> {
  const label = "[Supervisor] VerifyFix";

  // Skip backend verify+fix when the project has no backend tasks (frontend-only project).
  // Frontend TypeScript errors will be caught by fe_phase_verify that runs afterwards.
  const isBackendPhase = options?.workerHintRoles?.includes("backend");
  const isFrontendPhase = options?.workerHintRoles?.includes("frontend");
  if (isBackendPhase && state.backendTasks.length === 0) {
    console.log(
      `${label}: skipping backend verify (frontend-only project, no backend tasks).`,
    );
    return { scaffoldErrors: undefined, scaffoldFixAttempts: 0 };
  }

  console.log(
    `${label}: starting agentic loop (no fixed iteration cap; one context compression on overflow)...`,
  );

  const pm = await detectPackageManager(state.outputDir);
  const installCmd = buildInstallCommand(pm).replace("tail -30", "tail -10");
  const versionConstraints = await buildVersionConstraints(state.outputDir);

  type TsFixPlan = {
    scope: "backend" | "frontend" | "root";
    cwd: string;
    tscCommand: string;
  };

  const tsFixPlans: TsFixPlan[] = [];
  if (isFrontendPhase) {
    const hasFrontendTsconfig = !(
      await fsRead("frontend/tsconfig.json", state.outputDir)
    ).startsWith("FILE_NOT_FOUND");
    if (hasFrontendTsconfig) {
      const hasFrontendAppTsconfig = !(
        await fsRead("frontend/tsconfig.app.json", state.outputDir)
      ).startsWith("FILE_NOT_FOUND");
      tsFixPlans.push({
        scope: "frontend",
        cwd: path.join(state.outputDir, "frontend"),
        tscCommand: hasFrontendAppTsconfig
          ? "npx tsc -p tsconfig.app.json --pretty false 2>&1"
          : "npx tsc --noEmit --skipLibCheck --pretty false 2>&1",
      });
    }
  }
  if (isBackendPhase) {
    const hasBackendTsconfig = !(
      await fsRead("backend/tsconfig.json", state.outputDir)
    ).startsWith("FILE_NOT_FOUND");
    if (hasBackendTsconfig) {
      tsFixPlans.push({
        scope: "backend",
        cwd: path.join(state.outputDir, "backend"),
        tscCommand: "npx tsc --noEmit --skipLibCheck --pretty false 2>&1",
      });
    }
  }
  if (!isFrontendPhase && !isBackendPhase) {
    const hasRootTsconfig = !(
      await fsRead("tsconfig.json", state.outputDir)
    ).startsWith("FILE_NOT_FOUND");
    if (hasRootTsconfig) {
      tsFixPlans.push({
        scope: "root",
        cwd: state.outputDir,
        tscCommand: "npx tsc --noEmit --skipLibCheck --pretty false 2>&1",
      });
    }
  }

  const autoFixNotes: string[] = [];

  // ── Deterministic convention auto-fix (runs before ESLint / ts-fix) ─────
  // Mechanical fixes the LLM doesn't need to burn tokens on: @shared/ alias
  // rewrite and residual-only canonical/residual relocations. Unfixable
  // conflicts (both paths exist) are surfaced into the prompt below.
  try {
    const conv = await autoApplyConventionFixes(state.outputDir);
    if (conv.fixedFiles.length > 0) {
      console.log(
        `${label}: pre-LLM convention auto-fix touched ${conv.fixedFiles.length} file(s).`,
      );
      for (const note of conv.notes) {
        autoFixNotes.push(`convention: ${note}`);
      }
    }
    for (const line of conv.unfixable) {
      autoFixNotes.push(`convention (unfixable): ${line}`);
    }
    getRepairEmitter(state.sessionId)({
      stage: "preflight-convention-fix",
      event: "convention_autofix_applied",
      details: {
        phase: isBackendPhase
          ? "backend"
          : isFrontendPhase
            ? "frontend"
            : "root",
        fixedFileCount: conv.fixedFiles.length,
        fixedFiles: conv.fixedFiles.slice(0, 20),
        notes: conv.notes,
        unfixable: conv.unfixable,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    autoFixNotes.push(`convention auto-fix skipped due to error: ${msg}`);
    getRepairEmitter(state.sessionId)({
      stage: "preflight-convention-fix",
      event: "convention_autofix_error",
      details: { message: msg },
    });
  }

  let autoFixAllPassed = tsFixPlans.length > 0;
  for (const plan of tsFixPlans) {
    const autoFixCommand =
      plan.scope === "frontend"
        ? 'npx eslint --fix "src/**/*.{ts,tsx}" 2>&1'
        : "npx --no-install ts-fix --tsconfig ./tsconfig.json 2>&1";
    const autoFixLabel = plan.scope === "frontend" ? "eslint --fix" : "ts-fix";
    console.log(
      `${label}: pre-LLM ${autoFixLabel} (${plan.scope}) running: ${autoFixCommand}`,
    );
    const fixResult = await shellExec(autoFixCommand, plan.cwd, {
      timeout: 120_000,
    });
    autoFixNotes.push(
      `${plan.scope}: ${autoFixLabel} exit=${fixResult.exitCode}`,
    );

    const checkResult = await shellExec(plan.tscCommand, plan.cwd, {
      timeout: 120_000,
    });
    const checkOutput = `${checkResult.stdout}${checkResult.stderr}`.trim();
    if (checkResult.exitCode !== 0 && checkOutput.includes("error TS")) {
      autoFixAllPassed = false;
      autoFixNotes.push(
        `${plan.scope}: remaining tsc errors after ${autoFixLabel}:\n${checkOutput.slice(0, 1200)}`,
      );
    } else {
      autoFixNotes.push(`${plan.scope}: tsc passed after ${autoFixLabel}`);
    }
  }

  if (tsFixPlans.length > 0 && autoFixAllPassed) {
    console.log(`${label}: pre-LLM auto-fix fully resolved errors.`);
    return {
      scaffoldErrors: "",
      scaffoldFixAttempts: 0,
      totalCostUsd: 0,
    };
  }

  const systemPrompt = [
    "You are a Senior Engineer. Your job: verify the generated codebase compiles cleanly and fix ALL errors.",
    "",
    "## Workflow (follow in order)",
    `1. Run: \`${installCmd}\`  — install all dependencies`,
    "2. ORM handling:",
    "   - This generator standardises on Sequelize for SQL persistence. Do NOT introduce Prisma (`@prisma/client`, `prisma` CLI, or `prisma/schema.prisma`). If prior runs left Prisma artefacts behind, delete them and rewrite the persistence layer with Sequelize models in `backend/src/models/` (schema comes from `syncModels()` → `sequelize.sync()`; there are no migrations — declare indexes/FKs on the model).",
    "   - If a legacy `prisma/schema.prisma` still exists from an older run, `npx prisma generate` may run automatically as a compatibility fallback — but the correct fix is to remove the Prisma schema and replace it with equivalent Sequelize definitions, not to keep it.",
    "3. Run: `npx tsc --noEmit --skipLibCheck --pretty false 2>&1`",
    "4. For each TypeScript error:",
    "   a. Read the file with the error",
    "   b. Read any imported modules that are missing exports",
    "   c. Write the fix (only change what's needed to resolve the error)",
    "5. Re-run tsc to verify your fixes didn't introduce new errors",
    "6. Repeat until tsc exits 0, then call `report_done(status='pass', summary=...)`",
    "7. If you cannot fix all errors after exhausting options, call `report_done(status='fail', summary=<remaining errors>)`",
    "",
    "## Hard rules",
    "- Fix ONLY compile/type errors. Do NOT change business logic.",
    "- Do NOT switch HTTP frameworks (Express ↔ Fastify ↔ Koa).",
    "- If an export is missing from a module, add it to that module's source file.",
    "- Install missing npm packages: `pnpm add <pkg> --filter <workspace-name>`",
    "- Do not rewrite entire files — minimal targeted changes only.",
    ...(versionConstraints ? ["", versionConstraints] : []),
  ].join("\n");

  const workerHints =
    options?.workerHintRoles && options.workerHintRoles.length > 0
      ? formatWorkerTscWarningsForRoles(
          state.phaseResults,
          options.workerHintRoles,
        )
      : "";

  const autoFixHints =
    autoFixNotes.length > 0
      ? `\n## Pre-LLM auto-fix report\n${autoFixNotes.join("\n")}\n`
      : "";

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `Project directory: ${state.outputDir}\nPackage manager: ${pm}${workerHints}${autoFixHints}\nBegin verification and fix now.`,
    },
  ];

  const modelChain = resolveCodingChain(
    state.codingMode,
    "phaseVerifyFix",
    "claude-sonnet",
  );

  let iterations = 0;
  let finalStatus: "pass" | "fail" = "fail";
  let finalSummary = "";
  let totalCostUsd = 0;
  let contextCompressionUsed = false;

  /**
   * Estimate rough token count from messages (4 chars ≈ 1 token).
   * When the conversation grows beyond ~80k tokens, compact the middle portion
   * into a single summary assistant message, keeping system + last 6 messages.
   */
  async function compactMessagesIfNeeded(force = false): Promise<boolean> {
    if (contextCompressionUsed) return false;
    const result = await compactChatMessagesSemantically({
      messages,
      modelChain,
      label,
      force,
      stateSummary: [
        `phase=verify_fix`,
        `iterations=${iterations}`,
        `finalStatus=${finalStatus}`,
        finalSummary ? `currentSummary=${finalSummary.slice(0, 800)}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    });
    if (!result.compacted) return false;
    contextCompressionUsed = true;
    console.log(
      `${label}: semantic context compacted — removed ${result.removedMessages} messages (was ~${result.estimatedTokensBefore} tokens), orphan_tools_removed=${result.orphanToolsRemoved}`,
    );
    return true;
  }

  while (true) {
    iterations++;
    console.log(`${label}: iteration ${iterations}`);

    // Compact context if growing too large
    await compactMessagesIfNeeded();

    let resp;
    try {
      resp = await callVerifyFixLlm(label, messages, modelChain, {
        temperature: 0.2,
        max_tokens: 36000,
        tools: SUPERVISOR_VERIFY_TOOLS,
        tool_choice: "auto",
        forceOpenRouter: forceOpenRouterForMode(state.codingMode),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (isContextLengthError(msg) && (await compactMessagesIfNeeded(true))) {
        console.warn(
          `${label}: context limit hit; compacted once and retrying.`,
        );
        continue;
      }
      console.error(`${label}: LLM call failed: ${msg}`);
      break;
    }

    const choice = resp.choices[0];
    totalCostUsd += estimateCost(resp.model, resp.usage);
    recordSupervisorLlmUsage({
      sessionId: state.sessionId,
      stage: "phase_verify_fix",
      model: resp.model,
      usage: resp.usage,
      costUsd: estimateCost(resp.model, resp.usage),
    });

    // Append assistant message to conversation history
    messages.push({
      role: "assistant",
      content: choice.message.content ?? "",
      tool_calls: choice.message.tool_calls,
      ...(choice.message.reasoning_content
        ? { reasoning_content: choice.message.reasoning_content }
        : {}),
    });

    const toolCalls = choice.message.tool_calls ?? [];
    if (toolCalls.length === 0) {
      // LLM stopped without calling report_done
      console.log(
        `${label}: LLM returned no tool calls at iteration ${iterations}`,
      );
      finalSummary = choice.message.content?.slice(0, 500) ?? "";
      break;
    }

    let doneSignaled = false;
    for (const tc of toolCalls) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(tc.function.arguments);
      } catch {
        /* ignore */
      }

      if (tc.function.name === "report_done") {
        finalStatus = (args.status as "pass" | "fail") ?? "fail";
        finalSummary = String(args.summary ?? "");
        doneSignaled = true;
        console.log(
          `${label}: report_done status=${finalStatus} — ${finalSummary.slice(0, 120)}`,
        );
        messages.push({
          role: "tool",
          content: "acknowledged",
          tool_call_id: tc.id,
          name: "report_done",
        });
      } else {
        const result = await executeSupervisorTool(
          tc.function.name,
          args,
          state.outputDir,
        );
        console.log(
          `${label}: tool=${tc.function.name} result_preview=${result.slice(0, 100).replace(/\n/g, " ")}`,
        );
        messages.push({
          role: "tool",
          content: result,
          tool_call_id: tc.id,
          name: tc.function.name,
        });
      }
    }

    if (doneSignaled) break;
  }

  // If no explicit report_done, run tsc one final time to determine actual status
  if (!finalSummary && finalStatus === "fail") {
    console.log(
      `${label}: no report_done received — running final tsc check...`,
    );
    const lastTsc = await shellExec(
      "npx tsc --noEmit --skipLibCheck --pretty false 2>&1",
      state.outputDir,
      { timeout: 90_000 },
    );
    const lastOut = (lastTsc.stdout + lastTsc.stderr).trim();
    if (lastTsc.exitCode === 0 || !lastOut.includes("error TS")) {
      finalStatus = "pass";
      finalSummary = "tsc passed on final check";
    } else {
      finalSummary = lastOut.slice(0, 3000);
    }
  }

  // RALPH test verification when tsc passes
  if (
    finalStatus === "pass" &&
    state.ralphConfig.enabled &&
    state.ralphConfig.enableTestVerification
  ) {
    const testErrors = await runTestVerification(state.outputDir);
    if (testErrors) {
      console.log(`${label}: tsc PASSED but tests FAILED (RALPH judge).`);
      finalStatus = "fail";
      finalSummary = testErrors;
    }
  }

  console.log(
    `${label}: done — status=${finalStatus} iterations=${iterations} cost=$${totalCostUsd.toFixed(4)}`,
  );

  return {
    scaffoldErrors: finalStatus === "pass" ? "" : finalSummary,
    scaffoldFixAttempts: iterations,
    totalCostUsd,
  };
}

// ─── (legacy) Parallel dispatch — kept for reference, replaced by phased dispatch ───

function dispatchParallelWorkers(state: SupervisorState): Send[] {
  const sends: Send[] = [];

  const beCount = workersForRole("backend", state.backendTasks.length);
  const beChunks = chunkTasks(state.backendTasks, beCount);
  beChunks.forEach((tasks, i) => {
    sends.push(
      new Send("parallel_worker", {
        role: "backend" as CodingAgentRole,
        workerLabel: beCount > 1 ? `Backend Dev #${i + 1}` : "Backend Dev",
        tasks,
        outputDir: state.outputDir,
        projectContext: state.projectContext,
        codingMode: state.codingMode,
        fileRegistrySnapshot: state.fileRegistry,
        apiContractsSnapshot: state.apiContracts,
        scaffoldProtectedPaths: state.scaffoldProtectedPaths ?? [],
        currentTaskIndex: 0,
      }),
    );
  });

  const feCount = workersForRole("frontend", state.frontendTasks.length);
  const feChunks = chunkTasks(state.frontendTasks, feCount);
  const feContext = state.frontendDesignContext
    ? `${state.projectContext}\n\n---\n\n${state.frontendDesignContext}`
    : state.projectContext;
  feChunks.forEach((tasks, i) => {
    sends.push(
      new Send("parallel_worker", {
        role: "frontend" as CodingAgentRole,
        workerLabel: feCount > 1 ? `Frontend Dev #${i + 1}` : "Frontend Dev",
        tasks,
        outputDir: state.outputDir,
        projectContext: feContext,
        codingMode: state.codingMode,
        fileRegistrySnapshot: state.fileRegistry,
        apiContractsSnapshot: state.apiContracts,
        scaffoldProtectedPaths: state.scaffoldProtectedPaths ?? [],
        currentTaskIndex: 0,
      }),
    );
  });

  if (state.testTasks.length > 0) {
    sends.push(
      new Send("parallel_worker", {
        role: "test" as CodingAgentRole,
        workerLabel: "Test Engineer",
        tasks: state.testTasks,
        outputDir: state.outputDir,
        projectContext: state.projectContext,
        codingMode: state.codingMode,
        fileRegistrySnapshot: state.fileRegistry,
        apiContractsSnapshot: state.apiContracts,
        scaffoldProtectedPaths: state.scaffoldProtectedPaths ?? [],
        currentTaskIndex: 0,
      }),
    );
  }

  if (sends.length === 0) {
    sends.push(
      new Send("parallel_worker", {
        role: "backend" as CodingAgentRole,
        workerLabel: "No-op",
        tasks: [],
        outputDir: state.outputDir,
        projectContext: "",
        codingMode: state.codingMode,
        fileRegistrySnapshot: [],
        apiContractsSnapshot: [],
        scaffoldProtectedPaths: state.scaffoldProtectedPaths ?? [],
        currentTaskIndex: 0,
      }),
    );
  }

  return sends;
}

/**
 * Recursion limit for a worker-subgraph invoke, scaled to the chunk's task
 * count. Each task costs several graph transitions (pick_next_task →
 * generate_code → verify → fix-loop → done/failed → pick_next_task), so a large
 * foundation chunk (70+ tasks) blows a fixed 150 long before finishing — which
 * surfaced as a GraphRecursionError that failed the whole foundation after ~6h
 * with 5 tasks left unrun. Bounded (not infinite), so a genuinely runaway graph
 * is still caught.
 */
function workerRecursionLimit(taskCount: number): number {
  return Math.max(150, taskCount * 30 + 50);
}

/** Tasks per worker-subgraph invoke. Bounding the batch keeps each invoke well
 *  under the recursion limit and makes one bad batch isolable. Override via
 *  CODEGEN_WORKER_BATCH_SIZE. */
const WORKER_BATCH_SIZE = (() => {
  const raw = Number(process.env.CODEGEN_WORKER_BATCH_SIZE ?? "12");
  if (!Number.isFinite(raw) || raw <= 0) return 12;
  return Math.min(Math.max(Math.floor(raw), 1), 100);
})();

/**
 * Invoke the worker subgraph in bounded batches so no single invoke can exhaust
 * the LangGraph recursionLimit and abort the whole graph. Each batch gets a
 * fresh recursion budget; the file registry, task results and cost accumulate
 * across batches (later batches see earlier batches' files). If one batch throws
 * (recursion limit or otherwise) it is CAUGHT — its tasks are recorded as failed
 * and the loop continues — so a single bad batch never kills the session; the
 * run finishes the rest and only the offending tasks are left for retry.
 */
/**
 * Run the worker sub-graph for one batch and forward its stream chunks
 * through the session-keyed event sink (if one is registered) so the
 * outer SSE pipeline sees `pick_next_task` / `generate_code` / `task_done`
 * updates and emits the corresponding agent_task_* events. Falls back to
 * a plain `.invoke()` when no sink is registered (e.g. tests, headless
 * batch runs).
 *
 * Returns the final WorkerState — when streaming, taken from the last
 * `"values"` frame; with plain invoke, from the return value as before.
 */
async function runWorkerBatch(
  payload: WorkerState,
  recursionLimit: number,
): Promise<WorkerState> {
  const sink = getWorkerChunkSink(payload.sessionId);
  if (!sink) {
    return (await workerGraph.invoke(payload, {
      recursionLimit,
    })) as WorkerState;
  }

  // Synthesize a worker namespace so the SSE EventMapper treats these chunks
  // as worker-subgraph updates (it splits the parent node name on ":" and
  // uses the leading segment to attribute the worker). Including the role
  // keeps multiple parallel batches distinguishable in the UI.
  const nsKey = `${payload.role === "frontend" ? "fe_worker" : "be_worker"}:${payload.workerLabel || payload.role}`;

  let finalState: WorkerState | null = null;
  const iter = (await workerGraph.stream(payload, {
    recursionLimit,
    streamMode: ["updates", "values"],
  })) as AsyncIterable<[string, unknown]>;
  for await (const frame of iter) {
    const [mode, data] = frame;
    if (mode === "values") {
      finalState = data as WorkerState;
    } else if (mode === "updates") {
      try {
        sink([[nsKey], data as Record<string, unknown>]);
      } catch (err) {
        console.warn(
          `[Supervisor] worker chunk sink threw (non-fatal):`,
          err instanceof Error ? err.message : err,
        );
      }
    }
  }
  return finalState ?? payload;
}

async function invokeWorkerBatched(base: WorkerState): Promise<WorkerState> {
  const tasks = base.tasks ?? [];
  if (tasks.length <= WORKER_BATCH_SIZE) {
    return await runWorkerBatch(base, workerRecursionLimit(tasks.length));
  }
  let fileRegistry: GeneratedFile[] = base.fileRegistrySnapshot ?? [];
  const taskResults: TaskResult[] = [];
  const generated: GeneratedFile[] = [];
  let cost = 0;
  const batchCount = Math.ceil(tasks.length / WORKER_BATCH_SIZE);
  for (let b = 0; b < batchCount; b++) {
    const batch = tasks.slice(
      b * WORKER_BATCH_SIZE,
      (b + 1) * WORKER_BATCH_SIZE,
    );
    console.log(
      `[Supervisor] ${base.workerLabel}: worker batch ${b + 1}/${batchCount} (${batch.length} tasks)…`,
    );
    try {
      const res = await runWorkerBatch(
        {
          ...base,
          tasks: batch,
          currentTaskIndex: 0,
          fileRegistrySnapshot: fileRegistry,
        },
        workerRecursionLimit(batch.length),
      );
      taskResults.push(...(res.taskResults ?? []));
      generated.push(...(res.generatedFiles ?? []));
      fileRegistry = [...fileRegistry, ...(res.generatedFiles ?? [])];
      cost += res.workerCostUsd ?? 0;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        `[Supervisor] ${base.workerLabel}: worker batch ${b + 1}/${batchCount} aborted (${msg}); recording its tasks as failed and continuing.`,
      );
      for (const t of batch) {
        taskResults.push({
          taskId: t.id,
          status: "failed",
          generatedFiles: [],
          costUsd: 0,
          durationMs: 0,
          verifyPassed: false,
          fixCycles: 0,
          warnings: [`worker batch aborted: ${msg}`.slice(0, 300)],
        });
      }
    }
  }
  return {
    ...base,
    taskResults,
    generatedFiles: generated,
    workerCostUsd: cost,
  } as WorkerState;
}

async function parallelWorkerNode(
  input: WorkerState,
): Promise<Partial<SupervisorState>> {
  if (input.tasks.length === 0) {
    console.log(
      `[Supervisor] Parallel worker ${input.workerLabel}: no tasks, skipping.`,
    );
    return {};
  }

  console.log(
    `[Supervisor] Parallel worker ${input.workerLabel}: starting ${input.tasks.length} tasks...`,
  );
  const workerState = await invokeWorkerBatched(input);

  const phaseResult: PhaseResult = {
    role: input.role,
    workerLabel: input.workerLabel,
    taskResults: workerState.taskResults,
    totalCostUsd: workerState.workerCostUsd,
  };

  console.log(
    `[Supervisor] Parallel worker ${input.workerLabel} done: ${workerState.taskResults.length} results.`,
  );

  return {
    phaseResults: [phaseResult],
    fileRegistry: workerState.generatedFiles,
    totalCostUsd: workerState.workerCostUsd,
  };
}

/**
 * Frontend foundation stage (BLUEPRINT_FE_ROUTE_CONSOLIDATION).
 *
 * Runs the design-system/shell task(s) ALONE, before page workers fan out, so
 * tokens + shared UI + layout + AuthContext + a minimal router shell exist when
 * the parallel page tasks start (they import these). No-op when the flag is off
 * or there are no foundation tasks (legacy single-stage dispatch handles them).
 */
async function feFoundation(
  state: SupervisorState,
): Promise<Partial<SupervisorState>> {
  if (!ENABLE_FE_ROUTE_CONSOLIDATION) return {};
  const { foundation } = splitFrontendTasks(state.frontendTasks);
  if (foundation.length === 0) return {};

  console.log(
    `[Supervisor] feFoundation: running ${foundation.length} foundation task(s) before parallel pages.`,
  );
  const feContext = state.frontendDesignContext
    ? `${state.projectContext}\n\n---\n\n${state.frontendDesignContext}`
    : state.projectContext;

  const workerState = await invokeWorkerBatched({
    role: "frontend" as CodingAgentRole,
    workerLabel: "Frontend Foundation",
    tasks: foundation,
    outputDir: state.outputDir,
    projectContext: feContext,
    codingMode: state.codingMode,
    fileRegistrySnapshot: state.fileRegistry,
    apiContractsSnapshot: state.apiContracts,
    scaffoldProtectedPaths: state.scaffoldProtectedPaths ?? [],
    currentTaskIndex: 0,
    ralphConfig: state.ralphConfig,
    sessionId: state.sessionId,
    prdSpec: state.prdSpec,
  } as WorkerState);

  return {
    phaseResults: [
      {
        role: "frontend",
        workerLabel: "Frontend Foundation",
        taskResults: workerState.taskResults,
        totalCostUsd: workerState.workerCostUsd,
      },
    ],
    fileRegistry: workerState.generatedFiles,
    totalCostUsd: workerState.workerCostUsd,
  };
}

const ROUTE_CONSOLIDATION_SYSTEM_PROMPT = `You write the SINGLE React Router registry for a frontend app, AFTER all page/view components already exist. Your job is to wire every real view into the router with sensible paths.

Hard rules:
- Import and register EVERY view in the provided list — a view with no route is a bug.
- Use the EXACT import specifiers given (they resolve via the "@/" alias).
- Wire real React Router (BrowserRouter + Routes/Route, or createBrowserRouter + RouterProvider) inside the existing AppLayout shell when one exists.
- Choose paths from the PRD's navigation intent + the view names: a Home/Landing/Dashboard view is the index route; auth views go under /login, /register, etc.
- NEVER emit an antd <Result> placeholder or a "coming soon" stub — these are forbidden.
- Keep the module's existing default/named export name if one is given, so App.tsx's import keeps working.

Output ONLY the complete contents of router.tsx as a single TypeScript code block. No prose.`;

/**
 * Frontend route consolidation (BLUEPRINT_FE_ROUTE_CONSOLIDATION).
 *
 * After the parallel page workers finish, write `frontend/src/router.tsx` ONCE,
 * registering every view that actually exists on disk. LLM-authored, then
 * checked by a deterministic guardrail (must import every view, wire a real
 * router, no scaffold placeholder). One corrective retry; on persistent gaps the
 * best attempt is written and the shortfall recorded so the integration repair
 * loop + tsc catch the remainder. Finally re-wire App → router. No-op when the
 * flag is off or no views exist.
 */
async function feRouteConsolidation(
  state: SupervisorState,
): Promise<Partial<SupervisorState>> {
  if (!ENABLE_FE_ROUTE_CONSOLIDATION) return {};

  const allFiles = await listFiles("frontend/src", state.outputDir).catch(
    () => [] as string[],
  );
  const viewFiles = allFiles.filter(
    (f) =>
      /^frontend\/src\/(views|pages)\/.*\.(tsx|jsx)$/.test(f) &&
      !/\.(test|spec|stories)\./.test(f),
  );
  if (viewFiles.length === 0) {
    console.log(
      "[Supervisor] feRouteConsolidation: no view files found — skipping.",
    );
    return {};
  }

  const views: ViewModule[] = [];
  for (const f of viewFiles) {
    const src = await fsRead(f, state.outputDir);
    if (src.startsWith("FILE_NOT_FOUND") || src.startsWith("REJECTED"))
      continue;
    const exp = detectViewExport(src);
    if (!exp) continue;
    views.push({
      file: f,
      importPath: viewImportSpecifier(f),
      exportName: exp.exportName,
      isDefault: exp.isDefault,
    });
  }
  if (views.length === 0) {
    console.log(
      "[Supervisor] feRouteConsolidation: view files exist but none export a component — skipping.",
    );
    return {};
  }

  const routerPath = "frontend/src/router.tsx";
  const existingRouter = await fsRead(routerPath, state.outputDir);
  const existingRouterSrc =
    existingRouter.startsWith("FILE_NOT_FOUND") ||
    existingRouter.startsWith("REJECTED")
      ? ""
      : existingRouter;

  const viewList = views
    .map(
      (v) =>
        `- ${v.importPath} — ${v.isDefault ? `default export \`${v.exportName}\`` : `named export \`{ ${v.exportName} }\``} (from ${v.file})`,
    )
    .join("\n");

  const prdContext = state.prdSpec
    ? JSON.stringify(state.prdSpec).slice(0, 8000)
    : state.projectContext.slice(0, 6000);

  const buildMessages = (corrective?: string): ChatMessage[] => [
    { role: "system", content: ROUTE_CONSOLIDATION_SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        "## Views that exist and MUST each get a route",
        viewList,
        "",
        existingRouterSrc
          ? `## Current router.tsx (shell — replace it, KEEP its export name)\n\`\`\`tsx\n${existingRouter.slice(0, 4000)}\n\`\`\``
          : "## No router.tsx yet — create one exporting a default `AppRouter` component.",
        "",
        "## PRD (navigation intent)",
        prdContext,
        corrective ? `\n## FIX REQUIRED\n${corrective}` : "",
        "",
        "Write the complete router.tsx now.",
      ]
        .filter(Boolean)
        .join("\n"),
    },
  ];

  const chain = resolveCodingChain(state.codingMode, "codeFix", "gpt-4o");
  const extractCode = (raw: string): string => {
    const fenced = raw.match(/```(?:tsx?|typescript|jsx?)?\s*([\s\S]*?)```/i);
    return (fenced ? fenced[1] : raw).trim();
  };

  let routerSrc = "";
  let guard = {
    ok: false,
    missingViews: [] as string[],
    hasPlaceholder: false,
    wiresRouter: false,
  };
  for (let attempt = 0; attempt < 2; attempt++) {
    const corrective =
      attempt === 0
        ? undefined
        : `Your previous router did not import these views: ${guard.missingViews.join(", ")}.${guard.hasPlaceholder ? " It also still contained a forbidden <Result> placeholder." : ""}${!guard.wiresRouter ? " It also did not wire a real React Router." : ""} Fix all of this.`;
    try {
      const response = await chatCompletionWithFallback(
        buildMessages(corrective),
        chain,
        {
          temperature: 0.1,
          max_tokens: 16384,
          forceOpenRouter: forceOpenRouterForMode(state.codingMode),
        },
      );
      recordSupervisorLlmUsage({
        sessionId: state.sessionId,
        stage: "fe_route_consolidation",
        model: response.model,
        usage: response.usage,
        costUsd: estimateCost(response.model, response.usage),
      });
      routerSrc = extractCode(response.choices[0]?.message?.content ?? "");
    } catch (err) {
      console.warn(
        `[Supervisor] feRouteConsolidation: LLM call failed (attempt ${attempt + 1}): ${err instanceof Error ? err.message : String(err)}`,
      );
      break;
    }
    if (!routerSrc) break;
    guard = validateConsolidatedRouter(routerSrc, views);
    if (guard.ok) break;
  }

  if (!routerSrc) {
    await recordUnresolvedProblem(state.outputDir, {
      sessionId: state.sessionId,
      gate: "fe-route-consolidation",
      phase: "frontend",
      category: "other",
      summary: `route consolidation produced no router for ${views.length} view(s)`,
      evidence: views.map((v) => v.importPath),
    }).catch(() => {});
    return {};
  }

  await fsWrite(routerPath, routerSrc, state.outputDir);
  console.log(
    `[Supervisor] feRouteConsolidation: wrote ${routerPath} registering ${views.length} view(s)${guard.ok ? "" : ` (guard: ${guard.missingViews.length} unreferenced, placeholder=${guard.hasPlaceholder}, wired=${guard.wiresRouter})`}.`,
  );

  if (!guard.ok) {
    await recordUnresolvedProblem(state.outputDir, {
      sessionId: state.sessionId,
      gate: "fe-route-consolidation",
      phase: "frontend",
      category: "other",
      summary: `consolidated router left ${guard.missingViews.length} view(s) unrouted${guard.hasPlaceholder ? " and kept a placeholder" : ""}`,
      evidence: guard.missingViews,
    }).catch(() => {});
  }

  // Close main → App → router wiring (reuses the deterministic autofix).
  try {
    const repairs = await repairFrontendRouterWiring(state.outputDir);
    if (repairs.changed.length > 0) {
      console.log(
        `[Supervisor] feRouteConsolidation: rewired App → router (${repairs.changed.map((c) => c.file).join(", ")}).`,
      );
    }
  } catch (err) {
    console.warn(
      `[Supervisor] feRouteConsolidation: App rewire failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  return {};
}

// ─── Dependency sync: scan imports → install missing packages ───

const NODE_BUILTINS = new Set([
  "assert",
  "buffer",
  "child_process",
  "cluster",
  "console",
  "constants",
  "crypto",
  "dgram",
  "dns",
  "domain",
  "events",
  "fs",
  "http",
  "http2",
  "https",
  "inspector",
  "module",
  "net",
  "os",
  "path",
  "perf_hooks",
  "process",
  "punycode",
  "querystring",
  "readline",
  "repl",
  "stream",
  "string_decoder",
  "sys",
  "timers",
  "tls",
  "trace_events",
  "tty",
  "url",
  "util",
  "v8",
  "vm",
  "wasi",
  "worker_threads",
  "zlib",
]);

function extractPackageName(specifier: string): string | null {
  if (
    specifier.startsWith(".") ||
    specifier.startsWith("/") ||
    specifier.startsWith("node:")
  ) {
    return null;
  }
  if (specifier.startsWith("@/")) return null;
  if (specifier.startsWith("@shared/")) return null;
  if (specifier.startsWith("@")) {
    const parts = specifier.split("/");
    if (parts.length < 2) return null;
    return `${parts[0]}/${parts[1]}`;
  }
  return specifier.split("/")[0];
}

function isUnderAnyPrefix(file: string, prefixes: string[]): boolean {
  const norm = file.replace(/\\/g, "/");
  return prefixes.some((root) => norm === root || norm.startsWith(`${root}/`));
}

async function scanImportsFromFiles(
  outputDir: string,
  sourceFiles: string[],
): Promise<Set<string>> {
  const importedPkgs = new Set<string>();
  for (const file of sourceFiles) {
    const content = await fsRead(file, outputDir);
    if (content.startsWith("FILE_NOT_FOUND") || content.startsWith("REJECTED"))
      continue;

    const patterns = [
      /(?:import|export)\s+.*?\s+from\s+["']([^"']+)["']/g,
      /(?:import|export)\s*\(["']([^"']+)["']\)/g,
      /require\s*\(["']([^"']+)["']\)/g,
      /import\s+["']([^"']+)["']/g,
    ];

    for (const pat of patterns) {
      let m: RegExpExecArray | null;
      while ((m = pat.exec(content)) !== null) {
        const pkg = extractPackageName(m[1]);
        if (pkg && !NODE_BUILTINS.has(pkg)) {
          importedPkgs.add(pkg);
        }
      }
    }
  }
  return importedPkgs;
}

/** Root package.json vs imports; excludes sources that live under nested package roots (e.g. frontend/). */
async function collectMissingImportPackages(
  outputDir: string,
  nestedPackageRoots: string[] = [],
): Promise<string[]> {
  const nestedNorm = nestedPackageRoots.map((r) => r.replace(/\\/g, "/"));
  const files = await listFiles(".", outputDir);
  const sourceFiles = files.filter(
    (f) =>
      /\.(tsx?|jsx?|mjs|cjs)$/.test(f) &&
      !f.includes("node_modules") &&
      !isUnderAnyPrefix(f, nestedNorm),
  );

  const importedPkgs = await scanImportsFromFiles(outputDir, sourceFiles);
  if (importedPkgs.size === 0) return [];

  const pkgJsonContent = await fsRead("package.json", outputDir);
  if (pkgJsonContent.startsWith("FILE_NOT_FOUND")) return [];

  let pkgJson: {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  try {
    pkgJson = JSON.parse(pkgJsonContent);
  } catch {
    return [];
  }

  const declared = new Set([
    ...Object.keys(pkgJson.dependencies ?? {}),
    ...Object.keys(pkgJson.devDependencies ?? {}),
    "react/jsx-runtime",
    "react/jsx-dev-runtime",
  ]);

  return [...importedPkgs]
    .filter((pkg) => !declared.has(pkg))
    .filter(isAutoInstallableNpmPackageName);
}

/** Missing deps for a nested package (e.g. apps/api) vs its own package.json. */
async function collectMissingImportPackagesForPrefix(
  outputDir: string,
  prefix: string,
): Promise<string[]> {
  const prefixNorm = prefix.replace(/\\/g, "/");
  const files = await listFiles(".", outputDir);
  const sourceFiles = files.filter((f) => {
    const norm = f.replace(/\\/g, "/");
    return (
      /\.(tsx?|jsx?|mjs|cjs)$/.test(f) &&
      !f.includes("node_modules") &&
      (norm === prefixNorm || norm.startsWith(`${prefixNorm}/`))
    );
  });

  const importedPkgs = await scanImportsFromFiles(outputDir, sourceFiles);
  if (importedPkgs.size === 0) return [];

  const pkgJsonContent = await fsRead(`${prefixNorm}/package.json`, outputDir);
  if (pkgJsonContent.startsWith("FILE_NOT_FOUND")) return [];

  let pkgJson: {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  try {
    pkgJson = JSON.parse(pkgJsonContent);
  } catch {
    return [];
  }

  const declared = new Set([
    ...Object.keys(pkgJson.dependencies ?? {}),
    ...Object.keys(pkgJson.devDependencies ?? {}),
    "react/jsx-runtime",
    "react/jsx-dev-runtime",
  ]);

  return [...importedPkgs]
    .filter((pkg) => !declared.has(pkg))
    .filter(isAutoInstallableNpmPackageName);
}

const VERIFY_IMPORT_INSTALL_TIMEOUT_MS = 120_000;

interface ImportGapInstallRecord {
  scope: string;
  packages: string[];
  exitCode: number;
}

async function installImportGapsAllProjects(
  outputDir: string,
): Promise<ImportGapInstallRecord[]> {
  await runNpmInstallAllRoots(outputDir);

  const records: ImportGapInstallRecord[] = [];
  const pm = await detectPackageManager(outputDir);
  const repoFallbackPm = await inferRepoPackageManager(outputDir);
  const dirs = await findPackageJsonRelativeDirs(outputDir);
  const nested = dirs.filter((d) => d !== ".");

  const rootMissing = await collectMissingImportPackages(outputDir, nested);
  if (rootMissing.length > 0) {
    console.log(
      `[Supervisor] Integration verify: root add (${rootMissing.length}): ${rootMissing.join(", ")}`,
    );
    const cmd = buildAddCommand(pm, rootMissing);
    const r = await shellExec(cmd, outputDir, {
      timeout: VERIFY_IMPORT_INSTALL_TIMEOUT_MS,
    });
    if (r.exitCode !== 0) {
      console.warn(
        `[Supervisor] Integration verify: root import-based add exit ${r.exitCode}: ${(r.stderr || r.stdout).slice(0, 300)}`,
      );
    }
    records.push({
      scope: "root",
      packages: rootMissing,
      exitCode: r.exitCode,
    });
  }

  for (const rel of nested) {
    const missing = await collectMissingImportPackagesForPrefix(outputDir, rel);
    if (missing.length === 0) continue;
    console.log(
      `[Supervisor] Integration verify: "${rel}" add (${missing.length}): ${missing.join(", ")}`,
    );

    let r;
    const relPm = await resolvePackageManagerForDir(
      rel,
      outputDir,
      repoFallbackPm,
    );
    if (relPm === "pnpm") {
      // For pnpm workspaces, add packages via --filter from root
      const cwd = path.join(outputDir, rel);
      const cmd = buildAddCommand("pnpm", missing);
      r = await shellExec(cmd, cwd, {
        timeout: VERIFY_IMPORT_INSTALL_TIMEOUT_MS,
      });
    } else {
      const cwd = path.join(outputDir, rel);
      const cmd = buildAddCommand(relPm, missing);
      r = await shellExec(cmd, cwd, {
        timeout: VERIFY_IMPORT_INSTALL_TIMEOUT_MS,
      });
    }

    if (r.exitCode !== 0) {
      console.warn(
        `[Supervisor] Integration verify: "${rel}" add exit ${r.exitCode}: ${(r.stderr || r.stdout).slice(0, 300)}`,
      );
    }
    records.push({ scope: rel, packages: missing, exitCode: r.exitCode });
  }
  return records;
}

interface DependencyConsistencyAudit {
  remainingIssues: string[];
  summary: string;
}

async function auditImportDependencyConsistency(
  outputDir: string,
): Promise<DependencyConsistencyAudit> {
  const dirs = await findPackageJsonRelativeDirs(outputDir);
  const nested = dirs.filter((d) => d !== ".");
  const issues: string[] = [];

  const rootMissing = await collectMissingImportPackages(outputDir, nested);
  if (rootMissing.length > 0) {
    issues.push(
      `Root package imports are missing dependencies: ${rootMissing.join(", ")}`,
    );
  }

  for (const rel of nested) {
    const missing = await collectMissingImportPackagesForPrefix(outputDir, rel);
    if (missing.length > 0) {
      issues.push(
        `"${rel}" imports are missing dependencies: ${missing.join(", ")}`,
      );
    }
  }

  return {
    remainingIssues: issues,
    summary:
      issues.length > 0
        ? [
            "Dependency consistency audit still has unresolved items:",
            ...issues,
          ]
            .join("\n")
            .slice(0, 4000)
        : "Dependency consistency audit: clean.",
  };
}

async function detectResidualImplementationConflicts(
  outputDir: string,
): Promise<string[]> {
  const conflicts: string[] = [];
  const candidatePairs = [
    {
      canonical: "frontend/src/contexts/AuthContext.tsx",
      residual: "frontend/src/context/AuthContext.tsx",
    },
    {
      canonical: "backend/src/middleware/",
      residual: "backend/src/middlewares/",
    },
    {
      canonical: "backend/src/db.ts",
      residual: "backend/src/database/connection.ts",
    },
    {
      canonical: "backend/src/db.ts",
      residual: "backend/src/config/database.ts",
    },
    {
      canonical: "frontend/src/views/NotFoundPage.tsx",
      residual: "frontend/src/views/NotFound.tsx",
    },
  ];

  for (const pair of candidatePairs) {
    const canonicalExists = await pathExistsUnderOutput(
      outputDir,
      pair.canonical,
    );
    const residualExists = await pathExistsUnderOutput(
      outputDir,
      pair.residual,
    );
    if (canonicalExists && residualExists) {
      conflicts.push(
        `Both "${pair.canonical}" and "${pair.residual}" exist. Keep one canonical implementation and remove or merge the residual copy.`,
      );
    }
  }

  return conflicts;
}

// Tightened thresholds: previous 8/18 burned ~100k tokens on read-only loops
// before the abort fired. 3 iterations without mutation is enough to know the
// LLM is reading in circles; 10 iterations is the hard stop.
const BASE_INTEGRATION_STAGNATION_WARNING_ITERATIONS = 3;
const BASE_INTEGRATION_STAGNATION_ABORT_ITERATIONS = 10;
const MAX_INTEGRATION_PROGRESS_SCORE = 6;
const INTEGRATION_STAGNATION_ABORT_BONUS_PER_PROGRESS = 2;
const INTEGRATION_STAGNATION_WARNING_BONUS_PER_PROGRESS = 1;
/** After N total stagnation warnings without progress, inject an escalated prompt. */
const STAGNATION_ESCALATION_WARNING_COUNT = 2;

function readIntegrationVerifyFixMaxIterations(): number {
  const raw = Number(
    process.env.INTEGRATION_VERIFY_FIX_MAX_ITERATIONS ?? "500",
  );
  if (!Number.isFinite(raw)) return 500;
  return Math.max(20, Math.min(1000, Math.floor(raw)));
}

type ParsedValidationSuiteResult = {
  parsed: boolean;
  pass: boolean;
  summary: string;
  passedSuites: ScopedValidationKind[];
  failedSuites: string[];
};

function parseValidationSuiteResult(
  result: string,
): ParsedValidationSuiteResult {
  try {
    const jsonStart = result.indexOf("{");
    const raw = jsonStart >= 0 ? result.slice(jsonStart) : result;
    const data = JSON.parse(raw) as {
      pass?: unknown;
      results?: Array<{
        suite?: unknown;
        pass?: unknown;
        skipped?: unknown;
        output?: unknown;
      }>;
    };
    const suiteResults = Array.isArray(data.results) ? data.results : [];
    const passedSuites = suiteResults
      .filter((suite) => suite.pass === true)
      .map((suite) => String(suite.suite ?? ""))
      .filter((suite): suite is ScopedValidationKind =>
        [
          "frontend_tsc",
          "frontend_build",
          "backend_tsc",
          "backend_smoke",
        ].includes(suite),
      );
    const failedSuites = suiteResults
      .filter((suite) => suite.pass !== true)
      .map((suite) => {
        const name = String(suite.suite ?? "unknown");
        const output =
          typeof suite.output === "string" && suite.output.trim()
            ? `: ${suite.output.slice(0, 300)}`
            : "";
        return `${name}${output}`;
      });
    const summaryLines = suiteResults.map((suite) => {
      const name = String(suite.suite ?? "unknown");
      const status = suite.pass === true ? "pass" : "fail";
      const skipped = suite.skipped === true ? " (skipped)" : "";
      return `${name}: ${status}${skipped}`;
    });
    return {
      parsed: true,
      pass: data.pass === true,
      summary:
        summaryLines.length > 0
          ? summaryLines.join("\n")
          : `validation suite pass=${data.pass === true}`,
      passedSuites,
      failedSuites,
    };
  } catch {
    return {
      parsed: false,
      pass: false,
      summary: result.slice(0, 1000),
      passedSuites: [],
      failedSuites: [],
    };
  }
}

function isIntegrationMutationTool(name: string): boolean {
  return (
    name === "write_file" ||
    name === "apply_patch" ||
    name === "delete_file" ||
    name === "move_file"
  );
}

function getIntegrationMutationPath(
  name: string,
  args: Record<string, unknown>,
): string {
  if (name === "move_file") {
    return `${String(args.from ?? "")}->${String(args.to ?? "")}`;
  }
  return String(args.path ?? "");
}

function isForbiddenIntegrationValidationHelperPath(pathLike: string): boolean {
  return /(^|\/)(verify-final|final-check|validation-check)\.(ts|tsx|js|jsx)$/i.test(
    pathLike.replace(/\\/g, "/"),
  );
}

/**
 * Merged integration verify + fix as a single agentic loop.
 *
 * Replaces the old separate integrationVerify + integrationFix nodes and their
 * conditional loop edge. The LLM is given the same bash/filesystem/grep tools
 * as phaseVerifyAndFix and keeps running until it reports completion, stops
 * making callable progress, or hits the stagnation fallback policy.
 */
async function integrationVerifyAndFix(
  state: SupervisorState,
): Promise<Partial<SupervisorState>> {
  const label = "[Supervisor] IntegrationVerifyFix";

  // Cumulative circuit-breaker. `integrationFixAttempts` carries the TOTAL
  // iterations spent across every prior re-entry of this node (the reducer is
  // replace-semantics, so we add to it ourselves and return the new total).
  // Once the session-wide budget is gone we refuse to run another LLM loop —
  // the routing predicates also stop sending us control, so the graph
  // converges to summary instead of spinning. See runtime.log 2026-05-20.
  const priorIntegrationAttempts = Math.max(
    0,
    state.integrationFixAttempts ?? 0,
  );
  // Size-scaled cumulative budget: base + perTask × taskCount. A flat budget
  // starved large projects (more findings → more repair iterations) so they
  // exhausted the cap mid-repair and never advanced to e2e. See config.ts.
  const totalBudget = scaledIntegrationVerifyFixTotalBudget(
    state.tasks?.length ?? 0,
  );
  const remainingBudget = remainingIntegrationVerifyBudget(
    priorIntegrationAttempts,
    totalBudget,
  );
  if (remainingBudget <= 0) {
    console.warn(
      `${label}: cumulative budget exhausted (${priorIntegrationAttempts}/${totalBudget}); skipping repair loop and reporting fail so the graph can converge.`,
    );
    getRepairEmitter(state.sessionId)({
      stage: "integration-gate",
      event: "integration_verify_budget_exhausted",
      details: {
        priorAttempts: priorIntegrationAttempts,
        totalBudget,
      },
    });
    await recordUnresolvedProblem(state.outputDir, {
      sessionId: state.sessionId,
      category: "circuit-breaker",
      gate: "integration-verify-fix",
      phase: "integration",
      attempts: priorIntegrationAttempts,
      summary: `IntegrationVerifyFix circuit-breaker: ${priorIntegrationAttempts}/${totalBudget} iterations without clearing the gate.`,
      evidence: state.integrationErrors
        ? [state.integrationErrors.slice(0, 500)]
        : undefined,
      artifacts: [".ralph/runtime-smoke.json", ".ralph/tdd-review.json"],
    });
    return {
      integrationErrors: [
        state.integrationErrors?.trim(),
        `IntegrationVerifyFix circuit-breaker: reached the cumulative budget of ${totalBudget} iterations across all repair passes without clearing the gate. Stopping to avoid an infinite loop. Inspect .ralph/runtime-smoke.json and .ralph/tdd-review.json for the unresolved blockers.`,
      ]
        .filter(Boolean)
        .join("\n")
        .slice(0, 4000),
      integrationFixAttempts: priorIntegrationAttempts,
    };
  }

  console.log(
    `${label}: starting agentic loop (max ${Math.min(
      readIntegrationVerifyFixMaxIterations(),
      remainingBudget,
    )} iterations this pass; ${priorIntegrationAttempts}/${totalBudget} cumulative budget used; one context compression on overflow)...`,
  );

  // ── Pre-flight: workspace normalisation + dep install + DB setup ─────────
  console.log(
    `${label}: pre-flight — normalising workspace imports & installing deps...`,
  );
  await normalizeWorkspaceImports(state.outputDir);
  const importGapInstalls = await installImportGapsAllProjects(state.outputDir);
  if (importGapInstalls.length > 0) {
    const totalPackages = importGapInstalls.reduce(
      (sum, r) => sum + r.packages.length,
      0,
    );
    getRepairEmitter(state.sessionId)({
      stage: "preflight-deps",
      event: "import_gaps_installed",
      details: {
        totalPackages,
        scopes: importGapInstalls.map((r) => ({
          scope: r.scope,
          packages: r.packages,
          exitCode: r.exitCode,
        })),
      },
    });
  }
  const initialDependencyAudit = await auditImportDependencyConsistency(
    state.outputDir,
  );

  // Fix 2: Auto-install missing packages detected by the dependency audit.
  // `remainingIssues` format: `"Root package imports are missing dependencies: pkg1, pkg2"`
  //                        or `"\"backend\" imports are missing dependencies: pkg1, pkg2"`
  // We parse this deterministically, run one `pnpm/npm add` per workspace scope,
  // then re-run the audit so `dependencyAuditBlock` reflects the post-fix state.
  if (initialDependencyAudit.remainingIssues.length > 0) {
    const pm = await detectPackageManager(state.outputDir);
    const missingRe =
      /^(?:Root|"([^"]+)")\s+(?:package\s+)?imports are missing dependencies:\s+(.+)$/i;
    let anyInstalled = false;
    for (const issue of initialDependencyAudit.remainingIssues) {
      const m = missingRe.exec(issue);
      if (!m) continue;
      const scopeDir = m[1] ?? null; // null = root
      const pkgs = m[2]
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p.length > 0 && isAutoInstallableNpmPackageName(p));
      if (pkgs.length === 0) continue;
      const addCmd = buildAddCommand(pm, pkgs, {
        filter: scopeDir ? scopeDir : undefined,
      });
      try {
        const r = await shellExec(addCmd, state.outputDir, {
          timeout: 90_000,
        });
        if (r.exitCode === 0) {
          console.log(
            `${label}: auto-installed missing dep(s) [${pkgs.join(", ")}]${scopeDir ? ` in "${scopeDir}"` : ""}: ${r.stdout.slice(0, 120)}`,
          );
          anyInstalled = true;
        } else {
          console.warn(
            `${label}: auto-install failed for [${pkgs.join(", ")}]: ${r.stderr.slice(0, 200)}`,
          );
        }
      } catch (e) {
        console.warn(
          `${label}: auto-install threw for [${pkgs.join(", ")}]: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
    if (anyInstalled) {
      // Re-run audit so the opening-context block and downstream checks
      // reflect the post-install state instead of the stale snapshot.
      try {
        const reAudit = await auditImportDependencyConsistency(state.outputDir);
        if (
          reAudit.remainingIssues.length <
          initialDependencyAudit.remainingIssues.length
        ) {
          console.log(
            `${label}: dependency auto-install resolved ${initialDependencyAudit.remainingIssues.length - reAudit.remainingIssues.length} issue(s); ${reAudit.remainingIssues.length} remaining.`,
          );
          // Patch in-place so downstream code sees the updated audit result.
          initialDependencyAudit.remainingIssues = reAudit.remainingIssues;
          initialDependencyAudit.summary = reAudit.summary;
        }
      } catch {
        // Non-fatal; continue with original audit.
      }
    }
  }

  const initialResidualConflicts = await detectResidualImplementationConflicts(
    state.outputDir,
  );
  const frontendHookNormalization = await normalizeFrontendHookSignatures(
    state.outputDir,
  );
  const frontendJsxNormalization = await normalizeFrontendJsxElementAnnotations(
    state.outputDir,
  );
  const frontendReactTemplateNormalization =
    await normalizeFrontendReactComponentTemplates(state.outputDir);
  const frontendAuthDtoNormalization = await normalizeFrontendAuthDtoAliases(
    state.outputDir,
  );
  const frontendUseFormNormalization = await normalizeFrontendUseFormHook(
    state.outputDir,
  );
  // Run *before* the cluster detector so the duplicate-client convergence
  // is reflected in any subsequent audit. This is the highest-impact
  // structural normalization for M-tier frontends — see analysis of
  // `coding-session-report.md` for why the dual `apiClient` was the
  // root cause of recent 18-iteration stagnation loops.
  const frontendDuplicateClientNormalization =
    await normalizeFrontendDuplicateApiClient(state.outputDir);
  const frontendErrorCauseNormalization = await normalizeFrontendErrorWithCause(
    state.outputDir,
  );
  const backendGetValidateBodyNormalization =
    await normalizeBackendGetValidateBody(state.outputDir);
  // Collapse `backend/src/middleware/*.ts` (singular, frequently emitted by
  // workers) into the canonical `backend/src/middlewares/` directory and
  // rewrite every consumer import. Without this normalizer the project ends
  // up with dozens of `Cannot find module` errors that the agent loop
  // typically cannot untangle by itself.
  const backendMiddlewareFolderNormalization =
    await normalizeBackendMiddlewareFolder(state.outputDir);
  const frontendNormalizationNotes = [
    ...frontendHookNormalization.notes,
    ...frontendJsxNormalization.notes,
    ...frontendReactTemplateNormalization.notes,
    ...frontendAuthDtoNormalization.notes,
    ...frontendUseFormNormalization.notes,
    ...frontendDuplicateClientNormalization.notes,
    ...frontendErrorCauseNormalization.notes,
    ...backendGetValidateBodyNormalization.notes,
    ...backendMiddlewareFolderNormalization.notes,
  ];
  const frontendConvergenceClusters = await detectFrontendConvergenceClusters(
    state.outputDir,
  );

  // ── Contract usage coverage (pre-integration phase) ────────────────────
  // Run BEFORE the route audit so any surplus contract entries get pruned
  // first — this prevents the route audit from reporting them as "missing
  // implementations" and wedging the verify-fix worker in a stagnation loop.
  // The audit also produces `pendingRepairTasks` for the worker to consume
  // as deterministic instructions (CODEGEN_HARDENING_PLAN.md §7.2).
  let coverageResult: Awaited<
    ReturnType<typeof runContractUsageCoverage>
  > | null = null;
  try {
    coverageResult = await runContractUsageCoverage({
      outputDir: state.outputDir,
      emitter: getRepairEmitter(state.sessionId),
      sessionId: state.sessionId,
      phase: "pre-integration",
    });
    if (coverageResult.pruned.length > 0) {
      console.log(
        `${label}: contract-usage-coverage pruned ${coverageResult.pruned.length} surplus endpoint(s) before route audit: ${coverageResult.pruned
          .slice(0, 4)
          .map((p) => `${p.method} ${p.endpoint}`)
          .join(", ")}${coverageResult.pruned.length > 4 ? ", …" : ""}.`,
      );
    }
    if (coverageResult.pendingRepairTasks.length > 0) {
      console.log(
        `${label}: contract-usage-coverage queued ${coverageResult.pendingRepairTasks.length} deterministic repair task(s) for verify-fix worker.`,
      );
    }
  } catch (err) {
    console.warn(
      `${label}: contract-usage-coverage skipped — ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // ── Admin-route alias coverage (A-09) ────────────────────────────────────
  // Catches the F-09 outage class: `frontend/src/api/admin.ts` calls
  // `/admin/<resource>` that 404 because no backend module mounts a
  // matching route. The L-tier `_optional/auth-password-rbac` scaffold
  // ships the empty `admin-aliases.routes.ts` shell — this lint flags
  // every frontend call that lacks an alias in that file so the worker
  // fills them in deterministically (chained with `requireAuth,
  // requireRole("admin")`).
  let adminRouteCoverageResult: Awaited<
    ReturnType<typeof runAdminRouteCoverageRepair>
  > | null = null;
  try {
    adminRouteCoverageResult = await runAdminRouteCoverageRepair({
      outputDir: state.outputDir,
      emitter: getRepairEmitter(state.sessionId),
      sessionId: state.sessionId,
    });
    if (adminRouteCoverageResult.pendingRepairTasks.length > 0) {
      console.log(
        `${label}: admin-route-coverage queued ${adminRouteCoverageResult.pendingRepairTasks.length} repair task(s) (${adminRouteCoverageResult.totalAdminCalls} admin call(s) vs ${adminRouteCoverageResult.totalAdminRoutes} backend admin route(s)).`,
      );
    }
    if (adminRouteCoverageResult.scanFailed) {
      console.warn(
        `${label}: admin-route-coverage scan partial — ${adminRouteCoverageResult.scanFailed}`,
      );
    }
  } catch (err) {
    console.warn(
      `${label}: admin-route-coverage repair skipped — ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // ── Runtime integration audit (CODEGEN_HARDENING_PLAN.md §4.2 / §4.3 /
  //    §4.4 / §4.5 / §4.7) ────────────────────────────────────────────────
  // Static grep-based audit catching the runtime pitfalls Phase 4 prompts
  // warn against. Findings are persisted to
  // `.blueprint/runtime-integration-audit.json` and surfaced in the
  // verify-fix worker's opening user message via `runtimeAuditBlock`
  // below. `appliedOptionalFeatures` is auto-loaded by the audit from
  // `.blueprint/scaffold-applied.json`; `declaredEnvKeys` is read here
  // because resource-requirements.json lives at process.cwd() (the host
  // builder), not at the generated project root.
  //
  // We route the audit through `dispatchRuntimeAudit` which (a) runs the
  // initial audit, (b) applies any registered deterministic fixers
  // (currently: `bg-job-worker-startup` → wire `start*Worker` into
  // `server.ts` via `worker-startup-autofix`), (c) re-runs the audit to
  // confirm closure, and (d) persists the residual findings as a
  // closed per-task list at `.ralph/runtime-audit-tasks.json` so the
  // verify-fix worker sees concrete tasks instead of free-form prose.
  let runtimeAuditResult: Awaited<
    ReturnType<typeof runRuntimeIntegrationAudit>
  > | null = null;
  let runtimeAuditDispatch: Awaited<
    ReturnType<typeof dispatchRuntimeAudit>
  > | null = null;
  // Preserved for mid-loop re-runs (report_done gate, stagnation replan).
  let runtimeAuditDeclaredEnvKeys: string[] = [];
  try {
    const declaredResources = await readResourceRequirements(process.cwd());
    const declaredEnvKeys = declaredResources.map((r) => r.envKey);
    runtimeAuditDeclaredEnvKeys = declaredEnvKeys;
    runtimeAuditDispatch = await dispatchRuntimeAudit({
      outputDir: state.outputDir,
      declaredEnvKeys,
      emitter: getRepairEmitter(state.sessionId),
      sessionId: state.sessionId,
    });
    runtimeAuditResult = runtimeAuditDispatch.residualAudit;
    if (runtimeAuditResult && !runtimeAuditResult.clean) {
      const errCount = runtimeAuditResult.bySeverity.error ?? 0;
      const warnCount = runtimeAuditResult.bySeverity.warn ?? 0;
      const fixed = runtimeAuditDispatch.deterministicFixes.filter(
        (o) => o.appliedAny,
      );
      const fixedSummary =
        fixed.length > 0
          ? ` (deterministic fixes applied: ${fixed.map((o) => o.ruleId).join(", ")})`
          : "";
      console.log(
        `${label}: runtime-integration-audit found ${runtimeAuditResult.findings.length} residual finding(s) (${errCount} error, ${warnCount} warn) across ${Object.keys(runtimeAuditResult.byRule).length} rule(s)${fixedSummary}.`,
      );
    } else if (
      runtimeAuditDispatch.deterministicFixes.some((o) => o.appliedAny)
    ) {
      const fixed = runtimeAuditDispatch.deterministicFixes.filter(
        (o) => o.appliedAny,
      );
      console.log(
        `${label}: runtime-integration-audit clean after deterministic fixes (${fixed.map((o) => o.ruleId).join(", ")}).`,
      );
    }
  } catch (err) {
    console.warn(
      `${label}: runtime-integration-audit skipped — ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // ── tsc diagnostics → pendingRepairTasks (P5) ──────────────────────────
  // Run `tsc --noEmit` for both backend and frontend, translate every
  // diagnostic line into a deterministic repair task, and persist to
  // `.ralph/tsc-diagnostics.json`. The verify-fix worker reads that file
  // directly — no need to re-derive errors from raw stderr.
  if (process.env.BLUEPRINT_DISABLE_TSC_DIAGNOSTICS !== "1") {
    try {
      const tscResult = await runTscDiagnosticsAsTasks({
        outputDir: state.outputDir,
        emitter: getRepairEmitter(state.sessionId),
        sessionId: state.sessionId,
      });
      if (tscResult.tasks.length > 0) {
        console.log(
          `${label}: tsc-diagnostics queued ${tscResult.tasks.length} repair task(s) (${tscResult.workspaces
            .filter((w) => !w.skipped)
            .map((w) => `${w.workspace}=${w.diagnosticCount}`)
            .join(", ")}).`,
        );
      }
    } catch (err) {
      console.warn(
        `${label}: tsc-diagnostics skipped — ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  let routeAudit = await auditApiRouteRegistration(state.outputDir);

  // ── Deterministic auto-repair for the route audit (R11) ──────────────
  // For every register*Routes export the audit flagged as unregistered,
  // append the import + call to backend/src/api/modules/index.ts so the
  // routes are actually mounted. After the fix, re-run the audit so
  // downstream telemetry + system-prompt blocks reflect the post-repair
  // state.
  const routeAutorepairs = await autoRepairRouteRegistration(
    state.outputDir,
    routeAudit,
  );
  if (routeAutorepairs.appliedAny) {
    console.log(
      `${label}: auto-wired ${routeAutorepairs.wired.length} register*Routes call(s) in index.ts: ${routeAutorepairs.wired.join(", ")}.`,
    );
    getRepairEmitter(state.sessionId)({
      stage: "preflight-route-audit",
      event: "route_audit_autorepaired",
      details: {
        when: "preflight",
        wired: routeAutorepairs.wired,
        skippedWires: routeAutorepairs.skippedWires,
      },
    });
    routeAudit = await auditApiRouteRegistration(state.outputDir);
  }

  // ── Deterministic frontend router-wiring repair ──────────────────────
  // The frontend counterpart of the route-registration repair above: when a
  // real `router.tsx` (AppRouter) exists but `App.tsx` is still the scaffold
  // placeholder that inlines its own <Routes> and never imports it, rewire
  // App → AppRouter so `main → App → AppRouter` is closed. Without this an
  // S-tier app silently renders the scaffold "Welcome" page instead of the
  // product (the orphaned-router bug).
  const frontendRouterRepairs = await repairFrontendRouterWiring(
    state.outputDir,
  );
  if (frontendRouterRepairs.changed.length > 0) {
    console.log(
      `${label}: rewired orphaned frontend router(s): ${frontendRouterRepairs.changed.map((c) => c.file).join(", ")}.`,
    );
    getRepairEmitter(state.sessionId)({
      stage: "preflight-route-audit",
      event: "frontend_router_autorepaired",
      details: {
        when: "preflight",
        changed: frontendRouterRepairs.changed,
        skipped: frontendRouterRepairs.skipped,
      },
    });
  }

  const initialApiClientUniqueness = await auditFrontendApiClientUniqueness(
    state.outputDir,
  );
  let contractCompleteness = await auditContractCompleteness(state.outputDir);
  // Deterministic repair: append stub contract entries ONLY for HARD FAIL
  // missing scoped endpoints (not WARN-only items which may have /me/ alternatives).
  // Re-run the audit after appending so `contractCompleteness` reflects the
  // post-repair state in the rest of this function.
  if (contractCompleteness.missingScopedEndpoints.length > 0) {
    const appendResult = await autoAppendMissingScopedEndpoints(
      state.outputDir,
      contractCompleteness.missingScopedEndpoints,
    );
    if (appendResult.added.length > 0) {
      console.log(
        `${label}: auto-appended ${appendResult.added.length} scoped endpoint(s) to API_CONTRACTS.json during preflight: ${appendResult.added.join(", ")}`,
      );
    }
    if (appendResult.added.length > 0 || appendResult.skipped.length > 0) {
      getRepairEmitter(state.sessionId)({
        stage: "preflight-contract-completeness",
        event: "contract_completeness_autorepaired",
        details: {
          when: "preflight",
          added: appendResult.added,
          skipped: appendResult.skipped,
        },
      });
    }
    if (appendResult.added.length > 0) {
      contractCompleteness = await auditContractCompleteness(state.outputDir);
      // Fix 1 (contract completeness stubs): re-run routeAudit so
      // the newly-appended scoped endpoints appear in
      // `missingContractEndpoints` and our stub generation (below)
      // will create 501 handlers + register them in index.ts.
      // Without this re-run, autoAppendMissingScopedEndpoints adds
      // the contract entries but no handler is ever generated.
      routeAudit = await auditApiRouteRegistration(state.outputDir);
    }
  }
  if (initialDependencyAudit.remainingIssues.length > 0) {
    console.warn(
      `${label}: dependency audit still has ${initialDependencyAudit.remainingIssues.length} unresolved item(s).`,
    );
  }
  if (initialResidualConflicts.length > 0) {
    console.warn(
      `${label}: detected ${initialResidualConflicts.length} residual implementation conflict(s).`,
    );
  }
  const routeAuditHardFail =
    routeAudit.unregisteredModules.length > 0 ||
    routeAudit.unresolvedRegistrations.length > 0 ||
    routeAudit.missingContractEndpoints.length > 0;
  if (routeAuditHardFail) {
    console.warn(
      `${label}: API route audit found ${routeAudit.unregisteredModules.length} unregistered module(s), ${routeAudit.unresolvedRegistrations.length} dangling import(s), ${routeAudit.missingContractEndpoints.length} missing contract endpoint(s).`,
    );
  }
  if (contractCompleteness.missingScopedEndpoints.length > 0) {
    console.warn(
      `${label}: contract completeness audit found ${contractCompleteness.missingScopedEndpoints.length} missing scoped endpoint(s): ${contractCompleteness.missingScopedEndpoints
        .map((m) => m.expectedPath)
        .join(", ")}`,
    );
  }
  getRepairEmitter(state.sessionId)({
    stage: "preflight-route-audit",
    event: "route_audit_snapshot",
    details: {
      when: "preflight",
      hardFail: routeAuditHardFail,
      unregisteredModules: routeAudit.unregisteredModules,
      unresolvedRegistrations: routeAudit.unresolvedRegistrations,
      missingContractEndpoints: routeAudit.missingContractEndpoints,
      undeclaredEndpointCount: routeAudit.undeclaredEndpoints.length,
    },
  });
  getRepairEmitter(state.sessionId)({
    stage: "preflight-contract-completeness",
    event: "contract_completeness_snapshot",
    details: {
      when: "preflight",
      inferredRelationshipCount:
        contractCompleteness.inferredRelationships.length,
      missingScopedEndpoints: contractCompleteness.missingScopedEndpoints,
    },
  });

  // Fix 1: Auto-generate 501 stub files for missing contract endpoints at preflight.
  // This breaks the "no file to implement → no mutation → stagnation" cycle by giving
  // the verify-fix agent concrete stub files to fill in rather than starting from scratch.
  let preflightStubResult: GenerateMissingRouteStubsResult = {
    groups: [],
    indexPatched: false,
  };
  if (routeAudit.missingContractEndpoints.length > 0) {
    try {
      preflightStubResult = await generateMissingRouteStubs(
        state.outputDir,
        routeAudit.missingContractEndpoints,
      );
      const createdCount = preflightStubResult.groups.filter(
        (g) => g.created,
      ).length;
      if (createdCount > 0) {
        console.log(
          `${label}: preflight stub generation — created ${createdCount} stub file(s) for ${routeAudit.missingContractEndpoints.length} missing contract endpoint(s); index.ts patched=${preflightStubResult.indexPatched}.`,
        );
      }
      getRepairEmitter(state.sessionId)({
        stage: "preflight-stub-generation",
        event: "stub_generation_complete",
        details: {
          createdCount,
          totalGroups: preflightStubResult.groups.length,
          indexPatched: preflightStubResult.indexPatched,
          missingEndpointCount: routeAudit.missingContractEndpoints.length,
        },
      });
    } catch (e) {
      console.warn(
        `${label}: preflight stub generation failed (continuing): ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  const dbInfo = await detectDbDependencies(state.outputDir);
  const hasAnyOrmWithExternalDb =
    dbInfo.hasPrisma ||
    dbInfo.hasSequelize ||
    dbInfo.hasMongoose ||
    dbInfo.hasKnex ||
    dbInfo.hasDrizzle;

  if (hasAnyOrmWithExternalDb) {
    console.log(
      `${label}: ORM detected (prisma=${dbInfo.hasPrisma}, sequelize=${dbInfo.hasSequelize}, mongoose=${dbInfo.hasMongoose}, knex=${dbInfo.hasKnex}, drizzle=${dbInfo.hasDrizzle}). Running setup...`,
    );
    if (dbInfo.hasPrisma) {
      const prismaWarnings = await handlePrismaSetup(state.outputDir, dbInfo);
      if (prismaWarnings) {
        console.warn(
          `${label}: DB check warnings:\n${prismaWarnings.slice(0, 400)}`,
        );
      }
    }
    if (!dbInfo.hasDockerCompose) {
      console.warn(
        `${label}: No docker-compose.yml detected — app may fail at runtime without a DB.`,
      );
    }
    if (!dbInfo.hasDatabaseUrl) {
      console.warn(
        `${label}: No DATABASE_URL — configure before running the app.`,
      );
    }
  }
  if (dbInfo.hasBetterSqlite) {
    console.log(
      `${label}: better-sqlite3 detected (SQLite, file-based). No external service needed.`,
    );
  }

  // ── Package manager + version constraints ────────────────────────────────
  const pm = await detectPackageManager(state.outputDir);
  const versionConstraints = await buildVersionConstraints(state.outputDir);
  const frontendDir = path.join(state.outputDir, "frontend");
  const backendDir = path.join(state.outputDir, "backend");
  const hasFrontend = !(
    await fsRead("frontend/package.json", state.outputDir)
  ).startsWith("FILE_NOT_FOUND");
  const hasBackend = !(
    await fsRead("backend/package.json", state.outputDir)
  ).startsWith("FILE_NOT_FOUND");

  // ── Protected files list ──────────────────────────────────────────────────
  const protectedPaths = state.scaffoldProtectedPaths ?? [];
  const protectedFilesBlock =
    protectedPaths.length > 0
      ? [
          "",
          "## Protected scaffold files (YOU MAY EDIT THESE in this phase)",
          "The following files were generated from scaffold templates. During earlier phases",
          "they were write-protected, but in Final Verification you MUST inspect each one",
          "and fix any implementation errors, missing handlers, or PRD mismatches.",
          "Treat them with the same rigor as any other source file:",
          ...protectedPaths.map((p) => `  - ${p}`),
        ].join("\n")
      : "";

  // ── PRD context (relevance-trimmed to keep prompt manageable) ───────────
  // Previously this was `slice(0, 12000)` which silently hid PRD features
  // past the 12k mark from the integration-review agent. Replace with a
  // section-level picker that tries to keep feature-review-critical content.
  const integrationReviewHint = {
    keywords: [
      "feature",
      "requirement",
      "acceptance",
      "criteria",
      "page",
      "component",
      "endpoint",
      "flow",
      "scenario",
    ],
  };
  const prdTrimmed = state.projectContext
    ? pickRelevantSections(state.projectContext, integrationReviewHint, {
        budget: 18_000,
        label: "integration-review",
        stage: "worker-context",
        emitter: getRepairEmitter(state.sessionId),
      })
    : "";
  const prdBlock = prdTrimmed
    ? `\n## Product Requirements (PRD)\nUse this as the authoritative specification when reviewing feature completeness.\n\n${prdTrimmed}`
    : "";
  const dependencyAuditBlock =
    initialDependencyAudit.summary !== "Dependency consistency audit: clean."
      ? `\n## Preflight dependency audit\n${initialDependencyAudit.summary}`
      : "";
  const residualConflictBlock =
    initialResidualConflicts.length > 0
      ? `\n## Residual implementation conflicts detected before final verify\n${initialResidualConflicts.map((line) => `- ${line}`).join("\n")}`
      : "";
  const frontendNormalizationBlock =
    frontendNormalizationNotes.length > 0
      ? `\n## Frontend preflight normalizations already applied\n${frontendNormalizationNotes.map((line) => `- ${line}`).join("\n")}`
      : "";
  const frontendClusterBlock =
    frontendConvergenceClusters.length > 0
      ? `\n## Frontend error clusters to resolve structurally\n${frontendConvergenceClusters
          .map(
            (cluster, index) =>
              `${index + 1}. ${cluster.title}\n   - ${cluster.description}\n   - Files: ${cluster.files.join(", ")}`,
          )
          .join("\n")}`
      : "";
  const routeAuditBlock = (() => {
    const parts: string[] = [];
    if (routeAudit.findings.length > 0) {
      parts.push(
        `\n## Backend route registration audit (MUST fix before report_done(pass))\n${routeAudit.findings.join("\n")}`,
      );
    }
    // Fix 2: Append structured stub creation instructions so the agent knows exactly
    // which files to implement (501 stubs were created at preflight; agent fills them in).
    const stubBlock = formatMissingRouteStubBlock(preflightStubResult);
    if (stubBlock) parts.push(stubBlock);
    return parts.join("\n");
  })();
  const contractCompletenessBlock = (() => {
    if (contractCompleteness.findings.length === 0) return "";
    // Split HARD vs WARN sections from findings (WARN items contain "(advisory)").
    const hardLines = contractCompleteness.findings.filter(
      (l) => !l.includes("(advisory)") && !l.includes("[WARN only"),
    );
    const warnLines = contractCompleteness.findings.filter(
      (l) => l.includes("(advisory)") || l.includes("[WARN only"),
    );
    const parts: string[] = [];
    if (hardLines.length > 1) {
      parts.push(
        `\n## Contract completeness audit (HARD FAIL — fix these before report_done(pass))\nImplement each missing scoped-list endpoint: add to API_CONTRACTS.json, implement the handler, and register it in index.ts.\n${hardLines.join("\n")}`,
      );
    }
    if (warnLines.length > 1) {
      parts.push(
        `\n## Contract completeness advisory (WARN — review but does NOT block report_done)\nThese ORM relationships have alternative implementations (/me/... pattern or auth-filtered flat endpoints) that satisfy the requirement. Review only if a feature is visibly broken.\n${warnLines.join("\n")}`,
      );
    }
    return parts.join("\n");
  })();
  const apiClientUniquenessBlock =
    initialApiClientUniqueness.parallelClients.length > 0
      ? `\n## Frontend API client uniqueness audit (MUST fix before report_done(pass))\nA single canonical \`apiClient\` is required at \`${initialApiClientUniqueness.canonical}\`. The preflight normalizer left the following parallel client(s) intact because they still define their own implementation. Collapse them now.\n${initialApiClientUniqueness.findings.join("\n")}`
      : "";

  const systemPrompt = [
    "You are a Senior Full-Stack Engineer performing the **Final Verification** of a fully generated codebase.",
    "Your two objectives, in order:",
    "  1. FIRST review PRD completeness and fill missing implementations so the product is actually usable.",
    "  2. THEN perform registration closure plus scoped compile/build verification until all final gates pass.",
    "",
    "## Phase 0 — Contract usage coverage decisions (READ FIRST, ACT IMMEDIATELY)",
    "Before any other work, check the user message for a `## Contract usage coverage` block.",
    "That block contains a pre-classified list of contract / frontend-call mismatches. It is",
    "AUTHORITATIVE — the classification was performed deterministically against API_CONTRACTS.json,",
    "the actual frontend code, and the PRD. Do NOT re-derive these decisions; just execute them.",
    "",
    "The 4-quadrant decision tree (already applied for you):",
    "  case (1) frontend-wiring-missing  → contract has it, frontend doesn't call it, PRD requires it.",
    "                                       ACTION: write the frontend wiring (apiClient call + UI",
    "                                       hookup). Do NOT modify API_CONTRACTS.json.",
    "  case (2) contract-surplus          → already pruned from API_CONTRACTS.json by the audit.",
    "                                       ACTION: none — the contract is now correct.",
    "  case (3) contract-gap-add-and-impl → frontend already calls an endpoint not in contract,",
    "                                       and PRD justifies it. ACTION: add the entry to",
    "                                       API_CONTRACTS.json (infer schema from the call site)",
    "                                       AND implement the backend route.",
    "  case (4) frontend-rogue-call       → frontend calls an endpoint with no contract entry and",
    "                                       no PRD justification. ACTION: remove the rogue call",
    "                                       (or replace with the canonical contract endpoint).",
    "",
    "You ARE explicitly allowed to:",
    "  - edit API_CONTRACTS.json (cases 2 already done; case 3 requires adding entries)",
    "  - delete frontend API calls (case 4)",
    "The PRD is the only source of truth. Contract is a derived artefact, NOT an immutable spec.",
    "",
    "Anti-pattern: defaulting to 'implement the missing endpoint' when the route audit later",
    "reports it as missing-from-backend. If the contract entry corresponds to a case (1) repair",
    "task above, the FRONTEND is what's missing — implementing a backend stub the frontend will",
    "never call wastes budget. If the entry was a case (2) it was already pruned, so you'll never",
    "see it again. If you DO see new missing-impl reports from the route audit not covered by the",
    "above tasks, those are genuine backend gaps and you should implement them.",
    "",
    "## Phase 0.5 — PRD Completeness & Routing/Module Registration",
    "Before compile/build validation, inspect these integration points first:",
    "1. Review the PRD and identify missing pages, flows, handlers, middlewares, and end-to-end feature gaps.",
    "2. Frontend route closure:",
    "   - Scan `frontend/src/views` for actual page files.",
    "   - **Also scan `frontend/src/pages`** — if any page-level `.tsx` files exist there, **move them** to `frontend/src/views` (flat, no subdirectories) and delete the `frontend/src/pages` directory. `src/pages` is a Next.js convention; M-tier Vite+React projects use `src/views`.",
    "   - Ensure views are flat: if files are nested in subdirectories like `views/auth/LoginPage.tsx`, move them to `views/LoginPage.tsx` directly.",
    "   - Read `frontend/src/router.tsx`.",
    "   - Import and register every real page that should be reachable unless it is clearly dead code. Imports must use `./views/...` paths.",
    "3. Backend API module closure:",
    "   - Scan `backend/src/api/modules` for implemented module route files.",
    "   - Read `backend/src/api/modules/index.ts`.",
    "   - Import and register every implemented module route unless it is clearly unused/dead code.",
    "4. Backend middleware closure:",
    "   - Scan `backend/src/middlewares` for implemented middleware files.",
    "   - Read `backend/src/app.ts`.",
    "   - Register missing middleware usage in the correct app bootstrap order when the middleware is part of the actual server pipeline.",
    "5. Fix these registration and PRD completeness gaps first, then continue with compile/build verification.",
    "",
    "## Phase 1 — PRD Implementation Review",
    "1. List all major features/requirements in the PRD",
    "2. For each feature, verify the implementation:",
    "   a. Use `grep` to find related files and handlers",
    "   b. Read the relevant source files",
    "   c. Check: is the feature fully implemented? Are edge cases handled?",
    "   d. Check: will a real user be able to use this feature end-to-end?",
    "3. Backend cross-file consistency review (MANDATORY for every create/update/read flow backed by persistence):",
    "   a. Read the request DTO/type, validation schema, controller/service payload, and ORM model together.",
    "   b. Check that user-input fields vs system-generated fields are consistent across those files.",
    "   c. If a model field is required (`allowNull: false`) but missing from both the create payload and model defaults, fix the inconsistency.",
    "   d. If the model uses Sequelize timestamps (`timestamps: true` or timestamp aliases), ensure services/controllers are NOT forced to manually provide `createdAt` / `updatedAt` unless the project already uses that pattern consistently.",
    "   e. Ensure system fields like `id`, `createdAt`, `updatedAt`, timestamp aliases, and lifecycle-generated fields are not mistakenly required in request DTOs/validation.",
    "   f. When a controller catches an internal error, do not leave it as an unobservable black box in development; keep useful logging or structured error details so runtime failures remain diagnosable.",
    "4. Fix any missing or broken feature implementations",
    "5. Specifically inspect every Protected Scaffold File listed below:",
    "   - Check that business logic was correctly added (not left as stub/TODO)",
    "   - Check that routes, controllers, services, and configs are wired up correctly",
    "   - Fix any implementation errors — you ARE allowed to edit these files in this phase",
    "",
    "## Phase 2 — Scoped Compile & Build Validation",
    "Use ONLY scoped validation commands under `frontend/` and `backend/`.",
    `1. Frontend type-check: \`cd frontend && ${hasFrontend ? "npx tsc -p tsconfig.app.json --pretty false 2>&1" : "echo skip-frontend"}\``,
    `2. Frontend build: \`cd frontend && ${hasFrontend ? (pm === "yarn" ? "yarn run build 2>&1" : pm === "npm" ? "npm run build 2>&1" : "pnpm run build 2>&1") : "echo skip-frontend"}\``,
    `3. Backend type-check: \`cd backend && ${hasBackend ? "npx tsc --noEmit --pretty false 2>&1" : "echo skip-backend"}\``,
    `4. Backend startup smoke: \`cd backend && ${hasBackend ? "npx tsx --eval \\\"(async () => { const { existsSync } = await import('node:fs'); const dbCandidates = ['./src/db.ts', './src/config/database.ts', './src/database/connection.ts']; const dbEntry = dbCandidates.find((candidate) => existsSync(candidate)); if (dbEntry) { await import(dbEntry); if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL missing after importing backend database entry; ensure dotenv is loaded in the startup/database chain'); } const mod = await import('./src/app.ts'); const createApp = mod.createApp ?? mod.default?.createApp ?? mod.default; if (typeof createApp !== 'function') throw new Error('createApp export missing'); const app = await createApp(); if (!app || typeof app.callback !== 'function') throw new Error('createApp did not return a Koa app'); console.log('backend_smoke_ok'); })().catch((error) => { console.error(error instanceof Error ? (error.stack ?? error.message) : String(error)); process.exit(1); });\\\" 2>&1" : "echo skip-backend"}\``,
    "5. For each TypeScript/build/runtime smoke error:",
    "   a. Read the file with the error",
    "   b. Read any imported modules that are missing exports",
    "   c. Write the minimal fix",
    "6. Any `write_file` or mutating install/generate command makes prior validation STALE.",
    "7. After the LAST mutation, re-run all scoped validation gates in full, including backend startup smoke.",
    "8. Only after registration closure is complete and all scoped validation gates pass may you call `report_done(status='pass', summary=...)`",
    "   OR `report_done(status='fail', summary=<unresolved issues>)` if critical features cannot be fixed",
    "",
    "## Phase 2.25 — Delivery hardening",
    "1. Resolve import/package mismatches so every runtime import is declared in the correct package.json.",
    "2. Remove or merge residual duplicate implementations when the same responsibility exists in old/new canonical paths.",
    "3. **Stagnation guard**: If you detect yourself rereading the same file or running the same command without making a `write_file` change for 3+ iterations, STOP. Either: (a) make the minimal targeted fix right now, or (b) if all remaining issues are WARN-only, call report_done(pass) with an explanation. Looping without mutations wastes budget and never converges.",
    "5. **Working directory & probing**: every `bash`/`read_file` already runs from the project directory shown at the top of the user message. Do NOT `cd` to absolute paths like `/home/user`, and do NOT keep probing for files that returned FILE_NOT_FOUND (e.g. `.ralph/route-audit.json` may not exist) — the actionable audit findings are already inlined in this message as the route-audit / contract / runtime-smoke / TDD repair blocks. Act on those blocks instead of re-fetching files.",
    "4. Treat repeated frontend TypeScript templates as cluster problems, not isolated file problems: fix the shared abstraction or repeated pattern first, then return to leaf files.",
    "",
    "## Phase 2.3 — Cluster priority order (READ BEFORE EDITING ANY LEAF FILE)",
    "Apply fixes in this exact priority order. Do NOT jump ahead — fixing a leaf file before its parent cluster is the #1 cause of stagnation.",
    "  P0. **Frontend shared API surface mismatch** — there must be exactly ONE HTTP client at `frontend/src/api/client.ts`. If you see a second client (e.g. `frontend/src/utils/apiClient.ts`, `frontend/src/lib/http.ts`) or feature files importing from two different clients, FIRST collapse to the canonical client and rewrite consumer imports. Only after that re-run frontend `tsc`.",
    "  P0. **Backend route registration mismatch** — registrar export name vs `index.ts` import; mount-prefix mismatch; `apiRouter.<verb>` vs sub-router pattern. Fix the registrar/index pair before chasing per-endpoint TS errors. For each dangling import entry: read the actual routes.ts, align the export name with the import (fix either side), never leave a gap between import and export.",
    "  P1. **Backend Koa body / DTO typing** — rely on the scaffold-provided `koa.d.ts` augmentation; do NOT scatter `(ctx.request as any).body`. Validate with Joi, then cast to a typed DTO once.",
    "  P1. **Backend JWT typing** — use `signJwt` / `verifyJwt` from `backend/src/utils/jwt.ts`. Do NOT call `jsonwebtoken` directly in feature code.",
    "  P1. **Backend GET + validateBody** — strip `validateBody(...)` from any `apiRouter.get(...)` call; rebind to the correct `list*` / `get*` handler.",
    "  P2. Frontend JSX namespace / hook signature / component template residuals (already covered by preflight; only fix leaks).",
    "  P3. Per-file leaf TypeScript errors.",
    "When the same error message recurs across ≥3 files, stop and treat it as a cluster (P0/P1) — not as isolated leaf bugs.",
    "",
    "## Phase 2.5 — Mock / Stub Cleanup",
    "1. Search frontend source for mock API interceptor files or imports (e.g. `mockApi`, `mock-server`, `msw/handlers`, `__mocks__`). Delete any such files and remove their imports (e.g. `import './lib/mockApi'` in `App.tsx`).",
    "2. Read `frontend/src/context/AuthContext.tsx` (or equivalent auth provider). If the provider is a no-op stub that always returns `{ isAuthenticated: false, user: null }`, replace it with a real implementation that reads `token`/`user` from `localStorage`, exposes `login()`/`logout()` functions, and sets `isAuthenticated` based on whether a token exists.",
    "3. Search for any remaining `throw new Error('Not implemented')` stubs in backend controllers/services. If found, either implement them or remove the dead file.",
    "",
    "## Hard rules",
    "- Do NOT switch HTTP frameworks (Express ↔ Fastify ↔ Koa) or frontend frameworks.",
    "- For split M-tier projects, keep routing in frontend/src/router.tsx and backend API modules under backend/src/api/modules.",
    "- Coding-stage tasks may leave shared registration files incomplete by design; IntegrationVerifyFix owns the final registration closure.",
    "- Registration closure is mandatory: treat missing registrations in `frontend/src/router.tsx`, `backend/src/api/modules/index.ts`, and `backend/src/app.ts` as top-priority integration defects.",
    "- Do not stop after making pages/controllers/middlewares exist on disk; they must be wired into the actual router/module/app entrypoints.",
    "- When a shared module imports a named route registrar or app helper, verify the source file exports that exact symbol; import/export name mismatches are runtime blockers.",
    '- **Dangling import protocol** — when the route audit reports `index.ts imports "registerXRoutes" but no routes.ts defines that export`, follow this exact 3-step procedure:',
    "    1. Read the actual routes.ts file for that module (e.g. `backend/src/api/modules/users/users.routes.ts`) to find its real export name.",
    "    2. Choose ONE of: (a) rename the `export function register*Routes` in routes.ts to match what index.ts expects, OR (b) fix the import line in index.ts to match the actual export name in routes.ts.",
    "    3. Never add a new import to index.ts for a registrar function unless you simultaneously verify OR create that exact export name in the corresponding routes.ts.",
    "- **Component prop contract (P0 HARD FAIL)**: TypeScript error TS2322 of the form \"Property 'X' does not exist on type '...ComponentProps'. Did you mean 'Y'?\" is a P0 HARD FAIL. Read the component's Props type definition (see 'Component Interface Reference' block in the user message), use the CORRECT field name shown there, and DO NOT pass undeclared props. These errors block report_done(pass) exactly like dangling route imports.",
    "- **Stale validation rule (ENFORCED)**: After ANY write_file or mutating bash command ALL 4 scoped validation results become stale. You MUST re-run the FULL 4-command validation sequence (frontend_tsc → frontend_build → backend_tsc → backend_smoke) before calling report_done(pass). Calling report_done(pass) with stale validation will be REJECTED by the system.",
    "- If `run_validation_suite` returns `pass=true`, STOP immediately and call `report_done(status='pass')`. Do NOT write, patch, delete, move, or create verification helper files after a passing validation suite.",
    "- Never create source files named `verify-final.ts`, `final-check.ts`, or `validation-check.ts`; use `run_validation_suite` or scoped bash validation instead.",
    "- Run verification ONLY inside `frontend/` and `backend/`. Do not use root-level `npx tsc` against the whole generated-code tree in this phase.",
    "- Do NOT call `report_done(status='pass')` while dependency audit issues remain unresolved.",
    "- Do NOT call `report_done(status='pass')` while the 'Backend route registration audit' block lists unregistered modules, dangling register*Routes imports, or API_CONTRACTS endpoints with no matching implementation. Fix each entry (register, implement, or remove) before finishing.",
    "- The 'Contract completeness audit' section has two kinds of findings: **HARD FAIL** items (section header says 'HARD FAIL') block report_done(pass) — implement those. **WARN** items (header says 'WARN only') are advisory; they do NOT block report_done(pass). Common WARN patterns: /me/... alternative endpoints, auth-filtered flat endpoints. If only WARN items remain, you MAY call report_done(pass).",
    "- **Audit false-positive exit**: If a route audit or contract-completeness finding is demonstrably incorrect (e.g., the route IS registered but the audit used a wrong export name, or the scoped endpoint IS present under a /me/... path), document the discrepancy in your report_done summary and call report_done(pass). Do NOT loop indefinitely trying to fix a false positive.",
    "- In this phase, scaffold-protected files do NOT block edits. You may overwrite protected scaffold files when registration or PRD completeness requires it.",
    "- Minimal targeted changes — do not rewrite working code.",
    "- Install missing npm packages: `pnpm add <pkg> --filter <workspace-name>`",
    "- If errors include [CONVENTION], they are policy violations and MUST be fixed.",
    "- When frontend errors repeat across many files, prefer fixing the shared hook/type/template that generates the cluster instead of patching one leaf file at a time.",
    ...(versionConstraints ? ["", versionConstraints] : []),
    protectedFilesBlock,
  ].join("\n");

  const componentInterfaceBlock = await buildComponentInterfaceReference(
    state.outputDir,
  ).catch(() => "");

  // ── Coverage repair-task block ─────────────────────────────────────────
  // Render the deterministic decisions from `runContractUsageCoverage` as a
  // checklist the verify-fix worker should execute first. Empty string when
  // the audit didn't produce actionable items (or wasn't run).
  let coverageBlock = "";
  if (coverageResult) {
    const { totals, pruned, pendingRepairTasks } = coverageResult;
    const noiseFree = pruned.length === 0 && pendingRepairTasks.length === 0;
    if (!noiseFree) {
      const lines: string[] = ["", "## Contract usage coverage"];
      lines.push(
        `Totals: contractEntries=${totals.contractEntries}, frontendCalls=${totals.frontendCalls}, consistent=${totals.consistent}, surplus=${totals.surplus} (pruned), wiring-missing=${totals.frontendWiringMissing}, contract-gap=${totals.contractGap}, rogue=${totals.frontendRogue}, admin-skipped=${totals.adminSkipped}.`,
      );
      if (pruned.length > 0) {
        lines.push("");
        lines.push(
          `**Already pruned from API_CONTRACTS.json (${pruned.length})** — these endpoints had no PRD justification and no frontend caller. Do NOT try to re-add them; they were correctly removed.`,
        );
        for (const p of pruned.slice(0, 12)) {
          lines.push(`  - PRUNED: ${p.method} ${p.endpoint}`);
        }
        if (pruned.length > 12) {
          lines.push(
            `  - … (+${pruned.length - 12} more, full list in .ralph/contract-usage-coverage.json)`,
          );
        }
      }
      if (pendingRepairTasks.length > 0) {
        const wiring = pendingRepairTasks.filter(
          (t) => t.case === "frontend-wiring-missing",
        );
        const gaps = pendingRepairTasks.filter(
          (t) => t.case === "contract-gap-add-and-impl",
        );
        const rogue = pendingRepairTasks.filter(
          (t) => t.case === "frontend-rogue-call",
        );
        if (wiring.length > 0) {
          lines.push("");
          lines.push(
            `**Case (1) Frontend wiring missing — execute these (${wiring.length}):**`,
          );
          for (const t of wiring.slice(0, 10)) {
            lines.push(
              `  - [frontend] ${t.method} ${t.endpoint} — ${t.directive}`,
            );
          }
          if (wiring.length > 10) {
            lines.push(`  - … (+${wiring.length - 10} more)`);
          }
        }
        if (gaps.length > 0) {
          lines.push("");
          lines.push(
            `**Case (3) Contract gap — add to API_CONTRACTS.json + implement backend (${gaps.length}):**`,
          );
          for (const t of gaps.slice(0, 10)) {
            lines.push(
              `  - [contract+backend] ${t.method} ${t.endpoint} (call site: ${t.sourcePath ?? "?"}) — ${t.directive}`,
            );
          }
          if (gaps.length > 10) {
            lines.push(`  - … (+${gaps.length - 10} more)`);
          }
        }
        if (rogue.length > 0) {
          lines.push("");
          lines.push(
            `**Case (4) Frontend rogue calls — remove or rewrite (${rogue.length}):**`,
          );
          for (const t of rogue.slice(0, 10)) {
            lines.push(
              `  - [frontend] ${t.method} ${t.endpoint} at ${t.sourcePath ?? "?"} — ${t.directive}`,
            );
          }
          if (rogue.length > 10) {
            lines.push(`  - … (+${rogue.length - 10} more)`);
          }
        }
      }
      lines.push("");
      lines.push(
        "These tasks are PRE-CLASSIFIED. Execute them in one batch pass before re-running the route audit. Full data: `.ralph/contract-usage-coverage.json`.",
      );
      lines.push(
        "**MUST fix before report_done(pass)**: each frontend-wiring-missing entry above MUST be addressed by (a) editing the corresponding frontend client/hook to call the endpoint, OR (b) deleting the contract entry from API_CONTRACTS.json if the PRD does not actually require it. Calling report_done(pass) while wiring-missing entries remain leaves the gate red.",
      );
      coverageBlock = lines.join("\n");
    }
  }

  // Fallback: even if the in-memory coverageResult is empty (e.g. retry
  // sub-graph that skipped preflight), surface the on-disk audit so the
  // worker still sees the 14-wiring backlog instead of starting blind.
  if (!coverageBlock) {
    try {
      const raw = await fsRead(
        ".ralph/contract-usage-coverage.json",
        state.outputDir,
      );
      if (!raw.startsWith("FILE_NOT_FOUND") && !raw.startsWith("REJECTED")) {
        const parsed: unknown = JSON.parse(raw);
        if (
          typeof parsed === "object" &&
          parsed !== null &&
          "classifications" in parsed &&
          Array.isArray(
            (parsed as { classifications: unknown[] }).classifications,
          )
        ) {
          const classifications = (
            parsed as {
              classifications: Array<{
                case?: string;
                contract?: { method?: string; endpoint?: string };
              }>;
            }
          ).classifications;
          const wiring = classifications.filter(
            (c) => c.case === "frontend-wiring-missing",
          );
          if (wiring.length > 0) {
            const lines: string[] = [
              "",
              "## Contract usage coverage (from .ralph snapshot)",
              `**Case (1) Frontend wiring missing (${wiring.length})** — these contracts have no frontend caller. Either wire them up or remove from API_CONTRACTS.json. MUST fix before report_done(pass).`,
            ];
            for (const c of wiring.slice(0, 10)) {
              lines.push(
                `  - ${c.contract?.method ?? "?"} ${c.contract?.endpoint ?? "?"}`,
              );
            }
            if (wiring.length > 10) {
              lines.push(`  - … (+${wiring.length - 10} more)`);
            }
            coverageBlock = lines.join("\n");
          }
        }
      }
    } catch {
      /* ignore — no actionable snapshot available */
    }
  }

  // Render the runtime-integration-audit findings (CODEGEN_HARDENING_PLAN.md
  // §4.2 / §4.3 / §4.4 / §4.5 / §4.7) — empty when the audit was clean or
  // didn't run. Rendered immediately after `coverageBlock` so the worker
  // sees both deterministic decision sets back-to-back.
  //
  // Prefer the per-finding closed-task block from `dispatchRuntimeAudit`
  // (stable IDs, one task per residual finding, deterministic fixes
  // already excluded) over the legacy free-form prose block. The legacy
  // renderer is only kept as a fallback for when the dispatcher failed to
  // run.
  const runtimeAuditBlock = runtimeAuditDispatch
    ? formatRuntimeAuditTasksBlock(runtimeAuditDispatch)
    : runtimeAuditResult
      ? formatRuntimeAuditBlock(runtimeAuditResult)
      : "";

  const adminRouteCoverageBlock = adminRouteCoverageResult
    ? formatAdminRouteCoverageBlock(adminRouteCoverageResult)
    : "";
  const tddRepairBlock = await formatTddRepairBlock(state.outputDir);
  const runtimeSmokeBlock = await formatRuntimeSmokeBlock(state.outputDir, {
    sessionId: state.sessionId,
  });

  const openingUserContent = [
    `Project directory: ${state.outputDir}`,
    `Package manager: ${pm}`,
    prdBlock,
    coverageBlock,
    adminRouteCoverageBlock,
    runtimeAuditBlock,
    runtimeSmokeBlock,
    tddRepairBlock,
    dependencyAuditBlock,
    residualConflictBlock,
    frontendNormalizationBlock,
    frontendClusterBlock,
    routeAuditBlock,
    contractCompletenessBlock,
    apiClientUniquenessBlock,
    componentInterfaceBlock,
    "",
    "Begin with PRD completeness review and shared registration closure first, then run scoped frontend/backend validation after the feature补写 is complete.",
  ]
    .filter(Boolean)
    .join("\n");

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: openingUserContent },
  ];

  const modelChain = resolveCodingChain(
    state.codingMode,
    "phaseVerifyFix",
    "claude-sonnet",
  );

  let iterations = 0;
  let finalStatus: "pass" | "fail" = "fail";
  let finalSummary = "";
  let totalCostUsd = 0;
  let contextCompressionUsed = false;
  const integrationReasoningOptions = buildIntegrationReasoningOptions();
  // This pass may run at most the per-loop max, but never more than the
  // remaining session-wide budget — so cumulative attempts across all
  // re-entries can never exceed INTEGRATION_VERIFY_FIX_TOTAL_BUDGET.
  const maxIterations = Math.min(
    readIntegrationVerifyFixMaxIterations(),
    remainingBudget,
  );
  let validationStale = true;
  let lastMutationAt: string | null = null;
  let lastMutationReason = "initial integration review";
  let lastFullValidationAt: string | null = null;
  let frontendTscOkAt: string | null = null;
  let frontendBuildOkAt: string | null = null;
  let backendTscOkAt: string | null = null;
  let backendSmokeOkAt: string | null = null;
  let consecutiveNoMutationIterations = 0;
  let lastStagnationGuidanceAt = 0;
  let stagnationWarningsWithoutProgress = 0;
  // CODEGEN_HARDENING_PLAN.md §7.4 — pre-abort fallback retry. When the
  // stagnation abort would normally fire, the worker gets ONE batched
  // "do classify-then-write" prompt and 2 extra iterations to actually
  // mutate the workspace. If that still produces nothing, we abort for
  // real. This recovers the common failure mode where the worker had the
  // right intent but couldn't see the next concrete action.
  let stagnationFallbackUsed = false;
  let stagnationFallbackIterationsLeft = 0;
  let stagnationFallbackPassedEmitted = false;
  // R6: when fallback ALSO exhausts without progress, try ONE fresh-eyes
  // replan before truly aborting. Resets bloated message history,
  // injects a focused 3-step plan from a separate LLM call.
  let stagnationReplanAttempted = false;
  let stagnationReplanBudgetLeft = 0;
  const repeatedReadOnlyActionCounts = new Map<string, number>();
  let progressScore = 0;
  let lastMeaningfulProgressIteration = 0;
  let lastMeaningfulProgressReason = "initial integration review";
  const bestValidationIssueMetrics: Partial<
    Record<ScopedValidationKind, ScopedValidationIssueMetrics>
  > = {};
  let bestDependencyIssueCount = initialDependencyAudit.remainingIssues.length;
  let bestRouteIssueCount = countRouteAuditIssues(routeAudit);
  let bestContractCompletenessIssueCount =
    countContractCompletenessIssues(contractCompleteness);

  function nowIso(): string {
    return new Date().toISOString();
  }

  function markValidationStale(reason: string): void {
    validationStale = true;
    lastMutationAt = nowIso();
    lastMutationReason = reason;
    lastFullValidationAt = null;
    frontendTscOkAt = null;
    frontendBuildOkAt = null;
    backendTscOkAt = null;
    backendSmokeOkAt = null;
    delete bestValidationIssueMetrics.frontend_tsc;
    delete bestValidationIssueMetrics.frontend_build;
    delete bestValidationIssueMetrics.backend_tsc;
    delete bestValidationIssueMetrics.backend_smoke;
    console.log(`${label}: validation marked stale — ${reason}`);
  }

  function buildToolFingerprint(
    name: string,
    args: Record<string, unknown>,
    command: string,
  ): string | null {
    switch (name) {
      case "read_file":
        return `read_file:${String(args.path ?? "").trim()}`;
      case "list_files":
        return `list_files:${String(args.dir ?? ".").trim()}`;
      case "grep":
        return `grep:${String(args.path ?? ".").trim()}:${String(args.pattern ?? "").trim()}`;
      case "bash":
        return `bash:${command.replace(/\s+/g, " ").trim().slice(0, 180)}`;
      default:
        return null;
    }
  }

  function injectStagnationGuidance(
    reason: string,
    repeatedAction: string | null,
    escalated: boolean,
  ): void {
    if (escalated) {
      messages.push({
        role: "user",
        content: [
          "SYSTEM CORRECTION — ESCALATED: IntegrationVerifyFix has stagnated across multiple warnings.",
          `Reason: ${reason}`,
          repeatedAction ? `Repeated action: ${repeatedAction}` : "",
          "",
          "You MUST pick exactly ONE of the following actions on the NEXT turn. Do not read another file first.",
          "",
          "  1. `write_file` with a concrete, minimal code change that addresses the highest-priority failing gate. Even a partial fix is better than more reading.",
          "  2. `bash` command that makes progress (install a missing dep, run a scoped tsc, delete a residual duplicate file, etc.) — no read-only `ls`/`grep`.",
          "  3. `report_done(status='fail', summary=<one sentence naming the specific file and line you cannot resolve>)`. This is acceptable when you honestly cannot fix something — it is NOT acceptable to keep reading.",
          "",
          "Do not emit a plan, do not summarise what you've read. Your next tool call must be one of the three above.",
        ]
          .filter(Boolean)
          .join("\n"),
      });
      return;
    }
    messages.push({
      role: "user",
      content: [
        "SYSTEM CORRECTION — IntegrationVerifyFix is stagnating.",
        `Reason: ${reason}`,
        repeatedAction ? `Repeated action: ${repeatedAction}` : "",
        "Stop rereading the same files. Switch to the highest-signal unresolved gate, make a concrete code change, then re-run scoped validation.",
        "Apply Phase 2.3 cluster priority order: P0 frontend shared API surface mismatch → P0 backend route registration → P1 backend Koa body / DTO typing → P1 backend JWT typing → P1 backend GET+validateBody → P2 JSX/template residuals → P3 leaf TS errors.",
        "If you see two HTTP clients in the frontend, collapse them to `frontend/src/api/client.ts` and rewrite imports BEFORE running another `tsc`.",
        "If duplicate implementations exist, choose the canonical path and remove or merge the residual copy.",
        "If dependency audit issues remain, fix package.json/import mismatches before doing more exploratory reads.",
        "If the blocker is a scaffold-protected file (e.g. `frontend/src/api/client.ts`), remember this phase permits overwriting protected scaffold files.",
      ]
        .filter(Boolean)
        .join("\n"),
    });
  }

  function recordMeaningfulProgress(reason: string, amount = 1): void {
    progressScore = Math.min(
      MAX_INTEGRATION_PROGRESS_SCORE,
      progressScore + amount,
    );
    lastMeaningfulProgressIteration = iterations;
    lastMeaningfulProgressReason = reason;
    console.log(
      `${label}: progress recorded — ${reason} (score=${progressScore}/${MAX_INTEGRATION_PROGRESS_SCORE})`,
    );
  }

  function decayProgressScore(): void {
    progressScore = Math.max(0, progressScore - 1);
  }

  function noteValidationIssueTrend(
    kind: ScopedValidationKind,
    result: string,
  ): string | null {
    const metrics = extractScopedValidationIssueMetrics(kind, result);
    if (metrics === null) return null;
    const previousBest = bestValidationIssueMetrics[kind];
    if (!previousBest) {
      bestValidationIssueMetrics[kind] = metrics;
      return null;
    }
    if (!isValidationIssueMetricsImproved(metrics, previousBest)) {
      return null;
    }
    bestValidationIssueMetrics[kind] = metrics;
    return `validation_issue_metrics:${kind} files ${previousBest.files}->${metrics.files}, errors ${previousBest.errors}->${metrics.errors}`;
  }

  async function collectStructuralProgressReasons(): Promise<string[]> {
    const reasons: string[] = [];

    const dependencyAudit = await auditImportDependencyConsistency(
      state.outputDir,
    );
    if (dependencyAudit.remainingIssues.length < bestDependencyIssueCount) {
      reasons.push(
        `dependency_audit ${bestDependencyIssueCount}->${dependencyAudit.remainingIssues.length}`,
      );
      bestDependencyIssueCount = dependencyAudit.remainingIssues.length;
    }

    const currentRouteAudit = await auditApiRouteRegistration(state.outputDir);
    const routeIssueCount = countRouteAuditIssues(currentRouteAudit);
    if (routeIssueCount < bestRouteIssueCount) {
      reasons.push(`route_audit ${bestRouteIssueCount}->${routeIssueCount}`);
      bestRouteIssueCount = routeIssueCount;
    }

    const currentContractCompleteness = await auditContractCompleteness(
      state.outputDir,
    );
    const contractIssueCount = countContractCompletenessIssues(
      currentContractCompleteness,
    );
    if (contractIssueCount < bestContractCompletenessIssueCount) {
      reasons.push(
        `contract_completeness ${bestContractCompletenessIssueCount}->${contractIssueCount}`,
      );
      bestContractCompletenessIssueCount = contractIssueCount;
    }

    return reasons;
  }

  function getDynamicStagnationThresholds(): {
    warnAt: number;
    abortAt: number;
  } {
    const abortAt =
      BASE_INTEGRATION_STAGNATION_ABORT_ITERATIONS +
      progressScore * INTEGRATION_STAGNATION_ABORT_BONUS_PER_PROGRESS;
    const warnAt = Math.min(
      abortAt - 4,
      BASE_INTEGRATION_STAGNATION_WARNING_ITERATIONS +
        progressScore * INTEGRATION_STAGNATION_WARNING_BONUS_PER_PROGRESS,
    );
    return { warnAt, abortAt };
  }

  function markScopedValidationSuccess(kind: ScopedValidationKind): boolean {
    const ts = nowIso();
    const wasFrontendTscOk = !!frontendTscOkAt;
    const wasFrontendBuildOk = !!frontendBuildOkAt;
    const wasBackendTscOk = !!backendTscOkAt;
    const wasBackendSmokeOk = !!backendSmokeOkAt;
    bestValidationIssueMetrics[kind] = { files: 0, errors: 0 };
    if (kind === "frontend_tsc") frontendTscOkAt = ts;
    if (kind === "frontend_build") frontendBuildOkAt = ts;
    if (kind === "backend_tsc") backendTscOkAt = ts;
    if (kind === "backend_smoke") backendSmokeOkAt = ts;
    const frontendReady =
      !hasFrontend || (!!frontendTscOkAt && !!frontendBuildOkAt);
    const backendReady =
      !hasBackend || (!!backendTscOkAt && !!backendSmokeOkAt);
    if (frontendReady && backendReady) {
      validationStale = false;
      lastFullValidationAt = ts;
      console.log(
        `${label}: scoped validations now fresh — frontend_tsc=${frontendTscOkAt ?? "skip"} frontend_build=${frontendBuildOkAt ?? "skip"} backend_tsc=${backendTscOkAt ?? "skip"} backend_smoke=${backendSmokeOkAt ?? "skip"}`,
      );
    }
    return (
      (kind === "frontend_tsc" && !wasFrontendTscOk) ||
      (kind === "frontend_build" && !wasFrontendBuildOk) ||
      (kind === "backend_tsc" && !wasBackendTscOk) ||
      (kind === "backend_smoke" && !wasBackendSmokeOk)
    );
  }

  function markAllScopedValidationsFresh(reason: string): void {
    const kinds: ScopedValidationKind[] = [];
    if (hasFrontend) kinds.push("frontend_tsc", "frontend_build");
    if (hasBackend) kinds.push("backend_tsc", "backend_smoke");
    for (const kind of kinds) {
      markScopedValidationSuccess(kind);
    }
    validationStale = false;
    lastFullValidationAt = nowIso();
    console.log(
      `${label}: scoped validations fresh via ${reason} — frontend_tsc=${frontendTscOkAt ?? "skip"} frontend_build=${frontendBuildOkAt ?? "skip"} backend_tsc=${backendTscOkAt ?? "skip"} backend_smoke=${backendSmokeOkAt ?? "skip"}`,
    );
  }

  async function runFinalScopedValidationGates(): Promise<{
    pass: boolean;
    summary: string;
  }> {
    const failures: string[] = [];
    const passes: string[] = [];

    async function runCheck(
      name: string,
      command: string,
      cwd: string,
      kind: ScopedValidationKind,
    ): Promise<void> {
      const result = await shellExec(command, cwd, { timeout: 120_000 });
      const combined = `${result.stdout}${result.stderr}`.trim();
      if (result.exitCode === 0) {
        markScopedValidationSuccess(kind);
        passes.push(`${name}: pass`);
        return;
      }
      failures.push(
        `${name} failed:\n${combined.slice(0, 2000) || `exit_code=${result.exitCode}`}`,
      );
    }

    console.log(
      `${label}: running final scoped validation gates (stale=${validationStale}, lastMutationAt=${lastMutationAt ?? "never"})`,
    );

    if (hasFrontend) {
      await runCheck(
        "frontend_tsc",
        "npx tsc -p tsconfig.app.json --pretty false 2>&1",
        frontendDir,
        "frontend_tsc",
      );
      const frontendPm = await detectPackageManager(frontendDir);
      const frontendBuildCmd =
        frontendPm === "yarn"
          ? "yarn run build 2>&1"
          : frontendPm === "npm"
            ? "npm run build 2>&1"
            : "pnpm run build 2>&1";
      await runCheck(
        "frontend_build",
        frontendBuildCmd,
        frontendDir,
        "frontend_build",
      );
    } else {
      passes.push("frontend gates: skipped (frontend/package.json not found)");
    }

    if (hasBackend) {
      await runCheck(
        "backend_tsc",
        "npx tsc --noEmit --pretty false 2>&1",
        backendDir,
        "backend_tsc",
      );
      await runCheck(
        "backend_smoke",
        `npx tsx --eval "(async () => { const { existsSync } = await import('node:fs'); const dbCandidates = ['./src/db.ts', './src/config/database.ts', './src/database/connection.ts']; const dbEntry = dbCandidates.find((candidate) => existsSync(candidate)); if (dbEntry) { await import(dbEntry); if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL missing after importing backend database entry; ensure dotenv is loaded in the startup/database chain'); } const mod = await import('./src/app.ts'); const createApp = mod.createApp ?? mod.default?.createApp ?? mod.default; if (typeof createApp !== 'function') throw new Error('createApp export missing'); const app = await createApp(); if (!app || typeof app.callback !== 'function') throw new Error('createApp did not return a Koa app'); console.log('backend_smoke_ok'); })().catch((error) => { console.error(error instanceof Error ? (error.stack ?? error.message) : String(error)); process.exit(1); });" 2>&1`,
        backendDir,
        "backend_smoke",
      );
    } else {
      passes.push("backend gate: skipped (backend/package.json not found)");
    }

    const pass = failures.length === 0;
    if (pass) {
      markAllScopedValidationsFresh("final scoped validation gates");
    }

    console.log(
      `${label}: final gates completed — pass=${pass} lastMutationAt=${lastMutationAt ?? "never"} lastFullValidationAt=${lastFullValidationAt ?? "never"} frontendTscOkAt=${frontendTscOkAt ?? "skip"} frontendBuildOkAt=${frontendBuildOkAt ?? "skip"} backendTscOkAt=${backendTscOkAt ?? "skip"} backendSmokeOkAt=${backendSmokeOkAt ?? "skip"}`,
    );

    return {
      pass,
      summary: [...passes, ...failures].join("\n\n"),
    };
  }

  console.log(
    `${label}: reasoning=${integrationReasoningOptions.reasoning?.enabled === false ? "off" : integrationReasoningOptions.reasoning ? `on(${integrationReasoningOptions.reasoning.effort ?? "medium"})` : "off"} thinking=${integrationReasoningOptions.thinking ? `on(${integrationReasoningOptions.thinking.thinking_effort ?? "medium"}/${integrationReasoningOptions.thinking.verbosity ?? "medium"})` : "off"}`,
  );

  /**
   * Context compression: when messages exceed ~20k tokens, compact the middle
   * portion into a summary, keeping system prompt + last 6 messages.
   */
  async function compactMessagesIfNeeded(force = false): Promise<boolean> {
    if (contextCompressionUsed) return false;
    const result = await compactChatMessagesSemantically({
      messages,
      modelChain,
      label,
      force,
      stateSummary: [
        `phase=integration_verify_fix`,
        `iterations=${iterations}`,
        `validationStale=${validationStale}`,
        `lastMutation=${lastMutationAt ?? "never"} (${lastMutationReason})`,
        `progressScore=${progressScore}/${MAX_INTEGRATION_PROGRESS_SCORE}`,
        `lastMeaningfulProgress=iteration ${lastMeaningfulProgressIteration || 0} (${lastMeaningfulProgressReason})`,
        `lastFullValidation=${lastFullValidationAt ?? "never"}`,
        `frontendTscOkAt=${frontendTscOkAt ?? "never"}`,
        `frontendBuildOkAt=${frontendBuildOkAt ?? "never"}`,
        `backendTscOkAt=${backendTscOkAt ?? "never"}`,
        `backendSmokeOkAt=${backendSmokeOkAt ?? "never"}`,
      ].join("\n"),
    });
    if (!result.compacted) return false;
    contextCompressionUsed = true;
    console.log(
      `${label}: semantic context compacted — removed ${result.removedMessages} messages (was ~${result.estimatedTokensBefore} tokens), orphan_tools_removed=${result.orphanToolsRemoved}`,
    );
    return true;
  }

  while (true) {
    iterations++;
    console.log(`${label}: iteration ${iterations}`);

    if (iterations > maxIterations) {
      const cumulativeSoFar = priorIntegrationAttempts + iterations - 1;
      const budgetCapped = cumulativeSoFar >= totalBudget;
      console.warn(
        `${label}: reached max iterations for this pass (${maxIterations}; cumulative ${cumulativeSoFar}/${totalBudget}); running final scoped validation before stopping.`,
      );
      const maxIterationGate = await runFinalScopedValidationGates();
      finalStatus = maxIterationGate.pass ? "pass" : "fail";
      finalSummary = [
        budgetCapped
          ? `Stopped after reaching the cumulative integration-verify-fix budget=${totalBudget} across all repair passes.`
          : `Stopped after reaching INTEGRATION_VERIFY_FIX_MAX_ITERATIONS for this pass (${maxIterations}).`,
        maxIterationGate.summary,
      ].join("\n\n");
      break;
    }

    await compactMessagesIfNeeded();

    let resp;
    try {
      resp = await callVerifyFixLlm(label, messages, modelChain, {
        temperature: 0.2,
        max_tokens: 36000,
        tools: SUPERVISOR_VERIFY_TOOLS,
        tool_choice: "auto",
        ...integrationReasoningOptions,
        forceOpenRouter: forceOpenRouterForMode(state.codingMode),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (isContextLengthError(msg) && (await compactMessagesIfNeeded(true))) {
        console.warn(
          `${label}: context limit hit; compacted once and retrying.`,
        );
        continue;
      }
      console.error(`${label}: LLM call failed: ${msg}`);
      break;
    }

    const choice = resp.choices[0];
    totalCostUsd += estimateCost(resp.model, resp.usage);
    recordSupervisorLlmUsage({
      sessionId: state.sessionId,
      stage: "integration_verify_fix",
      model: resp.model,
      usage: resp.usage,
      costUsd: estimateCost(resp.model, resp.usage),
    });

    messages.push({
      role: "assistant",
      content: choice.message.content ?? "",
      tool_calls: choice.message.tool_calls,
      ...(choice.message.reasoning_content
        ? { reasoning_content: choice.message.reasoning_content }
        : {}),
    });

    const toolCalls = choice.message.tool_calls ?? [];
    if (toolCalls.length === 0) {
      console.log(
        `${label}: LLM returned no tool calls at iteration ${iterations}`,
      );
      finalSummary = choice.message.content?.slice(0, 500) ?? "";
      break;
    }

    let doneSignaled = false;
    let iterationMutated = false;
    let iterationValidationProgress = false;
    const iterationProgressReasons: string[] = [];
    const iterationReadOnlyFingerprints: string[] = [];
    for (const tc of toolCalls) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(tc.function.arguments);
      } catch {
        /* ignore */
      }
      // Extra guidance appended to a tool result before it is pushed back to
      // the model (e.g. "scoped suite passed but the TDD hard gate is red").
      let toolResultSuffix = "";

      if (tc.function.name === "report_done") {
        const reportedStatus = (args.status as "pass" | "fail") ?? "fail";

        if (reportedStatus === "pass") {
          // Even when scoped validation suite is clean, the TDD hard gate
          // (P0 review errors / latest GREEN failures) can still be red.
          // Without this guard the worker reports done after only fixing
          // tsc/build/smoke, leaving the TDD loop spinning forever.
          const tddGate = await evaluateTddHardGate(state.outputDir, {
            sessionId: state.sessionId,
          });
          if (!tddGate.pass) {
            const rejectionMsg = [
              "REJECTED: report_done(pass) is not allowed — the TDD hard gate is still red.",
              ...tddGate.reasons.map((r) => `- ${r}`),
              "Read `.ralph/tdd-review.json` and the GREEN failure excerpts in the TDD Repair Block above, then either:",
              "  (a) Edit the failing test files to fix mocks / assertions / requirement-id citations, OR",
              "  (b) Edit the implementation files the tests target so the assertions pass.",
              "Re-run the failing test command via `bash` to confirm, then call report_done(pass) again.",
            ].join("\n");
            console.log(
              `${label}: REJECTED report_done(pass) — TDD hard gate red: ${tddGate.reasons.join("; ")}`,
            );
            messages.push({
              role: "tool",
              content: rejectionMsg,
              tool_call_id: tc.id,
              name: "report_done",
            });
            continue;
          }
        }

        // ── Scoped validation gate ──────────────────────────────────────────
        // When the model wrote files since last validation, force-run the
        // full 4-command suite before accepting pass.
        let validationGatePassed = !validationStale;
        let validationSummaryLine = "";

        if (reportedStatus === "pass" && validationStale) {
          console.log(
            `${label}: report_done(pass) requested while stale — running system final validation instead of rejecting.`,
          );
          const autoGate = await runFinalScopedValidationGates();
          if (!autoGate.pass) {
            const rejParts = [
              "REJECTED: report_done(pass) is not allowed — system final validation still fails.",
              `Last filesystem mutation: ${lastMutationAt ?? "unknown"} (${lastMutationReason ?? "unknown"})`,
              autoGate.summary,
            ];
            rejParts.push(
              "Fix all failing gate(s), then run run_validation_suite once. Do not create verification helper files.",
            );
            console.log(
              `${label}: REJECTED report_done(pass) — scoped validation failed.`,
            );
            messages.push({
              role: "tool",
              content: rejParts.join("\n\n"),
              tool_call_id: tc.id,
              name: "report_done",
            });
            continue;
          }
          validationGatePassed = true;
          validationSummaryLine = `Accepted after system final scoped validation:\n${autoGate.summary}`;
        }

        // ── Priority 1/2: Runtime audit + migration gate ──────────────────
        // Re-run the audit with fresh file state so that (a) the model gets
        // actionable per-file directives when errors remain, and (b) the
        // final post-loop gate sees an up-to-date result instead of the
        // stale preflight snapshot.
        if (reportedStatus === "pass" && validationGatePassed) {
          let freshRuntimeErrors: RuntimeAuditFinding[] = [];
          try {
            const freshAudit = await runRuntimeIntegrationAudit({
              outputDir: state.outputDir,
              declaredEnvKeys: runtimeAuditDeclaredEnvKeys,
              emitter: getRepairEmitter(state.sessionId),
              sessionId: state.sessionId,
            });
            runtimeAuditResult = freshAudit; // keep final gate in sync
            freshRuntimeErrors = freshAudit.findings.filter(
              (f) => f.severity === "error",
            );
          } catch (e) {
            console.warn(
              `${label}: runtime audit re-run failed in report_done handler (continuing): ${e instanceof Error ? e.message : String(e)}`,
            );
          }
          if (freshRuntimeErrors.length > 0) {
            const parts: string[] = [
              "REJECTED: report_done(pass) blocked — the following issues must be resolved first.",
            ];
            if (freshRuntimeErrors.length > 0) {
              parts.push(
                `\n## Runtime integration audit: ${freshRuntimeErrors.length} ERROR finding(s) still open`,
              );
              freshRuntimeErrors.slice(0, 6).forEach((f, i) => {
                parts.push(
                  `### ${i + 1}. [ERROR] \`${f.ruleId}\` — \`${f.file}:${f.line}\``,
                  `- Why: ${f.reason}`,
                  `- Action: ${f.directive}`,
                );
              });
              if (freshRuntimeErrors.length > 6) {
                parts.push(
                  `…and ${freshRuntimeErrors.length - 6} more (see .ralph/runtime-audit-tasks.json).`,
                );
              }
            }
            parts.push(
              "\nFix the above, re-run run_validation_suite, then call report_done(pass) again.",
            );
            console.log(
              `${label}: REJECTED report_done(pass) — ${freshRuntimeErrors.length} runtime error(s).`,
            );
            messages.push({
              role: "tool",
              content: parts.join("\n"),
              tool_call_id: tc.id,
              name: "report_done",
            });
            continue;
          }

          // All gates pass — accept.
          finalStatus = "pass";
          finalSummary = [
            String(args.summary ?? "").trim(),
            validationSummaryLine,
          ]
            .filter(Boolean)
            .join("\n\n");
          doneSignaled = true;
          console.log(
            `${label}: report_done(pass) accepted — runtime audit clean.`,
          );
          messages.push({
            role: "tool",
            content: validationSummaryLine
              ? "acknowledged after system final validation"
              : "acknowledged",
            tool_call_id: tc.id,
            name: "report_done",
          });
          break;
        }

        finalStatus = reportedStatus;
        finalSummary = String(args.summary ?? "");
        doneSignaled = true;
        console.log(
          `${label}: report_done status=${finalStatus} stale=${validationStale} lastMutationAt=${lastMutationAt ?? "never"} — ${finalSummary.slice(0, 120)}`,
        );
        messages.push({
          role: "tool",
          content: "acknowledged",
          tool_call_id: tc.id,
          name: "report_done",
        });
        if (doneSignaled) break;
      } else {
        const command =
          tc.function.name === "bash" ? String(args.command ?? "") : "";
        const mutationPath = getIntegrationMutationPath(tc.function.name, args);
        if (
          isIntegrationMutationTool(tc.function.name) &&
          isForbiddenIntegrationValidationHelperPath(mutationPath)
        ) {
          const result =
            "REJECTED: do not create or mutate validation helper source files. Use run_validation_suite or scoped bash validation instead.";
          console.log(
            `${label}: rejected validation helper mutation ${tc.function.name}:${mutationPath}`,
          );
          messages.push({
            role: "tool",
            content: result,
            tool_call_id: tc.id,
            name: tc.function.name,
          });
          continue;
        }
        if (!validationStale && isIntegrationMutationTool(tc.function.name)) {
          // Freezing edits after fresh validation must be TDD-aware. Scoped
          // validation (tsc/build/smoke) going green does NOT mean integration
          // is complete: the INDEPENDENT TDD hard gate can still be red, and
          // clearing it REQUIRES file edits (fix test mocks / the implementation
          // they target / db.ts). Without this check the worker hit an
          // unbreakable loop — this guard said "stop editing, report_done(pass)"
          // while the report_done guard said "can't pass, the TDD gate is red,
          // go edit files". Only freeze mutations when BOTH scoped validation is
          // fresh AND the TDD hard gate is green.
          const freshTddGate = await evaluateTddHardGate(state.outputDir, {
            sessionId: state.sessionId,
          });
          if (freshTddGate.pass) {
            const result =
              "REJECTED: validation is already fresh and passing. Do not mutate files; call report_done(status='pass') now.";
            console.log(
              `${label}: rejected mutation after fresh validation ${tc.function.name}:${mutationPath}`,
            );
            messages.push({
              role: "tool",
              content: result,
              tool_call_id: tc.id,
              name: tc.function.name,
            });
            continue;
          }
          console.log(
            `${label}: allowing mutation despite fresh scoped validation — TDD hard gate still red (${freshTddGate.reasons.join("; ")}): ${tc.function.name}:${mutationPath}`,
          );
        }
        if (
          tc.function.name === "bash" &&
          isValidationLikeBashCommand(command) &&
          !detectScopedValidationKind(command)
        ) {
          const result =
            "Error: validation commands in IntegrationVerifyFix must be scoped to `frontend/` or `backend/` only. " +
            "Use commands like `cd frontend && npx tsc -p tsconfig.app.json --pretty false 2>&1`, " +
            "`cd frontend && pnpm run build 2>&1`, or `cd backend && npx tsc --noEmit --pretty false 2>&1`.";
          console.log(
            `${label}: rejected unscoped validation command=${command.slice(0, 120)}`,
          );
          messages.push({
            role: "tool",
            content: result,
            tool_call_id: tc.id,
            name: tc.function.name,
          });
          continue;
        }
        const result = await executeSupervisorTool(
          tc.function.name,
          args,
          state.outputDir,
        );
        const fingerprint = buildToolFingerprint(
          tc.function.name,
          args,
          command,
        );
        if (tc.function.name === "run_validation_suite") {
          const parsedSuite = parseValidationSuiteResult(result);
          if (parsedSuite.parsed) {
            for (const kind of parsedSuite.passedSuites) {
              if (markScopedValidationSuccess(kind)) {
                iterationValidationProgress = true;
                iterationProgressReasons.push(`run_validation_suite:${kind}`);
              }
            }
            if (parsedSuite.pass) {
              markAllScopedValidationsFresh("run_validation_suite pass=true");
              // The scoped suite (frontend/backend tsc + build + smoke) passing
              // is NOT sufficient to finish: the TDD hard gate (P0 review
              // errors / latest GREEN failures) can still be red, and a shallow
              // `backend_smoke` does not prove the backend actually boots.
              // Without this guard the worker terminates here on the very first
              // validation pass and never touches the TDD Repair Block — the
              // root cause of the no-op repair loop in runtime.log 2026-05-20.
              const suiteTddGate = await evaluateTddHardGate(state.outputDir, {
                sessionId: state.sessionId,
              });
              if (suiteTddGate.pass) {
                finalStatus = "pass";
                finalSummary = [
                  "run_validation_suite passed; integration verification completed by system.",
                  parsedSuite.summary,
                ].join("\n\n");
                doneSignaled = true;
              } else {
                toolResultSuffix = [
                  "",
                  "",
                  "⚠️ Scoped validation passed, but the TDD hard gate is still RED — NOT done yet:",
                  ...suiteTddGate.reasons.map((r) => `- ${r}`),
                  "Open the **TDD Repair Block** in the first user message and apply each concrete patch:",
                  "  • For a *missing* P0 test file: read `.ralph/test-manifest.json`, find the test by id, and write the `.test.ts` file yourself (real assertions, db mocked with sqlite::memory:).",
                  '  • For an *unmocked ../db* import: add `vi.mock("../../../db", …)` mirroring backend/src/models/index.test.ts.',
                  "  • For a GREEN failure: run the test command via `bash`, read the failing assertion, and fix the test or the implementation it targets.",
                  "Then re-run `run_validation_suite` and call `report_done(pass)` only after the TDD gate is green.",
                ].join("\n");
                console.log(
                  `${label}: run_validation_suite passed but TDD hard gate red (${suiteTddGate.reasons.join("; ")}) — continuing repair loop.`,
                );
              }
            } else if (parsedSuite.failedSuites.length > 0) {
              finalSummary = parsedSuite.failedSuites.join("\n");
            }
          }
        } else if (
          isIntegrationMutationTool(tc.function.name) &&
          /^OK:/i.test(result)
        ) {
          iterationMutated = true;
          markValidationStale(`${tc.function.name}:${mutationPath}`);
        } else if (
          tc.function.name === "bash" &&
          isSuccessfulSupervisorToolResult(result)
        ) {
          const validationKinds = detectScopedValidationKinds(command);
          if (validationKinds.length > 0) {
            for (const validationKind of validationKinds) {
              if (!markScopedValidationSuccess(validationKind)) continue;
              iterationValidationProgress = true;
              iterationProgressReasons.push(
                `scoped_validation:${validationKind}`,
              );
            }
          } else if (isMutatingSupervisorBashCommand(command)) {
            iterationMutated = true;
            markValidationStale(`mutating bash:${command.slice(0, 80)}`);
          }
        } else if (tc.function.name === "bash") {
          const validationKinds = detectScopedValidationKinds(command);
          if (validationKinds.length > 0) {
            for (const validationKind of validationKinds) {
              const trendReason = noteValidationIssueTrend(
                validationKind,
                result,
              );
              if (trendReason) {
                iterationValidationProgress = true;
                iterationProgressReasons.push(trendReason);
              }
            }
          } else if (isMutatingSupervisorBashCommand(command)) {
            iterationMutated = true;
            markValidationStale(`mutating bash:${command.slice(0, 80)}`);
          }
        }
        if (
          !iterationMutated &&
          fingerprint &&
          tc.function.name !== "report_done" &&
          !isIntegrationMutationTool(tc.function.name)
        ) {
          iterationReadOnlyFingerprints.push(fingerprint);
        }
        console.log(
          `${label}: tool=${tc.function.name} result_preview=${result.slice(0, 100).replace(/\n/g, " ")}`,
        );
        messages.push({
          role: "tool",
          content: toolResultSuffix ? `${result}${toolResultSuffix}` : result,
          tool_call_id: tc.id,
          name: tc.function.name,
        });
        if (doneSignaled) break;
      }
    }

    if (iterationMutated && !doneSignaled) {
      const structuralProgressReasons =
        await collectStructuralProgressReasons();
      if (structuralProgressReasons.length > 0) {
        iterationValidationProgress = true;
        iterationProgressReasons.push(...structuralProgressReasons);
      }
    }

    if (iterationMutated) {
      const mutationReason =
        iterationProgressReasons.length > 0
          ? `filesystem mutation (${lastMutationReason}); ${iterationProgressReasons.join(", ")}`
          : `filesystem mutation (${lastMutationReason})`;
      recordMeaningfulProgress(mutationReason, 2);
      consecutiveNoMutationIterations = 0;
      stagnationWarningsWithoutProgress = 0;
      repeatedReadOnlyActionCounts.clear();
      // CODEGEN_HARDENING_PLAN.md §7.4 — credit the fallback retry once
      // the worker actually mutates after we injected the batched prompt.
      // Emitting `stagnation_fallback_passed` lets the model-scoring
      // system recognise "this was a pipeline rescue, not a model fault"
      // and avoids spuriously down-weighting the model on the next run.
      if (stagnationFallbackUsed && !stagnationFallbackPassedEmitted) {
        stagnationFallbackPassedEmitted = true;
        // Cancel remaining fallback budget — we're back on track.
        stagnationFallbackIterationsLeft = 0;
        getRepairEmitter(state.sessionId)({
          stage: "integration-gate",
          event: "stagnation_fallback_passed",
          details: {
            recoveredAtIteration: iterations,
            mutationReason,
          },
        });
        console.log(
          `${label}: stagnation fallback recovered — worker mutated after batched prompt.`,
        );
      }
    } else if (iterationValidationProgress) {
      recordMeaningfulProgress(
        `validation progress (${iterationProgressReasons.join(", ")})`,
        1,
      );
      consecutiveNoMutationIterations = 0;
      stagnationWarningsWithoutProgress = 0;
      repeatedReadOnlyActionCounts.clear();
    } else if (!doneSignaled) {
      consecutiveNoMutationIterations += 1;
      decayProgressScore();
      const uniqueFingerprints: string[] = [
        ...new Set(iterationReadOnlyFingerprints),
      ];
      for (const fingerprint of uniqueFingerprints) {
        repeatedReadOnlyActionCounts.set(
          fingerprint,
          (repeatedReadOnlyActionCounts.get(fingerprint) ?? 0) + 1,
        );
      }
      const mostRepeatedEntry = [
        ...repeatedReadOnlyActionCounts.entries(),
      ].sort((a, b) => b[1] - a[1])[0];
      const repeatedAction =
        mostRepeatedEntry && mostRepeatedEntry[1] >= 3
          ? `${mostRepeatedEntry[0]} × ${mostRepeatedEntry[1]}`
          : null;
      const { warnAt, abortAt } = getDynamicStagnationThresholds();
      if (
        (consecutiveNoMutationIterations >= warnAt || repeatedAction) &&
        iterations - lastStagnationGuidanceAt >= 2
      ) {
        stagnationWarningsWithoutProgress += 1;
        const escalated =
          stagnationWarningsWithoutProgress >=
          STAGNATION_ESCALATION_WARNING_COUNT;
        injectStagnationGuidance(
          `No filesystem mutation for ${consecutiveNoMutationIterations} iteration(s). Dynamic warn threshold=${warnAt}, abort threshold=${abortAt}. Warning #${stagnationWarningsWithoutProgress}.`,
          repeatedAction,
          escalated,
        );
        lastStagnationGuidanceAt = iterations;
        getRepairEmitter(state.sessionId)({
          stage: "integration-gate",
          event: "stagnation_warning",
          details: {
            iterationsWithoutMutation: consecutiveNoMutationIterations,
            warnAt,
            abortAt,
            progressScore,
            warningNumber: stagnationWarningsWithoutProgress,
            escalated,
            repeatedAction: repeatedAction ?? "none",
          },
        });
      }
      if (consecutiveNoMutationIterations >= abortAt) {
        // ── Fallback retry (CODEGEN_HARDENING_PLAN.md §7.4) ──────────────
        // Before truly aborting, give the worker ONE last shot with a
        // batched classify-then-mutate prompt. The hypothesis: the worker
        // was reading-only because it couldn't decide WHICH issue to fix
        // first. The fallback removes that ambiguity by handing it a
        // single, deterministic procedure. Worker gets 2 more iterations
        // to actually mutate; if it still doesn't, the real abort fires.
        if (!stagnationFallbackUsed) {
          stagnationFallbackUsed = true;
          stagnationFallbackIterationsLeft = 2;
          consecutiveNoMutationIterations = 0;
          stagnationWarningsWithoutProgress = 0;
          repeatedReadOnlyActionCounts.clear();

          // Fix 3: Deterministically create stubs for any still-missing contract endpoints
          // before handing the agent its fallback budget, so the "no file to write" blocker
          // is removed even if the preflight pass was skipped or produced no-ops.
          let stagnationStubBlock = "";
          if (routeAudit.missingContractEndpoints.length > 0) {
            try {
              const stagnationStubResult = await generateMissingRouteStubs(
                state.outputDir,
                routeAudit.missingContractEndpoints,
              );
              const createdNow = stagnationStubResult.groups.filter(
                (g) => g.created,
              ).length;
              stagnationStubBlock =
                formatMissingRouteStubBlock(stagnationStubResult);
              if (createdNow > 0) {
                console.log(
                  `${label}: stagnation-escape stub generation — created ${createdNow} stub file(s) for ${routeAudit.missingContractEndpoints.length} missing contract endpoint(s).`,
                );
              }
            } catch (e) {
              console.warn(
                `${label}: stagnation-escape stub generation failed (continuing): ${e instanceof Error ? e.message : String(e)}`,
              );
            }
          }

          messages.push({
            role: "user",
            content: [
              "SYSTEM CORRECTION — STAGNATION ABORT WAS ABOUT TO FIRE. You get ONE last batched-mode chance to make progress.",
              `Reason: no filesystem mutation for ${abortAt} iteration(s); progressScore=${progressScore}/${MAX_INTEGRATION_PROGRESS_SCORE}; last meaningful progress at iteration ${lastMeaningfulProgressIteration || 0} (${lastMeaningfulProgressReason}).`,
              repeatedAction ? `Most repeated action: ${repeatedAction}.` : "",
              stagnationStubBlock || "",
              "",
              "## Switch to single-batch classification mode",
              "Do EXACTLY this on your next 2 turns. Do NOT free-form explore.",
              "",
              "Turn N (this turn):",
              stagnationStubBlock
                ? "  0. The stub files listed above were just created/confirmed. Open each one and replace the 501 body with real business logic — DO NOT skip this, these are the primary blockers."
                : "",
              "  1. read_file(`API_CONTRACTS.json`)            — ONCE.",
              "  2. read_file(`.ralph/contract-usage-coverage.json`) if it exists — that file already classifies every contract entry vs frontend call vs PRD.",
              "  3. grep(`apiClient\\.|api\\.(get|post|put|patch|delete)\\(`, `frontend/src`) — collect all call sites in ONE pass.",
              "  4. grep(`PRD|Product Requirement|User flow|UX`, `PRD.md`) is OPTIONAL — the audit already did this for you.",
              "  5. For every (contract entry, frontend call) pair:",
              "       Apply the 4-quadrant decision tree from your system prompt (case 1: wire frontend; case 2: prune contract; case 3: add to contract + implement; case 4: remove rogue call).",
              "  6. Output a SINGLE batch of write_file calls covering the highest-confidence decisions. Do NOT verify between writes.",
              "",
              "Turn N+1:",
              "  1. Re-run the FULL scoped validation (frontend tsc → frontend build → backend tsc → backend smoke) once.",
              "  2. Either call report_done(status='pass', summary=…) if everything passes, OR write the minimal additional fixes the validation flagged, OR call report_done(status='fail', summary=…) naming the specific unresolved file/line.",
              "",
              "Hard rules during this batched mode:",
              "- DO NOT re-read API_CONTRACTS.json, frontend api files, or PRD.md again. You already have what you need.",
              "- DO NOT explore alternate files; trust the classification.",
              "- DO NOT call report_done(status='pass') without first running the validation in turn N+1.",
              "- If you genuinely cannot derive a fix from the classification, call report_done(status='fail', summary='unable to classify <specific endpoint> — needs human review'). That is preferable to another stagnation cycle.",
            ]
              .filter(Boolean)
              .join("\n"),
          });

          getRepairEmitter(state.sessionId)({
            stage: "integration-gate",
            event: "stagnation_fallback_injected",
            details: {
              triggeredAtIteration: iterations,
              consecutiveNoMutationIterations: abortAt,
              progressScore,
              progressMax: MAX_INTEGRATION_PROGRESS_SCORE,
              lastMeaningfulProgressIteration,
              lastMeaningfulProgressReason,
              repeatedAction: repeatedAction ?? "none",
              budgetIterations: stagnationFallbackIterationsLeft,
            },
          });

          console.warn(
            `${label}: pre-abort stagnation fallback injected — granting ${stagnationFallbackIterationsLeft} more iteration(s).`,
          );
          // Continue the outer loop — give the worker its budget.
          continue;
        }

        // Already used the fallback — drain its budget; only then abort.
        if (stagnationFallbackIterationsLeft > 0) {
          stagnationFallbackIterationsLeft -= 1;
          if (stagnationFallbackIterationsLeft > 0) {
            console.warn(
              `${label}: stagnation persists during fallback (${stagnationFallbackIterationsLeft} iteration(s) of fallback budget left).`,
            );
            continue;
          }
        }

        getRepairEmitter(state.sessionId)({
          stage: "integration-gate",
          event: "stagnation_fallback_exhausted",
          details: {
            triggeredAtIteration: iterations,
            consecutiveNoMutationIterations: abortAt,
            progressScore,
            progressMax: MAX_INTEGRATION_PROGRESS_SCORE,
          },
        });

        // ── R6: pre-abort fresh-eyes replan ──────────────────────────────
        // The fallback didn't work, which means the worker is stuck
        // INSIDE its own message context. Call a separate LLM to produce
        // a focused 3-step plan, drop the bloated history, and reseed.
        if (!stagnationReplanAttempted) {
          stagnationReplanAttempted = true;
          const repeatedReads: string[] = [];
          for (const [fp, n] of repeatedReadOnlyActionCounts.entries()) {
            if (n >= 2 && fp.startsWith("read_file:")) {
              repeatedReads.push(fp.replace(/^read_file:/, ""));
            }
          }
          const repeatedActions: string[] = [];
          for (const [fp, n] of repeatedReadOnlyActionCounts.entries()) {
            if (n >= 2) repeatedActions.push(`${fp} ×${n}`);
          }
          const diagnostics = await collectStagnationDiagnostics(
            state.outputDir,
          );
          const replanResult = await computeStagnationReplan({
            diagnosticsSnapshot: diagnostics,
            repeatedActions,
            repeatedReads,
            lastProgressReason: lastMeaningfulProgressReason,
            iterationsConsumed: iterations - lastMeaningfulProgressIteration,
            chat: async (msgs) => {
              const replanChain = resolveModelChain(
                resolveCodingModelConfigValue(
                  state.codingMode,
                  "taskBreakdown",
                ),
                resolveModel,
              );
              const resp = await chatCompletionWithFallback(
                msgs as ChatMessage[],
                replanChain,
                {
                  temperature: 0.1,
                  max_tokens: 2048,
                  forceOpenRouter: forceOpenRouterForMode(state.codingMode),
                },
              );
              return resp.choices[0]?.message?.content ?? "";
            },
          });

          if (replanResult.ok) {
            // Drop the bloated message history but keep the system prompt
            // — the system role definitions are still valid; only the
            // accumulated tool-call history is poisoning the worker.
            const systemMessage = messages[0]!;
            messages.length = 0;
            messages.push(systemMessage);
            messages.push({
              role: "user",
              content: [
                "SYSTEM CORRECTION — STAGNATION REPLAN (fallback also exhausted).",
                "Your previous message history has been DROPPED to clear context poisoning.",
                "Below is a fresh 3-step plan from an independent triage LLM. Execute it in order. Do NOT re-read files mentioned in the plan — act on them directly.",
                "",
                replanResult.plan,
                "",
                "After executing all three steps, call `report_done(status='pass', summary=…)` if validation passes, or `report_done(status='fail', summary=<specific blocker>)` if a concrete unresolvable issue remains.",
              ].join("\n"),
            });

            stagnationReplanBudgetLeft = 4;
            stagnationFallbackIterationsLeft = 0;
            stagnationFallbackUsed = false;
            consecutiveNoMutationIterations = 0;
            stagnationWarningsWithoutProgress = 0;
            repeatedReadOnlyActionCounts.clear();

            getRepairEmitter(state.sessionId)({
              stage: "integration-gate",
              event: "stagnation_replan_injected",
              details: {
                triggeredAtIteration: iterations,
                planBulletCount: replanResult.diagnostics.bulletCount,
                budgetIterations: stagnationReplanBudgetLeft,
              },
            });
            console.warn(
              `${label}: pre-abort stagnation replan injected — granting ${stagnationReplanBudgetLeft} more iteration(s).`,
            );
            continue;
          }

          // Replan LLM itself failed — log and fall through to abort.
          getRepairEmitter(state.sessionId)({
            stage: "integration-gate",
            event: "stagnation_replan_failed",
            details: {
              triggeredAtIteration: iterations,
              reason: replanResult.diagnostics.reason ?? "unknown",
            },
          });
          console.warn(
            `${label}: stagnation replan failed (${replanResult.diagnostics.reason ?? "unknown"}); aborting.`,
          );
        } else if (stagnationReplanBudgetLeft > 0) {
          // Drain replan budget before truly aborting.
          stagnationReplanBudgetLeft -= 1;
          if (stagnationReplanBudgetLeft > 0) {
            console.warn(
              `${label}: stagnation persists during replan window (${stagnationReplanBudgetLeft} iteration(s) of replan budget left).`,
            );
            continue;
          }
        }

        // ── Human-in-the-loop decision (§7.5) ─────────────────────────────
        // Before aborting, emit a `human_decision_needed` event to the browser
        // and wait up to 5 min for the human to pick one of the 4-quadrant
        // options. This unblocks the case where the worker cannot decide
        // because the problem requires architectural judgement (e.g. the
        // contract says "wire frontend" but the app is a pure SPA).
        const humanDecisionContext = [
          "IntegrationVerifyFix stagnated and could not determine the right action.",
          `No filesystem mutation for ${consecutiveNoMutationIterations} consecutive iteration(s).`,
          repeatedAction ? `Most repeated action: ${repeatedAction}.` : "",
          `Last meaningful progress: iteration ${lastMeaningfulProgressIteration || 0} (${lastMeaningfulProgressReason}).`,
          "",
          "Review the contract-usage-coverage block above and choose the correct action for the highest-priority unresolved mismatch.",
        ]
          .filter(Boolean)
          .join("\n");

        getRepairEmitter(state.sessionId)({
          stage: "integration-gate",
          event: "human_decision_needed",
          details: {
            context: humanDecisionContext,
            options: INTEGRATION_DECISION_OPTIONS,
            triggeredAtIteration: iterations,
            progressScore,
            progressMax: MAX_INTEGRATION_PROGRESS_SCORE,
            timeoutMs: 5 * 60 * 1000,
          },
        });

        await recordUnresolvedProblem(state.outputDir, {
          sessionId: state.sessionId,
          category: "stagnation",
          gate: "integration-verify-fix",
          phase: "integration",
          attempts: iterations,
          summary: `Stagnation fallback exhausted — LLM could not determine the right action${repeatedAction ? ` (most repeated: ${repeatedAction})` : ""}; escalating to human decision.`,
          evidence: [humanDecisionContext.slice(0, 500)],
          artifacts: [
            ".ralph/contract-usage-coverage.json",
            ".ralph/runtime-smoke.json",
          ],
        });
        console.warn(
          `${label}: stagnation fallback exhausted — awaiting human decision (5 min timeout).`,
        );

        let humanDecision: string;
        try {
          humanDecision = await requestHumanDecision(
            state.sessionId,
            INTEGRATION_DECISION_OPTIONS,
            humanDecisionContext,
          );
        } catch {
          humanDecision = "abort";
        }

        getRepairEmitter(state.sessionId)({
          stage: "integration-gate",
          event: "human_decision_received",
          details: {
            decisionId: humanDecision,
            triggeredAtIteration: iterations,
          },
        });

        if (humanDecision === "abort" || humanDecision === "timeout") {
          finalStatus = "fail";
          finalSummary = [
            humanDecision === "timeout"
              ? "Human decision timed out (5 min); aborting integration fix."
              : "Human chose to abort the integration fix stage.",
            `No mutation for ${consecutiveNoMutationIterations} consecutive iteration(s).`,
            `Dynamic stagnation threshold: abortAt=${abortAt}, progressScore=${progressScore}/${MAX_INTEGRATION_PROGRESS_SCORE}.`,
          ]
            .filter(Boolean)
            .join("\n");
          console.warn(
            `${label}: aborting on human decision (${humanDecision}).`,
          );
          break;
        }

        // Human picked an actionable option — find its label/description and
        // inject a targeted instruction so the worker acts in the next turn.
        const chosenOption = INTEGRATION_DECISION_OPTIONS.find(
          (o) => o.id === humanDecision,
        );
        const humanInstruction = chosenOption
          ? `HUMAN DECISION: ${chosenOption.label} — ${chosenOption.description}`
          : `HUMAN DECISION: ${humanDecision}`;

        messages.push({
          role: "user",
          content: [
            "SYSTEM CORRECTION — HUMAN OVERRIDE: A human reviewer has decided the correct action.",
            humanInstruction,
            "",
            "Apply this decision immediately on your NEXT turn.",
            "Do NOT re-read files or re-classify. Make the write_file call(s) that correspond to this decision, then re-run scoped validation.",
            "After validation passes, call report_done(status='pass', summary=…).",
          ].join("\n"),
        });

        // Reset stagnation counters to grant 2 more iterations for the human-
        // directed fix.
        consecutiveNoMutationIterations = 0;
        stagnationWarningsWithoutProgress = 0;
        stagnationFallbackUsed = false;
        stagnationFallbackIterationsLeft = 0;
        repeatedReadOnlyActionCounts.clear();
        console.warn(
          `${label}: human decision "${humanDecision}" injected — resuming with 2 extra iterations.`,
        );
        continue;
      }
    }

    if (doneSignaled) break;
  }

  // Always enforce final scoped validation gates before exiting.
  if (!finalSummary && finalStatus === "fail") {
    finalSummary = "No report_done received from IntegrationVerifyFix.";
  }

  const finalGateResult = await runFinalScopedValidationGates();
  const finalDependencyAudit = await auditImportDependencyConsistency(
    state.outputDir,
  );
  const finalRouteAudit = await auditApiRouteRegistration(state.outputDir);
  const finalContractCompleteness = await auditContractCompleteness(
    state.outputDir,
  );
  const finalApiClientUniqueness = await auditFrontendApiClientUniqueness(
    state.outputDir,
  );
  if (!finalGateResult.pass) {
    finalStatus = "fail";
    finalSummary = [
      finalSummary,
      "Final scoped validation gates failed:",
      finalGateResult.summary,
    ]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 4000);
  } else if (finalStatus === "pass") {
    finalSummary = [finalSummary, "Final scoped validation gates passed."]
      .filter(Boolean)
      .join("\n\n");
  }

  const finalRouteAuditHardFail =
    finalRouteAudit.unregisteredModules.length > 0 ||
    finalRouteAudit.unresolvedRegistrations.length > 0 ||
    finalRouteAudit.missingContractEndpoints.length > 0;
  getRepairEmitter(state.sessionId)({
    stage: "integration-gate",
    event: "route_audit_snapshot",
    details: {
      when: "final",
      hardFail: finalRouteAuditHardFail,
      unregisteredModules: finalRouteAudit.unregisteredModules,
      unresolvedRegistrations: finalRouteAudit.unresolvedRegistrations,
      missingContractEndpoints: finalRouteAudit.missingContractEndpoints,
      undeclaredEndpointCount: finalRouteAudit.undeclaredEndpoints.length,
    },
  });
  if (finalRouteAuditHardFail) {
    finalStatus = "fail";
    finalSummary = [
      finalSummary,
      "Backend route registration gate failed:",
      finalRouteAudit.findings.join("\n"),
    ]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 4000);
    getRepairEmitter(state.sessionId)({
      stage: "integration-gate",
      event: "route_registration_audit_failed",
      details: {
        unregisteredModules: finalRouteAudit.unregisteredModules,
        unresolvedRegistrations: finalRouteAudit.unresolvedRegistrations,
        missingContractEndpoints: finalRouteAudit.missingContractEndpoints,
      },
    });
  }

  const finalContractCompletenessHardFail =
    finalContractCompleteness.missingScopedEndpoints.length > 0;
  getRepairEmitter(state.sessionId)({
    stage: "integration-gate",
    event: "contract_completeness_snapshot",
    details: {
      when: "final",
      hardFail: finalContractCompletenessHardFail,
      warnOnly: finalContractCompleteness.warnOnly,
      inferredRelationshipCount:
        finalContractCompleteness.inferredRelationships.length,
      missingScopedEndpoints: finalContractCompleteness.missingScopedEndpoints,
      warnOnlyEndpoints: finalContractCompleteness.warnOnlyEndpoints,
    },
  });
  if (finalContractCompletenessHardFail) {
    finalStatus = "fail";
    finalSummary = [
      finalSummary,
      "Contract completeness gate failed:",
      finalContractCompleteness.findings.join("\n"),
    ]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 4000);
    getRepairEmitter(state.sessionId)({
      stage: "integration-gate",
      event: "contract_completeness_failed",
      details: {
        missingScopedEndpoints:
          finalContractCompleteness.missingScopedEndpoints,
      },
    });
  }

  const finalApiClientUniquenessHardFail =
    finalApiClientUniqueness.parallelClients.length > 0;
  getRepairEmitter(state.sessionId)({
    stage: "integration-gate",
    event: "frontend_api_client_uniqueness_snapshot",
    details: {
      when: "final",
      hardFail: finalApiClientUniquenessHardFail,
      canonical: finalApiClientUniqueness.canonical,
      parallelClients: finalApiClientUniqueness.parallelClients,
    },
  });

  // ─── Pre-gate: runtime-integration-audit ERROR findings block smoke ───
  // Use the latest runtime audit result — if the model called report_done(pass)
  // at least once, the handler above already refreshed `runtimeAuditResult`.
  // If the model called report_done(fail) directly (or never reached report_done),
  // do a final re-run here so we don't fail a project the model actually fixed.
  if (runtimeAuditResult !== null) {
    try {
      const finalFreshAudit = await runRuntimeIntegrationAudit({
        outputDir: state.outputDir,
        declaredEnvKeys: runtimeAuditDeclaredEnvKeys,
        emitter: getRepairEmitter(state.sessionId),
        sessionId: state.sessionId,
      });
      runtimeAuditResult = finalFreshAudit;
    } catch {
      // Keep the most-recent cached result if re-run fails.
    }
  }
  const runtimeAuditErrorFindings =
    runtimeAuditResult?.findings.filter((f) => f.severity === "error") ?? [];
  if (runtimeAuditErrorFindings.length > 0) {
    const top = runtimeAuditErrorFindings
      .slice(0, 6)
      .map((f) => `- [${f.ruleId}] ${f.file}:${f.line} — ${f.reason}`);
    finalStatus = "fail";
    finalSummary = [
      finalSummary,
      "Runtime integration audit failed:",
      `${runtimeAuditErrorFindings.length} ERROR-level finding(s) across ${new Set(runtimeAuditErrorFindings.map((f) => f.ruleId)).size} rule(s). Runtime smoke gate skipped — probing cannot detect these silent failure modes:`,
      top.join("\n"),
      runtimeAuditErrorFindings.length > 6
        ? `…and ${runtimeAuditErrorFindings.length - 6} more (see .ralph/runtime-integration-audit.json).`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 4000);
    getRepairEmitter(state.sessionId)({
      stage: "integration-gate",
      event: "runtime_audit_blocked_smoke",
      details: {
        errorCount: runtimeAuditErrorFindings.length,
        sampleFindings: runtimeAuditErrorFindings.slice(0, 6).map((f) => ({
          ruleId: f.ruleId,
          file: f.file,
          line: f.line,
        })),
      },
    });
  }

  // ─── Runtime smoke gate (P0) ─────────────────────────────────────────
  // Boot the backend and prove every contract endpoint returns something
  // OTHER than 404. The whole goal is to pre-empt the "OAuth succeeds but
  // every authenticated request returns 404" failure mode that has been
  // the #1 cause of post-codegen regressions. Emits a snapshot to
  // `.ralph/runtime-smoke.json` so the verify-fix worker can read it as
  // pendingRepairTasks on the next loop.
  if (
    process.env.BLUEPRINT_DISABLE_RUNTIME_SMOKE !== "1" &&
    runtimeAuditErrorFindings.length === 0
  ) {
    // Tier-2 (real-data integration gate) is opt-in. When enabled, we stand up
    // an isolated, migrated+seeded Postgres SCHEMA on the kickoff-provisioned
    // DB and point the booted backend at it so endpoints can be asserted
    // against real data (2xx + matching response shape), not just routability.
    const dataGateEnabled = process.env.INTEGRATION_DATA_GATE === "1";
    let prepared: PreparedTestSchema | null = null;
    let seedResult: SeedResult | null = null;
    try {
      if (dataGateEnabled) {
        prepared = await prepareTestSchema(state.outputDir);
        if (prepared) {
          seedResult = await seedTestSchema(
            state.outputDir,
            prepared.testDatabaseUrl,
          );
        }
      }

      const smoke = await runRuntimeSmokeGate({
        outputDir: state.outputDir,
        emitter: getRepairEmitter(state.sessionId),
        sessionId: state.sessionId,
        // Only run data assertions if the schema is prepared AND migrations
        // applied cleanly — otherwise Tier-2 would false-fail on a setup issue.
        dataAssertions: Boolean(prepared) && !seedResult?.failure,
        testDatabaseUrl: prepared?.testDatabaseUrl,
      });

      // A migrate failure is a real (broken-migrations) finding even though it
      // happens before boot — surface it alongside the gate failures.
      const seedFailures = seedResult?.failure ? [seedResult.failure] : [];
      const allFailures = [...seedFailures, ...smoke.failures];
      if (!smoke.pass || seedFailures.length > 0) {
        finalStatus = "fail";
        const top = allFailures
          .slice(0, 6)
          .map((f) => `- [${f.code}] ${f.target}: ${f.directive}`);
        finalSummary = [
          finalSummary,
          "Runtime smoke gate failed:",
          smoke.bootFailed
            ? "Backend did not start — see .ralph/runtime-smoke.json `evidence` field."
            : `${allFailures.length} failure(s) (${smoke.probedEndpoints.length} probed). Top:\n${top.join("\n")}`,
        ]
          .filter(Boolean)
          .join("\n\n")
          .slice(0, 4000);
        await recordUnresolvedProblem(state.outputDir, {
          sessionId: state.sessionId,
          category: "runtime-smoke-404",
          gate: "integration-smoke",
          phase: "integration",
          summary: smoke.bootFailed
            ? "Backend did not start during runtime smoke."
            : `${allFailures.length} contract endpoint(s) unreachable/failing after repair (${smoke.probedEndpoints.length} probed).`,
          evidence: top,
          artifacts: [".ralph/runtime-smoke.json"],
        });
      }
    } catch (err) {
      // G4: fail-closed. An unexpected throw from the smoke gate means we could
      // NOT prove the backend is runnable — historically this was swallowed to a
      // warning ("must NEVER hard-fail"), which let an unbootable backend pass.
      // Treat it as a failure unless an operator explicitly opts out for a known
      // infra issue (e.g. no DB provisioned in this environment).
      console.warn(
        `[supervisor] runtime smoke gate threw: ${err instanceof Error ? err.message : String(err)}`,
      );
      getRepairEmitter(state.sessionId)({
        stage: "integration-gate",
        event: "runtime_smoke_threw",
        details: {
          error: err instanceof Error ? err.message : String(err),
        },
      });
      if (process.env.BLUEPRINT_TOLERATE_SMOKE_INFRA_THROW !== "1") {
        finalStatus = "fail";
        finalSummary = [
          finalSummary,
          "Runtime smoke gate could not complete (threw) — treating as FAIL (set BLUEPRINT_TOLERATE_SMOKE_INFRA_THROW=1 to override for a known-infra issue).",
          err instanceof Error ? err.message : String(err),
        ]
          .filter(Boolean)
          .join("\n\n")
          .slice(0, 4000);
      }
    } finally {
      // Always drop the isolated test schema, even on failure/throw.
      if (prepared) {
        await teardownTestSchema(prepared.appDatabaseUrl, prepared.schemaName);
      }
    }
  }
  if (finalApiClientUniquenessHardFail) {
    finalStatus = "fail";
    finalSummary = [
      finalSummary,
      "Frontend API client uniqueness gate failed:",
      finalApiClientUniqueness.findings.join("\n"),
    ]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 4000);
    getRepairEmitter(state.sessionId)({
      stage: "integration-gate",
      event: "frontend_api_client_uniqueness_failed",
      details: {
        canonical: finalApiClientUniqueness.canonical,
        parallelClients: finalApiClientUniqueness.parallelClients,
      },
    });
  }

  if (finalDependencyAudit.remainingIssues.length > 0) {
    finalStatus = "fail";
    finalSummary = [
      finalSummary,
      "Dependency consistency gate failed:",
      finalDependencyAudit.summary,
    ]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 4000);
  } else if (finalSummary.startsWith("No report_done received")) {
    // P0-E: do NOT auto-pass when the integration loop never emitted report_done.
    // Compile/build passing is not evidence that PRD features are implemented —
    // let the downstream feature-checklist audit make the final call. Emit a
    // repair event so the front-end can surface this honestly.
    finalStatus = "fail";
    finalSummary = [
      finalSummary,
      "Final scoped validation gates passed, but IntegrationVerifyFix never emitted report_done.",
      "Treating as FAIL so downstream feature audit can arbitrate (compile ≠ feature-complete).",
    ]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 4000);
    getRepairEmitter(state.sessionId)({
      stage: "integration-gate",
      event: "missing_report_done",
      details: {
        reason:
          "IntegrationVerifyFix loop exhausted without report_done; compile/build gates alone cannot confirm feature completeness.",
        iterations,
      },
    });
  }

  const cumulativeIntegrationAttempts = priorIntegrationAttempts + iterations;
  console.log(
    `${label}: done — status=${finalStatus} iterations=${iterations} (cumulative ${cumulativeIntegrationAttempts}/${totalBudget}) cost=$${totalCostUsd.toFixed(4)} lastMutationAt=${lastMutationAt ?? "never"} lastFullValidationAt=${lastFullValidationAt ?? "never"}`,
  );

  // G1: quarantine marker. A FAILED integration must not look runnable to
  // downstream consumers — the generated code stays on disk, so without a
  // durable signal a human can run a build whose backend 404s every route.
  // Write `.blueprint/BUILD_FAILED.json` on fail; delete it on pass. Consumers
  // (e.g. the coding route's blocking-gate check, any "open/run project"
  // surface) MUST refuse to present the output as ready when it is present.
  try {
    const markerRel = BUILD_FAILED_MARKER_REL;
    // An infra / test-harness failure (a missing table from an unsynced TEST db,
    // absent docker-compose, a missing test-runner dep, …) is NOT a broken build:
    // the scoped compile + runtime-smoke gates already prove the app boots and
    // creates its tables. Quarantining on it would mark an otherwise-correct build
    // broken and — under subsystem orchestration — halt every remaining domain.
    // So we do NOT quarantine on infra-class failures; we record them for
    // visibility instead. (Root fix for the test-db case: the scaffolded backend
    // test setup that syncs the schema — scaffolds/*/backend/src/test/setup.ts.)
    // Precision guard: only treat the failure as infra-dominated (→ don't
    // quarantine) when an infra signal is present AND every real code/
    // structural gate passed — otherwise a genuinely broken build whose
    // summary merely also mentions a test-infra signal would escape
    // quarantine. Runtime-smoke is deliberately excluded (owned elsewhere);
    // dependency-consistency too (a missing test dep is itself infra; a
    // missing runtime dep already fails the build gate below).
    const realCodeGatesPass =
      finalGateResult.pass &&
      !finalRouteAuditHardFail &&
      !finalContractCompletenessHardFail &&
      !finalApiClientUniquenessHardFail &&
      runtimeAuditErrorFindings.length === 0;
    const infraDominated = isInfraDominatedFailure({
      finalStatusFail: finalStatus === "fail",
      infraSignalPresent: hasInfraSignal(finalSummary),
      realCodeGatesPass,
    });
    if (finalStatus === "fail" && !infraDominated) {
      await fsWrite(
        markerRel,
        JSON.stringify(
          {
            sessionId: state.sessionId,
            failedAt: new Date().toISOString(),
            gate: "integration",
            summary: finalSummary.slice(0, 2000),
          },
          null,
          2,
        ),
        state.outputDir,
      );
    } else {
      await fs.rm(path.join(state.outputDir, markerRel), { force: true });
      if (infraDominated) {
        console.warn(
          `${label}: integration FAILED but the failure is infra/test-harness class — NOT quarantining so domain builds can proceed; recording it for visibility.`,
        );
        await recordUnresolvedProblem(state.outputDir, {
          sessionId: state.sessionId,
          category: "other",
          gate: "integration-infra",
          phase: "integration",
          summary:
            "Integration gate failed on infra / test-harness issues (not application code) — build NOT quarantined.",
          evidence: [finalSummary.slice(0, 800)],
        }).catch(() => {});
      }
    }
  } catch (markerErr) {
    console.warn(
      `[supervisor] could not write/clear BUILD_FAILED marker: ${markerErr instanceof Error ? markerErr.message : String(markerErr)}`,
    );
  }

  return {
    integrationErrors:
      finalStatus === "pass" ? "" : finalSummary.slice(0, 4000),
    // Accumulate across re-entries so the session-wide circuit-breaker can
    // fire. The state reducer is replace-semantics, hence the explicit add.
    integrationFixAttempts: cumulativeIntegrationAttempts,
    totalCostUsd,
  };
}

/**
 * Snapshot the .ralph diagnostic files into the compact summary the
 * stagnation-replan LLM consumes. Each list is capped to 10 entries so
 * the prompt stays under the LLM's effective attention budget.
 */
async function collectStagnationDiagnostics(outputDir: string): Promise<{
  tscErrors?: string[];
  contractCoverageGaps?: string[];
  routeAudit?: string[];
  runtimeAuditErrors?: string[];
}> {
  const out: {
    tscErrors?: string[];
    contractCoverageGaps?: string[];
    routeAudit?: string[];
    migrationGaps?: string[];
    runtimeAuditErrors?: string[];
  } = {};

  const tryReadJson = async (relPath: string): Promise<unknown> => {
    const raw = await fsRead(relPath, outputDir);
    if (raw.startsWith("FILE_NOT_FOUND") || raw.startsWith("REJECTED")) {
      return null;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  // TSC diagnostics — read from artifact (no re-run; diagnostics are written
  // after each validation suite and are close-enough for replan context).
  const tsc = (await tryReadJson(".ralph/tsc-diagnostics.json")) as {
    tasks?: Array<{ instruction?: string }>;
  } | null;
  if (tsc?.tasks && Array.isArray(tsc.tasks)) {
    out.tscErrors = tsc.tasks
      .map((t) => (typeof t?.instruction === "string" ? t.instruction : null))
      .filter((s): s is string => !!s)
      .slice(0, 10);
  }

  // Contract coverage — read from artifact (pre-classified; stable).
  const coverage = (await tryReadJson(
    ".ralph/contract-usage-coverage.json",
  )) as {
    pendingRepairTasks?: Array<{
      method?: string;
      endpoint?: string;
      directive?: string;
    }>;
  } | null;
  if (
    coverage?.pendingRepairTasks &&
    Array.isArray(coverage.pendingRepairTasks)
  ) {
    out.contractCoverageGaps = coverage.pendingRepairTasks
      .slice(0, 10)
      .map(
        (t) => `${t.method ?? "?"} ${t.endpoint ?? "?"} — ${t.directive ?? ""}`,
      );
  }

  // Priority 3: Route audit — run LIVE instead of reading the stale
  // preflight `.ralph/route-audit.json` snapshot (which may predate any
  // modules the agent added during the current run).
  try {
    const liveRouteAudit = await auditApiRouteRegistration(outputDir);
    const lines: string[] = [];
    for (const m of liveRouteAudit.unregisteredModules) {
      lines.push(`unregistered: ${m}`);
    }
    for (const r of liveRouteAudit.unresolvedRegistrations) {
      lines.push(`unresolved registration: ${r}`);
    }
    for (const ep of liveRouteAudit.missingContractEndpoints.slice(0, 5)) {
      lines.push(`missing contract endpoint: ${ep.method} ${ep.endpoint}`);
    }
    if (lines.length > 0) out.routeAudit = lines.slice(0, 10);
  } catch {
    // Fallback to stale snapshot on error.
    const routeAuditSnap = (await tryReadJson(".ralph/route-audit.json")) as {
      unregisteredModules?: string[];
      unresolvedRegistrations?: string[];
    } | null;
    if (routeAuditSnap) {
      const lines: string[] = [];
      for (const m of routeAuditSnap.unregisteredModules ?? [])
        lines.push(`unregistered: ${m}`);
      for (const r of routeAuditSnap.unresolvedRegistrations ?? [])
        lines.push(`unresolved registration: ${r}`);
      if (lines.length > 0) out.routeAudit = lines.slice(0, 10);
    }
  }

  // Priority 3: Runtime audit tasks — read from the persisted artifact
  // (`.ralph/runtime-audit-tasks.json`) which is written at preflight and
  // contains per-finding directives. We do NOT re-run the full audit here
  // (too expensive) — the replan context just needs the file+directive pairs
  // so the triage LLM can reference them in the 3-step plan.
  const runtimeTasks = (await tryReadJson(
    ".ralph/runtime-audit-tasks.json",
  )) as Array<{
    ruleId?: string;
    severity?: string;
    file?: string;
    line?: number;
    directive?: string;
  }> | null;
  if (Array.isArray(runtimeTasks)) {
    const errorTasks = runtimeTasks.filter((t) => t?.severity === "error");
    if (errorTasks.length > 0) {
      out.runtimeAuditErrors = errorTasks
        .slice(0, 8)
        .map(
          (t) =>
            `[${t.ruleId ?? "?"}] ${t.file ?? "?"}:${t.line ?? 0} — ${t.directive ?? ""}`,
        );
    }
  }

  return out;
}

function summary(state: SupervisorState) {
  const totalTasks = state.phaseResults.reduce(
    (sum, pr) => sum + pr.taskResults.length,
    0,
  );
  const completedOk = state.phaseResults
    .flatMap((pr) => pr.taskResults)
    .filter((tr) => tr.status === "completed").length;
  const withWarnings = state.phaseResults
    .flatMap((pr) => pr.taskResults)
    .filter((tr) => tr.status === "completed_with_warnings").length;
  const failed = state.phaseResults
    .flatMap((pr) => pr.taskResults)
    .filter((tr) => tr.status === "failed").length;

  return {
    // Terminal state; no additional mutation needed
  };
}

// ─── Build supervisor graph ───

function dispatchGate(_state: SupervisorState) {
  return {};
}

/**
 * Backend readiness gate (G2, flag-gated by BLUEPRINT_BACKEND_GATE_BEFORE_FRONTEND=1).
 *
 * Runs between `be_phase_verify` and the frontend phase. `be_phase_verify`
 * already records its result in `scaffoldErrors` ("" = backend green), but the
 * edge to the frontend was UNCONDITIONAL — a backend verify+fix loop that *gave
 * up* with errors still advanced into the frontend phase (the test-x "194 backend
 * type errors carried into frontend" failure). This node treats backend-not-green
 * as a stop: it writes the BUILD_FAILED quarantine marker so the router can divert
 * away from the frontend phase. Belt-and-suspenders: it also re-runs a
 * deterministic backend `tsc` so a loop that self-reported pass can't slip type
 * errors through.
 *
 * Flag OFF (default): returns `{}` immediately — zero behavioural change; the
 * router always proceeds to the frontend phase exactly as the old unconditional edge.
 */
async function backendReadinessGate(
  state: SupervisorState,
): Promise<Partial<SupervisorState>> {
  if (process.env.BLUEPRINT_BACKEND_GATE_BEFORE_FRONTEND !== "1") return {};
  if (state.backendTasks.length === 0) return {}; // frontend-only project

  let notGreen = Boolean(state.scaffoldErrors && state.scaffoldErrors.trim());
  let reason = notGreen
    ? "backend verify+fix ended with unresolved errors"
    : "";
  try {
    const tsc = await runBackendTscGate(state.outputDir);
    if (!tsc.skipped && !tsc.pass) {
      notGreen = true;
      reason = `backend tsc reports ${tsc.errorCount} error(s): ${tsc.firstErrors.slice(0, 4).join(" | ")}`;
    }
  } catch (err) {
    console.warn(
      `[Supervisor] backend readiness gate: tsc probe threw (ignored): ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!notGreen) return {};

  try {
    await fsWrite(
      BUILD_FAILED_MARKER_REL,
      JSON.stringify(
        {
          sessionId: state.sessionId,
          failedAt: new Date().toISOString(),
          gate: "backend-readiness",
          summary: `Backend not green before frontend phase — ${reason}`,
        },
        null,
        2,
      ),
      state.outputDir,
    );
  } catch (err) {
    console.warn(
      `[Supervisor] backend readiness gate: could not write quarantine marker: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  // Record to the unresolved-problems ledger for later pattern analysis (both modes).
  await recordUnresolvedProblem(state.outputDir, {
    sessionId: state.sessionId,
    category: "backend-not-green",
    gate: "backend-readiness",
    phase: "backend",
    summary: `Backend not green before frontend phase — ${reason}`,
    evidence: state.scaffoldErrors
      ? [state.scaffoldErrors.slice(0, 500)]
      : undefined,
    artifacts: [".ralph/tsc-diagnostics.json", ".ralph/runtime-smoke.json"],
  });
  // Two modes once the backend is NOT green (both keep the quarantine marker above):
  //  - "proceed-quarantined" (DEFAULT): build the frontend anyway. We don't lose
  //    the frontend work and the marker (G1) still stops the output being used as
  //    ready. Safer when the verify loop *gave up* on a recoverable backend.
  //  - "hard-stop" (opt-in BLUEPRINT_BACKEND_GATE_MODE=hard-stop): skip the
  //    frontend entirely to save tokens on a hopeless backend. To divert in the
  //    router we must surface "not green" in state, so we set scaffoldErrors.
  if (process.env.BLUEPRINT_BACKEND_GATE_MODE === "hard-stop") {
    console.log(
      `[Supervisor] backend readiness gate: NOT GREEN — hard-stop, skipping the frontend phase. ${reason}`,
    );
    return {
      scaffoldErrors: `Backend readiness gate (hard-stop) failed before frontend phase: ${reason}`,
    };
  }
  console.log(
    `[Supervisor] backend readiness gate: NOT GREEN — proceed-quarantined: building frontend anyway, output marked BUILD_FAILED. ${reason}`,
  );
  return {}; // proceed; quarantine marker already written, scaffoldErrors left as-is
}

/**
 * Route after the backend readiness gate.
 *  - Flag OFF → always proceed to the frontend phase (identical to the previous
 *    unconditional edge).
 *  - Flag ON, backend green → proceed.
 *  - Flag ON, backend NOT green → only "hard-stop" mode diverts to the terminal;
 *    the default ("proceed-quarantined") still builds the frontend (the output is
 *    already quarantined, so it can't be used as ready).
 * Exported for unit testing.
 */
export function routeAfterBackendReadiness(state: SupervisorState): string {
  const decision = decideBackendReadinessRoute({
    flagOn: process.env.BLUEPRINT_BACKEND_GATE_BEFORE_FRONTEND === "1",
    hasBackendTasks: state.backendTasks.length > 0,
    backendNotGreen: Boolean(
      state.scaffoldErrors && state.scaffoldErrors.trim(),
    ),
    hardStop: process.env.BLUEPRINT_BACKEND_GATE_MODE === "hard-stop",
  });
  return decision === "stop" ? "summary" : "extract_real_contracts";
}

/**
 * schema_reconcile (Part B) — runs AFTER the frontend phase.
 *
 * The frontend phase can surface schema-change-requests (FE needs an endpoint the
 * backend never built — the taskflow `GET /users` gap). The pre-FE schema_arbiter
 * already handled BACKEND-discovered requests; this closes the FE→BE direction:
 *   1. apply the now-pending (FE-discovered) requests to the shared schema (reuse
 *      schemaArbiter — it amends schema.ts + records decisions);
 *   2. re-derive API_CONTRACTS.json from the amended ENDPOINTS registry;
 *   3. find endpoints the amendment ADDED that no task produces, and run a scoped
 *      BACKEND repair pass to implement them (reuse dispatchAuditRepair — `ENDPOINT
 *      …` ids are non-frontend, so they route to a backend worker).
 *
 * Flag-gated (CODEGEN_SCHEMA_RECONCILE, default OFF) → passthrough no-op. Gated
 * again on "are there pending requests" so a clean build pays nothing. Runs LLM
 * workers; validate on a real run before defaulting on.
 */
async function schemaReconcile(
  state: SupervisorState,
): Promise<Partial<SupervisorState>> {
  if (!ENABLE_SCHEMA_RECONCILE) return {};

  const emit = getRepairEmitter(state.sessionId);
  let pending: SchemaChangeRequest[];
  try {
    const [requests, decisions] = await Promise.all([
      readSchemaChangeRequests(state.outputDir),
      readSchemaChangeDecisions(state.outputDir),
    ]);
    pending = pendingRequests(requests, decisions);
  } catch {
    return {};
  }
  if (pending.length === 0) return {};

  console.log(
    `[Supervisor] schemaReconcile: ${pending.length} pending schema-change-request(s) after FE phase — amending schema + backfilling implementation.`,
  );

  // 1. Apply the FE-discovered amendments to the shared schema (disk side-effect).
  const arbiterDelta = await schemaArbiter(state);
  const afterArbiter: SupervisorState = { ...state, ...arbiterDelta };

  // 2. Re-derive API_CONTRACTS.json from the amended ENDPOINTS (disk side-effect).
  try {
    await generateApiContracts(afterArbiter);
  } catch (err) {
    console.warn(
      `[Supervisor] schemaReconcile: contract re-derivation failed (${err instanceof Error ? err.message : err}); skipping backfill.`,
    );
    return arbiterDelta;
  }

  // 3. Which endpoints does the amended contract now declare that no task builds?
  const contractsRaw = await fsRead("API_CONTRACTS.json", state.outputDir);
  let contracts: ContractEntryLike[] = [];
  try {
    const parsed = JSON.parse(contractsRaw);
    if (Array.isArray(parsed)) contracts = parsed as ContractEntryLike[];
  } catch {
    return arbiterDelta;
  }
  if (contracts.length === 0 || state.tasks.length === 0) return arbiterDelta;

  const gate = runContractCoverageGate(contracts, state.tasks);
  if (gate.passed || gate.missingIds.length === 0) return arbiterDelta;

  // 4. Implement the newly-added, unbuilt endpoints via a scoped backend repair.
  const entries: AuditEntry[] = gate.missingIds.map((ep) => ({
    id: `ENDPOINT ${ep}`,
    verdict: "partial",
    layer: "l2",
    reason:
      `The shared schema was amended (FE→BE reconciliation) to add endpoint \`${ep}\`, ` +
      `but no backend code implements it. Implement this route per the amended shared ` +
      `schema — use the request/response types named in its ENDPOINTS registry entry.`,
    coveringTaskIds: [],
    evidence: [],
    category: "coverage",
  }));
  emit({
    stage: "post-gen-audit",
    event: "schema_reconcile_backfill",
    missingIds: entries.map((e) => e.id),
    details: { count: entries.length },
  });

  let disp;
  try {
    disp = await dispatchAuditRepair({
      uncovered: entries,
      outputDir: state.outputDir,
      projectContext: state.projectContext,
      fileRegistrySnapshot: state.fileRegistry,
      apiContractsSnapshot: state.apiContracts,
      scaffoldProtectedPaths: state.scaffoldProtectedPaths,
      ralphConfig: state.ralphConfig,
      sessionId: state.sessionId,
      emitter: emit,
    });
  } catch (err) {
    console.warn(
      `[Supervisor] schemaReconcile: backend backfill dispatch failed (${err instanceof Error ? err.message : err}).`,
    );
    return arbiterDelta;
  }

  const newFiles: GeneratedFile[] = disp.backendGeneratedFiles.map((p) => ({
    path: p,
    role: "backend",
    summary: "schema-reconcile: compensating endpoint implementation",
  }));
  console.log(
    `[Supervisor] schemaReconcile: backfilled ${gate.missingIds.length} endpoint(s); +${newFiles.length} file(s), +$${disp.costUsd.toFixed(4)}.`,
  );

  return {
    ...arbiterDelta,
    fileRegistry: newFiles,
    totalCostUsd: disp.costUsd,
  };
}

// ─── Route B: parallel BACKEND + FRONTEND codegen (CODEGEN_PARALLEL_FE_BE) ───
// Two phase subgraphs run CONCURRENTLY inside one `parallel_codegen` node via
// Promise.all. This deliberately avoids graph-topology diamond fan-in (which is
// NOT a barrier for unequal-length branches — see parallel-fanin-feasibility.test)
// and never runs the two phaseVerifyAndFix nodes concurrently (they share OVERWRITE
// channels and would collide). Verify + contract-extraction run sequentially
// post-join in the main graph.
function buildBackendPhaseSubgraph() {
  return new StateGraph(SupervisorStateAnnotation)
    .addNode("be_worker", parallelWorkerNode)
    .addConditionalEdges(START, dispatchBackendAndTestWorkers)
    .addEdge("be_worker", END)
    .compile();
}

function buildFrontendPhaseSubgraph() {
  const feDispatchGate = (_state: SupervisorState) => ({});
  return new StateGraph(SupervisorStateAnnotation)
    .addNode("fe_foundation", feFoundation)
    .addNode("fe_dispatch_gate", feDispatchGate)
    .addNode("fe_worker", parallelWorkerNode)
    .addNode("fe_route_consolidation", feRouteConsolidation)
    .addEdge(START, "fe_foundation")
    .addEdge("fe_foundation", "fe_dispatch_gate")
    .addConditionalEdges("fe_dispatch_gate", dispatchFrontendWorkers)
    .addEdge("fe_worker", "fe_route_consolidation")
    .addEdge("fe_route_consolidation", END)
    .compile();
}

let _bePhaseSubgraph: ReturnType<typeof buildBackendPhaseSubgraph> | null =
  null;
let _fePhaseSubgraph: ReturnType<typeof buildFrontendPhaseSubgraph> | null =
  null;

async function parallelCodegenPhase(
  state: SupervisorState,
): Promise<Partial<SupervisorState>> {
  _bePhaseSubgraph ??= buildBackendPhaseSubgraph();
  _fePhaseSubgraph ??= buildFrontendPhaseSubgraph();

  // Snapshot the shared base so we can return only each branch's DELTA below.
  const basePhase = state.phaseResults.length;
  const baseContracts = state.apiContracts.length;
  const baseCost = state.totalCostUsd;

  console.log(
    "[Supervisor] parallel_codegen: running BACKEND + FRONTEND phases concurrently (CODEGEN_PARALLEL_FE_BE)…",
  );

  const [beOut, feOut] = (await Promise.all([
    _bePhaseSubgraph.invoke(state, { recursionLimit: 200 }),
    _fePhaseSubgraph.invoke(state, { recursionLimit: 200 }),
  ])) as [SupervisorState, SupervisorState];

  // fileRegistry uses a merge-by-path (idempotent) reducer, so returning the
  // UNION of both subgraphs' registries is safe — the main-graph reducer re-merges
  // against the (identical) base without duplication.
  const filesByPath = new Map<string, (typeof beOut.fileRegistry)[number]>();
  for (const f of beOut.fileRegistry ?? []) filesByPath.set(f.path, f);
  for (const f of feOut.fileRegistry ?? []) filesByPath.set(f.path, f);

  const merged: Partial<SupervisorState> = {
    // Additive (concat) channels: return ONLY each branch's delta (entries appended
    // after the shared base) so the main-graph reducer doesn't double-count the base
    // entries both subgraphs were seeded with.
    phaseResults: [
      ...beOut.phaseResults.slice(basePhase),
      ...feOut.phaseResults.slice(basePhase),
    ],
    apiContracts: [
      ...beOut.apiContracts.slice(baseContracts),
      ...feOut.apiContracts.slice(baseContracts),
    ],
    // Summed channel: return the combined delta; the main-graph reducer adds it to
    // the base exactly once.
    totalCostUsd:
      beOut.totalCostUsd - baseCost + (feOut.totalCostUsd - baseCost),
    fileRegistry: [...filesByPath.values()],
  };

  console.log(
    `[Supervisor] parallel_codegen done: +${merged.phaseResults!.length} phase results, ` +
      `${merged.fileRegistry!.length} files in union, +$${(merged.totalCostUsd ?? 0).toFixed(4)}.`,
  );

  return merged;
}

export function createSupervisorGraph() {
  // Pick the integration-fix implementation once per graph build. Both honour
  // the same node contract, so routing + circuit-breaker are agnostic.
  const integrationVerifyNode =
    INTEGRATION_FIX_MODE === "legacy"
      ? integrationVerifyAndFix
      : openIntegrationVerifyAndFix;
  // In OPEN mode the TDD hard gate is bypassed at the graph level — tests are
  // reference material, and the open node's `report_done` is the sole authority
  // on done-ness (no loop-back, no session-fail override).
  const tddGreenVerifyNode =
    INTEGRATION_FIX_MODE === "legacy"
      ? tddGreenVerifyAndReview
      : tddGreenVerifyPassthrough;
  console.log(
    `[Supervisor] integration_verify node bound to ${
      INTEGRATION_FIX_MODE === "legacy"
        ? "legacy IntegrationVerifyFix"
        : "OpenIntegrationFix"
    } (INTEGRATION_FIX_MODE=${INTEGRATION_FIX_MODE}).`,
  );
  // ─── Route B (flag ON): BE + FE phases run concurrently in parallel_codegen,
  // then verify + extract run sequentially post-join. Built as a separate chain so
  // the flag-OFF path below stays byte-identical (zero regression).
  if (ENABLE_PARALLEL_FE_BE) {
    const parallelGraph = new StateGraph(SupervisorStateAnnotation)
      .addNode("classify_tasks", classifyTasks)
      .addNode("architect_phase", runArchitectPhase)
      .addNode("scaffold_verify", scaffoldVerify)
      .addNode("scaffold_fix", scaffoldFix)
      .addNode("dispatch_gate", dispatchGate)
      .addNode("dependency_baseline", dependencyBaseline)
      .addNode("generate_api_contracts", generateApiContracts)
      .addNode("contract_task_coverage", contractTaskCoverage)
      .addNode("page_task_coverage", pageTaskCoverage)
      .addNode("tdd_test_writer", tddTestWriterAndRed)
      .addNode("parallel_codegen", parallelCodegenPhase)
      .addNode("be_phase_verify", (s) =>
        phaseVerifyAndFix(s, { workerHintRoles: ["backend", "test"] }),
      )
      .addNode("fe_phase_verify", (s) =>
        phaseVerifyAndFix(s, { workerHintRoles: ["frontend"] }),
      )
      .addNode("be_readiness_gate", backendReadinessGate)
      .addNode("extract_real_contracts", extractRealContracts)
      .addNode("schema_arbiter", schemaArbiter)
      .addNode("schema_reconcile", schemaReconcile)
      .addNode("sync_deps", syncDeps)
      .addNode("integration_verify", integrationVerifyNode)
      .addNode("tdd_green_verify", tddGreenVerifyNode)
      .addNode("e2e_verify", e2eVerifyAndFix)
      .addNode("summary", summary)

      .addEdge(START, "classify_tasks")
      .addEdge("classify_tasks", "architect_phase")
      .addEdge("architect_phase", "scaffold_verify")
      .addConditionalEdges("scaffold_verify", shouldFixScaffoldOrContinue, {
        dispatch: "dispatch_gate",
        scaffold_fix: "scaffold_fix",
      })
      .addEdge("scaffold_fix", "scaffold_verify")
      .addEdge("dispatch_gate", "dependency_baseline")
      .addEdge("dependency_baseline", "generate_api_contracts")
      .addEdge("generate_api_contracts", "contract_task_coverage")
      .addEdge("contract_task_coverage", "page_task_coverage")
      .addEdge("page_task_coverage", "tdd_test_writer")
      // BE + FE built concurrently inside this single node…
      .addEdge("tdd_test_writer", "parallel_codegen")
      // …then verify each phase SEQUENTIALLY post-join (phaseVerifyAndFix uses
      // overwrite channels and must never run concurrently).
      .addEdge("parallel_codegen", "be_phase_verify")
      .addEdge("be_phase_verify", "fe_phase_verify")
      .addEdge("fe_phase_verify", "be_readiness_gate")
      // extract_real_contracts is now a post-hoc DRIFT CHECK (FE already bound the
      // authoritative upfront contract); routeAfterBackendReadiness behaves the same.
      .addConditionalEdges("be_readiness_gate", routeAfterBackendReadiness, {
        extract_real_contracts: "extract_real_contracts",
        summary: "summary",
      })
      .addEdge("extract_real_contracts", "schema_arbiter")
      .addEdge("schema_arbiter", "schema_reconcile")
      .addEdge("schema_reconcile", "sync_deps")
      .addEdge("sync_deps", "integration_verify")
      .addEdge("integration_verify", "tdd_green_verify")
      .addConditionalEdges("tdd_green_verify", routeAfterTddGreenVerify, {
        integration_verify: "integration_verify",
        e2e_verify: "e2e_verify",
        summary: "summary",
      })
      .addConditionalEdges("e2e_verify", routeAfterE2eVerify, {
        e2e_verify: "e2e_verify",
        summary: "summary",
      })
      .addEdge("summary", END);

    return parallelGraph.compile();
  }

  const feDispatchGate = (_state: SupervisorState) => ({});

  const graph = new StateGraph(SupervisorStateAnnotation)
    .addNode("classify_tasks", classifyTasks)
    .addNode("architect_phase", runArchitectPhase)
    .addNode("scaffold_verify", scaffoldVerify)
    .addNode("scaffold_fix", scaffoldFix)
    .addNode("dispatch_gate", dispatchGate)
    .addNode("dependency_baseline", dependencyBaseline)
    .addNode("generate_api_contracts", generateApiContracts)
    .addNode("contract_task_coverage", contractTaskCoverage)
    .addNode("page_task_coverage", pageTaskCoverage)
    .addNode("tdd_test_writer", tddTestWriterAndRed)
    .addNode("be_worker", parallelWorkerNode)
    .addNode("be_phase_verify", (s) =>
      phaseVerifyAndFix(s, { workerHintRoles: ["backend", "test"] }),
    )
    .addNode("be_readiness_gate", backendReadinessGate)
    .addNode("extract_real_contracts", extractRealContracts)
    .addNode("schema_arbiter", schemaArbiter)
    .addNode("schema_reconcile", schemaReconcile)
    .addNode("fe_foundation", feFoundation)
    .addNode("fe_dispatch_gate", feDispatchGate)
    .addNode("fe_worker", parallelWorkerNode)
    .addNode("fe_route_consolidation", feRouteConsolidation)
    .addNode("fe_phase_verify", (s) =>
      phaseVerifyAndFix(s, { workerHintRoles: ["frontend"] }),
    )
    .addNode("sync_deps", syncDeps)
    .addNode("integration_verify", integrationVerifyNode)
    .addNode("tdd_green_verify", tddGreenVerifyNode)
    .addNode("e2e_verify", e2eVerifyAndFix)
    .addNode("summary", summary)

    .addEdge(START, "classify_tasks")
    .addEdge("classify_tasks", "architect_phase")
    .addEdge("architect_phase", "scaffold_verify")
    .addConditionalEdges("scaffold_verify", shouldFixScaffoldOrContinue, {
      dispatch: "dispatch_gate",
      scaffold_fix: "scaffold_fix",
    })
    .addEdge("scaffold_fix", "scaffold_verify")
    .addEdge("dispatch_gate", "dependency_baseline")
    .addEdge("dependency_baseline", "generate_api_contracts")
    .addEdge("generate_api_contracts", "contract_task_coverage")
    .addEdge("contract_task_coverage", "page_task_coverage")
    .addEdge("page_task_coverage", "tdd_test_writer")
    .addConditionalEdges("tdd_test_writer", dispatchBackendAndTestWorkers)
    .addEdge("be_worker", "be_phase_verify")
    // G2 (flag-gated): gate the backend→frontend transition on backend readiness.
    // Flag OFF → routeAfterBackendReadiness always returns "extract_real_contracts"
    // (identical to the previous unconditional edge). Flag ON + backend not green →
    // default "proceed-quarantined" still builds the frontend (output is quarantined
    // via the BUILD_FAILED marker); only BLUEPRINT_BACKEND_GATE_MODE=hard-stop diverts
    // to "summary" and skips the frontend.
    .addEdge("be_phase_verify", "be_readiness_gate")
    .addConditionalEdges("be_readiness_gate", routeAfterBackendReadiness, {
      extract_real_contracts: "extract_real_contracts",
      summary: "summary",
    })
    .addEdge("extract_real_contracts", "schema_arbiter")
    .addEdge("schema_arbiter", "fe_foundation")
    .addEdge("fe_foundation", "fe_dispatch_gate")
    .addConditionalEdges("fe_dispatch_gate", dispatchFrontendWorkers)
    .addEdge("fe_worker", "fe_route_consolidation")
    .addEdge("fe_route_consolidation", "fe_phase_verify")
    .addEdge("fe_phase_verify", "schema_reconcile")
    .addEdge("schema_reconcile", "sync_deps")
    .addEdge("sync_deps", "integration_verify")
    .addEdge("integration_verify", "tdd_green_verify")
    .addConditionalEdges("tdd_green_verify", routeAfterTddGreenVerify, {
      integration_verify: "integration_verify",
      e2e_verify: "e2e_verify",
      summary: "summary",
    })
    .addConditionalEdges("e2e_verify", routeAfterE2eVerify, {
      e2e_verify: "e2e_verify",
      summary: "summary",
    })
    .addEdge("summary", END);

  return graph.compile();
}

export function createIntegrationRetryGraph() {
  const integrationVerifyNode =
    INTEGRATION_FIX_MODE === "legacy"
      ? integrationVerifyAndFix
      : openIntegrationVerifyAndFix;
  // OPEN mode bypasses the graph-level TDD hard gate (see createSupervisorGraph).
  const tddGreenVerifyNode =
    INTEGRATION_FIX_MODE === "legacy"
      ? tddGreenVerifyAndReview
      : tddGreenVerifyPassthrough;
  const graph = new StateGraph(SupervisorStateAnnotation)
    .addNode("integration_verify", integrationVerifyNode)
    .addNode("tdd_green_verify", tddGreenVerifyNode)
    .addNode("summary", summary)
    .addEdge(START, "integration_verify")
    .addEdge("integration_verify", "tdd_green_verify")
    .addConditionalEdges("tdd_green_verify", routeAfterTddGreenVerifyRetry, {
      integration_verify: "integration_verify",
      summary: "summary",
    })
    .addEdge("summary", END);

  return graph.compile();
}

export function createE2eRetryGraph() {
  const graph = new StateGraph(SupervisorStateAnnotation)
    .addNode("e2e_verify", e2eVerifyAndFix)
    .addNode("summary", summary)
    .addEdge(START, "e2e_verify")
    .addConditionalEdges("e2e_verify", routeAfterE2eVerify, {
      e2e_verify: "e2e_verify",
      summary: "summary",
    })
    .addEdge("summary", END);

  return graph.compile();
}
