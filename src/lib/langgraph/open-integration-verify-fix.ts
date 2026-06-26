/**
 * Open integration verify + fix node (high-autonomy, design-driven variant).
 *
 * This is the DEFAULT integration-fix implementation, running in parallel to
 * the legacy `integrationVerifyAndFix` (selected by `INTEGRATION_FIX_MODE`).
 *
 * Design philosophy — the OPPOSITE of the legacy micro-managed loop:
 *   - A strong model (claude-opus-4.8 by default), pinned independently of
 *     `codingMode` and routed straight through OpenRouter (no DeepSeek bypass).
 *   - The model is handed the AUTHORITATIVE spec — the PRD and the page/design
 *     references (screenshot vision descriptions + Stitch UI + design spec) —
 *     and asked to continue refactoring the existing code so the product works:
 *     every page renders (no 404s), frontend↔backend flows are connected.
 *   - Only the MOST GENERIC tools (bash / read / write / grep / patch / move /
 *     delete / report_done). NO `run_validation_suite`, no `tdd_status`, no
 *     `read_artifact` — the model decides for itself how to inspect and verify.
 *   - E2E tests, unit tests, TDD evidence and `.ralph/*` audits are REFERENCE
 *     MATERIAL (code context) the model may read with the generic tools, NOT
 *     pass/fail gates.
 *   - `report_done` is a PURE model self-decision. The system does not re-run
 *     any objective gate to override it.
 *   - NO procedural stagnation penalties whatsoever. The ONLY loop safety bound
 *     is the cumulative iteration budget circuit-breaker (shared with legacy).
 *   - Layered context compression sized for a 200k-context strong model.
 *
 * It honours the same node contract as the legacy node — returns
 * { integrationErrors, integrationFixAttempts, totalCostUsd } — so the graph
 * routing and circuit-breaker are agnostic to which implementation runs.
 */

import fs from "fs/promises";
import path from "path";

import type { SupervisorState } from "./state";
import type {
  ChatMessage,
  OpenRouterResponse,
  OpenRouterToolDefinition,
} from "@/lib/llm-types";
import {
  chatCompletionWithFallback,
  estimateCost,
  resolveModel,
} from "@/lib/openrouter";
import {
  DEEPSEEK_V4_DEFAULT_MODEL,
  isDeepSeekV4Provider,
} from "@/lib/providers/deepseek-v4";
import { resolveModelChain } from "@/lib/model-config";
import {
  scaledIntegrationVerifyFixTotalBudget,
  remainingIntegrationVerifyBudget,
} from "./supervisor/config";
import { SUPERVISOR_VERIFY_TOOLS } from "./supervisor/verify-tools/definitions";
import { executeSupervisorTool } from "./supervisor/verify-tools/executor";
import { buildIntegrationReasoningOptions } from "./supervisor/verify-tools/command-classifier";
import { isSuccessfulSupervisorToolResult } from "./supervisor/verify-tools/scoped-validation";
import {
  compactChatMessagesSemantically,
  truncateOldLargeToolResults,
} from "./conversation-semantic-compact";
import { supersedeStaleReadResults } from "./worker-tool-history-compaction";
import { isContextLengthError } from "./supervisor/shared/llm-call";
import { pickRelevantSections } from "./doc-section-picker";
import { detectPackageManager, fsRead } from "./tools";
import { getRepairEmitter } from "@/lib/pipeline/self-heal";
import { recordUnresolvedProblem } from "@/lib/pipeline/unresolved-problems";
import { recordSupervisorLlmUsage } from "./supervisor/usage-tracking";
import { BUILD_FAILED_MARKER_REL } from "@/lib/pipeline/build-quarantine";

const LABEL = "[Supervisor] OpenIntegrationFix";
const OPEN_INTEGRATION_DEFAULT_MODEL = "claude-opus-4.8";

/**
 * DEBUG: route this stage straight to the directly-connected DeepSeek V4 Pro
 * (api.deepseek.com) instead of the OpenRouter strong-model chain.
 *
 * OFF by default — this stage runs claude-opus-4.8 via OpenRouter. Opt into the
 * DeepSeek-direct debug path with `INTEGRATION_VERIFY_FIX_USE_DEEPSEEK_DIRECT=1`
 * (still requires `DEEPSEEK_API_KEY`, the direct provider's own precondition).
 */
function useDeepSeekDirect(): boolean {
  const flag = (process.env.INTEGRATION_VERIFY_FIX_USE_DEEPSEEK_DIRECT ?? "0")
    .trim()
    .toLowerCase();
  const enabled = flag === "1" || flag === "true";
  return enabled && isDeepSeekV4Provider();
}

