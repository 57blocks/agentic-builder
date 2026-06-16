import { NextRequest } from "next/server";
import path from "path";
import fs from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";
import { v4 as uuidv4 } from "uuid";
import { resolveCodeOutputRoot } from "@/lib/pipeline/code-output";
import { readBuildFailedMarker } from "@/lib/pipeline/build-quarantine";
import { recordUnresolvedProblem } from "@/lib/pipeline/unresolved-problems";
import { createSupervisorGraph } from "@/lib/langgraph/supervisor";
import { EventMapper, type ErrorCategory } from "@/lib/langgraph/event-mapper";
import { prepareE2eArtifacts } from "@/lib/e2e/e2e-artifacts";
import {
  copyScaffold,
  listScaffoldTemplateRelativePaths,
  resolveScaffoldTier,
  type ScaffoldTier,
} from "@/lib/pipeline/scaffold-copy";
import {
  distributeSharedSchema,
  distributePipelineDag,
} from "@/lib/pipeline/shared-schema-distributor";
import {
  getTierScaffoldSpecForCodingContext,
  writeScaffoldSpecFile,
} from "@/lib/pipeline/scaffold-spec";
import {
  formatGeneratedCodeDotEnv,
  upsertRedisUrlEnv,
  resolveBlueprintGeneratedRedisUrl,
  resolveBlueprintGeneratedDatabaseUrl,
  resolveEffectiveDatabaseUrl,
  upsertDatabaseUrlEnv,
  upsertJwtEnvVars,
  upsertBackendPortEnv,
  upsertFrontendApiBaseUrlEnv,
  resolveBackendPort,
  upsertBackendPrivyAppIdMirror,
  resolvePrivyAppIdMirrorFromFilledResources,
} from "@/lib/pipeline/generated-code-env";
import {
  normalizeProjectTier,
  prdSignalsBackend,
} from "@/lib/agents/shared/project-classifier";
import { readAuthDecision } from "@/lib/pipeline/auth-decision-io";
import { InfraAgent } from "@/lib/agents/infra/infra-agent";
import { applyInfra } from "@/lib/pipeline/infra/apply";
import { buildInfraSpecFromKickoff } from "@/lib/pipeline/infra/from-kickoff";
import {
  readKickoffInfraMetadata,
  databaseUrlFrom,
  redisUrlFrom,
} from "@/lib/pipeline/kickoff-infra";
import { recoverFromCrashedTddNeutralization } from "@/lib/pipeline/tdd-runtime-executor";
import {
  readResourceRequirements,
  upsertResourceEnvVars,
  type ResourceRequirement,
} from "@/lib/pipeline/resource-requirements";
import type {
  KickoffWorkItem,
  CodingTask,
  RalphConfig,
} from "@/lib/pipeline/types";
import { stripTestingPhaseTasks } from "@/lib/pipeline/strip-testing-tasks";
import { readSubsystemManifest } from "@/lib/pipeline/subsystems/manifest-io";
import { writeOrchestrationStatus } from "@/lib/pipeline/orchestration-status";
import { buildCombinedDomainSlice } from "@/lib/pipeline/subsystems/domain-files";
import { developBySubsystem } from "@/lib/pipeline/subsystems/develop";
import { createSubsystemSseForwarder } from "@/lib/pipeline/subsystems/sse-forward";
import {
  readDesignReferencesFromOutput,
  formatDesignReferencesPromptBlock,
  copyDesignReferencesToOutput,
} from "@/lib/pipeline/design-references";
import { DEFAULT_RALPH_CONFIG } from "@/lib/pipeline/types";
import {
  buildFrontendDesignContextForCodegen,
  readPencilDesignDoc,
} from "@/lib/pipeline/frontend-design-context";
import {
  createRepairEmitter,
  createJsonlRepairSink,
  consoleRepairSink,
  registerRepairEmitter,
  unregisterRepairEmitter,
  runFeatureChecklistAudit,
  auditFrontendWiring,
  dispatchAuditRepair,
  AttemptTracker,
  escalateRepairCircuit,
  missingIdsScopeKey,
  type RepairEmitter,
  type RepairEvent,
  type AuditTaskSummary,
  type FeatureChecklistAuditResult,
} from "@/lib/pipeline/self-heal";
import {
  registerWorkerChunkSink,
  unregisterWorkerChunkSink,
} from "@/lib/langgraph/worker-event-bridge";
import {
  runEvidenceGate,
  collectCodingStageEvidence,
} from "@/lib/pipeline/gates";
import { createMemorySelfHealSink } from "@/lib/memory/self-heal-sink";
import { extractPrdRequirementIndex } from "@/lib/requirements/extract-prd-spec";
import type { PrdSpec } from "@/lib/requirements/prd-spec-types";
import type { ApiContract, GeneratedFile } from "@/lib/langgraph/state";
import {
  writeCodingSessionReport,
  clearCodingSessionLlmUsage,
  getCodingSessionLlmUsage,
} from "@/lib/pipeline/coding-session-report";
import {
  runModelScoringStage,
  type GateResultsSnapshot,
} from "@/lib/pipeline/model-scoring";
import {
  writeSessionCheckpoint,
  readSessionCheckpoint,
  clearSessionCheckpoint,
  type TaskCheckpointEntry,
} from "@/lib/pipeline/session-checkpoint";
import {
  writeTddManifestFromTasks,
  rotateTddEvidenceForNewSession,
} from "@/lib/pipeline/tdd-manifest";
import { activeCodingSessions } from "./session-registry";
import {
  normalizeCodingMode,
  type CodingMode,
} from "@/lib/pipeline/coding-mode";
import { pruneDriftedTddTests } from "@/lib/pipeline/tdd-drift-cleanup";
import {
  loadGoalModePlan,
  maybeExtractAndPersistPlan,
  runGoalModeCoding,
  type PersistedBuildPlan,
} from "@/lib/agentic-build";

const execFileAsync = promisify(execFile);

export const maxDuration = 600;

function classifyError(
  error: unknown,
  clientAborted: boolean,
): {
  category: ErrorCategory;
  message: string;
} {
  if (clientAborted) {
    return {
      category: "client_disconnect",
      message: "Client disconnected (SSE closed)",
    };
  }

  if (!(error instanceof Error)) {
    return { category: "unknown", message: String(error) };
  }

  const msg = error.message.toLowerCase();
  const name = error.name;

  if (
    name === "AbortError" ||
    msg.includes("aborted") ||
    msg.includes("cancelled")
  ) {
    return {
      category: "client_disconnect",
      message: `Client aborted: ${error.message}`,
    };
  }

  if (
    msg.includes("timeout") ||
    msg.includes("timed out") ||
    msg.includes("terminated") ||
    msg.includes("exceeded") ||
    name === "TimeoutError"
  ) {
    return {
      category: "timeout",
      message: `Timeout/terminated: ${error.message}`,
    };
  }

  if (
    msg.includes("openrouter") ||
    msg.includes("api error") ||
    msg.includes("rate limit") ||
    msg.includes("model") ||
    msg.includes("codegen api") ||
    msg.includes("empty content") ||
    msg.includes("non-json response")
  ) {
    return { category: "llm_error", message: `LLM error: ${error.message}` };
  }

  return { category: "graph_error", message: error.message };
}

/**
 * Walk a LangGraph stream chunk and extract any {taskId, status, generatedFiles}
 * triples. Used to build `AuditTaskSummary[]` for the feature-checklist audit.
 * Robust to both top-level `taskResults` arrays (worker output) and nested
 * `phaseResults[].taskResults[]` shapes (supervisor output).
 */
function collectTaskResultsFromChunk(
  updates: Record<string, unknown>,
  codingTasks: CodingTask[],
  out: Map<string, AuditTaskSummary>,
): void {
  const taskMeta = new Map(codingTasks.map((t) => [t.id, t] as const));

  const ingest = (rec: Record<string, unknown>): void => {
    const taskId = typeof rec.taskId === "string" ? rec.taskId : null;
    if (!taskId) return;
    const files = Array.isArray(rec.generatedFiles)
      ? (rec.generatedFiles as unknown[]).filter(
          (f): f is string => typeof f === "string",
        )
      : [];
    const status =
      rec.status === "completed" ||
      rec.status === "completed_with_warnings" ||
      rec.status === "failed"
        ? (rec.status as AuditTaskSummary["status"])
        : ("unknown" as const);
    const meta = taskMeta.get(taskId);
    const prev = out.get(taskId);
    const mergedFiles = prev
      ? [...new Set([...prev.generatedFiles, ...files])]
      : files;
    out.set(taskId, {
      id: taskId,
      title:
        meta?.title ?? (typeof rec.title === "string" ? rec.title : taskId),
      coversRequirementIds: meta?.coversRequirementIds ?? [],
      generatedFiles: mergedFiles,
      status,
    });
  };

  for (const node of Object.keys(updates)) {
    const payload = updates[node];
    if (!payload || typeof payload !== "object") continue;
    const rec = payload as Record<string, unknown>;

    if (Array.isArray(rec.taskResults)) {
      for (const tr of rec.taskResults) {
        if (tr && typeof tr === "object") ingest(tr as Record<string, unknown>);
      }
    }
    if (Array.isArray(rec.phaseResults)) {
      for (const pr of rec.phaseResults) {
        if (!pr || typeof pr !== "object") continue;
        const phase = pr as Record<string, unknown>;
        if (Array.isArray(phase.taskResults)) {
          for (const tr of phase.taskResults) {
            if (tr && typeof tr === "object") {
              ingest(tr as Record<string, unknown>);
            }
          }
        }
      }
    }
  }
}

function collectWorkerContextFromChunk(
  updates: Record<string, unknown>,
  fileRegistryOut: Map<string, GeneratedFile>,
  apiContractsOut: Map<string, ApiContract>,
): void {
  const ingestGeneratedFile = (value: unknown): void => {
    if (!value || typeof value !== "object") return;
    const rec = value as Record<string, unknown>;
    if (
      typeof rec.path !== "string" ||
      typeof rec.role !== "string" ||
      typeof rec.summary !== "string"
    ) {
      return;
    }
    const exports = Array.isArray(rec.exports)
      ? rec.exports.filter((item): item is string => typeof item === "string")
      : undefined;
    fileRegistryOut.set(rec.path, {
      path: rec.path,
      role: rec.role as GeneratedFile["role"],
      summary: rec.summary,
      exports,
    });
  };

  const ingestApiContract = (value: unknown): void => {
    if (!value || typeof value !== "object") return;
    const rec = value as Record<string, unknown>;
    if (
      typeof rec.service !== "string" ||
      typeof rec.endpoint !== "string" ||
      typeof rec.method !== "string" ||
      typeof rec.authType !== "string" ||
      typeof rec.schema !== "string" ||
      typeof rec.generatedBy !== "string"
    ) {
      return;
    }
    const key = [
      rec.service,
      rec.method.toUpperCase(),
      rec.endpoint,
      rec.generatedBy,
    ].join("::");
    apiContractsOut.set(key, {
      service: rec.service,
      endpoint: rec.endpoint,
      method: rec.method,
      requestFields:
        typeof rec.requestFields === "string" ? rec.requestFields : undefined,
      responseFields:
        typeof rec.responseFields === "string" ? rec.responseFields : undefined,
      authType: rec.authType,
      description:
        typeof rec.description === "string" ? rec.description : undefined,
      schema: rec.schema,
      generatedBy: rec.generatedBy,
    });
  };

  for (const payload of Object.values(updates)) {
    if (!payload || typeof payload !== "object") continue;
    const rec = payload as Record<string, unknown>;

    if (Array.isArray(rec.fileRegistry)) {
      for (const item of rec.fileRegistry) ingestGeneratedFile(item);
    }
    if (Array.isArray(rec.apiContracts)) {
      for (const item of rec.apiContracts) ingestApiContract(item);
    }
  }
}

interface SupervisorGateSnapshot {
  integrationErrors: string;
  runtimeVerifyErrors: string;
  e2eVerifyErrors: string;
  /**
   * Highest observed `scaffoldFixAttempts` across all phase-verify runs.
   * Surfaced in the session report so the user can tell whether scaffold
   * fix phases converged quickly or bumped the iteration ceiling.
   */
  scaffoldFixAttempts: number;
  /** Same for `integrationFixAttempts` from integration verify/fix. */
  integrationFixAttempts: number;
  /**
   * Tracks which gate actually ran — used by the report to render
   * SKIPPED vs PASS/FAIL instead of treating "no error string" as a pass.
   */
  gatesExecuted: {
    integrationVerify: boolean;
    runtimeVerify: boolean;
    e2eVerify: boolean;
  };
}

