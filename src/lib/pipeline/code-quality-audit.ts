/**
 * Code quality audit — runs tsc, eslint, jscpd, madge, and an AST scan against
 * one or more generated-code workspaces, returning per-sub-dimension metrics
 * suitable for scoreCodeQuality(). Best-effort: any tool failure becomes
 * `present: false` for that sub-dimension; the report writer must NOT throw.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";

const execFileAsync = promisify(execFile);

export interface CodeQualityAuditResult {
  present: boolean;
  workspaces: WorkspaceAuditResult[];
  staticChecks: { present: boolean; tscErrors: number; lintErrors: number; lintWarnings: number };
  complexity: { present: boolean; avgCyclomatic: number; longFunctions: number; largeFiles: number };
  duplication: { present: boolean; percentage: number };
  typeSafety: { present: boolean; anyCount: number; tsIgnoreCount: number; nonNullAssertCount: number };
  modularity: { present: boolean; circularDeps: number; crossBoundaryImports: number };
}

export interface WorkspaceAuditResult {
  name: string;
  path: string;
  tscErrors: number | null;
  lintErrors: number | null;
  lintWarnings: number | null;
  duplicationPct: number | null;
  circularDeps: number | null;
  anyCount: number | null;
  tsIgnoreCount: number | null;
  nonNullAssertCount: number | null;
  longFunctions: number | null;
  largeFiles: number | null;
  avgCyclomatic: number | null;
  errors: string[];
}

export function parseTscOutput(stdout: string): number {
  const matches = stdout.match(/error TS\d+/g);
  return matches ? matches.length : 0;
}

export function parseEslintJson(json: string): { lintErrors: number; lintWarnings: number } {
  try {
    const parsed = JSON.parse(json) as Array<{ errorCount?: number; warningCount?: number }>;
    if (!Array.isArray(parsed)) return { lintErrors: 0, lintWarnings: 0 };
    let lintErrors = 0;
    let lintWarnings = 0;
    for (const file of parsed) {
      lintErrors += file.errorCount ?? 0;
      lintWarnings += file.warningCount ?? 0;
    }
    return { lintErrors, lintWarnings };
  } catch {
    return { lintErrors: 0, lintWarnings: 0 };
  }
}

export function parseJscpdJson(json: string): { percentage: number } {
  try {
    const parsed = JSON.parse(json) as { statistics?: { total?: { percentage?: number } } };
    return { percentage: parsed.statistics?.total?.percentage ?? 0 };
  } catch {
    return { percentage: 0 };
  }
}

export function parseMadgeJson(json: string): { circularDeps: number } {
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) return { circularDeps: parsed.length };
    return { circularDeps: 0 };
  } catch {
    return { circularDeps: 0 };
  }
}

export function countAstAnomalies(src: string): { anyCount: number; tsIgnoreCount: number; nonNullAssertCount: number } {
  // Regex-based scan — cheap and good-enough for skill A/B comparison. A real
  // AST scan would be more precise but pulls in a heavy parser dep.

  // Scan @ts-ignore / @ts-expect-error BEFORE stripping comments — they only
  // appear inside comments so stripping would erase them.
  const ignore = src.match(/@ts-(ignore|expect-error)\b/g) ?? [];

  const stripped = src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .replace(/(['"`])(?:\\.|(?!\1).)*\1/g, '""');
  const any = stripped.match(/\b:\s*any\b|\bas\s+any\b/g) ?? [];
  // Non-null assertion: identifier or `)` followed by `!` followed by `.` or `[` or `(`.
  const nonNull = stripped.match(/[a-zA-Z_$\]\)]!\s*[.\[\(]/g) ?? [];
  return {
    anyCount: any.length,
    tsIgnoreCount: ignore.length,
    nonNullAssertCount: nonNull.length,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Public entry — best-effort audit over one outputDir
// ────────────────────────────────────────────────────────────────────────────

export interface AuditOptions {
  outputDir: string;
  /** Per-command timeout in ms; default 120000. */
  timeoutMs?: number;
  /** Injected runner — defaults to execFile. Allows tests to mock. */
  runner?: (cmd: string, args: string[], opts: { cwd: string; timeout: number }) => Promise<{ stdout: string; stderr: string }>;
}

const DEFAULT_TIMEOUT_MS = 120_000;

export async function auditCodeQuality(opts: AuditOptions): Promise<CodeQualityAuditResult> {
  const workspaces = await discoverWorkspaces(opts.outputDir);
  if (workspaces.length === 0) {
    return emptyResult();
  }
  const runner = opts.runner ?? defaultRunner;
  const timeout = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const wsResults: WorkspaceAuditResult[] = [];
  for (const ws of workspaces) {
    wsResults.push(await auditWorkspace(ws.name, ws.path, runner, timeout));
  }
  return aggregateWorkspaces(wsResults);
}

