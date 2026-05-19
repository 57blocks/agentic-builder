/**
 * GET     /api/projects/[projectId]/project-step-snapshot
 *           — no params:   returns ALL step snapshots for this project as { stepId: snapshot, ... }
 *           ?stepId=trd:   returns single snapshot for that step
 *
 * PUT     /api/projects/[projectId]/project-step-snapshot
 *           — persist a snapshot for a specific step.
 *           Body: { stepId, snapshot }
 *
 * DELETE  /api/projects/[projectId]/project-step-snapshot?stepId=coding-session
 *           — remove a single step snapshot. Used by the coding-store
 *             `rerunCoding` action to drop the persisted coding-session
 *             before triggering a fresh full run.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getStepSnapshot,
  getAllStepSnapshots,
  upsertStepSnapshot,
  deleteStepSnapshot,
  type StepSnapshot,
} from "@/lib/project-store";

type RouteContext = { params: Promise<{ projectId: string }> };

export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const { projectId } = await ctx.params;
    const url = new URL(req.url);
    const stepId = url.searchParams.get("stepId");

    // No stepId → return ALL snapshots as { stepId: snapshot, ... }
    if (!stepId) {
      const all = await getAllStepSnapshots(projectId);
      return NextResponse.json({ snapshots: all });
    }

    const snapshot = await getStepSnapshot(projectId, stepId);
    return NextResponse.json({ stepId, snapshot });
  } catch (err) {
    console.error("[api/substage-snapshot] GET error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  try {
    const { projectId } = await ctx.params;
    const body = (await req.json()) as {
      stepId:   string;
      snapshot: StepSnapshot;
    };

    if (!body.stepId || !body.snapshot) {
      return NextResponse.json(
        { error: "Missing required fields: stepId, snapshot." },
        { status: 400 },
      );
    }

    await upsertStepSnapshot(projectId, body.stepId, body.snapshot);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/substage-snapshot] PUT error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  try {
    const { projectId } = await ctx.params;
    const url = new URL(req.url);
    const stepId = url.searchParams.get("stepId");
    if (!stepId) {
      return NextResponse.json(
        { error: "stepId query parameter is required" },
        { status: 400 },
      );
    }
    await deleteStepSnapshot(projectId, stepId);
    return NextResponse.json({ ok: true, stepId });
  } catch (err) {
    console.error("[api/substage-snapshot] DELETE error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
