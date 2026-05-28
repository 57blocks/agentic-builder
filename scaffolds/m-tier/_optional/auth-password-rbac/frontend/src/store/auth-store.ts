/**
 * Tiny zustand store for the password-rbac auth flow.
 *
 * Token storage contract (must match frontend/src/api/client.ts):
 *   - The bearer token lives at `localStorage[TOKEN_STORAGE_KEY]` and is
 *     the SINGLE source of truth. Both this store's `login()` action and
 *     `apiClient` read/write the same key.
 *   - `user` is persisted via zustand-persist (under the `auth-store`
 *     localStorage key) so a hard refresh keeps the displayed profile.
 *   - `token` is intentionally EXCLUDED from `partialize` to prevent the
 *     duplication that caused the F-07 outage class — when token lived
 *     in BOTH the zustand `auth-store` envelope AND a separate "token"
 *     key, the two drifted apart and `apiClient` silently sent an empty
 *     bearer header on cold start.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { TOKEN_STORAGE_KEY } from "../api/client";
import {
  loginWithPassword as apiLogin,
  logout as apiLogout,
  getCurrentUser as apiMe,
  type AuthUser,
} from "../api/auth-client";

interface AuthStoreState {
  token: string | null;
  user: AuthUser | null;
  loading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<AuthUser | null>;
  clearError: () => void;
}

export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      loading: false,
      error: null,

      async login(email, password) {
        set({ loading: true, error: null });
        try {
          const res = await apiLogin(email, password);
          localStorage.setItem(TOKEN_STORAGE_KEY, res.accessToken);
          set({ token: res.accessToken, user: res.user, loading: false });
          return res.user;
        } catch (err) {
          const message = err instanceof Error ? err.message : "Login failed";
          set({ loading: false, error: message });
          throw err;
        }
      },

      async logout() {
        try {
          if (get().token) await apiLogout();
        } catch {
          /* swallow — local state will be cleared anyway */
        }
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        set({ token: null, user: null });
      },

      async refresh() {
        // Cold-start path: zustand-persist only restores `user`, so we
        // read the token back from the canonical storage key.
        const token = get().token ?? localStorage.getItem(TOKEN_STORAGE_KEY);
        if (!token) {
          set({ user: null });
          return null;
        }
        try {
          const res = await apiMe();
          set({ user: res.user, token });
          return res.user;
        } catch {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          set({ token: null, user: null });
          return null;
        }
      },

      clearError() {
        set({ error: null });
      },
    }),
    {
      name: "auth-store",
      // `token` is excluded on purpose — see file header. The bearer token
      // lives at localStorage[TOKEN_STORAGE_KEY] exclusively.
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
