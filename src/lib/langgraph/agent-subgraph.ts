import path from "path";
import * as nodeFs from "fs/promises";
import { StateGraph, START, END } from "@langchain/langgraph";
import {
  WorkerStateAnnotation,
  type WorkerState,
  type GeneratedFile,
  type TaskResult,
} from "./state";
import {
  fsWrite,
  fsRead,
  shellExec,
  listFiles,
  detectPackageManager,
  buildAddCommand,
  isAutoInstallableNpmPackageName,
  type FsWriteOptions,
} from "./tools";
import { normalizeScaffoldRelPath } from "@/lib/pipeline/scaffold-file-merge";
import {
  estimateCost,
  type ChatMessage,
  type VisionChatMessage,
  chatCompletionWithFallback,
} from "@/lib/openrouter";
import {
  readDesignReferencesFromOutput,
  type DesignReferenceEntry,
} from "@/lib/pipeline/design-references";
import { invokeCodegenOrOpenRouter } from "@/lib/providers/codegen";
import { recallAndPrepareInject } from "@/lib/memory/recall-context";
import { getInjectTokenBudgetForRole } from "@/lib/memory/recall-config";
import { classifyFailureMode } from "@/lib/memory/distill/failure-mode";
import { parseMemoryCites, recordMemoryCites } from "@/lib/memory/cite";
import { resolveModel } from "@/lib/openrouter";
import { resolveModelChain } from "@/lib/model-config";
import type {
  CodingAgentRole,
  CodingTask,
  TaskSubStep,
} from "@/lib/pipeline/types";
import {
  parseTierFromPrd,
  type ProjectTier,
} from "@/lib/agents/shared/project-classifier";
import type { CodingMode } from "@/lib/pipeline/coding-mode";
import {
  resolveCodingModelConfigValue,
  shouldForceOpenRouterForCodingMode,
} from "@/lib/pipeline/coding-model-selection";
import type {
  OpenRouterResponse,
  OpenRouterToolDefinition,
} from "@/lib/llm-types";
import { ProgressTracker } from "@/lib/ralph";
import {
  snapshotModifiesFiles,
  verifyTaskFilePlan,
  formatUnfulfilledMessage,
  TASK_FILE_PLAN_UNFULFILLED_REGEX,
} from "./task-file-plan-verifier";
import {
  snapshotTask,
  restoreTask,
  discardTaskSnapshot,
} from "./task-snapshot";
import { pickPrdSpecEntriesForTask } from "./prd-spec-prompt";
import { getRepairEmitter } from "@/lib/pipeline/self-heal";
import { recordCodingSessionLlmUsage } from "@/lib/pipeline/coding-session-report";
import { trimProjectContextForTask } from "./worker-context-trim";
import { buildRolePrompt, loadPromptContext } from "./role-prompts";

const DEFAULT_WORKER_CODEGEN_MAX_OUTPUT_TOKENS = 32768;
const MAX_OUTPUT_TOKENS = (() => {
  const raw = Number(process.env.WORKER_CODEGEN_MAX_OUTPUT_TOKENS ?? "");
  if (!Number.isFinite(raw) || raw <= 0) {
    return DEFAULT_WORKER_CODEGEN_MAX_OUTPUT_TOKENS;
  }
  // Cap raised to 128K to support large-context models (e.g. DeepSeek V4 Pro).
  return Math.min(Math.max(Math.floor(raw), 1024), 131_072);
})();
const MAX_TASK_GENERATION_RETRIES = 2;
const MAX_WORKER_TOOL_ITERATIONS = 10;
// Per-file injection caps for the starting "Relevant existing files" context.
// OWNED = files the task creates/modifies (it must see them whole to edit them
// correctly); REF = files it only reads for reference; discovered neighbours
// keep the small legacy cap. The read_file tool's output cap is aligned to
// OWNED so a file shown truncated in the starting context can always be
// re-fetched in full via read_file — no "visible but unfetchable" gap.
// (Files larger than OWNED still have a tail blind spot until read_file gains
// offset/paginated reads.)
const OWNED_FILE_INJECT_CAP = 16_000;
const REF_FILE_INJECT_CAP = 8_000;
const MAX_WORKER_TOOL_OUTPUT_CHARS = OWNED_FILE_INJECT_CAP;
const WORKER_LLM_HEARTBEAT_MS = 10_000;
// Per-LLM-call wall-clock timeout. A single codegen call that never returns
// otherwise freezes the worker (and the whole foundation/phase fan-in)
// indefinitely — observed as an 11h overnight hang. This does NOT harm a
// "slow but still producing" task: such a task's calls RETURN (that's how it
// writes), resetting the clock each call; only a genuinely hung call (no
// response for the full window) is abandoned, surfacing as a normal task error
// that retries/fails so the worker moves on. It also re-enables the existing
// per-iteration stagnation guard, which can't fire while an iteration is stuck
// inside a non-returning call. Override via CODEGEN_LLM_CALL_TIMEOUT_MS.
//
// Default 8m: a single DeepSeek "thinking" call on a 150K-token context can
// legitimately take several minutes, so the window must clear that to avoid
// cutting slow-but-working calls — only a genuinely hung (never-returning) call
// should be abandoned.
const CODEGEN_LLM_CALL_TIMEOUT_MS = (() => {
  const raw = Number(process.env.CODEGEN_LLM_CALL_TIMEOUT_MS ?? "480000");
  if (!Number.isFinite(raw) || raw <= 0) return 480_000; // 8 min default
  return Math.min(Math.max(Math.floor(raw), 60_000), 1_800_000); // clamp 60s–30min
})();

/**
 * Race an LLM call against a wall-clock timeout. On timeout the call is
 * ABANDONED (its late settlement is swallowed so it can't surface as an
 * unhandled rejection) and a timeout error is thrown to the caller, which
 * routes through the existing task error/retry path. `cleanup` (e.g. clearing
 * the heartbeat interval) runs whether the call wins or times out.
 */
async function withLlmCallTimeout<T>(
  makeCall: () => Promise<T>,
  cleanup: () => void,
  label: string,
): Promise<T> {
  const callP = makeCall();
  if (CODEGEN_LLM_CALL_TIMEOUT_MS <= 0) {
    try {
      return await callP;
    } finally {
      cleanup();
    }
  }
  // Swallow a late rejection from an abandoned (timed-out) call.
  callP.catch(() => {});
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () =>
        reject(
          new Error(
            `LLM codegen call timed out after ${Math.round(
              CODEGEN_LLM_CALL_TIMEOUT_MS / 1000,
            )}s (${label}); abandoning the hung request so the worker can fail this task and continue.`,
          ),
        ),
      CODEGEN_LLM_CALL_TIMEOUT_MS,
    );
  });
  try {
    return await Promise.race([callP, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
    cleanup();
  }
}
// Raise the iteration ceiling so complex tasks have enough read rounds.
// 10 rounds gives complex tasks (markets scanner, pipeline orchestrators, etc.)
// enough budget while still bounding the worst case.
// Anti read-only spiral: inject a nudge when the model has read for too long.
// Set relative to MAX_WORKER_TOOL_ITERATIONS so the nudge happens near the end,
// not in the middle — we don't want to cut short legitimate reads.
const READ_STALL_NUDGE_AFTER = 5; // nudge at round 5/10
// Force tool_choice:"none" only when very close to the limit, as a last resort.
// At this point the model has had ample reads; we'd rather get imperfect code
// than throw an iteration-exceeded error.
const READ_STALL_FORCE_WRITE_AFTER = 8; // force-write at round 8/10
const CODEGEN_MULTI_ROUND_ENABLED = (() => {
  const raw = (process.env.CODEGEN_MULTI_ROUND_ENABLED ?? "1")
    .trim()
    .toLowerCase();
  return raw !== "0" && raw !== "false" && raw !== "off";
})();
const CODEGEN_FILE_BATCH_SIZE = (() => {
  const raw = Number(process.env.CODEGEN_FILE_BATCH_SIZE ?? "2");
  if (!Number.isFinite(raw) || raw <= 0) return 2;
  return Math.min(Math.max(Math.floor(raw), 1), 8);
})();
const CODEGEN_MULTI_ROUND_MAX_ROUNDS = (() => {
  const raw = Number(process.env.CODEGEN_MULTI_ROUND_MAX_ROUNDS ?? "8");
  if (!Number.isFinite(raw) || raw <= 0) return 8;
  return Math.min(Math.max(Math.floor(raw), 1), 20);
})();
const CODEGEN_AGENTIC_TOOLS_ENABLED = (() => {
  const raw = (process.env.CODEGEN_AGENTIC_TOOLS_ENABLED ?? "1")
    .trim()
    .toLowerCase();
  return raw !== "0" && raw !== "false" && raw !== "off";
})();
const CODEGEN_AGENT_MAX_ITERATIONS = (() => {
  const raw = Number(process.env.CODEGEN_AGENT_MAX_ITERATIONS ?? "300");
  if (!Number.isFinite(raw) || raw <= 0) return 300;
  return Math.min(Math.max(Math.floor(raw), 4), 300);
})();
const CODEGEN_WRITE_TOOL_RESULT_MAX_CHARS = (() => {
  const raw = Number(
    process.env.CODEGEN_WRITE_TOOL_RESULT_MAX_CHARS ??
      process.env.CODEGEN_TOOL_RESULT_MAX_CHARS ??
      "1200",
  );
  if (!Number.isFinite(raw) || raw <= 0) return 1200;
  return Math.min(Math.max(Math.floor(raw), 200), 4000);
})();
const DEFAULT_WORKER_TSC_FIX_MAX_ATTEMPTS = 1;
const DEFAULT_WORKER_TSC_FIX_MAX_ATTEMPTS_RALPH_CAP = 1;
const DEFAULT_WORKER_TSC_ERROR_CONTEXT_MAX_CHARS = 3000;

function readPositiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.floor(n);
}

function getWorkerTscFixConfig(): {
  maxFixAttempts: number;
  maxFixAttemptsRalphCap: number;
  errorContextMaxChars: number;
} {
  return {
    maxFixAttempts: readPositiveIntEnv(
      "WORKER_TSC_FIX_MAX_ATTEMPTS",
      DEFAULT_WORKER_TSC_FIX_MAX_ATTEMPTS,
    ),
    maxFixAttemptsRalphCap: readPositiveIntEnv(
      "WORKER_TSC_FIX_MAX_ATTEMPTS_RALPH_CAP",
      DEFAULT_WORKER_TSC_FIX_MAX_ATTEMPTS_RALPH_CAP,
    ),
    errorContextMaxChars: readPositiveIntEnv(
      "WORKER_TSC_ERROR_CONTEXT_MAX_CHARS",
      DEFAULT_WORKER_TSC_ERROR_CONTEXT_MAX_CHARS,
    ),
  };
}

/** Approximate maximum context window for context-rotation threshold calculations. */
const MAX_CONTEXT_TOKENS = 200_000;

/** The exact string the LLM must output to signal intentional task completion. */
const RALPH_COMPLETE_TOKEN = "<promise>TASK_COMPLETE</promise>";
const RALPH_FAILED_RE = /<promise>TASK_FAILED:\s*([\s\S]*?)<\/promise>/;

