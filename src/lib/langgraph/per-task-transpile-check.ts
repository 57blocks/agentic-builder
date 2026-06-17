/**
 * Per-task single-file transpile check.
 *
 * The worker `verify` node historically skipped TypeScript checking per task
 * ("per-task tsc disabled; project-wide tsc runs in supervisor verify") because
 * a naive project-wide `tsc --noEmit` on a half-built project floods false
 * "cannot find module" / "has no exported member" errors for symbols that a
 * LATER task (or the other role's phase) will create. That deferred everything
 * to the integration-verify phase, where the errors from every task land at
 * once.
 *
 * This module does the opposite of naive: it transpiles each generated file
 * IN ISOLATION via `ts.transpileModule`. That reports SYNTAX-level diagnostics
 * (parse errors, truncated/malformed output, invalid tokens, bad JSX) and does
 * NOT resolve imports — so there are essentially zero false positives from
 * not-yet-created modules. Genuine cross-file type/resolution errors are still
 * left to the project-wide tsc in supervisor integration-verify.
 *
 * Deliberately NOT `isolatedModules: true`: that adds stricter-than-default
 * constraints (e.g. re-exporting a type without `export type`) which, while
 * real for esbuild/Vite, would surprise with extra findings. Start with the
 * pure syntax floor; the isolatedModules tightening can come later.
 */

import * as ts from "typescript";

const TRANSPILE_COMPILER_OPTIONS: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2020,
  module: ts.ModuleKind.ESNext,
  jsx: ts.JsxEmit.ReactJSX,
  esModuleInterop: true,
  // Permit decorator syntax so class decorators (some backend code) parse
  // instead of being reported as a syntax error — we only care about genuine
  // malformed/truncated output here, not stylistic config mismatches.
  experimentalDecorators: true,
  emitDecoratorMetadata: true,
};

export interface TranspileDiagnostic {
  file: string;
  /** 1-based line; 0 when the position is unknown. */
  line: number;
  /** 1-based column; 0 when the position is unknown. */
  col: number;
  /** TypeScript error code (the number after `TS`). */
  code: number;
  message: string;
}

/**
 * Pure syntax-level transpile diagnostics for a single source file. No IO, no
 * module resolution — only the file's own text is parsed.
 */
export function transpileCheckSource(
  fileName: string,
  content: string,
): TranspileDiagnostic[] {
  const result = ts.transpileModule(content, {
    fileName,
    reportDiagnostics: true,
    compilerOptions: TRANSPILE_COMPILER_OPTIONS,
  });
  const out: TranspileDiagnostic[] = [];
  for (const d of result.diagnostics ?? []) {
    if (d.category !== ts.DiagnosticCategory.Error) continue;
    const message = ts.flattenDiagnosticMessageText(d.messageText, "\n");
    let line = 0;
    let col = 0;
    if (d.file && typeof d.start === "number") {
      const lc = d.file.getLineAndCharacterOfPosition(d.start);
      line = lc.line + 1;
      col = lc.character + 1;
    }
    out.push({ file: fileName, line, col, code: d.code, message });
  }
  return out;
}

/**
 * Format diagnostics as canonical `tsc` lines so the worker fix loop and the
 * UI parse them identically to a real `tsc --noEmit` run:
 *   `path(line,col): error TS1234: message`
 */
export function formatTranspileDiagnostics(
  diags: TranspileDiagnostic[],
): string {
  return diags
    .map(
      (d) =>
        `${d.file}(${d.line},${d.col}): error TS${d.code}: ${d.message}`,
    )
    .join("\n");
}
