/**
 * Magic-link auth controller.
 *
 *   POST /v1/auth/magic           — accept { email }, issue token, email link
 *   GET  /v1/auth/magic/verify    — accept ?token=..., consume, return JWT
 *   GET  /v1/auth/me              — current user (requires auth)
 *   POST /v1/auth/logout          — revoke session
 *
 * Tokens are 32-byte hex strings, single-use, 15-minute TTL. The link
 * frontend lands on is `<FRONTEND_URL>/auth/magic/callback?token=...`.
 */

import { randomBytes, randomUUID } from "node:crypto";
import { Op } from "sequelize";
import type { Context } from "koa";

import { User } from "../../../models/User";
import { Session } from "../../../models/Session";
import { MagicLinkToken } from "../../../models/MagicLinkToken";
import { Errors } from "../../../middlewares/errorHandler";
import { signJwt } from "../../../utils/jwt";
import { sendMagicLinkEmail } from "../../../services/emailService";

const TOKEN_TTL_MS = 15 * 60 * 1000;
const SESSION_EXPIRY_DAYS = 7;

interface AuthedContext extends Context {
  state: Context["state"] & {
    user?: { id: string; email?: string; role?: string };
    sessionId?: string;
  };
}

function frontendBase(): string {
  return (
    process.env.FRONTEND_URL ??
    process.env.PUBLIC_FRONTEND_URL ??
    "http://localhost:5173"
  );
}

export async function requestMagicLink(ctx: AuthedContext): Promise<void> {
  const body = (ctx.request.body ?? {}) as { email?: string };
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    throw Errors.BadRequest("A valid email is required");
  }

  // Auto-create the user row on first request (passwordless flow).
  const [user] = await User.findOrCreate({
    where: { email },
    defaults: { email, role: "viewer", displayName: null, passwordHash: null },
  });

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
  await MagicLinkToken.create({ email: user.email, token, expiresAt });

  const link = `${frontendBase()}/auth/magic/callback?token=${encodeURIComponent(token)}`;
  await sendMagicLinkEmail(user.email, link);

  // Never echo the token back over the wire; the link is sent via email.
  ctx.body = { ok: true };
}

export async function verifyMagicLink(ctx: AuthedContext): Promise<void> {
  const token = String(ctx.query.token ?? "").trim();
  if (!token) throw Errors.BadRequest("Missing `token` query parameter");

  const row = await MagicLinkToken.findOne({
    where: { token, usedAt: { [Op.is]: null } as unknown as null },
  });
  if (!row) throw Errors.Unauthorized("Token already used or invalid");
  if (row.expiresAt.getTime() < Date.now()) {
    throw Errors.Unauthorized("Token expired — request a new link");
  }

  row.usedAt = new Date();
  await row.save();

  const user = await User.findOne({ where: { email: row.email } });
  if (!user) throw Errors.Unauthorized("User no longer exists");

  user.lastLoginAt = new Date();
  await user.save();

  const sessionId = randomUUID();
  const expiresAt = new Date(
    Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  );
  const accessToken = signJwt(
    { sub: user.id, sessionId, role: user.role },
    `${SESSION_EXPIRY_DAYS}d`,
  );
  await Session.create({
    id: sessionId,
    userId: user.id,
    token: accessToken,
    expiresAt,
    lastActivityAt: new Date(),
  });

  ctx.body = {
    accessToken,
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
  if (sessionId) await Session.destroy({ where: { id: sessionId } });
  ctx.body = { ok: true };
}
