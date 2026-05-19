/**
 * Deterministic worker-startup auto-fix.
 *
 * The `bg-job-worker-startup` rule in `runtime-integration-audit` catches
 * a mechanical failure: backend code exports `start<X>Worker(...)` from
 * `backend/src/workers/...` but `backend/src/server.ts` never invokes it.
 * The in-process queue then has no consumer and every enqueued run hangs
 * forever — the HTTP surface stays nominally responsive so the smoke probe
 * cannot detect this, and shipped projects end up serving only seed data.
 *
 * Historically the supervisor handed these findings to the verify-fix
 * worker as free-form prompt text. When N workers were missing wiring, the
 * LLM frequently fixed only ONE of them and considered the prompt
 * satisfied. The 2026-05 stablecoin run shipped with `startIngestionWorker`
 * orphaned for exactly this reason.
 *
 * Same philosophy as `route-audit-autofix.ts` (R11 — register*Routes →
 * api/modules/index.ts wiring): the patch is mechanical, so we do it
 * deterministically before the LLM runs and let the audit re-confirm
 * closure. The pure transform is a string→string function so it unit-tests
 * cleanly without IO.
 */

import path from "path";
import { fsRead, fsWrite, listFiles } from "./tools";

export interface WorkerStartupRegistration {
  /** The `start*Worker` name exported by the worker module. */
  exportName: string;
  /** Import specifier relative to `server.ts` (no extension). */
  importPath: string;
  /**
   * Whether `start*Worker` returns a Promise that should be `await`-ed
   * (blocking boot until the queue is ready) or fire-and-forget via `void`.
   * Defaults to `await` for the first worker and `void` for subsequent
   * ones, matching the established convention in generated projects.
   */
  invocation?: "await" | "void";
}

export interface WireWorkerStartupsResult {
  /** New `server.ts` content. Same as input when nothing was wired. */
  content: string;
  /** Names successfully wired in. */
  wired: string[];
  /** Skipped entries with reason (already present, no insertion site, etc). */
  skipped: Array<{ exportName: string; reason: string }>;
}

const SERVER_REL_PATH = "backend/src/server.ts";
const WORKERS_DIR = "backend/src/workers";

