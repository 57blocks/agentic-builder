/**
 * Seed admin / operator / viewer accounts.
 *
 * Reads the canonical seed list from `.blueprint/auth-decision.json` so the
 * Wizard's "Advanced" section can edit emails/passwords without touching
 * code. Falls back to a hard-coded admin/operator/viewer set when the
 * decision file is unavailable (e.g. running in CI before kickoff).
 *
 * Idempotent: ON CONFLICT (email) DO UPDATE. Safe to re-run after every
 * deploy — passwords get re-hashed and updated.
 */

import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";

import { sequelize } from "../db";
import { User } from "../models/User";
import { syncModels } from "../models";

type Role = "admin" | "operator" | "viewer";
interface SeedAccount {
  email: string;
  password?: string;
  role: Role;
  displayName?: string;
}

const HARDCODED_DEFAULTS: readonly SeedAccount[] = [
  { email: "admin@example.com", password: "Admin@2026", role: "admin", displayName: "admin" },
  { email: "operator@example.com", password: "Operator@2026", role: "operator", displayName: "operator" },
  { email: "viewer@example.com", password: "Viewer@2026", role: "viewer", displayName: "viewer" },
] as const;

async function loadSeedAccounts(): Promise<SeedAccount[]> {
  const candidates = [
    path.resolve(process.cwd(), ".blueprint", "auth-decision.json"),
    path.resolve(process.cwd(), "..", ".blueprint", "auth-decision.json"),
  ];
  for (const file of candidates) {
    try {
      const raw = await fs.readFile(file, "utf-8");
      const parsed = JSON.parse(raw) as {
        seedAccounts?: Array<{ email?: unknown; password?: unknown; role?: unknown }>;
      };
      const list = Array.isArray(parsed.seedAccounts) ? parsed.seedAccounts : [];
      const accounts: SeedAccount[] = [];
      for (const item of list) {
        const email = typeof item.email === "string" ? item.email.trim() : "";
        const role = item.role === "admin" || item.role === "operator" || item.role === "viewer"
          ? (item.role as Role)
          : null;
        if (!email || !role) continue;
        const password = typeof item.password === "string" ? item.password : undefined;
        accounts.push({ email, role, password, displayName: role });
      }
      if (accounts.length > 0) return accounts;
    } catch {
      // try next candidate
    }
  }
  return HARDCODED_DEFAULTS.map((a) => ({ ...a }));
}

async function upsert(account: SeedAccount): Promise<void> {
  if (!account.password) {
    console.warn(
      `[seed-auth-users] skipping ${account.email} — no password (likely magic-link/privy mode).`,
    );
    return;
  }
  const passwordHash = await bcrypt.hash(account.password, 10);
  await User.upsert({
    email: account.email,
    passwordHash,
    role: account.role,
    displayName: account.displayName ?? account.role,
  });
}

/** Core seed logic — does NOT close the DB. Safe to call from server.ts. */
export async function run(): Promise<void> {
  const accounts = await loadSeedAccounts();
  for (const acc of accounts) {
    await upsert(acc);
  }
  console.log("Seeded auth users:");
  for (const acc of accounts) {
    if ("password" in acc && acc.password) {
      console.log(`  - ${acc.role.padEnd(8)} ${acc.email}  /  ${acc.password}`);
    } else {
      console.log(`  - ${acc.role.padEnd(8)} ${acc.email}`);
    }
  }
}

/** Standalone CLI entry — used by `pnpm run seed`. */
async function main(): Promise<void> {
  await sequelize.authenticate();
  await syncModels();
  await run();
  console.log("\n⚠️  Passwords above are demo defaults — change them in production.\n");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main()
    .catch((err) => {
      console.error("[seed-auth-users] failed:", err);
      process.exitCode = 1;
    })
    .finally(async () => {
      await sequelize.close().catch(() => undefined);
    });
}
