import { NextRequest } from "next/server";
import { spawn, type ChildProcess } from "child_process";
import path from "path";
import fs from "fs/promises";
import { resolveCodeOutputRoot } from "@/lib/pipeline/code-output";
import { ensureConsoleBridgeInjected } from "@/lib/preview/console-bridge";
import {
  readKickoffInfraMetadata,
  databaseUrlFrom,
  redisUrlFrom,
} from "@/lib/pipeline/kickoff-infra";

type LogStream = "stdout" | "stderr" | "system";
type ProcessSource = "frontend" | "backend" | "system";
type ProcessStatus = "stopped" | "starting" | "running" | "error";

interface ServerLogLine {
  ts: number;
  stream: LogStream;
  text: string;
  source: ProcessSource;
}

interface ProcStateEntry {
  proc: ChildProcess | null;
  status: ProcessStatus;
  port: number | null;
}

const procState: Record<"frontend" | "backend", ProcStateEntry> = {
  frontend: { proc: null, status: "stopped", port: null },
  backend: { proc: null, status: "stopped", port: null },
};

let serverLogs: ServerLogLine[] = [];
const MAX_LOG_LINES = 1000;

// Strips ANSI / VT100 escape sequences that Vite, tsx and pnpm emit for colour
// and cursor control. Without this the UI shows literal "\x1b[36mready\x1b[0m"
// noise that drowns the actual message (esp. the file paths in error stacks).
// eslint-disable-next-line no-control-regex
const ANSI_RE = /\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g;

function stripAnsi(s: string): string {
  return s.replace(ANSI_RE, "");
}

function addLog(text: string, stream: LogStream, source: ProcessSource = "system") {
  if (!text) return;
  serverLogs.push({ ts: Date.now(), stream, text, source });
  if (serverLogs.length > MAX_LOG_LINES) {
    serverLogs = serverLogs.slice(-MAX_LOG_LINES);
  }
}

function createLineSink(stream: LogStream, source: ProcessSource) {
  let buffer = "";
  function flush(line: string) {
    const cleaned = stripAnsi(line).replace(/\r$/, "");
    if (cleaned.length === 0) return;
    addLog(cleaned, stream, source);
  }
  return (data: Buffer) => {
    buffer += data.toString("utf-8");
    const parts = buffer.split(/\r?\n/);
    buffer = parts.pop() ?? "";
    for (const line of parts) flush(line);
  };
}

function isFrontendReadyMarker(line: string): boolean {
  return (
    line.includes("localhost") ||
    line.includes("Local:") ||
    line.includes("ready in") ||
    line.includes("ready")
  );
}

function isBackendReadyMarker(line: string): boolean {
  // tsx/koa/fastify boot lines all include either a port banner or
  // "listening" — match generously, the timeout still backstops failures.
  return (
    /listen(?:ing)?\b/i.test(line) ||
    /server.*(?:running|started|ready)/i.test(line) ||
    /http:\/\/(?:localhost|0\.0\.0\.0|127\.0\.0\.1)/i.test(line)
  );
}

async function detectFrontendPort(outputDir: string): Promise<number> {
  const pkgPath = path.join(outputDir, "package.json");
  try {
    const raw = await fs.readFile(pkgPath, "utf-8");
    const pkg = JSON.parse(raw);
    const devScript = pkg.scripts?.dev ?? "";
    const portMatch = devScript.match(/--port\s+(\d+)/);
    if (portMatch) return parseInt(portMatch[1], 10);
  } catch { /* fall through */ }
  return 5173;
}

async function detectBackendPort(backendDir: string): Promise<number> {
  try {
    const dockerfile = await fs.readFile(
      path.join(backendDir, "Dockerfile"),
      "utf-8",
    );
    const m = dockerfile.match(/^EXPOSE\s+(\d+)/m);
    if (m) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n) && n > 0 && n < 65536) return n;
    }
  } catch { /* fall through */ }
  return 3001;
}

async function detectPackageManager(outputDir: string): Promise<string> {
  try {
    await fs.access(path.join(outputDir, "pnpm-lock.yaml"));
    return "pnpm";
  } catch { /* fall through */ }
  try {
    await fs.access(path.join(outputDir, "yarn.lock"));
    return "yarn";
  } catch { /* fall through */ }
  return "npm";
}

const FRONTEND_SUBDIR_CANDIDATES = ["frontend", "apps/web", "apps/frontend", "web", "app", "client"];

async function pathHasPackageJson(p: string): Promise<boolean> {
  return fs.access(path.join(p, "package.json")).then(() => true).catch(() => false);
}

