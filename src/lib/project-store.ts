/**
 * PostgreSQL-backed project store — powered by Drizzle ORM.
 *
 * NOTE: This module is Node.js-only (runs in API routes / server actions).
 * Configure DATABASE_URL in .env.local, e.g.:
 *   DATABASE_URL=postgresql://localhost:5432/agentic_builder
 */

import { and, desc, eq, isNotNull, isNull, like, or, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  projectMembers,
  projects,
  projectStageState,
  projectStepSnapshot,
  type ProjectMemberRole,
} from "@/lib/db/schema";
import type { Project } from "@/types/project";

// ─── Helpers ───────────────────────────────────────────────────────────────────

type ProjectRow = { id: string; slug: string; name: string; createdAt: Date | string };

function toProject(row: ProjectRow): Project {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
  };
}

// ─── Projects CRUD ────────────────────────────────────────────────────────────

export async function getProjects(userId: string): Promise<Project[]> {
  const rows = await db
    .select({
      id:        projects.id,
      slug:      projects.slug,
      name:      projects.name,
      createdAt: projects.createdAt,
    })
    .from(projects)
    .leftJoin(
      projectMembers,
      and(
        eq(projectMembers.projectId, projects.id),
        eq(projectMembers.userId, userId),
      ),
    )
    .where(
      or(
        isNull(projects.ownerId),        // legacy projects visible to all
        isNotNull(projectMembers.userId), // projects where this user is a member
      ),
    )
    .orderBy(desc(projects.createdAt));

  return rows.map(toProject);
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  const rows = await db
    .select({
      id:        projects.id,
      slug:      projects.slug,
      name:      projects.name,
      createdAt: projects.createdAt,
    })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1);

  return rows[0] ? toProject(rows[0]) : null;
}

export async function createProject(name: string, clientId: string | undefined, userId: string): Promise<Project> {
  const baseSlug =
    name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") ||
    `project-${Date.now()}`;

  const existing = await db
    .select({ slug: projects.slug })
    .from(projects)
    .where(like(projects.slug, `${baseSlug}%`));

  const taken = new Set(existing.map((r) => r.slug));
  let finalSlug = baseSlug;
  let counter = 2;
  while (taken.has(finalSlug)) {
    finalSlug = `${baseSlug}-${counter++}`;
  }

  const id = clientId ?? crypto.randomUUID();

  const newProject = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(projects)
      .values({ id, slug: finalSlug, name: name.trim(), ownerId: userId })
      .returning({
        id:        projects.id,
        slug:      projects.slug,
        name:      projects.name,
        createdAt: projects.createdAt,
      });
    await tx
      .insert(projectMembers)
      .values({ projectId: id, userId, role: "owner" as ProjectMemberRole });
    return row;
  });

  return toProject(newProject);
}

/**
 * Ensure a project row exists for the given id. If the row is absent (e.g.
 * POST /api/projects failed silently on the client), inserts a minimal
 * placeholder so FK-constrained child tables (step_snapshot, step_navigation)
 * can write without error. Uses ON CONFLICT DO NOTHING so it is always safe
 * to call before any child-table write.
 */
export async function ensureProjectExists(id: string): Promise<void> {
  await db
    .insert(projects)
    .values({ id, slug: id, name: "New Project" })
    .onConflictDoNothing();
}

export async function updateProjectName(
  projectId: string,
  name: string,
  userId: string,
): Promise<{ forbidden: boolean }> {
  const [member] = await db
    .select({ role: projectMembers.role })
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId),
      ),
    )
    .limit(1);

  if (!member) {
    // Allow if legacy project (owner_id IS NULL)
    const [project] = await db
      .select({ ownerId: projects.ownerId })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);
    if (!project || project.ownerId !== null) return { forbidden: true };
  }

  await db
    .update(projects)
    .set({ name: name.trim() })
    .where(eq(projects.id, projectId));

  return { forbidden: false };
}

/**
 * Delete a project. FK cascades on child tables (project_stage_state,
 * project_step_snapshot, memory rows with this projectId, etc.) handle
 * cleanup, so a single DELETE on `projects` is sufficient.
 *
 * Returns forbidden when the caller lacks delete permission, deleted=false
 * when no project with that id existed (idempotent caller behavior).
 */
