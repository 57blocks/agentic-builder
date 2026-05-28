import type Koa from "koa";
import type { AppContext } from "../types/koa";
import { logger } from "../config/logger";

export interface AppError extends Error {
  status?: number;
  code?: string;
  details?: any;
}

/**
 * Canonical error handler. Two responsibilities:
 *
 *   1. Convert every thrown `AppError` (or unknown) into the project-wide
 *      response envelope `{ ok: false, error: { code, message, details? } }`.
 *      Frontends rely on this shape — if a handler returns a bare `{ error }`
 *      object the client unwrapper falls through and renders "undefined".
 *
 *   2. Log the failure through `pino` (NOT `console.error`). Reasons:
 *        - `console.error` bypasses pino's redaction config, so any
 *          `password`/`refresh_token` smuggled in `requestBody` leaks to stdout
 *          in plain text (audit + GDPR risk).
 *        - pino's structured output is what log aggregators index; plain
 *          `console.error` strings break dashboards.
 *
 * MUST be registered FIRST in `app.use(...)` chain so errors thrown by later
 * middleware (auth, body parser, validation) are caught.
 */
export const errorHandlerMiddleware: Koa.Middleware = async (
  ctx: AppContext,
  next,
) => {
  const requestBody =
    (ctx.request as typeof ctx.request & { body?: unknown }).body ?? undefined;
  try {
    await next();

    if (ctx.status === 404 && !ctx.body) {
      ctx.status = 404;
      ctx.body = {
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: `Route ${ctx.method} ${ctx.url} not found`,
        },
      };
    }
  } catch (err: any) {
    const error = err as AppError;
    const status = error.status || 500;
    const code = error.code || (status >= 500 ? "INTERNAL_SERVER_ERROR" : "BAD_REQUEST");

    logger.error(
      {
        method: ctx.method,
        url: ctx.url,
        status,
        code,
        details: error.details,
        body: requestBody,
        userId: ctx.state.user?.id,
        err: error,
      },
      `request failed: ${error.message}`,
    );

    ctx.status = status;
    ctx.body = {
      ok: false,
      error: {
        code,
        message: error.message || "An unexpected error occurred",
        ...(error.details !== undefined ? { details: error.details } : {}),
        ...(process.env.NODE_ENV === "development" && error.stack
          ? { stack: error.stack }
          : {}),
      },
    };
    ctx.type = "application/json";
  }
};

export function createError(
  message: string,
  status: number = 500,
  code?: string,
  details?: any,
): AppError {
  const error = new Error(message) as AppError;
  error.status = status;
  error.code = code;
  error.details = details;
  return error;
}

export const Errors = {
  BadRequest: (message: string = "Bad Request", details?: any) =>
    createError(message, 400, "BAD_REQUEST", details),

  Unauthorized: (message: string = "Unauthorized") =>
    createError(message, 401, "UNAUTHORIZED"),

  Forbidden: (message: string = "Forbidden") =>
    createError(message, 403, "FORBIDDEN"),

  NotFound: (message: string = "Not Found") =>
    createError(message, 404, "NOT_FOUND"),

  Conflict: (message: string = "Conflict") =>
    createError(message, 409, "CONFLICT"),

  ValidationError: (message: string = "Validation Failed", details?: any) =>
    createError(message, 422, "VALIDATION_ERROR", details),

  InternalServerError: (message: string = "Internal Server Error") =>
    createError(message, 500, "INTERNAL_SERVER_ERROR"),
};