const WORKER_TOOLS: OpenRouterToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "read_file",
      description:
        "Read a file by relative path from the generated project root.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Relative file path, e.g. frontend/src/router.tsx",
          },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_many_files",
      description:
        "Read multiple generated-project files in one call. Prefer this over many read_file calls when you know the paths.",
      parameters: {
        type: "object",
        properties: {
          paths: {
            type: "array",
            items: { type: "string" },
            description:
              "Relative file paths from the generated project root. Maximum 20 files.",
          },
          maxCharsPerFile: {
            type: "number",
            description:
              "Optional per-file character cap. Defaults to 2000, max 4000.",
          },
        },
        required: ["paths"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_files",
      description:
        "List files recursively under a directory relative to the generated project root.",
      parameters: {
        type: "object",
        properties: {
          dir: {
            type: "string",
            description:
              "Directory relative to project root. Omit or use '.' for root.",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "grep",
      description:
        "Search for a pattern in project files and return matching lines with file paths.",
      parameters: {
        type: "object",
        properties: {
          pattern: {
            type: "string",
            description: "Regex or literal text to search for.",
          },
          path: {
            type: "string",
            description:
              "File or directory relative to project root. Defaults to '.'.",
          },
        },
        required: ["pattern"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "apply_patch",
      description:
        "Safely replace an exact text snippet inside one generated-project file. Prefer this over emitting a full file block for small edits.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          oldText: { type: "string" },
          newText: { type: "string" },
          replaceAll: { type: "boolean" },
        },
        required: ["path", "oldText", "newText"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description:
        "Create or fully replace one generated-project file. Prefer this for new files or full rewrites; use apply_patch for small edits.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          content: { type: "string" },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_file",
      description:
        "Delete one generated-project file. Use only for duplicate or obsolete generated files; scaffold-protected files cannot be deleted.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "move_file",
      description:
        "Move or rename one generated-project file. Scaffold-protected source/destination paths cannot be moved.",
      parameters: {
        type: "object",
        properties: {
          from: { type: "string" },
          to: { type: "string" },
          overwrite: { type: "boolean" },
        },
        required: ["from", "to"],
      },
    },
  },
];

// ROLE_PROMPTS has moved to ./role-prompts.ts. Use `buildRolePrompt(role, ctx)`
// at the call site so HARD RULEs that don't apply to the current project
// (OAuth identity, background-job lifecycle, LLM client abstraction, …) are
// not injected as noise.

// ─── Version constraint injection (prevent LLM from using deprecated APIs) ───

const KNOWN_BREAKING_CHANGES: Record<
  string,
  { sinceVersion: string; notes: string }
> = {
  msw: {
    sinceVersion: "2.0.0",
    notes:
      "v2+: use `http.get/post/put/patch/delete` from 'msw', NOT `rest.*`. " +
      "Use `HttpResponse.json(data)` instead of `res(ctx.json(data))`.",
  },
  "react-router-dom": {
    sinceVersion: "6.0.0",
    notes:
      "v6+: use `useNavigate()` NOT `useHistory()`. " +
      "Use `<Routes>` NOT `<Switch>`. " +
      "Route `component` prop is now `element={<Component />}`.",
  },
  "@tanstack/react-query": {
    sinceVersion: "5.0.0",
    notes:
      "v5+: `useQuery` takes a single object param `{ queryKey, queryFn }`. " +
      "No more `onSuccess/onError` callbacks in useQuery options. " +
      "Use `isPending` instead of `isLoading`.",
  },
  "next-auth": {
    sinceVersion: "4.0.0",
    notes:
      "v4+: config is in `app/api/auth/[...nextauth]/route.ts`. " +
      "Use `getServerSession(authOptions)` NOT `getSession()`.",
  },
  prisma: {
    sinceVersion: "7.0.0",
    notes:
      'v5/6 (default for generated apps): `datasource db { provider = "postgresql" url = env("DATABASE_URL") }`. ' +
      "v7+: `url`/`directUrl` may be omitted from schema; connection via prisma.config.ts — follow the version in package.json. " +
      "v5+: `findUnique` throws if not found when using `findUniqueOrThrow`. `rejectOnNotFound` option removed.",
  },
  "framer-motion": {
    sinceVersion: "11.0.0",
    notes:
      "v11+: `motion` components import from 'framer-motion' directly. " +
      "AnimatePresence `exitBeforeEnter` renamed to `mode='wait'`.",
  },
  "react-hook-form": {
    sinceVersion: "7.0.0",
    notes:
      "v7+: `register` returns an object to spread: `{...register('field')}`. " +
      "No more `ref={register}` pattern.",
  },
};

export async function buildVersionConstraints(
  outputDir: string,
): Promise<string> {
  const content = await fsRead("package.json", outputDir);
  if (content.startsWith("FILE_NOT_FOUND")) return "";

  let pkg: {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  try {
    pkg = JSON.parse(content);
  } catch {
    return "";
  }

  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  if (Object.keys(allDeps).length === 0) return "";

  const constraints: string[] = [];

  for (const [pkgName, version] of Object.entries(allDeps)) {
    const breaking = KNOWN_BREAKING_CHANGES[pkgName];
    if (!breaking) continue;

    const installedMajor = parseInt(
      version.replace(/^[\^~>=<]/, "").split(".")[0],
      10,
    );
    const breakingMajor = parseInt(breaking.sinceVersion.split(".")[0], 10);

    if (!isNaN(installedMajor) && installedMajor >= breakingMajor) {
      constraints.push(
        `- **${pkgName}** (installed: ${version}): ${breaking.notes}`,
      );
    }
  }

  if (constraints.length === 0) return "";

  return [
    "## Installed package versions — use these APIs (not older ones)",
    "",
    ...constraints,
  ].join("\n");
}

function getResponseUsageCounts(response: OpenRouterResponse): {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
} {
  const usage = response.usage as
    | {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
        promptTokens?: number;
        completionTokens?: number;
        totalTokens?: number;
      }
    | undefined;
  const promptTokens = usage?.prompt_tokens ?? usage?.promptTokens ?? 0;
  const completionTokens =
    usage?.completion_tokens ?? usage?.completionTokens ?? 0;
  const totalTokens =
    usage?.total_tokens ??
    usage?.totalTokens ??
    promptTokens + completionTokens;
  return { promptTokens, completionTokens, totalTokens };
}

function buildSearchMatcher(pattern: string): (line: string) => boolean {
  try {
    const regex = new RegExp(pattern, "i");
    return (line: string) => regex.test(line);
  } catch {
    const lowered = pattern.toLowerCase();
    return (line: string) => line.toLowerCase().includes(lowered);
  }
}

/**
 * Dynamically scan the generated project and produce a concise "Project Convention Card"
 * that tells every worker the key architectural facts they need before writing any code.
 * This prevents systematic errors like double /api prefix, wrong directory names, etc.
 */
export async function buildProjectConventionCard(
  outputDir: string,
): Promise<string> {
  const lines: string[] = [
    "## Project Convention Card (read before writing any code)",
  ];

  // ── Detect frontend API client base URL ──────────────────────────────────
  const clientContent = await fsRead("frontend/src/api/client.ts", outputDir);
  if (
    !clientContent.startsWith("FILE_NOT_FOUND") &&
    !clientContent.startsWith("REJECTED")
  ) {
    const baseMatch =
      clientContent.match(/VITE_API_BASE_URL[^|]*\|\|\s*["'`]([^"'`]+)["'`]/) ??
      clientContent.match(/API_BASE\s*=\s*["'`]([^"'`]+)["'`]/) ??
      clientContent.match(/baseURL.*?["'`]([^"'`]+)["'`]/);
    const base = baseMatch ? baseMatch[1] : "/api";
    lines.push(
      `- **Frontend API client base URL**: \`${base}\` — pass paths WITHOUT this prefix.`,
      `  ✅ \`apiClient.get("/users/me")\`  ❌ \`apiClient.get("${base}/users/me")\``,
    );
  }

  // ── Detect package manager ────────────────────────────────────────────────
  const pmLock = await fsRead("pnpm-lock.yaml", outputDir);
  const pm = !pmLock.startsWith("FILE_NOT_FOUND") ? "pnpm" : "npm";
  lines.push(`- **Package manager**: \`${pm}\``);

  // ── Detect frontend framework / router convention ─────────────────────────
  const frontendPkg = await fsRead("frontend/package.json", outputDir);
  const hasVite =
    !frontendPkg.startsWith("FILE_NOT_FOUND") && frontendPkg.includes('"vite"');
  if (hasVite) {
    lines.push(
      "- **Frontend framework**: Vite + React + React Router (NOT Next.js)",
      "- **Page views**: `frontend/src/views/` (flat, one file per page). NEVER use `src/pages/`.",
      "- **Route registration**: `frontend/src/router.tsx`, import from `./views/...`",
    );
  }

  // ── Detect middleware directory ───────────────────────────────────────────
  const mwsFiles = await fsRead("backend/src/middlewares/auth.ts", outputDir);
  const mwFiles = await fsRead("backend/src/middleware/auth.ts", outputDir);
  const mwDir = !mwsFiles.startsWith("FILE_NOT_FOUND")
    ? "backend/src/middlewares/"
    : !mwFiles.startsWith("FILE_NOT_FOUND")
      ? "backend/src/middleware/"
      : "backend/src/middlewares/";
  lines.push(
    `- **Backend middleware directory**: \`${mwDir}\` (canonical — do not create a parallel directory)`,
  );

  // ── Detect backend framework ──────────────────────────────────────────────
  const backendPkg = await fsRead("backend/package.json", outputDir);
  if (!backendPkg.startsWith("FILE_NOT_FOUND")) {
    const hasKoa = backendPkg.includes('"koa"');
    const hasExpress = backendPkg.includes('"express"');
    const hasSequelize = backendPkg.includes('"sequelize"');
    if (hasKoa)
      lines.push(
        "- **Backend framework**: Koa — use `ctx.request.body`, `AppKoaContext`, Joi validation",
      );
    if (hasExpress)
      lines.push(
        "- **Backend framework**: Express — use `req.body`, `req.params`, `req.headers`",
      );
    if (hasSequelize) {
      lines.push(
        "- **ORM**: Sequelize — model field declarations MUST use `declare`. System fields (id, createdAt, updatedAt) must NOT be in request DTOs.",
      );
      lines.push(
        "- **Schema = models, NO migrations (CRITICAL)**: This project has NO " +
          "migrations and NO migration runner — `syncModels()` runs " +
          "`sequelize.sync()` and builds every table from the model. Declare " +
          "EVERYTHING on the model under `backend/src/models/`: columns, " +
          "`unique: true`, secondary indexes via `indexes: [{ fields: [\"col\"] }]` " +
          "in the `init()` options, and foreign keys via the column's " +
          "`references: { model: \"<table>\", key: \"id\" }` + `onDelete`. If it " +
          "is not on the model, `sync()` will NOT create it. Do NOT create a " +
          "`backend/src/database/migrations/` directory or call `queryInterface` " +
          "for schema DDL. Adding a field to a model is sufficient — no ALTER needed.",
      );

      // ── TimescaleDB safety RULE ─────────────────────────────────────────
      // Fires when the project references TimescaleDB anywhere — db.ts
      // helper, PRD/TRD mention, or model/schema code. Raw
      // `CREATE EXTENSION timescaledb` at startup is the single most
      // common reason an M-tier backend won't start on a fresh Postgres.
      const timescaleHelper = await fsRead(
        "backend/src/utils/timescale.ts",
        outputDir,
      );
      const dbInit = await fsRead("backend/src/db.ts", outputDir);
      const usesTimescale =
        (!timescaleHelper.startsWith("FILE_NOT_FOUND") &&
          !timescaleHelper.startsWith("REJECTED")) ||
        (!dbInit.startsWith("FILE_NOT_FOUND") &&
          /timescale|TIMESCALE_DISABLED|hypertable/i.test(dbInit));
      if (usesTimescale) {
        lines.push(
          "- **TimescaleDB safety RULE (CRITICAL)**: TimescaleDB is NOT part " +
            "of stock PostgreSQL — Homebrew, Docker dev images, CI runners, " +
            "and most cloud preview DBs do not have it. Calling " +
            "`CREATE EXTENSION timescaledb` or `create_hypertable` directly " +
            "at startup will THROW and kill the backend. There are no " +
            "migrations — promote hypertables in `initDb()` AFTER " +
            "`syncModels()` has created the tables, using the helpers in " +
            "`backend/src/utils/timescale.ts` — they respect " +
            "`TIMESCALE_DISABLED=1` (set in `.env.example`) and silently fall " +
            "back to plain Postgres tables when the extension is unavailable. " +
            "Specifically: " +
            "(a) `enableTimescaleExtension(sequelize)` for CREATE EXTENSION; " +
            "(b) `createHypertableIfPossible(sequelize.getQueryInterface(), 'table', 'time_col')` " +
            "for hypertable conversion; " +
            "(c) `runTimescaleQuery(sequelize, sql, 'description')` for " +
            "compression / retention / continuous aggregate SQL. " +
            "NEVER inline raw Timescale SQL at startup outside these helpers.",
        );
      }
    }
  }

  // ── Route registrar convention ────────────────────────────────────────────
  const indexContent = await fsRead(
    "backend/src/api/modules/index.ts",
    outputDir,
  );
  if (!indexContent.startsWith("FILE_NOT_FOUND")) {
    lines.push(
      "- **Route registrar pattern**: `export function registerXxxRoutes(apiRouter: Router): void` — one registrar per domain, call `apiRouter.<verb>(...)` directly",
      "- **Module index**: `backend/src/api/modules/index.ts` — every registrar must be imported and called here",
    );
  }

  // ── JWT helper ────────────────────────────────────────────────────────────
  const jwtHelper = await fsRead("backend/src/utils/jwt.ts", outputDir);
  if (!jwtHelper.startsWith("FILE_NOT_FOUND")) {
    lines.push(
      "- **JWT**: use `signJwt`/`verifyJwt` from `backend/src/utils/jwt.ts`. Never call `jsonwebtoken` directly in feature code.",
    );
  }

  // ── Shared schema (TRD §6 product) ───────────────────────────────────────
  // Detect either side: distributor writes both for M-tier; for S/L only one
  // location applies. If found, instruct workers to import from it rather
  // than re-declare any type whose name appears there.
  const sharedSchemaCandidates = [
    "frontend/src/shared/schema.ts",
    "backend/src/shared/schema.ts",
    "src/shared/schema.ts",
    "packages/shared/src/schema.ts",
  ];
  const presentSchemas: string[] = [];
  for (const p of sharedSchemaCandidates) {
    const content = await fsRead(p, outputDir);
    if (
      !content.startsWith("FILE_NOT_FOUND") &&
      !content.startsWith("REJECTED")
    ) {
      presentSchemas.push(p);
    }
  }
  if (presentSchemas.length > 0) {
    lines.push(
      `- **Shared schema (CANONICAL)**: ${presentSchemas.map((p) => `\`${p}\``).join(", ")} — TRD-frozen single source of truth for every type that crosses the API boundary. **Read it first.** Import the types you need; do NOT redefine any type whose name already appears there. The file is scaffold-protected — do NOT rewrite it.`,
    );
  }

  // ── Workflow DAG (TRD §8 product) ────────────────────────────────────────
  // When pipeline-dag.yaml exists, the project has multi-step deterministic
  // service chains. Workers implementing those services MUST follow the
  // declared order and failure strategy.
  const dagContent = await fsRead(".blueprint/pipeline-dag.yaml", outputDir);
  if (
    !dagContent.startsWith("FILE_NOT_FOUND") &&
    !dagContent.startsWith("REJECTED")
  ) {
    lines.push(
      "- **Workflow DAG (CANONICAL)**: `.blueprint/pipeline-dag.yaml` defines " +
        "ordered service chains. **Read it before implementing any service " +
        "named in a node.** Call services in `dependsOn` order, honor the " +
        "declared `failure.strategy` (abort / continue / retry-N), and do " +
        "NOT invent a different chain. The file is scaffold-protected.",
    );
  }

  // ── Playwright webServer & health route (E2E infra contract) ──────────────
  const playwrightCfg = await fsRead(
    "frontend/playwright.config.ts",
    outputDir,
  );
  if (
    !playwrightCfg.startsWith("FILE_NOT_FOUND") &&
    !backendPkg.startsWith("FILE_NOT_FOUND")
  ) {
    lines.push(
      "- **Playwright `webServer` (CRITICAL)**: `frontend/playwright.config.ts` MUST keep `webServer` as an ARRAY that starts BOTH the backend (`cd ../backend && pnpm dev`, health probe `http://localhost:4000/api/health`) AND the frontend (`pnpm dev` on :5173). Collapsing it to a single object causes every API-driven e2e test to fail with ECONNREFUSED — the supervisor will auto-rewrite it back. Do NOT remove the backend entry.",
      "- **Backend `/api/health`**: `backend/src/api/modules/health/health.routes.ts` exposes `GET /health` and is registered in `backend/src/api/modules/index.ts` via `registerHealthRoutes(apiRouter)`. Do NOT delete this route — the Playwright `webServer` health probe depends on it.",
    );
  }

  return lines.join("\n");
}

type WorkerToolExecutionResult = {
  content: string;
  isWrite: boolean;
  changedFiles: string[];
  deletedFiles: string[];
  movedFiles: Array<{ from: string; to: string }>;
  fatal: boolean;
};

function workerToolResult(
  content: string,
  options?: {
    isWrite?: boolean;
    changedFiles?: string[];
    deletedFiles?: string[];
    movedFiles?: Array<{ from: string; to: string }>;
    fatal?: boolean;
  },
): WorkerToolExecutionResult {
  return {
    content,
    isWrite: options?.isWrite ?? false,
    changedFiles: options?.changedFiles ?? [],
    deletedFiles: options?.deletedFiles ?? [],
    movedFiles: options?.movedFiles ?? [],
    fatal: options?.fatal ?? false,
  };
}

function safeWorkerPath(outputDir: string, relPath: string): string | null {
  const normalized = path.normalize(relPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const abs = path.resolve(path.join(outputDir, normalized));
  const root = path.resolve(outputDir);
  if (!abs.startsWith(root + path.sep) && abs !== root) return null;
  return abs;
}

function isWorkerProtectedPath(
  relPath: string,
  options?: { fsWriteOptions?: FsWriteOptions },
): boolean {
  const protectedPaths = options?.fsWriteOptions?.scaffoldProtectedPaths;
  if (protectedPaths == null) return false;
  const key = normalizeScaffoldRelPath(relPath);
  for (const protectedPath of protectedPaths) {
    if (normalizeScaffoldRelPath(protectedPath) === key) return true;
  }
  return false;
}

function summarizeWorkerToolArgs(
  name: string,
  args: Record<string, unknown>,
): string {
  switch (name) {
    case "read_file":
      return `path=${String(args.path ?? "")}`;
    case "read_many_files": {
      const paths = Array.isArray(args.paths) ? args.paths.map(String) : [];
      return `paths=[${paths.slice(0, 10).join(",")}] count=${paths.length} maxCharsPerFile=${String(args.maxCharsPerFile ?? "default")}`;
    }
    case "list_files":
      return `dir=${String(args.dir ?? ".")}`;
    case "grep":
      return `pattern=${JSON.stringify(String(args.pattern ?? "").slice(0, 120))} path=${String(args.path ?? ".")}`;
    case "apply_patch":
      return [
        `path=${String(args.path ?? "")}`,
        `oldTextChars=${typeof args.oldText === "string" ? args.oldText.length : 0}`,
        `newTextChars=${typeof args.newText === "string" ? args.newText.length : 0}`,
        `replaceAll=${args.replaceAll === true}`,
      ].join(" ");
    case "write_file":
      return `path=${String(args.path ?? "")} contentChars=${typeof args.content === "string" ? args.content.length : 0}`;
    case "delete_file":
      return `path=${String(args.path ?? "")}`;
    case "move_file":
      return `from=${String(args.from ?? "")} to=${String(args.to ?? "")} overwrite=${args.overwrite === true}`;
    default:
      return Object.keys(args).slice(0, 12).join(",");
  }
}

function summarizeWorkerToolResult(result: WorkerToolExecutionResult): string {
  return [
    `isWrite=${result.isWrite}`,
    `changed=[${result.changedFiles.join(",")}]`,
    `deleted=[${result.deletedFiles.join(",")}]`,
    `moved=${result.movedFiles.length}`,
    `result=${JSON.stringify(result.content.slice(0, 300))}`,
  ].join(" ");
}

async function executeWorkerToolImpl(
  name: string,
  args: Record<string, unknown>,
  outputDir: string,
  options?: { fsWriteOptions?: FsWriteOptions },
): Promise<WorkerToolExecutionResult> {
  switch (name) {
    case "read_file": {
      const filePath = String(args.path ?? "").trim();
      if (!filePath) return workerToolResult("Error: path is required");
      const content = await fsRead(filePath, outputDir);
      return workerToolResult(content.slice(0, MAX_WORKER_TOOL_OUTPUT_CHARS));
    }
    case "read_many_files": {
      const paths = Array.isArray(args.paths)
        ? args.paths.map(String).slice(0, 20)
        : [];
      if (paths.length === 0) {
        return workerToolResult("Error: paths is required");
      }
      const maxCharsPerFile =
        typeof args.maxCharsPerFile === "number"
          ? Math.max(200, Math.min(Math.floor(args.maxCharsPerFile), 4000))
          : 2000;
      const chunks: string[] = [];
      for (const relPath of paths) {
        const content = await fsRead(relPath, outputDir);
        chunks.push(`--- ${relPath} ---\n${content.slice(0, maxCharsPerFile)}`);
      }
      return workerToolResult(
        chunks.join("\n\n").slice(0, MAX_WORKER_TOOL_OUTPUT_CHARS),
      );
    }
    case "list_files": {
      const dir = String(args.dir ?? ".").trim() || ".";
      const files = await listFiles(dir, outputDir);
      return workerToolResult(
        (files.join("\n") || "(no files found)").slice(
          0,
          MAX_WORKER_TOOL_OUTPUT_CHARS,
        ),
      );
    }
    case "grep": {
      const pattern = String(args.pattern ?? "").trim();
      const searchPath = String(args.path ?? ".").trim() || ".";
      if (!pattern) return workerToolResult("Error: pattern is required");

      const matcher = buildSearchMatcher(pattern);
      const filePaths: string[] = [];
      const directFileContent = await fsRead(searchPath, outputDir);
      if (
        !directFileContent.startsWith("FILE_NOT_FOUND") &&
        !directFileContent.startsWith("REJECTED")
      ) {
        filePaths.push(searchPath);
      } else {
        filePaths.push(...(await listFiles(searchPath, outputDir)));
      }

      const matches: string[] = [];
      for (const relPath of filePaths) {
        if (!/\.(ts|tsx|js|jsx|json|css|md)$/.test(relPath)) continue;
        const content = await fsRead(relPath, outputDir);
        if (
          content.startsWith("FILE_NOT_FOUND") ||
          content.startsWith("REJECTED")
        ) {
          continue;
        }
        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          if (!matcher(lines[i])) continue;
          matches.push(`${relPath}:${i + 1}:${lines[i]}`);
          if (matches.length >= 60) break;
        }
        if (matches.length >= 60) break;
      }

      return workerToolResult(
        (matches.join("\n") || "No matches found.").slice(
          0,
          MAX_WORKER_TOOL_OUTPUT_CHARS,
        ),
      );
    }
    case "apply_patch": {
      const relPath = String(args.path ?? "").trim();
      const oldText = String(args.oldText ?? "");
      const newText = String(args.newText ?? "");
      const replaceAll = args.replaceAll === true;
      if (!relPath || !oldText) {
        return workerToolResult("Error: path and oldText are required");
      }
      const existing = await fsRead(relPath, outputDir);
      if (
        existing.startsWith("FILE_NOT_FOUND") ||
        existing.startsWith("REJECTED")
      ) {
        return workerToolResult(existing);
      }
      const count = existing.split(oldText).length - 1;
      if (count === 0) return workerToolResult("Error: oldText not found");
      if (count > 1 && !replaceAll) {
        return workerToolResult(
          `Error: oldText matched ${count} times; set replaceAll=true or provide a more specific snippet.`,
        );
      }
      const next = replaceAll
        ? existing.split(oldText).join(newText)
        : existing.replace(oldText, newText);
      const writeResult = await fsWrite(
        relPath,
        next,
        outputDir,
        options?.fsWriteOptions,
      );
      if (
        writeResult.startsWith("REJECTED") ||
        writeResult.startsWith("SKIPPED_PROTECTED")
      ) {
        return workerToolResult(writeResult);
      }
      return workerToolResult(
        `OK: patched ${relPath} (${replaceAll ? count : 1} replacement(s)). ${writeResult}`,
        { isWrite: true, changedFiles: [relPath] },
      );
    }
    case "write_file": {
      const relPath = String(args.path ?? "").trim();
      const content =
        typeof args.content === "string"
          ? args.content
          : String(args.content ?? "");
      if (!relPath) return workerToolResult("Error: path is required");
      const writeResult = await fsWrite(
        relPath,
        content,
        outputDir,
        options?.fsWriteOptions,
      );
      if (
        writeResult.startsWith("REJECTED") ||
        writeResult.startsWith("SKIPPED_PROTECTED")
      ) {
        return workerToolResult(writeResult);
      }
      return workerToolResult(
        `OK: wrote ${relPath} (${content.length} chars). ${writeResult}`,
        { isWrite: true, changedFiles: [relPath] },
      );
    }
    case "delete_file": {
      const relPath = String(args.path ?? "").trim();
      if (!relPath) return workerToolResult("Error: path is required");
      if (isWorkerProtectedPath(relPath, options)) {
        return workerToolResult(
          `REJECTED: cannot delete scaffold-protected file "${relPath}"`,
        );
      }
      const abs = safeWorkerPath(outputDir, relPath);
      if (!abs) {
        return workerToolResult(
          `REJECTED: path traversal detected for "${relPath}"`,
        );
      }
      try {
        await nodeFs.unlink(abs);
        return workerToolResult(`OK: deleted ${relPath}`, {
          isWrite: true,
          deletedFiles: [relPath],
        });
      } catch (error) {
        return workerToolResult(
          `Error: delete failed for ${relPath}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    case "move_file": {
      const from = String(args.from ?? "").trim();
      const to = String(args.to ?? "").trim();
      if (!from || !to) {
        return workerToolResult("Error: from and to are required");
      }
      if (
        isWorkerProtectedPath(from, options) ||
        isWorkerProtectedPath(to, options)
      ) {
        return workerToolResult(
          `REJECTED: cannot move scaffold-protected path "${from}" -> "${to}"`,
        );
      }
      const fromAbs = safeWorkerPath(outputDir, from);
      const toAbs = safeWorkerPath(outputDir, to);
      if (!fromAbs || !toAbs) {
        return workerToolResult("REJECTED: path traversal detected");
      }
      try {
        if (args.overwrite !== true) {
          try {
            await nodeFs.access(toAbs);
            return workerToolResult(`Error: destination exists: ${to}`);
          } catch {
            // Destination does not exist.
          }
        }
        await nodeFs.mkdir(path.dirname(toAbs), { recursive: true });
        await nodeFs.rename(fromAbs, toAbs);
        return workerToolResult(`OK: moved ${from} -> ${to}`, {
          isWrite: true,
          changedFiles: [to],
          deletedFiles: [from],
          movedFiles: [{ from, to }],
        });
      } catch (error) {
        return workerToolResult(
          `Error: move failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    default:
      return workerToolResult(`Error: unknown tool '${name}'`);
  }
}

async function executeWorkerTool(
  name: string,
  args: Record<string, unknown>,
  outputDir: string,
  options?: {
    fsWriteOptions?: FsWriteOptions;
    workerLabel?: string;
    sessionId?: string;
    taskId?: string;
  },
): Promise<WorkerToolExecutionResult> {
  const label = options?.workerLabel ?? "worker";
  const startedAt = Date.now();
  console.log(
    `[Worker:${label}] tool_call ${name} args=${summarizeWorkerToolArgs(name, args)}`,
  );
  const result = await executeWorkerToolImpl(name, args, outputDir, options);
  console.log(
    `[Worker:${label}] tool_result ${name} durationMs=${Date.now() - startedAt} ${summarizeWorkerToolResult(result)}`,
  );

  // Emit file activity events so the UI can display real-time file I/O.
  if (options?.sessionId && options?.taskId) {
    const emitter = getRepairEmitter(options.sessionId);
    if (name === "read_file") {
      emitter({
        stage: "worker-codegen",
        event: "file_activity",
        taskId: options.taskId,
        details: {
          operation: "read",
          path: String(args.path ?? ""),
        },
      });
    } else if (name === "read_many_files" && Array.isArray(args.paths)) {
      for (const p of args.paths as string[]) {
        emitter({
          stage: "worker-codegen",
          event: "file_activity",
          taskId: options.taskId,
          details: {
            operation: "read",
            path: String(p),
          },
        });
      }
    } else if (
      (name === "write_file" || name === "apply_patch") &&
      result.isWrite &&
      !result.content.startsWith("REJECTED") &&
      !result.content.startsWith("SKIPPED_PROTECTED")
    ) {
      const writtenPath = String(args.path ?? "").trim();
      const writtenContent =
        name === "write_file"
          ? typeof args.content === "string"
            ? args.content
            : ""
          : typeof args.newText === "string"
            ? args.newText
            : "";
      emitter({
        stage: "worker-codegen",
        event: "file_activity",
        taskId: options.taskId,
        details: {
          operation: "write",
          path: writtenPath,
          contentPreview: writtenContent.slice(0, 400),
          contentLength: writtenContent.length,
        },
      });
    }

    // Emit a human-readable worker_action event so the UI can show what the
    // AI is actually doing, not just file I/O paths.
    const actionEmitter = getRepairEmitter(options.sessionId);
    let actionMsg: string | null = null;
    switch (name) {
      case "read_file":
        actionMsg = `Reading ${String(args.path ?? "")}`;
        break;
      case "read_many_files":
        actionMsg = `Reading ${Array.isArray(args.paths) ? (args.paths as string[]).length : 1} file(s)`;
        break;
      case "list_files":
        actionMsg = `Listing ${String(args.path ?? ".")}`;
        break;
      case "grep":
        actionMsg = `Searching "${String(args.pattern ?? "").slice(0, 60)}"`;
        break;
      case "write_file":
        actionMsg = result.content.startsWith("REJECTED")
          ? `Write rejected: ${String(args.path ?? "")}`
          : `Writing ${String(args.path ?? "")}`;
        break;
      case "apply_patch":
        actionMsg = result.content.startsWith("REJECTED")
          ? `Patch rejected: ${String(args.path ?? "")}`
          : `Patching ${String(args.path ?? "")}`;
        break;
      case "delete_file":
        actionMsg = `Deleting ${String(args.path ?? "")}`;
        break;
      case "move_file":
        actionMsg = `Moving ${String(args.from ?? "")} → ${String(args.to ?? "")}`;
        break;
    }
    if (actionMsg) {
      actionEmitter({
        stage: "worker-codegen",
        event: "worker_action",
        taskId: options.taskId,
        details: { message: actionMsg, tool: name, durationMs: Date.now() - startedAt },
      });
    }
  }

  return result;
}

/**
 * Context required for the worker loop to trigger a second-pass memory
 * recall mid-task when a fresh error signal appears in tool output or
 * model content. When omitted, second-pass recall is silently disabled
 * (loop behaves identically to before).
 */
interface SecondaryRecallContext {
  agent: string;
  role?: string;
  task: {
    id?: string;
    title?: string;
    description?: string;
    files?: string[];
  };
  projectRoot?: string;
  kickoffId?: string;
  layers?: ("L1" | "L2")[];
  /** Patterns already injected by the primary recall — excluded from
   *  second-pass candidates so we don't re-inject the same blocks. */
  primaryInjectedIds: string[];
  tokenBudget?: number;
}

async function runCodegenWorkerLoop(
  messages: ChatMessage[],
  outputDir: string,
  sessionId?: string,
  workerLabel?: string,
  recallCtx?: SecondaryRecallContext,
  toolOptions?: { fsWriteOptions?: FsWriteOptions; taskId?: string },
  /** Worker role — used to select the codegen model variant. */
  role?: CodingAgentRole,
  codingMode: CodingMode = "normal",
  /** When true, this frontend task has a matched design reference image injected.
   *  Use codex (vision-capable). When false, use DeepSeek direct (cheaper). */
  hasVisionImage = false,
): Promise<{
  content: string;
  rawContent: string;
  model: string;
  costUsd: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  llmCalls: number;
  readOnlyRounds: number;
  /** Pattern ids injected by the secondary recall (empty if not fired). */
  secondaryInjectedIds: string[];
  /** Files changed through worker tools such as apply_patch / move_file. */
  toolChangedFiles: string[];
}> {
  let totalCostUsd = 0;
  let promptTokens = 0;
  let completionTokens = 0;
  let totalTokens = 0;
  let llmCalls = 0;
  let readOnlyRounds = 0;
  let consecutiveReadRounds = 0;
  // Track second-pass recall state so we fire it at most once per worker
  // run — otherwise a chatty model that mentions errors in every round
  // would burn through the L1 store with redundant injects.
  let didSecondaryRecall = false;
  const primaryIds = new Set(recallCtx?.primaryInjectedIds ?? []);
  const injectedIds = new Set(primaryIds);
  const secondaryInjectedIds: string[] = [];
  const toolChangedFiles = new Set<string>();
  // Frontend page-restoration tasks (vision image injected) → codex for UI fidelity.
  // Frontend logic tasks (no vision image) → deepseek direct (cheaper).
  // Backend/architect/test → deepseek direct.
  const codegenVariant =
    role === "frontend" && hasVisionImage ? "codeGenFrontend" : "codeGen";

  console.log('run task with role', role,'codegenVariant', codegenVariant)
  for (let i = 0; i < MAX_WORKER_TOOL_ITERATIONS; i++) {
    // Anti-spiral: inject a nudge message after too many consecutive read rounds.
    if (consecutiveReadRounds === READ_STALL_NUDGE_AFTER) {
      console.log(
        `[Worker] Read-stall nudge after ${consecutiveReadRounds} consecutive read-only rounds (loop=${i + 1})`,
      );
      messages.push({
        role: "user",
        content:
          `You have spent ${consecutiveReadRounds} rounds reading files. ` +
          `You now have enough context. STOP calling read tools. ` +
          `Output your implementation NOW using \`\`\`file:path\`\`\` blocks. ` +
          `Do not read any more files — write the code directly.`,
      });
    }

    // Anti-spiral: after even more stall, force the model to output text (no tool calls).
    const forceWrite = consecutiveReadRounds >= READ_STALL_FORCE_WRITE_AFTER;
    if (forceWrite) {
      console.log(
        `[Worker] Forcing tool_choice=none after ${consecutiveReadRounds} consecutive read-only rounds (loop=${i + 1})`,
      );
    }

    const callStartedAt = Date.now();
    const heartbeat = setInterval(() => {
      const waitedSec = Math.floor((Date.now() - callStartedAt) / 1000);
      console.log(
        `[Worker] codegen still waiting... loop=${i + 1}/${MAX_WORKER_TOOL_ITERATIONS} waited=${waitedSec}s`,
      );
      if (sessionId && toolOptions?.taskId) {
        getRepairEmitter(sessionId)({
          stage: "worker-codegen",
          event: "worker_action",
          taskId: toolOptions.taskId,
          details: { message: `Thinking… (${waitedSec}s)`, tool: "llm" },
        });
      }
    }, WORKER_LLM_HEARTBEAT_MS);
    const response = await withLlmCallTimeout(
      () =>
        invokeCodegenOrOpenRouter(messages, {
          temperature: 0.3,
          max_tokens: MAX_OUTPUT_TOKENS,
          openRouterVariant: codegenVariant,
          codingMode,
          // When forcing write, omit tools entirely so the model cannot call them.
          tools: forceWrite ? undefined : WORKER_TOOLS,
          tool_choice: forceWrite ? "none" : "auto",
          contextDump: {
            taskId: toolOptions?.taskId,
            iteration: i,
            sessionId,
            label: workerLabel,
            outputDir,
          },
        }),
      () => clearInterval(heartbeat),
      `task=${toolOptions?.taskId ?? "?"} loop=${i + 1}/${MAX_WORKER_TOOL_ITERATIONS}`,
    );
    const choice = response.choices[0];
    llmCalls += 1;
    const finishReason = choice?.finish_reason ?? "stop";
    const content = choice?.message?.content ?? "";
    const toolCalls = choice?.message?.tool_calls ?? [];
    const usage = getResponseUsageCounts(response);
    totalCostUsd += estimateCost(response.model, response.usage);
    promptTokens += usage.promptTokens;
    completionTokens += usage.completionTokens;
    totalTokens += usage.totalTokens;
    if (sessionId) {
      recordCodingSessionLlmUsage({
        sessionId,
        stage: "worker_codegen",
        label: workerLabel,
        model: response.model,
        costUsd: estimateCost(response.model, response.usage),
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        totalTokens: usage.totalTokens,
      });
    }

    if (finishReason === "length") {
      throw new Error(
        `Worker codegen output truncated (finish_reason=length, model=${response.model})`,
      );
    }

    const reasoningContent = choice?.message?.reasoning_content;
    messages.push({
      role: "assistant",
      content,
      // Omit tool_calls entirely when empty — DeepSeek V4 rejects [] with a 400.
      ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
      // DeepSeek V4 thinking mode: echo reasoning_content back so the API
      // doesn't reject the next turn with "must be passed back" error.
      ...(reasoningContent ? { reasoning_content: reasoningContent } : {}),
    });

    if (toolCalls.length === 0) {
      return {
        content,
        rawContent: content,
        model: response.model,
        costUsd: totalCostUsd,
        promptTokens,
        completionTokens,
        totalTokens,
        llmCalls,
        readOnlyRounds,
        secondaryInjectedIds,
        toolChangedFiles: Array.from(toolChangedFiles),
      };
    }

    const toolResultTexts: string[] = [];
    let hadWriteTool = false;
    for (const toolCall of toolCalls) {
      let args: Record<string, unknown>;
      try {
        args = JSON.parse(toolCall.function.arguments || "{}") as Record<
          string,
          unknown
        >;
      } catch {
        args = {};
      }
      const result = await executeWorkerTool(
        toolCall.function.name,
        args,
        outputDir,
        { ...toolOptions, workerLabel, sessionId, taskId: toolOptions?.taskId },
      );
      if (result.isWrite) {
        hadWriteTool = true;
        for (const changedFile of result.changedFiles) {
          toolChangedFiles.add(changedFile);
        }
      }
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        name: toolCall.function.name,
        content: result.content,
      });
      toolResultTexts.push(result.content);
    }

    if (hadWriteTool) {
      consecutiveReadRounds = 0;
    } else {
      // All tool calls in this round were read-only — increment the stall counter.
      consecutiveReadRounds++;
      readOnlyRounds++;
    }

    // Second-pass memory recall: if the model's content or any tool result
    // exposes a fresh error signal we haven't seen before, fetch memories
    // tailored to that error and append them as a system message. Fired
    // at most once per worker run — see didSecondaryRecall above.
    if (recallCtx && !didSecondaryRecall) {
      const errorSignal = detectErrorSignalForRecall(content, toolResultTexts);
      if (errorSignal) {
        didSecondaryRecall = true;
        const recall = await recallAndPrepareInject({
          agent: recallCtx.agent,
          role: recallCtx.role,
          task: {
            ...recallCtx.task,
            description:
              `${recallCtx.task.description ?? ""}\n\n## Encountered error signal\n${errorSignal.snippet}`.trim(),
          },
          projectRoot: recallCtx.projectRoot,
          kickoffId: recallCtx.kickoffId,
          layers: recallCtx.layers,
          tokenBudget: recallCtx.tokenBudget,
          excludeIds: Array.from(injectedIds),
          pass: "secondary",
        });
        if (recall.block) {
          for (const r of recall.active) {
            injectedIds.add(r.id);
            if (!primaryIds.has(r.id)) secondaryInjectedIds.push(r.id);
          }
          messages.push({
            role: "system",
            content:
              `## Memory · second-pass recall (failure-mode: ${errorSignal.mode})\n` +
              recall.block,
          });
        }
      }
    }
  }

  throw new Error(
    `Worker tool loop exceeded ${MAX_WORKER_TOOL_ITERATIONS} iterations without final code output.`,
  );
}

type CodegenAgentCompletionReason =
  | "status_done"
  | "task_complete"
  | "legacy_file_blocks"
  | "max_iterations";

type CodegenAgentSessionResult = {
  content: string;
  rawContent: string;
  model: string;
  costUsd: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  llmCalls: number;
  readOnlyRounds: number;
  writeToolCalls: number;
  changedFiles: string[];
  deletedFiles: string[];
  movedFiles: Array<{ from: string; to: string }>;
  completed: boolean;
  completionReason: CodegenAgentCompletionReason;
  secondaryInjectedIds: string[];
};

function hasTaskCompleteSignal(content: string): boolean {
  return (
    /<task_complete\s*\/?>/i.test(content) ||
    /<task_complete>\s*<\/task_complete>/i.test(content) ||
    content.includes(RALPH_COMPLETE_TOKEN)
  );
}

function compactToolMessageResult(result: WorkerToolExecutionResult): string {
  if (!result.isWrite) return result.content;
  const compacted = result.content.slice(
    0,
    CODEGEN_WRITE_TOOL_RESULT_MAX_CHARS,
  );
  return compacted.length < result.content.length
    ? `${compacted}\n... [write tool result truncated]`
    : compacted;
}

async function runCodegenAgentSession(
  messages: ChatMessage[],
  outputDir: string,
  task: CodingTask,
  sessionId?: string,
  workerLabel?: string,
  recallCtx?: SecondaryRecallContext,
  toolOptions?: { fsWriteOptions?: FsWriteOptions; taskId?: string },
  role?: CodingAgentRole,
  codingMode: CodingMode = "normal",
): Promise<CodegenAgentSessionResult> {
  // Frontend tasks use gpt-5.3-codex as primary for better UI fidelity.
  const codegenVariant = role === "frontend" ? "codeGenFrontend" : "codeGen";
    console.log('run task with role', role,'codegenVariant', codegenVariant)
  let totalCostUsd = 0;
  let promptTokens = 0;
  let completionTokens = 0;
  let totalTokens = 0;
  let llmCalls = 0;
  let readOnlyRounds = 0;
  let writeToolCalls = 0;
  let lastModel = "unknown";
  let lastContent = "";
  const rawParts: string[] = [];
  const changedFiles = new Set<string>();
  const deletedFiles = new Set<string>();
  const movedFiles: Array<{ from: string; to: string }> = [];
  const primaryIds = new Set(recallCtx?.primaryInjectedIds ?? []);
  const injectedIds = new Set(primaryIds);
  const secondaryInjectedIds: string[] = [];
  let didSecondaryRecall = false;

  for (let i = 0; i < CODEGEN_AGENT_MAX_ITERATIONS; i++) {
    const callStartedAt = Date.now();
    const heartbeat = setInterval(() => {
      const waitedSec = Math.floor((Date.now() - callStartedAt) / 1000);
      console.log(
        `[Worker] codegen agent still waiting... loop=${i + 1}/${CODEGEN_AGENT_MAX_ITERATIONS} waited=${waitedSec}s`,
      );
    }, WORKER_LLM_HEARTBEAT_MS);
    const response = await withLlmCallTimeout(
      () =>
        invokeCodegenOrOpenRouter(messages, {
          temperature: 0.3,
          max_tokens: MAX_OUTPUT_TOKENS,
          openRouterVariant: codegenVariant,
          codingMode,
          tools: WORKER_TOOLS,
          tool_choice: "auto",
          contextDump: {
            taskId: toolOptions?.taskId ?? task.id,
            iteration: i,
            sessionId,
            label: workerLabel,
            outputDir,
          },
        }),
      () => clearInterval(heartbeat),
      `task=${toolOptions?.taskId ?? task.id} loop=${i + 1}/${CODEGEN_AGENT_MAX_ITERATIONS}`,
    );

    const choice = response.choices[0];
    const finishReason = choice?.finish_reason ?? "stop";
    const content = choice?.message?.content ?? "";
    const toolCalls = choice?.message?.tool_calls ?? [];
    const usage = getResponseUsageCounts(response);
    const costUsd = estimateCost(response.model, response.usage);
    llmCalls += 1;
    totalCostUsd += costUsd;
    promptTokens += usage.promptTokens;
    completionTokens += usage.completionTokens;
    totalTokens += usage.totalTokens;
    lastModel = response.model;
    lastContent = content;
    rawParts.push(
      `\n\n<!-- agent-loop:${i + 1} model:${response.model} -->\n${content}`,
    );

    if (sessionId) {
      recordCodingSessionLlmUsage({
        sessionId,
        stage: "worker_codegen",
        label: workerLabel,
        model: response.model,
        costUsd,
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        totalTokens: usage.totalTokens,
      });
    }

    if (finishReason === "length") {
      throw new Error(
        `Worker codegen output truncated (finish_reason=length, model=${response.model})`,
      );
    }

    const reasoningContent = choice?.message?.reasoning_content;
    messages.push({
      role: "assistant",
      content,
      ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
      ...(reasoningContent ? { reasoning_content: reasoningContent } : {}),
    });

    if (toolCalls.length > 0) {
      const toolResultTexts: string[] = [];
      let hadWriteTool = false;
      for (const toolCall of toolCalls) {
        let args: Record<string, unknown>;
        try {
          args = JSON.parse(toolCall.function.arguments || "{}") as Record<
            string,
            unknown
          >;
        } catch {
          args = {};
        }
        const result = await executeWorkerTool(
          toolCall.function.name,
          args,
          outputDir,
          { ...toolOptions, workerLabel, sessionId, taskId: toolOptions?.taskId ?? task.id },
        );
        if (result.isWrite) {
          hadWriteTool = true;
          writeToolCalls += 1;
          for (const changedFile of result.changedFiles) {
            changedFiles.add(changedFile);
          }
          for (const deletedFile of result.deletedFiles) {
            deletedFiles.add(deletedFile);
          }
          movedFiles.push(...result.movedFiles);
        }
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
          content: compactToolMessageResult(result),
        });
        toolResultTexts.push(result.content);
      }

      if (!hadWriteTool) readOnlyRounds++;

      if (recallCtx && !didSecondaryRecall) {
        const errorSignal = detectErrorSignalForRecall(
          content,
          toolResultTexts,
        );
        if (errorSignal) {
          didSecondaryRecall = true;
          const recall = await recallAndPrepareInject({
            agent: recallCtx.agent,
            role: recallCtx.role,
            task: {
              ...recallCtx.task,
              description:
                `${recallCtx.task.description ?? ""}\n\n## Encountered error signal\n${errorSignal.snippet}`.trim(),
            },
            projectRoot: recallCtx.projectRoot,
            kickoffId: recallCtx.kickoffId,
            layers: recallCtx.layers,
            tokenBudget: recallCtx.tokenBudget,
            excludeIds: Array.from(injectedIds),
            pass: "secondary",
          });
          if (recall.block) {
            for (const r of recall.active) {
              injectedIds.add(r.id);
              if (!primaryIds.has(r.id)) secondaryInjectedIds.push(r.id);
            }
            messages.push({
              role: "system",
              content:
                `## Memory · second-pass recall (failure-mode: ${errorSignal.mode})\n` +
                recall.block,
            });
          }
        }
      }
      continue;
    }

    validateCodegenFileOutput(content);
    const parsedFiles = parseFileOutput(content);
    const parsedEntries = Object.entries(parsedFiles);
    for (const [fp, fc] of parsedEntries) {
      const msg = await fsWrite(fp, fc, outputDir, toolOptions?.fsWriteOptions);
      if (msg.startsWith("SKIPPED_PROTECTED") || msg.startsWith("REJECTED")) {
        console.log(`[Worker:${workerLabel ?? "worker"}] ${msg}`);
        continue;
      }
      changedFiles.add(fp);
      console.log(
        `[Worker:${workerLabel ?? "worker"}] legacy file block ${msg}`,
      );
    }

    const roundStatus = parseCodegenRoundStatus(content);
    const taskComplete = hasTaskCompleteSignal(content);
    const remainingCreates = getRemainingPlannedCreates(
      task,
      Array.from(changedFiles),
    );
    const hasWrites =
      changedFiles.size > 0 || deletedFiles.size > 0 || movedFiles.length > 0;

    if (
      (roundStatus === "done" || taskComplete || parsedEntries.length > 0) &&
      remainingCreates.length === 0 &&
      hasWrites
    ) {
      return {
        content,
        rawContent: rawParts.join(""),
        model: lastModel,
        costUsd: totalCostUsd,
        promptTokens,
        completionTokens,
        totalTokens,
        llmCalls,
        readOnlyRounds,
        writeToolCalls,
        changedFiles: Array.from(changedFiles),
        deletedFiles: Array.from(deletedFiles),
        movedFiles,
        completed: true,
        completionReason: taskComplete
          ? "task_complete"
          : roundStatus === "done"
            ? "status_done"
            : "legacy_file_blocks",
        secondaryInjectedIds,
      };
    }

    messages.push({
      role: "user",
      content: [
        "Continue this same task in the same agentic session.",
        remainingCreates.length > 0
          ? `You still MUST create or update these planned file(s):\n${remainingCreates.map((file) => `- ${file}`).join("\n")}`
          : "",
        "Use write_file for new/full-file changes and apply_patch for small edits.",
        "Do not just describe the work. Use tools to write the remaining changes.",
        "If the task is complete, respond exactly with STATUS: DONE.",
      ]
        .filter(Boolean)
        .join("\n"),
    });
  }

  return {
    content: lastContent,
    rawContent: rawParts.join(""),
    model: lastModel,
    costUsd: totalCostUsd,
    promptTokens,
    completionTokens,
    totalTokens,
    llmCalls,
    readOnlyRounds,
    writeToolCalls,
    changedFiles: Array.from(changedFiles),
    deletedFiles: Array.from(deletedFiles),
    movedFiles,
    completed: false,
    completionReason: "max_iterations",
    secondaryInjectedIds,
  };
}

/**
 * Scan model output and tool results for a fresh failure-mode signal. We
 * use the existing failure-mode classifier so the trigger language stays
 * consistent with the metric bucketing.
 *
 * Returns the first non-"unknown" mode + a short snippet for the prompt
 * augmentation, or null when nothing suspicious is present.
 */
export function detectErrorSignalForRecall(
  modelContent: string,
  toolResultTexts: string[],
): { mode: string; snippet: string } | null {
  const candidates: { source: "model" | "tool"; text: string }[] = [];
  if (modelContent) candidates.push({ source: "model", text: modelContent });
  for (const t of toolResultTexts) {
    if (t) candidates.push({ source: "tool", text: t });
  }

  for (const c of candidates) {
    const mode = classifyFailureMode(c.text);
    if (mode === "unknown") continue;
    // Keep the snippet short — enough to disambiguate the error in the
    // recall query but not so long it dominates the description.
    const snippet = c.text.slice(0, 400);
    return { mode, snippet };
  }
  return null;
}

interface MalformedFileBlock {
  filePath: string;
  headerLine: number;
  reason: string;
}

interface ParsedFileOutput {
  files: Record<string, string>;
  malformed: MalformedFileBlock[];
  /** Total number of file-block headers we encountered (valid + malformed). */
  headerCount: number;
}

/**
 * State-machine file-block parser.
 *
 * Accepts any of the following header forms (case-insensitive, tolerant
 * of leading whitespace):
 *   ```file:path/to/foo.ts
 *   ```ts file:path/to/foo.ts
 *   ```typescript file:path/to/foo.ts
 *   ````file:path/to/foo.ts      (4+ backticks)
 *
 * The closing fence must have the same run-length as the opener, which
 * lets file content itself contain nested triple-backtick fences without
 * confusing the parser.
 *
 * Any block that starts but never closes is recorded in `malformed` so the
 * caller can surface a structured repair event rather than silently
 * dropping file(s).
 */
function parseFileOutputRobust(raw: string): ParsedFileOutput {
  const out: ParsedFileOutput = { files: {}, malformed: [], headerCount: 0 };
  if (!raw) return out;

  const lines = raw.split("\n");
  // Match: optional leading whitespace, 3+ backticks, optional language word,
  // the literal `file:`, and then the path (no internal whitespace allowed).
  const HEADER = /^\s*(`{3,})\s*(?:[A-Za-z0-9_+-]+\s+)?file:(\S+?)\s*$/;

  for (let i = 0; i < lines.length; i++) {
    const m = HEADER.exec(lines[i]);
    if (!m) continue;
    out.headerCount += 1;

    const fence = m[1];
    const rawFilePath = m[2];
    const filePath = rawFilePath.trim();
    const headerLine = i + 1;

    if (!filePath || isUnsafePath(filePath)) {
      out.malformed.push({
        filePath: rawFilePath,
        headerLine,
        reason: filePath ? "unsafe path (absolute or traversal)" : "empty path",
      });
      // Skip this block entirely but keep scanning for later ones.
      const closer = findMatchingFence(lines, i + 1, fence);
      if (closer >= 0) i = closer;
      continue;
    }

    const closer = findMatchingFence(lines, i + 1, fence);
    if (closer < 0) {
      out.malformed.push({
        filePath,
        headerLine,
        reason: "unclosed fence — end of output reached before matching closer",
      });
      break;
    }
    const body = lines.slice(i + 1, closer).join("\n");
    out.files[filePath] = body;
    i = closer;
  }

  return out;
}

function findMatchingFence(
  lines: string[],
  startIdx: number,
  fence: string,
): number {
  const closer = new RegExp(`^\\s*${fence}\\s*$`);
  for (let j = startIdx; j < lines.length; j++) {
    if (closer.test(lines[j])) return j;
  }
  return -1;
}

function isUnsafePath(filePath: string): boolean {
  if (filePath.includes("..")) return true;
  if (/^[\\/]/.test(filePath)) return true;
  if (/^[A-Za-z]:[\\/]/.test(filePath)) return true;
  return false;
}

function parseFileOutput(raw: string): Record<string, string> {
  return parseFileOutputRobust(raw).files;
}

function validateCodegenFileOutput(raw: string): void {
  const parsed = parseFileOutputRobust(raw);
  if (parsed.headerCount === 0) return;

  const parsedCount = Object.keys(parsed.files).length;
  if (parsed.malformed.length > 0 || parsedCount < parsed.headerCount) {
    const reasons = parsed.malformed
      .map((m) => `${m.filePath}@L${m.headerLine}: ${m.reason}`)
      .slice(0, 5)
      .join("; ");
    throw new Error(
      `Incomplete file output detected: parsed ${parsedCount}/${parsed.headerCount} file block(s). ` +
        `Refusing to write partial content.${reasons ? " Issues: " + reasons : ""}`,
    );
  }
}

function parseFileBlocksFromContent(
  raw: string,
  _outputDir: string,
): { filePath: string; fileContent: string }[] {
  const parsed = parseFileOutput(raw);
  return Object.entries(parsed).map(([filePath, fileContent]) => ({
    filePath,
    fileContent,
  }));
}

const WORKER_TSC_VERIFY_PREFIX = "## TypeScript errors in task files";

function isWorkerTscVerifyError(verifyErrors: string): boolean {
  return verifyErrors.includes(WORKER_TSC_VERIFY_PREFIX);
}

/**
 * Extract exported names from TypeScript source for building export maps.
 * Catches: export function/const/class/type/interface/enum, export { }, export default.
 */
function extractExportNames(source: string): string[] {
  const names = new Set<string>();

  const namedExportRe =
    /export\s+(?:async\s+)?(?:function|const|let|var|class|type|interface|enum)\s+(\w+)/g;
  let m: RegExpExecArray | null;
  while ((m = namedExportRe.exec(source)) !== null) {
    names.add(m[1]);
  }

  const braceExportRe = /export\s*\{([^}]+)\}/g;
  while ((m = braceExportRe.exec(source)) !== null) {
    for (const item of m[1].split(",")) {
      const cleaned = item.replace(/\s+as\s+\w+/, "").trim();
      if (cleaned && /^\w+$/.test(cleaned)) names.add(cleaned);
    }
  }

  if (/export\s+default\s/.test(source)) names.add("default");

  return [...names];
}

function escapeRegex(raw: string): string {
  return raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function taskPatternToRegex(pattern: string): RegExp {
  const normalized = pattern.replace(/\\/g, "/").trim();
  const regex = "^" + escapeRegex(normalized).replace(/\\\*/g, ".*") + "$";
  return new RegExp(regex);
}

function matchesTaskPathHint(filePath: string, hint: string): boolean {
  const p = filePath.replace(/\\/g, "/");
  const h = hint.replace(/\\/g, "/").trim();
  if (!h) return false;
  if (h.includes("*")) return taskPatternToRegex(h).test(p);
  if (p === h) return true;
  if (p.endsWith(`/${h}`)) return true;
  return p.startsWith(`${h}/`);
}

function normalizeTaskFileHints(taskFiles: unknown): string[] {
  if (!taskFiles) return [];
  if (Array.isArray(taskFiles)) {
    return taskFiles.filter((f): f is string => typeof f === "string");
  }
  if (typeof taskFiles !== "object") return [];
  const record = taskFiles as Record<string, unknown>;
  const grouped = ["creates", "modifies", "reads"]
    .flatMap((k) => (Array.isArray(record[k]) ? (record[k] as unknown[]) : []))
    .filter((f): f is string => typeof f === "string");
  return grouped;
}

function getTaskFilePlanBuckets(taskFiles: unknown): {
  creates: string[];
  modifies: string[];
  reads: string[];
} {
  if (!taskFiles || typeof taskFiles !== "object" || Array.isArray(taskFiles)) {
    return { creates: [], modifies: [], reads: [] };
  }
  const record = taskFiles as Record<string, unknown>;
  const readBucket = (key: "creates" | "modifies" | "reads"): string[] =>
    Array.isArray(record[key])
      ? (record[key] as unknown[]).filter(
          (f): f is string => typeof f === "string",
        )
      : [];
  return {
    creates: readBucket("creates"),
    modifies: readBucket("modifies"),
    reads: readBucket("reads"),
  };
}

function formatTaskFileHints(taskFiles: unknown): string {
  if (!taskFiles) return "";
  if (Array.isArray(taskFiles)) {
    const rows = taskFiles.filter((f): f is string => typeof f === "string");
    if (rows.length === 0) return "";
    return `\nKey files to create/modify:\n${rows.map((f) => `- ${f}`).join("\n")}`;
  }
  if (typeof taskFiles !== "object") return "";
  const record = taskFiles as Record<string, unknown>;
  const creates = Array.isArray(record.creates)
    ? (record.creates as unknown[]).filter(
        (f): f is string => typeof f === "string",
      )
    : [];
  const modifies = Array.isArray(record.modifies)
    ? (record.modifies as unknown[]).filter(
        (f): f is string => typeof f === "string",
      )
    : [];
  const reads = Array.isArray(record.reads)
    ? (record.reads as unknown[]).filter(
        (f): f is string => typeof f === "string",
      )
    : [];
  const lines: string[] = [];
  if (creates.length > 0)
    lines.push(`Creates:\n${creates.map((f) => `- ${f}`).join("\n")}`);
  if (modifies.length > 0)
    lines.push(`Modifies:\n${modifies.map((f) => `- ${f}`).join("\n")}`);
  if (reads.length > 0)
    lines.push(`Reads:\n${reads.map((f) => `- ${f}`).join("\n")}`);
  return lines.length > 0 ? `\nTask file plan:\n${lines.join("\n")}` : "";
}

function getRemainingPlannedCreates(
  task: CodingTask,
  writtenFiles: string[],
): string[] {
  const { creates } = getTaskFilePlanBuckets(task.files);
  const writtenSet = new Set(
    writtenFiles.map((file) => file.replace(/\\/g, "/")),
  );
  return creates.filter((file) => !writtenSet.has(file.replace(/\\/g, "/")));
}

function scoreGeneratedFileForTask(
  file: GeneratedFile,
  task: CodingTask,
  workerRole: CodingAgentRole,
): number {
  const normalizedPath = file.path.replace(/\\/g, "/");
  const hints = normalizeTaskFileHints(task.files).map((f) =>
    f.replace(/\\/g, "/"),
  );
  let score = 0;

  for (const hint of hints) {
    if (normalizedPath === hint) {
      score += 1000;
      continue;
    }
    if (matchesTaskPathHint(normalizedPath, hint)) {
      score += 700;
    }
  }

  if (file.role === workerRole) score += 240;

  const basename = path.posix.basename(normalizedPath);
  if (
    normalizedPath === "frontend/src/api/client.ts" ||
    normalizedPath === "frontend/src/router.tsx" ||
    normalizedPath === "frontend/src/main.tsx" ||
    normalizedPath === "backend/src/app.ts" ||
    normalizedPath === "backend/src/server.ts" ||
    normalizedPath === "backend/src/api/modules/index.ts" ||
    normalizedPath === "packages/shared/src/index.ts" ||
    normalizedPath === "API_CONTRACTS.json" ||
    normalizedPath === "SCAFFOLD_SPEC.md"
  ) {
    score += 140;
  }

  if (basename === "index.ts" || basename === "index.tsx") score += 40;
  if (file.exports && file.exports.length > 0) score += 20;

  return score;
}

function buildGeneratedFileRegistryListing(
  state: WorkerState,
  task: CodingTask,
  limit = 30,
): string {
  const ranked = state.fileRegistrySnapshot
    .map((file, index) => ({
      file,
      index,
      score: scoreGeneratedFileForTask(file, task, state.role),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.index - a.index;
    })
    .slice(0, limit)
    .map(({ file }) => {
      const exportsNote =
        file.exports && file.exports.length > 0
          ? ` | exports: ${file.exports.slice(0, 8).join(", ")}`
          : "";
      return `- ${file.path} (${file.role}): ${file.summary}${exportsNote}`;
    });

  return ranked.join("\n");
}

function scoreCandidatePathForTask(
  normalizedPath: string,
  task: CodingTask,
  workerRole: CodingAgentRole,
  registryMeta?: GeneratedFile,
): number {
  if (registryMeta) {
    return scoreGeneratedFileForTask(registryMeta, task, workerRole);
  }

  const hints = normalizeTaskFileHints(task.files).map((f) =>
    f.replace(/\\/g, "/"),
  );
  let score = 0;

  for (const hint of hints) {
    if (normalizedPath === hint) {
      score += 1000;
      continue;
    }
    if (matchesTaskPathHint(normalizedPath, hint)) {
      score += 700;
    }
  }

  if (
    (workerRole === "frontend" && normalizedPath.startsWith("frontend/src/")) ||
    (workerRole === "backend" && normalizedPath.startsWith("backend/src/")) ||
    (workerRole === "architect" &&
      (normalizedPath.startsWith("packages/shared/") ||
        normalizedPath.endsWith("SCAFFOLD_SPEC.md") ||
        normalizedPath.endsWith("DEPENDENCY_PLAN.md"))) ||
    (workerRole === "test" &&
      (normalizedPath.includes("/e2e/") ||
        normalizedPath.includes(".spec.") ||
        normalizedPath.endsWith("playwright.config.ts")))
  ) {
    score += 240;
  }

  const basename = path.posix.basename(normalizedPath);
  if (
    normalizedPath === "frontend/src/api/client.ts" ||
    normalizedPath === "frontend/src/router.tsx" ||
    normalizedPath === "frontend/src/main.tsx" ||
    normalizedPath === "backend/src/app.ts" ||
    normalizedPath === "backend/src/server.ts" ||
    normalizedPath === "backend/src/api/modules/index.ts" ||
    normalizedPath === "packages/shared/src/index.ts" ||
    normalizedPath === "API_CONTRACTS.json" ||
    normalizedPath === "SCAFFOLD_SPEC.md" ||
    normalizedPath === "DEPENDENCY_PLAN.md"
  ) {
    score += 140;
  }

  if (basename === "index.ts" || basename === "index.tsx") score += 40;

  return score;
}

async function buildRelevantFileContext(
  state: WorkerState,
  task: CodingTask,
): Promise<string> {
  const hints = normalizeTaskFileHints(task.files).map((f) =>
    f.replace(/\\/g, "/"),
  );
  const candidates = new Set<string>();

  // 1) Direct hint matches from current registry.
  if (hints.length > 0) {
    for (const f of state.fileRegistrySnapshot) {
      const p = f.path.replace(/\\/g, "/");
      if (hints.some((h) => matchesTaskPathHint(p, h))) {
        candidates.add(p);
      }
    }
  }

  // 2) Prefer files created by same role in previous tasks (consistency).
  for (const f of state.fileRegistrySnapshot) {
    if (f.role === state.role) candidates.add(f.path.replace(/\\/g, "/"));
  }

  // 3) Dynamically discover shared/frontend/backend source files so agents
  //    see the current scaffold layout and don't hallucinate old paths.
  try {
    const sharedFiles = await listFiles("packages/shared/src", state.outputDir);
    for (const f of sharedFiles) {
      if (/\.(ts|tsx)$/.test(f)) candidates.add(f.replace(/\\/g, "/"));
    }
  } catch {
    // listFiles may throw if the directory doesn't exist
  }
  try {
    const frontendFiles = await listFiles("frontend/src", state.outputDir);
    for (const f of frontendFiles) {
      if (/\.(ts|tsx|css)$/.test(f)) candidates.add(f.replace(/\\/g, "/"));
    }
  } catch {
    // non-M-tier layouts may not have frontend/
  }
  try {
    const backendFiles = await listFiles("backend/src", state.outputDir);
    for (const f of backendFiles) {
      if (/\.(ts|tsx)$/.test(f)) candidates.add(f.replace(/\\/g, "/"));
    }
  } catch {
    // non-M-tier layouts may not have backend/
  }
  // Also add flat-layout shared files (non-src/) and key app files.
  [
    "packages/shared/schemas/auth.ts",
    "packages/shared/schemas/tasks.ts",
    "packages/shared/schemas/users.ts",
    "packages/shared/types/auth.ts",
    "packages/shared/types/tasks.ts",
    "packages/shared/types/users.ts",
    "packages/shared/src/index.ts",
    "frontend/package.json",
    "frontend/vite.config.ts",
    "frontend/tsconfig.json",
    "frontend/src/main.tsx",
    "frontend/src/router.tsx",
    "frontend/src/api/client.ts",
    "backend/package.json",
    "backend/src/app.ts",
    "backend/src/server.ts",
    "backend/src/api/modules/index.ts",
    "apps/web/src/lib/apiClient.ts",
    "apps/web/lib/api/auth.client.ts",
    "apps/api/src/routes/auth.ts",
    "API_CONTRACTS.json",
    "SCAFFOLD_SPEC.md",
    "DEPENDENCY_PLAN.md",
  ].forEach((p) => candidates.add(p));

  // RALPH Phase 4: prepend session context summary when context rotation is active
  const contextPreamble: string[] = [];
  if (state.ralphConfig.enabled && state.contextRotationNeeded) {
    const sessionCtx = await fsRead(
      ".ralph/session-context.md",
      state.outputDir,
    );
    if (
      !sessionCtx.startsWith("FILE_NOT_FOUND") &&
      !sessionCtx.startsWith("REJECTED")
    ) {
      contextPreamble.push(
        `## Prior session context (context rotation active)\n${sessionCtx.slice(0, 2000)}`,
      );
    }
  }

  // Build export map from key files so agents know exactly what is available
  const exportMapFiles = [
    "packages/shared/src/index.ts",
    "frontend/src/api/client.ts",
    "frontend/src/router.tsx",
    "frontend/src/main.tsx",
    "apps/web/src/lib/api.ts",
    "apps/web/src/lib/apiClient.ts",
    "apps/web/src/lib/auth.ts",
    "apps/web/src/contexts/AuthContext.tsx",
    "apps/web/src/App.tsx",
  ];
  const exportMapLines: string[] = [];
  for (const emf of exportMapFiles) {
    const emContent = await fsRead(emf, state.outputDir);
    if (
      emContent.startsWith("FILE_NOT_FOUND") ||
      emContent.startsWith("REJECTED")
    )
      continue;
    const exports = extractExportNames(emContent);
    if (exports.length > 0) {
      exportMapLines.push(`- \`${emf}\`: ${exports.join(", ")}`);
    }
  }
  if (exportMapLines.length > 0) {
    contextPreamble.push(
      `## Available exports (ONLY import what is listed here)\n${exportMapLines.join("\n")}`,
    );
  }

  // Larger projects carry more material, so scale how much file context we
  // inject by the project tier (read from the PRD badge — same source as the
  // coding API's resolveTier). L gets a bigger file count + byte budget; S the
  // smallest. Rotation still reduces the count to leave room for session ctx.
  let tier: ProjectTier = "M";
  try {
    const prdForTier = await fsRead("PRD.md", state.outputDir);
    if (
      !prdForTier.startsWith("FILE_NOT_FOUND") &&
      !prdForTier.startsWith("REJECTED")
    ) {
      tier = parseTierFromPrd(prdForTier) ?? "M";
    }
  } catch {
    /* default M */
  }
  const fileLimit =
    tier === "L"
      ? state.contextRotationNeeded
        ? 18
        : 28
      : state.contextRotationNeeded
        ? 12
        : 18;
  // Total byte budget across all injected files for this task. Owned files
  // (creates/modifies) are injected near-whole; reference files get a smaller
  // cap; discovered neighbours keep the legacy small cap. The budget caps the
  // sum so a large fan of candidates can't blow up the prompt.
  const totalBudget = tier === "L" ? 140_000 : tier === "S" ? 40_000 : 80_000;

  const registryByPath = new Map(
    state.fileRegistrySnapshot.map((file) => [
      file.path.replace(/\\/g, "/"),
      file,
    ]),
  );
  const selected = [...candidates]
    .map((candidate, index) => ({
      candidate,
      index,
      score: scoreCandidatePathForTask(
        candidate,
        task,
        state.role,
        registryByPath.get(candidate),
      ),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.index - b.index;
    })
    .slice(0, fileLimit)
    .map(({ candidate }) => candidate);

  // Classify each selected file by the role it plays in THIS task so we inject
  // the right amount: files the task owns (creates/modifies) get the full
  // OWNED cap (it edits them — a truncated view forces a re-read), files it
  // declares as reads get the REF cap, everything else keeps the small cap.
  const buckets = getTaskFilePlanBuckets(task.files);
  const ownedHints = [...buckets.creates, ...buckets.modifies].map((f) =>
    f.replace(/\\/g, "/"),
  );
  const readHints = buckets.reads.map((f) => f.replace(/\\/g, "/"));
  const matchesAnyHint = (rel: string, hints: string[]): boolean =>
    hints.some((h) => rel === h || matchesTaskPathHint(rel, h));
  const capForFile = (rel: string): number => {
    if (matchesAnyHint(rel, ownedHints)) return OWNED_FILE_INJECT_CAP;
    if (matchesAnyHint(rel, readHints)) return REF_FILE_INJECT_CAP;
    return rel.endsWith(".md") || rel.endsWith(".json") ? 1800 : 2200;
  };

  const chunks: string[] = [];
  let usedBudget = 0;
  let droppedForBudget = 0;
  for (const rel of selected) {
    const content = await fsRead(rel, state.outputDir);
    if (
      content.startsWith("FILE_NOT_FOUND") ||
      content.startsWith("REJECTED")
    ) {
      continue;
    }
    const remaining = totalBudget - usedBudget;
    if (remaining < 400) {
      droppedForBudget += 1;
      continue;
    }
    const cap = Math.min(capForFile(rel), remaining);
    const block = content.slice(0, cap);
    usedBudget += block.length;
    const truncated = block.length < content.length;
    const header = truncated
      ? `### ${rel} (truncated to ${block.length} chars — call read_file for the full file)`
      : `### ${rel}`;
    chunks.push(`${header}\n\`\`\`\n${block}\n\`\`\``);
  }
  if (droppedForBudget > 0) {
    console.log(
      `[worker-context] file-context budget (${totalBudget}B, tier ${tier}) exhausted — omitted ${droppedForBudget} lower-priority file(s); the agent can read_file them on demand.`,
    );
  }

  const allChunks = [...contextPreamble, ...chunks];
  if (allChunks.length === 0) return "";
  return `## Relevant existing files (read before coding)\n${allChunks.join("\n\n")}`;
}

// ─── Dynamic sub-step parsing ───

const PLAN_BLOCK_RE = /<plan>([\s\S]*?)<\/plan>/;

function parsePlanBlock(content: string): TaskSubStep[] {
  const match = PLAN_BLOCK_RE.exec(content);
  if (!match) return [];

  const planText = match[1].trim();
  const lines = planText.split("\n").filter((l) => l.trim().length > 0);

  return lines.map((line, idx) => {
    const cleanLine = line.replace(/^\d+[\.\)]\s*/, "").trim();
    const colonIdx = cleanLine.indexOf(":");
    const action =
      colonIdx > 0 ? cleanLine.slice(0, colonIdx).trim() : cleanLine;
    const detail = colonIdx > 0 ? cleanLine.slice(colonIdx + 1).trim() : "";
    return { step: idx + 1, action, detail };
  });
}

function parseCodegenRoundStatus(content: string): "done" | "continue" | null {
  const m = /STATUS:\s*(DONE|CONTINUE)/i.exec(content);
  if (!m) return null;
  return m[1].toUpperCase() === "DONE" ? "done" : "continue";
}

function parseTaskFilePlanFailureDetails(verifyErrors: string): {
  missingCreates: string[];
  unmodified: string[];
} {
  const parseList = (label: "missingCreates" | "unmodified"): string[] => {
    const match = new RegExp(`${label}=\\[([^\\]]*)\\]`).exec(verifyErrors);
    if (!match) return [];
    return match[1]
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  };
  return {
    missingCreates: parseList("missingCreates"),
    unmodified: parseList("unmodified"),
  };
}

// ─── RALPH helpers ───

/**
 * Checks whether the LLM output contains the RALPH completion promise.
 * When Ralph mode is disabled this is only informational (not enforced).
 */
export function extractCompletionPromise(content: string): {
  found: boolean;
  failed: boolean;
  reason?: string;
} {
  if (content.includes(RALPH_COMPLETE_TOKEN)) {
    return { found: true, failed: false };
  }
  const m = RALPH_FAILED_RE.exec(content);
  if (m) {
    return { found: true, failed: true, reason: m[1].trim() };
  }
  return { found: false, failed: false };
}

// ─── Node functions ───

async function pickNextTask(state: WorkerState) {
  const idx = state.currentTaskIndex;
  const total = state.tasks.length;
  const currentTask = idx < total ? state.tasks[idx] : null;
  if (currentTask) {
    console.log(
      `[Worker:${state.workerLabel}] Picking task ${idx + 1}/${total}: ${currentTask.title}`,
    );
  } else {
    console.log(`[Worker:${state.workerLabel}] All ${total} tasks done.`);
  }

  // Snapshot sha256 of the files the task plans to modify, so the post-gen
  // verifier can tell the difference between "LLM actually edited the file"
  // and "LLM said it would but didn't".
  const modifiesSnapshot = currentTask
    ? await snapshotModifiesFiles(currentTask, state.outputDir)
    : {};

  // Capture an on-disk rollback snapshot of everything the task plans to
  // touch. If the task fails after partial writes, `taskFailed` restores
  // the pre-task state — keeps a broken attempt from contaminating later
  // tasks or subsequent retries.
  if (currentTask) {
    await snapshotTask(currentTask, state.outputDir);
  }

  return {
    // Mirror role/workerLabel into the streamed update so the SSE event-mapper
    // knows the real role of this worker. The supervisor dispatches all of
    // backend / test / fullstack via the same `be_worker` node, so the node
    // name alone cannot identify the role — without this mirror a Test
    // Engineer worker would surface in the UI as a backend agent.
    role: state.role,
    workerLabel: state.workerLabel,
    verifyErrors: "",
    fixAttempts: 0,
    currentTaskRetryCount: 0,
    currentTaskLastError: "",
    currentTaskLastRawContent: "",
    currentTaskGeneratedFiles: [],
    currentTaskCostUsd: 0,
    currentTaskDurationMs: 0,
    currentTaskTokenUsage: {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    },
    currentTaskModifiesSnapshot: modifiesSnapshot,
    ...(currentTask
      ? {
          currentTaskId: currentTask.id,
          currentTaskTitle: currentTask.title,
          currentTaskPhase: currentTask.phase,
        }
      : {}),
  };
}

function shouldContinueOrEnd(state: WorkerState): string {
  if (state.currentTaskIndex >= state.tasks.length) return "__end__";
  return "generate_code";
}

function routeAfterGenerate(state: WorkerState): string {
  // Generation threw an exception — always retry up to the configured limit.
  if (state.currentTaskLastError) {
    const maxRetries = state.ralphConfig.enabled
      ? state.ralphConfig.maxIterationsPerTask - 1
      : MAX_TASK_GENERATION_RETRIES;
    if (state.currentTaskRetryCount <= maxRetries) return "generate_code";
    return "task_failed";
  }

  // In Ralph mode: require the completion promise before accepting the output.
  if (state.ralphConfig.enabled) {
    const promise = extractCompletionPromise(
      state.currentTaskLastRawContent ?? "",
    );
    if (promise.failed) {
      // LLM explicitly signalled failure — escalate immediately.
      return "task_failed";
    }
    if (!promise.found) {
      // Promise absent — treat as incomplete and retry.
      const maxRetries = state.ralphConfig.maxIterationsPerTask - 1;
      if (state.currentTaskRetryCount <= maxRetries) return "generate_code";
      return "task_failed";
    }
  }

  return "verify";
}

/**
 * Produce a compact structural snapshot of a value for debug logging.
 * Rules:
 *   - string  → first 10 chars + "…" (or full if <= 10)
 *   - number | boolean | null | undefined → as-is
 *   - Array   → "[N items]" header + each element expanded one level
 *   - object  → key: value pairs, each value recursed one more level
 * `depth` limits recursion (default 2) so deeply-nested objects don't explode.
 */
function snapshotValue(value: unknown, depth = 2): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    return value.length <= 10 ? value : `${value.slice(0, 10)}…`;
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    if (depth === 0) return `[${value.length} items]`;
    return {
      _length: value.length,
      ...(value.length > 0 ? { "[0]": snapshotValue(value[0], depth - 1) } : {}),
    };
  }
  if (typeof value === "object") {
    if (depth === 0) return "{…}";
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        snapshotValue(v, depth - 1),
      ]),
    );
  }
  return String(value).slice(0, 10);
}

