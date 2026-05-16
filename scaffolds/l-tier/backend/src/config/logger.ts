/**
 * Structured logger (pino).
 *
 * Why L-tier ships this: at L scale every request, every worker step, and every
 * external API call needs to be greppable from a single log stream so operators
 * can debug stalls without running `tsc-watch` locally. `console.log` is fine
 * for an MVP — for L it isn't.
 *
 * Usage:
 *   import { logger } from "@/config/logger";
 *   logger.info({ userId, runId }, "feed-aggregator started");
 *   logger.error({ err, endpoint }, "external API call failed");
 *
 * Conventions:
 * - First arg is a structured object. Put the human message LAST.
 * - Use child loggers per worker / per request so every line carries the same
 *   correlation id without repeating yourself.
 */
import pino from "pino";

const isProd = process.env.NODE_ENV === "production";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isProd ? "info" : "debug"),
  base: { service: "backend" },
  redact: {
    paths: [
      "password",
      "*.password",
      "passwordHash",
      "*.passwordHash",
      "authorization",
      "headers.authorization",
      "cookie",
      "headers.cookie",
    ],
    censor: "[redacted]",
  },
  transport: isProd
    ? undefined
    : {
        target: "pino-pretty",
        options: { colorize: true, singleLine: false },
      },
});

/**
 * Build a child logger that automatically tags every line with the given
 * correlation context (e.g. requestId, runId, workerName).
 */
export function childLogger(bindings: Record<string, unknown>) {
  return logger.child(bindings);
}
