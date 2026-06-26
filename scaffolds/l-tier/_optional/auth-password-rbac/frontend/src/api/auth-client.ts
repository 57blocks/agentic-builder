/**
 * Typed auth API client — covers the three canonical endpoints owned by
 * the `auth-password-rbac` scaffold:
 *
 *   POST /auth/login   → { accessToken, user }
 *   GET  /auth/me      → { user }
 *   POST /auth/logout  → { ok: true }
 *
 * Path contract (apiClient prepends the FULL `/api/v1` base):
 *   - apiClient.* receives the BUSINESS path only (e.g. `/auth/login`) —
 *     NEVER include `/api` or `/v1`.
 *   - apiClient prepends `API_BASE` (defaults to `/api/v1`) → final URL
 *     `/api/v1/auth/<endpoint>`.
 *
 * Passing `/api/v1/...` or `/v1/...` here double-prefixes (→ `/api/v1/v1/...`)
 * and 404s. Keep paths starting at the business segment (`/auth/...`).
 */

import { apiClient } from "./client";

export type AuthRole = "admin" | "operator" | "viewer";

export interface AuthUser {
  id: string;
  email: string;
  /** RBAC primitive — fixed 3-value enum enforced by `requireRole()`. */
  role: AuthRole;
  displayName?: string | null;
  /**
   * Business persona (e.g. "family" / "teacher" / "student" / "coach")
   * sourced from `.blueprint/auth-decision.json#seedAccounts[].domainRole`
   * and stored on `users.domain_role`. Consumed by `useAuth().sessionRole`
   * to drive route shells INDEPENDENTLY of the RBAC `role` enum. May be
   * null for accounts that aren't tied to a specific UI persona.
   */
  domainRole?: string | null;
}

export interface LoginResponse {
  accessToken: string;
  /**
   * Legacy alias kept for frontends that still read `token`. New code should
   * use `accessToken`. Backend controller emits both keys.
   */
  token?: string;
  user: AuthUser;
}

export async function loginWithPassword(
  email: string,
  password: string,
): Promise<LoginResponse> {
  return apiClient.post<LoginResponse>(
    "/auth/login",
    { email, password },
    { auth: false },
  );
}

export async function getCurrentUser(): Promise<{ user: AuthUser }> {
  return apiClient.get<{ user: AuthUser }>("/auth/me");
}

export async function logout(): Promise<{ ok: true }> {
  return apiClient.post<{ ok: true }>("/auth/logout");
}