const brief = (s: unknown, n = 50): string => {
  const str = typeof s === "string" ? s : JSON.stringify(s) ?? "";
  return str.length <= n ? str : `${str.slice(0, n)}… (${str.length} chars)`;
};

function logAgentContextSnapshot(state: WorkerState, taskTitle: string): void {
  console.log(
    `[Worker:${state.workerLabel}] ── AGENT CONTEXT SNAPSHOT ──\n` +
    `  role           : ${state.role}\n` +
    `  task           : ${taskTitle}\n` +
    `  tasks          : ${state.tasks.length} total, index=${state.currentTaskIndex}\n` +
    `  projectContext : ${brief(state.projectContext)}\n` +
    `  fileRegistry   : ${state.fileRegistrySnapshot?.length ?? 0} entries\n` +
    `  apiContracts   : ${state.apiContractsSnapshot?.length ?? 0} entries`,
  );
}

/**
 * Try to find a design-reference image whose pageHint matches the given task.
 * Matching is two-pass:
 *   1. PAGE-xxx ID match (most reliable — extracted from task title + description)
 *   2. Normalized page-name substring match (fallback)
 * Returns the first matching entry or undefined.
 */
function findTaskDesignReference(
  task: { title: string; description: string },
  refs: DesignReferenceEntry[],
): DesignReferenceEntry | undefined {
  const imageRefs = refs.filter((r) => r.kind === "image" && r.pageHint);
  if (imageRefs.length === 0) return undefined;

  const taskText = `${task.title} ${task.description}`;
  const pageIdMatches = taskText.match(/\bPAGE-\d+\b/gi);
  const taskPageIds = new Set(
    (pageIdMatches ?? []).map((s) => s.toUpperCase()),
  );

  if (taskPageIds.size > 0) {
    const found = imageRefs.find((r) => {
      const hint = r.pageHint.toUpperCase();
      return (
        taskPageIds.has(hint) ||
        [...taskPageIds].some((pid) => hint.includes(pid))
      );
    });
    if (found) return found;
  }

  // Name-based fallback: normalize both sides and check containment
  const titleNorm = task.title.toLowerCase().replace(/[-_\s]+/g, "");
  return imageRefs.find((r) => {
    const hintNorm = r.pageHint.toLowerCase().replace(/[-_\s]+/g, "");
    return (
      hintNorm.length >= 4 &&
      (titleNorm.includes(hintNorm) || hintNorm.includes(titleNorm.slice(0, 12)))
    );
  });
}