const EXPORT_RE = /export\s+(?:async\s+)?function\s+(start\w*Worker)\s*\(/g;

/**
 * Pure transform: append missing `start*Worker` imports + calls to an
 * existing `server.ts`. Idempotent — names already imported AND called are
 * skipped.
 *
 * Insertion strategy:
 *   - Imports are appended after the last existing `import ... from ...`
 *     line, preserving the project's existing import block style.
 *   - Calls are inserted inside the `start()` (or `bootstrap()` /
 *     `main()`) async function, immediately BEFORE the first
 *     `app.listen(` so workers are ready before requests are accepted. If
 *     no such call is found, the function's closing brace is the fallback
 *     insertion point. If neither anchor exists, the call is skipped (we
 *     never corrupt the file).
 */
export function wireWorkerStartupsIntoServer(
  serverContent: string,
  registrations: WorkerStartupRegistration[],
): WireWorkerStartupsResult {
  if (registrations.length === 0) {
    return { content: serverContent, wired: [], skipped: [] };
  }

  // Validate names defensively. Anything that doesn't match the expected
  // `start*Worker` shape is rejected so we don't poison the import block.
  const valid: WorkerStartupRegistration[] = [];
  const skipped: WireWorkerStartupsResult["skipped"] = [];
  for (const r of registrations) {
    if (!/^start[A-Z]\w*Worker$/.test(r.exportName)) {
      skipped.push({
        exportName: r.exportName,
        reason: "exportName does not match start<X>Worker pattern",
      });
      continue;
    }
    if (!r.importPath || /[\s'"`]/.test(r.importPath)) {
      skipped.push({
        exportName: r.exportName,
        reason: "importPath is empty or contains whitespace/quotes",
      });
      continue;
    }
    valid.push(r);
  }
  if (valid.length === 0) {
    return { content: serverContent, wired: [], skipped };
  }

  // Detect what's already called so we stay idempotent across reruns.
  const calledNames = new Set<string>();
  const callDetectRe = /\b(start[A-Z]\w*Worker)\s*\(/g;
  let cm: RegExpExecArray | null;
  while ((cm = callDetectRe.exec(serverContent)) !== null) {
    calledNames.add(cm[1]);
  }
  const importedNames = new Set<string>();
  const importRe = /import\s*\{([^}]*)\}\s*from\s*["'][^"']+["']/g;
  let im: RegExpExecArray | null;
  while ((im = importRe.exec(serverContent)) !== null) {
    for (const piece of im[1].split(",")) {
      const name = piece.trim().split(/\s+as\s+/)[0].trim();
      if (name) importedNames.add(name);
    }
  }

  const toWire: WorkerStartupRegistration[] = [];
  for (const r of valid) {
    if (calledNames.has(r.exportName)) {
      skipped.push({
        exportName: r.exportName,
        reason: "already called in server.ts",
      });
      continue;
    }
    toWire.push(r);
  }
  if (toWire.length === 0) {
    return { content: serverContent, wired: [], skipped };
  }

  // Build import lines. Skip the import side when the symbol is already
  // imported (e.g. the LLM added the import but forgot to call it; we'll
  // still inject the call below).
  const importLines: string[] = [];
  for (const r of toWire) {
    if (importedNames.has(r.exportName)) continue;
    importLines.push(
      `import { ${r.exportName} } from "${r.importPath}";`,
    );
  }

  // Build call lines. Convention: first new worker uses `await`, the rest
  // use `void` (fire-and-forget) — this matches what generators tend to
  // produce. Callers can override per-registration.
  const calls = toWire.map((r, idx) => {
    const mode =
      r.invocation ??
      (idx === 0 && calledNames.size === 0 ? "await" : "void");
    return mode === "await"
      ? `  await ${r.exportName}();`
      : `  void ${r.exportName}();`;
  });

  // Insert imports right after the last existing top-level import.
  let content = serverContent;
  if (importLines.length > 0) {
    const importBlockRe = /(?:^|\n)import [^;]+;\s*/g;
    let lastImportEnd = -1;
    let mLast: RegExpExecArray | null;
    while ((mLast = importBlockRe.exec(content)) !== null) {
      lastImportEnd = mLast.index + mLast[0].length;
    }
    if (lastImportEnd >= 0) {
      content =
        content.slice(0, lastImportEnd) +
        importLines.join("\n") +
        "\n" +
        content.slice(lastImportEnd);
    } else {
      // No imports at all — prepend after a potential leading shebang /
      // "use strict" line.
      content = importLines.join("\n") + "\n\n" + content;
    }
  }

  // Insert call lines before the first `app.listen(...)`. Match the
  // surrounding indentation so the patched diff still reads cleanly.
  const listenRe = /\n([ \t]*)([A-Za-z_$][\w$]*)\.listen\s*\(/;
  const listenMatch = content.match(listenRe);
  if (listenMatch && listenMatch.index !== undefined) {
    const indent = listenMatch[1] ?? "  ";
    const insertion =
      calls.map((l) => l.replace(/^ {2}/, indent)).join("\n") + "\n";
    content =
      content.slice(0, listenMatch.index + 1) +
      insertion +
      content.slice(listenMatch.index + 1);
    return {
      content,
      wired: toWire.map((r) => r.exportName),
      skipped,
    };
  }

  // Fall back: insert before the last `}` of the file (probably the
  // closing brace of `start()`). This is best-effort — if nothing matches
  // we record skips rather than risk corrupting the file.
  const fnEndRe = /\n([ \t]*)\}\s*$/m;
  if (fnEndRe.test(content)) {
    content = content.replace(fnEndRe, (_full, indentMaybe) => {
      const indent = indentMaybe ?? "";
      const insertion = calls
        .map((l) => l.replace(/^ {2}/, indent + "  "))
        .join("\n");
      return `\n${insertion}\n${indent}}\n`;
    });
    return {
      content,
      wired: toWire.map((r) => r.exportName),
      skipped,
    };
  }

  for (const r of toWire) {
    skipped.push({
      exportName: r.exportName,
      reason:
        "could not find `app.listen(...)` or final `}` anchor — skipped to avoid corrupting server.ts",
    });
  }
  return { content: serverContent, wired: [], skipped };
}

/**
 * Compute the import specifier (extensionless, POSIX-style) for a worker
 * file relative to `backend/src/server.ts`.
 *
 *   serverFile: backend/src/server.ts
 *   workerFile: backend/src/workers/ingestionWorker.ts
 *   → "./workers/ingestionWorker"
 */
export function computeWorkerImportPath(
  serverFile: string,
  workerFile: string,
): string {
  const serverPosix = serverFile.split(path.sep).join("/");
  const workerPosix = workerFile.split(path.sep).join("/");
  const serverDir = path.posix.dirname(serverPosix);
  const noExt = workerPosix.replace(/\.[tj]sx?$/, "");
  const rel = path.posix.relative(serverDir, noExt);
  return rel.startsWith(".") ? rel : `./${rel}`;
}

/**
 * Scan `backend/src/workers/` for `export start*Worker` symbols. Returns
 * one registration per discovered export. Files outside the workers
 * directory and `*.test.ts` companions are ignored.
 */
export async function scanWorkerStartupExports(
  outputDir: string,
): Promise<Array<{ exportName: string; file: string }>> {
  const all = await listFiles(WORKERS_DIR, outputDir);
  const out: Array<{ exportName: string; file: string }> = [];
  for (const file of all) {
    const norm = file.split(path.sep).join("/");
    if (!/\.tsx?$/.test(norm)) continue;
    if (/\.test\.tsx?$/.test(norm)) continue;
    if (/__tests__\//.test(norm)) continue;
    const content = await fsRead(norm, outputDir);
    if (content.startsWith("FILE_NOT_FOUND") || content.startsWith("REJECTED")) {
      continue;
    }
    EXPORT_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = EXPORT_RE.exec(content)) !== null) {
      out.push({ exportName: m[1], file: norm });
    }
  }
  return out;
}

export interface AutoWireWorkerStartupsResult {
  appliedAny: boolean;
  wired: string[];
  skipped: Array<{ exportName: string; reason: string }>;
  /** Discovered exports, useful for callers that want to log diagnostics. */
  discovered: Array<{ exportName: string; file: string }>;
}

/**
 * IO wrapper: scan workers, patch `server.ts`, write it back. Returns a
 * summary the supervisor can log + emit on the repair telemetry channel.
 *
 * No-op (but reports `appliedAny: false`) when:
 *   - `server.ts` does not exist (e.g. project lacks a backend workspace).
 *   - Workers directory has no `start*Worker` exports.
 *   - Every discovered export is already called in `server.ts`.
 */
export async function autoWireWorkerStartups(
  outputDir: string,
): Promise<AutoWireWorkerStartupsResult> {
  const discovered = await scanWorkerStartupExports(outputDir);
  if (discovered.length === 0) {
    return { appliedAny: false, wired: [], skipped: [], discovered };
  }

  const serverRaw = await fsRead(SERVER_REL_PATH, outputDir);
  if (
    serverRaw.startsWith("FILE_NOT_FOUND") ||
    serverRaw.startsWith("REJECTED")
  ) {
    return {
      appliedAny: false,
      wired: [],
      skipped: discovered.map((d) => ({
        exportName: d.exportName,
        reason: `server.ts not present at ${SERVER_REL_PATH} — cannot wire worker startup`,
      })),
      discovered,
    };
  }

  const registrations: WorkerStartupRegistration[] = discovered.map((d) => ({
    exportName: d.exportName,
    importPath: computeWorkerImportPath(SERVER_REL_PATH, d.file),
  }));

  const transform = wireWorkerStartupsIntoServer(serverRaw, registrations);
  if (transform.wired.length === 0) {
    return {
      appliedAny: false,
      wired: [],
      skipped: transform.skipped,
      discovered,
    };
  }

  const writeRes = await fsWrite(SERVER_REL_PATH, transform.content, outputDir, {
    forceProtectedOverwrite: true,
  });
  // fsWrite returns "REJECTED:" on path traversal, "SKIPPED_PROTECTED:" on
  // protected-path merge skip, and "Written:" / "Merged" on success.
  const writeFailed =
    typeof writeRes === "string" &&
    (writeRes.startsWith("REJECTED") ||
      writeRes.startsWith("SKIPPED_PROTECTED") ||
      writeRes.startsWith("ERROR"));
  if (writeFailed) {
    return {
      appliedAny: false,
      wired: [],
      skipped: [
        ...transform.skipped,
        ...transform.wired.map((name) => ({
          exportName: name,
          reason: `server.ts write failed: ${writeRes}`,
        })),
      ],
      discovered,
    };
  }

  return {
    appliedAny: true,
    wired: transform.wired,
    skipped: transform.skipped,
    discovered,
  };
}
