/**
 * Auth decision — the single source of truth for which authentication
 * scaffold the generated project should use. Produced by AuthDeciderAgent
 * during architect-triage (auto), surfaced to the user as the first card
 * of the env-setup Wizard (HITL override), persisted to
 * `.blueprint/auth-decision.json`, and consumed downstream by
 * `scaffold-optional` (picks `_optional/auth-*`), the contract generator,
 * and the seed-data step.
 *
 * Only three modes are supported in v1:
 *   - "password-rbac"  — local email+password + RBAC + seeded accounts (DEFAULT)
 *   - "magic-link"     — passwordless via SMTP
 *   - "privy"          — Privy OAuth (Google / Email / Wallet / etc.)
 */

export const AUTH_MODES = ["password-rbac", "magic-link", "privy"] as const;
export type AuthMode = (typeof AUTH_MODES)[number];

export const DEFAULT_AUTH_MODE: AuthMode = "password-rbac";

/** Scaffold directory under `scaffolds/<tier>/_optional/`. */
export type AuthScaffoldName =
  | "auth-password-rbac"
  | "auth-magic-link"
  | "auth-privy";

export const SCAFFOLD_FOR_MODE: Record<AuthMode, AuthScaffoldName> = {
  "password-rbac": "auth-password-rbac",
  "magic-link": "auth-magic-link",
  privy: "auth-privy",
};

export type AuthRole = "admin" | "operator" | "viewer";

export const DEFAULT_RBAC_ROLES: readonly AuthRole[] = [
  "admin",
  "operator",
  "viewer",
] as const;

export interface SeedAccount {
  email: string;
  role: AuthRole;
  /** Plain-text password — used by seed-auth-users.ts to bcrypt-hash before
   *  insert. Empty/omitted for non-password modes (magic-link / privy)
   *  where seed accounts only exist to pre-assign roles to incoming users. */
  password?: string;
}

/** Default fixed seed accounts (per user choice). Production README warns to
 *  change these on first deploy. Used uniformly for all 3 modes — the
 *  password field is consumed only by password-rbac. */
export const DEFAULT_SEED_ACCOUNTS: readonly SeedAccount[] = [
  { email: "admin@example.com", role: "admin", password: "Admin@2026" },
  { email: "operator@example.com", role: "operator", password: "Operator@2026" },
  { email: "viewer@example.com", role: "viewer", password: "Viewer@2026" },
] as const;

export type AuthConfidence = "high" | "medium" | "low";

export interface AuthDecision {
  /** Active mode. Drives scaffold selection + contract generation. */
  mode: AuthMode;
  /** Scaffold directory name resolved from `mode`. Kept denormalised so
   *  downstream code can copy without reimporting `SCAFFOLD_FOR_MODE`. */
  scaffold: AuthScaffoldName;
  /** One-sentence explanation citing PRD evidence. Shown in Wizard. */
  rationale: string;
  /** Agent confidence in its recommendation. `low` means PRD was silent
   *  and we fell back to the default. */
  confidence: AuthConfidence;
  /** Seed accounts to provision on first run. */
  seedAccounts: SeedAccount[];
  /** RBAC role names enforced by middleware. */
  rbacRoles: AuthRole[];
  /** Env keys the chosen mode REQUIRES at runtime (e.g. SMTP_* for magic-link,
   *  PRIVY_APP_ID for privy). Drives Wizard's downstream phases. */
  requiredEnvKeys: string[];
  /** True once the user has touched the Wizard card. Locks the decision
   *  from being silently overwritten by re-running the decider. */
  userOverridden: boolean;
  /** ISO timestamp of last write. */
  updatedAt: string;
}

/** Env keys each mode declares as REQUIRED. Mirrors what the Wizard surfaces
 *  in the "infra/vendor/deploy" phases after a mode is locked in. */
export const REQUIRED_ENV_KEYS_BY_MODE: Record<AuthMode, readonly string[]> = {
  "password-rbac": [],
  "magic-link": [
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASSWORD",
    "SMTP_FROM",
  ],
  privy: ["PRIVY_APP_ID", "PRIVY_APP_SECRET", "VITE_PRIVY_APP_ID"],
} as const;

/** Type guard. */
export function isAuthMode(s: unknown): s is AuthMode {
  return typeof s === "string" && (AUTH_MODES as readonly string[]).includes(s);
}

export function isAuthRole(s: unknown): s is AuthRole {
  return s === "admin" || s === "operator" || s === "viewer";
}

/** Build a default decision used when no LLM call has run yet OR when the
 *  agent failed to parse its own JSON. Bound to the chosen default mode. */
export function buildDefaultAuthDecision(rationale?: string): AuthDecision {
  const mode: AuthMode = DEFAULT_AUTH_MODE;
  return {
    mode,
    scaffold: SCAFFOLD_FOR_MODE[mode],
    rationale:
      rationale ??
      "Default fallback: PRD did not specify an auth provider; using password+RBAC with seeded admin/operator/viewer accounts so the app is demo-able with zero external dependencies.",
    confidence: "low",
    seedAccounts: DEFAULT_SEED_ACCOUNTS.map((s) => ({ ...s })),
    rbacRoles: [...DEFAULT_RBAC_ROLES],
    requiredEnvKeys: [...REQUIRED_ENV_KEYS_BY_MODE[mode]],
    userOverridden: false,
    updatedAt: new Date().toISOString(),
  };
}
