/**
 * Formats TDD artefacts into a per-finding actionable repair block that
 * the IntegrationVerifyFix worker can act on directly.
 *
 * Each finding/failure is translated into a concrete "Edit X to do Y"
 * directive — abstract directives like "fix test quality" were observed
 * to leave the worker spinning without writing anything (session
 * 1f29caa5 ran 9 repair cycles with lastMutationAt=never).
 */
import fs from "fs/promises";
import path from "path";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readJson(filePath: string): Promise<unknown | null> {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf-8"));
  } catch {
    return null;
  }
}

async function readJsonl(filePath: string): Promise<unknown[]> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line) as unknown;
        } catch {
          return null;
        }
      })
      .filter((item): item is unknown => item !== null);
  } catch {
    return [];
  }
}

const MAX_EXCERPT_LINES = 20;

function trimExcerpt(value: string): string {
  const lines = value.split("\n");
  if (lines.length <= MAX_EXCERPT_LINES) return value;
  return [
    ...lines.slice(0, MAX_EXCERPT_LINES),
    `… (+${lines.length - MAX_EXCERPT_LINES} more lines)`,
  ].join("\n");
}

interface ManifestTestInfo {
  id: string;
  requirementIds: string[];
  type?: string;
  command?: string;
  expectedRed?: string;
  expectedGreen?: string;
  targetFiles: string[];
}

function manifestTestsByFile(
  manifestTests: unknown[],
): Map<string, ManifestTestInfo> {
  const map = new Map<string, ManifestTestInfo>();
  for (const entry of manifestTests) {
    if (!isRecord(entry)) continue;
    const file = typeof entry.file === "string" ? entry.file : undefined;
    if (!file) continue;
    if (map.has(file)) continue;
    const reqs = Array.isArray(entry.requirementIds)
      ? (entry.requirementIds.filter((id) => typeof id === "string") as string[])
      : [];
    const targetFiles = Array.isArray(entry.targetFiles)
      ? (entry.targetFiles.filter((f) => typeof f === "string") as string[])
      : [];
    map.set(file, {
      id: typeof entry.id === "string" ? entry.id : "?",
      requirementIds: reqs,
      type: typeof entry.type === "string" ? entry.type : undefined,
      command: typeof entry.command === "string" ? entry.command : undefined,
      expectedRed:
        typeof entry.expectedRed === "string" ? entry.expectedRed : undefined,
      expectedGreen:
        typeof entry.expectedGreen === "string"
          ? entry.expectedGreen
          : undefined,
      targetFiles,
    });
  }
  return map;
}

