/**
 * Agentic Build — a no-scaffold, milestone-driven, language-agnostic codegen
 * channel that complements the scaffolded PRD→TRD→tasks pipeline.
 *
 * Instead of slicing a PRD into tasks over a fixed TS-web scaffold, this channel
 * runs a single agent (bash / read / write / list tools) in a loop, milestone by
 * milestone, and uses each milestone's machine-verifiable ACCEPTANCE COMMANDS
 * (exit-code gated) as the source of truth — exactly the execution model that
 * suits well-specified, self-verifying projects (e.g. a TDD M0→M10 plan with
 * per-step shell checks), regardless of language or stack.
 *
 * The scaffold normally supplies the "common ground" that holds sharded tasks
 * together; here the acceptance commands supply correctness instead, so we can
 * drop the scaffold entirely.
 */

/** One machine-verifiable acceptance check for a milestone. */
export interface AcceptanceCommand {
  /** Shell command, run with cwd = workspace root. */
  command: string;
  /** Human-readable label (shown in reports / UI). */
  label?: string;
  /** Exit codes that count as a pass. Defaults to `[0]`. */
  passExitCodes?: number[];
  /** Optional regex (case-insensitive) the combined stdout+stderr must match. */
  expectOutput?: string;
  /** Per-command timeout in ms. Falls back to the run-level default. */
  timeoutMs?: number;
  /**
   * When true a non-pass result is reported but does NOT block the milestone.
   * Use for conditionally-included checks (e.g. "real model e2e only if a
   * checkpoint is present").
   */
  optional?: boolean;
  /**
   * Optional guard command. The acceptance command only runs when this guard
   * exits 0; otherwise the acceptance is `skipped`. Use to make a check
   * conditional on the environment (e.g. detect `./checkpoints/v16.ckpt`).
   */
  precondition?: string;
}

/** A single milestone the agent must build and then prove via acceptance. */
export interface Milestone {
  /** Stable id, e.g. "M0". */
  id: string;
  title: string;
  /** Natural-language instructions: what to build / change in this milestone. */
  instructions: string;
  /** Acceptance checks; the milestone passes only when all non-optional pass. */
  acceptance: AcceptanceCommand[];
  /**
   * Milestone ids that must pass before this one runs. When omitted, the
   * orchestrator defaults to "the immediately preceding milestone in order".
   */
  dependsOn?: string[];
}

/** A complete, structured build plan (extracted from a markdown spec, then
 *  reviewed/edited by the user before running). */
export interface BuildPlan {
  projectName: string;
  /**
   * Workspace directory the agent operates in (absolute, or resolved by the
   * caller). No scaffold is copied here — the agent creates everything.
   */
  workspaceDir: string;
  /** Global context handed to the agent on every milestone (the "why" + hard
   *  constraints, e.g. "do not import poc/", "coordinator has zero torch"). */
  context?: string;
  milestones: Milestone[];
}

// ─── Results ────────────────────────────────────────────────────────────────

export type AcceptanceOutcome = "pass" | "fail" | "skipped";

export interface AcceptanceResult {
  command: string;
  label?: string;
  outcome: AcceptanceOutcome;
  /** null when the command could not be spawned. */
  exitCode: number | null;
  /** Truncated combined stdout+stderr. */
  output: string;
  durationMs: number;
  optional: boolean;
}

export type MilestoneOutcome = "passed" | "failed" | "skipped";

export interface MilestoneResult {
  id: string;
  title: string;
  outcome: MilestoneOutcome;
  /** Number of agent attempts spent on this milestone (≥1 when it ran). */
  attempts: number;
  acceptance: AcceptanceResult[];
  /** Relative paths the agent created/modified across all attempts. */
  filesTouched: string[];
  /** Why it ended in this outcome (esp. for failed / skipped). */
  reason?: string;
  costUsd: number;
}

export type BuildRunOutcome = "passed" | "failed";

export interface BuildRunResult {
  outcome: BuildRunOutcome;
  milestones: MilestoneResult[];
  /** Id of the first milestone that failed (when outcome=failed). */
  failedAt?: string;
  costUsd: number;
  durationMs: number;
}

// ─── Resumable progress (persisted to <workspace>/.agentic-build/progress.json) ──

export interface BuildProgress {
  projectName: string;
  /** Milestone ids that have reached `passed`. */
  passed: string[];
  /** Last recorded result per milestone id (for reporting / resume). */
  results: Record<string, MilestoneResult>;
  updatedAt: string;
}
