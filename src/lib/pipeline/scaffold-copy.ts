import fs from "fs/promises";
import path from "path";
import type { ResourceRequirement } from "./resource-requirements";
import {
  copyOptionalScaffolds,
  type CopyOptionalScaffoldsResult,
} from "./scaffold-optional";
import type { AuthDecision } from "@/lib/agents/architect/auth-decision-types";

export type ScaffoldTier = "S" | "M" | "L";

/**
 * Map a project's *scope* tier to the scaffold it should use. Scope (S/M/L) and
 * "needs a backend" are orthogonal: a small S-scope project that requires a
 * backend has no usable scaffold of its own (the s-tier scaffold is
 * frontend-only), so it reuses the minimal full-stack scaffold (M). Scope tier
 * still drives task granularity elsewhere — only the scaffold is upgraded here.
 */
export function resolveScaffoldTier(
  scopeTier: ScaffoldTier,
  needsBackend: boolean,
): ScaffoldTier {
  if (scopeTier === "S" && needsBackend) return "M";
  return scopeTier;
}

/**
 * Ordered scaffold source directories (relative to `scaffolds/`) for a tier.
 * Later layers OVERLAY earlier ones (overwrite on conflict).
 *
 * L is composed as **M base + L overlay**: the L scaffold is the M scaffold
 * plus a handful of production layers (background-job queue + workers, pino
 * logger, request-logger + rate-limit middlewares, redis docker-compose) and
 * the few wiring files those layers touch (`server.ts`, `app.ts`, `env.ts`,
 * `errorHandler.ts`, …). Keeping the shared base in ONE place (`m-tier`)
 * removes the M↔L file drift that two full copies accumulate. `l-tier`
 * therefore holds only the **delta** over M, not a full copy.
 */
export function scaffoldLayerDirsForTier(tier: ScaffoldTier): string[] {
  if (tier === "L") return ["m-tier", "l-tier"];
  return [`${tier.toLowerCase()}-tier`];
}

/**
 * When a layer is a BASE *under* an overlay (i.e. not the final layer of a
 * multi-layer tier), these paths are NOT contributed by it — the overlay
 * layer owns them authoritatively:
 *   - `_optional/**` — each tier ships its own optional packs authored against
 *     that tier's base wiring; the overlay's `_optional/` is the correct one.
 *   - concrete `.env` files — environment-specific and never inherited across
 *     tiers (the overlay supplies its own `.env.example`).
 * Applied ONLY to base-under-overlay layers, so single-layer tiers (S/M) keep
 * their `_optional/` and any `.env` exactly as before.
 */
function isExcludedFromBaseLayer(relPath: string): boolean {
  const rel = relPath.split(path.sep).join("/");
  if (rel === "_optional" || rel.startsWith("_optional/")) return true;
  if (rel === "backend/.env" || rel === "frontend/.env") return true;
  return false;
}

/** Never copy dependency trees or VCS — pnpm workspace symlinks break fs.copyFile (ENOTSUP). */
const SKIP_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  "dist",
  ".next",
  "build",
  ".turbo",
  "coverage",
]);

/**
 * Some scaffold files should stay editable during coding runs (not protected).
 * These are app entry wiring points that workers must be able to rewrite.
 */
const UNPROTECTED_SCAFFOLD_PATHS = new Set([
  // Frontend app wiring and shared client/context entry points
  "frontend/src/main.tsx",
  "frontend/src/router.tsx",
  "frontend/src/api/client.ts",
  "frontend/src/providers/AppProviders.tsx",
  "frontend/src/context/AuthContext.tsx",
  "frontend/src/views/NotFound.tsx",
  "frontend/src/index.css",
  "frontend/src/App.css",
  // Backend app wiring, module registration, and runtime entry points
  "backend/src/app.ts",
  "backend/src/server.ts",
  "backend/src/api/modules/index.ts",
  "backend/src/db.ts",
  "backend/src/config/env.ts",
  "backend/src/models/index.ts",
  "backend/src/middlewares/errorHandler.ts",
  "backend/src/middlewares/cors.ts",
  // Root project files that workers legitimately need to customize per-project
  "docker-compose.yml",
  "README.md",
  // Backend wiring points workers need to extend
  "backend/.env.example",
  "backend/src/workers/index.ts",
  "backend/src/api/modules/auth/auth.routes.ts",
  // Frontend build config — workers may add proxy rules or path aliases
  "frontend/vite.config.ts",
  "frontend/index.html",
  // E2E files — agents write generated test specs here; scaffold only ships a baseline
  "frontend/e2e/smoke.spec.ts",
  "frontend/playwright.config.ts",
]);

