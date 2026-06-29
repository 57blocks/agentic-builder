/**
 * Runtime RED/GREEN executor for task-level TDD manifests.
 */
import fs from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { readTddManifest } from "@/lib/pipeline/tdd-manifest";
import type {
  TddEvidenceEvent,
  TddEvidenceStatus,
  TddManifestTest,
  TddPhase,
  TddPriority,
  TddScope,
} from "@/lib/pipeline/tdd-evidence";
import type { RepairEmitter } from "@/lib/pipeline/self-heal";

const execFileAsync = promisify(execFile);
const TDD_COMMAND_TIMEOUT_MS = 120_000;
const MAX_OUTPUT_CHARS = 2000;

/**
 * In-process mutex chain, keyed by output dir. `runTddRuntimePhase` mutates the
 * shared `backend/.env` (neutralize → run → restore) because the generated
 * db.ts re-loads `.env` via dotenv. Worker-stage local-TDD now runs inside
 * PARALLEL workers on the same project, so two concurrent runs could corrupt
 * that file (one restoring while the other neutralizes). Serialize the whole
 * neutralize→run→restore window per project to make it race-free. Cross-process
 * safety is already handled by the `.tdd-bak` sentinel + crash recovery.
 */
const tddEnvLocks = new Map<string, Promise<unknown>>();

function withTddEnvLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = tddEnvLocks.get(key) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  // Keep the chain alive but don't let a rejection poison the next waiter.
  tddEnvLocks.set(
    key,
    next.then(
      () => undefined,
      () => undefined,
    ),
  );
  return next;
}

/**
 * Prepended to a failure excerpt when the gate stripped DATABASE_URL and the
 * test still tried to reach a DB. Makes the cause self-explanatory and trips
 * the "mock the db module" directive in tdd-diagnostics-block.ts — and warns
 * the worker NOT to trust a local re-run (which falsely passes because the
 * real DATABASE_URL is present outside the gate).
 */
const GATE_DB_MARKER =
  "[tdd-gate] DATABASE_URL was intentionally stripped for this gate run so unit tests cannot touch the real database. This test failed because it depends on a live DB — mock the db module with sqlite::memory: (mirror backend/src/models/index.test.ts). Do NOT just run the command locally to verify: it falsely passes because the real DATABASE_URL is present outside the gate. Trust the gate.";

/**
 * Heuristic: does this failure output look like an attempt to reach a real DB?
 * Connection-specific signals only — a bare "sequelize" mention is excluded so
 * a correctly-mocked test that fails on an assertion isn't mislabeled.
 */
function looksLikeDbConnectionFailure(output: string): boolean {
  return /database_url is required|sequelize.*connect|sequelizeconnection|econnrefused|password authentication|getaddrinfo|connection (refused|terminated)|client_password_missing|no pg_hba/i.test(
    output,
  );
}

export interface TddRuntimeExecutorResult {
  phase: TddPhase;
  manifestPresent: boolean;
  total: number;
  passed: number;
  expectedFailed: number;
  failed: number;
  skipped: number;
  p0Failures: string[];
  /** Per-P0-blocking-failure assertion excerpts (testId → trimmed failure output),
   *  so a caller (e.g. worker local-tdd) can surface the real WHY in its repair
   *  prompt instead of only a "0/1 passed" summary. */
  p0FailureExcerpts: Array<{ testId: string; excerpt: string }>;
  /** RED-phase test FILES that passed before implementation (invalid RED — a
   *  test that already passes proves nothing). Used to delete + regenerate. */
  redPassedTooEarlyFiles: string[];
  summary: string;
}

function normalizePriority(value: unknown): TddPriority {
  return value === "P1" || value === "P2" ? value : "P0";
}

function isUnsafeCommand(command: string): boolean {
  return /\brm\s+-rf\b|\bsudo\b|\bgit\s+push\b|>\s*\/dev\/|\/\s*$/i.test(
    command,
  );
}

