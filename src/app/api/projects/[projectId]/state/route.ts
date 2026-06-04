/**
 * GET  /api/projects/[projectId]/state  — load stage state for a project
 * PUT  /api/projects/[projectId]/state  — upsert stage state
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getStageState,
  upsertStageState,
  updateProjectName,
  type StageStateRow,
} from "@/lib/project-store";
import { resolveUserId } from "@/lib/session";

type RouteContext = { params: Promise<{ projectId: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  try {
    const { projectId } = await ctx.params;
    const stageState = await getStageState(projectId);
    return NextResponse.json({ stageState });
  } catch (err) {
    console.error("[api/projects/[projectId]/state] GET error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  try {
    const userId = await resolveUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await ctx.params;
    const body = (await req.json()) as {
      stageState?: Partial<StageStateRow>;
    };

    if (body.stageState?.projectName) {
      const result = await updateProjectName(projectId, body.stageState.projectName, userId);
      if (result.forbidden) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    if (body.stageState) {
      await upsertStageState(projectId, body.stageState);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/projects/[projectId]/state] PUT error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
