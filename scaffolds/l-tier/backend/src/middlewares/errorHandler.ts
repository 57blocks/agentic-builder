import type Koa from "koa";
import type { AppContext } from "../types/koa";
import { logger } from "../config/logger";

export interface AppError extends Error {
  status?: number;
  code?: string;
  details?: any;
}

export const errorHandlerMiddleware: Koa.Middleware = async (
  ctx: AppContext,
  next,
) => {
  const requestBody =
    (ctx.request as typeof ctx.request & { body?: unknown }).body ?? undefined;
  try {
    await next();

    // Handle 404
    if (ctx.status === 404 && !ctx.body) {
      ctx.status = 404;
      ctx.body = {
        error: "Not Found",
        message: `Route ${ctx.method} ${ctx.url} not found`,
      };
    }
  } catch (err: any) {
    const error = err as AppError;

    // Log error via the structured logger so the `redact` paths configured
    // on `config/logger.ts` (`password`, `*.password`, `passwordHash`,
    // `authorization`, `cookie`, …) actually take effect. Using
    // `console.error` bypasses redaction → /auth/login validation
    // failures used to leak plaintext credentials to stdout / CloudWatch.
    logger.error(
      {
        method: ctx.method,
        url: ctx.url,
        status: error.status,
        code: error.code,
        details: error.details,
        // `body` is the parsed request body. pino's redact path matches
        // `body.password` (and any nested *.password) because we expose
        // the body under `body` — see logger.ts#redact.paths.
        body: requestBody,
        userId: ctx.state.user?.id,
        err: error,
      },
      `request failed: ${error.message}`,
    );

    // Set response status
    ctx.status = error.status || 500;

    // Format error response. NOTE: even in development we never echo the
    // raw request body back — `details` is for backend-emitted structured
    // error context only (see `Errors.ValidationError` callers).
    ctx.body = {
      error: error.name || "InternalServerError",
      message: error.message || "An unexpected error occurred",
      ...(process.env.NODE_ENV === "development" && {
        stack: error.stack,
        details: error.details,
      }),
    };

    // Ensure JSON content type
    ctx.type = "application/json";
  }
};

// Helper function to create structured errors
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

// Common error types
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
