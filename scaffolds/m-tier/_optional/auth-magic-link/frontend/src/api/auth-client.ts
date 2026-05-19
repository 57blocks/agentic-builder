/**
 * Typed auth API client — magic-link variant.
 *
 *   POST /api/v1/auth/magic            → { ok: true }
 *   GET  /api/v1/auth/magic/verify     → { accessToken, user }
 *   GET  /api/v1/auth/me               → { user }
 *   POST /api/v1/auth/logout           → { ok: true }
 *
 * Workers MUST go through this module instead of writing raw paths —
 * the `/api/v1/...` prefix is hard-coded here to avoid the "missing /api"
 * 404 class of bugs.
 */

import { apiClient } from "./client";

export type AuthRole = "admin" | "operator" | "viewer";

export interface AuthUser {
  id: string;
  email: string;
  role: AuthRole;
  displayName?: string | null;
}

export interface VerifyResponse {
  accessToken: string;
  user: AuthUser;
}

export async function requestMagicLink(email: string): Promise<{ ok: true }> {
  return apiClient.post<{ ok: true }>(
    "/api/v1/auth/magic",
    { email },
    { auth: false },
  );
}

export async function verifyMagicLink(token: string): Promise<VerifyResponse> {
  return apiClient.get<VerifyResponse>("/api/v1/auth/magic/verify", {
    auth: false,
    query: { token },
  });
}

export async function getCurrentUser(): Promise<{ user: AuthUser }> {
  return apiClient.get<{ user: AuthUser }>("/api/v1/auth/me");
}

export async function logout(): Promise<{ ok: true }> {
  return apiClient.post<{ ok: true }>("/api/v1/auth/logout");
}
