import { NextRequest } from "next/server";
import { spawn, type ChildProcess } from "child_process";
import path from "path";
import fs from "fs/promises";
import { resolveCodeOutputRoot } from "@/lib/pipeline/code-output";
import { ensureConsoleBridgeInjected } from "@/lib/preview/console-bridge";

type LogStream = "stdout" | "stderr" | "system";

interface ServerLogLine {
  ts: number;
  stream: LogStream;
  text: string;
}

let serverProcess: ChildProcess | null = null;
let serverPort: number | null = null;
let serverStatus: "stopped" | "starting" | "running" | "error" = "stopped";
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

function addLog(text: string, stream: LogStream = "system") {
  if (!text) return;
  serverLogs.push({ ts: Date.now(), stream, text });
  if (serverLogs.length > MAX_LOG_LINES) {
    serverLogs = serverLogs.slice(-MAX_LOG_LINES);
  }
}

/**
 * Returns a stateful line-splitter for a child process stream. Node emits
 * arbitrary byte chunks (often mid-line), so we buffer and only flush on
 * newline boundaries — otherwise Vite's multi-line error reports collapse
 * into a single row and the `file:line:col` reference disappears.
 */
function createLineSink(stream: LogStream) {
  let buffer = "";
  function flush(line: string) {
    const cleaned = stripAnsi(line).replace(/\r$/, "");
    // Preserve fully blank separator lines — Vite uses them between an error
    // banner and its source frame. Only drop trailing CR / pure whitespace.
    if (cleaned.length === 0) return;
    addLog(cleaned, stream);
  }
  return (data: Buffer) => {
    buffer += data.toString("utf-8");
    const parts = buffer.split(/\r?\n/);
    buffer = parts.pop() ?? "";
    for (const line of parts) flush(line);
  };
}

function isReadyMarker(line: string): boolean {
  return (
    line.includes("localhost") ||
    line.includes("Local:") ||
    line.includes("ready in") ||
    line.includes("ready")
  );
}

async function detectPort(outputDir: string): Promise<number> {
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

async function resolveAppDir(outputRoot: string): Promise<string | null> {
  if (await fs.access(path.join(outputRoot, "package.json")).then(() => true).catch(() => false)) {
    return outputRoot;
  }
  for (const sub of FRONTEND_SUBDIR_CANDIDATES) {
    const candidate = path.join(outputRoot, sub);
    if (await fs.access(path.join(candidate, "package.json")).then(() => true).catch(() => false)) {
      return candidate;
    }
  }
  return null;
}

async function startServer(outputDir: string): Promise<{ port: number }> {
  if (serverProcess) {
    throw new Error("Server is already running");
  }

  const hasNodeModules = await fs.access(path.join(outputDir, "node_modules")).then(() => true).catch(() => false);
  const pm = await detectPackageManager(outputDir);

  if (!hasNodeModules) {
    addLog(`[preview] Installing dependencies with ${pm}...`);
    serverStatus = "starting";
    await new Promise<void>((resolve, reject) => {
      const install = spawn(pm, ["install"], { cwd: outputDir, shell: true });
      const onStdout = createLineSink("stdout");
      const onStderr = createLineSink("stderr");
      install.stdout?.on("data", onStdout);
      install.stderr?.on("data", onStderr);
      install.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`${pm} install failed with code ${code}`));
      });
      install.on("error", reject);
    });
  }

  const port = await detectPort(outputDir);
  serverPort = port;
  serverStatus = "starting";
  addLog(`[preview] Starting dev server in ${outputDir} on port ${port}...`);

  const child = spawn(pm, ["run", "dev", "--", "--port", String(port), "--host"], {
    cwd: outputDir,
    shell: true,
    env: { ...process.env, PORT: String(port), BROWSER: "none" },
  });

  serverProcess = child;

  // Capture the index of the latest entry every sink emits so we can sniff
  // the ready marker against the line that was just appended (rather than
  // matching against an unbounded chunk).
  function watchForReady(line: string) {
    if (serverStatus === "starting" && isReadyMarker(line)) {
      serverStatus = "running";
      addLog(`[preview] Dev server is ready at http://localhost:${port}`);
    }
  }

  const onStdout = createLineSink("stdout");
  const onStderr = createLineSink("stderr");
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
    addLog(`[preview] Dev server exited with code ${code}`);
    serverProcess = null;
    serverStatus = "stopped";
  });

  child.on("error", (err) => {
    addLog(`[preview] Error: ${err.message}`);
    serverStatus = "error";
    serverProcess = null;
  });

  await new Promise<void>((resolve) => {
    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += 500;
      if (serverStatus === "running" || elapsed > 30000) {
        clearInterval(interval);
        if (serverStatus !== "running") {
          serverStatus = "running";
          addLog(`[preview] Assuming server is ready (timeout).`);
        }
        resolve();
      }
    }, 500);
  });

  return { port };
}

