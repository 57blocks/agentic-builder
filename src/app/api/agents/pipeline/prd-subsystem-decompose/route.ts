import { NextRequest, NextResponse } from "next/server";

import { resolveCodeOutputRoot } from "@/lib/pipeline/code-output";
import { decomposePrdIntoSubsystems } from "@/lib/pipeline/subsystems/decompose";
import { writeSubsystemManifest } from "@/lib/pipeline/subsystems/manifest-io";
import {
  stampDomainMdPaths,
  writeDomainFiles,
} from "@/lib/pipeline/subsystems/domain-files";

/**
 * On-demand DDD subsystem decomposition. Runs the Phase-0 decomposer
 * (PRD inventory → business-domain manifest + dependency DAG), persists it to
 * `.blueprint/subsystems.json` (where developBySubsystem reads it), and returns
 * the manifest + validation + build layers for the PRD-step UI to render.
 *
 * Advisory — never runs codegen. POST body: { prd, codeOutputDir?, tier? }
 */
export async function POST(req: NextRequest) {
  let body: { prd?: string; codeOutputDir?: string; tier?: "S" | "M" | "L" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const prd = (body.prd ?? "").trim();
  if (!prd) return NextResponse.json({ error: "`prd` is required" }, { status: 400 });

  let result;
  try {
    result = await decomposePrdIntoSubsystems(prd, { tier: body.tier });
  } catch (e) {
    return NextResponse.json(
      { error: `decompose failed: ${e instanceof Error ? e.message : String(e)}` },
      { status: 502 },
    );
  }

  // Persist the manifest so the DDD orchestrator (developBySubsystem) can pick it up.
  let manifestSaved = false;
  let domainFilesSaved = false;
  if (result.validation.ok && result.manifest.subsystems.length > 0) {
    const outRoot = resolveCodeOutputRoot(process.cwd(), body.codeOutputDir ?? undefined);

    // Stamp domainMdFile paths BEFORE writing so subsystems.json records them.
    const stampedManifest = stampDomainMdPaths({
      ...result.manifest,
      generatedAt: new Date().toISOString(),
    });

    await writeSubsystemManifest(outRoot, stampedManifest);
    manifestSaved = true;

    domainFilesSaved = await writeDomainFiles(
      outRoot,
      stampedManifest.subsystems,
      result.validation.buildLayers,
      prd,
    );
    console.log(
      `[DecomposeRoute] manifest saved, domainFilesSaved=${domainFilesSaved},` +
      ` domains=[${stampedManifest.subsystems.map((s) => s.id).join(", ")}]`,
    );
  }

  return NextResponse.json({
    ok: result.validation.ok,
    didFallback: result.didFallback,
    costUsd: result.costUsd,
    manifestSaved,
    domainFilesSaved,
    manifestPath: ".blueprint/subsystems.json",
    errors: result.validation.errors,
    warnings: result.validation.warnings,
    buildLayers: result.validation.buildLayers,
    notes: result.manifest.notes ?? [],
    subsystems: result.manifest.subsystems.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description ?? "",
      endpoints: s.ownedApiEndpoints.length,
      routes: s.ownedRoutes.length,
      collections: s.ownedCollections.length,
      modules: s.ownedModules,
      dependsOn: s.dependsOn,
      prdSections: s.prdSections,
      ownedApiEndpoints: s.ownedApiEndpoints,
      ownedRoutes: s.ownedRoutes,
      ownedCollections: s.ownedCollections,
    })),
  });
}
