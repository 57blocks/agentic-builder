/**
 * Persists task-level TDD seed plans into a session manifest consumed by
 * Test Writer / Runtime Executor and surfaced in coding-session reports.
 */
import fs from "fs/promises";
import path from "path";
import type { CodingTask, TaskFilePlan } from "@/lib/pipeline/types";
import type { TddManifestTest, TddScope } from "@/lib/pipeline/tdd-evidence";

export interface TddManifestPayload {
  generatedAt: string;
  source: "task-breakdown";
  tests: TddManifestTest[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTddManifestTest(value: unknown): value is TddManifestTest {
  return isRecord(value) && typeof value.id === "string";
}

function collectTaskFiles(task: CodingTask): string[] {
  if (Array.isArray(task.files)) return task.files;
  const files = task.files as TaskFilePlan | undefined;
  if (!files) return [];
  return [...files.creates, ...files.modifies, ...files.reads];
}

/** Files this task CREATES (the only files a `local` test may target). */
function taskCreatedFiles(task: CodingTask): string[] {
  if (Array.isArray(task.files)) return task.files;
  const files = task.files as TaskFilePlan | undefined;
  return files?.creates ?? [];
}

/** Test types whose assertions are pure logic against task-owned files. */
const LOCAL_ELIGIBLE_TYPES = new Set(["unit", "util"]);

/**
 * Assembly / wiring files a `local` test must NOT depend on — touching any of
 * these means the test only passes once the system is wired together, which is
 * the integration stage's job.
 */
function isAssemblyFile(file: string): boolean {
  return (
    /(^|\/)index\.ts$/.test(file) ||
    /(^|\/)router\.tsx?$/.test(file) ||
    /(^|\/)app\.ts$/.test(file) ||
    /(^|\/)server\.ts$/.test(file) ||
    /\.routes\.ts$/.test(file) ||
    /(^|\/)associations\.ts$/.test(file)
  );
}

/**
 * Conservative scope classifier. A test is `local` (runnable & owned by the
 * producing worker) ONLY when ALL hold:
 *   1. its `type` is a pure-logic kind (unit / util);
 *   2. every `targetFiles` entry is a file the owning task CREATES (no
 *      dependency on other tasks' or scaffold files);
 *   3. no target is an assembly/registration file (index/router/app/server/
 *      *.routes/associations);
 *   4. the command runs a single test file, not the whole suite.
 * Anything else ⇒ `integration` (the safe default). This deliberately errs
 * toward `integration`: a mis-promoted cross-cutting test would "fail" in the
 * worker where it cannot be fixed, so we only promote provably self-contained
 * tests.
 */
export function classifyTddScope(
  test: {
    type?: string;
    targetFiles?: string[];
    command?: string;
    file?: string;
  },
  createdFiles: string[],
): TddScope {
  const type = (test.type ?? "").toLowerCase();
  if (!LOCAL_ELIGIBLE_TYPES.has(type)) return "integration";

  const targets = test.targetFiles ?? [];
  if (targets.length === 0) return "integration";

  const created = new Set(createdFiles);
  for (const t of targets) {
    if (!created.has(t)) return "integration";
    if (isAssemblyFile(t)) return "integration";
  }

  // Command must be file-scoped (e.g. `pnpm test <file>`), never a bare
  // `pnpm test` / `vitest run` that executes the entire suite.
  const command = (test.command ?? "").trim();
  const file = test.file ?? "";
  const base = file.split("/").pop() ?? "";
  const runsSingleFile =
    (!!file && command.includes(file)) || (!!base && command.includes(base));
  if (!runsSingleFile) return "integration";

  return "local";
}

/**
 * Coerce a TDD test file's extension to `.tsx` when the test renders a React
 * component (its target set includes a `.tsx`/`.jsx` file). esbuild/Vite
 * REFUSE to parse JSX inside a `.ts` file — a `.ts` test that does
 * `render(<Page />)` fails to transform ("Expected '>' but found ...") and
 * collects ZERO tests, which the TDD hard gate counts as a permanent P0
 * failure. That hangs the integration-verify repair loop forever (the agent
 * keeps "fixing" the component, but the real fault is the test file's
 * extension). Renaming `.test.ts` → `.test.tsx` here — at the single source
 * of truth the writer and the GREEN gate both consume — fixes it for every
 * project. Pure-logic tests (targets only `.ts`, e.g. a hook/service) are
 * left untouched.
 */
export function coerceJsxTestExtension(
  file: string,
  targetFiles: string[],
  command: string,
): { file: string; command: string } {
  const rendersJsx = targetFiles.some((f) => /\.(tsx|jsx)$/i.test(f));
  if (!rendersJsx) return { file, command };
  if (!/\.(test|spec)\.ts$/i.test(file)) return { file, command };

  const newFile = file.replace(/\.(test|spec)\.ts$/i, ".$1.tsx");
  const oldBase = file.split("/").pop() ?? file;
  const newBase = newFile.split("/").pop() ?? newFile;
  let newCommand = command ?? "";
  if (newCommand.includes(file)) {
    newCommand = newCommand.split(file).join(newFile);
  } else if (oldBase && newCommand.includes(oldBase)) {
    newCommand = newCommand.split(oldBase).join(newBase);
  }
  return { file: newFile, command: newCommand };
}

export async function writeTddManifestFromTasks(
  outputDir: string,
  tasks: CodingTask[],
): Promise<{ path: string; testCount: number }> {
  const ralphDir = path.join(outputDir, ".ralph");
  const manifestPath = path.join(ralphDir, "test-manifest.json");
  const tests: TddManifestTest[] = [];

  for (const task of tasks) {
    const createdFiles = taskCreatedFiles(task);
    for (const test of task.tddPlan?.tests ?? []) {
      const targetFiles = collectTaskFiles(task).filter(
        (file) => file !== test.file,
      );
      const { file, command } = coerceJsxTestExtension(
        test.file,
        targetFiles,
        test.command,
      );
      if (file !== test.file) {
        console.log(
          `[TddManifest] Coerced JSX test extension: ${test.file} → ${file} (renders a React component; .ts cannot contain JSX).`,
        );
      }
      const scope = classifyTddScope(
        { type: test.type, targetFiles, command, file },
        createdFiles,
      );
      tests.push({
        id: test.id,
        taskId: task.id,
        requirementIds: task.coversRequirementIds ?? [],
        priority: test.priority,
        type: test.type,
        file,
        targetFiles,
        command,
        expectedRed: test.expectedRed,
        expectedGreen: test.expectedGreen,
        scope,
      });
    }
  }

  const payload: TddManifestPayload = {
    generatedAt: new Date().toISOString(),
    source: "task-breakdown",
    tests,
  };

  await fs.mkdir(ralphDir, { recursive: true });
  await fs.writeFile(manifestPath, JSON.stringify(payload, null, 2), "utf-8");
  return { path: manifestPath, testCount: tests.length };
}

export async function readTddManifest(
  outputDir: string,
): Promise<TddManifestPayload | null> {
  const manifestPath = path.join(outputDir, ".ralph", "test-manifest.json");
  try {
    const raw = await fs.readFile(manifestPath, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || !Array.isArray(parsed.tests)) return null;
    return {
      generatedAt:
        typeof parsed.generatedAt === "string"
          ? parsed.generatedAt
          : new Date(0).toISOString(),
      source: "task-breakdown",
      tests: parsed.tests.filter(isTddManifestTest),
    };
  } catch {
    return null;
  }
}

/**
 * Move `.ralph/tdd-evidence.jsonl` aside so a new session starts with a
 * clean evidence ledger. Old events are kept (renamed with a sortable
 * suffix) for forensic archaeology, but they no longer feed the gate.
 *
 * Without this rotation the evidence file is append-only across sessions
 * and the gate's `hasGreenFail` aggregation eventually marks every test
 * "once-failed-forever-blocking", structurally preventing the loop from
 * ever turning green. See repo analysis 2026-05-19.
 */
export async function rotateTddEvidenceForNewSession(
  outputDir: string,
): Promise<{ rotated: boolean; archivedTo?: string }> {
  const ralphDir = path.join(outputDir, ".ralph");
  const currentPath = path.join(ralphDir, "tdd-evidence.jsonl");
  try {
    await fs.access(currentPath);
  } catch {
    return { rotated: false };
  }
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const archivePath = path.join(ralphDir, `tdd-evidence.${ts}.jsonl`);
  try {
    await fs.rename(currentPath, archivePath);
    return { rotated: true, archivedTo: archivePath };
  } catch {
    return { rotated: false };
  }
}