async function resolveFrontendDir(outputRoot: string): Promise<string | null> {
  if (await pathHasPackageJson(outputRoot)) return outputRoot;
  for (const sub of FRONTEND_SUBDIR_CANDIDATES) {
    const candidate = path.join(outputRoot, sub);
    if (await pathHasPackageJson(candidate)) return candidate;
  }
  return null;
}

async function resolveBackendDir(outputRoot: string): Promise<string | null> {
  const backendDir = path.join(outputRoot, "backend");
  if (await pathHasPackageJson(backendDir)) return backendDir;
  return null;
}

async function ensureDependencies(dir: string, source: ProcessSource): Promise<void> {
  const hasNodeModules = await fs
    .access(path.join(dir, "node_modules"))
    .then(() => true)
    .catch(() => false);
  if (hasNodeModules) return;
  const pm = await detectPackageManager(dir);
  addLog(`[${source}] Installing dependencies with ${pm}...`, "system", source);
  await new Promise<void>((resolve, reject) => {
    const install = spawn(pm, ["install"], { cwd: dir, shell: true });
    install.stdout?.on("data", createLineSink("stdout", source));
    install.stderr?.on("data", createLineSink("stderr", source));
    install.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${pm} install in ${dir} failed with code ${code}`));
    });
    install.on("error", reject);
  });
}

async function hasSeedScript(backendDir: string): Promise<boolean> {
  try {
    const raw = await fs.readFile(path.join(backendDir, "package.json"), "utf-8");
    const pkg = JSON.parse(raw);
    const scripts = pkg.scripts ?? {};
    return typeof scripts["seed:all"] === "string" || typeof scripts.seed === "string";
  } catch {
    return false;
  }
}

/**
 * Run the backend's seed script once, after the server is up (so migrations
 * have already created the tables — the scaffold awaits initDb()+syncModels()
 * before listening). Best-effort: a failed seed never blocks the preview.
 * Prefers `seed:all` (auth users + business data) and falls back to `seed`.
 * The generated seed scripts are idempotent (upsert), so re-running on every
 * Start is safe.
 */
async function runSeed(backendDir: string, env: NodeJS.ProcessEnv): Promise<void> {
  const raw = await fs.readFile(path.join(backendDir, "package.json"), "utf-8").catch(() => "");
  let scriptName: "seed:all" | "seed" | null = null;
  try {
    const scripts = JSON.parse(raw).scripts ?? {};
    if (typeof scripts["seed:all"] === "string") scriptName = "seed:all";
    else if (typeof scripts.seed === "string") scriptName = "seed";
  } catch { /* no scripts */ }
  if (!scriptName) return;

  const pm = await detectPackageManager(backendDir);
  addLog(`[backend] Seeding database (${pm} run ${scriptName})...`, "system", "backend");
  await new Promise<void>((resolve) => {
    const seed = spawn(pm, ["run", scriptName], { cwd: backendDir, shell: true, env });
    seed.stdout?.on("data", createLineSink("stdout", "backend"));
    seed.stderr?.on("data", createLineSink("stderr", "backend"));
    seed.on("close", (code) => {
      addLog(
        code === 0
          ? "[backend] Seed completed."
          : `[backend] Seed exited with code ${code} (non-fatal — preview continues).`,
        "system",
        "backend",
      );
      resolve();
    });
    seed.on("error", (err) => {
      addLog(`[backend] Seed failed to spawn (non-fatal): ${err.message}`, "system", "backend");
      resolve();
    });
  });
}

/**
 * Read DATABASE_URL / REDIS_URL from `.blueprint/kickoff-infra.json` using
 * **publicUrl** (host:port reachable from the developer's machine) — internal
 * Dokploy DNS like `app-pg:5432` isn't resolvable from outside the
 * `dokploy-network`, so the dev process would otherwise fail to connect.
 */
async function readKickoffInfraEnv(): Promise<Record<string, string>> {
  const meta = await readKickoffInfraMetadata(process.cwd()).catch(() => null);
  const out: Record<string, string> = {};
  const db = databaseUrlFrom(meta);
  if (db) out.DATABASE_URL = db;
  const redis = redisUrlFrom(meta);
  if (redis) out.REDIS_URL = redis;
  return out;
}

async function startFrontend(appDir: string): Promise<{ port: number }> {
  if (procState.frontend.proc) throw new Error("Frontend is already running");
  await ensureDependencies(appDir, "frontend");
  const pm = await detectPackageManager(appDir);
  const port = await detectFrontendPort(appDir);
  procState.frontend.port = port;
  procState.frontend.status = "starting";
  addLog(`[frontend] Starting dev server in ${appDir} on port ${port}...`, "system", "frontend");

  const child = spawn(pm, ["run", "dev", "--", "--port", String(port), "--host"], {
    cwd: appDir,
    shell: true,
    env: { ...process.env, PORT: String(port), BROWSER: "none" },
  });
  procState.frontend.proc = child;

  function watchForReady(line: string) {
    if (procState.frontend.status === "starting" && isFrontendReadyMarker(line)) {
      procState.frontend.status = "running";
      addLog(`[frontend] Dev server ready at http://localhost:${port}`, "system", "frontend");
    }
  }
  const onStdout = createLineSink("stdout", "frontend");
  const onStderr = createLineSink("stderr", "frontend");
  child.stdout?.on("data", (d: Buffer) => {
    const before = serverLogs.length;
    onStdout(d);
    for (let i = before; i < serverLogs.length; i++) watchForReady(serverLogs[i].text);
  });
  child.stderr?.on("data", (d: Buffer) => {
    const before = serverLogs.length;
    onStderr(d);
    for (let i = before; i < serverLogs.length; i++) watchForReady(serverLogs[i].text);
  });
  child.on("close", (code) => {
    addLog(`[frontend] Dev server exited with code ${code}`, "system", "frontend");
    procState.frontend.proc = null;
    procState.frontend.status = "stopped";
  });
  child.on("error", (err) => {
    addLog(`[frontend] Error: ${err.message}`, "system", "frontend");
    procState.frontend.status = "error";
    procState.frontend.proc = null;
  });

  await waitForReady("frontend", 30000);
  return { port };
}

