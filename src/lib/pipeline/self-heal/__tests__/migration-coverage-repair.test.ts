/**
 * Tests for runMigrationCoverageRepair — reads the per-task coverage
 * report and produces deterministic repair-task descriptors.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  formatMigrationCoverageBlock,
  runMigrationCoverageRepair,
} from "../migration-coverage-repair";

let outputDir: string;

beforeEach(async () => {
  outputDir = await fs.mkdtemp(path.join(os.tmpdir(), "ab-mig-repair-"));
});

afterEach(async () => {
  await fs.rm(outputDir, { recursive: true, force: true });
});

async function writeReport(report: unknown): Promise<void> {
  const ralphDir = path.join(outputDir, ".ralph");
  await fs.mkdir(ralphDir, { recursive: true });
  await fs.writeFile(
    path.join(ralphDir, "migration-coverage.json"),
    JSON.stringify(report, null, 2),
    "utf8",
  );
}

describe("runMigrationCoverageRepair — report missing", () => {
  it("returns reportMissing=true and empty tasks when no file exists", async () => {
    const r = await runMigrationCoverageRepair({ outputDir });
    expect(r.reportMissing).toBe(true);
    expect(r.pendingRepairTasks).toEqual([]);
    expect(r.totalGaps).toBe(0);
  });

  it("returns reportMissing=false but empty tasks when JSON is malformed", async () => {
    await fs.mkdir(path.join(outputDir, ".ralph"), { recursive: true });
    await fs.writeFile(
      path.join(outputDir, ".ralph", "migration-coverage.json"),
      "{not valid",
      "utf8",
    );
    const r = await runMigrationCoverageRepair({ outputDir });
    expect(r.reportMissing).toBe(false);
    expect(r.pendingRepairTasks).toEqual([]);
  });
});

describe("runMigrationCoverageRepair — happy path", () => {
  it("produces one repair task per gap, sourceTaskId preserved", async () => {
    await writeReport({
      version: 1,
      updatedAt: "2026-05-09T00:00:00Z",
      tasks: {
        "T-add-user": {
          taskId: "T-add-user",
          taskTitle: "Add User model",
          ok: false,
          modelFilesTouched: ["backend/src/models/User.ts"],
          migrationFilesTouched: [],
          gaps: [
            {
              modelPath: "backend/src/models/User.ts",
              modelName: "User",
              instruction: "Write a migration for User.",
            },
          ],
          checkedAt: "2026-05-09T00:00:00Z",
        },
      },
    });
    const r = await runMigrationCoverageRepair({ outputDir });
    expect(r.totalGaps).toBe(1);
    expect(r.tasksWithGaps).toBe(1);
    expect(r.pendingRepairTasks).toHaveLength(1);
    expect(r.pendingRepairTasks[0]?.sourceTaskId).toBe("T-add-user");
    expect(r.pendingRepairTasks[0]?.modelPath).toBe(
      "backend/src/models/User.ts",
    );
    expect(r.pendingRepairTasks[0]?.id).toBe("migration-repair-T-add-user-User");
  });

  it("skips tasks marked ok=true", async () => {
    await writeReport({
      version: 1,
      updatedAt: "2026-05-09T00:00:00Z",
      tasks: {
        "T-clean": {
          taskId: "T-clean",
          taskTitle: "OK task",
          ok: true,
          modelFilesTouched: ["backend/src/models/User.ts"],
          migrationFilesTouched: ["backend/src/database/migrations/0002_user.ts"],
          gaps: [],
          checkedAt: "2026-05-09T00:00:00Z",
        },
        "T-broken": {
          taskId: "T-broken",
          taskTitle: "Broken task",
          ok: false,
          modelFilesTouched: ["backend/src/models/Project.ts"],
          migrationFilesTouched: [],
          gaps: [
            {
              modelPath: "backend/src/models/Project.ts",
              modelName: "Project",
              instruction: "Write a migration for Project.",
            },
          ],
          checkedAt: "2026-05-09T00:00:00Z",
        },
      },
    });
    const r = await runMigrationCoverageRepair({ outputDir });
    expect(r.totalGaps).toBe(1);
    expect(r.tasksWithGaps).toBe(1);
    expect(r.pendingRepairTasks[0]?.sourceTaskId).toBe("T-broken");
  });

  it("multiple gaps in one source task → multiple repair tasks, tasksWithGaps stays 1", async () => {
    await writeReport({
      version: 1,
      updatedAt: "2026-05-09T00:00:00Z",
      tasks: {
        "T-multi": {
          taskId: "T-multi",
          taskTitle: "Multi-model",
          ok: false,
          modelFilesTouched: [
            "backend/src/models/User.ts",
            "backend/src/models/Project.ts",
          ],
          migrationFilesTouched: [],
          gaps: [
            {
              modelPath: "backend/src/models/User.ts",
              modelName: "User",
              instruction: "i1",
            },
            {
              modelPath: "backend/src/models/Project.ts",
              modelName: "Project",
              instruction: "i2",
            },
          ],
          checkedAt: "2026-05-09T00:00:00Z",
        },
      },
    });
    const r = await runMigrationCoverageRepair({ outputDir });
    expect(r.totalGaps).toBe(2);
    expect(r.tasksWithGaps).toBe(1);
    expect(r.pendingRepairTasks.map((t) => t.modelName).sort()).toEqual([
      "Project",
      "User",
    ]);
  });
});

describe("runMigrationCoverageRepair — emitter telemetry", () => {
  it("calls the emitter when there are gaps", async () => {
    const events: unknown[] = [];
    const emitter = (e: unknown) => {
      events.push(e);
    };
    await writeReport({
      version: 1,
      updatedAt: "x",
      tasks: {
        T1: {
          taskId: "T1",
          taskTitle: "t1",
          ok: false,
          modelFilesTouched: ["backend/src/models/A.ts"],
          migrationFilesTouched: [],
          gaps: [{ modelPath: "backend/src/models/A.ts", modelName: "A", instruction: "x" }],
          checkedAt: "x",
        },
      },
    });
    await runMigrationCoverageRepair({
      outputDir,
      emitter,
      sessionId: "s1",
    });
    expect(events.length).toBe(1);
    const ev = events[0] as Record<string, unknown>;
    expect(ev.event).toBe("migration-coverage-gaps");
    expect(ev.sessionId).toBe("s1");
  });

  it("does NOT call the emitter when there are no gaps", async () => {
    const events: unknown[] = [];
    const emitter = (e: unknown) => events.push(e);
    await runMigrationCoverageRepair({ outputDir, emitter });
    expect(events.length).toBe(0);
  });
});

describe("runMigrationCoverageRepair — filterByDisk", () => {
  async function writeFile(rel: string, body = ""): Promise<void> {
    const abs = path.join(outputDir, rel);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, body, "utf8");
  }

  it("drops gaps whose model file no longer exists on disk", async () => {
    // T-005 reported a gap for JobRun.ts, but the model has since been
    // deleted by a coverage-repair replan. With no model on disk, the
    // gap is moot and must NOT keep the integration gate red.
    await writeReport({
      version: 1,
      updatedAt: "x",
      tasks: {
        "T-005": {
          taskId: "T-005",
          taskTitle: "stale gap",
          ok: false,
          modelFilesTouched: ["backend/src/models/JobRun.ts"],
          migrationFilesTouched: [],
          gaps: [
            {
              modelPath: "backend/src/models/JobRun.ts",
              modelName: "JobRun",
              instruction: "x",
            },
          ],
          checkedAt: "x",
        },
      },
    });

    const r = await runMigrationCoverageRepair({
      outputDir,
      filterByDisk: true,
    });

    expect(r.pendingRepairTasks).toEqual([]);
    expect(r.totalGaps).toBe(0);
    expect(r.tasksWithGaps).toBe(0);
  });

  it("drops gaps whose model name is covered by a migration filename", async () => {
    await writeFile(
      "backend/src/database/migrations/009-create-ingestion-runs.ts",
    );
    await writeFile("backend/src/models/IngestionRun.ts");
    await writeReport({
      version: 1,
      updatedAt: "x",
      tasks: {
        "T-004": {
          taskId: "T-004",
          taskTitle: "covered",
          ok: false,
          modelFilesTouched: ["backend/src/models/IngestionRun.ts"],
          migrationFilesTouched: [],
          gaps: [
            {
              modelPath: "backend/src/models/IngestionRun.ts",
              modelName: "IngestionRun",
              instruction: "x",
            },
          ],
          checkedAt: "x",
        },
      },
    });

    const r = await runMigrationCoverageRepair({
      outputDir,
      filterByDisk: true,
    });

    expect(r.pendingRepairTasks).toEqual([]);
  });

  it("keeps gaps when the model file exists AND no covering migration", async () => {
    await writeFile("backend/src/models/JobRun.ts");
    await writeReport({
      version: 1,
      updatedAt: "x",
      tasks: {
        "T-005": {
          taskId: "T-005",
          taskTitle: "real gap",
          ok: false,
          modelFilesTouched: ["backend/src/models/JobRun.ts"],
          migrationFilesTouched: [],
          gaps: [
            {
              modelPath: "backend/src/models/JobRun.ts",
              modelName: "JobRun",
              instruction: "x",
            },
          ],
          checkedAt: "x",
        },
      },
    });

    const r = await runMigrationCoverageRepair({
      outputDir,
      filterByDisk: true,
    });

    expect(r.pendingRepairTasks).toHaveLength(1);
    expect(r.pendingRepairTasks[0]?.modelName).toBe("JobRun");
  });

  it("real-world: mixed list collapses to only genuine gaps", async () => {
    // Mirrors the bug seen in production: ReserveReview/Stablecoin
    // ARE covered, JobRun/WeightsAuditLog/ScoreSnapshot models were
    // DELETED. Only "still-on-disk + uncovered" should survive — in
    // this scenario the surviving set is empty.
    await writeFile("backend/src/models/ReserveReview.ts");
    await writeFile("backend/src/models/Stablecoin.ts");
    await writeFile(
      "backend/src/database/migrations/004-create-stablecoins.ts",
    );
    await writeFile(
      "backend/src/database/migrations/011-create-reserve-reviews.ts",
    );
    await writeReport({
      version: 1,
      updatedAt: "x",
      tasks: {
        "T-005": {
          taskId: "T-005",
          taskTitle: "stale + covered mix",
          ok: false,
          modelFilesTouched: [],
          migrationFilesTouched: [],
          gaps: [
            {
              modelPath: "backend/src/models/JobRun.ts",
              modelName: "JobRun",
              instruction: "x",
            },
            {
              modelPath: "backend/src/models/ReserveReview.ts",
              modelName: "ReserveReview",
              instruction: "x",
            },
            {
              modelPath: "backend/src/models/WeightsAuditLog.ts",
              modelName: "WeightsAuditLog",
              instruction: "x",
            },
            {
              modelPath: "backend/src/models/ScoreSnapshot.ts",
              modelName: "ScoreSnapshot",
              instruction: "x",
            },
          ],
          checkedAt: "x",
        },
        "T-REPAIR": {
          taskId: "T-REPAIR",
          taskTitle: "covered gap",
          ok: false,
          modelFilesTouched: [],
          migrationFilesTouched: [],
          gaps: [
            {
              modelPath: "backend/src/models/Stablecoin.ts",
              modelName: "Stablecoin",
              instruction: "x",
            },
          ],
          checkedAt: "x",
        },
      },
    });

    const r = await runMigrationCoverageRepair({
      outputDir,
      filterByDisk: true,
    });

    expect(r.pendingRepairTasks).toEqual([]);
    expect(r.tasksWithGaps).toBe(0);
  });
});

describe("formatMigrationCoverageBlock", () => {
  it("returns empty string when there are no tasks", () => {
    expect(
      formatMigrationCoverageBlock({
        totalGaps: 0,
        tasksWithGaps: 0,
        pendingRepairTasks: [],
        reportMissing: false,
      }),
    ).toBe("");
  });

  it("renders header + per-task bullet + truncates above 12", () => {
    const tasks = Array.from({ length: 15 }, (_, i) => ({
      id: `migration-repair-T${i}-M${i}`,
      sourceTaskId: `T${i}`,
      modelPath: `backend/src/models/M${i}.ts`,
      modelName: `M${i}`,
      directive: `do ${i}`,
    }));
    const out = formatMigrationCoverageBlock({
      totalGaps: 15,
      tasksWithGaps: 15,
      pendingRepairTasks: tasks,
      reportMissing: false,
    });
    expect(out).toContain("## Migration coverage repair");
    expect(out).toContain("Detected 15 Sequelize model file(s)");
    // First 12 listed, then truncation note
    expect(out).toContain("backend/src/models/M0.ts");
    expect(out).toContain("backend/src/models/M11.ts");
    expect(out).toContain("(+3 more, full list");
  });
});
