/**
 * Seed admin / operator / viewer accounts WITHOUT passwords.
 *
 * Magic-link mode auto-creates user rows on first link request, but
 * pre-seeding lets us assign the right role to known emails BEFORE the
 * first request. After seeding, any magic-link issued to
 * admin@example.com lands as role=admin.
 *
 * Reads seed list from `.blueprint/auth-decision.json` when available.
 */

import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";

import { sequelize } from "../db";
import { User } from "../models/User";
import { syncModels } from "../models";

type Role = "admin" | "operator" | "viewer";
interface SeedAccount {
  email: string;
  role: Role;
  displayName?: string;
}

const HARDCODED_DEFAULTS: readonly SeedAccount[] = [
  { email: "admin@example.com", role: "admin", displayName: "admin" },
  { email: "operator@example.com", role: "operator", displayName: "operator" },
  { email: "viewer@example.com", role: "viewer", displayName: "viewer" },
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
        seedAccounts?: Array<{ email?: unknown; role?: unknown }>;
      };
      const list = Array.isArray(parsed.seedAccounts) ? parsed.seedAccounts : [];
      const accounts: SeedAccount[] = [];
      for (const item of list) {
        const email = typeof item.email === "string" ? item.email.trim() : "";
        const role =
          item.role === "admin" || item.role === "operator" || item.role === "viewer"
            ? (item.role as Role)
            : null;
        if (!email || !role) continue;
        accounts.push({ email, role, displayName: role });
      }
      if (accounts.length > 0) return accounts;
    } catch {
      // try next candidate
    }
  }
  return HARDCODED_DEFAULTS.map((a) => ({ ...a }));
}

async function upsert(account: SeedAccount): Promise<void> {
  await User.upsert({
    email: account.email,
    role: account.role,
    displayName: account.displayName ?? account.role,
    passwordHash: null,
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
    console.log(`  - ${acc.role.padEnd(8)} ${acc.email}`);
  }
}

/** Standalone CLI entry — used by `pnpm run seed`. */
async function main(): Promise<void> {
  await sequelize.authenticate();
  await syncModels();
  await run();
  console.log("\n⚠️  Passwords above are demo defaults — change them in production.\n");
}

main()
  .catch((err) => {
    console.error("[seed-auth-users] failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close().catch(() => undefined);
  });