function collectSupervisorGateStateFromChunk(
  updates: Record<string, unknown>,
  snapshot: SupervisorGateSnapshot,
): void {
  for (const payload of Object.values(updates)) {
    if (!payload || typeof payload !== "object") continue;
    const rec = payload as Record<string, unknown>;
    if (typeof rec.integrationErrors === "string") {
      snapshot.integrationErrors = rec.integrationErrors;
      snapshot.gatesExecuted.integrationVerify = true;
    }
    if (typeof rec.runtimeVerifyErrors === "string") {
      snapshot.runtimeVerifyErrors = rec.runtimeVerifyErrors;
      snapshot.gatesExecuted.runtimeVerify = true;
    }
    if (typeof rec.e2eVerifyErrors === "string") {
      snapshot.e2eVerifyErrors = rec.e2eVerifyErrors;
      snapshot.gatesExecuted.e2eVerify = true;
    }
    if (typeof rec.scaffoldFixAttempts === "number") {
      snapshot.scaffoldFixAttempts = Math.max(
        snapshot.scaffoldFixAttempts,
        rec.scaffoldFixAttempts,
      );
    }
    if (typeof rec.integrationFixAttempts === "number") {
      snapshot.integrationFixAttempts = Math.max(
        snapshot.integrationFixAttempts,
        rec.integrationFixAttempts,
      );
    }
  }
}

function summarizeBlockingGateErrors(
  snapshot: SupervisorGateSnapshot,
): string[] {
  const failures: string[] = [];
  if (snapshot.integrationErrors.trim()) {
    failures.push(
      [
        "Integration verify gate failed.",
        snapshot.integrationErrors.trim().slice(0, 3000),
      ].join("\n"),
    );
  }
  if (snapshot.runtimeVerifyErrors.trim()) {
    failures.push(
      [
        "Runtime verify gate failed.",
        snapshot.runtimeVerifyErrors.trim().slice(0, 3000),
      ].join("\n"),
    );
  }
  if (snapshot.e2eVerifyErrors.trim()) {
    failures.push(
      [
        "E2E verify gate failed.",
        snapshot.e2eVerifyErrors.trim().slice(0, 3000),
      ].join("\n"),
    );
  }
  return failures;
}

/**
 * Build a markdown block describing user-provided third-party credentials so
 * coding agents know exactly which env vars are wired up and what each is for.
 * Filled vs. unfilled values are surfaced separately so workers don't pretend
 * a missing key exists. The actual secret values are NEVER shown to the LLM —
 * only the env var names + descriptions.
 */
function formatResourceRequirementsPromptBlock(
  items: ResourceRequirement[],
  appliedOptionalFeatures: string[] = [],
): string {
  if (items.length === 0) return "";
  const filled = items.filter((r) => (r.value ?? "").trim().length > 0);
  const unfilled = items.filter((r) => !(r.value ?? "").trim());

  const lines: string[] = [];
  lines.push("## External resources & credentials (env vars)");
  lines.push("");
  lines.push(
    "The user provided the following third-party credentials at kickoff. " +
      "Use these EXACT env var names when reading from `process.env` or `import.meta.env`. " +
      "Do NOT invent alternative names. Secret values themselves are never exposed here — they live in `backend/.env` / `frontend/.env`.",
  );
  lines.push("");

  if (filled.length > 0) {
    lines.push("### Configured (values present in .env, ready to use)");
    lines.push("");
    for (const r of filled) {
      const reqMark = r.required ? " — required" : " — optional";
      // Non-secret config values (LLM_PROVIDER="gemini", USE_REDIS_QUEUE="0", …)
      // are surfaced inline so workers can branch on them at code-gen time.
      // Secret values are NEVER shown — only the env var name + description.
      const inlineValue = r.isConfig ? ` = \`${(r.value ?? "").trim()}\`` : "";
      lines.push(
        `- **\`${r.envKey}\`**${inlineValue} (${r.category}${reqMark}): ${r.description}`,
      );
    }
    lines.push("");
  }

  if (unfilled.length > 0) {
    lines.push(
      "### Declared but NOT yet configured (treat the corresponding feature as disabled / stubbed)",
    );
    lines.push("");
    for (const r of unfilled) {
      const reqMark = r.required ? " — required" : " — optional";
      lines.push(
        `- \`${r.envKey}\` (${r.category}${reqMark}): ${r.description}`,
      );
    }
    lines.push("");
    lines.push(
      "For unfilled keys: write code that reads the env var defensively " +
        "(check `process.env.X` for truthy value before calling the integration); " +
        "if absent, log a clear warning and gracefully degrade. Do NOT hardcode placeholder values.",
    );
    lines.push("");
  }

  // ── LLM provider abstraction (when LLM_* bundle is present) ────────────
  const declaredKeys = new Set(items.map((r) => r.envKey));
  if (
    declaredKeys.has("LLM_PROVIDER") ||
    declaredKeys.has("LLM_API_KEY") ||
    declaredKeys.has("LLM_MODEL")
  ) {
    lines.push("### LLM provider abstraction (HARD RULE)");
    lines.push("");
    lines.push(
      "This project declared the `LLM_*` env bundle. ALL LLM calls (chat, " +
        "summarisation, ranking, embeddings) MUST go through ONE provider-aware " +
        "client at `backend/src/services/llmService.ts` that reads `LLM_PROVIDER` " +
        "and instantiates the matching adapter. NEVER hardcode `https://api.openai.com/v1`, " +
        "a vendor-specific env var (`OPENAI_API_KEY`, `GEMINI_API_KEY`), or a model id " +
        "in feature files. Switching providers must be a one-line `.env` change with " +
        "zero source edits — the audit will fail any direct vendor SDK import outside `llmService.ts`.",
    );
    lines.push("");
  }

  // ── Auth integration directives ────────────────────────────────────────
  // Phase 3 split scaffold so OAuth SDK files are conditionally copied via
  // `_optional/auth-*`. The prompt now distinguishes:
  //   (a) detected provider with `_optional/auth-<x>` already applied → tell
  //       the worker the SDK files are ALREADY on disk; only wire onLogin
  //       and (optionally) the auth bridge hook.
  //   (b) detected provider with NO matching optional feature → fall back to
  //       the legacy "install + create Provider + rewrite LoginModal" flow.
  const oauthMatches = detectOauthIntegrations(items);
  if (oauthMatches.length > 0) {
    const appliedSet = new Set(appliedOptionalFeatures);

    const coveredByScaffold: OauthProviderInfo[] = [];
    const needsManualWiring: OauthProviderInfo[] = [];
    for (const m of oauthMatches) {
      if (
        m.optionalScaffoldFeature &&
        appliedSet.has(m.optionalScaffoldFeature)
      ) {
        coveredByScaffold.push(m);
      } else {
        needsManualWiring.push(m);
      }
    }

    if (coveredByScaffold.length > 0) {
      lines.push(
        "### Authentication integration (scaffold already shipped — wire it up)",
      );
      lines.push("");
      lines.push(
        "The kickoff resource detector triggered the optional scaffold " +
          "feature(s) listed below, so the SDK files have ALREADY been copied " +
          "into the generated project (see `.blueprint/scaffold-applied.json`). " +
          "DO NOT re-create them. Your task is to wire the existing files into " +
          "your landing/login page and a top-level layout.",
      );
      lines.push("");
      for (const m of coveredByScaffold) {
        lines.push(
          `- **${m.providerLabel}** — \`_optional/${m.optionalScaffoldFeature}\` applied (env: \`${m.envKey}\`)`,
        );
        lines.push(
          `  - SDK already shipped: \`frontend/src/providers/${m.providerComponent}.tsx\`, an OAuth-aware \`frontend/src/providers/AppProviders.tsx\`, an OAuth-aware \`frontend/src/components/auth/LoginModal.tsx\` (uses the SDK login hook), \`frontend/src/hooks/usePrivyAuthBridge.ts\` (or equivalent helper), plus backend middleware \`backend/src/middlewares/${m.optionalScaffoldFeature?.replace("auth-", "")}Auth.ts\` and SDK client. Dependency \`${m.npmPackage}\`${m.serverPackage ? ` (and \`${m.serverPackage}\`)` : ""} already in \`package.json\`.`,
        );
        lines.push(
          `  - In the landing / login page (e.g. \`frontend/src/views/LandingPage.tsx\`): render \`<LoginModal>\` and pass \`onLogin={(providerToken) => useAuth().login(providerToken)}\`. Do NOT re-implement the modal.`,
        );
        lines.push(
          `  - In a top-level layout (e.g. \`frontend/src/App.tsx\` or whatever wraps the router): call the auth-bridge hook once (\`usePrivyAuthBridge()\` for \`auth-privy\`). It auto-syncs the provider's access token into \`AuthContext\` so \`apiClient\` attaches it as \`Bearer\`. The backend middleware (already shipped) verifies it on every request — no separate \`/api/auth/verify\` exchange is required unless your PRD demands an internal JWT.`,
        );
        lines.push(
          `  - Backend HARD RULE: every controller / service that reads \`ctx.state.user.id\` MUST resolve the EXTERNAL provider id to the internal DB UUID first via \`User.findOne({ where: { ${m.optionalScaffoldFeature?.replace("auth-", "")}_id: ctx.state.user.id } })\`. NEVER call \`findByPk(ctx.state.user.id)\` with a provider DID — Postgres throws \`invalid input syntax for type uuid\`. See "External identity vs database primary key" in the backend role prompt.`,
        );
        lines.push("");
      }
    }

    if (needsManualWiring.length > 0) {
      lines.push(
        "### Authentication integration (NOT covered by an _optional scaffold — implement manually)",
      );
      lines.push("");
      lines.push(
        "The provider(s) below have no matching `_optional/auth-*` scaffold " +
          "yet, so you MUST plan and implement the integration end-to-end:",
      );
      lines.push("");
      for (const m of needsManualWiring) {
        lines.push(`- **${m.providerLabel}** (env: \`${m.envKey}\`)`);
        lines.push(
          `  - install: \`${m.npmPackage}\` in \`frontend/package.json\`${m.serverPackage ? ` (and \`${m.serverPackage}\` in \`backend/package.json\` for token verification)` : ""}`,
        );
        lines.push(
          `  - create \`frontend/src/providers/${m.providerComponent}.tsx\`: mount the real SDK Provider using \`${m.envKey}\` from \`import.meta.env\`. Do NOT leave it as a passthrough \`<>{children}</>\`.`,
        );
        lines.push(
          `  - modify \`frontend/src/components/auth/LoginModal.tsx\`: import the SDK login hook, drop the email+password fields, render a button that triggers the provider flow, and forward the resulting access token to the parent via \`onLogin(token)\`.`,
        );
        lines.push(
          `  - modify \`frontend/src/providers/AppProviders.tsx\`: wrap \`<AuthProvider>\` with the new provider component.`,
        );
        lines.push(
          `  - the page that renders \`LoginModal\` MUST pass an \`onLogin\` handler that calls the auth backend (e.g. \`POST /api/auth/verify\`) and then promotes local auth state on success.`,
        );
        lines.push("");
      }
    }
  }

  return lines.join("\n");
}

/**
 * Map known OAuth env keys to their SDK details so we can emit explicit
 * integration directives. Extending this is the right way to add support
 * for new providers (Auth0, Clerk, Supabase Auth, NextAuth, etc.).
 */
interface OauthProviderInfo {
  envKey: string;
  providerLabel: string;
  npmPackage: string;
  serverPackage?: string;
  /** Component name (without extension) for the provider wrapper. */
  providerComponent: string;
  /**
   * When set, this env triggers the matching `scaffolds/<tier>/_optional/<feature>`
   * directory to be copied into the generated project (see Phase 3:
   * `src/lib/pipeline/scaffold-optional.ts`). The prompt block uses this
   * to decide whether to tell the worker "SDK already shipped, just wire
   * it" (when applied) versus "you must implement end-to-end" (no
   * matching feature yet). Keep in sync with `_optional/manifest.json`.
   */
  optionalScaffoldFeature?: string;
}

const OAUTH_PROVIDER_REGISTRY: OauthProviderInfo[] = [
  {
    envKey: "VITE_PRIVY_APP_ID",
    providerLabel: "Privy (Twitter / Farcaster / wallet OAuth)",
    npmPackage: "@privy-io/react-auth",
    serverPackage: "@privy-io/node",
    providerComponent: "PrivyProvider",
    optionalScaffoldFeature: "auth-privy",
  },
  {
    envKey: "NEXT_PUBLIC_PRIVY_APP_ID",
    providerLabel: "Privy (Next.js)",
    npmPackage: "@privy-io/react-auth",
    serverPackage: "@privy-io/node",
    providerComponent: "PrivyProvider",
    optionalScaffoldFeature: "auth-privy",
  },
  {
    envKey: "VITE_CLERK_PUBLISHABLE_KEY",
    providerLabel: "Clerk",
    npmPackage: "@clerk/clerk-react",
    serverPackage: "@clerk/backend",
    providerComponent: "ClerkProvider",
    optionalScaffoldFeature: "auth-clerk",
  },
  {
    envKey: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    providerLabel: "Clerk (Next.js)",
    npmPackage: "@clerk/nextjs",
    providerComponent: "ClerkProvider",
    optionalScaffoldFeature: "auth-clerk",
  },
  {
    envKey: "VITE_AUTH0_DOMAIN",
    providerLabel: "Auth0",
    npmPackage: "@auth0/auth0-react",
    providerComponent: "Auth0Provider",
  },
  {
    envKey: "VITE_SUPABASE_URL",
    providerLabel: "Supabase Auth",
    npmPackage: "@supabase/supabase-js",
    providerComponent: "SupabaseProvider",
  },
  {
    envKey: "VITE_GOOGLE_CLIENT_ID",
    providerLabel: "Google OAuth",
    npmPackage: "@react-oauth/google",
    providerComponent: "GoogleAuthProvider",
  },
];