// ── Generic tool surface ─────────────────────────────────────────────────────
// Only the most generic primitives are exposed. The validation/audit helpers
// (run_validation_suite, tdd_status, read_artifact) are intentionally removed —
// the model inspects, runs and verifies things itself with bash/read/grep and
// decides done-ness on its own judgment.
const OPEN_INTEGRATION_EXCLUDED_TOOLS = new Set([
  "run_validation_suite",
  "tdd_status",
  "read_artifact",
]);

const OPEN_INTEGRATION_TOOLS: OpenRouterToolDefinition[] =
  SUPERVISOR_VERIFY_TOOLS.filter(
    (t) => !OPEN_INTEGRATION_EXCLUDED_TOOLS.has(t.function.name),
  ).map((t) =>
    t.function.name === "report_done"
      ? {
          ...t,
          function: {
            ...t.function,
            description:
              "Signal that the integration pass is complete. status='pass' when, in your expert judgment, the product's main user flows work end-to-end against the PRD + design (pages render, no 404s, frontend↔backend connected). status='fail' when a real blocker remains that you cannot resolve (cite the file/line). Your decision is final — no automated gate re-checks it.",
          },
        }
      : t,
  );

// ── Env knobs (all optional; sensible strong-model defaults) ─────────────────

/**
 * Verbose stage logging. ON by default for this debug-oriented stage so the
 * key nodes (model calls, context compression, tool execution) are traceable
 * in the server console. Set INTEGRATION_FIX_DEBUG=0 to silence.
 */
const DEBUG_ENABLED =
  (process.env.INTEGRATION_FIX_DEBUG ?? "1").trim().toLowerCase() !== "0" &&
  (process.env.INTEGRATION_FIX_DEBUG ?? "1").trim().toLowerCase() !== "false";

function dbg(msg: string): void {
  if (DEBUG_ENABLED) console.log(`${LABEL} [debug] ${msg}`);
}

/** One-line snapshot of the conversation size for compaction tracing. */
function conversationStats(messages: ChatMessage[]): string {
  let contentChars = 0;
  let toolCallChars = 0;
  let toolMsgs = 0;
  let assistantMsgs = 0;
  for (const m of messages) {
    contentChars += typeof m.content === "string" ? m.content.length : 0;
    for (const c of m.tool_calls ?? []) {
      toolCallChars += (c.function?.arguments ?? "").length;
    }
    if (m.role === "tool") toolMsgs += 1;
    if (m.role === "assistant") assistantMsgs += 1;
  }
  const totalChars = contentChars + toolCallChars;
  return `msgs=${messages.length} (assistant=${assistantMsgs}, tool=${toolMsgs}) chars=${totalChars} (content=${contentChars}, toolArgs=${toolCallChars}) ~tokens=${Math.round(totalChars / 4)}`;
}

function readMaxIterations(): number {
  const raw = Number(
    process.env.INTEGRATION_VERIFY_FIX_MAX_ITERATIONS ?? "500",
  );
  if (!Number.isFinite(raw)) return 500;
  return Math.max(20, Math.min(1000, Math.floor(raw)));
}

function readContextTokens(): number {
  const raw = Number(
    process.env.INTEGRATION_VERIFY_FIX_CONTEXT_TOKENS ?? "200000",
  );
  if (!Number.isFinite(raw) || raw <= 0) return 200000;
  return Math.floor(raw);
}

function readCompactRatio(): number {
  const raw = Number(process.env.INTEGRATION_VERIFY_FIX_COMPACT_RATIO ?? "0.7");
  if (!Number.isFinite(raw) || raw <= 0 || raw >= 1) return 0.7;
  return raw;
}

function readCompactCooldown(): number {
  const raw = Number(
    process.env.INTEGRATION_VERIFY_FIX_COMPACT_COOLDOWN ?? "3",
  );
  if (!Number.isFinite(raw) || raw < 0) return 3;
  return Math.floor(raw);
}

function readKeepTail(): number {
  const raw = Number(process.env.INTEGRATION_VERIFY_FIX_KEEP_TAIL ?? "12");
  if (!Number.isFinite(raw) || raw < 4) return 12;
  return Math.floor(raw);
}

function readRecentFullRounds(): number {
  const raw = Number(
    process.env.INTEGRATION_VERIFY_FIX_RECENT_FULL_ROUNDS ?? "3",
  );
  if (!Number.isFinite(raw) || raw < 1) return 3;
  return Math.floor(raw);
}

/**
 * Per-`bash` timeout for this stage. Integration-fix often runs full test
 * suites (vitest) that exceed the shared executor's 120s default and get
 * truncated mid-run — the model then never sees a real result. Default 300s;
 * `INTEGRATION_VERIFY_FIX_BASH_TIMEOUT_MS` overrides.
 */
