/**
 * Session cleanup worker.
 *
 * Periodically deletes rows from `sessions` whose `expires_at` is in the
 * past. Without this, every login leaves a permanent row → the table
 * grows unboundedly, indexes get slower, and DB backups balloon. Logout
 * deletes the active row but does nothing for sessions that simply
 * timed out.
 *
 * Activation — this module starts itself on first import (idempotent
 * via the `started` guard below). The `auth-password-rbac` overrides
 * for `api/modules/index.ts` and `api/modules/auth/auth.routes.ts`
 * side-effect-import this module so the timer runs in any process that
 * mounts auth routes. No edits to `backend/src/workers/index.ts` are
 * required.
 *
 * Configuration (env, optional):
 *   SESSION_CLEANUP_INTERVAL_MS — default 3,600,000 (1 hour)
 *   SESSION_CLEANUP_DISABLED   — set to "1" to no-op (tests, CLI tools)
 */

import { Op } from "sequelize";

import { Session } from "../models/Session";
import { logger } from "../config/logger";

const DEFAULT_INTERVAL_MS = 60 * 60 * 1000;

let started = false;

export function registerSessionCleanupWorker(): void {
  if (started) return;
  if (process.env.SESSION_CLEANUP_DISABLED === "1") return;

  started = true;

  const intervalMs = parseIntervalMs(
    process.env.SESSION_CLEANUP_INTERVAL_MS,
    DEFAULT_INTERVAL_MS,
  );

  // Run once on boot so a long-lived process doesn't wait a full hour
  // for the first sweep after restart. Errors are logged and swallowed:
  // failing to prune sessions should never crash the API.
  void runOnce();

  const handle = setInterval(() => {
    void runOnce();
  }, intervalMs);

  // Don't keep the process alive solely for this timer — short scripts
  // (migrations, seeders) shouldn't hang on the interval.
  if (typeof handle.unref === "function") handle.unref();

  logger.info(
    { intervalMs },
    "session cleanup worker registered",
  );
}

async function runOnce(): Promise<void> {
  try {
    const deleted = await Session.destroy({
      where: { expiresAt: { [Op.lt]: new Date() } },
    });
    if (deleted > 0) {
      logger.info({ deleted }, "session cleanup swept expired rows");
    }
  } catch (err) {
    logger.warn({ err }, "session cleanup sweep failed; will retry next tick");
  }
}

function parseIntervalMs(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 60_000 ? n : fallback;
}

// Self-register on import — see file header for rationale.
registerSessionCleanupWorker();