async function generateCode(state: WorkerState) {
  const task = state.tasks[state.currentTaskIndex];
  const attempt = state.currentTaskRetryCount + 1;

  try {
    console.log(
      `[Worker:${state.workerLabel}] Generating code for: "${task.title}" (attempt ${attempt}/${MAX_TASK_GENERATION_RETRIES + 1}) ...`,
    );
    logAgentContextSnapshot(state, task.title);

    const contextParts: string[] = [];

    // Always inject the convention card first so every worker has a concise
    // cheat-sheet of project-specific architectural facts before reading anything else.
    try {
      const conventionCard = await buildProjectConventionCard(state.outputDir);
      if (conventionCard) contextParts.push(conventionCard);
    } catch {
      // Non-fatal — missing card just means workers rely on context files alone.
    }

    if (state.projectContext) {
      // Trim the (potentially huge) projectContext down to a task-relevant
      // subset. Protections against info loss:
      //   1. Always-keep whitelist (shared/common/conventions/…)
      //   2. Force-include sections that mention task's FR/AC IDs
      //   3. Trim-marker at the bottom telling the worker to use
      //      read_file / grep if it needs details it doesn't see
      // See: src/lib/langgraph/worker-context-trim.ts
      const trimmed = trimProjectContextForTask(state.projectContext, {
        task,
        sessionId: state.sessionId,
        label: state.workerLabel,
      });
      contextParts.push(trimmed.content);
      if (trimmed.trimmed) {
        console.log(
          `[Worker:${state.workerLabel}] projectContext trimmed: ${trimmed.originalChars.toLocaleString()} -> ${trimmed.usedChars.toLocaleString()} chars (task=${task.id} "${task.title}")`,
        );
      }
    }
    // PrdSpec (PAGE-*/CMP-*) entries for this task — only useful for
    // frontend/test workers, but cheap to include for others too when the
    // task explicitly covers a page or component id.
    const prdSpecBlock = pickPrdSpecEntriesForTask(task, state.prdSpec);
    if (prdSpecBlock) {
      contextParts.push(prdSpecBlock);
    }
    if (state.fileRegistrySnapshot.length > 0) {
      const listing = buildGeneratedFileRegistryListing(state, task);
      contextParts.push(`## Already generated files\n${listing}`);
    }

    const skeletonFiles = state.fileRegistrySnapshot.filter(
      (f) =>
        f.role === "architect" &&
        f.summary.startsWith("Interface skeleton") &&
        /\.(ts|tsx)$/.test(f.path),
    );

    if (skeletonFiles.length > 0) {
      const skeletonContents: string[] = [];
      for (const sf of skeletonFiles.slice(0, 8)) {
        const content = await fsRead(sf.path, state.outputDir);
        if (!content.startsWith("FILE_NOT_FOUND")) {
          skeletonContents.push(
            `### ${sf.path}\n\`\`\`typescript\n${content.slice(0, 1500)}\n\`\`\``,
          );
        }
      }
      if (skeletonContents.length > 0) {
        contextParts.push(
          `## Interface contracts (implement these exactly — do not rename exports)\n${skeletonContents.join("\n\n")}`,
        );
      }
    }

    if (state.apiContractsSnapshot.length > 0) {
      const apis = state.apiContractsSnapshot
        .map((a) => {
          const parts = [
            `- **${a.method} ${a.endpoint}** [auth: ${a.authType ?? "none"}]`,
          ];
          if (a.requestFields && a.requestFields !== "none") {
            parts.push(`  - Request: \`${a.requestFields}\``);
          }
          if (a.responseFields && a.responseFields !== "none") {
            parts.push(`  - Response: \`${a.responseFields}\``);
          } else if (
            a.schema &&
            a.schema !== "extracted from source" &&
            a.schema !== "extracted by regex"
          ) {
            parts.push(`  - Schema: ${a.schema}`);
          }
          if (a.description) {
            parts.push(`  - ${a.description}`);
          }
          return parts.join("\n");
        })
        .join("\n");
      contextParts.push(
        `## Available API endpoints\n⚠️ Use ONLY these real endpoints. Do NOT use mock data or invent endpoints.\n${apis}`,
      );
    }

    const relevantFilesContext = await buildRelevantFileContext(state, task);
    if (relevantFilesContext) {
      contextParts.push(relevantFilesContext);
    }

    const versionConstraints = await buildVersionConstraints(state.outputDir);
    if (versionConstraints) {
      contextParts.push(versionConstraints);
    }

    const fileHint = formatTaskFileHints(task.files);

    const promptContext = await loadPromptContext(state.outputDir);
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: buildRolePrompt(state.role, promptContext),
      },
    ];
    if (contextParts.length > 0) {
      messages.push({
        role: "system",
        content: `## Project Context\n${contextParts.join("\n\n")}`,
      });
    }

    // Memory recall (Phase C-3): inject active failure-patterns matching
    // the current task. Layer 2 only — Layer 3 (shadow) is trace-logged
    // by recallAndPrepareInject but does NOT modify the prompt. The
    // helper itself respects MEMORY_ENABLED / MEMORY_INJECT flags and
    // never throws.
    const memoryRecall = await recallAndPrepareInject({
      agent: "worker_codegen",
      role: state.role,
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        files: Array.isArray(task.files) ? task.files : undefined,
      },
      projectRoot: state.outputDir,
      kickoffId: state.sessionId,
      layers: ["L1", "L2"],
      tokenBudget: getInjectTokenBudgetForRole(state.role),
    });
    if (memoryRecall.block) {
      messages.push({ role: "system", content: memoryRecall.block });
    }
    // Soft cite instruction — only when memory was actually injected so we
    // don't spend tokens on instructions for an empty feature. Missing cites
    // are fine; attribution falls back to "all injected" when none parse.
    const citeHint =
      memoryRecall.active.length > 0
        ? `\n\nIf any record from the <memory-context> block above directly informed your code, declare it before the <plan> tag using:\n  <memory-cite ids="FP-xxx,FP-yyy" />\nList only ids you actually used. Citing is optional but helps the system credit useful patterns.`
        : "";
    const subStepsHint =
      task.subSteps && task.subSteps.length > 0
        ? `\n\nPre-defined sub-steps:\n${task.subSteps.map((s) => `${s.step}. ${s.action}: ${s.detail}`).join("\n")}`
        : "";
    const tddPlanHint =
      task.tddPlan?.tests && task.tddPlan.tests.length > 0
        ? `\n\nTDD seed tests this implementation must satisfy:\n${task.tddPlan.tests
            .map(
              (test) =>
                `- ${test.id} [${test.priority}/${test.type}] ${test.file}\n  command: ${test.command}\n  RED: ${test.expectedRed}\n  GREEN: ${test.expectedGreen}\n  Write this test file before the production implementation when it is part of this task's file plan.`,
            )
            .join("\n")}`
        : "";

    const agenticInstruction = CODEGEN_AGENTIC_TOOLS_ENABLED
      ? `\n\nAGENTIC TOOL CODING MODE:\n- This is one task in one continuous agentic session.\n- Inspect only the files you need with read_file, read_many_files, list_files, or grep.\n- Create or fully replace files with write_file.\n- Use apply_patch for small edits to existing files.\n- Use delete_file or move_file only to remove duplicates or fix incorrect generated paths.\n- Tool results are authoritative and intentionally compact; do not echo full file contents in chat.\n- Do not output full file blocks unless tool writing fails; file blocks are legacy fallback only.\n- When all required files are written and acceptance criteria are met, respond with STATUS: DONE or <task_complete>.`
      : "";
    const multiRoundInstruction =
      !CODEGEN_AGENTIC_TOOLS_ENABLED && CODEGEN_MULTI_ROUND_ENABLED
        ? `\n\nMULTI-ROUND OUTPUT MODE:\n- In this round, output at most ${CODEGEN_FILE_BATCH_SIZE} file block(s) using \`\`\`file:path\`\`\` format.\n- Prefer continuing with files not yet generated in this task.\n- However, if any previously generated file needs correction, completion, API wiring, import/export alignment, consistency fixes, or error fixes, you SHOULD rewrite that file in this round.\n- Do NOT preserve an incorrect earlier version just to avoid rewriting.\n- If more files are still needed for this task, end your response with: STATUS: CONTINUE\n- If task implementation is complete, end your response with: STATUS: DONE`
        : "";

    const userTaskText = `## Task: ${task.title}\n\n${task.description}${fileHint}${subStepsHint}${tddPlanHint}\n\nFirst, output a brief implementation plan inside <plan> tags (one numbered step per line).\nThen generate code for this task.${agenticInstruction}${multiRoundInstruction}${citeHint}\n\nBefore writing, read and follow existing file contracts in context (imports, exports, naming, and paths). Extend existing modules instead of creating duplicate paths when possible. When context is insufficient, use the available tools (\`read_file\`, \`read_many_files\`, \`list_files\`, \`grep\`) to inspect the generated project before coding. Prefer \`write_file\` for new files or full-file rewrites. For small edits to existing generated files, prefer \`apply_patch\`; use \`delete_file\` or \`move_file\` only to remove duplicates or fix incorrect generated paths.\n\nACCEPTANCE CRITERIA:\n1. Every button has a real onClick handler that updates state or triggers navigation.\n2. Every form has onSubmit with validation logic.\n3. Every input/toggle/select is controlled with useState + onChange.\n4. Links navigate to real routes (React Router Link or useNavigate).\n5. Timer/counter/animation logic uses real useEffect + setInterval/setTimeout.\n6. If Design Tokens are in context, match every color, size, gap, padding, radius, and font exactly using Tailwind arbitrary values.\n7. [FRONTEND DATA RULE] If this task renders any list, table, card grid, or detail view that displays backend data: ALL data MUST be fetched from the real API endpoint via the API client. ZERO hardcoded arrays, ZERO mock objects, ZERO placeholder data. Use useEffect + loading/error state. Read \`frontend/src/api/client.ts\` with read_file before coding to get the correct method signatures.`;

    // ── Vision: inject matching design-reference image for frontend tasks ──────
    // When the user uploaded a per-page screenshot, read the mirrored copy from
    // `.design-references/` in the output tree and include it directly in the
    // first user message so the coding model can see the exact target layout.
    let injectedVisionImage = false;
    if (state.role === "frontend") {
      try {
        const refs = await readDesignReferencesFromOutput(state.outputDir);
        const matchedRef = findTaskDesignReference(task, refs);
        if (matchedRef) {
          const imgPath = path.join(
            state.outputDir,
            ".design-references",
            matchedRef.storedFileName,
          );
          const imgBytes = await nodeFs.readFile(imgPath);
          const b64 = imgBytes.toString("base64");
          const dataUrl = `data:${matchedRef.mime};base64,${b64}`;

          // Append CSS tokens to the task text when the matched reference has them.
          // Tokens are extracted from the source URL and represent the exact design-system
          // values (colours, spacing, fonts, radii) the user expects to be replicated.
          const cssTokenEntries = matchedRef.cssToken
            ? Object.entries(matchedRef.cssToken)
            : [];
          const cssTokenNote =
            cssTokenEntries.length > 0
              ? `\n\n## CSS Design Tokens for this page\nThe following tokens were extracted from the reference URL. Replicate every value exactly — use Tailwind arbitrary values (e.g. \`bg-[#6366f1]\`, \`gap-[8px]\`) or CSS custom properties. Do not approximate.\n\n${cssTokenEntries.map(([k, v]) => `- \`${k}\`: \`${v}\``).join("\n")}`
              : "";

          const visionMsg: VisionChatMessage = {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
              { type: "text", text: userTaskText + cssTokenNote },
            ],
          };
          messages.push(visionMsg as unknown as ChatMessage);
          injectedVisionImage = true;
          console.log(
            `[Worker:${state.workerLabel}] Vision image injected for task "${task.title}" → ref "${matchedRef.label || matchedRef.fileName}" (pageHint=${matchedRef.pageHint}${cssTokenEntries.length > 0 ? `, ${cssTokenEntries.length} CSS tokens` : ""})`,
          );
        }
      } catch (err) {
        console.warn(
          `[Worker:${state.workerLabel}] Failed to load design-reference image for task "${task.title}" (ignored):`,
          err instanceof Error ? err.message : err,
        );
      }
    }
    if (!injectedVisionImage) {
      messages.push({ role: "user", content: userTaskText });
    }

    const startMs = Date.now();
    const fsOpts =
      state.scaffoldProtectedPaths.length > 0
        ? { scaffoldProtectedPaths: state.scaffoldProtectedPaths }
        : undefined;

    const writtenFiles: string[] = [];
    const writtenSet = new Set<string>();
    const newFileEntries: GeneratedFile[] = [];
    let totalCostUsd = 0;
    let promptTokens = 0;
    let completionTokens = 0;
    let totalTokens = 0;
    let llmCalls = 0;
    let readOnlyRounds = 0;
    let aggregateRawContent = "";
    let rounds = 0;
    let lastModel = "unknown";
    const roundWritesByRound: number[] = [];
    const codegenMode = CODEGEN_AGENTIC_TOOLS_ENABLED
      ? "agentic-tools"
      : "multi-round";
    let writeToolCalls = 0;
    let deletedFileCount = 0;
    let movedFileCount = 0;
    let completionReason: string = "unknown";

    const secondaryRecallCtx: SecondaryRecallContext | undefined =
      memoryRecall.active.length > 0 || memoryRecall.shadow.length > 0
        ? {
            agent: "worker_codegen",
            role: state.role,
            task: {
              id: task.id,
              title: task.title,
              description: task.description,
              files: Array.isArray(task.files) ? task.files : undefined,
            },
            projectRoot: state.outputDir,
            kickoffId: state.sessionId,
            layers: ["L1", "L2"],
            primaryInjectedIds: memoryRecall.active.map((r) => r.id),
            tokenBudget: getInjectTokenBudgetForRole(state.role),
          }
        : undefined;

    if (CODEGEN_AGENTIC_TOOLS_ENABLED) {
      rounds += 1;
      const response = await runCodegenAgentSession(
        messages,
        state.outputDir,
        task,
        state.sessionId,
        state.workerLabel,
        secondaryRecallCtx,
        { fsWriteOptions: fsOpts, taskId: task.id },
        state.role,
        state.codingMode,
      );
      const content = response.content;
      totalCostUsd += response.costUsd;
      promptTokens += response.promptTokens;
      completionTokens += response.completionTokens;
      totalTokens += response.totalTokens;
      llmCalls += response.llmCalls;
      readOnlyRounds += response.readOnlyRounds;
      writeToolCalls += response.writeToolCalls;
      deletedFileCount += response.deletedFiles.length;
      movedFileCount += response.movedFiles.length;
      aggregateRawContent += response.rawContent;
      lastModel = response.model;
      completionReason = response.completionReason;

      // Parse cite tags emitted by the worker so attribution can credit
      // the specific patterns the model claims it used. Best-effort: never
      // throws, validates ids against the actual injected set so a
      // hallucinated id can't poison scoring.
      if (memoryRecall.active.length > 0) {
        const citedIds = parseMemoryCites(content);
        if (citedIds.length > 0) {
          const allInjected = [
            ...memoryRecall.active.map((r) => r.id),
            ...response.secondaryInjectedIds,
          ];
          await recordMemoryCites({
            traceRoot: state.outputDir,
            agent: "worker_codegen",
            kickoffId: state.sessionId,
            taskId: task.id,
            citedIds,
            injectedIds: allInjected,
          });
        }
      }

      for (const fp of response.changedFiles) {
        if (!writtenSet.has(fp)) {
          writtenSet.add(fp);
          writtenFiles.push(fp);
          newFileEntries.push({
            path: fp,
            role: state.role,
            summary: `Generated/updated via worker tool for task: ${task.title}`,
          });
        }
      }
      roundWritesByRound.push(response.changedFiles.length);
      if (!response.completed) {
        console.warn(
          `[Worker:${state.workerLabel}] Agentic codegen stopped without explicit completion (reason=${response.completionReason}).`,
        );
      }
    } else {
      // Snapshot the initial context length so we can trim round-accumulated
      // messages (tool results, assistant file blocks) between multi-rounds.
      // Without this, context grows from ~15 K → 80 K+ over 8 rounds.
      const initialMessagesLength = messages.length;

      while (rounds < CODEGEN_MULTI_ROUND_MAX_ROUNDS) {
        rounds += 1;
        const response = await runCodegenWorkerLoop(
          messages,
          state.outputDir,
          state.sessionId,
          state.workerLabel,
          secondaryRecallCtx,
          { fsWriteOptions: fsOpts, taskId: task.id },
          state.role,
          state.codingMode,
          injectedVisionImage,
        );
        const content = response.content;
        validateCodegenFileOutput(content);
        const parsedFiles = parseFileOutput(content);
        const roundStatus = parseCodegenRoundStatus(content);
        totalCostUsd += response.costUsd;
        promptTokens += response.promptTokens;
        completionTokens += response.completionTokens;
        totalTokens += response.totalTokens;
        llmCalls += response.llmCalls;
        readOnlyRounds += response.readOnlyRounds;
        aggregateRawContent +=
          `\n\n<!-- round:${rounds} model:${response.model} -->\n` +
          response.rawContent;
        lastModel = response.model;
        completionReason = roundStatus ?? "implicit_done";

        // Parse cite tags emitted by the worker so attribution can credit
        // the specific patterns the model claims it used. Best-effort: never
        // throws, validates ids against the actual injected set so a
        // hallucinated id can't poison scoring.
        if (memoryRecall.active.length > 0) {
          const citedIds = parseMemoryCites(content);
          if (citedIds.length > 0) {
            const allInjected = [
              ...memoryRecall.active.map((r) => r.id),
              ...response.secondaryInjectedIds,
            ];
            await recordMemoryCites({
              traceRoot: state.outputDir,
              agent: "worker_codegen",
              kickoffId: state.sessionId,
              taskId: task.id,
              citedIds,
              injectedIds: allInjected,
            });
          }
        }

        let roundWrites = 0;
        for (const fp of response.toolChangedFiles) {
          if (!writtenSet.has(fp)) {
            writtenSet.add(fp);
            writtenFiles.push(fp);
            newFileEntries.push({
              path: fp,
              role: state.role,
              summary: `Generated/updated via worker tool for task: ${task.title}`,
            });
          }
          roundWrites += 1;
        }
        for (const [fp, fc] of Object.entries(parsedFiles)) {
          const msg = await fsWrite(fp, fc, state.outputDir, fsOpts);
          if (msg.startsWith("SKIPPED_PROTECTED")) {
            console.log(`[Worker:${state.workerLabel}] ${msg}`);
            continue;
          }
          if (!writtenSet.has(fp)) {
            writtenSet.add(fp);
            writtenFiles.push(fp);
          }
          newFileEntries.push({
            path: fp,
            role: state.role,
            summary: `Generated for task: ${task.title}`,
          });
          roundWrites += 1;
        }

        console.log(
          `[Worker:${state.workerLabel}] codegen round ${rounds}/${CODEGEN_MULTI_ROUND_MAX_ROUNDS}: wrote ${roundWrites} file(s), status=${roundStatus ?? "implicit_done"}, model=${response.model}`,
        );
        roundWritesByRound.push(roundWrites);

        const remainingCreates = getRemainingPlannedCreates(task, writtenFiles);
        const forcedContinue =
          CODEGEN_MULTI_ROUND_ENABLED &&
          remainingCreates.length > 0 &&
          rounds < CODEGEN_MULTI_ROUND_MAX_ROUNDS;
        if (forcedContinue && roundStatus !== "continue") {
          console.warn(
            `[Worker:${state.workerLabel}] codegen round ${rounds}: file plan still missing ${remainingCreates.length} create(s); overriding ${roundStatus ?? "implicit_done"} -> continue.`,
          );
        }
        const shouldContinue =
          CODEGEN_MULTI_ROUND_ENABLED &&
          (roundStatus === "continue" || forcedContinue) &&
          rounds < CODEGEN_MULTI_ROUND_MAX_ROUNDS;
        if (!shouldContinue) break;

        const knownFiles = writtenFiles
          .slice(-40)
          .map((f) => `- ${f}`)
          .join("\n");
        // Compress messages accumulated during this round back to the initial
        // context snapshot.  This prevents the prompt from growing linearly
        // with the number of rounds (15 K → 80 K+).  All tool call results and
        // large assistant file-block messages are dropped; the continuation
        // message below re-injects the file list so the model retains awareness
        // of what has already been written.
        messages.splice(initialMessagesLength);
        messages.push({
          role: "user",
          content: [
            "Continue with the next batch of files for this SAME task.",
            `Output at most ${CODEGEN_FILE_BATCH_SIZE} file block(s) in this round.`,
            "Prefer files not yet generated in this task.",
            "If any previously generated file is incomplete, inconsistent, miswired, or needs correction, rewrite it in this round.",
            "Do not preserve an incorrect earlier version just to avoid rewriting.",
            remainingCreates.length > 0
              ? `You still MUST create these planned file(s) before finishing:\n${remainingCreates.map((file) => `- ${file}`).join("\n")}`
              : "",
            "End with STATUS: CONTINUE or STATUS: DONE.",
            "",
            knownFiles ? `Already generated files:\n${knownFiles}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
        });
      }
    }
    const durationMs = Date.now() - startMs;

    console.log(
      `[Worker:${state.workerLabel}] Generated ${writtenFiles.length} files in ${(durationMs / 1000).toFixed(1)}s (mode=${codegenMode}, rounds=${rounds}, model=${lastModel}, cost: $${totalCostUsd.toFixed(4)})`,
    );
    const totalRoundWrites = roundWritesByRound.reduce(
      (sum, count) => sum + count,
      0,
    );
    console.log(
      `[Worker:${state.workerLabel}] Codegen metrics task="${task.title}" mode=${codegenMode} llmCalls=${llmCalls} promptTokens=${promptTokens} completionTokens=${completionTokens} totalTokens=${totalTokens} readOnlyRounds=${readOnlyRounds} writeToolCalls=${writeToolCalls} roundWrites=${totalRoundWrites} roundWritesByRound=[${roundWritesByRound.join(",")}] deletedFiles=${deletedFileCount} movedFiles=${movedFileCount} durationSec=${(durationMs / 1000).toFixed(1)} model=${lastModel} completion=${completionReason}`,
    );

    // RALPH: check for missing promise and log a warning (enforcement happens in routeAfterGenerate)
    if (state.ralphConfig.enabled) {
      const promise = extractCompletionPromise(aggregateRawContent);
      if (!promise.found) {
        console.warn(
          `[Worker:${state.workerLabel}] RALPH: completion promise absent for "${task.title}" (attempt ${attempt})`,
        );
      }
    }

    // Parse dynamic sub-steps from the LLM output
    const dynamicSubSteps = parsePlanBlock(aggregateRawContent);
    if (dynamicSubSteps.length > 0) {
      console.log(
        `[Worker:${state.workerLabel}] Parsed ${dynamicSubSteps.length} dynamic sub-step(s) for "${task.title}"`,
      );
    }

    // RALPH Phase 4: accumulate context tokens for rotation detection
    const contextRotationNeeded =
      state.ralphConfig.enabled &&
      state.ralphConfig.contextRotationThreshold > 0 &&
      state.estimatedContextTokens + promptTokens >
        state.ralphConfig.contextRotationThreshold * MAX_CONTEXT_TOKENS;

    return {
      generatedFiles: newFileEntries,
      currentTaskGeneratedFiles: writtenFiles,
      currentTaskCostUsd: totalCostUsd,
      currentTaskDurationMs: durationMs,
      currentTaskTokenUsage: {
        promptTokens,
        completionTokens,
        totalTokens,
      },
      workerCostUsd: totalCostUsd,
      verifyErrors: "",
      fixAttempts: 0,
      currentTaskLastError: "",
      currentTaskLastRawContent: aggregateRawContent,
      currentTaskSubSteps: dynamicSubSteps,
      // Accumulate for context-rotation tracking (additive reducer)
      estimatedContextTokens: promptTokens,
      contextRotationNeeded,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const retryCount = state.currentTaskRetryCount + 1;
    console.warn(
      `[Worker:${state.workerLabel}] Task "${task.title}" generation failed (attempt ${retryCount}/${MAX_TASK_GENERATION_RETRIES + 1}): ${message}`,
    );
    return {
      currentTaskRetryCount: retryCount,
      currentTaskLastError: message.slice(0, 2000),
      currentTaskLastRawContent: "",
    };
  }
}