export async function deleteProject(
  projectId: string,
  userId: string,
): Promise<{ forbidden: boolean; deleted: boolean }> {
  const [project] = await db
    .select({ ownerId: projects.ownerId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) return { forbidden: false, deleted: false };

  // Legacy project (no owner): any authenticated user may delete
  // Owned project: only the owner may delete
  if (project.ownerId !== null && project.ownerId !== userId) {
    return { forbidden: true, deleted: false };
  }

  const rows = await db
    .delete(projects)
    .where(eq(projects.id, projectId))
    .returning({ id: projects.id });

  return { forbidden: false, deleted: rows.length > 0 };
}

// ─── Stage State ──────────────────────────────────────────────────────────────

export interface StageStateRow {
  activeStage:         string;
  activeSubStages:     Record<string, string>;
  projectName:         string;
  intentMessages:      unknown[];
  intentEnrichedBrief: string;
}

export async function getStageState(projectId: string): Promise<StageStateRow | null> {
  const rows = await db
    .select({
      activeStage:         projectStageState.activeStage,
      activeSubStages:     projectStageState.activeSubStages,
      projectName:         projectStageState.projectName,
      intentMessages:      projectStageState.intentMessagesJson,
      intentEnrichedBrief: projectStageState.intentEnrichedBrief,
    })
    .from(projectStageState)
    .where(eq(projectStageState.projectId, projectId))
    .limit(1);

  if (!rows[0]) return null;
  return rows[0] as StageStateRow;
}

export async function upsertStageState(
  projectId: string,
  state: Partial<StageStateRow>,
): Promise<void> {
  const values = {
    projectId,
    activeStage:         state.activeStage          ?? "preparation",
    activeSubStages:     (state.activeSubStages      ?? {}) as Record<string, string>,
    projectName:         state.projectName          ?? "New Project",
    intentMessagesJson:  (state.intentMessages       ?? []) as unknown[],
    intentEnrichedBrief: state.intentEnrichedBrief  ?? "",
    updatedAt:           new Date(),
  };

  await db
    .insert(projectStageState)
    .values(values)
    .onConflictDoUpdate({
      target: projectStageState.projectId,
      set: {
        activeStage:         values.activeStage,
        activeSubStages:     values.activeSubStages,
        projectName:         values.projectName,
        intentMessagesJson:  values.intentMessagesJson,
        intentEnrichedBrief: values.intentEnrichedBrief,
        updatedAt:           sql`NOW()`,
      },
    });
}

// ─── Step Snapshots (flat, keyed by stepId) ────────────────────────────────────

/** Per-step snapshot — only contains this step's own data. */
export interface StepSnapshot {
  content?:   string | null;
  metadata?:  Record<string, unknown> | null;
  status?:    string;
  costUsd?:   number;
  durationMs?: number;
  error?:     string | null;
  model?:     string | null;
}

export async function upsertStepSnapshot(
  projectId: string,
  stepId: string,
  snapshot: StepSnapshot,
): Promise<void> {
  await db
    .insert(projectStepSnapshot)
    .values({
      projectId,
      stepId,
      snapshot: snapshot as unknown as Record<string, unknown>,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [projectStepSnapshot.projectId, projectStepSnapshot.stepId],
      set: {
        snapshot:  snapshot as unknown as Record<string, unknown>,
        updatedAt: sql`NOW()`,
      },
    });
}

/** Remove a single step snapshot. No-op if it does not exist. */
export async function deleteStepSnapshot(
  projectId: string,
  stepId: string,
): Promise<void> {
  await db
    .delete(projectStepSnapshot)
    .where(
      and(
        eq(projectStepSnapshot.projectId, projectId),
        eq(projectStepSnapshot.stepId, stepId),
      ),
    );
}

/** Fetch all step snapshots for a project, returned as { stepId: snapshot, ... }. */
export async function getAllStepSnapshots(
  projectId: string,
): Promise<Record<string, StepSnapshot>> {
  const rows = await db
    .select({ stepId: projectStepSnapshot.stepId, snapshot: projectStepSnapshot.snapshot })
    .from(projectStepSnapshot)
    .where(eq(projectStepSnapshot.projectId, projectId));

  const result: Record<string, StepSnapshot> = {};
  for (const row of rows) {
    result[row.stepId] = row.snapshot as StepSnapshot;
  }
  return result;
}

export async function getStepSnapshot(
  projectId: string,
  stepId: string,
): Promise<StepSnapshot | null> {
  const rows = await db
    .select({ snapshot: projectStepSnapshot.snapshot })
    .from(projectStepSnapshot)
    .where(
      and(
        eq(projectStepSnapshot.projectId, projectId),
        eq(projectStepSnapshot.stepId,    stepId),
      ),
    )
    .limit(1);

  return (rows[0]?.snapshot as StepSnapshot) ?? null;
}

// ─── Sub-Stage Snapshots (legacy, used by pipeline-store) ──────────────────────

/** Full pipeline state persisted per (project, stage, sub-stage). */
export interface SubStageSnapshot {
  featureBrief:  string;
  currentStep:   string | null;
  totalCostUsd:  number;
  isRunning:     boolean;
  fastFromPrd:   boolean;
  codeOutputDir: string;
  steps:         Record<string, unknown>;
  designStyles?:           Record<string, unknown>[] | null;
  designStylesLoading?:    boolean;
  designStylesError?:      string | null;
  selectedDesignStyleId?:  string | null;
  intentMessages?:         unknown[];
  intentEnrichedBrief?:    string;
}

export async function upsertSubStageSnapshot(
  projectId: string,
  _stageId: string,
  subStageId: string,
  snapshot: SubStageSnapshot,
): Promise<void> {
  // Map to the flat project_step_snapshot table using subStageId as stepId
  await db
    .insert(projectStepSnapshot)
    .values({
      projectId,
      stepId: subStageId,
      snapshot: snapshot as unknown as Record<string, unknown>,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [projectStepSnapshot.projectId, projectStepSnapshot.stepId],
      set: {
        snapshot:  snapshot as unknown as Record<string, unknown>,
        updatedAt: sql`NOW()`,
      },
    });
}

export async function getSubStageSnapshot(
  projectId: string,
  _stageId: string,
  subStageId: string,
): Promise<SubStageSnapshot | null> {
  const rows = await db
    .select({ snapshot: projectStepSnapshot.snapshot })
    .from(projectStepSnapshot)
    .where(
      and(
        eq(projectStepSnapshot.projectId, projectId),
        eq(projectStepSnapshot.stepId,    subStageId),
      ),
    )
    .limit(1);

  return (rows[0]?.snapshot as SubStageSnapshot) ?? null;
}
