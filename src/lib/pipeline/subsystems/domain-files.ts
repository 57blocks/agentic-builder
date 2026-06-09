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

// ── Shared / global sections ──────────────────────────────────────────────────

/**
 * Cross-cutting PRD chapters that EVERY domain needs to build correctly but
 * that the exclusive owned-section split leaves orphaned (they have no single
 * owner): the design system / component library, information architecture /
 * navigation, enum catalogs, non-functional requirements, global validation &
 * boundary rules, error codes, the glossary, the permission model, and storage
 * contracts. Missing the component-library spec in particular is the leading
 * cause of per-domain UI drift. Bilingual (Chinese + English) since PRDs vary.
 *
 * Deliberately does NOT include the full REST-API-design chapter (huge; the
 * relevant slice is injected per-domain as Dependency Contracts instead) nor
 * per-domain chapters (data model, wireframes, acceptance criteria).
 */
const SHARED_SECTION_PATTERNS: RegExp[] = [
  /组件库|设计系统|design system|component library|ui components?\b/i,
  /信息架构|information architecture|站点地图|sitemap|全局导航|global nav/i,
  /枚举|\benum/i,
  /非功能|non-?functional|\bnfr\b/i,
  /校验|边界规则|validation|boundary rule/i,
  /错误码|error code/i,
  /术语表|glossary/i,
  /角色与权限|权限模型|permission|\brbac\b|access control/i,
  /存储契约|localstorage|storage contract/i,
];

/**
 * Find the top-level (`## N.`) PRD section anchors whose heading marks them as
 * a shared/global spec (see SHARED_SECTION_PATTERNS). Returns anchors like
 * "§7", "§8" suitable for {@link extractPrdSections}. Project-agnostic — it
 * keys on heading text, not hard-coded section numbers.
 */
export function collectSharedSectionAnchors(prd: string): string[] {
  const anchors: string[] = [];
  const seen = new Set<string>();
  for (const line of prd.split("\n")) {
    // Top-level numbered heading only: "## 8. Title" / "## 8 Title".
    const m = line.match(/^##\s+(\d+)(?:\.\d+)*[.)\s]/);
    if (!m) continue;
    const num = m[1];
    if (seen.has(num)) continue;
    if (SHARED_SECTION_PATTERNS.some((re) => re.test(line))) {
      anchors.push(`§${num}`);
      seen.add(num);
    }
  }
  return anchors;
}

/**
 * Render the frozen contracts of the domains this one depends on: the API
 * endpoints it may call and the collections those domains own (read via their
 * API, never directly). Gives a single-domain coding session the cross-domain
 * surface it would otherwise be blind to. Pure.
 */
export function buildDependencyContracts(
  s: Subsystem,
  allSubsystems: Subsystem[],
): string {
  if (s.dependsOn.length === 0) return "";
  const blocks: string[] = [];
  for (const depId of s.dependsOn) {
    const dep = allSubsystems.find((x) => x.id === depId);
    if (!dep) continue;
    const lines: string[] = [`### ${dep.name} (\`${dep.id}\`)`, ""];
    lines.push("**API endpoints you may call (frozen contract):**");
    if (dep.ownedApiEndpoints.length > 0)
      dep.ownedApiEndpoints.forEach((e) => lines.push(`- \`${e}\``));
    else lines.push("_None declared_");
    lines.push(
      "",
      "**Collections it owns (read via its API, never its tables directly):**",
    );
    if (dep.ownedCollections.length > 0)
      dep.ownedCollections.forEach((c) => lines.push(`- \`${c}\``));
    else lines.push("_None declared_");
    blocks.push(lines.join("\n"));
  }
  return blocks.join("\n\n");
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
  /** Extracted cross-cutting spec sections (component library, IA, enums,
   *  error codes…) to inject so every domain builds to the same global rules.
   *  Pass "" to omit. */
  sharedContent = "",
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

  // Dependency contracts — the cross-domain surface this domain consumes.
  const contracts = buildDependencyContracts(s, allSubsystems);
  out.push("", "## Dependency Contracts", "");
  out.push(
    contracts ||
      "_No upstream dependencies — this domain owns everything it needs._",
  );

  // Shared / global specs — cross-cutting chapters every domain must honour so
  // the system stays consistent (design system, navigation, enums, error
  // codes…). Injected, not duplicated by hand: the mega-PRD stays the source.
  if (sharedContent.trim()) {
    out.push("", "## Shared / Global Specs", "");
    out.push(
      "> Cross-cutting specs that apply to EVERY domain. Build to these so the system stays consistent — they are not optional context.",
      "",
      sharedContent.trim(),
    );
  }
  out.push("");

  return out.join("\n");
}

/**
 * Build ONE combined spec slice for a SET of domains — used when a coding batch
 * spans several subsystems (e.g. a domain + its dependency domains) so the
 * workers get just those domains' owned sections + their dependency contracts +
 * a single copy of the shared/global specs, instead of the entire mega-PRD.
 * Shared sections are emitted ONCE (not duplicated per domain). Pure.
 */
export function buildCombinedDomainSlice(
  domainIds: string[],
  allSubsystems: Subsystem[],
  prd: string,
): string {
  const subs = domainIds
    .map((id) => allSubsystems.find((s) => s.id === id))
    .filter((s): s is Subsystem => !!s);
  if (subs.length === 0) return "";

  const out: string[] = [
    `# Domains in scope: ${subs.map((s) => s.name).join(", ")}`,
    "",
    "> Combined spec for the subsystems built in this batch. Build to each",
    "> domain's owned sections; consume upstream domains only via their",
    "> Dependency Contracts; honour the shared/global specs.",
  ];

  const ownedAnchors = new Set<string>();
  for (const s of subs) {
    out.push("", `## ${s.name} (\`${s.id}\`)`, "");
    const prdSlice = extractPrdSections(prd, s.prdSections);
    out.push(prdSlice.trim() || "_No specific PRD sections referenced._");
    s.prdSections.forEach((r) => ownedAnchors.add(r.replace(/^§/, "").trim()));
    const contracts = buildDependencyContracts(s, allSubsystems);
    if (contracts) {
      out.push("", `### ${s.name} — Dependency Contracts`, "", contracts);
    }
  }

  // Shared/global specs ONCE, excluding anything these domains already own.
  const sharedAnchors = collectSharedSectionAnchors(prd).filter(
    (a) => !ownedAnchors.has(a.replace(/^§/, "").trim()),
  );
  const sharedContent = extractPrdSections(prd, sharedAnchors);
  if (sharedContent.trim()) {
    out.push("", "## Shared / Global Specs", "", sharedContent.trim());
  }

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

  // Shared/global anchors are project-wide — compute once, reuse per domain.
  const sharedAnchors = collectSharedSectionAnchors(prd);

  let allOk = true;
  for (const s of subsystems) {
    const prdContent = extractPrdSections(prd, s.prdSections);
    // Don't duplicate a shared section a domain already owns outright.
    const ownedAnchors = new Set(
      s.prdSections.map((r) => r.replace(/^§/, "").trim()),
    );
    const sharedForThis = sharedAnchors.filter(
      (a) => !ownedAnchors.has(a.replace(/^§/, "").trim()),
    );
    const sharedContent = extractPrdSections(prd, sharedForThis);
    const content = buildDomainMd(
      s,
      subsystems,
      layerOf(s.id),
      prdContent,
      sharedContent,
    );
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