function detectOauthIntegrations(
  items: ResourceRequirement[],
): OauthProviderInfo[] {
  const matches: OauthProviderInfo[] = [];
  const seen = new Set<string>();
  for (const r of items) {
    const info = OAUTH_PROVIDER_REGISTRY.find((p) => p.envKey === r.envKey);
    if (info && !seen.has(info.providerLabel)) {
      seen.add(info.providerLabel);
      matches.push(info);
    }
  }
  return matches;
}

/**
 * Resolve the scaffold tier for a coding session.
 * Priority: explicit `projectTier` arg → PRD.md badge in outputDir → default "M".
 * Defaulting to "M" for pure-frontend (S-tier) projects causes a backend
 * directory to be scaffolded, which in turn breaks E2E because playwright.config.ts
 * tries to start a backend server that can't connect to any database.
 */
async function resolveTier(
  projectTier: string | undefined,
  outputRoot: string,
): Promise<ScaffoldTier> {
  if (projectTier) return projectTier.toUpperCase() as ScaffoldTier;
  try {
    const prdPath = path.join(outputRoot, "PRD.md");
    const prdContent = await fs.readFile(prdPath, "utf-8");
    const match = prdContent.match(/\*\*Project Tier:\s*([SML])\*\*/i);
    if (match) {
      const extracted = normalizeProjectTier(match[1]);
      console.log(`[CodingAPI] Resolved tier from PRD.md badge: ${extracted}`);
      return extracted as ScaffoldTier;
    }
  } catch {
    // PRD.md may not exist yet; fall through to default
  }
  console.warn(
    "[CodingAPI] projectTier not provided and PRD.md has no tier badge — defaulting to M",
  );
  return "M";
}

/**
 * Goal-mode coding handler. Runs a single autonomous agent against the
 * persisted build plan's milestones + acceptance commands (no task breakdown,
 * no scaffold). Reuses the coding SSE envelope (session_start/complete/error)
 * so the existing coding UI shows the run; milestone detail streams as custom
 * `goal_*` events. Writes a coding-session report so the dashboard sees the
 * pass/fail result like any other session.
 */