function directiveForReviewFinding(
  finding: Record<string, unknown>,
  testsByFile: ReturnType<typeof manifestTestsByFile>,
): string {
  const file = String(finding.file ?? "");
  const message = String(finding.message ?? "");
  const test = file ? testsByFile.get(file) : undefined;
  const reqExample = test?.requirementIds[0];

  if (/does not cite any covered requirement id/i.test(message) && reqExample) {
    return `Edit \`${file}\` to add a top-of-file JSDoc comment \`/** coversRequirementIds: ${test!.requirementIds.join(", ")} */\` so the reviewer can verify coverage.`;
  }
  if (/imports from "\.\.\/db"/i.test(message)) {
    return `Refactor \`${file}\`: add \`vi.mock("../../../db", () => ({ sequelize: new Sequelize("sqlite::memory:", { logging: false }) }))\` (adjust relative path), then call \`await syncModels()\` in beforeAll. Mirror backend/src/models/index.test.ts.`;
  }
  if (/network mock/i.test(message)) {
    return `Refactor \`${file}\` to mock fetch: \`vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => fixture }))\` or install msw. Remove any direct calls to live external APIs.`;
  }
  if (/literal "\/api\//i.test(message)) {
    return `In \`${file}\`, either call \`vi.stubEnv("VITE_API_BASE_URL", "")\` in beforeAll, or replace the literal URL assertion with \`expect.stringContaining("/api/...")\`.`;
  }
  if (/missing/i.test(message) && /file/i.test(message)) {
    // The verify-fix worker has no Test Writer tool — it must `write_file`
    // the missing test itself. Give it everything it needs inline so it does
    // not stall (the old "re-generate via the Test Writer" directive was a
    // dead-end and left lastMutationAt=never).
    const parts: string[] = [
      `Create the missing test file \`${file}\` with \`write_file\` — the manifest expects it but it is not on disk.`,
    ];
    if (test?.requirementIds.length) {
      parts.push(
        `It must cover requirement id(s) ${test.requirementIds.join(", ")} (cite them in a top-of-file \`/** coversRequirementIds: ... */\` comment).`,
      );
    }
    if (test?.targetFiles.length) {
      parts.push(
        `Import and exercise the implementation under test: ${test.targetFiles
          .slice(0, 6)
          .map((f) => `\`${f}\``)
          .join(", ")}.`,
      );
    }
    if (test?.expectedGreen) {
      parts.push(`Expected behaviour once implemented: ${test.expectedGreen}.`);
    }
    if (test?.command) {
      parts.push(`Make it runnable via \`${test.command}\`.`);
    }
    parts.push(
      "Write real `expect(...)` assertions. If it is a backend test that touches the DB, mock `../db` with sqlite::memory: (mirror backend/src/models/index.test.ts) — do NOT hit real Postgres or live external APIs.",
    );
    return parts.join(" ");
  }
  if (/no assertion/i.test(message)) {
    return `Add at least one real \`expect(...).toEqual/toBe(...)\` assertion to \`${file}\`. The current content has no assertions.`;
  }
  if (/skipped or marked todo/i.test(message)) {
    return `Remove \`.skip\` / \`.todo\` from \`${file}\` and make the test executable.`;
  }
  if (/too small to be meaningful/i.test(message)) {
    return `Expand \`${file}\` (currently <120 chars) with real setup, action, and assertion steps.`;
  }
  return `Address ${message} in \`${file}\`.`;
}

function directiveForGreenFailure(
  event: Record<string, unknown>,
  testsByFile: ReturnType<typeof manifestTestsByFile>,
): string {
  const testId = String(event.testId ?? "?");
  const status = String(event.status ?? "fail");
  const command = String(event.command ?? "");
  if (status === "infra_fail") {
    return `\`${testId}\` failed with infra_fail (exit ${event.exitCode ?? "?"}). The host is missing a tool or service. Either change the command \`${command}\` to a host-available equivalent, or skip the test by removing it from the manifest task.`;
  }
  // Heuristic root-cause hints based on the excerpt.
  const excerpt = String(event.failureExcerpt ?? "");
  const lower = excerpt.toLowerCase();
  const hints: string[] = [];
  if (/eaddrinuse/.test(lower)) {
    hints.push("Backend port is already bound — release it or run on a random port.");
  }
  if (/postgresqueryinterface|sequelize.*connect|econnrefused.*5432/.test(lower)) {
    hints.push(
      "Test connects to real Postgres — mock the db module with sqlite::memory: (see backend/src/models/index.test.ts).",
    );
  }
  if (/coingecko.*429|rate limited|enotfound/.test(lower)) {
    hints.push(
      "Test hits live external API — replace with `vi.stubGlobal(\"fetch\", ...)` returning fixtures.",
    );
  }
  if (/cannot find module|cannot find package/.test(lower)) {
    hints.push("Missing dependency — `pnpm add` the missing package in the relevant workspace.");
  }
  if (/timeout.*waitfor|exceeded timeout/i.test(excerpt)) {
    hints.push(
      "waitFor / async assertion timed out — confirm the implementation actually renders the expected DOM or resolves the awaited promise.",
    );
  }
  const test = testsByFile.get(String(event.file ?? "")) ?? undefined;
  const reqHint = test?.requirementIds.length
    ? ` Requirement ids it covers: ${test.requirementIds.join(", ")}.`
    : "";
  const hintBlock = hints.length > 0 ? ` Probable cause: ${hints.join(" ")}` : "";
  return `\`${testId}\` GREEN failed (exit ${event.exitCode ?? "?"}). Run \`${command}\` locally, read the failing assertion, and fix EITHER the test or the implementation it asserts against.${reqHint}${hintBlock}`;
}