async function discoverWorkspaces(outputDir: string): Promise<Array<{ name: string; path: string }>> {
  const out: Array<{ name: string; path: string }> = [];
  for (const name of ["frontend", "backend"]) {
    const p = path.join(outputDir, name);
    try {
      await fs.access(path.join(p, "package.json"));
      out.push({ name, path: p });
    } catch { /* not present */ }
  }
  if (out.length === 0) {
    try {
      await fs.access(path.join(outputDir, "package.json"));
      out.push({ name: "root", path: outputDir });
    } catch { /* nothing */ }
  }
  return out;
}

async function defaultRunner(cmd: string, args: string[], opts: { cwd: string; timeout: number }) {
  return execFileAsync(cmd, args, { cwd: opts.cwd, timeout: opts.timeout, maxBuffer: 32 * 1024 * 1024 });
}

async function auditWorkspace(
  name: string,
  cwd: string,
  runner: NonNullable<AuditOptions["runner"]>,
  timeout: number,
): Promise<WorkspaceAuditResult> {
  const result: WorkspaceAuditResult = {
    name, path: cwd,
    tscErrors: null, lintErrors: null, lintWarnings: null,
    duplicationPct: null, circularDeps: null,
    anyCount: null, tsIgnoreCount: null, nonNullAssertCount: null,
    longFunctions: null, largeFiles: null, avgCyclomatic: null,
    errors: [],
  };

  // tsc
  try {
    const { stdout, stderr } = await runner("pnpm", ["exec", "tsc", "--noEmit"], { cwd, timeout: 180_000 });
    result.tscErrors = parseTscOutput(stdout + stderr);
  } catch (e: any) {
    if (typeof e?.stdout === "string") result.tscErrors = parseTscOutput(e.stdout + (e.stderr ?? ""));
    else result.errors.push(`tsc: ${String(e?.message ?? e)}`);
  }

  // eslint
  try {
    const { stdout } = await runner("pnpm", ["exec", "eslint", ".", "--format", "json"], { cwd, timeout });
    const { lintErrors, lintWarnings } = parseEslintJson(stdout);
    result.lintErrors = lintErrors;
    result.lintWarnings = lintWarnings;
  } catch (e: any) {
    if (typeof e?.stdout === "string") {
      const { lintErrors, lintWarnings } = parseEslintJson(e.stdout);
      result.lintErrors = lintErrors;
      result.lintWarnings = lintWarnings;
    } else {
      result.errors.push(`eslint: ${String(e?.message ?? e)}`);
    }
  }

  // jscpd
  try {
    const reportDir = path.join(cwd, ".ralph-jscpd");
    await fs.mkdir(reportDir, { recursive: true });
    await runner("pnpm", ["exec", "jscpd", "src", "--reporters", "json", "--output", reportDir, "--silent"], { cwd, timeout });
    const reportPath = path.join(reportDir, "jscpd-report.json");
    const raw = await fs.readFile(reportPath, "utf-8");
    result.duplicationPct = parseJscpdJson(raw).percentage;
  } catch (e: any) {
    result.errors.push(`jscpd: ${String(e?.message ?? e)}`);
  }

  // madge
  try {
    const { stdout } = await runner("pnpm", ["exec", "madge", "--circular", "--json", "src"], { cwd, timeout: 60_000 });
    result.circularDeps = parseMadgeJson(stdout).circularDeps;
  } catch (e: any) {
    if (typeof e?.stdout === "string") result.circularDeps = parseMadgeJson(e.stdout).circularDeps;
    else result.errors.push(`madge: ${String(e?.message ?? e)}`);
  }

  // AST anomalies + complexity
  try {
    const stats = await scanSourceTree(path.join(cwd, "src"));
    result.anyCount = stats.anyCount;
    result.tsIgnoreCount = stats.tsIgnoreCount;
    result.nonNullAssertCount = stats.nonNullAssertCount;
    result.longFunctions = stats.longFunctions;
    result.largeFiles = stats.largeFiles;
    result.avgCyclomatic = stats.avgCyclomatic;
  } catch (e: any) {
    result.errors.push(`ast-scan: ${String(e?.message ?? e)}`);
  }

  return result;
}

