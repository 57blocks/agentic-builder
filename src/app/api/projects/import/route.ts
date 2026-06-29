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
import { analyzeProject } from "@/lib/pipeline/import-analysis/build-profile";
import {
  writeProjectProfile,
  type DetectedEndpoint,
  type ProjectProfile,
} from "@/lib/pipeline/project-profile";

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

// UI registry StepIds in display order (see src/_config/pipeline-flow.ts).
// NOTE: the trailing kickoff-phase steps are real StepIds — "kickoff" itself is a
// STAGE, not a step, so it must never be used as an activeStep / snapshot key.
const STEP_ORDER = [
  "intent", "prd", "trd", "sysdesign", "implguide",
  "design", "pencil", "mockup", "qa", "verify",
  "env-setup", "summary", "task-breakdown",
];

/** Legacy engine/stage step ids → UI registry StepIds. The engine emits one
 *  "kickoff" step (a stage in the UI) carrying the task breakdown in
 *  `metadata.taskBreakdown`; the UI renders that under the "task-breakdown" step.
 *  Without this remap, a restored project lands on activeStep="kickoff", which the
 *  step registry has no component for ("Step 'kickoff' not found in registry"). */
const STEP_ID_ALIASES: Record<string, string> = { kickoff: "task-breakdown" };
function normalizeStepId(id: string): string {
  return STEP_ID_ALIASES[id] ?? id;
}

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

/** Subset of `.blueprint/last-kickoff-snapshot.json` we can rebuild step content
 *  from. See `src/lib/pipeline/kickoff-snapshot.ts` for the full schema. */
interface KickoffSnapshotLite {
  savedAt?: string;
  prdContent?: string;
  tasks?: unknown[];
  docs?: {
    prd?: string;
    trd?: string;
    sysdesign?: string;
    implguide?: string;
    design?: string;
  };
}

function readFileSafe(filePath: string): string | null {
  try {
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf-8") : null;
  } catch {
    return null;
  }
}

function readKickoffSnapshot(dirPath: string): KickoffSnapshotLite | null {
  try {
    const p = path.join(dirPath, ".blueprint", "last-kickoff-snapshot.json");
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, "utf-8")) as KickoffSnapshotLite;
  } catch {
    return null;
  }
}

/**
 * Reconstruct a UI pipeline snapshot from the artifacts that actually live in a
 * project directory, for projects that have no `.blueprint/pipeline-snapshot.json`.
 *
 * That file is written to the BUILDER's cwd (see kickoff/pipeline routes), never
 * into the generated project, so an imported external project almost never carries
 * it — yet its PRD/TRD/design/task-breakdown DO exist on disk as the engine's
 * `last-kickoff-snapshot.json` plus the canonical root docs. Combine them into the
 * same `steps`-shaped snapshot `restoreBlueprintState` already knows how to persist.
 */
export function reconstructSnapshotFromArtifacts(dirPath: string): PipelineSnapshot | null {
  const kickoff = readKickoffSnapshot(dirPath);
  const docs = kickoff?.docs ?? {};
  const root = (name: string) => readFileSafe(path.join(dirPath, name));

  const stepContent: Record<string, string | null> = {
    prd: docs.prd || kickoff?.prdContent || root("PRD.md"),
    trd: docs.trd || root("TRD.md"),
    sysdesign: docs.sysdesign || root("SystemDesign.md"),
    implguide: docs.implguide || root("ImplementationGuide.md"),
    design: docs.design || root("DesignSpec.md"),
  };

  const steps: Record<string, PipelineSnapshotStep> = {};
  for (const [stepId, content] of Object.entries(stepContent)) {
    if (content && content.trim()) {
      steps[stepId] = { stepId, status: "completed", content };
    }
  }

  const tasks = Array.isArray(kickoff?.tasks) ? kickoff!.tasks! : [];
  if (tasks.length > 0) {
    // The UI shows the task breakdown under the "task-breakdown" step, reading
    // it from metadata.taskBreakdown (see kickoff/planning/task-breakdown/ui.tsx).
    steps["task-breakdown"] = {
      stepId: "task-breakdown",
      status: "completed",
      content: `Restored ${tasks.length} task(s) from the project's kickoff snapshot.`,
      metadata: { taskBreakdown: tasks },
    };
  }

  if (Object.keys(steps).length === 0) return null;
  return { savedAt: kickoff?.savedAt, steps };
}

/** Project-dir snapshot, preferring the canonical file and falling back to a
 *  reconstruction from on-disk artifacts. */
