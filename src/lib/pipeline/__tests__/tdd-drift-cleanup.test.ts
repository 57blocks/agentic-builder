/**
 * Guards P0-D: drifted TDD test files (those whose JSDoc header advertises
 * a testId that the current manifest no longer maps to this path) are
 * removed so the Test Writer can recreate them against the current
 * manifest.
 */
import fs from "fs/promises";
import os from "os";
import path from "path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { pruneDriftedTddTests } from "../tdd-drift-cleanup";
import type { CodingTask } from "../types";

let tmpDir: string;

function makeTask(overrides: Partial<CodingTask> = {}): CodingTask {
  return {
    id: "T-001",
    phase: "Backend Services",
    title: "Backend",
    description: "",
    estimatedHours: 1,
    executionKind: "ai_autonomous",
    priority: "P0",
    assignedAgentId: null,
    status: "pending",
    tddPlan: {
      tests: [
        {
          id: "TDD-T-003-001",
          type: "api-contract",
          priority: "P0",
          file: "backend/src/auth.test.ts",
          command: "vitest run auth.test.ts",
          expectedRed: "fails",
          expectedGreen: "passes",
        },
      ],
    },
    ...overrides,
  } as CodingTask;
}

async function writeTestFile(rel: string, content: string): Promise<void> {
  const abs = path.join(tmpDir, rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, content, "utf-8");
}

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "tdd-drift-test-"));
});
afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("pruneDriftedTddTests", () => {
  it("removes a test file whose header advertises a stale testId", async () => {
    await writeTestFile(
      "backend/src/auth.test.ts",
      "/** TDD-T-025-001 [P0/api-contract] */\nimport { expect } from 'vitest';\n",
    );
    const result = await pruneDriftedTddTests(tmpDir, [makeTask()]);
    expect(result.removed).toEqual(["backend/src/auth.test.ts"]);
    expect(result.reasons["backend/src/auth.test.ts"]).toMatch(
      /TDD-T-025-001/,
    );
    await expect(
      fs.access(path.join(tmpDir, "backend/src/auth.test.ts")),
    ).rejects.toThrow();
  });

  it("keeps a test file whose header includes the manifest testId", async () => {
    await writeTestFile(
      "backend/src/auth.test.ts",
      "/** TDD-T-003-001 [P0/api-contract] */\nimport { expect } from 'vitest';\n",
    );
    const result = await pruneDriftedTddTests(tmpDir, [makeTask()]);
    expect(result.removed).toEqual([]);
  });

  it("keeps files with no testId marker at all (Test Writer will overwrite)", async () => {
    await writeTestFile(
      "backend/src/auth.test.ts",
      "// no marker\nimport { expect } from 'vitest';\n",
    );
    const result = await pruneDriftedTddTests(tmpDir, [makeTask()]);
    expect(result.removed).toEqual([]);
  });

  it("silently skips missing files (Test Writer will create them later)", async () => {
    const result = await pruneDriftedTddTests(tmpDir, [makeTask()]);
    expect(result.scanned).toBe(0);
    expect(result.removed).toEqual([]);
  });
});
