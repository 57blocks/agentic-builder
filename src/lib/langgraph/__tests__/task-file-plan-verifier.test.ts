/**
 * P1: `modifies` predictions are non-blocking; only a missing `creates` fails.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtemp, writeFile, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import {
  verifyTaskFilePlan,
  snapshotModifiesFiles,
} from "../task-file-plan-verifier";
import type { CodingTask } from "@/lib/pipeline/types";

function task(files: { creates?: string[]; modifies?: string[] }): CodingTask {
  return { id: "T-1", title: "t", files } as unknown as CodingTask;
}

describe("verifyTaskFilePlan — modifies is non-blocking (P1)", () => {
  let dir: string;
  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), "fpv-"));
    await writeFile(join(dir, "b.ts"), "original", "utf-8");
  });
  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("missing planned `creates` → FAILS (blocking)", async () => {
    const t = task({ creates: ["a.ts"], modifies: [] });
    const snap = await snapshotModifiesFiles(t, dir);
    const r = await verifyTaskFilePlan(t, [], snap, dir);
    expect(r.passed).toBe(false);
    expect(r.missingCreates).toContain("a.ts");
  });

  it("untouched predicted `modifies` (file exists, unchanged) → PASSES with warning", async () => {
    const t = task({ creates: [], modifies: ["b.ts"] });
    const snap = await snapshotModifiesFiles(t, dir); // b.ts hashed unchanged
    const r = await verifyTaskFilePlan(t, [], snap, dir); // worker wrote nothing
    expect(r.passed).toBe(true); // ← P1: no longer a failure
    expect(r.unmodified).toContain("b.ts"); // still surfaced as a warning
  });

  it("a generated `creates` → PASSES", async () => {
    const t = task({ creates: ["a.ts"], modifies: [] });
    const snap = await snapshotModifiesFiles(t, dir);
    const r = await verifyTaskFilePlan(t, ["a.ts"], snap, dir);
    expect(r.passed).toBe(true);
  });

  it("missing `creates` still blocks even when only `modifies` is untouched", async () => {
    const t = task({ creates: ["a.ts"], modifies: ["b.ts"] });
    const snap = await snapshotModifiesFiles(t, dir);
    const r = await verifyTaskFilePlan(t, [], snap, dir);
    expect(r.passed).toBe(false);
    expect(r.missingCreates).toContain("a.ts");
    expect(r.unmodified).toContain("b.ts");
  });
});