function stopServer() {
  if (serverProcess) {
    addLog("[preview] Stopping dev server...");
    serverProcess.kill("SIGTERM");
    setTimeout(() => {
      if (serverProcess) {
        serverProcess.kill("SIGKILL");
      }
    }, 5000);
    serverProcess = null;
    serverStatus = "stopped";
    serverPort = null;
  }
}

export async function GET() {
  return Response.json({
    status: serverStatus,
    port: serverPort,
    url: serverPort ? `http://localhost:${serverPort}` : null,
    logs: serverLogs,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, codeOutputDir } = body as { action: string; codeOutputDir?: string };

  if (action === "start") {
    if (serverStatus === "running" || serverStatus === "starting") {
      return Response.json({ status: serverStatus, port: serverPort, url: `http://localhost:${serverPort}` });
    }

    serverLogs = [];
    const outputRoot = resolveCodeOutputRoot(process.cwd(), codeOutputDir);
    const appDir = await resolveAppDir(outputRoot);
    if (!appDir) {
      const message = `No package.json found in ${outputRoot} (also checked ${FRONTEND_SUBDIR_CANDIDATES.join(", ")})`;
      serverStatus = "error";
      addLog(`[preview] ${message}`);
      return Response.json({ error: message, status: "error", logs: serverLogs }, { status: 400 });
    }
    if (appDir !== outputRoot) {
      addLog(`[preview] Using app directory ${path.relative(outputRoot, appDir) || "."}`);
    }
    try {
      const injected = await ensureConsoleBridgeInjected(appDir);
      if (injected) addLog(`[preview] Injected console bridge into index.html`);
    } catch (err) {
      addLog(`[preview] Console bridge injection failed (non-fatal): ${err instanceof Error ? err.message : err}`);
    }

    try {
      const { port } = await startServer(appDir);
      return Response.json({ status: serverStatus, port, url: `http://localhost:${port}` });
    } catch (err) {
      serverStatus = "error";
      const message = err instanceof Error ? err.message : "Failed to start";
      addLog(`[preview] ${message}`);
      return Response.json({ error: message, status: "error", logs: serverLogs }, { status: 500 });
    }
  }

  if (action === "stop") {
    stopServer();
    return Response.json({ status: "stopped" });
  }

  if (action === "restart") {
    stopServer();
    serverLogs = [];
    const outputRoot = resolveCodeOutputRoot(process.cwd(), codeOutputDir);
    const appDir = await resolveAppDir(outputRoot);
    if (!appDir) {
      const message = `No package.json found in ${outputRoot} (also checked ${FRONTEND_SUBDIR_CANDIDATES.join(", ")})`;
      serverStatus = "error";
      addLog(`[preview] ${message}`);
      return Response.json({ error: message, status: "error", logs: serverLogs }, { status: 400 });
    }
    try {
      const injected = await ensureConsoleBridgeInjected(appDir);
      if (injected) addLog(`[preview] Injected console bridge into index.html`);
    } catch (err) {
      addLog(`[preview] Console bridge injection failed (non-fatal): ${err instanceof Error ? err.message : err}`);
    }
    try {
      const { port } = await startServer(appDir);
      return Response.json({ status: serverStatus, port, url: `http://localhost:${port}` });
    } catch (err) {
      serverStatus = "error";
      const message = err instanceof Error ? err.message : "Failed to restart";
      addLog(`[preview] ${message}`);
      return Response.json({ error: message, status: "error", logs: serverLogs }, { status: 500 });
    }
  }

  return Response.json({ error: "Invalid action. Use start, stop, or restart." }, { status: 400 });
}
