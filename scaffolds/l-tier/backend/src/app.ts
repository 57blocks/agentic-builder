import Koa from "koa";
import Router from "@koa/router";
import bodyParser from "koa-bodyparser";
import { createApiRouter } from "./api/modules";
import { corsMiddleware } from "./middlewares/cors";
import { errorHandlerMiddleware } from "./middlewares/errorHandler";
import { requestLoggerMiddleware } from "./middlewares/requestLogger";
import { responseEnvelopeMiddleware } from "./middlewares/responseEnvelope";

/**
 * Liveness probe pinned at the ABSOLUTE path `/api/health`, mounted directly on
 * the app — independent of whatever prefix the business apiRouter uses (`/api`
 * vs `/api/v1`). Both the Playwright `webServer` probe and the runtime smoke
 * gate poll `/api/health`; if it isn't reachable the dev server never reports
 * ready → the whole E2E suite times out and runtime-verify is skipped. Keeping
 * this in the scaffold (not codegen) guarantees every project boots green
 * regardless of the version prefix the feature workers pick. Pure liveness — no
 * DB / dependency checks, so it answers during startup too.
 */
function createHealthRouter(): Router {
  const router = new Router();
  router.get("/api/health", (ctx) => {
    ctx.body = { status: "ok" };
  });
  return router;
}

export function createApp(): Koa {
  const app = new Koa();
  const apiRouter = createApiRouter();
  const healthRouter = createHealthRouter();

  // Middleware order matters:
  //   1. requestLogger     → bind requestId / ctx.state.log first
  //   2. errorHandler      → catches throws from any downstream layer and
  //                          emits the canonical { ok:false, error } envelope
  //   3. responseEnvelope  → wraps successful 2xx bodies into { ok:true, data }
  //                          (skips already-enveloped bodies, errors pass through)
  //   4. cors / bodyParser → request shaping
  //   5. routes            → handlers write `ctx.body = <raw data>`
  app.use(requestLoggerMiddleware);
  app.use(errorHandlerMiddleware);
  app.use(responseEnvelopeMiddleware);
  app.use(corsMiddleware);
  app.use(bodyParser());
  // Liveness probe FIRST (after error/log/cors plumbing) so `/api/health` always
  // answers 2xx regardless of the versioned business router below. Do not move
  // this under the apiRouter prefix — the probe URL is the unversioned `/api/health`.
  app.use(healthRouter.routes()).use(healthRouter.allowedMethods());
  // Auth middleware:
  //   - default base scaffold: no auth middleware (email+password handled
  //     per-route by feature workers based on PRD).
  //   - When the `_optional/auth-privy` feature is applied, this file is
  //     overwritten with a version that registers `privyAuthMiddleware`.
  //   - When `_optional/auth-clerk` is applied, similar overwrite for Clerk.
  app.use(apiRouter.routes()).use(apiRouter.allowedMethods());

  return app;
}