function classifyFailure(output: string): TddEvidenceStatus {
  if (
    /missing script|command not found|Cannot find module ['"]?(vitest|jest|playwright)|ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL/i.test(
      output,
    )
  ) {
    return "infra_fail";
  }
  return "fail";
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[`"'()[\]{}:;,.!?]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractExpectedRedTerms(expectedRed: string | undefined): string[] {
  if (!expectedRed?.trim()) return [];
  const raw = expectedRed.match(/[A-Za-z0-9_./:-]+/g) ?? [];
  const stop = new Set([
    "the",
    "and",
    "or",
    "before",
    "after",
    "returns",
    "return",
    "fails",
    "fail",
    "should",
    "test",
    "route",
    "exists",
  ]);
  return [
    ...new Set(
      raw
        .map((term) => term.toLowerCase())
        .filter((term) => term.length >= 3 && !stop.has(term)),
    ),
  ].slice(0, 12);
}

function matchExpectedRed(
  output: string,
  expectedRed: string | undefined,
): {
  matched: boolean;
  reason: string;
} {
  const terms = extractExpectedRedTerms(expectedRed);
  if (terms.length === 0) {
    return {
      matched: true,
      reason: "No expectedRed terms declared; accepted non-infra failure.",
    };
  }
  const normalizedOutput = normalizeText(output);
  const matchedTerms = terms.filter((term) =>
    normalizedOutput.includes(normalizeText(term)),
  );
  const requiredMatches = Math.max(1, Math.ceil(Math.min(terms.length, 6) / 2));
  return {
    matched: matchedTerms.length >= requiredMatches,
    reason:
      matchedTerms.length >= requiredMatches
        ? `Matched expectedRed terms: ${matchedTerms.join(", ")}.`
        : `Expected RED mismatch: matched ${matchedTerms.length}/${requiredMatches} required terms from "${expectedRed}".`,
  };
}

async function appendEvidence(
  outputDir: string,
  event: TddEvidenceEvent,
): Promise<void> {
  const ralphDir = path.join(outputDir, ".ralph");
  await fs.mkdir(ralphDir, { recursive: true });
  await fs.appendFile(
    path.join(ralphDir, "tdd-evidence.jsonl"),
    `${JSON.stringify(event)}\n`,
    "utf-8",
  );
}

async function runOneTest(
  outputDir: string,
  phase: TddPhase,
  test: TddManifestTest,
  sessionId?: string,
  dbNeutralized = false,
): Promise<TddEvidenceEvent> {
  const command = test.command?.trim();
  if (!command) {
    return {
      testId: test.id,
      taskId: test.taskId,
      phase,
      status: "skipped",
      failureExcerpt: "No command declared in TDD manifest.",
      timestamp: new Date().toISOString(),
      sessionId,
    };
  }
  if (isUnsafeCommand(command)) {
    return {
      testId: test.id,
      taskId: test.taskId,
      phase,
      command,
      status: "skipped",
      failureExcerpt: "TDD command rejected as unsafe.",
      timestamp: new Date().toISOString(),
      sessionId,
    };
  }

  try {
    const { stdout, stderr } = await execFileAsync("bash", ["-c", command], {
      cwd: outputDir,
      timeout: TDD_COMMAND_TIMEOUT_MS,
      maxBuffer: 5 * 1024 * 1024,
      // Hard guarantee: TDD unit tests must never reach the real (kickoff)
      // database. Blanking DATABASE_URL means a test that imports the real db
      // module cannot dial the live Postgres. backend/.env is also neutralized
      // for the phase (see runTddRuntimePhase) because the generated db.ts
      // re-loads it via dotenv.
      //
      // NODE_ENV=test is set explicitly so the db layer's "no DATABASE_URL"
      // branch is deterministic: instead of throwing, a test-aware db.ts falls
      // back to `sqlite::memory:` (vitest also sets VITEST, but pinning
      // NODE_ENV here makes the fallback independent of the runner). This keeps
      // the "tests can't touch the real DB" guarantee while letting the suite
      // actually run on an in-memory database.
      env: {
        ...process.env,
        FORCE_COLOR: "0",
        DATABASE_URL: "",
        NODE_ENV: "test",
      },
    });
    const output = `${stdout ?? ""}${stderr ?? ""}`.trim();
    const greenPass = phase === "green";
    return {
      testId: test.id,
      taskId: test.taskId,
      phase,
      command,
      exitCode: 0,
      status: greenPass ? "pass" : "fail",
      expectedFailureMatched: phase === "red" ? false : undefined,
      failureExcerpt: greenPass
        ? output.slice(-MAX_OUTPUT_CHARS)
        : "RED test passed before implementation, so it is not a valid failing test.",
      timestamp: new Date().toISOString(),
      sessionId,
    };
  } catch (err) {
    const e = err as {
      code?: number;
      stdout?: string;
      stderr?: string;
      message?: string;
    };
    const output =
      `${e.stdout ?? ""}${e.stderr ?? ""}${e.message ?? ""}`.trim();
    const failureKind = classifyFailure(output);
    const expectedRedMatch =
      phase === "red" && failureKind !== "infra_fail"
        ? matchExpectedRed(output, test.expectedRed)
        : { matched: false, reason: "" };
    const status =
      phase === "red" &&
      failureKind !== "infra_fail" &&
      expectedRedMatch.matched
        ? "expected_fail"
        : failureKind;
    // When the gate stripped DATABASE_URL and the test still tried to reach a
    // DB, annotate the excerpt so the repair directive is actionable (mock the
    // db) instead of the misleading generic "run it locally" (which passes).
    // Trim the output tail FIRST, then prepend the marker so it survives.
    const trimmed = output.slice(-MAX_OUTPUT_CHARS);
    const failureExcerpt =
      dbNeutralized &&
      status !== "expected_fail" &&
      looksLikeDbConnectionFailure(output)
        ? `${GATE_DB_MARKER}\n---\n${trimmed}`
        : trimmed;
    return {
      testId: test.id,
      taskId: test.taskId,
      phase,
      command,
      exitCode: typeof e.code === "number" ? e.code : 1,
      status,
      expectedFailureMatched:
        phase === "red" ? status === "expected_fail" : undefined,
      expectedFailureReason:
        phase === "red" ? expectedRedMatch.reason : undefined,
      failureExcerpt,
      timestamp: new Date().toISOString(),
      sessionId,
    };
  }
}

/**
 * Temporarily blank the `DATABASE_URL` line in backend/.env so the generated
 * `db.ts` (which re-loads .env via dotenv in non-production) cannot hand the
 * real kickoff Postgres URL to a test. Returns a restore closure to call in a
 * finally. No-op when there is no .env or no DATABASE_URL line.
 *
 * Crash-safe via atomic rename + sentinel: the real .env is moved to a
 * `.tdd-bak` sibling (atomic on POSIX) before the blanked version is written,
 * and restore renames it back. If the process is killed before restore runs,
 * the next call to `recoverFromCrashedTddNeutralization` (or the next
 * `neutralize` invocation) puts the file back. This replaces the previous
 * read→blank→writeback-on-finally pattern which lost the original whenever the
 * process died mid-TDD (observed: backend/.env left with `DATABASE_URL=`).
 *
 * Correctly-mocked tests are unaffected: `vi.mock("../db")` replaces the module
 * so db.ts never runs. Tests that DON'T mock it now fail fast with a clear
 * "DATABASE_URL is required" instead of touching (or polluting) the live DB.
 */
interface DbNeutralization {
  /** True when backend/.env had a DATABASE_URL line that we blanked. */
  neutralized: boolean;
  restore: () => Promise<void>;
}

const TDD_ENV_BACKUP_SUFFIX = ".tdd-bak";

function backendEnvPaths(outputDir: string): {
  envPath: string;
  bakPath: string;
} {
  const envPath = path.join(outputDir, "backend", ".env");
  return { envPath, bakPath: envPath + TDD_ENV_BACKUP_SUFFIX };
}

/**
 * If a previous TDD run was killed between blanking backend/.env and restoring
 * it, the `.env.tdd-bak` sentinel will still be on disk next to a neutralized
 * `.env`. Atomic-rename it back. Idempotent and safe to call at any time —
 * absence of the sentinel is a no-op.
 *
 * Call sites:
 *   - top of `neutralizeBackendDatabaseUrl` (heals before re-blanking)
 *   - top of the coding API's backend/.env writer (heals before the next
 *     `upsertDatabaseUrlEnv` pass, so a stale crash doesn't shadow the real
 *     kickoff URL when coding restarts)
 */
export async function recoverFromCrashedTddNeutralization(
  outputDir: string,
): Promise<{ recovered: boolean }> {
  const { envPath, bakPath } = backendEnvPaths(outputDir);
  try {
    await fs.access(bakPath);
  } catch {
    return { recovered: false };
  }
  try {
    await fs.rename(bakPath, envPath);
    console.log(
      "[tdd-runtime] recovered backend/.env from .tdd-bak (previous TDD run did not finish restore).",
    );
    return { recovered: true };
  } catch (e) {
    console.warn(
      `[tdd-runtime] could not recover backend/.env from .tdd-bak: ${
        e instanceof Error ? e.message : String(e)
      }`,
    );
    return { recovered: false };
  }
}

async function neutralizeBackendDatabaseUrl(
  outputDir: string,
): Promise<DbNeutralization> {
  const noop: DbNeutralization = {
    neutralized: false,
    restore: async () => {},
  };
  const { envPath, bakPath } = backendEnvPaths(outputDir);

  // Self-heal first: a `.tdd-bak` from a prior killed run means the real .env
  // is currently the blanked one. Restore before doing anything else, otherwise
  // we would back up a blanked file and lose the original forever.
  await recoverFromCrashedTddNeutralization(outputDir);

  let original: string;
  try {
    original = await fs.readFile(envPath, "utf-8");
  } catch {
    return noop;
  }
  if (!/^[ \t]*DATABASE_URL[ \t]*=/m.test(original)) {
    return noop;
  }
  const blanked = original.replace(/^([ \t]*DATABASE_URL[ \t]*=).*$/m, "$1");
  try {
    // Atomic rename moves the real file aside; even if the process is killed
    // between rename and writeFile the sentinel survives and recovery kicks in.
    await fs.rename(envPath, bakPath);
    try {
      await fs.writeFile(envPath, blanked, "utf-8");
    } catch (writeErr) {
      // writeFile of the blanked version failed — best-effort put the original
      // back so we leave the disk in a consistent state.
      await fs.rename(bakPath, envPath).catch(() => {});
      throw writeErr;
    }
    console.log(
      "[tdd-runtime] neutralized backend/.env DATABASE_URL for the test phase (sentinel: .tdd-bak).",
    );
  } catch {
    return noop;
  }
  return {
    neutralized: true,
    restore: async () => {
      try {
        // Atomic restore: rename .tdd-bak back over .env. POSIX rename
        // guarantees overwrite is atomic, so partial state is impossible.
        await fs.rename(bakPath, envPath);
      } catch {
        /* best-effort restore — recoverFromCrashedTddNeutralization fixes it on the next run */
      }
    },
  };
}

export async function runTddRuntimePhase(input: {
  outputDir: string;
  phase: TddPhase;
  emitter?: RepairEmitter;
  sessionId?: string;
  /**
   * Run only tests with this scope. Omit to run every test (back-compat).
   *   - "local"       → worker-owned, self-contained tests.
   *   - "integration" → cross-cutting tests the integration gate owns.
   */
  scope?: TddScope;
  /** Run only tests owned by these task ids. Omit to run all. */
  taskIds?: string[];
}): Promise<TddRuntimeExecutorResult> {
  const manifest = await readTddManifest(input.outputDir);
  // Apply scope / taskId filters. A test with no `scope` defaults to
  // "integration" so legacy manifests keep running under the integration gate.
  const taskIdFilter = input.taskIds ? new Set(input.taskIds) : null;
  const filteredTests = (manifest?.tests ?? []).filter((test) => {
    if (input.scope) {
      const testScope: TddScope = test.scope ?? "integration";
      if (testScope !== input.scope) return false;
    }
    if (taskIdFilter && !(test.taskId && taskIdFilter.has(test.taskId))) {
      return false;
    }
    return true;
  });
  if (!manifest || filteredTests.length === 0) {
    const scopeNote = input.scope ? ` (scope=${input.scope})` : "";
    const summary = `TDD runtime skipped: no tests in manifest${scopeNote}.`;
    input.emitter?.({
      stage: "tdd-runtime",
      event: "tdd_runtime_skipped",
      details: {
        phase: input.phase,
        reason: manifest ? "no-tests-after-filter" : "no-manifest-tests",
        scope: input.scope,
      },
    });
    return {
      phase: input.phase,
      manifestPresent: !!manifest,
      total: 0,
      passed: 0,
      expectedFailed: 0,
      failed: 0,
      skipped: 0,
      p0Failures: [],
      p0FailureExcerpts: [],
      redPassedTooEarlyFiles: [],
      summary,
    };
  }

  let passed = 0;
  let expectedFailed = 0;
  let failed = 0;
  let skipped = 0;
  const p0Failures: string[] = [];
  const p0FailureExcerpts: Array<{ testId: string; excerpt: string }> = [];
  const redPassedTooEarlyFiles: string[] = [];

  // Neutralize the real DATABASE_URL for the whole phase so any test that
  // imports the real db module (instead of mocking it) fails fast rather than
  // dialing the live kickoff Postgres. Restored in finally. The whole
  // neutralize→run→restore window is serialized per project (withTddEnvLock)
  // so parallel workers running local-TDD can't corrupt the shared backend/.env.
  await withTddEnvLock(input.outputDir, async () => {
    const { neutralized: dbNeutralized, restore: restoreDbUrl } =
      await neutralizeBackendDatabaseUrl(input.outputDir);
    try {
      for (const test of filteredTests) {
        const event = await runOneTest(
          input.outputDir,
          input.phase,
          test,
          input.sessionId,
          dbNeutralized,
        );
        await appendEvidence(input.outputDir, event);

        // Per-test event so the UI can stream RED/GREEN results onto the owning
        // task's real-time log (filtered by taskId). Aggregate counts are still
        // emitted once below for the run-level summary.
        input.emitter?.({
          stage: "tdd-runtime",
          event: "tdd_test_result",
          taskId: event.taskId,
          details: {
            testId: event.testId,
            phase: event.phase,
            type: test.type,
            priority: test.priority,
            status: event.status,
            command: event.command,
            requirementIds: test.requirementIds,
            expectedRed: test.expectedRed,
            expectedGreen: test.expectedGreen,
            failureExcerpt: event.failureExcerpt,
          },
        });

        if (event.status === "pass") {
          passed += 1;
          // A RED-phase test that PASSES proves nothing — record its file so the
          // caller can delete + regenerate it as a genuinely-failing test.
          if (input.phase === "red" && test.file) {
            redPassedTooEarlyFiles.push(test.file);
          }
        } else if (event.status === "expected_fail") expectedFailed += 1;
        else if (event.status === "skipped") skipped += 1;
        else failed += 1;

        const priority = normalizePriority(test.priority);
        const isBlocking =
          priority === "P0" &&
          ((input.phase === "red" && event.status !== "expected_fail") ||
            (input.phase === "green" && event.status !== "pass"));
        if (isBlocking) {
          p0Failures.push(test.id);
          if (event.failureExcerpt) {
            p0FailureExcerpts.push({
              testId: test.id,
              excerpt: event.failureExcerpt,
            });
          }
        }
      }
    } finally {
      await restoreDbUrl();
    }
  });

  const total = filteredTests.length;
  const scopeLabel = input.scope ? ` [${input.scope}]` : "";
  const summary =
    input.phase === "red"
      ? `TDD RED${scopeLabel}: ${expectedFailed}/${total} expected failures, ${failed} failed unexpectedly, ${passed} passed too early, ${skipped} skipped.`
      : `TDD GREEN${scopeLabel}: ${passed}/${total} passed, ${failed} failed, ${skipped} skipped.`;

  input.emitter?.({
    stage: "tdd-runtime",
    event: input.phase === "red" ? "tdd_red_executed" : "tdd_green_executed",
    details: {
      total,
      passed,
      expectedFailed,
      failed,
      skipped,
      p0Failures,
      scope: input.scope,
    },
  });

  return {
    phase: input.phase,
    manifestPresent: true,
    total,
    passed,
    expectedFailed,
    failed,
    skipped,
    p0Failures,
    p0FailureExcerpts,
    redPassedTooEarlyFiles,
    summary,
  };
}
