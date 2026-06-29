/**
 * LLM-backed Test Writer stage. Produces RED tests from tddPlan before feature
 * workers write production code.
 */
import { MODEL_CONFIG, resolveModelChain } from "@/lib/model-config";
import {
  chatCompletionWithFallback,
  estimateCost,
  resolveModel,
  type ChatMessage,
  type OpenRouterToolDefinition,
} from "@/lib/openrouter";
import type { CodingTask } from "@/lib/pipeline/types";
import { coerceJsxTestExtension } from "@/lib/pipeline/tdd-manifest";
import { fsRead, fsWrite, listFiles } from "@/lib/langgraph/tools";
import { recordCodingSessionLlmUsage } from "@/lib/pipeline/coding-session-report";
import type { RepairEmitter } from "@/lib/pipeline/self-heal";

interface TddTestWriterResult {
  attempted: boolean;
  testCount: number;
  writtenFiles: string[];
  summary: string;
  costUsd: number;
}

const MAX_TEST_WRITER_ITERATIONS = 10;
const MAX_TOOL_OUTPUT_CHARS = 5000;

type FlattenedTddTest = {
  taskId: string;
  taskTitle: string;
  requirementIds: string[];
  targetFiles: string[];
  id: string;
  type: string;
  priority: string;
  file: string;
  command: string;
  expectedRed: string;
  expectedGreen: string;
};

function collectTaskFiles(task: CodingTask): string[] {
  if (Array.isArray(task.files)) return task.files;
  if (!task.files) return [];
  return [
    ...task.files.creates,
    ...task.files.modifies,
    ...task.files.reads,
  ];
}

const TDD_TEST_WRITER_TOOLS: OpenRouterToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read a relative file path from the generated project.",
      parameters: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Write a TDD test file listed in the manifest.",
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
      name: "list_files",
      description: "List files recursively under a relative directory.",
      parameters: {
        type: "object",
        properties: { dir: { type: "string" } },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "report_done",
      description: "Signal that all requested TDD test files were written.",
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string" },
        },
        required: ["summary"],
      },
    },
  },
];

function flattenTddTests(tasks: CodingTask[]): FlattenedTddTest[] {
  const out: FlattenedTddTest[] = [];
  for (const task of tasks) {
    for (const test of task.tddPlan?.tests ?? []) {
      const targetFiles = collectTaskFiles(task).filter(
        (file) => file !== test.file,
      );
      // Same JSX-extension coercion the manifest applies, so the writer
      // produces `.test.tsx` for React-rendering tests instead of a `.test.ts`
      // that esbuild can't transform. Keeps writer ↔ manifest ↔ runner aligned
      // on the same file path.
      const { file, command } = coerceJsxTestExtension(
        test.file,
        targetFiles,
        test.command,
      );
      out.push({
        taskId: task.id,
        taskTitle: task.title,
        requirementIds: task.coversRequirementIds ?? [],
        targetFiles,
        id: test.id,
        type: test.type,
        priority: test.priority,
        file,
        command,
        expectedRed: test.expectedRed,
        expectedGreen: test.expectedGreen,
      });
    }
  }
  return out;
}

async function existingTestFiles(
  outputDir: string,
  files: string[],
): Promise<Set<string>> {
  const present = new Set<string>();
  for (const file of files) {
    const raw = await fsRead(file, outputDir);
    if (!raw.startsWith("FILE_NOT_FOUND") && !raw.startsWith("REJECTED")) {
      present.add(file);
    }
  }
  return present;
}

function lacksRequirementCitation(
  content: string,
  requirementIds: string[] | undefined,
): boolean {
  const ids = requirementIds ?? [];
  if (ids.length === 0) return false;
  return !ids.some((id) => content.includes(id));
}

