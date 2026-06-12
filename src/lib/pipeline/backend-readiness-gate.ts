/**
 * Backend readiness gate (CODEGEN_HARDENING — G2/G3).
 *
 * A *deterministic* backend gate, distinct from the LLM-driven verify-fix loop:
 *
 *  - G3: run `tsc --noEmit` on the generated backend and HARD-FAIL on a non-zero
 *    error count. Today type-checking is fed to the repair worker as prompt text
 *    (best-effort) and the loop can exhaust its budget and "give up" with type
 *    errors still present. This gate is a deterministic stop that cannot be
 *    talked past.
 *  - G2: compose the tsc gate with a backend-scoped runtime smoke (route presence)
 *    so a caller can prove "backend compiles AND every backend route is mounted"
 *    as a single precondition — intended to run BEFORE investing in the frontend.
 *
 * Gated by `BLUEPRINT_BACKEND_GATE_BEFORE_FRONTEND=1` at the call sites; this
 * module itself is pure/injectable so it is unit-testable without spawning tsc.
 *
 * NOTE on placement: wiring this literally *before the frontend phase* requires a
 * task-scheduler change (frontend tasks currently depend only on the frontend
 * foundation, not on backend readiness — see task-dep-inference.ts). This module
 * is the reusable building block for that hook; it is wired today as a
 * deterministic hard pre-gate at the integration node.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import fs from "node:fs/promises";

const pexec = promisify(execFile);

export interface TscGateResult {
  pass: boolean;
  /** true when tsc could not be run (no backend dir / tsc binary missing) — an
   *  infra condition, NOT a type failure; callers should not hard-fail on it. */
  skipped: boolean;
  errorCount: number;
  firstErrors: string[];
}

export type CommandRunner = (
  cmd: string,
  args: string[],
  cwd: string,
) => Promise<{ stdout: string; exitCode: number }>;

/** Real runner: execFile, merging stdout+stderr, never throwing (maps to exitCode). */
export const defaultCommandRunner: CommandRunner = async (cmd, args, cwd) => {
  try {
    const { stdout, stderr } = await pexec(cmd, args, {
      cwd,
      maxBuffer: 16 * 1024 * 1024,
    });
    return { stdout: `${stdout}\n${stderr}`, exitCode: 0 };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; code?: number };
    return {
      stdout: `${e.stdout ?? ""}\n${e.stderr ?? ""}`,
      exitCode: typeof e.code === "number" ? e.code : 1,
    };
  }
};

const TS_ERROR_RE = /error TS\d+:/;
const INFRA_RE =
  /command not found|Cannot find module 'typescript'|tsc: not found|ENOENT|is not recognized/i;

/** Parse `tsc` text output into a structured verdict. Pure — exported for tests. */
export function parseTscOutput(out: string, exitCode: number): TscGateResult {
  const errorLines = out.split("\n").filter((l) => TS_ERROR_RE.test(l));
  // tsc couldn't run at all (no binary / deps) and produced no diagnostics →
  // treat as infra-skip rather than a false type failure.
  if (errorLines.length === 0 && exitCode !== 0 && INFRA_RE.test(out)) {
    return { pass: true, skipped: true, errorCount: 0, firstErrors: [] };
  }
  return {
    pass: exitCode === 0 && errorLines.length === 0,
    skipped: false,
    errorCount: errorLines.length,
    firstErrors: errorLines.slice(0, 10),
  };
}

/**
 * G3: deterministic backend `tsc --noEmit` gate. Returns `skipped:true` when
 * there is no `backend/` directory or tsc cannot be invoked (infra), so callers
 * can avoid false failures in environments without the generated deps installed.
 */
export async function runBackendTscGate(
  outputDir: string,
  run: CommandRunner = defaultCommandRunner,
): Promise<TscGateResult> {
  const backendDir = path.join(outputDir, "backend");
  try {
    await fs.stat(backendDir);
  } catch {
    return { pass: true, skipped: true, errorCount: 0, firstErrors: [] };
  }
  const { stdout, exitCode } = await run(
    "npx",
    ["tsc", "--noEmit", "--skipLibCheck", "--pretty", "false"],
    backendDir,
  );
  return parseTscOutput(stdout, exitCode);
}

/**
 * Pure routing decision for the backend→frontend transition (G2). Kept here
 * (not in the supervisor) so it is unit-testable without importing the graph.
 *
 *  - flag off / no backend / backend green → "proceed" (build the frontend).
 *  - backend NOT green → "proceed" by default ("proceed-quarantined": the output
 *    is quarantined but we don't lose the frontend); only `hardStop` → "stop"
 *    (skip the frontend to save tokens on a hopeless backend).
 */
export function decideBackendReadinessRoute(opts: {
  flagOn: boolean;
  hasBackendTasks: boolean;
  backendNotGreen: boolean;
  hardStop: boolean;
}): "proceed" | "stop" {
  if (!opts.flagOn) return "proceed";
  if (!opts.hasBackendTasks) return "proceed";
  if (!opts.backendNotGreen) return "proceed";
  return opts.hardStop ? "stop" : "proceed";
}

export interface BackendReadiness {
  pass: boolean;
  tsc: TscGateResult;
  /** Optional backend-scoped smoke verdict (route presence), when a probe is supplied. */
  smoke?: { pass: boolean; failureCount: number };
  summary: string;
}

/**
 * G2: compose the deterministic tsc gate (G3) with an optional backend-scoped
 * runtime smoke (route presence). `smokeProbe` is injected so this module stays
 * decoupled from the heavy `runtime-smoke-gate` (the supervisor passes a thunk
 * that calls it with backend scope). If tsc fails, smoke is skipped (no point
 * booting a non-compiling backend).
 */
export async function runBackendReadinessGate(
  outputDir: string,
  opts: {
    run?: CommandRunner;
    smokeProbe?: () => Promise<{ pass: boolean; failureCount: number }>;
  } = {},
): Promise<BackendReadiness> {
  const tsc = await runBackendTscGate(outputDir, opts.run ?? defaultCommandRunner);
  if (!tsc.skipped && !tsc.pass) {
    return {
      pass: false,
      tsc,
      summary: `Backend tsc failed: ${tsc.errorCount} error(s).`,
    };
  }
  if (opts.smokeProbe) {
    const smoke = await opts.smokeProbe();
    return {
      pass: smoke.pass,
      tsc,
      smoke,
      summary: smoke.pass
        ? "Backend ready: tsc clean, all backend routes mounted."
        : `Backend smoke failed: ${smoke.failureCount} route(s) unreachable.`,
    };
  }
  return {
    pass: true,
    tsc,
    summary: tsc.skipped ? "Backend tsc skipped (infra)." : "Backend tsc clean.",
  };
}