function readBashTimeoutMs(): number {
  const raw = Number(
    process.env.INTEGRATION_VERIFY_FIX_BASH_TIMEOUT_MS ?? "300000",
  );
  if (!Number.isFinite(raw) || raw < 30_000) return 300_000;
  return Math.floor(raw);
}

/**
 * Strong-model chain for this stage. Independent of `codingMode`.
 *
 * DEBUG default: when `useDeepSeekDirect()` is on, this returns the
 * directly-connected DeepSeek V4 Pro model id (routed through
 * api.deepseek.com, NOT OpenRouter). Otherwise the default is claude-opus-4.8;
 * `INTEGRATION_VERIFY_FIX_MODEL` overrides the primary and
 * `INTEGRATION_VERIFY_FIX_FALLBACK_MODEL` overrides the cross-vendor fallback.
 */
function resolveOpenIntegrationModelChain(): {
  chain: string[];
  deepseekDirect: boolean;
} {
  if (useDeepSeekDirect()) {
    const dsModel =
      process.env.DEEPSEEK_V4_MODEL?.trim() || DEEPSEEK_V4_DEFAULT_MODEL;
    return { chain: [dsModel], deepseekDirect: true };
  }
  const raw = process.env.INTEGRATION_VERIFY_FIX_MODEL?.trim();
  const primary = raw && raw.length > 0 ? raw : OPEN_INTEGRATION_DEFAULT_MODEL;
  const fallback =
    process.env.INTEGRATION_VERIFY_FIX_FALLBACK_MODEL?.trim() || "gpt-5.4";
  const chain = primary === fallback ? [primary] : [primary, fallback];
  return {
    chain: resolveModelChain(chain, resolveModel),
    deepseekDirect: false,
  };
}

// ── Prompt construction ──────────────────────────────────────────────────────

