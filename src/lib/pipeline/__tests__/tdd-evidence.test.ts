/**
 * Guards the P0-B fix: gate uses LATEST event per (test, phase) instead of
 * a once-failed-forever-blocking history aggregation, and respects the
 * sessionId filter introduced by P0-A.
 */
import fs from "fs/promises";
import os from "os";
import path from "path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  evaluateTddHardGate,
  readTddEvidenceSummary,
  type TddEvidenceEvent,
} from "../tdd-evidence";

let tmpDir: string;

async function writeFixture(events: TddEvidenceEvent[]): Promise<void> {
  const ralphDir = path.join(tmpDir, ".ralph");
  await fs.mkdir(ralphDir, { recursive: true });
  await fs.writeFile(
    path.join(ralphDir, "tdd-evidence.jsonl"),
    events.map((e) => JSON.stringify(e)).join("\n") + "\n",
    "utf-8",
  );
  await fs.writeFile(
    path.join(ralphDir, "test-manifest.json"),
    JSON.stringify({
      generatedAt: new Date(0).toISOString(),
      source: "task-breakdown",
      tests: [
        {
          id: "T1",
          taskId: "T-001",
          requirementIds: ["FR-A"],
          priority: "P0",
          file: "tests/T1.test.ts",
          command: "vitest run T1",
        },
      ],
    }),
    "utf-8",
  );
}

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "tdd-evidence-test-"));
});
afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("readTddEvidenceSummary — latest-event semantics", () => {
  it("treats a test as healthy when its LATEST green event is pass, even if it failed earlier", async () => {
    await writeFixture([
      {
        testId: "T1",
        phase: "red",
        status: "expected_fail",
        expectedFailureMatched: true,
        timestamp: "2026-05-19T00:00:00Z",
      },
      {
        testId: "T1",
        phase: "green",
        status: "fail",
        timestamp: "2026-05-19T01:00:00Z",
      },
      {
        testId: "T1",
        phase: "green",
        status: "pass",
        timestamp: "2026-05-19T02:00:00Z",
      },
    ]);
    const summary = await readTddEvidenceSummary(tmpDir);
    expect(summary.greenPassed).toBe(1);
    expect(summary.p0BlockingFailures).toEqual([]);
  });

  it("marks a test blocking when its LATEST green event is fail, even if it passed once", async () => {
    await writeFixture([
      {
        testId: "T1",
        phase: "red",
        status: "expected_fail",
        expectedFailureMatched: true,
        timestamp: "2026-05-19T00:00:00Z",
      },
      {
        testId: "T1",
        phase: "green",
        status: "pass",
        timestamp: "2026-05-19T01:00:00Z",
      },
      {
        testId: "T1",
        phase: "green",
        status: "fail",
        timestamp: "2026-05-19T02:00:00Z",
      },
    ]);
    const summary = await readTddEvidenceSummary(tmpDir);
    expect(summary.greenPassed).toBe(0);
    expect(summary.p0BlockingFailures).toEqual(["T1"]);
  });
});

describe("readTddEvidenceSummary — sessionId filter (P0-A)", () => {
  it("ignores events from other sessions when sessionId is supplied", async () => {
    await writeFixture([
      // Old session: passed
      {
        testId: "T1",
        phase: "red",
        status: "expected_fail",
        expectedFailureMatched: true,
        sessionId: "old",
        timestamp: "2026-05-18T00:00:00Z",
      },
      {
        testId: "T1",
        phase: "green",
        status: "pass",
        sessionId: "old",
        timestamp: "2026-05-18T01:00:00Z",
      },
      // Current session: failing — gate should see only this
      {
        testId: "T1",
        phase: "red",
        status: "expected_fail",
        expectedFailureMatched: true,
        sessionId: "new",
        timestamp: "2026-05-19T00:00:00Z",
      },
      {
        testId: "T1",
        phase: "green",
        status: "fail",
        sessionId: "new",
        timestamp: "2026-05-19T01:00:00Z",
      },
    ]);
    const summary = await readTddEvidenceSummary(tmpDir, { sessionId: "new" });
    expect(summary.greenPassed).toBe(0);
    expect(summary.p0BlockingFailures).toEqual(["T1"]);
  });

  it("ignores events with no sessionId when filtering — stale evidence does not leak through", async () => {
    await writeFixture([
      {
        testId: "T1",
        phase: "green",
        status: "pass",
        // No sessionId — pre-rotation event.
        timestamp: "2026-05-18T01:00:00Z",
      },
    ]);
    const summary = await readTddEvidenceSummary(tmpDir, { sessionId: "new" });
    expect(summary.greenPassed).toBe(0);
    expect(summary.p0BlockingFailures).toEqual(["T1"]);
  });
});

describe("evaluateTddHardGate (P1-B)", () => {
  it("passes when no review file exists AND latest green is pass", async () => {
    await writeFixture([
      {
        testId: "T1",
        phase: "red",
        status: "expected_fail",
        expectedFailureMatched: true,
        timestamp: "2026-05-19T00:00:00Z",
      },
      {
        testId: "T1",
        phase: "green",
        status: "pass",
        timestamp: "2026-05-19T01:00:00Z",
      },
    ]);
    const gate = await evaluateTddHardGate(tmpDir);
    expect(gate.pass).toBe(true);
    expect(gate.reasons).toEqual([]);
  });

  it("fails when review.json has P0 errors", async () => {
    await writeFixture([
      {
        testId: "T1",
        phase: "green",
        status: "pass",
        timestamp: "2026-05-19T01:00:00Z",
      },
    ]);
    await fs.writeFile(
      path.join(tmpDir, ".ralph", "tdd-review.json"),
      JSON.stringify({
        manifestPresent: true,
        totalTests: 1,
        findings: [
          {
            testId: "T1",
            priority: "P0",
            severity: "error",
            file: "tests/T1.test.ts",
            message: "x",
          },
        ],
        p0Errors: [
          {
            testId: "T1",
            priority: "P0",
            severity: "error",
            file: "tests/T1.test.ts",
            message: "x",
          },
        ],
        summary: "1 P0 error",
      }),
      "utf-8",
    );
    const gate = await evaluateTddHardGate(tmpDir);
    expect(gate.pass).toBe(false);
    expect(gate.reviewP0Errors).toBe(1);
    expect(gate.reasons.join(" ")).toMatch(/P0 error/);
  });

  it("fails when latest GREEN for a P0 test is fail", async () => {
    await writeFixture([
      {
        testId: "T1",
        phase: "green",
        status: "fail",
        timestamp: "2026-05-19T01:00:00Z",
      },
    ]);
    const gate = await evaluateTddHardGate(tmpDir);
    expect(gate.pass).toBe(false);
    expect(gate.p0LatestGreenFailures).toEqual(["T1"]);
  });
});
