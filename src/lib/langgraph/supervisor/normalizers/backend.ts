import path from "path";
import fs from "fs/promises";
import { fsRead, fsWrite, listFiles } from "../../tools";
import type { FrontendNormalizationResult } from "./frontend";

export interface BackendMiddlewareFolderResult {
  /** Source files moved from `middleware/` to `middlewares/`. */
  movedFiles: string[];
  /** Source files dropped (because the canonical version already existed). */
  droppedFiles: string[];
  /** Files whose imports were rewritten. */
  rewrittenImports: string[];
  notes: string[];
}

/**
 * Backend middleware-folder normalizer.
 *
 * Koa convention in the M-tier scaffold is `backend/src/middlewares` (plural).
 * Workers occasionally emit `backend/src/middleware/*.ts` (singular) which
 * leaves the project with two parallel directories — half the imports point
 * to the canonical folder and half to the singular one, producing dozens of
 * `Cannot find module` errors that the LLM then tries (and usually fails) to
 * untangle by hand. This normalizer:
 *
 *   1. Moves every `backend/src/middleware/*.ts` file into
 *      `backend/src/middlewares/` (preferring the canonical version when both
 *      exist).
 *   2. Rewrites every import of `.../middleware/<name>` (relative or alias)
 *      across the backend source tree to `.../middlewares/<name>`.
 *   3. Removes the now-empty singular folder so the audit cannot regress.
 */
