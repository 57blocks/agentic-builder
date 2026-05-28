import "dotenv/config";

/**
 * Centralised env config + boot-time validation.
 *
 * Why `assertRequiredEnv()` exists:
 *   Silent fallbacks ("undefined-secret", `*` CORS, default in-mem DB) cause
 *   the worst class of bugs — the app starts, accepts requests, and only
 *   leaks in prod. We fail fast at boot instead.
 *
 * Behavior matrix:
 *
 *   | Env                    | Missing in production   | Missing in dev    |
 *   |------------------------|-------------------------|-------------------|
 *   | DATABASE_URL           | process.exit(1)         | process.exit(1)   |
 *   | AUTH_JWT_SECRET (≥16)  | process.exit(1)         | warn + dev default|
 *   | CORS_ORIGINS           | process.exit(1)         | warn + localhost  |
 *
 *   Legacy `JWT_SECRET` is accepted as an alias for `AUTH_JWT_SECRET` and
 *   emits a one-time deprecation warning.
 *
 * Optional auth providers (Privy, Clerk, Auth0, etc.) live in
 * `scaffolds/m-tier/_optional/<feature>/backend/src/config/<feature>-env.ts`.
 * They are copied into the generated project only when the kickoff phase
 * detects matching `triggerEnvKeys` on `.blueprint/resource-requirements.json`.
 */

export const PORT = Number(process.env.PORT || 4000);
export const NODE_ENV = process.env.NODE_ENV || "development";
export const IS_PRODUCTION = NODE_ENV === "production";

const MIN_SECRET_LENGTH = 16;
const DEV_FALLBACK_SECRET =
  "dev-only-fallback-secret-do-not-use-in-prod-aaaaaa";

function readJwtSecret(): { value: string; usedLegacy: boolean } | null {
  const canonical = process.env.AUTH_JWT_SECRET?.trim();
  if (canonical && canonical.length >= MIN_SECRET_LENGTH) {
    return { value: canonical, usedLegacy: false };
  }
  const legacy = process.env.JWT_SECRET?.trim();
  if (legacy && legacy.length >= MIN_SECRET_LENGTH) {
    return { value: legacy, usedLegacy: true };
  }
  return null;
}

function fatal(message: string): never {
  // eslint-disable-next-line no-console
  console.error(`[env] FATAL: ${message}`);
  process.exit(1);
}

function warn(message: string): void {
  // eslint-disable-next-line no-console
  console.warn(`[env] WARN: ${message}`);
}

/**
 * MUST be called once at the top of `server.ts`, BEFORE any DB / HTTP
 * subsystem is touched. Calling later means a misconfigured prod deploy
 * could already have served requests with bad defaults.
 */
export function assertRequiredEnv(): void {
  if (!process.env.DATABASE_URL) {
    fatal(
      "DATABASE_URL missing. Set it in .env, e.g. postgresql://user:pass@host:5432/db",
    );
  }

  const jwt = readJwtSecret();
  if (!jwt) {
    if (IS_PRODUCTION) {
      fatal(
        `AUTH_JWT_SECRET missing or shorter than ${MIN_SECRET_LENGTH} chars. ` +
          "Generate one with `openssl rand -hex 32` and add to backend/.env.",
      );
    }
    warn(
      `AUTH_JWT_SECRET missing — falling back to insecure dev secret. ` +
        "DO NOT ship to production.",
    );
    process.env.AUTH_JWT_SECRET = DEV_FALLBACK_SECRET;
  } else if (jwt.usedLegacy) {
    warn("Using deprecated JWT_SECRET. Rename to AUTH_JWT_SECRET in .env.");
    // Mirror so downstream `process.env.AUTH_JWT_SECRET` reads work uniformly.
    process.env.AUTH_JWT_SECRET = jwt.value;
  }

  const cors = process.env.CORS_ORIGINS?.trim();
  if (!cors) {
    if (IS_PRODUCTION) {
      fatal(
        "CORS_ORIGINS missing. Set a comma-separated allowlist " +
          "(e.g. https://app.example.com,https://admin.example.com).",
      );
    }
    warn(
      "CORS_ORIGINS unset — defaulting to http://localhost:5173 for dev only.",
    );
    process.env.CORS_ORIGINS = "http://localhost:5173";
  }
}
