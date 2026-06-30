/**
 * Lightweight iteration tracking for imported projects.
 *
 * "Run a new PRD as the current iteration's new version" is modelled as:
 *   - a record per iteration in `.blueprint/iterations.json`, and
 *   - git commits as the actual code-version carrier (a `baseGitRef` snapshot
 *     before the iteration's coding runs, a `resultGitRef` after).
 *
 * The user opted into "introduce a lightweight iteration concept + git-borne
 * versioning, reusing incremental-rerun". This module owns the iteration ledger
 * + git baseline/commit; the PRD-delta itself reuses `incremental-rerun.ts`.
 *
 * Git note: for an imported project we DO touch git (init if absent, commit
 * baseline/result) — that is the chosen version carrier. We never rewrite
 * history; we only add commits, clearly labelled.
 */

import path from "node:path";
import * as nodeFs from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const ITERATIONS_RELATIVE = ".blueprint/iterations.json";

export type IterationStatus = "running" | "done" | "failed";

export interface Iteration {
  index: number;
  status: IterationStatus;
  createdAt: string;
  /** The PRD text driving this iteration (optional). */
  prd?: string;
  /** Short human summary of what changed vs the previous PRD. */
  prdDiffSummary?: string;
  /** Git ref captured BEFORE this iteration's coding ran. */
  baseGitRef?: string;
  /** Git ref captured AFTER this iteration's coding completed. */
  resultGitRef?: string;
  /** Task ids this iteration touched (optional). */
  taskIds?: string[];
}

function iterationsPath(dir: string): string {
  return path.join(dir, ITERATIONS_RELATIVE);
}

export async function readIterations(dir: string): Promise<Iteration[]> {
  try {
    const raw = await nodeFs.readFile(iterationsPath(dir), "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Iteration[]) : [];
  } catch {
    return [];
  }
}

async function writeIterations(
  dir: string,
  iterations: Iteration[],
): Promise<void> {
  const target = iterationsPath(dir);
  await nodeFs.mkdir(path.dirname(target), { recursive: true });
  await nodeFs.writeFile(target, JSON.stringify(iterations, null, 2), "utf-8");
}

// ─── git helpers ────────────────────────────────────────────────────────────

async function git(dir: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", args, { cwd: dir });
  return stdout.trim();
}

async function isGitRepo(dir: string): Promise<boolean> {
  try {
    await nodeFs.access(path.join(dir, ".git"));
    return true;
  } catch {
    return false;
  }
}

/** Init a git repo if the project has none, with a local commit identity so
 *  commits work in headless/CI environments without global git config. */
async function ensureGitRepo(dir: string): Promise<void> {
  if (await isGitRepo(dir)) return;
  await git(dir, ["init"]);
  await git(dir, ["config", "user.email", "agentic-builder@local"]).catch(
    () => {},
  );
  await git(dir, ["config", "user.name", "Agentic Builder"]).catch(() => {});
}

async function headRef(dir: string): Promise<string | null> {
  try {
    return await git(dir, ["rev-parse", "HEAD"]);
  } catch {
    return null; // no commits yet
  }
}

/** Stage everything and commit. Returns the resulting HEAD ref. A clean tree
 *  (nothing to commit) is fine — we just return the current HEAD. */
async function commitAll(dir: string, message: string): Promise<string | null> {
  await git(dir, ["add", "-A"]).catch(() => {});
  try {
    await git(dir, ["commit", "-m", message]);
  } catch {
    // "nothing to commit" (clean tree) — fall through to current HEAD.
  }
  return headRef(dir);
}

// ─── Public API ─────────────────────────────────────────────────────────────

export interface StartIterationOptions {
  prd?: string;
  prdDiffSummary?: string;
}

/**
 * Open a new iteration: ensure git, snapshot the pre-iteration state as a
 * baseline commit, and append a `running` record. Returns the new iteration.
 */
export async function startIteration(
  dir: string,
  opts: StartIterationOptions = {},
): Promise<Iteration> {
  await ensureGitRepo(dir);
  const iterations = await readIterations(dir);
  const index = iterations.length + 1;
  const baseGitRef = await commitAll(
    dir,
    `chore(agentic-builder): iteration ${index} baseline`,
  );
  const iter: Iteration = {
    index,
    status: "running",
    createdAt: new Date().toISOString(),
    prd: opts.prd,
    prdDiffSummary: opts.prdDiffSummary,
    baseGitRef: baseGitRef ?? undefined,
  };
  iterations.push(iter);
  await writeIterations(dir, iterations);
  return iter;
}

export interface FinishIterationOptions {
  status?: IterationStatus;
  taskIds?: string[];
}

/**
 * Close an iteration: commit the resulting code as `resultGitRef` and update
 * the ledger record. No-op-safe if the iteration index isn't found.
 */
export async function finishIteration(
  dir: string,
  index: number,
  opts: FinishIterationOptions = {},
): Promise<void> {
  const resultGitRef = await commitAll(
    dir,
    `chore(agentic-builder): iteration ${index} result`,
  );
  const iterations = await readIterations(dir);
  const iter = iterations.find((i) => i.index === index);
  if (!iter) return;
  iter.status = opts.status ?? "done";
  iter.resultGitRef = resultGitRef ?? undefined;
  if (opts.taskIds) iter.taskIds = opts.taskIds;
  await writeIterations(dir, iterations);
}
