/**
 * Tiny zustand store for the password-rbac auth flow.
 *
 * Persists `token` + `user` in localStorage so a hard refresh keeps the
 * session. Subscribes to `auth-client` so workers don't need to call
 * `setUser()` manually — `login()` / `logout()` actions handle it.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
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
          localStorage.setItem("token", res.accessToken);
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
        localStorage.removeItem("token");
        set({ token: null, user: null });
      },

      async refresh() {
        const token = get().token ?? localStorage.getItem("token");
        if (!token) {
          set({ user: null });
          return null;
        }
        try {
          const res = await apiMe();
          set({ user: res.user, token });
          return res.user;
        } catch {
          localStorage.removeItem("token");
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
      partialize: (state) => ({ token: state.token, user: state.user }),
    },
  ),
);
