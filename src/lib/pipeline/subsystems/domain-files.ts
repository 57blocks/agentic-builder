/**
 * Shared helpers for generating per-domain spec markdown files
 * (domain-{id}.md) alongside PRD.md and subsystems.json.
 *
 * Called from three places:
 *   1. /api/agents/pipeline/prd-subsystem-decompose  — UI Step 2 button
 *   2. src/lib/pipeline/engine.ts                    — kickoff auto-decompose
 *   3. src/lib/pipeline/subsystems/develop.ts        — coding orchestrator
 */

import fs from "fs/promises";
import path from "path";
import type { Subsystem, SubsystemManifest } from "./types";

// ── PRD section extraction ────────────────────────────────────────────────────

/**
 * Extract the actual PRD content for the given section references.
 * Each ref is like "§10.4"; we look for a heading containing "10.4",
 * then capture it and all lines until the next same-or-higher-level heading.
 * Multiple matches are joined with "---".
 */
export function extractPrdSections(prd: string, sectionRefs: string[]): string {
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
      if (
        m &&
        new RegExp(
          `(?:^|\\s|§)${anchor.replace(/\./g, "\\.")}(?:\\s|$|\\.|:)`,
        ).test(m[2])
      ) {
        startLine = i;
        startLevel = m[1].length;
        break;
      }
    }
    if (startLine === -1) {
      console.warn(
        `[DomainFiles] PRD section ref "${ref}" (anchor: "${anchor}") not found in document`,
      );
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

// ── Domain md content ─────────────────────────────────────────────────────────

/**
 * Build the markdown content for a single domain file.
 * Format: metadata header + owned resources + extracted PRD sections.
 */
export function buildDomainMd(
  s: Subsystem,
  allSubsystems: Subsystem[],
  layerIndex: number,
  prdContent: string,
): string {
  const nameOf = (id: string) =>
    allSubsystems.find((x) => x.id === id)?.name ?? id;
  const dependsOnStr =
    s.dependsOn.length > 0 ? s.dependsOn.map(nameOf).join(", ") : "None";
  const layerStr = layerIndex >= 0 ? `L${layerIndex}` : "Ungrouped";

  const appendItems = (arr: string[], items: string[], fallback = "_None_") => {
    if (items.length > 0) items.forEach((item) => arr.push(`- \`${item}\``));
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
  appendItems(out, s.ownedApiEndpoints);
  out.push("", `### Routes (${s.ownedRoutes.length})`);
  appendItems(out, s.ownedRoutes);
  out.push("", `### Data Collections (${s.ownedCollections.length})`);
  appendItems(out, s.ownedCollections);
  out.push("", "### Modules");
  appendItems(out, s.ownedModules);
  out.push("", "## PRD Sections", "");
  out.push(prdContent.trim() || "_No specific PRD sections referenced._");
  out.push("");

  return out.join("\n");
}

// ── Stamp + write ─────────────────────────────────────────────────────────────

/**
 * Return a new manifest with `domainMdFile` stamped on every subsystem.
 * Pure — no I/O. Call this before writeSubsystemManifest so the JSON
 * records each domain's spec file path.
 */
export function stampDomainMdPaths(manifest: SubsystemManifest): SubsystemManifest {
  return {
    ...manifest,
    subsystems: manifest.subsystems.map((s) => ({
      ...s,
      domainMdFile: s.domainMdFile ?? `domain-${s.id}.md`,
    })),
  };
}

/**
 * Write one `domain-{id}.md` per subsystem into outRoot.
 * Non-fatal: individual failures are logged and skipped.
 * Returns true only when every file was written successfully.
 */
export async function writeDomainFiles(
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
      `[DomainFiles] Failed to create output directory ${outRoot}:`,
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
      console.log(`[DomainFiles] ✅ Written: ${path.basename(filePath)}`);
    } catch (err) {
      console.error(
        `[DomainFiles] Failed to write ${filePath}:`,
        err instanceof Error ? err.message : err,
      );
      allOk = false;
    }
  }
  return allOk;
}
