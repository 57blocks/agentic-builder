/**
 * Guards P0-B: a missing P0 test file produces a self-contained "write it
 * yourself" directive (the worker has no Test Writer tool). The old directive
 * pointed at a tool the worker can't call and left lastMutationAt=never.
 */
import fs from "fs/promises";
import os from "os";
import path from "path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { formatTddRepairBlock } from "../tdd-diagnostics-block";

let tmpDir: string;
let ralphDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "tdd-missing-file-"));
  ralphDir = path.join(tmpDir, ".ralph");
  await fs.mkdir(ralphDir, { recursive: true });
});
afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("formatTddRepairBlock missing-file directive", () => {
  it("tells the worker to write the file itself, with manifest context", async () => {
    await fs.writeFile(
      path.join(ralphDir, "test-manifest.json"),
      JSON.stringify({
        tests: [
          {
            id: "TDD-T-016-001",
            file: "backend/src/services/accessRequestService.test.ts",
            requirementIds: ["REQ-016"],
            targetFiles: ["backend/src/services/accessRequestService.ts"],
            command: "cd backend && pnpm vitest run accessRequestService",
            expectedGreen: "approve() flips status to approved",
          },
        ],
      }),
      "utf-8",
    );
    await fs.writeFile(
      path.join(ralphDir, "tdd-review.json"),
      JSON.stringify({
        p0Errors: [
          {
            testId: "TDD-T-016-001",
            priority: "P0",
            severity: "error",
            file: "backend/src/services/accessRequestService.test.ts",
            message: "TDD test file is missing.",
          },
        ],
        findings: [],
      }),
      "utf-8",
    );

    const block = await formatTddRepairBlock(tmpDir);
    expect(block).toMatch(/Create the missing test file/i);
    expect(block).toMatch(/write_file/);
    expect(block).not.toMatch(/Re-generate.*via the Test Writer/i);
    expect(block).toMatch(/REQ-016/);
    expect(block).toMatch(/accessRequestService\.ts/);
    expect(block).toMatch(/sqlite::memory:/);
  });
});
