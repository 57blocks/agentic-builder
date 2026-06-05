/**
 * ContainerBuildExecutor — run the agentic-build channel inside an isolated
 * docker container, behind the exact same `BuildExecutor` interface the local
 * executor implements, so the orchestrator/agent/acceptance code is unchanged.
 *
 * Design:
 *   - The workspace dir is BIND-MOUNTED into the container at /workspace, so the
 *     files are literally the same bytes on host and in the container. That lets
 *     us serve read/write/list from the HOST fs (fast, no docker round-trips)
 *     and only route `run` through `docker exec`.
 *   - `run(cmd)` → `docker exec <container> bash -lc "<cmd>"` with a timeout.
 *   - Optionally mounts the host docker socket so the agent can drive
 *     `docker compose` (sibling-container pattern). NOTE: with socket sharing,
 *     compose bind mounts resolve against HOST paths — fine for single-host PoC.
 *
 * Lifecycle is explicit: `start()` before a run, `stop()` after (the API route
 * owns this). The docker invocation is injectable for hermetic unit tests.
 */

import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { LocalBuildExecutor, isUnsafeCommand } from "../executor";
import type { BuildExecutor, CommandResult, RunOptions } from "../executor";

const execFileAsync = promisify(execFile);

export interface DockerExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

/** Runs the host `docker` CLI with the given args. Injectable for tests. */
export type DockerRunner = (
  args: string[],
  opts: { timeoutMs: number; maxBuffer: number },
) => Promise<DockerExecResult>;

const defaultDockerRunner: DockerRunner = async (args, opts) => {
  try {
    const { stdout, stderr } = await execFileAsync("docker", args, {
      timeout: opts.timeoutMs,
      maxBuffer: opts.maxBuffer,
      env: { ...process.env, FORCE_COLOR: "0" },
    });
    return { exitCode: 0, stdout: stdout ?? "", stderr: stderr ?? "", timedOut: false };
  } catch (err: unknown) {
    const e = err as {
      code?: number | string;
      killed?: boolean;
      signal?: string;
      stdout?: string;
      stderr?: string;
      message?: string;
    };
    const timedOut = e.killed === true || e.signal === "SIGTERM";
    const exitCode = typeof e.code === "number" ? e.code : timedOut ? 124 : 1;
    return {
      exitCode,
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? e.message ?? "",
      timedOut,
    };
  }
};

export interface ContainerExecutorOptions {
  workspaceDir: string;
  /** Image with the toolchain the plan needs (or that the agent can apt/pip
   *  into). Default is a general Debian+build image. */
  image?: string;
  /** Container name; defaults to a unique per-run name. */
  containerName?: string;
  /** Share the host docker socket so the agent can run `docker compose`. */
  mountDockerSocket?: boolean;
  /** Default per-command timeout (ms). */
  defaultTimeoutMs?: number;
  /** Test seam. */
  dockerRunner?: DockerRunner;
}

const DEFAULT_IMAGE = process.env.AGENTIC_BUILD_CONTAINER_IMAGE || "debian:bookworm-slim";
const DEFAULT_TIMEOUT_MS = 600_000; // builds/installs can be slow
const MAX_BUFFER = 10 * 1024 * 1024;
const WORKDIR = "/workspace";

export class ContainerBuildExecutor implements BuildExecutor {
  readonly workspaceDir: string;
  private readonly image: string;
  private readonly name: string;
  private readonly mountDockerSocket: boolean;
  private readonly defaultTimeoutMs: number;
  private readonly docker: DockerRunner;
  /** File ops delegate to the host fs (same bytes via bind mount). */
  private readonly host: LocalBuildExecutor;
  private started = false;

  constructor(opts: ContainerExecutorOptions) {
    this.workspaceDir = path.resolve(opts.workspaceDir);
    this.image = opts.image ?? DEFAULT_IMAGE;
    this.name =
      opts.containerName ??
      `agentic-build-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    this.mountDockerSocket = opts.mountDockerSocket ?? true;
    this.defaultTimeoutMs = opts.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.docker = opts.dockerRunner ?? defaultDockerRunner;
    this.host = new LocalBuildExecutor(this.workspaceDir);
  }

  get containerName(): string {
    return this.name;
  }

  /** Start a long-lived container with the workspace bind-mounted. */
  async start(): Promise<void> {
    if (this.started) return;
    const args = [
      "run",
      "-d",
      "--name",
      this.name,
      "-v",
      `${this.workspaceDir}:${WORKDIR}`,
      "-w",
      WORKDIR,
    ];
    if (this.mountDockerSocket) {
      args.push("-v", "/var/run/docker.sock:/var/run/docker.sock");
    }
    args.push(this.image, "sleep", "infinity");
    const res = await this.docker(args, { timeoutMs: 120_000, maxBuffer: MAX_BUFFER });
    if (res.exitCode !== 0) {
      throw new Error(
        `Failed to start sandbox container (image=${this.image}): ${res.stderr || res.stdout}`,
      );
    }
    this.started = true;
  }

  /** Remove the container (force). Safe to call multiple times. */
  async stop(): Promise<void> {
    if (!this.started) return;
    this.started = false;
    await this.docker(["rm", "-f", this.name], {
      timeoutMs: 30_000,
      maxBuffer: MAX_BUFFER,
    }).catch(() => undefined);
  }

  async run(command: string, opts: RunOptions = {}): Promise<CommandResult> {
    const started = Date.now();
    if (isUnsafeCommand(command)) {
      const msg = `command rejected — unsafe pattern: ${command.slice(0, 100)}`;
      return { exitCode: 126, stdout: "", stderr: msg, output: msg, timedOut: false, durationMs: Date.now() - started };
    }
    if (!this.started) {
      throw new Error("ContainerBuildExecutor.run() called before start()");
    }
    const envArgs: string[] = [];
    for (const [k, v] of Object.entries(opts.env ?? {})) {
      envArgs.push("-e", `${k}=${v}`);
    }
    const args = ["exec", ...envArgs, this.name, "bash", "-lc", command];
    const res = await this.docker(args, {
      timeoutMs: opts.timeoutMs ?? this.defaultTimeoutMs,
      maxBuffer: opts.maxBuffer ?? MAX_BUFFER,
    });
    const output = ((res.stdout ?? "") + (res.stderr ?? "")).trim();
    return {
      exitCode: res.exitCode,
      stdout: res.stdout ?? "",
      stderr: res.stderr ?? "",
      output,
      timedOut: res.timedOut,
      durationMs: Date.now() - started,
    };
  }

  // File ops: same bytes via the bind mount → serve from the host fs.
  readFile(relPath: string): Promise<string | null> {
    return this.host.readFile(relPath);
  }
  writeFile(relPath: string, content: string): Promise<void> {
    return this.host.writeFile(relPath, content);
  }
  listFiles(dir?: string): Promise<string[]> {
    return this.host.listFiles(dir);
  }
}