function lacksUnmockedDbGuard(file: string, content: string): boolean {
  if (!file.startsWith("backend/")) return false;
  const importsRealDb = /from\s+["'][^"']*\/db["']/.test(content);
  if (!importsRealDb) return false;
  // Allow if the test mocks the db module or uses an in-memory sqlite.
  if (/vi\.mock\s*\(\s*["'][^"']*\/db["']/.test(content)) return false;
  if (/sqlite::memory:/.test(content)) return false;
  return true;
}

function lacksRealHttpMock(file: string, content: string): boolean {
  if (!/services\/externalApis\//.test(file) && !/externalApis/.test(content))
    return false;
  if (/vi\.fn\s*\(|vi\.mock\s*\(|msw|nock|undici[^"']*MockAgent/.test(content))
    return false;
  if (/globalThis\.fetch\s*=\s*/.test(content)) return false;
  return /\bfetch\s*\(|axios|got\(|undici/.test(content);
}

function lacksFrontendEnvStub(type: string, content: string): boolean {
  if (type !== "frontend-service") return false;
  const hasLiteralPathAssertion = /toHaveBeenCalledWith\s*\(\s*["']\/api\//.test(
    content,
  );
  if (!hasLiteralPathAssertion) return false;
  if (
    /vi\.stubEnv\s*\(\s*["']VITE_API_BASE_URL["']/.test(content) ||
    /expect\.(stringContaining|stringMatching)/.test(content)
  ) {
    return false;
  }
  return true;
}

async function executeTool(input: {
  outputDir: string;
  allowedFiles: Set<string>;
  writtenFiles: Set<string>;
  requirementIdsByFile: Map<string, string[]>;
  typeByFile: Map<string, string>;
  name: string;
  args: Record<string, unknown>;
}): Promise<string> {
  if (input.name === "read_file") {
    const content = await fsRead(String(input.args.path ?? ""), input.outputDir);
    return content.slice(0, MAX_TOOL_OUTPUT_CHARS);
  }
  if (input.name === "list_files") {
    const files = await listFiles(String(input.args.dir ?? "."), input.outputDir);
    return files.join("\n").slice(0, MAX_TOOL_OUTPUT_CHARS);
  }
  if (input.name === "write_file") {
    const file = String(input.args.path ?? "");
    if (!input.allowedFiles.has(file)) {
      return `REJECTED: ${file} is not listed in tddPlan.tests[].file.`;
    }
    const content = String(input.args.content ?? "");
    if (!/\b(expect|assert|should|toEqual|toBe)\b/.test(content)) {
      return "REJECTED: TDD test content must contain an assertion.";
    }
    const ids = input.requirementIdsByFile.get(file);
    if (lacksRequirementCitation(content, ids)) {
      return `REJECTED: ${file} must cite at least one coversRequirementIds value (one of: ${(ids ?? []).join(", ")}). Add a comment like \`/** coversRequirementIds: ${(ids ?? [])[0] ?? "FR-XXX"} */\` near the top of the file.`;
    }
    const type = input.typeByFile.get(file) ?? "";
    if (lacksUnmockedDbGuard(file, content)) {
      return `REJECTED: ${file} imports from "../db" without mocking it. Backend tests MUST \`vi.mock("../db")\` (or its relative equivalent) and substitute an in-memory SQLite Sequelize constructed with \`dialectModule: sqlite3Wasm\` (imported from the test-support/sqlite3-wasm module) — without it Sequelize throws "Please install sqlite3". See backend/src/models/index.test.ts for the canonical pattern.`;
    }
    if (lacksRealHttpMock(file, content)) {
      return `REJECTED: ${file} calls fetch/axios without a network mock. External API client tests MUST mock \`globalThis.fetch\` (or use msw/nock). Live network access is not permitted.`;
    }
    if (lacksFrontendEnvStub(type, content)) {
      return `REJECTED: ${file} asserts a literal "/api/..." URL but does not stub VITE_API_BASE_URL. Either \`vi.stubEnv("VITE_API_BASE_URL", "")\` in beforeAll, or use \`expect.stringContaining("/api/...")\`.`;
    }
    await fsWrite(file, content, input.outputDir);
    input.writtenFiles.add(file);
    return `OK: wrote ${file}`;
  }
  return `ERROR: unknown tool ${input.name}`;
}

export async function runTddTestWriter(input: {
  outputDir: string;
  tasks: CodingTask[];
  projectContext: string;
  sessionId: string;
  emitter?: RepairEmitter;
}): Promise<TddTestWriterResult> {
  const tests = flattenTddTests(input.tasks);
  if (tests.length === 0) {
    return {
      attempted: false,
      testCount: 0,
      writtenFiles: [],
      summary: "TDD Test Writer skipped: no tddPlan tests.",
      costUsd: 0,
    };
  }

  const allowedFiles = new Set(tests.map((test) => test.file));
  const requirementIdsByFile = new Map<string, string[]>();
  const typeByFile = new Map<string, string>();
  for (const test of tests) {
    const merged = requirementIdsByFile.get(test.file) ?? [];
    for (const id of test.requirementIds ?? []) {
      if (!merged.includes(id)) merged.push(id);
    }
    requirementIdsByFile.set(test.file, merged);
    if (!typeByFile.has(test.file)) typeByFile.set(test.file, test.type);
  }
  const present = await existingTestFiles(input.outputDir, [...allowedFiles]);
  const missingTests = tests.filter((test) => !present.has(test.file));
  if (missingTests.length === 0) {
    return {
      attempted: false,
      testCount: tests.length,
      writtenFiles: [],
      summary: "TDD Test Writer skipped: all test files already exist.",
      costUsd: 0,
    };
  }

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: [
        "You are a Test Writer in a RED/GREEN TDD pipeline.",
        "Write only test files listed in the manifest. Do not write production code.",
        "Tests must be real, assertion-bearing, executable by the declared command, and initially fail before implementation.",
        // The #1 TDD failure mode: a 'RED' test that already PASSES before any
        // feature code exists — making the RED step meaningless. Forbid it hard.
        "HARD REQUIREMENT — RED VALIDITY: the test MUST FAIL when run RIGHT NOW against the current (unimplemented) code. Assert the SPECIFIC behaviour the feature will produce per its `expectedGreen` / coversRequirementIds — a concrete value, rendered text, computed result, or the exact API-client call + payload. The assertion must be one that an empty/stub/scaffold implementation CANNOT already satisfy.",
        "HARD REQUIREMENT — if the target file/module does not exist yet, import it directly so the test fails on the missing module (that is a valid RED). If it already exists as a scaffold stub, assert the concrete output the stub does NOT yet produce.",
        "FORBIDDEN (these pass before implementation and are NOT valid RED tests): asserting only that a component renders / mounts without error; `expect(x).toBeTruthy()` / `toBeDefined()` on something the scaffold already provides; `expect(true).toBe(true)`; asserting a module is merely importable; snapshot-only tests; asserting an empty/placeholder state that already holds. If your assertion would pass against an empty implementation, it is wrong — tighten it to the real expected behaviour.",
        // HARD requirements — `write_file` will REJECT content that violates these.
        "HARD REQUIREMENT — every test file MUST cite at least one of its `coversRequirementIds` (e.g. FR-AU01, AC-09) verbatim as a string inside the file. Put it in a top-of-file JSDoc comment such as `/** coversRequirementIds: FR-AU01, AC-09 */`. Without this the file is rejected.",
        "HARD REQUIREMENT — backend tests that import from `../db` MUST `vi.mock(\"<relative>/db\")` and substitute an in-memory SQLite Sequelize built with `dialectModule: sqlite3Wasm` (import `{ sqlite3Wasm }` from the `test-support/sqlite3-wasm` module). The test DB runs on a pure-WASM driver, so WITHOUT that `dialectModule` Sequelize throws \"Please install sqlite3\". Canonical example: `backend/src/models/index.test.ts`. Without this the file is rejected (real Postgres is not available in the test runner).",
        "HARD REQUIREMENT — external-API client tests (paths under `services/externalApis/`) MUST mock `globalThis.fetch` (or use msw / nock). Live network access is not permitted; assume rate-limit / offline. Without a mock the file is rejected.",
        "HARD REQUIREMENT — frontend `frontend-service` tests that assert on a literal `/api/...` URL MUST either `vi.stubEnv(\"VITE_API_BASE_URL\", \"\")` before the assertion, or use `expect.stringContaining(\"/api/...\")`. Otherwise the assertion drifts when the env injects a base URL.",
        "Each test must import or reference the declared target route/service/API client/task-owned file, or assert against the declared endpoint string.",
        "INTERACTION-FLOW — a `route-smoke` test MUST do more than assert the page renders. It MUST simulate the page's PRIMARY user interaction (click the main button / submit the form via @testing-library/react `fireEvent` or `userEvent`) and assert the resulting EFFECT: the API client method was called with the expected payload (spy/mock the client and assert `toHaveBeenCalledWith(...)`), OR navigation occurred (mock `useNavigate` / the router and assert it was called with the target route), OR the declared state/text rendered after the interaction. A `route-smoke` test that only asserts render — with no interaction → effect assertion — is INCOMPLETE.",
        "For `frontend-service` tests, assert not just the URL but that the client method is called with the expected request payload / shape.",
        "Do not use skipped tests, todo tests, placeholder assertions, or mock-only tests.",
        "Prefer the test framework already present in the generated project.",
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        `Generated project root: ${input.outputDir}`,
        "",
        "Relevant project context:",
        input.projectContext.slice(0, 12_000),
        "",
        "TDD tests to write:",
        JSON.stringify(missingTests, null, 2),
        "",
        "Inspect package.json / existing tests if needed, then write every missing test file and call report_done.",
      ].join("\n"),
    },
  ];

  const modelChain = resolveModelChain(
    MODEL_CONFIG.phaseVerifyFix ?? MODEL_CONFIG.codeFix ?? "claude-sonnet",
    resolveModel,
  );
  const writtenFiles = new Set<string>();
  let costUsd = 0;
  let finalSummary = "";

  for (let iteration = 0; iteration < MAX_TEST_WRITER_ITERATIONS; iteration++) {
    const response = await chatCompletionWithFallback(messages, modelChain, {
      temperature: 0.1,
      max_tokens: 24000,
      tools: TDD_TEST_WRITER_TOOLS,
      tool_choice: "auto",
    });
    costUsd += estimateCost(response.model, response.usage);
    recordCodingSessionLlmUsage({
      sessionId: input.sessionId,
      stage: "tdd_test_writer",
      model: response.model,
      costUsd: estimateCost(response.model, response.usage),
      promptTokens: response.usage.prompt_tokens,
      completionTokens: response.usage.completion_tokens,
      totalTokens: response.usage.total_tokens,
    });

    const choice = response.choices[0];
    messages.push({
      role: "assistant",
      content: choice.message.content ?? "",
      tool_calls: choice.message.tool_calls,
    });

    const toolCalls = choice.message.tool_calls ?? [];
    if (toolCalls.length === 0) {
      finalSummary = choice.message.content?.slice(0, 500) ?? "";
      break;
    }

    let done = false;
    for (const call of toolCalls) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(call.function.arguments);
      } catch {
        args = {};
      }
      if (call.function.name === "report_done") {
        finalSummary = String(args.summary ?? "");
        done = true;
        messages.push({
          role: "tool",
          content: "acknowledged",
          tool_call_id: call.id,
          name: call.function.name,
        });
        continue;
      }
      const result = await executeTool({
        outputDir: input.outputDir,
        allowedFiles,
        writtenFiles,
        requirementIdsByFile,
        typeByFile,
        name: call.function.name,
        args,
      });
      messages.push({
        role: "tool",
        content: result,
        tool_call_id: call.id,
        name: call.function.name,
      });
    }
    if (done) break;
  }

  const summary =
    finalSummary ||
    `TDD Test Writer wrote ${writtenFiles.size}/${missingTests.length} missing test file(s).`;
  input.emitter?.({
    stage: "tdd-test-writer",
    event: "tdd_tests_written",
    details: {
      requested: missingTests.length,
      writtenFiles: [...writtenFiles],
      costUsd,
    },
  });

  return {
    attempted: true,
    testCount: tests.length,
    writtenFiles: [...writtenFiles],
    summary,
    costUsd,
  };
}
