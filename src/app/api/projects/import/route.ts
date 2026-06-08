/**
 * POST /api/projects/import?action=scan — scan a directory, detect project metadata
 * POST /api/projects/import             — create project + restore blueprint state
 */

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createProject, upsertStepSnapshot, upsertStageState } from "@/lib/project-store";
import { resolveUserId } from "@/lib/session";
import { db } from "@/lib/db/client";
import { projectStepNavigation } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PipelineSnapshotStep {
  stepId: string;
  status: string;
  content?: string | null;
  metadata?: Record<string, unknown> | null;
  costUsd?: number;
  durationMs?: number;
  error?: string | null;
  model?: string | null;
}

interface PipelineSnapshot {
  savedAt?: string;
  featureBrief?: string;
  codeOutputDir?: string;
  totalCostUsd?: number;
  steps?: Record<string, PipelineSnapshotStep>;
}

export interface ScanResult {
  detectedName: string;
  hasBlueprintState: boolean;
  featureBrief?: string;
  lastCompletedStep?: string;
  completedStepCount: number;
  savedAt?: string;
}

const STEP_ORDER = [
  "intent", "prd", "trd", "sysdesign", "implguide",
  "design", "pencil", "mockup", "qa", "verify", "kickoff",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function detectProjectName(dirPath: string): string {
  try {
    const pkgPath = path.join(dirPath, "package.json");
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as { name?: string };
      if (pkg.name?.trim()) {
        return pkg.name.trim().replace(/^@[^/]+\//, "");
      }
    }
  } catch {
    // ignore read/parse errors
  }
  return path.basename(dirPath);
}

function readBlueprintSnapshot(dirPath: string): PipelineSnapshot | null {
  try {
    const snapshotPath = path.join(dirPath, ".blueprint", "pipeline-snapshot.json");
    if (!fs.existsSync(snapshotPath)) return null;
    return JSON.parse(fs.readFileSync(snapshotPath, "utf-8")) as PipelineSnapshot;
  } catch {
    return null;
  }
}

function getLastCompletedStep(steps: Record<string, PipelineSnapshotStep>): string | undefined {
  let lastStep: string | undefined;
  for (const stepId of STEP_ORDER) {
    if (steps[stepId]?.status === "completed") lastStep = stepId;
  }
  return lastStep;
}

async function restoreBlueprintState(
  projectId: string,
  snapshot: PipelineSnapshot,
): Promise<string | undefined> {
  const steps = snapshot.steps ?? {};
  const completedSteps = Object.values(steps).filter((s) => s.status === "completed");
  if (completedSteps.length === 0) return undefined;

  await Promise.all(
    completedSteps.map((step) =>
      upsertStepSnapshot(projectId, step.stepId, {
        content:    step.content ?? null,
        metadata:   step.metadata ?? null,
        status:     step.status,
        costUsd:    step.costUsd,
        durationMs: step.durationMs,
        error:      step.error ?? null,
        model:      step.model ?? null,
      }),
    ),
  );

  if (snapshot.featureBrief) {
    await upsertStageState(projectId, { intentEnrichedBrief: snapshot.featureBrief });
  }

  const lastStep = getLastCompletedStep(steps);
  if (lastStep) {
    const updated = await db
      .update(projectStepNavigation)
      .set({ activeStep: lastStep, updatedAt: new Date() })
      .where(eq(projectStepNavigation.projectId, projectId))
      .returning({ projectId: projectStepNavigation.projectId });

    if (updated.length === 0) {
      await db.insert(projectStepNavigation).values({
        projectId,
        activeStep: lastStep,
        tier: "M",
        updatedAt: new Date(),
      });
    }
  }

  return lastStep;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const userId = await resolveUserId(req);
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // ── Scan: detect metadata without writing to DB ───────────────────────────
    if (action === "scan") {
      const body = (await req.json()) as { dirPath?: string };
      const dirPath = body.dirPath?.trim();

      if (!dirPath) {
        return NextResponse.json({ message: "dirPath is required." }, { status: 400 });
      }
      if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
        return NextResponse.json({ message: "Directory not found." }, { status: 400 });
      }

      const detectedName = detectProjectName(dirPath);
      const snapshot = readBlueprintSnapshot(dirPath);
      const result: ScanResult = {
        detectedName,
        hasBlueprintState: snapshot !== null,
        completedStepCount: 0,
      };

      if (snapshot?.steps) {
        result.featureBrief = snapshot.featureBrief;
        result.savedAt = snapshot.savedAt;
        result.completedStepCount = Object.values(snapshot.steps).filter(
          (s) => s.status === "completed",
        ).length;
        result.lastCompletedStep = getLastCompletedStep(snapshot.steps);
      }

      return NextResponse.json(result);
    }

    // ── Import: create project + optionally restore blueprint state ───────────
    const body = (await req.json()) as { name?: string; dirPath?: string; id?: string };
    const { name, dirPath, id: clientId } = body;

    if (!name?.trim()) {
      return NextResponse.json({ message: "Project name is required." }, { status: 400 });
    }
    if (!dirPath?.trim()) {
      return NextResponse.json({ message: "Project directory is required." }, { status: 400 });
    }
    if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
      return NextResponse.json({ message: "Directory not found." }, { status: 400 });
    }

    const project = await createProject(name.trim(), dirPath.trim(), clientId, userId);

    const snapshot = readBlueprintSnapshot(dirPath);
    let restoredStep: string | undefined;
    if (snapshot) {
      restoredStep = await restoreBlueprintState(project.id, snapshot);
    }

    return NextResponse.json(
      { project, restored: snapshot !== null, lastStep: restoredStep },
      { status: 201 },
    );
  } catch (err) {
    console.error("[api/projects/import] POST error:", err);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