function loadImportableSnapshot(dirPath: string): PipelineSnapshot | null {
  return readBlueprintSnapshot(dirPath) ?? reconstructSnapshotFromArtifacts(dirPath);
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
  // Normalize legacy/stage step ids (e.g. "kickoff") to UI registry StepIds so the
  // restored snapshots land on steps the UI can actually render.
  const steps: Record<string, PipelineSnapshotStep> = {};
  for (const step of Object.values(snapshot.steps ?? {})) {
    const stepId = normalizeStepId(step.stepId);
    steps[stepId] = { ...step, stepId };
  }
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

// ─── Imported-project metadata backfill (non-invasive) ──────────────────────────
// These ONLY add metadata files (under .blueprint/ + a root API_CONTRACTS.json);
// they never touch the user's source. `project-profile.json`'s presence is what
// later marks the project as "imported" for the coding pipeline.

/** Seed a minimal API_CONTRACTS.json from reverse-extracted endpoints. Types are
 *  left "unknown" — workers refine them; the value is knowing the endpoint set. */
function writeApiContractsDraft(
  dirPath: string,
  endpoints: DetectedEndpoint[],
): void {
  const contracts = endpoints.map((e) => ({
    method: e.method,
    endpoint: e.path,
    requestFields: "unknown",
    responseFields: "unknown",
    authType: "unknown",
    description: `Reverse-extracted from ${e.source ?? "existing code"} during import.`,
  }));
  fs.writeFileSync(
    path.join(dirPath, "API_CONTRACTS.json"),
    JSON.stringify(contracts, null, 2),
    "utf-8",
  );
}

/** Seed a resource-requirements.json draft from detected env keys. Shape matches
 *  loadDeclaredEnvKeys() in role-prompts.ts (array of { envKey, ... }). */
function writeResourceRequirementsDraft(
  dirPath: string,
  envKeys: string[],
): void {
  const reqs = envKeys.map((k) => ({
    envKey: k,
    label: k,
    description: "",
    category: "other",
    required: false,
    value: "",
  }));
  const bp = path.join(dirPath, ".blueprint");
  fs.mkdirSync(bp, { recursive: true });
  fs.writeFileSync(
    path.join(bp, "resource-requirements.json"),
    JSON.stringify(reqs, null, 2),
    "utf-8",
  );
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
      const snapshot = loadImportableSnapshot(dirPath);
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

    // ── Analyze: detect an external project's stack, no writes ────────────────
    if (action === "analyze") {
      const body = (await req.json()) as { dirPath?: string };
      const dirPath = body.dirPath?.trim();
      if (!dirPath) {
        return NextResponse.json({ message: "dirPath is required." }, { status: 400 });
      }
      if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
        return NextResponse.json({ message: "Directory not found." }, { status: 400 });
      }
      const report = await analyzeProject(dirPath);
      return NextResponse.json(report);
    }

    // ── Backfill: write .blueprint metadata for an imported project + create it ─
    if (action === "backfill") {
      const body = (await req.json()) as {
        name?: string;
        dirPath?: string;
        id?: string;
        profile?: ProjectProfile; // possibly user-corrected in the review UI
      };
      const { name, dirPath, id: clientId, profile: edited } = body;
      if (!name?.trim()) {
        return NextResponse.json({ message: "Project name is required." }, { status: 400 });
      }
      if (!dirPath?.trim()) {
        return NextResponse.json({ message: "Project directory is required." }, { status: 400 });
      }
      if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
        return NextResponse.json({ message: "Directory not found." }, { status: 400 });
      }

      // Use the (possibly edited) profile from the review screen, else re-analyze.
      const profile = edited ?? (await analyzeProject(dirPath.trim())).profile;

      await writeProjectProfile(dirPath.trim(), profile);
      const generated = [".blueprint/project-profile.json"];
      if (profile.detectedEndpoints.length > 0) {
        writeApiContractsDraft(dirPath.trim(), profile.detectedEndpoints);
        generated.push("API_CONTRACTS.json");
      }
      if (profile.envKeys.length > 0) {
        writeResourceRequirementsDraft(dirPath.trim(), profile.envKeys);
        generated.push(".blueprint/resource-requirements.json");
      }

      const project = await createProject(name.trim(), dirPath.trim(), clientId, userId);
      return NextResponse.json({ project, imported: true, generated }, { status: 201 });
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

    const snapshot = loadImportableSnapshot(dirPath);
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
