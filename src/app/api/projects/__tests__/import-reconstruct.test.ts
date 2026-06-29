import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

import { reconstructSnapshotFromArtifacts } from "../import/route";

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "import-recon-"));
  fs.mkdirSync(path.join(dir, ".blueprint"), { recursive: true });
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("reconstructSnapshotFromArtifacts", () => {
  it("rebuilds prd/trd/design + kickoff from last-kickoff-snapshot + root docs", () => {
    fs.writeFileSync(
      path.join(dir, ".blueprint", "last-kickoff-snapshot.json"),
      JSON.stringify({
        savedAt: "2026-06-28T00:00:00.000Z",
        docs: { prd: "# PRD body", trd: "# TRD body" },
        tasks: [{ id: "T-001" }, { id: "T-002" }],
      }),
    );
    fs.writeFileSync(path.join(dir, "DesignSpec.md"), "# Design body");

    const snap = reconstructSnapshotFromArtifacts(dir);
    expect(snap).not.toBeNull();
    const steps = snap!.steps!;
    expect(steps.prd?.content).toBe("# PRD body");
    expect(steps.trd?.content).toBe("# TRD body");
    expect(steps.design?.content).toBe("# Design body"); // root fallback (not in kickoff docs)
    // Task breakdown lands on the UI's "task-breakdown" step, not the stage id "kickoff".
    expect(steps.kickoff).toBeUndefined();
    expect(steps["task-breakdown"]?.metadata?.taskBreakdown).toHaveLength(2);
    expect(snap!.savedAt).toBe("2026-06-28T00:00:00.000Z");
    // sysdesign/implguide absent on disk → not fabricated
    expect(steps.sysdesign).toBeUndefined();
  });

  it("falls back to root PRD.md/TRD.md when there is no kickoff snapshot", () => {
    fs.writeFileSync(path.join(dir, "PRD.md"), "# Root PRD");
    fs.writeFileSync(path.join(dir, "TRD.md"), "# Root TRD");

    const snap = reconstructSnapshotFromArtifacts(dir);
    expect(snap!.steps!.prd?.content).toBe("# Root PRD");
    expect(snap!.steps!.trd?.content).toBe("# Root TRD");
    expect(snap!.steps!["task-breakdown"]).toBeUndefined(); // no tasks anywhere
  });

  it("returns null when the directory has no recognizable artifacts", () => {
    expect(reconstructSnapshotFromArtifacts(dir)).toBeNull();
  });
});
