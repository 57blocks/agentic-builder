/**
 * Auth-decision persistence — single sibling of `resource-requirements.ts`
 * dedicated to the `mode/scaffold/seedAccounts` decision tree consumed by
 * the Wizard, the optional-scaffold picker, and downstream agents.
 *
 * Layout on disk:
 *   .blueprint/auth-decision.json   (relative to projectRoot)
 *
 * The file is the canonical "what auth scaffold to install" answer. It is
 * gitignored under the existing `.blueprint/` pattern in projects that
 * already ignore it; for AgenticBuilder itself, callers decide whether to
 * commit (we don't).
 */

import fs from "fs/promises";
import path from "path";

import {
  type AuthDecision,
  type AuthMode,
  type AuthRole,
  type SeedAccount,
  AUTH_MODES,
  DEFAULT_RBAC_ROLES,
  DEFAULT_SEED_ACCOUNTS,
  REQUIRED_ENV_KEYS_BY_MODE,
  SCAFFOLD_FOR_MODE,
  isAuthMode,
  isAuthRole,
} from "@/lib/agents/architect/auth-decision-types";

const DECISION_FILE_REL = path.join(".blueprint", "auth-decision.json");

export function authDecisionFileAbs(projectRoot: string): string {
  return path.join(projectRoot, DECISION_FILE_REL);
}

async function ensureBlueprintDir(projectRoot: string): Promise<void> {
  await fs.mkdir(path.join(projectRoot, ".blueprint"), { recursive: true });
}

/** Read the persisted decision; returns null when no file exists or the
 *  file is unreadable / malformed. Callers fall back to running the agent
 *  or building a default. */
export async function readAuthDecision(
  projectRoot: string,
): Promise<AuthDecision | null> {
  try {
    const raw = await fs.readFile(authDecisionFileAbs(projectRoot), "utf-8");
    const parsed = JSON.parse(raw);
    return normalizeAuthDecision(parsed);
  } catch {
    return null;
  }
}

/** Overwrite the entire decision file. Always re-normalises (drops unknown
 *  fields, forces `scaffold` to match `mode`, refreshes `updatedAt`). */
export async function writeAuthDecision(
  projectRoot: string,
  decision: AuthDecision,
): Promise<AuthDecision> {
  await ensureBlueprintDir(projectRoot);
  const cleaned = normalizeAuthDecision({
    ...decision,
    updatedAt: new Date().toISOString(),
  });
  if (!cleaned) {
    throw new Error("writeAuthDecision: decision failed normalization");
  }
  await fs.writeFile(
    authDecisionFileAbs(projectRoot),
    JSON.stringify(cleaned, null, 2) + "\n",
    "utf-8",
  );
  return cleaned;
}

/** Defensive parser/normaliser. Accepts anything; returns a fully-typed
 *  AuthDecision or null if the input has no usable `mode` field. */
export function normalizeAuthDecision(raw: unknown): AuthDecision | null {
  if (typeof raw !== "object" || raw === null) return null;
  const o = raw as Record<string, unknown>;

  const mode: AuthMode | null = isAuthMode(o.mode)
    ? o.mode
    : // Best-effort heuristic for legacy / hand-edited files.
      (AUTH_MODES.find(
        (m) => typeof o.scaffold === "string" && o.scaffold.endsWith(m),
      ) ?? null);
  if (!mode) return null;

  const rationale =
    typeof o.rationale === "string" && o.rationale.trim()
      ? o.rationale.trim()
      : "(no rationale recorded)";

  const confidence: AuthDecision["confidence"] =
    o.confidence === "high" || o.confidence === "medium" || o.confidence === "low"
      ? o.confidence
      : "low";

  const seedAccounts = normaliseSeedAccounts(o.seedAccounts);
  const rbacRoles = normaliseRbacRoles(o.rbacRoles);

  const requiredEnvKeys = Array.isArray(o.requiredEnvKeys)
    ? (o.requiredEnvKeys as unknown[])
        .filter((k): k is string => typeof k === "string" && k.trim().length > 0)
        .map((k) => k.trim().toUpperCase())
    : [...REQUIRED_ENV_KEYS_BY_MODE[mode]];

  return {
    mode,
    scaffold: SCAFFOLD_FOR_MODE[mode],
    rationale,
    confidence,
    seedAccounts,
    rbacRoles,
    requiredEnvKeys,
    userOverridden: o.userOverridden === true,
    updatedAt:
      typeof o.updatedAt === "string" && o.updatedAt.trim()
        ? o.updatedAt
        : new Date().toISOString(),
  };
}

function normaliseSeedAccounts(raw: unknown): SeedAccount[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_SEED_ACCOUNTS.map((s) => ({ ...s }));
  }
  const out: SeedAccount[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const o = item as Record<string, unknown>;
    const email = typeof o.email === "string" ? o.email.trim() : "";
    const role = isAuthRole(o.role) ? (o.role as AuthRole) : null;
    if (!email || !role) continue;
    const password =
      typeof o.password === "string" && o.password.length > 0
        ? o.password
        : undefined;
    const domainRole =
      typeof o.domainRole === "string" && o.domainRole.trim().length > 0
        ? o.domainRole.trim()
        : undefined;
    out.push({ email, role, password, domainRole });
  }
  return out.length > 0 ? out : DEFAULT_SEED_ACCOUNTS.map((s) => ({ ...s }));
}

function normaliseRbacRoles(raw: unknown): AuthRole[] {
  if (!Array.isArray(raw)) return [...DEFAULT_RBAC_ROLES];
  const roles = (raw as unknown[]).filter(isAuthRole) as AuthRole[];
  return roles.length > 0 ? Array.from(new Set(roles)) : [...DEFAULT_RBAC_ROLES];
}
