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

    // Handle 404 — emit the canonical error envelope so the frontend
    // can branch on `body.error.code` instead of having to detect two
    // shapes (legacy `{ error, message }` vs the new `{ ok, error: { code, message } }`).
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

    ctx.status = error.status || 500;

    // Canonical error envelope — must stay in lock-step with the success
    // envelope produced by responseEnvelope.ts and the unwrap logic in
    // frontend/src/api/client.ts. The contract is:
    //
    //   { ok: false, error: { code: string, message: string, details? } }
    //
    // `code` is a stable machine-readable string the frontend can switch on
    // (e.g. "UNAUTHORIZED", "NOT_FOUND", "VALIDATION_ERROR"). It comes from
    // `Errors.X()` factories below; we fall back to `HTTP_<status>` so even
    // un-coded throws stay queryable. NOTE: even in development we never
    // echo the raw request body back — `details` is for backend-emitted
    // structured error context only (see `Errors.ValidationError` callers).
    ctx.body = {
      ok: false,
      error: {
        code: error.code || `HTTP_${ctx.status}`,
        message: error.message || "An unexpected error occurred",
        ...(error.details !== undefined && { details: error.details }),
      },
      ...(process.env.NODE_ENV === "development" && {
        stack: error.stack,
      }),
    };

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