export async function normalizeBackendMiddlewareFolder(
  outputDir: string,
): Promise<BackendMiddlewareFolderResult> {
  const result: BackendMiddlewareFolderResult = {
    movedFiles: [],
    droppedFiles: [],
    rewrittenImports: [],
    notes: [],
  };

  const singularRoot = "backend/src/middleware";
  const pluralRoot = "backend/src/middlewares";

  const singularDirAbs = path.join(outputDir, singularRoot);
  let singularEntries: string[] = [];
  try {
    const stat = await fs.stat(singularDirAbs);
    if (!stat.isDirectory()) return result;
    singularEntries = (
      await fs.readdir(singularDirAbs, { withFileTypes: true })
    )
      .filter((entry) => entry.isFile() && /\.(ts|tsx)$/.test(entry.name))
      .map((entry) => entry.name);
  } catch {
    return result;
  }

  if (singularEntries.length === 0) {
    try {
      await fs.rmdir(singularDirAbs);
    } catch {
      // ignore — directory may not be empty for unrelated reasons.
    }
    return result;
  }

  await fs.mkdir(path.join(outputDir, pluralRoot), { recursive: true });

  for (const fileName of singularEntries) {
    const singularRel = `${singularRoot}/${fileName}`;
    const pluralRel = `${pluralRoot}/${fileName}`;
    const singularContent = await fsRead(singularRel, outputDir);
    if (
      singularContent.startsWith("FILE_NOT_FOUND") ||
      singularContent.startsWith("REJECTED")
    ) {
      continue;
    }

    const existingPlural = await fsRead(pluralRel, outputDir);
    const pluralExists =
      !existingPlural.startsWith("FILE_NOT_FOUND") &&
      !existingPlural.startsWith("REJECTED");

    if (pluralExists) {
      result.droppedFiles.push(singularRel);
    } else {
      await fsWrite(pluralRel, singularContent, outputDir);
      result.movedFiles.push(singularRel);
    }

    try {
      await fs.unlink(path.join(outputDir, singularRel));
    } catch {
      // best-effort delete; downstream import rewrite still helps
    }
  }

  // Rewrite imports across the backend source tree.
  const backendFiles = (await listFiles("backend/src", outputDir)).filter(
    (file) => /\.(ts|tsx)$/.test(file),
  );
  const rewriteRules: Array<{ from: RegExp; to: string }> = [
    {
      from: /(from\s+["'])((?:\.{1,2}\/)+)middleware\//g,
      to: "$1$2middlewares/",
    },
    {
      from: /(from\s+["'])@\/middleware\//g,
      to: "$1@/middlewares/",
    },
    {
      from: /(import\s*\(\s*["'])((?:\.{1,2}\/)+)middleware\//g,
      to: "$1$2middlewares/",
    },
    {
      from: /(import\s*\(\s*["'])@\/middleware\//g,
      to: "$1@/middlewares/",
    },
  ];

  for (const relPath of backendFiles) {
    const content = await fsRead(relPath, outputDir);
    if (
      content.startsWith("FILE_NOT_FOUND") ||
      content.startsWith("REJECTED")
    ) {
      continue;
    }
    let updated = content;
    for (const rule of rewriteRules) {
      updated = updated.replace(rule.from, rule.to);
    }
    if (updated !== content) {
      await fsWrite(relPath, updated, outputDir);
      result.rewrittenImports.push(relPath);
    }
  }

  // Try to remove the now-empty singular dir so subsequent audits do not
  // re-flag a residual empty folder.
  try {
    const remaining = await fs.readdir(singularDirAbs);
    if (remaining.length === 0) {
      await fs.rmdir(singularDirAbs);
    }
  } catch {
    // ignore
  }

  if (
    result.movedFiles.length > 0 ||
    result.droppedFiles.length > 0 ||
    result.rewrittenImports.length > 0
  ) {
    result.notes.push(
      `Backend middleware-folder normalizer moved ${result.movedFiles.length} file(s), dropped ${result.droppedFiles.length} duplicate(s), and rewrote imports in ${result.rewrittenImports.length} file(s).`,
    );
  }

  return result;
}

/**
 * Backend GET-with-validateBody normalizer.
 *
 * `validateBody` is a body-validation middleware; LLMs sometimes attach it
 * to `apiRouter.get(...)` calls, which produces both a TypeScript noise
 * (the controller signature is wrong) and a runtime semantics bug (a
 * GET handler should not validate a JSON body). We strip the
 * `validateBody(...)` argument so the route at least compiles and the
 * route audit can re-evaluate; the LLM is still expected to pick a real
 * handler name afterwards.
 */
export async function normalizeBackendGetValidateBody(
  outputDir: string,
): Promise<FrontendNormalizationResult> {
  const changedFiles: string[] = [];
  const notes: string[] = [];
  const routesRoot = "backend/src/api/modules";
  let files: string[];
  try {
    files = (await listFiles(routesRoot, outputDir)).filter((file) =>
      file.endsWith(".routes.ts"),
    );
  } catch {
    return { changedFiles, notes };
  }

  // Match `apiRouter.get( "<path>" , validateBody(<args>), <rest...> )` over
  // multiple lines and remove the validateBody segment. Also catch sub-router
  // form `router.get(...)` for completeness.
  const getCallRe =
    /\b((?:api)?[Rr]outer)\.get\s*\(\s*((?:[^()"'`]|"[^"]*"|'[^']*'|`[^`]*`|\([^()]*\))+)\)/g;
  const validateBodyArgRe = /\bvalidateBody\s*\([^()]*\)\s*,\s*/g;

  for (const rel of files) {
    const content = await fsRead(rel, outputDir);
    if (
      content.startsWith("FILE_NOT_FOUND") ||
      content.startsWith("REJECTED")
    ) {
      continue;
    }
    let mutated = false;
    const updated = content.replace(getCallRe, (match, prefix, args) => {
      if (!/\bvalidateBody\s*\(/.test(args)) return match;
      const cleanedArgs = String(args).replace(validateBodyArgRe, "");
      mutated = true;
      return `${prefix}.get(${cleanedArgs})`;
    });
    if (mutated && updated !== content) {
      await fsWrite(rel, updated, outputDir);
      changedFiles.push(rel);
    }
  }

  if (changedFiles.length > 0) {
    notes.push(
      `Backend GET-route normalizer stripped \`validateBody(...)\` from ${changedFiles.length} file(s): ${changedFiles.slice(0, 6).join(", ")}${changedFiles.length > 6 ? " ..." : ""}`,
    );
  }

  return { changedFiles, notes };
}