// ─── Verify helpers: error classification + auto dep install ───
// Exported for use by supervisor's integration verify/fix.

export interface TscErrorClassification {
  missingDeps: string[];
  crossRefErrors: string[];
  realErrors: string[];
  hasMissingDeps: boolean;
  hasCrossRefOnly: boolean;
  hasRealErrors: boolean;
}

export function classifyTscErrors(output: string): TscErrorClassification {
  const lines = output.split("\n").filter((l) => l.includes("error TS"));

  const missingDeps: string[] = [];
  const crossRefErrors: string[] = [];
  const realErrors: string[] = [];

  for (const line of lines) {
    if (
      line.includes("Cannot find module") ||
      line.includes("Could not find a declaration file")
    ) {
      const moduleMatch = line.match(/['"]([^'"]+)['"]/);
      const modulePath = moduleMatch?.[1] ?? "";
      if (
        modulePath.startsWith(".") ||
        modulePath.startsWith("/") ||
        isPathAlias(modulePath)
      ) {
        crossRefErrors.push(line);
      } else {
        missingDeps.push(line);
      }
    } else if (line.includes("Cannot find name")) {
      if (
        /describe|it\b|expect|test\b|beforeEach|afterEach|afterAll|beforeAll|vi\b/.test(
          line,
        )
      ) {
        missingDeps.push(line);
      } else if (
        /toBeInTheDocument|toHaveTextContent|toBeVisible|toBeDisabled|toHaveClass|toHaveStyle|toBeChecked|toHaveFocus/.test(
          line,
        )
      ) {
        missingDeps.push(line);
      } else {
        realErrors.push(line);
      }
    } else {
      realErrors.push(line);
    }
  }

  return {
    missingDeps,
    crossRefErrors,
    realErrors,
    hasMissingDeps: missingDeps.length > 0,
    hasCrossRefOnly:
      crossRefErrors.length > 0 &&
      realErrors.length === 0 &&
      missingDeps.length === 0,
    hasRealErrors: realErrors.length > 0,
  };
}

