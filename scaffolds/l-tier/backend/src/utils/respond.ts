import type { AppKoaContext } from "../types/koa";

/**
 * Typed success response — the ONLY correct way to send data from a handler.
 *
 * Pin the response type at the call site so TypeScript verifies the payload
 * matches the shared‑schema Response type (`shared/schema.ts` → `ENDPOINTS`):
 *
 *   import type { CourseListResponse } from "../../../shared/schema";
 *   json<CourseListResponse>(ctx, { items, total });
 *
 * The `responseEnvelope` middleware wraps `ctx.body` into `{ ok: true, data }`,
 * so pass the RAW data shape here (matching the schema's response `data` type).
 *
 * HARD RULE: never do `ctx.body = <Sequelize model instance>`. The raw ORM row's
 * columns (snake_case, extra audit fields, missing computed fields) are NOT the
 * contract and silently break the frontend. Serialize the model to the schema
 * type first (e.g. a `toCourse(row): Course` mapper), then pass it here.
 */
export function json<T>(ctx: AppKoaContext, data: T, status = 200): void {
  ctx.status = status;
  ctx.body = data;
}

/** 201 Created convenience — same typing contract as `json`. */
export function created<T>(ctx: AppKoaContext, data: T): void {
  json(ctx, data, 201);
}
