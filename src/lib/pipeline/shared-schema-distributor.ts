/**
 * After scaffold copy, replicate the TRD-confirmed shared schema into
 * every consumer root in the generated project so frontend and backend
 * workers can import a single source of truth for types crossing the
 * API boundary.
 *
 * The TRD step writes `.blueprint/shared-schema.ts` (see engine.ts /
 * persistTrdArtifacts). This module fans it out to per-tier locations
 * inside `outputDir`. Tier mapping:
 *
 *   S → src/shared/schema.ts            (single-app)
 *   M → frontend/src/shared/schema.ts   (split monolith)
 *       backend/src/shared/schema.ts
 *   L → frontend/src/shared/schema.ts   (same flat layout as M — no monorepo)
 *       backend/src/shared/schema.ts
 *
 * Pure I/O helper: never throws on missing source (TRD may have been
 * skipped, or §6 may have been omitted). Caller decides what to do with
 * the `found: false` signal — typically: log it, fall back to per-worker
 * type definitions, surface in run metadata.
 *
 * The written paths should be appended to `scaffoldProtectedPaths` by
 * the caller so workers cannot overwrite the canonical schema mid-run.
 */

import fs from "fs/promises";
import path from "path";

export type SharedSchemaTier = "S" | "M" | "L";

const SCHEMA_BLUEPRINT_REL = ".blueprint/shared-schema.ts";
const DAG_BLUEPRINT_REL = ".blueprint/pipeline-dag.yaml";

const TARGETS_BY_TIER: Readonly<Record<SharedSchemaTier, readonly string[]>> = {
  S: ["src/shared/schema.ts"],
  M: ["frontend/src/shared/schema.ts", "backend/src/shared/schema.ts"],
  // L-tier now uses the same flat frontend/+backend/ layout as M (no monorepo,
  // no packages/shared), so the shared schema fans out identically.
  L: ["frontend/src/shared/schema.ts", "backend/src/shared/schema.ts"],
};

/** DAG lives at outputDir/.blueprint/pipeline-dag.yaml regardless of tier —
 *  it's a reference contract, not source code, so no per-package fan-out. */
const DAG_REL_TARGET = ".blueprint/pipeline-dag.yaml";

export interface DistributeSharedSchemaResult {
  /** True when `.blueprint/shared-schema.ts` was present and read. */
  found: boolean;
  /** Relative paths written under outputDir. Empty when found=false. */
  written: string[];
  /** Absolute path of the source file consulted (for logging). */
  sourcePath: string;
}

export interface DistributePipelineDagResult {
  found: boolean;
  /** Relative path written under outputDir, or null when found=false. */
  written: string | null;
  sourcePath: string;
}

export async function distributeSharedSchema(
  tier: SharedSchemaTier,
  outputDir: string,
  options?: { sourceDir?: string },
): Promise<DistributeSharedSchemaResult> {
  const sourceDir = options?.sourceDir ?? process.cwd();
  const sourcePath = path.resolve(sourceDir, SCHEMA_BLUEPRINT_REL);

  let content: string;
  try {
    content = await fs.readFile(sourcePath, "utf8");
  } catch {
    return { found: false, written: [], sourcePath };
  }

  if (!content.trim()) {
    // Treat empty-but-present as "no schema" — still no-op, no need to
    // write empty files into the project.
    return { found: false, written: [], sourcePath };
  }

  const targets = TARGETS_BY_TIER[tier];
  const written: string[] = [];
  for (const rel of targets) {
    const dest = path.join(outputDir, rel);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, content, "utf8");
    written.push(rel);
  }
  return { found: true, written, sourcePath };
}

export interface VerifySharedSchemaResult {
  /** True when the source is absent (nothing to check) OR every copy matches it. */
  intact: boolean;
  /** Distributed copies that are missing or differ from the canonical source. */
  drifted: Array<{ path: string; reason: "missing" | "differs" }>;
  /** True when the canonical blueprint source itself was found + non-empty. */
  sourceFound: boolean;
  sourcePath: string;
}

/**
 * Contract-integrity check (run at verify time): confirm every distributed copy
 * of the shared schema is byte-identical to the canonical blueprint source.
 *
 * The distributor writes identical copies, but they can DRIFT afterwards — a
 * worker editing one copy, or only one side being regenerated — which is exactly
 * the silent "frontend and backend disagree on types" failure mode. This surfaces
 * that deterministically. Read-only; never throws (returns intact=true when the
 * source is missing, so it can't false-fail a run that skipped the TRD schema).
 */
export async function verifyDistributedSchemaIntact(
  tier: SharedSchemaTier,
  outputDir: string,
  options?: { sourceDir?: string },
): Promise<VerifySharedSchemaResult> {
  const sourceDir = options?.sourceDir ?? process.cwd();
  const sourcePath = path.resolve(sourceDir, SCHEMA_BLUEPRINT_REL);

  let source: string;
  try {
    source = await fs.readFile(sourcePath, "utf8");
  } catch {
    return { intact: true, drifted: [], sourceFound: false, sourcePath };
  }
  if (!source.trim()) {
    return { intact: true, drifted: [], sourceFound: false, sourcePath };
  }

  const drifted: VerifySharedSchemaResult["drifted"] = [];
  for (const rel of TARGETS_BY_TIER[tier]) {
    try {
      const copy = await fs.readFile(path.join(outputDir, rel), "utf8");
      if (copy !== source) drifted.push({ path: rel, reason: "differs" });
    } catch {
      drifted.push({ path: rel, reason: "missing" });
    }
  }
  return { intact: drifted.length === 0, drifted, sourceFound: true, sourcePath };
}

/**
 * Copy the TRD-frozen workflow DAG into the project's .blueprint/. Workers
 * read it as a reference (via convention-card prompt directive) when
 * implementing services that participate in a multi-step pipeline. Same
 * no-op semantics as the schema distributor when the source is missing.
 */
export async function distributePipelineDag(
  outputDir: string,
  options?: { sourceDir?: string },
): Promise<DistributePipelineDagResult> {
  const sourceDir = options?.sourceDir ?? process.cwd();
  const sourcePath = path.resolve(sourceDir, DAG_BLUEPRINT_REL);
  const dest = path.join(outputDir, DAG_REL_TARGET);

  // Always clear the destination first so stale DAGs from a previous project
  // never bleed into a new coding session (regardless of whether the current
  // project generates a fresh DAG or not).
  try {
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, "", "utf8");
  } catch {
    // best-effort: if we can't clear, proceed anyway
  }

  let content: string;
  try {
    content = await fs.readFile(sourcePath, "utf8");
  } catch {
    return { found: false, written: null, sourcePath };
  }
  if (!content.trim()) {
    return { found: false, written: null, sourcePath };
  }

  await fs.writeFile(dest, content, "utf8");
  return { found: true, written: DAG_REL_TARGET, sourcePath };
}

/**
 * Returns the list of relative paths the distributor *would* write for a
 * given tier, without performing any I/O. Useful for callers that want
 * to pre-allocate slots in scaffoldProtectedPaths even when the TRD
 * schema isn't available yet.
 */
export function plannedSharedSchemaPaths(tier: SharedSchemaTier): string[] {
  return [...TARGETS_BY_TIER[tier]];
}
