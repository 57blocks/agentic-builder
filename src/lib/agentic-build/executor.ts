/**
 * BuildExecutor — the substrate the agentic-build channel runs on.
 *
 * Everything the agent and the acceptance runner do (run a shell command, read
 * a file, write a file, list a tree) goes through this interface. That keeps the
 * orchestrator/agent/acceptance code 100% agnostic to WHERE execution happens:
 *
 *   - `LocalBuildExecutor` runs on the host (this file).
 *   - a future `ContainerBuildExecutor` runs the same commands inside an
 *     isolated docker container — same interface, the orchestrator never knows.
 *
 * All file paths are RELATIVE to the workspace root and are confined to it
 * (path traversal outside the root is rejected), so an agent can't escape its
 * sandbox by writing `../../etc/...`.
 */

import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";

const execFileAsync = promisify(execFile);

export interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  /** Combined stdout+stderr (convenience for matching / logging). */
  output: string;
  timedOut: boolean;
  durationMs: number;
}

export interface RunOptions {
  timeoutMs?: number;
  env?: Record<string, string>;
  /** Max bytes captured from each of stdout/stderr. */
  maxBuffer?: number;
}

export interface BuildExecutor {
  /** Absolute workspace root (for logging / mounts). */
  readonly workspaceDir: string;
  /** Run a shell command with cwd = workspace root. Never throws on non-zero
   *  exit — the non-zero code is returned in `exitCode`. */
  run(command: string, opts?: RunOptions): Promise<CommandResult>;
  /** Read a workspace-relative file. Returns null when missing. */
  readFile(relPath: string): Promise<string | null>;
  /** Write a workspace-relative file (creates parent dirs). */
  writeFile(relPath: string, content: string): Promise<void>;
  /** List files (recursive, workspace-relative) under `dir`. */
  listFiles(dir?: string): Promise<string[]>;
}

const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_MAX_BUFFER = 10 * 1024 * 1024;

/** Commands that are always rejected regardless of executor. */
const UNSAFE_COMMAND_PATTERNS: RegExp[] = [
  /rm\s+-rf?\s+\/(?:\s|$)/,
  /\bsudo\b/,
  /\bgit\s+push\b/,
  /\bshutdown\b/,
  /\breboot\b/,
  /\bmkfs\b/,
  /:\s*\(\)\s*\{.*\}\s*;/, // fork bomb
];

export function isUnsafeCommand(command: string): boolean {
  return UNSAFE_COMMAND_PATTERNS.some((re) => re.test(command));
}

const LIST_EXCLUDE_DIRS = new Set([
  "node_modules",
  ".git",
  ".venv",
  "venv",
  "__pycache__",
  "dist",
  "build",
  ".next",
  ".agentic-build",
  "data",
]);
const LIST_MAX_FILES = 2000;

export class LocalBuildExecutor implements BuildExecutor {
  readonly workspaceDir: string;

  constructor(workspaceDir: string) {
    this.workspaceDir = path.resolve(workspaceDir);
  }

  /** Resolve a workspace-relative path, rejecting traversal outside the root. */
  private resolveInside(relPath: string): string {
    const abs = path.resolve(this.workspaceDir, relPath);
    const rel = path.relative(this.workspaceDir, abs);
    if (rel === "" || rel === ".") return abs;
    if (rel.startsWith("..") || path.isAbsolute(rel)) {
      throw new Error(`Path escapes workspace: ${relPath}`);
    }
    return abs;
  }

  async run(command: string, opts: RunOptions = {}): Promise<CommandResult> {
    const started = Date.now();
    if (isUnsafeCommand(command)) {
      return {
        exitCode: 126,
        stdout: "",
        stderr: `command rejected — unsafe pattern: ${command.slice(0, 100)}`,
        output: `command rejected — unsafe pattern: ${command.slice(0, 100)}`,
        timedOut: false,
        durationMs: Date.now() - started,
      };
    }
    try {
      const { stdout, stderr } = await execFileAsync("bash", ["-c", command], {
        cwd: this.workspaceDir,
        timeout: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        maxBuffer: opts.maxBuffer ?? DEFAULT_MAX_BUFFER,
        env: { ...process.env, FORCE_COLOR: "0", ...(opts.env ?? {}) },
      });
      const so = stdout ?? "";
      const se = stderr ?? "";
      return {
        exitCode: 0,
        stdout: so,
        stderr: se,
        output: (so + se).trim(),
        timedOut: false,
        durationMs: Date.now() - started,
      };
    } catch (err: unknown) {
      const e = err as {
        code?: number | string;
        killed?: boolean;
        signal?: string;
        stdout?: string;
        stderr?: string;
        message?: string;
      };
      const so = e.stdout ?? "";
      const se = e.stderr ?? "";
      const timedOut = e.killed === true || e.signal === "SIGTERM";
      // execFile sets `code` to the exit code (number) or a string errno
      // (e.g. "ETIMEDOUT") — normalise to a number.
      const exitCode = typeof e.code === "number" ? e.code : timedOut ? 124 : 1;
      const output = (so + se || e.message || "unknown error").trim();
      return {
        exitCode,
        stdout: so,
        stderr: se,
        output,
        timedOut,
        durationMs: Date.now() - started,
      };
    }
  }

  async readFile(relPath: string): Promise<string | null> {
    try {
      return await fs.readFile(this.resolveInside(relPath), "utf-8");
    } catch {
      return null;
    }
  }

  async writeFile(relPath: string, content: string): Promise<void> {
    const abs = this.resolveInside(relPath);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, content, "utf-8");
  }

  async listFiles(dir = "."): Promise<string[]> {
    const rootAbs = this.resolveInside(dir);
    const out: string[] = [];
    const walk = async (abs: string): Promise<void> => {
      if (out.length >= LIST_MAX_FILES) return;
      let entries: { name: string; isDirectory(): boolean; isFile(): boolean }[];
      try {
        entries = await fs.readdir(abs, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (out.length >= LIST_MAX_FILES) return;
        if (entry.isDirectory()) {
          if (LIST_EXCLUDE_DIRS.has(entry.name)) continue;
          await walk(path.join(abs, entry.name));
        } else if (entry.isFile()) {
          out.push(path.relative(this.workspaceDir, path.join(abs, entry.name)));
        }
      }
    };
    await walk(rootAbs);
    return out.sort();
  }
}