export function isPathAlias(specifier: string): boolean {
  return (
    specifier.startsWith("@/") ||
    specifier.startsWith("~/") ||
    specifier.startsWith("#/")
  );
}

export function extractMissingPackages(tscOutput: string): string[] {
  const pkgs = new Set<string>();
  const moduleRe = /Cannot find module ['"]([^'"]+)['"]/g;
  let m;
  while ((m = moduleRe.exec(tscOutput)) !== null) {
    const mod = m[1];
    if (mod.startsWith(".") || mod.startsWith("/")) continue;
    if (isPathAlias(mod)) continue;
    const pkg = mod.startsWith("@")
      ? mod.split("/").slice(0, 2).join("/")
      : mod.split("/")[0];
    pkgs.add(pkg);
  }
  const declRe =
    /Could not find a declaration file for module ['"]([^'"]+)['"]/g;
  while ((m = declRe.exec(tscOutput)) !== null) {
    const mod = m[1];
    if (mod.startsWith(".") || mod.startsWith("/")) continue;
    if (isPathAlias(mod)) continue;
    const pkg = mod.startsWith("@")
      ? mod.split("/").slice(0, 2).join("/")
      : mod.split("/")[0];
    pkgs.add(`@types/${pkg.replace(/^@/, "").replace(/\//, "__")}`);
  }
  if (
    /Cannot find name.*(describe|it\b|expect|test\b|beforeEach|afterEach|afterAll|beforeAll|vi)\b/.test(
      tscOutput,
    )
  ) {
    pkgs.add("vitest");
  }
  if (
    /toBeInTheDocument|toHaveTextContent|toBeVisible|toBeDisabled|toHaveClass/.test(
      tscOutput,
    )
  ) {
    pkgs.add("@testing-library/jest-dom");
  }
  return [...pkgs].filter(isAutoInstallableNpmPackageName);
}

