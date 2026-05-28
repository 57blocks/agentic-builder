/**
 * Typed auth API client — covers the three canonical endpoints owned by
 * the `auth-password-rbac` scaffold:
 *
 *   POST /v1/auth/login   → { accessToken, user }
 *   GET  /v1/auth/me      → { user }
 *   POST /v1/auth/logout  → { ok: true }
 *
 * Path contract (apiClient automatically prepends `/api`):
 *   - apiClient.* receives `/v1/auth/<endpoint>` (NO leading `/api`)
 *   - apiClient prepends `API_BASE` (defaults to `/api`) → final URL
 *     `/api/v1/auth/<endpoint>`
 *
 * Passing `/api/v1/...` here produces `/api/api/v1/...` and a 404 — that
 * was the original "double /api prefix" bug. Keep paths starting at `/v1`.
 */

import { apiClient } from "./client";

export type AuthRole = "admin" | "operator" | "viewer";

export interface AuthUser {
  id: string;
  email: string;
  role: AuthRole;
  displayName?: string | null;
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
    "/v1/auth/login",
    { email, password },
    { auth: false },
  );
}

export async function getCurrentUser(): Promise<{ user: AuthUser }> {
  return apiClient.get<{ user: AuthUser }>("/v1/auth/me");
}

export async function logout(): Promise<{ ok: true }> {
  return apiClient.post<{ ok: true }>("/v1/auth/logout");
}
