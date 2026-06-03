import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

import { resolveCodeOutputRoot } from "@/lib/pipeline/code-output";
import { decomposeSubsystems } from "@/lib/agents/pm/subsystem-decomposer-agent";
import { slicePrd, parseH2Sections } from "@/lib/pipeline/subsystem/slice-prd";

/**
 * On-demand PRD subsystem split. Given a (large, multi-domain) PRD, classify
 * its H2 sections into shared-contract vs. per-subsystem, then write
 * self-contained slices to `<outputRoot>/subsystems/`:
 *   shared.md, <id>.md (= shared contracts + own sections), _plan.json
 *
 * Advisory / non-destructive: only writes under subsystems/, never touches PRD.md.
 *
 * POST body: { prd: string, codeOutputDir?: string }
 */

const SUBDIR = "subsystems";

export async function POST(req: NextRequest) {
  let body: { prd?: string; codeOutputDir?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const prd = (body.prd ?? "").trim();
  if (!prd) return NextResponse.json({ error: "`prd` is required" }, { status: 400 });

  const { sections } = parseH2Sections(prd);
  const headings = sections.map((s) => s.heading);
  if (headings.length < 2) {
    return NextResponse.json({
      split: false,
      reason: "PRD has fewer than 2 sections — nothing to split.",
      sectionCount: headings.length,
    });
  }

  let plan;
  try {
    plan = await decomposeSubsystems(headings);
  } catch (e) {
    return NextResponse.json(
      { error: `decompose failed: ${e instanceof Error ? e.message : String(e)}` },
      { status: 502 },
    );
  }

  if (plan.subsystems.length < 2) {
    return NextResponse.json({
      split: false,
      reason: "Decomposer found fewer than 2 subsystems — keep as a single PRD.",
      model: plan.model,
      notes: plan.notes,
    });
  }

  const sliced = slicePrd(prd, plan);
  const outRoot = resolveCodeOutputRoot(process.cwd(), body.codeOutputDir ?? undefined);
  const dir = path.join(outRoot, SUBDIR);
  await fs.mkdir(dir, { recursive: true });

  const lc = (s: string) => s.split("\n").length;
  const files: { id: string; name: string; file: string; lines: number; sections: number }[] = [];

  await fs.writeFile(path.join(dir, "shared.md"), sliced.shared.markdown, "utf8");
  files.push({ id: "shared", name: "Shared contracts", file: `${SUBDIR}/shared.md`, lines: lc(sliced.shared.markdown), sections: plan.sharedHeadings.length });

  for (const sub of sliced.subsystems) {
    await fs.writeFile(path.join(dir, `${sub.id}.md`), sub.markdown, "utf8");
    const def = plan.subsystems.find((s) => s.id === sub.id);
    files.push({ id: sub.id, name: sub.name, file: `${SUBDIR}/${sub.id}.md`, lines: lc(sub.markdown), sections: def?.sectionHeadings.length ?? 0 });
  }

  const planJson = { subsystems: plan.subsystems, sharedHeadings: plan.sharedHeadings, notes: plan.notes, model: plan.model, unassigned: sliced.unassigned };
  await fs.writeFile(path.join(dir, "_plan.json"), JSON.stringify(planJson, null, 2), "utf8");

  return NextResponse.json({
    split: true,
    model: plan.model,
    notes: plan.notes,
    outputDir: `${SUBDIR}/`,
    unassigned: sliced.unassigned,
    files,
  });
}
