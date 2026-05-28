/**
 * Canonical auth hook for the password-rbac scaffold.
 *
 * Wraps `useAuthStore` and exposes:
 *   - `user / token / loading / error`     — raw store fields
 *   - `isAuthenticated`                    — `!!token && !!user`
 *   - `sessionRole`                        — UI persona key, prioritises
 *                                            `user.domainRole` (business
 *                                            persona) over the RBAC enum
 *   - `login / logout / refresh / clearError` — bound store actions
 *
 * Why a hook (not direct `useAuthStore` calls)?
 *   The "sessionRole prioritises domainRole" rule lives in ONE place so
 *   every PersonaShell / nav / breadcrumb gets it right. Components
 *   that read `user.role` directly silently break the moment a project
 *   layers a business persona (family / teacher) on top of the RBAC
 *   primitive — F-10 / F-13 / F-15 are exactly that bug class.
 *
 * If you need an action this hook doesn't surface (rare), reach into
 * `useAuthStore` directly for THAT action only — don't bypass the
 * `sessionRole` derivation by reading `user.role` from the store.
 */

import { useAuthStore } from "../store/auth-store";

export interface UseAuthResult {
  user: ReturnType<typeof useAuthStore.getState>["user"];
  token: ReturnType<typeof useAuthStore.getState>["token"];
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  /**
   * Persona key driving route shells. Resolution order:
   *   1. `user.domainRole`  — business persona ("family" | "teacher" | ...)
   *   2. `user.role`        — RBAC enum, used as fallback so admin-only
   *                           projects without a domain split still get
   *                           a non-null shell key
   *   3. `null`             — unauthenticated
   */
  sessionRole: string | null;
  login: ReturnType<typeof useAuthStore.getState>["login"];
  logout: ReturnType<typeof useAuthStore.getState>["logout"];
  refresh: ReturnType<typeof useAuthStore.getState>["refresh"];
  clearError: ReturnType<typeof useAuthStore.getState>["clearError"];
}

export function useAuth(): UseAuthResult {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const loading = useAuthStore((s) => s.loading);
  const error = useAuthStore((s) => s.error);
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);
  const refresh = useAuthStore((s) => s.refresh);
  const clearError = useAuthStore((s) => s.clearError);

  const sessionRole: string | null = user
    ? (user.domainRole && user.domainRole.length > 0
        ? user.domainRole
        : user.role)
    : null;

  return {
    user,
    token,
    loading,
    error,
    isAuthenticated: !!token && !!user,
    sessionRole,
    login,
    logout,
    refresh,
    clearError,
  };
}
