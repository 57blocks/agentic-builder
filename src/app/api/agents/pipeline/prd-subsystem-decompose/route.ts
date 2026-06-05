import fs from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

import { resolveCodeOutputRoot } from "@/lib/pipeline/code-output";
import { decomposePrdIntoSubsystems } from "@/lib/pipeline/subsystems/decompose";
import { writeSubsystemManifest } from "@/lib/pipeline/subsystems/manifest-io";
import type { Subsystem } from "@/lib/pipeline/subsystems/types";

/**
 * On-demand DDD subsystem decomposition. Runs the Phase-0 decomposer
 * (PRD inventory → business-domain manifest + dependency DAG), persists it to
 * `.blueprint/subsystems.json` (where developBySubsystem reads it), and returns
 * the manifest + validation + build layers for the PRD-step UI to render.
 *
 * Advisory — never runs codegen. POST body: { prd, codeOutputDir?, tier? }
 */

function extractPrdSections(prd: string, sectionRefs: string[]): string {
  if (sectionRefs.length === 0) return "";
  const lines = prd.split("\n");
  const results: string[] = [];

  for (const ref of sectionRefs) {
    const anchor = ref.replace(/^§/, "").trim();
    if (!anchor) continue;

    let startLine = -1;
    let startLevel = 0;
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/^(#{1,6})\s+(.*)/);
      if (m && new RegExp(`(?:^|\\s|§)${anchor.replace(/\./g, "\\.")}(?:\\s|$|\\.|:)`).test(m[2])) {
        startLine = i;
        startLevel = m[1].length;
        break;
      }
    }
    if (startLine === -1) {
      console.warn(`[Subsystems] PRD section ref "${ref}" (anchor: "${anchor}") not found in document`);
      continue;
    }

    const extracted: string[] = [lines[startLine]];
    for (let i = startLine + 1; i < lines.length; i++) {
      const m = lines[i].match(/^(#{1,6})\s+/);
      if (m && m[1].length <= startLevel) break;
      extracted.push(lines[i]);
    }
    results.push(extracted.join("\n").trimEnd());
  }

  return results.join("\n\n---\n\n");
}

function buildDomainMd(
  s: Subsystem,
  allSubsystems: Subsystem[],
  layerIndex: number,
  prdContent: string,
): string {
  const nameOf = (id: string) => allSubsystems.find((x) => x.id === id)?.name ?? id;
  const dependsOnStr =
    s.dependsOn.length > 0 ? s.dependsOn.map(nameOf).join(", ") : "None";
  const layerStr = layerIndex >= 0 ? `L${layerIndex}` : "Ungrouped";

  const push = (arr: string[], items: string[], fallback = "_None_") => {
    if (items.length > 0) items.forEach((i) => arr.push(`- \`${i}\``));
    else arr.push(fallback);
  };

  const out: string[] = [
    `# ${s.name}`,
    "",
    `> ${s.description ?? "No description."}`,
    "",
    `**Domain ID:** \`${s.id}\` | **Build Layer:** ${layerStr} | **Depends on:** ${dependsOnStr}`,
    "",
    "## Owned Resources",
    "",
    `### API Endpoints (${s.ownedApiEndpoints.length})`,
  ];
  push(out, s.ownedApiEndpoints);
  out.push("", `### Routes (${s.ownedRoutes.length})`);
  push(out, s.ownedRoutes);
  out.push("", `### Data Collections (${s.ownedCollections.length})`);
  push(out, s.ownedCollections);
  out.push("", "### Modules");
  push(out, s.ownedModules);
  out.push("", "## PRD Sections", "");
  out.push(prdContent.trim() || "_No specific PRD sections referenced._");
  out.push("");

  return out.join("\n");
}

async function writeDomainFiles(
  outRoot: string,
  subsystems: Subsystem[],
  buildLayers: string[][],
  prd: string,
): Promise<boolean> {
  const layerOf = (id: string): number =>
    buildLayers.findIndex((layer) => layer.includes(id));

  try {
    await fs.mkdir(outRoot, { recursive: true });
  } catch (err) {
    console.error(
      `[Subsystems] Failed to create output directory ${outRoot}:`,
      err instanceof Error ? err.message : err,
    );
    return false;
  }

  let allOk = true;
  for (const s of subsystems) {
    const prdContent = extractPrdSections(prd, s.prdSections);
    const content = buildDomainMd(s, subsystems, layerOf(s.id), prdContent);
    const filePath = path.join(outRoot, `domain-${s.id}.md`);
    try {
      await fs.writeFile(filePath, content, "utf-8");
    } catch (err) {
      console.error(
        `[Subsystems] Failed to write ${filePath}:`,
        err instanceof Error ? err.message : err,
      );
      allOk = false;
    }
  }
  return allOk;
}

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

    // Stamp each subsystem with its domain md filename BEFORE writing the manifest
    // so that subsystems.json records where each domain's spec file lives.
    const subsystemsWithMdPaths = result.manifest.subsystems.map((s) => ({
      ...s,
      domainMdFile: `domain-${s.id}.md`,
    }));

    await writeSubsystemManifest(outRoot, {
      ...result.manifest,
      subsystems: subsystemsWithMdPaths,
      generatedAt: new Date().toISOString(),
    });
    manifestSaved = true;
    domainFilesSaved = await writeDomainFiles(
      outRoot,
      subsystemsWithMdPaths,
      result.validation.buildLayers,
      prd,
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
