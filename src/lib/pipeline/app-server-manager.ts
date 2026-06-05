/**
 * App Server Manager
 *
 * Manages frontend + backend dev server processes for the generated project.
 * Module-level state survives across API requests within the same Next.js process.
 */

import { spawn, type ChildProcess } from "child_process";
import fs from "fs/promises";
import path from "path";
import treeKill from "tree-kill";

export type AppServerStatus = "stopped" | "starting" | "running" | "error";

interface ManagedProcess {
  child: ChildProcess;
  label: string;
}

interface AppServerState {
  processes: ManagedProcess[];
  status: AppServerStatus;
  outputDir: string | null;
  port: number;
  logs: string[];
  error: string | null;
}

// Store on `global` so Next.js hot-module-reload doesn't wipe the process references
declare global {
  // eslint-disable-next-line no-var
  var __appServerState: AppServerState | undefined;
}

if (!global.__appServerState) {
  global.__appServerState = {
    processes: [],
    status: "stopped",
    outputDir: null,
    port: 5173,
    logs: [],
    error: null,
  };
}

const state = global.__appServerState;

const MAX_LOGS = 300;
const READY_PATTERNS = [/localhost:\d+/, /ready in/, /Local:/, /➜/, /listening on/i, /server.*running/i];
const READY_TIMEOUT_MS = 90_000;
const POLL_INTERVAL_MS = 1_000;

function addLog(line: string) {
  state.logs.push(line);
  if (state.logs.length > MAX_LOGS) state.logs.shift();
}

async function pkgHasDevScript(dir: string): Promise<boolean> {
  try {
    const pkg = JSON.parse(await fs.readFile(path.join(dir, "package.json"), "utf-8")) as { scripts?: Record<string, string> };
    return !!(pkg.scripts?.dev || pkg.scripts?.start);
  } catch { return false; }
}

async function detectCmd(dir: string): Promise<{ cmd: string; args: string[] }> {
  const hasPnpm = await fs.access(path.join(dir, "pnpm-lock.yaml")).then(() => true).catch(() => false);
  const hasYarn = await fs.access(path.join(dir, "yarn.lock")).then(() => true).catch(() => false);
  if (hasPnpm) return { cmd: "pnpm", args: ["run", "dev"] };
  if (hasYarn) return { cmd: "yarn", args: ["dev"] };
  return { cmd: "npm", args: ["run", "dev"] };
}

/** Returns all launchable subdirectories: root (if has dev script), then frontend/, backend/, etc. */
async function findLaunchDirs(rootDir: string): Promise<{ dir: string; label: string }[]> {
  const results: { dir: string; label: string }[] = [];

  // Root itself
  if (await pkgHasDevScript(rootDir)) {
    results.push({ dir: rootDir, label: "app" });
    return results; // root is a single-app project
  }

  // Scan known subdirectory names
  const candidates = [
    { sub: "frontend", label: "frontend" },
    { sub: "client",   label: "frontend" },
    { sub: "web",      label: "frontend" },
    { sub: "backend",  label: "backend"  },
    { sub: "server",   label: "backend"  },
    { sub: "api",      label: "backend"  },
  ];

  for (const { sub, label } of candidates) {
    const dir = path.join(rootDir, sub);
    if (await pkgHasDevScript(dir)) results.push({ dir, label });
  }

  if (results.length === 0) {
    throw new Error(`No runnable package.json found in ${rootDir} or its subdirectories`);
  }
  return results;
}

function spawnProcess(
  dir: string,
  label: string,
  env: NodeJS.ProcessEnv,
  onLog: (line: string) => void,
): ChildProcess {
  const child = spawn("npm", ["run", "dev"], {
    cwd: dir,
    env,
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });

  const handle = (chunk: Buffer) => {
    for (const line of chunk.toString().split(/\r?\n/).filter(Boolean)) {
      const tagged = `[${label}] ${line}`;
      addLog(tagged);
      onLog(tagged);
      if (state.status === "starting" && READY_PATTERNS.some((p) => p.test(line))) {
        state.status = "running";
      }
    }
  };

  child.stdout?.on("data", handle);
  child.stderr?.on("data", handle);
  child.on("exit", (code) => {
    const msg = `[${label}] process exited (code ${code ?? "?"})`;
    addLog(msg);
    onLog(msg);
    state.processes = state.processes.filter((p) => p.child !== child);
    if (state.processes.length === 0 && state.status !== "stopped") {
      state.status = code === 0 ? "stopped" : "error";
      state.error = code !== 0 ? `${label} exited with code ${code}` : null;
    }
  });

  return child;
}

