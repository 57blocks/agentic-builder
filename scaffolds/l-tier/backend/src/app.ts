import Koa from "koa";
import bodyParser from "koa-bodyparser";
import { createApiRouter } from "./api/modules";
import { corsMiddleware } from "./middlewares/cors";
import { errorHandlerMiddleware } from "./middlewares/errorHandler";
import { requestLoggerMiddleware } from "./middlewares/requestLogger";

export function createApp(): Koa {
  const app = new Koa();
  const apiRouter = createApiRouter();

  // requestLogger MUST come first so the error handler (and every downstream
  // middleware) can write to `ctx.state.log` with the requestId already bound.
  app.use(requestLoggerMiddleware);
  app.use(errorHandlerMiddleware);
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