function runGoalModeCodingResponse(args: {
  request: NextRequest;
  outputRoot: string;
  plan: PersistedBuildPlan;
  projectId: string | null;
}): Response {
  const { request, outputRoot, plan, projectId } = args;
  const sessionId = uuidv4();
  const mapper = new EventMapper(sessionId);
  const encoder = new TextEncoder();
  const startedAt = new Date().toISOString();

  // Surface milestones as pseudo-tasks so the existing coding UI renders a list.
  const pseudoTasks: CodingTask[] = plan.milestones.map((m, i) => ({
    id: m.id || `M${i}`,
    phase: "goal",
    title: m.title || m.id || `Milestone ${i}`,
    description: m.instructions ?? "",
    estimatedHours: 0,
    executionKind: "ai_autonomous",
    dependencies: [],
    coversRequirementIds: [],
    assignedAgentId: null,
    codingStatus: "pending",
  }));

  let clientAborted = false;
  request.signal.addEventListener("abort", () => {
    clientAborted = true;
  });

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        if (clientAborted) return;
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          clientAborted = true;
        }
      };

      send(mapper.buildSessionStart(pseudoTasks));
      console.log(
        `[CodingAPI] Goal mode: session ${sessionId} running ${plan.milestones.length} milestone(s) at ${outputRoot}`,
      );

      let outcome: "passed" | "failed" = "failed";
      let milestoneResults: AuditTaskSummary[] = [];
      let terminalSummary = "";
      let fatalError = "";
      try {
        const result = await runGoalModeCoding({
          outputRoot,
          plan,
          send: (e) => send(e),
        });
        outcome = result.outcome;
        milestoneResults = result.milestones.map((m) => ({
          id: m.id,
          title: m.title,
          coversRequirementIds: [],
          generatedFiles: m.filesTouched,
          status:
            m.outcome === "passed"
              ? ("completed" as const)
              : m.outcome === "skipped"
                ? ("completed_with_warnings" as const)
                : ("failed" as const),
        }));
        if (outcome === "passed") {
          terminalSummary = `Goal mode passed: ${result.milestones.length} milestone(s) green.`;
          send(mapper.buildSessionComplete());
        } else {
          terminalSummary = `Goal mode failed at milestone ${result.failedAt ?? "?"}.`;
          fatalError = terminalSummary;
          send(mapper.buildSessionError(terminalSummary, "graph_error"));
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        terminalSummary = message;
        fatalError = message;
        send(
          mapper.buildSessionError(
            message,
            clientAborted ? "client_disconnect" : "graph_error",
          ),
        );
      } finally {
        try {
          await writeCodingSessionReport({
            sessionId,
            projectId,
            outputDir: outputRoot,
            startedAt,
            endedAt: new Date().toISOString(),
            status: clientAborted
              ? "aborted"
              : outcome === "passed"
                ? "pass"
                : "fail",
            terminalSummary:
              terminalSummary || "Goal-mode coding session ended.",
            finalAudit: null,
            taskResults: milestoneResults,
            fileRegistry: [],
            fatalError,
          });
        } catch (reportErr) {
          console.warn(
            `[CodingAPI] Goal-mode report write failed (ignored):`,
            reportErr instanceof Error ? reportErr.message : reportErr,
          );
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    runId,
    tasks,
    codeOutputDir,
    projectTier,
    ralph: ralphOverride,
    databaseUrl: databaseUrlBody,
    prd: prdBody,
    retryFailedTaskIds,
    projectId,
    stitchMeta,
    codingMode: codingModeRaw,
    scopedSubsystemBuild,
    activeSubsystemId,
  } = body as {
    runId: string;
    tasks: KickoffWorkItem[];
    codeOutputDir?: string;
    projectTier?: string;
    ralph?: Partial<RalphConfig>;
    /** Optional override; otherwise `BLUEPRINT_GENERATED_DATABASE_URL` (server .env.local). */
    databaseUrl?: string;
    /** PRD content passed from the UI to guarantee the correct project PRD is used. */
    prd?: string;
    /**
     * When set, ONLY tasks whose IDs are in this list will be executed.
     * All other tasks are considered already-completed and skipped.
     * Used for "retry failed tasks only" workflows.
     */
    retryFailedTaskIds?: string[];
    /** Optional project linkage for the persisted coding-session report. */
    projectId?: string;
    /** Stitch design metadata (projectId, screenId, projectUrl) persisted from the design step. */
    stitchMeta?: {
      projectId: string;
      screenId: string;
      projectUrl: string;
      screenshotUrl?: string | null;
    } | null;
    codingMode?: CodingMode | string;
    /** Set on scoped sub-calls from the subsystem orchestrator — prevents this
     *  request from re-entering subsystem-orchestration mode (no recursion). */
    scopedSubsystemBuild?: boolean;
    /** Set on scoped sub-calls: the subsystem being built. Authoritative signal
     *  for loading that domain's `domain-{id}.md` PRD slice. */
    activeSubsystemId?: string;
  };
  const codingMode = normalizeCodingMode(codingModeRaw);

  const ralphConfig: RalphConfig = {
    ...DEFAULT_RALPH_CONFIG,
    ...(ralphOverride ?? {}),
  };

  if (!runId || !Array.isArray(tasks) || tasks.length === 0) {
    return Response.json(
      { error: "runId and non-empty tasks array are required" },
      { status: 400 },
    );
  }

  const tasksAfterStrip = stripTestingPhaseTasks(tasks);
  if (tasksAfterStrip.length === 0) {
    return Response.json(
      { error: "No tasks to run after task normalization" },
      { status: 400 },
    );
  }

  // When retryFailedTaskIds is provided, only run those tasks.
  // All other tasks are considered already-completed and pre-populated
  // into collectedTaskResults as "completed_with_warnings" so the rest of
  // the pipeline (audit, scoring, reports) still sees them.
  const retrySet =
    retryFailedTaskIds && retryFailedTaskIds.length > 0
      ? new Set(retryFailedTaskIds)
      : null;
  // In retry mode, expand the retry set to include any dependency tasks whose
  // output files do not yet exist on disk. This prevents a scenario where a
  // retry task (e.g. T-006 Integration) depends on pages created by T-003/T-004
  // but those tasks were never completed — the worker would spin trying to find
  // absent files. We include missing-dependency tasks silently so the retry
  // remains targeted but self-healing.
  let expandedRetrySet = retrySet;
  if (retrySet) {
    const expandedIds = new Set(retrySet);
    const taskMap = new Map(tasksAfterStrip.map((t) => [t.id, t]));

    const addMissingDeps = (taskId: string, visited = new Set<string>()) => {
      if (visited.has(taskId)) return;
      visited.add(taskId);
      const task = taskMap.get(taskId);
      if (!task) return;
      for (const depId of task.dependencies ?? []) {
        addMissingDeps(depId, visited);
        const depTask = taskMap.get(depId);
        if (!depTask) continue;
        // Check if every "creates" file from the dep task exists on disk
        const depCreates = Array.isArray(depTask.files)
          ? depTask.files
          : depTask.files?.creates ?? [];
        const allCreatesExist = depCreates.every((f: string) => {
          try {
            require("fs").accessSync(path.join(outputRoot, f));
            return true;
          } catch {
            return false;
          }
        });
        if (!allCreatesExist) {
          expandedIds.add(depId);
        }
      }
    };

    for (const id of retrySet) {
      addMissingDeps(id);
    }

    if (expandedIds.size > retrySet.size) {
      const added = [...expandedIds].filter((id) => !retrySet.has(id));
      console.log(
        `[CodingAPI] Retry mode: expanded retry set with missing-dependency tasks: ${added.join(", ")}`,
      );
      expandedRetrySet = expandedIds;
    }
  }

  // Resume hygiene: never re-run a task the checkpoint marks completed when
  // it was only pulled in by dependency expansion. Without this, a
  // "Retry Failed" was re-running finished foundation tasks (e.g. T-002
  // scaffold) from scratch, i.e. "starting from the top".
  //
  // Carve-out: tasks the user EXPLICITLY picked (`retrySet`) are never dropped
  // here — if the user hand-picked an already-completed task to re-run, the
  // checkpoint must NOT silently filter it out. Otherwise the request 400s
  // with "None of the retryFailedTaskIds matched any known task" and the UI
  // is left with optimistic-pending status but no execution. (Mirrors the
  // same carve-out in the on-disk built filter below.)
  if (expandedRetrySet && retrySet) {
    try {
      const cp = await readSessionCheckpoint(process.cwd());
      if (cp) {
        const completed = new Set(
          Object.entries(cp.taskResults)
            .filter(
              ([, r]) =>
                r.status === "completed" ||
                r.status === "completed_with_warnings",
            )
            .map(([id]) => id),
        );
        const before = expandedRetrySet.size;
        expandedRetrySet = new Set(
          [...expandedRetrySet].filter(
            (id) => retrySet.has(id) || !completed.has(id),
          ),
        );
        if (expandedRetrySet.size < before) {
          console.log(
            `[CodingAPI] Resume: excluded ${before - expandedRetrySet.size} already-completed dependency task(s) from the retry set (checkpoint); explicitly-selected tasks were preserved.`,
          );
        }
      }
    } catch {
      /* no/unreadable checkpoint → nothing to exclude */
    }
  }

  // After a crash there is often no checkpoint, so the dependency-expansion
  // above re-pulls a selected unfinished task's ALREADY-BUILT dependencies and
  // the run re-does finished work (the user's complaint: "it's re-running tasks
  // I already built"). Drop any dependency-pulled task whose `creates` files all
  // exist on disk. Explicitly-selected tasks (in `retrySet`) are NEVER dropped —
  // if the user hand-picked a built task to re-fix it, honour that.
  if (expandedRetrySet && retrySet) {
    const outputRootForCheck = resolveCodeOutputRoot(
      process.cwd(),
      codeOutputDir,
    );
    const taskById = new Map(tasksAfterStrip.map((t) => [t.id, t]));
    const isBuiltOnDisk = (id: string): boolean => {
      const t = taskById.get(id);
      if (!t) return false;
      const creates = Array.isArray(t.files)
        ? t.files
        : t.files?.creates ?? [];
      if (creates.length === 0) return false; // can't prove built → keep it
      return creates.every((f: string) => {
        try {
          require("fs").accessSync(path.join(outputRootForCheck, f));
          return true;
        } catch {
          return false;
        }
      });
    };
    const before = expandedRetrySet.size;
    expandedRetrySet = new Set(
      [...expandedRetrySet].filter(
        (id) => retrySet.has(id) || !isBuiltOnDisk(id),
      ),
    );
    if (expandedRetrySet.size < before) {
      console.log(
        `[CodingAPI] Resume: excluded ${before - expandedRetrySet.size} already-built dependency task(s) from the run set (on-disk); only unbuilt deps + explicitly-selected tasks run.`,
      );
    }
  }

  const tasksToRun = expandedRetrySet
    ? tasksAfterStrip.filter((t) => expandedRetrySet!.has(t.id))
    : tasksAfterStrip;
  const tasksSkipped = expandedRetrySet
    ? tasksAfterStrip.filter((t) => !expandedRetrySet!.has(t.id))
    : [];

  if (retrySet && tasksToRun.length === 0) {
    return Response.json(
      { error: "None of the retryFailedTaskIds matched any known task" },
      { status: 400 },
    );
  }

  const outputRoot = resolveCodeOutputRoot(process.cwd(), codeOutputDir);

  // ── Subsystem-by-subsystem orchestration (large multi-domain PRDs) ─────────
  // A fresh whole-system request (no retry subset, and not itself a scoped
  // sub-call) for a project that kickoff decomposed into >1 subsystem builds
  // foundation → per-domain layers → cross-domain integration, instead of one
  // monolithic pass. Each step is a scoped sub-call back to THIS route (flagged
  // `scopedSubsystemBuild`, so it never recurses here); per-domain calls then
  // pick up their `domain-{id}.md` PRD slice automatically. The whole build is
  // streamed to the UI as ONE coding session via the SSE forwarder.
  // Trigger on the MANIFEST (subsystems.json with >1 domain), NOT on a
  // `task.subsystem` tag: tasks reaching coding are not reliably tagged — the
  // authoritative task→domain mapping is the manifest's ownedModules, applied
  // by the orchestrator at runtime (assignTasksToSubsystems). Gating on a task
  // tag here is why orchestration silently never fired before.
  if (
    !scopedSubsystemBuild &&
    !(retryFailedTaskIds && retryFailedTaskIds.length > 0)
  ) {
    const manifest = await readSubsystemManifest(outputRoot);
    if (manifest && manifest.subsystems.length > 1) {
      console.log(
        `[CodingAPI] 🧩 Subsystem orchestration: ${manifest.subsystems.length} domains` +
        ` — foundation → layers → cross-domain integration.`,
      );
      const baseUrl = new URL(request.url).origin;
      const orchestrationTasks: CodingTask[] = tasksAfterStrip.map((t) => ({
        ...t,
        assignedAgentId: null,
        codingStatus: "pending" as const,
      }));
      const encoder = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          let closed = false;
          const emit = (event: Record<string, unknown>) => {
            if (closed) return;
            try {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
            } catch {
              closed = true; // client gone — stop enqueuing
            }
          };
          // Keep-alive comment frames stop a browser/proxy idle-timeout from
          // dropping this long-lived (multi-hour) stream — which previously
          // made the UI mark every in-progress task "failed" while the build
          // kept running. The store ignores any frame not starting with "data: ".
          const keepAlive = setInterval(() => {
            if (closed) return;
            try {
              controller.enqueue(encoder.encode(`: keep-alive\n\n`));
            } catch {
              closed = true;
            }
          }, 15_000);
          // One session_start carrying the full task list (shape the store expects),
          // then forward each sub-build's interior events as one continuous session.
          emit({ type: "session_start", sessionId: runId, data: { tasks: orchestrationTasks } });
          const forward = createSubsystemSseForwarder({ emit });
          // Durable status so the UI can resolve the outcome after an SSE drop.
          await writeOrchestrationStatus(process.cwd(), {
            runId,
            state: "running",
            domains: manifest.subsystems.length,
            updatedAt: new Date().toISOString(),
          });
          try {
            const result = await developBySubsystem({
              // Artifact root: manifest, domain-*.md, progress all live under the
              // code-output root (where this route + the gates read them).
              projectRoot: outputRoot,
              allTasks: tasksAfterStrip,
              manifest,
              prd: prdBody,
              codingContext: {
                baseUrl,
                runId,
                allTasks: tasksAfterStrip,
                codeOutputDir,
                projectTier: projectTier as "S" | "M" | "L" | undefined,
                // codingContext.projectRoot intentionally left default (process.cwd()):
                // the session checkpoint is written by this route at process.cwd(),
                // so the orchestrator must read it there. active-scope/contract are
                // re-resolved to the code-output root inside the runner/foundation.
                onProgress: (subsystemId, chunk) => forward(subsystemId, chunk),
              },
            });
            if (result.ok) {
              await writeOrchestrationStatus(process.cwd(), {
                runId,
                state: "completed",
                domains: manifest.subsystems.length,
                updatedAt: new Date().toISOString(),
              });
              emit({ type: "session_complete", sessionId: runId });
            } else {
              const error = result.errors.join("; ") || "Subsystem build failed.";
              await writeOrchestrationStatus(process.cwd(), {
                runId,
                state: "failed",
                domains: manifest.subsystems.length,
                error,
                updatedAt: new Date().toISOString(),
              });
              emit({
                type: "session_error",
                sessionId: runId,
                data: {
                  error,
                  errorCategory: "graph_error",
                },
              });
            }
          } catch (err) {
            const error = err instanceof Error ? err.message : String(err);
            await writeOrchestrationStatus(process.cwd(), {
              runId,
              state: "failed",
              error,
              updatedAt: new Date().toISOString(),
            }).catch(() => {});
            emit({
              type: "session_error",
              sessionId: runId,
              data: {
                error,
                errorCategory: "unknown",
              },
            });
          } finally {
            clearInterval(keepAlive);
            closed = true;
            try {
              controller.close();
            } catch {
              /* already closed (client disconnected) */
            }
          }
        },
      });
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }
  }

  // ── Goal-mode routing (conservative) ───────────────────────────────────
  // If preparation persisted a runnable build plan (milestones + usable
  // acceptance commands at `.blueprint/build-plan.json`), run the single-agent
  // acceptance loop instead of the scaffolded sharded pipeline — no task
  // breakdown, no scaffold, no install. The plan file is the authoritative
  // switch; we branch BEFORE any scaffold/cleanup work so goal mode starts
  // from a clean, agent-owned workspace.
  await fs.mkdir(outputRoot, { recursive: true });
  if (prdBody && prdBody.trim().length > 0) {
    await fs
      .writeFile(path.join(outputRoot, "PRD.md"), prdBody, "utf-8")
      .catch(() => undefined);
  }
  let goalPlan = await loadGoalModePlan(outputRoot);
  if (!goalPlan) {
    // Lazy fallback: the PRD carries plan signals but preparation didn't
    // pre-extract (e.g. PRD was saved before this feature shipped). At most one
    // extraction LLM call; conservative detection means ordinary PRDs skip it.
    const prdForDetect =
      prdBody && prdBody.trim().length > 0
        ? prdBody
        : await fs
            .readFile(path.join(outputRoot, "PRD.md"), "utf-8")
            .catch(() => "");
    if (prdForDetect.trim()) {
      const gate = await maybeExtractAndPersistPlan({
        projectRoot: outputRoot,
        specMarkdown: prdForDetect,
      });
      if (gate.persisted) goalPlan = await loadGoalModePlan(outputRoot);
    }
  }
  if (goalPlan) {
    console.log(
      `[CodingAPI] Goal mode armed — routing to agentic acceptance loop (${goalPlan.milestones.length} milestone(s)).`,
    );
    return runGoalModeCodingResponse({
      request,
      outputRoot,
      plan: goalPlan,
      projectId: projectId ?? null,
    });
  }

  // Pencil exports live under frontend/public/design; cleanup removes `frontend/`. Stash PNGs
  // so they survive scaffold refresh (markdown stays at repo root via KEEP_MD).
  const pencilDesignStash = path.join(
    outputRoot,
    ".agentic-pencil-design-stash",
  );
  const pencilDesignSrc = path.join(outputRoot, "frontend", "public", "design");
  try {
    await fs.rm(pencilDesignStash, { recursive: true, force: true });
    await fs.access(pencilDesignSrc);
    await fs.cp(pencilDesignSrc, pencilDesignStash, { recursive: true });
    console.log(
      "[CodingAPI] Stashed frontend/public/design (Pencil exports) before cleanup.",
    );
  } catch {
    /* no prior exports */
  }

  // Robust cleanup: handle each entry individually so one failure doesn't stop the rest.
  // Keep .git (RALPH commits), specific doc .md files, and .ralph tracking dir.
  // SKIP cleanup entirely in retry mode to preserve code generated by previously-
  // completed tasks. The scaffold copy below (forceOverwrite: true) refreshes
  // scaffold files anyway.
  // `.blueprint` holds pipeline state coding depends on (kickoff-infra DB url,
  // auth-decision, and — in subsystem mode — subsystems.json). `domain-*.md`
  // are the per-domain PRD slices the subsystem orchestrator reads. Both are
  // INPUTS to coding, so cleanup must preserve them (they are not regenerated
  // by a plain Start Coding, only by a full kickoff re-decompose).
  const KEEP_ENTRIES = new Set([".git", ".ralph", ".blueprint"]);
  const KEEP_MD = new Set([
    "PRD.md",
    "TRD.md",
    "SystemDesign.md",
    "ImplementationGuide.md",
    "DesignSpec.md",
    "PencilDesign.md",
    "PRD_E2E_SPEC.md",
    "E2E_COVERAGE.md",
  ]);
  /** Per-domain PRD slices (subsystem mode) — dynamic names, keep all. */
  const isDomainDoc = (name: string) => /^domain-.+\.md$/.test(name);
  await fs.mkdir(outputRoot, { recursive: true });
  if (retrySet) {
    console.log(
      `[CodingAPI] Retry mode — skipping directory cleanup to preserve previously-generated code.`,
    );
  } else {
    const entries = await fs.readdir(outputRoot).catch(() => [] as string[]);
    let removedCount = 0;
    for (const entry of entries) {
      if (KEEP_ENTRIES.has(entry)) continue;
      if (entry.endsWith(".md") && (KEEP_MD.has(entry) || isDomainDoc(entry))) continue;
      const entryPath = path.join(outputRoot, entry);
      try {
        await fs.rm(entryPath, { recursive: true, force: true });
        removedCount++;
      } catch (e) {
        console.warn(
          `[CodingAPI] Could not remove ${entry}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
    console.log(
      `[CodingAPI] Cleaned output directory: ${outputRoot} (removed ${removedCount} entries)`,
    );
  } // end else (not retry mode)

  const tier = await resolveTier(projectTier, outputRoot);

  // S-scope PRDs that need a backend reuse the M scaffold (s-tier is
  // frontend-only). Scope tier (S/M/L) still drives task granularity and
  // UI behaviour; only the scaffold directory is promoted here.
  const scaffoldTier: ScaffoldTier = await (async (): Promise<ScaffoldTier> => {
    if (tier !== "S") return tier;
    try {
      const prdPath = path.join(outputRoot, "PRD.md");
      const prdContent = await fs.readFile(prdPath, "utf-8");
      return resolveScaffoldTier(tier, prdSignalsBackend(prdContent));
    } catch {
      return tier;
    }
  })();
  if (scaffoldTier !== tier) {
    console.log(
      `[CodingAPI] S-scope PRD signals backend → scaffold upgraded ${tier} → ${scaffoldTier}`,
    );
  }

  // Read user-provided resource requirements (API keys, OAuth secrets, etc.)
  // collected during the kickoff phase BEFORE the scaffold copy so the
  // optional-feature layer can use them as triggers (e.g. VITE_PRIVY_APP_ID
  // → copy `_optional/auth-privy/**`). See CODEGEN_HARDENING_PLAN.md §4.10.
  const resourceRequirements = await readResourceRequirements(process.cwd());

  // Authoritative auth-mode decision from the Setup Wizard's Phase 0. When
  // present it OVERRIDES the legacy env-key trigger so we pick exactly the
  // scaffold the user / architect chose (avoids accidentally pulling in
  // auth-privy just because PRIVY_APP_ID happens to be declared but the
  // user picked password-rbac).
  const authDecision = await readAuthDecision(process.cwd());

  // Always overwrite scaffold files so fresh copies are guaranteed even if cleanup was partial.
  let scaffoldCopied: string[] = [];
  let appliedOptionalScaffolds: string[] = [];
  try {
    const result = await copyScaffold(scaffoldTier, outputRoot, {
      forceOverwrite: true,
      resourceRequirements,
      authDecision,
    });
    scaffoldCopied = result.copied;
    appliedOptionalScaffolds = result.optional.applied;
    console.log(
      `[CodingAPI] Scaffold (${tier} tier): wrote ${scaffoldCopied.length} base file(s) + ${result.optional.copiedFiles.length} optional file(s) (${appliedOptionalScaffolds.length} feature(s) applied) to ${outputRoot}`,
    );
  } catch (e) {
    console.warn(
      `[CodingAPI] Scaffold copy warning: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  // Persist the applied optional-scaffold list so downstream stages
  // (task-breakdown, worker prompts, post-gen audits) can reference it
  // without re-deriving from triggers.
  if (appliedOptionalScaffolds.length > 0) {
    try {
      await fs.mkdir(path.join(outputRoot, ".blueprint"), { recursive: true });
      await fs.writeFile(
        path.join(outputRoot, ".blueprint", "scaffold-applied.json"),
        JSON.stringify(
          {
            tier: scaffoldTier,
            scopeTier: tier,
            generatedAt: new Date().toISOString(),
            appliedOptionalFeatures: appliedOptionalScaffolds,
          },
          null,
          2,
        ) + "\n",
        "utf-8",
      );
    } catch (e) {
      console.warn(
        `[CodingAPI] Failed to persist scaffold-applied.json: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  try {
    await fs.access(pencilDesignStash);
    await fs.mkdir(pencilDesignSrc, { recursive: true });
    await fs.cp(pencilDesignStash, pencilDesignSrc, { recursive: true });
    await fs.rm(pencilDesignStash, { recursive: true, force: true });
    console.log(
      "[CodingAPI] Restored frontend/public/design after scaffold (Pencil PNG exports).",
    );
  } catch {
    /* nothing stashed */
  }

  // Re-mirror .blueprint/design-references/ → <outputRoot>/.design-references/
  // because cleanup above removes the top-level .design-references dir kickoff
  // wrote. Doing it here also picks up any references the user added/edited
  // between kickoff and Start Coding.
  try {
    const mirrored = await copyDesignReferencesToOutput(process.cwd(), outputRoot);
    if (mirrored.length > 0) {
      console.log(
        `[CodingAPI] Mirrored ${mirrored.length} design reference(s) into ${outputRoot}/.design-references/`,
      );
    }
  } catch (e) {
    console.warn(
      `[CodingAPI] Failed to mirror design references: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  try {
    await writeScaffoldSpecFile(outputRoot, scaffoldTier);
  } catch (e) {
    console.warn(
      `[CodingAPI] writeScaffoldSpecFile warning: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  // ── Infra step (deployment-ready Dockerfile + docker-compose) ───────────
  // Preferred path: when `.blueprint/kickoff-infra.json` exists (Dokploy
  // already provisioned per-app Postgres/Redis), derive an InfraSpec from
  // the scaffold layout + provisioned URLs and render compose that *connects*
  // to those services on `dokploy-network` instead of self-starting them.
  // The scaffold's local-dev compose is preserved as `docker-compose.local.yml`.
  //
  // Failure is non-fatal: we fall back to the scaffold defaults.
  let appliedKickoffInfra = false;
  try {
    const kickoffInfraMeta = await readKickoffInfraMetadata(process.cwd());
    if (kickoffInfraMeta && kickoffInfraMeta.services.length > 0) {
      const { spec, provisioned } = await buildInfraSpecFromKickoff(
        outputRoot,
        scaffoldTier,
        kickoffInfraMeta,
      );
      const applied = await applyInfra(
        outputRoot,
        spec,
        path.join(outputRoot, ".blueprint"),
        { provisioned, preserveLocalCompose: true },
      );
      appliedKickoffInfra = true;
      console.log(
        `[CodingAPI] Kickoff-infra rendered: tier=${tier} provisioned=${[
          provisioned.postgres && "postgres",
          provisioned.redis && "redis",
        ]
          .filter(Boolean)
          .join("+") || "none"} → wrote ${applied.writtenFiles.join(", ")}${
          applied.preservedComposePath
            ? `; preserved ${path.basename(applied.preservedComposePath)}`
            : ""
        }`,
      );
    }
  } catch (e) {
    console.warn(
      `[CodingAPI] Kickoff-infra render failed (non-fatal, keeping scaffold defaults): ${
        e instanceof Error ? e.message : String(e)
      }`,
    );
  }

  // ── Legacy LLM-driven infra path ───────────────────────────────────────
  // Only runs when no kickoff-infra metadata existed (e.g. Dokploy not
  // configured). Gated behind INFRA_AGENT_ENABLED for staged rollout.
  if (
    !appliedKickoffInfra &&
    (process.env.INFRA_AGENT_ENABLED === "true" ||
      process.env.INFRA_AGENT_ENABLED === "1")
  ) {
    try {
      const trdForInfra = await fs
        .readFile(path.join(outputRoot, "TRD.md"), "utf-8")
        .catch(() => "");
      const sysDesignForInfra = await fs
        .readFile(path.join(outputRoot, "SystemDesign.md"), "utf-8")
        .catch(() => "");
      if (trdForInfra.trim() && sysDesignForInfra.trim()) {
        const infraAgent = new InfraAgent();
        const infraResult = await infraAgent.generateInfraSpec({
          tier,
          trdContent: trdForInfra,
          sysDesignContent: sysDesignForInfra,
        });
        if (infraResult.parsed.ok && infraResult.spec) {
          const applied = await applyInfra(
            outputRoot,
            infraResult.spec,
            path.join(outputRoot, ".blueprint"),
          );
          console.log(
            `[CodingAPI] InfraAgent applied: tier=${tier} services=${infraResult.spec.services
              .map((s) => s.name)
              .join(",")} → wrote ${applied.writtenFiles.join(", ")}`,
          );
        } else {
          console.warn(
            `[CodingAPI] InfraAgent produced invalid spec, keeping scaffold defaults. Errors: ${(
              infraResult.parsed.errors ?? []
            ).join("; ")}`,
          );
        }
      } else {
        console.log(
          "[CodingAPI] InfraAgent skipped: TRD.md / SystemDesign.md missing or empty.",
        );
      }
    } catch (e) {
      console.warn(
        `[CodingAPI] InfraAgent failed (non-fatal, keeping scaffold defaults): ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
    }
  }

  // Replicate the TRD-confirmed shared schema (.blueprint/shared-schema.ts)
  // into the per-tier consumer roots so workers see a single source of
  // truth for cross-boundary types. No-op when the TRD step did not emit
  // a schema (S-tier projects often skip TRD entirely).
  let distributedSharedSchemaPaths: string[] = [];
  try {
    const dist = await distributeSharedSchema(tier, outputRoot);
    distributedSharedSchemaPaths = dist.written;
    if (dist.found) {
      console.log(
        `[CodingAPI] Shared schema distributed: ${dist.written.length} location(s) — ${dist.written.join(", ")}`,
      );
    } else {
      console.log(
        `[CodingAPI] Shared schema not distributed: source ${dist.sourcePath} missing or empty (TRD likely skipped).`,
      );
    }
  } catch (e) {
    console.warn(
      `[CodingAPI] distributeSharedSchema warning: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  // Replicate the TRD workflow DAG (.blueprint/pipeline-dag.yaml). Lives
  // at outputRoot/.blueprint/pipeline-dag.yaml — workers read it as a
  // reference for service ordering when implementing pipeline tasks.
  let distributedDagPath: string | null = null;
  try {
    const dist = await distributePipelineDag(outputRoot);
    distributedDagPath = dist.written;
    if (dist.found) {
      console.log(`[CodingAPI] Pipeline DAG distributed: ${dist.written}`);
    } else {
      console.log(
        `[CodingAPI] Pipeline DAG not distributed: source ${dist.sourcePath} missing (TRD §8 omitted — project has no multi-step pipelines).`,
      );
    }
  } catch (e) {
    console.warn(
      `[CodingAPI] distributePipelineDag warning: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  // DB precedence: explicit per-request override → the per-project DB that
  // kickoff provisioned (.blueprint/kickoff-infra.json) → global
  // BLUEPRINT_GENERATED_DATABASE_URL fallback. A stale global env must NOT
  // shadow the real per-project DB — that previously wrote a dead URL into
  // backend/.env and made the runtime-smoke gate fail with Postgres 28P01.
  const dbInfraForResolve = await readKickoffInfraMetadata(process.cwd()).catch(
    () => null,
  );
  const resolvedDbUrl = resolveEffectiveDatabaseUrl({
    requestOverride: databaseUrlBody,
    infraUrl: databaseUrlFrom(dbInfraForResolve),
    envFallback: resolveBlueprintGeneratedDatabaseUrl(),
  });
  if (resolvedDbUrl) {
    try {
      await fs.writeFile(
        path.join(outputRoot, ".env"),
        formatGeneratedCodeDotEnv(resolvedDbUrl),
        "utf-8",
      );
      console.log("[CodingAPI] Wrote generated-code .env with DATABASE_URL.");
    } catch (e) {
      console.warn(
        `[CodingAPI] Failed to write .env: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  // Filled-value subset of `resourceRequirements` used for env file
  // population (the optional-scaffold copy above only cares about the
  // declarations, not the values). See CODEGEN_HARDENING_PLAN.md §4.10.
  const filledResources = resourceRequirements.filter(
    (r) => (r.value ?? "").trim().length > 0,
  );
  const frontendResources = filledResources.filter((r) =>
    /^(VITE_|NEXT_PUBLIC_)/.test(r.envKey),
  );
  const backendResources = filledResources.filter(
    (r) => !/^(VITE_|NEXT_PUBLIC_)/.test(r.envKey),
  );

  // Always ensure backend/.env has JWT_SECRET (and DATABASE_URL if available).
  const backendEnvPath = path.join(outputRoot, "backend", ".env");
  try {
    // Heal before reading: a prior TDD run that was killed mid-blank leaves
    // backend/.env with `DATABASE_URL=` (empty) and a `.tdd-bak` sentinel next
    // to it. Restore the sentinel before we re-read, otherwise `upsert` below
    // would see only the blanked value and (if `effectiveDbUrl` is also null)
    // happily persist `DATABASE_URL=` forever.
    await recoverFromCrashedTddNeutralization(outputRoot).catch(() => {});
    const existingBackendEnv = await fs
      .readFile(backendEnvPath, "utf-8")
      .catch(() => "");
    // Read kickoff-infra.json (Dokploy-managed per-app PG+Redis) for the
    // backend's DATABASE_URL. Falls back to explicit override env / per-request
    // body when infra metadata is missing.
    const kickoffInfra = await readKickoffInfraMetadata(process.cwd()).catch(
      () => null,
    );
    const dbFromInfra = databaseUrlFrom(kickoffInfra);
    const effectiveDbUrl = resolvedDbUrl ?? dbFromInfra;
    const withDbUrl = effectiveDbUrl
      ? upsertDatabaseUrlEnv(existingBackendEnv, effectiveDbUrl)
      : existingBackendEnv;
    const redisOverride = resolveBlueprintGeneratedRedisUrl();
    const redisFromInfra = redisUrlFrom(kickoffInfra);
    const redisUrlForEnv = redisOverride ?? redisFromInfra;
    const withRedisUrl = redisUrlForEnv
      ? upsertRedisUrlEnv(withDbUrl, redisUrlForEnv)
      : withDbUrl;
    const withJwt = upsertJwtEnvVars(withRedisUrl);
    const withPort = upsertBackendPortEnv(withJwt);
    const withResources = upsertResourceEnvVars(withPort, backendResources);
    const privyMirror =
      resolvePrivyAppIdMirrorFromFilledResources(filledResources);
    const withPrivyMirror = upsertBackendPrivyAppIdMirror(
      withResources,
      privyMirror,
    );
    await fs.writeFile(backendEnvPath, withPrivyMirror, "utf-8");
    console.log(
      `[CodingAPI] Synced backend/.env (PORT + DATABASE_URL + JWT + PRIVY_APP_ID mirror + ${backendResources.length} backend resource(s)).`,
    );
  } catch (e) {
    console.warn(
      `[CodingAPI] Failed to sync backend/.env: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  // Frontend env vars (VITE_* / NEXT_PUBLIC_*) need to land in frontend/.env.
  // We always overwrite VITE_API_BASE_URL to keep it in sync with backend PORT
  // (single source of truth = BLUEPRINT_BACKEND_PORT, defaults to 4000).
  {
    const frontendEnvPath = path.join(outputRoot, "frontend", ".env");
    try {
      const existingFrontendEnv = await fs
        .readFile(frontendEnvPath, "utf-8")
        .catch(() => "");
      const withApiBase = upsertFrontendApiBaseUrlEnv(
        existingFrontendEnv,
        resolveBackendPort(),
      );
      const merged = upsertResourceEnvVars(withApiBase, frontendResources);
      await fs.writeFile(frontendEnvPath, merged, "utf-8");
      console.log(
        `[CodingAPI] Synced frontend/.env (VITE_API_BASE_URL + ${frontendResources.length} user resource(s)).`,
      );
    } catch (e) {
      console.warn(
        `[CodingAPI] Failed to sync frontend/.env: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  // Use scaffoldTier (not the scope tier) so the protected-paths list matches
  // the scaffold we actually copied — otherwise S+backend would copy the M
  // scaffold's backend files but fail to protect them from worker overwrites.
  const scaffoldProtectedPaths =
    await listScaffoldTemplateRelativePaths(scaffoldTier);
  // Distributed shared-schema files are written outside the scaffold
  // template walker, so merge them in explicitly. Workers must not
  // overwrite the canonical TRD-frozen schema.
  for (const p of distributedSharedSchemaPaths) {
    if (!scaffoldProtectedPaths.includes(p)) scaffoldProtectedPaths.push(p);
  }
  if (
    distributedDagPath &&
    !scaffoldProtectedPaths.includes(distributedDagPath)
  ) {
    scaffoldProtectedPaths.push(distributedDagPath);
  }

  // Run installs for every package root present in the scaffold.
  // In retry mode the scaffold is already installed — skip to avoid wasted time.
  if (retrySet) {
    console.log(
      `[CodingAPI] Retry mode — skipping pnpm install (scaffold already set up).`,
    );
  } else {
    // M and L tiers both ship the same flat `frontend/` + `backend/` layout,
    // so both install in those subdirectories. S-tier installs in the project
    // root (single Vite app, no nested package roots).
    const installTargets =
      tier === "M" || tier === "L" ? ["frontend", "backend"] : [""];
    for (const relTarget of installTargets) {
      const targetDir = relTarget
        ? path.join(outputRoot, relTarget)
        : outputRoot;
      const hasPkg = await fs
        .access(path.join(targetDir, "package.json"))
        .then(() => true)
        .catch(() => false);
      if (!hasPkg) continue;
      try {
        console.log(
          `[CodingAPI] Running pnpm install for scaffold at ${relTarget || "."}...`,
        );
        await execFileAsync("pnpm", ["install", "--no-frozen-lockfile"], {
          cwd: targetDir,
          maxBuffer: 10 * 1024 * 1024,
          timeout: 180_000,
        });
        console.log(`[CodingAPI] pnpm install OK at ${relTarget || "."}.`);
      } catch (e) {
        const err = e as { stdout?: string; stderr?: string; message?: string };
        const detail = (
          err.stderr ||
          err.stdout ||
          err.message ||
          String(e)
        ).slice(0, 400);
        console.warn(
          `[CodingAPI] pnpm install warning at ${relTarget || "."}: ${detail}`,
        );
      }
    }
  }

  const readDoc = async (name: string, limit?: number): Promise<string> => {
    try {
      const raw = await fs.readFile(path.join(outputRoot, name), "utf-8");
      if (!raw.trim()) return "";
      return limit && raw.length > limit
        ? `${raw.slice(0, limit)}\n\n[${name} truncated]`
        : raw;
    } catch {
      return "";
    }
  };

  // If the caller passed PRD content directly, write it to disk before reading.
  // This guarantees the correct project PRD is used even when the file on disk
  // belongs to a previous session (e.g. after a retry without a fresh kickoff).
  if (prdBody && prdBody.trim().length > 0) {
    try {
      await fs.writeFile(path.join(outputRoot, "PRD.md"), prdBody, "utf-8");
      console.log(
        "[CodingAPI] PRD.md overwritten from request body (session PRD pinning).",
      );
    } catch (e) {
      console.warn(
        `[CodingAPI] Failed to write PRD.md from request body: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  // Docs are passed through to the supervisor/worker graph as-is; the
  // downstream `pickRelevantSections` helper trims per-task. Keep a
  // generous safety cap here purely to protect against runaway docs.
  const DOC_HARD_CAP = 60_000;
  const prdDoc = await readDoc("PRD.md");

  // ── Domain-scoped PRD ─────────────────────────────────────────────────────
  // When all tasks ACTUALLY BEING RUN this batch belong to the same subsystem
  // (set by the subsystem-aware orchestrator), load that domain's focused spec
  // file (domain-{id}.md) and use it in place of the full PRD.md. This keeps
  // the agent context small and relevant — the full PRD can be thousands of
  // lines, whereas the domain file only covers the sections that subsystem owns.
  //
  // Source of the active domain(s), in priority order:
  //   1. `activeSubsystemId` — the explicit id the orchestrator stamps on each
  //      scoped sub-call. AUTHORITATIVE: tasks are not reliably tagged with a
  //      `subsystem` field, so this is the only dependable single-domain signal.
  //   2. `tasksToRun` task tags — fallback for any caller that does tag tasks.
  // (`tasksToRun`, not `tasksAfterStrip`: the request carries the whole task list
  //  but scopes execution via `retryFailedTaskIds`, so the full list always spans
  //  every domain.)
  const taskSubsystems = activeSubsystemId
    ? [activeSubsystemId]
    : ([...new Set(tasksToRun.map((t) => t.subsystem).filter(Boolean))] as string[]);

  let domainPrdDoc: string | null = null;
  let activeDomainId: string | null = null;

  if (taskSubsystems.length === 1) {
    activeDomainId = taskSubsystems[0];
    const domainMdPath = path.join(outputRoot, `domain-${activeDomainId}.md`);
    try {
      const raw = await fs.readFile(domainMdPath, "utf-8");
      domainPrdDoc = raw.trim() || null;
      if (domainPrdDoc) {
        console.log(
          `[CodingAPI] 🎯 Domain PRD loaded: domain-${activeDomainId}.md` +
          ` (${domainPrdDoc.length} chars) — replacing full PRD.md (${prdDoc?.length ?? 0} chars)`,
        );
      } else {
        console.log(
          `[CodingAPI] ⚠️  domain-${activeDomainId}.md is empty — falling back to full PRD.md`,
        );
      }
    } catch {
      console.log(
        `[CodingAPI] ⚠️  domain-${activeDomainId}.md not found at ${domainMdPath}` +
        ` — falling back to full PRD.md`,
      );
    }
  } else if (taskSubsystems.length > 1) {
    // Batch spans several domains (a domain + its dependency domains). Instead
    // of the full mega-PRD, feed the COMBINED slice of just those domains
    // (owned sections + dependency contracts + shared specs once) — same
    // context-shrinking idea as the per-domain task breakdown.
    const manifest = await readSubsystemManifest(outputRoot);
    if (manifest && prdDoc) {
      const combined = buildCombinedDomainSlice(
        taskSubsystems,
        manifest.subsystems,
        prdDoc,
      );
      if (combined.trim()) {
        domainPrdDoc = combined;
        console.log(
          `[CodingAPI] 📦 Tasks span ${taskSubsystems.length} domains` +
          ` (${taskSubsystems.join(", ")}) — using combined domain slice` +
          ` (${combined.length} chars) instead of full PRD.md (${prdDoc?.length ?? 0} chars)`,
        );
      }
    }
    if (!domainPrdDoc) {
      console.log(
        `[CodingAPI] 📦 Tasks span ${taskSubsystems.length} domains` +
        ` (${taskSubsystems.join(", ")}) — using full PRD.md (no combined slice available)`,
      );
    }
  } else {
    console.log(
      `[CodingAPI] 📄 No subsystem tag on tasks — using full PRD.md (whole-system mode)`,
    );
  }

  // Use domain-scoped PRD when available; fall back to the full PRD otherwise.
  const effectivePrdDoc = domainPrdDoc ?? prdDoc;
  // Persistent, auditable record of WHICH PRD context the workers got + how much
  // it shrank — emitted to .ralph/repair-log.jsonl once the emitter exists, so
  // PRD slicing can be confirmed after the fact without reading stdout.
  const prdContextSelection = {
    sliced: domainPrdDoc != null,
    mode: domainPrdDoc
      ? activeDomainId
        ? `single-domain:${activeDomainId}`
        : `combined-slice:${taskSubsystems.length}-domains`
      : taskSubsystems.length > 0
        ? "full-prd-fallback"
        : "whole-system",
    domains: taskSubsystems,
    effectiveChars: effectivePrdDoc?.length ?? 0,
    fullPrdChars: prdDoc?.length ?? 0,
    reductionPct:
      prdDoc?.length && domainPrdDoc
        ? Math.round((1 - (effectivePrdDoc?.length ?? 0) / prdDoc.length) * 100)
        : 0,
  };
  // ─────────────────────────────────────────────────────────────────────────

  const trdDoc = await readDoc("TRD.md", DOC_HARD_CAP);
  const sysDesignDoc = await readDoc("SystemDesign.md", DOC_HARD_CAP);
  const implGuideDoc = await readDoc("ImplementationGuide.md", DOC_HARD_CAP);
  const designSpecDoc = await readDoc("DesignSpec.md", DOC_HARD_CAP);

  // Read the structured PRD spec sidecar written by the kickoff engine.
  // Non-fatal: if absent or unparseable, frontend workers just won't get
  // PAGE-*/CMP-* context (the pre-existing behaviour).
  let prdSpec: PrdSpec | null = null;
  try {
    const raw = await fs.readFile(
      path.join(outputRoot, ".blueprint", "PRD_SPEC.json"),
      "utf-8",
    );
    const parsed = JSON.parse(raw) as PrdSpec;
    if (parsed && Array.isArray(parsed.pages)) prdSpec = parsed;
  } catch {
    /* sidecar missing — proceed without it */
  }
  const pencilDesignDoc = await readPencilDesignDoc(outputRoot);
  // Both M and L tiers ship a comprehensive README that documents the
  // scaffold's conventions (api/modules layout, middlewares folder, workers,
  // etc.). Inject it into project context so coding agents follow the
  // conventions instead of guessing. S-tier's README is too thin to bother.
  const scaffoldReadmeDoc =
    tier === "M" || tier === "L"
      ? await fs
          .readFile(
            path.resolve(
              process.cwd(),
              "scaffolds",
              `${tier.toLowerCase()}-tier`,
              "README.md",
            ),
            "utf-8",
          )
          .then((raw) =>
            raw.length > 12000
              ? `${raw.slice(0, 12000)}\n\n[${tier.toLowerCase()}-tier README truncated]`
              : raw,
          )
          .catch(() => "")
      : "";

  const baseContextParts: string[] = [];
  if (effectivePrdDoc) baseContextParts.push(`## PRD\n\n${effectivePrdDoc}`);
  if (trdDoc) baseContextParts.push(`## TRD\n\n${trdDoc}`);
  if (sysDesignDoc)
    baseContextParts.push(`## System Design\n\n${sysDesignDoc}`);
  if (implGuideDoc)
    baseContextParts.push(`## Implementation Guide\n\n${implGuideDoc}`);

  const designReferenceEntries =
    await readDesignReferencesFromOutput(outputRoot);
  const designReferencesBlock = formatDesignReferencesPromptBlock(
    designReferenceEntries,
  );
  if (designReferencesBlock) {
    baseContextParts.push(designReferencesBlock);
    console.log(
      `[CodingAPI] Injected ${designReferenceEntries.length} design reference(s) into projectContext.`,
    );
  }

  const resourcesContextBlock = formatResourceRequirementsPromptBlock(
    resourceRequirements,
    appliedOptionalScaffolds,
  );
  if (resourcesContextBlock) {
    baseContextParts.push(resourcesContextBlock);
    console.log(
      `[CodingAPI] Injected ${resourceRequirements.length} resource requirement(s) into projectContext (${filledResources.length} configured).`,
    );
  }

  const scaffoldContextBlock = [
    "## Scaffold specification",
    "",
    "The repository includes **SCAFFOLD_SPEC.md** (tier layout, commands, where to implement).",
    "Follow that layout; extend the prebuilt scaffold structure instead of replacing it wholesale.",
    "",
    ...(scaffoldReadmeDoc
      ? [
          `## Scaffold README Reference (${scaffoldReadmeDoc})`,
          "",
          scaffoldReadmeDoc,
          "",
        ]
      : []),
    getTierScaffoldSpecForCodingContext(tier),
  ].join("\n");

  const preparedE2e = await prepareE2eArtifacts({
    outputRoot,
    prdDoc: effectivePrdDoc,
    tasks: tasksAfterStrip,
  });

  const projectContext =
    baseContextParts.length > 0
      ? [
          baseContextParts.join("\n\n---\n\n"),
          scaffoldContextBlock,
          preparedE2e.e2eContextBlock,
        ]
          .filter(Boolean)
          .join("\n\n---\n\n")
      : [
          "No project documents found. Generate code based on task description only.",
          scaffoldContextBlock,
          preparedE2e.e2eContextBlock,
        ]
          .filter(Boolean)
          .join("\n\n---\n\n");

  // Log Stitch design URL when available
  if (stitchMeta?.projectUrl) {
    console.log(
      `[CodingAPI] Stitch UI Design project URL: ${stitchMeta.projectUrl}`,
    );
  }

  const frontendDesignContext = await buildFrontendDesignContextForCodegen(
    outputRoot,
    designSpecDoc,
    pencilDesignDoc,
    stitchMeta ?? undefined,
  );

  const normalizedTasks = [...tasksToRun, ...preparedE2e.extraTasks];
  const codingTasks: CodingTask[] = normalizedTasks.map((t) => ({
    ...t,
    assignedAgentId: null,
    codingStatus: "pending" as const,
  }));

  const sessionId = uuidv4();
  const mapper = new EventMapper(sessionId);
  const encoder = new TextEncoder();

  // ── Session abort registry ──────────────────────────────────────────────
  // Abort any previous coding session running against the same output directory
  // (e.g. after a page refresh where the old SSE connection was silently dropped)
  // then register this session's controller so the /abort endpoint and future
  // sessions can stop it.
  const sessionAbortController = new AbortController();
  const _existingController = activeCodingSessions.get(outputRoot);
  if (_existingController && !_existingController.signal.aborted) {
    console.log(
      `[CodingAPI] Aborting stale session for ${outputRoot} before starting new one`,
    );
    _existingController.abort();
  }
  activeCodingSessions.set(outputRoot, sessionAbortController);

  let clientAborted = false;
  request.signal.addEventListener("abort", () => {
    // A dropped/closed tab (client disconnect) stops the SSE stream but MUST
    // NOT kill the coding graph — otherwise a long session dies the moment the
    // browser navigates away, leaving most tasks unrun. We only flip
    // `clientAborted` so `send()` stops enqueuing; the graph keeps running in
    // the background, completes, and persists its checkpoint + report. The run
    // is stopped ONLY by an explicit /abort, or by a NEW session for this
    // outputRoot (which aborts the prior controller above).
    clientAborted = true;
    console.warn(
      `[CodingAPI] Session ${sessionId}: client disconnected — coding continues in the background (not aborted).`,
    );
  });
  // Wire external abort (e.g. /abort endpoint or new session auto-abort) back
  // into clientAborted so all existing checks in the stream loop apply.
  sessionAbortController.signal.addEventListener("abort", () => {
    clientAborted = true;
  });

  const stream = new ReadableStream({
    async start(controller) {
      const startedAt = new Date().toISOString();
      function send(data: unknown) {
        if (clientAborted) return;
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          clientAborted = true;
        }
      }

      // Keep-alive comment frames so the stream never goes silent for minutes
      // during a slow/quiet LLM call. Without this, undici's default bodyTimeout
      // (~5m) terminates the orchestrator's drain fetch on long builds (the
      // "request failed — terminated" foundation failure). Consumers ignore any
      // frame that doesn't start with "data: ".
      const keepAlive = setInterval(() => {
        if (clientAborted) return;
        try {
          controller.enqueue(encoder.encode(`: keep-alive\n\n`));
        } catch {
          clientAborted = true;
        }
      }, 15_000);

      // ── Self-heal telemetry ────────────────────────────────────────────────
      // Fan out repair events to: (1) SSE channel (front-end log panel),
      // (2) .ralph/repair-log.jsonl on disk, (3) stdout for dev observability.
      const sseRepairSink: RepairEmitter = (event) => {
        send(mapper.buildRepairEvent(event as RepairEvent));
      };
      // In-memory counter sink — feeds the model-scoring stage in the
      // finally block. Non-blocking; pure counter, no I/O.
      const repairCounters = {
        truncation: 0,
        stagnation: 0,
        fallback: 0,
      };
      const counterRepairSink: RepairEmitter = (event) => {
        const name = event.event;
        if (name === "truncation_detected" || name === "doc_truncated") {
          repairCounters.truncation += 1;
        } else if (name === "stagnation_warning") {
          repairCounters.stagnation += 1;
        } else if (name.includes("fallback")) {
          repairCounters.fallback += 1;
        }
      };
      const repairEmitter = createRepairEmitter([
        sseRepairSink,
        createJsonlRepairSink(outputRoot),
        consoleRepairSink,
        counterRepairSink,
        // Memory L2 sink: persist meaningful repair events as self-heal-log
        // records. Uses the request's runId as kickoffId so records link
        // back to the project-card written by the pipeline/kickoff routes.
        createMemorySelfHealSink({
          outputDir: outputRoot,
          kickoffSessionId:
            typeof runId === "string" && runId.length > 0 ? runId : sessionId,
        }),
      ]);
      registerRepairEmitter(sessionId, repairEmitter);

      // Register a sink that forwards worker sub-graph chunks (emitted by
      // invokeWorkerBatched via workerGraph.stream) back into this SSE pipe.
      // Without this the outer stream never sees pick_next_task / generate_code
      // updates and the UI leaves successfully-running tasks stuck at
      // "pending". See: src/lib/langgraph/worker-event-bridge.ts.
      registerWorkerChunkSink(sessionId, (chunk) => {
        try {
          const events = mapper.mapChunk(chunk);
          for (const ev of events) send(ev);
        } catch (err) {
          console.warn(
            `[CodingAPI] worker chunk forward failed (ignored):`,
            err instanceof Error ? err.message : err,
          );
        }
      });
      // Persist which PRD context the workers received (full vs domain slice vs
      // combined slice) + the char reduction — auditable in repair-log.jsonl.
      repairEmitter({
        sessionId,
        stage: "worker-context",
        event: "prd_context_selected",
        details: prdContextSelection,
      });
      const auditAttemptTracker = new AttemptTracker({
        outputDir: outputRoot,
      });
      await auditAttemptTracker.load();
      const collectedTaskResults = new Map<string, AuditTaskSummary>();
      // Pre-populate skipped tasks (from previous session) as completed_with_warnings
      // so they appear in audit and scoring reports without being re-generated.
      for (const t of tasksSkipped) {
        collectedTaskResults.set(t.id, {
          id: t.id,
          title: t.title,
          coversRequirementIds: t.coversRequirementIds ?? [],
          generatedFiles: [],
          status: "completed_with_warnings",
        });
      }
      if (retrySet) {
        console.log(
          `[CodingAPI] Retry mode: running ${tasksToRun.length} task(s), skipping ${tasksSkipped.length} previously-completed task(s).`,
        );
        // Clear the checkpoint since we're retrying — will be re-written on completion.
        await clearSessionCheckpoint(process.cwd());
      }
      const collectedFileRegistry = new Map<string, GeneratedFile>();
      const collectedApiContracts = new Map<string, ApiContract>();
      const collectedGateSnapshot: SupervisorGateSnapshot = {
        integrationErrors: "",
        runtimeVerifyErrors: "",
        e2eVerifyErrors: "",
        scaffoldFixAttempts: 0,
        integrationFixAttempts: 0,
        gatesExecuted: {
          integrationVerify: false,
          runtimeVerify: false,
          e2eVerify: false,
        },
      };
      let reportTaskResults: AuditTaskSummary[] = [];
      let finalAuditResult: FeatureChecklistAuditResult | null = null;
      let reportStatus: "pass" | "fail" | "aborted" = "fail";
      let terminalSummary = "";
      let fatalError = "";

      console.log(
        `[CodingAPI] Session ${sessionId}: starting with ${codingTasks.length} tasks, output: ${outputRoot}, mode=${codingMode}`,
      );

      send(
        mapper.buildSessionStart(
          codingTasks.map((t) => ({
            ...t,
            assignedAgentId: null,
          })),
        ),
      );

      const graph = createSupervisorGraph();

      try {
        const prebuiltScaffold = scaffoldCopied.length > 0;
        if (prebuiltScaffold) {
          console.log(
            `[CodingAPI] prebuiltScaffold=true — architect tasks will skip LLM (${scaffoldCopied.length} template file(s) copied).`,
          );
        }

        try {
          const rotated = await rotateTddEvidenceForNewSession(outputRoot);
          if (rotated.rotated) {
            console.log(
              `[CodingAPI] TDD evidence rotated → ${rotated.archivedTo}`,
            );
          }
        } catch (e) {
          console.warn(`[CodingAPI] TDD evidence rotation failed: ${e}`);
        }

        try {
          const tddManifest = await writeTddManifestFromTasks(
            outputRoot,
            codingTasks,
          );
          console.log(
            `[CodingAPI] TDD manifest written with ${tddManifest.testCount} test(s): ${tddManifest.path}`,
          );
        } catch (e) {
          console.warn(`[CodingAPI] TDD manifest write failed: ${e}`);
        }

        try {
          const drift = await pruneDriftedTddTests(outputRoot, codingTasks);
          if (drift.removed.length > 0) {
            console.log(
              `[CodingAPI] Pruned ${drift.removed.length} drifted TDD test file(s): ${drift.removed.join(", ")}`,
            );
          }
        } catch (e) {
          console.warn(`[CodingAPI] TDD drift pruning failed: ${e}`);
        }

        // RALPH Phase 1+3: initialise progress tracker and write IMPLEMENTATION_PLAN.md
        if (ralphConfig.enabled) {
          try {
            const { ProgressTracker } = await import("@/lib/ralph");
            const tracker = new ProgressTracker(outputRoot);
            await tracker.init(codingTasks, sessionId);
            console.log(
              `[CodingAPI] RALPH enabled — progress tracker initialised at ${outputRoot}/.ralph/`,
            );
          } catch (e) {
            console.warn(
              `[CodingAPI] RALPH progress tracker init failed: ${e}`,
            );
          }
        }

        const streamIterator = await graph.stream(
          {
            tasks: codingTasks,
            outputDir: outputRoot,
            projectContext,
            codingMode,
            frontendDesignContext,
            prebuiltScaffold,
            scaffoldProtectedPaths,
            ralphConfig,
            sessionId,
            prdSpec,
            retryMode: !!(retryFailedTaskIds && retryFailedTaskIds.length > 0),
          },
          { subgraphs: true, streamMode: "updates", recursionLimit: 10000 },
        );

        for await (const chunk of streamIterator) {
          if (clientAborted) {
            console.warn(
              `[CodingAPI] Session ${sessionId}: stopping iteration — client disconnected`,
            );
            break;
          }

          const [ns, updates] = chunk as [string[], Record<string, unknown>];
          const nodeNames = Object.keys(updates);
          console.log(
            `[CodingAPI] Stream chunk: ns=[${ns.join(",")}] nodes=[${nodeNames.join(",")}]`,
          );

          collectTaskResultsFromChunk(
            updates,
            codingTasks,
            collectedTaskResults,
          );
          collectWorkerContextFromChunk(
            updates,
            collectedFileRegistry,
            collectedApiContracts,
          );
          collectSupervisorGateStateFromChunk(updates, collectedGateSnapshot);

          const events = mapper.mapChunk(
            chunk as [string[], Record<string, unknown>],
          );
          for (const event of events) {
            send(event);
          }
        }

        if (!clientAborted) {
          console.log(`[CodingAPI] Session ${sessionId}: stream complete.`);

          const prdIndex = extractPrdRequirementIndex(prdDoc ?? "");
          const auditTaskResults: AuditTaskSummary[] = codingTasks.map(
            (t) =>
              collectedTaskResults.get(t.id) ?? {
                id: t.id,
                title: t.title,
                coversRequirementIds: t.coversRequirementIds ?? [],
                generatedFiles: [],
                status: "unknown" as const,
              },
          );
          reportTaskResults = auditTaskResults;
          let finalAudit = await runFeatureChecklistAudit({
            prdIndex,
            prdSpec,
            tasks: codingTasks,
            taskResults: auditTaskResults,
            outputDir: outputRoot,
            sessionId,
            emitter: repairEmitter,
          });

          // Phase 3a — interaction-wiring audit. Flags dangling controls
          // (empty handlers / interactive page with no handlers) so they get
          // repaired alongside missing-requirement findings. These are
          // `partial` verdicts: they drive a repair but never flip the audit's
          // `passed` (not added to hardUncovered), so a false positive costs at
          // most one bounded repair pass.
          const wiringFindings = await auditFrontendWiring({
            tasks: codingTasks,
            taskResults: auditTaskResults,
            prdSpec,
            outputDir: outputRoot,
            emitter: repairEmitter,
            // Scoped/partial build (subsystem-split domain phase): skip the
            // cross-route flow-nav check — not-yet-built domains' routes aren't
            // registered yet. Flow-nav runs only on the full/final build.
            scopedBuild: !!(retryFailedTaskIds && retryFailedTaskIds.length > 0),
          });
          if (wiringFindings.length > 0) {
            const existingIds = new Set(finalAudit.uncovered.map((e) => e.id));
            const fresh = wiringFindings.filter((e) => !existingIds.has(e.id));
            if (fresh.length > 0) {
              finalAudit = {
                ...finalAudit,
                uncovered: [...finalAudit.uncovered, ...fresh],
              };
            }
          }

          if (finalAudit.uncovered.length > 0) {
            const dispatchResult = await dispatchAuditRepair({
              uncovered: finalAudit.uncovered,
              outputDir: outputRoot,
              projectContext,
              fileRegistrySnapshot: [...collectedFileRegistry.values()],
              apiContractsSnapshot: [...collectedApiContracts.values()],
              scaffoldProtectedPaths,
              ralphConfig,
              sessionId,
              emitter: repairEmitter,
              attemptTracker: auditAttemptTracker,
            });

            if (dispatchResult.circuitOpenRoles?.length) {
              const frontendIds = finalAudit.uncovered
                .filter((e) => /^(PAGE|CMP|IC)-/i.test(e.id))
                .map((e) => e.id);
              const backendIds = finalAudit.uncovered
                .filter((e) => !/^(PAGE|CMP|IC)-/i.test(e.id))
                .map((e) => e.id);
              for (const role of dispatchResult.circuitOpenRoles) {
                const ids = role === "frontend" ? frontendIds : backendIds;
                await escalateRepairCircuit({
                  scope: {
                    stage: "post-gen-audit",
                    scopeKey: `${role}:${missingIdsScopeKey(ids)}`,
                  },
                  tracker: auditAttemptTracker,
                  outputDir: outputRoot,
                  emitter: repairEmitter,
                  sessionId,
                  reason: `Audit-repair dispatch circuit opened for role=${role} — worker subgraph cannot close the gap after 3+ attempts on the same uncovered-id set.`,
                });
              }
            }

            if (
              dispatchResult.backendGeneratedFiles.length +
                dispatchResult.frontendGeneratedFiles.length >
              0
            ) {
              // Backfill wrote something — re-run the audit to see what
              // actually got closed. We intentionally do NOT loop again;
              // one repair round is the hard upper bound.
              finalAudit = await runFeatureChecklistAudit({
                prdIndex,
                prdSpec,
                tasks: [...codingTasks, ...dispatchResult.repairTasks],
                taskResults: [
                  ...auditTaskResults,
                  ...dispatchResult.repairTaskResults,
                ],
                outputDir: outputRoot,
                sessionId,
                emitter: repairEmitter,
              });
              reportTaskResults = [
                ...auditTaskResults,
                ...dispatchResult.repairTaskResults,
              ];
            }
          }
          finalAuditResult = finalAudit;

          // Evidence gate (Phase A pilot) — read persisted .ralph/*.json
          // artefacts written by the supervisor's smoke/tsc/tdd validators
          // and refuse the stage if any required validator is missing or
          // failing. Telemetry-only during the rollout — does not block
          // pipeline advance yet so we observe evidence-gate decisions
          // alongside the existing audit-driven blocking.
          try {
            const { evidence, missingArtefacts } =
              await collectCodingStageEvidence(outputRoot);
            const evidenceReport = runEvidenceGate("coding", evidence);
            repairEmitter({
              sessionId,
              stage: "post-gen-audit",
              event: "evidence_gate_evaluated",
              details: {
                passed: evidenceReport.passed,
                missingRequirements: evidenceReport.missingRequirements,
                missingArtefacts,
                evidenceCount: evidence.length,
              },
            });
          } catch (evidenceErr) {
            console.warn(
              `[CodingAPI] evidence gate threw (non-fatal):`,
              evidenceErr instanceof Error ? evidenceErr.message : evidenceErr,
            );
          }

          const blockingFailures = summarizeBlockingGateErrors(
            collectedGateSnapshot,
          );
          // G1: refuse to present a quarantined (known-broken) build as ready.
          // The integration node writes .blueprint/BUILD_FAILED.json when its
          // gate fails; if it's present we must not report a passing session.
          const quarantineMarker = await readBuildFailedMarker(outputRoot);
          if (quarantineMarker) {
            blockingFailures.push(
              [
                `Build quarantined (.blueprint/BUILD_FAILED.json) — integration gate failed at ${quarantineMarker.failedAt}.`,
                quarantineMarker.summary.slice(0, 300),
              ]
                .filter(Boolean)
                .join("\n"),
            );
          }
          if (!finalAudit.passed) {
            // Use hardUncovered to exclude IC-xx interaction specs (soft warnings).
            const remainingIds = (
              finalAudit.hardUncovered ??
              finalAudit.uncovered.filter((e) => !/^IC-\d+$/i.test(e.id))
            ).map((entry) => entry.id);
            blockingFailures.push(
              [
                `Feature audit gate failed: ${remainingIds.length} requirement id(s) still unresolved.`,
                remainingIds.slice(0, 40).join(", "),
              ]
                .filter(Boolean)
                .join("\n"),
            );
            await recordUnresolvedProblem(outputRoot, {
              sessionId,
              category: "feature-coverage",
              gate: "feature-audit",
              summary: `Feature audit gate failed: ${remainingIds.length} PRD requirement id(s) unresolved.`,
              evidence: remainingIds.slice(0, 12),
            });
          }
          if (blockingFailures.length > 0) {
            throw new Error(blockingFailures.join("\n\n"));
          }

          reportStatus = "pass";
          terminalSummary =
            "Coding session completed with integration, runtime/E2E, and feature-audit gates passing.";
          send(mapper.buildSessionComplete());
        }
      } catch (error) {
        const classified = classifyError(error, clientAborted);
        reportStatus = clientAborted ? "aborted" : "fail";
        terminalSummary = classified.message;
        fatalError = classified.message;
        console.error(
          `[CodingAPI] Session ${sessionId} error [${classified.category}]:`,
          classified.message,
          error instanceof Error ? `\n  name=${error.name}` : "",
          error instanceof Error && error.stack
            ? `\n  stack=${error.stack.split("\n").slice(0, 4).join("\n  ")}`
            : "",
        );
        send(mapper.buildSessionError(classified.message, classified.category));
      } finally {
        if (clientAborted && reportStatus === "fail" && !fatalError) {
          reportStatus = "aborted";
          terminalSummary =
            "Client disconnected before the coding session completed.";
          fatalError = terminalSummary;
        }
        try {
          await writeCodingSessionReport({
            sessionId,
            projectId: projectId ?? null,
            outputDir: outputRoot,
            startedAt,
            endedAt: new Date().toISOString(),
            status: reportStatus,
            terminalSummary:
              terminalSummary ||
              "Coding session ended without an explicit summary.",
            integrationErrors: collectedGateSnapshot.integrationErrors,
            runtimeVerifyErrors: collectedGateSnapshot.runtimeVerifyErrors,
            e2eVerifyErrors: collectedGateSnapshot.e2eVerifyErrors,
            scaffoldFixAttempts: collectedGateSnapshot.scaffoldFixAttempts,
            integrationFixAttempts:
              collectedGateSnapshot.integrationFixAttempts,
            gatesExecuted: collectedGateSnapshot.gatesExecuted,
            finalAudit: finalAuditResult,
            taskResults:
              reportTaskResults.length > 0
                ? reportTaskResults
                : codingTasks.map((task) => ({
                    id: task.id,
                    title: task.title,
                    coversRequirementIds: task.coversRequirementIds ?? [],
                    generatedFiles:
                      collectedTaskResults.get(task.id)?.generatedFiles ?? [],
                    status:
                      collectedTaskResults.get(task.id)?.status ?? "unknown",
                  })),
            fileRegistry: [...collectedFileRegistry.values()],
            fatalError,
          });
        } catch (reportErr) {
          console.warn(
            `[CodingAPI] Failed to write coding session report (ignored):`,
            reportErr instanceof Error ? reportErr.message : reportErr,
          );
        }

        // ── Model scoring stage ────────────────────────────────────────────
        // Build per-session scorecard, append to project leaderboard, diff
        // MODEL_CONFIG vs previous run. Never throws; errors are logged.
        // See src/lib/pipeline/model-scoring/.
        try {
          const sessionLlmUsage = getCodingSessionLlmUsage(sessionId);
          const sessionTaskResults =
            reportTaskResults.length > 0
              ? reportTaskResults
              : codingTasks.map((task) => ({
                  id: task.id,
                  title: task.title,
                  coversRequirementIds: task.coversRequirementIds ?? [],
                  generatedFiles:
                    collectedTaskResults.get(task.id)?.generatedFiles ?? [],
                  status:
                    collectedTaskResults.get(task.id)?.status ?? "unknown",
                }));

          const tasksTotal = sessionTaskResults.length;
          const tasksCompleted = sessionTaskResults.filter(
            (t) => t.status === "completed",
          ).length;
          const tasksCompletedWithWarnings = sessionTaskResults.filter(
            (t) => t.status === "completed_with_warnings",
          ).length;
          const tasksFailed = sessionTaskResults.filter(
            (t) => t.status === "failed",
          ).length;

          const gateResults: GateResultsSnapshot = {
            integrationExecuted:
              collectedGateSnapshot.gatesExecuted.integrationVerify,
            integrationPassed:
              collectedGateSnapshot.gatesExecuted.integrationVerify &&
              !collectedGateSnapshot.integrationErrors.trim(),
            runtimeExecuted: collectedGateSnapshot.gatesExecuted.runtimeVerify,
            runtimePassed:
              collectedGateSnapshot.gatesExecuted.runtimeVerify &&
              !collectedGateSnapshot.runtimeVerifyErrors.trim(),
            e2eExecuted: collectedGateSnapshot.gatesExecuted.e2eVerify,
            e2ePassed:
              collectedGateSnapshot.gatesExecuted.e2eVerify &&
              !collectedGateSnapshot.e2eVerifyErrors.trim(),
            auditPassed: finalAuditResult?.passed ?? true,
            uncoveredRequirementCount: finalAuditResult?.uncovered.length ?? 0,
            tasksTotal,
            tasksCompleted,
            tasksCompletedWithWarnings,
            tasksFailed,
            truncationEventCount: repairCounters.truncation,
            stagnationEventCount: repairCounters.stagnation,
            fallbackTriggerCount: repairCounters.fallback,
            integrationFixAttempts:
              collectedGateSnapshot.integrationFixAttempts,
            scaffoldFixAttempts: collectedGateSnapshot.scaffoldFixAttempts,
          };

          const scoringResult = await runModelScoringStage({
            sessionId,
            projectPath: outputRoot,
            outputDir: outputRoot,
            endedAt: new Date().toISOString(),
            llmUsage: sessionLlmUsage,
            taskResults: sessionTaskResults,
            gateResults,
          });
          console.log(
            `[CodingAPI] Model scoring done: session=${scoringResult.scorecard.sessionComposite.score}(${scoringResult.scorecard.sessionComposite.grade}), ` +
              `rows=${scoringResult.scorecard.rows.length}, ` +
              `modelChange=${scoringResult.hasModelChange ? "YES" : "no"}` +
              (scoringResult.errors.length > 0
                ? ` (${scoringResult.errors.length} warning(s))`
                : ""),
          );
          if (scoringResult.errors.length > 0) {
            for (const err of scoringResult.errors) {
              console.warn(`[CodingAPI] model-scoring warning: ${err}`);
            }
          }
        } catch (scoringErr) {
          console.warn(
            `[CodingAPI] Model scoring stage failed (ignored):`,
            scoringErr instanceof Error ? scoringErr.message : scoringErr,
          );
        }

        // ── Session checkpoint ─────────────────────────────────────────────
        // Persist task results so the next run can skip already-completed
        // tasks via `retryFailedTaskIds`.
        try {
          const checkpointMap = new Map<string, TaskCheckpointEntry>();
          for (const [id, result] of collectedTaskResults) {
            checkpointMap.set(id, {
              status: result.status,
              generatedFiles: result.generatedFiles,
            });
          }
          // Pass the full planned task ID list so tasks that were aborted before
          // they even started are recorded as unknown/failed in the checkpoint.
          const allSessionTaskIds = normalizedTasks.map((t) => t.id);
          await writeSessionCheckpoint(
            process.cwd(),
            sessionId,
            checkpointMap,
            allSessionTaskIds,
          );
        } catch (cpErr) {
          console.warn(
            `[CodingAPI] Checkpoint write failed (ignored):`,
            cpErr instanceof Error ? cpErr.message : cpErr,
          );
        }

        clearCodingSessionLlmUsage(sessionId);
        unregisterRepairEmitter(sessionId);
        unregisterWorkerChunkSink(sessionId);
        // Remove from registry only if we are still the active session
        // (a newer session may have already replaced us).
        if (activeCodingSessions.get(outputRoot) === sessionAbortController) {
          activeCodingSessions.delete(outputRoot);
        }
        clearInterval(keepAlive);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