/**
 * Pipeline-generated docs that live at the OUTPUT ROOT. The scaffold templates
 * ship example copies (e.g. `scaffolds/<tier>/PRD.md` is a sample "News Digest"
 * PRD), but the real docs are written by the pipeline BEFORE the scaffold copy.
 * Never let the scaffold's examples overwrite them — otherwise the output dir
 * ends up with the template's placeholder PRD instead of the project's PRD.
 * Matched against the scaffold-relative path, so only root-level docs are
 * affected (a nested `foo/PRD.md` would not match).
 */
const GENERATED_DOC_PATHS = new Set([
  "PRD.md",
  "TRD.md",
  "SystemDesign.md",
  "ImplementationGuide.md",
  "DesignSpec.md",
  "PencilDesign.md",
  "PRD_E2E_SPEC.md",
  "E2E_COVERAGE.md",
]);

export interface CopyScaffoldResult {
  copied: string[];
  skipped: string[];
  /**
   * Result of the optional-feature pass. Always present; when the tier has
   * no `_optional/manifest.json` (back-compat), `manifestFound: false`.
   */
  optional: CopyOptionalScaffoldsResult;
}

/**
 * Copy the scaffold template for the given tier into outputDir.
 * By default, existing files are not overwritten.
 * Pass { forceOverwrite: true } to always write scaffold files (safe for fresh coding sessions).
 *
 * When `resourceRequirements` is provided, the optional-scaffold layer is
 * applied on top of the base copy: each feature in
 * `scaffolds/<tier>/_optional/manifest.json` whose `triggerEnvKeys` match
 * any declared requirement is copied into outputDir with full overwrite
 * semantics (optional features may replace base wiring), and the
 * matching `extraDeps` are appended to `frontend/package.json` and
 * `backend/package.json`. See CODEGEN_HARDENING_PLAN.md §4.1 / §4.10.
 */