function buildOpenSystemPrompt(opts: {
  hasFrontend: boolean;
  hasBackend: boolean;
  pm: string;
  protectedPaths: string[];
}): string {
  const protectedBlock =
    opts.protectedPaths.length > 0
      ? [
          "",
          "## Protected scaffold files (you MAY edit these in this phase)",
          "These were scaffold-generated and write-protected earlier. In this final",
          "pass you may inspect and edit them when registration or completeness requires:",
          ...opts.protectedPaths.slice(0, 40).map((p) => `  - ${p}`),
          ...(opts.protectedPaths.length > 40
            ? [`  - … (+${opts.protectedPaths.length - 40} more)`]
            : []),
        ].join("\n")
      : "";

  return [
    "You are a Senior Full-Stack Engineer doing the FINAL integration pass on a",
    "fully generated codebase. Workers built features in parallel; your job is to",
    "continue refactoring and completing the EXISTING code until the product's",
    "user flows actually work end-to-end.",
    "",
    "## Step 0 — Understand the project BEFORE changing anything (do this first)",
    "Do not start patching from the first error you see. First build a mental model:",
    "  1. Read the PRD and the design references carefully and enumerate the COMPLETE",
    "     set of expected pages/screens and the primary user journey for EACH user",
    "     role / persona the product defines.",
    "  2. Map each expected page and journey onto the existing code: which route,",
    "     which view/component, which backend endpoint(s) implement it. Use",
    "     `list_files` / `grep` / `read_many_files` to inventory routes, views, the",
    "     navigation/menu definition, the API client, and the backend route table.",
    "  3. From that map, derive the real gaps: missing pages, routes that point at a",
    "     not-found/placeholder stub, nav links with no real destination, and",
    "     frontend↔backend contract mismatches. Fix THOSE — not just whatever the",
    "     compiler happens to complain about.",
    "You are an expert — after this analysis you decide your own order of work. There",
    "is no required checklist beyond the goals below.",
    "",
    "## Goal A — No dead pages (complete the product surface)",
    "Every page and navigation entry implied by the PRD/design MUST resolve to a",
    "real, rendered screen. Concretely:",
    "  - Walk every navigation/menu/sidebar item and every in-app link. Each one",
    "    must land on a real view — NOT a 404, NOT a route wired to a not-found",
    "    component, NOT an empty 'placeholder / coming soon / implementation pending'",
    "    body.",
    "  - When a referenced page is MISSING, BUILD it (create the view AND register",
    "    its route). Do not paper over a missing page by pointing the route at a",
    "    not-found component or leaving a stub — that still reads as broken to a user.",
    "  - If the missing page HAS a design reference, follow it. If it does NOT have a",
    "    design reference, match the look-and-feel of the project's EXISTING pages:",
    "    reuse the same layout shell, shared components, spacing, typography and data",
    "    patterns as a sibling page in the same area, so it feels native — never ship",
    "    a bare placeholder.",
    "  - Wire each new/repaired page to its real data (the matching backend endpoint)",
    "    rather than hard-coded placeholder content.",
    "",
    "## Goal B — Frontend↔backend contract consistency",
    "The two sides must agree on the SAME contract. Verify and reconcile:",
    "  - PATH & METHOD: every frontend API call targets a backend route that actually",
    "    exists with the same method and path (including the API prefix/version).",
    "  - SHAPE: request params/body fields and the response shape the frontend reads",
    "    match what the backend accepts/returns (field names, types, nesting,",
    "    success/error envelope). Reconcile shared DTOs/types so both sides line up.",
    "  - AUTH & ROLES: the authorization model is consistent end-to-end. If the",
    "    system distinguishes multiple notions of identity (e.g. a coarse permission",
    "    tier vs. a business/domain persona), make sure the value the backend guard",
    "    checks is the SAME value the token/session actually carries AND the same",
    "    value the frontend route guard / menu uses. A guard that checks a field the",
    "    auth layer never populates will reject every legitimate user — trace the",
    "    role/persona from login → token/session → backend middleware → frontend",
    "    guard and make them agree.",
    "  - When you change one side of a contract, change the other side in the same",
    "    pass so they never drift.",
    "",
    "## Authoritative spec (what 'correct' looks like)",
    "- The PRD (in the first user message): the product requirements — the source of",
    "  truth for WHICH pages, roles and flows must exist.",
    "- The Design reference (in the first user message): screenshot descriptions,",
    "  Stitch UI design, and design spec — the source of truth for how pages look",
    "  and flow.",
    "",
    "## Reference material (code context — NOT pass/fail gates)",
    "- `frontend/e2e/**` end-to-end specs and `*.test.ts` / `*.test.tsx` unit tests:",
    "  concrete descriptions of expected behavior (testIds, interactions, status",
    "  codes). Read them to understand intent. You MAY run them with bash to verify",
    "  your work, but no test result is required to finish — they are clues, not a",
    "  gate. If a test itself is wrong you may fix it, but prefer fixing the code.",
    "- `.ralph/*.json` audits (route-audit, contract-usage-coverage, runtime-smoke,",
    "  tdd-review, …): static leads on 404s, contract mismatches and gaps. Read them",
    "  via read_file when useful. Treat as hints, not commands.",
    "",
    "## Tools (generic — you decide how to use them)",
    "- `apply_patch` for small edits, `write_file` for whole files.",
    "- `read_file` / `read_many_files` / `grep` / `list_files` for exploration.",
    "- `bash` for installs, builds, type-checks and running anything you want to",
    "  verify (scope to `frontend/` or `backend/`).",
    "- `delete_file` / `move_file` for cleanup. `report_done` when finished.",
    "- NOTE on `bash`: each command runs to completion and blocks. To probe a running",
    "  server, start it detached and bounded (e.g. `(cmd &) ; sleep N ; curl ... ;",
    "  kill %1`) so the call returns — do NOT leave a foreground server running, it",
    "  will hang until the timeout.",
    "",
    "## Hard boundaries (always apply)",
    "- Only edit files under `frontend/` and `backend/`.",
    "- Do NOT switch web/frontend frameworks (Express ↔ Fastify ↔ Koa, etc.).",
    "- Make minimal, targeted changes — do not rewrite working code. (Building a",
    "  genuinely missing page is expected; gratuitously rewriting a working one is",
    "  not.)",
    `- Use the project's package manager (${opts.pm}) for installs.`,
    "- Run any validation ONLY inside `frontend/` and `backend/` (scoped), never a",
    "  root-level tsc over the whole tree.",
    "",
    "## When to finish (your decision)",
    "Call `report_done(status='pass', summary=...)` ONLY when, in your expert",
    "judgment, the product genuinely works against the PRD + design. The system will",
    "NOT re-check your decision, so a green `tsc`/`build` is NECESSARY BUT NOT",
    "SUFFICIENT — code can compile and still be broken for a user. Before reporting",
    "pass, satisfy yourself that:",
    "  - Every PRD/design page and every navigation target resolves to a real",
    "    rendered screen (no 404s, no not-found stubs, no empty placeholders).",
    "  - The primary journey for EACH role/persona works, and the frontend↔backend",
    "    contracts (path, shape, auth/role) line up — exercise representative",
    "    endpoints for each role (e.g. via curl against a bounded local server), not",
    "    just the happy path of one role.",
    "Do not report pass while a known nav target 404s, a page is still a placeholder,",
    "or a role's endpoints reject legitimate users. If something genuinely cannot be",
    "fixed, call `report_done(status='fail', summary=<the specific file/line you",
    "cannot resolve>).",
    protectedBlock,
  ]
    .filter(Boolean)
    .join("\n");
}

const MAX_DESIGN_CONTEXT_CHARS = 48_000;

