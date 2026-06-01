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
  const tierDir = tier.toLowerCase() + "-tier";
  const scaffoldRoot = path.resolve(process.cwd(), "scaffolds", tierDir);

  const emptyOptional: CopyOptionalScaffoldsResult = {
    applied: [],
    skipped: [],
    copiedFiles: [],
    depsAppended: [],
    manifestFound: false,
  };

  try {
    await fs.access(scaffoldRoot);
  } catch {
    console.warn(
      `[Scaffold] No scaffold found for tier ${tier} at ${scaffoldRoot}, skipping.`,
    );
    return { copied: [], skipped: [], optional: emptyOptional };
  }

  const copied: string[] = [];
  const skipped: string[] = [];

  await copyDir(
    scaffoldRoot,
    outputDir,
    scaffoldRoot,
    copied,
    skipped,
    forceOverwrite,
  );

  console.log(
    `[Scaffold] Tier ${tier}: copied ${copied.length} file(s), skipped ${skipped.length} existing file(s).`,
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
  const tierDir = tier.toLowerCase() + "-tier";
  const scaffoldRoot = path.resolve(process.cwd(), "scaffolds", tierDir);
  const paths: string[] = [];

  async function walk(srcDir: string, rootDir: string): Promise<void> {
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
        await walk(srcPath, rootDir);
      } else if (entry.isFile()) {
        const normalizedRel = relPath.split(path.sep).join("/");
        if (UNPROTECTED_SCAFFOLD_PATHS.has(normalizedRel)) {
          continue;
        }
        paths.push(normalizedRel);
      }
    }
  }

  try {
    await fs.access(scaffoldRoot);
  } catch {
    return [];
  }

  await walk(scaffoldRoot, scaffoldRoot);
  paths.sort();
  return paths;
}

async function copyDir(
  srcDir: string,
  destDir: string,
  rootSrcDir: string,
  copied: string[],
  skipped: string[],
  forceOverwrite: boolean,
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
      );
      continue;
    }

    if (!entry.isFile()) {
      skipped.push(`${relPath} (not a regular file)`);
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
