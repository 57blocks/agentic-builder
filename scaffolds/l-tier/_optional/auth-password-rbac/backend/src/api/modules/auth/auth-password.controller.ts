/**
 * Password-based auth controller.
 *
 * Implements:
 *   - POST /v1/auth/login    → email + password → JWT bearer token
 *   - GET  /v1/auth/me       → current user info (requires bearer)
 *   - POST /v1/auth/logout   → revokes the active session
 *
 * Workers extending this scaffold (e.g. adding password reset) should add
 * NEW controller functions in this file or a sibling controller — do NOT
 * mutate the three exports below without updating `auth.routes.ts` and the
 * frontend `auth-client.ts` in lockstep.
 */

import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";

import { User } from "../../../models/User";
import { Session } from "../../../models/Session";
import { Errors } from "../../../middlewares/errorHandler";
import { signJwt } from "../../../utils/jwt";
import type { Context } from "koa";

const SESSION_EXPIRY_DAYS = 7;

interface LoginBody {
  email?: string;
  password?: string;
}

interface AuthedContext extends Context {
  state: Context["state"] & {
    user?: { id: string; email?: string; role?: string };
    sessionId?: string;
  };
}

export async function loginWithPassword(ctx: AuthedContext): Promise<void> {
  const body = (ctx.request.body ?? {}) as LoginBody;
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!email || !password) {
    throw Errors.BadRequest("Email and password are required");
  }

  const user = await User.findOne({ where: { email } });
  if (!user || !user.passwordHash) {
    throw Errors.Unauthorized("Invalid email or password");
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    throw Errors.Unauthorized("Invalid email or password");
  }

  const sessionId = randomUUID();
  const expiresAt = new Date(
    Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  );

  const token = signJwt(
    { sub: user.id, sessionId, role: user.role },
    `${SESSION_EXPIRY_DAYS}d`,
  );

  // NOTE: we intentionally don't persist `token` on the Session row — see
  // the security note on `models/Session.ts`. Revocation works by
  // deleting the row (`logoutSession`); cryptographic verification keeps
  // running off `AUTH_JWT_SECRET`.
  await Session.create({
    id: sessionId,
    userId: user.id,
    expiresAt,
    lastActivityAt: new Date(),
  });

  ctx.body = {
    // `accessToken` is the canonical field; `token` is a legacy alias kept
    // for frontends that still read `data.token`. Emitting both costs
    // nothing and avoids a class of "Bearer header is empty" 401s.
    accessToken: token,
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      displayName: user.displayName,
    },
  };
}

export async function getCurrentUser(ctx: AuthedContext): Promise<void> {
  const userId = ctx.state.user?.id;
  if (!userId) throw Errors.Unauthorized("Not authenticated");

  const user = await User.findByPk(userId);
  if (!user) throw Errors.Unauthorized("Session points at a deleted user");

  ctx.body = {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      displayName: user.displayName,
    },
  };
}

export async function logoutSession(ctx: AuthedContext): Promise<void> {
  const sessionId = ctx.state.sessionId;
  if (sessionId) {
    await Session.destroy({ where: { id: sessionId } });
  }
  ctx.body = { ok: true };
}
