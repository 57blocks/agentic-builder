/**
 * POST /api/projects/[projectId]/baseline-prd
 *
 * Reverse-engineer a system-level baseline PRD from an imported project's code
 * + analysis profile, write it to `.blueprint/PRD.md` (so the engine's
 * readImportedPrd consumes it), and persist it to the PRD step snapshot so the
 * UI shows it immediately.
 */

import { NextRequest, NextResponse } from "next/server";
import { getProjectById, upsertStepSnapshot } from "@/lib/project-store";
import { resolveUserId } from "@/lib/session";
import { readProjectProfile } from "@/lib/pipeline/project-profile";
import { generateBaselinePrd } from "@/lib/pipeline/import-analysis/generate-baseline-prd";

type RouteContext = { params: Promise<{ projectId: string }> };

export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const userId = await resolveUserId(req);
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await ctx.params;
    const project = await getProjectById(projectId);
    if (!project) {
      return NextResponse.json({ message: "Project not found." }, { status: 404 });
    }
    const outputDir = project.codeOutputDir;
    if (!outputDir) {
      return NextResponse.json(
        { message: "Project has no code directory." },
        { status: 400 },
      );
    }

    const profile = await readProjectProfile(outputDir);
    if (!profile) {
      return NextResponse.json(
        {
          message:
            "Not an imported project (no .blueprint/project-profile.json). Run import analysis first.",
        },
        { status: 400 },
      );
    }

    const result = await generateBaselinePrd(outputDir, profile);

    // Persist to the PRD step snapshot so the PRD step renders it without a
    // full pipeline rerun.
    await upsertStepSnapshot(projectId, "prd", {
      content: result.content,
      status: "completed",
      metadata: { source: "baseline-reverse", repoCount: result.repoCount },
    });

    return NextResponse.json({
      content: result.content,
      repoCount: result.repoCount,
    });
  } catch (err) {
    console.error("[api/projects/baseline-prd] error:", err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Internal server error." },
      { status: 500 },
    );
  }
}
