/**
 * Active-subsystem scope sidecar (`.blueprint/active-subsystem-scope.json`).
 *
 * When a large PRD is built subsystem-by-subsystem, each per-subsystem coding
 * run must only be VALIDATED against the endpoints it (and its dependencies)
 * owns — otherwise the not-yet-built domains' endpoints look like missing
 * implementations / 404s and fail the gates.
 *
 * The orchestrator writes this sidecar before each coding call with the
 * in-scope endpoint set (the subsystem + its transitive subsystem-deps +
 * foundation). The gates read it and filter the contract endpoints they check.
 * Absent sidecar ⇒ whole-system mode (no filtering, legacy behaviour).
 */

import fs from "fs/promises";
import path from "path";

export interface ActiveSubsystemScope {
  subsystemId: string;
  /** In-scope endpoints, each "METHOD /path" (path as in API_CONTRACTS / PRD). */
  endpoints: string[];
}

const SCOPE_FILE = path.join(".blueprint", "active-subsystem-scope.json");

function scopePath(projectRoot: string): string {
  return path.join(projectRoot, SCOPE_FILE);
}

/**
 * Param-normalized match key: upper method + path with `:seg`/`{seg}` params and
 * trailing slashes normalized, so "POST /api/v1/x/:id" matches "POST /api/v1/x/{id}".
 * Resilient to the PRD-vs-API_CONTRACTS param-format gap.
 */
export function endpointMatchKey(method: string, endpoint: string): string {
  const p = endpoint
    .trim()
    .replace(/\{[^}]+\}/g, "*") // {id} → *
    .replace(/:[A-Za-z0-9_]+/g, "*") // :id → *
    .replace(/\/+/g, "/")
    .replace(/\/$/, "");
  return `${method.trim().toUpperCase()} ${p || "/"}`;
}

function parseEndpoint(entry: string): { method: string; endpoint: string } | null {
  const m = entry.trim().match(/^([A-Za-z]+)\s+(\S+)$/);
  if (!m) return null;
  return { method: m[1], endpoint: m[2] };
}

export async function writeActiveScope(
  projectRoot: string,
  scope: ActiveSubsystemScope,
): Promise<void> {
  try {
    await fs.mkdir(path.join(projectRoot, ".blueprint"), { recursive: true });
    await fs.writeFile(scopePath(projectRoot), JSON.stringify(scope, null, 2) + "\n", "utf-8");
  } catch (err) {
    console.warn("[Subsystems] Failed to write active scope (ignored):", err instanceof Error ? err.message : err);
  }
}

export async function readActiveScope(
  projectRoot: string,
): Promise<ActiveSubsystemScope | null> {
  try {
    const raw = await fs.readFile(scopePath(projectRoot), "utf-8");
    const parsed = JSON.parse(raw) as ActiveSubsystemScope;
    if (parsed && Array.isArray(parsed.endpoints)) return parsed;
  } catch {
    /* missing/corrupt → no scope */
  }
  return null;
}

export async function clearActiveScope(projectRoot: string): Promise<void> {
  try {
    await fs.rm(scopePath(projectRoot), { force: true });
  } catch {
    /* ignore */
  }
}

/** Build a fast match-key set from a scope (null → null = "no filtering"). */
export function scopeKeySet(scope: ActiveSubsystemScope | null): Set<string> | null {
  if (!scope) return null;
  const set = new Set<string>();
  for (const e of scope.endpoints) {
    const parsed = parseEndpoint(e);
    if (parsed) set.add(endpointMatchKey(parsed.method, parsed.endpoint));
  }
  return set;
}

/**
 * Filter contract-style endpoints to those in scope. `keySet === null` (no
 * sidecar) returns the input unchanged (whole-system mode).
 */
export function filterEndpointsToScope<T extends { method: string; endpoint: string }>(
  endpoints: T[],
  keySet: Set<string> | null,
): T[] {
  if (!keySet) return endpoints;
  return endpoints.filter((e) => keySet.has(endpointMatchKey(e.method, e.endpoint)));
}