export async function copyScaffold(
  tier: ScaffoldTier,
  outputDir: string,
  options?: {
    forceOverwrite?: boolean;
    resourceRequirements?: ResourceRequirement[];
    /**
     * When provided, the optional-scaffold picker uses this as the
     * authoritative source for the chosen auth mode. The matching
     * `_optional/auth-*` feature is forced in (even with empty
     * triggerEnvKeys) and competing auth scaffolds are excluded.
     */
    authDecision?: AuthDecision | null;
  },
): Promise<CopyScaffoldResult> {
  const forceOverwrite = options?.forceOverwrite ?? false;
  const layers = scaffoldLayerDirsForTier(tier);

  const emptyOptional: CopyOptionalScaffoldsResult = {
    applied: [],
    skipped: [],
    copiedFiles: [],
    depsAppended: [],
    manifestFound: false,
  };

  // The tier's OWN dir is the final layer; if it's absent the tier has no
  // scaffold at all (preserves prior "no scaffold for tier" behaviour).
  const ownRoot = path.resolve(
    process.cwd(),
    "scaffolds",
    layers[layers.length - 1],
  );
  try {
    await fs.access(ownRoot);
  } catch {
    console.warn(
      `[Scaffold] No scaffold found for tier ${tier} at ${ownRoot}, skipping.`,
    );
    return { copied: [], skipped: [], optional: emptyOptional };
  }

  const copied: string[] = [];
  const skipped: string[] = [];

  for (let i = 0; i < layers.length; i++) {
    const layerRoot = path.resolve(process.cwd(), "scaffolds", layers[i]);
    try {
      await fs.access(layerRoot);
    } catch {
      console.warn(
        `[Scaffold] Tier ${tier}: layer ${layers[i]} missing at ${layerRoot}, skipping layer.`,
      );
      continue;
    }
    const isBaseUnderOverlay = i < layers.length - 1;
    await copyDir(
      layerRoot,
      outputDir,
      layerRoot,
      copied,
      skipped,
      // Overlay layers MUST win over files laid down by earlier layers in this
      // same call, so they always overwrite regardless of `forceOverwrite`.
      i === 0 ? forceOverwrite : true,
      isBaseUnderOverlay ? isExcludedFromBaseLayer : undefined,
    );
  }

  // A file written by both the base and the overlay layer appears twice in
  // `copied`; collapse to the true set of distinct destination files written.
  const copiedUnique = [...new Set(copied)];
  copied.length = 0;
  copied.push(...copiedUnique);

  console.log(
    `[Scaffold] Tier ${tier} (${layers.join(" + ")}): copied ${copied.length} file(s), skipped ${skipped.length} existing file(s).`,
  );

  // ── Phase 2: optional-feature layer (CODEGEN_HARDENING_PLAN.md §4.10) ──
  // The base scaffold ships only the always-on parts. OAuth providers,
  // payment SDKs, analytics, etc. live in `<tier>/_optional/<feature>/` and
  // are copied here based on which env vars the kickoff detector declared.
  let optional = emptyOptional;
  if (options?.resourceRequirements || options?.authDecision) {
    try {
      optional = await copyOptionalScaffolds(
        tier,
        outputDir,
        options.resourceRequirements ?? [],
        options.authDecision ?? null,
      );
      if (optional.applied.length > 0) {
        console.log(
          `[Scaffold] Tier ${tier}: applied optional feature(s): ${optional.applied.join(", ")} (${optional.copiedFiles.length} additional file(s)).`,
        );
        for (const dep of optional.depsAppended) {
          console.log(
            `[Scaffold] Tier ${tier}: ${dep.scope} package.json — added ${dep.packages.length} dep(s) for ${dep.feature}: ${dep.packages.join(", ")}.`,
          );
        }
      }
      if (optional.skipped.length > 0) {
        for (const s of optional.skipped) {
          console.warn(
            `[Scaffold] Tier ${tier}: optional feature ${s.feature} skipped — ${s.reason}.`,
          );
        }
      }
    } catch (e) {
      console.warn(
        `[Scaffold] Tier ${tier}: optional-feature pass failed (continuing without): ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  return { copied, skipped, optional };
}

/**
 * All template file paths for a tier (same walk rules as copy, no disk writes).
 * Used to merge LLM output with scaffold instead of overwriting.
 */
export async function listScaffoldTemplateRelativePaths(
  tier: ScaffoldTier,
): Promise<string[]> {
  const layers = scaffoldLayerDirsForTier(tier);
  // Union across layers (dedupe): a path defined by both the base and the
  // overlay is the same destination file, listed once. Mirrors the copy
  // composition so the task-breakdown prompt sees exactly the files the
  // generated project will contain.
  const seen = new Set<string>();

  async function walk(
    srcDir: string,
    rootDir: string,
    exclude?: (relPath: string) => boolean,
  ): Promise<void> {
    let entries;
    try {
      entries = await fs.readdir(srcDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const srcPath = path.join(srcDir, entry.name);
      const relPath = path.relative(rootDir, srcPath);

      if (SKIP_DIR_NAMES.has(entry.name)) continue;
      if (exclude?.(relPath)) continue;
      if (entry.isSymbolicLink()) continue;
      if (
        entry.isBlockDevice?.() ||
        entry.isCharacterDevice?.() ||
        entry.isFIFO?.() ||
        entry.isSocket?.()
      ) {
        continue;
      }

      if (entry.isDirectory()) {
        await walk(srcPath, rootDir, exclude);
      } else if (entry.isFile()) {
        const normalizedRel = relPath.split(path.sep).join("/");
        if (UNPROTECTED_SCAFFOLD_PATHS.has(normalizedRel)) {
          continue;
        }
        seen.add(normalizedRel);
      }
    }
  }

  for (let i = 0; i < layers.length; i++) {
    const layerRoot = path.resolve(process.cwd(), "scaffolds", layers[i]);
    try {
      await fs.access(layerRoot);
    } catch {
      continue;
    }
    const isBaseUnderOverlay = i < layers.length - 1;
    await walk(
      layerRoot,
      layerRoot,
      isBaseUnderOverlay ? isExcludedFromBaseLayer : undefined,
    );
  }

  return [...seen].sort();
}

async function copyDir(
  srcDir: string,
  destDir: string,
  rootSrcDir: string,
  copied: string[],
  skipped: string[],
  forceOverwrite: boolean,
  exclude?: (relPath: string) => boolean,
): Promise<void> {
  await fs.mkdir(destDir, { recursive: true });

  const entries = await fs.readdir(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    const relPath = path.relative(rootSrcDir, srcPath);

    if (SKIP_DIR_NAMES.has(entry.name)) {
      continue;
    }

    // Base-under-overlay exclusion (e.g. `_optional/`, concrete `.env`).
    if (exclude?.(relPath)) {
      continue;
    }

    if (entry.isSymbolicLink()) {
      skipped.push(`${relPath} (symlink)`);
      continue;
    }

    if (
      entry.isBlockDevice?.() ||
      entry.isCharacterDevice?.() ||
      entry.isFIFO?.() ||
      entry.isSocket?.()
    ) {
      skipped.push(`${relPath} (special file)`);
      continue;
    }

    if (entry.isDirectory()) {
      await copyDir(
        srcPath,
        destPath,
        rootSrcDir,
        copied,
        skipped,
        forceOverwrite,
        exclude,
      );
      continue;
    }

    if (!entry.isFile()) {
      skipped.push(`${relPath} (not a regular file)`);
      continue;
    }

    // Never let a scaffold's example doc clobber the pipeline-generated real doc
    // (the real PRD.md / TRD.md / … are written to the output root first).
    if (GENERATED_DOC_PATHS.has(relPath)) {
      skipped.push(`${relPath} (pipeline-generated doc — scaffold copy never overwrites)`);
      continue;
    }

    if (forceOverwrite) {
      await fs.copyFile(srcPath, destPath);
      copied.push(relPath);
    } else {
      try {
        await fs.access(destPath);
        skipped.push(relPath);
      } catch {
        await fs.copyFile(srcPath, destPath);
        copied.push(relPath);
      }
    }
  }
}
