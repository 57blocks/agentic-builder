import Koa from "koa";
import bodyParser from "koa-bodyparser";
import { createApiRouter } from "./api/modules";
import { corsMiddleware } from "./middlewares/cors";
import { errorHandlerMiddleware } from "./middlewares/errorHandler";
import { responseEnvelopeMiddleware } from "./middlewares/responseEnvelope";

export function createApp(): Koa {
  const app = new Koa();
  const apiRouter = createApiRouter();

  // Middleware order matters:
  //   1. errorHandler      → catches throws from any downstream layer and
  //                          emits the canonical { ok:false, error } envelope
  //   2. responseEnvelope  → wraps successful 2xx bodies into { ok:true, data }
  //                          (skips already-enveloped bodies, errors pass through)
  //   3. cors / bodyParser → request shaping
  //   4. routes            → handlers write `ctx.body = <raw data>`
  app.use(errorHandlerMiddleware);
  app.use(responseEnvelopeMiddleware);
  app.use(corsMiddleware);
  app.use(bodyParser());
  // Auth middleware:
  //   - default base scaffold: no auth middleware (email+password handled
  //     per-route by feature workers based on PRD).
  //   - When the `_optional/auth-privy` feature is applied, this file is
  //     overwritten with a version that registers `privyAuthMiddleware`.
  //   - When `_optional/auth-clerk` is applied, similar overwrite for Clerk.
  app.use(apiRouter.routes()).use(apiRouter.allowedMethods());

  return app;
}
