/**
 * PATCH  /api/projects/[projectId] — rename a project (owner or collaborator)
 * DELETE /api/projects/[projectId] — delete a project (owner only)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  deleteProject,
  updateProjectName,
  getProjectBySlug,
  getProjectById,
} from "@/lib/project-store";
import { resolveUserId } from "@/lib/session";
import { db } from "@/lib/db/client";
import { projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

type RouteContext = { params: Promise<{ projectId: string }> };

async function resolveProjectId(idOrSlug: string): Promise<string | null> {
  const byId = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.id, idOrSlug))
    .limit(1);
  if (byId[0]) return byId[0].id;

  const bySlug = await getProjectBySlug(idOrSlug);
  return bySlug?.id ?? null;
}

export async function GET(_req: NextRequest, ctx: RouteContext) {
  try {
    const { projectId } = await ctx.params;
    const project = await getProjectById(projectId);
    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ project });
  } catch (err) {
    console.error("[GET /api/projects/:id]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    const userId = await resolveUserId(req);
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as { name?: unknown };
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!name) {
      return NextResponse.json({ message: "Project name is required." }, { status: 400 });
    }
    if (name.length > 120) {
      return NextResponse.json(
        { message: "Project name must be 120 characters or fewer." },
        { status: 400 },
      );
    }

    const id = await resolveProjectId(projectId);
    if (!id) {
      return NextResponse.json({ message: "Project not found." }, { status: 404 });
    }

    const result = await updateProjectName(id, name, userId);
    if (result.forbidden) {
      return NextResponse.json(
        { message: "You do not have permission to edit this project." },
        { status: 403 },
      );
    }

    return NextResponse.json({ ok: true, name });
  } catch (err) {
    console.error("[api/projects/[projectId]] PATCH error:", err);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  try {
    const userId = await resolveUserId(req);
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await ctx.params;
    const id = await resolveProjectId(projectId);
    if (!id) {
      return NextResponse.json({ ok: true, deleted: false });
    }

    const result = await deleteProject(id, userId);
    if (result.forbidden) {
      return NextResponse.json(
        { message: "Only the project owner can delete this project." },
        { status: 403 },
      );
    }

    return NextResponse.json({ ok: true, deleted: result.deleted });
  } catch (err) {
    console.error("[api/projects/[projectId]] DELETE error:", err);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
