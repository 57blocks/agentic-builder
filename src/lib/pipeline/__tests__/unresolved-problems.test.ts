import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import os from "os";
import path from "path";
import {
  recordUnresolvedProblem,
  readUnresolvedProblems,
  summarizeByCategory,
  UNRESOLVED_PROBLEMS_REL,
} from "../unresolved-problems";

describe("unresolved-problems ledger", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "unresolved-"));
  });
  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("returns [] when nothing recorded", async () => {
    expect(await readUnresolvedProblems(dir)).toEqual([]);
  });

  it("appends entries (one JSON line each) and stamps ts", async () => {
    await recordUnresolvedProblem(dir, {
      sessionId: "s1",
      category: "backend-tsc",
      gate: "backend-readiness",
      phase: "backend",
      attempts: 8,
      summary: "backend tsc reports 194 error(s)",
      evidence: ["models/index.ts(4,10): error TS2305: no exported member 'Course'"],
      artifacts: [".ralph/tsc-diagnostics.json"],
    });
    await recordUnresolvedProblem(dir, {
      sessionId: "s1",
      category: "runtime-smoke-404",
      gate: "integration",
      summary: "GET /api/v1/admin/approvals returned 404",
    });
    const all = await readUnresolvedProblems(dir);
    expect(all).toHaveLength(2);
    expect(all[0].ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(all[0].category).toBe("backend-tsc");
    expect(all[0].attempts).toBe(8);
    expect(all[1].category).toBe("runtime-smoke-404");
  });

  it("caps evidence to 12 lines", async () => {
    await recordUnresolvedProblem(dir, {
      sessionId: "s1",
      category: "backend-tsc",
      gate: "x",
      summary: "many errors",
      evidence: Array.from({ length: 50 }, (_, i) => `error ${i}`),
    });
    const [e] = await readUnresolvedProblems(dir);
    expect(e.evidence).toHaveLength(12);
  });

  it("never throws on an unwritable path (swallows)", async () => {
    // Point at a path whose parent is a file, not a dir → mkdir/append fail.
    const badParent = path.join(dir, "afile");
    await fs.writeFile(badParent, "x");
    await expect(
      recordUnresolvedProblem(badParent, {
        sessionId: "s1",
        category: "other",
        gate: "x",
        summary: "should not throw",
      }),
    ).resolves.toBeUndefined();
  });

  it("skips malformed lines on read", async () => {
    const full = path.join(dir, UNRESOLVED_PROBLEMS_REL);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(
      full,
      `{"ts":"t","sessionId":"s","category":"stagnation","gate":"g","summary":"ok"}\nnot json\n`,
    );
    const all = await readUnresolvedProblems(dir);
    expect(all).toHaveLength(1);
    expect(all[0].category).toBe("stagnation");
  });

  it("summarizeByCategory counts categories", () => {
    const counts = summarizeByCategory([
      { ts: "t", sessionId: "s", category: "backend-tsc", gate: "g", summary: "" },
      { ts: "t", sessionId: "s", category: "backend-tsc", gate: "g", summary: "" },
      { ts: "t", sessionId: "s", category: "runtime-smoke-404", gate: "g", summary: "" },
    ]);
    expect(counts).toEqual({ "backend-tsc": 2, "runtime-smoke-404": 1 });
  });
});