async function startBackend(
  backendDir: string,
  frontendPort: number | null,
): Promise<{ port: number; env: NodeJS.ProcessEnv }> {
  if (procState.backend.proc) throw new Error("Backend is already running");
  await ensureDependencies(backendDir, "backend");
  const pm = await detectPackageManager(backendDir);
  const port = await detectBackendPort(backendDir);
  procState.backend.port = port;
  procState.backend.status = "starting";

  const infraEnv = await readKickoffInfraEnv();
  if (!infraEnv.DATABASE_URL) {
    addLog(
      "[backend] WARNING: no DATABASE_URL in .blueprint/kickoff-infra.json — backend may fail to start. Run kickoff with DOKPLOY_URL + DOKPLOY_TOKEN to provision per-app Postgres/Redis.",
      "system",
      "backend",
    );
  } else {
    addLog(
      `[backend] Using DATABASE_URL from kickoff-infra (public host).`,
      "system",
      "backend",
    );
  }
  if (infraEnv.REDIS_URL) {
    addLog("[backend] Using REDIS_URL from kickoff-infra.", "system", "backend");
  }
  addLog(`[backend] Starting in ${backendDir} on port ${port}...`, "system", "backend");

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: "development",
    PORT: String(port),
    BROWSER: "none",
    ...infraEnv,
  };
  if (frontendPort != null) {
    env.FRONTEND_URL = `http://localhost:${frontendPort}`;
  }

  const child = spawn(pm, ["run", "dev"], {
    cwd: backendDir,
    shell: true,
    env,
  });
  procState.backend.proc = child;

  function watchForReady(line: string) {
    if (procState.backend.status === "starting" && isBackendReadyMarker(line)) {
      procState.backend.status = "running";
      addLog(`[backend] Server ready on port ${port}`, "system", "backend");
    }
  }
  const onStdout = createLineSink("stdout", "backend");
  const onStderr = createLineSink("stderr", "backend");
  child.stdout?.on("data", (d: Buffer) => {
    const before = serverLogs.length;
    onStdout(d);
    for (let i = before; i < serverLogs.length; i++) watchForReady(serverLogs[i].text);
  });
  child.stderr?.on("data", (d: Buffer) => {
    const before = serverLogs.length;
    onStderr(d);
    for (let i = before; i < serverLogs.length; i++) watchForReady(serverLogs[i].text);
  });
  child.on("close", (code) => {
    addLog(`[backend] Server exited with code ${code}`, "system", "backend");
    procState.backend.proc = null;
    procState.backend.status = "stopped";
  });
  child.on("error", (err) => {
    addLog(`[backend] Error: ${err.message}`, "system", "backend");
    procState.backend.status = "error";
    procState.backend.proc = null;
  });

  await waitForReady("backend", 30000);
  return { port, env };
}

async function waitForReady(
  source: "frontend" | "backend",
  timeoutMs: number,
): Promise<void> {
  await new Promise<void>((resolve) => {
    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += 500;
      const state = procState[source];
      if (state.status === "running" || elapsed > timeoutMs) {
        clearInterval(interval);
        if (state.status !== "running") {
          state.status = "running";
          addLog(`[${source}] Assuming ready (timeout).`, "system", source);
        }
        resolve();
      }
    }, 500);
  });
}

