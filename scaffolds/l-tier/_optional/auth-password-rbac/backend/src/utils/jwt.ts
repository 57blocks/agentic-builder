/**
 * JWT helpers using `jsonwebtoken`.
 *
 * Reads `AUTH_JWT_SECRET` from process.env. Falls back to the legacy
 * `JWT_SECRET` name and emits a one-time deprecation warning so existing
 * `.env` files keep working during migration.
 *
 * Real validity / length enforcement happens at boot in
 * `config/env.ts#assertRequiredEnv`. This module only throws when
 * BOTH variables are missing at sign/verify time — a last-resort guard
 * against silently signing with `"undefined"`.
 */

import jwt, { type SignOptions, type JwtPayload } from "jsonwebtoken";

let warnedAboutLegacy = false;

function readSecret(): string {
  const canonical = process.env.AUTH_JWT_SECRET;
  if (canonical && canonical.trim().length >= 16) return canonical.trim();

  const legacy = process.env.JWT_SECRET;
  if (legacy && legacy.trim().length >= 16) {
    if (!warnedAboutLegacy) {
      warnedAboutLegacy = true;
      // eslint-disable-next-line no-console
      console.warn(
        "[jwt] Using deprecated JWT_SECRET. Rename to AUTH_JWT_SECRET in .env.",
      );
    }
    return legacy.trim();
  }

  throw new Error(
    "AUTH_JWT_SECRET missing or too short (<16 chars). Generate one with " +
      "`openssl rand -hex 32` and add to backend/.env. " +
      "(JWT_SECRET is accepted as a legacy alias.)",
  );
}

const DEFAULT_EXPIRES_IN: SignOptions["expiresIn"] =
  (process.env.AUTH_JWT_EXPIRES_IN as SignOptions["expiresIn"]) ?? "7d";

export function signJwt(
  payload: Record<string, unknown>,
  expiresIn: SignOptions["expiresIn"] = DEFAULT_EXPIRES_IN,
): string {
  return jwt.sign(payload, readSecret(), { expiresIn });
}

export function verifyJwt(token: string): JwtPayload {
  const decoded = jwt.verify(token, readSecret());
  if (typeof decoded === "string") {
    throw new Error("Unexpected string JWT payload");
  }
  return decoded;
}
