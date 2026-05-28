/**
 * Tiny zustand store for the magic-link auth flow.
 *
 * Workers should NOT call `verifyMagicLink` directly — the callback
 * page (`MagicLinkCallbackPage`) calls `consumeToken()` which wraps it
 * and updates the store atomically.
 *
 * Token storage contract (must match frontend/src/api/client.ts):
 *   - The bearer token lives at `localStorage[TOKEN_STORAGE_KEY]` and is
 *     the SINGLE source of truth.
 *   - `user` is persisted via zustand-persist (under the `auth-store`
 *     localStorage key); `token` is intentionally excluded from
 *     `partialize` so the two storage locations never drift.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { TOKEN_STORAGE_KEY } from "../api/client";
import {
  requestMagicLink as apiRequest,
  verifyMagicLink as apiVerify,
  logout as apiLogout,
  getCurrentUser as apiMe,
  type AuthUser,
} from "../api/auth-client";

interface AuthStoreState {
  token: string | null;
  user: AuthUser | null;
  loading: boolean;
  error: string | null;

  requestLink: (email: string) => Promise<void>;
  consumeToken: (token: string) => Promise<AuthUser>;
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

      async requestLink(email) {
        set({ loading: true, error: null });
        try {
          await apiRequest(email);
          set({ loading: false });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Request failed";
          set({ loading: false, error: message });
          throw err;
        }
      },

      async consumeToken(token) {
        set({ loading: true, error: null });
        try {
          const res = await apiVerify(token);
          localStorage.setItem(TOKEN_STORAGE_KEY, res.accessToken);
          set({ token: res.accessToken, user: res.user, loading: false });
          return res.user;
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Verification failed";
          set({ loading: false, error: message });
          throw err;
        }
      },

      async logout() {
        try {
          if (get().token) await apiLogout();
        } catch {
          /* swallow */
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
      // `token` is excluded on purpose — see file header.
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
