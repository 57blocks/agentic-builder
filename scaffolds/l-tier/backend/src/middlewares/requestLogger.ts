import { randomUUID } from "node:crypto";
import type Koa from "koa";
import type { AppContext } from "../types/koa";
import { logger } from "../config/logger";

/**
 * Per-request structured logging.
 *
 * Tags every request with a `requestId` (taken from the `X-Request-Id` header
 * if the upstream provides one, otherwise a fresh UUID) and emits a single
 * line on completion containing method, path, status, and duration.
 *
 * The requestId is exposed on the response as `X-Request-Id` so clients /
 * load balancers can correlate logs across services.
 *
 * Mount BEFORE `errorHandlerMiddleware` so the error handler sees the
 * already-attached `ctx.state.log`.
 */
export const requestLoggerMiddleware: Koa.Middleware = async (
  ctx: AppContext,
  next,
) => {
  const requestId =
    (ctx.get("X-Request-Id") || ctx.get("X-Correlation-Id") || randomUUID()).trim();
  ctx.set("X-Request-Id", requestId);

  const reqLog = logger.child({ requestId, method: ctx.method, path: ctx.path });
  ctx.state.log = reqLog;

  const startedAt = Date.now();
  try {
    await next();
  } finally {
    const durationMs = Date.now() - startedAt;
    const level = ctx.status >= 500 ? "error" : ctx.status >= 400 ? "warn" : "info";
    reqLog[level]({ status: ctx.status, durationMs }, "request completed");
  }
};