/** Clamp the (potentially large) design context so it can't dominate the prompt. */
function clampDesignContext(raw: string): string {
  const trimmed = (raw ?? "").trim();
  if (trimmed.length <= MAX_DESIGN_CONTEXT_CHARS) return trimmed;
  return `${trimmed.slice(0, MAX_DESIGN_CONTEXT_CHARS)}\n\n[design context truncated for the integration pass]`;
}

const MUTATING_TOOLS = new Set([
  "write_file",
  "apply_patch",
  "delete_file",
  "move_file",
]);

/**
 * Normalize a bash tool result so a non-zero exit can't be misread as success.
 * `executeSupervisorTool` returns bash results prefixed with `exit_code: N`.
 */
function normalizeBashResult(result: string): string {
  if (isSuccessfulSupervisorToolResult(result)) return result;
  // Non-zero exit (or no recognizable exit prefix from a failed run).
  if (/^exit_code:\s*\d+/m.test(result)) {
    return `[command failed]\n${result}`;
  }
  return result;
}

// ── The node ─────────────────────────────────────────────────────────────────

export async function openIntegrationVerifyAndFix(
  state: SupervisorState,
): Promise<Partial<SupervisorState>> {
  const label = LABEL;
  const emitter = getRepairEmitter(state.sessionId);

  // ── Cumulative circuit-breaker (shared semantics with the legacy node) ──────
  const priorAttempts = Math.max(0, state.integrationFixAttempts ?? 0);
  const totalBudget = scaledIntegrationVerifyFixTotalBudget(
    state.tasks?.length ?? 0,
  );
  const remainingBudget = remainingIntegrationVerifyBudget(
    priorAttempts,
    totalBudget,
  );
  if (remainingBudget <= 0) {
    console.warn(
      `${label}: cumulative budget exhausted (${priorAttempts}/${totalBudget}); skipping repair loop and reporting fail so the graph can converge.`,
    );
    emitter({
      stage: "integration-gate",
      event: "integration_verify_budget_exhausted",
      details: { priorAttempts, totalBudget },
    });
    await recordUnresolvedProblem(state.outputDir, {
      sessionId: state.sessionId,
      category: "circuit-breaker",
      gate: "integration-verify-fix",
      phase: "integration",
      attempts: priorAttempts,
      summary: `OpenIntegrationFix circuit-breaker: ${priorAttempts}/${totalBudget} iterations without clearing the gate.`,
      evidence: state.integrationErrors
        ? [state.integrationErrors.slice(0, 500)]
        : undefined,
      artifacts: [".ralph/runtime-smoke.json", ".ralph/tdd-review.json"],
    });
    return {
      integrationErrors: [
        state.integrationErrors?.trim(),
        `OpenIntegrationFix circuit-breaker: reached the cumulative budget of ${totalBudget} iterations across all repair passes without clearing the gate. Stopping to avoid an infinite loop.`,
      ]
        .filter(Boolean)
        .join("\n")
        .slice(0, 4000),
      integrationFixAttempts: priorAttempts,
    };
  }

  const maxIterations = Math.min(readMaxIterations(), remainingBudget);
  console.log(
    `${label}: starting open agentic loop (max ${maxIterations} this pass; ${priorAttempts}/${totalBudget} cumulative budget used).`,
  );

  // ── Context preparation ─────────────────────────────────────────────────────
  const pm = await detectPackageManager(state.outputDir);
  const hasFrontend = !(
    await fsRead("frontend/package.json", state.outputDir)
  ).startsWith("FILE_NOT_FOUND");
  const hasBackend = !(
    await fsRead("backend/package.json", state.outputDir)
  ).startsWith("FILE_NOT_FOUND");
  const protectedPaths = state.scaffoldProtectedPaths ?? [];

  const prdTrimmed = state.projectContext
    ? pickRelevantSections(
        state.projectContext,
        {
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
        },
        {
          budget: 18_000,
          label: "open-integration-review",
          stage: "worker-context",
          emitter,
        },
      )
    : "";
  const prdBlock = prdTrimmed
    ? `\n## Product Requirements (PRD)\nAuthoritative spec for feature completeness.\n\n${prdTrimmed}`
    : "";

  const designRaw = clampDesignContext(state.frontendDesignContext ?? "");
  const designBlock = designRaw
    ? `\n## Design reference (page screenshots + UI design — how pages should look and flow)\nReproduce these layouts and flows. Where the current UI deviates in a way that breaks the experience, fix it.\n\n${designRaw}`
    : "";

  const referenceBlock = [
    "",
    "## Reference materials on disk (code context — read them, they are NOT pass/fail gates)",
    "- `frontend/e2e/**` — end-to-end specs describing real user journeys & testIds.",
    "- `**/*.test.ts` / `**/*.test.tsx` — unit/integration tests describing expected behavior.",
    "- `.ralph/route-audit.json`, `.ralph/contract-usage-coverage.json`, `.ralph/runtime-smoke.json`, `.ralph/tdd-review.json` — static audits with concrete leads on 404s, contract mismatches and gaps.",
    "Read any of these with read_file / read_many_files / grep / list_files. You MAY run tests with bash to verify your work, but no test result is required to report done — your judgment decides.",
  ].join("\n");

  const systemPrompt = buildOpenSystemPrompt({
    hasFrontend,
    hasBackend,
    pm,
    protectedPaths,
  });
  const openingUserContent = [
    `Project directory: ${state.outputDir}`,
    `Package manager: ${pm}`,
    prdBlock,
    designBlock,
    referenceBlock,
    "",
    "Begin with Step 0: read the PRD + design above and inventory the existing",
    "routes, views, navigation menu, API client and backend route table, so you",
    "know the COMPLETE set of expected pages and per-role journeys before editing.",
    "Then close the real gaps in priority order: (1) pages/nav targets that 404 or",
    "are stubbed/placeholder — build the missing pages (match an existing page's",
    "style when there's no design); (2) frontend↔backend contract mismatches in",
    "path/shape/auth-role; (3) remaining PRD/design feature gaps. Verify your own",
    "work for EACH role (scoped tsc/build + exercising representative endpoints",
    "against a bounded local server) before calling report_done.",
  ]
    .filter(Boolean)
    .join("\n");

  const { chain: modelChain, deepseekDirect } =
    resolveOpenIntegrationModelChain();
  // Provider routing for this stage:
  //  - DeepSeek-direct debug mode: opt INTO the direct provider via
  //    `preferDirectProvider` (this overrides a global LLM_PROVIDER=openrouter /
  //    USE_OPENROUTER / FORCE_OPENROUTER env flag, which `forceOpenRouter:false`
  //    alone cannot, since the env flag is OR'd in). Do NOT force OpenRouter.
  //  - Otherwise: force OpenRouter so the pinned strong model is hit regardless
  //    of the env-driven default provider.
  const forceOpenRouter = !deepseekDirect;
  const preferDirectProvider = deepseekDirect;
  const reasoningOptions = buildIntegrationReasoningOptions();

  // ── Compression state (Layer 2) ─────────────────────────────────────────────
  const contextTokens = readContextTokens();
  const compactRatio = readCompactRatio();
  const triggerTokens = Math.floor(contextTokens * compactRatio);
  // Char-estimate fallback aligned to the SAME token watermark (~4 chars/token),
  // so the char path no longer fires far below the real token trigger (the
  // 80k-char default ≈ 20k tokens caused premature compaction at ~10% of the
  // 200k window). With this, the real prompt-token watermark drives compaction
  // and the char estimate is only a coarse backup at the same level.
  const compactThresholdChars = triggerTokens * 4;
  const compactCooldown = readCompactCooldown();
  const keepTail = readKeepTail();
  const recentFullRounds = readRecentFullRounds();
  const bashTimeoutMs = readBashTimeoutMs();
  let lastPromptTokens = 0;
  let lastCompactionAtIteration = -Infinity;

  dbg(
    `config — modelChain=[${modelChain.join(", ")}] provider=${deepseekDirect ? "deepseek-v4-direct" : "openrouter"} forceOpenRouter=${forceOpenRouter} reasoning=${JSON.stringify(reasoningOptions)}`,
  );
  dbg(
    `config — compression: contextTokens=${contextTokens} ratio=${compactRatio} triggerTokens=${triggerTokens} cooldown=${compactCooldown} keepTail=${keepTail} recentFullRounds=${recentFullRounds} bashTimeoutMs=${bashTimeoutMs}`,
  );
  dbg(
    `context — pm=${pm} hasFrontend=${hasFrontend} hasBackend=${hasBackend} protectedPaths=${protectedPaths.length} prdChars=${prdTrimmed.length} designChars=${designRaw.length} systemPromptChars=${systemPrompt.length}`,
  );

  // ── Loop state (NO stagnation penalties — only the budget bounds it) ─────────
  let iterations = 0;
  let finalStatus: "pass" | "fail" = "fail";
  let finalSummary = "";
  let totalCostUsd = 0;

  // Mutable ledger facts.
  const changedFiles = new Set<string>();

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "assistant", content: buildLedger({ phase: "starting" }) },
    { role: "user", content: openingUserContent },
  ];
  const LEDGER_INDEX = 1;

  function buildLedger(extra?: { phase?: string }): string {
    return [
      "## Progress ledger (auto-maintained — do not delete)",
      `phase: ${extra?.phase ?? "in-progress"}`,
      `iterations: ${iterations}`,
      `filesChanged (${changedFiles.size}): ${[...changedFiles].slice(-25).join(", ") || "(none yet)"}`,
    ].join("\n");
  }

  function refreshLedger(phase?: string): void {
    if (messages[LEDGER_INDEX]?.role === "assistant") {
      messages[LEDGER_INDEX].content = buildLedger({ phase });
    }
  }

  // ── Main loop ────────────────────────────────────────────────────────────────
  while (true) {
    iterations++;
    console.log(`${label}: iteration ${iterations}`);

    if (iterations > maxIterations) {
      const cumulativeSoFar = priorAttempts + iterations - 1;
      const budgetCapped = cumulativeSoFar >= totalBudget;
      console.warn(
        `${label}: reached max iterations for this pass (${maxIterations}; cumulative ${cumulativeSoFar}/${totalBudget}) without the model reporting done.`,
      );
      finalStatus = "fail";
      finalSummary = budgetCapped
        ? `Stopped after reaching the cumulative integration-verify-fix budget=${totalBudget} without the model reporting done.`
        : `Stopped after reaching INTEGRATION_VERIFY_FIX_MAX_ITERATIONS for this pass (${maxIterations}) without the model reporting done.`;
      break;
    }

    // ── Layer 1: cheap lossless trimming every round ──────────────────────────
    const dedup = supersedeStaleReadResults(messages);
    const trunc = truncateOldLargeToolResults(messages, { recentFullRounds });
    if (dedup.superseded > 0 || trunc.truncated > 0) {
      dbg(
        `iter ${iterations} Layer1 — superseded ${dedup.superseded} stale read(s), truncated ${trunc.truncated} old large tool result(s)`,
      );
    }

    // ── Layer 2: token-watermark semantic compaction (repeatable, cooldown) ───
    const cooldownElapsed =
      iterations - lastCompactionAtIteration >= compactCooldown;
    dbg(
      `iter ${iterations} pre-call — ${conversationStats(messages)} | lastPromptTokens=${lastPromptTokens}/${triggerTokens} cooldownElapsed=${cooldownElapsed}`,
    );
    if (cooldownElapsed) {
      const result = await compactChatMessagesSemantically({
        messages,
        modelChain,
        label,
        keepTail,
        thresholdChars: compactThresholdChars,
        countToolCallChars: true,
        currentPromptTokens: lastPromptTokens,
        triggerTokens,
        stateSummary: buildLedger(),
        forceOpenRouter,
        preferDirectProvider,
      });
      if (result.compacted) {
        lastCompactionAtIteration = iterations;
        refreshLedger();
        console.log(
          `${label}: semantic context compacted — removed ${result.removedMessages} messages (~${result.estimatedTokensBefore} tokens est), orphan_tools_removed=${result.orphanToolsRemoved}`,
        );
        dbg(
          `iter ${iterations} Layer2 — post-compaction ${conversationStats(messages)}`,
        );
      }
    }

    refreshLedger();

    dbg(
      `iter ${iterations} → calling model (chain head=${modelChain[0]}, max_tokens=36000)…`,
    );
    const callStartedAt = Date.now();
    let resp: OpenRouterResponse;
    try {
      resp = await chatCompletionWithFallback(messages, modelChain, {
        temperature: 0.2,
        max_tokens: 36000,
        tools: OPEN_INTEGRATION_TOOLS,
        tool_choice: "auto",
        forceOpenRouter,
        preferDirectProvider,
        ...reasoningOptions,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Force a compaction and retry once if it was a context-length error.
      if (isContextLengthError(msg)) {
        dbg(
          `iter ${iterations} model call hit context-length error; forcing compaction and retrying.`,
        );
        const forced = await compactChatMessagesSemantically({
          messages,
          modelChain,
          label,
          keepTail,
          countToolCallChars: true,
          force: true,
          stateSummary: buildLedger(),
          forceOpenRouter,
          preferDirectProvider,
        });
        if (forced.compacted) {
          lastCompactionAtIteration = iterations;
          refreshLedger();
          console.warn(
            `${label}: context limit hit; force-compacted and retrying.`,
          );
          dbg(
            `iter ${iterations} force-compacted — ${conversationStats(messages)}`,
          );
          continue;
        }
      }
      console.error(`${label}: LLM call failed: ${msg}`);
      break;
    }

    const choice = resp.choices[0];
    lastPromptTokens = resp.usage?.prompt_tokens ?? lastPromptTokens;
    const cost = estimateCost(resp.model, resp.usage);
    totalCostUsd += cost;
    recordSupervisorLlmUsage({
      sessionId: state.sessionId,
      stage: "integration_verify_fix",
      label,
      model: resp.model,
      usage: resp.usage,
      costUsd: cost,
    });

    const toolCallNames = (choice.message.tool_calls ?? [])
      .map((c) => c.function.name)
      .join(", ");
    dbg(
      `iter ${iterations} ← model=${resp.model} in ${Date.now() - callStartedAt}ms | usage prompt=${resp.usage?.prompt_tokens ?? "?"} completion=${resp.usage?.completion_tokens ?? "?"} | cost=$${cost.toFixed(4)} (total=$${totalCostUsd.toFixed(4)}) | toolCalls=[${toolCallNames}] | content=${(choice.message.content ?? "").length}c`,
    );

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
      // The open model is trusted; a no-tool turn is just narration. Nudge it
      // ONCE per occurrence to either act or report — this is guidance, not a
      // stagnation penalty (no counters, no escalation, no replan).
      console.log(
        `${label}: no tool calls at iteration ${iterations}; prompting to act or report.`,
      );
      messages.push({
        role: "user",
        content:
          "Continue: either call a tool to make progress, or call report_done when the objective is met (your judgment).",
      });
      continue;
    }

    let doneSignaled = false;
    for (const tc of toolCalls) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(tc.function.arguments);
      } catch {
        /* ignore malformed args */
      }
      const name = tc.function.name;

      // ── report_done: pure model self-decision (no objective gate re-check) ───
      if (name === "report_done") {
        const reported = (args.status as "pass" | "fail") ?? "fail";
        finalStatus = reported === "pass" ? "pass" : "fail";
        finalSummary = String(
          args.summary ??
            (reported === "pass" ? "Integration verification complete." : ""),
        ).slice(0, 2000);
        dbg(
          `iter ${iterations} report_done(status=${reported}) accepted (pure self-decision).`,
        );
        messages.push({
          role: "tool",
          content:
            reported === "pass"
              ? "Recorded pass report."
              : "Recorded fail report.",
          tool_call_id: tc.id,
          name,
        });
        doneSignaled = true;
        break;
      }

      // ── All other tools: dispatch via the shared executor ───────────────────
      const toolStartedAt = Date.now();
      let result = await executeSupervisorTool(name, args, state.outputDir, {
        bashTimeoutMs,
      });
      if (name === "bash") {
        result = normalizeBashResult(result);
      }
      const argPreview = (() => {
        const p = String(
          args.path ?? args.to ?? args.dir ?? args.pattern ?? "",
        );
        const cmd = String(args.command ?? "");
        return (cmd || p).slice(0, 100);
      })();
      dbg(
        `iter ${iterations} tool=${name}(${argPreview}) → ${Date.now() - toolStartedAt}ms, ${result.length}c result${result.startsWith("[command failed]") ? " [FAILED]" : ""}`,
      );

      // Track mutations for the ledger.
      if (MUTATING_TOOLS.has(name) && /^OK:/i.test(result)) {
        const p = String(args.path ?? args.to ?? "").trim();
        if (p) {
          changedFiles.add(p);
          dbg(`iter ${iterations} mutation recorded (${p}).`);
        }
      }

      messages.push({
        role: "tool",
        content: result,
        tool_call_id: tc.id,
        name,
      });
    }

    if (doneSignaled) break;
  }

  refreshLedger(finalStatus === "pass" ? "passed" : "failed");

  // ── Build-quarantine marker (parity with legacy contract) ───────────────────
  try {
    if (finalStatus === "fail") {
      await writeJsonFile(state.outputDir, BUILD_FAILED_MARKER_REL, {
        sessionId: state.sessionId,
        failedAt: new Date().toISOString(),
        gate: "integration",
        summary: finalSummary.slice(0, 2000),
      });
    } else {
      await fs
        .rm(path.join(state.outputDir, BUILD_FAILED_MARKER_REL), {
          force: true,
        })
        .catch(() => {});
    }
  } catch (markerErr) {
    console.warn(
      `${label}: could not write/clear BUILD_FAILED marker: ${markerErr instanceof Error ? markerErr.message : String(markerErr)}`,
    );
  }

  const cumulativeAttempts = priorAttempts + iterations;
  console.log(
    `${label}: done — status=${finalStatus}, iterations=${iterations}, cumulative=${cumulativeAttempts}/${totalBudget}, cost=$${totalCostUsd.toFixed(4)}`,
  );

  return {
    integrationErrors:
      finalStatus === "pass" ? "" : finalSummary.slice(0, 4000),
    integrationFixAttempts: cumulativeAttempts,
    totalCostUsd,
  };
}

async function writeJsonFile(
  outputDir: string,
  relPath: string,
  data: unknown,
): Promise<void> {
  const full = path.join(outputDir, relPath);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, JSON.stringify(data, null, 2), "utf-8");
}
