/**
 * Durable orchestration-level status, persisted to
 * `.blueprint/orchestration-status.json` at process.cwd() (same single-project
 * convention as the session checkpoint).
 *
 * Why this exists: the subsystem orchestration streams ONE long-lived SSE to the
 * UI. The `session_complete` / `session_error` signal only travels over that
 * stream — so if the SSE drops mid-build (idle timeout, navigation, network),
 * the UI can no longer tell whether the (still-running, per the keep-running
 * disconnect policy) build finished. The per-sub-call session checkpoint is
 * overwritten by each domain build and isn't a clean whole-run aggregate.
 *
 * So the orchestration writes a single authoritative state here ("running" at
 * start, "completed"/"failed" at the end) that the UI can POLL on reconnect to
 * resolve the final outcome without the stream.
 */

import fs from "fs/promises";
import path from "path";

const STATUS_FILE = path.join(".blueprint", "orchestration-status.json");

export interface OrchestrationStatus {
  runId: string;
  state: "running" | "completed" | "failed";
  /** Number of subsystem domains in this orchestration (informational). */
  domains?: number;
  /** Failure summary when state === "failed". */
  error?: string;
  updatedAt: string;
}

function statusPath(root: string): string {
  return path.join(root, STATUS_FILE);
}

export async function writeOrchestrationStatus(
  root: string,
  status: OrchestrationStatus,
): Promise<void> {
  try {
    await fs.mkdir(path.join(root, ".blueprint"), { recursive: true });
    await fs.writeFile(
      statusPath(root),
      JSON.stringify(status, null, 2) + "\n",
      "utf-8",
    );
  } catch {
    /* best-effort — never block the build on status IO */
  }
}

export async function readOrchestrationStatus(
  root: string,
): Promise<OrchestrationStatus | null> {
  try {
    const raw = await fs.readFile(statusPath(root), "utf-8");
    const parsed = JSON.parse(raw) as OrchestrationStatus;
    if (parsed && typeof parsed.state === "string") return parsed;
  } catch {
    /* missing/corrupt → no orchestration in flight */
  }
  return null;
}
