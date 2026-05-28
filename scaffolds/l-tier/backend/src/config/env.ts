import "dotenv/config";

export const PORT = Number(process.env.PORT || 4000);
export const NODE_ENV = process.env.NODE_ENV ?? "development";
export const IS_PRODUCTION = NODE_ENV === "production";

/**
 * Boot-time environment audit. Called once at process start (see
 * `server.ts`) so misconfiguration fails loud at startup instead of at
 * the first authenticated request.
 *
 * Rules:
 *   - production: missing required env → process exits with code 1.
 *   - dev/test:   missing required env → warning, scaffold still boots
 *     so generated projects can run before the operator fills `.env`.
 *
 * Add new checks here as new optional modules are wired in.
 */
export function assertRequiredEnv(): void {
  const problems: string[] = [];

  // ─── Database ──────────────────────────────────────────────────────────────
  if (!process.env.DATABASE_URL) {
    problems.push("DATABASE_URL is required (Postgres connection string).");
  }

  // ─── JWT (only enforced when auth-* scaffolds are present) ────────────────
  // We can't reliably detect "auth scaffold is in use" at this layer (the
  // optional packages are merged into the same tree), so we treat the
  // secret as required when *any* of these signals are present:
  //   1. `AUTH_JWT_SECRET` is set (operator opted in)
  //   2. `JWT_SECRET` legacy alias is set
  //   3. NODE_ENV=production (don't ship without it)
  const secret = process.env.AUTH_JWT_SECRET ?? process.env.JWT_SECRET;
  const expectsAuth = Boolean(secret) || IS_PRODUCTION;
  if (expectsAuth) {
    if (!secret) {
      problems.push(
        "AUTH_JWT_SECRET is required when NODE_ENV=production. " +
          "Generate one with: openssl rand -hex 32",
      );
    } else if (secret.trim().length < 32) {
      problems.push(
        `AUTH_JWT_SECRET must be ≥ 32 chars (got ${secret.trim().length}).`,
      );
    }
    if (!process.env.AUTH_JWT_SECRET && process.env.JWT_SECRET) {
      // Legacy alias still works at runtime via jwt.ts fallback — surface
      // it once at boot so it gets migrated.
      // eslint-disable-next-line no-console
      console.warn(
        "[env] JWT_SECRET is deprecated; rename to AUTH_JWT_SECRET.",
      );
    }
  }

  // ─── CORS (only enforced in production) ────────────────────────────────────
  if (IS_PRODUCTION && !process.env.CORS_ORIGINS && !process.env.FRONTEND_URL) {
    problems.push(
      "CORS_ORIGINS (or legacy FRONTEND_URL) is required in production. " +
        "Set to a comma-separated allowlist of trusted origins, e.g. " +
        "`https://app.example.com,https://admin.example.com`.",
    );
  }

  if (problems.length === 0) return;

  const message = problems.map((p) => `  • ${p}`).join("\n");
  if (IS_PRODUCTION) {
    // eslint-disable-next-line no-console
    console.error(`[env] Fatal misconfiguration:\n${message}`);
    process.exit(1);
  } else {
    // eslint-disable-next-line no-console
    console.warn(`[env] Missing optional config:\n${message}`);
  }
}

// Optional auth providers (Privy, Clerk, Auth0, etc.) live in
// `scaffolds/m-tier/_optional/<feature>/backend/src/config/<feature>-env.ts`.
// They are copied into the generated project only when the kickoff phase
// detects matching `triggerEnvKeys` on `.blueprint/resource-requirements.json`.