export async function installMissingDeps(
  tscOutput: string,
  outputDir: string,
  options?: { scaffoldProtectedPaths?: string[] },
): Promise<void> {
  const pkgs = extractMissingPackages(tscOutput);
  const toolOpts =
    options?.scaffoldProtectedPaths && options.scaffoldProtectedPaths.length > 0
      ? {
          scaffoldProtectedPaths: options.scaffoldProtectedPaths,
          forceProtectedOverwrite: true,
        }
      : undefined;

  const needsJestDom = /toBeInTheDocument|toHaveTextContent|toBeVisible/.test(
    tscOutput,
  );

  if (needsJestDom) {
    pkgs.push("@testing-library/jest-dom");
    const setupPath = "src/test/setup.ts";
    const existingSetup = await fsRead(setupPath, outputDir);
    if (existingSetup.startsWith("FILE_NOT_FOUND")) {
      await fsWrite(
        setupPath,
        `import '@testing-library/jest-dom';\n`,
        outputDir,
        toolOpts,
      );
      console.log(`[Verify] Created test setup file: ${setupPath}`);

      const vitestConfig = await fsRead("vitest.config.ts", outputDir);
      if (
        !vitestConfig.startsWith("FILE_NOT_FOUND") &&
        !vitestConfig.includes("setupFiles")
      ) {
        const updated = vitestConfig.replace(
          /test:\s*\{/,
          `test: {\n    setupFiles: ['./src/test/setup.ts'],`,
        );
        if (updated !== vitestConfig) {
          await fsWrite("vitest.config.ts", updated, outputDir, toolOpts);
          console.log(`[Verify] Updated vitest.config.ts with setupFiles`);
        }
      }
    }
  }

  const unique = [...new Set(pkgs)];
  if (unique.length === 0) return;
  console.log(
    `[Verify] Installing ${unique.length} missing package(s): ${unique.join(", ")}`,
  );
  const pm = await detectPackageManager(outputDir);
  await shellExec(buildAddCommand(pm, unique), outputDir, { timeout: 60_000 });
}

export async function findBestTsconfigForFiles(
  taskFiles: string[],
  outputDir: string,
): Promise<string | null> {
  if (taskFiles.length === 0) return null;

  const dirs = new Set(
    taskFiles
      .map((f) => f.split("/").slice(0, -1).join("/"))
      .filter((d) => d.length > 0),
  );

  const commonPrefix =
    dirs.size === 1
      ? [...dirs][0]
      : taskFiles[0]
          .split("/")
          .slice(0, -1)
          .reduce((prefix, part, i) => {
            if (taskFiles.every((f) => f.split("/")[i] === part)) {
              return prefix ? `${prefix}/${part}` : part;
            }
            return prefix;
          }, "");

  const parts = commonPrefix ? commonPrefix.split("/") : [];
  for (let i = parts.length; i >= 1; i--) {
    const candidate = parts.slice(0, i).join("/") + "/tsconfig.json";
    const content = await fsRead(candidate, outputDir);
    if (
      !content.startsWith("FILE_NOT_FOUND") &&
      !content.startsWith("REJECTED")
    ) {
      return candidate;
    }
  }

  return null;
}

// ─── Verify node: file presence/safety only; project `tsc` runs in supervisor phase verify ───

async function verifyCode(state: WorkerState) {
  const task = state.tasks[state.currentTaskIndex];

  // Scope to the current task's outputs. Phase-level verify (Supervisor) still
  // handles cross-task integration after all workers finish.
  const taskFiles =
    state.currentTaskGeneratedFiles.length > 0
      ? state.currentTaskGeneratedFiles
      : state.generatedFiles
          .filter((f) => f.role === state.role)
          .map((f) => f.path);

  if (taskFiles.length === 0) {
    console.log(
      `[Worker:${state.workerLabel}] Verify: no files generated for "${task.title}" — marking as warning`,
    );
    return {
      verifyErrors: `No files generated for task: ${task.title}`,
      fixAttempts: state.fixAttempts,
    };
  }

  const issues: string[] = [];

  for (const filePath of taskFiles) {
    const normalizedPath = path.normalize(filePath);
    if (path.isAbsolute(normalizedPath) || normalizedPath.includes("..")) {
      issues.push(`Unsafe path rejected: ${filePath}`);
      continue;
    }

    const content = await fsRead(filePath, state.outputDir);
    if (content.startsWith("FILE_NOT_FOUND")) {
      issues.push(`File not found after write: ${filePath}`);
      continue;
    }
  }

  if (issues.length > 0) {
    const errorMsg = issues.join("\n");
    console.log(
      `[Worker:${state.workerLabel}] Verify FAILED (pre-tsc) for "${task.title}":\n${errorMsg}`,
    );
    return {
      verifyErrors: errorMsg,
      fixAttempts: state.fixAttempts,
    };
  }

  // P0-B: task file-plan completeness. If the task promised to create file
  // `A.ts` or modify `B.ts` and neither shows up in the generated-files list
  // (and the `modifies` hash is unchanged), this run is incomplete. Surface
  // a structured error so `routeAfterVerify` can route back to `task_fix`.
  const planResult = await verifyTaskFilePlan(
    task,
    state.currentTaskGeneratedFiles,
    state.currentTaskModifiesSnapshot ?? {},
    state.outputDir,
  );
  if (!planResult.passed) {
    const msg = formatUnfulfilledMessage(planResult);
    console.log(
      `[Worker:${state.workerLabel}] Verify FAILED (file plan) for "${task.title}": ${msg}`,
    );
    getRepairEmitter(state.sessionId)({
      stage: "worker-verify",
      event: "task_plan_unfulfilled",
      taskId: task.id,
      files: [...planResult.missingCreates, ...planResult.unmodified],
      details: {
        missingCreates: planResult.missingCreates,
        unmodified: planResult.unmodified,
        fixAttempts: state.fixAttempts,
      },
    });
    return {
      verifyErrors: msg,
      fixAttempts: state.fixAttempts,
    };
  }

  // Non-blocking: a planned `modifies` file the worker didn't touch. The
  // requirement is usually satisfied via other files; surface it for
  // visibility (console + repair-log → coding-session-report) but do NOT fail
  // the task or trigger the fix loop.
  if (planResult.unmodified.length > 0) {
    console.log(
      `[Worker:${state.workerLabel}] file-plan warning (non-blocking) for "${task.title}": ${planResult.unmodified.length} predicted-modify file(s) left untouched — ${planResult.unmodified.slice(0, 8).join(", ")}${planResult.unmodified.length > 8 ? " …" : ""}`,
    );
    getRepairEmitter(state.sessionId)({
      stage: "worker-verify",
      event: "task_plan_unmodified",
      taskId: task.id,
      files: planResult.unmodified,
      details: { unmodified: planResult.unmodified },
    });
  }

  const tsFiles = taskFiles.filter((f) => /\.(ts|tsx)$/.test(f));
  if (tsFiles.length === 0) {
    console.log(
      `[Worker:${state.workerLabel}] No TypeScript files in task — skip compile check for "${task.title}"`,
    );
    return { verifyErrors: "", fixAttempts: state.fixAttempts };
  }

  console.log(
    `[Worker:${state.workerLabel}] Task output OK for "${task.title}" (${tsFiles.length} TS file(s)) — per-task tsc disabled; project-wide tsc runs in supervisor verify.`,
  );

  return { verifyErrors: "", fixAttempts: state.fixAttempts };
}

function isWorkerFixEligibleError(verifyErrors: string): boolean {
  if (!verifyErrors) return false;
  if (isWorkerTscVerifyError(verifyErrors)) return true;
  if (TASK_FILE_PLAN_UNFULFILLED_REGEX.test(verifyErrors)) return true;
  return false;
}

function routeAfterVerify(state: WorkerState): string {
  if (!state.verifyErrors) return "task_done";
  // P0-C: file-plan failures (TASK_FILE_PLAN_UNFULFILLED) are now fixable
  // alongside TypeScript errors. Other verify errors still fall through to
  // `task_done` with warnings (unchanged legacy behaviour).
  if (!isWorkerFixEligibleError(state.verifyErrors)) return "task_done";
  const cfg = getWorkerTscFixConfig();
  const maxFix = state.ralphConfig.enabled
    ? Math.min(
        state.ralphConfig.maxIterationsPerTask,
        cfg.maxFixAttemptsRalphCap,
      )
    : cfg.maxFixAttempts;
  if (state.fixAttempts >= maxFix) {
    console.log(
      `[Worker:${state.workerLabel}] Per-task fix: max attempts (${maxFix}) reached, continuing with warnings.`,
    );
    return "task_done";
  }
  return "task_fix";
}

function logCodeFixErrorDetail(
  workerLabel: string,
  taskId: string,
  taskTitle: string,
  verifyErrors: string,
): void {
  const body = verifyErrors
    .replace(new RegExp(`^${WORKER_TSC_VERIFY_PREFIX}\\s*`, "m"), "")
    .trim();
  const lines = body.split("\n").filter((l) => l.length > 0);
  console.log(
    `[Worker:${workerLabel}] codeFix: task=${taskId} "${taskTitle.slice(0, 80)}" — ` +
      `repairing ${lines.length} tsc error line(s) (per-task TypeScript check).`,
  );
  console.log(
    `[Worker:${workerLabel}] codeFix: tsc detail (first 4000 chars):\n${body.slice(0, 4000)}`,
  );
}

async function taskFix(state: WorkerState) {
  const task = state.tasks[state.currentTaskIndex];
  const attempt = state.fixAttempts + 1;
  const cfg = getWorkerTscFixConfig();
  const isFilePlanFix = TASK_FILE_PLAN_UNFULFILLED_REGEX.test(
    state.verifyErrors,
  );
  const fixKind = isFilePlanFix ? "file-plan" : "tsc";
  console.log(
    `[Worker:${state.workerLabel}] Per-task ${fixKind} fix attempt ${attempt} for "${task.title}"...`,
  );
  console.log(
    `[Worker:${state.workerLabel}] codeFix env: WORKER_TSC_FIX_MAX_ATTEMPTS=${cfg.maxFixAttempts}, WORKER_TSC_FIX_MAX_ATTEMPTS_RALPH_CAP=${cfg.maxFixAttemptsRalphCap}, WORKER_TSC_ERROR_CONTEXT_MAX_CHARS=${cfg.errorContextMaxChars}`,
  );

  if (!isFilePlanFix) {
    logCodeFixErrorDetail(
      state.workerLabel,
      task.id,
      task.title,
      state.verifyErrors,
    );
  } else {
    console.log(
      `[Worker:${state.workerLabel}] codeFix: task=${task.id} — file-plan unfulfilled, asking LLM to produce the missing artefacts.`,
    );
  }

  const filePlanDetails = isFilePlanFix
    ? parseTaskFilePlanFailureDetails(state.verifyErrors)
    : { missingCreates: [], unmodified: [] };
  const planBuckets = getTaskFilePlanBuckets(task.files);
  const taskFiles = isFilePlanFix
    ? [
        ...new Set([
          ...state.currentTaskGeneratedFiles,
          ...filePlanDetails.unmodified,
          ...planBuckets.modifies,
          ...planBuckets.reads,
        ]),
      ]
    : state.currentTaskGeneratedFiles;
  // For file-plan fixes, we explicitly handle the case of "no generated files
  // yet" — the fix is literally to produce them. Only short-circuit when we
  // have neither files nor a task plan to satisfy.
  if (taskFiles.length === 0 && !isFilePlanFix) {
    console.warn(
      `[Worker:${state.workerLabel}] codeFix: skip LLM — no currentTaskGeneratedFiles for task ${task.id}.`,
    );
    return { fixAttempts: attempt, verifyErrors: state.verifyErrors };
  }

  console.log(
    `[Worker:${state.workerLabel}] codeFix: task files in scope (${taskFiles.length}): ${taskFiles.slice(0, 12).join(", ")}${taskFiles.length > 12 ? " …" : ""}`,
  );
  if (isFilePlanFix) {
    console.log(
      `[Worker:${state.workerLabel}] codeFix: missing creates (${filePlanDetails.missingCreates.length}): ${filePlanDetails.missingCreates.slice(0, 12).join(", ")}${filePlanDetails.missingCreates.length > 12 ? " …" : ""}`,
    );
  }

  const alreadyRead = new Set<string>();
  const fileContents: string[] = [];

  for (const filePath of taskFiles.slice(0, 8)) {
    alreadyRead.add(filePath);
    const content = await fsRead(filePath, state.outputDir);
    if (
      !content.startsWith("FILE_NOT_FOUND") &&
      !content.startsWith("REJECTED")
    ) {
      fileContents.push(
        `### ${filePath}\n\`\`\`\n${content.slice(0, 3000)}\n\`\`\``,
      );
    }
  }

  const errorFilePattern = /([^\s:(]+\.(?:tsx?|jsx?|json))\(/g;
  const mentionedInErrors = new Set<string>();
  let em: RegExpExecArray | null;
  while ((em = errorFilePattern.exec(state.verifyErrors)) !== null) {
    const f = em[1].replace(/\\/g, "/");
    if (!f.includes("node_modules")) mentionedInErrors.add(f);
  }
  for (const ef of [...mentionedInErrors].slice(0, 4)) {
    if (alreadyRead.has(ef)) continue;
    alreadyRead.add(ef);
    const content = await fsRead(ef, state.outputDir);
    if (
      !content.startsWith("FILE_NOT_FOUND") &&
      !content.startsWith("REJECTED")
    ) {
      fileContents.push(
        `### ${ef} (referenced in errors — read-only context)\n\`\`\`\n${content.slice(0, 1500)}\n\`\`\``,
      );
    }
  }

  const configFiles = await inferRelatedConfigFiles(
    state.verifyErrors,
    state.outputDir,
    taskFiles,
  );
  for (const cf of configFiles.slice(0, 3)) {
    if (alreadyRead.has(cf)) continue;
    alreadyRead.add(cf);
    const content = await fsRead(cf, state.outputDir);
    if (
      !content.startsWith("FILE_NOT_FOUND") &&
      !content.startsWith("REJECTED")
    ) {
      fileContents.push(`### ${cf}\n\`\`\`\n${content.slice(0, 1500)}\n\`\`\``);
    }
  }

  const versionConstraints = await buildVersionConstraints(state.outputDir);

  const overrideModelChainRaw = process.env.CODEFIX_MODEL_CHAIN?.trim() ?? "";
  const overrideModelChain = overrideModelChainRaw
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const codeFixChain =
    overrideModelChain.length > 0
      ? resolveModelChain(overrideModelChain, resolveModel)
      : resolveModelChain(
          resolveCodingModelConfigValue(state.codingMode, "codeFix"),
          resolveModel,
        );
  if (overrideModelChain.length > 0) {
    console.log(
      `[Worker:${state.workerLabel}] codeFix: using CODEFIX_MODEL_CHAIN override (${overrideModelChainRaw})`,
    );
  }
  console.log(
    `[Worker:${state.workerLabel}] codeFix: model chain (fallback order): ${codeFixChain.join(" -> ")}`,
  );
  const ctxPaths = [
    ...[...mentionedInErrors].slice(0, 4),
    ...configFiles.slice(0, 3),
  ].filter((p, i, a) => a.indexOf(p) === i);
  if (ctxPaths.length > 0) {
    console.log(
      `[Worker:${state.workerLabel}] codeFix: extra context paths: ${ctxPaths.join(", ")}`,
    );
  }

  const filePlanInstruction = isFilePlanFix
    ? [
        "You are completing an incomplete coding task. The previous attempt did NOT",
        "produce every file the task promised. Your job is to EMIT THE MISSING FILES",
        "and/or MODIFY the files that should have been edited, so the task plan is",
        "fully satisfied.",
        "",
        "Output ONLY the required file(s) using ```file:path/to/file``` blocks.",
        "For a `missingCreates` entry, write the full new file from scratch.",
        "For an `unmodified` entry, read its current contents from the context below",
        "and emit the full updated file (never diffs).",
        "Do NOT drop functionality that already exists in other files.",
        "Do NOT add explanations outside the file blocks.",
      ].join("\n")
    : [
        "You are a TypeScript fix specialist. Fix the errors shown below.",
        "Output ONLY the corrected file(s) using ```file:path/to/file``` blocks.",
        "Do NOT remove existing functionality. Only fix the errors.",
        "Do NOT add explanations or markdown outside the file blocks.",
        "Files marked '(referenced in errors — read-only context)' are for reference only; do NOT rewrite them.",
      ].join("\n");

  const userHeader = isFilePlanFix
    ? `## Task file plan not yet fulfilled (attempt ${attempt})`
    : `## Errors (attempt ${attempt})`;

  const filePlanBlock = isFilePlanFix
    ? [
        "### Task metadata",
        `- id: ${task.id}`,
        `- title: ${task.title}`,
        task.description ? `- description: ${task.description}` : "",
        filePlanDetails.missingCreates.length > 0
          ? `- missingCreates:\n${filePlanDetails.missingCreates.map((file) => `  - ${file}`).join("\n")}`
          : "",
        filePlanDetails.unmodified.length > 0
          ? `- unmodified:\n${filePlanDetails.unmodified.map((file) => `  - ${file}`).join("\n")}`
          : "",
        formatTaskFileHints(task.files),
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: filePlanInstruction,
    },
    {
      role: "user",
      content: [
        userHeader,
        "```",
        state.verifyErrors.slice(0, cfg.errorContextMaxChars),
        "```",
        "",
        filePlanBlock,
        "",
        versionConstraints
          ? `## Installed package versions (use these APIs)\n${versionConstraints}\n`
          : "",
        "## Current file contents",
        ...fileContents,
      ]
        .filter(Boolean)
        .join("\n"),
    },
  ];

  try {
    const response = await chatCompletionWithFallback(messages, codeFixChain, {
      temperature: 0.2,
      max_tokens: MAX_OUTPUT_TOKENS,
      forceOpenRouter: shouldForceOpenRouterForCodingMode(state.codingMode),
    });

    const content = response.choices[0]?.message?.content ?? "";
    const costUsd = estimateCost(response.model, response.usage);
    const usage = getResponseUsageCounts(response);
    recordCodingSessionLlmUsage({
      sessionId: state.sessionId,
      stage: "worker_codefix",
      label: state.workerLabel,
      model: response.model,
      costUsd,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
    });

    const fixedFiles = parseFileBlocksFromContent(content, state.outputDir);
    if (fixedFiles.length === 0) {
      console.warn(
        `[Worker:${state.workerLabel}] codeFix: model=${response.model} returned no file: code blocks — nothing written.`,
      );
    } else {
      const paths = fixedFiles.map((f) => f.filePath);
      console.log(
        `[Worker:${state.workerLabel}] codeFix: applying patches to ${fixedFiles.length} file(s): ${paths.join(", ")}`,
      );
    }
    for (const { filePath, fileContent } of fixedFiles) {
      await fsWrite(filePath, fileContent, state.outputDir, {
        scaffoldProtectedPaths: state.scaffoldProtectedPaths,
      });
    }

    const mergedTaskFiles = [
      ...new Set([
        ...state.currentTaskGeneratedFiles,
        ...fixedFiles.map((f) => f.filePath),
      ]),
    ];

    console.log(
      `[Worker:${state.workerLabel}] codeFix: done attempt ${attempt} — wrote ${fixedFiles.length} file(s), model=${response.model}, cost=$${costUsd.toFixed(4)}; will re-run tsc in verify.`,
    );

    return {
      fixAttempts: attempt,
      verifyErrors: "",
      currentTaskGeneratedFiles: mergedTaskFiles,
      currentTaskCostUsd: state.currentTaskCostUsd + costUsd,
      workerCostUsd: costUsd,
    };
  } catch (e) {
    console.warn(
      `[Worker:${state.workerLabel}] Per-task tsc fix failed: ${e instanceof Error ? e.message : String(e)}`,
    );
    return { fixAttempts: attempt, verifyErrors: state.verifyErrors };
  }
}

async function taskDone(state: WorkerState) {
  const task = state.tasks[state.currentTaskIndex];
  console.log(
    `[Worker:${state.workerLabel}] Task done: "${task.title}" (${state.currentTaskIndex + 1}/${state.tasks.length})`,
  );
  const filesForTask = state.currentTaskGeneratedFiles;

  // Discard the rollback snapshot — task was accepted, its changes are the
  // new source of truth.
  await discardTaskSnapshot(task, state.outputDir);
  getRepairEmitter(state.sessionId)({
    stage: "task",
    event: "snapshot_cleaned",
    taskId: task.id,
  });

  // ── RALPH Phase 4: context rotation — write session-context.md when threshold hit ──
  if (state.ralphConfig.enabled && state.contextRotationNeeded) {
    const tracker = new ProgressTracker(state.outputDir);
    const completedTasks = state.taskResults;
    const recentFiles = state.generatedFiles
      .slice(-20)
      .map((f) => `- ${f.path} (${f.role}): ${f.summary}`)
      .join("\n");
    const contextSummary = [
      `# Session Context (auto-generated for context rotation)`,
      `> Worker: ${state.workerLabel} | Role: ${state.role}`,
      `> Rotation triggered at ~${state.estimatedContextTokens.toLocaleString()} context tokens`,
      ``,
      `## Tasks completed so far (${completedTasks.length})`,
      completedTasks
        .map(
          (r) =>
            `- ${r.taskId}: ${r.status} (${r.generatedFiles.length} files)`,
        )
        .join("\n"),
      ``,
      `## Recently generated files (last 20)`,
      recentFiles,
    ].join("\n");
    try {
      await tracker.writeSessionContext(contextSummary);
      console.log(
        `[Worker:${state.workerLabel}] RALPH: context rotation triggered — session-context.md written.`,
      );
    } catch (e) {
      console.warn(
        `[Worker:${state.workerLabel}] RALPH: failed to write session context: ${e}`,
      );
    }
  }

  // ── RALPH Phase 3: persist progress + optional git commit ──────────────────
  let commitHash: string | undefined;
  if (state.ralphConfig.enabled) {
    const tracker = new ProgressTracker(state.outputDir);
    try {
      if (state.ralphConfig.enableGitCommits) {
        // Ensure git is initialised (no-op if already a repo)
        await shellExec("git init", state.outputDir, { timeout: 10_000 });
        // Stage all generated files for this task
        if (filesForTask.length > 0) {
          const filePaths = filesForTask.map((f) => `"${f}"`).join(" ");
          await shellExec(`git add ${filePaths}`, state.outputDir, {
            timeout: 15_000,
          });
        }
        const msg = `feat(agent): complete ${task.id}: ${task.title.slice(0, 72)}`;
        const commitOut = await shellExec(
          `git commit -m "${msg.replace(/"/g, "'")}" --allow-empty`,
          state.outputDir,
          { timeout: 20_000 },
        );
        const commitOutText = (
          commitOut.stdout ||
          commitOut.stderr ||
          ""
        ).trim();
        const hashMatch = /\[[\w/]+ ([a-f0-9]{7,})\]/.exec(commitOutText);
        commitHash = hashMatch?.[1];
        if (commitHash) {
          console.log(
            `[Worker:${state.workerLabel}] RALPH: committed ${task.id} → ${commitHash}`,
          );
        }
      }
      await tracker.markComplete(task.id, filesForTask, commitHash);
      await tracker.addCost(state.currentTaskCostUsd);
    } catch (e) {
      // Progress tracking / git errors must never abort the pipeline
      console.warn(
        `[Worker:${state.workerLabel}] RALPH progress write failed: ${e}`,
      );
    }
  }

  const result: TaskResult = {
    taskId: task.id,
    status: state.verifyErrors ? "completed_with_warnings" : "completed",
    generatedFiles: filesForTask,
    costUsd: state.currentTaskCostUsd,
    durationMs: state.currentTaskDurationMs,
    tokenUsage: state.currentTaskTokenUsage,
    verifyPassed: !state.verifyErrors,
    fixCycles: state.fixAttempts,
    warnings: state.verifyErrors
      ? [state.verifyErrors.slice(0, 8000)]
      : undefined,
    subSteps:
      state.currentTaskSubSteps.length > 0
        ? state.currentTaskSubSteps
        : undefined,
  };

  return {
    role: state.role,
    workerLabel: state.workerLabel,
    taskResults: [result],
    fileRegistrySnapshot: state.generatedFiles,
    currentTaskIndex: state.currentTaskIndex + 1,
    verifyErrors: "",
    fixAttempts: 0,
    currentTaskGeneratedFiles: [],
    currentTaskCostUsd: 0,
    currentTaskDurationMs: 0,
    currentTaskTokenUsage: {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    },
    currentTaskRetryCount: 0,
    currentTaskLastError: "",
    currentTaskLastRawContent: "",
    currentTaskSubSteps: [],
  };
}

async function taskFailed(state: WorkerState) {
  const task = state.tasks[state.currentTaskIndex];
  const failureMsg =
    state.currentTaskLastError ||
    "Task generation failed after retries. No additional error details.";
  console.warn(
    `[Worker:${state.workerLabel}] Task failed after retries: "${task.title}" (${state.currentTaskRetryCount}/${MAX_TASK_GENERATION_RETRIES + 1})`,
  );

  // Roll everything the task touched back to its pre-task state. This
  // guarantees a partial failure never leaves broken half-files behind to
  // break later tasks or downstream verify passes.
  try {
    const rollback = await restoreTask(task, state.outputDir);
    getRepairEmitter(state.sessionId)({
      stage: "task",
      event: "snapshot_restored",
      taskId: task.id,
      files: [
        ...rollback.restored,
        ...rollback.deleted.map((f) => `deleted:${f}`),
      ],
      details: {
        restored: rollback.restored.length,
        deleted: rollback.deleted.length,
        skipped: rollback.skipped.length,
      },
    });
  } catch (err) {
    console.warn(
      `[Worker:${state.workerLabel}] Task snapshot restore failed:`,
      err instanceof Error ? err.message : err,
    );
  }

  // ── RALPH Phase 3: persist failure in progress files ───────────────────────
  if (state.ralphConfig.enabled) {
    const tracker = new ProgressTracker(state.outputDir);
    try {
      await tracker.markFailed(task.id, failureMsg);
      await tracker.recordError(
        task.id,
        state.currentTaskRetryCount,
        failureMsg,
      );
    } catch (e) {
      console.warn(
        `[Worker:${state.workerLabel}] RALPH progress write failed: ${e}`,
      );
    }
  }

  const result: TaskResult = {
    taskId: task.id,
    status: "failed",
    generatedFiles: state.currentTaskGeneratedFiles,
    costUsd: state.currentTaskCostUsd,
    durationMs: state.currentTaskDurationMs,
    tokenUsage: state.currentTaskTokenUsage,
    verifyPassed: false,
    fixCycles: state.currentTaskRetryCount,
    warnings: [failureMsg.slice(0, 500)],
  };

  return {
    role: state.role,
    workerLabel: state.workerLabel,
    taskResults: [result],
    fileRegistrySnapshot: state.generatedFiles,
    currentTaskIndex: state.currentTaskIndex + 1,
    verifyErrors: "",
    fixAttempts: 0,
    currentTaskGeneratedFiles: [],
    currentTaskCostUsd: 0,
    currentTaskDurationMs: 0,
    currentTaskTokenUsage: {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    },
    currentTaskRetryCount: 0,
    currentTaskLastError: "",
    currentTaskLastRawContent: "",
  };
}

export function extractErrorFiles(stderr: string): string[] {
  const fileSet = new Set<string>();
  const regex = /([^\s(]+\.tsx?)\(\d+,\d+\):/g;
  let match;
  while ((match = regex.exec(stderr)) !== null) {
    fileSet.add(match[1]);
  }
  return [...fileSet];
}

const CONFIG_ERROR_PATTERNS: {
  pattern: RegExp;
  configFiles: string[];
}[] = [
  {
    pattern: /TS17004|TS1484|--jsx/,
    configFiles: ["tsconfig.json", "tsconfig.node.json", "tsconfig.app.json"],
  },
  {
    pattern: /TS5023|TS5024|TS6046/,
    configFiles: ["tsconfig.json", "tsconfig.node.json"],
  },
  {
    pattern: /TS2307.*Cannot find module/,
    configFiles: ["package.json", "tsconfig.json"],
  },
];

export async function inferRelatedConfigFiles(
  errors: string,
  outputDir: string,
  taskFiles: string[],
): Promise<string[]> {
  const candidates = new Set<string>();

  for (const { pattern, configFiles } of CONFIG_ERROR_PATTERNS) {
    if (pattern.test(errors)) {
      for (const cf of configFiles) candidates.add(cf);
    }
  }

  candidates.add("package.json");

  const taskDirs = new Set(
    taskFiles
      .map((f) => f.split("/").slice(0, -1).join("/"))
      .filter((d) => d.length > 0),
  );

  for (const dir of taskDirs) {
    candidates.add(`${dir}/tsconfig.json`);
    candidates.add(`${dir}/package.json`);
    const parts = dir.split("/");
    for (let i = 1; i < parts.length; i++) {
      const parent = parts.slice(0, i).join("/");
      candidates.add(`${parent}/tsconfig.json`);
      candidates.add(`${parent}/package.json`);
    }
  }

  const found: string[] = [];
  for (const candidate of candidates) {
    const content = await fsRead(candidate, outputDir);
    if (
      !content.startsWith("FILE_NOT_FOUND") &&
      !content.startsWith("REJECTED")
    ) {
      found.push(candidate);
    }
  }
  return found;
}

export function hasConfigErrors(errors: string): boolean {
  return /TS17004|TS1484|TS5023|TS5024|TS6046|--jsx/.test(errors);
}

// ─── Build the subgraph ───

export function createWorkerSubGraph() {
  const graph = new StateGraph(WorkerStateAnnotation)
    .addNode("pick_next_task", pickNextTask)
    .addNode("generate_code", generateCode)
    .addNode("verify", verifyCode)
    .addNode("task_fix", taskFix)
    .addNode("task_done", taskDone)
    .addNode("task_failed", taskFailed)

    .addEdge(START, "pick_next_task")
    .addConditionalEdges("pick_next_task", shouldContinueOrEnd, {
      generate_code: "generate_code",
      __end__: END,
    })
    .addConditionalEdges("generate_code", routeAfterGenerate, {
      generate_code: "generate_code",
      verify: "verify",
      task_failed: "task_failed",
    })
    .addConditionalEdges("verify", routeAfterVerify, {
      task_done: "task_done",
      task_fix: "task_fix",
      task_failed: "task_failed",
    })
    .addEdge("task_fix", "verify")
    .addEdge("task_done", "pick_next_task")
    .addEdge("task_failed", "pick_next_task");

  return graph.compile();
}