function stopOne(source: "frontend" | "backend") {
  const state = procState[source];
  if (state.proc) {
    addLog(`[${source}] Stopping...`, "system", source);
    state.proc.kill("SIGTERM");
    const proc = state.proc;
    setTimeout(() => {
      if (proc && !proc.killed) proc.kill("SIGKILL");
    }, 5000);
    state.proc = null;
    state.status = "stopped";
    state.port = null;
  }
}

function stopAll() {
  stopOne("backend");
  stopOne("frontend");
}

function snapshot() {
  const fe = procState.frontend;
  const be = procState.backend;
  return {
    // Backward-compat top-level fields = frontend (iframe consumer reads these).
    status: fe.status,
    port: fe.port,
    url: fe.port ? `http://localhost:${fe.port}` : null,
    backend: {
      status: be.status,
      port: be.port,
      url: be.port ? `http://localhost:${be.port}` : null,
    },
    logs: serverLogs,
  };
}

export async function GET() {
  return Response.json(snapshot());
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, codeOutputDir } = body as { action: string; codeOutputDir?: string };

  if (action === "stop") {
    stopAll();
    return Response.json(snapshot());
  }

  if (action !== "start" && action !== "restart") {
    return Response.json({ error: "Invalid action. Use start, stop, or restart." }, { status: 400 });
  }

  // start / restart share the bring-up path; restart pre-clears + kills.
  if (action === "restart") {
    stopAll();
    serverLogs = [];
  } else {
    // Plain start: if anything's already up, return current state.
    const anyAlive =
      procState.frontend.status === "running" ||
      procState.frontend.status === "starting" ||
      procState.backend.status === "running" ||
      procState.backend.status === "starting";
    if (anyAlive) return Response.json(snapshot());
    serverLogs = [];
  }

  const outputRoot = resolveCodeOutputRoot(process.cwd(), codeOutputDir);
  const frontendDir = await resolveFrontendDir(outputRoot);
  if (!frontendDir) {
    const message = `No package.json found in ${outputRoot} (also checked ${FRONTEND_SUBDIR_CANDIDATES.join(", ")})`;
    procState.frontend.status = "error";
    addLog(`[frontend] ${message}`, "system", "frontend");
    return Response.json({ error: message, ...snapshot() }, { status: 400 });
  }
  if (frontendDir !== outputRoot) {
    addLog(`[frontend] Using app directory ${path.relative(outputRoot, frontendDir) || "."}`, "system", "frontend");
  }
  try {
    const injected = await ensureConsoleBridgeInjected(frontendDir);
    if (injected) addLog(`[frontend] Injected console bridge into index.html`, "system", "frontend");
  } catch (err) {
    addLog(`[frontend] Console bridge injection failed (non-fatal): ${err instanceof Error ? err.message : err}`, "system", "frontend");
  }

  // Backend is optional — only present in M/L tier scaffolds.
  const backendDir = await resolveBackendDir(outputRoot);

  try {
    // Start backend first so the frontend's API requests have somewhere to
    // land. Failures here are not fatal — we still bring the frontend up so
    // the user sees *something* and can read backend logs to triage.
    let backendPort: number | null = null;
    let backendEnv: NodeJS.ProcessEnv | null = null;
    if (backendDir) {
      try {
        const r = await startBackend(backendDir, null);
        backendPort = r.port;
        backendEnv = r.env;
      } catch (err) {
        procState.backend.status = "error";
        addLog(
          `[backend] Start failed (continuing with frontend-only): ${err instanceof Error ? err.message : err}`,
          "system",
          "backend",
        );
      }
    } else {
      addLog("[backend] No backend/ directory — skipping (frontend-only project).", "system", "backend");
    }

    // Auto-seed once the backend is up (tables exist — server awaits
    // initDb()+syncModels() before listening). Idempotent upsert, so safe on
    // every Start. Disable with PREVIEW_AUTO_SEED=0.
    if (
      backendDir &&
      backendEnv &&
      procState.backend.status === "running" &&
      process.env.PREVIEW_AUTO_SEED !== "0" &&
      (await hasSeedScript(backendDir))
    ) {
      await runSeed(backendDir, backendEnv);
    }

    const { port } = await startFrontend(frontendDir);
    // Best-effort: now that frontend has a port, surface FRONTEND_URL to the
    // backend if it was already started. tsx watch picks up env via
    // EventEmitter env changes? No — env is fixed at spawn. We can only log
    // it for the user to copy if they need CORS today.
    if (backendPort != null) {
      addLog(`[backend] (info) FRONTEND_URL=http://localhost:${port}`, "system", "backend");
    }
    return Response.json(snapshot());
  } catch (err) {
    procState.frontend.status = "error";
    const message = err instanceof Error ? err.message : "Failed to start";
    addLog(`[frontend] ${message}`, "system", "frontend");
    return Response.json({ error: message, ...snapshot() }, { status: 500 });
  }
}
