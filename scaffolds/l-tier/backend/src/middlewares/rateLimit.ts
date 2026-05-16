import type Koa from "koa";
import type { AppContext } from "../types/koa";

/**
 * In-memory fixed-window rate limiter.
 *
 * Suitable for single-process dev / smoke tests. For real L-tier production
 * traffic you SHOULD swap the backing store to Redis (see
 * `createRedisRateLimit` placeholder below) so all replicas share counters —
 * but the API surface stays the same, so feature handlers don't change.
 *
 * Usage:
 *   const apiLimiter = createRateLimit({ windowMs: 60_000, max: 60 });
 *   apiRouter.post("/expensive-thing", apiLimiter, expensiveHandler);
 */
interface WindowState {
  count: number;
  resetAt: number;
}

export interface RateLimitOptions {
  /** Window size in ms. */
  windowMs: number;
  /** Max requests per `keyFn(ctx)` per window. */
  max: number;
  /**
   * Identify the caller. Defaults to `ctx.ip`; override to scope by user id,
   * route, etc. (e.g. `(ctx) => \`${ctx.state.user?.id ?? ctx.ip}:${ctx.path}\`).
   */
  keyFn?: (ctx: AppContext) => string;
  /** Status code to return when exceeded. Defaults to 429. */
  statusCode?: number;
  /** Optional response body. Defaults to `{ error: "Too Many Requests" }`. */
  message?: string | Record<string, unknown>;
}

/**
 * Module-level registry of every limiter's store so a single GC timer can
 * sweep all of them. Each `createRateLimit()` call still owns its own private
 * `Map`; the registry just holds weak references for the GC pass.
 */
const allStores = new Set<Map<string, WindowState>>();

const gcTimer = setInterval(
  () => {
    const now = Date.now();
    for (const store of allStores) {
      for (const [key, state] of store) {
        if (state.resetAt <= now) store.delete(key);
      }
    }
  },
  10_000,
).unref();

export function createRateLimit(options: RateLimitOptions): Koa.Middleware {
  const store = new Map<string, WindowState>();
  allStores.add(store);

  const keyFn = options.keyFn ?? ((ctx) => ctx.ip);
  const status = options.statusCode ?? 429;
  const body = options.message ?? { error: "Too Many Requests" };

  return async (ctx, next) => {
    const key = keyFn(ctx as AppContext);
    const now = Date.now();
    let state = store.get(key);

    if (!state || state.resetAt <= now) {
      state = { count: 0, resetAt: now + options.windowMs };
      store.set(key, state);
    }
    state.count += 1;

    const remaining = Math.max(0, options.max - state.count);
    ctx.set("X-RateLimit-Limit", String(options.max));
    ctx.set("X-RateLimit-Remaining", String(remaining));
    ctx.set("X-RateLimit-Reset", String(Math.ceil(state.resetAt / 1000)));

    if (state.count > options.max) {
      const retryAfterSec = Math.ceil((state.resetAt - now) / 1000);
      ctx.set("Retry-After", String(retryAfterSec));
      ctx.status = status;
      ctx.body = body;
      return;
    }

    await next();
  };
}

// Exposed so tests can stop the timer when the suite tears down.
export { gcTimer as _rateLimitGcTimer };
