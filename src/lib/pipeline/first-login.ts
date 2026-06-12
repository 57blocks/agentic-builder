/**
 * First-login info for a generated app — the "getting started" checklist + the
 * seeded login credentials, surfaced in the preview UI so a user knows exactly
 * how to run the app and what to log in with (instead of hitting a silent
 * "Invalid email or password" because they never knew the seeded accounts).
 *
 * Source of truth = the generated backend seed scripts (the email+password
 * pairs that actually get inserted): `seed-auth-users.ts` (RBAC defaults) and
 * `seed-demo-data.ts` (domain demo accounts). Falls back to the canonical
 * password-rbac defaults when the scripts can't be parsed.
 */

import fs from "fs/promises";
import path from "path";

export interface FirstLoginAccount {
  email: string;
  password: string;
  role?: string;
  /** "rbac" = generic admin/operator/viewer; "demo" = domain persona seed. */
  source: "rbac" | "demo";
}

export interface FirstLoginInfo {
  /** Whether the app auto-seeds on startup (server boots with AUTO_SEED !== 0). */
  autoSeed: boolean;
  /** Ordered run checklist a user can follow. */
  steps: string[];
  /** Seeded accounts the user can log in with. */
  accounts: FirstLoginAccount[];
}

/** Canonical password-rbac defaults — fallback when seed scripts are absent. */
const DEFAULT_ACCOUNTS: FirstLoginAccount[] = [
  { email: "admin@example.com", password: "Admin@2026", role: "admin", source: "rbac" },
  { email: "operator@example.com", password: "Operator@2026", role: "operator", source: "rbac" },
  { email: "viewer@example.com", password: "Viewer@2026", role: "viewer", source: "rbac" },
];

function uniqBy<T>(xs: T[], key: (x: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const x of xs) {
    const k = key(x);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
}

/** Parse flat `{ email, password, role }` account literals from a seed script. */
export function parseRbacAccounts(src: string): FirstLoginAccount[] {
  const out: FirstLoginAccount[] = [];
  // Each non-nested `{ … email … }` object literal.
  for (const m of src.matchAll(/\{([^{}]*email[^{}]*)\}/g)) {
    const body = m[1];
    const email = body.match(/email:\s*["']([^"']+@[^"']+)["']/)?.[1];
    const password = body.match(/password:\s*["']([^"']*)["']/)?.[1];
    const role = body.match(/role:\s*["']([^"']+)["']/)?.[1];
    if (email && password) out.push({ email, password, role, source: "rbac" });
  }
  return out;
}

/** Parse demo accounts: one shared `bcrypt.hash("PW")` + many `email: "X"`. */
export function parseDemoAccounts(src: string): FirstLoginAccount[] {
  const pw = src.match(/bcrypt\.hash\(\s*["']([^"']+)["']/)?.[1];
  if (!pw) return [];
  const emails = [...src.matchAll(/email:\s*["']([^"']+@[^"']+)["']/g)].map(
    (m) => m[1],
  );
  return uniqBy(
    emails.map((email) => ({ email, password: pw, source: "demo" as const })),
    (a) => a.email,
  );
}

async function readIf(file: string): Promise<string | null> {
  try {
    return await fs.readFile(file, "utf-8");
  } catch {
    return null;
  }
}

export async function extractFirstLoginInfo(
  codeOutputDir: string,
): Promise<FirstLoginInfo> {
  const scriptsDir = path.join(codeOutputDir, "backend", "src", "scripts");
  const [authSrc, demoSrc, serverSrc] = await Promise.all([
    readIf(path.join(scriptsDir, "seed-auth-users.ts")),
    readIf(path.join(scriptsDir, "seed-demo-data.ts")),
    readIf(path.join(codeOutputDir, "backend", "src", "server.ts")),
  ]);

  const rbac = authSrc ? parseRbacAccounts(authSrc) : [];
  const demo = demoSrc ? parseDemoAccounts(demoSrc) : [];
  const accounts = uniqBy(
    [...(rbac.length ? rbac : DEFAULT_ACCOUNTS), ...demo],
    (a) => a.email,
  );

  // The scaffold server seeds on boot unless AUTO_SEED=0 is set.
  const autoSeed = serverSrc ? /AUTO_SEED/.test(serverSrc) : true;

  const steps = [
    "Install deps: `pnpm install` in `frontend/` and `backend/`.",
    "Set `backend/.env` `DATABASE_URL` to your Postgres.",
    autoSeed
      ? "Start the backend (`pnpm dev` in `backend/`) — it auto-migrates and seeds users on boot."
      : "Run migrations + `pnpm seed` in `backend/` to create the login accounts.",
    "Start the frontend (`pnpm dev` in `frontend/`) and open the app.",
    "Log in with one of the seeded accounts below.",
  ];

  return { autoSeed, steps, accounts };
}
