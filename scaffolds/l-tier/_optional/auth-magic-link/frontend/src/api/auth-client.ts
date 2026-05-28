/**
 * Typed auth API client — magic-link variant.
 *
 *   POST /v1/auth/magic            → { ok: true }
 *   GET  /v1/auth/magic/verify     → { accessToken, user }
 *   GET  /v1/auth/me               → { user }
 *   POST /v1/auth/logout           → { ok: true }
 *
 * Path contract (apiClient automatically prepends `/api`):
 *   - apiClient.* receives `/v1/auth/<endpoint>` (NO leading `/api`)
 *   - apiClient prepends `API_BASE` (defaults to `/api`) → final URL
 *     `/api/v1/auth/<endpoint>`
 *
 * Passing `/api/v1/...` here produces `/api/api/v1/...` and a 404.
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
  /** Legacy alias for older clients; backend emits both. */
  token?: string;
  user: AuthUser;
}

export async function requestMagicLink(email: string): Promise<{ ok: true }> {
  return apiClient.post<{ ok: true }>(
    "/v1/auth/magic",
    { email },
    { auth: false },
  );
}

export async function verifyMagicLink(token: string): Promise<VerifyResponse> {
  return apiClient.get<VerifyResponse>("/v1/auth/magic/verify", {
    auth: false,
    query: { token },
  });
}

export async function getCurrentUser(): Promise<{ user: AuthUser }> {
  return apiClient.get<{ user: AuthUser }>("/v1/auth/me");
}

export async function logout(): Promise<{ ok: true }> {
  return apiClient.post<{ ok: true }>("/v1/auth/logout");
}
