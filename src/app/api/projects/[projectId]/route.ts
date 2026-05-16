/**
 * PATCH  /api/projects/[projectId] — rename a project
 * DELETE /api/projects/[projectId] — delete a project (cascades to all child rows)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  deleteProject,
  updateProjectName,
  getProjectBySlug,
} from "@/lib/project-store";
import { db } from "@/lib/db/client";
import { projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

type RouteContext = { params: Promise<{ projectId: string }> };

/**
 * Resolve the URL `projectId` segment to the real `projects.id`. The URL uses
 * the UUID in most cases (the AppNav links to `/project/${project.id}`) but
 * a few places pass the slug. Try `id` first, then fall back to `slug`.
 */
async function resolveProjectId(idOrSlug: string): Promise<string | null> {
  // Try by id (uuid).
  const byId = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.id, idOrSlug))
    .limit(1);
  if (byId[0]) return byId[0].id;

  // Fall back to slug.
  const bySlug = await getProjectBySlug(idOrSlug);
  return bySlug?.id ?? null;
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    const { projectId } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as { name?: unknown };

    const name =
      typeof body.name === "string" ? body.name.trim() : "";

    if (!name) {
      return NextResponse.json(
        { message: "Project name is required." },
        { status: 400 },
      );
    }
    if (name.length > 120) {
      return NextResponse.json(
        { message: "Project name must be 120 characters or fewer." },
        { status: 400 },
      );
    }

    const id = await resolveProjectId(projectId);
    if (!id) {
      return NextResponse.json(
        { message: "Project not found." },
        { status: 404 },
      );
    }

    await updateProjectName(id, name);
    return NextResponse.json({ ok: true, name });
  } catch (err) {
    console.error("[api/projects/[projectId]] PATCH error:", err);
    return NextResponse.json(
      { message: "Internal server error." },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  try {
    const { projectId } = await ctx.params;
    const id = await resolveProjectId(projectId);
    if (!id) {
      // Idempotent — treat as already-deleted.
      return NextResponse.json({ ok: true, deleted: false });
    }

    const deleted = await deleteProject(id);
    return NextResponse.json({ ok: true, deleted });
  } catch (err) {
    console.error("[api/projects/[projectId]] DELETE error:", err);
    return NextResponse.json(
      { message: "Internal server error." },
      { status: 500 },
    );
  }
}