async function scanSourceTree(root: string): Promise<{
  anyCount: number;
  tsIgnoreCount: number;
  nonNullAssertCount: number;
  longFunctions: number;
  largeFiles: number;
  avgCyclomatic: number;
}> {
  const files: string[] = [];
  await walk(root, files);
  let any = 0, ign = 0, nn = 0, longFn = 0, largeFile = 0;
  let cyclomaticSum = 0;
  let cyclomaticDen = 0;
  for (const f of files) {
    const src = await fs.readFile(f, "utf-8");
    const lines = src.split(/\r?\n/).length;
    if (lines > 400) largeFile += 1;
    const anomalies = countAstAnomalies(src);
    any += anomalies.anyCount;
    ign += anomalies.tsIgnoreCount;
    nn += anomalies.nonNullAssertCount;
    const fnStats = scanFunctions(src);
    longFn += fnStats.longCount;
    cyclomaticSum += fnStats.cyclomaticSum;
    cyclomaticDen += fnStats.fnCount;
  }
  return {
    anyCount: any,
    tsIgnoreCount: ign,
    nonNullAssertCount: nn,
    longFunctions: longFn,
    largeFiles: largeFile,
    avgCyclomatic: cyclomaticDen > 0 ? cyclomaticSum / cyclomaticDen : 0,
  };
}

async function walk(dir: string, out: string[]): Promise<void> {
  let entries: import("node:fs").Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch { return; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name.startsWith(".") || e.name === "dist" || e.name === "build") continue;
      await walk(full, out);
    } else if (/\.(ts|tsx)$/.test(e.name) && !/\.(test|spec)\.(ts|tsx)$/.test(e.name)) {
      out.push(full);
    }
  }
}

function scanFunctions(src: string): { longCount: number; cyclomaticSum: number; fnCount: number } {
  const fnSplits = src.split(/(?:^|\n)\s*(?:export\s+)?(?:async\s+)?function\s+[A-Za-z_$][A-Za-z0-9_$]*\s*\(/);
  let longCount = 0;
  let cyclomaticSum = 0;
  let fnCount = 0;
  for (let i = 1; i < fnSplits.length; i++) {
    const body = fnSplits[i];
    const lines = body.split(/\r?\n/).length;
    if (lines > 50) longCount += 1;
    const branches =
      (body.match(/\b(if|for|while|case)\b/g)?.length ?? 0) +
      (body.match(/\?\s*[^:]+:/g)?.length ?? 0) +
      (body.match(/&&|\|\|/g)?.length ?? 0);
    cyclomaticSum += 1 + branches;
    fnCount += 1;
  }
  return { longCount, cyclomaticSum, fnCount };
}

function aggregateWorkspaces(wsResults: WorkspaceAuditResult[]): CodeQualityAuditResult {
  const sum = (key: keyof WorkspaceAuditResult) =>
    wsResults.reduce((acc, w) => acc + (typeof w[key] === "number" ? (w[key] as number) : 0), 0);
  const someHas = (key: keyof WorkspaceAuditResult) =>
    wsResults.some((w) => typeof w[key] === "number");

  const cyclomaticWorkspaces = wsResults.filter((w) => typeof w.avgCyclomatic === "number");
  const avgCyclomatic = cyclomaticWorkspaces.length > 0
    ? cyclomaticWorkspaces.reduce((s, w) => s + (w.avgCyclomatic as number), 0) / cyclomaticWorkspaces.length
    : 0;

  const dupWorkspaces = wsResults.filter((w) => typeof w.duplicationPct === "number");
  const duplicationPct = dupWorkspaces.length > 0
    ? dupWorkspaces.reduce((s, w) => s + (w.duplicationPct as number), 0) / dupWorkspaces.length
    : 0;

  return {
    present: true,
    workspaces: wsResults,
    staticChecks: {
      present: someHas("tscErrors") || someHas("lintErrors"),
      tscErrors: sum("tscErrors"),
      lintErrors: sum("lintErrors"),
      lintWarnings: sum("lintWarnings"),
    },
    complexity: {
      present: someHas("avgCyclomatic"),
      avgCyclomatic,
      longFunctions: sum("longFunctions"),
      largeFiles: sum("largeFiles"),
    },
    duplication: {
      present: someHas("duplicationPct"),
      percentage: duplicationPct,
    },
    typeSafety: {
      present: someHas("anyCount"),
      anyCount: sum("anyCount"),
      tsIgnoreCount: sum("tsIgnoreCount"),
      nonNullAssertCount: sum("nonNullAssertCount"),
    },
    modularity: {
      present: someHas("circularDeps"),
      circularDeps: sum("circularDeps"),
      crossBoundaryImports: 0, // Not yet computed; reserved field.
    },
  };
}

function emptyResult(): CodeQualityAuditResult {
  return {
    present: false,
    workspaces: [],
    staticChecks: { present: false, tscErrors: 0, lintErrors: 0, lintWarnings: 0 },
    complexity: { present: false, avgCyclomatic: 0, longFunctions: 0, largeFiles: 0 },
    duplication: { present: false, percentage: 0 },
    typeSafety: { present: false, anyCount: 0, tsIgnoreCount: 0, nonNullAssertCount: 0 },
    modularity: { present: false, circularDeps: 0, crossBoundaryImports: 0 },
  };
}
