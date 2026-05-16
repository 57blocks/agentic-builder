import type { DefaultContext, DefaultState, ParameterizedContext } from "koa";
import type { Logger } from "pino";

export interface AppState extends DefaultState {
  /**
   * Per-request child logger bound with `{ requestId, method, path }`.
   * Populated by `requestLoggerMiddleware`. Prefer this over `console.log`
   * inside handlers so every line in a request stays correlated.
   */
  log?: Logger;
  /** Authenticated principal — populated by an auth middleware when present. */
  user?: { id: string; [key: string]: unknown };
}

export interface AppContext extends DefaultContext {
  request: DefaultContext["request"] & {
    body?: any;
  };
}

export type AppKoaContext = ParameterizedContext<AppState, AppContext>;
