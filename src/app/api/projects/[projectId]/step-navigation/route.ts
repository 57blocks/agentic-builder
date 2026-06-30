/**
 * GET  /api/projects/[projectId]/step-navigation  — get current active step for a project
 * PUT  /api/projects/[projectId]/step-navigation  — update active step
 */

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { db } from "@/lib/db/client";
import { projectStepNavigation } from "@/lib/db/schema";
import { ensureProjectExists, getProjectById } from "@/lib/project-store";
import { resolveUserId } from "@/lib/session";
import { readProjectProfile } from "@/lib/pipeline/project-profile";
import { desc, eq } from "drizzle-orm";

type RouteContext = { params: Promise<{ projectId: string }> };

/**
 * Imported-project signals for three-way routing:
 *   - empty dir (no code detected) → behave like a new project (initial/intent)
 *   - has code, no PRD             → PRD step, auto-generate a baseline PRD
 *   - has code + PRD               → PRD step, show it
 * `hasCode` is "the analyzer recognized a real stack" (frontend/backend/repos),
 * which distinguishes a real imported codebase from an empty/blank directory.
 */
async function importedSignals(projectId: string): Promise<{
  imported: boolean;
  hasCode: boolean;
  hasBaselinePrd: boolean;
}> {
  try {
    const project = await getProjectById(projectId);
    const dir = project?.codeOutputDir;
    if (!dir) return { imported: false, hasCode: false, hasBaselinePrd: false };
    const profile = await readProjectProfile(dir);
    const hasCode = !!(
      profile &&
      (profile.stack.frontend ||
        profile.stack.backend ||
        (profile.repos?.length ?? 0) > 0)
    );
    const hasBaselinePrd = fs.existsSync(
      path.join(dir, ".blueprint", "PRD.md"),
    );
    return { imported: !!profile?.imported, hasCode, hasBaselinePrd };
  } catch {
    return { imported: false, hasCode: false, hasBaselinePrd: false };
  }
}

export async function GET(_req: NextRequest, ctx: RouteContext) {
  try {
    const { projectId } = await ctx.params;

    const [row] = await db
      .select()
      .from(projectStepNavigation)
      .where(eq(projectStepNavigation.projectId, projectId))
      .orderBy(desc(projectStepNavigation.updatedAt))
      .limit(1);

    const sig = await importedSignals(projectId);

    if (!row) {
      // Has code (real imported codebase) → open on PRD (show/generate the
      // baseline). Empty/blank imported dir → behave like a new project.
      return NextResponse.json({
        activeStep: sig.hasCode ? "prd" : "initial",
        tier: "M",
        ...sig,
      });
    }

    return NextResponse.json({
      activeStep: row.activeStep,
      tier: row.tier,
      ...sig,
    });
  } catch (err) {
    console.error("[step-navigation] GET error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  try {
    const { projectId } = await ctx.params;
    const body = (await req.json()) as { activeStep?: string; tier?: string };
    const activeStep = body.activeStep ?? "initial";
    const tier = body.tier ?? "M";
    const updatedAt = new Date();

    const userId = await resolveUserId(req);
    await ensureProjectExists(projectId, userId);

    // Compatibility path:
    // some environments may miss/lose a unique constraint for project_id,
    // so relying purely on ON CONFLICT can fail at runtime.
    const updated = await db
      .update(projectStepNavigation)
      .set({
        activeStep,
        tier,
        updatedAt,
      })
      .where(eq(projectStepNavigation.projectId, projectId))
      .returning({ projectId: projectStepNavigation.projectId });

    if (updated.length === 0) {
      await db.insert(projectStepNavigation).values({
        projectId,
        activeStep,
        tier,
        updatedAt,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[step-navigation] PUT error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