async function waitForPort(port: number, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://localhost:${port}`, { signal: AbortSignal.timeout(2000) });
      if (res.status < 600) return true;
    } catch { /* not ready */ }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  return false;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getAppServerStatus() {
  return {
    status: state.status,
    outputDir: state.outputDir,
    port: state.port,
    processCount: state.processes.length,
    logs: [...state.logs],
    error: state.error,
  };
}

export async function startAppServer(
  outputDir: string,
  port = 5173,
  onLog?: (line: string) => void,
): Promise<void> {
  if (state.status === "running" || state.status === "starting") {
    throw new Error(`App server already ${state.status}`);
  }

  state.status = "starting";
  state.outputDir = outputDir;
  state.port = port;
  state.logs = [];
  state.error = null;
  state.processes = [];

  const dirs = await findLaunchDirs(outputDir);
  const log = (line: string) => onLog?.(line);

  for (const { dir, label } of dirs) {
    const { cmd: _cmd, args: _args } = await detectCmd(dir);
    addLog(`[app-server] Starting ${label} in ${dir}`);
    log(`[app-server] Starting ${label} in ${dir}`);

    const env: NodeJS.ProcessEnv = {
      ...process.env,
      ...(label === "frontend" ? { PORT: String(port), VITE_PORT: String(port) } : {}),
    };

    const child = spawnProcess(dir, label, env, log);
    state.processes.push({ child, label });
  }

  // Wait for frontend to respond (health check)
  const ready = await waitForPort(port, READY_TIMEOUT_MS);
  if (ready && state.status === "starting") state.status = "running";
  if (!ready && state.status === "starting") {
    state.status = "error";
    state.error = `Frontend did not respond on port ${port} within ${READY_TIMEOUT_MS / 1000}s`;
  }
}

const GRACEFUL_SHUTDOWN_MS = 3_000;

/** Kill a process group (detached children are group leaders) with treeKill fallback. */
function killProcess(pid: number, signal: NodeJS.Signals): void {
  try {
    // Negative PID targets the whole process group — reliably catches grandchildren
    // (npm → node) spawned by `npm run dev`, even after reparenting.
    process.kill(-pid, signal);
  } catch {
    // Group kill can fail if the leader already exited; fall back to tree walk.
    treeKill(pid, signal, () => {});
  }
}

/** True while a PID is still live (its exit handler has not yet fired). */
function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0); // signal 0 only probes existence, sends nothing
    return true;
  } catch {
    return false;
  }
}

export async function stopAppServer(): Promise<void> {
  if (state.processes.length === 0) {
    state.status = "stopped";
    return;
  }

  const pids = state.processes
    .map(({ child, label }) => {
      addLog(`[app-server] Stopping ${label}…`);
      return child.pid;
    })
    .filter((pid): pid is number => typeof pid === "number");

  // 1. Ask politely.
  for (const pid of pids) killProcess(pid, "SIGTERM");

  // 2. Wait for graceful exit; each process's `exit` handler drains state.processes.
  const deadline = Date.now() + GRACEFUL_SHUTDOWN_MS;
  while (Date.now() < deadline && pids.some(isAlive)) {
    await new Promise((r) => setTimeout(r, 200));
  }

  // 3. Force-kill survivors — do NOT trust SIGTERM to have "succeeded".
  for (const pid of pids) {
    if (isAlive(pid)) {
      addLog(`[app-server] Force-killing pid ${pid} (SIGKILL)`);
      killProcess(pid, "SIGKILL");
    }
  }

  state.processes = [];
  state.status = "stopped";
  state.error = null;
}

export async function checkAppHealth(baseUrl: string): Promise<boolean> {
  try {
    const res = await fetch(baseUrl, { signal: AbortSignal.timeout(3000) });
    return res.status < 600;
  } catch { return false; }
}
