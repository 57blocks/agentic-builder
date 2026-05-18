/**
 * Typed auth API client — covers the three canonical endpoints owned by
 * the `auth-password-rbac` scaffold:
 *
 *   POST /api/v1/auth/login   → { accessToken, user }
 *   GET  /api/v1/auth/me      → { user }
 *   POST /api/v1/auth/logout  → { ok: true }
 *
 * Workers MUST go through this module instead of writing raw
 * `apiClient.post("/v1/auth/login", ...)` — that pattern omits the `/api`
 * prefix and was the #1 cause of frontend-side 404s in earlier runs.
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
  user: AuthUser;
}

export async function loginWithPassword(
  email: string,
  password: string,
): Promise<LoginResponse> {
  return apiClient.post<LoginResponse>(
    "/api/v1/auth/login",
    { email, password },
    { auth: false },
  );
}

export async function getCurrentUser(): Promise<{ user: AuthUser }> {
  return apiClient.get<{ user: AuthUser }>("/api/v1/auth/me");
}

export async function logout(): Promise<{ ok: true }> {
  return apiClient.post<{ ok: true }>("/api/v1/auth/logout");
}