export async function formatTddRepairBlock(outputDir: string): Promise<string> {
  const ralphDir = path.join(outputDir, ".ralph");
  const manifest = await readJson(path.join(ralphDir, "test-manifest.json"));
  const review = await readJson(path.join(ralphDir, "tdd-review.json"));
  const evidence = await readJsonl(path.join(ralphDir, "tdd-evidence.jsonl"));
  const lines: string[] = [];

  const manifestTests =
    isRecord(manifest) && Array.isArray(manifest.tests) ? manifest.tests : [];
  const testsByFile = manifestTestsByFile(manifestTests);
  const reviewP0Errors =
    isRecord(review) && Array.isArray(review.p0Errors) ? review.p0Errors : [];
  const reviewAllFindings =
    isRecord(review) && Array.isArray(review.findings) ? review.findings : [];

  // Use latest-event semantics so each test contributes ONE current
  // failure (matches the P0-B fix in tdd-evidence.ts).
  const latestGreenByTest = new Map<string, Record<string, unknown>>();
  for (const event of evidence) {
    if (!isRecord(event) || event.phase !== "green") continue;
    latestGreenByTest.set(String(event.testId ?? ""), event);
  }
  const greenFailures: Record<string, unknown>[] = [];
  for (const event of latestGreenByTest.values()) {
    if (event.status !== "pass" && event.status !== "skipped") {
      greenFailures.push(event);
    }
  }

  if (
    manifestTests.length === 0 &&
    reviewP0Errors.length === 0 &&
    greenFailures.length === 0
  ) {
    return "";
  }

  lines.push("## TDD Repair Block");
  lines.push(
    "P0 TDD is a hard gate. Each item below is a concrete edit — apply it, then re-run the relevant command. The gate clears once `tdd-review.json` has zero P0 errors AND every P0 test's latest GREEN event is `pass`.",
  );
  lines.push(`- Manifest tests: ${manifestTests.length}`);

  if (reviewP0Errors.length > 0) {
    lines.push("", "### Review errors (P0) — actionable patches");
    for (const finding of reviewP0Errors.slice(0, 15)) {
      if (!isRecord(finding)) continue;
      const directive = directiveForReviewFinding(finding, testsByFile);
      lines.push(`- \`${String(finding.testId ?? "?")}\`: ${directive}`);
    }
    if (reviewP0Errors.length > 15) {
      lines.push(`- _(+${reviewP0Errors.length - 15} more P0 review errors)_`);
    }
  }

  const warnFindings = reviewAllFindings.filter(
    (f) => isRecord(f) && f.severity === "warn",
  );
  if (warnFindings.length > 0) {
    lines.push("", "### Review warnings — fix when convenient");
    for (const finding of warnFindings.slice(0, 5)) {
      if (!isRecord(finding)) continue;
      const directive = directiveForReviewFinding(finding, testsByFile);
      lines.push(`- \`${String(finding.testId ?? "?")}\`: ${directive}`);
    }
  }

  if (greenFailures.length > 0) {
    lines.push("", "### GREEN failures (latest run) — actionable patches");
    for (const event of greenFailures.slice(0, 15)) {
      const directive = directiveForGreenFailure(event, testsByFile);
      lines.push(`- ${directive}`);
      const excerpt = trimExcerpt(String(event.failureExcerpt ?? "").trim());
      if (excerpt) {
        lines.push("  ```");
        for (const line of excerpt.split("\n")) {
          lines.push(`  ${line}`);
        }
        lines.push("  ```");
      }
    }
    if (greenFailures.length > 15) {
      lines.push(`- _(+${greenFailures.length - 15} more GREEN failures)_`);
    }
  }

  return lines.join("\n");
}
