/**
 * Response envelope wrapper — guarantees every successful 2xx JSON response
 * has the shape `{ ok: true, data: <body> }` so the frontend `apiClient`
 * (frontend/src/api/client.ts) can unwrap deterministically.
 *
 * Why this exists:
 *   - Without an envelope, every route author has to remember to write
 *     `{ ok: true, data: ... }` by hand. They forget, and the frontend
 *     either has to detect "is it raw or wrapped?" per call site (S-11)
 *     or silently displays the envelope object as the payload (F-16).
 *   - With this middleware, route code stays simple (`ctx.body = users`)
 *     and the wire format stays consistent end-to-end.
 *
 * Wrapping rules — body is wrapped ONLY when ALL apply:
 *   1. ctx.status is in [200, 299] (success).
 *   2. ctx.body is not already an envelope (no top-level `ok` boolean).
 *   3. ctx.body is not a Stream / Buffer / null / undefined (those are
 *      either binary downloads or 204 no-content — never wrap).
 *   4. ctx.state.skipEnvelope !== true (per-route escape hatch — set
 *      this in a route when returning, e.g., a CSV download).
 *
 * Error responses are produced by `errorHandlerMiddleware` and already
 * have the `{ ok: false, error: { code, message } }` shape, so they
 * pass through here untouched (rule 2 catches them).
 */

import type Koa from "koa";
import { Stream } from "node:stream";
import type { AppContext } from "../types/koa";

export const responseEnvelopeMiddleware: Koa.Middleware = async (
  ctx: AppContext,
  next,
) => {
  await next();

  if (ctx.status < 200 || ctx.status >= 300) return;
  if (ctx.state.skipEnvelope === true) return;

  const body = ctx.body;
  if (body === null || body === undefined) return;
  if (body instanceof Stream) return;
  if (Buffer.isBuffer(body)) return;
  if (typeof body !== "object") {
    ctx.body = { ok: true, data: body };
    return;
  }

  // Already enveloped (success OR error shape) — leave it.
  const maybeOk = (body as { ok?: unknown }).ok;
  if (typeof maybeOk === "boolean") return;

  ctx.body = { ok: true, data: body };
};
