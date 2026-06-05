/**
 * Acceptance runner — the correctness gate of the agentic-build channel.
 *
 * For a milestone, run each acceptance command (honouring optional `precondition`
 * guards and `optional` flags) and decide pass/fail/skipped purely from exit
 * codes (+ an optional output regex). This exit-code verdict REPLACES the
 * scaffolded pipeline's structural/anchor/endpoint audits: the user's own checks
 * are the source of truth.
 *
 * On failure it also renders a compact, model-facing feedback block (which check
 * failed, exit code, output tail) that the orchestrator feeds back to the agent
 * for the next repair attempt.
 */

import type { BuildExecutor } from "./executor";
import type {
  AcceptanceCommand,
  AcceptanceResult,
  Milestone,
} from "./types";

const OUTPUT_TAIL_CHARS = 2000;

function tail(s: string, n = OUTPUT_TAIL_CHARS): string {
  if (s.length <= n) return s;
  return "…(truncated)…\n" + s.slice(s.length - n);
}

function passes(cmd: AcceptanceCommand, exitCode: number, output: string): boolean {
  const okCodes = cmd.passExitCodes && cmd.passExitCodes.length > 0
    ? cmd.passExitCodes
    : [0];
  if (!okCodes.includes(exitCode)) return false;
  if (cmd.expectOutput) {
    let re: RegExp;
    try {
      re = new RegExp(cmd.expectOutput, "i");
    } catch {
      // A malformed regex shouldn't crash the gate — treat as substring.
      return output.toLowerCase().includes(cmd.expectOutput.toLowerCase());
    }
    if (!re.test(output)) return false;
  }
  return true;
}

/** Run a single acceptance command (with precondition guard handling). */
export async function runAcceptanceCommand(
  cmd: AcceptanceCommand,
  executor: BuildExecutor,
): Promise<AcceptanceResult> {
  const optional = cmd.optional === true;

  if (cmd.precondition) {
    const guard = await executor.run(cmd.precondition, { timeoutMs: 30_000 });
    if (guard.exitCode !== 0) {
      return {
        command: cmd.command,
        label: cmd.label,
        outcome: "skipped",
        exitCode: null,
        output: `precondition not met (\`${cmd.precondition}\` exit ${guard.exitCode}) — skipped`,
        durationMs: guard.durationMs,
        optional,
      };
    }
  }

  const res = await executor.run(cmd.command, { timeoutMs: cmd.timeoutMs });
  const ok = passes(cmd, res.exitCode, res.output);
  return {
    command: cmd.command,
    label: cmd.label,
    outcome: ok ? "pass" : "fail",
    exitCode: res.exitCode,
    output: tail(res.output),
    durationMs: res.durationMs,
    optional,
  };
}

export interface AcceptanceRunResult {
  results: AcceptanceResult[];
  /** True when every NON-optional check passed (or was skipped via guard). */
  passed: boolean;
}

/** Run all of a milestone's acceptance commands in order. */
export async function runMilestoneAcceptance(
  milestone: Milestone,
  executor: BuildExecutor,
): Promise<AcceptanceRunResult> {
  const results: AcceptanceResult[] = [];
  for (const cmd of milestone.acceptance) {
    results.push(await runAcceptanceCommand(cmd, executor));
  }
  const passed = results.every(
    (r) => r.outcome === "pass" || r.outcome === "skipped" || r.optional,
  );
  return { results, passed };
}

/** Render a model-facing feedback block describing what failed, for the next
 *  repair attempt. Returns "" when nothing blocking failed. */
export function renderAcceptanceFeedback(results: AcceptanceResult[]): string {
  const blocking = results.filter((r) => r.outcome === "fail" && !r.optional);
  if (blocking.length === 0) return "";
  const lines: string[] = [
    `The following acceptance check(s) FAILED. Fix the code so they pass, then stop.`,
    ``,
  ];
  for (const r of blocking) {
    lines.push(
      `### FAILED: ${r.label ?? r.command}`,
      `command: ${r.command}`,
      `exit code: ${r.exitCode ?? "n/a"}`,
      `output:`,
      "```",
      r.output || "(no output)",
      "```",
      "",
    );
  }
  return lines.join("\n");
}
